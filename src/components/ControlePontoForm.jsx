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
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ponto ? "Editar Controle de Ponto" : "Novo Controle de Ponto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
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

          <div>
            <Label>Mês de Referência *</Label>
            <Input
              type="month"
              value={formData.mes_referencia}
              onChange={(e) => update("mes_referencia", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              placeholder="Dias trabalhados"
              value={formData.dias_trabalhados}
              onChange={(e) => update("dias_trabalhados", +e.target.value)}
            />
            <Input
              type="number"
              placeholder="Faltas (dias)"
              value={formData.faltas_dias}
              onChange={(e) => update("faltas_dias", +e.target.value)}
            />
            <Input
              type="number"
              placeholder="Faltas (horas)"
              step="0.5"
              value={formData.faltas_horas}
              onChange={(e) => update("faltas_horas", +e.target.value)}
            />
            <Input
              type="number"
              placeholder="HE Semana"
              step="0.5"
              value={formData.horas_extras_semana}
              onChange={(e) => update("horas_extras_semana", +e.target.value)}
            />
            <Input
              type="number"
              placeholder="HE FDS/Feriado"
              step="0.5"
              value={formData.horas_extras_fds}
              onChange={(e) => update("horas_extras_fds", +e.target.value)}
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={formData.observacoes}
              onChange={(e) => update("observacoes", e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              <X size={16} /> Cancelar
            </Button>
            <Button type="submit">
              <Save size={16} /> Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
