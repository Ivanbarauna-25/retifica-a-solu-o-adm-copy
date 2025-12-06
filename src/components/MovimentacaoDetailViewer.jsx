
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate } from '@/components/formatters';
import { base44 } from '@/api/base44Client';
import { X, FileText, Paperclip, Edit, ArrowDownCircle, Trash2, Printer, ExternalLink, RotateCcw, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import BaixaModal from '@/components/modals/BaixaModal';
import ConfirmDialog from '@/components/ConfirmDialog';
// AuthConfirmModal is no longer used for delete/cancel actions within this component's logic flow
// import AuthConfirmModal from '@/components/modals/AuthConfirmModal';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function MovimentacaoDetailViewer({
  open,
  movimentacao,
  onClose,
  onEdit,
  onBaixa, // This prop remains for full movimentacao baixa, though parcela-specific is preferred now
  onRenegociar,
  onCancelar, // This prop is still present, but the button/logic to trigger it is removed from the UI
  onDelete,
  onUpdateStatus, // New prop from outline, but not explicitly used in provided outline for buttons
  allContacts,
  contasBancarias,
  formasPagamento,
  condicoesPagamento, // New prop from outline, but not explicitly used in provided outline
  planoContas,
  onBaixaParcela
}) {
  const { toast } = useToast();
  const [isBaixaModalOpen, setIsBaixaModalOpen] = useState(false);
  const [baixaPrefill, setBaixaPrefill] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState({});
  // AuthModal is no longer directly triggered by delete/cancel in this component
  // const [authModalOpen, setAuthModalOpen] = useState(false);
  // const [authModalData, setAuthModalData] = useState({});
  
  // ✅ NOVO: Estados para reabertura de parcela
  const [isReopeningParcela, setIsReopeningParcela] = useState(false);
  const [confirmReabrirParcela, setConfirmReabrirParcela] = useState(null);

  const [isDeleting, setIsDeleting] = useState(false); // ✅ NOVO: Estado para loading de exclusão

  // Estados para rastreamento de origem
  const [origemData, setOrigemData] = useState(null);
  const [isLoadingOrigem, setIsLoadingOrigem] = useState(false);

  const planoContasMap = useMemo(() => {
    return (planoContas || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});
  }, [planoContas]);

  const contaBancariaMap = useMemo(() => {
    return (contasBancarias || []).reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [contasBancarias]);

  const formaPagamentoMap = useMemo(() => {
    return (formasPagamento || []).reduce((acc, f) => {
      acc[f.id] = f;
      return acc;
    }, {});
  }, [formasPagamento]);

  const resolveContatoNome = (movimentacao) => {
    if (!movimentacao || !allContacts) return 'N/A';
    const contato = allContacts.find(c => 
      c.id === movimentacao.contato_id && c.tipo === movimentacao.contato_tipo
    );
    return contato?.nome || 'N/A';
  };

  const totalParcelas = useMemo(() => {
    return (movimentacao?.parcelas || []).reduce((sum, p) => sum + (p.valor || 0), 0);
  }, [movimentacao]);
  
  // ✅ NOVO: Verificar se tem parcelas baixadas
  const temParcelasBaixadas = useMemo(() => {
    return (movimentacao?.parcelas || []).some(p => p.status === 'pago');
  }, [movimentacao?.parcelas]);

  // ✅ NOVO: Verificar se TODAS as parcelas estão baixadas
  const todasParcelasBaixadas = useMemo(() => {
    const parcelas = movimentacao?.parcelas || [];
    return parcelas.length > 0 && parcelas.every(p => p.status === 'pago');
  }, [movimentacao?.parcelas]);

  // Carregar dados da origem quando o viewer abre
  useEffect(() => {
    const loadOrigemData = async () => {
      if (!movimentacao || !movimentacao.origem || movimentacao.origem === 'manual') {
        setOrigemData(null);
        return;
      }

      setIsLoadingOrigem(true);
      try {
        let data = null;
        
        if (movimentacao.origem === 'os' && movimentacao.os_id) {
          data = await base44.entities.OrdemServico.get(movimentacao.os_id);
          data._tipo = 'os';
        } else if (movimentacao.origem === 'compras' && movimentacao.nota_fiscal_id) {
          data = await base44.entities.NotaFiscalEntrada.get(movimentacao.nota_fiscal_id);
          data._tipo = 'nota_fiscal';
        } else if (movimentacao.origem === 'orcamento' && movimentacao.orcamento_id) {
          data = await base44.entities.Orcamento.get(movimentacao.orcamento_id);
          data._tipo = 'orcamento';
        }
        
        setOrigemData(data);
      } catch (error) {
        console.error('Erro ao carregar dados da origem:', error);
        setOrigemData(null);
      } finally {
        setIsLoadingOrigem(false);
      }
    };

    if (open && movimentacao) {
      loadOrigemData();
    }
  }, [open, movimentacao]);

  // Função para navegar para a origem
  const handleNavigateToOrigem = () => {
    if (!origemData) return;

    if (origemData._tipo === 'os') {
      window.open(createPageUrl('OrdensServico'), '_blank');
    } else if (origemData._tipo === 'nota_fiscal') {
      window.open(createPageUrl('NotasFiscais'), '_blank');
    } else if (origemData._tipo === 'orcamento') {
      window.open(createPageUrl('Orcamentos'), '_blank');
    }
  };

  // Função para formatar label da origem
  const getOrigemLabel = () => {
    if (!movimentacao) return '-';
    
    const origemLabels = {
      'manual': 'Manual',
      'os': 'Ordem de Serviço',
      'compras': 'Nota Fiscal',
      'orcamento': 'Orçamento',
      'folha_pagamento': 'Folha de Pagamento',
      'renegociacao': 'Renegociação'
    };

    let label = origemLabels[movimentacao.origem] || movimentacao.origem || '-';
    
    if (origemData) {
      if (origemData._tipo === 'os') {
        label += ` #${origemData.numero_os}`;
      } else if (origemData._tipo === 'nota_fiscal') {
        label += ` ${origemData.numero_nota}${origemData.serie ? `/${origemData.serie}` : ''}`;
      } else if (origemData._tipo === 'orcamento') {
        label += ` ${origemData.numero_orcamento}`;
      }
    }
    
    return label;
  };

  const handleBaixaParcelaClick = (parcelaIndex) => {
    const parcela = (movimentacao.parcelas || [])[parcelaIndex];
    if (!parcela) return;
    
    // ✅ NOVO: Verificar se já está paga
    if (parcela.status === 'pago') {
      toast({
        title: 'Parcela já baixada',
        description: 'Esta parcela já foi paga. Use o botão "Reabrir" para desfazer a baixa.',
        variant: 'destructive'
      });
      return;
    }

    const tipo = (movimentacao.tipo_movimentacao || '').toLowerCase();
    const tipoLabel = tipo === 'debito' ? 'Despesa' : tipo === 'credito' ? 'Receita' : tipo === 'investimento' ? 'Investimento' : '—';
    
    setBaixaPrefill({
      movimentacaoId: movimentacao.id,
      parcelaIndex,
      tipoMovimentacao: movimentacao.tipo_movimentacao,
      tipoLabel,
      contatoNome: resolveContatoNome(movimentacao),
      contatoTipo: movimentacao.contato_tipo || null,
      contatoId: movimentacao.contato_id || null,
      numeroDocumento: movimentacao.numero_documento || '-',
      valor: parcela.valor || 0,
      isParcela: true
    });
    setIsBaixaModalOpen(true);
  };

  const handleConfirmBaixaParcela = async (dados) => {
    if (!baixaPrefill || typeof baixaPrefill.parcelaIndex !== 'number') {
      toast({ title: 'Erro', description: 'Dados da parcela não encontrados', variant: 'destructive' });
      return;
    }

    if (typeof onBaixaParcela === 'function') {
      await onBaixaParcela({
        movimentacaoId: baixaPrefill.movimentacaoId,
        parcelaIndex: baixaPrefill.parcelaIndex,
        baixa: dados
      });
    }
    setIsBaixaModalOpen(false);
    setBaixaPrefill(null);
  };

  // ✅ NOVO: Handler para reabrir parcela
  const handleReabrirParcelaClick = (parcelaIndex) => {
    const parcela = (movimentacao.parcelas || [])[parcelaIndex];
    if (!parcela || parcela.status !== 'pago') return;

    setConfirmReabrirParcela({
      parcelaIndex,
      numeroParcela: parcela.numero_parcela || (parcelaIndex + 1),
      valor: parcela.valor,
      dataBaixa: parcela.data_baixa,
      dataVencimento: parcela.data_vencimento
    });
  };

  // ✅ NOVO: Confirmar reabertura de parcela
  const handleConfirmReabrirParcela = async () => {
    if (!confirmReabrirParcela || !movimentacao) return;

    setIsReopeningParcela(true);
    try {
      const updatedParcelas = (movimentacao.parcelas || []).map((p, idx) =>
        idx === confirmReabrirParcela.parcelaIndex
          ? { ...p, status: 'pendente', data_baixa: null }
          : p
      );

      // Recalcular status geral da movimentação
      const totalBaixadas = updatedParcelas.filter(p => p.status === 'pago').length;
      let novoStatus = 'pendente';
      if (totalBaixadas === updatedParcelas.length && updatedParcelas.length > 0) { // All paid
        novoStatus = 'pago';
      } else if (totalBaixadas > 0) { // Some paid
        novoStatus = 'parcial';
      } else { // None paid
        novoStatus = 'pendente';
      }

      await base44.entities.MovimentacaoFinanceira.update(movimentacao.id, {
        parcelas: updatedParcelas,
        status: novoStatus,
        data_baixa: novoStatus === 'pago' ? movimentacao.data_baixa : null // Preserve if all paid, otherwise clear
      });

      toast({
        title: '✅ Parcela reaberta!',
        description: `Parcela ${confirmReabrirParcela.numeroParcela} voltou ao status "Pendente".`
      });

      // Recarregar movimentação
      // This is a workaround - ideally we'd have an onRefresh callback or update state
      // For now, refreshing the page to show updated data.
      window.location.reload(); 
    } catch (error) {
      toast({
        title: 'Erro ao reabrir parcela',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsReopeningParcela(false);
      setConfirmReabrirParcela(null);
    }
  };

  // ✅ NOVO: Validar ações antes de executar
  const handleEditClick = () => {
    if (temParcelasBaixadas) {
      toast({
        title: 'Edição bloqueada',
        description: 'Não é possível editar movimentações com parcelas baixadas. Reabra as parcelas primeiro.',
        variant: 'destructive'
      });
      return;
    }
    if (typeof onEdit === 'function') {
      onEdit(movimentacao);
    }
  };

  // ✅ REMOVIDO: handleCancelarClick (não é mais necessário) - A funcionalidade de cancelar não está mais no viewer

  // ✅ CORRIGIDO: Atualizar nota fiscal ao excluir movimentação
  const handleDeleteClick = () => {
    if (temParcelasBaixadas) {
      toast({
        title: 'Exclusão bloqueada',
        description: 'Não é possível excluir movimentações com parcelas baixadas. Reabra as parcelas primeiro.',
        variant: 'destructive'
      });
      return;
    }
    
    setConfirmDialogData({
      title: "Confirmar Exclusão",
      description: "Tem certeza que deseja excluir esta movimentação? Todos os dados associados serão perdidos permanentemente.",
      onConfirm: async () => {
        setIsDeleting(true);
        setConfirmDialogOpen(false);
        
        try {
          // ✅ NOVO: Se a movimentação está vinculada a uma nota fiscal, atualizar flag
          if (movimentacao.nota_fiscal_id) {
            try {
              await base44.entities.NotaFiscalEntrada.update(movimentacao.nota_fiscal_id, {
                movimentacao_financeira_gerada: false
              });
            } catch (error) {
              console.error('Erro ao atualizar nota fiscal:', error);
              // Decide if you want to proceed with deletion even if NF update fails,
              // or alert the user. For now, it just logs and continues.
            }
          }

          if (typeof onDelete === 'function') {
            await onDelete(movimentacao.id);
          }
          
          toast({
            title: '✅ Movimentação excluída!',
            description: 'A movimentação foi excluída com sucesso.'
          });
          
          onClose(); // Fecha o modal após a exclusão
        } catch (error) {
          toast({
            title: 'Erro ao excluir',
            description: error.message || 'Ocorreu um erro ao tentar excluir a movimentação.',
            variant: 'destructive'
          });
        } finally {
          setIsDeleting(false);
        }
      }
    });
    setConfirmDialogOpen(true);
  };

  const statusColors = {
    'pendente': 'bg-yellow-100 text-yellow-800',
    'pago': 'bg-green-100 text-green-800',
    'parcial': 'bg-blue-100 text-blue-800',
    'vencido': 'bg-red-200 text-red-900',
    'cancelado': 'bg-gray-200 text-gray-800'
  };

  const statusLabels = {
    'pendente': 'Pendente',
    'pago': 'Pago',
    'parcial': 'Parcial',
    'vencido': 'Vencido',
    'cancelado': 'Cancelado'
  };

  if (!movimentacao) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl w-[95%] max-h-[90vh] overflow-y-auto modern-modal bg-white">
          <DialogHeader className="modern-modal-header sticky top-0 z-10 bg-slate-800 p-4">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="flex items-center gap-3 text-white">
                <FileText className="w-6 h-6 text-white" />
                Movimentação Financeira
                {/* ✅ NOVO: Badge de alerta se tem parcelas baixadas */}
                {temParcelasBaixadas && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className="bg-amber-600 text-white gap-1">
                          <Lock className="w-3 h-3" />
                          Protegido
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">Esta movimentação tem parcelas baixadas.</p>
                        <p className="text-sm">Edição e exclusão estão bloqueados.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {/* ✅ Indicador de loading durante exclusão */}
                {isDeleting && (
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-md">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-700">Excluindo...</span>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => window.print()} 
                  className="text-white hover:bg-slate-700"
                  disabled={isDeleting} // Disable during deletion
                >
                  <Printer className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose} 
                  className="text-white hover:bg-slate-700"
                  disabled={isDeleting} // Disable during deletion
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="resumo" className="mt-4 px-6">
            <TabsList className="grid grid-cols-3 bg-slate-100 p-1 rounded-lg">
              <TabsTrigger value="resumo" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Resumo
              </TabsTrigger>
              <TabsTrigger value="parcelas" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Parcelas ({movimentacao.parcelas?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="anexos" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Anexos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="space-y-6 mt-6">
              {/* ✅ NOVO: Card de aviso se tem parcelas baixadas */}
              {temParcelasBaixadas && (
                <Card className="bg-amber-50 border-amber-300">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">Movimentação Protegida</p>
                      <p className="text-sm text-amber-800 mt-1">
                        Esta movimentação possui parcelas que já foram baixadas (pagas/recebidas). 
                        {todasParcelasBaixadas 
                          ? ' Todas as parcelas estão baixadas.'
                          : ' Algumas parcelas ainda estão pendentes.'}
                      </p>
                      <p className="text-sm text-amber-700 mt-2">
                        <strong>Restrições:</strong> Edição e exclusão bloqueados. 
                        Para modificar, reabra as parcelas baixadas primeiro.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-600 mb-1">Tipo</p>
                    <p className="font-bold text-lg text-slate-900 capitalize">
                      {movimentacao.tipo_movimentacao === 'credito' ? 'Receita' : 
                       movimentacao.tipo_movimentacao === 'debito' ? 'Despesa' : 
                       'Investimento'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-600 mb-1">Status</p>
                    <Badge className={statusColors[movimentacao.status]}>
                      {statusLabels[movimentacao.status]}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-600 mb-1">Valor Total</p>
                    <p className="font-bold text-2xl text-green-600">{formatCurrency(movimentacao.valor_total)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white border border-slate-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Informações Gerais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Número Documento:</p>
                      <p className="font-semibold text-slate-900">{movimentacao.numero_documento || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Contato:</p>
                      <p className="font-semibold text-slate-900">{resolveContatoNome(movimentacao)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Data Faturamento:</p>
                      <p className="font-semibold text-slate-900">{formatDate(movimentacao.data_faturamento)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Data Vencimento:</p>
                      <p className="font-semibold text-slate-900">{formatDate(movimentacao.data_vencimento)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Origem:</p>
                      {origemData ? (
                        <Button
                          variant="link"
                          className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          onClick={handleNavigateToOrigem}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {getOrigemLabel()}
                        </Button>
                      ) : isLoadingOrigem ? (
                        <p className="font-semibold text-slate-900">Carregando...</p>
                      ) : (
                        <p className="font-semibold text-slate-900">{getOrigemLabel()}</p>
                      )}
                    </div>
                    {movimentacao.data_baixa && (
                      <div>
                        <p className="text-slate-600">Data Baixa:</p>
                        <p className="font-semibold text-green-600">{formatDate(movimentacao.data_baixa)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Histórico</h3>
                  <p className="text-slate-700 whitespace-pre-wrap">{movimentacao.historico || '-'}</p>
                </CardContent>
              </Card>

              {movimentacao.planos_contas && movimentacao.planos_contas.length > 0 && (
                <Card className="bg-white border border-slate-200">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Planos de Contas</h3>
                    <div className="space-y-2">
                      {movimentacao.planos_contas.map((plano, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {planoContasMap[plano.plano_contas_id]?.nome || plano.plano_contas_id}
                            </p>
                            {plano.observacao && <p className="text-xs text-slate-600">{plano.observacao}</p>}
                          </div>
                          <div className="text-right">
                            <Badge variant={plano.tipo === 'debito' ? 'destructive' : 'default'}>
                              {plano.tipo === 'debito' ? 'Débito' : 'Crédito'}
                            </Badge>
                            <p className="font-bold text-slate-900 mt-1">{formatCurrency(plano.valor)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="parcelas" className="space-y-6 mt-6">
              <Card className="bg-white border border-slate-200">
                <CardContent className="p-6">
                  {(!movimentacao.parcelas || movimentacao.parcelas.length === 0) ? (
                    <p className="text-center text-slate-500 py-8">Nenhuma parcela cadastrada.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-800">
                            <TableHead className="text-white">Parcela</TableHead>
                            <TableHead className="text-white">Vencimento</TableHead>
                            <TableHead className="text-white">Valor</TableHead>
                            <TableHead className="text-white">Status</TableHead>
                            <TableHead className="text-white">Data Baixa</TableHead>
                            <TableHead className="text-white text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movimentacao.parcelas.map((parcela, idx) => (
                            <TableRow key={idx} className="bg-white hover:bg-slate-50">
                              <TableCell className="font-semibold text-slate-900">
                                {parcela.numero_parcela}/{movimentacao.parcelas.length}
                              </TableCell>
                              <TableCell className="text-slate-900">{formatDate(parcela.data_vencimento)}</TableCell>
                              <TableCell className="font-semibold text-slate-900">{formatCurrency(parcela.valor)}</TableCell>
                              <TableCell>
                                <Badge className={statusColors[parcela.status]}>
                                  {statusLabels[parcela.status] || parcela.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-900">
                                {parcela.data_baixa ? formatDate(parcela.data_baixa) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* ✅ Botão Baixar - só aparece se pendente */}
                                  {parcela.status !== 'pago' && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleBaixaParcelaClick(idx)}
                                            className="text-green-600 hover:text-green-800 hover:bg-green-50"
                                            disabled={isDeleting} // Disable during deletion
                                          >
                                            <ArrowDownCircle className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Registrar Baixa</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  
                                  {/* ✅ NOVO: Botão Reabrir - só aparece se paga */}
                                  {parcela.status === 'pago' && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleReabrirParcelaClick(idx)}
                                            className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                            disabled={isReopeningParcela || isDeleting} // Disable during deletion
                                          >
                                            <RotateCcw className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Reabrir Parcela</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-300 mt-4">
                    <p className="font-bold text-slate-900">Total das Parcelas:</p>
                    <p className="font-bold text-xl text-slate-900">{formatCurrency(totalParcelas)}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anexos" className="space-y-6 mt-6">
              <Card className="bg-white border border-slate-200">
                <CardContent className="p-6">
                  {(!movimentacao.anexos || movimentacao.anexos.length === 0) ? (
                    <p className="text-center text-slate-500 py-8">Nenhum anexo disponível.</p>
                  ) : (
                    <div className="space-y-2">
                      {movimentacao.anexos.map((url, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-700">{url.split('/').pop()}</span>
                          </div>
                          <a href={url} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" disabled={isDeleting}> {/* Disable during deletion */}
                              Ver Anexo
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="bg-slate-50 p-4 border-t flex justify-between items-center">
            <span className="text-xs text-slate-500">
              Criado em {formatDate(movimentacao.created_date)}
            </span>
            <div className="flex items-center gap-2">
              {/* ✅ NOVO: Botões com validação de bloqueio */}
              <TooltipProvider>
                {/* Editar */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button 
                        variant="outline" 
                        onClick={handleEditClick}
                        disabled={temParcelasBaixadas || isDeleting} // Disable during deletion
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {temParcelasBaixadas && (
                    <TooltipContent>
                      <p>Edição bloqueada: movimentação com parcelas baixadas</p>
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* ✅ REMOVIDO: Botão de Cancelar */}
                {/* O botão de cancelar foi removido conforme a outline. 
                    A lógica de `onCancelar` pode ser gerenciada externamente ou por outra interface. */}

                {/* Excluir */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteClick}
                        disabled={temParcelasBaixadas || isDeleting} // Disable during deletion
                        className="gap-2"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {temParcelasBaixadas && (
                    <TooltipContent>
                      <p>Exclusão bloqueada: movimentação com parcelas baixadas</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isDeleting} // Disable during deletion
              >
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Modal de Baixa */}
      {isBaixaModalOpen && (
        <BaixaModal
          open={isBaixaModalOpen}
          onClose={() => {
            setIsBaixaModalOpen(false);
            setBaixaPrefill(null);
          }}
          contas={contasBancarias}
          formas={formasPagamento}
          prefill={baixaPrefill}
          onConfirm={baixaPrefill?.isParcela ? handleConfirmBaixaParcela : undefined}
        />
      )}

      {/* Existing modals, re-configured to use the new state management variables */}
      {/* Confirm dialog for generic actions (now primarily for delete) */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        title={confirmDialogData.title}
        description={confirmDialogData.description}
        onConfirm={confirmDialogData.onConfirm}
        confirmText="Confirmar" // Default text for confirmation
        loading={isDeleting} // Connect to isDeleting state
      />

      {/* Auth confirmation for sensitive actions (removed usage within this component) */}
      {/* <AuthConfirmModal
        open={authModalOpen}
        action={authModalData.action}
        onClose={() => setAuthModalOpen(false)}
        onConfirm={(authData) => {
          if (authModalData.action === "excluir") onDelete?.(movimentacao.id, authData);
          if (authModalData.action === "cancelar") onCancelar?.(movimentacao.id, authData);
          setAuthModalOpen(false);
          setConfirmDialogOpen(false); // Close confirm dialog as well
        }}
      /> */}

      {/* ✅ NOVO: Diálogo de Confirmação de Reabertura */}
      <ConfirmDialog
        isOpen={!!confirmReabrirParcela}
        onClose={() => setConfirmReabrirParcela(null)}
        title="Reabrir Parcela"
        description={
          confirmReabrirParcela
            ? `Deseja reabrir a parcela ${confirmReabrirParcela.numeroParcela} (vencimento em ${formatDate(confirmReabrirParcela.dataVencimento)})? O valor de ${formatCurrency(confirmReabrirParcela.valor)} voltará ao status "Pendente" e a baixa de ${formatDate(confirmReabrirParcela.dataBaixa)} será desfeita.`
            : ''
        }
        onConfirm={handleConfirmReabrirParcela}
        confirmText="Reabrir Parcela"
        loading={isReopeningParcela}
      />
    </>
  );
}
