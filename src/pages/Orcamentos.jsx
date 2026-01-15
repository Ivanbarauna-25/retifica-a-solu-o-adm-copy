import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import OrcamentoViewer from "@/components/orcamentos/OrcamentoViewer";
import OrcamentoFormModal from "@/components/orcamentos/OrcamentoFormModal";
import RelatorioOrcamentosFiltersModal from "@/components/orcamentos/RelatorioOrcamentosFiltersModal";
import ImportarOrcamentosModal from "@/components/orcamentos/ImportarOrcamentosModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Printer, Eye, Filter, Upload, FileText, BarChart3, Search,
  Pencil, MoreVertical, Trash2, Loader2
} from "lucide-react";
import { formatCurrency, formatDate } from "@/components/formatters";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const statusConfig = {
  pendente: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-green-100 text-green-800",
  rejeitado: "bg-red-100 text-red-800",
  expirado: "bg-gray-200 text-gray-800",
  convertido: "bg-blue-100 text-blue-800",
  cancelado: "bg-zinc-200 text-zinc-800 line-through"
};

const statusLabels = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  expirado: "Expirado",
  convertido: "Convertido",
  cancelado: "Cancelado"
};

export default function OrcamentosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados de UI
  const [showForm, setShowForm] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingReportUrl, setPendingReportUrl] = useState(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [quickSearchNumber, setQuickSearchNumber] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterVendedor, setFilterVendedor] = useState("todos");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Queries usando React Query
  const { data: orcamentos = [], isLoading } = useQuery({
    queryKey: ["orcamentos"],
    queryFn: () => base44.entities.Orcamento.list("-created_date"),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => base44.entities.Cliente.list(),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: () => base44.entities.Funcionario.list(),
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ["veiculos"],
    queryFn: () => base44.entities.Veiculo.list(),
  });

  const { data: formasPagamento = [] } = useQuery({
    queryKey: ["formasPagamento"],
    queryFn: () => base44.entities.FormaPagamento.list(),
  });

  const { data: condicoesPagamento = [] } = useQuery({
    queryKey: ["condicoesPagamento"],
    queryFn: () => base44.entities.CondicaoPagamento.list(),
  });

  const { data: configuracoes } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => {
      const configs = await base44.entities.Configuracoes.list();
      return configs?.[0] || null;
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Orcamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      toast({ title: "✅ Orçamento excluído com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "❌ Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Maps para exibição
  const mapCliente = useMemo(() => Object.fromEntries(clientes.map((c) => [c.id, c.nome])), [clientes]);
  const mapFuncionario = useMemo(() => Object.fromEntries(funcionarios.map((f) => [f.id, f.nome])), [funcionarios]);
  const mapVeiculoPlaca = useMemo(() => Object.fromEntries(veiculos.map((v) => [v.id, v.placa])), [veiculos]);
  const mapCondicao = useMemo(() => Object.fromEntries(condicoesPagamento.map((c) => [c.id, c.nome])), [condicoesPagamento]);
  const mapForma = useMemo(() => Object.fromEntries(formasPagamento.map((f) => [f.id, f.nome])), [formasPagamento]);

  // Orçamentos filtrados
  const filteredOrcamentos = useMemo(() => {
    let filtered = orcamentos;

    if (quickSearchNumber) {
      const lowerQuickSearch = quickSearchNumber.toLowerCase();
      filtered = filtered.filter((o) =>
        String(o.numero_orcamento || "").toLowerCase().includes(lowerQuickSearch)
      );
      return filtered;
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((o) =>
        (mapCliente[o.contato_id] || "").toLowerCase().includes(lowerSearchTerm) ||
        (mapFuncionario[o.vendedor_id] || "").toLowerCase().includes(lowerSearchTerm)
      );
    }

    if (filterStatus && filterStatus !== "todos") {
      filtered = filtered.filter((o) => o.status === filterStatus);
    }

    if (filterVendedor && filterVendedor !== "todos") {
      filtered = filtered.filter((o) => o.vendedor_id === filterVendedor);
    }

    if (filterDataInicio) {
      filtered = filtered.filter((o) => o.data_orcamento >= filterDataInicio);
    }
    
    if (filterDataFim) {
      filtered = filtered.filter((o) => o.data_orcamento <= filterDataFim);
    }

    return filtered;
  }, [orcamentos, searchTerm, quickSearchNumber, filterStatus, filterVendedor, filterDataInicio, filterDataFim, mapCliente, mapFuncionario]);

  // Handlers
  const handleNew = () => {
    setSelectedOrcamento(null);
    setShowForm(true);
  };

  const handleEdit = (o) => {
    setSelectedOrcamento(o);
    setShowForm(true);
  };

  const handleView = (o) => {
    setSelectedOrcamento(o);
    setShowViewer(true);
  };

  const handleFormSaved = (savedOrcamento) => {
    setShowForm(false);
    setSelectedOrcamento(savedOrcamento);
    setShowViewer(true);
    queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
  };

  const handleDelete = (o) => {
    setSelectedOrcamento(o);
    setConfirmDeleteOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!selectedOrcamento) return;
    deleteMutation.mutate(selectedOrcamento.id);
    setConfirmDeleteOpen(false);
    setSelectedOrcamento(null);
  };

  const handlePrint = (o) => {
    if (!o || !o.id) {
      toast({ title: "Erro", description: "Orçamento inválido para impressão.", variant: "destructive" });
      return;
    }
    window.open(`/orcamentos/print/${o.id}`, "_blank");
  };

  const onGenerateRelatorio = (f) => {
    const params = new URLSearchParams();
    if (f.status && f.status !== "todos") {
      params.append("status", f.status);
      params.append("statusLabel", statusLabels[f.status] || "");
    }
    if (f.numeroOrcamento) params.append("numeroOrcamento", f.numeroOrcamento);
    if (f.clienteId) {
      params.append("clienteId", f.clienteId);
      params.append("clienteNome", mapCliente[f.clienteId] || "");
    }
    if (f.vendedorId && f.vendedorId !== "todos") {
      params.append("vendedorId", f.vendedorId);
      params.append("vendedorNome", mapFuncionario[f.vendedorId] || "");
    }
    if (f.veiculoId) {
      params.append("veiculoId", f.veiculoId);
      params.append("veiculoPlaca", mapVeiculoPlaca[f.veiculoId] || "");
    }
    if (f.condicaoId) {
      params.append("condicaoId", f.condicaoId);
      params.append("condicaoNome", mapCondicao[f.condicaoId] || "");
    }
    if (f.formaId) {
      params.append("formaId", f.formaId);
      params.append("formaNome", mapForma[f.formaId] || "");
    }
    if (f.dataInicio) params.append("dataInicio", f.dataInicio);
    if (f.dataFim) params.append("dataFim", f.dataFim);
    params.append("incluirDespesas", f.incluirDespesas ? "1" : "0");
    if (f.situacao && f.situacao !== "todos") params.append("situacao", f.situacao);

    const url = `/RelatorioOrcamentos?${params.toString()}`;
    setPendingReportUrl(url);
    setShowRelatorioModal(false);
  };

  React.useEffect(() => {
    if (!showRelatorioModal && pendingReportUrl) {
      window.open(pendingReportUrl, "_blank");
      setPendingReportUrl(null);
    }
  }, [showRelatorioModal, pendingReportUrl]);

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-slate-800 text-white px-2 md:px-6 py-3 md:py-5 mb-2 md:mb-4 shadow-lg rounded-lg md:rounded-xl mx-1 md:mx-0">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-slate-700 p-1.5 md:p-2 rounded-lg">
                  <FileText className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div>
                  <h1 className="text-sm md:text-xl font-bold">Orçamentos</h1>
                  <p className="text-slate-300 text-[9px] md:text-xs">Gerenciamento de orçamentos</p>
                </div>
              </div>

              <div className="flex gap-1 md:gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1 md:gap-2 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3">
                  <Filter className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Filtros</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowRelatorioModal(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1 md:gap-2 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3">
                  <BarChart3 className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Relatório</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowImportModal(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1 md:gap-2 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3 hidden sm:flex">
                  <Upload className="w-3 h-3 md:w-4 md:h-4" />
                  Importar
                </Button>

                <Button
                  variant="outline"
                  onClick={handleNew}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1 md:gap-2 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3">
                  <Plus className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Novo</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="max-w-[1800px] mx-auto px-1 md:px-4">
          
          {/* Stats Cards - Ocultos em mobile para economizar espaço */}
          <div className="hidden md:grid grid-cols-4 gap-3 mb-4">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-4">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-0.5">Total Geral</p>
                  <div className="text-xl font-bold text-slate-900">{filteredOrcamentos.length}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-4">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-0.5">Pendentes</p>
                  <div className="text-xl font-bold text-yellow-600">
                    {filteredOrcamentos.filter((o) => o.status === "pendente").length}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-4">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-0.5">Aprovados</p>
                  <div className="text-xl font-bold text-blue-600">
                    {filteredOrcamentos.filter((o) => o.status === "aprovado").length}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-4">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-0.5">Valor Total</p>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(filteredOrcamentos.reduce((sum, o) => sum + (o.valor_total || 0), 0))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Stats Mobile - Compacto */}
          <div className="grid grid-cols-2 gap-1.5 mb-2 md:hidden">
            <Card className="border-l-2 border-l-slate-600 shadow-sm">
              <CardContent className="p-2">
                <p className="text-[9px] font-medium text-slate-600">Total</p>
                <div className="text-sm font-bold text-slate-900">{filteredOrcamentos.length}</div>
              </CardContent>
            </Card>
            <Card className="border-l-2 border-l-yellow-500 shadow-sm">
              <CardContent className="p-2">
                <p className="text-[9px] font-medium text-slate-600">Aprovados</p>
                <div className="text-sm font-bold text-blue-600">
                  {filteredOrcamentos.filter((o) => o.status === "aprovado").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-sm p-2 md:p-4 mb-2 md:mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div className="relative">
                <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
                <Input
                  type="text"
                  placeholder="Busca por número..."
                  value={quickSearchNumber}
                  onChange={(e) => setQuickSearchNumber(e.target.value)}
                  className="bg-white text-slate-900 placeholder:text-slate-400 pl-8 md:pl-10 h-9 md:h-10 text-sm border-2 border-blue-100 focus:border-blue-500"
                />
                {quickSearchNumber && (
                  <button
                    onClick={() => setQuickSearchNumber("")}
                    className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                    ✕
                  </button>
                )}
              </div>

              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar por cliente ou vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white text-slate-900 placeholder:text-slate-400 pl-10 border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-neutral-800 font-medium">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="mt-1 bg-white text-neutral-800">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="rejeitado">Rejeitado</SelectItem>
                        <SelectItem value="expirado">Expirado</SelectItem>
                        <SelectItem value="convertido">Convertido</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-neutral-800 font-medium">Vendedor</Label>
                    <Select value={filterVendedor} onValueChange={setFilterVendedor}>
                      <SelectTrigger className="mt-1 bg-white text-neutral-800">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {funcionarios.map((func) => (
                          <SelectItem key={func.id} value={func.id}>
                            {func.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-neutral-800 font-medium">Data Início</Label>
                    <Input
                      type="date"
                      value={filterDataInicio}
                      onChange={(e) => setFilterDataInicio(e.target.value)}
                      className="mt-1 bg-white text-neutral-800"
                    />
                  </div>

                  <div>
                    <Label className="text-neutral-800 font-medium">Data Fim</Label>
                    <Input
                      type="date"
                      value={filterDataFim}
                      onChange={(e) => setFilterDataFim(e.target.value)}
                      className="mt-1 bg-white text-neutral-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterStatus("todos");
                      setFilterVendedor("todos");
                      setFilterDataInicio("");
                      setFilterDataFim("");
                    }}
                    className="text-neutral-800 border-neutral-300 hover:bg-neutral-100">
                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Removido Cards Compactos antigos */}

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-700 hover:bg-slate-700">
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Nº</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Data</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Cliente</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden md:table-cell">Veículo</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden lg:table-cell">Vendedor</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden md:table-cell">Valor</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden xl:table-cell">Observações</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" />
                        <p className="text-slate-600 mt-2">Carregando orçamentos...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredOrcamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-600">Nenhum orçamento encontrado</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrcamentos.map((orcamento) => {
                      const cliente = clientes.find((c) => c.id === (orcamento.contato_id || orcamento.cliente_id));
                      const vendedor = funcionarios.find((f) => f.id === orcamento.vendedor_id);
                      const veiculo = veiculos.find((v) => v.id === orcamento.veiculo_id);
                      const veiculoTexto = veiculo ? `${veiculo.modelo} ${veiculo.placa ? `(${veiculo.placa})` : ''}` : '-';

                      return (
                        <TableRow key={orcamento.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-blue-600 py-2 md:py-3 text-xs md:text-sm">{orcamento.numero_orcamento}</TableCell>
                          <TableCell className="text-slate-900 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap">
                            {formatDate(orcamento.data_orcamento)}
                          </TableCell>
                          <TableCell className="text-slate-900 py-2 md:py-3 text-xs md:text-sm max-w-[100px] md:max-w-none truncate">{cliente?.nome || "-"}</TableCell>
                          <TableCell className="text-slate-900 py-2 md:py-3 text-xs md:text-sm hidden md:table-cell">{veiculoTexto}</TableCell>
                          <TableCell className="text-slate-900 py-2 md:py-3 text-xs md:text-sm hidden lg:table-cell">{vendedor?.nome || "-"}</TableCell>
                          <TableCell className="font-semibold text-slate-900 py-2 md:py-3 text-xs md:text-sm hidden md:table-cell">
                            {formatCurrency(orcamento.valor_total || 0)}
                          </TableCell>
                          <TableCell className="py-2 md:py-3 hidden sm:table-cell">
                            <Badge className={`${statusConfig[orcamento.status]} text-[10px] md:text-xs px-1.5 md:px-2`}>
                              {statusLabels[orcamento.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 py-2 md:py-3 max-w-[200px] truncate text-xs md:text-sm hidden xl:table-cell" title={orcamento.observacoes}>
                            {orcamento.observacoes || "-"}
                          </TableCell>
                          <TableCell className="py-2 md:py-3">
                            <div className="flex items-center justify-center gap-0.5 md:gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(orcamento)}
                                title="Visualizar"
                                className="hover:bg-blue-50 text-blue-600 h-7 w-7 md:h-8 md:w-8 p-0"
                              >
                                <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(orcamento)}
                                title="Editar"
                                className="hover:bg-amber-50 text-amber-600 h-7 w-7 md:h-8 md:w-8 p-0 hidden sm:flex"
                              >
                                <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="hover:bg-slate-100 text-slate-600 h-7 w-7 md:h-8 md:w-8 p-0">
                                    <MoreVertical className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(orcamento)} className="sm:hidden">
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePrint(orcamento)}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(orcamento)}
                                    className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm px-2">
            <div className="text-slate-600 flex items-center gap-2">
              <Filter className="w-4 h-4" /> 
              Exibindo: <strong className="text-slate-900">{filteredOrcamentos.length}</strong> registro(s)
            </div>
            <div className="font-bold text-slate-900">
              Total: {formatCurrency(filteredOrcamentos.reduce((sum, o) => sum + (o.valor_total || 0), 0))}
            </div>
          </div>
        </div>

        {/* Modals */}
        {showForm && (
          <OrcamentoFormModal
            isOpen={showForm}
            onClose={() => {
              setShowForm(false);
              setSelectedOrcamento(null);
            }}
            onSaved={handleFormSaved}
            orcamento={selectedOrcamento}
            clientes={clientes}
            funcionarios={funcionarios}
            veiculos={veiculos}
            formasPagamento={formasPagamento}
            condicoesPagamento={condicoesPagamento}
          />
        )}

        {showViewer && selectedOrcamento && (
          <OrcamentoViewer
            isOpen={showViewer}
            onClose={() => {
              setShowViewer(false);
              setSelectedOrcamento(null);
            }}
            orcamento={selectedOrcamento}
            onEdit={handleEdit}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["orcamentos"] })}
            clientes={clientes}
            veiculos={veiculos}
            funcionarios={funcionarios}
            configuracoes={configuracoes}
          />
        )}

        {/* Dialog de Exclusão */}
        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-neutral-900 text-xl font-bold">
                Tem certeza que deseja excluir este orçamento?
              </DialogTitle>
              <DialogDescription className="text-neutral-700 text-base font-medium">
                {selectedOrcamento && `O orçamento ${selectedOrcamento.numero_orcamento} será permanentemente excluído. Esta ação não pode ser desfeita.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteOpen(false)}
                className="bg-white border-2 border-neutral-400 text-neutral-900 hover:bg-neutral-100 font-bold">
                Cancelar
              </Button>
              <Button
                onClick={confirmarExclusao}
                className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Sim, excluir orçamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modals de Relatório e Importação */}
        <RelatorioOrcamentosFiltersModal
          isOpen={showRelatorioModal}
          onClose={() => setShowRelatorioModal(false)}
          onGenerate={onGenerateRelatorio}
          clientes={clientes}
          funcionarios={funcionarios}
          veiculos={veiculos}
          condicoes={condicoesPagamento}
          formas={formasPagamento}
        />

        {showImportModal && (
          <ImportarOrcamentosModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              setShowImportModal(false);
              queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
            }}
          />
        )}
      </div>
    </>
  );
}