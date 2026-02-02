import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import EspelhoPontoDoc from "@/components/ponto/EspelhoPontoDoc";
import { Printer } from "lucide-react";

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

  const handleImprimir = () => {
    window.print();
  };

  if (!dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-slate-600">Carregando documento...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 12mm; }
          body { margin: 0; padding: 0; }
          * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        @media screen {
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            transition: all 0.2s;
          }
          .print-button:hover {
            background: #1d4ed8;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
          }
          .print-button:active {
            transform: translateY(0);
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-white">
        <button 
          onClick={handleImprimir} 
          className="print-button no-print"
          aria-label="Imprimir documento"
        >
          <Printer className="w-5 h-5" />
          Imprimir
        </button>
        
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
    </>
  );
}