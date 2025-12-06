import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Eye, Filter, Users, FileText, ArrowRightLeft, Loader2, Search, CheckCircle, X, AlertCircle, Gift, RefreshCw } from 'lucide-react';
import ProtectedPage from '@/components/ProtectedPage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import Folha13Form from '@/components/folha13/Folha13Form';
import Folha13LoteForm from '@/components/folha13/Folha13LoteForm';
import Folha13Viewer from '@/components/folha13/Folha13Viewer';
import Relatorio13FiltersModal from '@/components/folha13/Relatorio13FiltersModal';
import { formatCurrency } from '@/components/formatters';

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

function Folha13Content() {
  const { toast } = useToast();

  const [folhas13, setFolhas13] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [folhasPagamento, setFolhasPagamento] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoteFormOpen, setIsLoteFormOpen] = useState(false);
  const [selectedFolha13, setSelectedFolha13] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtroFuncionario, setFiltroFuncionario] = useState('todos');
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [filtroTipoParcela, setFiltroTipoParcela] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const [isMovimentacaoModalOpen, setIsMovimentacaoModalOpen] = useState(false);
  const [selectedForBaixa, setSelectedForBaixa] = useState([]);
  const [contaBancariaMovimentacao, setContaBancariaMovimentacao] = useState('');
  const [dataVencimentoMovimentacao, setDataVencimentoMovimentacao] = useState('');
  const [dataPagamentoMovimentacao, setDataPagamentoMovimentacao] = useState('');

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewingFolha13, setViewingFolha13] = useState(null);

  const [isRelatorioFiltersModalOpen, setIsRelatorioFiltersModalOpen] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        withRetry(() => base44.entities.Folha13.list('-created_date')),
        withRetry(() => base44.entities.Funcionario.list()),
        withRetry(() => base44.entities.PlanoContas.list()),
        withRetry(() => base44.entities.ContaBancaria.list()),
        withRetry(() => base44.entities.Departamento.list()),
        withRetry(() => base44.entities.FolhaPagamento.list())
      ]);

      const [folhas13Res, funcionariosRes, planoContasRes, contasRes, departamentosRes, folhasPgtoRes] = results;

      if (folhas13Res.status === 'fulfilled') setFolhas13(folhas13Res.value || []);
      if (funcionariosRes.status === 'fulfilled') setFuncionarios(funcionariosRes.value || []);
      if (planoContasRes.status === 'fulfilled') setPlanoContas(planoContasRes.value || []);
      if (contasRes.status === 'fulfilled') setContasBancarias(contasRes.value || []);
      if (departamentosRes.status === 'fulfilled') setDepartamentos(departamentosRes.value || []);
      if (folhasPgtoRes.status === 'fulfilled') setFolhasPagamento(folhasPgtoRes.value || []);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError('Erro ao carregar os dados. Tente novamente.');
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openForm = (folha13 = null) => {
    setSelectedFolha13(folha13);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    await fetchData();
    setIsFormOpen(false);
    setSelectedFolha13(null);
    toast({ title: '✅ Salvo!', description: '13º salário salvo com sucesso.' });
  };

  const handleLoteSave = async (registros) => {
    try {
      await base44.entities.Folha13.bulkCreate(registros);
      await fetchData();
      setIsLoteFormOpen(false);
      toast({ title: '✅ Lote Criado!', description: `${registros.length} lançamento(s) de 13º criado(s) com sucesso.` });
    } catch (err) {
      console.error('Erro ao criar em lote:', err);
      toast({ title: 'Erro', description: 'Não foi possível criar em lote.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir este lançamento de 13º salário?',
      onConfirm: async () => {
        try {
          await base44.entities.Folha13.delete(id);
          await fetchData();
          toast({ title: '✅ Excluído!', description: '13º salário excluído com sucesso.' });
        } catch (err) {
          console.error('Erro ao excluir:', err);
          toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
        }
      }
    });
  };

  const handleRecalcular = async (folha13) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Recalcular 13º',
      message: 'Deseja recalcular os valores deste 13º salário? Os valores editados manualmente serão sobrescritos.',
      onConfirm: async () => {
        try {
          const funcionario = funcionarios.find(f => f.id === folha13.funcionario_id);
          if (!funcionario) return;

          const salarioBase = Number(funcionario.salario) || 0;
          let avosCalculados = 12;

          if (funcionario.data_inicio) {
            const dataAdmissao = new Date(funcionario.data_inicio + 'T00:00:00');
            const anoAdmissao = dataAdmissao.getFullYear();
            
            if (anoAdmissao === folha13.ano_referencia) {
              const mesAdmissao = dataAdmissao.getMonth();
              const diaAdmissao = dataAdmissao.getDate();
              const mesesTrabalhados = 12 - mesAdmissao - (diaAdmissao > 15 ? 1 : 0);
              avosCalculados = Math.max(0, Math.min(12, mesesTrabalhados));
            }
          }

          // Calcular médias
          let mediaHorasExtras = 0;
          let mediaComissoes = 0;
          let mediaOutros = 0;

          const folhasFuncionario = folhasPagamento.filter(f => 
            f.funcionario_id === folha13.funcionario_id &&
            f.competencia?.startsWith(String(folha13.ano_referencia))
          );

          if (folhasFuncionario.length > 0) {
            const totalHorasExtras = folhasFuncionario.reduce((sum, f) => sum + (Number(f.horas_extras) || 0), 0);
            const totalComissoes = folhasFuncionario.reduce((sum, f) => sum + (Number(f.comissoes) || 0), 0);
            const totalBonus = folhasFuncionario.reduce((sum, f) => sum + (Number(f.bonus) || 0), 0);

            mediaHorasExtras = totalHorasExtras / 12;
            mediaComissoes = totalComissoes / 12;
            mediaOutros = totalBonus / 12;
          }

          const baseTotal = salarioBase + mediaHorasExtras + mediaComissoes + mediaOutros;
          const valorBruto = (baseTotal / 12) * avosCalculados;

          const calcularINSS = (sal) => {
            if (sal <= 1412.00) return sal * 0.075;
            if (sal <= 2666.68) return 105.90 + (sal - 1412.00) * 0.09;
            if (sal <= 4000.03) return 218.82 + (sal - 2666.68) * 0.12;
            if (sal <= 7786.02) return 378.82 + (sal - 4000.03) * 0.14;
            return 908.86;
          };

          const calcularIRRF = (base) => {
            if (base <= 2259.20) return 0;
            if (base <= 2826.65) return (base * 0.075) - 169.44;
            if (base <= 3751.05) return (base * 0.15) - 381.44;
            if (base <= 4664.68) return (base * 0.225) - 662.77;
            return (base * 0.275) - 896.00;
          };

          let inss = 0;
          let irrf = 0;
          let valorPrimeiraParcela = 0;
          let valorLiquido = 0;

          if (folha13.tipo_parcela === "1_parcela") {
            valorPrimeiraParcela = valorBruto / 2;
            valorLiquido = valorPrimeiraParcela;
          } else if (folha13.tipo_parcela === "2_parcela") {
            valorPrimeiraParcela = valorBruto / 2;
            inss = calcularINSS(valorBruto);
            const baseIRRF = valorBruto - inss;
            irrf = Math.max(0, calcularIRRF(baseIRRF));
            valorLiquido = valorBruto - valorPrimeiraParcela - inss - irrf;
          } else {
            inss = calcularINSS(valorBruto);
            const baseIRRF = valorBruto - inss;
            irrf = Math.max(0, calcularIRRF(baseIRRF));
            valorLiquido = valorBruto - inss - irrf;
          }

          await base44.entities.Folha13.update(folha13.id, {
            avos_calculados: avosCalculados,
            avos_editados: null,
            salario_base: salarioBase,
            media_horas_extras: Number(mediaHorasExtras.toFixed(2)),
            media_comissoes: Number(mediaComissoes.toFixed(2)),
            media_outros: Number(mediaOutros.toFixed(2)),
            valor_bruto: Number(valorBruto.toFixed(2)),
            inss: Number(inss.toFixed(2)),
            irrf: Number(irrf.toFixed(2)),
            valor_primeira_parcela: Number(valorPrimeiraParcela.toFixed(2)),
            valor_liquido: Number(valorLiquido.toFixed(2)),
            status: 'gerado'
          });

          await fetchData();
          toast({ title: '✅ Recalculado!', description: 'Valores recalculados com sucesso.' });
        } catch (err) {
          console.error('Erro ao recalcular:', err);
          toast({ title: 'Erro', description: 'Não foi possível recalcular.', variant: 'destructive' });
        }
      }
    });
  };

  const handleViewFolha13 = (folha13) => {
    setViewingFolha13(folha13);
    setIsViewerOpen(true);
  };

  const handleMarcarComoPago = async (folha13) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Pagamento',
      message: 'Deseja marcar este 13º salário como PAGO?',
      onConfirm: async () => {
        try {
          await base44.entities.Folha13.update(folha13.id, {
            status: 'pago',
            data_pagamento: new Date().toISOString().split('T')[0]
          });
          await fetchData();
          toast({ title: '✅ Atualizado!', description: '13º marcado como pago.' });
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

  const folhasFiltradas = useMemo(() => {
    if (!folhas13 || folhas13.length === 0) return [];

    return folhas13.filter((folha) => {
      if (!folha) return false;

      const searchLower = searchTerm.toLowerCase();
      const passaBusca = !searchTerm ||
        getFuncionarioNome(folha.funcionario_id).toLowerCase().includes(searchLower);

      const passaFuncionario = filtroFuncionario === 'todos' ||
        String(folha.funcionario_id) === String(filtroFuncionario);
      const passaAno = filtroAno === '' || String(folha.ano_referencia) === filtroAno;
      const passaTipoParcela = filtroTipoParcela === 'todos' || folha.tipo_parcela === filtroTipoParcela;
      const passaStatus = filtroStatus === 'todos' || folha.status === filtroStatus;

      return passaBusca && passaFuncionario && passaAno && passaTipoParcela && passaStatus;
    });
  }, [folhas13, searchTerm, filtroFuncionario, filtroAno, filtroTipoParcela, filtroStatus, funcionarios]);

  const totais = useMemo(() => {
    const totalPago = folhasFiltradas.reduce((total, f) =>
      total + (f?.status === 'pago' ? Number(f?.valor_liquido) || 0 : 0), 0);
    const totalGerado = folhasFiltradas.reduce((total, f) =>
      total + (['gerado', 'editado'].includes(f?.status) ? Number(f?.valor_liquido) || 0 : 0), 0);
    const totalGeral = folhasFiltradas.reduce((total, f) =>
      total + (Number(f?.valor_liquido) || 0), 0);

    return { totalPago, totalGerado, totalGeral };
  }, [folhasFiltradas]);

  const handleSelectForBaixa = (folhaId, checked) => {
    setSelectedForBaixa((prev) =>
      checked ? [...prev, folhaId] : prev.filter((id) => id !== folhaId)
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = folhasFiltradas.filter(f => f.status !== 'pago' && f.status !== 'cancelado').map((f) => f.id);
      setSelectedForBaixa(allIds);
    } else {
      setSelectedForBaixa([]);
    }
  };

  const openMovimentacaoModal = () => {
    if (selectedForBaixa.length === 0) {
      toast({
        title: '⚠️ Atenção',
        description: 'Selecione pelo menos um lançamento de 13º.',
        variant: 'destructive'
      });
      return;
    }
    setContaBancariaMovimentacao('');
    setDataVencimentoMovimentacao('');
    setDataPagamentoMovimentacao('');
    setIsMovimentacaoModalOpen(true);
  };

  const handleGerarMovimentacaoSingle = (folha13) => {
    setSelectedForBaixa([folha13.id]);
    setContaBancariaMovimentacao('');
    setDataVencimentoMovimentacao('');
    setDataPagamentoMovimentacao('');
    setIsMovimentacaoModalOpen(true);
  };

  const handleGerarMovimentacao = () => {
    if (!dataVencimentoMovimentacao) {
      toast({ title: '⚠️ Atenção', description: 'Informe a data de vencimento.', variant: 'destructive' });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Geração de Movimentação',
      message: `Deseja gerar movimentação financeira para ${selectedForBaixa.length} lançamento(s) de 13º?`,
      onConfirm: async () => {
        try {
          const user = await base44.auth.me();

          for (const folhaId of selectedForBaixa) {
            const folha = folhas13.find((f) => f.id === folhaId);
            if (!folha) continue;

            const funcionario = funcionarios.find((f) => f.id === folha.funcionario_id);
            const tipoParcelaLabel = {
              "1_parcela": "1ª Parcela",
              "2_parcela": "2ª Parcela",
              "parcela_unica": "Parcela Única"
            }[folha.tipo_parcela];

            const movData = {
              descricao: `13º Salário ${tipoParcelaLabel} - ${funcionario?.nome || 'Funcionário'} - ${folha.ano_referencia}`,
              tipo: 'despesa',
              categoria: '13º Salário',
              created_by: user.email,
              conta_bancaria_id: contaBancariaMovimentacao || null,
              total: folha.valor_liquido,
              data_emissao: new Date().toISOString().split('T')[0],
              folha_13_id: folha.id,
              fornecedor_cliente_nome: funcionario?.nome || '',
              fornecedor_cliente_cpf_cnpj: funcionario?.cpf || '',
              forma_pagamento: 'Transferência',
              condicao_pagamento: 'À Vista',
              parcelas: [{
                numero_parcela: 1,
                data_vencimento: dataVencimentoMovimentacao,
                valor: folha.valor_liquido,
                status: dataPagamentoMovimentacao ? 'pago' : 'pendente'
              }],
              planos_contas: folha.plano_contas_id ? [{
                plano_contas_id: folha.plano_contas_id,
                valor: folha.valor_liquido,
                percentual: 100
              }] : []
            };

            await base44.entities.MovimentacaoFinanceira.create(movData);

            await base44.entities.Folha13.update(folha.id, {
              status: dataPagamentoMovimentacao ? 'pago' : folha.status,
              data_pagamento: dataPagamentoMovimentacao || folha.data_pagamento
            });
          }

          setSelectedForBaixa([]);
          setIsMovimentacaoModalOpen(false);
          await fetchData();

          toast({
            title: '✅ Movimentações Geradas',
            description: `${selectedForBaixa.length} movimentação(ões) financeira(s) criada(s)!`
          });
        } catch (err) {
          console.error('Erro ao gerar movimentações:', err);
          toast({ title: 'Erro', description: 'Não foi possível gerar as movimentações.', variant: 'destructive' });
        }
      }
    });
  };

  const tipoParcelaLabels = {
    "1_parcela": <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">1ª Parcela</Badge>,
    "2_parcela": <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">2ª Parcela</Badge>,
    "parcela_unica": <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300">Parcela Única</Badge>
  };

  const statusLabels = {
    gerado: <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Gerado</Badge>,
    editado: <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Editado</Badge>,
    pago: <Badge className="bg-green-100 text-green-800 border-green-300">Pago</Badge>,
    cancelado: <Badge className="bg-red-100 text-red-800 border-red-300">Cancelado</Badge>
  };

  const handleGenerateRelatorio = async (filters) => {
    // Filtrar dados baseado nos filtros
    let filteredForReport = [...folhas13];

    if (filters.anoReferencia) {
      filteredForReport = filteredForReport.filter(f => f.ano_referencia === filters.anoReferencia);
    }

    if (filters.tipoParcela) {
      filteredForReport = filteredForReport.filter(f => f.tipo_parcela === filters.tipoParcela);
    }

    if (filters.status) {
      filteredForReport = filteredForReport.filter(f => f.status === filters.status);
    }

    if (filters.funcionarioId) {
      filteredForReport = filteredForReport.filter(f => f.funcionario_id === filters.funcionarioId);
    }

    if (filters.departamentoId) {
      const funcionariosDoDepartamento = funcionarios.filter(func =>
        func.departamento_id === filters.departamentoId
      ).map(func => func.id);
      filteredForReport = filteredForReport.filter(f =>
        funcionariosDoDepartamento.includes(f.funcionario_id)
      );
    }

    // Buscar nomes para exibir no filtro
    const funcionarioSelecionado = funcionarios.find(f => f.id === filters.funcionarioId);
    const departamentoSelecionado = departamentos.find(d => d.id === filters.departamentoId);

    const queryParams = new URLSearchParams({
      filters: JSON.stringify({
        ...filters,
        funcionarioNome: funcionarioSelecionado?.nome || '',
        departamentoNome: departamentoSelecionado?.nome || '',
        folhas: filteredForReport.map(f => f.id)
      })
    });

    window.open(`/Relatorio13Salario?${queryParams.toString()}`, '_blank');
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
            <Button onClick={fetchData} className="w-full">Tentar Novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">13º Salário</h1>
                <p className="text-slate-300 text-sm">Gestão completa do décimo terceiro salário</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? 'Ocultar Filtros' : 'Filtros'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsRelatorioFiltersModalOpen(true)}
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
              >
                <FileText className="w-4 h-4" />
                Relatório
              </Button>
              <Button
                variant="outline"
                onClick={openMovimentacaoModal}
                disabled={selectedForBaixa.length === 0}
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 disabled:opacity-50"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Gerar Movimentação ({selectedForBaixa.length})
              </Button>
              <Button
                onClick={() => setIsLoteFormOpen(true)}
                variant="outline"
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
              >
                <Users className="w-4 h-4" />
                Gerar em Lote
              </Button>
              <Button
                onClick={() => openForm()}
                variant="outline"
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Novo Lançamento
              </Button>
            </div>
          </div>
        </div>

        {/* Cards de Totais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-slate-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totais.totalGeral)}</div>
              <p className="text-xs text-slate-500 mt-1">{folhasFiltradas.length} lançamentos</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(totais.totalPago)}</div>
              <p className="text-xs text-slate-500 mt-1">{folhasFiltradas.filter((f) => f.status === 'pago').length} lançamentos</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Gerados/Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{formatCurrency(totais.totalGerado)}</div>
              <p className="text-xs text-slate-500 mt-1">{folhasFiltradas.filter((f) => ['gerado', 'editado'].includes(f.status)).length} lançamentos</p>
            </CardContent>
          </Card>
        </div>

        {/* Busca e Filtros */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar por funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {showFilters && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-black font-semibold">Funcionário</Label>
                    <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
                      <SelectTrigger className="text-black border border-slate-300"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {funcionarios.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-black font-semibold">Ano</Label>
                    <Input
                      type="number"
                      min="2020"
                      max="2030"
                      value={filtroAno}
                      onChange={(e) => setFiltroAno(e.target.value)}
                      className="text-black border border-slate-300"
                    />
                  </div>

                  <div>
                    <Label className="text-black font-semibold">Tipo de Parcela</Label>
                    <Select value={filtroTipoParcela} onValueChange={setFiltroTipoParcela}>
                      <SelectTrigger className="text-black border border-slate-300"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas</SelectItem>
                        <SelectItem value="1_parcela">1ª Parcela</SelectItem>
                        <SelectItem value="2_parcela">2ª Parcela</SelectItem>
                        <SelectItem value="parcela_unica">Parcela Única</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-black font-semibold">Status</Label>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger className="text-black border border-slate-300"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="gerado">Gerado</SelectItem>
                        <SelectItem value="editado">Editado</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFiltroFuncionario('todos');
                      setFiltroAno(String(new Date().getFullYear()));
                      setFiltroTipoParcela('todos');
                      setFiltroStatus('todos');
                    }}
                    className="border-slate-300 text-slate-900 hover:bg-slate-50 font-semibold"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-700 hover:bg-slate-700">
                    <TableHead className="w-12 text-white">
                      <Checkbox
                        checked={selectedForBaixa.length === folhasFiltradas.filter(f => f.status !== 'pago' && f.status !== 'cancelado').length && folhasFiltradas.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-white">Funcionário</TableHead>
                    <TableHead className="font-semibold text-white">Ano</TableHead>
                    <TableHead className="font-semibold text-white">Tipo Parcela</TableHead>
                    <TableHead className="text-center font-semibold text-white">Avos</TableHead>
                    <TableHead className="text-right font-semibold text-white">Valor Líquido</TableHead>
                    <TableHead className="font-semibold text-white">Status</TableHead>
                    <TableHead className="text-center font-semibold text-white">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                        <p className="mt-2 text-slate-600">Carregando...</p>
                      </TableCell>
                    </TableRow>
                  ) : folhasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        Nenhum lançamento de 13º encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    folhasFiltradas.map((folha) => (
                      <TableRow key={folha?.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <Checkbox
                            checked={selectedForBaixa.includes(folha.id)}
                            onCheckedChange={(checked) => handleSelectForBaixa(folha.id, checked)}
                            disabled={folha.status === 'pago' || folha.status === 'cancelado'}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{getFuncionarioNome(folha?.funcionario_id)}</TableCell>
                        <TableCell className="text-slate-900">{folha?.ano_referencia}</TableCell>
                        <TableCell>{tipoParcelaLabels[folha?.tipo_parcela]}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {folha?.avos_editados ?? folha?.avos_calculados}/12
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-slate-900 font-semibold">{formatCurrency(folha?.valor_liquido)}</TableCell>
                        <TableCell>{statusLabels[folha?.status]}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewFolha13(folha)}
                              className="hover:bg-blue-50 text-blue-600"
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="hover:bg-slate-100">
                                  •••
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openForm(folha)} disabled={folha.status === 'pago'}>
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRecalcular(folha)} disabled={folha.status === 'pago'}>
                                  <RefreshCw className="mr-2 h-4 w-4" /> Recalcular
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGerarMovimentacaoSingle(folha)} disabled={folha.status === 'pago' || folha.status === 'cancelado'}>
                                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Gerar Movimentação
                                </DropdownMenuItem>
                                {folha.status !== 'pago' && (
                                  <DropdownMenuItem onClick={() => handleMarcarComoPago(folha)}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Marcar como Pago
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(folha?.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      {isFormOpen && (
        <Folha13Form
          isOpen={isFormOpen}
          folha13={selectedFolha13}
          funcionarios={funcionarios.filter(f => f.status === 'ativo')}
          planoContas={planoContas}
          folhasPagamento={folhasPagamento}
          controlePonto={controlePontos}
          configuracoes={configuracoes}
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setSelectedFolha13(null); }}
        />
      )}

      {isLoteFormOpen && (
        <Folha13LoteForm
          isOpen={isLoteFormOpen}
          funcionarios={funcionarios.filter(f => f.status === 'ativo')}
          folhasPagamento={folhasPagamento}
          onSave={handleLoteSave}
          onClose={() => setIsLoteFormOpen(false)}
        />
      )}

      {isViewerOpen && viewingFolha13 && (
        <Folha13Viewer
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          folha13={viewingFolha13}
          funcionarios={funcionarios}
          planoContas={planoContas}
          onEdit={openForm}
          onGerarMovimentacao={handleGerarMovimentacaoSingle}
        />
      )}

      {isRelatorioFiltersModalOpen && (
        <Relatorio13FiltersModal
          isOpen={isRelatorioFiltersModalOpen}
          onClose={() => setIsRelatorioFiltersModalOpen(false)}
          onGenerate={handleGenerateRelatorio}
          funcionarios={funcionarios}
          departamentos={departamentos}
        />
      )}

      {/* Modal de Movimentação Financeira */}
      {isMovimentacaoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-700 bg-slate-800 text-white sticky top-0 z-10 rounded-t-xl">
              <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                <ArrowRightLeft className="w-6 h-6 text-white" />
                Gerar Movimentação Financeira
              </h2>
              <Button size="sm" onClick={() => setIsMovimentacaoModalOpen(false)} className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-800 font-semibold mb-2">Lançamentos selecionados: {selectedForBaixa.length}</p>
              </div>

              <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-5 mb-6">
                <p className="text-base text-slate-900 font-bold">
                  Total a ser movimentado: <span className="text-2xl text-slate-900">{formatCurrency(
                    folhas13.filter((f) => selectedForBaixa.includes(f.id)).reduce((acc, f) => acc + (f.valor_liquido || 0), 0)
                  )}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <Label className="text-sm font-bold text-slate-900 mb-2 block">Data de Vencimento *</Label>
                  <Input
                    type="date"
                    className="w-full border-2 border-slate-400 text-slate-900 font-medium"
                    required
                    value={dataVencimentoMovimentacao}
                    onChange={(e) => setDataVencimentoMovimentacao(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm font-bold text-slate-900 mb-2 block">Data de Pagamento</Label>
                  <Input
                    type="date"
                    className="w-full border-2 border-slate-400 text-slate-900 font-medium"
                    value={dataPagamentoMovimentacao}
                    onChange={(e) => setDataPagamentoMovimentacao(e.target.value)}
                  />
                  <p className="text-xs text-slate-700 mt-1 font-medium">Deixe em branco se ainda não foi pago</p>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-sm font-bold text-slate-900 mb-2 block">Conta Bancária</Label>
                  <Select value={contaBancariaMovimentacao} onValueChange={setContaBancariaMovimentacao}>
                    <SelectTrigger className="w-full border-2 border-slate-400 text-slate-900 font-medium">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasBancarias.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.nome} {conta.banco ? `- ${conta.banco}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Lançamentos Selecionados</h3>
                <div className="border-2 border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="text-left p-4 font-bold">Funcionário</th>
                        <th className="text-center p-4 font-bold">Parcela</th>
                        <th className="text-right p-4 font-bold">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {folhas13.filter((f) => selectedForBaixa.includes(f.id)).map((folha) => (
                        <tr key={folha.id} className="border-t-2 border-slate-200 hover:bg-slate-100">
                          <td className="p-4 text-slate-900 font-semibold">{getFuncionarioNome(folha.funcionario_id)}</td>
                          <td className="text-center p-4">{tipoParcelaLabels[folha.tipo_parcela]}</td>
                          <td className="text-right p-4 font-bold text-slate-900 text-base">{formatCurrency(folha.valor_liquido)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 pt-4 border-t border-slate-200 bg-slate-50 sticky bottom-0 rounded-b-xl">
              <Button variant="outline" onClick={() => setIsMovimentacaoModalOpen(false)} className="border-slate-300 text-slate-700 hover:bg-slate-100 px-8 font-bold">
                Cancelar
              </Button>
              <Button onClick={handleGerarMovimentacao} className="bg-slate-900 hover:bg-slate-800 text-white px-8 font-bold shadow-lg">
                Gerar Movimentação
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
              className="bg-white border-2 border-slate-400 text-slate-900 hover:bg-slate-100 font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                confirmDialog.onConfirm?.();
                setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Folha13Page() {
  return (
    <ProtectedPage requiredModule="folha">
      <Folha13Content />
    </ProtectedPage>
  );
}