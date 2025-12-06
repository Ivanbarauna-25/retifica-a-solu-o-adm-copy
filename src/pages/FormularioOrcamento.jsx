
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText, Package, MessageSquare, ChevronLeft,
  Plus, Trash2, ChevronDown, ChevronRight, Info,
  ShoppingCart, CreditCard, FileCheck } from
'lucide-react';
import { formatCurrency } from '@/components/formatters';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { createPageUrl } from '@/utils';
import SmartInput from '@/components/SmartInput';

export default function FormularioOrcamentoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const urlParams = new URLSearchParams(location.search);
  const orcamentoId = urlParams.get('id');

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('geral');
  const [isItensExpanded, setIsItensExpanded] = useState(true);
  const [isDadosPrincipaisExpanded, setIsDadosPrincipaisExpanded] = useState(true);

  // Estados de dados
  const [clientes, setClientes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form data
  const [formData, setFormData] = useState({
    numero_orcamento: '',
    data_orcamento: new Date().toISOString().split('T')[0],
    data_validade: '',
    contato_id: '',
    contato_tipo: 'cliente',
    veiculo_id: '',
    vendedor_id: '',
    responsavel_tecnico_id: '',
    status: 'pendente',
    itens: [],
    outras_despesas: 0,
    desconto_tipo: 'valor',
    desconto_valor: 0,
    valor_total: 0,
    forma_pagamento_id: '',
    condicao_pagamento_id: '',
    entrada: 0,
    observacoes: ''
  });

  // Item being added
  const [novoItem, setNovoItem] = useState({
    tipo: 'produto',
    item_id: '',
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    desconto_tipo: 'valor',
    desconto_valor: 0,
    valor_total: 0
  });

  useEffect(() => {
    loadUserAndData();
  }, []);

  const loadUserAndData = async () => {
    setIsLoadingData(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [clis, funcs, veics, pcs, servs, formas, conds] = await Promise.all([
      base44.entities.Cliente.list(),
      base44.entities.Funcionario.list(),
      base44.entities.Veiculo.list(),
      base44.entities.Peca.list(),
      base44.entities.Servico.list(),
      base44.entities.FormaPagamento.list(),
      base44.entities.CondicaoPagamento.list()]
      );

      setClientes(clis || []);
      setFuncionarios(funcs || []);
      setVeiculos(veics || []);
      setPecas(pcs || []);
      setServicos(servs || []);
      setFormasPagamento(formas || []);
      setCondicoesPagamento(conds || []);

      // Se está editando, buscar dados do orçamento
      if (orcamentoId) {
        const orcamentos = await base44.entities.Orcamento.filter({ id: orcamentoId });
        if (orcamentos && orcamentos[0]) {
          const orc = orcamentos[0];
          setFormData({
            ...orc,
            data_orcamento: orc.data_orcamento || new Date().toISOString().split('T')[0],
            itens: orc.itens || [],
            outras_despesas: orc.outras_despesas || 0,
            desconto_tipo: orc.desconto_tipo || 'valor',
            desconto_valor: orc.desconto_valor || 0,
            entrada: orc.entrada || 0
          });
        }
      } else {
        // Gerar número automático
        const orcamentos = await base44.entities.Orcamento.list();
        const proximoNumero = `ORC${String((orcamentos?.length || 0) + 1).padStart(6, '0')}`;
        setFormData((prev) => ({ ...prev, numero_orcamento: proximoNumero }));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: '❌ Erro ao carregar',
        description: 'Não foi possível carregar os dados necessários.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleAddItem = () => {
    if (!novoItem.item_id) {
      toast({
        title: '⚠️ Atenção',
        description: 'Selecione um produto ou serviço.',
        variant: 'destructive'
      });
      return;
    }

    const itemComId = {
      ...novoItem,
      id: Math.random().toString(36).substring(7)
    };

    setFormData((prev) => ({
      ...prev,
      itens: [...prev.itens, itemComId]
    }));

    // Reset novo item
    setNovoItem({
      tipo: 'produto',
      item_id: '',
      descricao: '',
      quantidade: 1,
      valor_unitario: 0,
      desconto_tipo: 'valor',
      desconto_valor: 0,
      valor_total: 0
    });

    toast({
      title: '✅ Item adicionado',
      description: 'Item adicionado à lista com sucesso.'
    });
  };

  const handleRemoveItem = (itemId) => {
    setFormData((prev) => ({
      ...prev,
      itens: prev.itens.filter((i) => i.id !== itemId)
    }));
  };

  const handleItemChange = (field, value) => {
    const updated = { ...novoItem, [field]: value };

    // Auto-fill description and price when selecting item
    if (field === 'item_id') {
      if (updated.tipo === 'produto') {
        const peca = pecas.find((p) => p.id === value);
        if (peca) {
          updated.descricao = peca.descricao;
          updated.valor_unitario = peca.preco_venda || 0;
        }
      } else {
        const servico = servicos.find((s) => s.id === value);
        if (servico) {
          updated.descricao = servico.nome;
          updated.valor_unitario = servico.valor_padrao || 0;
        }
      }
    }

    // Calculate total
    const subtotal = Number(updated.quantidade) * Number(updated.valor_unitario);
    const desconto = updated.desconto_tipo === 'percentual' ?
    subtotal * (Number(updated.desconto_valor) / 100) :
    Number(updated.desconto_valor);
    updated.valor_total = subtotal - desconto;

    setNovoItem(updated);
  };

  // Calcular valor total do orçamento
  const valorTotalOrcamento = useMemo(() => {
    const subtotalItens = formData.itens.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
    const desconto = formData.desconto_tipo === 'percentual' ?
    subtotalItens * (Number(formData.desconto_valor) / 100) :
    Number(formData.desconto_valor);
    return subtotalItens + Number(formData.outras_despesas) - desconto;
  }, [formData.itens, formData.outras_despesas, formData.desconto_tipo, formData.desconto_valor]);

  const handleSave = async () => {
    if (!formData.numero_orcamento || !formData.contato_id) {
      toast({
        title: '⚠️ Campos obrigatórios',
        description: 'Preencha o número do orçamento e selecione um cliente.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        valor_total: valorTotalOrcamento
      };

      if (orcamentoId) {
        await base44.entities.Orcamento.update(orcamentoId, dataToSave);
        toast({ title: '✅ Orçamento atualizado com sucesso!' });
        navigate(createPageUrl('Orcamentos'));
      } else {
        await base44.entities.Orcamento.create(dataToSave);
        // Redirecionar para página de sucesso
        toast({ title: '✅ Orçamento criado com sucesso!' });
        navigate(createPageUrl('OrcamentoCriadoSucesso'));
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: '❌ Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-slate-50">
        {/* Header Escuro */}
        <div className="bg-slate-800 text-white px-6 py-6 shadow-lg">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(createPageUrl('Orcamentos'))}
                  className="text-white hover:bg-slate-700">

                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="bg-slate-700 p-2 rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{orcamentoId ? 'Editar Orçamento' : 'Novo Orçamento'}</h1>
                  <p className="text-sm text-slate-300">{formData.numero_orcamento}</p>
                </div>
              </div>
              {user &&
              <div className="text-right">
                  <p className="text-sm font-medium">{user.full_name}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
              }
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
              <TabsTrigger value="geral" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Info className="w-4 h-4" />
                Informações Gerais
              </TabsTrigger>
              <TabsTrigger value="itens" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Package className="w-4 h-4" />
                Itens e Serviços
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <CreditCard className="w-4 h-4" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger value="observacoes" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <MessageSquare className="w-4 h-4" />
                Observações
              </TabsTrigger>
            </TabsList>

            {/* ABA: Informações Gerais */}
            <TabsContent value="geral" className="space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <button
                    type="button"
                    onClick={() => setIsDadosPrincipaisExpanded(!isDadosPrincipaisExpanded)}
                    className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4 hover:text-slate-600 transition-colors w-full">

                    {isDadosPrincipaisExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <FileCheck className="w-5 h-5" />
                    Dados Principais
                  </button>

                  {isDadosPrincipaisExpanded &&
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-slate-700">Número do Orçamento</Label>
                        <Input
                        value={formData.numero_orcamento}
                        onChange={(e) => setFormData((prev) => ({ ...prev, numero_orcamento: e.target.value }))}
                        className="mt-1.5"
                        placeholder="ORC000001" />

                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-700">Data do Orçamento</Label>
                        <Input
                        type="date"
                        value={formData.data_orcamento}
                        onChange={(e) => setFormData((prev) => ({ ...prev, data_orcamento: e.target.value }))}
                        className="mt-1.5" />

                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-700">Cliente/Contato</Label>
                        <SmartInput
                        options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                        value={formData.contato_id}
                        onChange={(v) => setFormData((prev) => ({ ...prev, contato_id: v }))}
                        placeholder="Selecione ou digite..."
                        className="mt-1.5" />

                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-700">Veículo</Label>
                        <SmartInput
                        options={veiculos.
                        filter((v) => !formData.contato_id || v.cliente_id === formData.contato_id).
                        map((v) => ({ value: v.id, label: `${v.placa} - ${v.marca} ${v.modelo}` }))}
                        value={formData.veiculo_id}
                        onChange={(v) => setFormData((prev) => ({ ...prev, veiculo_id: v }))}
                        placeholder="Selecione veículo"
                        className="mt-1.5" />

                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-700">Vendedor</Label>
                        <SmartInput
                        options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))}
                        value={formData.vendedor_id}
                        onChange={(v) => setFormData((prev) => ({ ...prev, vendedor_id: v }))}
                        placeholder="Selecione ou digite"
                        className="mt-1.5" />

                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-700">Responsável Técnico</Label>
                        <SmartInput
                        options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))}
                        value={formData.responsavel_tecnico_id}
                        onChange={(v) => setFormData((prev) => ({ ...prev, responsavel_tecnico_id: v }))}
                        placeholder="Selecione ou digite..."
                        className="mt-1.5" />

                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-700">Data de Validade</Label>
                        <Input
                        type="date"
                        value={formData.data_validade}
                        onChange={(e) => setFormData((prev) => ({ ...prev, data_validade: e.target.value }))}
                        className="mt-1.5" />

                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-700">Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v }))}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="aprovado">Aprovado</SelectItem>
                            <SelectItem value="rejeitado">Rejeitado</SelectItem>
                            <SelectItem value="expirado">Expirado</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  }
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA: Itens e Serviços */}
            <TabsContent value="itens" className="space-y-4">
              {/* Adicionar Item */}
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Adicionar Item
                  </h3>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-12 md:col-span-4">
                      <Label className="text-sm font-medium text-slate-700">Produto</Label>
                      <SmartInput
                        options={[
                        ...pecas.map((p) => ({ value: p.id, label: p.descricao, tipo: 'produto' })),
                        ...servicos.map((s) => ({ value: s.id, label: s.nome, tipo: 'servico' }))]
                        }
                        value={novoItem.item_id}
                        onChange={(v) => {
                          const item = pecas.find((p) => p.id === v) || servicos.find((s) => s.id === v);
                          const tipo = pecas.find((p) => p.id === v) ? 'produto' : 'servico';
                          handleItemChange('item_id', v);
                          handleItemChange('tipo', tipo);
                        }}
                        placeholder="Digite ou selecione um produto..."
                        className="mt-1.5" />

                    </div>

                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-sm font-medium text-slate-700">Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={novoItem.quantidade}
                        onChange={(e) => handleItemChange('quantidade', e.target.value)}
                        className="mt-1.5" />

                    </div>

                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-sm font-medium text-slate-700">Vl Unit</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novoItem.valor_unitario}
                        onChange={(e) => handleItemChange('valor_unitario', e.target.value)}
                        className="mt-1.5" />

                    </div>

                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-sm font-medium text-slate-700">Desconto</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novoItem.desconto_valor}
                        onChange={(e) => handleItemChange('desconto_valor', e.target.value)}
                        className="mt-1.5" />

                    </div>

                    <div className="col-span-12 md:col-span-2">
                      <Button
                        type="button"
                        onClick={handleAddItem}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">

                        <Plus className="w-4 h-4" />
                        Adicionar Produto
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Itens Adicionados */}
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <button
                    type="button"
                    onClick={() => setIsItensExpanded(!isItensExpanded)}
                    className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4 hover:text-slate-600 transition-colors w-full">

                    {isItensExpanded ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5 text-blue-600" />}
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    Itens Adicionados ({formData.itens.length})
                  </button>

                  {isItensExpanded &&
                  <div className="overflow-x-auto">
                      {formData.itens.length === 0 ?
                    <div className="text-center py-12 text-slate-400">
                          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Nenhum Item adicionado</p>
                        </div> :

                    <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="font-semibold">Descrição</TableHead>
                              <TableHead className="text-center font-semibold">Qtd</TableHead>
                              <TableHead className="text-right font-semibold">V. unit.</TableHead>
                              <TableHead className="text-right font-semibold">Desconto</TableHead>
                              <TableHead className="text-right font-semibold">Total</TableHead>
                              <TableHead className="text-center font-semibold w-20">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.itens.map((item) =>
                        <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.descricao}</TableCell>
                                <TableCell className="text-center">{item.quantidade}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.valor_unitario)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.desconto_valor)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(item.valor_total)}</TableCell>
                                <TableCell className="text-center">
                                  <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-600 hover:bg-red-50">

                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                        )}
                          </TableBody>
                        </Table>
                    }
                    </div>
                  }

                  {/* Outras Despesas e Desconto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t">
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Outras Despesas</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.outras_despesas}
                        onChange={(e) => setFormData((prev) => ({ ...prev, outras_despesas: Number(e.target.value) }))}
                        className="mt-1.5" />

                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-700">Tipo de Desconto</Label>
                      <Select value={formData.desconto_tipo} onValueChange={(v) => setFormData((prev) => ({ ...prev, desconto_tipo: v }))}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="valor">Desconto (R$)</SelectItem>
                          <SelectItem value="percentual">Desconto (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Valor Total */}
                  <div className="mt-6 bg-blue-600 text-white p-5 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Valor Total do Orçamento</span>
                      <span className="text-3xl font-bold">{formatCurrency(valorTotalOrcamento)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA: Financeiro */}
            <TabsContent value="financeiro" className="space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Dados Financeiros
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Forma de Pagamento</Label>
                      <Select value={formData.forma_pagamento_id} onValueChange={(v) => setFormData((prev) => ({ ...prev, forma_pagamento_id: v }))}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Selecione a forma..." />
                        </SelectTrigger>
                        <SelectContent>
                          {formasPagamento.map((fp) =>
                          <SelectItem key={fp.id} value={fp.id}>{fp.nome}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-700">Condição de Pagamento</Label>
                      <Select value={formData.condicao_pagamento_id} onValueChange={(v) => setFormData((prev) => ({ ...prev, condicao_pagamento_id: v }))}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Selecione a condiço..." />
                        </SelectTrigger>
                        <SelectContent>
                          {condicoesPagamento.map((cp) =>
                          <SelectItem key={cp.id} value={cp.id}>{cp.nome}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-700">Entrada</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.entrada}
                        onChange={(e) => setFormData((prev) => ({ ...prev, entrada: Number(e.target.value) }))}
                        className="mt-1.5" />

                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA: Observações */}
            <TabsContent value="observacoes" className="space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <Label className="text-sm font-medium text-slate-700">Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                    rows={12}
                    className="mt-1.5"
                    placeholder="Digite observações sobre este orçamento..." />

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl('Orcamentos'))} className="bg-slate-800 px-8 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:bg-accent hover:text-accent-foreground h-10 border-slate-300">


              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave} className="bg-gray-800 text-white px-8 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 hover:bg-blue-700">


              {orcamentoId ? 'Salvar Alterações' : 'Criar Orçamento'}
            </Button>
          </div>
        </div>
      </div>
    </>);

}