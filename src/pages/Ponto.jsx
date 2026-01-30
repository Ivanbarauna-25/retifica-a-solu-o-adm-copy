import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  X,
  Loader2,
  FileText,
  Clock,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Filter,
  CalendarDays,
  Printer
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

import ImportarPontoModal from "@/components/ponto/ImportarPontoModal";
import VisualizarRegistroDiaModal from "@/components/ponto/VisualizarRegistroDiaModal";
import PontoDashboard from "@/components/ponto/PontoDashboard";
import CalendarioPonto from "@/components/ponto/CalendarioPonto";
import HistoricoAuditoria from "@/components/ponto/HistoricoAuditoria";

export default function PontoPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funcionariosEscalas, setFuncionariosEscalas] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isImportarOpen, setIsImportarOpen] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [
        funcsData,
        registrosData,
        escalasData,
        funcEscalasData,
        ocorrenciasData
      ] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.PontoRegistro.list("-data_hora", 2000),
        base44.entities.EscalaTrabalho.list(),
        base44.entities.FuncionarioEscala.list(),
        base44.entities.OcorrenciaPonto.list("-data", 1000)
      ]);

      setFuncionarios(
        (funcsData || []).sort((a, b) =>
          (a?.nome || "").localeCompare(b?.nome || "")
        )
      );
      setRegistros(registrosData || []);
      setEscalas(escalasData || []);
      setFuncionariosEscalas(funcEscalasData || []);
      setOcorrencias(ocorrenciasData || []);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const registrosAgrupados = useMemo(() => {
    const grupos = {};
    registros.forEach((r) => {
      if (!r.funcionario_id || !r.data) return;
      const key = `${r.funcionario_id}_${r.data}`;
      grupos[key] = grupos[key] || {
        funcionario_id: r.funcionario_id,
        data: r.data,
        batidas: []
      };
      grupos[key].batidas.push(r);
    });
    return Object.values(grupos).sort((a, b) =>
      b.data.localeCompare(a.data)
    );
  }, [registros]);

  const getFuncionarioNome = (id) =>
    funcionarios.find((f) => f.id === id)?.nome || "-";

  const formatarData = (data) => {
    if (!data) return "-";
    const [a, m, d] = data.split("-");
    return `${d}/${m}/${a}`;
  };

  return (
    <>
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 mb-4">
        <div className="max-w-[1800px] mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Controle de Ponto
            </h1>
            <p className="text-slate-600 text-sm">
              Visualize, trate e justifique registros de batidas
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsImportarOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              Importar
            </Button>

            <Button
              variant="outline"
              onClick={() => setMostrarCalendario(!mostrarCalendario)}
              className="gap-2"
            >
              <CalendarDays className="w-4 h-4" />
              {mostrarCalendario ? "Ocultar Calendário" : "Ver Calendário"}
            </Button>

            <Button
              variant="outline"
              disabled
              title="Relatórios serão ativados em breve"
              className="gap-2"
            >
              <Printer className="w-4 h-4" />
              Relatórios
            </Button>
          </div>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="max-w-[1800px] mx-auto px-4 mb-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <PontoDashboard
              registros={registros}
              funcionarios={funcionarios}
              ocorrencias={ocorrencias}
              dataInicio={filtroDataInicio}
              dataFim={filtroDataFim}
            />
          </CardContent>
        </Card>
      </div>

      {/* CALENDÁRIO */}
      {mostrarCalendario && (
        <div className="max-w-[1800px] mx-auto px-4 mb-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <CalendarioPonto
                registros={registros}
                funcionarios={funcionarios}
                escalas={escalas}
                funcionariosEscalas={funcionariosEscalas}
                ocorrencias={ocorrencias}
                onDiaClicado={(data) => {
                  setFiltroDataInicio(data);
                  setFiltroDataFim(data);
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* TABELA */}
      <div className="max-w-[1800px] mx-auto px-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
              </div>
            ) : registrosAgrupados.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                Nenhum registro encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Funcionário</th>
                      <th className="px-3 py-2 text-center">Data</th>
                      <th className="px-3 py-2 text-center">Batidas</th>
                      <th className="px-3 py-2 text-center">Auditoria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosAgrupados.map((g, idx) => (
                      <tr
                        key={idx}
                        className="border-b hover:bg-slate-50 transition"
                      >
                        <td className="px-3 py-2 font-medium">
                          {getFuncionarioNome(g.funcionario_id)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {formatarData(g.data)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant="outline">
                            {g.batidas.length} batida(s)
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <HistoricoAuditoria registro={g.batidas[0]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAIS */}
      <ImportarPontoModal
        isOpen={isImportarOpen}
        onClose={() => setIsImportarOpen(false)}
        onImportado={fetchData}
      />
    </>
  );
}