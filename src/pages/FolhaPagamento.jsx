import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Eye, Filter, Users, FileText, ArrowRightLeft, Loader2, Search, CheckCircle, XCircle, X, AlertCircle, DollarSign, Calendar, User, Briefcase, FileCheck, Ban } from 'lucide-react';
import ProtectedPage from '@/components/ProtectedPage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';


import FolhaPagamentoForm from '@/components/FolhaPagamentoForm';
import FolhaPagamentoLoteForm from '@/components/FolhaPagamentoLoteForm';
import { formatCurrency, formatDate, formatCompetencia } from '@/components/formatters';
import RelatorioFolhaPagamentoFiltersModal from '@/components/folha/RelatorioFolhaPagamentoFiltersModal';
import StandardDialog from '@/components/ui/StandardDialog';
import ProgressModal, { useProgressModal } from '@/components/ui/ProgressModal';

const withRetry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

function FolhaPagamentoContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [folhasPagamento, setFolhasPagamento] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoteFormOpen, setIsLoteFormOpen] = useState(false);
  const [selectedFolha, setSelectedFolha] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtroFuncionario, setFiltroFuncionario] = useState('todos');
  const [filtroCompetencia, setFiltroCompetencia] = useState('');

  const [isMovimentacaoModalOpen, setIsMovimentacaoModalOpen] = useState(false);
  const [selectedForBaixa, setSelectedForBaixa] = useState([]);
  const [contaBancariaMovimentacao, setContaBancariaMovimentacao] = useState('');
  const [dataVencimentoMovimentacao, setDataVencimentoMovimentacao] = useState('');
  const [dataPagamentoMovimentacao, setDataPagamentoMovimentacao] = useState('');
  const [pagamentoParcialAtivo, setPagamentoParcialAtivo] = useState(false);
  const [valorPagamentoParcial, setValorPagamentoParcial] = useState('');

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewingFolha, setViewingFolha] = useState(null);

  const [isRelatorioFiltersModalOpen, setIsRelatorioFiltersModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelType, setCancelType] = useState('selecionadas'); // 'selecionadas' ou 'competencia'
  const [cancelCompetencia, setCancelCompetencia] = useState('');

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const progress = useProgressModal();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        withRetry(() => base44.entities.FolhaPagamento.list('-created_date')),
        withRetry(() => base44.entities.Funcionario.list()),
        withRetry(() => base44.entities.PlanoContas.list()),
        withRetry(() => base44.entities.ContaBancaria.list()),
        withRetry(() => base44.entities.Departamento.list()),
        withRetry(() => base44.entities.Configuracoes.list())
      ]);

      const [folhasRes, funcionariosRes, planoContasRes, contasRes, departamentosRes] = results;

      if (folhasRes.status === 'fulfilled') setFolhasPagamento(folhasRes.value || []);
      if (funcionariosRes.status === 'fulfilled') setFuncionarios(funcionariosRes.value || []);
      if (planoContasRes.status === 'fulfilled') setPlanoContas(planoContasRes.value || []);
      if (contasRes.status === 'fulfilled') setContasBancarias(contasRes.value || []);
      if (departamentosRes.status === 'fulfilled') setDepartamentos(departamentosRes.value || []);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError('Erro ao carregar os dados. Tente novamente.');
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openForm = (folha = null) => {
    setSelectedFolha(folha);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    await fetchData();
    setIsFormOpen(false);
    setSelectedFolha(null);
    toast({ title: '✅ Salvo!', description: 'Folha de pagamento salva com sucesso.' });
  };

  const handleLoteSave = async (registros) => {
    try {
      if (!registros || registros.length === 0) {
        toast({ title: '⚠️ Atenção', description: 'Nenhum registro para salvar.', variant: 'destructive' });
        return;
      }

      for (const registro of registros) {
        await base44.entities.FolhaPagamento.create(registro);
      }

      await fetchData();
      setIsLoteFormOpen(false);
      toast({ title: '✅ Lote Criado!', description: `${registros.length} folha(s) de pagamento criada(s) com sucesso.` });
    } catch (err) {
      console.error('Erro ao criar folhas em lote:', err);
      toast({ title: 'Erro', description: 'Não foi possível criar as folhas de pagamento.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir esta folha de pagamento? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await base44.entities.FolhaPagamento.delete(id);
          await fetchData();
          toast({ title: '✅ Excluído!', description: 'Folha de pagamento excluída com sucesso.' });
        } catch (err) {
          console.error('Erro ao excluir:', err);
          toast({
            title: 'Erro',
            description: 'Não foi possível excluir a folha de pagamento.',
            variant: 'destructive'
          });
        }
      }
    });
  };

  const handleViewFolha = async (folha) => {
    setViewingFolha(folha);
    setIsViewerOpen(true);
  };

  const handleMarcarComoPago = async (folha) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Pagamento',
      message: 'Deseja marcar esta folha de pagamento como PAGA?',
      onConfirm: async () => {
        try {
          await base44.entities.FolhaPagamento.update(folha.id, {
            status_pagamento: 'pago',
            data_pagamento: new Date().toISOString().split('T')[0]
          });
          await fetchData();
          toast({ title: '✅ Atualizado!', description: 'Folha marcada como paga.' });
        } catch (err) {
          console.error('Erro:', err);
          toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
        }
      }
    });
  };

  const handleMarcarComoPendente = async (folha) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Alteração',
      message: 'Deseja marcar esta folha de pagamento como PENDENTE?',
      onConfirm: async () => {
        try {
          await base44.entities.FolhaPagamento.update(folha.id, {
            status_pagamento: 'pendente',
            data_pagamento: null
          });
          await fetchData();
          toast({ title: '✅ Atualizado!', description: 'Folha marcada como pendente.' });
        } catch (err) {
          console.error('Erro:', err);
          toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
        }
      }
    });
  };

  const getFuncionarioNome = (id) => {
    const func = funcionarios.find((f) => f.id === id);
    return func?.nome || 'N/A';
  };

  const getFuncionario = (id) => {
    return funcionarios.find((f) => f.id === id);
  };

  const getPlanoContasNome = (id) => {
    const plano = planoContas.find((p) => p.id === id);
    return plano?.nome || 'N/A';
  };

  const folhasFiltradas = useMemo(() => {
    if (!folhasPagamento || folhasPagamento.length === 0) return [];

    return folhasPagamento.filter((folha) => {
      if (!folha) return false;

      const searchLower = searchTerm.toLowerCase();
      const passaBusca = !searchTerm ||
        getFuncionarioNome(folha.funcionario_id).toLowerCase().includes(searchLower) ||
        folha.competencia?.includes(searchTerm);

      const passaFuncionario = filtroFuncionario === 'todos' ||
        String(folha.funcionario_id) === String(filtroFuncionario);
      const passaCompetencia = filtroCompetencia === '' || folha.competencia === filtroCompetencia;

      return passaBusca && passaFuncionario && passaCompetencia;
    });
  }, [folhasPagamento, searchTerm, filtroFuncionario, filtroCompetencia, funcionarios]);

  const totais = useMemo(() => {
    const totalPago = folhasFiltradas.reduce((total, f) =>
      total + (f?.status_pagamento === 'pago' ? Number(f?.salario_liquido) || 0 : 0), 0);
    const totalParcial = folhasFiltradas.reduce((total, f) =>
      total + (f?.status_pagamento === 'pago_parcial' ? Number(f?.valor_pago) || 0 : 0), 0);
    const totalPendente = folhasFiltradas.reduce((total, f) =>
      total + (f?.status_pagamento === 'pendente' ? Number(f?.salario_liquido) || 0 : 0), 0);
    const totalGeral = folhasFiltradas.reduce((total, f) =>
      total + (Number(f?.salario_liquido) || 0), 0);

    return { totalPago, totalParcial, totalPendente, totalGeral };
  }, [folhasFiltradas]);

  const handleSelectForBaixa = (folhaId, checked) => {
    setSelectedForBaixa((prev) =>
      checked ? [...prev, folhaId] : prev.filter((id) => id !== folhaId)
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = folhasFiltradas.map((f) => f.id);
      setSelectedForBaixa(allIds);
    } else {
      setSelectedForBaixa([]);
    }
  };

  const openMovimentacaoModal = () => {
    if (selectedForBaixa.length === 0) {
      toast({
        title: '⚠️ Atenção',
        description: 'Selecione pelo menos uma folha de pagamento para gerar movimentação.',
        variant: 'destructive'
      });
      return;
    }
    setContaBancariaMovimentacao('');
    setDataVencimentoMovimentacao('');
    setDataPagamentoMovimentacao('');
    setPagamentoParcialAtivo(false);
    setValorPagamentoParcial('');
    setIsMovimentacaoModalOpen(true);
  };

  const handleGerarMovimentacaoSingle = (folha) => {
    setSelectedForBaixa([folha.id]);
    setContaBancariaMovimentacao('');
    setDataVencimentoMovimentacao('');
    setDataPagamentoMovimentacao('');
    setPagamentoParcialAtivo(false);
    setValorPagamentoParcial('');
    setIsMovimentacaoModalOpen(true);
  };

  const handleGerarMovimentacao = () => {
    if (!dataVencimentoMovimentacao) {
      toast({
        title: '⚠️ Atenção',
        description: 'Informe a data de vencimento.',
        variant: 'destructive'
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Geração de Movimentação',
      message: `Deseja gerar movimentação financeira para ${selectedForBaixa.length} folha(s) de pagamento?`,
      onConfirm: async () => {
        progress.start('Gerando movimentações financeiras...', selectedForBaixa.length);
        try {
          const user = await base44.auth.me();

          for (let i = 0; i < selectedForBaixa.length; i++) {
            const folhaId = selectedForBaixa[i];
            const folha = folhasPagamento.find((f) => f.id === folhaId);
            if (!folha) continue;

            const funcionario = funcionarios.find((f) => f.id === folha.funcionario_id);
            const valorTotal = folha.salario_liquido;
            const valorPago = pagamentoParcialAtivo && valorPagamentoParcial ? Number(valorPagamentoParcial) : valorTotal;
            const saldoRestante = valorTotal - valorPago;

            const movData = {
              descricao: `Pagamento - ${funcionario?.nome || 'Funcionário'} - ${formatCompetencia(folha.competencia)}`,
              tipo: 'despesa',
              categoria: 'Folha de Pagamento',
              created_by: user.email,
              conta_bancaria_id: contaBancariaMovimentacao || null,
              total: valorTotal,
              data_emissao: new Date().toISOString().split('T')[0],
              folha_pagamento_id: folha.id,
              fornecedor_cliente_nome: funcionario?.nome || '',
              fornecedor_cliente_cpf_cnpj: funcionario?.cpf || '',
              forma_pagamento: 'Transferência',
              condicao_pagamento: 'À Vista',
              parcelas: [{
                numero_parcela: 1,
                data_vencimento: dataVencimentoMovimentacao,
                valor: valorTotal,
                status: saldoRestante > 0 ? 'parcial' : (dataPagamentoMovimentacao ? 'pago' : 'pendente')
              }],
              planos_contas: folha.plano_contas_id ? [{
                plano_contas_id: folha.plano_contas_id,
                valor: valorTotal,
                percentual: 100
              }] : []
            };

            await base44.entities.MovimentacaoFinanceira.create(movData);
            progress.updateProgress(i + 1);

            if (saldoRestante > 0) {
              await base44.entities.FolhaPagamento.update(folha.id, {
                status_pagamento: 'pago_parcial',
                valor_pago: valorPago,
                saldo_restante: saldoRestante,
                data_pagamento: dataPagamentoMovimentacao || null
              });
            } else {
              await base44.entities.FolhaPagamento.update(folha.id, {
                status_pagamento: dataPagamentoMovimentacao ? 'pago' : 'pendente',
                data_pagamento: dataPagamentoMovimentacao || null
              });
            }
          }

          const totalGerado = selectedForBaixa.length;
          setSelectedForBaixa([]);
          setContaBancariaMovimentacao('');
          setDataVencimentoMovimentacao('');
          setDataPagamentoMovimentacao('');
          setPagamentoParcialAtivo(false);
          setValorPagamentoParcial('');
          setIsMovimentacaoModalOpen(false);
          await fetchData();

          progress.success(`${totalGerado} movimentação(ões) financeira(s) criada(s) com sucesso!`);
        } catch (err) {
          console.error('Erro ao gerar movimentações:', err);
          progress.error('Não foi possível gerar as movimentações.');
        }
      }
    });
  };

  const statusLabels = {
    pendente: <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendente</Badge>,
    pago: <Badge className="bg-green-100 text-green-800 border-green-300">Pago</Badge>,
    pago_parcial: <Badge className="bg-blue-100 text-blue-800 border-blue-300">Pago Parcial</Badge>
  };

  const openCancelModal = () => {
    setCancelType('selecionadas');
    setCancelCompetencia('');
    setIsCancelModalOpen(true);
  };

  const handleCancelarFolhas = async () => {
    let folhasParaCancelar = [];

    if (cancelType === 'selecionadas') {
      if (selectedForBaixa.length === 0) {
        toast({
          title: '⚠️ Atenção',
          description: 'Selecione pelo menos uma folha de pagamento.',
          variant: 'destructive'
        });
        return;
      }
      folhasParaCancelar = selectedForBaixa;
    } else if (cancelType === 'competencia') {
      if (!cancelCompetencia) {
        toast({
          title: '⚠️ Atenção',
          description: 'Selecione uma competência.',
          variant: 'destructive'
        });
        return;
      }
      folhasParaCancelar = folhasPagamento
        .filter((f) => f.competencia === cancelCompetencia)
        .map((f) => f.id);
    }

    if (folhasParaCancelar.length === 0) {
      toast({
        title: '⚠️ Atenção',
        description: 'Nenhuma folha encontrada para cancelar.',
        variant: 'destructive'
      });
      return;
    }

    setIsCancelModalOpen(false);

    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Confirmar Exclusão em Massa',
      message: `ATENÇÃO: Você está prestes a EXCLUIR PERMANENTEMENTE ${folhasParaCancelar.length} folha(s) de pagamento. Esta ação NÃO pode ser desfeita. Deseja continuar?`,
      onConfirm: async () => {
        progress.start('Excluindo folhas de pagamento...', folhasParaCancelar.length);
        try {
          for (let i = 0; i < folhasParaCancelar.length; i++) {
            const folhaId = folhasParaCancelar[i];
            await base44.entities.FolhaPagamento.delete(folhaId);
            progress.updateProgress(i + 1);
          }
          setSelectedForBaixa([]);
          await fetchData();
          progress.success(`${folhasParaCancelar.length} folha(s) de pagamento excluída(s) com sucesso.`);
        } catch (err) {
          console.error('Erro ao excluir folhas:', err);
          progress.error('Não foi possível excluir as folhas de pagamento.');
        }
      }
    });
  };

  const handleGenerateRelatorio = async (filters) => {
    let filteredForReport = [...folhasPagamento];

    // Filtro por funcionário
    if (filters.funcionarioId && filters.funcionarioId !== '' && filters.funcionarioId !== 'todos') {
      filteredForReport = filteredForReport.filter((f) => f.funcionario_id === filters.funcionarioId);
    }

    // Filtro por departamento
    if (filters.departamentoId && filters.departamentoId !== '' && filters.departamentoId !== 'todos') {
       const funcionariosDoDepartamento = funcionarios.filter((func) =>
        func.departamento_id === filters.departamentoId
      ).map((func) => func.id);

      filteredForReport = filteredForReport.filter((f) =>
        funcionariosDoDepartamento.includes(f.funcionario_id)
      );
    }

    // Filtro por status
    if (filters.status && filters.status !== '' && filters.status !== 'todos') {
      filteredForReport = filteredForReport.filter((f) =>
        f.status_pagamento === filters.status
      );
    }

    // Filtro por competência
    if (filters.competencia && filters.competencia !== '') {
      filteredForReport = filteredForReport.filter((f) =>
        f.competencia === filters.competencia
      );
    }

    // Filtro por data de pagamento (início)
    if (filters.dataInicio && filters.dataInicio !== '') {
      filteredForReport = filteredForReport.filter((f) =>
        f.data_pagamento && f.data_pagamento >= filters.dataInicio
      );
    }

    // Filtro por data de pagamento (fim)
    if (filters.dataFim && filters.dataFim !== '') {
      filteredForReport = filteredForReport.filter((f) =>
        f.data_pagamento && f.data_pagamento <= filters.dataFim
      );
    }

    // Filtro por proporcional
    if (filters.apenasComProporcional) {
      filteredForReport = filteredForReport.filter((f) => f.dias_trabalhados > 0);
    }

    // Buscar nomes para exibir no filtro do relatório
    const funcionarioSelecionado = funcionarios.find(f => f.id === filters.funcionarioId);
    const departamentoSelecionado = departamentos.find(d => d.id === filters.departamentoId);

    // IDs filtrados
    const folhasIds = filteredForReport.map((f) => f.id);

    const filtersData = {
      ...filters,
      funcionarioNome: funcionarioSelecionado?.nome || '',
      departamentoNome: departamentoSelecionado?.nome || '',
      folhas: folhasIds
    };

    // Usar encodeURIComponent para garantir codificação correta
    const queryParams = new URLSearchParams();
    queryParams.set('filtros', encodeURIComponent(JSON.stringify(filtersData)));

    window.open(`/RelatorioFolhaPagamento?${queryParams.toString()}`, '_blank');
    setIsRelatorioFiltersModalOpen(false);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Erro ao Carregar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={fetchData} className="w-full">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg md:rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Briefcase className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-white">Folha de Pagamento</h1>
                <p className="text-slate-300 text-xs md:text-sm">Gestão de pagamentos</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4"
              >
                <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{showFilters ? 'Ocultar' : 'Filtros'}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsRelatorioFiltersModalOpen(true)}
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4"
              >
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Relatório</span>
              </Button>
              <Button
                variant="outline"
                onClick={openMovimentacaoModal}
                disabled={selectedForBaixa.length === 0}
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4 disabled:opacity-50"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                ({selectedForBaixa.length})
              </Button>
              <Button
                variant="outline"
                onClick={openCancelModal}
                className="bg-transparent border-red-500 text-red-300 hover:bg-red-600 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4 hidden sm:flex"
              >
                <Ban className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden md:inline">Cancelar</span>
              </Button>
              <Button
                onClick={() => setIsLoteFormOpen(true)}
                variant="outline"
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4 hidden sm:flex"
              >
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Lote
              </Button>
              <Button
                onClick={() => openForm()}
                variant="outline"
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Novo</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Card className="border-l-4 border-l-slate-600">
            <CardHeader className="pb-1 md:pb-3 p-3 md:p-6">
              <CardTitle className="text-[10px] md:text-sm font-medium text-slate-600">Total Geral</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-base md:text-2xl font-bold text-slate-900">{formatCurrency(totais.totalGeral)}</div>
              <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">{folhasFiltradas.length} lançamentos</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-1 md:pb-3 p-3 md:p-6">
              <CardTitle className="text-[10px] md:text-sm font-medium text-slate-600">Pagos</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-base md:text-2xl font-bold text-green-700">{formatCurrency(totais.totalPago)}</div>
              <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">{folhasFiltradas.filter((f) => f.status_pagamento === 'pago').length}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-1 md:pb-3 p-3 md:p-6">
              <CardTitle className="text-[10px] md:text-sm font-medium text-slate-600">Parciais</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-base md:text-2xl font-bold text-blue-700">{formatCurrency(totais.totalParcial)}</div>
              <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">{folhasFiltradas.filter((f) => f.status_pagamento === 'pago_parcial').length}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-1 md:pb-3 p-3 md:p-6">
              <CardTitle className="text-[10px] md:text-sm font-medium text-slate-600">Pendentes</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-base md:text-2xl font-bold text-yellow-700">{formatCurrency(totais.totalPendente)}</div>
              <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">{folhasFiltradas.filter((f) => f.status_pagamento === 'pendente').length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 mb-3 md:mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
              <Input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 md:pl-10 text-sm md:text-base" />
            </div>
          </div>

          {showFilters &&
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Funcionário</Label>
                    <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os Funcionários</SelectItem>
                        {funcionarios.map((funcionario) =>
                          <SelectItem key={funcionario.id} value={String(funcionario.id)}>{funcionario.nome}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Competência</Label>
                    <Input type="month" value={filtroCompetencia} onChange={(e) => setFiltroCompetencia(e.target.value)} />
                  </div>

                  <div className="flex items-end">
                    <Button variant="outline" onClick={() => { setSearchTerm(''); setFiltroFuncionario('todos'); setFiltroCompetencia(''); }} className="w-full">Limpar Filtros</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          }

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[1800px]">
                <TableHeader>
                  <TableRow className="bg-slate-700 hover:bg-slate-700">
                    <TableHead className="w-8 md:w-12 text-white text-xs md:text-sm">
                      <Checkbox
                        checked={selectedForBaixa.length === folhasFiltradas.length && folhasFiltradas.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="w-3.5 h-3.5 md:w-4 md:h-4"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-white min-w-[120px] md:min-w-[160px] text-xs md:text-sm">Funcionário</TableHead>
                    <TableHead className="font-semibold text-white min-w-[70px] md:min-w-[100px] text-xs md:text-sm">Comp.</TableHead>
                    <TableHead className="text-right font-semibold text-white min-w-[80px] md:min-w-[100px] text-xs md:text-sm hidden lg:table-cell">Salário</TableHead>
                    <TableHead className="text-right font-semibold text-white min-w-[70px] md:min-w-[90px] text-xs md:text-sm hidden xl:table-cell">Comissões</TableHead>
                    <TableHead className="text-right font-semibold text-white min-w-[70px] md:min-w-[90px] text-xs md:text-sm hidden xl:table-cell">H. Extras</TableHead>
                    <TableHead className="text-right font-semibold text-white min-w-[60px] md:min-w-[80px] text-xs md:text-sm hidden 2xl:table-cell">Bônus</TableHead>
                    <TableHead className="text-right font-semibold text-white min-w-[80px] md:min-w-[100px] text-xs md:text-sm hidden 2xl:table-cell">Entradas</TableHead>
                    <TableHead className="text-right font-semibold text-white min-w-[80px] md:min-w-[100px] text-xs md:text-sm hidden 2xl:table-cell">Adiant.</TableHead>
                    <TableHead className="text-right font-semibold text-white min-w-[60px] md:min-w-[80px] text-xs md:text-sm hidden 2xl:table-cell">Faltas</TableHead>
                    <TableHead className="text-right font-semibold text-white min-w-[70px] md:min-w-[80px] text-xs md:text-sm hidden 2xl:table-cell">Encargos</TableHead>
                    <TableHead className="text-right font-semibold text-white min-w-[80px] md:min-w-[100px] text-xs md:text-sm hidden 2xl:table-cell">Saídas</TableHead>
                    <TableHead className="text-right font-semibold text-white min-w-[90px] md:min-w-[120px] text-xs md:text-sm">Líquido</TableHead>
                    <TableHead className="font-semibold text-white min-w-[70px] md:min-w-[90px] text-xs md:text-sm hidden md:table-cell">Data</TableHead>
                    <TableHead className="font-semibold text-white min-w-[70px] md:min-w-[90px] text-xs md:text-sm hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-center font-semibold text-white min-w-[60px] md:min-w-[80px] text-xs md:text-sm">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ?
                    <TableRow>
                      <TableCell colSpan={16} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                        <p className="mt-2 text-slate-600">Carregando...</p>
                      </TableCell>
                    </TableRow> :
                    folhasFiltradas.length === 0 ?
                      <TableRow>
                        <TableCell colSpan={16} className="text-center py-8 text-slate-500">
                          Nenhum lançamento encontrado
                        </TableCell>
                      </TableRow> :

                      folhasFiltradas.map((folha) => {
                        const funcionario = getFuncionario(folha?.funcionario_id);
                        const salarioBruto = funcionario?.salario || 0;
                        return (
                          <TableRow key={folha?.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="text-slate-900 py-2 md:py-3">
                              <Checkbox
                                checked={selectedForBaixa.includes(folha.id)}
                                onCheckedChange={(checked) => handleSelectForBaixa(folha.id, checked)}
                                className="w-3.5 h-3.5 md:w-4 md:h-4"
                              />
                            </TableCell>
                            <TableCell className="font-medium text-slate-900 text-xs md:text-sm py-2 md:py-3 max-w-[100px] md:max-w-none truncate">{getFuncionarioNome(folha?.funcionario_id)}</TableCell>
                            <TableCell className="text-slate-900 text-xs md:text-sm py-2 md:py-3">{formatCompetencia(folha?.competencia)}</TableCell>
                            <TableCell className="text-right text-slate-900 whitespace-nowrap text-xs md:text-sm py-2 md:py-3 hidden lg:table-cell">{formatCurrency(salarioBruto)}</TableCell>
                            <TableCell className="text-right text-slate-900 whitespace-nowrap text-xs md:text-sm py-2 md:py-3 hidden xl:table-cell">{formatCurrency(folha?.comissoes || 0)}</TableCell>
                            <TableCell className="text-right text-slate-900 whitespace-nowrap text-xs md:text-sm py-2 md:py-3 hidden xl:table-cell">{formatCurrency(folha?.horas_extras || 0)}</TableCell>
                            <TableCell className="text-right text-slate-900 whitespace-nowrap text-xs md:text-sm py-2 md:py-3 hidden 2xl:table-cell">{formatCurrency(folha?.bonus || 0)}</TableCell>
                            <TableCell className="text-right text-slate-900 whitespace-nowrap text-xs md:text-sm py-2 md:py-3 hidden 2xl:table-cell">{formatCurrency(folha?.outras_entradas || 0)}</TableCell>
                            <TableCell className="text-right text-red-700 whitespace-nowrap text-xs md:text-sm py-2 md:py-3 hidden 2xl:table-cell">{formatCurrency(folha?.adiantamentos || 0)}</TableCell>
                            <TableCell className="text-right text-red-700 whitespace-nowrap text-xs md:text-sm py-2 md:py-3 hidden 2xl:table-cell">{formatCurrency(folha?.faltas || 0)}</TableCell>
                            <TableCell className="text-right text-red-700 whitespace-nowrap text-xs md:text-sm py-2 md:py-3 hidden 2xl:table-cell">{formatCurrency(folha?.encargos || 0)}</TableCell>
                            <TableCell className="text-right text-red-700 whitespace-nowrap text-xs md:text-sm py-2 md:py-3 hidden 2xl:table-cell">{formatCurrency(folha?.outras_saidas || 0)}</TableCell>
                            <TableCell className="text-right text-slate-900 font-semibold whitespace-nowrap text-xs md:text-sm py-2 md:py-3">{formatCurrency(folha?.salario_liquido)}</TableCell>
                            <TableCell className="text-slate-900 text-xs md:text-sm py-2 md:py-3 hidden md:table-cell">{formatDate(folha?.data_pagamento)}</TableCell>
                            <TableCell className="py-2 md:py-3 hidden sm:table-cell">
                              {statusLabels[folha?.status_pagamento] || 'Desconhecido'}
                            </TableCell>
                            <TableCell className="text-slate-900 py-2 md:py-3">
                              <div className="flex items-center justify-center gap-0.5 md:gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewFolha(folha)}
                                  className="hover:bg-blue-50 text-blue-600 h-7 w-7 md:h-8 md:w-8 p-0"
                                  title="Visualizar"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="hover:bg-slate-100 h-7 w-7 md:h-8 md:w-8 p-0 text-xs">
                                      •••
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openForm(folha)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleGerarMovimentacaoSingle(folha)}>
                                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                                      Gerar Movimentação
                                    </DropdownMenuItem>
                                    {folha.status_pagamento === 'pendente' ?
                                      <DropdownMenuItem onClick={() => handleMarcarComoPago(folha)}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                        Marcar como Pago
                                      </DropdownMenuItem> :
                                      <DropdownMenuItem onClick={() => handleMarcarComoPendente(folha)}>
                                        <XCircle className="mr-2 h-4 w-4 text-yellow-600" />
                                        Marcar como Pendente
                                      </DropdownMenuItem>
                                    }
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(folha?.id)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  }
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {isFormOpen && <FolhaPagamentoForm isOpen={isFormOpen} folha={selectedFolha} funcionarios={funcionarios} planoContas={planoContas} onSave={handleSave} onClose={() => { setIsFormOpen(false); setSelectedFolha(null); }} />}

      {isLoteFormOpen && <FolhaPagamentoLoteForm isOpen={isLoteFormOpen} funcionarios={funcionarios.filter((f) => f && f.status === 'ativo')} planoContas={planoContas} onSave={handleLoteSave} onClose={() => setIsLoteFormOpen(false)} />}

      {isMovimentacaoModalOpen &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-700 bg-slate-800 text-white sticky top-0 z-10 rounded-t-xl">
              <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                <ArrowRightLeft className="w-6 h-6 text-white" />
                Gerar Movimentação Financeira
              </h2>
              <Button
                size="sm"
                onClick={() => setIsMovimentacaoModalOpen(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-800 font-semibold mb-2">Folhas selecionadas: {selectedForBaixa.length}</p>
              </div>

              <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-5 mb-6">
                <p className="text-base text-slate-900 font-bold">
                  Total a ser movimentado: <span className="text-2xl text-slate-900">{formatCurrency(
                    folhasPagamento.
                      filter((f) => selectedForBaixa.includes(f.id)).
                      reduce((acc, f) => acc + (f.salario_liquido || 0), 0)
                  )}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <Label className="text-sm font-bold text-slate-900 mb-2 block">Data de Vencimento *</Label>
                  <Input
                    type="date"
                    className="w-full border-2 border-slate-400 focus:border-slate-600 focus:ring-slate-600 text-slate-900 font-medium"
                    required
                    value={dataVencimentoMovimentacao}
                    onChange={(e) => setDataVencimentoMovimentacao(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm font-bold text-slate-900 mb-2 block">Data de Pagamento</Label>
                  <Input
                    type="date"
                    className="w-full border-2 border-slate-400 focus:border-slate-600 focus:ring-slate-600 text-slate-900 font-medium"
                    value={dataPagamentoMovimentacao}
                    onChange={(e) => setDataPagamentoMovimentacao(e.target.value)}
                  />
                  <p className="text-xs text-slate-700 mt-1 font-medium">Deixe em branco se ainda não foi pago</p>
                </div>

                <div>
                  <Label className="text-sm font-bold text-slate-900 mb-2 block">Conta Bancária</Label>
                  <Select
                    value={contaBancariaMovimentacao}
                    onValueChange={setContaBancariaMovimentacao}
                  >
                    <SelectTrigger className="w-full border-2 border-slate-400 focus:border-slate-600 text-slate-900 font-medium">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasBancarias.map((conta) =>
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.nome} {conta.banco ? `- ${conta.banco}` : ''}
                        </SelectItem>
                      )}
                      {contasBancarias.length === 0 &&
                        <SelectItem value="none" disabled>Nenhuma conta cadastrada</SelectItem>
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-sm font-bold text-slate-900 mb-3 block flex items-center gap-2">
                    <Checkbox
                      checked={pagamentoParcialAtivo}
                      onCheckedChange={setPagamentoParcialAtivo}
                      className="rounded border-slate-400"
                    />
                    Pagamento Parcial
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Valor do pagamento parcial"
                    className="w-full border-2 border-slate-400 focus:border-slate-600 focus:ring-slate-600 text-slate-900 font-medium placeholder:text-slate-500"
                    disabled={!pagamentoParcialAtivo}
                    value={valorPagamentoParcial}
                    onChange={(e) => setValorPagamentoParcial(e.target.value)}
                  />
                  <p className="text-sm text-slate-700 mt-2 font-medium">Deixe em branco para pagamento completo</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Folhas de Pagamento Selecionadas</h3>
                <div className="border-2 border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="text-left p-4 font-bold">Funcionário</th>
                        <th className="text-center p-4 font-bold">Competência</th>
                        <th className="text-right p-4 font-bold">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {folhasPagamento.
                        filter((f) => selectedForBaixa.includes(f.id)).
                        map((folha) =>
                          <tr key={folha.id} className="border-t-2 border-slate-200 hover:bg-slate-100">
                            <td className="p-4 text-slate-900 font-semibold">{getFuncionarioNome(folha.funcionario_id)}</td>
                            <td className="text-center p-4 text-slate-900 font-semibold">{formatCompetencia(folha.competencia)}</td>
                            <td className="text-right p-4 font-bold text-slate-900 text-base">{formatCurrency(folha.salario_liquido)}</td>
                          </tr>
                        )
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 pt-4 border-t border-slate-200 bg-slate-50 sticky bottom-0 rounded-b-xl">
              <Button
                variant="outline"
                onClick={() => setIsMovimentacaoModalOpen(false)}
                className="border-slate-300 text-slate-700 hover:bg-slate-100 px-8 font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGerarMovimentacao}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 font-bold shadow-lg"
              >
                Gerar Movimentação
              </Button>
            </div>
          </div>
        </div>
      }

      {isViewerOpen && viewingFolha &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 px-6 py-5 bg-slate-800 text-white rounded-t-xl border-b border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <FileCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Detalhes da Folha de Pagamento</h2>
                    <p className="text-slate-300 text-sm">{getFuncionarioNome(viewingFolha.funcionario_id)} - {formatCompetencia(viewingFolha.competencia)}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsViewerOpen(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-slate-700" />
                  <h3 className="text-lg font-bold text-slate-900">Informações do Funcionário</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Nome</p>
                    <p className="text-sm font-bold text-slate-900">{getFuncionarioNome(viewingFolha.funcionario_id)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">CPF</p>
                    <p className="text-sm font-bold text-slate-900">{getFuncionario(viewingFolha.funcionario_id)?.cpf || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Competência</p>
                    <p className="text-sm font-bold text-slate-900">{formatCompetencia(viewingFolha.competencia)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Dias Trabalhados</p>
                    <p className="text-sm font-bold text-slate-900">
                      {viewingFolha.dias_trabalhados > 0 ? `${viewingFolha.dias_trabalhados} dias` : 'Mês Integral'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Data de Pagamento</p>
                    <p className="text-sm font-bold text-slate-900">{formatDate(viewingFolha.data_pagamento)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Status</p>
                    <div className="mt-1">{statusLabels[viewingFolha.status_pagamento]}</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-green-700" />
                  <h3 className="text-lg font-bold text-green-900">Entradas</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Salário Base</p>
                    <p className="text-base font-bold text-green-700">{formatCurrency(viewingFolha.salario_base || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Comissões</p>
                    <p className="text-base font-bold text-green-700">{formatCurrency(viewingFolha.comissoes || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Horas Extras</p>
                    <p className="text-base font-bold text-green-700">{formatCurrency(viewingFolha.horas_extras || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Bônus</p>
                    <p className="text-base font-bold text-green-700">{formatCurrency(viewingFolha.bonus || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Outras Entradas</p>
                    <p className="text-base font-bold text-green-700">{formatCurrency(viewingFolha.outras_entradas || 0)}</p>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Total Entradas</p>
                    <p className="text-lg font-bold text-green-800">
                      {formatCurrency(
                        (viewingFolha.salario_base || 0) +
                        (viewingFolha.comissoes || 0) +
                        (viewingFolha.horas_extras || 0) +
                        (viewingFolha.bonus || 0) +
                        (viewingFolha.outras_entradas || 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-white p-5 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-red-700" />
                  <h3 className="text-lg font-bold text-red-900">Saídas/Descontos</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Adiantamentos</p>
                    <p className="text-base font-bold text-red-700">{formatCurrency(viewingFolha.adiantamentos || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Faltas</p>
                    <p className="text-base font-bold text-red-700">{formatCurrency(viewingFolha.faltas || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Encargos</p>
                    <p className="text-base font-bold text-red-700">{formatCurrency(viewingFolha.encargos || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Outras Saídas</p>
                    <p className="text-base font-bold text-red-700">{formatCurrency(viewingFolha.outras_saidas || 0)}</p>
                  </div>
                  <div className="col-span-2 md:col-span-2">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Total Saídas</p>
                    <p className="text-lg font-bold text-red-800">
                      {formatCurrency(
                        (viewingFolha.adiantamentos || 0) +
                        (viewingFolha.faltas || 0) +
                        (viewingFolha.encargos || 0) +
                        (viewingFolha.outras_saidas || 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-300 mb-1">Salário Líquido</p>
                    <p className="text-4xl font-bold">{formatCurrency(viewingFolha.salario_liquido)}</p>
                  </div>
                  <Briefcase className="w-12 h-12 text-white/30" />
                </div>
              </div>

              {viewingFolha.status_pagamento === 'pago_parcial' &&
                <div className="p-5 bg-blue-50 border-2 border-blue-300 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-blue-700" />
                    <p className="text-sm font-bold text-blue-900">Pagamento Parcial</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-blue-700 font-semibold mb-1">Valor Pago</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(viewingFolha.valor_pago || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 font-semibold mb-1">Saldo Restante</p>
                      <p className="text-lg font-bold text-red-700">{formatCurrency(viewingFolha.saldo_restante || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 font-semibold mb-1">% Pago</p>
                      <p className="text-lg font-bold text-blue-900">
                        {((viewingFolha.valor_pago / viewingFolha.salario_liquido) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              }

              {viewingFolha.observacoes && viewingFolha.observacoes.trim() !== '' &&
                <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-slate-700" />
                    <h3 className="text-lg font-bold text-slate-900">Observações</h3>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingFolha.observacoes}</p>
                </div>
              }

              {viewingFolha.plano_contas_id &&
                <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-slate-700" />
                    <h3 className="text-lg font-bold text-slate-900">Dados Financeiros</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Plano de Contas</p>
                      <p className="text-sm font-bold text-slate-900">{getPlanoContasNome(viewingFolha.plano_contas_id)}</p>
                    </div>
                  </div>
                </div>
              }

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <Button
                  onClick={() => {
                    setIsViewerOpen(false);
                    handleGerarMovimentacaoSingle(viewingFolha);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg py-6"
                >
                  <ArrowRightLeft className="w-5 h-5 mr-2" />
                  Gerar Movimentação
                </Button>

                <Button
                  onClick={() => {
                    setIsViewerOpen(false);
                    openForm(viewingFolha);
                  }}
                  disabled={viewingFolha.status_pagamento === 'pago'}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold shadow-lg py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Editar
                </Button>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t-2 border-slate-300">
                <Button
                  onClick={() => setIsViewerOpen(false)}
                  className="bg-slate-300 hover:bg-slate-400 text-slate-900 px-8 font-bold"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      }

      {isCancelModalOpen &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 pb-4 border-b border-red-200 bg-red-600 text-white rounded-t-xl">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Ban className="w-6 h-6" />
                Cancelar Folhas de Pagamento
              </h2>
              <Button
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                className="bg-red-700 hover:bg-red-800 text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-yellow-800">Atenção!</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Esta ação irá excluir permanentemente as folhas de pagamento selecionadas. 
                      Esta operação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-slate-900">Selecione o tipo de cancelamento:</Label>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                    style={{ borderColor: cancelType === 'selecionadas' ? '#1e293b' : '#e2e8f0' }}
                  >
                    <input
                      type="radio"
                      name="cancelType"
                      value="selecionadas"
                      checked={cancelType === 'selecionadas'}
                      onChange={() => setCancelType('selecionadas')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">Folhas Selecionadas</p>
                      <p className="text-sm text-slate-600">
                        Cancelar as {selectedForBaixa.length} folha(s) selecionada(s) na tabela
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                    style={{ borderColor: cancelType === 'competencia' ? '#1e293b' : '#e2e8f0' }}
                  >
                    <input
                      type="radio"
                      name="cancelType"
                      value="competencia"
                      checked={cancelType === 'competencia'}
                      onChange={() => setCancelType('competencia')}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Por Competência</p>
                      <p className="text-sm text-slate-600 mb-2">
                        Cancelar todas as folhas de uma competência específica
                      </p>
                      {cancelType === 'competencia' && (
                        <Input
                          type="month"
                          value={cancelCompetencia}
                          onChange={(e) => setCancelCompetencia(e.target.value)}
                          className="w-full border-2 border-slate-300"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {cancelType === 'competencia' && cancelCompetencia && (
                <div className="bg-slate-100 rounded-lg p-3">
                  <p className="text-sm text-slate-700">
                    <strong>Total de folhas na competência:</strong>{' '}
                    {folhasPagamento.filter((f) => f.competencia === cancelCompetencia).length} folha(s)
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 pt-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <Button
                variant="outline"
                onClick={() => setIsCancelModalOpen(false)}
                className="border-slate-300 text-slate-700 hover:bg-slate-100 px-6"
              >
                Voltar
              </Button>
              <Button
                onClick={handleCancelarFolhas}
                className="bg-red-600 hover:bg-red-700 text-white px-6 font-bold"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Folhas
              </Button>
            </div>
          </div>
        </div>
      }

      {isRelatorioFiltersModalOpen &&
        <RelatorioFolhaPagamentoFiltersModal
          isOpen={isRelatorioFiltersModalOpen}
          onClose={() => setIsRelatorioFiltersModalOpen(false)}
          onGenerate={handleGenerateRelatorio}
          funcionarios={funcionarios}
          departamentos={departamentos}
        />
      }

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

export default function FolhaPagamentoPage() {
  return (
    <ProtectedPage requiredModule="folha">
      <FolhaPagamentoContent />
    </ProtectedPage>
  );
}