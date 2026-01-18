import React, { useState, useEffect } from 'react';
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

export default function FuncionarioCargoForm({ isOpen, onClose, funcionario, onSuccess }) {
  const [formData, setFormData] = useState({
    cargo_novo_id: '',
    data_vigencia: '',
    motivo: '',
    aprovador_id: ''
  });
  const [cargos, setCargos] = useState([]);
  const [aprovadores, setAprovadores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        cargo_novo_id: '',
        data_vigencia: '',
        motivo: '',
        aprovador_id: ''
      });
      fetchCargos();
      fetchAprovadores();
    }
  }, [isOpen]);

  const fetchCargos = async () => {
    try {
      const cargosData = await base44.entities.Cargo.list();
      setCargos(cargosData || []);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
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
      const cargoAtual = cargos.find(c => c.id === funcionario.cargo_id);
      const cargoNovo = cargos.find(c => c.id === formData.cargo_novo_id);

      await base44.entities.FuncionarioCargoHistorico.create({
        funcionario_id: funcionario.id,
        cargo_anterior_id: funcionario.cargo_id,
        cargo_anterior: cargoAtual?.nome || '',
        cargo_novo_id: formData.cargo_novo_id,
        cargo_novo: cargoNovo?.nome || '',
        data_vigencia: formData.data_vigencia,
        motivo: formData.motivo,
        status: 'solicitado',
        solicitante_id: user.id,
        aprovador_id: formData.aprovador_id
      });

      try {
        await base44.integrations.Core.SendEmail({
          to: aprovador.email,
          subject: `Nova Solicitação de Alteração de Cargo - ${funcionario.nome}`,
          body: `
            <h2>Nova Solicitação de Alteração de Cargo</h2>
            <p><strong>Funcionário:</strong> ${funcionario.nome}</p>
            <p><strong>Cargo Atual:</strong> ${cargoAtual?.nome || 'N/A'}</p>
            <p><strong>Cargo Novo:</strong> ${cargoNovo?.nome}</p>
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

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao solicitar alteração de cargo:', error);
      toast({
        title: 'Erro ao solicitar alteração',
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
        .cargo-form-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .cargo-form-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .cargo-form-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .cargo-form-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .cargo-form-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .cargo-form-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .cargo-form-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .cargo-form-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .cargo-form-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .cargo-form-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
      )}
      
      {isOpen && (
        <div className="fixed left-[50%] top-[50%] z-50 grid w-[95vw] md:w-full max-w-[95vw] md:max-w-2xl max-h-[95vh] md:max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-3 md:gap-4 border bg-white p-0 shadow-lg duration-200 sm:rounded-lg overflow-hidden flex flex-col">
          <div className="modern-modal-header flex-shrink-0 bg-slate-800 px-3 md:px-6 py-3 md:py-4">
            <h2 className="text-white text-base md:text-lg font-semibold">Solicitar Alteração de Cargo - {funcionario?.nome}</h2>
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none text-white"
              onClick={onClose}
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="cargo-form-scroll flex-1 px-3 md:px-6 pb-3 md:pb-6">
            <form onSubmit={handleSubmit} id="cargo-form" className="space-y-4 mt-4">
              <div className="bg-slate-50 p-3 md:p-4 rounded-lg">
                <Label className="text-xs text-black">Cargo Atual</Label>
                <p className="text-base md:text-lg font-semibold text-black">
                  {cargos.find(c => c.id === funcionario?.cargo_id)?.nome || 'Não definido'}
                </p>
              </div>

              <div>
                <Label htmlFor="cargo_novo_id" className="text-sm font-medium text-black">Novo Cargo *</Label>
                <Select
                  value={formData.cargo_novo_id}
                  onValueChange={(value) => setFormData({ ...formData, cargo_novo_id: value })}
                  required
                >
                  <SelectTrigger className="mt-1.5 bg-white text-black">
                    <SelectValue placeholder="Selecione o novo cargo..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60 overflow-auto">
                    {cargos.filter(c => c.id !== funcionario?.cargo_id).map((cargo) => (
                      <SelectItem key={cargo.id} value={cargo.id}>
                        {cargo.nome}
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
                <Label htmlFor="motivo" className="text-sm font-medium text-black">Motivo da Alteração *</Label>
                <Textarea
                  id="motivo"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  rows={3}
                  placeholder="Ex: Promoção, Transferência interna, Reestruturação..."
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

          <div className="flex-shrink-0 flex justify-end gap-2 md:gap-3 px-3 md:px-6 py-3 md:py-4 border-t bg-white flex-col-reverse sm:flex-row">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
              className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 h-10 w-full sm:w-auto text-sm px-4"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              form="cargo-form"
              disabled={isLoading}
              className="bg-slate-600 hover:bg-slate-700 text-white h-10 w-full sm:w-auto text-sm px-4"
            >
              {isLoading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}