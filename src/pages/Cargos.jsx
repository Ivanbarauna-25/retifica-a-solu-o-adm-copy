import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Shield, Search, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Badge } from '@/components/ui/badge';
import CargoPermissoesForm from '@/components/CargoPermissoesForm';
import ProtectedPage from '@/components/ProtectedPage';

function CargosPage() {
  const [cargos, setCargos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busca, setBusca] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.Cargo.list('-created_date');
      setCargos(data || []);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os cargos',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data) => {
    try {
      if (selected) {
        await base44.entities.Cargo.update(selected.id, data);
        toast({
          title: 'Cargo atualizado!',
          description: 'As permissões foram atualizadas com sucesso'
        });
      } else {
        await base44.entities.Cargo.create(data);
        toast({
          title: 'Cargo criado!',
          description: 'Cargo e permissões definidas com sucesso'
        });
      }
      await fetchData();
      setIsFormOpen(false);
      setSelected(null);
    } catch (error) {
      console.error('Erro ao salvar cargo:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cargo?')) {
      try {
        await base44.entities.Cargo.delete(id);
        toast({
          title: 'Cargo excluído!',
          description: 'O cargo foi removido do sistema'
        });
        await fetchData();
      } catch (error) {
        console.error('Erro ao excluir:', error);
        toast({
          title: 'Erro ao excluir',
          description: error.message,
          variant: 'destructive'
        });
      }
    }
  };

  const openForm = (item = null) => {
    setSelected(item);
    setIsFormOpen(true);
  };

  const filtrados = cargos.filter(d => 
    d.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const stats = {
    total: cargos.length,
    comComissao: cargos.filter(c => c.tem_comissao).length
  };

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-slate-50">
        {/* Header - Responsivo */}
        <div className="bg-slate-800 text-white px-3 py-4 md:px-6 md:py-6 mb-4 md:mb-6 shadow-xl rounded-lg md:rounded-xl mx-1 md:mx-0">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 md:p-3 rounded-lg">
                  <Shield className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl lg:text-3xl font-bold">Cargos e Permissões</h1>
                  <p className="text-slate-400 text-xs md:text-sm">Definição de funções e acessos</p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => openForm()}
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 text-xs md:text-sm h-8 md:h-9 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Novo Cargo
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-2 md:px-6">
          {/* Stats Cards - Responsivo */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-3 md:p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-0.5 md:mb-1">Total de Cargos</p>
                    <div className="text-lg md:text-2xl font-bold text-slate-900">{stats.total}</div>
                  </div>
                  <Shield className="w-5 h-5 md:w-7 md:h-7 text-slate-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-3 md:p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-0.5 md:mb-1">Com Comissão</p>
                    <div className="text-lg md:text-2xl font-bold text-green-600">{stats.comComissao}</div>
                  </div>
                  <DollarSign className="w-5 h-5 md:w-7 md:h-7 text-green-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar - Responsivo */}
          <div className="bg-white rounded-lg shadow-sm p-2 md:p-4 mb-3 md:mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
              <Input
                placeholder="Buscar por nome do cargo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 md:pl-10 border-slate-200 text-sm h-9 md:h-10"
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
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden sm:table-cell">Nível</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden lg:table-cell">Módulos</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden xl:table-cell">Comissão</TableHead>
                    <TableHead className="text-white font-semibold text-center w-[80px] md:w-[120px] text-xs md:text-sm">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="6" className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                  ) : filtrados.length === 0 ? (
                    <TableRow><TableCell colSpan="6" className="text-center py-8 text-gray-500">Nenhum cargo encontrado.</TableCell></TableRow>
                  ) : (
                    filtrados.map((item) => {
                      const qtdModulos = item.permissoes_modulos_acoes?.length || 0;
                      
                      return (
                        <TableRow key={item.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-900 text-xs md:text-sm max-w-[120px] md:max-w-none truncate">{item.nome}</TableCell>
                          <TableCell className="text-slate-600 max-w-[200px] truncate text-xs md:text-sm hidden md:table-cell">{item.descricao || '-'}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="border-slate-300 text-slate-700 text-[10px] md:text-xs">Nível {item.nivel_hierarquico || 5}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 text-[10px] md:text-xs">
                              {qtdModulos} módulos
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {item.tem_comissao ? (
                              <div className="flex flex-col gap-1">
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-[10px]">
                                  {item.percentual_comissao}% {item.tipo_comissao === 'individual' ? '(Ind)' : '(Emp)'}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Sem comissão</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-0.5 md:gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openForm(item)} className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-amber-50 text-amber-600">
                                <Edit className="h-3.5 w-3.5 md:h-4 md:w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-7 w-7 md:h-8 md:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 hidden sm:flex">
                                <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <CargoPermissoesForm
        isOpen={isFormOpen}
        cargo={selected}
        onSave={handleSave}
        onClose={() => {
          setIsFormOpen(false);
          setSelected(null);
        }}
      />
    </>
  );
}

export default function Cargos() {
  return (
    <ProtectedPage requiredModule="rh">
      <CargosPage />
    </ProtectedPage>
  );
}