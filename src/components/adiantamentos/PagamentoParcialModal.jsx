import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, X, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";

export default function PagamentoParcialModal({ isOpen, onClose, adiantamento, funcionarios = [], onSaved }) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState("");

  const funcionarioNome = useMemo(() => {
    const f = funcionarios.find((x) => String(x.id) === String(adiantamento?.funcionario_id));
    return f?.nome || "-";
  }, [funcionarios, adiantamento]);

  const canSave = valor !== "" && Number(String(valor).replace(",", ".")) > 0 && !!data;

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const valorNumber = Number(String(valor).replace(",", "."));
    
    try {
      // Somar ao valor já pago anteriormente
      const valorPagoAnterior = Number(adiantamento.valor_pago) || 0;
      const novoValorPago = valorPagoAnterior + valorNumber;
      const valorRestante = Number(adiantamento.valor) - novoValorPago;
      
      // Determinar novo status
      const novoStatus = valorRestante <= 0 ? 'pago' : 'aprovado';
      
      await base44.entities.Adiantamento.update(adiantamento.id, {
        status: novoStatus,
        data_pagamento: data,
        valor_pago: novoValorPago,
        observacoes: observacao || adiantamento.observacoes
      });
      
      onClose();
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Erro ao salvar pagamento parcial:', error);
      alert('Erro ao salvar pagamento parcial: ' + error.message);
    }
  };

  return (
    <>
      <style>{`
        .pagamento-parcial-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .pagamento-parcial-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .pagamento-parcial-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .pagamento-parcial-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .pagamento-parcial-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .pagamento-parcial-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .pagamento-parcial-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .pagamento-parcial-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .pagamento-parcial-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .pagamento-parcial-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-md h-auto max-h-[90vh] overflow-hidden modern-modal bg-white border-2 border-slate-800 shadow-2xl flex flex-col p-0" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 border-b border-slate-600">
            <DialogTitle className="flex items-center gap-3 text-white text-lg font-bold">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              Pagamento Parcial
            </DialogTitle>
          </DialogHeader>

          <div className="pagamento-parcial-scroll flex-1 px-6 pb-6 pt-4">
            <form onSubmit={handleSave} className="space-y-3 mt-4">
              <div>
                <Label className="text-sm font-medium text-black">Funcionário</Label>
                <div className="text-sm text-black mt-1.5">{funcionarioNome}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-black">Data</Label>
                  <Input 
                    type="date" 
                    value={data} 
                    onChange={(e) => setData(e.target.value)} 
                    required 
                    className="bg-white text-black mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-black">Valor parcial</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    required
                    className="bg-white text-black mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-black">Observação</Label>
                <Textarea
                  placeholder="Inclua detalhes, se necessário"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="bg-white text-black mt-1.5"
                />
              </div>
            </form>
          </div>

          <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!canSave}
              onClick={handleSave}
              className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
            >
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}