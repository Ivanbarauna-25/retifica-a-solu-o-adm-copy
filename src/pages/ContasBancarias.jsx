import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Plus, Pencil, Trash2, Landmark, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/components/formatters';
import ProtectedPage from '@/components/ProtectedPage';
import { useStandardDialog } from '@/components/ui/StandardDialog';

export default function ContasBancariasPage() {
  const [contas, setContas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo: 'conta_corrente',
    is_caixa: false, // New field
    saldo_inicial: 0,
    saldo_atual: 0,
    ativa: true
  });
  const { toast } = useToast();
  const { dialogState, showDanger, closeDialog, DialogComponent } = useStandardDialog();

  useEffect(() => {
    fetchContas();
  }, []);

  const fetchContas = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.ContaBancaria.list();
      setContas(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      toast({
        title: "Erro ao carregar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (conta = null) => {
    if (conta) {
      setEditingConta(conta);
      setFormData({
        nome: conta.nome || '',
        banco: conta.banco || '',
        agencia: conta.agencia || '',
        conta: conta.conta || '',
        tipo: conta.tipo || 'conta_corrente',
        is_caixa: conta.is_caixa || false, // Populate new field
        saldo_inicial: conta.saldo_inicial || 0,
        saldo_atual: conta.saldo_atual || 0,
        ativa: conta.ativa !== false
      });
    } else {
      setEditingConta(null);
      setFormData({
        nome: '',
        banco: '',
        agencia: '',
        conta: '',
        tipo: 'conta_corrente',
        is_caixa: false, // Initialize new field
        saldo_inicial: 0,
        saldo_atual: 0,
        ativa: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConta(null);
    setFormData({
      nome: '',
      banco: '',
      agencia: '',
      conta: '',
      tipo: 'conta_corrente',
      is_caixa: false, // Reset new field
      saldo_inicial: 0,
      saldo_atual: 0,
      ativa: true
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.tipo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o tipo da conta.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        ...formData,
        saldo_inicial: Number(formData.saldo_inicial) || 0,
        saldo_atual: Number(formData.saldo_atual) || 0,
        ativa: Boolean(formData.ativa),
        is_caixa: Boolean(formData.is_caixa) // Ensure boolean type for new field
      };

      if (editingConta) {
        await base44.entities.ContaBancaria.update(editingConta.id, payload);
        toast({ title: "Sucesso!", description: "Conta/Caixa atualizado." });
      } else {
        await base44.entities.ContaBancaria.create(payload);
        toast({ title: "Sucesso!", description: "Nova Conta/Caixa criada." });
      }

      handleCloseModal();
      await fetchContas();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (conta) => {
    showDanger(
      'Excluir Conta/Caixa',
      `Tem certeza que deseja excluir "${conta.nome}"? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await base44.entities.ContaBancaria.delete(conta.id);
          toast({ title: "✅ Sucesso!", description: "Conta/Caixa excluída." });
          closeDialog();
          await fetchContas();
        } catch (error) {
          console.error('Erro ao excluir:', error);
          toast({
            title: "Erro ao excluir",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    );
  };

  const tipoLabels = {
    conta_corrente: 'Conta Corrente',
    poupanca: 'Poupança',
    caixa: 'Caixa',
    investimento: 'Investimento'
  };

  if (isLoading) {
    return (
      <ProtectedPage pageName="ContasBancarias">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage pageName="ContasBancarias">
      <Toaster />
      <div className="min-h-screen bg-slate-50">
        {/* Header padronizado */}
        <div className="bg-slate-800 text-white px-6 py-8 mb-6 shadow-xl">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <Landmark className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Contas Bancárias</h1>
                  <p className="text-slate-300">Gerencie suas contas bancárias e caixas</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleOpenModal()} variant="outline" className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2">
                  <Plus className="h-4 w-4" /> Nova Conta/Caixa
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total de Contas</p>
                    <div className="text-2xl font-bold text-slate-900">{contas.length}</div>
                  </div>
                  <Landmark className="w-8 h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Contas Ativas</p>
                    <div className="text-2xl font-bold text-green-600">{contas.filter(c => c.ativa !== false).length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Frentes de Caixa</p>
                    <div className="text-2xl font-bold text-purple-600">{contas.filter(c => c.is_caixa).length}</div>
                  </div>
                  <Wallet className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Saldo Total</p>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(contas.reduce((acc, c) => acc + (c.saldo_atual || 0), 0))}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white font-semibold">Nome</TableHead>
                    <TableHead className="text-white font-semibold">Tipo</TableHead>
                    <TableHead className="text-white font-semibold">Banco</TableHead>
                    <TableHead className="text-white font-semibold">Agência</TableHead>
                    <TableHead className="text-white font-semibold">Conta</TableHead>
                    <TableHead className="text-white font-semibold text-right">Saldo Inicial</TableHead>
                    <TableHead className="text-white font-semibold text-right">Saldo Atual</TableHead>
                    <TableHead className="text-white font-semibold text-center">Status</TableHead>
                    <TableHead className="text-white font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-slate-500 py-12 bg-white">
                        Nenhuma conta ou caixa cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contas.map((conta) => (
                      <TableRow key={conta.id} className="bg-white hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-800">
                          {conta.nome}
                          {conta.is_caixa && (
                            <Badge className="ml-2 bg-purple-100 text-purple-700 border border-purple-200">Frente de Caixa</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-700">{tipoLabels[conta.tipo] || conta.tipo}</TableCell>
                        <TableCell className="text-slate-700">{conta.banco || '—'}</TableCell>
                        <TableCell className="text-slate-700">{conta.agencia || '—'}</TableCell>
                        <TableCell className="text-slate-700">{conta.conta || '—'}</TableCell>
                        <TableCell className="text-right text-slate-700">{formatCurrency(conta.saldo_inicial)}</TableCell>
                        <TableCell className="text-right font-semibold text-slate-800">{formatCurrency(conta.saldo_atual)}</TableCell>
                        <TableCell className="text-center">
                          {conta.ativa !== false ? (
                            <Badge className="bg-green-100 text-green-700 border border-green-200">Ativa</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border border-slate-200">Inativa</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(conta)}
                              className="hover:bg-slate-100"
                            >
                              <Pencil className="h-4 w-4 text-slate-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(conta)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
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

      {/* Modal de Formulário padronizado */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-6 py-4 bg-slate-800 text-white border-b border-slate-700 rounded-t-lg">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              {editingConta ? 'Editar Conta/Caixa' : 'Nova Conta/Caixa'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="nome" className="text-slate-700 font-medium">Nome da Conta/Caixa *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    placeholder="Ex: Conta Corrente BB ou Caixa Principal"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo" className="text-slate-700 font-medium">Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={(v) => handleChange('tipo', v)}>
                    <SelectTrigger id="tipo" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conta_corrente">Conta Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                      <SelectItem value="caixa">Caixa</SelectItem>
                      <SelectItem value="investimento">Investimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200 w-full">
                    <input
                      type="checkbox"
                      id="is_caixa"
                      checked={formData.is_caixa}
                      onChange={(e) => handleChange('is_caixa', e.target.checked)}
                      className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="is_caixa" className="cursor-pointer text-purple-700 text-sm">
                      Frente de Caixa (recebimentos em espécie)
                    </Label>
                  </div>
                </div>
                <div>
                  <Label htmlFor="banco" className="text-slate-700 font-medium">Banco</Label>
                  <Input
                    id="banco"
                    value={formData.banco}
                    onChange={(e) => handleChange('banco', e.target.value)}
                    placeholder="Ex: Banco do Brasil"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="agencia" className="text-slate-700 font-medium">Agência</Label>
                  <Input
                    id="agencia"
                    value={formData.agencia}
                    onChange={(e) => handleChange('agencia', e.target.value)}
                    placeholder="Ex: 1234-5"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="conta" className="text-slate-700 font-medium">Número da Conta</Label>
                  <Input
                    id="conta"
                    value={formData.conta}
                    onChange={(e) => handleChange('conta', e.target.value)}
                    placeholder="Ex: 12345-6"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="saldo_inicial" className="text-slate-700 font-medium">Saldo Inicial</Label>
                  <Input
                    id="saldo_inicial"
                    type="number"
                    step="0.01"
                    value={formData.saldo_inicial}
                    onChange={(e) => handleChange('saldo_inicial', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="saldo_atual" className="text-slate-700 font-medium">Saldo Atual</Label>
                  <Input
                    id="saldo_atual"
                    type="number"
                    step="0.01"
                    value={formData.saldo_atual}
                    onChange={(e) => handleChange('saldo_atual', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      id="ativa"
                      checked={formData.ativa}
                      onChange={(e) => handleChange('ativa', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <Label htmlFor="ativa" className="cursor-pointer text-slate-700">Conta Ativa</Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="border-slate-300">
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-800 hover:bg-slate-700">
                {editingConta ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação padronizado */}
      <DialogComponent />
    </ProtectedPage>
  );
}