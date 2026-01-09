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
    const config = statusMap[status] || statusMap['em_andamento'];
    const Icon = config.icon;
    return (
      <Badge className={`${config.bgClass} ${config.textClass} ${config.borderClass} border hover:${config.bgClass} font-medium flex items-center gap-1.5 px-2.5 py-1`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </Badge>
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

  return (
    <>
      <Toaster />

      <div className="min-h-screen bg-slate-50">
        <div className="bg-slate-800 text-white px-4 md:px-6 py-5 md:py-8 mb-4 md:mb-6 shadow-xl">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 md:p-4 rounded-lg md:rounded-xl backdrop-blur-sm">
                  <ClipboardList className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                  <h1 className="text-xl md:text-4xl font-bold mb-0.5 md:mb-1.5 tracking-tight">Ordens de Serviço</h1>
                  <p className="text-slate-200 text-xs md:text-base">Gestão de ordens de serviço</p>
                </div>
              </div>
              <div className="flex gap-1.5 md:gap-2.5 flex-wrap">
                {isAdmin && selectedOS.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleAgrupar}
                      disabled={selectedOS.length < 2}
                      className="bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4"
                    >
                      <Merge className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Agrupar</span> ({selectedOS.length})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleBulkDelete}
                      className="bg-red-600 border-red-600 text-white hover:bg-red-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4"
                    >
                      <Trash className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      ({selectedOS.length})
                    </Button>
                  </>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setIsRelatorioFiltersModalOpen(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4"
                >
                  <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Relatório</span>
                </Button>

                {canCreate('os') && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsImportModalOpen(true)}
                      className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4 hidden sm:flex"
                    >
                      <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      Importar
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleNewOS}
                      className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4"
                    >
                      <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Nova OS</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-3 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div>
                  <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-0.5 md:mb-1">Total</p>
                  <div className="text-lg md:text-2xl font-bold text-slate-900">{resumo.total}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div>
                  <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-0.5 md:mb-1">Em Andamento</p>
                  <div className="text-lg md:text-2xl font-bold text-amber-600">{resumo.emAndamento}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div>
                  <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-0.5 md:mb-1">Finalizadas</p>
                  <div className="text-lg md:text-2xl font-bold text-emerald-600">{resumo.finalizadas}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div>
                  <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-0.5 md:mb-1">Valor Total</p>
                  <div className="text-base md:text-2xl font-bold text-blue-600">{formatCurrency(resumo.valorTotal)}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros Avançados */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm p-3 md:p-4 mb-4 md:mb-6">
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

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-700 hover:bg-slate-700">
                    {isAdmin && (
                      <TableHead className="text-white font-semibold w-12">
                        <Checkbox
                          checked={selectedOS.length === filteredOS.length && filteredOS.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="border-white"
                        />
                      </TableHead>
                    )}
                    <TableHead className="text-white font-semibold">Nº OS</TableHead>
                    <TableHead className="text-white font-semibold">Data</TableHead>
                    <TableHead className="text-white font-semibold">Cliente</TableHead>
                    <TableHead className="text-white font-semibold">Veículo</TableHead>
                    <TableHead className="text-white font-semibold text-right">Produtos</TableHead>
                    <TableHead className="text-white font-semibold text-right">Serviços</TableHead>
                    <TableHead className="text-white font-semibold text-right">Despesas</TableHead>
                    <TableHead className="text-white font-semibold text-right">Desconto</TableHead>
                    <TableHead className="text-white font-semibold text-right">Valor Total</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOS.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 12 : 11} className="text-center py-8">
                        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-600">Nenhuma ordem de serviço encontrada</p>
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
                        <TableRow key={os.id} className="hover:bg-slate-50">
                          {isAdmin && (
                            <TableCell className="py-3">
                              <Checkbox
                                checked={selectedOS.includes(os.id)}
                                onCheckedChange={() => handleSelectOS(os.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium text-blue-600 py-3">{os.numero_os}</TableCell>
                          <TableCell className="text-slate-900 py-3">{formatDate(os.data_abertura)}</TableCell>
                          <TableCell className="text-slate-900 py-3">{getContatoNome(os)}</TableCell>
                          <TableCell className="text-slate-900 py-3">{getVeiculoInfo(os.veiculo_id)}</TableCell>
                          <TableCell className="text-slate-900 py-3 text-right">{formatCurrency(valorProdutos)}</TableCell>
                          <TableCell className="text-slate-900 py-3 text-right">{formatCurrency(valorServicos)}</TableCell>
                          <TableCell className="text-slate-900 py-3 text-right">{formatCurrency(valorDespesas)}</TableCell>
                          <TableCell className="text-slate-900 py-3 text-right">{formatCurrency(os.desconto_valor || 0)}</TableCell>
                          <TableCell className="font-semibold text-slate-900 py-3 text-right">{formatCurrency(os.valor_total)}</TableCell>
                          <TableCell className="py-3">{getStatusBadge(os.status)}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(os)}
                                title="Visualizar"
                                className="hover:bg-blue-50 text-blue-600"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {canEdit('os') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(os)}
                                  title="Editar"
                                  className="hover:bg-amber-50 text-amber-600"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              )}
                              {canDelete('os') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(os)}
                                  title="Excluir"
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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