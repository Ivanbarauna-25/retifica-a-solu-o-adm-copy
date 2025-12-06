import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

export default function FuncionarioDesligamentoForm({ isOpen, onClose, funcionario, onSuccess }) {
  const [formData, setFormData] = useState({
    motivo: '',
    data_aviso: '',
    data_desligamento: '',
    observacoes: '',
    aprovador_id: ''
  });
  const [aprovadores, setAprovadores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        motivo: '',
        data_aviso: '',
        data_desligamento: '',
        observacoes: '',
        aprovador_id: ''
      });
      fetchAprovadores();
    }
  }, [isOpen]);

  const fetchAprovadores = async () => {
    try {
      const users = await base44.entities.User.list();
      const aprovadoresValidos = users.filter(u => 
        u.role === 'admin' || 
        u.funcao?.toLowerCase().includes('rh') ||
        u.funcao?.toLowerCase().includes('diretor')
      );
      setAprovadores(aprovadoresValidos || []);
    } catch (error) {
      console.error('Erro ao carregar aprovadores:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!funcionario) {
      toast({
        title: 'Erro',
        description: 'Funcionário não encontrado',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.aprovador_id) {
      toast({
        title: 'Erro',
        description: 'Selecione quem deve aprovar esta solicitação',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const user = await base44.auth.me();
      const aprovador = aprovadores.find(a => a.id === formData.aprovador_id);

      await base44.entities.FuncionarioDesligamento.create({
        funcionario_id: funcionario.id,
        motivo: formData.motivo,
        data_aviso: formData.data_aviso,
        data_desligamento: formData.data_desligamento,
        observacoes: formData.observacoes,
        status: 'aguardando_aprovacao',
        solicitante_id: user.id,
        aprovador_id: formData.aprovador_id
      });

      try {
        await base44.integrations.Core.SendEmail({
          to: aprovador.email,
          subject: `🚨 URGENTE: Solicitação de Desligamento - ${funcionario.nome}`,
          body: `
            <h2 style="color: #dc2626;">⚠️ Nova Solicitação de Desligamento</h2>
            <p><strong>Funcionário:</strong> ${funcionario.nome}</p>
            <p><strong>CPF:</strong> ${funcionario.cpf}</p>
            <p><strong>Cargo:</strong> ${funcionario.cargo_id || 'N/A'}</p>
            <p><strong>Data do Aviso Prévio:</strong> ${formData.data_aviso}</p>
            <p><strong>Data do Desligamento:</strong> ${formData.data_desligamento}</p>
            <p><strong>Motivo:</strong> ${formData.motivo}</p>
            ${formData.observacoes ? `<p><strong>Observações:</strong> ${formData.observacoes}</p>` : ''}
            <p><strong>Solicitado por:</strong> ${user.full_name || user.email}</p>
            <hr>
            <p style="color: #dc2626; font-weight: bold;">Esta solicitação requer aprovação URGENTE.</p>
            <p>Acesse o sistema em <strong>Gestão de RH</strong> para aprovar ou reprovar esta solicitação.</p>
          `
        });
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }

      toast({
        title: 'Solicitação enviada!',
        description: `Solicitação crítica enviada para ${aprovador.full_name || aprovador.email}`
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao solicitar desligamento:', error);
      toast({
        title: 'Erro ao solicitar desligamento',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .desligamento-form-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .desligamento-form-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .desligamento-form-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .desligamento-form-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .desligamento-form-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .desligamento-form-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .desligamento-form-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .desligamento-form-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .desligamento-form-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .desligamento-form-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-2xl h-[95vh] md:max-h-[90vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-4 md:px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-white text-base md:text-lg">
              <AlertTriangle className="w-5 h-5" />
              Solicitar Desligamento - {funcionario?.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="desligamento-form-scroll flex-1 px-4 md:px-6 pb-4 md:pb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 mb-4 mt-4">
              <p className="text-xs md:text-sm text-red-800">
                <strong>⚠️ Atenção:</strong> Esta é uma ação crítica que requer aprovação de RH ou Diretoria.
                Certifique-se de preencher todos os dados corretamente.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="motivo" className="text-sm font-medium text-black">Motivo do Desligamento *</Label>
                <Textarea
                  id="motivo"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  rows={3}
                  placeholder="Ex: Demissão sem justa causa, Pedido de demissão, Término de contrato, Demissão por justa causa..."
                  required
                  className="mt-1.5 bg-white text-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data_aviso" className="text-sm font-medium text-black">Data do Aviso Prévio *</Label>
                  <Input
                    id="data_aviso"
                    type="date"
                    value={formData.data_aviso}
                    onChange={(e) => setFormData({ ...formData, data_aviso: e.target.value })}
                    required
                    className="mt-1.5 bg-white text-black"
                  />
                </div>
                <div>
                  <Label htmlFor="data_desligamento" className="text-sm font-medium text-black">Data do Desligamento *</Label>
                  <Input
                    id="data_desligamento"
                    type="date"
                    value={formData.data_desligamento}
                    onChange={(e) => setFormData({ ...formData, data_desligamento: e.target.value })}
                    required
                    className="mt-1.5 bg-white text-black"
                  />
                  <p className="text-xs text-black mt-1">
                    Geralmente 30 dias após o aviso
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes" className="text-sm font-medium text-black">Observações Adicionais</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  placeholder="Informações adicionais relevantes sobre o desligamento..."
                  className="mt-1.5 bg-white text-black"
                />
              </div>

              <div>
                <Label htmlFor="aprovador_id" className="text-sm font-medium text-black">Enviar para Aprovação de *</Label>
                <Select
                  value={formData.aprovador_id}
                  onValueChange={(value) => setFormData({ ...formData, aprovador_id: value })}
                  required
                >
                  <SelectTrigger className="mt-1.5 bg-white text-black">
                    <SelectValue placeholder="Selecione quem deve aprovar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {aprovadores.map((aprovador) => (
                      <SelectItem key={aprovador.id} value={aprovador.id}>
                        {aprovador.full_name || aprovador.email}
                        {aprovador.funcao && ` - ${aprovador.funcao}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-black mt-1">
                  Apenas RH, diretores e administradores podem aprovar desligamentos
                </p>
              </div>
            </form>
          </div>

          <DialogFooter className="flex-shrink-0 flex justify-end gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 border-t bg-white">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 h-10"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              onClick={handleSubmit}
              className="bg-slate-600 hover:bg-slate-700 text-white h-10"
            >
              {isLoading ? 'Enviando...' : 'Enviar Solicitação Crítica'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}