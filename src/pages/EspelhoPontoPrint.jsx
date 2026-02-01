import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import EspelhoPontoDoc from "@/components/ponto/EspelhoPontoDoc";

export default function EspelhoPontoPrintPage() {
  const location = useLocation();
  const [dados, setDados] = useState(null);

  useEffect(() => {
    // Recuperar dados do state ou de sessionStorage (fallback)
    if (location.state) {
      setDados(location.state);
    } else {
      const stored = sessionStorage.getItem("espelhoPontoPrint");
      if (stored) {
        setDados(JSON.parse(stored));
        sessionStorage.removeItem("espelhoPontoPrint");
      }
    }
  }, [location]);

  // Auto-trigger impressão após carregar
  useEffect(() => {
    if (dados) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [dados]);

  if (!dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-slate-600">Carregando documento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 12mm; }
          body { margin: 0; padding: 0; }
          * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
      
      <EspelhoPontoDoc
        funcionario={dados.funcionario}
        dataInicio={dados.dataInicio}
        dataFim={dados.dataFim}
        registros={dados.registros}
        ocorrencias={dados.ocorrencias}
        configuracoes={dados.configuracoes}
        escalas={dados.escalas}
        funcionariosEscalas={dados.funcionariosEscalas}
        cargos={dados.cargos}
        departamentoResponsavel={dados.departamentoResponsavel}
      />
    </div>
  );
}