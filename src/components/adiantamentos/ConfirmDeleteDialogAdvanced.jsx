import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDeleteDialogAdvanced({ isOpen, onClose, onConfirm, count = 0 }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Confirmar exclusão
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <p>Tem certeza que deseja excluir {count} registro(s) selecionado(s)? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button variant="destructive" onClick={onConfirm}>Excluir</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}