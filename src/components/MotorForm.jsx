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
      <DialogContent className="w-[95vw] md:max-w-2xl p-0 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="sticky top-0 z-10 px-3 md:px-6 py-3 md:py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm md:text-lg text-white">
            <Fuel className="w-4 h-4 md:w-5 md:h-5" />
            {motor ? "Editar Motor" : "Novo Motor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div>
                <Label htmlFor="codigo" className="text-xs md:text-sm">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => handleChange("codigo", e.target.value)}
                  placeholder="Ex: MOT-001"
                  className="h-9 md:h-10 mt-1"
                />
              </div>

              <div>
                <Label htmlFor="ano_fabricacao" className="text-xs md:text-sm">Ano</Label>
                <Input
                  id="ano_fabricacao"
                  value={formData.ano_fabricacao}
                  onChange={(e) => handleChange("ano_fabricacao", e.target.value)}
                  placeholder="Ex: 2020"
                  className="h-9 md:h-10 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div>
                <Label htmlFor="fabricante" className="text-xs md:text-sm">Fabricante *</Label>
                <Input
                  id="fabricante"
                  value={formData.fabricante}
                  onChange={(e) => handleChange("fabricante", e.target.value)}
                  placeholder="Ex: Volkswagen"
                  required
                  className="h-9 md:h-10 mt-1"
                />
              </div>

              <div>
                <Label htmlFor="modelo" className="text-xs md:text-sm">Modelo *</Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => handleChange("modelo", e.target.value)}
                  placeholder="Ex: EA888"
                  required
                  className="h-9 md:h-10 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div>
                <Label htmlFor="potencia" className="text-xs md:text-sm">Potência</Label>
                <Input
                  id="potencia"
                  value={formData.potencia}
                  onChange={(e) => handleChange("potencia", e.target.value)}
                  placeholder="150 CV"
                  className="h-9 md:h-10 mt-1"
                />
              </div>

              <div>
                <Label htmlFor="cilindradas" className="text-xs md:text-sm">Cilindradas</Label>
                <Input
                  id="cilindradas"
                  value={formData.cilindradas}
                  onChange={(e) => handleChange("cilindradas", e.target.value)}
                  placeholder="2000cc"
                  className="h-9 md:h-10 mt-1"
                />
              </div>

              <div>
                <Label htmlFor="combustivel" className="text-xs md:text-sm">Combustível</Label>
                <Select
                  value={formData.combustivel}
                  onValueChange={(value) => handleChange("combustivel", value)}
                >
                  <SelectTrigger className="h-9 md:h-10 mt-1">
                    <SelectValue placeholder="Tipo" />
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

            <div>
              <Label htmlFor="observacoes" className="text-xs md:text-sm">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                placeholder="Informações adicionais"
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => handleChange("ativo", checked)}
              />
              <Label htmlFor="ativo" className="text-xs md:text-sm cursor-pointer">
                Motor ativo no sistema
              </Label>
            </div>
          </div>
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 md:px-6 py-3 md:py-4 flex justify-end gap-2 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4 gap-2">
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button type="submit" className="bg-slate-800 hover:bg-slate-700 h-8 md:h-9 text-xs md:text-sm px-3 md:px-4 gap-2">
              <Save className="w-4 h-4" />
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}