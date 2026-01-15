import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Edit, Trash2, Car, Printer, AlertCircle, UploadCloud, Users, Search, Filter } from 'lucide-react';
import { Input } from '../components/ui/input';
import ClienteForm from '../components/ClienteForm';
import VeiculoForm from '../components/VeiculoForm';
import ImportarClientesModal from '../components/clientes/ImportarClientesModal';
import AdvancedSearchFilters from '@/components/filters/AdvancedSearchFilters';
import { useAdvancedFilters } from '@/components/filters/useAdvancedFilters';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClienteFormOpen, setIsClienteFormOpen] = useState(false);
  const [isVeiculoFormOpen, setIsVeiculoForm] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [selectedVeiculo, setSelectedVeiculo] = useState(null);
  const [clienteParaVeiculo, setClienteParaVeiculo] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [clientesData, veiculosData] = await Promise.all([
        base44.entities.Cliente.list('-created_date'),
        base44.entities.Veiculo.list('-created_date')
      ]);
      setClientes(clientesData);
      setVeiculos(veiculosData);
    } catch (err) {
      console.error("Falha ao carregar dados de clientes:", err);
      setError("Não foi possível carregar os dados. Tente recarregar a página.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveCliente = async (data) => {
    try {
      if (selectedCliente) {
        await base44.entities.Cliente.update(selectedCliente.id, data);
      } else {
        await base44.entities.Cliente.create(data);
      }
      await fetchData();
      setIsClienteFormOpen(false);
      setSelectedCliente(null);
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      setError("Falha ao salvar o cliente. Por favor, tente novamente.");
    }
  };

  const handleSaveVeiculo = async (data) => {
    try {
      if (selectedVeiculo) {
        await base44.entities.Veiculo.update(selectedVeiculo.id, data);
      } else {
        await base44.entities.Veiculo.create(data);
      }
      await fetchData();
      setIsVeiculoForm(false);
      setSelectedVeiculo(null);
      setClienteParaVeiculo(null);
    } catch (err) {
      console.error("Erro ao salvar veículo:", err);
      setError("Falha ao salvar o veículo. Por favor, tente novamente.");
    }
  };

  const handleDeleteCliente = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await base44.entities.Cliente.delete(id);
        await fetchData();
      } catch (err) {
        console.error("Erro ao excluir cliente:", err);
        setError("Falha ao excluir o cliente. Por favor, tente novamente.");
      }
    }
  };

  const handleDeleteVeiculo = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este veículo?')) {
      try {
        await base44.entities.Veiculo.delete(id);
        await fetchData();
      } catch (err) {
        console.error("Erro ao excluir veículo:", err);
        setError("Falha ao excluir o veículo. Por favor, tente novamente.");
      }
    }
  };

  const openClienteForm = (cliente = null) => {
    setError(null);
    setSelectedCliente(cliente);
    setIsClienteFormOpen(true);
  };

  const openVeiculoForm = (veiculo = null, cliente = null) => {
    setError(null);
    setSelectedVeiculo(veiculo);
    setClienteParaVeiculo(cliente);
    setIsVeiculoForm(true);
  };

  const getVeiculosDoCliente = (clienteId) => {
    return veiculos.filter(v => v.cliente_id === clienteId);
  };

  // Configuração dos campos de busca e filtro
  const clienteSearchFields = [
    { key: 'nome', label: 'Nome' },
    { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'email', label: 'Email' },
    { key: 'cidade', label: 'Cidade' }
  ];

  const clienteSortFields = [
    { key: 'nome', label: 'Nome' },
    { key: 'created_date', label: 'Data Cadastro' },
    { key: 'cidade', label: 'Cidade' }
  ];

  // Usar hook de filtros avançados
  const clientesFiltrados = useAdvancedFilters(clientes, advancedFilters);

  const totalVeiculos = veiculos.length;

  if (error) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">Ocorreu um Erro</h2>
        <p className="text-gray-600 mb-4 text-center">{error}</p>
        <Button onClick={fetchData}>Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-slate-800 text-white px-4 md:px-6 py-5 md:py-8 mb-4 md:mb-6 shadow-xl">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 md:p-3 rounded-lg">
                  <Users className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                  <h1 className="text-xl md:text-3xl font-bold mb-0.5 md:mb-1">Clientes e Veículos</h1>
                  <p className="text-slate-300 text-xs md:text-base">Gestão de clientes e frota</p>
                </div>
              </div>

              <div className="flex gap-1.5 md:gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4 hidden sm:flex"
                >
                  <UploadCloud className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Importar
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4"
                >
                  <Printer className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openClienteForm()}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-1.5 text-xs md:text-sm px-2 md:px-4"
                >
                  <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Novo</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-3 md:px-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div>
                  <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-0.5 md:mb-1">Total Clientes</p>
                  <div className="text-lg md:text-2xl font-bold text-slate-900">{clientes.length}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div>
                  <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-0.5 md:mb-1">Total Veículos</p>
                  <div className="text-lg md:text-2xl font-bold text-blue-600">{totalVeiculos}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros Avançados */}
          <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 mb-3 md:mb-4">
            <AdvancedSearchFilters
              entityName="clientes"
              searchFields={clienteSearchFields}
              filterFields={[]}
              dateField="created_date"
              sortFields={clienteSortFields}
              defaultSort={{ field: 'nome', direction: 'asc' }}
              onFiltersChange={setAdvancedFilters}
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800 hover:bg-slate-800">
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Nome</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden sm:table-cell">CPF/CNPJ</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Telefone</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden md:table-cell">Email</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden lg:table-cell">Cidade/UF</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden xl:table-cell">Veículos</TableHead>
                    <TableHead className="text-white font-semibold w-[80px] md:w-[150px] text-center no-print text-xs md:text-sm">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan="7" className="text-center py-8 text-gray-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : clientesFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="7" className="text-center py-8 text-gray-500">
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <TableRow key={cliente.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-slate-900 text-xs md:text-sm max-w-[120px] md:max-w-none truncate">{cliente.nome}</TableCell>
                        <TableCell className="text-gray-600 text-xs md:text-sm hidden sm:table-cell">{cliente.cpf_cnpj}</TableCell>
                        <TableCell className="text-gray-600 text-xs md:text-sm">{cliente.telefone}</TableCell>
                        <TableCell className="text-gray-600 text-xs md:text-sm hidden md:table-cell max-w-[150px] truncate">{cliente.email}</TableCell>
                        <TableCell className="text-gray-600 text-xs md:text-sm hidden lg:table-cell">
                          {cliente.cidade ? `${cliente.cidade}${cliente.uf ? '/' + cliente.uf : ''}` : '-'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="flex flex-col gap-1">
                            {getVeiculosDoCliente(cliente.id).map(veiculo => (
                              <div
                                key={veiculo.id}
                                className="text-xs bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-md flex items-center justify-between hover:bg-slate-100 transition-colors">
                                <span className="font-medium text-slate-700 truncate">
                                  {veiculo.marca} {veiculo.modelo} <span className="text-slate-500">- {veiculo.placa}</span>
                                </span>
                                <div className="flex gap-1 no-print">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openVeiculoForm(veiculo)}
                                    className="h-6 w-6 p-0 hover:bg-white">
                                    <Edit className="h-3 w-3 text-slate-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteVeiculo(veiculo.id)}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-white">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="no-print text-center">
                          <div className="flex items-center justify-center gap-0.5 md:gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openVeiculoForm(null, cliente)}
                              title="Adicionar Veículo"
                              className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-blue-50 text-blue-600">
                              <Car className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openClienteForm(cliente)}
                              className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-slate-100 text-slate-600 hidden sm:flex">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCliente(cliente.id)}
                              className="h-7 w-7 md:h-8 md:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 hidden md:flex">
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

      <ClienteForm
        isOpen={isClienteFormOpen}
        cliente={selectedCliente}
        onSave={handleSaveCliente}
        onClose={() => {
          setIsClienteFormOpen(false);
          setSelectedCliente(null);
        }}
      />

      <VeiculoForm
        isOpen={isVeiculoFormOpen}
        veiculo={selectedVeiculo}
        clientes={clientes}
        clientePreSelecionado={clienteParaVeiculo}
        onSave={handleSaveVeiculo}
        onClose={() => {
          setIsVeiculoForm(false);
          setSelectedVeiculo(null);
          setClienteParaVeiculo(null);
        }}
      />

      <ImportarClientesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          fetchData();
        }}
      />
    </>
  );
}