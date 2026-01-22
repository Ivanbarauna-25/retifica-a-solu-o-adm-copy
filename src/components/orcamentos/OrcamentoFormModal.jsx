import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function OrcamentoFormModal({
  open,
  onOpenChange,
  onSaved,
  orcamento,
  clientes = [],
  funcionarios = [],
  veiculos = [],
  formasPagamento = [],
  condicoesPagamento = [],
}) {
  const { toast } = useToast();
  const isEdit = Boolean(orcamento?.id);

  // Defaults seguros
  const initialState = useMemo(
    () => ({
      numero_orcamento: orcamento?.numero_orcamento || "",
      data_orcamento: orcamento?.data_orcamento || new Date().toISOString().slice(0, 10),
      contato_id: orcamento?.contato_id || orcamento?.cliente_id || "",
      vendedor_id: orcamento?.vendedor_id || "",
      veiculo_id: orcamento?.veiculo_id || "",
      forma_pagamento_id: orcamento?.forma_pagamento_id || orcamento?.forma_id || "",
      condicao_pagamento_id: orcamento?.condicao_pagamento_id || orcamento?.condicao_id || "",
      valor_total: orcamento?.valor_total ?? 0,
      status: orcamento?.status || "pendente",
      observacoes: orcamento?.observacoes || "",
    }),
    [orcamento]
  );

  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);

  // Sempre que abrir/editar, reseta o form para o registro atual
  useEffect(() => {
    if (open) setForm(initialState);
  }, [open, initialState]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => onOpenChange?.(false);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validações mínimas (ajuste conforme sua regra)
      if (!form.data_orcamento) throw new Error("Informe a data do orçamento.");
      if (!form.contato_id) throw new Error("Selecione o cliente.");

      const payload = {
        numero_orcamento: form.numero_orcamento || undefined,
        data_orcamento: form.data_orcamento,
        contato_id: form.contato_id,
        vendedor_id: form.vendedor_id || null,
        veiculo_id: form.veiculo_id || null,
        valor_total: Number(form.valor_total || 0),
        status: form.status || "pendente",
        observacoes: form.observacoes || "",
        forma_pagamento_id: form.forma_pagamento_id || null,
        condicao_pagamento_id: form.condicao_pagamento_id || null,
      };

      let saved;
      if (isEdit) {
        saved = await base44.entities.Orcamento.update(orcamento.id, payload);
      } else {
        saved = await base44.entities.Orcamento.create(payload);
      }

      toast({ title: "✅ Orçamento salvo com sucesso!" });
      onSaved?.(saved);
      onOpenChange?.(false);
    } catch (e) {
      toast({
        title: "❌ Não foi possível salvar",
        description: e?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-neutral-900 text-xl font-bold">
            {isEdit ? "Editar Orçamento" : "Novo Orçamento"}
          </DialogTitle>
          <DialogDescription className="text-neutral-700">
            Preencha os dados e salve. Você pode ajustar depois.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Número</Label>
            <Input
              value={form.numero_orcamento}
              onChange={(e) => setField("numero_orcamento", e.target.value)}
              placeholder="Ex: 10593"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={form.data_orcamento}
              onChange={(e) => setField("data_orcamento", e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label>Cliente</Label>
            <Select value={form.contato_id || ""} onValueChange={(v) => setField("contato_id", v)}>
              <SelectTrigger className="mt-1 bg-white">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Vendedor</Label>
            <Select value={form.vendedor_id || ""} onValueChange={(v) => setField("vendedor_id", v)}>
              <SelectTrigger className="mt-1 bg-white">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {funcionarios.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Veículo</Label>
            <Select value={form.veiculo_id || ""} onValueChange={(v) => setField("veiculo_id", v)}>
              <SelectTrigger className="mt-1 bg-white">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {veiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.modelo} {v.placa ? `(${v.placa})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Condição de Pagamento</Label>
            <Select value={form.condicao_pagamento_id || ""} onValueChange={(v) => setField("condicao_pagamento_id", v)}>
              <SelectTrigger className="mt-1 bg-white">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {condicoesPagamento.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={form.forma_pagamento_id || ""} onValueChange={(v) => setField("forma_pagamento_id", v)}>
              <SelectTrigger className="mt-1 bg-white">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map((fp) => (
                  <SelectItem key={fp.id} value={fp.id}>
                    {fp.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setField("status", v)}>
              <SelectTrigger className="mt-1 bg-white">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
                <SelectItem value="expirado">Expirado</SelectItem>
                <SelectItem value="convertido">Convertido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Valor Total</Label>
            <Input
              type="number"
              value={form.valor_total}
              onChange={(e) => setField("valor_total", e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setField("observacoes", e.target.value)}
              className="mt-1"
              rows={4}
              placeholder="Observações gerais..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={saving} className="gap-2">
            <X className="w-4 h-4" />
            Cancelar
          </Button>

          <Button type="button" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}