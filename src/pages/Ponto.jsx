import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CalendarDays } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import CalendarioPonto from "@/components/ponto/CalendarioPonto";
import ImportarPontoModal from "@/components/ponto/ImportarPontoModal";
import HistoricoAuditoria from "@/components/ponto/HistoricoAuditoria";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PontoPage() {
  const { toast } = useToast();

  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isImportarOpen, setIsImportarOpen] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const hojeISO = new Date().toISOString().substring(0, 10);

  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [dataInicio, setDataInicio] = useState(hojeISO);
  const [dataFim, setDataFim] = useState(hojeISO);

  /* =========================
     CARREGAMENTO (FRONT ONLY)
     ========================= */
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
    } catch (e) {
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
     FILTRO + NORMALIZAÇÃO
     ========================= */
  const linhas = useMemo(() => {
    const lista = [];

    const funcionariosFiltrados =
      filtroFuncionario === "todos"
        ? funcionarios
        : funcionarios.filter(f => f.id === filtroFuncionario);

    funcionariosFiltrados.forEach(func => {
      const datas = [];
      let d = new Date(dataInicio + "T12:00:00");
      const fim = new Date(dataFim + "T12:00:00");

      while (d <= fim) {
        datas.push(d.toISOString().substring(0, 10));
        d.setDate(d.getDate() + 1);
      }

      datas.forEach(data => {
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

        lista.push({ funcionario: func, data, batidas, ocorrencia });
      });
    });

    return lista;
  }, [funcionarios, registros, ocorrencias, filtroFuncionario, dataInicio, dataFim]);

  const formatarDataHora = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 space-y-4">
      {/* AÇÕES */}
      <div className="flex flex-wrap gap-2 items-end">
        <Button onClick={() => setIsImportarOpen(true)}>
          Importar Ponto
        </Button>

        <Button
          variant="outline"
          onClick={() => setMostrarCalendario(v => !v)}
          className="gap-2"
        >
          <CalendarDays className="w-4 h-4" />
          Calendário
        </Button>

        <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Funcionário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {funcionarios.map(f => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
      </div>

      {/* CALENDÁRIO (OCULTO POR PADRÃO) */}
      {mostrarCalendario && (
        <CalendarioPonto
          registros={registros.map(r => ({
            data: r.data || r.data_hora?.substring(0, 10)
          }))}
          ocorrencias={ocorrencias}
          onDiaClicado={(data) => {
            setDataInicio(data);
            setDataFim(data);
            setMostrarCalendario(false);
          }}
        />
      )}

      {/* TABELA */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-xs">
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
              {linhas.map((l, idx) => {
                const batidas = ["-", "-", "-", "-"];
                l.batidas.slice(0, 4).forEach((b, i) => {
                  batidas[i] = formatarDataHora(b.data_hora || `${l.data}T${b.hora}`);
                });

                return (
                  <tr key={idx} className="border-b">
                    <td className="px-3 py-2">{l.funcionario.nome}</td>
                    <td className="px-3 py-2 text-center">
                      {new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>

                    {batidas.map((b, i) => (
                      <td
                        key={i}
                        className={`px-3 py-2 text-center ${b === "-" ? "text-red-600" : ""}`}
                      >
                        {b}
                      </td>
                    ))}

                    <td className="px-3 py-2 text-center">
                      {l.ocorrencia
                        ? l.ocorrencia.tipo
                        : l.batidas.length
                        ? "OK"
                        : "SEM REGISTRO"}
                    </td>

                    <td className="px-3 py-2 text-center">
                      <HistoricoAuditoria registro={l.batidas[0]} />
                      {!l.batidas.length && (
                        <AlertTriangle className="inline w-4 h-4 ml-2 text-red-600" />
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