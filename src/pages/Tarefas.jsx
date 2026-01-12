import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { 
  Plus, ListTodo, LayoutGrid, 
  AlertTriangle, Loader2, Mail
} from 'lucide-react';

import TarefaForm from '@/components/tarefas/TarefaForm';
import PreferenciasNotificacaoModal from '@/components/tarefas/PreferenciasNotificacaoModal';
import TarefaLista from '@/components/tarefas/TarefaLista';
import TarefaKanban from '@/components/tarefas/TarefaKanban';
import TarefaViewer from '@/components/tarefas/TarefaViewer';
import NotificacoesTarefas from '@/components/tarefas/NotificacoesTarefas';
import AdvancedSearchFilters from '@/components/filters/AdvancedSearchFilters';
import { useAdvancedFilters } from '@/components/filters/useAdvancedFilters';

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ordensServico, setOrdensServico] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('kanban');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [advancedFilters, setAdvancedFilters] = useState(null);
  const [showPreferencias, setShowPreferencias] = useState(false);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tarefasData, funcData, cliData, osData, pecasData] = await Promise.all([
        base44.entities.Tarefa.list('-created_date'),
        base44.entities.Funcionario.list(),
        base44.entities.Cliente.list(),
        base44.entities.OrdemServico.list('-created_date', 100),
        base44.entities.Peca.list()
      ]);
      setTarefas(tarefasData || []);
      setFuncionarios(funcData || []);
      setClientes(cliData || []);
      setOrdensServico(osData || []);
      setPecas(pecasData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar dados', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (data) => {
    try {
      if (selectedTarefa?.id) {
        await base44.entities.Tarefa.update(selectedTarefa.id, data);
        toast({ title: 'Sucesso', description: 'Tarefa atualizada' });
      } else {
        await base44.entities.Tarefa.create(data);
        toast({ title: 'Sucesso', description: 'Tarefa criada' });
      }
      setIsFormOpen(false);
      setSelectedTarefa(null);
      fetchData();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleStatusChange = async (tarefaId, novoStatus) => {
    try {
      const updateData = { status: novoStatus };
      if (novoStatus === 'concluida') {
        const user = await base44.auth.me();
        updateData.data_conclusao = new Date().toISOString();
        updateData.concluida_por = user?.email;
      } else if (novoStatus !== 'concluida') {
        updateData.data_conclusao = null;
        updateData.concluida_por = null;
      }
      await base44.entities.Tarefa.update(tarefaId, updateData);
      toast({ title: 'Status atualizado' });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleChecklistToggle = async (tarefaId, itemId) => {
    try {
      const tarefa = tarefas.find(t => t.id === tarefaId);
      if (!tarefa) return;

      const updatedChecklist = tarefa.checklist.map(item =>
        item.id === itemId ? { ...item, concluido: !item.concluido } : item
      );

      await base44.entities.Tarefa.update(tarefaId, { checklist: updatedChecklist });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (tarefa) => {
    if (!window.confirm(`Deseja excluir a tarefa "${tarefa.titulo}"?`)) return;
    try {
      await base44.entities.Tarefa.delete(tarefa.id);
      toast({ title: 'Tarefa excluída' });
      setIsViewerOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (tarefa) => {
    setSelectedTarefa(tarefa);
    setIsViewerOpen(false);
    setIsFormOpen(true);
  };

  const handleView = (tarefa) => {
    setSelectedTarefa(tarefa);
    setIsViewerOpen(true);
  };

  // Preparar dados para filtro
  const tarefasComBusca = useMemo(() => {
    return tarefas.map(t => ({
      ...t,
      _responsavel: t.responsavel_nome || '',
      _vinculo: t.vinculo_descricao || ''
    }));
  }, [tarefas]);

  const tarefasFiltradas = useAdvancedFilters(tarefasComBusca, advancedFilters);

  // Estatísticas
  const stats = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    return {
      total: tarefas.length,
      pendentes: tarefas.filter(t => t.status === 'pendente').length,
      emAndamento: tarefas.filter(t => t.status === 'em_andamento').length,
      vencidas: tarefas.filter(t => t.prazo < hoje && t.status !== 'concluida' && t.status !== 'cancelada').length,
      concluidas: tarefas.filter(t => t.status === 'concluida').length
    };
  }, [tarefas]);

  // Config de filtros
  const searchFields = [
    { key: 'titulo', label: 'Título' },
    { key: '_responsavel', label: 'Responsável' },
    { key: '_vinculo', label: 'Vínculo' }
  ];

  const filterFields = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'pendente', label: 'Pendente' },
        { value: 'em_andamento', label: 'Em Andamento' },
        { value: 'aguardando', label: 'Aguardando' },
        { value: 'concluida', label: 'Concluída' },
        { value: 'cancelada', label: 'Cancelada' }
      ]
    },
    {
      key: 'prioridade',
      label: 'Prioridade',
      options: [
        { value: 'baixa', label: 'Baixa' },
        { value: 'media', label: 'Média' },
        { value: 'alta', label: 'Alta' },
        { value: 'urgente', label: 'Urgente' }
      ]
    },
    {
      key: 'tipo_vinculo',
      label: 'Tipo de Vínculo',
      options: [
        { value: 'geral', label: 'Geral' },
        { value: 'os', label: 'Ordem de Serviço' },
        { value: 'cliente', label: 'Cliente' },
        { value: 'estoque', label: 'Estoque' }
      ]
    }
  ];

  const sortFields = [
    { key: 'prazo', label: 'Prazo' },
    { key: 'prioridade', label: 'Prioridade' },
    { key: 'created_date', label: 'Data Criação' },
    { key: 'titulo', label: 'Título' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-slate-600 mx-auto" />
          <p className="mt-4 text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

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
                  <ListTodo className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div>
                  <h1 className="text-sm md:text-xl font-bold">Gestão de Tarefas</h1>
                  <p className="text-slate-300 text-[9px] md:text-xs">Organize e acompanhe suas tarefas</p>
                </div>
              </div>

              <div className="flex gap-1 md:gap-2 flex-wrap">
                <NotificacoesTarefas 
                  tarefas={tarefas} 
                  onTarefaClick={handleView}
                />
                
                <Button
                  variant="outline"
                  onClick={() => setShowPreferencias(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1 md:gap-2 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3"
                  title="Preferências de Notificação"
                >
                  <Mail className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Notificações</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => { setSelectedTarefa(null); setIsFormOpen(true); }}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1 md:gap-2 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3"
                >
                  <Plus className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Nova</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="max-w-[1800px] mx-auto px-1 md:px-4">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-5 gap-1 md:gap-3 mb-2 md:mb-4">
            <Card className="border-l-2 md:border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-1.5 md:p-4">
                <p className="text-[8px] md:text-xs font-medium text-slate-600 mb-0.5">Total</p>
                <p className="text-xs md:text-xl font-bold text-slate-900">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-l-2 md:border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-1.5 md:p-4">
                <p className="text-[8px] md:text-xs font-medium text-slate-600 mb-0.5">Pendentes</p>
                <p className="text-xs md:text-xl font-bold text-yellow-600">{stats.pendentes}</p>
              </CardContent>
            </Card>
            <Card className="border-l-2 md:border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-1.5 md:p-4">
                <p className="text-[8px] md:text-xs font-medium text-slate-600 mb-0.5">Andamento</p>
                <p className="text-xs md:text-xl font-bold text-blue-600">{stats.emAndamento}</p>
              </CardContent>
            </Card>
            <Card className="border-l-2 md:border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-1.5 md:p-4">
                <p className="text-[8px] md:text-xs font-medium text-slate-600 mb-0.5">Vencidas</p>
                <p className="text-xs md:text-xl font-bold text-red-600">{stats.vencidas}</p>
              </CardContent>
            </Card>
            <Card className="border-l-2 md:border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-1.5 md:p-4">
                <p className="text-[8px] md:text-xs font-medium text-slate-600 mb-0.5">Concluídas</p>
                <p className="text-xs md:text-xl font-bold text-green-600">{stats.concluidas}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros e Toggle de Visualização */}
          <div className="bg-white rounded-lg shadow-sm p-2 md:p-4 mb-2 md:mb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <AdvancedSearchFilters
                entityName="tarefas"
                searchFields={searchFields}
                filterFields={filterFields}
                dateField="prazo"
                sortFields={sortFields}
                defaultSort={{ field: 'prazo', direction: 'asc' }}
                onFiltersChange={setAdvancedFilters}
              />
              
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className={`gap-2 ${viewMode === 'kanban' ? 'bg-slate-700 hover:bg-slate-800' : ''}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'lista' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('lista')}
                  className={`gap-2 ${viewMode === 'lista' ? 'bg-slate-700 hover:bg-slate-800' : ''}`}
                >
                  <ListTodo className="w-4 h-4" />
                  Lista
                </Button>
              </div>
            </div>
          </div>

          {/* Visualização */}
          {viewMode === 'kanban' ? (
            <TarefaKanban
              tarefas={tarefasFiltradas}
              onStatusChange={handleStatusChange}
              onTarefaClick={handleView}
            />
          ) : (
            <TarefaLista
              tarefas={tarefasFiltradas}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
            />
          )}
        </div>
      </div>

      {/* Modais */}
      <TarefaForm
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setSelectedTarefa(null); }}
        onSubmit={handleSubmit}
        tarefa={selectedTarefa}
        funcionarios={funcionarios}
        clientes={clientes}
        ordensServico={ordensServico}
        pecas={pecas}
      />

      <TarefaViewer
        open={isViewerOpen}
        onClose={() => { setIsViewerOpen(false); setSelectedTarefa(null); }}
        tarefa={selectedTarefa}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onChecklistToggle={handleChecklistToggle}
      />

      <PreferenciasNotificacaoModal
        open={showPreferencias}
        onClose={() => setShowPreferencias(false)}
      />
    </>
  );
}