import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Merge, AlertCircle, CheckCircle2, X, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function AgruparOSModal({ isOpen, onClose, osIds, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [osData, setOsData] = useState([]);
  const [novoNumeroOS, setNovoNumeroOS] = useState('');
  const [novaDataAbertura, setNovaDataAbertura] = useState('');
  const [observacoesAgrupamento, setObservacoesAgrupamento] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && osIds?.length > 0) {
      carregarOSs();
    }
  }, [isOpen, osIds]);

  const carregarOSs = async () => {
    try {
      const promises = osIds.map(id => base44.entities.OrdemServico.filter({ id }));
      const results = await Promise.all(promises);
      const oss = results.map(r => r[0]).filter(Boolean);
      
      // Verificar se todas são do mesmo cliente
      const clienteIds = [...new Set(oss.map(os => os.contato_id))];
      if (clienteIds.length > 1) {
        toast({
          title: 'Erro ao agrupar',
          description: 'Só é possível agrupar OSs do mesmo cliente',
          variant: 'destructive'
        });
        onClose();
        return;
      }

      setOsData(oss);
      
      // Sugerir novo número e usar a data mais antiga
      const numerosOS = oss.map(os => os.numero_os).join(' + ');
      setNovoNumeroOS(numerosOS);
      
      const datasMaisAntigas = oss.map(os => new Date(os.data_abertura)).sort((a, b) => a - b);
      setNovaDataAbertura(datasMaisAntigas[0].toISOString().split('T')[0]);
    } catch (error) {
      console.error('Erro ao carregar OSs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as ordens de serviço',
        variant: 'destructive'
      });
    }
  };

  const calcularTotais = () => {
    const totais = {
      produtos: 0,
      servicos: 0,
      despesas: 0,
      desconto: 0,
      total: 0
    };

    osData.forEach(os => {
      const produtos = (os.itens || [])
        .filter(item => item.tipo === 'produto')
        .reduce((sum, item) => sum + (item.valor_total || 0), 0);
      
      const servicos = (os.itens || [])
        .filter(item => item.tipo === 'servico')
        .reduce((sum, item) => sum + (item.valor_total || 0), 0);

      totais.produtos += produtos;
      totais.servicos += servicos;
      totais.despesas += os.outras_despesas || 0;
      totais.desconto += os.desconto_valor || 0;
    });

    totais.total = totais.produtos + totais.servicos + totais.despesas - totais.desconto;
    return totais;
  };

  const handleAgrupar = async () => {
    if (!novoNumeroOS.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o número da nova OS',
        variant: 'destructive'
      });
      return;
    }

    if (!novaDataAbertura) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe a data de abertura',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Obter dados da primeira OS como base
      const osBase = osData[0];
      
      // Consolidar todos os itens
      const itensAgrupados = [];
      osData.forEach(os => {
        if (os.itens && Array.isArray(os.itens)) {
          os.itens.forEach(item => {
            itensAgrupados.push({
              ...item,
              id: crypto.randomUUID(),
              descricao: item.descricao + ` (OS: ${os.numero_os})`
            });
          });
        }
      });

      // Consolidar observações
      const observacoesConsolidadas = osData
        .map(os => {
          let obs = `[OS ${os.numero_os}]\n`;
          if (os.observacoes) {
            obs += os.observacoes + '\n';
          }
          return obs;
        })
        .join('\n');

      const observacoesFinal = observacoesAgrupamento 
        ? `${observacoesAgrupamento}\n\n--- HISTÓRICO DAS OSs AGRUPADAS ---\n${observacoesConsolidadas}`
        : observacoesConsolidadas;

      const totais = calcularTotais();

      // Criar nova OS agrupada
      const novaOS = {
        numero_os: novoNumeroOS.trim(),
        data_abertura: novaDataAbertura,
        contato_id: osBase.contato_id,
        contato_tipo: osBase.contato_tipo,
        veiculo_id: osBase.veiculo_id || '',
        funcionario_id: osBase.funcionario_id || '',
        vendedor_id: osBase.vendedor_id || '',
        status: 'em_andamento',
        itens: itensAgrupados,
        outras_despesas: totais.despesas,
        desconto_tipo: 'valor',
        desconto_valor: totais.desconto,
        valor_total: totais.total,
        observacoes: observacoesFinal
      };

      console.log('Criando OS agrupada:', novaOS);
      await base44.entities.OrdemServico.create(novaOS);

      // Cancelar as OSs originais
      for (const os of osData) {
        await base44.entities.OrdemServico.update(os.id, {
          status: 'cancelado',
          observacoes: (os.observacoes || '') + `\n\n[AGRUPADA] Esta OS foi agrupada na OS ${novoNumeroOS} em ${new Date().toLocaleDateString()}`
        });
      }

      toast({
        title: 'OSs agrupadas com sucesso!',
        description: `Nova OS ${novoNumeroOS} criada. ${osData.length} OSs foram canceladas.`
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Erro ao agrupar OSs:', error);
      toast({
        title: 'Erro ao agrupar',
        description: error.message || 'Não foi possível agrupar as ordens de serviço',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setOsData([]);
      setNovoNumeroOS('');
      setNovaDataAbertura('');
      setObservacoesAgrupamento('');
      onClose();
    }
  };

  const totais = osData.length > 0 ? calcularTotais() : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center">
              <Merge className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Agrupar Ordens de Serviço
              </DialogTitle>
              <DialogDescription className="text-blue-100 text-sm">
                Consolidar {osData.length} OSs em uma única ordem
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              As OSs originais serão marcadas como "Canceladas" e uma nova OS será criada com todos os itens consolidados.
            </AlertDescription>
          </Alert>

          {osData.length > 0 && (
            <>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b">
                  <h3 className="font-semibold text-slate-800">OSs Selecionadas</h3>
                </div>
                <div className="overflow-auto max-h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº OS</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Produtos</TableHead>
                        <TableHead className="text-right">Serviços</TableHead>
                        <TableHead className="text-right">Despesas</TableHead>
                        <TableHead className="text-right">Desconto</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {osData.map(os => {
                        const produtos = (os.itens || [])
                          .filter(item => item.tipo === 'produto')
                          .reduce((sum, item) => sum + (item.valor_total || 0), 0);
                        const servicos = (os.itens || [])
                          .filter(item => item.tipo === 'servico')
                          .reduce((sum, item) => sum + (item.valor_total || 0), 0);
                        
                        return (
                          <TableRow key={os.id}>
                            <TableCell className="font-medium">{os.numero_os}</TableCell>
                            <TableCell>{formatDate(os.data_abertura)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(produtos)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(servicos)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(os.outras_despesas || 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(os.desconto_valor || 0)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(os.valor_total)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {totais && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Totais da Nova OS</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-blue-700">Produtos</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(totais.produtos)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-blue-700">Serviços</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(totais.servicos)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-blue-700">Despesas</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(totais.despesas)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-blue-700">Desconto</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(totais.desconto)}</p>
                    </div>
                    <div className="text-center bg-blue-600 rounded-lg p-2">
                      <p className="text-xs text-blue-100">Total</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(totais.total)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Número da Nova OS *</Label>
                  <Input
                    value={novoNumeroOS}
                    onChange={(e) => setNovoNumeroOS(e.target.value)}
                    placeholder="Ex: OS-1001"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label>Data de Abertura *</Label>
                  <Input
                    type="date"
                    value={novaDataAbertura}
                    onChange={(e) => setNovaDataAbertura(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <Label>Observações do Agrupamento</Label>
                <Textarea
                  value={observacoesAgrupamento}
                  onChange={(e) => setObservacoesAgrupamento(e.target.value)}
                  placeholder="Informações adicionais sobre o agrupamento (opcional)"
                  rows={3}
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-500 mt-1">
                  As observações das OSs originais serão preservadas automaticamente
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleAgrupar}
            disabled={isLoading || osData.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>Agrupando...</>
            ) : (
              <>
                <Merge className="w-4 h-4 mr-2" />
                Agrupar OSs
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}