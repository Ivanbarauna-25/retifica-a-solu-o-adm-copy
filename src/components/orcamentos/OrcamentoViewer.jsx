import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FileText, Package, DollarSign, Printer, Edit,
  ArrowRight, XCircle, CheckCircle, Ban, X
} from "lucide-react";
import { formatCurrency, formatDate } from "@/components/formatters";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import DespesasModal from "./DespesasModal";

const statusConfig = {
  pendente: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pendente" },
  aprovado: { bg: "bg-green-100", text: "text-green-800", label: "Aprovado" },
  rejeitado: { bg: "bg-red-100", text: "text-red-800", label: "Rejeitado" },
  expirado: { bg: "bg-gray-100", text: "text-gray-800", label: "Expirado" },
  convertido: { bg: "bg-blue-100", text: "text-blue-800", label: "Convertido" },
  cancelado: { bg: "bg-zinc-200", text: "text-zinc-800", label: "Cancelado" }
};

export default function OrcamentoViewer({
  orcamento,
  onClose,
  onEdit,
  onRefresh,
  clientes = [],
  veiculos = [],
  funcionarios = [],
  configuracoes = {},
  onUpdate,
  pecas = [],
  servicos = []
}) {
  const { toast } = useToast();
  const [confirmAction, setConfirmAction] = useState({ open: false, action: null, title: "", description: "" });
  const [showDespesas, setShowDespesas] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [despesas, setDespesas] = useState([]);
  const [currentOrcamento, setCurrentOrcamento] = useState(orcamento);

  useEffect(() => {
    setCurrentOrcamento(orcamento);
  }, [orcamento]);

  useEffect(() => {
    if (!!currentOrcamento && currentOrcamento?.id) {
      loadDespesas();
    }
  }, [!!currentOrcamento, currentOrcamento?.id]);

  const loadDespesas = async () => {
    if (!currentOrcamento?.id) return;
    try {
      const despesasData = await base44.entities.DespesaOrcamento.filter({ orcamento_id: currentOrcamento.id });
      setDespesas(despesasData || []);
    } catch (error) {
      console.error("Erro ao carregar despesas:", error);
    }
  };

  const cliente = useMemo(() => clientes.find((c) => c.id === (currentOrcamento?.contato_id || currentOrcamento?.cliente_id)), [clientes, currentOrcamento]);
  const veiculo = useMemo(() => veiculos.find((v) => v.id === currentOrcamento?.veiculo_id), [veiculos, currentOrcamento]);
  const vendedor = useMemo(() => funcionarios.find((f) => f.id === currentOrcamento?.vendedor_id), [funcionarios, currentOrcamento]);
  const responsavel = useMemo(() => funcionarios.find((f) => f.id === currentOrcamento?.responsavel_tecnico_id), [funcionarios, currentOrcamento]);

  const totalDespesas = useMemo(() => {
    return despesas.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  }, [despesas]);

  const margemLiquida = useMemo(() => {
    return (currentOrcamento?.valor_total || 0) - totalDespesas;
  }, [currentOrcamento?.valor_total, totalDespesas]);

  const handleAction = async (action) => {
    setIsLoading(true);
    try {
      switch (action) {
        case "aprovar":
          await base44.entities.Orcamento.update(currentOrcamento.id, { status: "aprovado" });
          toast({ title: "✅ Orçamento aprovado com sucesso!" });
          break;
        case "rejeitar":
          await base44.entities.Orcamento.update(currentOrcamento.id, { status: "rejeitado" });
          toast({ title: "✅ Orçamento rejeitado" });
          break;
        case "cancelar":
          await base44.entities.Orcamento.update(currentOrcamento.id, { status: "cancelado" });
          toast({ title: "✅ Orçamento cancelado" });
          break;
        case "converter":
          await converterParaOS();
          break;
      }

      setConfirmAction({ open: false, action: null, title: "", description: "" });
      
      const orcamentoAtualizado = await base44.entities.Orcamento.list();
      const updated = orcamentoAtualizado.find(o => o.id === currentOrcamento.id);
      if (updated) {
        setCurrentOrcamento(updated);
      }
      
      if (onRefresh) await onRefresh();
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error("Erro ao executar ação:", error);
      toast({
        title: "❌ Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const converterParaOS = async () => {
    try {
      const os = {
        contato_id: currentOrcamento.contato_id,
        contato_tipo: currentOrcamento.contato_tipo,
        cliente_id: currentOrcamento.cliente_id,
        veiculo_id: currentOrcamento.veiculo_id,
        vendedor_id: currentOrcamento.vendedor_id,
        funcionario_id: currentOrcamento.responsavel_tecnico_id,
        numero_os: `OS-${Date.now().toString().slice(-6)}`,
        data_abertura: new Date().toISOString().split("T")[0],
        status: "em_andamento",
        itens: currentOrcamento.itens,
        outras_despesas: currentOrcamento.outras_despesas,
        desconto_tipo: currentOrcamento.desconto_tipo,
        desconto_valor: currentOrcamento.desconto_valor,
        valor_total: currentOrcamento.valor_total,
        observacoes: currentOrcamento.observacoes,
        entrada: currentOrcamento.entrada,
        condicao_pagamento_id: currentOrcamento.condicao_pagamento_id,
        forma_pagamento_id: currentOrcamento.forma_pagamento_id
      };

      await base44.entities.OrdemServico.create(os);
      await base44.entities.Orcamento.update(currentOrcamento.id, { status: "convertido" });
      toast({ title: "✅ Convertido em OS com sucesso!" });
    } catch (error) {
      throw error;
    }
  };

  const handlePrint = () => {
    if (currentOrcamento?.id) {
      window.open(`/orcamentos/print/${currentOrcamento.id}`, "_blank");
    }
  };

  const openConfirm = (action, title, description) => {
    setConfirmAction({ open: true, action, title, description });
  };

  if (!currentOrcamento) return null;

  const statusInfo = statusConfig[currentOrcamento.status] || statusConfig.pendente;

  const itensProdutos = currentOrcamento.itens?.filter((i) => i.tipo === "produto") || [];
  const itensServicos = currentOrcamento.itens?.filter((i) => i.tipo === "servico") || [];

  return (
    <>
      <Dialog open={!!orcamento} onOpenChange={onClose}>
        <DialogContent
          className="w-[95vw] md:w-[85vw] lg:w-[70vw] xl:w-[60vw] max-w-4xl h-[90vh] md:h-[85vh] max-h-[90vh] overflow-y-auto modern-modal bg-white border border-slate-200 rounded-xl p-0"
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

          <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-3 md:px-6 py-3 md:py-4 flex-shrink-0 sticky top-0 z-10">
            <DialogTitle className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <div className="h-8 w-8 md:h-11 md:w-11 rounded-lg md:rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                    <h2 className="text-sm md:text-base font-semibold text-white truncate">{currentOrcamento.numero_orcamento}</h2>
                    <Badge className={`${statusInfo.bg} ${statusInfo.text} text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 border-0`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-[10px] md:text-xs text-slate-300 mt-0.5 hidden sm:block">Visualização do orçamento</p>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <TooltipProvider>
                  {/* Ações principais - visíveis em telas maiores */}
                  <div className="hidden md:flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            onClose?.();
                            setTimeout(() => onEdit?.(currentOrcamento), 100);
                          }}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                          <Edit className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Editar</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handlePrint}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                          <Printer className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Imprimir</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setShowDespesas(true)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                          <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Despesas</p>
                      </TooltipContent>
                    </Tooltip>

                    {currentOrcamento.status === "aprovado" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => openConfirm("converter", "Converter em OS", `Gerar Ordem de Serviço a partir do orçamento ${currentOrcamento.numero_orcamento}?`)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-white" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Converter em OS</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <div className="w-px h-5 bg-white/20 mx-1" />

                    {currentOrcamento.status === "pendente" && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => openConfirm(
                                "aprovar", 
                                "Aprovar Orçamento", 
                                `Confirma a aprovação do orçamento ${currentOrcamento.numero_orcamento}?`
                              )}
                              className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Aprovar</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => openConfirm(
                                "rejeitar", 
                                "Rejeitar Orçamento", 
                                `Confirma a rejeição do orçamento ${currentOrcamento.numero_orcamento}?`
                              )}
                              className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                              <XCircle className="w-5 h-5 text-white" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Rejeitar</p>
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}

                    {currentOrcamento.status !== "cancelado" && currentOrcamento.status !== "convertido" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => openConfirm(
                              "cancelar", 
                              "Cancelar Orçamento", 
                              `Confirma o cancelamento do orçamento ${currentOrcamento.numero_orcamento}?`
                            )}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                            <Ban className="w-5 h-5 text-white" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Cancelar</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
                
                <Button
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 md:h-9 md:w-9 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm ml-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* CARDS INFORMATIVOS */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 px-3 md:px-6 pt-3 md:pt-5 pb-0">
            <div className="border border-slate-200 rounded-lg p-2 md:p-3 bg-slate-50/50">
              <span className="text-[8px] md:text-[10px] uppercase text-slate-500 font-semibold block tracking-wide">CLIENTE</span>
              <span className="block text-xs md:text-sm font-semibold mt-0.5 md:mt-1 text-slate-900 truncate">{cliente?.nome || "—"}</span>
            </div>

            <div className="border border-slate-200 rounded-lg p-2 md:p-3 bg-slate-50/50">
              <span className="text-[8px] md:text-[10px] uppercase text-slate-500 font-semibold block tracking-wide">VEÍCULO</span>
              <span className="block text-xs md:text-sm font-semibold mt-0.5 md:mt-1 text-slate-900">{veiculo ? `${veiculo.placa}` : "—"}</span>
            </div>

            <div className="border border-slate-200 rounded-lg p-2 md:p-3 bg-slate-50/50">
              <span className="text-[8px] md:text-[10px] uppercase text-slate-500 font-semibold block tracking-wide">DATA</span>
              <span className="block text-xs md:text-sm font-semibold mt-0.5 md:mt-1 text-slate-900">{formatDate(currentOrcamento.data_orcamento)}</span>
            </div>

            <div className="border border-blue-200 rounded-lg p-2 md:p-3 bg-blue-50/50">
              <span className="text-[8px] md:text-[10px] uppercase text-blue-600 font-semibold block tracking-wide">VALOR TOTAL</span>
              <span className="block text-sm md:text-base font-bold mt-0.5 md:mt-1 text-blue-700">{formatCurrency(currentOrcamento.valor_total)}</span>
            </div>
          </section>
          
          {/* Ações Mobile */}
          <div className="flex md:hidden gap-2 px-3 pt-3 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose?.();
                setTimeout(() => onEdit?.(currentOrcamento), 100);
              }}
              className="h-8 text-xs gap-1 flex-shrink-0"
            >
              <Edit className="w-3.5 h-3.5" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="h-8 text-xs gap-1 flex-shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDespesas(true)}
              className="h-8 text-xs gap-1 flex-shrink-0 text-amber-600 border-amber-300"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Despesas
            </Button>
            {currentOrcamento.status === "pendente" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openConfirm("aprovar", "Aprovar", `Aprovar orçamento ${currentOrcamento.numero_orcamento}?`)}
                  className="h-8 text-xs gap-1 flex-shrink-0 text-green-600 border-green-300"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openConfirm("rejeitar", "Rejeitar", `Rejeitar orçamento ${currentOrcamento.numero_orcamento}?`)}
                  className="h-8 text-xs gap-1 flex-shrink-0 text-red-600 border-red-300"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Rejeitar
                </Button>
              </>
            )}
            {currentOrcamento.status === "aprovado" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openConfirm("converter", "Converter", `Converter em OS?`)}
                className="h-8 text-xs gap-1 flex-shrink-0 text-blue-600 border-blue-300"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Gerar OS
              </Button>
            )}
            {currentOrcamento.status !== "cancelado" && currentOrcamento.status !== "convertido" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openConfirm("cancelar", "Cancelar", `Cancelar orçamento ${currentOrcamento.numero_orcamento}?`)}
                className="h-8 text-xs gap-1 flex-shrink-0 text-zinc-600 border-zinc-300"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancelar
              </Button>
            )}
          </div>

          {/* SEÇÃO FINANCEIRA */}
          <div className="mx-3 md:mx-6 mt-3 md:mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-50 border-b border-slate-200 py-2 md:py-3 px-3 md:px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-600" />
                <span className="text-xs md:text-sm font-semibold text-slate-800">Informações Financeiras</span>
              </div>
              <Badge variant="outline" className="text-[10px] md:text-xs text-slate-600 border-slate-300 bg-white">
                {despesas.length} despesa(s)
              </Badge>
            </div>
            <div className="p-3 md:p-4">
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 md:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <span className="text-xs md:text-sm font-semibold text-slate-800">{currentOrcamento.numero_orcamento}</span>
                <Badge className="bg-slate-700 text-white text-[10px] md:text-xs w-fit">
                  {currentOrcamento.status === "convertido" ? "Convertido" : "Orçamento"}
                </Badge>
                <span className="text-base md:text-lg font-bold text-slate-900">{formatCurrency(currentOrcamento.valor_total)}</span>
              </div>

              {despesas.length > 0 &&
                <div className="rounded-lg overflow-hidden border border-slate-200 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-[10px] md:text-xs font-semibold text-slate-600">Data</TableHead>
                        <TableHead className="text-[10px] md:text-xs font-semibold text-slate-600 hidden sm:table-cell">Tipo</TableHead>
                        <TableHead className="text-[10px] md:text-xs font-semibold text-slate-600">Descrição</TableHead>
                        <TableHead className="text-[10px] md:text-xs font-semibold text-slate-600 text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {despesas.map((d) =>
                        <TableRow key={d.id} className="text-[10px] md:text-xs">
                          <TableCell className="text-slate-700 whitespace-nowrap">{formatDate(d.data)}</TableCell>
                          <TableCell className="text-slate-700 hidden sm:table-cell">{d.tipo || "—"}</TableCell>
                          <TableCell className="text-slate-700 truncate max-w-[100px] md:max-w-none">{d.descricao || "—"}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600 whitespace-nowrap">
                            {formatCurrency(d.valor)}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              }
            </div>
          </div>

          {/* TABS */}
          <div className="px-3 md:px-6 mt-3 md:mt-4 mb-2">
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="bg-slate-200 border border-slate-300 p-1 rounded-lg grid grid-cols-3 gap-1 mb-3 md:mb-4">
                <TabsTrigger
                  value="geral"
                  className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 flex items-center justify-center gap-1 md:gap-2 transition-all text-[10px] md:text-xs font-semibold py-1.5 md:py-2">
                  GERAL
                </TabsTrigger>
                <TabsTrigger
                  value="itens"
                  className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 flex items-center justify-center gap-1 md:gap-2 transition-all text-[10px] md:text-xs font-semibold py-1.5 md:py-2">
                  ITENS ({currentOrcamento.itens?.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="observacoes"
                  className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 flex items-center justify-center gap-1 md:gap-2 transition-all text-[10px] md:text-xs font-semibold py-1.5 md:py-2">
                  OBS
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
                      <span className="text-xs md:text-sm font-semibold text-slate-900 truncate block">{responsavel?.nome || "—"}</span>
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
                      <span className="text-xs md:text-sm font-semibold text-slate-900 truncate block">{cliente?.nome || "—"}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Telefone</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900">{cliente?.telefone || "—"}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Abertura</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900">{formatDate(currentOrcamento.data_orcamento)}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Validade</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900">{currentOrcamento.data_validade ? formatDate(currentOrcamento.data_validade) : "—"}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Entrada</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900">{formatCurrency(currentOrcamento.entrada || 0)}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 border-b border-slate-200">
                      <span className="text-[8px] md:text-[10px] uppercase text-slate-600 font-bold tracking-wide">Status</span>
                    </div>
                    <div className="px-2 md:px-3 py-1.5 md:py-2">
                      <span className="text-xs md:text-sm font-semibold text-slate-900">{statusInfo.label}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB: Itens */}
              <TabsContent value="itens" className="p-0">
                <div className="bg-white">
                  {itensProdutos.length > 0 &&
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
                            {itensProdutos.map((item, idx) =>
                              <TableRow key={idx} className="text-xs">
                                <TableCell className="font-medium text-black">{item.descricao}</TableCell>
                                <TableCell className="text-center text-black">{item.quantidade}</TableCell>
                                <TableCell className="text-right text-black">{formatCurrency(item.valor_unitario)}</TableCell>
                                <TableCell className="text-right font-semibold text-blue-600">{formatCurrency(item.valor_total)}</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  }

                  {itensServicos.length > 0 &&
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
                            {itensServicos.map((item, idx) =>
                              <TableRow key={idx} className="text-xs">
                                <TableCell className="font-medium text-black">{item.descricao}</TableCell>
                                <TableCell className="text-center text-black">{item.quantidade}</TableCell>
                                <TableCell className="text-right text-black">{formatCurrency(item.valor_unitario)}</TableCell>
                                <TableCell className="text-right font-semibold text-green-600">{formatCurrency(item.valor_total)}</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  }
                </div>
              </TabsContent>

              {/* TAB: Observações */}
              <TabsContent value="observacoes" className="p-0">
                <div className="bg-white">
                  <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">
                    {currentOrcamento.observacoes || "Nenhuma observação registrada."}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* FOOTER COM AÇÕES */}
          <div className="flex justify-end items-center px-3 md:px-6 py-3 md:py-4 border-t border-slate-100 bg-white sticky bottom-0">
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs md:text-sm h-8 md:h-9">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmAction.open}
        onClose={() => setConfirmAction({ open: false, action: null, title: "", description: "" })}
        onConfirm={() => handleAction(confirmAction.action)}
        title={confirmAction.title}
        description={confirmAction.description}
        confirmText="Confirmar" />

      {showDespesas &&
        <DespesasModal
          isOpen={showDespesas}
          onClose={() => {
            setShowDespesas(false);
            loadDespesas();
            if (onUpdate) onUpdate();
          }}
          orcamento={currentOrcamento} />
      }
    </>);
}