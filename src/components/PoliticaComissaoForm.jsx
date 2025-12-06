import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function PoliticaComissaoForm({
  isOpen,
  politica,
  cargos = [],
  onSave,
  onClose
}) {
  const [form, setForm] = useState({
    nome_politica: "",
    cargo_id: "",
    tipo_meta: "individual", // individual | empresa
    meta_valor: 0,
    percentual_comissao: 0,
    base_calculo: "total", // total | excedente
    ativa: true
  });

  useEffect(() => {
    if (politica) {
      setForm({
        nome_politica: politica.nome_politica || "",
        cargo_id: politica.cargo_id || "",
        tipo_meta: politica.tipo_meta || "individual",
        meta_valor: typeof politica.meta_valor === "number" ? politica.meta_valor : Number(politica.meta_valor || 0),
        percentual_comissao: typeof politica.percentual_comissao === "number" ? politica.percentual_comissao : Number(politica.percentual_comissao || 0),
        base_calculo: politica.base_calculo || "total",
        ativa: politica.ativa !== undefined ? !!politica.ativa : true
      });
    } else {
      setForm({
        nome_politica: "",
        cargo_id: "",
        tipo_meta: "individual",
        meta_valor: 0,
        percentual_comissao: 0,
        base_calculo: "total",
        ativa: true
      });
    }
  }, [politica]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      meta_valor: Number(form.meta_valor) || 0,
      percentual_comissao: Number(form.percentual_comissao) || 0
    };
    onSave?.(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{politica ? "Editar Política de Comissão" : "Nova Política de Comissão"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Nome da Política</Label>
              <Input
                value={form.nome_politica}
                onChange={(e) => handleChange("nome_politica", e.target.value)}
                placeholder="Ex.: Comissão Vendas Balcão"
                required
              />
            </div>

            <div>
              <Label>Cargo</Label>
              <Select
                value={form.cargo_id}
                onValueChange={(v) => handleChange("cargo_id", v)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {cargos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Meta</Label>
              <Select
                value={form.tipo_meta}
                onValueChange={(v) => handleChange("tipo_meta", v)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Meta (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.meta_valor}
                onChange={(e) => handleChange("meta_valor", e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label>Percentual de Comissão (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.percentual_comissao}
                onChange={(e) => handleChange("percentual_comissao", e.target.value)}
                placeholder="Ex.: 1.5"
                required
              />
            </div>

            <div>
              <Label>Base de Cálculo</Label>
              <Select
                value={form.base_calculo}
                onValueChange={(v) => handleChange("base_calculo", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="excedente">Excedente da Meta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="ativa"
                checked={!!form.ativa}
                onCheckedChange={(v) => handleChange("ativa", v)}
              />
              <Label htmlFor="ativa">Ativa</Label>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {politica ? "Salvar alterações" : "Criar política"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}