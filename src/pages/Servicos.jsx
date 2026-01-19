import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Wrench, Printer, Search, Filter, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ServicoForm from '@/components/ServicoForm';
import { formatCurrency } from '@/components/formatters';

export default function ServicosPage() {
  const [servicos, setServicos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedServico, setSelectedServico] = useState(null);
  const [busca, setBusca] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchServicos = async () => {
    setIsLoading(true);
    const data = await base44.entities.Servico.list('-created_date');
    setServicos(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchServicos();
  }, []);

  const handleSave = async (data) => {
    if (selectedServico) {
      await base44.entities.Servico.update(selectedServico.id, data);
    } else {
      await base44.entities.Servico.create(data);
    }
    await fetchServicos();
    setIsFormOpen(false);
    setSelectedServico(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
      await base44.entities.Servico.delete(id);
      await fetchServicos();
    }
  };

  const openForm = (servico = null) => {
    setSelectedServico(servico);
    setIsFormOpen(true);
  };

  const servicosFiltrados = servicos.filter(servico =>
    busca === '' ||
    servico.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    servico.descricao?.toLowerCase().includes(busca.toLowerCase())
  );

  const stats = {
    total: servicos.length,
    mediaPreco: servicos.length > 0 
      ? servicos.reduce((acc, s) => acc + (Number(s.valor_padrao) || 0), 0) / servicos.length 
      : 0
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .printable-content { width: 100%; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 printable-content">
        {/* Header */}
        <div className="bg-slate-800 text-white px-3 md:px-6 py-4 md:py-6 mb-3 md:mb-6 shadow-lg sticky top-0 z-10 no-print">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 md:p-3 rounded-lg">
                  <Wrench className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl lg:text-3xl font-bold">Serviços</h1>
                  <p className="text-slate-300 text-xs md:text-sm">Catálogo de serviços oferecidos</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 h-8 md:h-9 text-xs md:text-sm px-3 md:px-4"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openForm()}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 h-8 md:h-9 text-xs md:text-sm px-3 md:px-4"
                >
                  <Plus className="w-4 h-4" />
                  Novo Serviço
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-2 md:px-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 mb-3 md:mb-6 no-print">
            <Card className="border-l-4 border-l-slate-600 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-1">Total Serviços</p>
                    <div className="text-xl md:text-3xl font-bold text-slate-900">{stats.total}</div>
                  </div>
                  <Wrench className="w-6 h-6 md:w-8 md:h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-1">Média Preço</p>
                    <div className="text-xl md:text-3xl font-bold text-green-600">{formatCurrency(stats.mediaPreco)}</div>
                  </div>
                  <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-sm p-2 md:p-4 mb-3 md:mb-4 no-print">
            <div className="relative">
              <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
              <Input
                placeholder="Buscar por nome ou descrição..."
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
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Valor</TableHead>
                    <TableHead className="text-white font-semibold text-center w-[80px] md:w-[120px] no-print text-xs md:text-sm">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="4" className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                  ) : servicosFiltrados.length === 0 ? (
                    <TableRow><TableCell colSpan="4" className="text-center py-8 text-gray-500">Nenhum serviço encontrado.</TableCell></TableRow>
                  ) : (
                    servicosFiltrados.map((servico) => (
                      <TableRow key={servico.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900 text-xs md:text-sm max-w-[120px] md:max-w-none truncate">{servico.nome}</TableCell>
                        <TableCell className="text-slate-600 text-xs md:text-sm hidden md:table-cell max-w-[200px] truncate">{servico.descricao}</TableCell>
                        <TableCell className="font-semibold text-green-600 text-xs md:text-sm">
                          {formatCurrency(servico.valor_padrao)}
                        </TableCell>
                        <TableCell className="text-center no-print">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openForm(servico)} title="Editar" className="h-8 w-8 md:h-9 md:w-9 hover:bg-amber-50 text-amber-600">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(servico.id)} title="Excluir" className="h-8 w-8 md:h-9 md:w-9 text-red-600 hover:text-red-700 hover:bg-red-50 hidden md:flex">
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

      <ServicoForm
        isOpen={isFormOpen}
        servico={selectedServico}
        onSave={handleSave}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedServico(null);
        }}
      />
    </>
  );
}