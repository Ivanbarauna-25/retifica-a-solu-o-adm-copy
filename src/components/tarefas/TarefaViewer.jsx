import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, User, Link2, AlertTriangle, CheckCircle2, 
  Edit, Trash2, Bell, Tag
} from 'lucide-react';
import { formatDate } from '@/components/formatters';

const statusConfig = {
  pendente: { label: 'Pendente', color: 'bg-slate-100 text-slate-700 border border-slate-200' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  aguardando: { label: 'Aguardando', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  concluida: { label: 'Concluída', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  cancelada: { label: 'Cancelada', color: 'bg-red-50 text-red-700 border border-red-200' }
};

const prioridadeConfig = {
  baixa: { label: 'Baixa', color: 'bg-green-50 text-green-700 border border-green-200', icon: '🟢' },
  media: { label: 'Média', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: '🟡' },
  alta: { label: 'Alta', color: 'bg-orange-50 text-orange-700 border border-orange-200', icon: '🟠' },
  urgente: { label: 'Urgente', color: 'bg-red-50 text-red-700 border border-red-200', icon: '🔴' }
};

const vinculoLabels = {
  os: 'Ordem de Serviço',
  cliente: 'Cliente',
  estoque: 'Item de Estoque',
  geral: 'Geral'
};

export default function TarefaViewer({ 
  open, 
  onClose, 
  tarefa, 
  onEdit, 
  onDelete,
  onChecklistToggle 
}) {
  if (!tarefa) return null;

  const isVencida = tarefa.prazo && new Date(tarefa.prazo) < new Date() && tarefa.status !== 'concluida';
  const checklistConcluidos = tarefa.checklist?.filter(c => c.concluido).length || 0;
  const checklistTotal = tarefa.checklist?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-0">
        <DialogHeader className="bg-slate-800 -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl text-white mb-2">{tarefa.titulo}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className={statusConfig[tarefa.status]?.color}>
                  {statusConfig[tarefa.status]?.label}
                </Badge>
                <Badge className={prioridadeConfig[tarefa.prioridade]?.color}>
                  {prioridadeConfig[tarefa.prioridade]?.icon} {prioridadeConfig[tarefa.prioridade]?.label}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => onEdit(tarefa)} className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="bg-transparent border-slate-600 text-white hover:bg-red-600 hover:text-white" onClick={() => onDelete(tarefa)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {/* Alerta de vencimento */}
          {isVencida && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Esta tarefa está vencida!</span>
            </div>
          )}

          {/* Descrição */}
          {tarefa.descricao && (
            <div>
              <h4 className="text-sm font-medium text-slate-500 mb-1">Descrição</h4>
              <p className="text-slate-700 whitespace-pre-wrap">{tarefa.descricao}</p>
            </div>
          )}

          <Separator />

          {/* Informações */}
          <div className="grid grid-cols-2 gap-4">
            {/* Prazo */}
            <div className="flex items-center gap-2">
              <Calendar className={`w-5 h-5 ${isVencida ? 'text-red-500' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs text-slate-500">Prazo</p>
                <p className={`font-medium ${isVencida ? 'text-red-600' : ''}`}>
                  {formatDate(tarefa.prazo)}
                  {tarefa.hora_prazo && ` às ${tarefa.hora_prazo}`}
                </p>
              </div>
            </div>

            {/* Responsável */}
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Responsável</p>
                <p className="font-medium">{tarefa.responsavel_nome || 'Não atribuído'}</p>
              </div>
            </div>

            {/* Vínculo */}
            {tarefa.tipo_vinculo !== 'geral' && (
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">{vinculoLabels[tarefa.tipo_vinculo]}</p>
                  <p className="font-medium">{tarefa.vinculo_descricao}</p>
                </div>
              </div>
            )}

            {/* Notificação */}
            <div className="flex items-center gap-2">
              <Bell className={`w-5 h-5 ${tarefa.notificar_prazo ? 'text-blue-500' : 'text-slate-300'}`} />
              <div>
                <p className="text-xs text-slate-500">Notificações</p>
                <p className="font-medium">{tarefa.notificar_prazo ? 'Ativadas' : 'Desativadas'}</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {tarefa.tags?.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-medium text-slate-500">Tags</h4>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {tarefa.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Checklist */}
          {checklistTotal > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-500" />
                    <h4 className="text-sm font-medium text-slate-600">Checklist</h4>
                  </div>
                  <span className="text-sm font-medium text-slate-600">{checklistConcluidos}/{checklistTotal}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${(checklistConcluidos / checklistTotal) * 100}%` }}
                  />
                </div>
                <div className="space-y-2">
                  {tarefa.checklist.map(item => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors border border-slate-100"
                      onClick={() => onChecklistToggle(tarefa.id, item.id)}
                    >
                      <Checkbox checked={item.concluido} />
                      <span className={`text-slate-700 ${item.concluido ? 'line-through text-slate-400' : ''}`}>
                        {item.texto}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Observações */}
          {tarefa.observacoes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">Observações</h4>
                <p className="text-slate-700 whitespace-pre-wrap">{tarefa.observacoes}</p>
              </div>
            </>
          )}

          {/* Metadados */}
          <Separator />
          <div className="flex justify-between text-xs text-slate-400 pb-2">
            <span>Criado em: {formatDate(tarefa.created_date?.split('T')[0])}</span>
            {tarefa.data_conclusao && (
              <span>Concluído em: {formatDate(tarefa.data_conclusao.split('T')[0])}</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}