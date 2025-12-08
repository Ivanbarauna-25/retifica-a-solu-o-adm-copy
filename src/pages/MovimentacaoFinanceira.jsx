import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  FileSignature,
  ArrowDownCircle,
  XCircle,
  Eye,
  Filter,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  ArrowRightLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import ModalNovaMovimentacao from '@/components/modals/ModalNovaMovimentacao';
import BaixaModal from '@/components/modals/BaixaModal';
import ExcluirModal from '@/components/modals/ExcluirModal';
import RenegociarModal from '@/components/modals/RenegociarModal';
import MovimentacaoDetailViewer from '@/components/MovimentacaoDetailViewer';
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { formatCurrency, formatDate } from '@/components/formatters';
import SearchableContactSelect from '@/components/SearchableContactSelect';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdvancedSearchFilters from '@/components/filters/AdvancedSearchFilters';
import { useAdvancedFilters } from '@/components/filters/useAdvancedFilters';

export default function MovimentacaoFinanceiraPage() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMovimentacao, setSelectedMovimentacao] = useState(null);

  // Estados dos modais
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [viewingMovimentacao, setViewingMovimentacao] = useState(null);
  const [isBaixaModalOpen, setIsBaixaModalOpen] = useState(false);
  const [baixaPrefill, setBaixaPrefill] = useState(null);
  const [isRenegociarModalOpen, setIsRenegociarModalOpen] = useState(false);
  const [isExcluirModalOpen, setIsExcluirModalOpen] = useState(false);

  // Estado de filtros avançados
  const [advancedFilters, setAdvancedFilters] = useState(null);

  // Filtro por origem específica (vindo da URL)
  const [filtroOrigemId, setFiltroOrigemId] = useState('');
  const [filtroOrigemTipo, setFiltroOrigemTipo] = useState('');
  const location = useLocation();

  const { toast } = useToast();

  const tipoColors = {
    credito: 'text-green-600',
    debito: 'text-red-600',
    investimento: 'text-blue-600'
  };
  const tipoLabels = {
    credito: 'Crédito',
    debito: 'Débito',
    investimento: 'Investimento'
  };

  const origemLabels = {
    manual: 'Manual',
    os: 'OS',
    compras: 'Compras',
    folha_pagamento: 'Folha',
    renegociacao: 'Renegociação',
    orcamento: 'Orçamento'
  };

  const statusColors = {
    pendente: 'bg-yellow-100 text-yellow-800',
    pago: 'bg-green-100 text-green-800',
    parcial: 'bg-blue-100 text-blue-800',
    vencido: 'bg-red-200 text-red-900',
    cancelado: 'bg-gray-200 text-gray-800'
  };
  const statusLabels = {
    pendente: 'Pendente',
    pago: 'Pago',
    parcial: 'Parcial',
    vencido: 'Vencido',
    cancelado: 'Cancelado'
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const [
            movData, cliData, funData, forData,
            cbData, fpData, cpData, pcData
        ] = await Promise.all([
            base44.entities.MovimentacaoFinanceira.list('-created_date'),
            base44.entities.Cliente.list(),
            base44.entities.Funcionario.list(),
            base44.entities.Fornecedor.list(),
            base44.entities.ContaBancaria.list(),
            base44.entities.FormaPagamento.list(),
            base44.entities.CondicaoPagamento.list(),
            base44.entities.PlanoContas.list()
        ]);
        setMovimentacoes(movData || []);
        setClientes(cliData || []);
        setFuncionarios(funData || []);
        setFornecedores(forData || []);
        setContasBancarias(cbData || []);
        setFormasPagamento(fpData || []);
        setCondicoesPagamento(cpData || []);
        setPlanoContas(pcData || []);
    } catch (e) {
        setError('Falha ao carregar dados. ' + e.message);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Detectar filtros da URL ao montar
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notaFiscalId = params.get('nota_fiscal_id');
    const osId = params.get('os_id');
    const orcamentoId = params.get('orcamento_id');

    if (notaFiscalId) {
      setFiltroOrigemId(notaFiscalId);
      setFiltroOrigemTipo('compras');
    } else if (osId) {
      setFiltroOrigemId(osId);
      setFiltroOrigemTipo('os');
    } else if (orcamentoId) {
      setFiltroOrigemId(orcamentoId);
      setFiltroOrigemTipo('orcamento');
    }
  }, [location.search]);

  // ✅ NOVO: Abrir movimentação específica ao carregar página com movimentacao_id na URL
  useEffect(() => {
    if (!movimentacoes || movimentacoes.length === 0) return;
    
    const params = new URLSearchParams(location.search);
    const movimentacaoId = params.get('movimentacao_id');
    
    if (movimentacaoId) {
      const mov = movimentacoes.find(m => m.id === movimentacaoId);
      if (mov) {
        // Aguardar um momento para garantir que os dados foram carregados
        setTimeout(() => {
          openDetailView(mov);
        }, 300);
      }
    }
  }, [movimentacoes, location.search]);

  const handleSave = async (data) => {
    try {
      if (selectedMovimentacao) {
        // ✅ NOVO: Verificar se tem parcelas baixadas antes de editar
        const temBaixadas = (selectedMovimentacao.parcelas || []).some(p => p.status === 'pago');
        if (temBaixadas) {
          toast({
            title: 'Edição bloqueada',
            description: 'Não é possível editar movimentações com parcelas baixadas.',
            variant: 'destructive'
          });
          return;
        }
        await base44.entities.MovimentacaoFinanceira.update(selectedMovimentacao.id, data);
        toast({ title: "Sucesso!", description: "Movimentação atualizada." });
      } else {
        await base44.entities.MovimentacaoFinanceira.create(data);
        toast({ title: "Sucesso!", description: "Nova movimentação criada." });
      }
      setIsModalOpen(false);
      setIsDetailViewOpen(false); // Close detail view if open
      setSelectedMovimentacao(null);
      setViewingMovimentacao(null); // Clear viewingMovimentacao
      await fetchData();
    } catch (err) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  // Ajuste: aceitar payload extra para registrar baixa e reversão com dados adicionais
  const handleUpdateStatus = async (movId, newStatus, extra = {}) => {
    try {
      // ✅ NOVO: Verificar se tem parcelas baixadas antes de cancelar
      if (newStatus === 'cancelado') {
        const mov = movimentacoes.find(m => m.id === movId);
        const temBaixadas = (mov?.parcelas || []).some(p => p.status === 'pago');
        if (temBaixadas) {
          toast({
            title: 'Cancelamento bloqueado',
            description: 'Não é possível cancelar movimentações com parcelas baixadas. Reabra as parcelas primeiro.',
            variant: 'destructive'
          });
          return;
        }
      }

      let payload = { status: newStatus };

      if (newStatus === 'cancelado') {
        const motivo = typeof extra === 'string' ? extra : extra?.motivo || '';
        payload.motivo_cancelamento = motivo;
      }

      if (newStatus === 'pago') {
        const obj = (typeof extra === 'object' && extra) ? extra : {};
        payload.data_baixa = obj.data_baixa || new Date().toISOString().split('T')[0];
        if (obj.forma_pagamento_baixa_id) payload.forma_pagamento_baixa_id = obj.forma_pagamento_baixa_id;
        if (obj.conta_bancaria_baixa_id) payload.conta_bancaria_baixa_id = obj.conta_bancaria_baixa_id;
        if (obj.motivo_baixa) payload.motivo_baixa = obj.motivo_baixa;
      }

      // Reversão de baixa: voltar para pendente e limpar campos relacionados
      if (newStatus === 'pendente') {
        const motivo = typeof extra === 'string' ? extra : extra?.motivo || '';
        payload.data_baixa = null;
        payload.motivo_baixa = motivo;
        payload.forma_pagamento_baixa_id = null;
        payload.conta_bancaria_baixa_id = null;
      }

      await base44.entities.MovimentacaoFinanceira.update(movId, payload);
      toast({ title: `Status alterado para ${newStatus}!` });
      await fetchData();
    } catch (err) {
      toast({ title: "Erro ao atualizar status", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (movId) => {
     // ✅ NOVO: Verificar se tem parcelas baixadas antes de excluir
     const mov = movimentacoes.find(m => m.id === movId);
     const temBaixadas = (mov?.parcelas || []).some(p => p.status === 'pago');
     
     if (temBaixadas) {
       toast({
         title: 'Exclusão bloqueada',
         description: 'Não é possível excluir movimentações com parcelas baixadas. Reabra as parcelas primeiro.',
         variant: 'destructive'
       });
       return;
     }

     if (window.confirm("Tem certeza que deseja excluir esta movimentação?")) {
        try {
            await base44.entities.MovimentacaoFinanceira.delete(movId);
            toast({ title: "Movimentação excluída com sucesso." });
            setIsDetailViewOpen(false); // Close detail view if open
            setViewingMovimentacao(null); // Clear viewingMovimentacao
            await fetchData();
        } catch (err) {
            toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
        }
     }
  };

  const openModal = (movimentacao = null) => {
    setSelectedMovimentacao(movimentacao);
    setIsModalOpen(true);
  };

  const openDetailView = (movimentacao) => {
    setViewingMovimentacao(movimentacao);
    setIsDetailViewOpen(true);
  };

  const registrarMovimentoCaixa = async (contaId, valor, tipoMovimentacao, descricao, dataMovimento) => {
    try {
      const conta = contasBancarias.find(c => c.id === contaId);
      if (conta && conta.is_caixa) {
        const caixasAbertos = await base44.entities.CaixaAbertura.filter({ 
          conta_bancaria_id: contaId,
          status: 'aberto'
        });

        if (caixasAbertos && caixasAbertos.length > 0) {
          const caixaAberturaId = caixasAbertos[0].id;
          const user = await base44.auth.me();
          
          // Mapear tipo de movimentação financeira para tipo de movimento de caixa
          // Credito (Receita) -> Venda (ou Entrada)
          // Debito (Despesa) -> Saida
          let tipoCaixa = 'entrada';
          if (tipoMovimentacao === 'credito') tipoCaixa = 'venda'; 
          else if (tipoMovimentacao === 'debito') tipoCaixa = 'saida';

          await base44.entities.MovimentoCaixa.create({
            caixa_abertura_id: caixaAberturaId,
            conta_bancaria_id: contaId,
            tipo: tipoCaixa,
            valor: Number(valor),
            descricao: descricao,
            origem: 'financeiro',
            usuario: user?.email || 'sistema',
            data_movimento: new Date().toISOString()
          });
          
          toast({ title: "Lançado no Caixa", description: "Movimento registrado no caixa aberto." });
        } else {
          toast({ 
            title: "Aviso de Caixa", 
            description: "Conta Caixa selecionada mas não há caixa aberto. O movimento não foi registrado no caixa.",
            variant: "warning"
          });
        }
      }
    } catch (err) {
      console.error("Erro ao registrar no caixa:", err);
      toast({ title: "Erro no Caixa", description: "Falha ao registrar movimento no caixa.", variant: "destructive" });
    }
  };

  const handleBaixaParcela = async ({ movimentacaoId, parcelaIndex, baixa }) => {
    try {
      const movAtual = movimentacoes.find(m => m.id === movimentacaoId) || viewingMovimentacao;
      if (!movAtual) return;

      const updatedParcelas = (movAtual.parcelas || []).map((p, idx) =>
        idx === parcelaIndex ? { ...p, status: 'pago', data_baixa: baixa.data_baixa } : p
      );

      const allPaid = updatedParcelas.length > 0 && updatedParcelas.every(p => p.status === 'pago');
      const novoStatus = allPaid ? 'pago' : 'parcial';

      await base44.entities.MovimentacaoFinanceira.update(movimentacaoId, {
        parcelas: updatedParcelas,
        status: novoStatus,
        data_baixa: allPaid ? baixa.data_baixa : movAtual.data_baixa,
        conta_bancaria_baixa_id: allPaid ? baixa.conta_bancaria_id : movAtual.conta_bancaria_baixa_id || null,
        forma_pagamento_baixa_id: allPaid ? baixa.forma_pagamento_id : movAtual.forma_pagamento_baixa_id || null,
        motivo_baixa: allPaid ? baixa.observacao : movAtual.motivo_baixa || null
      });
      
      // Registrar no caixa
      const parcelaValor = (movAtual.parcelas || [])[parcelaIndex]?.valor || 0;
      await registrarMovimentoCaixa(
        baixa.conta_bancaria_id, 
        parcelaValor, 
        movAtual.tipo_movimentacao, 
        `Baixa Parcela ${parcelaIndex + 1} - ${movAtual.historico}`,
        baixa.data_baixa
      );

      toast({ title: "Baixa registrada", description: `Parcela ${updatedParcelas[parcelaIndex]?.numero_parcela || parcelaIndex + 1} marcada como paga.` });
      await fetchData();

      try {
        const atualizado = await base44.entities.MovimentacaoFinanceira.get(movimentacaoId);
        setViewingMovimentacao(atualizado);
      } catch (_) {}
    } catch (err) {
      toast({ title: "Erro ao registrar baixa", description: err.message, variant: "destructive" });
    }
  };


  const getContatoNome = useCallback((movimentacao) => {
    if (!movimentacao) return 'N/A';
    const { contato_tipo, contato_id } = movimentacao;
    switch (contato_tipo) {
      case 'cliente':
        return clientes.find(c => c.id === contato_id)?.nome || 'Cliente não encontrado';
      case 'funcionario':
        return funcionarios.find(f => f.id === contato_id)?.nome || 'Funcionário não encontrado';
      case 'fornecedor':
        return fornecedores.find(f => f.id === contato_id)?.nome || 'Fornecedor não encontrado';
      default:
        return 'Contato desconhecido';
    }
  }, [clientes, funcionarios, fornecedores]);

  // Helper para construir o prefill do modal de baixa com o mesmo nome exibido na tabela
  const buildBaixaPrefill = useCallback((mov) => {
    if (!mov) return null;
    const tipo = (mov.tipo_movimentacao || '').toLowerCase();
    const tipoLabel = tipo === 'debito' ? 'Despesa' : tipo === 'credito' ? 'Receita' : tipo === 'investimento' ? 'Investimento' : '—';
    return {
      movimentacaoId: mov.id,
      tipoMovimentacao: mov.tipo_movimentacao,
      tipoLabel,
      contatoNome: getContatoNome(mov),
      contatoTipo: mov.contato_tipo || null,
      contatoId: mov.contato_id || null,
      numeroDocumento: mov.numero_documento || '-',
      valor: mov.valor_total || 0
    };
  }, [getContatoNome]);

  // Abrir Baixa a partir da linha da tabela
  const openBaixaFromRow = (mov) => {
    setViewingMovimentacao(mov); // Set viewingMovimentacao for consistency
    setBaixaPrefill(buildBaixaPrefill(mov));
    setIsBaixaModalOpen(true);
  };

  // Confirmar Baixa (movimentação inteira)
  const handleBaixaConfirm = async (dados) => {
    // Determine which movimentacao to apply the baixa to
    const targetMov = baixaPrefill ? movimentacoes.find(m => m.id === baixaPrefill.movimentacaoId) : viewingMovimentacao;

    if (!targetMov) {
        toast({ title: "Erro", description: "Nenhuma movimentação selecionada para baixa.", variant: "destructive" });
        return;
    }

    await handleUpdateStatus(targetMov.id, 'pago', {
      data_baixa: dados.data_baixa,
      forma_pagamento_baixa_id: dados.forma_pagamento_id || null,
      conta_bancaria_baixa_id: dados.conta_bancaria_id || null,
      motivo_baixa: dados.observacao || null
    });

    // Registrar no caixa
    await registrarMovimentoCaixa(
      dados.conta_bancaria_id, 
      targetMov.valor_total, 
      targetMov.tipo_movimentacao, 
      `Baixa Total - ${targetMov.historico}`,
      dados.data_baixa
    );

    setIsBaixaModalOpen(false);
    setBaixaPrefill(null); // Clear prefill
    setViewingMovimentacao(null); // Clear viewingMovimentacao after action
  };

  const allContacts = useMemo(() => [
    ...clientes.map(c => ({ id: c.id, nome: `${c.nome} (Cliente)`, tipo: 'cliente', value: `cliente:${c.id}`, label: `${c.nome} (Cliente)` })),
    ...fornecedores.map(f => ({ id: f.id, nome: `${f.nome} (Fornecedor)`, tipo: 'fornecedor', value: `fornecedor:${f.id}`, label: `${f.nome} (Fornecedor)` })),
    ...funcionarios.map(f => ({ id: f.id, nome: `${f.nome} (Funcionário)`, tipo: 'funcionario', value: `funcionario:${f.id}`, label: `${f.nome} (Funcionário)` })),
  ], [clientes, fornecedores, funcionarios]);

  // Configuração dos campos de busca e filtro
  const financeiroSearchFields = [
    { key: 'historico', label: 'Histórico' },
    { key: 'numero_documento', label: 'Nº Documento' },
    { key: '_contatoNome', label: 'Contato' }
  ];

  const financeiroFilterFields = [
    {
      key: 'tipo_movimentacao',
      label: 'Tipo',
      options: [
        { value: 'credito', label: 'Crédito' },
        { value: 'debito', label: 'Débito' },
        { value: 'investimento', label: 'Investimento' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'pendente', label: 'Pendente' },
        { value: 'pago', label: 'Pago' },
        { value: 'parcial', label: 'Parcial' },
        { value: 'vencido', label: 'Vencido' },
        { value: 'cancelado', label: 'Cancelado' }
      ]
    },
    {
      key: 'origem',
      label: 'Origem',
      options: [
        { value: 'manual', label: 'Manual' },
        { value: 'os', label: 'OS' },
        { value: 'compras', label: 'Compras' },
        { value: 'folha_pagamento', label: 'Folha' },
        { value: 'renegociacao', label: 'Renegociação' },
        { value: 'orcamento', label: 'Orçamento' }
      ]
    }
  ];

  const financeiroSortFields = [
    { key: 'data_vencimento', label: 'Vencimento' },
    { key: 'data_faturamento', label: 'Faturamento' },
    { key: 'valor_total', label: 'Valor' },
    { key: 'created_date', label: 'Data Criação' }
  ];

  // Preparar movimentações com campos de busca expandidos
  const movimentacoesComCamposBusca = useMemo(() => {
    return movimentacoes.map(mov => ({
      ...mov,
      _contatoNome: getContatoNome(mov)
    }));
  }, [movimentacoes, clientes, funcionarios, fornecedores]);

  // Filtrar por origem específica da URL primeiro
  const movimentacoesPreFiltradas = useMemo(() => {
    if (!filtroOrigemId) return movimentacoesComCamposBusca;
    
    return movimentacoesComCamposBusca.filter(mov => {
      if (filtroOrigemTipo === 'compras') return mov.nota_fiscal_id === filtroOrigemId;
      if (filtroOrigemTipo === 'os') return mov.os_id === filtroOrigemId;
      if (filtroOrigemTipo === 'orcamento') return mov.orcamento_id === filtroOrigemId;
      return true;
    });
  }, [movimentacoesComCamposBusca, filtroOrigemId, filtroOrigemTipo]);

  // Usar hook de filtros avançados
  const movimentacoesFiltradas = useAdvancedFilters(movimentacoesPreFiltradas, advancedFilters);

  const totais = useMemo(() => {
    const totalEntradas = movimentacoesFiltradas.reduce((acc, m) => m.tipo_movimentacao === 'credito' ? acc + m.valor_total : acc, 0);
    const totalSaidas = movimentacoesFiltradas.reduce((acc, m) => m.tipo_movimentacao === 'debito' ? acc + m.valor_total : acc, 0);
    const saldo = totalEntradas - totalSaidas;
    const totalPendente = movimentacoesFiltradas.filter(m => m.status === 'pendente').reduce((acc, m) => acc + m.valor_total, 0);
    
    return { totalEntradas, totalSaidas, saldo, totalPendente };
  }, [movimentacoesFiltradas]);

  if (error) {
    return <div className="p-4 text-red-500 text-center">{error}</div>;
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-slate-50">
        {/* Header com fundo escuro */}
        <div className="bg-slate-800 text-white px-6 py-8 mb-6 shadow-xl">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                  <ArrowRightLeft className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1 tracking-tight">Movimentação Financeira</h1>
                  <p className="text-slate-200 text-base">
                    Gestão completa de entradas e saídas
                    {filtroOrigemId && (
                      <Badge className="ml-2 bg-blue-600 text-white border-none">
                        Filtro Ativo: {filtroOrigemTipo === 'compras' ? 'Nota Fiscal' : filtroOrigemTipo === 'os' ? 'OS' : 'Orçamento'}
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setIsBaixaModalOpen(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  Registrar Baixa
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsRenegociarModalOpen(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <FileSignature className="w-4 h-4" />
                  Renegociar
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openModal()}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Novo Lançamento
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="max-w-[1800px] mx-auto px-6">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Entradas</p>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totais.totalEntradas)}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Saídas</p>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(totais.totalSaidas)}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Saldo do Período</p>
                  <div className={`text-2xl font-bold ${totais.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(totais.saldo)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Pendente</p>
                  <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totais.totalPendente)}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros Avançados */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <AdvancedSearchFilters
              entityName="movimentacao_financeira"
              searchFields={financeiroSearchFields}
              filterFields={financeiroFilterFields}
              dateField="data_vencimento"
              sortFields={financeiroSortFields}
              defaultSort={{ field: 'data_vencimento', direction: 'desc' }}
              onFiltersChange={setAdvancedFilters}
            />
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white font-semibold">Tipo</TableHead>
                    <TableHead className="text-white font-semibold">Contato</TableHead>
                    <TableHead className="text-white font-semibold">Num. Doc.</TableHead>
                    <TableHead className="text-white font-semibold">Histórico</TableHead>
                    <TableHead className="text-white font-semibold">Vencimento</TableHead>
                    <TableHead className="text-white font-semibold">Desconto</TableHead>
                    <TableHead className="text-white font-semibold">Valor Total</TableHead>
                    <TableHead className="text-white font-semibold">Origem</TableHead>
                    <TableHead className="text-white font-semibold">Baixa</TableHead>
                    <TableHead className="text-white font-semibold text-right w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="10" className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : movimentacoesFiltradas.length === 0 ? (
                    <TableRow><TableCell colSpan="10" className="text-center py-8 text-slate-500">Nenhum movimento encontrado.</TableCell></TableRow>
                  ) : (
                    movimentacoesFiltradas.map((mov) => (
                      <TableRow key={mov.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className={`font-semibold ${tipoColors[mov.tipo_movimentacao]}`}>
                          {tipoLabels[mov.tipo_movimentacao]}
                        </TableCell>
                        <TableCell className="text-slate-900">{getContatoNome(mov)}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{mov.numero_documento || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate text-slate-900">{mov.historico}</TableCell>
                        <TableCell className="text-slate-900">{formatDate(mov.data_vencimento)}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {mov.desconto ? `- ${formatCurrency(mov.desconto)}` : '-'}
                        </TableCell>
                        <TableCell className="font-semibold text-lg text-slate-900">{formatCurrency(mov.valor_total)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {origemLabels[mov.origem] || 'Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {mov.status === 'pago' && mov.data_baixa ? (
                            <span className="text-xs text-gray-600">
                              {formatDate(mov.data_baixa)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openDetailView(mov)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openModal(mov)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openBaixaFromRow(mov)}
                                className="text-emerald-700"
                              >
                                <ArrowDownCircle className="w-4 h-4 mr-2" />
                                Registrar Baixa
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setViewingMovimentacao(mov);
                                  setIsRenegociarModalOpen(true);
                                }}
                                className="text-amber-700"
                              >
                                <FileSignature className="w-4 h-4 mr-2" />
                                Renegociar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setViewingMovimentacao(mov);
                                  setIsExcluirModalOpen(true);
                                }}
                                className="text-red-600"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {isModalOpen && (
        <ModalNovaMovimentacao
          open={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedMovimentacao(null); setViewingMovimentacao(null); }}
          movimentacao={selectedMovimentacao}
          onSubmit={handleSave}
          allContacts={allContacts}
          contasBancarias={contasBancarias}
          formasPagamento={formasPagamento}
          condicoesPagamento={condicoesPagamento}
          planoContas={planoContas}
        />
      )}

      {isDetailViewOpen && (
        <MovimentacaoDetailViewer
            open={isDetailViewOpen}
            movimentacao={viewingMovimentacao}
            onClose={() => {setIsDetailViewOpen(false); setViewingMovimentacao(null);}}
            onEdit={(mov) => { setIsDetailViewOpen(false); openModal(mov); }}
            onBaixa={() => setIsBaixaModalOpen(true)} // This triggers BaixaModal with current viewingMovimentacao
            onRenegociar={() => setIsRenegociarModalOpen(true)}
            onCancelar={() => setIsExcluirModalOpen(true)}
            onDelete={handleDelete}
            onUpdateStatus={handleUpdateStatus}
            allContacts={allContacts}
            contasBancarias={contasBancarias}
            formasPagamento={formasPagamento}
            condicoesPagamento={condicoesPagamento}
            planoContas={planoContas}
            onBaixaParcela={handleBaixaParcela}
        />
      )}

      {/* Modais sempre montados para evitar erros de portal/removeChild */}
      <BaixaModal
        open={Boolean(isBaixaModalOpen || baixaPrefill)}
        onClose={() => {
          setIsBaixaModalOpen(false);
          setBaixaPrefill(null); // Clear prefill
          // Keep viewingMovimentacao if it came from detail viewer, otherwise clear it.
          // This specific component pattern might require reviewing if clearing viewingMovimentacao here is always desired.
          // For now, let's assume it should clear after any modal action.
          setViewingMovimentacao(null);
        }}
        contas={contasBancarias}
        formas={formasPagamento}
        prefill={baixaPrefill || (viewingMovimentacao ? buildBaixaPrefill(viewingMovimentacao) : null)}
        onConfirm={handleBaixaConfirm}
      />

      <RenegociarModal
        open={isRenegociarModalOpen}
        onClose={() => {setIsRenegociarModalOpen(false); setViewingMovimentacao(null);}}
        onComplete={fetchData}
        movimentacao={viewingMovimentacao}
        allContacts={allContacts}
        formasPagamento={formasPagamento}
      />

      <ExcluirModal
        isOpen={isExcluirModalOpen}
        onClose={() => {setIsExcluirModalOpen(false); setViewingMovimentacao(null);}}
        onComplete={fetchData}
        movimentacao={viewingMovimentacao}
        allContacts={allContacts}
        contasBancarias={contasBancarias}
        formasPagamento={formasPagamento}
        condicoesPagamento={condicoesPagamento}
        planoContas={planoContas}
      />
    </>
  );
}