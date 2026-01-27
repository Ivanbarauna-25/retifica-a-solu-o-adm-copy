import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, X } from "lucide-react";

export default function LancamentoBancoHorasModal({ isOpen, onClose, funcionario, onLancamentoFeito }) {
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split("T")[0],
    tipo: "credito",
    origem: "ajuste",
    minutos: "",
    observacao: ""
  });

  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        data: new Date().toISOString().split("T")[0],
        tipo: "credito",
        origem: "ajuste",
        minutos: "",
        observacao: ""
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.data || !formData.minutos || !formData.observacao) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }

    const minutos = parseInt(formData.minutos);
    if (isNaN(minutos) || minutos <= 0) {
      toast({ title: "Erro", description: "Minutos deve ser um número positivo.", variant: "destructive" });
      return;
    }

    setSalvando(true);
    try {
      await base44.entities.BancoHoras.create({
        funcionario_id: funcionario.id,
        data: formData.data,
        tipo: formData.tipo,
        origem: formData.origem,
        minutos: minutos,
        observacao: formData.observacao
      });

      toast({ title: "Sucesso", description: "Lançamento registrado no banco de horas." });
      if (onLancamentoFeito) onLancamentoFeito();
      onClose();
    } catch (error) {
      console.error("Erro ao lançar:", error);
      toast({ title: "Erro", description: error.message || "Erro ao registrar lançamento.", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md w-[96vw] max-h-[92vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-3 md:px-4 py-2.5 md:py-3 rounded-t-lg">
          <DialogTitle className="text-xs md:text-sm font-bold">Lançar Ajuste - Banco de Horas</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-2.5 md:space-y-3 px-3 md:px-4 py-3">
          <div>
            <Label className="text-[10px] md:text-xs font-medium">Funcionário</Label>
            <Input value={funcionario?.nome || ""} disabled className="text-xs bg-slate-50 h-8 md:h-9" />
          </div>

          <div>
            <Label className="text-[10px] md:text-xs font-medium">Data *</Label>
            <Input
              type="date"
              value={formData.data}
              onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
              className="text-xs h-8 md:h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <div>
              <Label className="text-[10px] md:text-xs font-medium">Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}>
                <SelectTrigger className="text-xs h-8 md:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credito">Crédito (+)</SelectItem>
                  <SelectItem value="debito">Débito (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] md:text-xs font-medium">Origem *</Label>
              <Select value={formData.origem} onValueChange={(v) => setFormData(prev => ({ ...prev, origem: v }))}>
                <SelectTrigger className="text-xs h-8 md:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="abono">Abono</SelectItem>
                  <SelectItem value="atestado">Atestado</SelectItem>
                  <SelectItem value="pagamento">Pagamento</SelectItem>
                  <SelectItem value="desconto">Desconto</SelectItem>
                  <SelectItem value="compensacao">Compensação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[10px] md:text-xs font-medium">Minutos *</Label>
            <div className="relative">
              <Input
                type="number"
                value={formData.minutos}
                onChange={(e) => setFormData(prev => ({ ...prev, minutos: e.target.value }))}
                min="1"
                placeholder="Ex: 60"
                className="text-xs h-8 md:h-9"
              />
              {formData.minutos && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                  ≈ {Math.floor(parseInt(formData.minutos) / 60)}h {parseInt(formData.minutos) % 60}min
                </span>
              )}
            </div>
          </div>

          <div>
            <Label className="text-[10px] md:text-xs font-medium">Observação *</Label>
            <Textarea
              value={formData.observacao}
              onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
              placeholder="Descreva o motivo do lançamento..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>
        </form>

        <div className="flex-shrink-0 border-t bg-slate-50 px-3 md:px-4 py-2.5 md:py-3 rounded-b-lg flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 gap-2 text-[10px] md:text-xs h-8 md:h-9">
            <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando} onClick={handleSubmit} className="flex-1 gap-2 text-[10px] md:text-xs h-8 md:h-9">
            {salvando ? <Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" /> : <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />}
            Registrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}