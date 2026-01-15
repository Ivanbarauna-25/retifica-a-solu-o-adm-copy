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
      <div className="container mx-auto">
        <Card className="printable-content">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl card-title flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Formas de Pagamento
            </CardTitle>
            <div className="flex items-center gap-2 no-print">
              <Button onClick={() => openForm()}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
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
                          <div className="flex gap-0.5 md:gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openForm(forma)} className="h-7 w-7 md:h-8 md:w-8 p-0">
                              <Edit className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(forma.id)} className="text-red-600 h-7 w-7 md:h-8 md:w-8 p-0 hidden sm:flex">
                              <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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