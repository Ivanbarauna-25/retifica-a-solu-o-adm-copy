import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Eye, X, Loader2, BarChart3, FileText, Link as LinkIcon, Clock, Wallet, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import ImportarPontoModal from "@/components/ponto/ImportarPontoModal";
import MapearFuncionariosModal from "@/components/ponto/MapearFuncionariosModal";
import EspelhoPontoCompleto from "@/components/ponto/EspelhoPontoCompleto";

function minToHHmm(min) {
  if (!min || min === 0) return "00:00";
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  const sinal = min < 0 ? "-" : "";
  return `${sinal}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function PontoPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [apuracoes, setApuracoes] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [bancoHoras, setBancoHoras] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isImportarOpen, setIsImportarOpen] = useState(false);
  const [isMapearOpen, setIsMapearOpen] = useState(false);
  const [isEspelhoOpen, setIsEspelhoOpen] = useState(false);
  const [funcionarioEspelho, setFuncionarioEspelho] = useState(null);
  const [mesEspelho, setMesEspelho] = useState("");
  const [apurando, setApurando] = useState(false);
  
  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroMes, setFiltroMes] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [funcsData, apuracoesData, registrosData, bancoData] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.ApuracaoDiariaPonto.list("-data", 1000),
        base44.entities.PontoRegistro.list("-created_date", 500),
        base44.entities.BancoHoras.list("-created_date", 500)
      ]);

      setFuncionarios((funcsData || []).sort((a, b) => (a?.nome || "").localeCompare(b?.nome || "")));
      setApuracoes(apuracoesData || []);
      setRegistros(registrosData || []);
      setBancoHoras(bancoData || []);
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

  const getFuncionario = (funcionarioId) => {
    return funcionarios.find((f) => f?.id === funcionarioId) || null;
  };

  const formatMes = (mesReferencia) => {
    if (!mesReferencia) return "-";
    const [ano, mes] = mesReferencia.split("-");
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${meses[parseInt(mes) - 1]}/${ano}`;
  };

  // Calcular resumo mensal por funcionário
  const resumosMensais = useMemo(() => {
    const map = new Map();

    for (const apu of apuracoes) {
      const funcId = apu.funcionario_id;
      const data = apu.data || "";
      const mesKey = data.slice(0, 7); // "YYYY-MM"

      if (!funcId || !mesKey) continue;

      const key = `${funcId}_${mesKey}`;
      if (!map.has(key)) {
        map.set(key, {
          funcionario_id: funcId,
          mes_referencia: mesKey,
          dias_trabalhados: 0,
          total_trabalhado_min: 0,
          total_atraso_min: 0,
          total_falta_min: 0,
          total_hora_extra_min: 0
        });
      }

      const resumo = map.get(key);
      if (apu.status !== "falta") resumo.dias_trabalhados++;
      resumo.total_trabalhado_min += apu.total_trabalhado_min || 0;
      resumo.total_atraso_min += apu.atraso_min || 0;
      resumo.total_falta_min += apu.falta_min || 0;
      resumo.total_hora_extra_min += apu.hora_extra_min || 0;
    }

    // Adicionar saldo banco de horas
    for (const [key, resumo] of map.entries()) {
      const funcId = resumo.funcionario_id;
      const mesKey = resumo.mes_referencia;
      const lancamentos = bancoHoras.filter((b) => {
        const dataLanc = b.data || "";
        return b.funcionario_id === funcId && dataLanc.startsWith(mesKey);
      });
      resumo.saldo_banco_horas = lancamentos.reduce((acc, l) => {
        return acc + (l.tipo === "credito" ? l.minutos : -l.minutos);
      }, 0);
    }

    return Array.from(map.values());
  }, [apuracoes, bancoHoras]);

  const resumosFiltrados = useMemo(() => {
    return resumosMensais.filter((resumo) => {
      const passaFunc = filtroFuncionario === "todos" || resumo.funcionario_id === filtroFuncionario;
      const passaMes = !filtroMes || resumo.mes_referencia === filtroMes;
      return passaFunc && passaMes;
    });
  }, [resumosMensais, filtroFuncionario, filtroMes]);

  const limparFiltros = () => {
    setFiltroFuncionario("todos");
    setFiltroMes("");
  };

  const handleApurarMes = async () => {
    if (!filtroFuncionario || filtroFuncionario === "todos" || !filtroMes) {
      toast({
        title: "Atenção",
        description: "Selecione um funcionário e um mês para apurar.",
        variant: "destructive"
      });
      return;
    }

    if (!window.confirm("Deseja apurar/recalcular o ponto deste funcionário no mês selecionado?")) {
      return;
    }

    setApurando(true);
    try {
      const response = await base44.functions.invoke("apurarPonto", {
        funcionario_id: filtroFuncionario,
        mes_referencia: filtroMes
      });

      if (response?.data?.success) {
        toast({
          title: "✅ Apuração concluída",
          description: response.data.message || "Ponto apurado com sucesso."
        });
        await fetchData();
      } else {
        throw new Error(response?.data?.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Erro ao apurar:", error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível apurar o ponto.",
        variant: "destructive"
      });
    } finally {
      setApurando(false);
    }
  };

  const openEspelho = (resumo) => {
    const func = getFuncionario(resumo.funcionario_id);
    setFuncionarioEspelho(func);
    setMesEspelho(resumo.mes_referencia);
    setIsEspelhoOpen(true);
  };

  // Contar IDs não vinculados
  const idsNaoVinculados = useMemo(() => {
    const set = new Set();
    for (const r of registros) {
      if (!r.funcionario_id && r.user_id_relogio) {
        set.add(r.user_id_relogio);
      }
    }
    return set.size;
  }, [registros]);

  return (
    <>
      <div className="min-h-screen bg-slate-50 w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="bg-slate-800 text-white px-2 md:px-6 py-3 md:py-5 mb-3 md:mb-4 shadow-lg rounded-lg md:rounded-xl mx-1 md:mx-0">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-sm md:text-xl font-bold">Controle de Ponto</h1>
                <p className="text-slate-400 text-[9px] md:text-xs">Gestão mensal de jornada e banco de horas</p>
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
                {idsNaoVinculados > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setIsMapearOpen(true)}
                    className="gap-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300 text-xs md:text-sm h-8 md:h-10"
                  >
                    <LinkIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Mapear ({idsNaoVinculados})
                  </Button>
                )}
                <Button
                  onClick={handleApurarMes}
                  disabled={apurando || !filtroFuncionario || filtroFuncionario === "todos" || !filtroMes}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-xs md:text-sm h-8 md:h-10"
                >
                  {apurando ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                      Apurando...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      Apurar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-1 md:px-4">
          <Card className="shadow-sm">
            <CardContent className="p-3 md:p-6">
              {/* Filtros */}
              <div className="bg-slate-50 rounded-lg p-3 md:p-4 mb-4 md:mb-6 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs md:text-sm font-medium">Funcionário</Label>
                    <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
                      <SelectTrigger className="text-xs md:text-sm h-8 md:h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os funcionários</SelectItem>
                        {funcionarios.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs md:text-sm font-medium">Mês de Referência</Label>
                    <Input
                      type="month"
                      value={filtroMes}
                      onChange={(e) => setFiltroMes(e.target.value)}
                      className="text-xs md:text-sm h-8 md:h-9"
                    />
                  </div>

                  <div className="space-y-1.5 flex items-end">
                    <Button
                      variant="outline"
                      onClick={limparFiltros}
                      className="w-full gap-2 text-xs md:text-sm h-8 md:h-9"
                    >
                      <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabela */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-800">
                    <TableRow>
                      <TableHead className="text-white font-semibold text-xs md:text-sm">Funcionário</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm">Mês</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm text-center">Dias Trab.</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm text-center hidden md:table-cell">Total Trab.</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm text-center hidden lg:table-cell">Atrasos</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm text-center hidden lg:table-cell">Faltas</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm text-center">H. Extras</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm text-center hidden xl:table-cell">Banco Horas</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : resumosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="w-12 h-12 text-slate-300" />
                            <p className="text-slate-500 text-xs md:text-sm">
                              Nenhum registro encontrado.
                            </p>
                            <p className="text-slate-400 text-[10px] md:text-xs">
                              Importe batidas e execute a apuração para visualizar os dados.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      resumosFiltrados.map((resumo, idx) => {
                        const funcionario = getFuncionario(resumo.funcionario_id);
                        const saldoBanco = resumo.saldo_banco_horas || 0;
                        return (
                          <TableRow key={`${resumo.funcionario_id}_${resumo.mes_referencia}_${idx}`} className="hover:bg-slate-50">
                            <TableCell className="font-medium text-xs md:text-sm">
                              {funcionario?.nome || "N/A"}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {formatMes(resumo.mes_referencia)}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-center font-semibold">
                              {resumo.dias_trabalhados}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-center hidden md:table-cell">
                              {minToHHmm(resumo.total_trabalhado_min)}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-center text-red-600 hidden lg:table-cell">
                              {minToHHmm(resumo.total_atraso_min)}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-center text-red-600 hidden lg:table-cell">
                              {minToHHmm(resumo.total_falta_min)}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-center text-green-600">
                              {minToHHmm(resumo.total_hora_extra_min)}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-center hidden xl:table-cell">
                              <Badge 
                                className={`cursor-pointer ${saldoBanco >= 0 ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : "bg-red-100 text-red-800 hover:bg-red-200"}`}
                                onClick={() => navigate(createPageUrl("BancoHoras"))}
                                title="Ver Banco de Horas"
                              >
                                {minToHHmm(saldoBanco)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEspelho(resumo)}
                                  title="Ver Espelho de Ponto"
                                  className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                                >
                                  <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                <strong>{resumosFiltrados.length}</strong> registro(s) mensal(is)
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

      {/* Modal: Mapear Funcionários */}
      <MapearFuncionariosModal
        isOpen={isMapearOpen}
        onClose={() => setIsMapearOpen(false)}
        onMapeamentoFeito={fetchData}
      />

      {/* Modal: Espelho de Ponto */}
      <EspelhoPontoCompleto
        isOpen={isEspelhoOpen}
        funcionario={funcionarioEspelho}
        mesReferencia={mesEspelho}
        onClose={() => {
          setIsEspelhoOpen(false);
          setFuncionarioEspelho(null);
          setMesEspelho("");
        }}
      />
    </>
  );
}