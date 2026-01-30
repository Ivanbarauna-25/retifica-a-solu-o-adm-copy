import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  CalendarDays,
  Upload,
  Filter,
  AlertTriangle,
  Eye,
  Loader2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

import ImportarPontoModal from "@/components/ponto/ImportarPontoModal";
import CalendarioPonto from "@/components/ponto/CalendarioPonto";
import VisualizarRegistroDiaModal from "@/components/ponto/VisualizarRegistroDiaModal";
import OcorrenciaPontoModal from "@/components/ponto/OcorrenciaPontoModal";

export default function PontoPage() {
  const { toast } = useToast();

  /* ===================== STATES ===================== */
  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funcionariosEscalas, setFuncionariosEscalas] = useState([]);

  const [isLoading, setIsLoading] = useState(true);

  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [isImportarOpen, setIsImportarOpen] = useState(false);

  const [visualizarGrupo, setVisualizarGrupo] = useState(null);
  const [isVisualizarOpen, setIsVisualizarOpen] = useState(false);

  const [ocorrenciaModal, setOcorrenciaModal] = useState(null);
  const [isOcorrenciaOpen, setIsOcorrenciaOpen] = useState(false);

  /* filtros */
  const hoje = new Date().toISOString().slice(0, 10);
  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroInicio, setFiltroInicio] = useState(hoje);
  const [filtroFim, setFiltroFim] = useState(hoje);

  /* ===================== FETCH ===================== */
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [
        f,
        r,
        o,
        e,
        fe
      ] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.PontoRegistro.list("-data_hora", 5000),
        base44.entities.OcorrenciaPonto.list("-data", 2000),
        base44.entities.EscalaTrabalho.list(),
        base44.entities.FuncionarioEscala.list()
      ]);

      setFuncionarios(f || []);
      setRegistros(r || []);
      setOcorrencias(o || []);
      setEscalas(e || []);
      setFuncionariosEscalas(fe || []);
    } catch (err) {
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
    fetchData();
  }, []);

  /* ===================== HELPERS ===================== */
  const getNome = (id) =>
    funcionarios.find(f => f.id === id)?.nome || "-";

  const formatarHora = (h) => h ? h.substring(0,5) : "-";

  const gerarDias = (inicio, fim) => {
    const arr = [];
    let d = new Date(inicio + "T12:00");
    const f = new Date(fim + "T12:00");
    while (d <= f) {
      arr.push(d.toISOString().slice(0,10));
      d.setDate(d.getDate()+1);
    }
    return arr;
  };

  /* ===================== AGRUPAMENTO ===================== */
  const registrosAgrupados = useMemo(() => {
    const map = {};
    registros.forEach(r => {
      if (!r.funcionario_id) return;
      const data = r.data || r.data_hora?.slice(0,10);
      if (!map[`${r.funcionario_id}_${data}`]) {
        map[`${r.funcionario_id}_${data}`] = [];
      }
      map[`${r.funcionario_id}_${data}`].push(r);
    });

    Object.values(map).forEach(lista =>
      lista.sort((a,b) =>
        (a.hora || a.data_hora).localeCompare(b.hora || b.data_hora)
      )
    );

    return map;
  }, [registros]);

  /* ===================== LINHAS ===================== */
  const linhas = useMemo(() => {
    const dias = gerarDias(filtroInicio, filtroFim);
    const result = [];

    funcionarios.forEach(func => {
      dias.forEach(data => {
        if (filtroFuncionario !== "todos" && filtroFuncionario !== func.id) return;

        const key = `${func.id}_${data}`;
        const batidas = registrosAgrupados[key] || [];
        const ocorr = ocorrencias.find(o => o.funcionario_id === func.id && o.data === data);

        result.push({
          funcionario_id: func.id,
          data,
          batidas,
          ocorrencia: ocorr
        });
      });
    });

    return result;
  }, [funcionarios, registrosAgrupados, ocorrencias, filtroFuncionario, filtroInicio, filtroFim]);

  /* ===================== UI ===================== */
  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4">
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1">
          <h1 className="text-lg font-bold">Controle de Ponto</h1>
          <p className="text-xs text-slate-500">Gestão diária de batidas e ocorrências</p>
        </div>

        <Button onClick={() => setIsImportarOpen(true)} className="gap-2">
          <Upload className="w-4 h-4" /> Importar
        </Button>

        <Button variant="outline" onClick={() => setMostrarCalendario(!mostrarCalendario)} className="gap-2">
          <CalendarDays className="w-4 h-4" /> Calendário
        </Button>
      </div>

      {/* FILTROS */}
      <Card className="mb-4">
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4">
          <div>
            <Label>Funcionário</Label>
            <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {funcionarios.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Início</Label>
            <Input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} />
          </div>
          <div>
            <Label>Fim</Label>
            <Input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => {
              setFiltroInicio(hoje);
              setFiltroFim(hoje);
              setFiltroFuncionario("todos");
            }} className="w-full gap-2">
              <X className="w-4 h-4" /> Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CALENDÁRIO */}
      {mostrarCalendario && (
        <div className="mb-4">
          <CalendarioPonto
            registros={registros}
            funcionarios={funcionarios}
            ocorrencias={ocorrencias}
            onDiaClicado={(d) => {
              setFiltroInicio(d);
              setFiltroFim(d);
            }}
          />
        </div>
      )}

      {/* TABELA */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-800 text-white sticky top-0">
              <tr>
                <th className="p-2 text-left">Funcionário</th>
                <th className="p-2 text-center">Data</th>
                <th className="p-2 text-center">1ª</th>
                <th className="p-2 text-center">2ª</th>
                <th className="p-2 text-center">3ª</th>
                <th className="p-2 text-center">4ª</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-6 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td></tr>
              ) : linhas.map((l,i) => {
                const bat = l.batidas;
                return (
                  <tr key={i} className="border-b">
                    <td className="p-2">{getNome(l.funcionario_id)}</td>
                    <td className="p-2 text-center">{l.data}</td>
                    {[0,1,2,3].map(n => (
                      <td key={n} className="p-2 text-center font-mono">
                        {formatarHora(bat[n]?.hora || bat[n]?.data_hora?.slice(11,16))}
                      </td>
                    ))}
                    <td className="p-2 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => {
                          setVisualizarGrupo(l);
                          setIsVisualizarOpen(true);
                        }}>
                          <Eye className="w-4 h-4 text-slate-600" />
                        </button>
                        <button onClick={() => {
                          setOcorrenciaModal(l);
                          setIsOcorrenciaOpen(true);
                        }}>
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAIS */}
      <ImportarPontoModal
        isOpen={isImportarOpen}
        onClose={() => setIsImportarOpen(false)}
        onImportado={fetchData}
      />

      <VisualizarRegistroDiaModal
        isOpen={isVisualizarOpen}
        grupo={visualizarGrupo}
        onClose={() => setIsVisualizarOpen(false)}
      />

      <OcorrenciaPontoModal
        isOpen={isOcorrenciaOpen}
        grupo={ocorrenciaModal}
        onClose={() => setIsOcorrenciaOpen(false)}
        onSalvo={fetchData}
      />
    </div>
  );
}