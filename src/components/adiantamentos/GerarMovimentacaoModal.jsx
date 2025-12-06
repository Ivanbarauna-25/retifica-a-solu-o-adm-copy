import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/components/formatters";
import { MovimentacaoFinanceira } from "@/entities/MovimentacaoFinanceira";
import { Adiantamento } from "@/entities/Adiantamento";
import { Loader2, Save, X } from "lucide-react";

export default function GerarMovimentacaoModal({ isOpen, itens = [], onClose, onGenerated }) {
  const total = useMemo(() => itens.reduce((acc, i) => acc + (Number(i?.valor) || 0), 0), [itens]);
  const [dataVencimento, setDataVencimento] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState("Movimentação referente a adiantamentos");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!itens.length) return;
    setLoading(true);
    try {
      for (const ad of itens) {
        // Verificação adicional de segurança
        if (ad.movimentacao_financeira_id) continue;

        const mov = await MovimentacaoFinanceira.create({
          tipo_movimentacao: "debito",
          data_faturamento: ad.data_adiantamento || new Date().toISOString().slice(0, 10),
          data_vencimento: dataVencimento || ad.data_adiantamento || new Date().toISOString().slice(0, 10),
          valor_total: Number(ad.valor) || 0,
          numero_documento: `ADI-${ad.id || Date.now()}`,
          descricao: `Adiantamento ${ad.competencia || ""}`.trim(),
          historico: observacao || "",
          contato_tipo: "funcionario",
          contato_id: ad.funcionario_id,
          origem: "folha_pagamento"
        });

        await Adiantamento.update(ad.id, {
          status: "pago",
          data_pagamento: new Date().toISOString().slice(0, 10),
          movimentacao_financeira_id: mov.id
        });
      }
      onGenerated && onGenerated();
      onClose && onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .gerar-movimentacao-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .gerar-movimentacao-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .gerar-movimentacao-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .gerar-movimentacao-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .gerar-movimentacao-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .gerar-movimentacao-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .gerar-movimentacao-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .gerar-movimentacao-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .gerar-movimentacao-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .gerar-movimentacao-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-2xl h-auto max-h-[90vh] overflow-hidden modern-modal bg-white border-2 border-slate-800 shadow-2xl flex flex-col p-0" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 border-b border-slate-600">
            <DialogTitle className="flex items-center gap-3 text-white text-lg font-bold">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Save className="w-5 h-5 text-white" />
              </div>
              Gerar Movimentações Financeiras
            </DialogTitle>
          </DialogHeader>

          <div className="gerar-movimentacao-scroll flex-1 px-6 pb-6 pt-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Itens selecionados</Label>
                <div className="h-12 px-4 flex items-center rounded-md border border-slate-300 bg-slate-50 text-slate-900 font-medium text-base">
                  {itens.length} item(s)
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Valor Total</Label>
                <div className="h-12 px-4 flex items-center rounded-md border border-slate-300 bg-slate-50 text-slate-900 font-bold text-lg">
                  {formatCurrency(total)}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Data de Vencimento</Label>
                <Input 
                  type="date" 
                  value={dataVencimento} 
                  onChange={(e) => setDataVencimento(e.target.value)} 
                  className="bg-white text-slate-900 border-slate-300 h-12 text-base focus:border-slate-500 focus:ring-slate-500"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-bold text-slate-700">Observação</Label>
                <Textarea 
                  value={observacao} 
                  onChange={(e) => setObservacao(e.target.value)} 
                  className="bg-white text-slate-900 border-slate-300 min-h-[120px] text-base resize-none focus:border-slate-500 focus:ring-slate-500"
                  placeholder="Digite uma observação para a movimentação..."
                />
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={loading}
              className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Gerar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}