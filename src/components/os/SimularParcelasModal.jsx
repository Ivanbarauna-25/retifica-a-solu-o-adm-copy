// ❌ ARQUIVO DEPRECADO - NÃO USAR
// Este modal foi substituído por FinancialMovementGeneratorModal
// Mantido apenas para compatibilidade temporária

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function SimularParcelasModal({ isOpen, onClose }) {
  return (
    <Dialog open={!!isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            Modal Deprecado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <p className="text-slate-700">
            Este modal foi descontinuado e substituído pelo novo sistema de geração de movimentação financeira.
          </p>
          <p className="text-slate-600 text-sm">
            Use o botão "Gerar Movimentação Financeira" na aba Financeiro do formulário de OS.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Entendi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}