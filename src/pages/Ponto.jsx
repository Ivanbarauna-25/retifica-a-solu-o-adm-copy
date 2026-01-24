// PontoPage.jsx
// SUBSTITUIR ESTE ARQUIVO INTEIRO

import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import CalendarioPonto from "@/components/ponto/CalendarioPonto";
import ImportarPontoModal from "@/components/ponto/ImportarPontoModal";
import HistoricoAuditoria from "@/components/ponto/HistoricoAuditoria";

export default function PontoPage() {
  const { toast } = useToast();

  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funcionariosEscalas, setFuncionariosEscalas] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isImportarOpen, setIsImportarOpen] = useState(false);

  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState("todos");
  const [dataSelecionada, setDataSelecionada] = useState(null);

  /* =========================
     CARREGAMENTO FRONT ONLY
     ========================= */
  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [
        funcs,
        regs,
        ocors,
        escs,
        funcEscs
      ] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.PontoRegistro.list("-data_hora", 5000),
        base44.entities.OcorrenciaPonto.list("-data", 3000),
        base44.entities.EscalaTrabalho.list(),
        base44.entities.FuncionarioEscala.list()
      ]);

      setFuncionarios(funcs || []);
      setRegistros(regs || []);
      setOcorrencias(ocors || []);
      setEscalas(escs || []);
      setFuncionariosEscalas(funcEscs || []);
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados do ponto",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  /* =========================
     GERAR MÊS COMPLETO
     ========================= */
  const mesAtual = useMemo(() => {
    if (!dataSelecionada) return new Date();
    return new Date(dataSelecionada + "T12:00:00");
  }, [dataSelecionada]);

  const diasDoMes = useMemo(() => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const total = new Date(ano, mes + 1, 0).getDate();

    const lista = [];
    for (let d = 1; d <= total; d++) {
      lista.push(
        `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      );
    }
    return lista;
  }, [mesAtual]);

  /* =========================
     MATRIZ FUNCIONÁRIO x DIA
     ========================= */
  const linhas = useMemo(() => {
    const funcionariosFiltrados =
      funcionarioSelecionado === "todos"
        ? funcionarios
        : funcionarios.filter(f => f.id === funcionarioSelecionado);

    const linhasGeradas = [];

    funcionariosFiltrados.forEach(func => {
      diasDoMes.forEach(data => {
        const batidas = registros
          .filter(r => {
            const dataReg = r.data || r.data_hora?.substring(0, 10);
            return r.funcionario_id === func.id && dataReg === data;
          })
          .sort((a, b) => {
            const hA = a.hora || a.data_hora?.substring(11, 19) || "";
            const hB = b.hora || b.data_hora?.substring(11, 19) || "";
            return hA.localeCompare(hB);
          });

        const ocorrencia = ocorrencias.find(
          o => o.funcionario_id === func.id && o.data === data
        );

        linhasGeradas.push({
          funcionario: func,
          data,
          batidas,
          ocorrencia
        });
      });
    });

    return linhasGeradas;
  }, [funcionarios, registros, ocorrencias, diasDoMes, funcionarioSelecionado]);

  /* =========================
     RENDER
     ========================= */
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6">
      {/* AÇÕES */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button onClick={() => setIsImportarOpen(true)}>
          Importar Ponto
        </Button>
      </div>

      {/* CALENDÁRIO */}
      <div className="mb-6">
        <CalendarioPonto
          registros={registros.map(r => ({
            data: r.data || r.data_hora?.substring(0, 10)
          }))}
          ocorrencias={ocorrencias}
          funcionarioSelecionado={funcionarioSelecionado}
          onDiaClicado={setDataSelecionada}
        />
      </div>

      {/* TABELA */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-3 py-2 text-left">Funcionário</th>
                <th className="px-3 py-2 text-center">Data</th>
                <th className="px-3 py-2 text-center">1ª</th>
                <th className="px-3 py-2 text-center">2ª</th>
                <th className="px-3 py-2 text-center">3ª</th>
                <th className="px-3 py-2 text-center">4ª</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, idx) => {
                const batidas = ["-", "-", "-", "-"];
                linha.batidas.slice(0, 4).forEach((b, i) => {
                  const h = b.hora || b.data_hora?.substring(11, 16);
                  batidas[i] = h || "-";
                });

                return (
                  <tr key={idx} className="border-b">
                    <td className="px-3 py-2">{linha.funcionario.nome}</td>
                    <td className="px-3 py-2 text-center">{linha.data}</td>

                    {batidas.map((b, i) => (
                      <td
                        key={i}
                        className={`px-3 py-2 text-center ${
                          b === "-" ? "text-red-600" : ""
                        }`}
                      >
                        {b}
                      </td>
                    ))}

                    <td className="px-3 py-2 text-center">
                      {linha.ocorrencia ? (
                        <span className="text-blue-700 font-semibold">
                          {linha.ocorrencia.tipo}
                        </span>
                      ) : linha.batidas.length === 0 ? (
                        <span className="text-red-600 font-semibold">
                          SEM REGISTRO
                        </span>
                      ) : (
                        "OK"
                      )}
                    </td>

                    <td className="px-3 py-2 text-center">
                      <HistoricoAuditoria registro={linha.batidas[0]} />
                      {!linha.ocorrencia && linha.batidas.length === 0 && (
                        <AlertTriangle className="inline w-4 h-4 text-red-600 ml-2" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL IMPORTAÇÃO */}
      <ImportarPontoModal
        isOpen={isImportarOpen}
        onClose={() => setIsImportarOpen(false)}
        onImportado={carregarDados}
      />
    </div>
  );
}