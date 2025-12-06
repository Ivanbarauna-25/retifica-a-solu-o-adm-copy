
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, FileDown, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/components/formatters";

const statusConfig = {
  pendente: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-green-100 text-green-800",
  rejeitado: "bg-red-100 text-red-800",
  expirado: "bg-gray-200 text-gray-800",
  convertido: "bg-blue-100 text-blue-800",
  cancelado: "bg-zinc-200 text-zinc-800 line-through",
};
const statusLabels = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  expirado: "Expirado",
  convertido: "Convertido",
  cancelado: "Cancelado",
};

export default function RelatorioOrcamentosComponent(props) {
  const {
    isOpen,
    onClose,
    orcamentos = [],
    filtros = {},
    despesasByOrcamento = {},
    incluirDespesas = false,
  } = props;

  // Disponibiliza helper para uso interno do componente
  const getDespesasTotais = (orcamento) => {
    const manuais = Number(orcamento?.outras_despesas) || 0;
    const lancadas = Number(despesasByOrcamento[orcamento?.id] || 0);
    return manuais + (incluirDespesas ? lancadas : 0);
  };

  const handleExportCSV = () => {
    if (!orcamentos.length) return;
    const headers = ["Número", "Data", "Cliente", "Vendedor", "Total Orçamento", "Despesas", "Total Geral", "Status"];
    const csv = [
      headers.join(";"),
      ...orcamentos.map((o) => {
        const totalDespesas = getDespesasTotais(o);
        const totalGeral = (o.valor_total || 0) + totalDespesas;
        return [
          o.numero_orcamento,
          formatDate(o.data_orcamento),
          o.contato_nome || "",
          o.vendedor_nome || "",
          o.valor_total != null ? o.valor_total.toFixed(2) : "0.00",
          totalDespesas.toFixed(2),
          totalGeral.toFixed(2),
          statusLabels[o.status] || o.status,
        ].join(";");
      }),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `relatorio_orcamentos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle>Relatório de Orçamentos</DialogTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
            <Button size="sm" onClick={handleExportCSV}>
              <FileDown className="w-4 h-4" /> CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {filtros && Object.keys(filtros).length > 0 && (
          <div className="text-xs text-gray-500 mb-2">
            <p>
              Filtros: {Object.entries(filtros).map(([k, v]) => `${k}: ${v}`).join(" | ")}
            </p>
          </div>
        )}

        <Table>
          <TableHeader className="bg-slate-800 text-white">
            <TableRow>
              <TableHead className="text-white">Nº</TableHead>
              <TableHead className="text-white">Data</TableHead>
              <TableHead className="text-white">Cliente</TableHead>
              <TableHead className="text-white">Vendedor</TableHead>
              <TableHead className="text-white">Total Orçamento</TableHead>
              <TableHead className="text-white">Despesas</TableHead>
              <TableHead className="text-white">Total Geral</TableHead>
              <TableHead className="text-white">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orcamentos.map((o, i) => {
              const totalDespesas = getDespesasTotais(o);
              const totalGeral = (o.valor_total || 0) + totalDespesas;
              return (
                <TableRow key={o.id || i}>
                  <TableCell>{o.numero_orcamento}</TableCell>
                  <TableCell>{formatDate(o.data_orcamento)}</TableCell>
                  <TableCell>{o.contato_nome || "N/A"}</TableCell>
                  <TableCell>{o.vendedor_nome || "N/A"}</TableCell>
                  <TableCell>{formatCurrency(o.valor_total || 0)}</TableCell>
                  <TableCell>{formatCurrency(totalDespesas)}</TableCell>
                  <TableCell>{formatCurrency(totalGeral)}</TableCell>
                  <TableCell>
                    <Badge className={statusConfig[o.status]}>{statusLabels[o.status]}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
