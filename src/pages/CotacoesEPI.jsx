import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Plus, Eye, Search, Filter, FileText, ShoppingCart, CheckCircle, XCircle, Clock, Printer
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import ProtectedPage from '@/components/ProtectedPage';
import { usePermissions } from '@/components/ProtectedPage';
import StandardDialog, { useStandardDialog } from '@/components/ui/StandardDialog';
import CotacaoEPIForm from '@/components/epi/CotacaoEPIForm';
import CotacaoEPIViewer from '@/components/epi/CotacaoEPIViewer';
import { formatCurrency, formatDate } from '@/components/formatters';
import { createPageUrl } from '@/utils';

const statusLabels = {
  rascunho: 'Rascunho',
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada'
};

const statusColors = {
  rascunho: 'bg-gray-100 text-gray-800 border-gray-200',
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  aprovada: 'bg-green-100 text-green-800 border-green-200',
  rejeitada: 'bg-red-100 text-red-800 border-red-200'
};

export default function CotacoesEPIPage() {
  const [cotacoes, setCotacoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [epis, setEpis] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [cotacaoSelecionada, setCotacaoSelecionada] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);

  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { dialogState, showDanger, closeDialog, DialogComponent } = useStandardDialog();

  const canCreateCotacao = canCreate('configuracoes');
  const canEditCotacao = canEdit('configuracoes');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cotacoesData, fornecedoresData, episData, funcionariosData, cargosData] = await Promise.all([
        base44.entities.CotacaoEPI.list('-created_date'),
        base44.entities.Fornecedor.list(),
        base44.entities.EPI.filter({ status: 'ativo' }),
        base44.entities.Funcionario.filter({ status: 'ativo' }),
        base44.entities.Cargo.list()
      ]);
      setCotacoes(cotacoesData || []);
      setFornecedores(fornecedoresData || []);
      setEpis(episData || []);
      setFuncionarios(funcionariosData || []);
      setCargos(cargosData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    toast({ title: 'Cotação salva com sucesso!' });
    setShowModal(false);
    setCotacaoSelecionada(null);
    fetchData();
  };

  const handleNova = () => {
    setCotacaoSelecionada(null);
    setShowModal(true);
  };

  const handleEdit = (cotacao) => {
    setCotacaoSelecionada(cotacao);
    setShowModal(true);
  };

  const handleView = (cotacao) => {
    setCotacaoSelecionada(cotacao);
    setShowViewer(true);
  };

  const handlePrint = (cotacao) => {
    const url = `${createPageUrl('RelatorioCotacaoEPI')}?cotacao_id=${cotacao.id}`;
    window.open(url, '_blank');
  };

  const handleAprovar = async (cotacao) => {
    try {
      const user = await base44.auth.me();
      await base44.entities.CotacaoEPI.update(cotacao.id, {
        status: 'aprovada',
        data_aprovacao: new Date().toISOString().split('T')[0],
        aprovado_por: user?.full_name || user?.email
      });
      toast({ title: 'Cotação aprovada!' });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro ao aprovar cotação', variant: 'destructive' });
    }
  };

  const handleRejeitar = async (cotacao, motivo) => {
    try {
      const user = await base44.auth.me();
      await base44.entities.CotacaoEPI.update(cotacao.id, {
        status: 'rejeitada',
        data_aprovacao: new Date().toISOString().split('T')[0],
        aprovado_por: user?.full_name || user?.email,
        motivo_rejeicao: motivo
      });
      toast({ title: 'Cotação rejeitada!' });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro ao rejeitar cotação', variant: 'destructive' });
    }
  };

  const getFornecedorNome = (id) => {
    if (!id) return '-';
    const fornecedor = fornecedores.find(f => f.id === id);
    return fornecedor?.nome || '-';
  };

  const cotacoesFiltradas = useMemo(() => {
    return cotacoes.filter((cot) => {
      const matchSearch = !searchTerm ||
        cot.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getFornecedorNome(cot.fornecedor_id).toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = filterStatus === 'todos' || cot.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [cotacoes, searchTerm, filterStatus, fornecedores]);

  return (
    <ProtectedPage pageName="CotacoesEPI">
      <Toaster />
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-8 mb-6 shadow-xl">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Cotações de EPI</h1>
                  <p className="text-slate-300">Gestão de cotações para compra de EPIs</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros
                </Button>
                {canCreateCotacao && (
                  <Button
                    onClick={handleNova}
                    variant="outline"
                    className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Cotação
                  </Button>
                )}
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
                    <p className="text-sm font-medium text-slate-600 mb-1">Total</p>
                    <div className="text-2xl font-bold text-slate-900">{cotacoes.length}</div>
                  </div>
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Pendentes</p>
                    <div className="text-2xl font-bold text-yellow-600">
                      {cotacoes.filter(c => c.status === 'pendente').length}
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Aprovadas</p>
                    <div className="text-2xl font-bold text-green-600">
                      {cotacoes.filter(c => c.status === 'aprovada').length}
                    </div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Rejeitadas</p>
                    <div className="text-2xl font-bold text-red-600">
                      {cotacoes.filter(c => c.status === 'rejeitada').length}
                    </div>
                  </div>
                  <XCircle className="w-8 h-8 text-red-100" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          {showFilters && (
            <Card className="mb-6 border-slate-200 shadow-md">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1">Busca</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Número, Fornecedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1">Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  type="text"
                  placeholder="Buscar por número ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-200"
                />
              </div>
            </div>
          )}

          {/* Tabela */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white font-semibold">Número</TableHead>
                    <TableHead className="text-white font-semibold">Data</TableHead>
                    <TableHead className="text-white font-semibold">Fornecedor</TableHead>
                    <TableHead className="text-white font-semibold text-center">Itens</TableHead>
                    <TableHead className="text-white font-semibold text-right">Valor Total</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-right text-white font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500 bg-white">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : cotacoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500 bg-white">
                        Nenhuma cotação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    cotacoesFiltradas.map((cotacao) => (
                      <TableRow key={cotacao.id} className="hover:bg-slate-50 bg-white">
                        <TableCell className="font-medium text-black bg-white">
                          {cotacao.numero || `COT-${cotacao.id.substring(0, 6).toUpperCase()}`}
                        </TableCell>
                        <TableCell className="text-black bg-white">{formatDate(cotacao.data_cotacao)}</TableCell>
                        <TableCell className="text-black bg-white">{getFornecedorNome(cotacao.fornecedor_id)}</TableCell>
                        <TableCell className="text-center text-black bg-white">{cotacao.itens?.length || 0}</TableCell>
                        <TableCell className="text-right text-black bg-white font-semibold">
                          {cotacao.valor_total ? formatCurrency(cotacao.valor_total) : '-'}
                        </TableCell>
                        <TableCell className="text-black bg-white">
                          <Badge className={statusColors[cotacao.status] || statusColors.rascunho}>
                            {statusLabels[cotacao.status] || 'Rascunho'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-black bg-white">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleView(cotacao)} title="Visualizar">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handlePrint(cotacao)} title="Imprimir">
                              <Printer className="w-4 h-4" />
                            </Button>
                            {canEditCotacao && cotacao.status === 'pendente' && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleAprovar(cotacao)} title="Aprovar" className="text-green-600 hover:text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => {
                                  const motivo = prompt('Motivo da rejeição:');
                                  if (motivo) handleRejeitar(cotacao, motivo);
                                }} title="Rejeitar" className="text-red-600 hover:text-red-700">
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
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

      {/* Modal de Formulário */}
      <CotacaoEPIForm
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setCotacaoSelecionada(null);
        }}
        cotacao={cotacaoSelecionada}
        fornecedores={fornecedores}
        epis={epis}
        funcionarios={funcionarios}
        cargos={cargos}
        onSave={handleSave}
      />

      {/* Modal de Visualização */}
      {showViewer && cotacaoSelecionada && (
        <CotacaoEPIViewer
          isOpen={showViewer}
          onClose={() => {
            setShowViewer(false);
            setCotacaoSelecionada(null);
          }}
          cotacao={cotacaoSelecionada}
          fornecedores={fornecedores}
          onEdit={canEditCotacao && cotacaoSelecionada.status !== 'aprovada' ? () => {
            setShowViewer(false);
            handleEdit(cotacaoSelecionada);
          } : undefined}
          onPrint={() => handlePrint(cotacaoSelecionada)}
          onAprovar={canEditCotacao && cotacaoSelecionada.status === 'pendente' ? () => {
            handleAprovar(cotacaoSelecionada);
            setShowViewer(false);
          } : undefined}
          onRejeitar={canEditCotacao && cotacaoSelecionada.status === 'pendente' ? (motivo) => {
            handleRejeitar(cotacaoSelecionada, motivo);
            setShowViewer(false);
          } : undefined}
        />
      )}

      <DialogComponent />
    </ProtectedPage>
  );
}