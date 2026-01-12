import React, { useEffect, useMemo, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Edit, Trash2, Filter, Printer, Eye, CheckCircle2, Users, Search, Wallet, Loader2, X, Check, Receipt } from "lucide-react";
import AdiantamentoForm from "@/components/adiantamentos/AdiantamentoForm";
import AdiantamentoLoteForm from "@/components/AdiantamentoLoteForm";
import AdiantamentoViewer from "@/components/adiantamentos/AdiantamentoViewer";
import PagamentoParcialModal from "@/components/adiantamentos/PagamentoParcialModal";
import GerarMovimentacaoModal from "@/components/adiantamentos/GerarMovimentacaoModal";
import { formatCurrency, formatDate } from "@/components/formatters";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RelatorioAdiantamentosFiltersModal from "@/components/adiantamentos/RelatorioAdiantamentosFiltersModal";
import StandardDialog from "@/components/ui/StandardDialog";
import ProgressModal, { useProgressModal } from '@/components/ui/ProgressModal';

export default function AdiantamentosPage() {
  const [itens, setItens] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoteFormOpen, setIsLoteFormOpen] = useState(false);
  const [editando, setEditando] = useState(null);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroCompetencia, setFiltroCompetencia] = useState("");
  const [filtroPagamentoParcial, setFiltroPagamentoParcial] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [adiantamentoSelecionado, setAdiantamentoSelecionado] = useState(null);

  const [isPagamentoParcialOpen, setIsPagamentoParcialOpen] = useState(false);
  const [adiantamentoParaPagamento, setAdiantamentoParaPagamento] = useState(null);

  const [isGerarFinanceiroOpen, setIsGerarFinanceiroOpen] = useState(false);
  const [adiantamentoParaFinanceiro, setAdiantamentoParaFinanceiro] = useState(null);

  const [selecionados, setSelecionados] = useState([]);
  const [isAprovacaoLoteOpen, setIsAprovacaoLoteOpen] = useState(false);
  const [observacoesAprovacao, setObservacoesAprovacao] = useState("");
  const [processandoLote, setProcessandoLote] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [isRelatorioFiltersModalOpen, setIsRelatorioFiltersModalOpen] = useState(false);
  const [departamentos, setDepartamentos] = useState([]);
  const progress = useProgressModal();


  const { toast } = useToast();

  const statusColors = {
    'pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'aprovado': 'bg-blue-100 text-blue-800 border-blue-200',
    'pago': 'bg-green-100 text-green-800 border-green-200',
    'cancelado': 'bg-red-100 text-red-800 border-red-200'
  };

  const statusLabels = {
    'pendente': 'Pendente',
    'aprovado': 'Aprovado',
    'pago': 'Pago',
    'cancelado': 'Cancelado'
  };

  const carregar = async () => {
    setIsLoading(true);
    setErro(null);
    try {
      const [ads, funcs, pcs, cbs, depts] = await Promise.all([
        base44.entities.Adiantamento.list("-created_date"),
        base44.entities.Funcionario.list(),
        base44.entities.PlanoContas.list(),
        base44.entities.ContaBancaria.list(),
        base44.entities.Departamento.list()
      ]);

      setItens((ads || []).filter(Boolean));
      setFuncionarios((funcs || []).sort((a, b) => a.nome.localeCompare(b.nome)));
      setPlanos((pcs || []).sort((a, b) => a.nome.localeCompare(b.nome)));
      setContasBancarias((cbs || []).sort((a, b) => a.nome.localeCompare(b.nome)));
      setDepartamentos((depts || []).sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (e) {
      console.error("Erro ao carregar adiantamentos:", e);
      setErro("Não foi possível carregar os dados.");
      toast({
        title: "❌ Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const getFuncionarioNome = useCallback((id) => {
    if (!id || id === 'unassigned' || id === 'todos' || id === 'all' || id === 'null' || id === 'undefined') {
      return 'Não encontrado';
    }
    const func = funcionarios.find(f => f.id === id);
    return func?.nome || 'Não encontrado';
  }, [funcionarios]);

  const getPlanoContasNome = useCallback((id) => {
    if (!id || id === 'unassigned' || id === 'todos' || id === 'all' || id === 'null' || id === 'undefined') {
      return '-';
    }
    const pc = planos.find(p => p.id === id);
    return pc?.nome || '-';
  }, [planos]);

  const getContaBancariaNome = useCallback((id) => {
    if (!id || id === 'unassigned' || id === 'todos' || id === 'all' || id === 'null' || id === 'undefined') {
      return '-';
    }
    const conta = contasBancarias.find(c => c.id === id);
    return conta?.nome || '-';
  }, [contasBancarias]);

  const filtrados = useMemo(() => {
    return (itens || []).filter((a) => {
      if (!a) return false;
      const byBusca =
        !busca ||
        (a.motivo || "").toLowerCase().includes(busca.toLowerCase()) ||
        getFuncionarioNome(a.funcionario_id).toLowerCase().includes(busca.toLowerCase());
      const byStatus = filtroStatus === "todos" || a.status === filtroStatus;
      const byFunc = filtroFuncionario === "todos" || String(a.funcionario_id) === String(filtroFuncionario);
      const byComp = !filtroCompetencia || a.competencia === filtroCompetencia;
      const byParcial = !filtroPagamentoParcial || ((Number(a.valor_pago) || 0) > 0 && (Number(a.valor_pago) || 0) < (Number(a.valor) || 0));
      return byBusca && byStatus && byFunc && byComp && byParcial;
    });
  }, [itens, busca, filtroStatus, filtroFuncionario, filtroCompetencia, filtroPagamentoParcial, funcionarios, getFuncionarioNome]);

  const totalFiltrado = useMemo(
    () => filtrados.reduce((acc, a) => acc + (Number(a.valor) || 0), 0),
    [filtrados]
  );

  const showConfirm = (title, message, onConfirm) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };

  const abrirNovo = () => {
    setEditando(null);
    setIsFormOpen(true);
  };

  const abrirLote = () => {
    setIsLoteFormOpen(true);
  };

  const abrirEdicao = (item) => {
    setEditando(item);
    setIsFormOpen(true);
  };

  const abrirVisualizacao = (item) => {
    setAdiantamentoSelecionado(item);
    setIsViewerOpen(true);
  };

  const abrirPagamentoParcial = (item) => {
    setAdiantamentoParaPagamento(item);
    setIsPagamentoParcialOpen(true);
  };

  const abrirGerarFinanceiro = (item) => {
    if (item.movimentacao_financeira_id) {
      toast({
        title: "⚠️ Movimentação já gerada",
        description: "Este adiantamento já possui uma movimentação financeira vinculada. Cancele ou exclua a movimentação anterior para gerar uma nova.",
        variant: "destructive"
      });
      return;
    }
    setAdiantamentoParaFinanceiro(item);
    setIsGerarFinanceiroOpen(true);
    // Se estiver abrindo a partir do viewer, fechamos o viewer
    setIsViewerOpen(false);
  };

  const excluir = async (id) => {
    showConfirm(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este adiantamento?',
      async () => {
        try {
          await base44.entities.Adiantamento.delete(id);
          toast({
            title: "✅ Sucesso",
            description: "Adiantamento excluído com sucesso."
          });
          await carregar();
        } catch (error) {
          toast({
            title: "❌ Erro ao excluir",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    );
  };

  const onSave = async (data) => {
    try {
      if (editando) {
        await base44.entities.Adiantamento.update(editando.id, data);
        toast({
          title: "✅ Sucesso",
          description: "Adiantamento atualizado com sucesso."
        });
      } else {
        await base44.entities.Adiantamento.create(data);
        toast({
          title: "✅ Sucesso",
          description: "Adiantamento criado com sucesso."
        });
      }
      setIsFormOpen(false);
      setEditando(null);
      await carregar();
    } catch (error) {
      toast({
        title: "❌ Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const onSaveLote = async (registros) => {
    try {
      for (const registro of registros) {
        await base44.entities.Adiantamento.create(registro);
      }
      toast({
        title: "✅ Sucesso",
        description: `${registros.length} adiantamento(s) criado(s) com sucesso.`
      });
      setIsLoteFormOpen(false);
      await carregar();
    } catch (error) {
      toast({
        title: "❌ Erro ao salvar lote",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleGenerateRelatorio = (filters) => {
    let filteredForReport = itens;

    if (filters.status && filters.status !== 'todos') {
      filteredForReport = filteredForReport.filter((a) => a.status === filters.status);
    }

    if (filters.funcionarioId && filters.funcionarioId !== 'todos') {
      filteredForReport = filteredForReport.filter((a) => String(a.funcionario_id) === String(filters.funcionarioId));
    }

    if (filters.departamentoId && filters.departamentoId !== 'todos') {
      filteredForReport = filteredForReport.filter((a) => {
        const func = funcionarios.find((f) => f.id === a.funcionario_id);
        return func && String(func.departamento_id) === String(filters.departamentoId);
      });
    }

    if (filters.competencia) {
      filteredForReport = filteredForReport.filter((a) => a.competencia === filters.competencia);
    }

    if (filters.dataInicio) {
      filteredForReport = filteredForReport.filter((a) =>
        a.data_adiantamento && new Date(a.data_adiantamento) >= new Date(filters.dataInicio)
      );
    }

    if (filters.dataFim) {
      filteredForReport = filteredForReport.filter((a) =>
        a.data_adiantamento && new Date(a.data_adiantamento) <= new Date(filters.dataFim)
      );
    }

    if (filters.apenasAprovados) {
      filteredForReport = filteredForReport.filter((a) => a.status === 'aprovado');
    }

    if (filters.apenasPagos) {
      filteredForReport = filteredForReport.filter((a) => a.status === 'pago');
    }

    if (filters.comPagamentoParcial) {
      filteredForReport = filteredForReport.filter((a) => (Number(a.valor_pago) || 0) > 0 && (Number(a.valor_pago) || 0) < (Number(a.valor) || 0));
    }

    const filtrosInfo = {
      status: filters.status,
      competencia: filters.competencia,
      dataInicio: filters.dataInicio,
      dataFim: filters.dataFim,
      funcionarioNome: filters.funcionarioId && filters.funcionarioId !== 'todos' ? getFuncionarioNome(filters.funcionarioId) : 'Todos',
      departamentoNome: filters.departamentoId && filters.departamentoId !== 'todos' ? departamentos.find((d) => d.id === filters.departamentoId)?.nome : 'Todos',
      apenasAprovados: filters.apenasAprovados,
      apenasPagos: filters.apenasPagos,
      comPagamentoParcial: filters.comPagamentoParcial
    };

    const filtrosJSON = encodeURIComponent(JSON.stringify(filtrosInfo));
    const adiantamentosJSON = encodeURIComponent(JSON.stringify(filteredForReport));

    const url = `/RelatorioAdiantamentos?filtros=${filtrosJSON}&adiantamentos=${adiantamentosJSON}`;
    window.open(url, '_blank');
    setIsRelatorioFiltersModalOpen(false);
  };


  const handleSelectAll = (checked) => {
    if (checked) {
      const pendentes = filtrados.filter(a => a.status === 'pendente').map(a => a.id);
      setSelecionados(pendentes);
    } else {
      setSelecionados([]);
    }
  };

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelecionados(prev => [...prev, id]);
    } else {
      setSelecionados(prev => prev.filter(i => i !== id));
    }
  };

  const isSelected = (id) => selecionados.includes(id);

  const todosSelecionados = filtrados.filter(a => a.status === 'pendente').length > 0 &&
    filtrados.filter(a => a.status === 'pendente').every(a => isSelected(a.id));

  const abrirAprovacaoLote = () => {
    if (selecionados.length === 0) {
      toast({
        title: "⚠️ Nenhum adiantamento selecionado",
        description: "Selecione ao menos um adiantamento para aprovar.",
        variant: "destructive"
      });
      return;
    }
    setObservacoesAprovacao("");
    setIsAprovacaoLoteOpen(true);
  };

  const confirmarAprovacaoLote = async () => {
    setProcessandoLote(true);
    setIsAprovacaoLoteOpen(false);
    progress.start('Aprovando adiantamentos...', selecionados.length);
    
    try {
      const user = await base44.auth.me();
      let sucessos = 0;
      let erros = 0;

      for (let i = 0; i < selecionados.length; i++) {
        const id = selecionados[i];
        try {
          const adiantamento = itens.find(a => a.id === id);
          if (adiantamento && adiantamento.status === 'pendente') {
            await base44.entities.Adiantamento.update(id, {
              status: 'aprovado',
              data_aprovacao: new Date().toISOString(),
              aprovado_por: user.email,
              observacoes_aprovacao: observacoesAprovacao || undefined
            });
            sucessos++;
          }
        } catch (error) {
          console.error(`Erro ao aprovar adiantamento ${id}:`, error);
          erros++;
        }
        progress.updateProgress(i + 1);
      }

      setSelecionados([]);
      setObservacoesAprovacao("");
      await carregar();
      
      if (erros > 0) {
        progress.error(`${sucessos} aprovado(s), ${erros} erro(s).`);
      } else {
        progress.success(`${sucessos} adiantamento(s) aprovado(s) com sucesso.`);
      }
    } catch (error) {
      progress.error(error.message);
    } finally {
      setProcessandoLote(false);
    }
  };

  const adiantamentosSelecionados = useMemo(() => {
    return itens.filter(a => selecionados.includes(a.id));
  }, [itens, selecionados]);

  const totalSelecionados = useMemo(() => {
    return adiantamentosSelecionados.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
  }, [adiantamentosSelecionados]);

  const totais = useMemo(() => {
    const pendente = filtrados.filter(a => a.status === 'pendente').reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
    const aprovado = filtrados.filter(a => a.status === 'aprovado').reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
    const pago = filtrados.filter(a => a.status === 'pago').reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
    return { pendente, aprovado, pago };
  }, [filtrados]);

  if (erro) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{erro}</p>
              <Button onClick={() => {
                setErro(null);
                carregar();
              }} className="bg-slate-800 hover:bg-slate-700">
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
  <>
    <div className="min-h-screen bg-slate-50 w-full max-w-full overflow-x-hidden">
        <div className="bg-slate-800 text-white px-2 md:px-6 py-3 md:py-5 mb-3 md:mb-4 shadow-lg rounded-lg md:rounded-xl mx-1 md:mx-0">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-slate-700 p-1.5 md:p-2 rounded-lg">
                  <Wallet className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div>
                  <h1 className="text-sm md:text-xl font-bold">Adiantamentos</h1>
                  <p className="text-slate-400 text-[9px] md:text-xs">Gestão de adiantamentos</p>
                </div>
              </div>

              <div className="flex gap-1 md:gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)} 
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1 md:gap-2 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3"
                >
                  <Filter className="w-3 h-3 md:w-4 md:h-4" /> 
                  <span className="hidden sm:inline">Filtros</span>
                </Button>

                {selecionados.length > 0 && (
                  <Button 
                    variant="outline" 
                    className="bg-green-600 border-green-600 text-white hover:bg-green-700 gap-1 md:gap-2 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3" 
                    onClick={abrirAprovacaoLote}
                  >
                    <CheckCircle2 className="w-3 h-3 md:h-4 md:w-4" /> Aprovar ({selecionados.length})
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  onClick={() => setIsRelatorioFiltersModalOpen(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1 md:gap-2 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3"
                >
                  <Printer className="w-3 h-3 md:h-4 md:w-4" /> 
                  <span className="hidden sm:inline">Relatório</span>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={abrirLote} 
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1 md:gap-2 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3"
                >
                  <Users className="w-3 h-3 md:h-4 md:w-4" /> 
                  <span className="hidden sm:inline">Lote</span>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={abrirNovo} 
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1 md:gap-2 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3"
                >
                  <Plus className="w-3 h-3 md:h-4 md:w-4" /> Novo
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-1 md:px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-3 mb-2 md:mb-4">
            <Card className="border-l-2 md:border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-2 md:p-4">
                <p className="text-[9px] md:text-xs font-medium text-slate-500 mb-0.5">Total</p>
                <div className="text-xs md:text-lg font-bold text-slate-900">{formatCurrency(totalFiltrado)}</div>
              </CardContent>
            </Card>

            <Card className="border-l-2 md:border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-2 md:p-4">
                <p className="text-[9px] md:text-xs font-medium text-slate-500 mb-0.5">Pendentes</p>
                <div className="text-xs md:text-lg font-bold text-yellow-600">{formatCurrency(totais.pendente)}</div>
              </CardContent>
            </Card>

            <Card className="border-l-2 md:border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-2 md:p-4">
                <p className="text-[9px] md:text-xs font-medium text-slate-500 mb-0.5">Aprovados</p>
                <div className="text-xs md:text-lg font-bold text-blue-600">{formatCurrency(totais.aprovado)}</div>
              </CardContent>
            </Card>

            <Card className="border-l-2 md:border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-2 md:p-4">
                <p className="text-[9px] md:text-xs font-medium text-slate-500 mb-0.5">Pagos</p>
                <div className="text-xs md:text-lg font-bold text-green-600">{formatCurrency(totais.pago)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-1.5 md:p-3 mb-2 md:mb-3">
            <div className="relative">
              <Search className="absolute left-2 md:left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5 md:w-4 md:h-4" />
              <Input
                placeholder="Buscar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-7 md:pl-8 text-slate-900 text-xs md:text-sm h-8 md:h-9"
              />
            </div>
          </div>

          {showFilters && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Funcionário</Label>
                    <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {funcionarios.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Competência</Label>
                    <Input
                      type="month"
                      placeholder="Competência (AAAA-MM)"
                      value={filtroCompetencia}
                      onChange={(e) => setFiltroCompetencia(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center h-full pt-8">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="filtroParcial" 
                        checked={filtroPagamentoParcial}
                        onCheckedChange={setFiltroPagamentoParcial}
                        className="border-slate-400"
                      />
                      <label
                        htmlFor="filtroParcial"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700"
                      >
                        Com Pagamento Parcial
                      </label>
                    </div>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBusca("");
                        setFiltroStatus("todos");
                        setFiltroFuncionario("todos");
                        setFiltroCompetencia("");
                        setFiltroPagamentoParcial(false);
                      }}
                      className="w-full"
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela Desktop */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-700 hover:bg-slate-700">
                    <TableHead className="text-white font-semibold w-12">
                      <Checkbox
                        checked={todosSelecionados}
                        onCheckedChange={handleSelectAll}
                        disabled={filtrados.filter(a => a.status === 'pendente').length === 0}
                        className="border-white"
                      />
                    </TableHead>
                    <TableHead className="text-white font-semibold">Funcionário</TableHead>
                    <TableHead className="text-white font-semibold">Data</TableHead>
                    <TableHead className="text-white font-semibold">Competência</TableHead>
                    <TableHead className="text-white font-semibold text-right">Valor</TableHead>
                    <TableHead className="text-white font-semibold text-right">Pago Parcialmente</TableHead>
                    <TableHead className="text-white font-semibold text-right">Valor a Receber</TableHead>
                    <TableHead className="text-white font-semibold">Motivo</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                        <p className="mt-2 text-slate-600">Carregando...</p>
                      </TableCell>
                    </TableRow>
                  ) : filtrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtrados.map((a) => {
                      const valorPago = Number(a.valor_pago) || 0;
                      const valorRestante = Number(a.valor) - valorPago;
                      
                      return (
                        <TableRow key={a.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <Checkbox
                              checked={isSelected(a.id)}
                              onCheckedChange={(checked) => handleSelectItem(a.id, checked)}
                              disabled={a.status !== 'pendente'}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">{getFuncionarioNome(a.funcionario_id)}</TableCell>
                          <TableCell className="text-slate-900">{formatDate(a.data_adiantamento)}</TableCell>
                          <TableCell className="text-slate-900">{a.competencia || "-"}</TableCell>
                          <TableCell className="text-right whitespace-nowrap font-semibold text-slate-900">{formatCurrency(a.valor)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap font-semibold text-green-600">
                            {valorPago > 0 ? formatCurrency(valorPago) : '-'}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap font-semibold text-red-600">
                            {valorRestante > 0 ? formatCurrency(valorRestante) : '-'}
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate text-slate-900">{a.motivo || "-"}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[a.status] || 'bg-gray-100 text-gray-800'}>
                              {statusLabels[a.status] || a.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Visualizar"
                                onClick={() => abrirVisualizacao(a)}
                                className="hover:bg-blue-50 text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Pagamento Parcial"
                                onClick={() => abrirPagamentoParcial(a)}
                                className="hover:bg-green-50 text-green-600"
                              >
                                <Receipt className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Editar" 
                                onClick={() => abrirEdicao(a)}
                                className="hover:bg-amber-50 text-amber-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Excluir"
                                onClick={() => excluir(a.id)}
                                className="hover:bg-red-50 text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
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
          </div>

          {/* Cards Mobile */}
          <div className="md:hidden space-y-2">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                <p className="mt-2 text-slate-600 text-sm">Carregando...</p>
              </div>
            ) : filtrados.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhum registro encontrado.
              </div>
            ) : (
              filtrados.map((a) => {
                const valorPago = Number(a.valor_pago) || 0;
                const valorRestante = Number(a.valor) - valorPago;
                
                return (
                  <div key={a.id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-2.5">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {a.status === 'pendente' && (
                          <Checkbox
                            checked={isSelected(a.id)}
                            onCheckedChange={(checked) => handleSelectItem(a.id, checked)}
                            className="w-4 h-4"
                          />
                        )}
                        <div>
                          <h3 className="font-semibold text-slate-900 text-xs leading-tight">{getFuncionarioNome(a.funcionario_id)}</h3>
                          <p className="text-[10px] text-slate-500">{formatDate(a.data_adiantamento)}</p>
                        </div>
                      </div>
                      <Badge className={`${statusColors[a.status] || 'bg-gray-100 text-gray-800'} text-[9px] px-1.5 py-0.5`}>
                        {statusLabels[a.status] || a.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-[10px] mb-1.5">
                      <div>
                        <span className="text-slate-500">Valor:</span>
                        <span className="font-semibold text-slate-900 ml-0.5">{formatCurrency(a.valor)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Comp:</span>
                        <span className="text-slate-900 ml-0.5">{a.competencia || "-"}</span>
                      </div>
                      {valorPago > 0 && (
                        <div>
                          <span className="text-slate-500">Pago:</span>
                          <span className="font-semibold text-green-600 ml-0.5">{formatCurrency(valorPago)}</span>
                        </div>
                      )}
                      {valorRestante > 0 && valorPago > 0 && (
                        <div>
                          <span className="text-slate-500">Rest:</span>
                          <span className="font-semibold text-red-600 ml-0.5">{formatCurrency(valorRestante)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-0.5 pt-1.5 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirVisualizacao(a)}
                        className="h-7 w-7 p-0 hover:bg-blue-50 text-blue-600"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirPagamentoParcial(a)}
                        className="h-7 w-7 p-0 hover:bg-green-50 text-green-600"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => abrirEdicao(a)}
                        className="h-7 w-7 p-0 hover:bg-amber-50 text-amber-600"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => excluir(a.id)}
                        className="h-7 w-7 p-0 hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-2 md:mt-3 flex items-center justify-between text-[10px] md:text-xs px-1 gap-2">
            <div className="text-slate-500 flex items-center gap-1">
              <span><strong className="text-slate-700">{filtrados.length}</strong> itens</span>
              {selecionados.length > 0 && (
                <span className="text-blue-600">• <strong>{selecionados.length}</strong> sel.</span>
              )}
            </div>
            <div className="font-bold text-slate-900 text-xs">{formatCurrency(totalFiltrado)}</div>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <AdiantamentoForm
          isOpen={isFormOpen}
          adiantamento={editando}
          funcionarios={funcionarios}
          planos={planos}
          contasBancarias={contasBancarias}
          onSave={onSave}
          onClose={() => {
            setIsFormOpen(false);
            setEditando(null);
          }}
        />
      )}

      {isLoteFormOpen && (
        <AdiantamentoLoteForm
          isOpen={isLoteFormOpen}
          funcionarios={funcionarios}
          planos={planos}
          contasBancarias={contasBancarias}
          onSave={onSaveLote}
          onClose={() => setIsLoteFormOpen(false)}
        />
      )}

      {isViewerOpen && adiantamentoSelecionado && (
        <AdiantamentoViewer
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setAdiantamentoSelecionado(null);
          }}
          adiantamento={adiantamentoSelecionado}
          funcionarios={funcionarios}
          planos={planos}
          contasBancarias={contasBancarias}
          getFuncionarioNome={getFuncionarioNome}
          getPlanoContasNome={getPlanoContasNome}
          getContaBancariaNome={getContaBancariaNome}
          onUpdated={carregar}
          onOpenFinanceiro={abrirGerarFinanceiro}
          onOpenPagamentoParcial={(item) => {
            setIsViewerOpen(false);
            abrirPagamentoParcial(item);
          }}
        />
      )}

      {isPagamentoParcialOpen && adiantamentoParaPagamento && (
        <PagamentoParcialModal
          isOpen={isPagamentoParcialOpen}
          onClose={() => {
            setIsPagamentoParcialOpen(false);
            setAdiantamentoParaPagamento(null);
          }}
          adiantamento={adiantamentoParaPagamento}
          funcionarios={funcionarios}
          onSaved={() => {
            carregar();
            // Manter o modal fechado após salvar, o próprio componente já fecha, mas garantimos aqui
          }}
        />
      )}

      {isGerarFinanceiroOpen && adiantamentoParaFinanceiro && (
        <GerarMovimentacaoModal
          isOpen={isGerarFinanceiroOpen}
          onClose={() => {
            setIsGerarFinanceiroOpen(false);
            setAdiantamentoParaFinanceiro(null);
          }}
          itens={[adiantamentoParaFinanceiro]}
          funcionarios={funcionarios}
          onGenerated={() => {
            setIsGerarFinanceiroOpen(false);
            setAdiantamentoParaFinanceiro(null);
            carregar();
          }}
        />
      )}

      {isRelatorioFiltersModalOpen && (
        <RelatorioAdiantamentosFiltersModal
          isOpen={isRelatorioFiltersModalOpen}
          onClose={() => setIsRelatorioFiltersModalOpen(false)}
          onGenerate={handleGenerateRelatorio}
          funcionarios={funcionarios}
          departamentos={departamentos}
        />
      )}

      <Dialog open={isAprovacaoLoteOpen} onOpenChange={setIsAprovacaoLoteOpen}>
        <DialogContent className="max-w-2xl bg-white border-2 border-slate-800 shadow-2xl modern-modal" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="px-6 py-4 bg-slate-800 text-white border-b border-slate-700">
            <DialogTitle className="flex items-center gap-3 text-white text-xl font-bold">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              Aprovar Adiantamentos em Lote
            </DialogTitle>
            <DialogDescription className="text-slate-300 font-medium text-base mt-2">
              Você está prestes a aprovar <strong className="text-white">{selecionados.length}</strong> adiantamento(s) no valor total de <strong className="text-white">{formatCurrency(totalSelecionados)}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto border-2 border-slate-300 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800 hover:bg-slate-800">
                    <TableHead className="text-white font-bold">Funcionário</TableHead>
                    <TableHead className="text-white font-bold">Data</TableHead>
                    <TableHead className="text-right text-white font-bold">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adiantamentosSelecionados.map(a => (
                    <TableRow key={a.id} className="hover:bg-slate-50">
                      <TableCell className="text-slate-900 font-medium">{getFuncionarioNome(a.funcionario_id)}</TableCell>
                      <TableCell className="text-slate-900">{formatDate(a.data_adiantamento)}</TableCell>
                      <TableCell className="text-right text-slate-900 font-semibold">{formatCurrency(a.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-900">Observações da Aprovação (opcional)</Label>
              <Textarea
                placeholder="Digite observações sobre esta aprovação em lote..."
                value={observacoesAprovacao}
                onChange={(e) => setObservacoesAprovacao(e.target.value)}
                rows={3}
                className="border-2 border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t border-slate-200">
            <Button 
              variant="outline" 
              onClick={() => setIsAprovacaoLoteOpen(false)} 
              disabled={processandoLote}
              className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button
              onClick={confirmarAprovacaoLote}
              disabled={processandoLote}
              className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
            >
              {processandoLote ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                <Check className="w-4 h-4" /> Confirmar Aprovação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação Padronizado */}
      <StandardDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
        onConfirm={() => {
          confirmDialog.onConfirm?.();
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
        }}
        title={confirmDialog.title}
        description={confirmDialog.message}
        variant={confirmDialog.title?.includes('Exclusão') ? 'danger' : 'confirm'}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />

      <ProgressModal
        isOpen={progress.state.isOpen}
        title={progress.state.title}
        current={progress.state.current}
        total={progress.state.total}
        status={progress.state.status}
        message={progress.state.message}
        onClose={progress.close}
      />
    </>
  );
}