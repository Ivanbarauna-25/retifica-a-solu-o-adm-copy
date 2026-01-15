import React, { useState, useEffect } from 'react';
import { Departamento } from '@/entities/Departamento';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Building2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Formulário embutido para simplicidade
const DepartamentoForm = ({ departamento, onSave, onClose }) => {
    const [nome, setNome] = useState(departamento?.nome || '');
    const [descricao, setDescricao] = useState(departamento?.descricao || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ nome, descricao });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>{departamento ? 'Editar Departamento' : 'Novo Departamento'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome</label>
                            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                        </div>
                        <div>
                            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição</label>
                            <textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows="3" className="w-full p-2 border rounded-md" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button type="submit">Salvar</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};


export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busca, setBusca] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    const data = await Departamento.list('-created_date');
    setDepartamentos(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data) => {
    if (selected) {
      await Departamento.update(selected.id, data);
    } else {
      await Departamento.create(data);
    }
    await fetchData();
    setIsFormOpen(false);
    setSelected(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este departamento?')) {
      await Departamento.delete(id);
      await fetchData();
    }
  };

  const openForm = (item = null) => {
    setSelected(item);
    setIsFormOpen(true);
  };

  const filtrados = departamentos.filter(d => 
    d.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const stats = {
    total: departamentos.length
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
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Departamentos</h1>
                  <p className="text-slate-300">Estrutura organizacional da empresa</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => openForm()}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Novo Departamento
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-6">
           {/* Stats Cards */}
           <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total de Departamentos</p>
                    <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                  </div>
                  <Building2 className="w-8 h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input 
                    placeholder="Buscar por nome..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10 border-slate-200"
                />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Nome</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden md:table-cell">Descrição</TableHead>
                    <TableHead className="text-white font-semibold text-center w-[80px] md:w-[120px] text-xs md:text-sm">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="3" className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                  ) : filtrados.length === 0 ? (
                    <TableRow><TableCell colSpan="3" className="text-center py-8 text-gray-500">Nenhum departamento encontrado.</TableCell></TableRow>
                  ) : (
                    filtrados.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900 text-xs md:text-sm max-w-[150px] md:max-w-none truncate">{item.nome}</TableCell>
                        <TableCell className="text-slate-600 text-xs md:text-sm hidden md:table-cell max-w-[250px] truncate">{item.descricao}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-0.5 md:gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openForm(item)} className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-amber-50 text-amber-600">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-7 w-7 md:h-8 md:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 hidden sm:flex">
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
        <DepartamentoForm
          departamento={selected}
          onSave={handleSave}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </>
  );
}