import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowDownCircle, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export default function BaixaModal({ open, onClose, contas = [], formas = [], onConfirm, prefill }) {
  const [dataBaixa, setDataBaixa] = useState(() => new Date().toISOString().slice(0, 10));
  const [contaId, setContaId] = useState("");
  const [formaId, setFormaId] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (open) {
      setDataBaixa(new Date().toISOString().slice(0, 10));
      setContaId(contas?.[0]?.id ? String(contas[0].id) : "");
      setFormaId(formas?.[0]?.id ? String(formas[0].id) : "");
      setObservacao("");
    }
  }, [open, contas, formas]);

  const valorFormatado = useMemo(() => {
    const v = Number(prefill?.valor || 0);
    return v ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
  }, [prefill?.valor]);

  const handleConfirm = () => {
    const payload = {
      movimentacao_id: prefill?.movimentacaoId,
      tipo_movimentacao: prefill?.tipoMovimentacao,
      data_baixa: dataBaixa,
      conta_bancaria_id: contaId || null,
      forma_pagamento_id: formaId || null,
      observacao: observacao || null,
      contato_tipo: prefill?.contatoTipo || null,
      contato_id: prefill?.contatoId || null,
      numero_documento: prefill?.numeroDocumento || null,
      valor_total: prefill?.valor || null
    };
    onConfirm?.(payload);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl modern-modal bg-white border-2 border-slate-800 shadow-2xl p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b border-slate-600">
          <div className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <ArrowDownCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Registrar Baixa</DialogTitle>
              <p className="text-sm text-slate-300">Confirme os detalhes do pagamento</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-slate-100/50 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-800 text-sm">Detalhes da Baixa</h3>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
                <div>
                  <Label className="text-xs font-bold text-slate-500 uppercase">Valor</Label>
                  <p className="text-lg font-bold text-slate-900">{valorFormatado}</p>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 uppercase">Documento</Label>
                  <p className="text-sm font-medium text-slate-900">{prefill?.numeroDocumento || "—"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Contato</Label>
                  <p className="text-sm font-medium text-slate-900">{prefill?.contatoNome || "—"}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-bold text-slate-900 mb-2">Data da Baixa</Label>
                <Input 
                  type="date" 
                  value={dataBaixa} 
                  onChange={(e) => setDataBaixa(e.target.value)}
                  className="modern-input text-black border border-slate-400 shadow-sm"
                />
              </div>

              <div>
                <Label className="text-sm font-bold text-slate-900 mb-2">Conta Bancária</Label>
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger className="modern-input text-black border border-slate-400 shadow-sm">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome || c.descricao || `Conta ${c.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-bold text-slate-900 mb-2">Forma de Pagamento</Label>
                <Select value={formaId} onValueChange={setFormaId}>
                  <SelectTrigger className="modern-input text-black border border-slate-400 shadow-sm">
                    <SelectValue placeholder="Selecione a forma" />
                  </SelectTrigger>
                  <SelectContent>
                    {formas.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.nome || `Forma ${f.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label className="text-sm font-bold text-slate-900 mb-2">Observação (opcional)</Label>
                <Input 
                  value={observacao} 
                  onChange={(e) => setObservacao(e.target.value)} 
                  placeholder="Adicione uma observação..."
                  className="modern-input text-black border border-slate-400 shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 bg-white px-6 pb-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-white text-slate-700 px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-50 gap-2 h-10"
          >
            <X className="w-4 h-4" /> Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="bg-slate-800 text-white px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-700 gap-2 h-10"
          >
            <CheckCircle2 className="w-4 h-4" /> Confirmar Baixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}