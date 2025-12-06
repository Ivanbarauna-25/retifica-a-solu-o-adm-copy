import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, FileBarChart2, TrendingUp, DollarSign, List, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import PlanoContasForm from '@/components/PlanoContasForm';

export default function PlanoContasPage() {
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busca, setBusca] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const tipoColors = {
    'receita': 'bg-green-100 text-green-800 border-green-200',
    'despesa': 'bg-red-100 text-red-800 border-red-200',
    'ativo': 'bg-blue-100 text-blue-800 border-blue-200',
    'passivo': 'bg-orange-100 text-orange-800 border-orange-200'
  };

  const tipoLabels = {
    'receita': 'Receita',
    'despesa': 'Despesa',
    'ativo': 'Ativo',
    'passivo': 'Passivo'
  };

  const fetchContas = async () => {
    setIsLoading(true);
    const [contasData, categoriasData] = await Promise.all([
      base44.entities.PlanoContas.list('-created_date'),
      base44.entities.Categoria.list()
    ]);
    setContas(contasData);
    setCategorias(categoriasData || []);
    setIsLoading(false);
  };

  const criarContasPadraoSeNecessario = async () => {
    try {
      const contasExistentes = await base44.entities.PlanoContas.list();
      
      const contaPessoal = contasExistentes.find(c => c.codigo === '3.01.001');
      const contaAdiantamentos = contasExistentes.find(c => c.codigo === '3.01.002');
      
      if (!contaPessoal) {
        await base44.entities.PlanoContas.create({
          codigo: '3.01.001',
          nome: 'Despesas com Pessoal - Salários',
          tipo: 'despesa',
          ativa: true
        });
      }
      
      if (!contaAdiantamentos) {
        await base44.entities.PlanoContas.create({
          codigo: '3.01.002',
          nome: 'Despesas com Pessoal - Adiantamentos',
          tipo: 'despesa',
          ativa: true
        });
      }
    } catch (error) {
      console.error('Erro ao criar contas padrão:', error);
    }
  };

  useEffect(() => {
    fetchContas();
    criarContasPadraoSeNecessario();
  }, []);

  const handleSave = async (data) => {
    if (selectedConta) {
      await base44.entities.PlanoContas.update(selectedConta.id, data);
    } else {
      await base44.entities.PlanoContas.create(data);
    }
    await fetchContas();
    setIsFormOpen(false);
    setSelectedConta(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
      await base44.entities.PlanoContas.delete(id);
      await fetchContas();
    }
  };

  const openForm = (conta = null) => {
    setSelectedConta(conta);
    setIsFormOpen(true);
  };

  const getNomeCategoria = (categoria_id) => {
    if (!categoria_id) return '-';
    const categoria = categorias.find(c => c.id === categoria_id);
    return categoria ? categoria.nome : '-';
  };

  const contasFiltradas = contas.filter(conta => {
    const passaTipo = filtroTipo === 'todos' || conta.tipo === filtroTipo;
    const nomeCategoria = getNomeCategoria(conta.categoria_id);
    const passaBusca = busca === '' || 
      conta.codigo?.toLowerCase().includes(busca.toLowerCase()) ||
      conta.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      nomeCategoria?.toLowerCase().includes(busca.toLowerCase());
    return passaTipo && passaBusca && conta.ativa;
  });

  const contasPorTipo = {
    receita: contas.filter(c => c.tipo === 'receita' && c.ativa).length,
    despesa: contas.filter(c => c.tipo === 'despesa' && c.ativa).length,
    ativo: contas.filter(c => c.tipo === 'ativo' && c.ativa).length,
    passivo: contas.filter(c => c.tipo === 'passivo' && c.ativa).length
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
                  <List className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Plano de Contas</h1>
                  <p className="text-slate-300">Estrutura de contas financeiras</p>
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
                  Nova Conta
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Receita</p>
                    <div className="text-2xl font-bold text-green-600">{contasPorTipo.receita}</div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Despesa</p>
                    <div className="text-2xl font-bold text-red-600">{contasPorTipo.despesa}</div>
                  </div>
                  <DollarSign className="w-8 h-8 text-red-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Ativo</p>
                    <div className="text-2xl font-bold text-blue-600">{contasPorTipo.ativo}</div>
                  </div>
                  <FileBarChart2 className="w-8 h-8 text-blue-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Passivo</p>
                    <div className="text-2xl font-bold text-orange-600">{contasPorTipo.passivo}</div>
                  </div>
                  <FileBarChart2 className="w-8 h-8 text-orange-100" />
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
                        placeholder="Buscar por código, nome ou categoria..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1">Tipo</Label>
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os Tipos</SelectItem>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="passivo">Passivo</SelectItem>
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
                  placeholder="Buscar por código, nome ou categoria..."
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
                    <TableHead className="text-white font-semibold">Código</TableHead>
                    <TableHead className="text-white font-semibold">Nome da Conta</TableHead>
                    <TableHead className="text-white font-semibold">Tipo</TableHead>
                    <TableHead className="text-white font-semibold">Categoria</TableHead>
                    <TableHead className="text-white font-semibold w-[120px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="5" className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                  ) : contasFiltradas.length === 0 ? (
                    <TableRow><TableCell colSpan="5" className="text-center py-8 text-gray-500">Nenhuma conta encontrada.</TableCell></TableRow>
                  ) : (
                    contasFiltradas.map((conta) => (
                      <TableRow key={conta.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900">{conta.codigo}</TableCell>
                        <TableCell className="text-slate-900">{conta.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${tipoColors[conta.tipo]} font-normal border`}>
                            {tipoLabels[conta.tipo]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">{getNomeCategoria(conta.categoria_id)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openForm(conta)} className="h-8 w-8 p-0 hover:bg-amber-50 text-amber-600">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(conta.id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
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
        <PlanoContasForm
          conta={selectedConta}
          onSave={handleSave}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedConta(null);
          }}
        />
      )}
    </>
  );
}