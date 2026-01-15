import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Truck, Filter, Search, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import FornecedorForm from '@/components/FornecedorForm';

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [busca, setBusca] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const categoriaColors = {
    'pecas': 'bg-blue-100 text-blue-800 border-blue-200',
    'ferramentas': 'bg-orange-100 text-orange-800 border-orange-200',
    'servicos': 'bg-green-100 text-green-800 border-green-200',
    'materiais': 'bg-purple-100 text-purple-800 border-purple-200',
    'outros': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const statusColors = {
    'ativo': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'inativo': 'bg-rose-100 text-rose-800 border-rose-200'
  };

  const fetchFornecedores = async () => {
    setIsLoading(true);
    const data = await base44.entities.Fornecedor.list('-created_date');
    setFornecedores(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const handleSave = async (data) => {
    if (selectedFornecedor) {
      await base44.entities.Fornecedor.update(selectedFornecedor.id, data);
    } else {
      await base44.entities.Fornecedor.create(data);
    }
    await fetchFornecedores();
    setIsFormOpen(false);
    setSelectedFornecedor(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este fornecedor?')) {
      await base44.entities.Fornecedor.delete(id);
      await fetchFornecedores();
    }
  };

  const openForm = (fornecedor = null) => {
    setSelectedFornecedor(fornecedor);
    setIsFormOpen(true);
  };

  const fornecedoresFiltrados = fornecedores.filter(fornecedor => {
    const passaCategoria = filtroCategoria === 'todos' || fornecedor.categoria === filtroCategoria;
    const passaBusca = busca === '' ||
      fornecedor.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      fornecedor.cnpj?.includes(busca) ||
      fornecedor.contato?.includes(busca);
    return passaCategoria && passaBusca;
  });

  const stats = {
    total: fornecedores.length,
    ativos: fornecedores.filter(f => f.status === 'ativo').length,
    inativos: fornecedores.filter(f => f.status === 'inativo').length
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
                  <Truck className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Fornecedores</h1>
                  <p className="text-slate-300">Gestão de parceiros e fornecedores</p>
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
                  onClick={() => openForm()}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Novo Fornecedor
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Fornecedores</p>
                    <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                  </div>
                  <Truck className="w-8 h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Ativos</p>
                    <div className="text-2xl font-bold text-emerald-600">{stats.ativos}</div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Inativos</p>
                    <div className="text-2xl font-bold text-rose-600">{stats.inativos}</div>
                  </div>
                  <XCircle className="w-8 h-8 text-rose-100" />
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
                    <Label className="text-xs font-medium text-gray-600 mb-1">Busca Geral</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar por nome, CNPJ ou telefone..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Categoria</Label>
                    <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas as Categorias</SelectItem>
                        <SelectItem value="pecas">Peças</SelectItem>
                        <SelectItem value="ferramentas">Ferramentas</SelectItem>
                        <SelectItem value="servicos">Serviços</SelectItem>
                        <SelectItem value="materiais">Materiais</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Barra de Busca (se filtros ocultos) */}
          {!showFilters && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou telefone..."
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
                <TableHeader>
                  <TableRow className="bg-slate-700 hover:bg-slate-700">
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Nome</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden md:table-cell">CNPJ</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Contato</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden lg:table-cell">Email</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden sm:table-cell">Categoria</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center w-[80px] md:w-[120px] text-xs md:text-sm">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="7" className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                  ) : fornecedoresFiltrados.length === 0 ? (
                    <TableRow><TableCell colSpan="7" className="text-center py-8 text-gray-500">Nenhum fornecedor encontrado.</TableCell></TableRow>
                  ) : (
                    fornecedoresFiltrados.map((fornecedor) => (
                      <TableRow key={fornecedor.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900 text-xs md:text-sm max-w-[100px] md:max-w-none truncate">{fornecedor.nome}</TableCell>
                        <TableCell className="text-slate-600 text-xs md:text-sm hidden md:table-cell">{fornecedor.cnpj}</TableCell>
                        <TableCell className="text-slate-600 text-xs md:text-sm">{fornecedor.contato}</TableCell>
                        <TableCell className="text-slate-600 text-xs md:text-sm hidden lg:table-cell max-w-[150px] truncate">{fornecedor.email}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className={`${categoriaColors[fornecedor.categoria]} border font-normal text-[10px] md:text-xs`}>
                            {fornecedor.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className={`${statusColors[fornecedor.status]} border font-normal text-[10px] md:text-xs`}>
                            {fornecedor.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-0.5 md:gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openForm(fornecedor)}
                              className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-amber-50 text-amber-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(fornecedor.id)}
                              className="h-7 w-7 md:h-8 md:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 hidden sm:flex"
                            >
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
        <FornecedorForm
          fornecedor={selectedFornecedor}
          onSave={handleSave}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedFornecedor(null);
          }}
        />
      )}
    </>
  );
}