import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye, Upload, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import ControlePontoForm from "@/components/ControlePontoForm";
import EspelhoPonto from "@/components/EspelhoPonto";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function PontoPage() {
  const [pontos, setPontos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEspelhoOpen, setIsEspelhoOpen] = useState(false);
  const [selectedPonto, setSelectedPonto] = useState(null);
  const [funcionarioEspelho, setFuncionarioEspelho] = useState(null);
  const [mesEspelho, setMesEspelho] = useState("");
  
  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroMes, setFiltroMes] = useState("");

  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pontosData, funcionariosData] = await Promise.all([
        base44.entities.ControlePonto.list("-created_date"),
        base44.entities.Funcionario.list()
      ]);
      setPontos((pontosData || []).filter(Boolean));
      setFuncionarios((funcionariosData || []).filter(Boolean).sort((a, b) => 
        (a?.nome || "").localeCompare(b?.nome || "")
      ));
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do controle de ponto.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data) => {
    try {
      const payload = {
        ...data,
        dias_trabalhados: Number(data.dias_trabalhados) || 0,
        faltas_dias: Number(data.faltas_dias) || 0,
        faltas_horas: Number(data.faltas_horas) || 0,
        horas_extras_semana: Number(data.horas_extras_semana) || 0,
        horas_extras_fds: Number(data.horas_extras_fds) || 0
      };

      if (selectedPonto) {
        await base44.entities.ControlePonto.update(selectedPonto.id, payload);
        toast({
          title: "✅ Atualizado",
          description: "Registro atualizado com sucesso."
        });
      } else {
        await base44.entities.ControlePonto.create(payload);
        toast({
          title: "✅ Criado",
          description: "Registro criado com sucesso."
        });
      }
      
      setIsFormOpen(false);
      setSelectedPonto(null);
      await fetchData();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o registro.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este registro?")) return;

    try {
      await base44.entities.ControlePonto.delete(id);
      toast({
        title: "✅ Excluído",
        description: "Registro excluído com sucesso."
      });
      await fetchData();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o registro.",
        variant: "destructive"
      });
    }
  };

  const openForm = (ponto = null) => {
    setSelectedPonto(ponto);
    setIsFormOpen(true);
  };

  const openEspelho = (ponto) => {
    const func = getFuncionario(ponto?.funcionario_id);
    setFuncionarioEspelho(func);
    setMesEspelho(ponto?.mes_referencia || "");
    setIsEspelhoOpen(true);
  };

  const getFuncionario = (funcionarioId) => {
    return funcionarios.find((f) => f?.id === funcionarioId) || null;
  };

  const formatMes = (mesReferencia) => {
    if (!mesReferencia) return "-";
    const [ano, mes] = mesReferencia.split("-");
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${meses[parseInt(mes) - 1]}/${ano}`;
  };

  const pontosFiltrados = useMemo(() => {
    return pontos.filter((ponto) => {
      if (!ponto) return false;
      const passaFuncionario =
        filtroFuncionario === "todos" || String(ponto.funcionario_id) === String(filtroFuncionario);
      const passaMes = filtroMes === "" || ponto.mes_referencia === filtroMes;
      return passaFuncionario && passaMes;
    });
  }, [pontos, filtroFuncionario, filtroMes]);

  const limparFiltros = () => {
    setFiltroFuncionario("todos");
    setFiltroMes("");
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="bg-slate-800 text-white px-2 md:px-6 py-3 md:py-5 mb-3 md:mb-4 shadow-lg rounded-lg md:rounded-xl mx-1 md:mx-0">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3">
              <div>
                <h1 className="text-sm md:text-xl font-bold">Controle de Ponto</h1>
                <p className="text-slate-400 text-[9px] md:text-xs">Gestão de registros mensais de ponto</p>
              </div>
              <div className="flex gap-2">
                <Link to={createPageUrl("ImportarPonto")}>
                  <Button variant="outline" className="gap-2 bg-white text-slate-800 hover:bg-slate-100 text-xs md:text-sm h-8 md:h-10">
                    <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Importar Batidas
                  </Button>
                </Link>
                <Button onClick={() => openForm()} className="gap-2 bg-slate-700 hover:bg-slate-600 text-xs md:text-sm h-8 md:h-10">
                  <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Novo
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
                  <TableHeader className="bg-slate-700">
                    <TableRow>
                      <TableHead className="text-white font-semibold text-xs md:text-sm">Funcionário</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm">Mês</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm text-center hidden sm:table-cell">Dias Trab.</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm text-center hidden md:table-cell">Faltas</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm text-center hidden lg:table-cell">H. Extras</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm hidden xl:table-cell">Observações</TableHead>
                      <TableHead className="text-white font-semibold text-xs md:text-sm text-center w-[100px] md:w-[140px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : pontosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-xs md:text-sm">
                          Nenhum registro encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pontosFiltrados.map((ponto) => {
                        const funcionario = getFuncionario(ponto?.funcionario_id);
                        return (
                          <TableRow key={ponto?.id} className="hover:bg-slate-50">
                            <TableCell className="font-medium text-xs md:text-sm">
                              {funcionario?.nome || "N/A"}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {formatMes(ponto?.mes_referencia)}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-center hidden sm:table-cell">
                              {ponto?.dias_trabalhados || 0}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-center hidden md:table-cell">
                              {ponto?.faltas_dias || 0}d / {ponto?.faltas_horas || 0}h
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-center hidden lg:table-cell">
                              {ponto?.horas_extras_semana || 0}h / {ponto?.horas_extras_fds || 0}h
                            </TableCell>
                            <TableCell className="text-xs md:text-sm hidden xl:table-cell max-w-[200px] truncate">
                              {ponto?.observacoes || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEspelho(ponto)}
                                  title="Ver Espelho de Ponto"
                                  className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                                >
                                  <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openForm(ponto)}
                                  title="Editar"
                                  className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-slate-100"
                                >
                                  <Edit className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(ponto?.id)}
                                  title="Excluir"
                                  className="h-7 w-7 md:h-8 md:w-8 p-0 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
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
                <strong>{pontosFiltrados.length}</strong> registro(s) encontrado(s)
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Formulário */}
      <ControlePontoForm
        isOpen={isFormOpen}
        ponto={selectedPonto}
        funcionarios={funcionarios}
        onSave={handleSave}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedPonto(null);
        }}
      />

      {/* Modal: Espelho de Ponto */}
      <EspelhoPonto
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