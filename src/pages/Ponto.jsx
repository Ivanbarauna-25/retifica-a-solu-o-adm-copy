import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Loader2, FileText, Clock, Wallet, Edit, Trash2, CheckCircle, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImportarPontoModal from "@/components/ponto/ImportarPontoModal";

export default function PontoPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funcionarioEscalas, setFuncionarioEscalas] = useState([]);
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
        base44.entities.PontoRegistro.list("-data_hora", 3000),
        base44.entities.EscalaTrabalho.list(),
        base44.entities.FuncionarioEscala.list(),
        base44.entities.OcorrenciaPonto.list()
      ]);

      setFuncionarios((funcsData || []).sort((a, b) => (a?.nome || "").localeCompare(b?.nome || "")));
      setRegistros(registrosData || []);
      setEscalas(escalasData || []);
      setFuncionarioEscalas(funcEscalasData || []);
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
    
    const regsAProcessar = registros.filter((reg) => {
      const passaFunc = filtroFuncionario === "todos" || reg.funcionario_id === filtroFuncionario;
      const dataReg = reg.data || "";
      const passaDataInicio = !filtroDataInicio || dataReg >= filtroDataInicio;
      const passaDataFim = !filtroDataFim || dataReg <= filtroDataFim;
      return passaFunc && passaDataInicio && passaDataFim;
    });

    for (const reg of regsAProcessar) {
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

    // Ordenar batidas por hora
    Object.values(grupos).forEach(grupo => {
      grupo.batidas.sort((a, b) => (a.data_hora || "").localeCompare(b.data_hora || ""));
    });

    return Object.values(grupos).sort((a, b) => {
      const compFunc = getFuncionarioNome(a.funcionario_id).localeCompare(getFuncionarioNome(b.funcionario_id));
      if (compFunc !== 0) return compFunc;
      return b.data.localeCompare(a.data);
    });
  }, [registros, filtroFuncionario, filtroDataInicio, filtroDataFim]);

  const limparFiltros = () => {
    setFiltroFuncionario("todos");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroStatus("todos");
  };

  const getEscalaDoFuncionario = (funcionarioId, data) => {
    const vinculos = funcionarioEscalas.filter(fe => fe.funcionario_id === funcionarioId);
    for (const vinculo of vinculos) {
      const inicio = vinculo.vigencia_inicio || "";
      const fim = vinculo.vigencia_fim || "9999-12-31";
      if (data >= inicio && data <= fim) {
        return escalas.find(e => e.id === vinculo.escala_id);
      }
    }
    return null;
  };

  const calcularSaldoDia = (grupo) => {
    const escala = getEscalaDoFuncionario(grupo.funcionario_id, grupo.data);
    if (!escala) return { saldo: 0, texto: "-" };

    const batidas = grupo.batidas;
    if (batidas.length < 2) return { saldo: 0, texto: "Incompleto" };

    const entrada = batidas[0]?.data_hora ? new Date(batidas[0].data_hora) : null;
    const saida = batidas[batidas.length - 1]?.data_hora ? new Date(batidas[batidas.length - 1].data_hora) : null;

    if (!entrada || !saida) return { saldo: 0, texto: "Incompleto" };

    let minutosTrabalhados = Math.floor((saida - entrada) / 60000);

    // Descontar intervalo se houver
    if (batidas.length >= 4 && escala.intervalo_inicio_previsto && escala.intervalo_fim_previsto) {
      const intervaloInicio = batidas[2]?.data_hora ? new Date(batidas[2].data_hora) : null;
      const intervaloFim = batidas[3]?.data_hora ? new Date(batidas[3].data_hora) : null;
      
      if (intervaloInicio && intervaloFim) {
        const minIntervalo = Math.floor((intervaloFim - intervaloInicio) / 60000);
        minutosTrabalhados -= minIntervalo;
      }
    }

    const cargaEsperada = escala.carga_diaria_minutos || 0;
    const saldo = minutosTrabalhados - cargaEsperada;

    const h = Math.floor(Math.abs(saldo) / 60);
    const m = Math.abs(saldo) % 60;
    const sinal = saldo >= 0 ? "+" : "-";
    const texto = `${sinal}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    return { saldo, texto };
  };

  const formatarDataBr = (data) => {
    if (!data) return "-";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const formatarHora = (dataHora) => {
    if (!dataHora) return "-";
    return dataHora.substring(11, 16);
  };

  const getFuncionarioNome = (funcionarioId) => {
    const func = funcionarios.find(f => f.id === funcionarioId);
    return func?.nome || "-";
  };

  const getOcorrenciasDoDia = (funcionarioId, data) => {
    return ocorrencias.filter(o => o.funcionario_id === funcionarioId && o.data === data);
  };

  const handleNovaOcorrencia = (grupo) => {
    setOcorrenciaModal({
      funcionario_id: grupo.funcionario_id,
      data: grupo.data,
      tipo: "justificativa",
      descricao: "",
      minutos: 0
    });
    setIsOcorrenciaModalOpen(true);
  };

  const handleSalvarOcorrencia = async () => {
    if (!ocorrenciaModal || !ocorrenciaModal.descricao) {
      toast({
        title: "Atenção",
        description: "Preencha a descrição",
        variant: "destructive"
      });
      return;
    }

    try {
      await base44.entities.OcorrenciaPonto.create(ocorrenciaModal);
      toast({
        title: "✅ Sucesso",
        description: "Ocorrência registrada"
      });
      setIsOcorrenciaModalOpen(false);
      setOcorrenciaModal(null);
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar",
        variant: "destructive"
      });
    }
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

              {/* Tabela Agrupada por Dia */}
              <div className="rounded-lg border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] md:text-xs">
                    <thead className="bg-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="text-white font-semibold px-2 py-2 text-left">Funcionário</th>
                        <th className="text-white font-semibold px-2 py-2 text-left">Data</th>
                        <th className="text-white font-semibold px-2 py-2 text-center">1ª</th>
                        <th className="text-white font-semibold px-2 py-2 text-center">2ª</th>
                        <th className="text-white font-semibold px-2 py-2 text-center hidden md:table-cell">3ª</th>
                        <th className="text-white font-semibold px-2 py-2 text-center hidden md:table-cell">4ª</th>
                        <th className="text-white font-semibold px-2 py-2 text-center">Faltou</th>
                        <th className="text-white font-semibold px-2 py-2 text-center">Saldo</th>
                        <th className="text-white font-semibold px-2 py-2 text-left hidden lg:table-cell">Ação/Justificativa</th>
                        <th className="text-white font-semibold px-2 py-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={10} className="text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-600 mx-auto" />
                          </td>
                        </tr>
                      ) : registrosAgrupados.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-12">
                            <div className="flex flex-col items-center gap-3">
                              <FileText className="w-16 h-16 text-slate-300" />
                              <p className="text-slate-500 font-medium">Nenhum registro encontrado</p>
                              <p className="text-slate-400 text-[9px]">Importe batidas ou ajuste os filtros</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        registrosAgrupados.map((grupo, idx) => {
                          const escala = getEscalaDoFuncionario(grupo.funcionario_id, grupo.data);
                          const { saldo, texto: saldoTexto } = calcularSaldoDia(grupo);
                          const ocorrenciasDia = getOcorrenciasDoDia(grupo.funcionario_id, grupo.data);
                          
                          const batidas = [
                            grupo.batidas[0] || null,
                            grupo.batidas[1] || null,
                            grupo.batidas[2] || null,
                            grupo.batidas[3] || null
                          ];

                          const faltantes = [];
                          if (!batidas[0]) faltantes.push("1ª");
                          if (!batidas[1]) faltantes.push("2ª");
                          if (escala?.intervalo_inicio_previsto && !batidas[2]) faltantes.push("3ª");
                          if (escala?.intervalo_fim_previsto && !batidas[3]) faltantes.push("4ª");

                          return (
                            <tr key={`${grupo.funcionario_id}_${grupo.data}_${idx}`} className="border-b hover:bg-slate-50">
                              <td className="px-2 py-2 font-medium text-slate-900">{getFuncionarioNome(grupo.funcionario_id)}</td>
                              <td className="px-2 py-2 font-mono text-slate-700">{formatarDataBr(grupo.data)}</td>
                              <td className="px-2 py-2 text-center font-mono">
                                {batidas[0] ? (
                                  <span className="text-blue-700 font-semibold">{formatarHora(batidas[0].data_hora)}</span>
                                ) : (
                                  <span className="text-red-500 font-bold">--:--</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center font-mono">
                                {batidas[1] ? (
                                  <span className="text-blue-700 font-semibold">{formatarHora(batidas[1].data_hora)}</span>
                                ) : (
                                  <span className="text-red-500 font-bold">--:--</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center font-mono hidden md:table-cell">
                                {batidas[2] ? (
                                  <span className="text-blue-700 font-semibold">{formatarHora(batidas[2].data_hora)}</span>
                                ) : escala?.intervalo_inicio_previsto ? (
                                  <span className="text-red-500 font-bold">--:--</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center font-mono hidden md:table-cell">
                                {batidas[3] ? (
                                  <span className="text-blue-700 font-semibold">{formatarHora(batidas[3].data_hora)}</span>
                                ) : escala?.intervalo_fim_previsto ? (
                                  <span className="text-red-500 font-bold">--:--</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {faltantes.length > 0 ? (
                                  <Badge variant="destructive" className="text-[8px] md:text-[9px]">{faltantes.join(", ")}</Badge>
                                ) : (
                                  <span className="text-green-600 font-semibold">✓</span>
                                )}
                              </td>
                              <td className={`px-2 py-2 text-center font-mono font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {saldoTexto}
                              </td>
                              <td className="px-2 py-2 text-slate-700 hidden lg:table-cell max-w-[200px]">
                                {ocorrenciasDia.length > 0 ? (
                                  <div className="space-y-1">
                                    {ocorrenciasDia.map(o => (
                                      <div key={o.id} className="text-[9px] bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                        <strong className="text-amber-700 uppercase">{o.tipo}:</strong> {o.descricao}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[9px]">-</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleNovaOcorrencia(grupo)}
                                  className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-amber-100 hover:text-amber-700"
                                  title="Registrar Ocorrência"
                                >
                                  <FileText className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-600">
                <strong>{registrosAgrupados.length}</strong> dia(s) com registros
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

      {/* Modal: Registrar Ocorrência */}
      <Dialog open={isOcorrenciaModalOpen} onOpenChange={setIsOcorrenciaModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-lg rounded-xl">
          <DialogHeader className="bg-gradient-to-r from-amber-600 to-amber-700 text-white -mx-6 -mt-6 px-5 py-4 rounded-t-xl mb-4">
            <DialogTitle className="text-base md:text-lg flex items-center gap-2">
              <FileText className="w-4 h-4 md:w-5 md:h-5" />
              Registrar Ocorrência
            </DialogTitle>
          </DialogHeader>
          {ocorrenciaModal && (
            <div className="space-y-4 px-1">
              <div className="bg-slate-100 rounded-lg p-3 text-xs">
                <div><strong>Funcionário:</strong> {getFuncionarioNome(ocorrenciaModal.funcionario_id)}</div>
                <div><strong>Data:</strong> {formatarDataBr(ocorrenciaModal.data)}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-semibold">Tipo de Ocorrência</Label>
                <Select
                  value={ocorrenciaModal.tipo}
                  onValueChange={(value) => setOcorrenciaModal({...ocorrenciaModal, tipo: value})}
                >
                  <SelectTrigger className="text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abono">Abono</SelectItem>
                    <SelectItem value="justificativa">Justificativa</SelectItem>
                    <SelectItem value="ajuste_batida">Ajuste de Batida</SelectItem>
                    <SelectItem value="falta">Falta</SelectItem>
                    <SelectItem value="atraso">Atraso</SelectItem>
                    <SelectItem value="hora_extra_autorizada">Hora Extra Autorizada</SelectItem>
                    <SelectItem value="banco_horas_ajuste">Ajuste Banco de Horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-semibold">Descrição/Justificativa</Label>
                <Textarea
                  value={ocorrenciaModal.descricao}
                  onChange={(e) => setOcorrenciaModal({...ocorrenciaModal, descricao: e.target.value})}
                  placeholder="Descreva a ocorrência..."
                  rows={4}
                  className="text-xs md:text-sm resize-none"
                />
              </div>

              {(ocorrenciaModal.tipo === 'banco_horas_ajuste' || ocorrenciaModal.tipo === 'hora_extra_autorizada') && (
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-semibold">Minutos</Label>
                  <Input
                    type="number"
                    value={ocorrenciaModal.minutos || 0}
                    onChange={(e) => setOcorrenciaModal({...ocorrenciaModal, minutos: parseInt(e.target.value) || 0})}
                    className="text-xs md:text-sm"
                  />
                </div>
              )}

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
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-xs md:text-sm"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}