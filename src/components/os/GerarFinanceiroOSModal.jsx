import * as React from "react";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, DollarSign, AlertCircle, CreditCard, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/components/formatters';

export default function GerarFinanceiroOSModal({
  isOpen,
  onClose,
  ordem,
  onGerado
}) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [planoContasPadrao, setPlanoContasPadrao] = useState(null);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  
  const [formData, setFormData] = useState({
    conta_bancaria_id: '',
    plano_contas_id: '',
    observacao: '',
    competencia: ''
  });

  const [parcelas, setParcelas] = useState([]);

  useEffect(() => {
    if (isOpen && ordem) {
      loadData();
    }
  }, [isOpen, ordem]);

  const loadData = async () => {
    try {
      const [configs, contas, condicoes, formas, planos] = await Promise.all([
        base44.entities.Configuracoes.list(),
        base44.entities.ContaBancaria.list(),
        base44.entities.CondicaoPagamento.list(),
        base44.entities.FormaPagamento.list(),
        base44.entities.PlanoContas.list()
      ]);

      const config = configs && configs[0];
      const planoPadrao = config?.plano_contas_padrao_receita_os || null;

      setContasBancarias(contas || []);
      setCondicoesPagamento(condicoes || []);
      setFormasPagamento(formas || []);
      setPlanoContas(planos || []);
      setPlanoContasPadrao(planoPadrao);

      // Calcular competência a partir da data_abertura
      const competenciaCalculada = ordem.data_abertura ? ordem.data_abertura.substring(0, 7) : new Date().toISOString().substring(0, 7);

      setFormData({
        conta_bancaria_id: contas && contas[0]?.id || '',
        plano_contas_id: planoPadrao || '',
        observacao: `Receita da OS ${ordem.numero_os}`,
        competencia: competenciaCalculada
      });

      gerarParcelasAutomatico(ordem, condicoes);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const gerarParcelasAutomatico = (os, condicoesLista) => {
    if (!os.condicao_pagamento_id) {
      setParcelas([{
        numero_parcela: 1,
        data_vencimento: os.data_abertura || new Date().toISOString().split('T')[0],
        valor: os.valor_total || 0,
        status: 'pendente'
      }]);
      return;
    }

    const condicao = condicoesLista.find(c => c.id === os.condicao_pagamento_id);
    if (!condicao) {
      setParcelas([{
        numero_parcela: 1,
        data_vencimento: os.data_abertura || new Date().toISOString().split('T')[0],
        valor: os.valor_total || 0,
        status: 'pendente'
      }]);
      return;
    }

    const numParcelas = condicao.num_parcelas || 1;
    const intervaloDias = condicao.intervalo_dias || 30;
    const valorTotal = os.valor_total || 0;
    const valorParcela = Math.floor((valorTotal / numParcelas) * 100) / 100;

    const novasParcelas = [];
    let dataBase = new Date(os.data_abertura || new Date());

    if (condicao.tipo === 'prazo' || condicao.tipo === 'parcelado') {
      dataBase.setDate(dataBase.getDate() + intervaloDias);
    }

    for (let i = 0; i < numParcelas; i++) {
      const dataVenc = new Date(dataBase);
      dataVenc.setMonth(dataVenc.getMonth() + i);

      novasParcelas.push({
        numero_parcela: i + 1,
        data_vencimento: dataVenc.toISOString().split('T')[0],
        valor: valorParcela,
        status: 'pendente'
      });
    }

    const somaAtual = novasParcelas.reduce((sum, p) => sum + p.valor, 0);
    const diferenca = Math.round((valorTotal - somaAtual) * 100) / 100;
    if (diferenca !== 0 && novasParcelas.length > 0) {
      novasParcelas[novasParcelas.length - 1].valor += diferenca;
    }

    setParcelas(novasParcelas);
  };

  const updateParcela = (idx, field, value) => {
    setParcelas(prev =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  };

  const handleGerar = async () => {
    if (!formData.conta_bancaria_id) {
      toast({
        title: 'Conta bancária obrigatória',
        description: 'Selecione uma conta bancária',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.plano_contas_id) {
      toast({
        title: 'Plano de contas obrigatório',
        description: 'Selecione um plano de contas',
        variant: 'destructive'
      });
      return;
    }

    if (parcelas.length === 0) {
      toast({
        title: 'Sem parcelas',
        description: 'É necessário ter pelo menos uma parcela',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);

    try {
      const totalParcelas = parcelas.reduce((sum, p) => sum + (Number(p.valor) || 0), 0);

      const movimentacaoData = {
        tipo_movimentacao: 'credito',
        numero_documento: ordem.numero_os,
        contato_tipo: ordem.contato_tipo || 'cliente',
        contato_id: ordem.contato_id,
        data_faturamento: ordem.data_abertura,
        data_vencimento: parcelas[0]?.data_vencimento || ordem.data_abertura,
        competencia: formData.competencia,
        historico: formData.observacao || `Receita da OS ${ordem.numero_os}`,
        forma_pagamento_id: ordem.forma_pagamento_id,
        condicao_pagamento_id: ordem.condicao_pagamento_id,
        conta_bancaria_id: formData.conta_bancaria_id,
        origem: 'os',
        os_id: ordem.id,
        valor_total: totalParcelas,
        status: 'pendente',
        parcelas: parcelas.map(p => ({
          numero_parcela: p.numero_parcela,
          data_vencimento: p.data_vencimento,
          valor: parseFloat(p.valor) || 0,
          status: 'pendente'
        })),
        planos_contas: [{
          plano_contas_id: formData.plano_contas_id,
          valor: totalParcelas,
          tipo: 'credito',
          observacao: ''
        }]
      };

      await base44.entities.MovimentacaoFinanceira.create(movimentacaoData);

      for (const parcela of parcelas) {
        await base44.entities.ContasReceber.create({
          descricao: `${ordem.numero_os} - Parcela ${parcela.numero_parcela}/${parcelas.length}`,
          numero_documento: ordem.numero_os,
          data_vencimento: parcela.data_vencimento,
          valor_original: parcela.valor,
          status: 'pendente',
          cliente_id: ordem.contato_tipo === 'cliente' ? ordem.contato_id : null,
          competencia: formData.competencia,
          plano_contas_id: formData.plano_contas_id,
          observacoes: `Gerado da OS ${ordem.numero_os}\n${formData.observacao || ''}`
        });
      }

      toast({
        title: '✅ Movimentação Gerada!',
        description: `${parcelas.length} ${parcelas.length === 1 ? 'lançamento criado' : 'lançamentos criados'} com sucesso.`
      });

      if (onGerado) {
        await onGerado();
      }

      onClose();

    } catch (error) {
      console.error('Erro ao gerar movimentação:', error);
      toast({
        title: 'Erro ao gerar movimentação',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!ordem) return null;

  // Buscar nomes de forma e condição de pagamento
  const formaPagamento = formasPagamento.find(f => f.id === ordem.forma_pagamento_id);
  const condicaoPagamento = condicoesPagamento.find(c => c.id === ordem.condicao_pagamento_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col modern-modal p-0 bg-white border border-slate-200 rounded-xl">
        <DialogHeader className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center ring-1 ring-white/10">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white tracking-tight">
                Gerar Movimentação Financeira
              </DialogTitle>
              <p className="text-sm text-slate-400 font-medium">OS #{ordem?.numero_os}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-900 mb-0.5">Configurações Obrigatórias</p>
              <p className="text-xs text-blue-700">
                Configure a Conta Bancária, Plano de Contas e Competência antes de gerar a movimentação.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
              <p className="text-[10px] text-blue-600 uppercase font-semibold mb-1 tracking-wide">Valor Total</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(ordem?.valor_total || 0)}</p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1 tracking-wide">Forma Pagto</p>
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-sm font-semibold text-slate-900 truncate">{formaPagamento?.nome || 'Não definida'}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1 tracking-wide">Condição</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-sm font-semibold text-slate-900 truncate">{condicaoPagamento?.nome || 'Não definida'}</p>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-800 text-sm">Configurações Obrigatórias</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Conta Bancária *</Label>
                  <Select
                    value={formData.conta_bancaria_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, conta_bancaria_id: v }))}
                  >
                    <SelectTrigger className="bg-white h-10 border-slate-300">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasBancarias.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Plano de Contas *</Label>
                  <Select
                    value={formData.plano_contas_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, plano_contas_id: v }))}
                  >
                    <SelectTrigger className="bg-white h-10 border-slate-300">
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {planoContas.filter(p => p.tipo === 'receita').map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.codigo} - {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Competência *</Label>
                  <Input
                    type="month"
                    value={formData.competencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, competencia: e.target.value }))}
                    className="bg-white h-10 border-slate-300"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Observação</Label>
                <Input
                  value={formData.observacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Observação (opcional)"
                  className="bg-white h-10 border-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Parcelas</h3>
              <Badge variant="outline" className="text-xs text-slate-600 border-slate-300 bg-white">
                {parcelas.length}x
              </Badge>
            </div>
            
            <div className="max-h-56 overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-100 sticky top-0">
                  <TableRow>
                    <TableHead className="text-slate-700 font-semibold text-xs py-2.5">Parcela</TableHead>
                    <TableHead className="text-slate-700 font-semibold text-xs py-2.5">Vencimento</TableHead>
                    <TableHead className="text-slate-700 font-semibold text-xs py-2.5 text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map((p, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50 border-b border-slate-100">
                      <TableCell className="font-medium text-slate-900 text-sm py-2">
                        {p.numero_parcela}/{parcelas.length}
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="date"
                          value={p.data_vencimento}
                          onChange={(e) => updateParcela(idx, 'data_vencimento', e.target.value)}
                          className="h-8 border-slate-300 text-sm"
                        />
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={p.valor}
                          onChange={(e) => updateParcela(idx, 'valor', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right border-slate-300 text-sm"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Total:</span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(parcelas.reduce((sum, p) => sum + (Number(p.valor) || 0), 0))}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-end gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isGenerating}
              className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGerar}
              disabled={isGenerating || !formData.conta_bancaria_id || !formData.plano_contas_id || !formData.competencia}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-2 border-emerald-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Gerar Agora
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}