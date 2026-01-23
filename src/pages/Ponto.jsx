import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Loader2, FileText, Clock, Wallet, AlertTriangle, CheckCircle, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImportarPontoModal from "@/components/ponto/ImportarPontoModal";

export default function PontoPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funcionariosEscalas, setFuncionariosEscalas] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isImportarOpen, setIsImportarOpen] = useState(false);
  const [ocorrenciaModal, setOcorrenciaModal] = useState(null);
  const [isOcorrenciaModalOpen, setIsOcorrenciaModalOpen] = useState(false);
  
  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [funcsData, registrosData, escalasData, funcEscalasData, ocorrenciasData] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.PontoRegistro.list("-data_hora", 2000),
        base44.entities.EscalaTrabalho.list(),
        base44.entities.FuncionarioEscala.list(),
        base44.entities.OcorrenciaPonto.list("-data", 1000)
      ]);

      setFuncionarios((funcsData || []).sort((a, b) => (a?.nome || "").localeCompare(b?.nome || "")));
      setRegistros(registrosData || []);
      setEscalas(escalasData || []);
      setFuncionariosEscalas(funcEscalasData || []);
      setOcorrencias(ocorrenciasData || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
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

  // Agrupar batidas por funcionário + data
  const registrosAgrupados = useMemo(() => {
    const grupos = {};
    
    for (const reg of registros) {
      if (!reg.funcionario_id || !reg.data) continue;
      
      const key = `${reg.funcionario_id}_${reg.data}`;
      if (!grupos[key]) {
        grupos[key] = {
          funcionario_id: reg.funcionario_id,
          data: reg.data,
          batidas: []
        };
      }
      grupos[key].batidas.push(reg);
    }
    
    // Ordenar batidas dentro de cada dia
    for (const key in grupos) {
      grupos[key].batidas.sort((a, b) => {
        const horaA = a.hora || a.data_hora?.substring(11, 19) || "00:00:00";
        const horaB = b.hora || b.data_hora?.substring(11, 19) || "00:00:00";
        return horaA.localeCompare(horaB);
      });
    }
    
    return Object.values(grupos);
  }, [registros]);

  // Função para calcular saldo de horas
  const calcularSaldoDia = (funcionarioId, data, batidas) => {
    const funcEscala = funcionariosEscalas.find(fe => fe.funcionario_id === funcionarioId);
    if (!funcEscala) return { saldo: 0, esperado: 0, trabalhado: 0 };
    
    const escala = escalas.find(e => e.id === funcEscala.escala_id);
    if (!escala) return { saldo: 0, esperado: 0, trabalhado: 0 };
    
    const diaSemana = new Date(data + 'T00:00:00').getDay();
    const diasMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const diaKey = diasMap[diaSemana];
    
    const jornadaEsperada = escala.jornadas?.[diaKey] || [];
    const totalEsperado = jornadaEsperada.reduce((sum, j) => {
      const [hIni, mIni] = (j.entrada || "00:00").split(":").map(Number);
      const [hFim, mFim] = (j.saida || "00:00").split(":").map(Number);
      const minIni = hIni * 60 + mIni;
      const minFim = hFim * 60 + mFim;
      return sum + (minFim - minIni);
    }, 0);
    
    let totalTrabalhado = 0;
    for (let i = 0; i < batidas.length; i += 2) {
      if (!batidas[i + 1]) break;
      const h1 = batidas[i].hora || batidas[i].data_hora?.substring(11, 19) || "00:00:00";
      const h2 = batidas[i + 1].hora || batidas[i + 1].data_hora?.substring(11, 19) || "00:00:00";
      
      const [h1h, h1m] = h1.split(":").map(Number);
      const [h2h, h2m] = h2.split(":").map(Number);
      
      const min1 = h1h * 60 + h1m;
      const min2 = h2h * 60 + h2m;
      
      totalTrabalhado += (min2 - min1);
    }
    
    return {
      saldo: totalTrabalhado - totalEsperado,
      esperado: totalEsperado,
      trabalhado: totalTrabalhado
    };
  };

  // Função para pegar batidas esperadas da escala
  const getBatidasEsperadas = (funcionarioId, data) => {
    const funcEscala = funcionariosEscalas.find(fe => fe.funcionario_id === funcionarioId);
    if (!funcEscala) return [];
    
    const escala = escalas.find(e => e.id === funcEscala.escala_id);
    if (!escala) return [];
    
    const diaSemana = new Date(data + 'T00:00:00').getDay();
    const diasMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const diaKey = diasMap[diaSemana];
    
    const jornadaEsperada = escala.jornadas?.[diaKey] || [];
    const esperadas = [];
    
    for (const j of jornadaEsperada) {
      esperadas.push(j.entrada || "");
      esperadas.push(j.saida || "");
    }
    
    return esperadas;
  };

  const registrosFiltrados = useMemo(() => {
    return registrosAgrupados.filter((grupo) => {
      const passaFunc = filtroFuncionario === "todos" || grupo.funcionario_id === filtroFuncionario;
      const passaDataInicio = !filtroDataInicio || grupo.data >= filtroDataInicio;
      const passaDataFim = !filtroDataFim || grupo.data <= filtroDataFim;
      
      return passaFunc && passaDataInicio && passaDataFim;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [registrosAgrupados, filtroFuncionario, filtroDataInicio, filtroDataFim]);

  const limparFiltros = () => {
    setFiltroFuncionario("todos");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroStatus("todos");
  };

  const handleAbrirOcorrencia = (grupo) => {
    const ocorrenciaExistente = ocorrencias.find(
      o => o.funcionario_id === grupo.funcionario_id && o.data === grupo.data
    );
    
    setOcorrenciaModal({
      funcionario_id: grupo.funcionario_id,
      data: grupo.data,
      tipo: ocorrenciaExistente?.tipo || "normal",
      justificativa: ocorrenciaExistente?.justificativa || "",
      ocorrencia_id: ocorrenciaExistente?.id || null
    });
    setIsOcorrenciaModalOpen(true);
  };

  const handleSalvarOcorrencia = async () => {
    if (!ocorrenciaModal) return;
    
    try {
      if (ocorrenciaModal.ocorrencia_id) {
        await base44.entities.OcorrenciaPonto.update(ocorrenciaModal.ocorrencia_id, {
          tipo: ocorrenciaModal.tipo,
          justificativa: ocorrenciaModal.justificativa
        });
      } else {
        await base44.entities.OcorrenciaPonto.create({
          funcionario_id: ocorrenciaModal.funcionario_id,
          data: ocorrenciaModal.data,
          tipo: ocorrenciaModal.tipo,
          justificativa: ocorrenciaModal.justificativa
        });
      }
      
      toast({
        title: "✅ Sucesso",
        description: "Ocorrência salva com sucesso"
      });
      setIsOcorrenciaModalOpen(false);
      setOcorrenciaModal(null);
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a ocorrência",
        variant: "destructive"
      });
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

  const formatarHora = (hora) => {
    if (!hora) return "00:00";
    return hora.substring(0, 5);
  };

  const minToHHmm = (min) => {
    if (!min || min === 0) return "00:00";
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    const sinal = min < 0 ? "-" : "+";
    return `${sinal}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-2 md:px-6 py-3 md:py-5 mb-3 md:mb-4 shadow-lg rounded-lg md:rounded-xl mx-1 md:mx-0">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-sm md:text-xl font-bold">Controle de Ponto</h1>
                <p className="text-slate-300 text-[9px] md:text-xs">Gerenciar batidas individuais - Abonar, Justificar, Editar</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsImportarOpen(true)}
                  className="gap-2 bg-white text-slate-800 hover:bg-slate-100 text-xs md:text-sm h-8 md:h-10"
                >
                  <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Importar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("EscalasTrabalho"))}
                  className="gap-2 bg-white text-slate-800 hover:bg-slate-100 text-xs md:text-sm h-8 md:h-10"
                >
                  <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Escalas
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("BancoHoras"))}
                  className="gap-2 bg-white text-slate-800 hover:bg-slate-100 text-xs md:text-sm h-8 md:h-10"
                >
                  <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Banco Horas
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-1 md:px-4">
          <Card className="shadow-sm">
            <CardContent className="p-3 md:p-6">
              {/* Filtros */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 md:p-5 mb-4 md:mb-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs md:text-sm font-semibold text-slate-700">Filtros</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] md:text-xs font-semibold text-slate-600">Funcionário</Label>
                    <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
                      <SelectTrigger className="text-xs md:text-sm h-8 md:h-9 bg-white">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {funcionarios.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] md:text-xs font-semibold text-slate-600">Data Início</Label>
                    <Input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="text-xs md:text-sm h-8 md:h-9 bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] md:text-xs font-semibold text-slate-600">Data Fim</Label>
                    <Input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="text-xs md:text-sm h-8 md:h-9 bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] md:text-xs font-semibold text-slate-600">Status</Label>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger className="text-xs md:text-sm h-8 md:h-9 bg-white">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="abonado">Abonado</SelectItem>
                        <SelectItem value="com_justificativa">Com Justificativa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 flex items-end">
                    <Button
                      variant="outline"
                      onClick={limparFiltros}
                      className="w-full gap-2 text-xs md:text-sm h-8 md:h-9"
                    >
                      <X className="w-3 h-3 md:w-4 md:h-4" />
                      Limpar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabela de Ponto por Dia */}
              <div className="rounded-lg border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-left whitespace-nowrap">Funcionário</th>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">Data</th>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">1ª</th>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">2ª</th>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">3ª</th>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">4ª</th>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">Faltou</th>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">Saldo</th>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <tr>
                            <td colSpan={9} className="text-center py-12">
                              <Loader2 className="w-8 h-8 animate-spin text-slate-600 mx-auto" />
                            </td>
                          </tr>
                        ) : registrosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-12">
                              <div className="flex flex-col items-center gap-3">
                                <FileText className="w-16 h-16 text-slate-300" />
                                <p className="text-slate-500 text-xs md:text-sm font-medium">Nenhum registro encontrado</p>
                                <p className="text-slate-400 text-[10px] md:text-xs">Importe batidas ou ajuste os filtros</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          registrosFiltrados.map((grupo, idx) => {
                            const batidasEsperadas = getBatidasEsperadas(grupo.funcionario_id, grupo.data);
                            const saldoDia = calcularSaldoDia(grupo.funcionario_id, grupo.data, grupo.batidas);
                            const ocorrencia = ocorrencias.find(o => o.funcionario_id === grupo.funcionario_id && o.data === grupo.data);
                            
                            const batidas = [
                              grupo.batidas[0] ? formatarHora(grupo.batidas[0].hora || grupo.batidas[0].data_hora?.substring(11, 19)) : "00:00",
                              grupo.batidas[1] ? formatarHora(grupo.batidas[1].hora || grupo.batidas[1].data_hora?.substring(11, 19)) : "00:00",
                              grupo.batidas[2] ? formatarHora(grupo.batidas[2].hora || grupo.batidas[2].data_hora?.substring(11, 19)) : "00:00",
                              grupo.batidas[3] ? formatarHora(grupo.batidas[3].hora || grupo.batidas[3].data_hora?.substring(11, 19)) : "00:00"
                            ];
                            
                            const faltantes = [];
                            for (let i = 0; i < batidasEsperadas.length; i++) {
                              if (!grupo.batidas[i]) {
                                faltantes.push(i + 1);
                              }
                            }
                            
                            return (
                              <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                <td className="text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-slate-700 font-medium">
                                  {getFuncionarioNome(grupo.funcionario_id)}
                                </td>
                                <td className="text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center text-slate-900 font-semibold">
                                  {formatarData(grupo.data)}
                                </td>
                                <td className={`font-mono text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center ${batidas[0] === "00:00" ? "text-red-500" : "text-slate-900"}`}>
                                  {batidas[0]}
                                </td>
                                <td className={`font-mono text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center ${batidas[1] === "00:00" ? "text-red-500" : "text-slate-900"}`}>
                                  {batidas[1]}
                                </td>
                                <td className={`font-mono text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center ${batidas[2] === "00:00" ? "text-red-500" : "text-slate-900"}`}>
                                  {batidas[2]}
                                </td>
                                <td className={`font-mono text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center ${batidas[3] === "00:00" ? "text-red-500" : "text-slate-900"}`}>
                                  {batidas[3]}
                                </td>
                                <td className="text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center">
                                  {faltantes.length > 0 ? (
                                    <Badge variant="destructive" className="text-[8px] md:text-[10px]">
                                      {faltantes.join(", ")}ª
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="font-mono text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center font-semibold">
                                  <span className={saldoDia.saldo >= 0 ? "text-green-600" : "text-red-600"}>
                                    {minToHHmm(saldoDia.saldo)}
                                  </span>
                                </td>
                                <td className="px-2 md:px-3 py-2">
                                  <div className="flex gap-1 justify-center items-center">
                                    {ocorrencia ? (
                                      <div className="flex items-center gap-1">
                                        {ocorrencia.tipo === "abonado" ? (
                                          <Badge className="bg-green-100 text-green-700 text-[8px] md:text-[10px] cursor-pointer" onClick={() => handleAbrirOcorrencia(grupo)}>
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Abonado
                                          </Badge>
                                        ) : ocorrencia.tipo === "justificado" ? (
                                          <Badge className="bg-blue-100 text-blue-700 text-[8px] md:text-[10px] cursor-pointer" onClick={() => handleAbrirOcorrencia(grupo)}>
                                            Justificado
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[8px] md:text-[10px] cursor-pointer" onClick={() => handleAbrirOcorrencia(grupo)}>
                                            Normal
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleAbrirOcorrencia(grupo)}
                                        className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                                        title="Adicionar Ação"
                                      >
                                        <AlertTriangle className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-xs md:text-sm text-slate-600">
                  <strong>{registrosFiltrados.length}</strong> dia(s) de ponto
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Importar Ponto */}
      <ImportarPontoModal
        isOpen={isImportarOpen}
        onClose={() => setIsImportarOpen(false)}
        onImportado={fetchData}
      />

      {/* Modal: Ocorrência/Justificativa */}
      <Dialog open={isOcorrenciaModalOpen} onOpenChange={setIsOcorrenciaModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-lg rounded-xl">
          <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white -mx-6 -mt-6 px-5 py-4 rounded-t-xl mb-4">
            <DialogTitle className="text-base md:text-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
              Gerenciar Ocorrência
            </DialogTitle>
          </DialogHeader>
          {ocorrenciaModal && (
            <div className="space-y-4 px-1">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-600">
                  <strong>Funcionário:</strong> {getFuncionarioNome(ocorrenciaModal.funcionario_id)}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Data:</strong> {formatarData(ocorrenciaModal.data)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-semibold">Tipo de Ação</Label>
                <Select
                  value={ocorrenciaModal.tipo}
                  onValueChange={(value) => setOcorrenciaModal({...ocorrenciaModal, tipo: value})}
                >
                  <SelectTrigger className="text-xs md:text-sm">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal (Sem Ação)</SelectItem>
                    <SelectItem value="abonado">Abonar Falta/Atraso</SelectItem>
                    <SelectItem value="justificado">Justificar (Manter Negativo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(ocorrenciaModal.tipo === "abonado" || ocorrenciaModal.tipo === "justificado") && (
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-semibold">Justificativa</Label>
                  <Textarea
                    value={ocorrenciaModal.justificativa || ''}
                    onChange={(e) => setOcorrenciaModal({...ocorrenciaModal, justificativa: e.target.value})}
                    placeholder="Ex: Atestado médico, reunião externa, feriado local, etc..."
                    rows={4}
                    className="text-xs md:text-sm resize-none"
                  />
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-[10px] md:text-xs text-blue-800">
                  <strong>📋 Importante:</strong> As batidas originais do relógio nunca são alteradas. 
                  Esta ação apenas registra a justificativa/abono para fins de gestão.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOcorrenciaModalOpen(false);
                    setOcorrenciaModal(null);
                  }}
                  className="flex-1 text-xs md:text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSalvarOcorrencia}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs md:text-sm"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Salvar Ação
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}