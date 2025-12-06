import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SmartInput from "@/components/SmartInput";
import { Save, X, Calendar, User, Clock } from "lucide-react";

export default function ControlePontoForm({ isOpen, ponto, funcionarios, onSave, onClose }) {
  const [formData, setFormData] = useState({
    funcionario_id: "",
    mes_referencia: "",
    dias_trabalhados: 0,
    faltas_dias: 0,
    faltas_horas: 0,
    horas_extras_semana: 0,
    horas_extras_fds: 0,
    observacoes: "",
  });

  useEffect(() => {
    if (ponto) {
      setFormData({
        funcionario_id: ponto.funcionario_id || "",
        mes_referencia: ponto.mes_referencia || "",
        dias_trabalhados: ponto.dias_trabalhados || 0,
        faltas_dias: ponto.faltas_dias || 0,
        faltas_horas: ponto.faltas_horas || 0,
        horas_extras_semana: ponto.horas_extras_semana || 0,
        horas_extras_fds: ponto.horas_extras_fds || 0,
        observacoes: ponto.observacoes || "",
      });
    } else {
      // Limpar formulário para novo registro
      setFormData({
        funcionario_id: "",
        mes_referencia: "",
        dias_trabalhados: 0,
        faltas_dias: 0,
        faltas_horas: 0,
        horas_extras_semana: 0,
        horas_extras_fds: 0,
        observacoes: "",
      });
    }
  }, [ponto, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto modern-modal" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">
                {ponto ? "Editar Controle de Ponto" : "Novo Controle de Ponto"}
              </p>
              <p className="text-xs text-white/80 font-normal">
                Registre as informações de ponto do funcionário
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Seção: Identificação */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-700 font-semibold border-b pb-2">
              <User className="w-4 h-4" />
              <span>Identificação</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="funcionario_id" className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Funcionário *
                </Label>
                <SmartInput
                  id="funcionario_id"
                  options={(funcionarios || []).map(f => ({ 
                    value: f.id, 
                    label: f.nome 
                  }))}
                  value={formData.funcionario_id}
                  onChange={(v) => handleChange("funcionario_id", v)}
                  placeholder="Selecione o funcionário"
                  className="modern-input"
                  required
                />
              </div>

              <div>
                <Label htmlFor="mes_referencia" className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Mês de Referência *
                </Label>
                <Input 
                  id="mes_referencia" 
                  type="month" 
                  value={formData.mes_referencia} 
                  onChange={(e) => handleChange("mes_referencia", e.target.value)} 
                  className="modern-input"
                  required 
                />
              </div>
            </div>
          </div>

          {/* Seção: Dias Trabalhados e Faltas */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Calendar className="w-4 h-4" />
              <span>Frequência</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dias_trabalhados" className="text-sm font-medium text-slate-700 mb-2">
                  Dias Trabalhados
                </Label>
                <Input 
                  id="dias_trabalhados" 
                  type="number" 
                  min="0"
                  step="1"
                  value={formData.dias_trabalhados} 
                  onChange={(e) => handleChange("dias_trabalhados", Number(e.target.value))} 
                  className="modern-input"
                />
              </div>

              <div>
                <Label htmlFor="faltas_dias" className="text-sm font-medium text-slate-700 mb-2">
                  Faltas (Dias)
                </Label>
                <Input 
                  id="faltas_dias" 
                  type="number" 
                  min="0"
                  step="1"
                  value={formData.faltas_dias} 
                  onChange={(e) => handleChange("faltas_dias", Number(e.target.value))} 
                  className="modern-input"
                />
              </div>

              <div>
                <Label htmlFor="faltas_horas" className="text-sm font-medium text-slate-700 mb-2">
                  Faltas (Horas)
                </Label>
                <Input 
                  id="faltas_horas" 
                  type="number" 
                  min="0"
                  step="0.5"
                  value={formData.faltas_horas} 
                  onChange={(e) => handleChange("faltas_horas", Number(e.target.value))} 
                  className="modern-input"
                />
              </div>
            </div>
          </div>

          {/* Seção: Horas Extras */}
          <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 font-semibold">
              <Clock className="w-4 h-4" />
              <span>Horas Extras</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="horas_extras_semana" className="text-sm font-medium text-slate-700 mb-2">
                  HE Semana (horas)
                </Label>
                <Input 
                  id="horas_extras_semana" 
                  type="number" 
                  min="0"
                  step="0.5"
                  value={formData.horas_extras_semana} 
                  onChange={(e) => handleChange("horas_extras_semana", Number(e.target.value))} 
                  className="modern-input"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Horas extras em dias de semana
                </p>
              </div>

              <div>
                <Label htmlFor="horas_extras_fds" className="text-sm font-medium text-slate-700 mb-2">
                  HE FDS/Feriados (horas)
                </Label>
                <Input 
                  id="horas_extras_fds" 
                  type="number" 
                  min="0"
                  step="0.5"
                  value={formData.horas_extras_fds} 
                  onChange={(e) => handleChange("horas_extras_fds", Number(e.target.value))} 
                  className="modern-input"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Horas extras em finais de semana e feriados
                </p>
              </div>
            </div>
          </div>

          {/* Seção: Observações */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-700 font-semibold border-b pb-2">
              <span>Observações</span>
            </div>

            <div>
              <Label htmlFor="observacoes" className="text-sm font-medium text-slate-700 mb-2">
                Observações
              </Label>
              <Textarea 
                id="observacoes" 
                value={formData.observacoes} 
                onChange={(e) => handleChange("observacoes", e.target.value)}
                placeholder="Digite observações sobre este registro de ponto..."
                rows={4}
                className="modern-input resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="gap-2 px-6"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button
              type="submit"
              className="gap-2 px-6 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900"
            >
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}