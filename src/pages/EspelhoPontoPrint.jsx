import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams } from "react-router-dom";
import EspelhoPontoDoc from "@/components/ponto/EspelhoPontoDoc.jsx";
import { Loader2 } from "lucide-react";

export default function EspelhoPontoPrint() {
  const [searchParams] = useSearchParams();
  const funcionarioId = searchParams.get('funcionario');
  const dataInicio = searchParams.get('inicio');
  const dataFim = searchParams.get('fim');

  const [dados, setDados] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!funcionarioId || !dataInicio || !dataFim) {
        setIsLoading(false);
        return;
      }

      try {
        const [
          funcionario,
          registros,
          ocorrencias,
          configuracoes,
          escalas,
          funcionariosEscalas,
          cargos,
          departamentos
        ] = await Promise.all([
          base44.entities.Funcionario.get(funcionarioId),
          base44.entities.PontoRegistro.filter({
            funcionario_id: funcionarioId
          }, "-data_hora", 2000),
          base44.entities.OcorrenciaPonto.filter({
            funcionario_id: funcionarioId
          }, "-data", 1000),
          base44.entities.Configuracoes.list().then(r => r?.[0]),
          base44.entities.EscalaTrabalho.list(),
          base44.entities.FuncionarioEscala.list(),
          base44.entities.Cargo.list(),
          base44.entities.Departamento.list()
        ]);

        // Filtrar registros por data
        const registrosFiltrados = (registros || []).filter(reg => {
          if (!reg.data_hora) return false;
          const data = reg.data_hora.substring(0, 10);
          return data >= dataInicio && data <= dataFim;
        });

        const ocorrenciasFiltradas = (ocorrencias || []).filter(ocor => {
          return ocor.data >= dataInicio && ocor.data <= dataFim;
        });

        const cargosMap = (cargos || []).reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
        const departamento = departamentos.find(d => d.id === funcionario?.departamento_id);
        const departamentoResponsavel = departamento?.responsavel_id
          ? (await base44.entities.Funcionario.get(departamento.responsavel_id))
          : null;

        setDados({
          funcionario,
          registros: registrosFiltrados,
          ocorrencias: ocorrenciasFiltradas,
          dataInicio,
          dataFim,
          configuracoes,
          escalas,
          funcionariosEscalas,
          cargos: cargosMap,
          departamento,
          departamentoResponsavel
        });

        // Auto print após carregar
        setTimeout(() => {
          window.print();
        }, 500);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [funcionarioId, dataInicio, dataFim]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando espelho de ponto...</p>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-slate-600">Dados não encontrados</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          @page { margin: 15mm 12mm; }
        }
      `}</style>
      <EspelhoPontoDoc {...dados} />
    </>
  );
}