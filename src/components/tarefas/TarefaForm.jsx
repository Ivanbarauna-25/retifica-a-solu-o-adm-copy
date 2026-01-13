import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Trash2 } from 'lucide-react';

export default function TarefaForm({
  open,
  onClose,
  onSubmit,
  tarefa,
  funcionarios = [],
  clientes = [],
  ordensServico = [],
  pecas = [],
  vinculoInicial = null
}) {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo_vinculo: 'geral',
    vinculo_id: '',
    vinculo_descricao: '',
    responsavel_id: '',
    responsavel_nome: '',
    prazo: '',
    hora_prazo: '',
    prioridade: 'media',
    status: 'pendente',
    notificar_prazo: true,
    tags: [],
    checklist: [],
    observacoes: ''
  });

  const [novaTag, setNovaTag] = useState('');
  const [novoCheckItem, setNovoCheckItem] = useState('');

  useEffect(() => {
    if (tarefa) {
      setFormData({
        ...tarefa,
        tags: tarefa.tags || [],
        checklist: tarefa.checklist || []
      });
    } else if (vinculoInicial) {
      setFormData(prev => ({
        ...prev,
        tipo_vinculo: vinculoInicial.tipo,
        vinculo_id: vinculoInicial.id,
        vinculo_descricao: vinculoInicial.descricao
      }));
    } else {
      setFormData({
        titulo: '',
        descricao: '',
        tipo_vinculo: 'geral',
        vinculo_id: '',
        vinculo_descricao: '',
        responsavel_id: '',
        responsavel_nome: '',
        prazo: '',
        hora_prazo: '',
        prioridade: 'media',
        status: 'pendente',
        notificar_prazo: true,
        tags: [],
        checklist: [],
        observacoes: ''
      });
    }
  }, [tarefa, vinculoInicial, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResponsavelChange = (id) => {
    const func = funcionarios.find(f => f.id === id);
    setFormData(prev => ({
      ...prev,
      responsavel_id: id,
      responsavel_nome: func?.nome || ''
    }));
  };

  const handleVinculoChange = (tipo) => {
    setFormData(prev => ({
      ...prev,
      tipo_vinculo: tipo,
      vinculo_id: '',
      vinculo_descricao: ''
    }));
  };

  const handleVinculoIdChange = (id) => {
    let descricao = '';
    if (formData.tipo_vinculo === 'os') {
      const os = ordensServico.find(o => o.id === id);
      descricao = os ? `OS #${os.numero_os}` : '';
    } else if (formData.tipo_vinculo === 'cliente') {
      const cli = clientes.find(c => c.id === id);
      descricao = cli?.nome || '';
    } else if (formData.tipo_vinculo === 'estoque') {
      const peca = pecas.find(p => p.id === id);
      descricao = peca ? `${peca.codigo} - ${peca.descricao}` : '';
    }
    setFormData(prev => ({
      ...prev,
      vinculo_id: id,
      vinculo_descricao: descricao
    }));
  };

  const addTag = () => {
    if (novaTag.trim() && !formData.tags.includes(novaTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, novaTag.trim()]
      }));
      setNovaTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const addCheckItem = () => {
    if (novoCheckItem.trim()) {
      setFormData(prev => ({
        ...prev,
        checklist: [...prev.checklist, {
          id: Date.now().toString(),
          texto: novoCheckItem.trim(),
          concluido: false
        }]
      }));
      setNovoCheckItem('');
    }
  };

  const toggleCheckItem = (id) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.id === id ? { ...item, concluido: !item.concluido } : item
      )
    }));
  };

  const removeCheckItem = (id) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter(item => item.id !== id)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getVinculoOptions = () => {
    switch (formData.tipo_vinculo) {
      case 'os':
        return ordensServico.map(os => ({
          value: os.id,
          label: `OS #${os.numero_os} - ${os.status}`
        }));
      case 'cliente':
        return clientes.map(cli => ({
          value: cli.id,
          label: cli.nome
        }));
      case 'estoque':
        return pecas.map(p => ({
          value: p.id,
          label: `${p.codigo} - ${p.descricao}`
        }));
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-white">
        <DialogHeader className="bg-slate-800 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10">
          <DialogTitle className="text-white text-sm md:text-lg font-semibold">{tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 p-4 md:p-6">
          {/* Título */}
          <div>
            <Label className="text-xs md:text-sm font-medium">Título *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => handleChange('titulo', e.target.value)}
              placeholder="Digite o título da tarefa"
              required
              className="mt-1 h-9 md:h-10 text-sm"
            />
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-xs md:text-sm font-medium">Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
              placeholder="Descreva a tarefa..."
              rows={2}
              className="mt-1 text-sm"
            />
          </div>

          {/* Vínculo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <Label className="text-xs md:text-sm font-medium">Vincular a</Label>
              <Select value={formData.tipo_vinculo} onValueChange={handleVinculoChange}>
                <SelectTrigger className="mt-1 h-9 md:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="os">OS</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="estoque">Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.tipo_vinculo !== 'geral' && (
              <div>
                <Label className="text-xs md:text-sm font-medium">Selecione</Label>
                <Select value={formData.vinculo_id} onValueChange={handleVinculoIdChange}>
                  <SelectTrigger className="mt-1 h-9 md:h-10 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getVinculoOptions().map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Responsável e Prioridade */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <Label className="text-xs md:text-sm font-medium">Responsável</Label>
              <Select value={formData.responsavel_id} onValueChange={handleResponsavelChange}>
                <SelectTrigger className="mt-1 h-9 md:h-10 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.filter(f => f.status === 'ativo').map(func => (
                    <SelectItem key={func.id} value={func.id}>{func.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs md:text-sm font-medium">Prioridade *</Label>
              <Select value={formData.prioridade} onValueChange={(v) => handleChange('prioridade', v)}>
                <SelectTrigger className="mt-1 h-9 md:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="alta">🟠 Alta</SelectItem>
                  <SelectItem value="urgente">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prazo e Status */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div>
              <Label className="text-xs md:text-sm font-medium">Prazo *</Label>
              <Input
                type="date"
                value={formData.prazo}
                onChange={(e) => handleChange('prazo', e.target.value)}
                required
                className="mt-1 h-9 md:h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm font-medium">Hora</Label>
              <Input
                type="time"
                value={formData.hora_prazo}
                onChange={(e) => handleChange('hora_prazo', e.target.value)}
                className="mt-1 h-9 md:h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm font-medium">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="mt-1 h-9 md:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Andamento</SelectItem>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notificação */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.notificar_prazo}
              onCheckedChange={(v) => handleChange('notificar_prazo', v)}
            />
            <Label className="cursor-pointer text-xs md:text-sm">Notificar prazo</Label>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs md:text-sm font-medium">Tags</Label>
            <div className="flex gap-1.5 mb-2 flex-wrap mt-1">
              {formData.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                  {tag}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={novaTag}
                onChange={(e) => setNovaTag(e.target.value)}
                placeholder="Nova tag..."
                className="h-9 md:h-10 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag} className="h-9 md:h-10 w-9 md:w-10 p-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <Label className="text-xs md:text-sm font-medium">Checklist</Label>
            <div className="space-y-1.5 mb-2 mt-1 max-h-32 overflow-y-auto">
              {formData.checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 p-2 md:p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <Checkbox
                    checked={item.concluido}
                    onCheckedChange={() => toggleCheckItem(item.id)}
                  />
                  <span className={`text-xs md:text-sm text-slate-700 flex-1 ${item.concluido ? 'line-through text-slate-400' : ''}`}>
                    {item.texto}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:bg-red-50"
                    onClick={() => removeCheckItem(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={novoCheckItem}
                onChange={(e) => setNovoCheckItem(e.target.value)}
                placeholder="Novo item..."
                className="bg-white h-9 md:h-10 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCheckItem())}
              />
              <Button type="button" variant="outline" onClick={addCheckItem} className="h-9 md:h-10 w-9 md:w-10 p-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label className="text-xs md:text-sm font-medium">Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Observações adicionais..."
              rows={2}
              className="mt-1 text-sm"
            />
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 sm:justify-end sm:space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto h-9 md:h-10 text-xs md:text-sm">
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto h-9 md:h-10 text-xs md:text-sm bg-slate-800 hover:bg-slate-700">
              {tarefa ? 'Salvar' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}