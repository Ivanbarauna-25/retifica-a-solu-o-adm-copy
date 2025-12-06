import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Fuel, Save, X } from "lucide-react";

export default function MotorForm({ isOpen, onClose, onSave, motor }) {
  const [formData, setFormData] = useState({
    codigo: "",
    fabricante: "",
    modelo: "",
    potencia: "",
    cilindradas: "",
    combustivel: "",
    ano_fabricacao: "",
    observacoes: "",
    ativo: true,
  });

  useEffect(() => {
    if (motor) {
      setFormData({
        codigo: motor.codigo || "",
        fabricante: motor.fabricante || "",
        modelo: motor.modelo || "",
        potencia: motor.potencia || "",
        cilindradas: motor.cilindradas || "",
        combustivel: motor.combustivel || "",
        ano_fabricacao: motor.ano_fabricacao || "",
        observacoes: motor.observacoes || "",
        ativo: motor.ativo !== false,
      });
    } else {
      setFormData({
        codigo: "",
        fabricante: "",
        modelo: "",
        potencia: "",
        cilindradas: "",
        combustivel: "",
        ano_fabricacao: "",
        observacoes: "",
        ativo: true,
      });
    }
  }, [motor, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="bg-slate-800 text-white -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Fuel className="w-5 h-5" />
            {motor ? "Editar Motor" : "Novo Motor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Código */}
            <div>
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => handleChange("codigo", e.target.value)}
                placeholder="Ex: MOT-001"
              />
            </div>

            {/* Ano de Fabricação */}
            <div>
              <Label htmlFor="ano_fabricacao">Ano de Fabricação</Label>
              <Input
                id="ano_fabricacao"
                value={formData.ano_fabricacao}
                onChange={(e) => handleChange("ano_fabricacao", e.target.value)}
                placeholder="Ex: 2020"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Fabricante */}
            <div>
              <Label htmlFor="fabricante" className="campo-obrigatorio">
                Fabricante
              </Label>
              <Input
                id="fabricante"
                value={formData.fabricante}
                onChange={(e) => handleChange("fabricante", e.target.value)}
                placeholder="Ex: Volkswagen"
                required
              />
            </div>

            {/* Modelo */}
            <div>
              <Label htmlFor="modelo" className="campo-obrigatorio">
                Modelo
              </Label>
              <Input
                id="modelo"
                value={formData.modelo}
                onChange={(e) => handleChange("modelo", e.target.value)}
                placeholder="Ex: EA888"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Potência */}
            <div>
              <Label htmlFor="potencia">Potência</Label>
              <Input
                id="potencia"
                value={formData.potencia}
                onChange={(e) => handleChange("potencia", e.target.value)}
                placeholder="Ex: 150 CV"
              />
            </div>

            {/* Cilindradas */}
            <div>
              <Label htmlFor="cilindradas">Cilindradas</Label>
              <Input
                id="cilindradas"
                value={formData.cilindradas}
                onChange={(e) => handleChange("cilindradas", e.target.value)}
                placeholder="Ex: 2000cc"
              />
            </div>

            {/* Combustível */}
            <div>
              <Label htmlFor="combustivel">Combustível</Label>
              <Select
                value={formData.combustivel}
                onValueChange={(value) => handleChange("combustivel", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flex">Flex</SelectItem>
                  <SelectItem value="gasolina">Gasolina</SelectItem>
                  <SelectItem value="etanol">Etanol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="gnv">GNV</SelectItem>
                  <SelectItem value="eletrico">Elétrico</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              placeholder="Informações adicionais sobre o motor"
              rows={3}
            />
          </div>

          {/* Status Ativo */}
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => handleChange("ativo", checked)}
            />
            <Label
              htmlFor="ativo"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Motor ativo no sistema
            </Label>
          </div>

          <DialogFooter className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}