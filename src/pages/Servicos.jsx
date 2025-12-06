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
        <div className="bg-slate-800 text-white px-6 py-8 mb-6 shadow-xl no-print">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <Wrench className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Serviços</h1>
                  <p className="text-slate-300">Catálogo de serviços oferecidos</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openForm()}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Novo Serviço
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 no-print">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Serviços</p>
                    <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                  </div>
                  <Wrench className="w-8 h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Média de Preço</p>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.mediaPreco)}</div>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-100" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 no-print">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nome ou descrição..."
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
                    <TableHead className="text-white font-semibold">Nome do Serviço</TableHead>
                    <TableHead className="text-white font-semibold">Descrição</TableHead>
                    <TableHead className="text-white font-semibold">Valor Padrão</TableHead>
                    <TableHead className="text-white font-semibold text-center w-[120px] no-print">Ações</TableHead>
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
                        <TableCell className="font-medium text-slate-900">{servico.nome}</TableCell>
                        <TableCell className="text-slate-600">{servico.descricao}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(servico.valor_padrao)}
                        </TableCell>
                        <TableCell className="text-center no-print">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openForm(servico)} className="h-8 w-8 p-0 hover:bg-amber-50 text-amber-600">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(servico.id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
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