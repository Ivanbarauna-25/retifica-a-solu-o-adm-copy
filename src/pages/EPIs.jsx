import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Plus, Edit, Trash2, Eye, MoreVertical, Search, Filter, HardHat, Shield, Package
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import ProtectedPage from '@/components/ProtectedPage';
import { usePermissions } from '@/components/ProtectedPage';
import StandardDialog, { useStandardDialog } from '@/components/ui/StandardDialog';
import EPIForm from '@/components/epi/EPIForm';
import EPIViewer from '@/components/epi/EPIViewer';
import { formatCurrency } from '@/components/formatters';

const categoriaLabels = {
  cabeca: 'Proteção da Cabeça',
  olhos_face: 'Proteção dos Olhos e Face',
  auditivo: 'Proteção Auditiva',
  respiratorio: 'Proteção Respiratória',
  tronco: 'Proteção do Tronco',
  membros_superiores: 'Proteção dos Membros Superiores',
  membros_inferiores: 'Proteção dos Membros Inferiores',
  corpo_inteiro: 'Proteção do Corpo Inteiro',
  quedas: 'Proteção Contra Quedas'
};

const statusColors = {
  ativo: 'bg-green-100 text-green-800 border-green-200',
  inativo: 'bg-red-100 text-red-800 border-red-200'
};

export default function EPIsPage() {
  const [epis, setEpis] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [epiSelecionado, setEpiSelecionado] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);

  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { dialogState, showDanger, closeDialog, DialogComponent } = useStandardDialog();

  const canCreateEPI = canCreate('configuracoes');
  const canEditEPI = canEdit('configuracoes');
  const canDeleteEPI = canDelete('configuracoes');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [episData, fornecedoresData] = await Promise.all([
        base44.entities.EPI.list('-created_date'),
        base44.entities.Fornecedor.list()
      ]);
      setEpis(episData || []);
      setFornecedores(fornecedoresData || []);
    } catch (error) {
      console.error('Erro ao carregar EPIs:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar a lista de EPIs.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    toast({ title: 'EPI salvo com sucesso!' });
    setShowModal(false);
    setEpiSelecionado(null);
    fetchData();
  };

  const handleDelete = (epi) => {
    showDanger(
      'Excluir EPI',
      `Tem certeza que deseja excluir "${epi.nome}"? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await base44.entities.EPI.delete(epi.id);
          toast({ title: '✅ EPI excluído com sucesso!' });
          fetchData();
          closeDialog();
        } catch (error) {
          console.error('Erro ao excluir EPI:', error);
          toast({
            title: '❌ Erro ao excluir',
            description: 'Não foi possível excluir o EPI.',
            variant: 'destructive'
          });
        }
      }
    );
  };

  const handleNovo = () => {
    setEpiSelecionado(null);
    setShowModal(true);
  };

  const handleEdit = (epi) => {
    setEpiSelecionado(epi);
    setShowModal(true);
  };

  const handleView = (epi) => {
    setEpiSelecionado(epi);
    setShowViewer(true);
  };

  const getFornecedorNome = (id) => {
    if (!id) return '-';
    const fornecedor = fornecedores.find(f => f.id === id);
    return fornecedor?.nome || '-';
  };

  const episFiltrados = useMemo(() => {
    return epis.filter((epi) => {
      const matchSearch = !searchTerm ||
        epi.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        epi.numero_ca?.includes(searchTerm) ||
        epi.descricao?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategoria = filterCategoria === 'todos' || epi.categoria === filterCategoria;
      const matchStatus = filterStatus === 'todos' || epi.status === filterStatus;

      return matchSearch && matchCategoria && matchStatus;
    });
  }, [epis, searchTerm, filterCategoria, filterStatus]);

  return (
    <ProtectedPage pageName="EPIs">
      <Toaster />
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-8 mb-6 shadow-xl">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <HardHat className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Equipamentos de Proteção Individual</h1>
                  <p className="text-slate-300">Cadastro e gerenciamento de EPIs</p>
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
                {canCreateEPI && (
                  <Button
                    onClick={handleNovo}
                    variant="outline"
                    className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2">
                    <Plus className="w-4 h-4" />
                    Novo EPI
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
                    <p className="text-sm font-medium text-slate-600 mb-1">Total EPIs</p>
                    <div className="text-2xl font-bold text-slate-900">{epis.length}</div>
                  </div>
                  <HardHat className="w-8 h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Ativos</p>
                    <div className="text-2xl font-bold text-green-600">
                      {epis.filter(e => e.status === 'ativo' || !e.status).length}
                    </div>
                  </div>
                  <Shield className="w-8 h-8 text-green-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Com CA</p>
                    <div className="text-2xl font-bold text-blue-600">
                      {epis.filter(e => e.numero_ca).length}
                    </div>
                  </div>
                  <Package className="w-8 h-8 text-blue-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Categorias</p>
                    <div className="text-2xl font-bold text-orange-600">
                      {new Set(epis.map(e => e.categoria).filter(Boolean)).size}
                    </div>
                  </div>
                  <HardHat className="w-8 h-8 text-orange-100" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros Expansíveis */}
          {showFilters && (
            <Card className="mb-6 border-slate-200 shadow-md">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1">Busca Geral</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Nome, CA, Descrição..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1">Categoria</label>
                    <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas</SelectItem>
                        {Object.entries(categoriaLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1">Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
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
                  placeholder="Buscar por nome, CA ou descrição..."
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
                    <TableHead className="text-white font-semibold">Nome</TableHead>
                    <TableHead className="text-white font-semibold">CA</TableHead>
                    <TableHead className="text-white font-semibold">Categoria</TableHead>
                    <TableHead className="text-white font-semibold">Unidade</TableHead>
                    <TableHead className="text-white font-semibold">Vida Útil</TableHead>
                    <TableHead className="text-white font-semibold text-right">Preço Ref.</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-right text-white font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500 bg-white">
                        Carregando EPIs...
                      </TableCell>
                    </TableRow>
                  ) : episFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500 bg-white">
                        Nenhum EPI encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    episFiltrados.map((epi) => (
                      <TableRow key={epi.id} className="hover:bg-slate-50 bg-white">
                        <TableCell className="font-medium text-black bg-white">{epi.nome}</TableCell>
                        <TableCell className="font-mono text-sm text-black bg-white">{epi.numero_ca || '-'}</TableCell>
                        <TableCell className="text-black bg-white">
                          {categoriaLabels[epi.categoria] || epi.categoria || '-'}
                        </TableCell>
                        <TableCell className="text-black bg-white">{epi.unidade || 'UN'}</TableCell>
                        <TableCell className="text-black bg-white">
                          {epi.vida_util_meses ? `${epi.vida_util_meses} meses` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-black bg-white font-semibold">
                          {epi.preco_referencia ? formatCurrency(epi.preco_referencia) : '-'}
                        </TableCell>
                        <TableCell className="text-black bg-white">
                          <Badge className={statusColors[epi.status] || statusColors.ativo}>
                            {epi.status === 'inativo' ? 'Inativo' : 'Ativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-black bg-white">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleView(epi)} title="Visualizar">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canEditEPI && (
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(epi)} title="Editar">
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {canDeleteEPI && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(epi)} title="Excluir" className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
      <EPIForm
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEpiSelecionado(null);
        }}
        epi={epiSelecionado}
        fornecedores={fornecedores}
        onSave={handleSave}
      />

      {/* Modal de Visualização */}
      {showViewer && epiSelecionado && (
        <EPIViewer
          isOpen={showViewer}
          onClose={() => {
            setShowViewer(false);
            setEpiSelecionado(null);
          }}
          epi={epiSelecionado}
          fornecedores={fornecedores}
          onEdit={canEditEPI ? () => {
            setShowViewer(false);
            handleEdit(epiSelecionado);
          } : undefined}
          onDelete={canDeleteEPI ? () => {
            setShowViewer(false);
            handleDelete(epiSelecionado);
          } : undefined}
        />
      )}

      <DialogComponent />
    </ProtectedPage>
  );
}