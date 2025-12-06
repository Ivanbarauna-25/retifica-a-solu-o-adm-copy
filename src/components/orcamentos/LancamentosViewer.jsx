import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DespesaOrcamento } from "@/entities/DespesaOrcamento";
import { TipoDespesaOrcamento } from "@/entities/TipoDespesaOrcamento";
import { formatCurrency, formatDate } from "@/components/formatters";

export default function LancamentosViewer({ isOpen, onClose, orcamento, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [tipos, setTipos] = useState([]);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null => nenhum; {} => novo; {record} => editando

  const orcId = orcamento?.id;

  const fetchAll = async () => {
    if (!orcId) return;
    setLoading(true);
    try {
      const [ts, ds] = await Promise.all([
        TipoDespesaOrcamento.list(),
        DespesaOrcamento.filter({ orcamento_id: orcId }, "-data"),
      ]);
      setTipos(ts || []);
      setItems(ds || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orcId) fetchAll();
    if (!isOpen) {
      setEditing(null);
    }
  }, [isOpen, orcId]);

  const tipoNome = (id) => tipos.find((t) => t.id === id)?.nome || "—";

  const startNew = () => {
    setEditing({
      id: null,
      tipo_despesa_id: "",
      descricao: "",
      valor: "",
      data: new Date().toISOString().split("T")[0],
    });
  };

  const startEdit = (rec) => {
    setEditing({
      id: rec.id,
      tipo_despesa_id: rec.tipo_despesa_id || "",
      descricao: rec.descricao || "",
      valor: Number(rec.valor || 0),
      data: rec.data || new Date().toISOString().split("T")[0],
    });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    const payload = {
      orcamento_id: orcId,
      tipo_despesa_id: editing.tipo_despesa_id,
      descricao: editing.descricao || "",
      valor: Number(editing.valor || 0),
      data: editing.data,
    };
    if (editing.id) {
      await DespesaOrcamento.update(editing.id, payload);
    } else {
      await DespesaOrcamento.create(payload);
    }
    setEditing(null);
    await fetchAll();
    onUpdated && onUpdated();
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Deseja excluir este lançamento?")) return;
    await DespesaOrcamento.delete(id);
    await fetchAll();
    onUpdated && onUpdated();
  };

  const total = useMemo(
    () => (items || []).reduce((acc, it) => acc + (Number(it.valor) || 0), 0),
    [items]
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Lançamentos do Orçamento {orcamento?.numero_orcamento || ""}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">
            Total: <strong>{formatCurrency(total)}</strong>
          </div>
          <Button onClick={startNew} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar Lançamento
          </Button>
        </div>

        {editing && (
          <div className="border rounded-md p-3 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select
                value={editing.tipo_despesa_id || ""}
                onValueChange={(v) => setEditing((e) => ({ ...e, tipo_despesa_id: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                value={editing.data || ""}
                onChange={(e) => setEditing((p) => ({ ...p, data: e.target.value }))}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={editing.valor}
                onChange={(e) => setEditing((p) => ({ ...p, valor: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="md:col-span-4">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={editing.descricao}
                onChange={(e) => setEditing((p) => ({ ...p, descricao: e.target.value }))}
                className="h-9"
                placeholder="Opcional"
              />
            </div>
            <div className="flex gap-2 md:col-span-4 justify-end">
              <Button variant="outline" onClick={cancelEdit}>
                Cancelar
              </Button>
              <Button onClick={saveEdit}>Salvar</Button>
            </div>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-800">
              <TableRow>
                <TableHead className="text-white">Data</TableHead>
                <TableHead className="text-white">Tipo</TableHead>
                <TableHead className="text-white">Descrição</TableHead>
                <TableHead className="text-white text-right">Valor</TableHead>
                <TableHead className="text-white text-center w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (items || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhum lançamento.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{formatDate(it.data)}</TableCell>
                    <TableCell>{tipoNome(it.tipo_despesa_id)}</TableCell>
                    <TableCell className="max-w-sm truncate">{it.descricao || "—"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(it.valor || 0)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="sm" title="Editar" onClick={() => startEdit(it)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Excluir"
                          onClick={() => deleteItem(it.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}