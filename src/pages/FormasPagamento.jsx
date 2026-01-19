import React, { useState, useEffect } from 'react';
import { FormaPagamento } from '@/entities/FormaPagamento';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, CreditCard, Printer } from 'lucide-react';
import FormaPagamentoForm from '@/components/FormaPagamentoForm';

export default function FormasPagamentoPage() {
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedFormaPagamento, setSelectedFormaPagamento] = useState(null);

  const fetchFormasPagamento = async () => {
    setIsLoading(true);
    const data = await FormaPagamento.list();
    setFormasPagamento(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFormasPagamento();
  }, []);

  const handleSave = async (data) => {
    try {
      if (selectedFormaPagamento) {
        await FormaPagamento.update(selectedFormaPagamento.id, data);
      } else {
        await FormaPagamento.create(data);
      }
      await fetchFormasPagamento();
      setIsFormOpen(false);
      setSelectedFormaPagamento(null);
    } catch (error) {
      console.error('Erro ao salvar forma de pagamento:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta forma de pagamento?')) {
      await FormaPagamento.delete(id);
      await fetchFormasPagamento();
    }
  };

  const openForm = (formaPagamento = null) => {
    setSelectedFormaPagamento(formaPagamento);
    setIsFormOpen(true);
  };

  const tiposLabels = {
    'dinheiro': 'Dinheiro',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'pix': 'PIX',
    'ted': 'TED',
    'doc': 'DOC',
    'boleto': 'Boleto',
    'cheque': 'Cheque'
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-slate-800 text-white px-3 md:px-6 py-4 md:py-6 mb-3 md:mb-6 shadow-lg sticky top-0 z-10 no-print">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 md:p-3 rounded-lg">
                  <CreditCard className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl lg:text-3xl font-bold">Formas de Pagamento</h1>
                  <p className="text-slate-300 text-xs md:text-sm">Métodos de pagamento aceitos</p>
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
                  Nova Forma
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-2 md:px-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>

                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white text-xs md:text-sm">Nome</TableHead>
                    <TableHead className="text-white text-xs md:text-sm hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="text-white text-xs md:text-sm hidden lg:table-cell">Taxa %</TableHead>
                    <TableHead className="text-white text-xs md:text-sm hidden xl:table-cell">Taxa Fixa</TableHead>
                    <TableHead className="text-white text-xs md:text-sm hidden sm:table-cell">Prazo</TableHead>
                    <TableHead className="text-white text-xs md:text-sm hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-white w-[80px] md:w-[120px] no-print text-xs md:text-sm">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="7" className="text-center">Carregando...</TableCell></TableRow>
                  ) : formasPagamento.length === 0 ? (
                    <TableRow><TableCell colSpan="7" className="text-center">Nenhuma forma de pagamento cadastrada.</TableCell></TableRow>
                  ) : (
                    formasPagamento.map((forma) => (
                      <TableRow key={forma.id}>
                        <TableCell className="font-medium text-xs md:text-sm max-w-[120px] md:max-w-none truncate">{forma.nome}</TableCell>
                        <TableCell className="text-xs md:text-sm hidden md:table-cell">{tiposLabels[forma.tipo] || forma.tipo}</TableCell>
                        <TableCell className="text-xs md:text-sm hidden lg:table-cell">{formatPercentage(forma.taxa_percentual)}</TableCell>
                        <TableCell className="text-xs md:text-sm hidden xl:table-cell">{formatCurrency(forma.taxa_fixa)}</TableCell>
                        <TableCell className="text-xs md:text-sm hidden sm:table-cell">{forma.prazo_recebimento || 0}d</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={forma.ativa ? 'default' : 'secondary'} className="text-[10px] md:text-xs">
                            {forma.ativa ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="no-print">
                          <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="icon" onClick={() => openForm(forma)} title="Editar" className="h-8 w-8 md:h-9 md:w-9 hover:bg-amber-50 text-amber-600">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(forma.id)} title="Excluir" className="text-red-600 h-8 w-8 md:h-9 md:w-9 hover:bg-red-50 hidden md:flex">
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

      <FormaPagamentoForm
        isOpen={isFormOpen}
        formaPagamento={selectedFormaPagamento}
        onSave={handleSave}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedFormaPagamento(null);
        }}
      />
    </>
  );
}