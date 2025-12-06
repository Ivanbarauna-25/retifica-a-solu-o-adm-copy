import React, { useState, useEffect, useMemo } from 'react';
import { Peca } from '@/entities/Peca';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, AlertTriangle, Package, Banknote, Printer, Loader2, Search, Filter, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import EstoqueForm from '@/components/EstoqueForm';
import { formatCurrency } from '@/components/formatters';
import AdvancedSearchFilters from '@/components/filters/AdvancedSearchFilters';
import { useAdvancedFilters } from '@/components/filters/useAdvancedFilters';
import StandardDialog, { useStandardDialog } from '@/components/ui/StandardDialog';
import { useToast } from '@/components/ui/use-toast';

export default function EstoquePage() {
  const [pecas, setPecas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(null);
  const { toast } = useToast();
  const { dialogState, showDanger, closeDialog, DialogComponent } = useStandardDialog();

  const fetchPecas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await Peca.list('-created_date');
      setPecas(data);
    } catch (err) {
      console.error("Erro ao buscar peças:", err);
      setError("Não foi possível carregar o estoque. Tente recarregar a página.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPecas();
  }, []);

  const handleSave = async (data) => {
    setError(null); 
    try {
      if (selectedPeca) {
        await Peca.update(selectedPeca.id, data);
      } else {
        await Peca.create(data);
      }
      setIsFormOpen(false);
      setSelectedPeca(null);
      await fetchPecas();
    } catch (err) {
      console.error("Erro ao salvar peça:", err);
      setError("Não foi possível salvar a peça. Por favor, tente novamente.");
    }
  };

  const handleDelete = async (peca) => {
    showDanger(
      'Excluir Peça',
      `Tem certeza que deseja excluir a peça "${peca.descricao}"? Esta ação não pode ser desfeita.`,
      async () => {
        setError(null);
        try {
          await Peca.delete(peca.id);
          toast({
            title: '✅ Sucesso',
            description: 'Peça excluída com sucesso.'
          });
          await fetchPecas();
          closeDialog();
        } catch (err) {
          console.error("Erro ao excluir peça:", err);
          toast({
            title: '❌ Erro',
            description: 'Não foi possível excluir a peça.',
            variant: 'destructive'
          });
        }
      }
    );
  };

  const openForm = (peca = null) => {
    setError(null);
    setSelectedPeca(peca);
    setIsFormOpen(true);
  };

  // Configuração dos campos de busca e filtro
  const estoqueSearchFields = [
    { key: 'codigo', label: 'Código' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'fabricante', label: 'Fabricante' },
    { key: 'localizacao', label: 'Localização' }
  ];

  const estoqueFilterFields = [
    {
      key: 'tipo_entrada',
      label: 'Tipo',
      options: [
        { value: 'consumo', label: 'Consumo' },
        { value: 'revenda', label: 'Revenda' },
        { value: 'remessa', label: 'Remessa' },
        { value: 'uso_consumo', label: 'Uso/Consumo' },
        { value: 'ativo_imobilizado', label: 'Ativo Imobilizado' }
      ]
    }
  ];

  const estoqueSortFields = [
    { key: 'descricao', label: 'Descrição' },
    { key: 'codigo', label: 'Código' },
    { key: 'quantidade_estoque', label: 'Quantidade' },
    { key: 'preco_venda', label: 'Preço Venda' },
    { key: 'created_date', label: 'Data Cadastro' }
  ];

  // Usar hook de filtros avançados
  const pecasFiltradas = useAdvancedFilters(pecas, advancedFilters);

  const stats = {
    totalItens: pecas.reduce((acc, p) => acc + (Number(p.quantidade_estoque) || 0), 0),
    valorCusto: pecas.reduce((acc, p) => acc + ((Number(p.quantidade_estoque) || 0) * (Number(p.preco_custo) || 0)), 0),
    valorVenda: pecas.reduce((acc, p) => acc + ((Number(p.quantidade_estoque) || 0) * (Number(p.preco_venda) || 0)), 0),
    baixoEstoque: pecas.filter(peca => (Number(peca.quantidade_estoque) || 0) <= (Number(peca.quantidade_minima) || 5)).length
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      window.print();
    } catch (err) {
      console.error("Erro ao imprimir:", err);
    } finally {
      setIsPrinting(false);
    }
  };
  
  if (error) {
    return (
        <div className="container mx-auto p-6 flex flex-col items-center justify-center h-full">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Ocorreu um Erro</h2>
            <p className="text-gray-600 mb-4 text-center">{error}</p>
            <Button onClick={fetchPecas}>Tentar Novamente</Button>
        </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4 landscape;
            margin: 0.5cm;
          }
          .no-print {
            display: none !important;
          }
          .printable-content {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            max-width: none !important;
            background: white !important;
          }
          .print-header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #334155;
            padding-bottom: 8px;
          }
          .print-header h1 {
            font-size: 18px !important;
            font-weight: bold;
            margin: 0 0 3px 0;
            color: #334155;
          }
          .print-header h2 {
            font-size: 14px !important;
            margin: 0;
            color: #64748b;
          }
          table {
            width: 100% !important;
            border-collapse: collapse;
            font-size: 8px !important;
            margin: 0 !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 2px 3px !important;
            text-align: left;
            vertical-align: top;
            line-height: 1.1;
          }
          th {
            background-color: #334155 !important;
            color: white !important;
            font-weight: bold;
            font-size: 9px !important;
            text-align: center;
            padding: 3px 2px !important;
          }
          tbody tr:nth-child(even) {
            background-color: #f8fafc !important;
          }
          .badge-print {
            border-radius: 2px;
            padding: 1px 4px;
            font-size: 7px;
            line-height: 1;
            display: inline-block;
            font-weight: bold;
          }
          .bg-green-500 { 
            background-color: #22c55e !important; 
            color: white !important;
          }
          .bg-red-500 { 
            background-color: #ef4444 !important; 
            color: white !important;
          }
          .print-date {
            text-align: right;
            font-size: 7px;
            color: #64748b;
            margin-top: 5px;
          }
        }
      `}} />
      
      <div className="min-h-screen bg-slate-50 printable-content">
        <div className="print-header hidden">
          <h1>Retifica a Solução Ltda</h1>
          <h2>Relatório de Estoque de Peças</h2>
        </div>

        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-8 mb-6 shadow-xl no-print">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Estoque de Peças</h1>
                  <p className="text-slate-300">Gerenciamento de inventário</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={handlePrint} 
                  disabled={isPrinting}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  {isPrinting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Printer className="w-4 h-4"/>}
                  Imprimir
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openForm()}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Peça
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-6">
          {/* Stats Cards - No Print */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 no-print">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total de Itens</p>
                  <div className="text-2xl font-bold text-slate-900">{stats.totalItens}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Valor em Custo</p>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.valorCusto)}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Valor em Venda</p>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.valorVenda)}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Baixo Estoque</p>
                    <div className="text-2xl font-bold text-red-600">{stats.baixoEstoque}</div>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-100" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros Avançados */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 no-print">
            <AdvancedSearchFilters
              entityName="estoque"
              searchFields={estoqueSearchFields}
              filterFields={estoqueFilterFields}
              dateField="created_date"
              sortFields={estoqueSortFields}
              defaultSort={{ field: 'descricao', direction: 'asc' }}
              onFiltersChange={setAdvancedFilters}
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white font-semibold">Código</TableHead>
                    <TableHead className="text-white font-semibold">Descrição</TableHead>
                    <TableHead className="text-white font-semibold">Fabricante</TableHead>
                    <TableHead className="text-white font-semibold">Estoque</TableHead>
                    <TableHead className="text-white font-semibold">Preço Custo</TableHead>
                    <TableHead className="text-white font-semibold">Preço Venda</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold w-[120px] no-print text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="8" className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                  ) : pecasFiltradas.length === 0 ? (
                    <TableRow><TableCell colSpan="8" className="text-center py-8 text-gray-500">Nenhuma peça encontrada.</TableCell></TableRow>
                  ) : (
                    pecasFiltradas.map((peca) => (
                      <TableRow key={peca.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900">{peca.codigo}</TableCell>
                        <TableCell className="text-slate-900">{peca.descricao}</TableCell>
                        <TableCell className="text-slate-600">{peca.fabricante}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            <span>{peca.quantidade_estoque || 0}</span>
                            {(peca.quantidade_estoque || 0) <= (peca.quantidade_minima || 5) && (
                              <AlertTriangle className="w-4 h-4 text-red-500 no-print" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{formatCurrency(peca.preco_custo)}</TableCell>
                        <TableCell className="text-slate-900 font-semibold">{formatCurrency(peca.preco_venda)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={(peca.quantidade_estoque || 0) <= (peca.quantidade_minima || 5) ? 'destructive' : 'default'}
                            className={`badge-print ${(peca.quantidade_estoque || 0) > (peca.quantidade_minima || 5) ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                          >
                            {(peca.quantidade_estoque || 0) <= (peca.quantidade_minima || 5) ? 'Baixo' : 'OK'}
                          </Badge>
                        </TableCell>
                        <TableCell className="no-print text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openForm(peca)} className="h-8 w-8 p-0 hover:bg-amber-50 text-amber-600">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(peca)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
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
            
            <div className="print-date hidden print:block p-4">
              Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      <EstoqueForm
        isOpen={isFormOpen}
        peca={selectedPeca}
        onSave={handleSave}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedPeca(null);
        }}
      />

      <DialogComponent />
    </>
  );
}