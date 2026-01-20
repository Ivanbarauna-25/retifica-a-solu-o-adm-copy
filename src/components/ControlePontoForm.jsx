import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SmartInput from "@/components/SmartInput";
import { Save, X } from "lucide-react";

const initialState = {
  funcionario_id: "",
  mes_referencia: "",
  dias_trabalhados: 0,
  faltas_dias: 0,
  faltas_horas: 0,
  horas_extras_semana: 0,
  horas_extras_fds: 0,
  observacoes: ""
};

function toNumberSafe(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function ControlePontoForm({ isOpen, ponto, funcionarios = [], onSave, onClose }) {
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (ponto) {
      setFormData({
        funcionario_id: ponto.funcionario_id || "",
        mes_referencia: ponto.mes_referencia || "",
        dias_trabalhados: ponto.dias_trabalhados ?? 0,
        faltas_dias: ponto.faltas_dias ?? 0,
        faltas_horas: ponto.faltas_horas ?? 0,
        horas_extras_semana: ponto.horas_extras_semana ?? 0,
        horas_extras_fds: ponto.horas_extras_fds ?? 0,
        observacoes: ponto.observacoes || ""
      });
    } else {
      setFormData(initialState);
    }
  }, [ponto, isOpen]);

  const update = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const submit = (e) => {
    e.preventDefault();

    if (!formData.funcionario_id || !formData.mes_referencia) {
      alert("Funcionário e Mês de Referência são obrigatórios.");
      return;
    }

    const payload = {
      ...formData,
      dias_trabalhados: toNumberSafe(formData.dias_trabalhados),
      faltas_dias: toNumberSafe(formData.faltas_dias),
      faltas_horas: toNumberSafe(formData.faltas_horas),
      horas_extras_semana: toNumberSafe(formData.horas_extras_semana),
      horas_extras_fds: toNumberSafe(formData.horas_extras_fds)
    };

    onSave(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full modern-modal">
        <DialogHeader className="modern-modal-header">
          <DialogTitle className="text-sm md:text-lg">
            {ponto ? "Editar Controle de Ponto" : "Novo Controle de Ponto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="modern-modal-content space-y-3 md:space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs md:text-sm font-medium">Funcionário *</Label>
            <SmartInput
              options={funcionarios.map((f) => ({
                value: f.id,
                label: f.nome
              }))}
              value={formData.funcionario_id}
              onChange={(value) => update("funcionario_id", value)}
              placeholder="Selecione o funcionário..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs md:text-sm font-medium">Mês de Referência *</Label>
            <Input
              type="month"
              value={formData.mes_referencia || ""}
              onChange={(e) => update("mes_referencia", e.target.value)}
              required
              className="text-xs md:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs md:text-sm font-medium">Dias Trabalhados</Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={formData.dias_trabalhados ?? 0}
                onChange={(e) => update("dias_trabalhados", toNumberSafe(e.target.value))}
                className="text-xs md:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs md:text-sm font-medium">Faltas (dias)</Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={formData.faltas_dias ?? 0}
                onChange={(e) => update("faltas_dias", toNumberSafe(e.target.value))}
                className="text-xs md:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs md:text-sm font-medium">Faltas (horas)</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={formData.faltas_horas ?? 0}
                onChange={(e) => update("faltas_horas", toNumberSafe(e.target.value))}
                className="text-xs md:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs md:text-sm font-medium">Horas Extras Semana</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={formData.horas_extras_semana ?? 0}
                onChange={(e) => update("horas_extras_semana", toNumberSafe(e.target.value))}
                className="text-xs md:text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs md:text-sm font-medium">Horas Extras FDS/Feriado</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={formData.horas_extras_fds ?? 0}
                onChange={(e) => update("horas_extras_fds", toNumberSafe(e.target.value))}
                className="text-xs md:text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs md:text-sm font-medium">Observações</Label>
            <Textarea
              rows={3}
              value={formData.observacoes || ""}
              onChange={(e) => update("observacoes", e.target.value)}
              placeholder="Digite observações sobre o período..."
              className="text-xs md:text-sm"
            />
          </div>

          <DialogFooter className="modern-modal-footer gap-2 flex-row justify-end">
            <Button variant="outline" type="button" onClick={onClose} className="gap-2 text-xs md:text-sm">
              <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Cancelar
            </Button>
            <Button type="submit" className="gap-2 bg-slate-800 hover:bg-slate-700 text-xs md:text-sm">
              <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}