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

export default function FuncionarioDepartamentoForm({ isOpen, onClose, funcionario, onSuccess }) {
  const [formData, setFormData] = useState({
    departamento_novo_id: '',
    data_vigencia: '',
    motivo: '',
    aprovador_id: ''
  });
  const [departamentos, setDepartamentos] = useState([]);
  const [aprovadores, setAprovadores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        departamento_novo_id: '',
        data_vigencia: '',
        motivo: '',
        aprovador_id: ''
      });
      fetchDepartamentos();
      fetchAprovadores();
    }
  }, [isOpen]);

  const fetchDepartamentos = async () => {
    try {
      const deptosData = await base44.entities.Departamento.list();
      setDepartamentos(deptosData || []);
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error);
    }
  };

  const fetchAprovadores = async () => {
    try {
      const users = await base44.entities.User.list();
      const aprovadoresValidos = users.filter(u => 
        u.role === 'admin' || 
        u.funcao?.toLowerCase().includes('rh') ||
        u.funcao?.toLowerCase().includes('gerente') ||
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
      const deptAtual = departamentos.find(d => d.id === funcionario.departamento_id);
      const deptNovo = departamentos.find(d => d.id === formData.departamento_novo_id);

      await base44.entities.FuncionarioDepartamentoHistorico.create({
        funcionario_id: funcionario.id,
        departamento_anterior_id: funcionario.departamento_id,
        departamento_anterior: deptAtual?.nome || '',
        departamento_novo_id: formData.departamento_novo_id,
        departamento_novo: deptNovo?.nome || '',
        data_vigencia: formData.data_vigencia,
        motivo: formData.motivo,
        status: 'solicitado',
        solicitante_id: user.id,
        aprovador_id: formData.aprovador_id
      });

      try {
        await base44.integrations.Core.SendEmail({
          to: aprovador.email,
          subject: `Nova Solicitação de Transferência de Departamento - ${funcionario.nome}`,
          body: `
            <h2>Nova Solicitação de Transferência de Departamento</h2>
            <p><strong>Funcionário:</strong> ${funcionario.nome}</p>
            <p><strong>Departamento Atual:</strong> ${deptAtual?.nome || 'N/A'}</p>
            <p><strong>Departamento Novo:</strong> ${deptNovo?.nome}</p>
            <p><strong>Data de Vigência:</strong> ${formData.data_vigencia}</p>
            <p><strong>Motivo:</strong> ${formData.motivo}</p>
            <p><strong>Solicitado por:</strong> ${user.full_name || user.email}</p>
            <p>Acesse o sistema em <strong>Gestão de RH</strong> para aprovar ou reprovar esta solicitação.</p>
          `
        });
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }

      toast({
        title: 'Solicitação enviada!',
        description: `Solicitação enviada para ${aprovador.full_name || aprovador.email}`
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao solicitar transferência:', error);
      toast({
        title: 'Erro ao solicitar transferência',
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
        .departamento-form-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .departamento-form-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .departamento-form-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .departamento-form-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .departamento-form-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .departamento-form-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .departamento-form-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .departamento-form-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .departamento-form-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .departamento-form-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-3 md:px-6 py-3 md:py-4">
            <DialogTitle className="text-white text-base md:text-lg">Solicitar Transferência de Departamento - {funcionario?.nome}</DialogTitle>
          </DialogHeader>

          <div className="departamento-form-scroll flex-1 px-3 md:px-6 pb-3 md:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="bg-slate-50 p-3 md:p-4 rounded-lg">
                <Label className="text-xs text-black">Departamento Atual</Label>
                <p className="text-base md:text-lg font-semibold text-black">
                  {departamentos.find(d => d.id === funcionario?.departamento_id)?.nome || 'Não definido'}
                </p>
              </div>

              <div>
                <Label htmlFor="departamento_novo_id" className="text-sm font-medium text-black">Novo Departamento *</Label>
                <Select
                  value={formData.departamento_novo_id}
                  onValueChange={(value) => setFormData({ ...formData, departamento_novo_id: value })}
                  required
                >
                  <SelectTrigger className="mt-1.5 bg-white text-black">
                    <SelectValue placeholder="Selecione o novo departamento..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60 overflow-auto">
                    {departamentos.filter(d => d.id !== funcionario?.departamento_id).map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="data_vigencia" className="text-sm font-medium text-black">Data de Vigência *</Label>
                <Input
                  id="data_vigencia"
                  type="date"
                  value={formData.data_vigencia}
                  onChange={(e) => setFormData({ ...formData, data_vigencia: e.target.value })}
                  required
                  className="mt-1.5 bg-white text-black"
                />
              </div>

              <div>
                <Label htmlFor="motivo" className="text-sm font-medium text-black">Motivo da Transferência *</Label>
                <Textarea
                  id="motivo"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  rows={3}
                  placeholder="Ex: Reorganização da equipe, Necessidade do departamento, Desenvolvimento profissional..."
                  required
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
                  <SelectContent className="bg-white max-h-60 overflow-auto">
                    {aprovadores.map((aprovador) => (
                      <SelectItem key={aprovador.id} value={aprovador.id}>
                        {aprovador.full_name || aprovador.email}
                        {aprovador.funcao && ` - ${aprovador.funcao}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-black mt-1">
                  Apenas gerentes, RH, diretores e administradores podem aprovar
                </p>
              </div>
            </form>
          </div>

          <DialogFooter className="flex-shrink-0 flex justify-end gap-2 md:gap-3 px-3 md:px-6 py-3 md:py-4 border-t bg-white flex-col-reverse sm:flex-row">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 h-10 w-full sm:w-auto text-sm px-4"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              onClick={handleSubmit}
              className="bg-slate-600 hover:bg-slate-700 text-white h-10 w-full sm:w-auto text-sm px-4"
            >
              {isLoading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}