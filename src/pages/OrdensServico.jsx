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
  Merge,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
    const cfg = {
      em_andamento: { label: 'Em Andamento', bg: 'bg-amber-400', text: 'text-white' },
      finalizado:   { label: 'Finalizado',   bg: 'bg-emerald-500', text: 'text-white' },
      cancelado:    { label: 'Cancelado',    bg: 'bg-red-500',   text: 'text-white' },
    };
    const c = cfg[status] || { label: status, bg: 'bg-slate-200', text: 'text-slate-700' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text} whitespace-nowrap`}>
        {c.label}
      </span>
    );
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

  const canceladas = ordensServico.filter((os) => os.status === 'cancelado').length;

  return (
    <>
      <Toaster />

      <div className="space-y-5">

        {/* ═══════════════════════════════════════
            LINHA 1 — KPI CARDS + AÇÕES
        ═══════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row gap-3">

          {/* KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">

            {/* Total */}
            <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-300 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total</p>
              <div className="flex items-end justify-between">
                <span className="text-[2.8rem] font-black text-slate-800 leading-none">{resumo.total}</span>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-1">
                  <ClipboardList className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">todas as ordens</p>
            </div>

            {/* Em Andamento */}
            <div className="relative bg-white rounded-2xl border border-amber-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-400 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Em Andamento</p>
              <div className="flex items-end justify-between">
                <span className="text-[2.8rem] font-black text-amber-500 leading-none">{resumo.emAndamento}</span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-1">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">aguardando conclusão</p>
            </div>

            {/* Finalizadas */}
            <div className="relative bg-white rounded-2xl border border-emerald-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Finalizadas</p>
              <div className="flex items-end justify-between">
                <span className="text-[2.8rem] font-black text-emerald-600 leading-none">{resumo.finalizadas}</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-1">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">concluídas com êxito</p>
            </div>

            {/* Faturamento */}
            <div className="relative bg-white rounded-2xl border border-blue-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-500 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Faturamento Total</p>
              <div className="flex items-end justify-between">
                <span className="text-xl font-black text-blue-700 leading-none">{formatCurrency(resumo.valorTotal)}</span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-1">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">{canceladas} cancelada{canceladas !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO (lado direito em desktop, abaixo em mobile) */}
          <div className="flex flex-row lg:flex-col gap-2 lg:items-stretch lg:justify-center flex-shrink-0 lg:min-w-[168px]">
            {isAdmin && selectedOS.length > 0 && (
              <div className="flex gap-2">
                <button onClick={handleAgrupar} disabled={selectedOS.length < 2}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl text-[12px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap">
                  <Merge className="w-3.5 h-3.5" />
                  <span>Agrupar ({selectedOS.length})</span>
                </button>
                <button onClick={handleBulkDelete}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl text-[12px] font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap">
                  <Trash className="w-3.5 h-3.5" />({selectedOS.length})
                </button>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-[13px] font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap">
                  <Filter className="w-4 h-4 text-slate-400" />
                  Ações
                  <ChevronDown className="w-3.5 h-3.5 opacity-40" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="py-2.5 text-sm cursor-pointer" onClick={() => setIsRelatorioFiltersModalOpen(true)}>
                  <FileText className="w-4 h-4 mr-2.5 text-slate-400" />Gerar Relatório
                </DropdownMenuItem>
                {canCreate('os') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="py-2.5 text-sm cursor-pointer" onClick={() => setIsImportModalOpen(true)}>
                      <Upload className="w-4 h-4 mr-2.5 text-slate-400" />Importar OS
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {canCreate('os') && (
              <button onClick={handleNewOS}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl text-[13px] font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-200 whitespace-nowrap">
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Nova OS
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════
            LINHA 2 — TABELA
        ═══════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <AdvancedSearchFilters
              entityName="ordens_servico"
              searchFields={osSearchFields}
              filterFields={osFilterFields}
              dateField="data_abertura"
              sortFields={osSortFields}
              defaultSort={{ field: 'data_abertura', direction: 'desc' }}
              onFiltersChange={setAdvancedFilters}
              placeholder="Buscar por nº OS, cliente, responsável, veículo..."
            />
          </div>

          {/* Contador de resultados */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/70 border-b border-slate-100">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">Resultados</span>
            <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {filteredOS.length} registro{filteredOS.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0B1629' }}>
                  {isAdmin && (
                    <th className="w-10 px-3 py-3 text-center">
                      <Checkbox
                        checked={selectedOS.length === filteredOS.length && filteredOS.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="border-slate-500 w-4 h-4"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Nº OS</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap hidden sm:table-cell">Data</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Veículo</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell whitespace-nowrap">Produtos</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell whitespace-nowrap">Serviços</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell whitespace-nowrap">Valor Total</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Status</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredOS.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="text-center py-20">
                      <ClipboardList className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 text-sm font-semibold">Nenhuma ordem de serviço encontrada</p>
                      <p className="text-slate-300 text-xs mt-1">Tente ajustar os filtros ou criar uma nova OS</p>
                    </td>
                  </tr>
                ) : (
                  filteredOS.map((os, idx) => {
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

                    const isSelected = selectedOS.includes(os.id);

                    return (
                      <tr key={os.id}
                        className={`border-b border-slate-100 transition-colors cursor-default ${isSelected ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/30 hover:bg-slate-50/80'}`}>
                        {isAdmin && (
                          <td className="py-3.5 px-3 text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleSelectOS(os.id)}
                              className="w-4 h-4"
                            />
                          </td>
                        )}

                        {/* Nº OS */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button onClick={() => handleView(os)} className="text-blue-600 font-bold text-[13px] hover:text-blue-800 hover:underline transition-colors">
                            {os.numero_os}
                          </button>
                        </td>

                        {/* Data */}
                        <td className="py-3.5 px-4 text-[12px] text-slate-500 whitespace-nowrap hidden sm:table-cell font-medium tabular-nums">
                          {formatDate(os.data_abertura)}
                        </td>

                        {/* Cliente */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <span className="text-[13px] font-semibold text-slate-800 truncate block">{getContatoNome(os)}</span>
                        </td>

                        {/* Veículo */}
                        <td className="py-3.5 px-4 max-w-[160px] hidden lg:table-cell">
                          <span className="text-[12px] text-slate-500 truncate block">
                            {getVeiculoInfo(os.veiculo_id) || <span className="text-slate-300">—</span>}
                          </span>
                        </td>

                        {/* Produtos */}
                        <td className="py-3.5 px-4 text-right text-[12px] text-slate-500 hidden xl:table-cell tabular-nums">
                          {formatCurrency(valorProdutos)}
                        </td>

                        {/* Serviços */}
                        <td className="py-3.5 px-4 text-right text-[12px] text-slate-500 hidden xl:table-cell tabular-nums">
                          {formatCurrency(valorServicos)}
                        </td>

                        {/* Valor Total */}
                        <td className="py-3.5 px-4 text-right hidden md:table-cell">
                          <span className="text-[13px] font-bold text-slate-800 tabular-nums">{formatCurrency(os.valor_total)}</span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center hidden lg:table-cell">
                          {(() => {
                            const cfg = {
                              em_andamento: { label: 'Em Andamento', dot: '#F59E0B', bg: '#FFFBEB', color: '#92400E' },
                              finalizado:   { label: 'Finalizado',   dot: '#10B981', bg: '#ECFDF5', color: '#065F46' },
                              cancelado:    { label: 'Cancelado',    dot: '#EF4444', bg: '#FEF2F2', color: '#991B1B' },
                            };
                            const s = cfg[os.status] || { label: os.status, dot: '#9CA3AF', bg: '#F9FAFB', color: '#6B7280' };
                            return (
                              <span style={{ background: s.bg, color: s.color }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap">
                                <span style={{ background: s.dot, width: 6, height: 6, borderRadius: '50%', flexShrink: 0, display: 'inline-block' }} />
                                {s.label}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleView(os)} title="Visualizar"
                              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                              <Eye className="w-[15px] h-[15px]" />
                            </button>
                            {canEdit('os') && (
                              <button onClick={() => handleEdit(os)} title="Editar"
                                className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                                <Pencil className="w-[15px] h-[15px]" />
                              </button>
                            )}
                            {canDelete('os') && (
                              <button onClick={() => handleDelete(os)} title="Excluir"
                                className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                <Trash2 className="w-[15px] h-[15px]" />
                              </button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => handleView(os)} className="py-2.5 cursor-pointer">
                                  <Eye className="w-4 h-4 mr-2 text-blue-500" />Ver detalhes
                                </DropdownMenuItem>
                                {canEdit('os') && (
                                  <DropdownMenuItem onClick={() => handleEdit(os)} className="py-2.5 cursor-pointer">
                                    <Pencil className="w-4 h-4 mr-2 text-amber-500" />Editar
                                  </DropdownMenuItem>
                                )}
                                {canDelete('os') && (
                                  <DropdownMenuItem onClick={() => handleDelete(os)} className="py-2.5 text-red-600 cursor-pointer">
                                    <Trash2 className="w-4 h-4 mr-2" />Excluir
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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