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
  const [isLoading, setIsLoading] = useState(true);
  
  const [isImportarOpen, setIsImportarOpen] = useState(false);
  const [editandoRegistro, setEditandoRegistro] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [colunasVisiveis, setColunasVisiveis] = useState({
    enNo: true,
    nome: true,
    dataHora: true,
    metodo: false,
    dispositivo: false,
    status: true,
    justificativa: true,
    acoes: true
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [funcsData, registrosData] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.PontoRegistro.list("-data_hora", 2000)
      ]);

      setFuncionarios((funcsData || []).sort((a, b) => (a?.nome || "").localeCompare(b?.nome || "")));
      setRegistros(registrosData || []);
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

  const registrosFiltrados = useMemo(() => {
    return registros.filter((reg) => {
      const passaFunc = filtroFuncionario === "todos" || reg.funcionario_id === filtroFuncionario;
      
      const dataReg = reg.data || "";
      const passaDataInicio = !filtroDataInicio || dataReg >= filtroDataInicio;
      const passaDataFim = !filtroDataFim || dataReg <= filtroDataFim;
      
      let passaStatus = true;
      if (filtroStatus === "abonado") passaStatus = reg.abonado === true;
      else if (filtroStatus === "normal") passaStatus = !reg.abonado;
      else if (filtroStatus === "com_justificativa") passaStatus = !!reg.justificativa;
      
      return passaFunc && passaDataInicio && passaDataFim && passaStatus;
    });
  }, [registros, filtroFuncionario, filtroDataInicio, filtroDataFim, filtroStatus]);

  const limparFiltros = () => {
    setFiltroFuncionario("todos");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroStatus("todos");
  };

  const handleEditarRegistro = (registro) => {
    setEditandoRegistro({...registro});
    setIsEditModalOpen(true);
  };

  const handleSalvarEdicao = async () => {
    if (!editandoRegistro) return;
    
    try {
      await base44.entities.PontoRegistro.update(editandoRegistro.id, editandoRegistro);
      toast({
        title: "✅ Sucesso",
        description: "Registro atualizado com sucesso"
      });
      setIsEditModalOpen(false);
      setEditandoRegistro(null);
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o registro",
        variant: "destructive"
      });
    }
  };

  const handleExcluirRegistro = async (registroId) => {
    if (!window.confirm("Tem certeza que deseja excluir esta batida?")) return;
    
    try {
      await base44.entities.PontoRegistro.delete(registroId);
      toast({
        title: "✅ Sucesso",
        description: "Registro excluído"
      });
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o registro",
        variant: "destructive"
      });
    }
  };

  const getFuncionarioNome = (funcionarioId) => {
    const func = funcionarios.find(f => f.id === funcionarioId);
    return func?.nome || "-";
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

              {/* Tabela de Batidas */}
              <div className="rounded-lg border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800 sticky top-0 z-10">
                        <tr>
                          {colunasVisiveis.enNo && <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-left whitespace-nowrap">EnNo</th>}
                          {colunasVisiveis.nome && <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-left whitespace-nowrap">Funcionário</th>}
                          {colunasVisiveis.dataHora && <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-left whitespace-nowrap">Data/Hora</th>}
                          {colunasVisiveis.metodo && <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-left whitespace-nowrap hidden lg:table-cell">Método</th>}
                          {colunasVisiveis.dispositivo && <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-left whitespace-nowrap hidden xl:table-cell">Dispositivo</th>}
                          {colunasVisiveis.status && <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">Status</th>}
                          {colunasVisiveis.justificativa && <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-left whitespace-nowrap hidden md:table-cell">Justificativa</th>}
                          {colunasVisiveis.acoes && <th className="text-white text-[9px] md:text-[11px] font-semibold px-2 md:px-3 py-2 text-center whitespace-nowrap">Ações</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <tr>
                            <td colSpan={8} className="text-center py-12">
                              <Loader2 className="w-8 h-8 animate-spin text-slate-600 mx-auto" />
                            </td>
                          </tr>
                        ) : registrosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-12">
                              <div className="flex flex-col items-center gap-3">
                                <FileText className="w-16 h-16 text-slate-300" />
                                <p className="text-slate-500 text-xs md:text-sm font-medium">Nenhuma batida encontrada</p>
                                <p className="text-slate-400 text-[10px] md:text-xs">Importe batidas ou ajuste os filtros</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          registrosFiltrados.map((reg, idx) => (
                            <tr 
                              key={reg.id || idx} 
                              className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${reg.abonado ? 'bg-green-50/50' : ''}`}
                            >
                              {colunasVisiveis.enNo && (
                                <td className="font-mono text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-slate-900 font-medium">
                                  {reg.user_id_relogio || '-'}
                                </td>
                              )}
                              {colunasVisiveis.nome && (
                                <td className="text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-slate-700">
                                  {getFuncionarioNome(reg.funcionario_id)}
                                </td>
                              )}
                              {colunasVisiveis.dataHora && (
                                <td className="font-mono text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-slate-900 whitespace-nowrap">
                                  {reg.data_hora ? (
                                    <div className="flex flex-col">
                                      <span className="font-semibold">{reg.data_hora.substring(0, 10)}</span>
                                      <span className="text-slate-600">{reg.data_hora.substring(11, 19)}</span>
                                    </div>
                                  ) : '-'}
                                </td>
                              )}
                              {colunasVisiveis.metodo && (
                                <td className="text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-slate-600 hidden lg:table-cell">
                                  {reg.metodo || '-'}
                                </td>
                              )}
                              {colunasVisiveis.dispositivo && (
                                <td className="text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-slate-600 hidden xl:table-cell">
                                  {reg.dispositivo_id || '-'}
                                </td>
                              )}
                              {colunasVisiveis.status && (
                                <td className="text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-center">
                                  {reg.abonado ? (
                                    <Badge className="bg-green-100 text-green-700 text-[8px] md:text-[10px]">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Abonado
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[8px] md:text-[10px]">Normal</Badge>
                                  )}
                                </td>
                              )}
                              {colunasVisiveis.justificativa && (
                                <td className="text-[9px] md:text-[11px] px-2 md:px-3 py-2 text-slate-600 hidden md:table-cell max-w-[200px] truncate">
                                  {reg.justificativa || '-'}
                                </td>
                              )}
                              {colunasVisiveis.acoes && (
                                <td className="px-2 md:px-3 py-2">
                                  <div className="flex gap-1 justify-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditarRegistro(reg)}
                                      className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                                      title="Editar"
                                    >
                                      <Edit className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleExcluirRegistro(reg.id)}
                                      className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-red-100 hover:text-red-600"
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-xs md:text-sm text-slate-600">
                  <strong>{registrosFiltrados.length}</strong> batida(s) encontrada(s)
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

      {/* Modal: Editar Batida */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-lg rounded-xl">
          <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white -mx-6 -mt-6 px-5 py-4 rounded-t-xl mb-4">
            <DialogTitle className="text-base md:text-lg flex items-center gap-2">
              <Edit className="w-4 h-4 md:w-5 md:h-5" />
              Editar Batida
            </DialogTitle>
          </DialogHeader>
          {editandoRegistro && (
            <div className="space-y-4 px-1">
              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-semibold">Data/Hora</Label>
                <Input
                  type="datetime-local"
                  value={editandoRegistro.data_hora?.substring(0, 16) || ''}
                  onChange={(e) => setEditandoRegistro({...editandoRegistro, data_hora: e.target.value})}
                  className="text-xs md:text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-semibold">Funcionário</Label>
                <Select
                  value={editandoRegistro.funcionario_id || ''}
                  onValueChange={(value) => setEditandoRegistro({...editandoRegistro, funcionario_id: value})}
                >
                  <SelectTrigger className="text-xs md:text-sm">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionarios.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Checkbox
                  id="abonado"
                  checked={editandoRegistro.abonado || false}
                  onCheckedChange={(checked) => setEditandoRegistro({...editandoRegistro, abonado: checked})}
                />
                <Label htmlFor="abonado" className="text-xs md:text-sm font-semibold text-green-700 cursor-pointer">
                  Abonar esta batida
                </Label>
              </div>

              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-semibold">Justificativa</Label>
                <Textarea
                  value={editandoRegistro.justificativa || ''}
                  onChange={(e) => setEditandoRegistro({...editandoRegistro, justificativa: e.target.value})}
                  placeholder="Ex: Atestado médico, reunião externa, etc..."
                  rows={3}
                  className="text-xs md:text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditandoRegistro(null);
                  }}
                  className="flex-1 text-xs md:text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSalvarEdicao}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs md:text-sm"
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