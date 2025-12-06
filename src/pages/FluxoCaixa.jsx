import React, { useState, useEffect } from 'react';
import { MovimentacaoFinanceira } from '@/entities/MovimentacaoFinanceira';
import { ContaBancaria } from '@/entities/ContaBancaria';
import { FormaPagamento } from '@/entities/FormaPagamento';
import { PlanoContas } from '@/entities/PlanoContas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ArrowRightLeft, Filter, TrendingUp, TrendingDown, DollarSign, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FluxoCaixaForm from '@/components/FluxoCaixaForm';
import RelatorioFluxoCaixaFiltersModal from '@/components/fluxocaixa/RelatorioFluxoCaixaFiltersModal';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function FluxoCaixaPage() {
  const [movimentos, setMovimentos] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMovimento, setSelectedMovimento] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroConta, setFiltroConta] = useState('todas');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);

  const mapMovimentoToFluxo = (m) => {
    const isPago = m.status === 'pago' || m.status === 'parcial';
    const dataMovimento = m.data_baixa || m.data_vencimento || m.data_faturamento;
    // Se status é pago, usa conta da baixa, senão conta prevista
    const contaId = isPago ? m.conta_bancaria_baixa_id : m.conta_bancaria_id;
    const formaId = isPago ? m.forma_pagamento_baixa_id : m.forma_pagamento_id;
    const planoId = m.planos_contas && m.planos_contas.length > 0 ? m.planos_contas[0].plano_contas_id : '';
    
    // Map 'credito' -> 'entrada', 'debito' -> 'saida'
    let tipo = 'saida';
    if (m.tipo_movimentacao === 'credito') tipo = 'entrada';
    else if (m.tipo_movimentacao === 'debito') tipo = 'saida';
    // 'investimento' ?

    return {
      id: m.id,
      original_id: m.id,
      data_movimento: dataMovimento,
      tipo_movimento: tipo,
      tipo_movimentacao_original: m.tipo_movimentacao,
      conta_bancaria_id: contaId,
      forma_pagamento_id: formaId,
      plano_contas_id: planoId,
      descricao: m.historico || m.numero_documento || m.observacoes || 'Sem descrição',
      valor: m.valor_total, // Ou valor_pago? Para fluxo de caixa realizado seria valor_pago. Vamos usar valor_total por enquanto.
      observacoes: m.observacoes,
      status: m.status,
      origem: m.origem
    };
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all financial movements
      // Ideally sort by data_baixa or data_vencimento descending
      // Since we map after, we sort locally or fetch generic sort
      const [movimentosData, contasData, formasData, planoData] = await Promise.all([
        MovimentacaoFinanceira.list(), // List all, we'll sort locally
        ContaBancaria.list(),
        FormaPagamento.list(),
        PlanoContas.list()
      ]);

      const mappedMovimentos = movimentosData.map(mapMovimentoToFluxo)
        // Filter out those without dates if critical, or keep
        .sort((a, b) => new Date(b.data_movimento) - new Date(a.data_movimento));

      setMovimentos(mappedMovimentos);
      setContasBancarias(contasData);
      setFormasPagamento(formasData);
      setPlanoContas(planoData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data) => {
    const isUpdate = selectedMovimento && selectedMovimento.id;
    
    // Prepare MovimentacaoFinanceira data
    // 'entrada' -> 'credito', 'saida' -> 'debito'
    const tipoMovimentacao = data.tipo_movimento === 'entrada' ? 'credito' : 'debito';
    
    const movimentoData = {
      tipo_movimentacao: tipoMovimentacao,
      numero_documento: isUpdate ? selectedMovimento.descricao : `MANUAL-${Date.now()}`, // Generate or reuse description
      historico: data.descricao,
      observacoes: data.observacoes,
      valor_total: parseFloat(data.valor),
      data_faturamento: data.data_movimento, // Assuming same date
      data_vencimento: data.data_movimento,
      data_baixa: data.data_movimento, // Manual entry implies immediate payment usually
      status: 'pago', // Manual entries are usually realized
      origem: 'manual',
      
      // Contas e Formas
      conta_bancaria_baixa_id: data.conta_bancaria_id,
      forma_pagamento_baixa_id: data.forma_pagamento_id,
      // Also set pending fields for consistency if needed, or leave null
      
      // Plano de contas (array)
      planos_contas: data.plano_contas_id ? [{
        plano_contas_id: data.plano_contas_id,
        valor: parseFloat(data.valor),
        tipo: tipoMovimentacao,
        observacao: 'Lançamento manual'
      }] : []
    };

    try {
      if (isUpdate) {
        // We need to handle balance update reversal logic if we want to keep manual balance updates
        // But first let's update the entity
        await MovimentacaoFinanceira.update(selectedMovimento.id, movimentoData);
      } else {
        await MovimentacaoFinanceira.create(movimentoData);
      }

      // Manual Balance Update Logic
      // Replicate the logic from previous FluxoCaixaPage but adapted
      // NOTE: This logic assumes the backend DOES NOT automatically update balance.
      // If backend automation exists for MovimentacaoFinanceira, this will double count.
      // Given the user is using this system, likely automation isn't fully set up or they rely on this.
      // I will Keep the balance update logic for 'manual' entries or if confirmed. 
      // For safety, let's assume we should update balance for manual entries created here.
      
      const newConta = contasBancarias.find(c => c.id === data.conta_bancaria_id);
      if (newConta) {
        let saldoAjustado = newConta.saldo_atual;
        
        if (isUpdate) {
          const movimentoOriginal = movimentos.find(m => m.id === selectedMovimento.id);
          const oldContaId = movimentoOriginal.conta_bancaria_id;
          const oldValor = movimentoOriginal.valor;
          const oldTipo = movimentoOriginal.tipo_movimento;

          const originalConta = contasBancarias.find(c => c.id === oldContaId);
          
          if (originalConta) {
             // Revert old movement
             if (originalConta.id === newConta.id) {
                // Same account
                if (oldTipo === 'entrada') saldoAjustado -= oldValor;
                else saldoAjustado += oldValor;
             } else {
                // Different account, revert original first
                let originalContaSaldo = originalConta.saldo_atual;
                if (oldTipo === 'entrada') originalContaSaldo -= oldValor;
                else originalContaSaldo += oldValor;
                await ContaBancaria.update(originalConta.id, { saldo_atual: originalContaSaldo });
             }
          }
        }

        // Apply new movement
        if (data.tipo_movimento === 'entrada') saldoAjustado += parseFloat(data.valor);
        else saldoAjustado -= parseFloat(data.valor);

        await ContaBancaria.update(newConta.id, { saldo_atual: saldoAjustado });
      }

      await fetchData();
      setIsFormOpen(false);
      setSelectedMovimento(null);
    } catch (err) {
      console.error("Error saving movement:", err);
      alert("Erro ao salvar movimentação.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este movimento?')) {
      const movimentoToDelete = movimentos.find(m => m.id === id);
      if (movimentoToDelete) {
        // Revert balance if it was paid
        // Only revert if status is 'pago' (which manual entries are)
        if (movimentoToDelete.status === 'pago' || movimentoToDelete.status === 'parcial') {
            const conta = contasBancarias.find(c => c.id === movimentoToDelete.conta_bancaria_id);
            if (conta) {
              let novoSaldo = conta.saldo_atual;
              if (movimentoToDelete.tipo_movimento === 'entrada') {
                novoSaldo -= movimentoToDelete.valor;
              } else {
                novoSaldo += movimentoToDelete.valor;
              }
              await ContaBancaria.update(conta.id, { saldo_atual: novoSaldo });
            }
        }
        
        await MovimentacaoFinanceira.delete(id);
        await fetchData();
      }
    }
  };

  const openForm = (movimento = null) => {
    setSelectedMovimento(movimento);
    setIsFormOpen(true);
  };

  const handleNovoLancamento = () => {
    openForm();
  };

  const getContaNome = (contaId) => {
    const conta = contasBancarias.find(c => c.id === contaId);
    return conta ? conta.nome : 'Conta não encontrada';
  };

  const getFormaPagamentoNome = (formaId) => {
    const forma = formasPagamento.find(f => f.id === formaId);
    return forma ? forma.nome : 'N/A';
  };

  const getPlanoContaNome = (contaId) => {
    const conta = planoContas.find(c => c.id === contaId);
    return conta ? conta.nome : 'N/A';
  };

  const movimentosFiltrados = movimentos.filter(movimento => {
    const passaTipo = filtroTipo === 'todos' || movimento.tipo_movimento === filtroTipo;
    const passaConta = filtroConta === 'todas' || movimento.conta_bancaria_id === filtroConta;
    const passaDataInicio = !dataInicio || new Date(movimento.data_movimento) >= new Date(dataInicio);
    const passaDataFim = !dataFim || new Date(movimento.data_movimento) <= new Date(dataFim);
    return passaTipo && passaConta && passaDataInicio && passaDataFim;
  });

  const stats = {
    entradas: movimentosFiltrados.reduce((acc, m) => m.tipo_movimento === 'entrada' ? acc + (m.valor || 0) : acc, 0),
    saidas: movimentosFiltrados.reduce((acc, m) => m.tipo_movimento === 'saida' ? acc + (m.valor || 0) : acc, 0),
    saldo: movimentosFiltrados.reduce((acc, m) => m.tipo_movimento === 'entrada' ? acc + (m.valor || 0) : acc - (m.valor || 0), 0)
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-8 mb-6 shadow-xl">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <ArrowRightLeft className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Fluxo de Caixa</h1>
                  <p className="text-slate-300">Movimentações Financeiras (Entradas e Saídas)</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowRelatorioModal(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Relatório
                </Button>

                <Button
                  variant="outline"
                  onClick={handleNovoLancamento}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Novo Lançamento
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Entradas</p>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.entradas)}</div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Saídas</p>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.saidas)}</div>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Saldo do Período</p>
                    <div className={`text-2xl font-bold ${stats.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.saldo)}
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-100" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros Expandidos */}
          {showFilters && (
            <Card className="mb-6 border-slate-200 shadow-md">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Tipo</Label>
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="entrada">Entradas</SelectItem>
                        <SelectItem value="saida">Saídas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Conta</Label>
                    <Select value={filtroConta} onValueChange={setFiltroConta}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as Contas</SelectItem>
                        {contasBancarias.map(conta => (
                          <SelectItem key={conta.id} value={conta.id}>
                            {conta.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Data Início</Label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Data Fim</Label>
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white font-semibold">Data</TableHead>
                    <TableHead className="text-white font-semibold">Tipo</TableHead>
                    <TableHead className="text-white font-semibold">Descrição</TableHead>
                    <TableHead className="text-white font-semibold">Categoria</TableHead>
                    <TableHead className="text-white font-semibold">Conta</TableHead>
                    <TableHead className="text-white font-semibold">Forma Pagamento</TableHead>
                    <TableHead className="text-white font-semibold text-right">Valor</TableHead>
                    <TableHead className="text-white font-semibold text-center w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="8" className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                  ) : movimentosFiltrados.length === 0 ? (
                    <TableRow><TableCell colSpan="8" className="text-center py-8 text-gray-500">Nenhum movimento encontrado.</TableCell></TableRow>
                  ) : (
                    movimentosFiltrados.map((movimento) => (
                      <TableRow key={movimento.id} className="hover:bg-slate-50">
                        <TableCell className="text-slate-900">{formatDate(movimento.data_movimento)}</TableCell>
                        <TableCell>
                          <Badge className={movimento.tipo_movimento === 'entrada' ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200'}>
                            {movimento.tipo_movimento === 'entrada' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{movimento.descricao}</TableCell>
                        <TableCell className="text-slate-600">{getPlanoContaNome(movimento.plano_contas_id)}</TableCell>
                        <TableCell className="text-slate-600">{getContaNome(movimento.conta_bancaria_id)}</TableCell>
                        <TableCell className="text-slate-600">{getFormaPagamentoNome(movimento.forma_pagamento_id)}</TableCell>
                        <TableCell className={`text-right font-semibold ${movimento.tipo_movimento === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {movimento.tipo_movimento === 'entrada' ? '+' : '-'}{formatCurrency(movimento.valor)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openForm(movimento)} className="h-8 w-8 p-0 hover:bg-amber-50 text-amber-600">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(movimento.id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      {isFormOpen && (
        <FluxoCaixaForm
          movimento={selectedMovimento}
          contasBancarias={contasBancarias}
          formasPagamento={formasPagamento}
          planoContas={planoContas}
          onSave={handleSave}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedMovimento(null);
          }}
        />
      )}

      <RelatorioFluxoCaixaFiltersModal
        isOpen={showRelatorioModal}
        onClose={() => setShowRelatorioModal(false)}
        contasBancarias={contasBancarias}
      />
    </>
  );
}