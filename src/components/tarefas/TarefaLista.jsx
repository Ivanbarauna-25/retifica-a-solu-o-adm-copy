import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Eye, Edit, Trash2, MoreVertical, Calendar, User, Link2, CheckCircle, AlertTriangle } from 'lucide-react';
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
  os: 'OS',
  cliente: 'Cliente',
  estoque: 'Estoque',
  geral: 'Geral'
};

export default function TarefaLista({
  tarefas,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  selectedIds = [],
  onSelectChange
}) {
  const isVencida = (tarefa) => {
    return tarefa.prazo && new Date(tarefa.prazo) < new Date() && tarefa.status !== 'concluida';
  };

  const toggleConcluir = (tarefa) => {
    if (tarefa.status === 'concluida') {
      onStatusChange(tarefa.id, 'pendente');
    } else {
      onStatusChange(tarefa.id, 'concluida');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-700">
          <TableRow>
            <TableHead className="w-10 text-white">
              <Checkbox
                checked={selectedIds.length === tarefas.length && tarefas.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectChange(tarefas.map(t => t.id));
                  } else {
                    onSelectChange([]);
                  }
                }}
              />
            </TableHead>
            <TableHead className="text-white font-semibold">Tarefa</TableHead>
            <TableHead className="text-white font-semibold">Vínculo</TableHead>
            <TableHead className="text-white font-semibold">Responsável</TableHead>
            <TableHead className="text-white font-semibold">Prazo</TableHead>
            <TableHead className="text-white font-semibold">Prioridade</TableHead>
            <TableHead className="text-white font-semibold">Status</TableHead>
            <TableHead className="text-white font-semibold text-right w-20">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tarefas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                Nenhuma tarefa encontrada
              </TableCell>
            </TableRow>
          ) : (
            tarefas.map(tarefa => (
              <TableRow 
                key={tarefa.id} 
                className={`hover:bg-slate-50 ${isVencida(tarefa) ? 'bg-red-50' : ''}`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(tarefa.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onSelectChange([...selectedIds, tarefa.id]);
                      } else {
                        onSelectChange(selectedIds.filter(id => id !== tarefa.id));
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleConcluir(tarefa)}
                      className={`mt-0.5 ${tarefa.status === 'concluida' ? 'text-green-600' : 'text-slate-300 hover:text-green-500'}`}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <div>
                      <div className={`font-medium ${tarefa.status === 'concluida' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {tarefa.titulo}
                      </div>
                      {tarefa.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {tarefa.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {tarefa.tipo_vinculo !== 'geral' ? (
                    <div className="flex items-center gap-1">
                      <Link2 className="w-3 h-3 text-slate-400" />
                      <span className="text-sm">
                        <span className="text-slate-500">{vinculoLabels[tarefa.tipo_vinculo]}:</span>{' '}
                        {tarefa.vinculo_descricao || '-'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {tarefa.responsavel_nome ? (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="text-sm">{tarefa.responsavel_nome}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400">Não atribuído</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1 ${isVencida(tarefa) ? 'text-red-600 font-medium' : ''}`}>
                    {isVencida(tarefa) && <AlertTriangle className="w-4 h-4" />}
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{formatDate(tarefa.prazo)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={prioridadeConfig[tarefa.prioridade]?.color}>
                    {prioridadeConfig[tarefa.prioridade]?.icon} {prioridadeConfig[tarefa.prioridade]?.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={statusConfig[tarefa.status]?.color}>
                    {statusConfig[tarefa.status]?.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(tarefa)}>
                        <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(tarefa)}>
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(tarefa)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}