import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Download, Copy, Trash2, Eye } from "lucide-react";
import { formatCurrency } from "@/components/formatters";
import { motion } from "framer-motion";

export default function BulkActionsBar({ 
  selecionados, 
  totalSelecionados, 
  onAprovar, 
  onRejeitar,
  onExcluir,
  onVisualizarTodos,
  onExportar,
  isProcessing 
}) {
  if (selecionados.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gradient-to-r from-blue-50 to-slate-50 border-l-4 border-blue-500 rounded-lg p-3 md:p-4 mb-3 md:mb-4 shadow-md"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500 text-white px-2.5 py-1 rounded-full text-xs font-bold">
            {selecionados.length} selecionados
          </div>
          <span className="text-sm font-semibold text-slate-700">
            {formatCurrency(totalSelecionados)}
          </span>
        </div>

        <div className="flex flex-wrap gap-1 md:gap-2">
          <Button
            size="sm"
            onClick={onVisualizarTodos}
            disabled={isProcessing}
            className="bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs h-7 md:h-8 px-2 md:px-3 gap-1"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden md:inline">Visualizar</span>
          </Button>

          <Button
            size="sm"
            onClick={onAprovar}
            disabled={isProcessing}
            className="bg-green-100 text-green-700 hover:bg-green-200 text-xs h-7 md:h-8 px-2 md:px-3 gap-1"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span className="hidden md:inline">Aprovar</span>
          </Button>

          <Button
            size="sm"
            onClick={onRejeitar}
            disabled={isProcessing}
            className="bg-red-100 text-red-700 hover:bg-red-200 text-xs h-7 md:h-8 px-2 md:px-3 gap-1"
          >
            <XCircle className="w-3 h-3" />
            <span className="hidden md:inline">Rejeitar</span>
          </Button>

          <Button
            size="sm"
            onClick={onExportar}
            disabled={isProcessing}
            className="bg-amber-100 text-amber-700 hover:bg-amber-200 text-xs h-7 md:h-8 px-2 md:px-3 gap-1"
          >
            <Download className="w-3 h-3" />
            <span className="hidden md:inline">Exportar</span>
          </Button>

          <Button
            size="sm"
            onClick={onExcluir}
            disabled={isProcessing}
            variant="destructive"
            className="text-xs h-7 md:h-8 px-2 md:px-3 gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden md:inline">Excluir</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}