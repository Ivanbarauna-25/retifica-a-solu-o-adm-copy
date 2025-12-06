import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function AdvancedFilters({ isOpen, onClose, onApply, funcionarios = [] }) {
  const [f, setF] = useState({
    funcionarioId: "todos",
    status: "todos",
    competencia: "",
    dataInicio: "",
    dataFim: "",
    valorMin: "",
    valorMax: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    setF((prev) => ({ ...prev }));
  }, [isOpen]);

  const setField = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const canApply = useMemo(() => true, [f]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl modern-modal">
        <DialogHeader className="modern-modal-header">
          <DialogTitle>Filtros Avançados</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Funcionário</Label>
              <Select value={f.funcionarioId} onValueChange={(v) => setField("funcionarioId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="todos">Todos</SelectItem>
                  {funcionarios.map((x) => (
                    <SelectItem key={x.id} value={String(x.id)}>{x.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setField("status", v)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Competência (AAAA-MM)</Label>
              <Input type="month" value={f.competencia} onChange={(e) => setField("competencia", e.target.value)} />
            </div>

            <div>
              <Label>Data início</Label>
              <Input type="date" value={f.dataInicio} onChange={(e) => setField("dataInicio", e.target.value)} />
            </div>

            <div>
              <Label>Data fim</Label>
              <Input type="date" value={f.dataFim} onChange={(e) => setField("dataFim", e.target.value)} />
            </div>

            <div>
              <Label>Valor mín.</Label>
              <Input type="number" step="0.01" value={f.valorMin} onChange={(e) => setField("valorMin", e.target.value)} />
            </div>

            <div>
              <Label>Valor máx.</Label>
              <Input type="number" step="0.01" value={f.valorMax} onChange={(e) => setField("valorMax", e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button disabled={!canApply} onClick={() => onApply && onApply({ ...f })}>Aplicar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}