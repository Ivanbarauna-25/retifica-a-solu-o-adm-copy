import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, CheckCircle2, FileText, Search, Filter, DollarSign, AlertCircle, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, formatCompetencia } from '@/components/formatters';
import RelatorioContasPagarFiltersModal from '@/components/relatorios/RelatorioContasPagarFiltersModal';
import ContasPagarForm from '@/components/ContasPagarForm';
import StandardDialog, { useStandardDialog } from '@/components/ui/StandardDialog';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function ContasPagarPage() {
  const [contas, setContas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [planosContas, setPlanosContas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState(null);
  const { toast } = useToast();
  const { showDanger, closeDialog, DialogComponent } = useStandardDialog();

  const statusColors = {
    'pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'pago': 'bg-green-100 text-green-800 border-green-200',
    'vencido': 'bg-red-100 text-red-800 border-red-200',
    'cancelado': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  const statusLabels = {
    'pendente': 'Pendente', 'pago': 'Pago', 'vencido': 'Vencido', 'cancelado': 'Cancelado'
  };

  const fetchData = async () => {
    setIsLoading(true);
    const [contasData, fornecedoresData, planosData] = await Promise.all([
      base44.entities.ContasPagar.list('-created_date'),
      base44.entities.Fornecedor.list(),
      base44.entities.PlanoContas.list()
    ]);
    const hoje = new Date();
    const contasAtualizadas = contasData.map(conta => {
      if (conta.status === 'pendente' && new Date(conta.data_vencimento) < hoje) {
        return { ...conta, status: 'vencido' };
      }
      return conta;
    });
    setContas(contasAtualizadas);
    setFornecedores(fornecedoresData);
    setPlanosContas(planosData);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getFornecedorNome = (id) => {
    const f = fornecedores.find(f => f.id === id);
    return f ? f.nome : 'N/A';
  };
  const getPlanoContasNome = (id) => {
    const p = planosContas.find(p => p.id === id);
    return p ? `${p.codigo} - ${p.nome}` : 'N/A';
  };

  const contasFiltradas = contas.filter(conta => {
    const passaBusca = busca === '' ||
      conta.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      conta.numero_documento?.toLowerCase().includes(busca.toLowerCase()) ||
      getFornecedorNome(conta.fornecedor_id)?.toLowerCase().includes(busca.toLowerCase());
    const passaFornecedor = filtroFornecedor === 'todos' || conta.fornecedor_id === filtroFornecedor;
    const passaStatus = filtroStatus === 'todos' || conta.status === filtroStatus;
    const passaData = (!dataInicio || conta.data_vencimento >= dataInicio) && (!dataFim || conta.data_vencimento <= dataFim);
    return passaBusca && passaFornecedor && passaStatus && passaData;
  });

  const stats = {
    totalAPagar: contas.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((acc, c) => acc + (c.valor_original || 0), 0),
    totalVencido: contas.filter(c => c.status === 'vencido').reduce((acc, c) => acc + (c.valor_original || 0), 0),
    totalPago: contas.filter(c => c.status === 'pago').reduce((acc, c) => acc + (c.valor_pago || 0), 0),
    totalGeral: contas.reduce((acc, c) => acc + (c.valor_original || 0), 0)
  };

  const handleSave = async (data) => {
    if (selectedConta?.id) {
      await base44.entities.ContasPagar.update(selectedConta.id, data);
      toast({ title: '✅ Conta atualizada com sucesso!' });
    } else {
      await base44.entities.ContasPagar.create(data);
      toast({ title: '✅ Conta criada com sucesso!' });
    }
    setIsFormOpen(false);
    setSelectedConta(null);
    fetchData();
  };

  const handleEdit = (conta) => {
    setSelectedConta(conta);
    setIsFormOpen(true);
  };

  const handleDelete = (conta) => {
    showDanger(
      'Excluir Conta a Pagar',
      `Tem certeza que deseja excluir "${conta.descricao}"? Esta ação não pode ser desfeita.`,
      async () => {
        await base44.entities.ContasPagar.delete(conta.id);
        toast({ title: '✅ Conta excluída!' });
        closeDialog();
        fetchData();
      }
    );
  };

  const handleMarcarPago = async (conta) => {
    await base44.entities.ContasPagar.update(conta.id, {
      status: 'pago',
      data_pagamento: new Date().toISOString().split('T')[0],
      valor_pago: conta.valor_original
    });
    toast({ title: '✅ Conta marcada como paga!' });
    fetchData();
  };

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-slate-50">
        {/* Header Responsivo */}
        <div className="bg-slate-800 text-white px-3 md:px-6 py-4 md:py-6 mb-4 md:mb-6 shadow-xl">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 md:p-3 rounded-lg">
                  <DollarSign className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold">Contas a Pagar</h1>
                  <p className="text-slate-300 text-xs md:text-sm">Gestão de obrigações financeiras</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 h-8 md:h-9 text-xs md:text-sm px-3"
                >
                  <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Filtros</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsFiltersModalOpen(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 h-8 md:h-9 text-xs md:text-sm px-3"
                >
                  <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Relatório</span>
                </Button>
                <Button
                  onClick={() => { setSelectedConta(null); setIsFormOpen(true); }}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2 h-8 md:h-9 text-xs md:text-sm px-3"
                >
                  <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Nova Conta
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-3 md:px-6">
          {/* Stats Cards Responsivos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-0.5 md:mb-1">Total Geral</p>
                    <div className="text-lg md:text-2xl font-bold text-slate-900">{formatCurrency(stats.totalGeral)}</div>
                  </div>
                  <FileText className="w-6 h-6 md:w-8 md:h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-0.5 md:mb-1">A Pagar</p>
                    <div className="text-lg md:text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalAPagar)}</div>
                  </div>
                  <Clock className="w-6 h-6 md:w-8 md:h-8 text-yellow-100" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-0.5 md:mb-1">Vencido</p>
                    <div className="text-lg md:text-2xl font-bold text-red-600">{formatCurrency(stats.totalVencido)}</div>
                  </div>
                  <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-red-100" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-0.5 md:mb-1">Pago</p>
                    <div className="text-lg md:text-2xl font-bold text-green-600">{formatCurrency(stats.totalPago)}</div>
                  </div>
                  <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-100" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          {showFilters && (
            <Card className="mb-4 md:mb-6 border-slate-200 shadow-md">
              <CardContent className="p-4 md:pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1 block">Busca Geral</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input placeholder="Descrição, doc, fornecedor..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1 block">Fornecedor</Label>
                    <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1 block">Status</Label>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1 block">Vencimento Início</Label>
                    <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1 block">Vencimento Fim</Label>
                    <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!showFilters && (
            <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 mb-3 md:mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
                <Input placeholder="Buscar por descrição, documento ou fornecedor..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9 md:pl-10 border-slate-200" />
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Descrição</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden md:table-cell">Nº Doc</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden md:table-cell">Fornecedor</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden lg:table-cell">Categoria</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden xl:table-cell">Competência</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Vencimento</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm text-right">Valor</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm text-right hidden sm:table-cell">Pago</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm text-center">Status</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto" />
                    </TableCell></TableRow>
                  ) : contasFiltradas.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-gray-500">Nenhuma conta encontrada.</TableCell></TableRow>
                  ) : (
                    contasFiltradas.map((conta) => (
                      <TableRow key={conta.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900 text-xs md:text-sm max-w-[140px] truncate">{conta.descricao}</TableCell>
                        <TableCell className="text-slate-600 text-xs font-mono hidden md:table-cell">{conta.numero_documento || '-'}</TableCell>
                        <TableCell className="text-slate-600 text-xs md:text-sm hidden md:table-cell">{getFornecedorNome(conta.fornecedor_id)}</TableCell>
                        <TableCell className="text-slate-600 text-xs hidden lg:table-cell">{getPlanoContasNome(conta.plano_contas_id)}</TableCell>
                        <TableCell className="text-slate-600 text-xs hidden xl:table-cell">{conta.competencia ? formatCompetencia(conta.competencia) : '-'}</TableCell>
                        <TableCell className={`text-xs md:text-sm ${conta.status === 'vencido' ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                          {formatDate(conta.data_vencimento)}
                        </TableCell>
                        <TableCell className="text-right text-slate-900 font-semibold text-xs md:text-sm">{formatCurrency(conta.valor_original)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium text-xs md:text-sm hidden sm:table-cell">{formatCurrency(conta.valor_pago || 0)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`${statusColors[conta.status]} border font-normal text-[10px] md:text-xs`}>
                            {statusLabels[conta.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {(conta.status === 'pendente' || conta.status === 'vencido') && (
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => handleMarcarPago(conta)}
                                className="h-7 w-7 p-0 hover:bg-green-50 text-green-600"
                                title="Marcar como Pago"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleEdit(conta)}
                              className="h-7 w-7 p-0 hover:bg-amber-50 text-amber-600"
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleDelete(conta)}
                              className="h-7 w-7 p-0 hover:bg-red-50 text-red-600"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
                  <tr>
                    <td colSpan={6} className="p-3 md:p-4 text-right text-xs md:text-sm">Totais</td>
                    <td className="p-3 md:p-4 text-right text-xs md:text-sm">{formatCurrency(contasFiltradas.reduce((acc, c) => acc + (c.valor_original || 0), 0))}</td>
                    <td className="p-3 md:p-4 text-right text-xs md:text-sm text-green-700 hidden sm:table-cell">{formatCurrency(contasFiltradas.reduce((acc, c) => acc + (c.valor_pago || 0), 0))}</td>
                    <td className="p-3 md:p-4" colSpan={2}></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 px-1">
            {contasFiltradas.length} registro(s) encontrado(s)
          </div>
        </div>
      </div>

      {isFormOpen && (
        <ContasPagarForm
          conta={selectedConta}
          fornecedores={fornecedores}
          planoContas={planosContas}
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setSelectedConta(null); }}
        />
      )}

      {isFiltersModalOpen && (
        <RelatorioContasPagarFiltersModal
          isOpen={isFiltersModalOpen}
          onClose={() => setIsFiltersModalOpen(false)}
          fornecedores={fornecedores}
        />
      )}

      {DialogComponent}
    </>
  );
}