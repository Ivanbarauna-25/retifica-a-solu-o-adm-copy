import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Ban, Wallet, Receipt, X, FileText } from "lucide-react";
import { Adiantamento } from "@/entities/Adiantamento";
// import GerarMovimentacaoModal from "@/components/adiantamentos/GerarMovimentacaoModal";
import { formatCurrency } from "@/components/formatters";

const statusColors = {
  pendente: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-blue-100 text-blue-800",
  reprovado: "bg-red-100 text-red-800",
  cancelado: "bg-gray-100 text-gray-800",
  pago: "bg-green-100 text-green-800"
};

export default function AdiantamentoViewer({
  isOpen,
  onClose,
  adiantamento,
  funcionarios = [],
  planos = [],
  onUpdated,
  onOpenFinanceiro,
  onOpenPagamentoParcial
}) {
  const funcionarioNome = useMemo(() => {
    const f = funcionarios.find((x) => String(x.id) === String(adiantamento?.funcionario_id));
    return f?.nome || "-";
  }, [funcionarios, adiantamento]);

  const planoNome = useMemo(() => {
    const p = planos.find((x) => String(x.id) === String(adiantamento?.plano_contas_id));
    return p ? p.codigo ? `${p.codigo} - ${p.nome}` : p.nome : "-";
  }, [planos, adiantamento]);

  const setStatus = async (novoStatus) => {
    await Adiantamento.update(adiantamento.id, { status: novoStatus });
    if (onUpdated) onUpdated();
  };

  const handleGenerateReceipt = () => {
    const funcionario = funcionarios.find((x) => String(x.id) === String(adiantamento?.funcionario_id));
    const funcionarioNome = funcionario?.nome || "-";
    const hoje = new Date();
    const valor = (adiantamento?.valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const dataAd = adiantamento?.data_adiantamento || "-";
    const motivo = adiantamento?.motivo || "-";
    const status = adiantamento?.status || "-";

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Recibo de Adiantamento</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; margin: 24px; color: #0f172a; }
  h1 { margin: 0 0 8px 0; font-size: 18px; color: #111827; }
  .sub { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
  .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .row { display: flex; justify-content: space-between; margin: 6px 0; }
  .label { color: #64748b; font-size: 12px; }
  .val { font-weight: 600; }
  .footer { margin-top: 24px; font-size: 12px; color: #6b7280; text-align: center; }
  .line { height: 1px; background: #e5e7eb; margin: 12px 0; }
  @media print {
    @page { size: A4 portrait; margin: 1.5cm; }
    button { display: none; }
  }
  .print-btn { margin-top: 12px; padding: 8px 12px; border: 1px solid #111827; border-radius: 6px; background: #111827; color: #fff; cursor: pointer; }
</style>
</head>
<body>
  <h1>Recibo de Adiantamento</h1>
  <div class="sub">Emitido em ${hoje.toLocaleString("pt-BR")}</div>

  <div class="box">
    <div class="row"><span class="label">ID</span><span class="val">${adiantamento?.id || "-"}</span></div>
    <div class="row"><span class="label">Funcionário</span><span class="val">${funcionarioNome}</span></div>
    <div class="row"><span class="label">Data do adiantamento</span><span class="val">${dataAd}</span></div>
    <div class="row"><span class="label">Valor</span><span class="val">${valor}</span></div>
    <div class="row"><span class="label">Status</span><span class="val">${status}</span></div>
  </div>

  <div class="box">
    <div class="label">Motivo</div>
    <div class="val">${motivo}</div>
  </div>

  <div class="line"></div>
  <div class="footer">Assinatura do responsável: ________________________________</div>

  <button class="print-btn" onclick="window.print()">Imprimir</button>
</body>
</html>
    `.trim();

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    const onLoad = () => {
      try {w.focus();w.print();} catch (_) {}
    };
    w.addEventListener("load", onLoad);
  };

  return (
    <>
      <style>{`
        .adiantamento-viewer-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .adiantamento-viewer-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .adiantamento-viewer-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .adiantamento-viewer-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .adiantamento-viewer-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .adiantamento-viewer-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .adiantamento-viewer-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .adiantamento-viewer-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .adiantamento-viewer-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .adiantamento-viewer-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-2xl h-auto max-h-[90vh] overflow-hidden modern-modal bg-white border-2 border-slate-800 shadow-2xl flex flex-col p-0" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 border-b border-slate-600">
            <div className="w-full flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-white text-lg font-bold">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                Visualização de Adiantamento
              </DialogTitle>

              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Aprovar" 
                  onClick={() => setStatus("aprovado")}
                  className="bg-slate-600 hover:bg-slate-700 text-white h-10 w-10"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Reprovar" 
                  onClick={() => setStatus("reprovado")}
                  className="bg-slate-600 hover:bg-slate-700 text-white h-10 w-10"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Cancelar" 
                  onClick={() => setStatus("cancelado")}
                  className="bg-slate-600 hover:bg-slate-700 text-white h-10 w-10"
                >
                  <Ban className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title={adiantamento?.movimentacao_financeira_id ? "Movimentação já gerada" : "Gerar Financeiro"} 
                  onClick={() => onOpenFinanceiro && onOpenFinanceiro(adiantamento)}
                  disabled={!!adiantamento?.movimentacao_financeira_id}
                  className={`h-10 w-10 ${adiantamento?.movimentacao_financeira_id ? 'bg-slate-500 opacity-50 cursor-not-allowed' : 'bg-slate-600 hover:bg-slate-700'} text-white`}
                >
                  <Wallet className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Pagamento parcial" 
                  onClick={() => onOpenPagamentoParcial && onOpenPagamentoParcial(adiantamento)}
                  className="bg-slate-600 hover:bg-slate-700 text-white h-10 w-10"
                >
                  <Receipt className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Gerar recibo" 
                  onClick={handleGenerateReceipt}
                  className="bg-slate-600 hover:bg-slate-700 text-white h-10 w-10"
                >
                  <FileText className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Fechar" 
                  onClick={onClose}
                  className="bg-slate-600 hover:bg-slate-700 text-white h-10 w-10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="adiantamento-viewer-scroll flex-1 px-6 pb-6 pt-4">
            <Card className="border-2 border-slate-200 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-black">Funcionário</div>
                    <div className="font-medium text-black">{funcionarioNome}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-black">Plano de Contas</div>
                    <div className="font-medium text-black">{planoNome}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-black">Valor</div>
                    <div className="font-semibold text-black">{formatCurrency(adiantamento?.valor)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-black">Status</div>
                    <Badge className={statusColors[adiantamento?.status] || "bg-slate-100 text-slate-800"}>
                      {adiantamento?.status}
                    </Badge>
                  </div>
                </div>

                {adiantamento?.motivo &&
                <div className="pt-2">
                    <div className="text-sm text-black mb-1">Motivo</div>
                    <div className="text-black">{adiantamento.motivo}</div>
                  </div>
                }
              </CardContent>
            </Card>
          </div>




        </DialogContent>
      </Dialog>
    </>
  );
}