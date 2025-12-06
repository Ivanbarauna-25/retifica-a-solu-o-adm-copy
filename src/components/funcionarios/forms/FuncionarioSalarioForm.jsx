import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/components/formatters';

export default function FuncionarioSalarioForm({ isOpen, onClose, funcionario, onSuccess }) {
  const [formData, setFormData] = useState({
    salario_novo: '',
    data_vigencia: '',
    motivo: '',
    aprovador_id: ''
  });
  const [aprovadores, setAprovadores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && funcionario) {
      setFormData({
        salario_novo: funcionario.salario || '',
        data_vigencia: '',
        motivo: '',
        aprovador_id: ''
      });
      fetchAprovadores();
    }
  }, [isOpen, funcionario]);

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
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de aprovadores.',
        variant: 'destructive'
      });
    }
  };

  const calcularReajuste = () => {
    if (!funcionario?.salario || !formData.salario_novo) return 0;
    const anterior = parseFloat(funcionario.salario);
    const novo = parseFloat(formData.salario_novo);
    return ((novo - anterior) / anterior * 100).toFixed(2);
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

      if (!aprovador) {
        toast({
          title: 'Erro',
          description: 'Aprovador selecionado não encontrado.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      await base44.entities.FuncionarioSalarioHistorico.create({
        funcionario_id: funcionario.id,
        salario_anterior: funcionario.salario || 0,
        salario_novo: parseFloat(formData.salario_novo),
        data_vigencia: formData.data_vigencia,
        motivo: formData.motivo,
        status: 'solicitado',
        solicitante_id: user.id,
        aprovador_id: formData.aprovador_id
      });

      try {
        await base44.integrations.Core.SendEmail({
          to: aprovador.email,
          subject: `Nova Solicitação de Reajuste Salarial - ${funcionario.nome}`,
          body: `
            <h2>Nova Solicitação de Reajuste Salarial</h2>
            <p><strong>Funcionário:</strong> ${funcionario.nome}</p>
            <p><strong>Salário Atual:</strong> R$ ${funcionario.salario?.toFixed(2)}</p>
            <p><strong>Salário Novo:</strong> R$ ${parseFloat(formData.salario_novo).toFixed(2)}</p>
            <p><strong>Reajuste:</strong> ${calcularReajuste()}%</p>
            <p><strong>Vigência:</strong> ${formData.data_vigencia}</p>
            <p><strong>Motivo:</strong> ${formData.motivo}</p>
            <p><strong>Solicitado por:</strong> ${user.full_name || user.email}</p>
            <p>Acesse o sistema para aprovar ou reprovar esta solicitação.</p>
          `
        });
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        toast({
          title: 'Aviso',
          description: 'Solicitação enviada, mas houve um erro ao notificar o aprovador por e-mail.',
          variant: 'warning'
        });
      }

      toast({
        title: 'Solicitação enviada!',
        description: `Solicitação enviada para ${aprovador.full_name || aprovador.email} para aprovação.`
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao solicitar reajuste:', error);
      toast({
        title: 'Erro ao solicitar reajuste',
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
        .salario-form-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .salario-form-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .salario-form-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .salario-form-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .salario-form-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .salario-form-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .salario-form-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .salario-form-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .salario-form-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .salario-form-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-2xl h-[95vh] md:max-h-[90vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-4 md:px-6 py-4">
            <DialogTitle className="text-white text-base md:text-lg">Solicitar Reajuste Salarial - {funcionario?.nome}</DialogTitle>
          </DialogHeader>

          <div className="salario-form-scroll flex-1 px-4 md:px-6 pb-4 md:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-black">Salário Atual</Label>
                    <p className="text-base md:text-lg font-semibold text-black">{formatCurrency(funcionario?.salario || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-black">Reajuste</Label>
                    <p className={`text-base md:text-lg font-semibold ${parseFloat(calcularReajuste()) >= 0 ? 'text-black' : 'text-red-600'}`}>
                      {calcularReajuste()}%
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="salario_novo" className="text-sm font-medium text-black">Novo Salário *</Label>
                <Input
                  id="salario_novo"
                  type="number"
                  step="0.01"
                  value={formData.salario_novo}
                  onChange={(e) => setFormData({ ...formData, salario_novo: e.target.value })}
                  required
                  className="mt-1.5 bg-white text-black"
                />
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
                <Label htmlFor="motivo" className="text-sm font-medium text-black">Motivo do Reajuste *</Label>
                <Textarea
                  id="motivo"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  rows={3}
                  placeholder="Ex: Promoção, Mérito, Reajuste anual, etc."
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
                  Apenas diretores, RH e administradores podem aprovar reajustes
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
              {isLoading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}