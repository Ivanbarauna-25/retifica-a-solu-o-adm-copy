import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus,
  Pencil,
  Eye,
  Trash2,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  Upload,
  Loader2,
  ClipboardList,
  DollarSign,
  XCircle,
  Trash,
  Merge
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';
import OrdemServicoViewer from '@/components/os/OrdemServicoViewer';
import OrdemServicoForm from '@/components/os/OrdemServicoForm';
import StatusBadge from '@/components/StatusBadge';
import RelatorioOSFiltersModal from '@/components/os/RelatorioOSFiltersModal';
import RelatorioOS from '@/components/os/RelatorioOS';
import ImportarOSModal from '@/components/os/ImportarOSModal';
import AgruparOSModal from '@/components/os/AgruparOSModal';
import ProtectedPage from '@/components/ProtectedPage';
import { usePermissions } from '@/components/ProtectedPage';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AdvancedSearchFilters from '@/components/filters/AdvancedSearchFilters';
import { useAdvancedFilters } from '@/components/filters/useAdvancedFilters';
import StandardDialog from '@/components/ui/StandardDialog';
import { Checkbox } from '@/components/ui/checkbox';

function OrdensServicoContent() {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRelatorioFiltersModalOpen, setIsRelatorioFiltersModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewingOS, setViewingOS] = useState(null);
  const [editingOS, setEditingOS] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(null);
  const [osToDelete, setOsToDelete] = useState(null);
  const [pendingReportUrl, setPendingReportUrl] = useState(null);
  const [selectedOS, setSelectedOS] = useState([]);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [showAgruparModal, setShowAgruparModal] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete, isAdmin } = usePermissions();
  const navigate = useNavigate();

  const { data: ordensServico = [], isLoading: loadingOS } = useQuery({
    queryKey: ['ordens-servico'],
    queryFn: async () => {
      const data = await base44.entities.OrdemServico.list('-data_abertura');
      return data || [];
    }
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const data = await base44.entities.Cliente.list();
      return data || [];
    }
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ['veiculos'],
    queryFn: async () => {
      const data = await base44.entities.Veiculo.list();
      return data || [];
    }
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: async () => {
      const data = await base44.entities.Funcionario.list();
      return data || [];
    }
  });

  const { data: configuracoes } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: async () => {
      const data = await base44.entities.Configuracoes.list();
      return data?.[0] || null;
    }
  });

  const { data: despesasOS = [] } = useQuery({
    queryKey: ['despesas-os'],
    queryFn: async () => {
      const data = await base44.entities.DespesaOS.list();
      return data || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OrdemServico.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['ordens-servico']);
      toast({
        title: 'Sucesso!',
        description: 'Ordem de serviço excluída com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir OS',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleEdit = (os) => {
    setEditingOS(os);
    setIsFormOpen(true);
  };

  const handleView = (os) => {
    setViewingOS(os);
    setIsViewerOpen(true);
  };

  const handleDelete = async (os) => {
    setOsToDelete(os);
    setConfirmDeleteOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!osToDelete) return;
    try {
      await base44.entities.OrdemServico.delete(osToDelete.id);
      toast({
        title: '✅ OS excluída',
        description: `A ordem de serviço ${osToDelete.numero_os} foi excluída com sucesso.`
      });
      setConfirmDeleteOpen(false);
      setOsToDelete(null);
      queryClient.invalidateQueries(['ordens-servico']);
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSelectOS = (osId) => {
    setSelectedOS(prev => 
      prev.includes(osId) ? prev.filter(id => id !== osId) : [...prev, osId]
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedOS(filteredOS.map(os => os.id));
    } else {
      setSelectedOS([]);
    }
  };

  const handleAgrupar = () => {
    if (selectedOS.length < 2) {
      toast({
        title: 'Seleção inválida',
        description: 'Selecione pelo menos 2 OSs para agrupar',
        variant: 'destructive'
      });
      return;
    }

    const ossSelecionadas = ordensServico.filter(os => selectedOS.includes(os.id));
    const clienteIds = [...new Set(ossSelecionadas.map(os => os.contato_id))];
    
    if (clienteIds.length > 1) {
      toast({
        title: 'Clientes diferentes',
        description: 'Só é possível agrupar OSs do mesmo cliente',
        variant: 'destructive'
      });
      return;
    }

    setShowAgruparModal(true);
  };

  const handleBulkDelete = () => {
    if (selectedOS.length === 0) {
      toast({
        title: 'Nenhuma OS selecionada',
        description: 'Selecione pelo menos uma OS para excluir',
        variant: 'destructive'
      });
      return;
    }
    setConfirmBulkDeleteOpen(true);
  };

  const confirmarExclusaoEmMassa = async () => {
    try {
      const deletePromises = selectedOS.map(id => 
        base44.entities.OrdemServico.delete(id)
      );
      await Promise.all(deletePromises);
      
      toast({
        title: '✅ Exclusão concluída',
        description: `${selectedOS.length} ordem(ns) de serviço excluída(s) com sucesso.`
      });
      
      setConfirmBulkDeleteOpen(false);
      setSelectedOS([]);
      queryClient.invalidateQueries(['ordens-servico']);
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleNewOS = () => {
    setEditingOS(null);
    setIsFormOpen(true);
  };

  const handleFormSaved = async (savedOS) => {
    await queryClient.invalidateQueries(['ordens-servico']);
    setIsFormOpen(false);
    setEditingOS(null);
    
    if (savedOS?.id) {
      setViewingOS(savedOS);
      setIsViewerOpen(true);
    }
  };

  const handleGenerateRelatorio = (filters) => {
    const params = new URLSearchParams();
    
    if (filters.status && filters.status !== "todos") {
      params.append("status", filters.status);
      params.append("statusLabel", statusLabels[filters.status] || "");
    }

    if (filters.numeroOS) {
      params.append("numeroOS", filters.numeroOS);
    }

    if (filters.clienteId && filters.clienteId !== "todos") {
      params.append("clienteId", filters.clienteId);
      const cliente = clientes.find(c => c.id === filters.clienteId);
      if (cliente) params.append("clienteNome", cliente.nome);
    }

    if (filters.responsavelId && filters.responsavelId !== "todos") {
      params.append("responsavelId", filters.responsavelId);
      const func = funcionarios.find(f => f.id === filters.responsavelId);
      if (func) params.append("responsavelNome", func.nome);
    }

    if (filters.vendedorId && filters.vendedorId !== "todos") {
      params.append("vendedorId", filters.vendedorId);
      const func = funcionarios.find(f => f.id === filters.vendedorId);
      if (func) params.append("vendedorNome", func.nome);
    }

    if (filters.veiculoId && filters.veiculoId !== "todos") {
      params.append("veiculoId", filters.veiculoId);
      params.append("veiculoInfo", getVeiculoInfo(filters.veiculoId));
    }

    if (filters.dataInicio) {
      params.append("dataInicio", filters.dataInicio);
    }

    if (filters.dataFim) {
      params.append("dataFim", filters.dataFim);
    }

    if (filters.somenteCanceladas) {
      params.append("somenteCanceladas", "true");
    }

    const url = `/RelatorioOS?${params.toString()}`;
    setPendingReportUrl(url);
    setIsRelatorioFiltersModalOpen(false);
  };

  useEffect(() => {
    if (!isRelatorioFiltersModalOpen && pendingReportUrl) {
      window.open(pendingReportUrl, "_blank");
      setPendingReportUrl(null);
    }
  }, [isRelatorioFiltersModalOpen, pendingReportUrl]);

  const getContatoNome = (ordem) => {
    if (!ordem) return '—';
    if (ordem.contato_tipo === 'cliente' && ordem.contato_id) {
      const cliente = clientes.find((c) => c.id === ordem.contato_id);
      return cliente?.nome || '—';
    }
    if (ordem.contato_tipo === 'funcionario' && ordem.contato_id) {
      const func = funcionarios.find((f) => f.id === ordem.contato_id);
      return func?.nome || '—';
    }
    if (ordem.cliente_id) {
      const cliente = clientes.find((c) => c.id === ordem.cliente_id);
      return cliente?.nome || '—';
    }
    return '—';
  };

  const getVeiculoInfo = (id) => {
    if (!id) return '';
    const v = veiculos.find((v) => v.id === id);
    if (!v) return '';
    const parts = [v.marca, v.modelo].filter(Boolean).join(' ');
    const placa = v.placa ? ` - ${v.placa}` : '';
    return parts ? `${parts}${placa}` : v.placa || '';
  };

  const getFuncionarioNome = (id) => {
    if (!id) return '—';
    const func = funcionarios.find((f) => f.id === id);
    return func?.nome || '—';
  };

  const statusMap = {
    'em_andamento': { label: 'Em Andamento', icon: Clock, bgClass: 'bg-amber-50', textClass: 'text-amber-700', borderClass: 'border-amber-200' },
    'finalizado': { label: 'Finalizado', icon: CheckCircle, bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', borderClass: 'border-emerald-200' },
    'cancelado': { label: 'Cancelado', icon: XCircle, bgClass: 'bg-rose-50', textClass: 'text-rose-700', borderClass: 'border-rose-200' }
  };

  const getStatusBadge = (status) => {
    return <StatusBadge status={status} />;
  };

  const statusLabels = {
    'em_andamento': 'Em Andamento',
    'finalizado': 'Finalizado',
    'cancelado': 'Cancelado'
  };

  const statusColors = {
    'em_andamento': 'bg-yellow-100 text-yellow-800',
    'finalizado': 'bg-green-100 text-green-800',
    'cancelado': 'bg-red-100 text-red-800'
  };

  // Preparar dados com campos de busca expandidos para o hook de filtros
  const ordensComCamposBusca = useMemo(() => {
    return ordensServico.map(os => ({
      ...os,
      _clienteNome: getContatoNome(os),
      _funcionarioNome: getFuncionarioNome(os.funcionario_id),
      _veiculoInfo: getVeiculoInfo(os.veiculo_id)
    }));
  }, [ordensServico, clientes, funcionarios, veiculos, getContatoNome, getFuncionarioNome, getVeiculoInfo]);

  // Usar hook de filtros avançados
  const filteredOS = useAdvancedFilters(ordensComCamposBusca, advancedFilters);

  // Configuração dos campos de busca e filtro
  const osSearchFields = [
    { key: 'numero_os', label: 'Nº OS' },
    { key: '_clienteNome', label: 'Cliente' },
    { key: '_funcionarioNome', label: 'Responsável' },
    { key: '_veiculoInfo', label: 'Veículo' }
  ];

  const osFilterFields = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'em_andamento', label: 'Em Andamento' },
        { value: 'finalizado', label: 'Finalizado' },
        { value: 'cancelado', label: 'Cancelado' }
      ]
    }
  ];

  const osSortFields = [
    { key: 'data_abertura', label: 'Data Abertura' },
    { key: 'numero_os', label: 'Número OS' },
    { key: 'valor_total', label: 'Valor Total' },
    { key: 'created_date', label: 'Data Criação' }
  ];

  const resumo = {
    total: ordensServico.length,
    emAndamento: ordensServico.filter((os) => os.status === 'em_andamento').length,
    finalizadas: ordensServico.filter((os) => os.status === 'finalizado').length,
    valorTotal: ordensServico.reduce((sum, os) => sum + (os.valor_total || 0), 0)
  };

  if (loadingOS) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-black mx-auto" />
          <p className="mt-4 text-black">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster />

      <div className="min-h-screen bg-slate-50">

        {/* ── HEADER DA PÁGINA ── */}
        <div className="mb-4 md:mb-5">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Título + subtítulo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200 flex-shrink-0">
                  <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-[17px] md:text-[20px] font-extrabold text-slate-900 leading-tight tracking-tight">Ordens de Serviço</h1>
                  <p className="text-slate-400 text-[11px] font-medium mt-0.5 leading-none">Gestão e acompanhamento · {resumo.total} registros</p>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2 flex-wrap items-center">
                {isAdmin && selectedOS.length > 0 && (
                  <>
                    <button
                      onClick={handleAgrupar}
                      disabled={selectedOS.length < 2}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      <Merge className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Agrupar</span> ({selectedOS.length})
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      ({selectedOS.length})
                    </button>
                  </>
                )}

                <button
                  onClick={() => setIsRelatorioFiltersModalOpen(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[11px] font-semibold border border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Relatório</span>
                </button>

                {canCreate('os') && (
                  <>
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[11px] font-semibold border border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Importar
                    </button>

                    <button
                      onClick={handleNewOS}
                      className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[12px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Nova OS</span>
                      <span className="sm:hidden">Nova</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-1 md:px-4">

          {/* ── KPI CARDS ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-3 md:mb-4">
            {/* Total */}
            <div className="kpi-bar kpi-bar-blue bg-white border border-slate-100 rounded-xl p-3 md:p-4 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total de OS</p>
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <ClipboardList className="w-3.5 h-3.5 text-blue-500" />
                </div>
              </div>
              <span className="text-2xl md:text-3xl font-black text-slate-800 font-mono leading-none">{resumo.total}</span>
            </div>
            {/* Em Andamento */}
            <div className="kpi-bar kpi-bar-yellow bg-white border border-slate-100 rounded-xl p-3 md:p-4 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Em Andamento</p>
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </div>
              </div>
              <span className="text-2xl md:text-3xl font-black text-amber-500 font-mono leading-none">{resumo.emAndamento}</span>
            </div>
            {/* Finalizadas */}
            <div className="kpi-bar kpi-bar-green bg-white border border-slate-100 rounded-xl p-3 md:p-4 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finalizadas</p>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>
              <span className="text-2xl md:text-3xl font-black text-emerald-600 font-mono leading-none">{resumo.finalizadas}</span>
            </div>
            {/* Faturamento */}
            <div className="kpi-bar kpi-bar-sky bg-white border border-slate-100 rounded-xl p-3 md:p-4 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faturamento</p>
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                </div>
              </div>
              <span className="text-sm md:text-xl font-black text-blue-600 font-mono leading-none">{formatCurrency(resumo.valorTotal)}</span>
            </div>
          </div>

          {/* ── FILTROS ── */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-3 md:p-4 mb-3 md:mb-4">
            <AdvancedSearchFilters
              entityName="ordens_servico"
              searchFields={osSearchFields}
              filterFields={osFilterFields}
              dateField="data_abertura"
              sortFields={osSortFields}
              defaultSort={{ field: 'data_abertura', direction: 'desc' }}
              onFiltersChange={setAdvancedFilters}
            />
          </div>

          {/* ── TABELA ── */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Barra de título da tabela */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lista de OS</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filteredOS.length} registro{filteredOS.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-700 hover:bg-slate-700" style={{height:'30px'}}>
                    {isAdmin && (
                      <TableHead className="text-slate-200 font-bold w-8 md:w-10 text-[9px] px-2 uppercase tracking-widest py-0 text-center">
                        <Checkbox
                          checked={selectedOS.length === filteredOS.length && filteredOS.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="border-slate-400 w-3.5 h-3.5"
                        />
                      </TableHead>
                    )}
                    <TableHead className="text-slate-200 font-bold text-[9px] px-2 md:px-3 uppercase tracking-widest py-0 text-center">Nº OS</TableHead>
                    <TableHead className="text-slate-200 font-bold text-[9px] px-2 md:px-3 uppercase tracking-widest py-0 text-center hidden sm:table-cell">Data</TableHead>
                    <TableHead className="text-slate-200 font-bold text-[9px] px-2 md:px-3 uppercase tracking-widest py-0 text-center w-[110px] md:w-[160px]">Cliente</TableHead>
                    <TableHead className="text-slate-200 font-bold text-[9px] px-2 md:px-3 uppercase tracking-widest py-0 text-center hidden lg:table-cell">Veículo</TableHead>
                    <TableHead className="text-slate-200 font-bold text-[9px] px-2 md:px-3 uppercase tracking-widest py-0 text-right hidden xl:table-cell">Produtos</TableHead>
                    <TableHead className="text-slate-200 font-bold text-[9px] px-2 md:px-3 uppercase tracking-widest py-0 text-right hidden xl:table-cell">Serviços</TableHead>
                    <TableHead className="text-slate-200 font-bold text-[9px] px-2 md:px-3 uppercase tracking-widest py-0 text-right hidden 2xl:table-cell">Despesas</TableHead>
                    <TableHead className="text-slate-200 font-bold text-[9px] px-2 md:px-3 uppercase tracking-widest py-0 text-right hidden 2xl:table-cell">Desconto</TableHead>
                    <TableHead className="text-slate-200 font-bold text-[9px] px-2 md:px-3 uppercase tracking-widest py-0 text-right hidden md:table-cell">Valor Total</TableHead>
                    <TableHead className="text-slate-200 font-bold text-[9px] px-2 md:px-3 uppercase tracking-widest py-0 text-center hidden lg:table-cell">Status</TableHead>
                    <TableHead className="text-slate-200 font-bold text-[9px] px-2 md:px-3 uppercase tracking-widest py-0 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOS.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 12 : 11} className="text-center py-12">
                        <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-400 text-sm font-medium">Nenhuma ordem de serviço encontrada</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOS.map((os) => {
                      const valorProdutos = (os.itens || [])
                        .filter(item => item.tipo === 'produto')
                        .reduce((sum, item) => sum + (item.valor_total || 0), 0);

                      const valorServicos = (os.itens || [])
                        .filter(item => item.tipo === 'servico')
                        .reduce((sum, item) => sum + (item.valor_total || 0), 0);

                      const despesasDaOS = despesasOS
                        .filter(d => d.ordem_id === os.id)
                        .reduce((sum, d) => sum + (d.valor || 0), 0);
                      const valorDespesas = (os.outras_despesas || 0) + despesasDaOS;

                      return (
                        <TableRow key={os.id} className="hover:bg-blue-50/40 border-b border-slate-100 transition-colors">
                          {isAdmin && (
                            <TableCell className="py-1.5 px-2 text-center">
                              <Checkbox
                                checked={selectedOS.includes(os.id)}
                                onCheckedChange={() => handleSelectOS(os.id)}
                                className="w-3.5 h-3.5"
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-bold text-blue-600 py-2 text-[11px] md:text-xs px-2 md:px-3 whitespace-nowrap">{os.numero_os}</TableCell>
                          <TableCell className="text-slate-600 py-2 text-[11px] md:text-xs whitespace-nowrap px-2 md:px-3 hidden sm:table-cell">{formatDate(os.data_abertura)}</TableCell>
                          <TableCell className="text-slate-800 py-2 text-[11px] md:text-xs px-2 md:px-3 w-[110px] md:w-[160px] max-w-[110px] md:max-w-[160px] truncate font-medium">{getContatoNome(os)}</TableCell>
                          <TableCell className="text-slate-600 py-2 text-[11px] md:text-xs hidden lg:table-cell px-2 md:px-3 max-w-[160px] truncate whitespace-nowrap">{getVeiculoInfo(os.veiculo_id)}</TableCell>
                          <TableCell className="text-slate-700 py-2 text-right text-[11px] md:text-xs hidden xl:table-cell px-2 md:px-3 font-mono whitespace-nowrap">{formatCurrency(valorProdutos)}</TableCell>
                          <TableCell className="text-slate-700 py-2 text-right text-[11px] md:text-xs hidden xl:table-cell px-2 md:px-3 font-mono whitespace-nowrap">{formatCurrency(valorServicos)}</TableCell>
                          <TableCell className="text-slate-700 py-2 text-right text-[11px] md:text-xs hidden 2xl:table-cell px-2 md:px-3 font-mono whitespace-nowrap">{formatCurrency(valorDespesas)}</TableCell>
                          <TableCell className="text-slate-700 py-2 text-right text-[11px] md:text-xs hidden 2xl:table-cell px-2 md:px-3 font-mono whitespace-nowrap">{formatCurrency(os.desconto_valor || 0)}</TableCell>
                          <TableCell className="font-bold text-slate-900 py-2 text-right text-[11px] md:text-xs hidden md:table-cell px-2 md:px-3 font-mono whitespace-nowrap">{formatCurrency(os.valor_total)}</TableCell>
                          <TableCell className="py-2 hidden lg:table-cell px-2 md:px-3">{getStatusBadge(os.status)}</TableCell>
                          <TableCell className="py-2 px-2 md:px-3">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={() => handleView(os)}
                                title="Visualizar"
                                className="flex items-center justify-center w-7 h-7 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {canEdit('os') && (
                                <button
                                  onClick={() => handleEdit(os)}
                                  title="Editar"
                                  className="hidden sm:flex items-center justify-center w-7 h-7 rounded-md text-amber-500 hover:bg-amber-50 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete('os') && (
                                <button
                                  onClick={() => handleDelete(os)}
                                  title="Excluir"
                                  className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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
        </div>
      </div>

      {isViewerOpen &&
        <OrdemServicoViewer
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setViewingOS(null);
          }}
          ordem={viewingOS}
          clientes={clientes}
          veiculos={veiculos}
          funcionarios={funcionarios}
          nomeEmpresa={configuracoes?.nome_empresa}
          logoEmpresa={configuracoes?.logo_url}
          onUpdated={() => queryClient.invalidateQueries(['ordens-servico'])}
        />
      }

      {isFormOpen &&
        <OrdemServicoForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingOS(null);
          }}
          ordem={editingOS}
          onSaved={handleFormSaved}
        />
      }

      <RelatorioOSFiltersModal
        isOpen={isRelatorioFiltersModalOpen}
        onClose={() => setIsRelatorioFiltersModalOpen(false)}
        onGenerate={handleGenerateRelatorio}
        clientes={clientes}
        funcionarios={funcionarios}
        veiculos={veiculos}
      />

      {canCreate('os') && isImportModalOpen &&
        <ImportarOSModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['ordens-servico']);
            setIsImportModalOpen(false);
          }}
        />
      }

      <AgruparOSModal
        isOpen={showAgruparModal}
        onClose={() => {
          setShowAgruparModal(false);
          setSelectedOS([]);
        }}
        osIds={selectedOS}
        onSuccess={() => {
          queryClient.invalidateQueries(['ordens-servico']);
          setSelectedOS([]);
        }}
      />

      <StandardDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={confirmarExclusao}
        title="Excluir Ordem de Serviço"
        description={osToDelete ? `A ordem de serviço ${osToDelete.numero_os} será permanentemente excluída. Esta ação não pode ser desfeita.` : ''}
        variant="danger"
        confirmText="Sim, excluir"
        cancelText="Cancelar"
      />

      <StandardDialog
        isOpen={confirmBulkDeleteOpen}
        onClose={() => setConfirmBulkDeleteOpen(false)}
        onConfirm={confirmarExclusaoEmMassa}
        title="Excluir Múltiplas Ordens de Serviço"
        description={`${selectedOS.length} ordem(ns) de serviço será(ão) permanentemente excluída(s). Esta ação não pode ser desfeita.`}
        variant="danger"
        confirmText="Sim, excluir todas"
        cancelText="Cancelar"
      />
    </>
  );
}

export default function OrdensServicoPage() {
  return (
    <ProtectedPage pageName="OrdensServico">
      <OrdensServicoContent />
    </ProtectedPage>
  );
}