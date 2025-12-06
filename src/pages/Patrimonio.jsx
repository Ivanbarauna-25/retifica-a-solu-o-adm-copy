import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Box, Search, Filter, DollarSign, CheckCircle, Archive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import PatrimonioForm from '@/components/PatrimonioForm';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function PatrimonioPage() {
  const [patrimonios, setPatrimonios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPatrimonio, setSelectedPatrimonio] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [buscaCodigo, setBuscaCodigo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const categoriaColors = {
    'equipamento': 'bg-blue-100 text-blue-800 border-blue-200',
    'ferramenta': 'bg-orange-100 text-orange-800 border-orange-200',
    'mobiliario': 'bg-green-100 text-green-800 border-green-200',
    'veiculo': 'bg-purple-100 text-purple-800 border-purple-200',
    'informatica': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'outros': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const statusColors = {
    'ativo': 'bg-green-100 text-green-800 border-green-200',
    'inativo': 'bg-gray-100 text-gray-800 border-gray-200',
    'manutencao': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'vendido': 'bg-red-100 text-red-800 border-red-200'
  };

  const fetchPatrimonios = async () => {
    setIsLoading(true);
    const data = await base44.entities.Patrimonio.list('-created_date');
    setPatrimonios(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPatrimonios();
  }, []);

  const handleSave = async (data) => {
    if (selectedPatrimonio) {
      await base44.entities.Patrimonio.update(selectedPatrimonio.id, data);
    } else {
      await base44.entities.Patrimonio.create(data);
    }
    await fetchPatrimonios();
    setIsFormOpen(false);
    setSelectedPatrimonio(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este item do patrimônio?')) {
      await base44.entities.Patrimonio.delete(id);
      await fetchPatrimonios();
    }
  };

  const openForm = (patrimonio = null) => {
    setSelectedPatrimonio(patrimonio);
    setIsFormOpen(true);
  };

  const patrimoniosFiltrados = patrimonios.filter(patrimonio => {
    const passaCategoria = filtroCategoria === 'todos' || patrimonio.categoria === filtroCategoria;
    const passaBusca = buscaCodigo === '' || patrimonio.codigo?.toLowerCase().includes(buscaCodigo.toLowerCase()) || patrimonio.descricao?.toLowerCase().includes(buscaCodigo.toLowerCase());
    return passaCategoria && passaBusca;
  });

  const stats = {
    totalItens: patrimonios.length,
    valorTotal: patrimonios.reduce((acc, p) => acc + (Number(p.valor_aquisicao) || 0), 0),
    ativos: patrimonios.filter(p => p.status === 'ativo').length
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
                  <Box className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Patrimônio</h1>
                  <p className="text-slate-300">Controle de bens e ativos</p>
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
                  Novo Item
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
                    <p className="text-sm font-medium text-slate-600 mb-1">Total de Itens</p>
                    <div className="text-2xl font-bold text-slate-900">{stats.totalItens}</div>
                  </div>
                  <Archive className="w-8 h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Valor Total</p>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.valorTotal)}</div>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Itens Ativos</p>
                    <div className="text-2xl font-bold text-blue-600">{stats.ativos}</div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-100" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros Expansíveis */}
          {showFilters && (
            <Card className="mb-6 border-slate-200 shadow-md">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Busca Geral</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar por código ou descrição..."
                        value={buscaCodigo}
                        onChange={(e) => setBuscaCodigo(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Categoria</Label>
                    <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as Categorias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas as Categorias</SelectItem>
                        <SelectItem value="equipamento">Equipamento</SelectItem>
                        <SelectItem value="ferramenta">Ferramenta</SelectItem>
                        <SelectItem value="mobiliario">Mobiliário</SelectItem>
                        <SelectItem value="veiculo">Veículo</SelectItem>
                        <SelectItem value="informatica">Informática</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
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
                  placeholder="Buscar por código ou descrição..."
                  value={buscaCodigo}
                  onChange={(e) => setBuscaCodigo(e.target.value)}
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
                    <TableHead className="text-white font-semibold">Código</TableHead>
                    <TableHead className="text-white font-semibold">Descrição</TableHead>
                    <TableHead className="text-white font-semibold">Categoria</TableHead>
                    <TableHead className="text-white font-semibold">Valor Aquisição</TableHead>
                    <TableHead className="text-white font-semibold">Data Aquisição</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="7" className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                  ) : patrimoniosFiltrados.length === 0 ? (
                    <TableRow><TableCell colSpan="7" className="text-center py-8 text-gray-500">Nenhum item encontrado.</TableCell></TableRow>
                  ) : (
                    patrimoniosFiltrados.map((patrimonio) => (
                      <TableRow key={patrimonio.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900">{patrimonio.codigo}</TableCell>
                        <TableCell className="text-slate-700">{patrimonio.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${categoriaColors[patrimonio.categoria]} font-normal border`}>
                            {patrimonio.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-700">{formatCurrency(patrimonio.valor_aquisicao)}</TableCell>
                        <TableCell className="text-slate-700">{formatDate(patrimonio.data_aquisicao)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${statusColors[patrimonio.status]} font-normal border`}>
                            {patrimonio.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openForm(patrimonio)} className="h-8 w-8 p-0 hover:bg-amber-50 text-amber-600">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(patrimonio.id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
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

      <PatrimonioForm
        isOpen={isFormOpen}
        patrimonio={selectedPatrimonio}
        onSave={handleSave}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedPatrimonio(null);
        }}
      />
    </>
  );
}