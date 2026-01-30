// src/pages/Ponto.jsx
import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  CalendarDays,
  Upload,
  AlertTriangle,
  Eye,
  Loader2
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

  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funcionariosEscalas, setFuncionariosEscalas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isImportarOpen, setIsImportarOpen] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const [visualizarGrupo, setVisualizarGrupo] = useState(null);
  const [isVisualizarOpen, setIsVisualizarOpen] = useState(false);

  const [ocorrenciaGrupo, setOcorrenciaGrupo] = useState(null);
  const [isOcorrenciaOpen, setIsOcorrenciaOpen] = useState(false);

  const hoje = new Date().toISOString().slice(0, 10);
  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroInicio, setFiltroInicio] = useState(hoje);
  const [filtroFim, setFiltroFim] = useState(hoje);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [f, r, o, e, fe] = await Promise.all([
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
    fetchData();
  }, []);

  const gerarDias = (inicio, fim) => {
    const dias = [];
    let d = new Date(inicio + "T12:00");
    const f = new Date(fim + "T12:00");
    while (d <= f) {
      dias.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return dias;
  };

  const registrosAgrupados = useMemo(() => {
    const map = {};
    registros.forEach(r => {
      const data = r.data || r.data_hora?.slice(0, 10);
      const key = `${r.funcionario_id}_${data}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    Object.values(map).forEach(arr =>
      arr.sort((a, b) =>
        (a.hora || a.data_hora).localeCompare(b.hora || b.data_hora)
      )
    );
    return map;
  }, [registros]);

  const calcularSaldo = (batidas, escala) => {
    if (!escala?.carga_diaria_minutos) return null;
    let total = 0;
    for (let i = 0; i < batidas.length; i += 2) {
      if (!batidas[i + 1]) break;
      const [h1, m1] = batidas[i].hora.split(":").map(Number);
      const [h2, m2] = batidas[i + 1].hora.split(":").map(Number);
      total += (h2 * 60 + m2) - (h1 * 60 + m1);
    }
    return total - escala.carga_diaria_minutos;
  };

  const minToHHmm = min => {
    if (min === null) return "-";
    const s = min < 0 ? "-" : "+";
    const abs = Math.abs(min);
    return `${s}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  };

  const linhas = useMemo(() => {
    const dias = gerarDias(filtroInicio, filtroFim);
    const res = [];

    funcionarios.forEach(f => {
      if (filtroFuncionario !== "todos" && filtroFuncionario !== f.id) return;

      const fe = funcionariosEscalas.find(x => x.funcionario_id === f.id);
      const escala = escalas.find(e => e.id === fe?.escala_id);

      dias.forEach(d => {
        const key = `${f.id}_${d}`;
        const batidas = registrosAgrupados[key] || [];
        const ocorr = ocorrencias.find(o => o.funcionario_id === f.id && o.data === d);
        const saldo = calcularSaldo(batidas, escala);

        let situacao = "Regular";
        if (ocorr) situacao = ocorr.tipo;
        else if (batidas.length === 0) situacao = "Falta";
        else if (batidas.length < 4) situacao = "Batida ausente";

        res.push({ f, d, batidas, saldo, situacao, ocorr });
      });
    });

    return res;
  }, [funcionarios, registrosAgrupados, ocorrencias, escalas, funcionariosEscalas, filtroFuncionario, filtroInicio, filtroFim]);

  return (
    <div className="p-4 bg-slate-50 min-h-screen">
      <div className="flex gap-2 mb-4">
        <Button onClick={() => setIsImportarOpen(true)}><Upload className="w-4 h-4 mr-1" />Importar</Button>
        <Button variant="outline" onClick={() => setMostrarCalendario(!mostrarCalendario)}>
          <CalendarDays className="w-4 h-4 mr-1" />Calendário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-2 text-left">Funcionário</th>
                <th className="p-2 text-center">Data</th>
                <th className="p-2 text-center">1ª</th>
                <th className="p-2 text-center">2ª</th>
                <th className="p-2 text-center">3ª</th>
                <th className="p-2 text-center">4ª</th>
                <th className="p-2 text-center">Saldo</th>
                <th className="p-2 text-center">Situação</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="p-6 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
              ) : linhas.map((l, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{l.f.nome}</td>
                  <td className="p-2 text-center">{l.d}</td>
                  {[0,1,2,3].map(n => (
                    <td key={n} className="p-2 text-center font-mono">
                      {l.batidas[n]?.hora?.slice(0,5) || "-"}
                    </td>
                  ))}
                  <td className={`p-2 text-center font-mono ${l.saldo < 0 ? "text-red-600" : "text-green-600"}`}>
                    {minToHHmm(l.saldo)}
                  </td>
                  <td className="p-2 text-center">
                    <Badge variant="outline">{l.situacao}</Badge>
                  </td>
                  <td className="p-2 text-center flex justify-center gap-2">
                    <button onClick={() => { setVisualizarGrupo(l); setIsVisualizarOpen(true); }}>
                      <Eye className="w-4 h-4 text-slate-600" />
                    </button>
                    <button onClick={() => { setOcorrenciaGrupo(l); setIsOcorrenciaOpen(true); }}>
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ImportarPontoModal isOpen={isImportarOpen} onClose={() => setIsImportarOpen(false)} onImportado={fetchData} />
      <VisualizarRegistroDiaModal isOpen={isVisualizarOpen} grupo={visualizarGrupo} onClose={() => setIsVisualizarOpen(false)} />
      <OcorrenciaPontoModal isOpen={isOcorrenciaOpen} grupo={ocorrenciaGrupo} onClose={() => setIsOcorrenciaOpen(false)} onSalvo={fetchData} />
    </div>
  );
}