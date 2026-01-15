import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function TarefasCodeFix() {
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    status: 'all',
    priority: 'all',
    busca: ''
  });
  const [modalTarefa, setModalTarefa] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'aberta',
    priority: 'media',
    category: 'erro_codigo',
    assignee: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    carregarTarefas();
  }, []);

  const carregarTarefas = async () => {
    setLoading(true);
    try {
      const dados = await base44.entities.CodeFixTask.list('-updated_date', 200);
      setTarefas(dados || []);
    } catch (error) {
      console.error('Erro ao carregar:', error);
      toast({
        title: 'Erro ao carregar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const tarefasFiltradas = tarefas.filter(tarefa => {
    const matchStatus = filtros.status === 'all' || tarefa.status === filtros.status;
    const matchPriority = filtros.priority === 'all' || tarefa.priority === filtros.priority;
    const matchBusca = !filtros.busca ||
      tarefa.title?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      tarefa.description?.toLowerCase().includes(filtros.busca.toLowerCase());
    
    return matchStatus && matchPriority && matchBusca;
  });

  const handleNovaTarefa = () => {
    setTarefaSelecionada(null);
    setFormData({
      title: '',
      description: '',
      status: 'aberta',
      priority: 'media',
      category: 'erro_codigo',
      assignee: ''
    });
    setModalTarefa(true);
  };

  const handleEditarTarefa = (tarefa) => {
    setTarefaSelecionada(tarefa);
    setFormData({
      title: tarefa.title || '',
      description: tarefa.description || '',
      status: tarefa.status || 'aberta',
      priority: tarefa.priority || 'media',
      category: tarefa.category || 'erro_codigo',
      assignee: tarefa.assignee || ''
    });
    setModalTarefa(true);
  };

  const handleSalvar = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Título é obrigatório',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (tarefaSelecionada) {
        await base44.entities.CodeFixTask.update(tarefaSelecionada.id, formData);
        toast({
          title: 'Tarefa atualizada',
          description: 'As alterações foram salvas'
        });
      } else {
        await base44.entities.CodeFixTask.create(formData);
        toast({
          title: 'Tarefa criada',
          description: 'Nova tarefa adicionada com sucesso'
        });
      }

      setModalTarefa(false);
      await carregarTarefas();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeletar = async (tarefa) => {
    if (!confirm('Tem certeza que deseja deletar esta tarefa?')) return;

    try {
      await base44.entities.CodeFixTask.delete(tarefa.id);
      toast({
        title: 'Tarefa deletada',
        description: 'A tarefa foi removida'
      });
      await carregarTarefas();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast({
        title: 'Erro ao deletar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleAlterarStatus = async (tarefa, novoStatus) => {
    try {
      await base44.entities.CodeFixTask.update(tarefa.id, {
        status: novoStatus
      });
      toast({
        title: 'Status atualizado',
        description: `Tarefa marcada como ${novoStatus}`
      });
      await carregarTarefas();
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      baixa: 'bg-slate-700 text-slate-300 border-slate-600',
      media: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
      alta: 'bg-orange-900/50 text-orange-300 border-orange-700',
      urgente: 'bg-red-900/50 text-red-300 border-red-700'
    };
    return colors[priority] || 'bg-slate-700 text-slate-300 border-slate-600';
  };

  const getStatusColor = (status) => {
    const colors = {
      aberta: 'bg-slate-700 text-slate-300 border-slate-600',
      em_progresso: 'bg-blue-900/50 text-blue-300 border-blue-700',
      concluida: 'bg-green-900/50 text-green-300 border-green-700',
      cancelada: 'bg-slate-700 text-slate-400 border-slate-600'
    };
    return colors[status] || 'bg-slate-700 text-slate-300 border-slate-600';
  };

  const stats = {
    total: tarefas.length,
    abertas: tarefas.filter(t => t.status === 'aberta').length,
    em_progresso: tarefas.filter(t => t.status === 'em_progresso').length,
    concluidas: tarefas.filter(t => t.status === 'concluida').length
  };

  return (
    <>
      <Toaster />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tarefas CodeFix</h1>
            <p className="text-slate-600 mt-1">Gestão de tarefas de correção e melhorias</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={carregarTarefas} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleNovaTarefa}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Abertas</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.abertas}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Em Progresso</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.em_progresso}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Concluídas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.concluidas}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar tarefas..."
                    value={filtros.busca}
                    onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
                <Select
                  value={filtros.status}
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="em_progresso">Em Progresso</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Prioridade</label>
                <Select
                  value={filtros.priority}
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Tarefas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {tarefasFiltradas.length} tarefa(s) encontrada(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : tarefasFiltradas.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhuma tarefa encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tarefasFiltradas.map((tarefa) => (
                  <div
                    key={tarefa.id}
                    className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={getPriorityColor(tarefa.priority)} variant="outline">
                            {tarefa.priority}
                          </Badge>
                          <Badge className={getStatusColor(tarefa.status)} variant="outline">
                            {tarefa.status}
                          </Badge>
                          {tarefa.category && (
                            <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600">
                              {tarefa.category}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">
                            {new Date(tarefa.updated_date || tarefa.created_date).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <h3 className="font-semibold text-base mb-1 text-slate-900">{tarefa.title}</h3>
                        {tarefa.description && (
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {tarefa.description}
                          </p>
                        )}
                        {tarefa.assignee && (
                          <p className="text-xs text-slate-500 mt-2">
                            Responsável: {tarefa.assignee}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {tarefa.status !== 'concluida' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAlterarStatus(tarefa, 'concluida')}
                            className="text-green-600 hover:bg-green-50"
                            title="Marcar como concluída"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditarTarefa(tarefa)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletar(tarefa)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Tarefa */}
      {modalTarefa && (
        <Dialog open={modalTarefa} onOpenChange={setModalTarefa}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {tarefaSelecionada ? 'Editar Tarefa' : 'Nova Tarefa'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Título *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Corrigir erro de autenticação"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Descrição</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva a tarefa em detalhes..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="em_progresso">Em Progresso</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Prioridade</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Categoria</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="erro_codigo">Erro de Código</SelectItem>
                      <SelectItem value="problema_ui">Problema de UI</SelectItem>
                      <SelectItem value="problema_impressao">Problema de Impressão</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="melhoria_ux">Melhoria UX</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Responsável</label>
                  <Input
                    value={formData.assignee}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                    placeholder="Email do responsável"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalTarefa(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvar}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}