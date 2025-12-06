import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, AlertTriangle, CheckCircle2, Link2 } from 'lucide-react';
import { formatDate } from '@/components/formatters';

const statusConfig = {
  pendente: { label: 'Pendente', color: 'bg-slate-50', headerColor: 'bg-slate-700' },
  em_andamento: { label: 'Em Andamento', color: 'bg-slate-50', headerColor: 'bg-blue-700' },
  aguardando: { label: 'Aguardando', color: 'bg-slate-50', headerColor: 'bg-amber-600' },
  concluida: { label: 'Concluída', color: 'bg-slate-50', headerColor: 'bg-emerald-600' },
  cancelada: { label: 'Cancelada', color: 'bg-slate-50', headerColor: 'bg-red-600' }
};

const prioridadeConfig = {
  baixa: { label: 'Baixa', color: 'bg-green-50 text-green-700 border border-green-200', icon: '🟢' },
  media: { label: 'Média', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: '🟡' },
  alta: { label: 'Alta', color: 'bg-orange-50 text-orange-700 border border-orange-200', icon: '🟠' },
  urgente: { label: 'Urgente', color: 'bg-red-50 text-red-700 border border-red-200', icon: '🔴' }
};

const vinculoConfig = {
  os: { label: 'OS', color: 'bg-purple-50 text-purple-700 border border-purple-200' },
  cliente: { label: 'Cliente', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  estoque: { label: 'Estoque', color: 'bg-teal-50 text-teal-700 border border-teal-200' },
  geral: { label: 'Geral', color: 'bg-slate-50 text-slate-700 border border-slate-200' }
};

function TarefaCard({ tarefa, onClick }) {
  const isVencida = tarefa.prazo && new Date(tarefa.prazo) < new Date() && tarefa.status !== 'concluida';
  const isHoje = tarefa.prazo === new Date().toISOString().split('T')[0];
  const checklistProgress = tarefa.checklist?.length 
    ? `${tarefa.checklist.filter(c => c.concluido).length}/${tarefa.checklist.length}`
    : null;

  return (
    <Card 
      className={`p-3 cursor-pointer hover:shadow-lg transition-all duration-200 bg-white border shadow-sm ${
        isVencida ? 'border-l-4 border-l-red-500' : 
        tarefa.prioridade === 'urgente' ? 'border-l-4 border-l-red-500' :
        tarefa.prioridade === 'alta' ? 'border-l-4 border-l-orange-500' :
        tarefa.prioridade === 'media' ? 'border-l-4 border-l-yellow-500' :
        'border-l-4 border-l-green-500'
      }`}
      onClick={() => onClick(tarefa)}
    >
      {/* Título e Prioridade */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm text-slate-900 line-clamp-2">{tarefa.titulo}</h4>
        <span className="text-xs">{prioridadeConfig[tarefa.prioridade]?.icon}</span>
      </div>

      {/* Vínculo */}
      {tarefa.tipo_vinculo && tarefa.tipo_vinculo !== 'geral' && (
        <div className="flex items-center gap-1 mb-2">
          <Link2 className="w-3 h-3 text-slate-400" />
          <Badge variant="outline" className={`text-xs ${vinculoConfig[tarefa.tipo_vinculo]?.color}`}>
            {tarefa.vinculo_descricao || vinculoConfig[tarefa.tipo_vinculo]?.label}
          </Badge>
        </div>
      )}

      {/* Tags */}
      {tarefa.tags?.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {tarefa.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs py-0">
              {tag}
            </Badge>
          ))}
          {tarefa.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs py-0">
              +{tarefa.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Checklist Progress */}
      {checklistProgress && (
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
          <CheckCircle2 className="w-3 h-3" />
          <span>{checklistProgress}</span>
        </div>
      )}

      {/* Footer: Prazo e Responsável */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t">
        <div className={`flex items-center gap-1 text-xs ${isVencida ? 'text-red-600 font-medium' : isHoje ? 'text-amber-600' : 'text-slate-500'}`}>
          {isVencida && <AlertTriangle className="w-3 h-3" />}
          <Calendar className="w-3 h-3" />
          <span>{formatDate(tarefa.prazo)}</span>
          {tarefa.hora_prazo && (
            <>
              <Clock className="w-3 h-3 ml-1" />
              <span>{tarefa.hora_prazo}</span>
            </>
          )}
        </div>
        
        {tarefa.responsavel_nome && (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-slate-200">
              {tarefa.responsavel_nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </Card>
  );
}

export default function TarefaKanban({ tarefas, onStatusChange, onTarefaClick }) {
  const columns = ['pendente', 'em_andamento', 'aguardando', 'concluida'];

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const novoStatus = destination.droppableId;
    
    onStatusChange(draggableId, novoStatus);
  };

  const getTarefasByStatus = (status) => {
    return tarefas.filter(t => t.status === status);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(status => (
          <div key={status} className={`rounded-lg overflow-hidden shadow-sm ${statusConfig[status].color}`}>
            {/* Header */}
            <div className={`${statusConfig[status].headerColor} text-white px-4 py-3 flex items-center justify-between`}>
              <span className="font-semibold">{statusConfig[status].label}</span>
              <Badge variant="secondary" className="bg-white/20 text-white border-none font-bold">
                {getTarefasByStatus(status).length}
              </Badge>
            </div>

            {/* Cards */}
            <Droppable droppableId={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-3 min-h-[250px] space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-slate-100' : ''}`}
                >
                  {getTarefasByStatus(status).map((tarefa, index) => (
                    <Draggable key={tarefa.id} draggableId={tarefa.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? 'opacity-90 rotate-1' : ''}
                        >
                          <TarefaCard tarefa={tarefa} onClick={onTarefaClick} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}