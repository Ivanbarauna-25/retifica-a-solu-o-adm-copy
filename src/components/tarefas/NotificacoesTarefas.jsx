import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Bell, AlertTriangle, Clock } from 'lucide-react';
import { formatDate } from '@/components/formatters';

export default function NotificacoesTarefas({ tarefas = [], onTarefaClick, onDismiss }) {
  const hoje = new Date().toISOString().split('T')[0];
  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const notificacoes = useMemo(() => {
    const items = [];

    tarefas.forEach(tarefa => {
      if (tarefa.status === 'concluida' || tarefa.status === 'cancelada') return;

      const prazo = tarefa.prazo;
      
      // Vencidas
      if (prazo < hoje) {
        items.push({
          id: tarefa.id,
          tipo: 'vencida',
          tarefa,
          mensagem: `Tarefa "${tarefa.titulo}" está vencida desde ${formatDate(prazo)}`,
          prioridade: 1
        });
      }
      // Vence hoje
      else if (prazo === hoje) {
        items.push({
          id: tarefa.id,
          tipo: 'hoje',
          tarefa,
          mensagem: `Tarefa "${tarefa.titulo}" vence HOJE`,
          prioridade: 2
        });
      }
      // Vence amanhã
      else if (prazo === amanha) {
        items.push({
          id: tarefa.id,
          tipo: 'amanha',
          tarefa,
          mensagem: `Tarefa "${tarefa.titulo}" vence amanhã`,
          prioridade: 3
        });
      }
      // Urgentes nos próximos 7 dias
      else if (tarefa.prioridade === 'urgente') {
        const diasAteVencer = Math.ceil((new Date(prazo) - new Date()) / 86400000);
        if (diasAteVencer <= 7) {
          items.push({
            id: tarefa.id,
            tipo: 'urgente',
            tarefa,
            mensagem: `Tarefa URGENTE "${tarefa.titulo}" vence em ${diasAteVencer} dias`,
            prioridade: 4
          });
        }
      }
    });

    return items.sort((a, b) => a.prioridade - b.prioridade);
  }, [tarefas, hoje, amanha]);

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'vencida': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'hoje': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'amanha': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'urgente': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getBgColor = (tipo) => {
    switch (tipo) {
      case 'vencida': return 'bg-slate-50 border-l-4 border-l-red-500';
      case 'hoje': return 'bg-slate-50 border-l-4 border-l-amber-500';
      case 'amanha': return 'bg-slate-50 border-l-4 border-l-blue-500';
      case 'urgente': return 'bg-slate-50 border-l-4 border-l-orange-500';
      default: return 'bg-slate-50 border-l-4 border-l-slate-400';
    }
  };

  if (notificacoes.length === 0) {
    return (
      <Button variant="ghost" size="icon" className="relative" disabled>
        <Bell className="w-5 h-5 text-slate-400" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
          >
            {notificacoes.length}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="px-3 py-2 border-b">
          <h4 className="font-semibold text-sm">Notificações de Tarefas</h4>
          <p className="text-xs text-slate-500">{notificacoes.length} pendentes</p>
        </div>
        
        <div className="py-1">
          {notificacoes.map((notif, index) => (
            <div
              key={`${notif.id}-${index}`}
              className={`px-3 py-2 cursor-pointer hover:bg-slate-100 border-b last:border-b-0 ${getBgColor(notif.tipo)}`}
              onClick={() => onTarefaClick(notif.tarefa)}
            >
              <div className="flex items-start gap-2">
              {getIcon(notif.tipo)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 line-clamp-2">{notif.mensagem}</p>
                {notif.tarefa.responsavel_nome && (
                  <p className="text-xs text-slate-500 mt-1">
                    Responsável: {notif.tarefa.responsavel_nome}
                  </p>
                )}
              </div>
              </div>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}