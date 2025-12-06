import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Filter, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, formatCompetencia } from '@/components/formatters';
import RelatorioContasReceberFiltersModal from '@/components/relatorios/RelatorioContasReceberFiltersModal';

export default function ContasReceberPage() {
  const [contas, setContas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [planosContas, setPlanosContas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const statusColors = {
    'pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'recebido': 'bg-green-100 text-green-800 border-green-200',
    'vencido': 'bg-red-100 text-red-800 border-red-200',
    'cancelado': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const statusLabels = {
    'pendente': 'Pendente',
    'recebido': 'Recebido',
    'vencido': 'Vencido',
    'cancelado': 'Cancelado'
  };

  const fetchData = async () => {
    setIsLoading(true);
    const [contasData, clientesData, planosData] = await Promise.all([
      base44.entities.ContasReceber.list('-created_date'),
      base44.entities.Cliente.list(),
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
    setClientes(clientesData);
    setPlanosContas(planosData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getClienteNome = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nome : 'N/A';
  };

  const getPlanoContasNome = (planoId) => {
    const plano = planosContas.find(p => p.id === planoId);
    return plano ? `${plano.codigo} - ${plano.nome}` : 'N/A';
  };

  const contasFiltradas = contas.filter(conta => {
    const passaCliente = filtroCliente === 'todos' || conta.cliente_id === filtroCliente;
    const passaStatus = filtroStatus === 'todos' || conta.status === filtroStatus;
    const passaData = (!dataInicio || (conta.data_vencimento && conta.data_vencimento >= dataInicio)) && 
                      (!dataFim || (conta.data_vencimento && conta.data_vencimento <= dataFim));
    const passaBusca = busca === '' || 
      conta.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      conta.numero_documento?.toLowerCase().includes(busca.toLowerCase()) ||
      getClienteNome(conta.cliente_id)?.toLowerCase().includes(busca.toLowerCase());
    
    return passaCliente && passaStatus && passaData && passaBusca;
  });

  const stats = {
    totalAReceber: contas.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((acc, c) => acc + (c.valor_original || 0), 0),
    totalVencido: contas.filter(c => c.status === 'vencido').reduce((acc, c) => acc + (c.valor_original || 0), 0),
    totalRecebido: contas.filter(c => c.status === 'recebido').reduce((acc, c) => acc + (c.valor_recebido || 0), 0),
    totalGeral: contas.reduce((acc, c) => acc + (c.valor_original || 0), 0)
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
                  <DollarSign className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Contas a Receber</h1>
                  <p className="text-slate-300">Gestão de recebíveis e créditos</p>
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
                  onClick={() => setIsFiltersModalOpen(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Relatório
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Geral</p>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalGeral)}</div>
                  </div>
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">A Receber</p>
                    <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalAReceber)}</div>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Vencido</p>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalVencido)}</div>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Recebido</p>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRecebido)}</div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-100" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros Expandidos */}
          {showFilters && (
            <Card className="mb-6 border-slate-200 shadow-md">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Busca Geral</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Descrição, doc, cliente..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Cliente</Label>
                    <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {clientes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Status</Label>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                        <SelectItem value="recebido">Recebido</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Vencimento Início</Label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Vencimento Fim</Label>
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

          {/* Busca Simples */}
          {!showFilters && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Buscar por descrição, documento ou cliente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 border-slate-200"
                />
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white font-semibold">Descrição</TableHead>
                    <TableHead className="text-white font-semibold">Nº Doc</TableHead>
                    <TableHead className="text-white font-semibold">Cliente</TableHead>
                    <TableHead className="text-white font-semibold">Categoria</TableHead>
                    <TableHead className="text-white font-semibold">Competência</TableHead>
                    <TableHead className="text-white font-semibold">Vencimento</TableHead>
                    <TableHead className="text-white font-semibold text-right">Valor Original</TableHead>
                    <TableHead className="text-white font-semibold text-right">Valor Recebido</TableHead>
                    <TableHead className="text-white font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="9" className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                  ) : contasFiltradas.length === 0 ? (
                    <TableRow><TableCell colSpan="9" className="text-center py-8 text-gray-500">Nenhuma conta encontrada.</TableCell></TableRow>
                  ) : (
                    contasFiltradas.map((conta) => (
                      <TableRow key={conta.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900">{conta.descricao}</TableCell>
                        <TableCell className="text-slate-600 text-sm font-mono">{conta.numero_documento || '-'}</TableCell>
                        <TableCell className="text-slate-600">{getClienteNome(conta.cliente_id)}</TableCell>
                        <TableCell className="text-slate-600 text-sm">{getPlanoContasNome(conta.plano_contas_id)}</TableCell>
                        <TableCell className="text-slate-600">{conta.competencia ? formatCompetencia(conta.competencia) : '-'}</TableCell>
                        <TableCell className={conta.status === 'vencido' ? 'text-red-600 font-medium' : 'text-slate-600'}>
                          {formatDate(conta.data_vencimento)}
                        </TableCell>
                        <TableCell className="text-right text-slate-900 font-semibold">{formatCurrency(conta.valor_original)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">{formatCurrency(conta.valor_recebido || 0)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`${statusColors[conta.status]} border font-normal`}>
                            {statusLabels[conta.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
                  <tr>
                    <td colSpan="6" className="p-4 text-right">Totais</td>
                    <td className="p-4 text-right">{formatCurrency(contasFiltradas.reduce((acc, c) => acc + (c.valor_original || 0), 0))}</td>
                    <td className="p-4 text-right text-green-700">{formatCurrency(contasFiltradas.reduce((acc, c) => acc + (c.valor_recebido || 0), 0))}</td>
                    <td className="p-4"></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {isFiltersModalOpen && (
        <RelatorioContasReceberFiltersModal
          isOpen={isFiltersModalOpen}
          onClose={() => setIsFiltersModalOpen(false)}
          clientes={clientes}
        />
      )}
    </>
  );
}