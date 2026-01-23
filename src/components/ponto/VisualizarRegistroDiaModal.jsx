import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Clock, User, Briefcase, Calendar, CheckCircle, X, Save, AlertTriangle } from "lucide-react";

export default function VisualizarRegistroDiaModal({ isOpen, onClose, grupo, onSalvo }) {
  const [funcionario, setFuncionario] = useState(null);
  const [cargo, setCargo] = useState(null);
  const [escala, setEscala] = useState(null);
  const [ocorrencia, setOcorrencia] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editandoBatida, setEditandoBatida] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !grupo) return;
    
    const fetchDados = async () => {
      setIsLoading(true);
      try {
        const [funcData, escalasData, funcEscalasData, cargosData, ocorrenciasData] = await Promise.all([
          base44.entities.Funcionario.filter({ id: grupo.funcionario_id }),
          base44.entities.EscalaTrabalho.list(),
          base44.entities.FuncionarioEscala.list(),
          base44.entities.Cargo.list(),
          base44.entities.OcorrenciaPonto.filter({ 
            funcionario_id: grupo.funcionario_id,
            data: grupo.data
          })
        ]);

        const func = funcData?.[0];
        setFuncionario(func);

        if (func) {
          const cargoData = cargosData?.find(c => c.id === func.cargo_id);
          setCargo(cargoData);

          const funcEscala = funcEscalasData?.find(fe => fe.funcionario_id === func.id);
          if (funcEscala) {
            const escalaData = escalasData?.find(e => e.id === funcEscala.escala_id);
            setEscala(escalaData);
          }
        }

        setOcorrencia(ocorrenciasData?.[0] || null);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDados();
  }, [isOpen, grupo]);

  const formatarData = (data) => {
    if (!data) return "-";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const formatarHora = (hora) => {
    if (!hora) return "-";
    return hora.substring(0, 5);
  };

  const getDiaSemana = (data) => {
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const d = new Date(data + 'T00:00:00');
    return dias[d.getDay()];
  };

  const calcularSaldo = () => {
    if (!escala || !escala.carga_diaria_minutos) return 0;
    
    let totalTrabalhado = 0;
    const batidas = grupo.batidas || [];
    
    for (let i = 0; i < batidas.length; i += 2) {
      if (!batidas[i + 1]) break;
      const h1 = batidas[i].hora || "00:00:00";
      const h2 = batidas[i + 1].hora || "00:00:00";
      
      const [h1h, h1m] = h1.split(":").map(Number);
      const [h2h, h2m] = h2.split(":").map(Number);
      
      const min1 = h1h * 60 + h1m;
      const min2 = h2h * 60 + h2m;
      
      totalTrabalhado += (min2 - min1);
    }
    
    return totalTrabalhado - escala.carga_diaria_minutos;
  };

  const minToHHmm = (min) => {
    if (!min || min === 0) return "00:00";
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    const sinal = min < 0 ? "-" : "+";
    return `${sinal}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const handleSalvarOcorrencia = async () => {
    if (!editandoBatida) return;
    
    if (!editandoBatida.descricao?.trim()) {
      toast({
        title: "Atenção",
        description: "Informe uma descrição para a ocorrência",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editandoBatida.ocorrencia_id) {
        await base44.entities.OcorrenciaPonto.update(editandoBatida.ocorrencia_id, {
          tipo: editandoBatida.tipo,
          descricao: editandoBatida.descricao
        });
      } else {
        await base44.entities.OcorrenciaPonto.create({
          funcionario_id: grupo.funcionario_id,
          data: grupo.data,
          tipo: editandoBatida.tipo,
          descricao: editandoBatida.descricao,
          status: "aprovado"
        });
      }

      toast({
        title: "✅ Sucesso",
        description: "Ocorrência salva"
      });

      setEditandoBatida(null);
      if (onSalvo) onSalvo();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar",
        variant: "destructive"
      });
    }
  };

  if (!grupo) return null;

  const batidas = grupo.batidas || [];
  const batidasOrdenadas = [...batidas].sort((a, b) => {
    const horaA = a.hora || "00:00:00";
    const horaB = b.hora || "00:00:00";
    return horaA.localeCompare(horaB);
  });

  const saldo = calcularSaldo();
  const posicoes = ["1ª Entrada", "2ª Saída Almoço", "3ª Volta Almoço", "4ª Saída Final"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white -mx-6 -mt-6 px-5 py-4 rounded-t-xl mb-4">
          <DialogTitle className="text-base md:text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Detalhes do Registro de Ponto
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Informações do Funcionário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-semibold">Funcionário</p>
                  <p className="text-sm font-bold text-slate-900">{funcionario?.nome || "-"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-semibold">Cargo</p>
                  <p className="text-sm font-bold text-slate-900">{cargo?.nome || "-"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-semibold">Data</p>
                  <p className="text-sm font-bold text-slate-900">
                    {formatarData(grupo.data)} - {getDiaSemana(grupo.data)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-semibold">Escala</p>
                  <p className="text-sm font-bold text-slate-900">{escala?.nome || "-"}</p>
                </div>
              </div>
            </div>

            {/* Tabela de Batidas */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-800 px-4 py-3">
                <h3 className="text-white font-semibold text-sm">Batidas do Dia</h3>
              </div>
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-700">Posição</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-slate-700">Horário</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-slate-700">Status</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-slate-700">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {posicoes.map((posicao, idx) => {
                    const batida = batidasOrdenadas[idx];
                    const temBatida = !!batida;
                    
                    return (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">{posicao}</td>
                        <td className="px-4 py-3 text-center">
                          {temBatida ? (
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {formatarHora(batida.hora)}
                            </span>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Faltou</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {temBatida ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">✓ Presente</Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 text-xs">Ausente</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {!temBatida && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditandoBatida({
                                posicao: idx + 1,
                                tipo: "justificativa",
                                descricao: "",
                                ocorrencia_id: ocorrencia?.id || null
                              })}
                              className="text-xs h-7"
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Tratar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Saldo do Dia */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-semibold mb-1">Saldo do Dia</p>
                  <p className="text-sm text-blue-900">
                    Esperado: <span className="font-bold">{escala ? minToHHmm(escala.carga_diaria_minutos) : "-"}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {minToHHmm(saldo)}
                  </p>
                  <p className="text-xs text-slate-600">
                    {saldo >= 0 ? "Horas extras" : "Déficit"}
                  </p>
                </div>
              </div>
            </div>

            {/* Ocorrência Atual */}
            {ocorrencia && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900 mb-1">
                      Ocorrência Registrada: {ocorrencia.tipo}
                    </p>
                    <p className="text-xs text-yellow-800">{ocorrencia.descricao}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-4 border-t pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>

        {/* Modal de Edição de Ocorrência */}
        {editandoBatida && (
          <Dialog open={!!editandoBatida} onOpenChange={() => setEditandoBatida(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white -mx-6 -mt-6 px-5 py-4 rounded-t-xl mb-4">
                <DialogTitle className="text-base">Tratar Batida Faltante</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-600">
                    <strong>Batida:</strong> {editandoBatida.posicao}ª {posicoes[editandoBatida.posicao - 1]}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Tipo de Ocorrência</Label>
                  <Select
                    value={editandoBatida.tipo}
                    onValueChange={(value) => setEditandoBatida({...editandoBatida, tipo: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atestado">Atestado</SelectItem>
                      <SelectItem value="abonado">Abonado</SelectItem>
                      <SelectItem value="folga">Folga</SelectItem>
                      <SelectItem value="ferias">Férias</SelectItem>
                      <SelectItem value="justificativa">Justificativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Descrição</Label>
                  <Textarea
                    value={editandoBatida.descricao || ''}
                    onChange={(e) => setEditandoBatida({...editandoBatida, descricao: e.target.value})}
                    placeholder="Descreva o motivo..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditandoBatida(null)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleSalvarOcorrencia} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}