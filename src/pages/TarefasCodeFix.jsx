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
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Minimalista Dark */}
        <div className="bg-slate-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Tarefas CodeFix</h1>
              <p className="text-slate-300 text-sm mt-1">
                Gestão de tarefas de correção e melhorias
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={carregarTarefas}
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button
                onClick={handleNovaTarefa}
                className="bg-white text-slate-800 hover:bg-slate-100"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Dark */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total</p>
                  <p className="text-3xl font-semibold text-white">{stats.total}</p>
                </div>
                <ClipboardList className="h-10 w-10 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Abertas</p>
                  <p className="text-3xl font-semibold text-yellow-400">{stats.abertas}</p>
                </div>
                <AlertCircle className="h-10 w-10 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Em Progresso</p>
                  <p className="text-3xl font-semibold text-blue-400">{stats.em_progresso}</p>
                </div>
                <Clock className="h-10 w-10 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Concluídas</p>
                  <p className="text-3xl font-semibold text-green-400">{stats.concluidas}</p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros Dark */}
        <Card className="bg-slate-800 border-slate-700 shadow-md">
          <CardHeader className="bg-slate-900 border-b border-slate-700">
            <CardTitle className="text-base font-medium flex items-center gap-2 text-white">
              <Filter className="h-4 w-4 text-slate-400" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar tarefas..."
                    value={filtros.busca}
                    onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Status</label>
                <Select
                  value={filtros.status}
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
                <label className="text-sm font-medium text-slate-300 mb-2 block">Prioridade</label>
                <Select
                  value={filtros.priority}
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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

        {/* Lista de Tarefas Dark */}
        <Card className="bg-slate-800 border-slate-700 shadow-md">
          <CardHeader className="bg-slate-900 border-b border-slate-700">
            <CardTitle className="text-base font-medium text-white">
              {tarefasFiltradas.length} tarefa(s) encontrada(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : tarefasFiltradas.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-slate-500" />
                <p>Nenhuma tarefa encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tarefasFiltradas.map((tarefa) => (
                  <div
                    key={tarefa.id}
                    className="bg-slate-700 border border-slate-600 rounded-lg p-4 hover:border-slate-500 hover:bg-slate-600/50 transition-all"
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
                          <span className="text-xs text-slate-400">
                            {new Date(tarefa.updated_date || tarefa.created_date).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm mb-1 text-white">{tarefa.title}</h3>
                        {tarefa.description && (
                          <p className="text-sm text-slate-300 line-clamp-2">
                            {tarefa.description}
                          </p>
                        )}
                        {tarefa.assignee && (
                          <p className="text-xs text-slate-400 mt-2">
                            Responsável: {tarefa.assignee}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditarTarefa(tarefa)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeletar(tarefa)}
                          className="bg-red-900/50 hover:bg-red-900 border-red-700"
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
          <DialogContent className="max-w-2xl bg-slate-900 text-white border-slate-700">
            <DialogHeader className="border-b border-slate-700 pb-4">
              <DialogTitle className="text-lg text-white">
                {tarefaSelecionada ? 'Editar Tarefa' : 'Nova Tarefa'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Título *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Corrigir erro de autenticação"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Descrição</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva a tarefa em detalhes..."
                  rows={4}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Prioridade</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Categoria</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Responsável</label>
                  <Input
                    value={formData.assignee}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                    placeholder="Email do responsável"
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-700 pt-4 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setModalTarefa(false)} 
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSalvar} 
                className="bg-slate-700 hover:bg-slate-600"
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}