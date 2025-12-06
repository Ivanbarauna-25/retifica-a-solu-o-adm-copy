import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, Clock, AlertTriangle, CheckCircle, RefreshCw, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function PreferenciasNotificacaoModal({ open, onClose }) {
  const [preferencias, setPreferencias] = useState({
    email_ativo: true,
    notificar_vencidas: true,
    notificar_proximas_vencer: true,
    notificar_novas_atribuidas: true,
    notificar_atualizacoes: false,
    notificar_concluidas: false,
    resumo_diario: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadPreferencias = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.notificacoes_tarefas) {
          setPreferencias(prev => ({ ...prev, ...user.notificacoes_tarefas }));
        }
      } catch (error) {
        console.error('Erro ao carregar preferências:', error);
      }
    };
    if (open) loadPreferencias();
  }, [open]);

  const handleToggle = (key) => {
    setPreferencias(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({ notificacoes_tarefas: preferencias });
      toast({ title: 'Preferências salvas', description: 'Suas configurações de notificação foram atualizadas.' });
      onClose();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const opcoes = [
    {
      key: 'email_ativo',
      icon: Mail,
      titulo: 'Receber emails de tarefas',
      descricao: 'Ativar/desativar todas as notificações por email',
      principal: true
    },
    {
      key: 'notificar_vencidas',
      icon: AlertTriangle,
      titulo: 'Tarefas vencidas',
      descricao: 'Receber alerta quando uma tarefa sua estiver vencida'
    },
    {
      key: 'notificar_proximas_vencer',
      icon: Clock,
      titulo: 'Próximas do vencimento',
      descricao: 'Receber lembrete de tarefas que vão vencer em breve'
    },
    {
      key: 'notificar_novas_atribuidas',
      icon: Bell,
      titulo: 'Novas tarefas atribuídas',
      descricao: 'Receber notificação quando uma tarefa for atribuída a você'
    },
    {
      key: 'notificar_atualizacoes',
      icon: RefreshCw,
      titulo: 'Atualizações de tarefas',
      descricao: 'Receber notificação quando suas tarefas forem atualizadas'
    },
    {
      key: 'notificar_concluidas',
      icon: CheckCircle,
      titulo: 'Tarefas concluídas',
      descricao: 'Receber confirmação quando uma tarefa for concluída'
    },
    {
      key: 'resumo_diario',
      icon: FileText,
      titulo: 'Resumo diário',
      descricao: 'Receber um resumo diário de todas as suas tarefas pendentes'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader className="bg-slate-800 -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Bell className="w-5 h-5" />
            Preferências de Notificação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {opcoes.map((opcao, index) => (
            <React.Fragment key={opcao.key}>
              {opcao.principal && index > 0 && <Separator />}
              <div className={`flex items-center justify-between ${!preferencias.email_ativo && !opcao.principal ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <opcao.icon className={`w-5 h-5 mt-0.5 ${opcao.principal ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <Label className={`font-medium ${opcao.principal ? 'text-base' : 'text-sm'}`}>
                      {opcao.titulo}
                    </Label>
                    <p className="text-xs text-slate-500 mt-0.5">{opcao.descricao}</p>
                  </div>
                </div>
                <Switch
                  checked={preferencias[opcao.key]}
                  onCheckedChange={() => handleToggle(opcao.key)}
                  disabled={!opcao.principal && !preferencias.email_ativo}
                />
              </div>
              {opcao.principal && <Separator />}
            </React.Fragment>
          ))}
        </div>

        <DialogFooter className="gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-slate-800 hover:bg-slate-900 text-white">
            {isSaving ? 'Salvando...' : 'Salvar Preferências'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}