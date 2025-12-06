import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { getAprovadores, getRoleLabel, getRoleColor } from '@/components/permissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function FuncionarioFeriasForm({ isOpen, onClose, funcionario, onSuccess }) {
  const [formData, setFormData] = useState({
    inicio: '',
    fim: '',
    dias: 0,
    abono_pecuniario: false,
    observacoes: '',
    aprovador_id: ''
  });
  const [aprovadores, setAprovadores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        inicio: '',
        fim: '',
        dias: 0,
        abono_pecuniario: false,
        observacoes: '',
        aprovador_id: ''
      });
      fetchAprovadores();
    }
  }, [isOpen]);

  const fetchAprovadores = async () => {
    try {
      const users = await base44.entities.User.list();
      const aprovadoresValidos = getAprovadores(users, 'ferias');
      setAprovadores(aprovadoresValidos || []);
    } catch (error) {
      console.error('Erro ao carregar aprovadores:', error);
    }
  };

  const calcularDias = (inicio, fim) => {
    if (!inicio || !fim) return 0;
    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);
    const diff = Math.ceil((dataFim - dataInicio) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  useEffect(() => {
    if (formData.inicio && formData.fim) {
      const dias = calcularDias(formData.inicio, formData.fim);
      setFormData(prev => ({ ...prev, dias }));
    }
  }, [formData.inicio, formData.fim]);

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

    if (formData.dias <= 0) {
      toast({
        title: 'Erro',
        description: 'O período de férias deve ter pelo menos 1 dia',
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

      await base44.entities.FuncionarioFerias.create({
        funcionario_id: funcionario.id,
        inicio: formData.inicio,
        fim: formData.fim,
        dias: formData.dias,
        abono_pecuniario: formData.abono_pecuniario,
        status: 'solicitado',
        observacoes: formData.observacoes,
        solicitante_id: user.id,
        aprovador_id: formData.aprovador_id
      });

      try {
        await base44.integrations.Core.SendEmail({
          to: aprovador.email,
          subject: `Nova Solicitação de Férias - ${funcionario.nome}`,
          body: `
            <h2>Nova Solicitação de Férias</h2>
            <p><strong>Funcionário:</strong> ${funcionario.nome}</p>
            <p><strong>Período:</strong> ${new Date(formData.inicio).toLocaleDateString('pt-BR')} até ${new Date(formData.fim).toLocaleDateString('pt-BR')}</p>
            <p><strong>Dias:</strong> ${formData.dias} dias</p>
            <p><strong>Solicitado por:</strong> ${user.full_name || user.email}</p>
            ${formData.observacoes ? `<p><strong>Observações:</strong> ${formData.observacoes}</p>` : ''}
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
      console.error('Erro ao solicitar férias:', error);
      toast({
        title: 'Erro ao solicitar férias',
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
        .ferias-form-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .ferias-form-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .ferias-form-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .ferias-form-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .ferias-form-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .ferias-form-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .ferias-form-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .ferias-form-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .ferias-form-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .ferias-form-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-2xl h-[95vh] md:max-h-[90vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-4 md:px-6 py-4">
            <DialogTitle className="text-white text-base md:text-lg">Solicitar Férias - {funcionario?.nome}</DialogTitle>
          </DialogHeader>

          <div className="ferias-form-scroll flex-1 px-4 md:px-6 pb-4 md:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inicio" className="text-sm font-medium text-black">Data de Início *</Label>
                  <Input
                    id="inicio"
                    type="date"
                    value={formData.inicio}
                    onChange={(e) => setFormData({ ...formData, inicio: e.target.value })}
                    required
                    className="mt-1.5 bg-white text-black"
                  />
                </div>
                <div>
                  <Label htmlFor="fim" className="text-sm font-medium text-black">Data de Fim *</Label>
                  <Input
                    id="fim"
                    type="date"
                    value={formData.fim}
                    onChange={(e) => setFormData({ ...formData, fim: e.target.value })}
                    required
                    className="mt-1.5 bg-white text-black"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-black">Dias de Férias</Label>
                <Input
                  type="number"
                  value={formData.dias}
                  disabled
                  className="bg-gray-50 text-black mt-1.5"
                />
                <p className="text-xs text-black mt-1">Calculado automaticamente</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="abono"
                  checked={formData.abono_pecuniario}
                  onCheckedChange={(checked) => setFormData({ ...formData, abono_pecuniario: checked })}
                />
                <Label htmlFor="abono" className="cursor-pointer text-black">
                  Abono Pecuniário (venda de férias)
                </Label>
              </div>

              <div>
                <Label htmlFor="aprovador" className="text-sm font-medium text-black">Enviar Solicitação Para: *</Label>
                <Select
                  value={formData.aprovador_id}
                  onValueChange={(value) => setFormData({ ...formData, aprovador_id: value })}
                >
                  <SelectTrigger className="mt-1.5 bg-white text-black">
                    <SelectValue placeholder="Selecione quem deve aprovar" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {aprovadores.length === 0 ? (
                      <div className="p-2 text-sm text-black">
                        Nenhum aprovador disponível
                      </div>
                    ) : (
                      aprovadores.map((aprovador) => (
                        <SelectItem key={aprovador.id} value={aprovador.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-black">{aprovador.full_name || aprovador.email}</span>
                            <Badge className={getRoleColor(aprovador.system_role || aprovador.role)}>
                              {getRoleLabel(aprovador.system_role || aprovador.role)}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-black mt-1">
                  Apenas usuários com permissão para aprovar férias aparecem na lista
                </p>
              </div>

              <div>
                <Label htmlFor="observacoes" className="text-sm font-medium text-black">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais sobre as férias..."
                  rows={3}
                  className="mt-1.5 bg-white text-black"
                />
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