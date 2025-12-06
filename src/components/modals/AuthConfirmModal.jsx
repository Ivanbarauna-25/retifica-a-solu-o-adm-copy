import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export default function AuthConfirmModal({ open, onClose, onConfirm, action }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [motivo, setMotivo] = useState("");

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl shadow-xl modern-modal">
        <div className="p-6 bg-gradient-to-r from-[#0A0F1A] to-[#1E2A3A] text-white border-b border-slate-700 modern-modal-header">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">
              Autenticação - {action === "excluir" ? "Exclusão" : "Cancelamento"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10" aria-label="Fechar">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <DialogDescription className="text-slate-300 mt-1">
            Informe suas credenciais e descreva o motivo para prosseguir.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <Label>Usuário</Label>
            <Input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Digite o usuário"
              className="modern-input"
            />
          </div>
          <div>
            <Label>Senha</Label>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              className="modern-input"
            />
          </div>
          <div>
            <Label>Motivo</Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da ação"
              className="modern-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onConfirm?.({ usuario, senha, motivo });
                onClose?.();
              }}
              className={action === "excluir" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}