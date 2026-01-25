// pages/Ponto.jsx
import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Calendar,
  Filter,
  FileText,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import CalendarioPonto from "@/components/ponto/CalendarioPonto";
import FiltrosPontoModal from "@/components/ponto/FiltrosPontoModal";
import ImportarPontoModal from "@/components/ponto/ImportarPontoModal";
import HistoricoAuditoria from "@/components/ponto/HistoricoAuditoria";
import EspelhoPontoCompleto from "@/components/ponto/EspelhoPontoCompleto";

export default function PontoPage() {
  const { toast } = useToast();

  const hoje = new Date().toISOString().substring(0, 10);

  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funcionariosEscalas, setFuncionariosEscalas] = useState([]);

  const [loading, setLoading] = useState(true);

  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarEspelho, setMostrarEspelho] = useState(false);

  const [filtros, setFiltros] = useState({
    funcionarioId: null,
    dataInicio: hoje,
    dataFim: hoje
  });

  async function carregarDados() {
    setLoading(true);
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
      toast({
        title: "Erro",
        description: "Falha ao carregar controle de ponto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const linhas = useMemo(() => {
    const lista = [];
    const funcionariosFiltrados = filtros.funcionarioId
      ? funcionarios.filter(f => f.id === filtros.funcionarioId)
      : funcionarios;

    funcionariosFiltrados.forEach(func => {
      let data = new Date(filtros.dataInicio + "T12:00:00");
      const fim = new Date(filtros.dataFim + "T12:00:00");

      while (data <= fim) {
        const dataStr = data.toISOString().substring(0, 10);

        const batidas = registros
          .filter(r => {
            const d = r.data || r.data_hora?.substring(0, 10);
            return r.funcionario_id === func.id && d === dataStr;
          })
          .sort((a, b) => {
            const ha = a.hora || a.data_hora?.substring(11, 19) || "";
            const hb = b.hora || b.data_hora?.substring(11, 19) || "";
            return ha.localeCompare(hb);
          });

        const ocorrencia = ocorrencias.find(
          o => o.funcionario_id === func.id && o.data === dataStr
        );

        lista.push({
          funcionario: func,
          data: dataStr,
          batidas,
          ocorrencia
        });

        data.setDate(data.getDate() + 1);
      }
    });

    return lista;
  }, [funcionarios, registros, ocorrencias, filtros]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 space-y-4">
      {/* AÇÕES */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setMostrarFiltros(true)} variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>

        <Button
          variant="outline"
          onClick={() => setMostrarCalendario(v => !v)}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Calendário
        </Button>

        <Button onClick={() => setMostrarEspelho(true)}>
          <FileText className="w-4 h-4 mr-2" />
          Gerar Espelho
        </Button>

        <Button onClick={() => setMostrarFiltros(true)}>
          Importar Ponto
        </Button>
      </div>

      {mostrarCalendario && (
        <CalendarioPonto
          registros={registros}
          ocorrencias={ocorrencias}
          onDiaClicado={(data) =>
            setFiltros({ ...filtros, dataInicio: data, dataFim: data })
          }
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
              {linhas.map((l, i) => {
                const bat = ["-", "-", "-", "-"];
                l.batidas.slice(0, 4).forEach((b, idx) => {
                  const h = b.hora || b.data_hora?.substring(11, 19);
                  bat[idx] = h
                    ? `${l.data.split("-").reverse().join("/")} ${h}`
                    : "-";
                });

                return (
                  <tr key={i} className="border-b">
                    <td className="px-3 py-2">{l.funcionario.nome}</td>
                    <td className="px-3 py-2 text-center">
                      {l.data.split("-").reverse().join("/")}
                    </td>
                    {bat.map((b, j) => (
                      <td
                        key={j}
                        className={`px-3 py-2 text-center ${
                          b === "-" ? "text-red-600" : ""
                        }`}
                      >
                        {b}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      {l.ocorrencia
                        ? l.ocorrencia.tipo.toUpperCase()
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

      {/* MODAIS */}
      <FiltrosPontoModal
        open={mostrarFiltros}
        onClose={() => setMostrarFiltros(false)}
        filtros={filtros}
        setFiltros={setFiltros}
        funcionarios={funcionarios}
      />

      {mostrarEspelho && (
        <EspelhoPontoCompleto
          filtros={filtros}
          registros={registros}
          ocorrencias={ocorrencias}
          funcionarios={funcionarios}
          escalas={escalas}
          funcionariosEscalas={funcionariosEscalas}
          onClose={() => setMostrarEspelho(false)}
        />
      )}
    </div>
  );
}