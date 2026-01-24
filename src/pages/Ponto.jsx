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

  const [isLoading, setIsLoading] = useState(true);
  const [isImportarOpen, setIsImportarOpen] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(null);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [funcs, regs, ocors] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.PontoRegistro.list("-data_hora", 5000),
        base44.entities.OcorrenciaPonto.list("-data", 3000)
      ]);

      setFuncionarios(funcs || []);
      setRegistros(regs || []);
      setOcorrencias(ocors || []);
    } catch {
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

  const mesAtual = useMemo(() => {
    if (!dataSelecionada) return new Date();
    return new Date(dataSelecionada + "T12:00:00");
  }, [dataSelecionada]);

  const diasDoMes = useMemo(() => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const total = new Date(ano, mes + 1, 0).getDate();
    return Array.from({ length: total }, (_, i) =>
      `${ano}-${String(mes + 1).padStart(2,"0")}-${String(i + 1).padStart(2,"0")}`
    );
  }, [mesAtual]);

  const linhas = useMemo(() => {
    const lista = [];
    funcionarios.forEach(func => {
      diasDoMes.forEach(data => {
        const batidas = registros.filter(r => {
          const d = r.data || r.data_hora?.substring(0,10);
          return r.funcionario_id === func.id && d === data;
        });
        const ocorrencia = ocorrencias.find(
          o => o.funcionario_id === func.id && o.data === data
        );
        lista.push({ funcionario: func, data, batidas, ocorrencia });
      });
    });
    return lista;
  }, [funcionarios, registros, ocorrencias, diasDoMes]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <Button onClick={() => setIsImportarOpen(true)} className="mb-4">
        Importar Ponto
      </Button>

      <CalendarioPonto
        registros={registros.map(r => ({
          data: r.data || r.data_hora?.substring(0,10)
        }))}
        ocorrencias={ocorrencias}
        onDiaClicado={setDataSelecionada}
      />

      <Card className="mt-6">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-3 py-2">Funcionário</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">1ª</th>
                <th className="px-3 py-2">2ª</th>
                <th className="px-3 py-2">3ª</th>
                <th className="px-3 py-2">4ª</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => {
                const b = ["-","-","-","-"];
                l.batidas.slice(0,4).forEach((x, idx) => {
                  b[idx] = x.hora || x.data_hora?.substring(11,16) || "-";
                });

                return (
                  <tr key={i} className="border-b">
                    <td className="px-3 py-2">{l.funcionario.nome}</td>
                    <td className="px-3 py-2">{l.data}</td>
                    {b.map((x, j) => (
                      <td key={j} className={`px-3 py-2 ${x==="-"?"text-red-600":""}`}>
                        {x}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {l.ocorrencia ? l.ocorrencia.tipo : l.batidas.length ? "OK" : "SEM REGISTRO"}
                    </td>
                    <td className="px-3 py-2">
                      <HistoricoAuditoria registro={l.batidas[0]} />
                      {!l.batidas.length && <AlertTriangle className="inline w-4 h-4 ml-2 text-red-600" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ImportarPontoModal
        isOpen={isImportarOpen}
        onClose={() => setIsImportarOpen(false)}
        onImportado={carregarDados}
      />
    </div>
  );
}