import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Trash2, Receipt, X } from "lucide-react";

export default function BulkActionsBar({ selectedIds = [], onClear, onMarkPaid, onDelete, onGenerateMovimentacao }) {
  if (!selectedIds.length) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded-full px-4 py-2 flex items-center gap-2 z-40">
      <Badge variant="secondary">{selectedIds.length} selecionado(s)</Badge>
      <Button size="sm" variant="outline" onClick={onMarkPaid}><CheckCircle2 className="w-4 h-4 mr-1" /> Marcar como Pago</Button>
      <Button size="sm" variant="outline" onClick={onGenerateMovimentacao}><Receipt className="w-4 h-4 mr-1" /> Gerar Movimentação</Button>
      <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 className="w-4 h-4 mr-1" /> Excluir</Button>
      <Button size="sm" variant="ghost" onClick={onClear}><X className="w-4 h-4 mr-1" /> Limpar</Button>
    </div>
  );
}