import * as React from "react";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, formatDate } from '@/components/formatters';
import { Printer, Wrench, FileText, Pencil, CheckCircle2, XCircle, RotateCcw, BadgeCheck, Wallet, Loader2, Receipt, ArrowRight, DollarSign, Package, Info, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DespesasOSModal from "@/components/os/DespesasOSModal";
import GerarFinanceiroOSModal from "@/components/os/GerarFinanceiroOSModal";
// OrdemServicoForm is removed as per the updated header/footer which no longer includes an edit action button
import ConfirmDialog from "@/components/ConfirmDialog";

export default function OrdemServicoViewer({
  isOpen,
  onClose,
  ordem,
  clientes,
  veiculos,
  funcionarios,
  nomeEmpresa,
  logoEmpresa,
  onUpdated,
  // onEdit prop removed as there is no longer an explicit edit button within the viewer
}) {
  const [contato, setContato] = useState(null);
  const [veiculo, setVeiculo] = useState(null);
  const [funcionario, setFuncionario] = useState(null);
  const [vendedor, setVendedor] = useState(null);
  const [configuracoes, setConfiguracoes] = useState(null);
  const [isDespesasModalOpen, setIsDespesasModalOpen] = useState(false); // Renamed state variable
  const [isGerarFinanceiroOpen, setIsGerarFinanceiroOpen] = useState(false);
  // isEditFormOpen state removed as editing functionality from within the viewer is removed
  const [activeTab, setActiveTab] = useState('geral');
  
  const [movimentacoesVinculadas, setMovimentacoesVinculadas] = useState([]);
  const [isLoadingMovimentacoes, setIsLoadingMovimentacoes] = useState(false);
  const [despesas, setDespesas] = useState([]);

  const [confirmAction, setConfirmAction] = useState(null);
  const [orcamentoOrigem, setOrcamentoOrigem] = useState(null);

  const statusStyles = {
    em_andamento: { bg: "bg-amber-100", text: "text-amber-800", label: "Em Andamento" },
    finalizado: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Finalizado" },
    cancelado: { bg: "bg-rose-100", text: "text-rose-700", label: "Cancelado" }
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

  // Helper function to render status badge
  const getStatusBadge = (status) => {
    const st = statusStyles[status] || { bg: "bg-gray-100", text: "text-gray-800", label: "Pendente" };
    return (
      <Badge className={`${st.bg} ${st.text} text-xs px-2 py-0.5`}>
        {st.label}
      </Badge>
    );
  };

  const updateStatus = async (newStatus) => {
    if (!ordem?.id) return;
    try {
      await base44.entities.OrdemServico.update(ordem.id, { status: newStatus });
      onUpdated && onUpdated();
    } catch (error) {
      console.error(`Erro ao atualizar status da OS para ${newStatus}:`, error);
    }
  };

  const loadMovimentacoesVinculadas = async () => {
    if (!ordem?.id) return;
    
    setIsLoadingMovimentacoes(true);
    try {
      const movimentacoes = await base44.entities.MovimentacaoFinanceira.filter({
        os_id: ordem.id
      });
      setMovimentacoesVinculadas(movimentacoes || []);
      // If a movimentacao was generated, ensure the OS is updated to reflect this
      // (e.g., set movimentacao_financeira_gerada to true).
      // This implicitly happens if onUpdated refetches the OS data.
    } catch (error) {
      console.error('Erro ao buscar movimentações vinculadas:', error);
      setMovimentacoesVinculadas([]);
    } finally {
      setIsLoadingMovimentacoes(false);
    }
  };

  const loadDespesas = async () => {
    if (!ordem?.id) return;
    try {
      const despesasData = await base44.entities.DespesaOS.filter({ ordem_id: ordem.id });
      setDespesas(despesasData || []);
    } catch (error) {
      console.error("Erro ao carregar despesas:", error);
    }
  };

  const handleFinanceiroGerado = async () => {
    await loadMovimentacoesVinculadas();
    if (onUpdated) {
      await onUpdated();
    }
  };

  // handleEditSaved removed as editing functionality is removed

  useEffect(() => {
    if (isOpen) {
      setActiveTab('geral');
      loadMovimentacoesVinculadas();
      loadDespesas();
    }
  }, [isOpen, ordem?.id]);

  useEffect(() => {
    if (ordem && isOpen) {
      const fetchDados = async () => {
        try {
          const contatoPromise = ordem.contato_tipo === 'cliente'
            ? (ordem.contato_id ? base44.entities.Cliente.get(ordem.contato_id) : Promise.resolve(null))
            : (ordem.contato_tipo === 'funcionario'
                ? (ordem.contato_id ? base44.entities.Funcionario.get(ordem.contato_id) : Promise.resolve(null))
                : (ordem.cliente_id ? base44.entities.Cliente.get(ordem.cliente_id) : Promise.resolve(null)));

          const [configData, contatoData, veiculoData, funcData, vendedorData] = await Promise.all([
            base44.entities.Configuracoes.list().then(res => res[0]),
            contatoPromise,
            ordem.veiculo_id ? base44.entities.Veiculo.get(ordem.veiculo_id) : Promise.resolve(null),
            ordem.funcionario_id ? base44.entities.Funcionario.get(ordem.funcionario_id) : Promise.resolve(null),
            ordem.vendedor_id ? base44.entities.Funcionario.get(ordem.vendedor_id) : Promise.resolve(null)
          ]);

          setConfiguracoes(configData);
          setContato(contatoData);
          setVeiculo(veiculoData);
          setFuncionario(funcData);
          setVendedor(vendedorData);
        } catch (error) {
          console.error('Erro ao carregar dados da OS:', error);
        }
      };
      fetchDados();
    }
  }, [ordem, isOpen]);

  useEffect(() => {
    const fetchOrcamento = async () => {
      if (ordem?.orcamento_id) {
        try {
          const orcamentoData = await base44.entities.Orcamento.get(ordem.orcamento_id);
          setOrcamentoOrigem(orcamentoData);
        } catch (error) {
          console.error('Erro ao buscar orçamento:', error);
        }
      } else {
        setOrcamentoOrigem(null);
      }
    };
    fetchOrcamento();
  }, [ordem?.orcamento_id]);

  const handlePrint = (tipo = 'a4') => {
    if (!ordem?.id) return;
    const url = `${window.location.origin}/#/ImprimirOS?id=${ordem.id}&tipo=${tipo}`;
    window.open(url, '_blank', 'width=800,height=1000');
  };

  const handleOpenDespesas = (e) => {
    e?.stopPropagation();
    setIsDespesasModalOpen(true); // Updated state name
  };

  const handleOpenGerarFinanceiro = (e) => {
    e?.stopPropagation();
    setIsGerarFinanceiroOpen(true);
  };

  // handleEditClick removed

  // Adjusted handlePrintClick to only trigger 'a4' as only one print button is shown in the new header
  const handlePrintClick = () => (e) => {
    e?.stopPropagation();
    handlePrint('a4');
  };

  const handleStatusClick = (action) => (e) => {
    e?.stopPropagation();
    setConfirmAction(action);
  };

  if (!ordem) return null;

  const itensSeguro = ordem.itens || [];
  const st = statusStyles[ordem.status] || { bg: "bg-gray-100", text: "text-gray-800", label: "Pendente" };
  const totalDespesas = despesas.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  const itensProdutos = itensSeguro.filter((i) => i.tipo === "produto") || [];
  const itensServicos = itensSeguro.filter((i) => i.tipo === "servico") || [];

  // Determine if the financial section should be rendered based on OS value, existing movements, or despesas.
  const financeiro = (ordem.valor_total && ordem.valor_total > 0) || movimentacoesVinculadas.length > 0 || despesas.length > 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="w-[95vw] md:w-[85vw] lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col modern-modal p-0 bg-white border border-slate-200 rounded-xl"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <style>{`
            .modern-modal::-webkit-scrollbar {
              width: 8px;
            }
            .modern-modal::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 4px;
            }
            .modern-modal::-webkit-scrollbar-thumb {
              background: #94a3b8;
              border-radius: 4px;
            }
            .modern-modal::-webkit-scrollbar-thumb:hover {
              background: #64748b;
            }
          `}</style>

          <DialogHeader className="bg-slate-900 text-white px-3 md:px-6 py-3 md:py-5 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-slate-800 flex items-center justify-center ring-1 ring-white/10 flex-shrink-0">
                  <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm md:text-lg font-semibold text-white tracking-tight truncate">
                    {ordem?.numero_os || 'OS'}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getStatusBadge(ordem?.status)}
                  </div>
                </div>
              </div>
              
              {/* Ações desktop */}
              <div className="hidden md:flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handlePrintClick()}
                        className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Imprimir</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleOpenDespesas}
                        className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                      >
                        <Receipt className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Despesas</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {!ordem?.movimentacao_financeira_gerada && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleOpenGerarFinanceiro}
                          className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Financeiro</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={onClose}
                        className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fechar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* Fechar mobile */}
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="md:hidden h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            {/* Ações mobile */}
            <div className="flex md:hidden gap-1.5 mb-3 overflow-x-auto pb-1">
              <Button size="sm" variant="outline" onClick={handlePrintClick()} className="h-8 text-xs gap-1 flex-shrink-0">
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpenDespesas} className="h-8 text-xs gap-1 flex-shrink-0">
                <Receipt className="w-3.5 h-3.5" />
                Despesas
              </Button>
              {!ordem?.movimentacao_financeira_gerada && (
                <Button size="sm" variant="outline" onClick={handleOpenGerarFinanceiro} className="h-8 text-xs gap-1 flex-shrink-0">
                  <DollarSign className="w-3.5 h-3.5" />
                  Financeiro
                </Button>
              )}
            </div>
            
            {/* CARDS INFORMATIVOS */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-5">
              <div className="border border-slate-200 rounded-lg p-2 md:p-3 bg-slate-50/50">
                <span className="text-[8px] md:text-[10px] uppercase text-slate-500 font-semibold block tracking-wide">CLIENTE</span>
                <span className="block text-xs md:text-sm font-semibold mt-0.5 md:mt-1 text-slate-900 truncate">{contato?.nome || "—"}</span>
              </div>

              <div className="border border-slate-200 rounded-lg p-2 md:p-3 bg-slate-50/50">
                <span className="text-[8px] md:text-[10px] uppercase text-slate-500 font-semibold block tracking-wide">VEÍCULO</span>
                <span className="block text-xs md:text-sm font-semibold mt-0.5 md:mt-1 text-slate-900 truncate">
                  {veiculo ? `${veiculo.placa}` : "—"}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg p-2 md:p-3 bg-slate-50/50">
                <span className="text-[8px] md:text-[10px] uppercase text-slate-500 font-semibold block tracking-wide">DATA</span>
                <span className="block text-xs md:text-sm font-semibold mt-0.5 md:mt-1 text-slate-900">{formatDate(ordem.data_abertura)}</span>
              </div>

              <div className="border border-blue-200 rounded-lg p-2 md:p-3 bg-blue-50/50">
                <span className="text-[8px] md:text-[10px] uppercase text-blue-600 font-semibold block tracking-wide">VALOR</span>
                <span className="block text-sm md:text-base font-bold mt-0.5 md:mt-1 text-blue-700">{formatCurrency(ordem.valor_total)}</span>
              </div>
            </section>

            {/* SEÇÃO FINANCEIRA */}
            {financeiro && (
              <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-50 border-b border-slate-200 py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-semibold text-slate-800">Informações Financeiras</span>
                  </div>
                  <Badge variant="outline" className="text-xs text-slate-600 border-slate-300 bg-white">
                    {despesas.length} despesa(s)
                  </Badge>
                </div>
                <div className="p-4">
                  <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-800">{ordem.numero_os}</span>
                    <Badge className="bg-slate-700 text-white text-xs">
                      {movimentacoesVinculadas.length > 0 ? "Financeiro Gerado" : "Ordem de Serviço"}
                    </Badge>
                    <span className="text-lg font-bold text-slate-900">{formatCurrency(ordem.valor_total)}</span>
                  </div>

                  {despesas.length > 0 && (
                    <div className="rounded-lg overflow-hidden border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-[10px] md:text-xs font-semibold text-slate-600 px-2 md:px-4">Data</TableHead>
                            <TableHead className="text-[10px] md:text-xs font-semibold text-slate-600 px-2 md:px-4 hidden sm:table-cell">Tipo</TableHead>
                            <TableHead className="text-[10px] md:text-xs font-semibold text-slate-600 px-2 md:px-4">Descrição</TableHead>
                            <TableHead className="text-[10px] md:text-xs font-semibold text-slate-600 text-right px-2 md:px-4">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {despesas.map((d) => (
                            <TableRow key={d.id} className="text-[10px] md:text-xs">
                              <TableCell className="text-slate-700 px-2 md:px-4 py-1.5 md:py-2">{formatDate(d.data)}</TableCell>
                              <TableCell className="text-slate-700 px-2 md:px-4 py-1.5 md:py-2 hidden sm:table-cell">{d.tipo || "—"}</TableCell>
                              <TableCell className="text-slate-700 px-2 md:px-4 py-1.5 md:py-2 max-w-[120px] truncate">{d.descricao || "—"}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600 px-2 md:px-4 py-1.5 md:py-2">
                                {formatCurrency(d.valor)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TABS */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-slate-200 border border-slate-300 p-1 rounded-lg grid grid-cols-3 gap-1 mb-3 md:mb-4">
                <TabsTrigger 
                  value="geral" 
                  className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 flex items-center justify-center gap-1 md:gap-2 transition-all text-[10px] md:text-xs font-semibold py-1.5 md:py-2"
                >
                  <Info className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span className="hidden sm:inline">GERAL</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="itens" 
                  className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 flex items-center justify-center gap-1 md:gap-2 transition-all text-[10px] md:text-xs font-semibold py-1.5 md:py-2"
                >
                  <Package className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  ITENS ({itensSeguro.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="observacoes" 
                  className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 flex items-center justify-center gap-1 md:gap-2 transition-all text-[10px] md:text-xs font-semibold py-1.5 md:py-2"
                >
                  <FileText className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span className="hidden sm:inline">OBS</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB: Geral */}
              <TabsContent value="geral" className="p-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Responsável</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900 truncate block">{funcionario?.nome || "—"}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Vendedor</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900 truncate block">{vendedor?.nome || "—"}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Cliente</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900 truncate block">{contato?.nome || "—"}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Telefone</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900">{contato?.telefone || "—"}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Abertura</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900">{formatDate(ordem.data_abertura)}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Conclusão</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900">{ordem.data_conclusao ? formatDate(ordem.data_conclusao) : "—"}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Entrada</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900">{formatCurrency(ordem.entrada || 0)}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Status</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900">{st.label}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB: Itens */}
              <TabsContent value="itens" className="p-0">
                <div className="bg-white">
                  {itensProdutos.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-black mb-2 flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-600" />
                        Produtos
                      </h3>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-100">
                            <TableRow>
                              <TableHead className="text-xs text-black font-semibold">Descrição</TableHead>
                              <TableHead className="text-xs text-black font-semibold text-center">Qtd</TableHead>
                              <TableHead className="text-xs text-black font-semibold text-right">V. Unit.</TableHead>
                              <TableHead className="text-xs text-black font-semibold text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itensProdutos.map((item, idx) => (
                              <TableRow key={idx} className="text-xs">
                                <TableCell className="font-medium text-black">{item.descricao}</TableCell>
                                <TableCell className="text-center text-black">{item.quantidade}</TableCell>
                                <TableCell className="text-right text-black">{formatCurrency(item.valor_unitario)}</TableCell>
                                <TableCell className="text-right font-semibold text-blue-600">{formatCurrency(item.valor_total)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {itensServicos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-black mb-2 flex items-center gap-2">
                        <Package className="w-4 h-4 text-green-600" />
                        Serviços
                      </h3>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-100">
                            <TableRow>
                              <TableHead className="text-xs text-black font-semibold">Descrição</TableHead>
                              <TableHead className="text-xs text-black font-semibold text-center">Qtd</TableHead>
                              <TableHead className="text-xs text-black font-semibold text-right">V. Unit.</TableHead>
                              <TableHead className="text-xs text-black font-semibold text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itensServicos.map((item, idx) => (
                              <TableRow key={idx} className="text-xs">
                                <TableCell className="font-medium text-black">{item.descricao}</TableCell>
                                <TableCell className="text-center text-black">{item.quantidade}</TableCell>
                                <TableCell className="text-right text-black">{formatCurrency(item.valor_unitario)}</TableCell>
                                <TableCell className="text-right font-semibold text-green-600">{formatCurrency(item.valor_total)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB: Observações */}
              <TabsContent value="observacoes" className="p-0">
                <div className="bg-white">
                  <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">
                    {ordem.observacoes || "Nenhuma observação registrada."}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="px-3 md:px-6 py-3 md:py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0 sticky bottom-0">
            <div className="flex flex-wrap gap-2 w-full justify-between">
              <div className="flex gap-1.5 md:gap-2 flex-wrap">
                {ordem.status === "em_andamento" && (
                  <>
                    <Button
                      size="sm"
                      onClick={handleStatusClick('finalize')}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-semibold h-8 md:h-9 text-xs md:text-sm px-2 md:px-3 gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Finalizar</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleStatusClick('cancel')}
                      className="bg-white border border-slate-300 text-red-600 hover:bg-red-50 font-semibold h-8 md:h-9 text-xs md:text-sm px-2 md:px-3 gap-1">
                      <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Cancelar</span>
                    </Button>
                  </>
                )}
                {(ordem.status === "finalizado" || ordem.status === "cancelado") && (
                  <Button
                    size="sm"
                    onClick={handleStatusClick('reopen')}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-semibold h-8 md:h-9 text-xs md:text-sm px-2 md:px-3 gap-1">
                    <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Reabrir
                  </Button>
                )}
              </div>

              <Button
                onClick={onClose}
                size="sm"
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold h-8 md:h-9 text-xs md:text-sm">
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (confirmAction === 'approve' || confirmAction === 'reopen') {
            await updateStatus('em_andamento');
          } else if (confirmAction === 'finalize') {
            await updateStatus('finalizado');
          } else if (confirmAction === 'cancel') {
            await updateStatus('cancelado');
          }
          setConfirmAction(null);
        }}
        title={
          confirmAction === 'approve' ? 'Confirmar aprovação' :
          confirmAction === 'finalize' ? 'Confirmar finalização' :
          confirmAction === 'cancel' ? 'Confirmar cancelamento' :
          confirmAction === 'reopen' ? 'Confirmar reabertura' : ''
        }
        description={
          confirmAction === 'approve' ? 'Deseja aprovar esta Ordem de Serviço?' :
          confirmAction === 'finalize' ? 'Deseja finalizar esta Ordem de Serviço?' :
          confirmAction === 'cancel' ? 'Deseja cancelar esta Ordem de Serviço?' :
          confirmAction === 'reopen' ? 'Deseja reabrir esta Ordem de Serviço?' : ''
        }
        confirmText={
          confirmAction === 'approve' ? 'Aprovar' :
          confirmAction === 'finalize' ? 'Finalizar' :
          confirmAction === 'cancel' ? 'Cancelar OS' :
          confirmAction === 'reopen' ? 'Reabrir' : 'Confirmar'
        }
      />

      <DespesasOSModal
        isOpen={isDespesasModalOpen}
        onClose={() => {
          setIsDespesasModalOpen(false);
          loadDespesas();
          onUpdated && onUpdated();
        }}
        ordem={ordem}
      />

      <GerarFinanceiroOSModal
        isOpen={isGerarFinanceiroOpen}
        onClose={() => {
          setIsGerarFinanceiroOpen(false);
        }}
        ordem={ordem}
        onGerado={handleFinanceiroGerado}
      />

      {/* OrdemServicoForm removed as editing functionality is no longer present within the viewer */}
    </>
  );
}