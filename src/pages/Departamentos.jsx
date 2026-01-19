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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            <Card className="w-full max-w-lg">
                <CardHeader className="bg-slate-800 text-white">
                    <CardTitle className="text-sm md:text-lg flex items-center gap-2">
                        <Building2 className="w-4 h-4 md:w-5 md:h-5" />
                        {departamento ? 'Editar Departamento' : 'Novo Departamento'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                        <div>
                            <label htmlFor="nome" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Nome</label>
                            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required className="h-9 md:h-10" />
                        </div>
                        <div>
                            <label htmlFor="descricao" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows="3" className="w-full p-2 border rounded-md text-sm" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={onClose} className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4">Cancelar</Button>
                            <Button type="submit" className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4">Salvar</Button>
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
        <div className="bg-slate-800 text-white px-3 md:px-6 py-4 md:py-6 mb-3 md:mb-6 shadow-lg sticky top-0 z-10">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 md:p-3 rounded-lg">
                  <Building2 className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl lg:text-3xl font-bold">Departamentos</h1>
                  <p className="text-slate-300 text-xs md:text-sm">Estrutura organizacional</p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => openForm()}
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 h-8 md:h-9 text-xs md:text-sm px-3 md:px-4"
              >
                <Plus className="w-4 h-4" />
                Novo Departamento
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-2 md:px-6">
          {/* Stats Cards */}
          <div className="mb-3 md:mb-6">
            <Card className="border-l-4 border-l-slate-600 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-1">Total Departamentos</p>
                    <div className="text-xl md:text-3xl font-bold text-slate-900">{stats.total}</div>
                  </div>
                  <Building2 className="w-6 h-6 md:w-8 md:h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-2 md:p-4 mb-3 md:mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
              <Input 
                placeholder="Buscar por nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 md:pl-10 border-slate-200 h-9 md:h-10"
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
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openForm(item)} title="Editar" className="h-8 w-8 md:h-9 md:w-9 hover:bg-amber-50 text-amber-600">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Excluir" className="h-8 w-8 md:h-9 md:w-9 text-red-600 hover:text-red-700 hover:bg-red-50 hidden md:flex">
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