import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, ListTodo, Send, History, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import FuncionarioCombobox from '@/components/inputs/FuncionarioCombobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export default function TarefaForm({ tarefa, onSave, onClose }) {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    responsavel: '',
    prazo: '',
    prioridade: 'media',
    status: 'pendente',
  });

  const [funcionarios, setFuncionarios] = useState([]);
  const [anotacoes, setAnotacoes] = useState([]);
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [activeTab, setActiveTab] = useState('detalhes');

  useEffect(() => {
    const fetchFuncionarios = async () => {
      try {
        const data = await base44.entities.Funcionario.list();
        setFuncionarios(data || []);
      } catch (error) {
        console.error("Erro ao buscar funcionários:", error);
      }
    };
    fetchFuncionarios();
  }, []);

  const fetchAnotacoes = async () => {
    if (!tarefa?.id) return;
    try {
      const data = await base44.entities.TarefaAnotacao.filter({ tarefa_id: tarefa.id }, '-created_date');
      setAnotacoes(data || []);
    } catch (error) {
      console.error("Erro ao buscar anotações:", error);
    }
  };

  useEffect(() => {
    if (tarefa) {
      setFormData({
        titulo: tarefa.titulo || '',
        descricao: tarefa.descricao || '',
        responsavel: tarefa.responsavel || '',
        prazo: tarefa.prazo || '',
        prioridade: tarefa.prioridade || 'media',
        status: tarefa.status || 'pendente',
      });
      fetchAnotacoes();
    }
  }, [tarefa]);

  const handleAddAnotacao = async () => {
    if (!novaAnotacao.trim() || !tarefa?.id) return;
    
    try {
      await base44.entities.TarefaAnotacao.create({
        tarefa_id: tarefa.id,
        texto: novaAnotacao,
        tipo: 'anotacao'
      });
      setNovaAnotacao('');
      fetchAnotacoes();
    } catch (error) {
      console.error("Erro ao criar anotação:", error);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-white border-2 border-slate-800 shadow-2xl modern-modal sm:max-w-[600px] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 bg-slate-800 text-white border-b border-slate-700">
          <DialogTitle className="flex items-center gap-3 text-white text-xl font-bold">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <ListTodo className="w-5 h-5 text-white" />
            </div>
            {tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200">
            <TabsList className="grid w-full grid-cols-2 bg-slate-200/50 p-1">
              <TabsTrigger value="detalhes" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500 gap-2">
                <FileText className="w-4 h-4" /> Detalhes
              </TabsTrigger>
              <TabsTrigger value="historico" disabled={!tarefa} className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500 gap-2">
                <History className="w-4 h-4" /> Histórico & Anotações
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="detalhes" className="mt-0">
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo" className="text-slate-700 font-semibold">Título da Tarefa</Label>
                  <Input 
                    id="titulo" 
                    value={formData.titulo} 
                    onChange={handleChange} 
                    required 
                    className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500 text-slate-900"
                    placeholder="Ex: Realizar backup mensal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao" className="text-slate-700 font-semibold">Descrição</Label>
                  <Textarea 
                    id="descricao" 
                    value={formData.descricao} 
                    onChange={handleChange} 
                    rows={3}
                    className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500 text-slate-900 resize-none" 
                    placeholder="Detalhes sobre a tarefa..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="responsavel" className="text-slate-700 font-semibold">Responsável</Label>
                    <FuncionarioCombobox
                      value={funcionarios.find(f => f.nome === formData.responsavel)?.id || ''}
                      onChange={(id) => {
                        const funcionario = funcionarios.find(f => String(f.id) === String(id));
                        if (funcionario) {
                          setFormData(prev => ({ ...prev, responsavel: funcionario.nome }));
                        } else {
                           setFormData(prev => ({ ...prev, responsavel: '' }));
                        }
                      }}
                      options={funcionarios}
                      placeholder="Selecione o responsável..."
                      emptyText="Nenhum funcionário encontrado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prazo" className="text-slate-700 font-semibold">Prazo</Label>
                    <Input 
                      id="prazo" 
                      type="date" 
                      value={formData.prazo} 
                      onChange={handleChange} 
                      required 
                      className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500 text-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">Prioridade</Label>
                    <Select value={formData.prioridade} onValueChange={(value) => handleSelectChange('prioridade', value)}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluida">Concluída</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-slate-50 px-6 py-4 border-t border-slate-100 gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">
                  <Check className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="historico" className="mt-0">
            <div className="p-6 h-[450px] flex flex-col">
              <ScrollArea className="flex-1 pr-4 -mr-4 mb-4">
                <div className="space-y-4">
                  {anotacoes.length === 0 ? (
                    <div className="text-center text-slate-400 py-8 flex flex-col items-center">
                      <History className="w-12 h-12 mb-2 opacity-20" />
                      <p>Nenhuma anotação encontrada.</p>
                      <p className="text-sm">Adicione comentários ou atualizações sobre esta tarefa.</p>
                    </div>
                  ) : (
                    anotacoes.map((nota) => (
                      <div key={nota.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-semibold text-slate-600">{nota.created_by}</span>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(nota.created_date), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{nota.texto}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                <Textarea
                  value={novaAnotacao}
                  onChange={(e) => setNovaAnotacao(e.target.value)}
                  placeholder="Digite uma anotação..."
                  className="min-h-[80px] bg-white resize-none"
                />
                <Button 
                  onClick={handleAddAnotacao}
                  disabled={!novaAnotacao.trim()}
                  className="h-auto bg-slate-800 hover:bg-slate-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}