import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RelatorioOcorrenciasPontoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const filtros = location.state?.filtros || {};
  
  const [ocorrencias, setOcorrencias] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ocorrenciasData, funcsData, configData] = await Promise.all([
        base44.entities.OcorrenciaPonto.list("-data", 1000),
        base44.entities.Funcionario.list(),
        base44.entities.Configuracoes.list()
      ]);

      let ocorrenciasFiltradas = ocorrenciasData || [];

      // Aplicar filtros
      if (filtros.funcionario && filtros.funcionario !== "todos") {
        ocorrenciasFiltradas = ocorrenciasFiltradas.filter(o => o.funcionario_id === filtros.funcionario);
      }

      if (filtros.dataInicio) {
        ocorrenciasFiltradas = ocorrenciasFiltradas.filter(o => o.data >= filtros.dataInicio);
      }

      if (filtros.dataFim) {
        ocorrenciasFiltradas = ocorrenciasFiltradas.filter(o => o.data <= filtros.dataFim);
      }

      if (filtros.tipo && filtros.tipo !== "todos") {
        ocorrenciasFiltradas = ocorrenciasFiltradas.filter(o => o.tipo === filtros.tipo);
      }

      setOcorrencias(ocorrenciasFiltradas);
      setFuncionarios(funcsData || []);
      setConfig((configData && configData[0]) || null);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFuncionarioNome = (funcionarioId) => {
    const func = funcionarios.find(f => f.id === funcionarioId);
    return func?.nome || "-";
  };

  const formatarData = (data) => {
    if (!data) return "-";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const handleImprimir = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando relatório...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="min-h-screen bg-white">
        {/* Botões de ação */}
        <div className="no-print bg-slate-800 px-4 py-3 flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)} className="bg-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handleImprimir} className="bg-white text-slate-800 hover:bg-slate-100">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>

        {/* Documento */}
        <div className="max-w-[1000px] mx-auto p-8">
          {/* Cabeçalho */}
          <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              RELATÓRIO DE OCORRÊNCIAS DE PONTO
            </h1>
            {config?.nome_empresa && (
              <p className="text-lg text-slate-700">{config.nome_empresa}</p>
            )}
            <p className="text-sm text-slate-600 mt-2">
              Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>

          {/* Filtros aplicados */}
          <div className="mb-6 bg-slate-50 p-4 rounded-lg">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Filtros Aplicados:</h3>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div>
                <strong>Funcionário:</strong> {filtros.funcionario === "todos" ? "Todos" : getFuncionarioNome(filtros.funcionario)}
              </div>
              <div>
                <strong>Tipo:</strong> {filtros.tipo === "todos" ? "Todos" : (filtros.tipo || "Todos")}
              </div>
              <div>
                <strong>Período:</strong> {filtros.dataInicio ? formatarData(filtros.dataInicio) : "Sem início"} até {filtros.dataFim ? formatarData(filtros.dataFim) : "Sem fim"}
              </div>
              <div>
                <strong>Total:</strong> {ocorrencias.length} ocorrência(s)
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Funcionário</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Data</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Descrição</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {ocorrencias.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma ocorrência encontrada com os filtros aplicados
                    </td>
                  </tr>
                ) : (
                  ocorrencias.map((ocorrencia, idx) => (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {getFuncionarioNome(ocorrencia.funcionario_id)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-900 font-mono">
                        {formatarData(ocorrencia.data)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          ocorrencia.tipo === "atestado" ? "bg-purple-100 text-purple-700" :
                          ocorrencia.tipo === "abonado" ? "bg-green-100 text-green-700" :
                          ocorrencia.tipo === "folga" ? "bg-blue-100 text-blue-700" :
                          ocorrencia.tipo === "ferias" ? "bg-cyan-100 text-cyan-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {ocorrencia.tipo?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {ocorrencia.descricao || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          ocorrencia.status === "aprovado" ? "bg-green-100 text-green-700" :
                          ocorrencia.status === "pendente" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {ocorrencia.status?.toUpperCase() || "PENDENTE"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Rodapé */}
          <div className="mt-8 pt-6 border-t border-slate-300 text-center text-sm text-slate-600">
            <p>Documento gerado automaticamente pelo sistema de gestão</p>
            {config?.nome_empresa && <p className="mt-1">{config.nome_empresa}</p>}
          </div>
        </div>
      </div>
    </>
  );
}