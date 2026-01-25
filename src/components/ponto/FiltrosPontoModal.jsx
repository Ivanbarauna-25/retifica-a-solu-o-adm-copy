// components/ponto/FiltrosPontoModal.jsx
import React from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FiltrosPontoModal({
  open,
  onClose,
  filtros,
  setFiltros,
  funcionarios
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>Filtros do Ponto</DialogHeader>

        <div className="space-y-3">
          <Select
            value={filtros.funcionarioId || ""}
            onValueChange={v =>
              setFiltros({ ...filtros, funcionarioId: v || null })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os funcionários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {funcionarios.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filtros.dataInicio}
            onChange={e =>
              setFiltros({ ...filtros, dataInicio: e.target.value })
            }
          />

          <Input
            type="date"
            value={filtros.dataFim}
            onChange={e =>
              setFiltros({ ...filtros, dataFim: e.target.value })
            }
          />

          <Button onClick={onClose} className="w-full">
            Aplicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}