import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Loader2, FileText, Clock, Wallet, AlertTriangle, CheckCircle, Filter, Eye, CalendarDays } from "lucide-react";
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
  const [ocorrenciaModal, setOcorrenciaModal] = useState(null);
  const [isOcorrenciaModalOpen, setIsOcorrenciaModalOpen] = useState(false);
  const [visualizarGrupo, setVisualizarGrupo] = useState(null);
  const [isVisualizarOpen, setIsVisualizarOpen] = useState(false);
  
  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

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

  // Função para calcular saldo de horas (CORRIGIDA)
  const calcularSaldoDia = (funcionarioId, data, batidas) => {
    // Verificar se há ocorrência justificada
    const ocorrenciaJustificada = ocorrencias.find(
      o => o.funcionario_id === funcionarioId && 
           o.data === data && 
           ['atestado', 'abonado', 'folga', 'ferias'].includes(o.tipo)
    );
    
    // Se justificado, considerar dia completo (sem débito)
    if (ocorrenciaJustificada) {
      return { saldo: 0, esperado: 0, trabalhado: 0, justificado: true };
    }
    
    const funcEscala = funcionariosEscalas.find(fe => fe.funcionario_id === funcionarioId);
    if (!funcEscala) return { saldo: 0, esperado: 0, trabalhado: 0 };
    
    const escala = escalas.find(e => e.id === funcEscala.escala_id);
    if (!escala || !escala.carga_diaria_minutos) return { saldo: 0, esperado: 0, trabalhado: 0 };
    
    const totalEsperado = escala.carga_diaria_minutos;
    
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
    
    // CORREÇÃO: Saldo = trabalhado - esperado (sem penalizar 2x)
    return {
      saldo: totalTrabalhado - totalEsperado,
      esperado: totalEsperado,
      trabalhado: totalTrabalhado,
      justificado: false
    };
  };

  // Verificar se é dia de trabalho na escala
  const isDiaTrabalho = (funcionarioId, data) => {
    const funcEscala = funcionariosEscalas.find(fe => fe.funcionario_id === funcionarioId);
    if (!funcEscala) return true; // Se não tem escala, considera dia útil

    const escala = escalas.find(e => e.id === funcEscala.escala_id);
    if (!escala || !escala.dias_semana) return true;

    const diaSemana = new Date(data + "T12:00:00").getDay();
    const diaConfig = escala.dias_semana[diaSemana];
    
    return diaConfig?.ativo === true;
  };

  // Função para pegar batidas esperadas da escala (4 batidas padrão)
  const getBatidasEsperadas = (funcionarioId, data) => {
    const funcEscala = funcionariosEscalas.find(fe => fe.funcionario_id === funcionarioId);
    if (!funcEscala) return ["08:00", "12:00", "13:00", "17:00"];
    
    const escala = escalas.find(e => e.id === funcEscala.escala_id);
    if (!escala) return ["08:00", "12:00", "13:00", "17:00"];
    
    return [
      escala.hora_entrada_prevista || "08:00",
      escala.intervalo_inicio_previsto || "12:00",
      escala.intervalo_fim_previsto || "13:00",
      escala.hora_saida_prevista || "17:00"
    ];
  };

  // Gerar todos os dias do período selecionado
  const gerarTodasDatas = useMemo(() => {
    if (filtroFuncionario === "todos") {
      return [];
    }

    // Se não tem filtro de data, pegar mês atual completo
    let dataInicio = filtroDataInicio;
    let dataFim = filtroDataFim;
    
    if (!dataInicio && !dataFim) {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = hoje.getMonth();
      dataInicio = new Date(ano, mes, 1).toISOString().split('T')[0];
      dataFim = new Date(ano, mes + 1, 0).toISOString().split('T')[0];
    } else if (!dataInicio && dataFim) {
      const [ano, mes] = dataFim.split('-');
      dataInicio = `${ano}-${mes}-01`;
    } else if (dataInicio && !dataFim) {
      const [ano, mes] = dataInicio.split('-');
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
      dataFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
    }

    const datas = [];
    let dataAtual = new Date(dataInicio + "T12:00:00");
    const dataFinal = new Date(dataFim + "T12:00:00");

    while (dataAtual <= dataFinal) {
      const ano = dataAtual.getFullYear();
      const mes = String(dataAtual.getMonth() + 1).padStart(2, "0");
      const dia = String(dataAtual.getDate()).padStart(2, "0");
      datas.push(`${ano}-${mes}-${dia}`);
      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    return datas;
  }, [filtroDataInicio, filtroDataFim, filtroFuncionario]);

  const registrosFiltrados = useMemo(() => {
    // Se tem funcionário selecionado e período, gerar todos os dias
    if (filtroFuncionario !== "todos" && gerarTodasDatas.length > 0) {
      return gerarTodasDatas.map(data => {
        const grupoExistente = registrosAgrupados.find(
          g => g.funcionario_id === filtroFuncionario && g.data === data
        );

        if (grupoExistente) {
          return grupoExistente;
        }

        // Criar linha vazia para o dia
        return {
          funcionario_id: filtroFuncionario,
          data: data,
          batidas: []
        };
      }).sort((a, b) => b.data.localeCompare(a.data));
    }

    // Se tem período definido mas filtro é "todos", gerar para TODOS os funcionários
    if (filtroFuncionario === "todos" && (filtroDataInicio || filtroDataFim)) {
      // Determinar período
      let dataInicio = filtroDataInicio;
      let dataFim = filtroDataFim;
      
      if (!dataInicio && dataFim) {
        const [ano, mes] = dataFim.split('-');
        dataInicio = `${ano}-${mes}-01`;
      } else if (dataInicio && !dataFim) {
        const [ano, mes] = dataInicio.split('-');
        const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
        dataFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
      }

      // Gerar todas as datas do período
      const datas = [];
      let dataAtual = new Date(dataInicio + "T12:00:00");
      const dataFinal = new Date(dataFim + "T12:00:00");

      while (dataAtual <= dataFinal) {
        const ano = dataAtual.getFullYear();
        const mes = String(dataAtual.getMonth() + 1).padStart(2, "0");
        const dia = String(dataAtual.getDate()).padStart(2, "0");
        datas.push(`${ano}-${mes}-${dia}`);
        dataAtual.setDate(dataAtual.getDate() + 1);
      }

      // Gerar linhas para TODOS os funcionários em TODAS as datas
      const resultado = [];
      const funcionariosAtivos = funcionarios.filter(f => 
        f.status === 'ativo' || f.status === 'experiencia'
      );

      for (const func of funcionariosAtivos) {
        for (const data of datas) {
          const grupoExistente = registrosAgrupados.find(
            g => g.funcionario_id === func.id && g.data === data
          );

          if (grupoExistente) {
            resultado.push(grupoExistente);
          } else {
            // Criar linha vazia para o dia
            resultado.push({
              funcionario_id: func.id,
              data: data,
              batidas: []
            });
          }
        }
      }

      return resultado.sort((a, b) => {
        // Ordenar por data DESC, depois por nome do funcionário
        const dataCmp = b.data.localeCompare(a.data);
        if (dataCmp !== 0) return dataCmp;
        const nomeA = getFuncionarioNome(a.funcionario_id);
        const nomeB = getFuncionarioNome(b.funcionario_id);
        return nomeA.localeCompare(nomeB);
      });
    }

    // Filtro normal (sem preencher dias vazios)
    return registrosAgrupados.filter((grupo) => {
      const passaFunc = filtroFuncionario === "todos" || grupo.funcionario_id === filtroFuncionario;
      const passaDataInicio = !filtroDataInicio || grupo.data >= filtroDataInicio;
      const passaDataFim = !filtroDataFim || grupo.data <= filtroDataFim;
      
      return passaFunc && passaDataInicio && passaDataFim;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [registrosAgrupados, filtroFuncionario, filtroDataInicio, filtroDataFim, gerarTodasDatas, funcionarios]);

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
      tipo: ocorrenciaExistente?.tipo || "justificativa",
      descricao: ocorrenciaExistente?.descricao || "",
      ocorrencia_id: ocorrenciaExistente?.id || null
    });
    setIsOcorrenciaModalOpen(true);
  };

  const handleSalvarOcorrencia = async () => {
    if (!ocorrenciaModal) return;
    
    if (!ocorrenciaModal.descricao?.trim()) {
      toast({
        title: "Atenção",
        description: "Por favor, informe uma descrição/justificativa.",
        variant: "destructive"
      });
      return;
    }
    
    try {
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
          descricao: ocorrenciaModal.descricao,
          status: "aprovado"
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
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-2 md:px-4 py-3 md:py-5 mb-3 md:mb-4 shadow-lg rounded-none md:rounded-lg mx-0">
          <div className="max-w-full mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-slate-700 p-1.5 md:p-2 rounded-lg shadow-md">
                  <Clock className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div>
                  <h1 className="text-sm md:text-xl font-bold">Controle de Ponto</h1>
                  <p className="text-slate-300 text-[9px] md:text-xs">Gerenciar batidas individuais - Abonar, Justificar, Editar</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsImportarOpen(true)}
                  className="gap-1.5 bg-white text-slate-800 hover:bg-slate-100 text-[10px] md:text-xs h-8 md:h-10 font-medium"
                >
                  <Upload className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("EscalasTrabalho"))}
                  className="gap-1.5 bg-white text-slate-800 hover:bg-slate-100 text-[10px] md:text-xs h-8 md:h-10 font-medium"
                >
                  <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span className="hidden sm:inline">Escalas</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("BancoHoras"))}
                  className="gap-1.5 bg-white text-slate-800 hover:bg-slate-100 text-[10px] md:text-xs h-8 md:h-10 font-medium"
                >
                  <Wallet className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span className="hidden sm:inline">Banco Horas</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-full mx-auto px-1 md:px-2">
          {/* Dashboard e Botão Calendário */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <PontoDashboard 
                registros={registros}
                funcionarios={funcionarios}
                ocorrencias={ocorrencias}
                dataInicio={filtroDataInicio}
                dataFim={filtroDataFim}
              />
            </div>
            <div className="flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setMostrarCalendario(!mostrarCalendario)}
                className={`gap-2 h-full min-h-[60px] px-3 ${mostrarCalendario ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-800 hover:bg-slate-100'} transition-all`}
              >
                <CalendarDays className="w-5 h-5" />
                <span className="hidden xl:inline text-xs font-medium">
                  {mostrarCalendario ? 'Ocultar' : 'Ver'}
                </span>
              </Button>
            </div>
          </div>

          {/* Calendário Retrátil */}
          {mostrarCalendario && (
            <div className="mb-3">
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
            </div>
          )}

          {/* Tabela Principal */}
          <Card className="shadow-sm">
            <CardContent className="p-3 md:p-6">
              {/* Filtros */}
              <div className="mb-4 md:mb-6">
                <button
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors w-full md:w-auto"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-xs md:text-sm font-semibold">
                    {mostrarFiltros ? 'Ocultar Filtros' : 'Exibir Filtros'}
                  </span>
                </button>

                {mostrarFiltros && (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 md:p-5 mt-3 border border-slate-200 shadow-sm">
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
                  )}
                  </div>

              {/* Tabela de Ponto por Dia */}
              <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto">
                  <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="text-white text-[11px] font-semibold px-4 py-3 text-left whitespace-nowrap border-b-2 border-slate-700">Funcionário</th>
                          <th className="text-white text-[11px] font-semibold px-3 py-3 text-center whitespace-nowrap border-b-2 border-slate-700">Data</th>
                          <th className="text-white text-[11px] font-semibold px-3 py-3 text-center whitespace-nowrap border-b-2 border-slate-700">1ª Ent.</th>
                          <th className="text-white text-[11px] font-semibold px-3 py-3 text-center whitespace-nowrap border-b-2 border-slate-700">1ª Saí.</th>
                          <th className="text-white text-[11px] font-semibold px-3 py-3 text-center whitespace-nowrap border-b-2 border-slate-700">2ª Ent.</th>
                          <th className="text-white text-[11px] font-semibold px-3 py-3 text-center whitespace-nowrap border-b-2 border-slate-700">2ª Saí.</th>
                          <th className="text-white text-[11px] font-semibold px-3 py-3 text-center whitespace-nowrap border-b-2 border-slate-700">Situação</th>
                          <th className="text-white text-[11px] font-semibold px-3 py-3 text-center whitespace-nowrap border-b-2 border-slate-700">Saldo</th>
                          <th className="text-white text-[11px] font-semibold px-3 py-3 text-center whitespace-nowrap border-b-2 border-slate-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
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
                            const diaTrabalho = isDiaTrabalho(grupo.funcionario_id, grupo.data);
                            
                            // Ordenar batidas cronologicamente
                            const batidasOrdenadas = [...grupo.batidas].sort((a, b) => {
                              const horaA = a.hora || a.data_hora?.substring(11, 19) || "00:00:00";
                              const horaB = b.hora || b.data_hora?.substring(11, 19) || "00:00:00";
                              return horaA.localeCompare(horaB);
                            });
                            
                            // Exibir batidas na ordem cronológica (1ª, 2ª, 3ª, 4ª)
                            const batidas = ["", "", "", ""];
                            for (let i = 0; i < batidasOrdenadas.length && i < 4; i++) {
                              const horaBatida = batidasOrdenadas[i].hora || batidasOrdenadas[i].data_hora?.substring(11, 19) || "00:00:00";
                              batidas[i] = formatarHora(horaBatida);
                            }
                            
                            // Se não é dia de trabalho e não tem batidas
                            const naoEDiaTrabalho = !diaTrabalho && grupo.batidas.length === 0;
                            
                            // Identificar quais batidas faltaram
                            const faltantes = [];
                            if (!naoEDiaTrabalho && !ocorrencia) {
                              for (let i = 0; i < 4; i++) {
                                if (!batidas[i] || batidas[i] === "") {
                                  faltantes.push(i + 1);
                                }
                              }
                            }
                            
                            return (
                              <tr key={idx} className={`hover:bg-slate-50 transition-colors ${
                                naoEDiaTrabalho ? 'bg-slate-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                              }`}>
                                <td className="px-4 py-3 text-slate-900 font-medium text-xs border-r border-slate-100">
                                  {getFuncionarioNome(grupo.funcionario_id)}
                                </td>
                                <td className="px-3 py-3 text-center border-r border-slate-100">
                                  <span className="text-slate-700 font-medium text-xs">{formatarData(grupo.data)}</span>
                                </td>
                                {naoEDiaTrabalho ? (
                                  <>
                                    <td colSpan={4} className="px-3 py-3 text-center border-r border-slate-100">
                                      <span className="text-slate-400 text-xs">—</span>
                                    </td>
                                    <td className="px-3 py-3 text-center border-r border-slate-100">
                                      <Badge className="bg-slate-100 text-slate-600 text-[10px] font-medium border-0">
                                        Folga
                                      </Badge>
                                    </td>
                                    <td className="px-3 py-3 text-center border-r border-slate-100">
                                      <span className="text-slate-400 text-xs">—</span>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-3 py-3 text-center border-r border-slate-100">
                                      <span className={`font-mono text-xs ${!batidas[0] ? "text-slate-300" : "text-slate-900 font-semibold"}`}>
                                        {batidas[0] || "—"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 text-center border-r border-slate-100">
                                      <span className={`font-mono text-xs ${!batidas[1] ? "text-slate-300" : "text-slate-900 font-semibold"}`}>
                                        {batidas[1] || "—"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 text-center border-r border-slate-100">
                                      <span className={`font-mono text-xs ${!batidas[2] ? "text-slate-300" : "text-slate-900 font-semibold"}`}>
                                        {batidas[2] || "—"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 text-center border-r border-slate-100">
                                      <span className={`font-mono text-xs ${!batidas[3] ? "text-slate-300" : "text-slate-900 font-semibold"}`}>
                                        {batidas[3] || "—"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 text-center border-r border-slate-100">
                                      {ocorrencia ? (
                                        <Badge className={`text-[10px] font-medium border-0 ${
                                          ocorrencia.tipo === "atestado" ? "bg-purple-100 text-purple-700" :
                                          ocorrencia.tipo === "abonado" ? "bg-blue-100 text-blue-700" :
                                          ocorrencia.tipo === "folga" ? "bg-slate-100 text-slate-700" :
                                          ocorrencia.tipo === "ferias" ? "bg-cyan-100 text-cyan-700" :
                                          "bg-yellow-100 text-yellow-700"
                                        } capitalize`}>
                                          {ocorrencia.tipo}
                                        </Badge>
                                      ) : faltantes.length > 0 ? (
                                        <Badge className="bg-red-50 text-red-700 text-[10px] font-semibold border-0">
                                          Falta
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-green-50 text-green-700 text-[10px] font-medium border-0">
                                          Presente
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="px-3 py-3 text-center border-r border-slate-100">
                                      {saldoDia.justificado ? (
                                        <span className="text-slate-400 text-xs">—</span>
                                      ) : (
                                        <span className={`font-mono font-semibold text-xs ${saldoDia.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                                          {minToHHmm(saldoDia.saldo)}
                                        </span>
                                      )}
                                    </td>
                                  </>
                                )}
                                <td className="px-3 py-3">
                                  {!naoEDiaTrabalho && (
                                    <div className="flex gap-2 justify-center items-center">
                                      <button
                                        onClick={() => handleAbrirOcorrencia(grupo)}
                                        className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                                        title={ocorrencia ? "Ver Ocorrência" : "Adicionar Ocorrência"}
                                      >
                                        <Eye className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                      </button>
                                    </div>
                                  )}
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

      {/* Modal: Visualizar Registro do Dia */}
      <VisualizarRegistroDiaModal
        isOpen={isVisualizarOpen}
        onClose={() => {
          setIsVisualizarOpen(false);
          setVisualizarGrupo(null);
        }}
        grupo={visualizarGrupo}
        onSalvo={fetchData}
      />

      {/* Modal: Ocorrência/Justificativa */}
      <Dialog open={isOcorrenciaModalOpen} onOpenChange={setIsOcorrenciaModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-lg rounded-xl p-0 gap-0 flex flex-col max-h-[92vh]">
          <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-3 md:px-5 py-2.5 md:py-3.5 rounded-t-xl">
            <DialogTitle className="text-xs md:text-base font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
              Gerenciar Ocorrência
            </DialogTitle>
          </DialogHeader>
          {ocorrenciaModal && (
            <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 px-3 md:px-5 py-3 md:py-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] md:text-xs text-slate-600 font-medium">Funcionário:</span>
                    <span className="text-xs md:text-sm text-slate-900 font-bold">{getFuncionarioNome(ocorrenciaModal.funcionario_id)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] md:text-xs text-slate-600 font-medium">Data:</span>
                    <span className="text-xs md:text-sm text-slate-900 font-bold">{formatarData(ocorrenciaModal.data)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-[10px] md:text-xs font-bold text-slate-700">Tipo de Ação *</Label>
                <Select
                  value={ocorrenciaModal.tipo}
                  onValueChange={(value) => setOcorrenciaModal({...ocorrenciaModal, tipo: value, descricao: ocorrenciaModal.descricao || ''})}
                >
                  <SelectTrigger className="text-xs md:text-sm h-9 md:h-10">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atestado">🏥 Atestado</SelectItem>
                    <SelectItem value="abonado">✅ Abonado</SelectItem>
                    <SelectItem value="folga">🏖️ Folga</SelectItem>
                    <SelectItem value="ferias">🌴 Férias</SelectItem>
                    <SelectItem value="justificativa">📝 Justificativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-[10px] md:text-xs font-bold text-slate-700">Descrição/Justificativa *</Label>
                <Textarea
                  value={ocorrenciaModal.descricao || ''}
                  onChange={(e) => setOcorrenciaModal({...ocorrenciaModal, descricao: e.target.value})}
                  placeholder="Ex: Atestado médico, reunião externa, feriado local, etc..."
                  rows={4}
                  className="text-xs md:text-sm resize-none"
                />
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-2.5 md:p-3 rounded-lg border border-blue-300">
                <p className="text-[9px] md:text-xs text-blue-900 font-medium leading-relaxed">
                  <strong>📋 Importante:</strong> As batidas originais do relógio nunca são alteradas. 
                  Esta ação apenas registra a justificativa/abono para fins de gestão e cálculo de horas.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex-shrink-0 border-t bg-slate-50 px-3 md:px-5 py-2.5 md:py-3 rounded-b-xl flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsOcorrenciaModalOpen(false);
                setOcorrenciaModal(null);
              }}
              className="flex-1 text-[10px] md:text-xs h-8 md:h-9 font-medium"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarOcorrencia}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-[10px] md:text-xs h-8 md:h-9 gap-2 font-medium"
            >
              <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Salvar Ação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}