import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Eye,
  Trash2,
  Search,
  Filter,
  FileText,
  Upload,
  Loader2,
  DollarSign,
  CheckCircle,
  Clock,
  Printer,
  Files,
  XCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import NotaFiscalForm from '@/components/notasfiscais/NotaFiscalForm';
import NotaFiscalViewer from '@/components/notasfiscais/NotaFiscalViewer';
import ImportarXMLModal from '@/components/notasfiscais/ImportarXMLModal';
import ImportarXMLLoteModal from '@/components/notasfiscais/ImportarXMLLoteModal';
import RelatorioNotasFiscaisFiltersModal from '@/components/notasfiscais/RelatorioNotasFiscaisFiltersModal';


import ConfirmDialog from '@/components/ConfirmDialog';

export default function NotasFiscaisPage() {
  const [notas, setNotas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportLoteModalOpen, setIsImportLoteModalOpen] = useState(false);
  const [isRelatorioModalOpen, setIsRelatorioModalOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState(null);
  const [viewingNota, setViewingNota] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickSearchNumber, setQuickSearchNumber] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [notaToDelete, setNotaToDelete] = useState(null);

  const { toast } = useToast();

  const statusColors = {
    'pendente': 'bg-yellow-100 text-yellow-800',
    'processada': 'bg-green-100 text-green-800',
    'cancelada': 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    'pendente': 'Pendente',
    'processada': 'Processada',
    'cancelada': 'Cancelada'
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [notasData, fornData] = await Promise.all([
        base44.entities.NotaFiscalEntrada.list('-created_date'),
        base44.entities.Fornecedor.list()
      ]);
      setNotas(notasData || []);
      setFornecedores(fornData || []);
    } catch (e) {
      setError('Falha ao carregar dados. ' + e.message);
      toast({
        title: 'Erro ao carregar dados',
        description: e.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getFornecedorNome = (id) => {
    const fornecedor = fornecedores.find(f => f.id === id);
    return fornecedor?.nome || '-';
  };

  const handleNew = () => {
    setSelectedNota(null);
    setIsFormOpen(true);
  };

  const handleView = (nota) => {
    setViewingNota(nota);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setViewingNota(null);
  };

  const handleNotaUpdated = useCallback(async () => {
    try {
      const notasData = await base44.entities.NotaFiscalEntrada.list('-created_date');
      setNotas(notasData || []);
    } catch (error) {
      console.error('Erro ao atualizar lista de notas:', error);
      toast({
        title: 'Erro ao atualizar nota',
        description: error.message,
        variant: 'destructive'
      });
    }
  }, [toast]);

  const handleDelete = (notaId) => {
    setNotaToDelete(notaId);
    setConfirmDeleteOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!notaToDelete) return;

    setIsDeleting(true);
    setConfirmDeleteOpen(false);

    const notaBeingDeleted = notas.find(n => n.id === notaToDelete);
    const numeroNota = notaBeingDeleted?.numero_nota || '';

    try {
      const itensRelacionados = await base44.entities.ItemNotaFiscal.filter({
        nota_fiscal_id: notaToDelete
      });

      for (const item of itensRelacionados) {
        await base44.entities.ItemNotaFiscal.delete(item.id);
      }

      await base44.entities.NotaFiscalEntrada.delete(notaToDelete);

      toast({
        title: '✅ Nota fiscal excluída!',
        description: `A nota ${numeroNota ? numeroNota + ' ' : ''}e seus itens foram removidos com sucesso.`
      });

      await fetchData();
    } catch (error) {
      toast({
        title: 'Erro ao excluir nota fiscal',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setNotaToDelete(null);
    }
  };

  const handleGenerateRelatorio = (filters) => {
    let filteredForReport = notas;

    if (filters.status && filters.status !== 'todos') {
      filteredForReport = filteredForReport.filter(n => n.status === filters.status);
    }

    if (filters.fornecedorId && filters.fornecedorId !== 'todos') {
      filteredForReport = filteredForReport.filter(n => String(n.fornecedor_id) === String(filters.fornecedorId));
    }

    if (filters.dataInicio) {
      filteredForReport = filteredForReport.filter(n => n.data_emissao >= filters.dataInicio);
    }

    if (filters.dataFim) {
      filteredForReport = filteredForReport.filter(n => n.data_emissao <= filters.dataFim);
    }

    const filtrosInfo = {
      status: filters.status,
      dataInicio: filters.dataInicio,
      dataFim: filters.dataFim,
      fornecedorNome: filters.fornecedorId && filters.fornecedorId !== 'todos' ? getFornecedorNome(filters.fornecedorId) : 'Todos',
      apenasProcessadas: filters.apenasProcessadas
    };

    const filtrosJSON = encodeURIComponent(JSON.stringify(filtrosInfo));
    const notasJSON = encodeURIComponent(JSON.stringify(filteredForReport));

    const url = `/RelatorioNotasFiscais?filtros=${filtrosJSON}&notas=${notasJSON}`;
    window.open(url, '_blank');
    setIsRelatorioModalOpen(false);
  };

  const filteredNotas = useMemo(() => {
    return notas.filter(nota => {
      if (quickSearchNumber) {
        return String(nota.numero_nota || '').toLowerCase().includes(quickSearchNumber.toLowerCase()) ||
               String(nota.chave_acesso || '').includes(quickSearchNumber);
      }

      const termoBuscaLower = searchTerm.toLowerCase();
      const passaBusca = !searchTerm ||
        nota.numero_nota?.toLowerCase().includes(termoBuscaLower) ||
        getFornecedorNome(nota.fornecedor_id)?.toLowerCase().includes(termoBuscaLower) ||
        nota.chave_acesso?.includes(searchTerm);

      const passaStatus = filtroStatus === 'todos' || nota.status === filtroStatus;
      const passaFornecedor = filtroFornecedor === 'todos' || String(nota.fornecedor_id) === String(filtroFornecedor);
      const passaData = (!dataInicio || nota.data_emissao >= dataInicio) && (!dataFim || nota.data_emissao <= dataFim);

      return passaBusca && passaStatus && passaFornecedor && passaData;
    });
  }, [notas, searchTerm, quickSearchNumber, filtroStatus, filtroFornecedor, dataInicio, dataFim, fornecedores]);

  const resumo = {
    total: notas.length,
    pendentes: notas.filter(n => n.status === 'pendente').length,
    processadas: notas.filter(n => n.status === 'processada').length,
    canceladas: notas.filter(n => n.status === 'cancelada').length,
    valorTotal: notas.reduce((sum, n) => sum + (n.valor_total || 0), 0)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-slate-800 mx-auto" />
          <p className="mt-4 text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      
      {isDeleting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-slate-600" />
            <p className="text-lg font-semibold text-slate-900">Excluindo nota fiscal...</p>
            <p className="text-sm text-slate-600">Aguarde enquanto removemos os dados.</p>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-slate-50">
        {/* Cabeçalho */}
        <div className="bg-slate-800 text-white px-6 py-8 mb-6 shadow-xl">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Notas Fiscais de Entrada</h1>
                  <p className="text-slate-300">Gestão de NF-e e cadastro automático de produtos</p>
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
                  onClick={() => setIsRelatorioModalOpen(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Relatório
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Importar XML
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsImportLoteModalOpen(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Files className="w-4 h-4" />
                  Importar em Lote
                </Button>

                <Button
                  variant="outline"
                  onClick={handleNew}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nova Nota
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-6">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 uppercase font-medium mb-1">Total</p>
                    <p className="text-2xl font-bold text-slate-800">{resumo.total}</p>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-slate-800" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 uppercase font-medium mb-1">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-600">{resumo.pendentes}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 uppercase font-medium mb-1">Processadas</p>
                    <p className="text-2xl font-bold text-green-600">{resumo.processadas}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 uppercase font-medium mb-1">Canceladas</p>
                    <p className="text-2xl font-bold text-red-600">{resumo.canceladas}</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 uppercase font-medium mb-1">Valor Total</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(resumo.valorTotal)}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Busca */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="🔍 Busca rápida por número ou chave..."
                value={quickSearchNumber}
                onChange={(e) => setQuickSearchNumber(e.target.value)}
                className="pl-10 bg-white border-2 border-blue-300 focus:border-blue-500"
              />
              {quickSearchNumber && (
                <button
                  onClick={() => setQuickSearchNumber('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar por fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </div>

          {/* Painel de Filtros */}
          {showFilters && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="processada">Processada</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Fornecedor</Label>
                    <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {fornecedores.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Data Início</Label>
                    <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Data Fim</Label>
                    <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFiltroStatus('todos');
                      setFiltroFornecedor('todos');
                      setDataInicio('');
                      setDataFim('');
                      setSearchTerm('');
                      setQuickSearchNumber('');
                    }}
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
                  <TableRow className="bg-slate-800 hover:bg-slate-800">
                    <TableHead className="text-white font-semibold">Nº Nota</TableHead>
                    <TableHead className="text-white font-semibold">Data Emissão</TableHead>
                    <TableHead className="text-white font-semibold">Fornecedor</TableHead>
                    <TableHead className="text-white font-semibold">Valor Total</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="6" className="text-center py-8 text-slate-500">
                        Nenhuma nota fiscal encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNotas.map(nota => (
                      <TableRow 
                        key={nota.id} 
                        className={`transition-colors ${
                          nota.status === 'cancelada' 
                            ? 'bg-red-50 hover:bg-red-100' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {nota.status === 'cancelada' && (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={nota.status === 'cancelada' ? 'text-red-700 line-through' : 'text-blue-600'}>
                              {nota.numero_nota} {nota.serie && `/ ${nota.serie}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={nota.status === 'cancelada' ? 'text-red-700' : 'text-slate-900'}>
                          {formatDate(nota.data_emissao)}
                        </TableCell>
                        <TableCell className={nota.status === 'cancelada' ? 'text-red-700' : 'text-slate-900'}>
                          {getFornecedorNome(nota.fornecedor_id)}
                        </TableCell>
                        <TableCell className={`font-semibold ${nota.status === 'cancelada' ? 'text-red-700 line-through' : 'text-slate-900'}`}>
                          {formatCurrency(nota.valor_total)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[nota.status]}>
                            {statusLabels[nota.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(nota)}
                              className="hover:bg-blue-50 text-blue-600"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(nota.id)}
                              disabled={isDeleting}
                              className="hover:bg-red-50 text-red-600"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
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

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setNotaToDelete(null);
        }}
        title="Confirmar Exclusão"
        description="Tem certeza que deseja excluir esta nota fiscal? A nota fiscal e todos os seus itens serão permanentemente excluídos. Esta ação não pode ser desfeita."
        onConfirm={confirmarExclusao}
        confirmText="Sim, excluir nota fiscal"
        loading={isDeleting}
      />

      {isFormOpen && (
        <NotaFiscalForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedNota(null);
          }}
          nota={selectedNota}
          fornecedores={fornecedores}
          onSaved={() => {
            setIsFormOpen(false);
            setSelectedNota(null);
            fetchData();
          }}
        />
      )}

      {isViewerOpen && viewingNota && (
        <NotaFiscalViewer
          isOpen={isViewerOpen}
          onClose={handleCloseViewer}
          nota={viewingNota}
          fornecedores={fornecedores}
          onUpdated={handleNotaUpdated}
        />
      )}

      {isImportModalOpen && (
        <ImportarXMLModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          fornecedores={fornecedores}
          onSuccess={() => {
            setIsImportModalOpen(false);
            fetchData();
          }}
        />
      )}

      {isImportLoteModalOpen && (
        <ImportarXMLLoteModal
          isOpen={isImportLoteModalOpen}
          onClose={() => setIsImportLoteModalOpen(false)}
          onSuccess={() => {
            setIsImportLoteModalOpen(false);
            fetchData();
          }}
        />
      )}

      {isRelatorioModalOpen && (
        <RelatorioNotasFiscaisFiltersModal
          isOpen={isRelatorioModalOpen}
          onClose={() => setIsRelatorioModalOpen(false)}
          onGenerate={handleGenerateRelatorio}
          fornecedores={fornecedores}
        />
      )}
    </>
  );
}