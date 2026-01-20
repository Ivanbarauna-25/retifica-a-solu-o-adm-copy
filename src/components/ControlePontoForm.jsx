import React, { useEffect, useState } from "react";
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
  return Number.isFinite(n) ? n : 0;
}

export default function ControlePontoForm({
  isOpen,
  ponto,
  funcionarios = [],
  onSave,
  onClose
}) {
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    setFormData(ponto ? { ...initialState, ...ponto } : initialState);
  }, [ponto, isOpen]);

  const update = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const submit = (e) => {
    e.preventDefault();

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
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            {ponto ? "Editar Controle de Ponto" : "Novo Controle de Ponto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Funcionário *</Label>
            <SmartInput
              options={funcionarios.map((f) => ({
                value: f.id,
                label: f.nome
              }))}
              value={formData.funcionario_id}
              onChange={(v) => update("funcionario_id", v)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Mês de Referência *</Label>
            <Input
              type="month"
              value={formData.mes_referencia || ""}
              onChange={(e) => update("mes_referencia", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dias trabalhados</Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={formData.dias_trabalhados ?? 0}
                onChange={(e) => update("dias_trabalhados", toNumberSafe(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Faltas (dias)</Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={formData.faltas_dias ?? 0}
                onChange={(e) => update("faltas_dias", toNumberSafe(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Faltas (horas)</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={formData.faltas_horas ?? 0}
                onChange={(e) => update("faltas_horas", toNumberSafe(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>HE Semana (horas)</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={formData.horas_extras_semana ?? 0}
                onChange={(e) => update("horas_extras_semana", toNumberSafe(e.target.value))}
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>HE FDS/Feriado (horas)</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={formData.horas_extras_fds ?? 0}
                onChange={(e) => update("horas_extras_fds", toNumberSafe(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={formData.observacoes || ""}
              onChange={(e) => update("observacoes", e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" type="button" onClick={onClose} className="gap-2">
              <X size={16} /> Cancelar
            </Button>
            <Button type="submit" className="gap-2">
              <Save size={16} /> Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
