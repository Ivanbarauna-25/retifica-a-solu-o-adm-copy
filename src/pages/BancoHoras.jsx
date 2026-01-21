import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Wallet, Plus, TrendingUp, TrendingDown, DollarSign, Loader2, Filter } from "lucide-react";
import { formatDate } from "@/components/formatters";
import LancamentoBancoHorasModal from "@/components/ponto/LancamentoBancoHorasModal";

function minToHHmm(min) {
  if (!min || min === 0) return "00:00";
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  const sinal = min < 0 ? "-" : "";
  return `${sinal}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function BancoHorasPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroOrigem, setFiltroOrigem] = useState("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [isLancamentoModalOpen, setIsLancamentoModalOpen] = useState(false);

  const { toast } = useToast();

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [funcsData, lancamentosData] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.BancoHoras.list("-data", 1000)
      ]);
      setFuncionarios((funcsData || []).sort((a, b) => (a?.nome || "").localeCompare(b?.nome || "")));
      setLancamentos(lancamentosData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const funcionario = funcionarios.find(f => f.id === funcionarioSelecionado);

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      if (!funcionarioSelecionado || l.funcionario_id !== funcionarioSelecionado) return false;
      if (dataInicio && l.data < dataInicio) return false;
      if (dataFim && l.data > dataFim) return false;
      if (filtroTipo !== "todos" && l.tipo !== filtroTipo) return false;
      if (filtroOrigem !== "todos" && l.origem !== filtroOrigem) return false;
      return true;
    });
  }, [lancamentos, funcionarioSelecionado, dataInicio, dataFim, filtroTipo, filtroOrigem]);

  const calcularSaldos = useMemo(() => {
    if (!funcionarioSelecionado) return { saldoTotal: 0, creditosMes: 0, debitosMes: 0 };

    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

    let saldoTotal = 0;
    let creditosMes = 0;
    let debitosMes = 0;

    for (const l of lancamentos) {
      if (l.funcionario_id !== funcionarioSelecionado) continue;
      
      const valor = l.tipo === "credito" ? l.minutos : -l.minutos;
      saldoTotal += valor;

      if (l.data && l.data.startsWith(mesAtual)) {
        if (l.tipo === "credito") creditosMes += l.minutos;
        else debitosMes += l.minutos;
      }
    }

    return { saldoTotal, creditosMes, debitosMes };
  }, [lancamentos, funcionarioSelecionado]);

  const limparFiltros = () => {
    setDataInicio("");
    setDataFim("");
    setFiltroTipo("todos");
    setFiltroOrigem("todos");
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <div className="bg-slate-800 text-white px-2 md:px-6 py-3 md:py-5 mb-3 md:mb-4 shadow-lg rounded-lg md:rounded-xl mx-1 md:mx-0">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-slate-700 p-1.5 md:p-2 rounded-lg">
                  <Wallet className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div>
                  <h1 className="text-sm md:text-xl font-bold">Banco de Horas</h1>
                  <p className="text-slate-400 text-[9px] md:text-xs">Extrato e saldo de créditos/débitos</p>
                </div>
              </div>
              {funcionarioSelecionado && (
                <Button onClick={() => setIsLancamentoModalOpen(true)} className="gap-2 bg-white text-slate-800 hover:bg-slate-100 text-xs md:text-sm h-8 md:h-10">
                  <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Lançar Ajuste
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-1 md:px-4 space-y-4">
          {/* Seletor de Funcionário */}
          <Card>
            <CardContent className="p-3 md:p-4">
              <Label className="text-xs font-medium mb-2 block">Selecione o Funcionário</Label>
              <Select value={funcionarioSelecionado} onValueChange={setFuncionarioSelecionado}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Escolha um funcionário..." />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {funcionarioSelecionado && (
            <>
              {/* Cards de Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      <span className="text-[10px] md:text-xs font-medium text-blue-900">Saldo Atual</span>
                    </div>
                    <div className={`text-lg md:text-2xl font-bold ${calcularSaldos.saldoTotal >= 0 ? "text-blue-600" : "text-red-600"}`}>
                      {minToHHmm(calcularSaldos.saldoTotal)}
                    </div>
                    <div className="text-[9px] md:text-xs text-blue-700">{calcularSaldos.saldoTotal} minutos</div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-[10px] md:text-xs font-medium text-green-900">Créditos no Mês</span>
                    </div>
                    <div className="text-lg md:text-2xl font-bold text-green-600">
                      {minToHHmm(calcularSaldos.creditosMes)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-[10px] md:text-xs font-medium text-red-900">Débitos no Mês</span>
                    </div>
                    <div className="text-lg md:text-2xl font-bold text-red-600">
                      {minToHHmm(calcularSaldos.debitosMes)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-slate-50">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-4 h-4 text-slate-600" />
                      <span className="text-[10px] md:text-xs font-medium text-slate-900">Total Lançamentos</span>
                    </div>
                    <div className="text-lg md:text-2xl font-bold text-slate-600">
                      {lancamentosFiltrados.length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Extrato */}
              <Card>
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm md:text-base font-bold">Extrato de Lançamentos</h2>
                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2 text-xs">
                      <Filter className="w-3.5 h-3.5" />
                      Filtros
                    </Button>
                  </div>

                  {showFilters && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-4 border">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs font-medium">Data Início</Label>
                          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Data Fim</Label>
                          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Tipo</Label>
                          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos</SelectItem>
                              <SelectItem value="credito">Crédito</SelectItem>
                              <SelectItem value="debito">Débito</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Origem</Label>
                          <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todas</SelectItem>
                              <SelectItem value="apuracao">Apuração</SelectItem>
                              <SelectItem value="ajuste">Ajuste</SelectItem>
                              <SelectItem value="abono">Abono</SelectItem>
                              <SelectItem value="atestado">Atestado</SelectItem>
                              <SelectItem value="pagamento">Pagamento</SelectItem>
                              <SelectItem value="desconto">Desconto</SelectItem>
                              <SelectItem value="compensacao">Compensação</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={limparFiltros} className="mt-3 text-xs">
                        Limpar Filtros
                      </Button>
                    </div>
                  )}

                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-800">
                        <TableRow>
                          <TableHead className="text-white text-xs">Data</TableHead>
                          <TableHead className="text-white text-xs">Tipo</TableHead>
                          <TableHead className="text-white text-xs">Origem</TableHead>
                          <TableHead className="text-white text-xs text-right">Minutos</TableHead>
                          <TableHead className="text-white text-xs text-right">Horas</TableHead>
                          <TableHead className="text-white text-xs hidden md:table-cell">Observação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : lancamentosFiltrados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                              Nenhum lançamento encontrado para este funcionário.
                            </TableCell>
                          </TableRow>
                        ) : (
                          lancamentosFiltrados.map(l => (
                            <TableRow key={l.id} className="hover:bg-slate-50">
                              <TableCell className="text-xs">{formatDate(l.data)}</TableCell>
                              <TableCell>
                                <Badge className={l.tipo === "credito" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                  {l.tipo === "credito" ? "Crédito" : "Débito"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs capitalize">{l.origem}</TableCell>
                              <TableCell className={`text-xs text-right font-semibold ${l.tipo === "credito" ? "text-green-600" : "text-red-600"}`}>
                                {l.tipo === "credito" ? "+" : "-"}{l.minutos}
                              </TableCell>
                              <TableCell className={`text-xs text-right font-mono ${l.tipo === "credito" ? "text-green-600" : "text-red-600"}`}>
                                {l.tipo === "credito" ? "+" : "-"}{minToHHmm(l.minutos)}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 hidden md:table-cell">{l.observacao || "-"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    <strong>{lancamentosFiltrados.length}</strong> lançamento(s)
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!funcionarioSelecionado && (
            <Card>
              <CardContent className="p-8 text-center">
                <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Selecione um funcionário para visualizar o banco de horas.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {funcionario && (
        <LancamentoBancoHorasModal
          isOpen={isLancamentoModalOpen}
          onClose={() => setIsLancamentoModalOpen(false)}
          funcionario={funcionario}
          onLancamentoFeito={carregarDados}
        />
      )}
    </>
  );
}