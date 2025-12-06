import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, X, FileText, Package, CheckCircle, Loader2, AlertCircle, DollarSign, Edit, RotateCcw, ExternalLink, FileDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import ProcessarItensModal from '@/components/notasfiscais/ProcessarItensModal';
import GerarFinanceiroModal from '@/components/notasfiscais/GerarFinanceiroModal';
import EstoqueForm from '@/components/EstoqueForm';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function NotaFiscalViewer({ isOpen, onClose, nota, fornecedores, onUpdated }) {
  const [itens, setItens] = useState([]);
  const [isLoadingItens, setIsLoadingItens] = useState(true);
  const [isProcessarOpen, setIsProcessarOpen] = useState(false);
  const [isGerarFinanceiroOpen, setIsGerarFinanceiroOpen] = useState(false);
  const [isEditProdutoOpen, setIsEditProdutoOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [isReopening, setIsReopening] = useState(false);
  const [movimentacoesGeradas, setMovimentacoesGeradas] = useState([]);
  const [isLoadingMovimentacoes, setIsLoadingMovimentacoes] = useState(false);
  const [isGeneratingDanfe, setIsGeneratingDanfe] = useState(false);
  const [confirmReabrirOpen, setConfirmReabrirOpen] = useState(false);
  const [notaAtualizada, setNotaAtualizada] = useState(nota);
  
  const { toast } = useToast();

  useEffect(() => {
    setNotaAtualizada(nota);
  }, [nota]);

  useEffect(() => {
    if (notaAtualizada?.id) {
      loadItens();
      if (notaAtualizada.movimentacao_financeira_gerada) {
        loadMovimentacoes();
      }
    }
  }, [notaAtualizada]);

  const loadItens = async () => {
    setIsLoadingItens(true);
    try {
      const itensData = await base44.entities.ItemNotaFiscal.filter({ nota_fiscal_id: notaAtualizada.id });
      setItens(itensData || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar itens',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingItens(false);
    }
  };

  const loadMovimentacoes = async () => {
    setIsLoadingMovimentacoes(true);
    try {
      const movimentacoes = await base44.entities.MovimentacaoFinanceira.filter({
        nota_fiscal_id: notaAtualizada.id,
        origem: 'compras'
      });
      setMovimentacoesGeradas(movimentacoes || []);
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
    } finally {
      setIsLoadingMovimentacoes(false);
    }
  };

  const getFornecedorNome = () => {
    const fornecedor = fornecedores.find(f => f.id === notaAtualizada.fornecedor_id);
    return fornecedor?.nome || '-';
  };

  const handleItemClick = async (item) => {
    if (!item.produto_id) {
      toast({
        title: 'Produto não vinculado',
        description: 'Este item ainda não foi processado.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const produtos = await base44.entities.Peca.filter({ id: item.produto_id });
      if (produtos && produtos[0]) {
        setSelectedProduto(produtos[0]);
        setIsEditProdutoOpen(true);
      }
    } catch (error) {
      toast({
        title: 'Erro ao carregar produto',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleReabrirEntrada = async () => {
    if (notaAtualizada?.movimentacao_financeira_gerada) {
      toast({
        title: '❌ Reabertura bloqueada',
        description: 'Esta nota fiscal possui movimentação financeira gerada. Cancele ou exclua a movimentação primeiro.',
        variant: 'destructive'
      });
      return;
    }

    setConfirmReabrirOpen(true);
  };

  const confirmarReabrirEntrada = async () => {
    setIsReopening(true);
    setConfirmReabrirOpen(false);
    
    try {
      for (const item of itens) {
        await base44.entities.ItemNotaFiscal.update(item.id, {
          processado: false,
          produto_id: null
        });
      }

      await base44.entities.NotaFiscalEntrada.update(notaAtualizada.id, {
        status: 'pendente'
      });

      toast({
        title: '✅ Entrada reaberta!',
        description: 'Os itens podem ser reprocessados agora.'
      });

      await loadItens();
      
      const notaRefresh = await base44.entities.NotaFiscalEntrada.get(notaAtualizada.id);
      setNotaAtualizada(notaRefresh);
      
      if (typeof onUpdated === 'function') {
        await onUpdated();
      }
    } catch (error) {
      toast({
        title: 'Erro ao reabrir entrada',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsReopening(false);
    }
  };

  const handleFinanceiroGerado = async () => {
    try {
      setNotaAtualizada(prev => ({
        ...prev,
        movimentacao_financeira_gerada: true
      }));
      
      setIsGerarFinanceiroOpen(false);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const notaRefresh = await base44.entities.NotaFiscalEntrada.get(notaAtualizada.id);
      setNotaAtualizada(notaRefresh);
      
      await loadMovimentacoes();
      
      if (typeof onUpdated === 'function') {
        await onUpdated();
      }
      
      toast({
        title: '✅ Sucesso!',
        description: 'Movimentação financeira gerada e status atualizado.'
      });
    } catch (error) {
      console.error('Erro ao atualizar nota:', error);
      
      setNotaAtualizada(prev => ({
        ...prev,
        movimentacao_financeira_gerada: false
      }));
      
      toast({
        title: 'Erro ao atualizar status',
        description: 'A movimentação foi gerada, mas o status visual não pôde ser atualizado. Reabra a nota.',
        variant: 'destructive'
      });
    }
  };

  const handleVerMovimentacao = (movimentacao) => {
    window.open(createPageUrl('MovimentacaoFinanceira') + `?movimentacao_id=${movimentacao.id}`, '_blank');
  };

  const handleGerarDanfe = async () => {
    if (!notaAtualizada?.xml_nfe) {
      toast({
        title: 'XML não disponível',
        description: 'Esta nota fiscal não possui XML para gerar o DANFE.',
        variant: 'destructive'
      });
      return;
    }

    setIsGeneratingDanfe(true);
    try {
      const response = await base44.functions.invoke('gerarDanfe', {
        nota_fiscal_id: notaAtualizada.id
      });

      if (response.data?.success && response.data?.danfe_html) {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(response.data.danfe_html);
          newWindow.document.close();
          
          toast({
            title: '✅ DANFE gerado!',
            description: 'O documento foi aberto em uma nova aba.'
          });
        } else {
          toast({
            title: 'Pop-up bloqueado',
            description: 'Permita pop-ups para este site e tente novamente.',
            variant: 'destructive'
          });
        }
      } else {
        throw new Error(response.data?.error || 'Erro ao gerar DANFE');
      }
    } catch (error) {
      console.error('Erro ao gerar DANFE:', error);
      toast({
        title: 'Erro ao gerar DANFE',
        description: error.message || 'Não foi possível gerar o documento.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingDanfe(false);
    }
  };

  const statusColors = {
    'pendente': 'bg-yellow-100 text-yellow-800',
    'processada': 'bg-green-100 text-green-800',
    'cancelada': 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    'pendente': 'Pendente',
    'processada': 'Processada',
    'cancelada': 'Cancelada'
  };

  const statusMovimentacaoColors = {
    'pendente': 'bg-yellow-100 text-yellow-800',
    'pago': 'bg-green-100 text-green-800',
    'parcial': 'bg-blue-100 text-blue-800',
    'vencido': 'bg-red-200 text-red-900',
    'cancelado': 'bg-gray-200 text-gray-800'
  };

  const statusMovimentacaoLabels = {
    'pendente': 'Pendente',
    'pago': 'Pago',
    'parcial': 'Parcial',
    'vencido': 'Vencido',
    'cancelado': 'Cancelado'
  };

  const itensProcessados = itens.filter(i => i.processado).length;
  const itensPendentes = itens.length - itensProcessados;

  return (
    <>
      <style>{`
        /* Scroll suave e responsivo para desktop E mobile */
        .nota-fiscal-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        /* Barras de scroll estilizadas para DESKTOP */
        @media (min-width: 768px) {
          .nota-fiscal-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          
          .nota-fiscal-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          
          .nota-fiscal-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          
          .nota-fiscal-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          
          .nota-fiscal-scroll::-webkit-scrollbar-corner {
            background: #f1f5f9;
          }
          
          .nota-fiscal-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        /* Para MOBILE - scroll nativo e sempre visível */
        @media (max-width: 767px) {
          .nota-fiscal-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          
          .nota-fiscal-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
            display: block;
          }
          
          .nota-fiscal-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          
          .nota-fiscal-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
        
        /* Garantir que tabelas sejam scrolláveis em mobile */
        .table-scroll-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          width: 100%;
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-7xl h-[95vh] md:max-h-[92vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-4 md:px-6 py-4">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="flex items-center gap-2 md:gap-3 text-white text-base md:text-lg">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-white flex-shrink-0" />
                <span className="truncate">Nota Fiscal {notaAtualizada?.numero_nota}</span>
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-slate-700 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="nota-fiscal-scroll flex-1 px-4 md:px-6 pb-4 md:pb-6">
            <Tabs defaultValue="geral" className="mt-4">
              <TabsList className="grid grid-cols-3 bg-slate-100 p-1 rounded-lg sticky top-0 z-10 w-full">
                <TabsTrigger value="geral" className="TabsTrigger data-[state=active]:bg-slate-800 data-[state=active]:text-white text-black text-xs md:text-sm">Geral</TabsTrigger>
                <TabsTrigger value="itens" className="TabsTrigger data-[state=active]:bg-slate-800 data-[state=active]:text-white text-black text-xs md:text-sm">Itens ({itens.length})</TabsTrigger>
                <TabsTrigger value="fiscal" className="TabsTrigger data-[state=active]:bg-slate-800 data-[state=active]:text-white text-black text-xs md:text-sm">Fiscal</TabsTrigger>
              </TabsList>

              <TabsContent value="geral" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                {/* Informações Principais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <Card className="bg-white border border-slate-200">
                    <CardContent className="p-3 md:p-4">
                      <p className="text-xs text-black mb-1">Número</p>
                      <p className="font-bold text-base md:text-lg text-black">{notaAtualizada?.numero_nota}</p>
                      {notaAtualizada?.serie && <p className="text-xs text-black">Série {notaAtualizada.serie}</p>}
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-slate-200">
                    <CardContent className="p-3 md:p-4">
                      <p className="text-xs text-black mb-1">Fornecedor</p>
                      <p className="font-semibold text-sm md:text-base text-black truncate">{getFornecedorNome()}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-slate-200">
                    <CardContent className="p-3 md:p-4">
                      <p className="text-xs text-black mb-1">Data Emissão</p>
                      <p className="font-semibold text-sm md:text-base text-black">{formatDate(notaAtualizada?.data_emissao)}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-slate-200">
                    <CardContent className="p-3 md:p-4">
                      <p className="text-xs text-black mb-1">Status</p>
                      <Badge className={statusColors[notaAtualizada?.status]}>
                        {statusLabels[notaAtualizada?.status]}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                {/* Valores */}
                <Card className="bg-white border border-slate-200">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-semibold text-black mb-3 md:mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 md:w-5 md:h-5 text-black" />
                      <span className="text-sm md:text-base">Valores da Nota</span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                      <div>
                        <p className="text-xs text-black">Valor Produtos</p>
                        <p className="font-bold text-sm md:text-lg text-black">{formatCurrency(notaAtualizada?.valor_produtos)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-black">ICMS</p>
                        <p className="font-semibold text-sm md:text-base text-black">{formatCurrency(notaAtualizada?.valor_icms)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-black">IPI</p>
                        <p className="font-semibold text-sm md:text-base text-black">{formatCurrency(notaAtualizada?.valor_ipi)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-black">Frete</p>
                        <p className="font-semibold text-sm md:text-base text-black">{formatCurrency(notaAtualizada?.valor_frete)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-black">Valor Total</p>
                        <p className="font-bold text-lg md:text-2xl text-black">{formatCurrency(notaAtualizada?.valor_total)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card de Movimentações Financeiras */}
                {notaAtualizada?.movimentacao_financeira_gerada ? (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                        <h3 className="font-semibold text-black flex items-center gap-2 text-sm md:text-base">
                          <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                          <span>Movimentações Financeiras Geradas</span>
                        </h3>
                        <Link 
                          to={createPageUrl('MovimentacaoFinanceira') + `?nota_fiscal_id=${notaAtualizada.id}`}
                          target="_blank"
                        >
                          <Button variant="outline" size="sm" className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 gap-2 h-9 md:h-10 text-xs md:text-sm w-full sm:w-auto">
                            <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />
                            Ver Movimentações
                          </Button>
                        </Link>
                      </div>

                      {isLoadingMovimentacoes ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        </div>
                      ) : movimentacoesGeradas.length > 0 ? (
                        <div className="space-y-2">
                          {movimentacoesGeradas.map((mov) => (
                            <div key={mov.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-3 rounded-lg border border-green-200 gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-black text-sm truncate">{mov.historico}</p>
                                <p className="text-xs text-black">
                                  Vencimento: {formatDate(mov.data_vencimento)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                <p className="font-bold text-base md:text-lg text-black">{formatCurrency(mov.valor_total)}</p>
                                <Badge className={statusMovimentacaoColors[mov.status]}>
                                  {statusMovimentacaoLabels[mov.status]}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVerMovimentacao(mov)}
                                  className="bg-slate-600 hover:bg-slate-700 text-white h-9 px-2 md:px-3"
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-300 mt-3">
                            <p className="font-bold text-black text-sm md:text-base">Total Gerado:</p>
                            <p className="font-bold text-lg md:text-xl text-black">
                              {formatCurrency(movimentacoesGeradas.reduce((sum, m) => sum + (m.valor_total || 0), 0))}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-black text-center py-4 text-sm">
                          Nenhuma movimentação encontrada (pode ter sido excluída)
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {/* Ações */}
                <div className="flex gap-2 md:gap-3 justify-end flex-wrap">
                  <Button
                    onClick={handleGerarDanfe}
                    disabled={isGeneratingDanfe || !notaAtualizada?.xml_nfe}
                    className="bg-slate-600 hover:bg-slate-700 text-white gap-2 h-9 md:h-10 text-xs md:text-sm"
                    title={!notaAtualizada?.xml_nfe ? 'XML não disponível' : 'Gerar DANFE'}
                  >
                    {isGeneratingDanfe ? (
                      <>
                        <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                        <span className="hidden sm:inline">Gerando...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-3 h-3 md:w-4 md:h-4" />
                        <span>DANFE</span>
                      </>
                    )}
                  </Button>

                  {notaAtualizada?.status === 'processada' && (
                    <Button
                      onClick={handleReabrirEntrada}
                      disabled={isReopening || notaAtualizada?.movimentacao_financeira_gerada}
                      className="bg-slate-600 hover:bg-slate-700 text-white gap-2 h-9 md:h-10 text-xs md:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isReopening ? (
                        <>
                          <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                          <span className="hidden sm:inline">Reabrindo...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">Reabrir</span>
                          <span className="sm:hidden">Reabrir</span>
                        </>
                      )}
                    </Button>
                  )}
                  
                  {itensPendentes > 0 && (
                    <Button
                      onClick={() => setIsProcessarOpen(true)}
                      className="bg-slate-600 hover:bg-slate-700 text-white gap-2 h-9 md:h-10 text-xs md:text-sm"
                    >
                      <Package className="w-3 h-3 md:w-4 md:h-4" />
                      <span>Processar ({itensPendentes})</span>
                    </Button>
                  )}
                  
                  {!notaAtualizada?.movimentacao_financeira_gerada ? (
                    <Button
                      onClick={() => setIsGerarFinanceiroOpen(true)}
                      className="bg-slate-600 hover:bg-slate-700 text-white gap-2 h-9 md:h-10 text-xs md:text-sm"
                    >
                      <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Gerar Financeiro</span>
                      <span className="sm:hidden">Financeiro</span>
                    </Button>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 text-xs py-2 px-3">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">Financeiro Gerado ({movimentacoesGeradas.length})</span>
                      <span className="sm:hidden">Gerado</span>
                    </Badge>
                  )}
                </div>

                {notaAtualizada?.observacoes && (
                  <Card className="bg-white border border-slate-200">
                    <CardContent className="p-4 md:p-6">
                      <h3 className="font-semibold text-black mb-2 text-sm md:text-base">Observações</h3>
                      <p className="text-black whitespace-pre-wrap text-sm">{notaAtualizada.observacoes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="itens" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                <Card className="bg-white border border-slate-200">
                  <CardContent className="p-4 md:p-6">
                    {isLoadingItens ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      </div>
                    ) : itens.length === 0 ? (
                      <div className="text-center py-12 text-black">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Nenhum item cadastrado</p>
                      </div>
                    ) : (
                      <div className="table-scroll-container">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-800">
                              <TableHead className="font-semibold text-white text-xs md:text-sm whitespace-nowrap">Código</TableHead>
                              <TableHead className="font-semibold text-white text-xs md:text-sm whitespace-nowrap">Descrição</TableHead>
                              <TableHead className="font-semibold text-white text-xs md:text-sm whitespace-nowrap">NCM</TableHead>
                              <TableHead className="font-semibold text-white text-xs md:text-sm whitespace-nowrap">CFOP</TableHead>
                              <TableHead className="text-center font-semibold text-white text-xs md:text-sm whitespace-nowrap">Qtd</TableHead>
                              <TableHead className="text-right font-semibold text-white text-xs md:text-sm whitespace-nowrap">Valor Unit.</TableHead>
                              <TableHead className="text-right font-semibold text-white text-xs md:text-sm whitespace-nowrap">Total</TableHead>
                              <TableHead className="text-center font-semibold text-white text-xs md:text-sm whitespace-nowrap">Status</TableHead>
                              <TableHead className="text-center font-semibold text-white text-xs md:text-sm whitespace-nowrap">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itens.map(item => (
                              <TableRow 
                                key={item.id}
                                className="bg-white hover:bg-slate-50"
                              >
                                <TableCell className="font-mono text-xs text-black whitespace-nowrap">{item.codigo_produto}</TableCell>
                                <TableCell className="text-black text-xs md:text-sm min-w-[200px]">{item.descricao}</TableCell>
                                <TableCell className="font-mono text-xs text-black whitespace-nowrap">{item.ncm || '-'}</TableCell>
                                <TableCell className="font-mono text-xs text-black whitespace-nowrap">{item.cfop || '-'}</TableCell>
                                <TableCell className="text-center text-black text-xs md:text-sm">{item.quantidade}</TableCell>
                                <TableCell className="text-right text-black text-xs md:text-sm whitespace-nowrap">{formatCurrency(item.valor_unitario)}</TableCell>
                                <TableCell className="text-right font-semibold text-black text-xs md:text-sm whitespace-nowrap">{formatCurrency(item.valor_total)}</TableCell>
                                <TableCell className="text-center whitespace-nowrap">
                                  {item.processado ? (
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      <span className="hidden md:inline">Processado</span>
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      <span className="hidden md:inline">Pendente</span>
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.processado && item.produto_id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleItemClick(item)}
                                      className="bg-slate-600 hover:bg-slate-700 text-white h-8 px-2"
                                      title="Editar Produto"
                                    >
                                      <Edit className="w-3 h-3 md:w-4 md:h-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fiscal" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                <Card className="bg-white border border-slate-200">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-semibold text-black mb-3 md:mb-4 text-sm md:text-base">Informações Fiscais da Nota</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      <div>
                        <p className="text-xs text-black font-medium mb-1">Chave de Acesso</p>
                        <p className="font-mono text-xs break-all text-black">{notaAtualizada?.chave_acesso || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-black font-medium mb-1">Tipo de Entrada</p>
                        <p className="font-semibold capitalize text-black text-sm">{notaAtualizada?.tipo_entrada?.replace('_', ' ') || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-black font-medium mb-1">Data de Entrada</p>
                        <p className="font-semibold text-black text-sm">{formatDate(notaAtualizada?.data_entrada)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-slate-200">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-semibold text-black mb-3 md:mb-4 text-sm md:text-base">Totais Fiscais</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                      <div>
                        <p className="text-xs text-black font-medium mb-1">Base ICMS</p>
                        <p className="font-bold text-black text-sm md:text-base">{formatCurrency(notaAtualizada?.valor_produtos)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-black font-medium mb-1">Valor ICMS</p>
                        <p className="font-bold text-black text-sm md:text-base">{formatCurrency(notaAtualizada?.valor_icms)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-black font-medium mb-1">Valor IPI</p>
                        <p className="font-bold text-black text-sm md:text-base">{formatCurrency(notaAtualizada?.valor_ipi)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-black font-medium mb-1">Desconto</p>
                        <p className="font-bold text-black text-sm md:text-base">{formatCurrency(notaAtualizada?.valor_desconto)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-slate-200">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-semibold text-black mb-3 md:mb-4 text-sm md:text-base">Detalhamento de Itens - Dados Fiscais</h3>
                    <div className="table-scroll-container">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-800">
                            <TableHead className="font-semibold text-white text-xs md:text-sm whitespace-nowrap">Código</TableHead>
                            <TableHead className="font-semibold text-white text-xs md:text-sm whitespace-nowrap">NCM</TableHead>
                            <TableHead className="font-semibold text-white text-xs md:text-sm whitespace-nowrap">CFOP</TableHead>
                            <TableHead className="font-semibold text-white text-xs md:text-sm whitespace-nowrap">CST</TableHead>
                            <TableHead className="font-semibold text-white text-xs md:text-sm whitespace-nowrap">Origem</TableHead>
                            <TableHead className="text-right font-semibold text-white text-xs md:text-sm whitespace-nowrap">ICMS %</TableHead>
                            <TableHead className="text-right font-semibold text-white text-xs md:text-sm whitespace-nowrap">ICMS R$</TableHead>
                            <TableHead className="text-right font-semibold text-white text-xs md:text-sm whitespace-nowrap">IPI %</TableHead>
                            <TableHead className="text-right font-semibold text-white text-xs md:text-sm whitespace-nowrap">IPI R$</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itens.map(item => (
                            <TableRow key={item.id} className="bg-white hover:bg-slate-50">
                              <TableCell className="font-mono text-xs text-black whitespace-nowrap">{item.codigo_produto}</TableCell>
                              <TableCell className="font-mono text-xs text-black whitespace-nowrap">{item.ncm || '-'}</TableCell>
                              <TableCell className="font-mono text-xs text-black whitespace-nowrap">{item.cfop || '-'}</TableCell>
                              <TableCell className="font-mono text-xs text-black whitespace-nowrap">{item.cst || '-'}</TableCell>
                              <TableCell className="text-center text-black text-xs whitespace-nowrap">{item.origem || '-'}</TableCell>
                              <TableCell className="text-right text-black text-xs whitespace-nowrap">{item.aliquota_icms ? `${item.aliquota_icms}%` : '-'}</TableCell>
                              <TableCell className="text-right text-black text-xs whitespace-nowrap">{formatCurrency(item.valor_icms || 0)}</TableCell>
                              <TableCell className="text-right text-black text-xs whitespace-nowrap">{item.aliquota_ipi ? `${item.aliquota_ipi}%` : '-'}</TableCell>
                              <TableCell className="text-right text-black text-xs whitespace-nowrap">{formatCurrency(item.valor_ipi || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmReabrirOpen}
        onClose={() => setConfirmReabrirOpen(false)}
        title="Reabrir Entrada?"
        description="Deseja reabrir esta entrada? Os itens voltarão ao status 'Pendente' e poderão ser reprocessados."
        onConfirm={confirmarReabrirEntrada}
        confirmText="Reabrir Entrada"
        loading={isReopening}
      />

      {isProcessarOpen && (
        <ProcessarItensModal
          isOpen={isProcessarOpen}
          onClose={() => setIsProcessarOpen(false)}
          nota={notaAtualizada}
          itens={itens}
          onProcessed={async () => {
            setIsProcessarOpen(false);
            await loadItens();
            
            const notaRefresh = await base44.entities.NotaFiscalEntrada.get(notaAtualizada.id);
            setNotaAtualizada(notaRefresh);
            
            if (typeof onUpdated === 'function') {
              await onUpdated();
            }
          }}
        />
      )}

      {isGerarFinanceiroOpen && (
        <GerarFinanceiroModal
          isOpen={isGerarFinanceiroOpen}
          onClose={() => setIsGerarFinanceiroOpen(false)}
          nota={notaAtualizada}
          fornecedor={fornecedores.find(f => f.id === notaAtualizada.fornecedor_id)}
          onGenerated={handleFinanceiroGerado}
        />
      )}

      {isEditProdutoOpen && selectedProduto && (
        <EstoqueForm
          isOpen={isEditProdutoOpen}
          onClose={() => {
            setIsEditProdutoOpen(false);
            setSelectedProduto(null);
          }}
          peca={selectedProduto}
          onSaved={async () => {
            setIsEditProdutoOpen(false);
            setSelectedProduto(null);
            await loadItens();
          }}
        />
      )}
    </>
  );
}