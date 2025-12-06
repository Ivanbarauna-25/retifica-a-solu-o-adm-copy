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
                    <TableHead className="text-white">Nome</TableHead>
                    <TableHead className="text-white">Tipo</TableHead>
                    <TableHead className="text-white">Taxa %</TableHead>
                    <TableHead className="text-white">Taxa Fixa</TableHead>
                    <TableHead className="text-white">Prazo Recebimento</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white w-[120px] no-print">Ações</TableHead>
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
                        <TableCell className="font-medium">{forma.nome}</TableCell>
                        <TableCell>{tiposLabels[forma.tipo] || forma.tipo}</TableCell>
                        <TableCell>{formatPercentage(forma.taxa_percentual)}</TableCell>
                        <TableCell>{formatCurrency(forma.taxa_fixa)}</TableCell>
                        <TableCell>{forma.prazo_recebimento || 0} dias</TableCell>
                        <TableCell>
                          <Badge variant={forma.ativa ? 'default' : 'secondary'}>
                            {forma.ativa ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="no-print">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openForm(forma)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(forma.id)} className="text-red-600">
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