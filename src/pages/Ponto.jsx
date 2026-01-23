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

  // Função para calcular saldo de horas baseado na escala
  const calcularSaldoDia = (funcionarioId, data, batidas) => {
    const funcEscala = funcionariosEscalas.find(fe => {
      if (fe.funcionario_id !== funcionarioId) return false;
      if (!fe.vigencia_inicio) return false;
      if (data < fe.vigencia_inicio) return false;
      if (fe.vigencia_fim && data > fe.vigencia_fim) return false;
      return true;
    });
    
    if (!funcEscala) return { saldo: 0, esperado: 0, trabalhado: 0 };
    
    const escala = escalas.find(e => e.id === funcEscala.escala_id);
    if (!escala) return { saldo: 0, esperado: 0, trabalhado: 0 };
    
    // Verificar se o dia é trabalhado na escala
    const diaSemana = new Date(data + 'T00:00:00').getDay();
    const diaNumero = diaSemana === 0 ? "7" : String(diaSemana); // 1=Segunda, 7=Domingo
    const diasTrabalho = (escala.dias_semana || "").split(",");
    
    if (!diasTrabalho.includes(diaNumero)) {
      return { saldo: 0, esperado: 0, trabalhado: 0 };
    }
    
    const totalEsperado = escala.carga_diaria_minutos || 0;
    
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

  // Função para pegar batidas esperadas da escala (4 batidas padrão)
  const getBatidasEsperadas = (funcionarioId, data) => {
    const funcEscala = funcionariosEscalas.find(fe => {
      if (fe.funcionario_id !== funcionarioId) return false;
      if (!fe.vigencia_inicio) return false;
      if (data < fe.vigencia_inicio) return false;
      if (fe.vigencia_fim && data > fe.vigencia_fim) return false;
      return true;
    });
    
    if (!funcEscala) return [];
    
    const escala = escalas.find(e => e.id === funcEscala.escala_id);
    if (!escala) return [];
    
    // Verificar se o dia é trabalhado
    const diaSemana = new Date(data + 'T00:00:00').getDay();
    const diaNumero = diaSemana === 0 ? "7" : String(diaSemana);
    const diasTrabalho = (escala.dias_semana || "").split(",");
    
    if (!diasTrabalho.includes(diaNumero)) return [];
    
    // Retornar as 4 batidas esperadas (entrada, saída almoço, volta almoço, saída final)
    return [
      escala.hora_entrada_prevista || "",
      escala.intervalo_inicio_previsto || "",
      escala.intervalo_fim_previsto || "",
      escala.hora_saida_prevista || ""
    ].filter(h => h);
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
      descricao: ocorrenciaExistente?.descricao || "",
      ocorrencia_id: ocorrenciaExistente?.id || null
    });
    setIsOcorrenciaModalOpen(true);
  };

  const handleSalvarOcorrencia = async () => {
    if (!ocorrenciaModal) return;
    
    try {
      if (ocorrenciaModal.tipo === "normal" && ocorrenciaModal.ocorrencia_id) {
        // Se tipo é normal e já existe, deletar a ocorrência
        await base44.entities.OcorrenciaPonto.delete(ocorrenciaModal.ocorrencia_id);
      } else if (ocorrenciaModal.tipo !== "normal") {
        // Criar ou atualizar ocorrência
        if (ocorrenciaModal.ocorrencia_id) {
          await base44.entities.OcorrenciaPonto.update(ocorrenciaModal.ocorrencia_id, {
            tipo: ocorrenciaModal.tipo,
            descricao: ocorrenciaModal.descricao
          });
        } else {
          await base44.entities.OcorrenciaPonto.create({
            funcionario_id: ocorrenciaModal.funcionario_id,
            data: ocorrenciaModal.data,
            tipo: ocorrenciaModal.tipo,
            descricao: ocorrenciaModal.descricao
          });
        }
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
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">Posição Faltante</th>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">Ocorrência</th>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">Saldo do Dia</th>
                          <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <tr>
                            <td colSpan={10} className="text-center py-12">
                              <Loader2 className="w-8 h-8 animate-spin text-slate-600 mx-auto" />
                            </td>
                          </tr>
                        ) : registrosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="text-center py-12">
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
                            const numBatidasEsperadas = batidasEsperadas.length;
                            const saldoDia = calcularSaldoDia(grupo.funcionario_id, grupo.data, grupo.batidas);
                            const ocorrencia = ocorrencias.find(o => o.funcionario_id === grupo.funcionario_id && o.data === grupo.data);
                            
                            // Exibir batidas na posição correta
                            const batidas = ["", "", "", ""];
                            const posicoesFaltantes = [];
                            
                            for (let i = 0; i < numBatidasEsperadas && i < 4; i++) {
                              if (grupo.batidas[i]) {
                                batidas[i] = formatarHora(grupo.batidas[i].hora || grupo.batidas[i].data_hora?.substring(11, 19));
                              } else {
                                posicoesFaltantes.push(i + 1);
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
                                {batidas.map((batida, i) => (
                                  <td 
                                    key={i} 
                                    className={`font-mono text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center ${
                                      !batida || batida === "" ? "text-red-500 font-bold" : "text-slate-900"
                                    }`}
                                  >
                                    {batida || "faltou"}
                                  </td>
                                ))}
                                <td className="text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center">
                                  {posicoesFaltantes.length > 0 ? (
                                    <Badge variant="destructive" className="text-[8px] md:text-[10px]">
                                      {posicoesFaltantes.join(", ")}ª
                                    </Badge>
                                  ) : (
                                    <span className="text-green-600 font-semibold">✓</span>
                                  )}
                                </td>
                                <td className="text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center">
                                  {ocorrencia ? (
                                    <Badge 
                                      className={`text-[8px] md:text-[10px] cursor-pointer ${
                                        ocorrencia.tipo === "atestado" ? "bg-purple-100 text-purple-700" :
                                        ocorrencia.tipo === "abono" ? "bg-green-100 text-green-700" :
                                        ocorrencia.tipo === "folga" ? "bg-blue-100 text-blue-700" :
                                        ocorrencia.tipo === "ferias" ? "bg-orange-100 text-orange-700" :
                                        ocorrencia.tipo === "falta_justificada" ? "bg-yellow-100 text-yellow-700" :
                                        "bg-slate-100 text-slate-700"
                                      }`}
                                      onClick={() => handleAbrirOcorrencia(grupo)}
                                    >
                                      {ocorrencia.tipo === "atestado" ? "Atestado" :
                                       ocorrencia.tipo === "abono" ? "Abonado" :
                                       ocorrencia.tipo === "folga" ? "Folga" :
                                       ocorrencia.tipo === "ferias" ? "Férias" :
                                       ocorrencia.tipo === "falta_justificada" ? "Justificada" :
                                       ocorrencia.tipo}
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">-</span>
                                  )}
                                </td>
                                <td className="font-mono text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center font-bold">
                                  <span className={saldoDia.saldo >= 0 ? "text-green-600" : "text-red-600"}>
                                    {minToHHmm(saldoDia.saldo)}
                                  </span>
                                </td>
                                <td className="px-2 md:px-3 py-2">
                                  <div className="flex gap-1 justify-center items-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAbrirOcorrencia(grupo)}
                                      className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                                      title="Gerenciar Ocorrência"
                                    >
                                      <AlertTriangle className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                    </Button>
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
                <Label className="text-xs md:text-sm font-semibold">Tipo de Ocorrência</Label>
                <Select
                  value={ocorrenciaModal.tipo}
                  onValueChange={(value) => setOcorrenciaModal({...ocorrenciaModal, tipo: value})}
                >
                  <SelectTrigger className="text-xs md:text-sm">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal (Sem Ocorrência)</SelectItem>
                    <SelectItem value="atestado">Atestado Médico</SelectItem>
                    <SelectItem value="abono">Abono</SelectItem>
                    <SelectItem value="folga">Folga</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="falta_justificada">Falta Justificada</SelectItem>
                    <SelectItem value="ajuste_manual">Ajuste Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ocorrenciaModal.tipo !== "normal" && (
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-semibold">Descrição/Justificativa</Label>
                  <Textarea
                    value={ocorrenciaModal.descricao || ''}
                    onChange={(e) => setOcorrenciaModal({...ocorrenciaModal, descricao: e.target.value})}
                    placeholder="Descreva o motivo da ocorrência..."
                    rows={4}
                    className="text-xs md:text-sm resize-none"
                  />
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-[10px] md:text-xs text-blue-800">
                  <strong>📋 Importante:</strong> As batidas originais do relógio nunca são alteradas. 
                  Esta ocorrência registra apenas a ação tomada (atestado, abono, etc.) para fins de gestão e relatórios.
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