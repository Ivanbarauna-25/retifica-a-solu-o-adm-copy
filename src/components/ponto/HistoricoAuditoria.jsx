import React from "react";
import { Info } from "lucide-react";

export default function HistoricoAuditoria({ registro }) {
  if (!registro) return null;

  const formatarData = (data) => {
    if (!data) return "-";
    try {
      const d = new Date(data);
      return d.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return data;
    }
  };

  const obterEmailUsuario = (email) => {
    if (!email) return "Sistema";
    return email.split('@')[0];
  };

  return (
    <div className="inline-flex items-center gap-1">
      <div className="relative group cursor-help">
        <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 transition" />
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-slate-900 text-white text-xs rounded-lg p-2 whitespace-nowrap shadow-lg z-50">
          <div className="mb-1">
            <strong>Criado em:</strong> {formatarData(registro.created_date)}
          </div>
          <div className="mb-1">
            <strong>Por:</strong> {obterEmailUsuario(registro.created_by)}
          </div>
          {registro.updated_date && (
            <>
              <div className="mb-1 border-t border-slate-700 pt-1">
                <strong>Alterado em:</strong> {formatarData(registro.updated_date)}
              </div>
            </>
          )}
          <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-700 pt-1">
            ID: {registro.id?.substring(0, 8)}...
          </div>
        </div>
      </div>
    </div>
  );
}