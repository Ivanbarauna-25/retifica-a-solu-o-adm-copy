import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Loader2, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function GerarFinanceiroModal({ isOpen, onClose, nota, fornecedor, onGenerated }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [planosContas, setPlanosContas] = useState([]);
  const [planoContasSelecionado, setPlanoContasSelecionado] = useState('');
  const [formData, setFormData] = useState({
    condicao_pagamento: nota?.condicao_pagamento || 'a_vista',
    numero_parcelas: nota?.numero_parcelas || 1,
    data_vencimento: nota?.data_vencimento || new Date().toISOString().split('T')[0],
    forma_pagamento_id: '',
    competencia: ''
  });
  const [parcelas, setParcelas] = useState([]);

  const { toast } = useToast();

  useEffect(() => {
    loadFormasPagamento();
    loadPlanosContas();
  }, []);

  useEffect(() => {
    if (nota) {
      // Calcular competência a partir da data_emissao
      const competenciaCalculada = nota.data_emissao ? nota.data_emissao.substring(0, 7) : new Date().toISOString().substring(0, 7);
      setFormData(prev => ({ ...prev, competencia: competenciaCalculada }));
    }
  }, [nota]);

  useEffect(() => {
    if (nota?.duplicatas && nota.duplicatas.length > 0) {
      const parcelasFromDuplicatas = nota.duplicatas.map((dup, idx) => ({
        numero: idx + 1,
        valor: dup.valor,
        data_vencimento: dup.vencimento,
        numero_duplicata: dup.numero
      }));
      setParcelas(parcelasFromDuplicatas);
      setFormData(prev => ({
        ...prev,
        condicao_pagamento: parcelasFromDuplicatas.length > 1 ? 'parcelado' : 'a_vista',
        numero_parcelas: parcelasFromDuplicatas.length,
        data_vencimento: parcelasFromDuplicatas[0].data_vencimento || new Date().toISOString().split('T')[0]
      }));
    } else {
      setParcelas(calcularParcelas());
    }
  }, [nota, formData.condicao_pagamento, formData.numero_parcelas, formData.data_vencimento]);

  const loadFormasPagamento = async () => {
    try {
      const formas = await base44.entities.FormaPagamento.list();
      setFormasPagamento(formas || []);
      if (formas && formas.length > 0) {
        setFormData(prev => ({ ...prev, forma_pagamento_id: formas[0].id }));
      }
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento:', error);
    }
  };

  const loadPlanosContas = async () => {
    try {
      const planos = await base44.entities.PlanoContas.list();
      const planosDespesa = (planos || []).filter(p => p.tipo === 'despesa' && p.ativa !== false);
      setPlanosContas(planosDespesa);
      
      if (planosDespesa.length > 0) {
        setPlanoContasSelecionado(planosDespesa[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar planos de contas:', error);
    }
  };

  const calcularParcelas = () => {
    const valorTotal = nota.valor_total;
    const numParcelas = formData.condicao_pagamento === 'a_vista' ? 1 : formData.numero_parcelas;
    const valorParcela = valorTotal / numParcelas;
    const dataBase = new Date(formData.data_vencimento);
    
    const parcelasCalculadas = [];
    for (let i = 0; i < numParcelas; i++) {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);
      
      parcelasCalculadas.push({
        numero: i + 1,
        valor: valorParcela,
        data_vencimento: dataVencimento.toISOString().split('T')[0]
      });
    }
    
    return parcelasCalculadas;
  };

  const handleEditParcela = (index, field, value) => {
    const updated = [...parcelas];
    updated[index][field] = field === 'valor' ? parseFloat(value) || 0 : value;
    setParcelas(updated);
  };

  const handleAddParcela = () => {
    const novaParcela = {
      numero: parcelas.length + 1,
      valor: 0,
      data_vencimento: new Date().toISOString().split('T')[0]
    };
    setParcelas([...parcelas, novaParcela]);
  };

  const handleRemoveParcela = (index) => {
    const updated = parcelas.filter((_, i) => i !== index);
    updated.forEach((p, idx) => p.numero = idx + 1);
    setParcelas(updated);
  };

  const totalParcelas = parcelas.reduce((sum, p) => sum + p.valor, 0);
  const diferenca = Math.abs(totalParcelas - nota.valor_total);
  const parcelasOk = diferenca < 0.01;

  const handleGerar = async () => {
    if (!formData.forma_pagamento_id) {
      toast({
        title: 'Forma de pagamento obrigatória',
        description: 'Selecione uma forma de pagamento.',
        variant: 'destructive'
      });
      return;
    }

    if (!planoContasSelecionado) {
      toast({
        title: 'Plano de contas obrigatório',
        description: 'Selecione um plano de contas para a despesa.',
        variant: 'destructive'
      });
      return;
    }

    if (!parcelasOk) {
      toast({
        title: 'Valores não conferem',
        description: `A soma das parcelas (${formatCurrency(totalParcelas)}) deve ser igual ao valor total da nota (${formatCurrency(nota.valor_total)}).`,
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      for (const parcela of parcelas) {
        const descricao = parcela.numero_duplicata 
          ? `NF ${nota.numero_nota} - Dup. ${parcela.numero_duplicata}`
          : `Nota Fiscal ${nota.numero_nota}${parcelas.length > 1 ? ` - Parcela ${parcela.numero}/${parcelas.length}` : ''}`;

        const contaPagar = await base44.entities.ContasPagar.create({
          descricao: descricao,
          fornecedor_id: nota.fornecedor_id,
          numero_documento: `${nota.numero_nota}${nota.serie ? `/${nota.serie}` : ''}`,
          data_vencimento: parcela.data_vencimento,
          valor_original: parcela.valor,
          status: 'pendente',
          competencia: formData.competencia,
          plano_contas_id: planoContasSelecionado,
          observacoes: `Gerado automaticamente da NF-e ${nota.numero_nota}${nota.serie ? `/${nota.serie}` : ''}\nFornecedor: ${fornecedor?.nome || ''}\nChave: ${nota.chave_acesso || ''}\nParcela ${parcela.numero}/${parcelas.length}`
        });

        await base44.entities.MovimentacaoFinanceira.create({
          tipo_movimentacao: 'debito',
          numero_documento: `${nota.numero_nota}${nota.serie ? `/${nota.serie}` : ''}`,
          contato_tipo: 'fornecedor',
          contato_id: nota.fornecedor_id,
          data_faturamento: nota.data_emissao,
          data_vencimento: parcela.data_vencimento,
          competencia: formData.competencia,
          historico: descricao,
          forma_pagamento_id: formData.forma_pagamento_id,
          origem: 'compras',
          nota_fiscal_id: nota.id,
          valor_total: parcela.valor,
          status: 'pendente',
          planos_contas: [{
            plano_contas_id: planoContasSelecionado,
            valor: parcela.valor,
            tipo: 'debito',
            observacao: `Despesa ref. NF ${nota.numero_nota}`
          }],
          parcelas: [{
            numero_parcela: parcela.numero,
            data_vencimento: parcela.data_vencimento,
            valor: parcela.valor,
            status: 'pendente'
          }]
        });
      }

      await base44.entities.NotaFiscalEntrada.update(nota.id, {
        movimentacao_financeira_gerada: true,
        condicao_pagamento: formData.condicao_pagamento,
        numero_parcelas: parcelas.length,
        data_vencimento: formData.data_vencimento 
      });

      toast({
        title: '✅ Movimentação financeira gerada!',
        description: `${parcelas.length} ${parcelas.length === 1 ? 'lançamento criado' : 'lançamentos criados'} em Contas a Pagar e Movimentação Financeira.`
      });

      if (typeof onGenerated === 'function') {
        await onGenerated();
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao gerar movimentação financeira:', error);
      toast({
        title: 'Erro ao gerar movimentação',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <style>{`
        .gerar-financeiro-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .gerar-financeiro-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .gerar-financeiro-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .gerar-financeiro-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .gerar-financeiro-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .gerar-financeiro-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .gerar-financeiro-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .gerar-financeiro-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .gerar-financeiro-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .gerar-financeiro-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-4xl h-[95vh] md:max-h-[90vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-3 md:px-6 py-3 md:py-4 sticky top-0 z-10">
            <DialogTitle className="flex items-center gap-3 text-white">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-white" />
              <span className="text-base md:text-lg">Gerar Movimentação Financeira</span>
            </DialogTitle>
          </DialogHeader>

          <div className="gerar-financeiro-scroll flex-1 px-3 md:px-6 pb-3 md:pb-6 space-y-3 md:space-y-6 mt-3 md:mt-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 md:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <p className="text-xs text-black font-medium">Nota Fiscal</p>
                    <p className="font-bold text-base md:text-lg text-black">{nota.numero_nota}{nota.serie && `/${nota.serie}`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-black font-medium">Fornecedor</p>
                    <p className="font-semibold text-sm md:text-base text-black">{fornecedor?.nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-black font-medium">Data Emissão</p>
                    <p className="font-semibold text-sm md:text-base text-black">{formatDate(nota.data_emissao)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-black font-medium">Valor Total</p>
                    <p className="font-bold text-lg md:text-xl text-black">{formatCurrency(nota.valor_total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label className="text-sm font-bold text-black">Condição de Pagamento</Label>
                <Select 
                  value={formData.condicao_pagamento} 
                  onValueChange={(v) => {
                    setFormData({ ...formData, condicao_pagamento: v, numero_parcelas: v === 'a_vista' ? 1 : formData.numero_parcelas });
                    if (!nota?.duplicatas || nota.duplicatas.length === 0) {
                      setParcelas(calcularParcelas());
                    }
                  }}
                  disabled={nota?.duplicatas && nota.duplicatas.length > 0}
                >
                  <SelectTrigger className="mt-1.5 border-2 bg-white text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="a_vista">À Vista</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.condicao_pagamento === 'parcelado' && (
                <div>
                  <Label className="text-sm font-bold text-black">Número de Parcelas</Label>
                  <Input
                    type="number"
                    min="2"
                    max="12"
                    value={formData.numero_parcelas}
                    onChange={(e) => {
                      setFormData({ ...formData, numero_parcelas: Number(e.target.value) });
                      if (!nota?.duplicatas || nota.duplicatas.length === 0) {
                        setParcelas(calcularParcelas());
                      }
                    }}
                    disabled={nota?.duplicatas && nota.duplicatas.length > 0}
                    className="mt-1.5 border-2 bg-white text-black"
                  />
                </div>
              )}
              
              <div>
                <Label className="text-sm font-bold text-black">
                  {formData.condicao_pagamento === 'a_vista' ? 'Data de Vencimento' : 'Vencimento 1ª Parcela'}
                </Label>
                <Input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                  className="mt-1.5 border-2 bg-white text-black border-slate-300"
                  disabled={nota?.duplicatas && nota.duplicatas.length > 0}
                />
              </div>

              <div>
                <Label className="text-sm font-bold text-black">Forma de Pagamento</Label>
                <Select 
                  value={formData.forma_pagamento_id} 
                  onValueChange={(v) => setFormData({ ...formData, forma_pagamento_id: v })}
                >
                  <SelectTrigger className="mt-1.5 border-2 bg-white text-black">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {formasPagamento.map(forma => (
                      <SelectItem key={forma.id} value={forma.id}>{forma.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-sm font-bold text-black">Plano de Contas (Despesa)</Label>
                <Select 
                  value={planoContasSelecionado} 
                  onValueChange={setPlanoContasSelecionado}
                >
                  <SelectTrigger className="mt-1.5 border-2 bg-white text-black">
                    <SelectValue placeholder="Selecione o plano de contas..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {planosContas.map(plano => (
                      <SelectItem key={plano.id} value={plano.id}>
                        {plano.codigo} - {plano.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {planosContas.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Nenhum plano de contas de despesa encontrado. Cadastre em Plano de Contas.
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-bold text-black">Competência</Label>
                <Input
                  type="month"
                  value={formData.competencia}
                  onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
                  className="mt-1.5 border-2 bg-white text-black border-slate-300"
                />
              </div>
            </div>

            <Card className="bg-white border border-slate-200">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-black text-sm md:text-base">
                    Parcelas - {parcelas.length} {parcelas.length === 1 ? 'Lançamento' : 'Lançamentos'}
                  </h3>
                  {nota?.duplicatas && nota.duplicatas.length > 0 ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Extraído do XML
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddParcela}
                      disabled={isProcessing}
                      className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 h-8 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2 max-h-60 md:max-h-80 overflow-y-auto">
                  {parcelas.map((parcela, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 md:p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="w-7 h-7 md:w-8 md:h-8 bg-slate-600 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
                        {parcela.numero}
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-black">Valor</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={parcela.valor}
                            onChange={(e) => handleEditParcela(idx, 'valor', e.target.value)}
                            disabled={nota?.duplicatas && nota.duplicatas.length > 0}
                            className="h-8 bg-white text-black border-slate-300"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-black">Vencimento</Label>
                          <Input
                            type="date"
                            value={parcela.data_vencimento}
                            onChange={(e) => handleEditParcela(idx, 'data_vencimento', e.target.value)}
                            className="h-8 bg-white text-black border-slate-300"
                          />
                        </div>
                      </div>
                      {(!nota?.duplicatas || nota.duplicatas.length === 0) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveParcela(idx)}
                          disabled={parcelas.length === 1 || isProcessing}
                          className="flex-shrink-0 bg-slate-600 hover:bg-slate-700 text-white h-8 w-8"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 md:mt-4 p-2 md:p-3 bg-slate-100 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm font-medium text-black">Total das Parcelas:</span>
                    <span className={`text-base md:text-lg font-bold ${parcelasOk ? 'text-black' : 'text-red-600'}`}>
                      {formatCurrency(totalParcelas)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs md:text-sm font-medium text-black">Valor da Nota:</span>
                    <span className="text-base md:text-lg font-bold text-black">
                      {formatCurrency(nota.valor_total)}
                    </span>
                  </div>
                  {!parcelasOk && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      ⚠️ Diferença: {formatCurrency(diferenca)} - Ajuste os valores das parcelas!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 md:gap-3 px-3 md:px-6 py-3 md:py-4 border-t bg-white">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 h-10 w-full sm:w-auto text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGerar}
              disabled={isProcessing || !parcelasOk || !planoContasSelecionado || !formData.competencia}
              className="bg-slate-600 hover:bg-slate-700 text-white gap-2 h-10"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Gerando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Confirmar e Gerar</span>
                  <span className="sm:hidden">Gerar</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}