import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Trash2, Save, Info, Package, FileText, CreditCard, X, Loader2, Wrench, Calendar, User, Car, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/components/formatters';
import SmartInput from '@/components/SmartInput';
import { useToast } from '@/components/ui/use-toast';

export default function OrdemServicoForm({
  isOpen,
  onClose,
  ordem = null,
  onSaved
}) {
  const { toast } = useToast();
  const isEditing = !!ordem;
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('geral');
  
  const [formData, setFormData] = useState({
    numero_os: '',
    contato_id: '',
    contato_tipo: 'cliente',
    veiculo_id: '',
    funcionario_id: '',
    vendedor_id: '',
    data_abertura: new Date().toISOString().split('T')[0],
    data_conclusao: '',
    status: 'em_andamento',
    itens: [],
    outras_despesas: 0,
    desconto_tipo: 'valor',
    desconto_valor: 0,
    valor_total: 0,
    observacoes: '',
    entrada: 0,
    forma_pagamento_id: '',
    condicao_pagamento_id: '',
    orcamento_id: null
  });

  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [despesasExternas, setDespesasExternas] = useState(0);
  
  const [novoItem, setNovoItem] = useState({
    tipo: 'produto',
    item_id: '',
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    valor_total: 0
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      setActiveTab('geral');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && ordem) {
      const parsedOs = {
        ...ordem,
        outras_despesas: Number(ordem.outras_despesas || 0),
        desconto_valor: Number(ordem.desconto_valor || 0),
        entrada: Number(ordem.entrada || 0),
        itens: (ordem.itens || []).map(item => ({
          ...item,
          quantidade: Number(item.quantidade || 0),
          valor_unitario: Number(item.valor_unitario || 0),
          valor_total: Number(item.valor_total || 0),
        }))
      };
      setFormData(parsedOs);
    } else if (isOpen && !ordem) {
      generateNextNumber();
    }
  }, [isOpen, ordem]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const promises = [
        base44.entities.Cliente.list(),
        base44.entities.Veiculo.list(),
        base44.entities.Funcionario.list(),
        base44.entities.Peca.list(),
        base44.entities.Servico.list(),
        base44.entities.CondicaoPagamento.list(),
        base44.entities.FormaPagamento.list(),
        base44.entities.Orcamento.list('-data_orcamento')
      ];
      
      if (ordem?.id) {
        promises.push(base44.entities.DespesaOS.filter({ ordem_id: ordem.id }));
      }
      
      const results = await Promise.all(promises);
      const [clientesData, veiculosData, funcionariosData, pecasData, servicosData, condicoesData, formasData, orcamentosData, despesasOSData] = results;
      
      setClientes(clientesData || []);
      setVeiculos(veiculosData || []);
      setFuncionarios(funcionariosData || []);
      setPecas(pecasData || []);
      setServicos(servicosData || []);
      setCondicoesPagamento(condicoesData || []);
      setFormasPagamento(formasData || []);
      setOrcamentos((orcamentosData || []).filter(o => o.status === 'aprovado'));
      
      if (despesasOSData) {
        const totalDespesasOS = despesasOSData.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
        setDespesasExternas(totalDespesasOS);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados necessários',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const generateNextNumber = () => {
    const numero = `OS${Date.now().toString().slice(-6)}`;
    setFormData(prev => ({ ...prev, numero_os: numero }));
  };

  useEffect(() => {
    if (formData.orcamento_id && orcamentos.length > 0 && !isEditing) {
      const orcamento = orcamentos.find(o => o.id === formData.orcamento_id);
      if (orcamento) {
        setFormData(prev => ({
          ...prev,
          contato_id: orcamento.contato_id || '',
          contato_tipo: orcamento.contato_tipo || 'cliente',
          veiculo_id: orcamento.veiculo_id || '',
          vendedor_id: orcamento.vendedor_id || '',
          funcionario_id: orcamento.responsavel_tecnico_id || '',
          itens: orcamento.itens || [],
          outras_despesas: Number(orcamento.outras_despesas || 0),
          desconto_tipo: orcamento.desconto_tipo || 'valor',
          desconto_valor: Number(orcamento.desconto_valor || 0),
          observacoes: orcamento.observacoes || '',
          entrada: Number(orcamento.entrada || 0),
          forma_pagamento_id: orcamento.forma_pagamento_id || '',
          condicao_pagamento_id: orcamento.condicao_pagamento_id || ''
        }));
        toast({
          title: 'Dados pré-preenchidos',
          description: `Os dados foram carregados do orçamento ${orcamento.numero_orcamento}`,
        });
      }
    }
  }, [formData.orcamento_id, orcamentos, isEditing]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContatoChange = (selectedValue) => {
    const selectedOption = [
      ...clientes.map(c => ({ value: c.id, label: c.nome, type: 'cliente' })),
      ...funcionarios.map(f => ({ value: f.id, label: `${f.nome} (Funcionário)`, type: 'funcionario' }))
    ].find(opt => opt.value === selectedValue);

    if (selectedOption) {
      setFormData(prev => ({
        ...prev,
        contato_id: selectedValue,
        contato_tipo: selectedOption.type,
        veiculo_id: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        contato_id: '',
        contato_tipo: 'cliente',
        veiculo_id: ''
      }));
    }
  };

  const calcularValorTotal = useCallback(() => {
    const subtotal = formData.itens.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const desconto = formData.desconto_tipo === 'percentual' 
      ? (subtotal * (formData.desconto_valor || 0)) / 100 
      : (formData.desconto_valor || 0);
    const totalDespesas = (formData.outras_despesas || 0) + despesasExternas;
    return Math.max(0, subtotal + totalDespesas - desconto);
  }, [formData.itens, formData.outras_despesas, formData.desconto_tipo, formData.desconto_valor, despesasExternas]);

  useEffect(() => {
    const total = calcularValorTotal();
    setFormData(prev => ({ ...prev, valor_total: total }));
  }, [calcularValorTotal]);

  const adicionarItem = () => {
    if (!novoItem.descricao || !novoItem.item_id || novoItem.quantidade <= 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione um item e informe uma quantidade válida maior que zero.',
        variant: 'destructive'
      });
      return;
    }
    
    const item = { 
      ...novoItem, 
      id: Date.now().toString(),
      valor_total: novoItem.quantidade * (novoItem.valor_unitario || 0)
    };
    
    setFormData(prev => ({ ...prev, itens: [...prev.itens, item] }));
    setNovoItem({ tipo: 'produto', item_id: '', descricao: '', quantidade: 1, valor_unitario: 0, valor_total: 0 });
    
    toast({
      title: 'Item adicionado',
      description: 'O item foi adicionado com sucesso'
    });
  };

  const removerItem = (index) => {
    setFormData(prev => ({ ...prev, itens: prev.itens.filter((_, i) => i !== index) }));
  };

  const handleItemSelect = (itemId, tipo) => {
    const source = tipo === 'produto' ? pecas : servicos;
    const item = source.find(i => i.id === itemId);
    
    if (item) {
      const valorUnitario = tipo === 'produto' ? Number(item.preco_venda || 0) : Number(item.valor_padrao || 0);
      setNovoItem(prev => ({
        ...prev,
        item_id: itemId,
        descricao: tipo === 'produto' ? item.descricao : item.nome,
        valor_unitario: valorUnitario,
        valor_total: prev.quantidade * valorUnitario
      }));
    } else {
      setNovoItem(prev => ({
        ...prev,
        item_id: '',
        descricao: '',
        valor_unitario: 0,
        valor_total: 0
      }));
    }
  };

  const handleTipoChange = (novoTipo) => {
    setNovoItem({
      tipo: novoTipo,
      item_id: '',
      descricao: '',
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0
    });
  };

  useEffect(() => {
    setNovoItem(prev => ({
      ...prev,
      valor_total: prev.quantidade * (prev.valor_unitario || 0)
    }));
  }, [novoItem.quantidade, novoItem.valor_unitario]);

  const handleSalvar = async () => {
    setIsSaving(true);
    try {
      let savedOS;
      if (isEditing) {
        await base44.entities.OrdemServico.update(ordem.id, formData);
        savedOS = { ...ordem, ...formData };
        toast({
          title: '✅ OS atualizada!',
          description: 'A ordem de serviço foi atualizada com sucesso'
        });
      } else {
        savedOS = await base44.entities.OrdemServico.create(formData);
        toast({
          title: '✅ OS criada!',
          description: 'A ordem de serviço foi criada com sucesso'
        });
      }
      
      if (onSaved) {
        await onSaved(savedOS);
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar a ordem de serviço',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSalvar();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] md:w-[90vw] lg:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-0 rounded-2xl shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-3 md:px-6 py-3 md:py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="h-8 w-8 md:h-11 md:w-11 rounded-lg md:rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Wrench className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm md:text-base font-semibold text-white truncate">
                  {isEditing ? `Editar ${formData.numero_os}` : 'Nova OS'}
                </DialogTitle>
                <p className="text-[10px] md:text-xs text-slate-300 mt-0.5 hidden sm:block truncate">
                  {isEditing ? 'Atualize os dados' : 'Preencha os dados'}
                </p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-2 md:px-3 py-1 md:py-1.5 rounded-lg flex-shrink-0">
               <p className="text-[8px] md:text-[10px] text-slate-300 font-medium uppercase tracking-wider">Status</p>
               <p className="text-[10px] md:text-xs font-semibold text-white">RASCUNHO</p>
            </div>
          </div>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex-1 flex items-center justify-center py-24">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600 font-semibold text-lg">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden bg-slate-100/50">
            <div className="flex-1 overflow-y-auto p-3 md:p-5">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-200 border border-slate-300 p-1 rounded-lg md:rounded-xl grid grid-cols-3 gap-1 mb-3 md:mb-5 sticky top-0 z-30 shadow-sm">
                  <TabsTrigger 
                    value="geral" 
                    className="rounded-md md:rounded-lg bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 font-medium text-[10px] md:text-xs py-1.5 md:py-2 transition-all flex items-center justify-center gap-1 md:gap-1.5"
                  >
                    <Info className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="hidden sm:inline">Dados</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="itens" 
                    className="rounded-md md:rounded-lg bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 font-medium text-[10px] md:text-xs py-1.5 md:py-2 transition-all flex items-center justify-center gap-1 md:gap-1.5"
                  >
                    <Package className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    Itens ({formData.itens.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="observacoes" 
                    className="rounded-md md:rounded-lg bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 font-medium text-[10px] md:text-xs py-1.5 md:py-2 transition-all flex items-center justify-center gap-1 md:gap-1.5"
                  >
                    <FileText className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="hidden sm:inline">Obs</span>
                  </TabsTrigger>
                </TabsList>

                <div className="space-y-6">
                  <TabsContent value="geral" className="mt-0">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="bg-slate-100 border-b border-slate-200 px-5 py-3">
                        <h3 className="text-sm font-bold text-slate-700">Dados Principais</h3>
                      </div>
                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {!isEditing && (
                            <div className="md:col-span-2">
                              <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">
                                Orçamento de Origem
                              </Label>
                              <Select
                                value={formData.orcamento_id || 'null'}
                                onValueChange={(value) => handleInputChange('orcamento_id', value === 'null' ? null : value)}
                              >
                                <SelectTrigger className="modern-input">
                                  <SelectValue placeholder="Nenhum - OS independente" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="null">Nenhum - OS independente</SelectItem>
                                  {orcamentos.map((orc) => {
                                    const cliente = clientes.find(c => c.id === (orc.contato_id || orc.cliente_id));
                                    return (
                                      <SelectItem key={orc.id} value={orc.id}>
                                        {orc.numero_orcamento} - {cliente?.nome || 'N/A'} - {formatCurrency(orc.valor_total || 0)}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              {formData.orcamento_id && (
                                <p className="text-xs text-blue-600 mt-2 font-semibold flex items-center gap-1.5">
                                  <Info className="w-3.5 h-3.5" />
                                  Dados pré-preenchidos do orçamento
                                </p>
                              )}
                            </div>
                          )}

                          <div>
                            <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">Número da OS</Label>
                            <Input
                              value={formData.numero_os}
                              disabled
                              className="modern-input bg-slate-50 font-mono text-slate-600"
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">
                              Data de Abertura
                            </Label>
                            <Input
                              type="date"
                              value={formData.data_abertura}
                              onChange={(e) => handleInputChange('data_abertura', e.target.value)}
                              className="modern-input"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">
                              Cliente/Contato
                            </Label>
                            <SmartInput
                              options={[
                                ...clientes.map(c => ({ value: c.id, label: c.nome, type: 'cliente' })),
                                ...funcionarios.map(f => ({ value: f.id, label: `${f.nome} (Funcionário)`, type: 'funcionario' }))
                              ]}
                              value={formData.contato_id}
                              onChange={handleContatoChange}
                              placeholder="Buscar cliente..."
                              className="modern-input"
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">
                              Veículo
                            </Label>
                            <Select
                              value={formData.veiculo_id}
                              onValueChange={(v) => handleInputChange('veiculo_id', v)}
                              disabled={formData.contato_tipo !== 'cliente' || !formData.contato_id}
                            >
                              <SelectTrigger className="modern-input">
                                <SelectValue placeholder="Selecione o veículo" />
                              </SelectTrigger>
                              <SelectContent>
                                {veiculos
                                  .filter(v => formData.contato_tipo === 'cliente' ? v.cliente_id === formData.contato_id : false)
                                  .map((v) => (
                                    <SelectItem key={v.id} value={v.id}>
                                      {[v.marca, v.modelo].filter(Boolean).join(' ')}{v.placa ? ` - ${v.placa}` : ''}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">
                              Técnico Responsável
                            </Label>
                            <SmartInput
                              options={funcionarios.map(f => ({ value: f.id, label: f.nome }))}
                              value={formData.funcionario_id}
                              onChange={(v) => handleInputChange('funcionario_id', v)}
                              placeholder="Buscar técnico..."
                              className="modern-input"
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">
                              Vendedor
                            </Label>
                            <SmartInput
                              options={funcionarios.map(f => ({ value: f.id, label: f.nome }))}
                              value={formData.vendedor_id}
                              onChange={(v) => handleInputChange('vendedor_id', v)}
                              placeholder="Buscar vendedor..."
                              className="modern-input"
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">
                              Previsão de Conclusão
                            </Label>
                            <Input
                              type="date"
                              value={formData.data_conclusao}
                              onChange={(e) => handleInputChange('data_conclusao', e.target.value)}
                              className="modern-input"
                            />
                          </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="itens" className="space-y-4 mt-0">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="bg-slate-100 border-b border-slate-200 px-5 py-3">
                        <h3 className="text-sm font-bold text-slate-700">Adicionar Item</h3>
                      </div>
                      <div className="p-5">
                        <Tabs value={novoItem.tipo} onValueChange={handleTipoChange} className="w-full mb-4">
                          <TabsList className="grid w-full grid-cols-2 h-9 bg-slate-100 p-1 rounded-md">
                            <TabsTrigger value="produto" className="text-xs font-medium rounded-sm">Produtos</TabsTrigger>
                            <TabsTrigger value="servico" className="text-xs font-medium rounded-sm">Serviços</TabsTrigger>
                          </TabsList>
                        </Tabs>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-2">
                            <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">
                              {novoItem.tipo === 'produto' ? 'Produto' : 'Serviço'}
                            </Label>
                            <SmartInput
                              options={
                                novoItem.tipo === 'produto'
                                  ? pecas.map(p => ({ 
                                      value: p.id, 
                                      label: `${p.codigo ? `[${p.codigo}] ` : ''}${p.descricao}` 
                                    }))
                                  : servicos.map(s => ({ 
                                      value: s.id, 
                                      label: s.nome 
                                    }))
                              }
                              value={novoItem.item_id}
                              onChange={(id) => handleItemSelect(id, novoItem.tipo)}
                              placeholder={`Buscar ${novoItem.tipo}...`}
                              className="modern-input"
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">Quantidade</Label>
                            <Input
                              type="number"
                              value={novoItem.quantidade}
                              onChange={(e) => setNovoItem(p => ({ ...p, quantidade: Number(e.target.value) }))}
                              min="1"
                              step="0.01"
                              className="modern-input"
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">Valor Unit.</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={novoItem.valor_unitario === "" ? "" : novoItem.valor_unitario}
                              onChange={(e) =>
                                setNovoItem(p => ({
                                  ...p,
                                  valor_unitario: e.target.value === "" ? "" : Number(e.target.value)
                                }))
                              }
                              className="modern-input"
                            />
                          </div>
                        </div>

                        {novoItem.item_id && (
                          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Item</p>
                                <p className="font-medium text-slate-900 text-sm">{novoItem.descricao}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Total</p>
                                <p className="text-lg font-bold text-slate-900">
                                  {formatCurrency(novoItem.valor_total)}
                                </p>
                              </div>
                          </div>
                        )}

                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            onClick={adicionarItem}
                            className="bg-slate-900 hover:bg-slate-800 text-white gap-2 h-9 px-4 font-medium text-xs shadow-sm"
                            disabled={!novoItem.item_id || novoItem.quantidade <= 0}
                          >
                            <Plus className="w-3 h-3" />
                            Adicionar Item
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                         <h3 className="text-sm font-bold text-slate-700">Itens da Ordem ({formData.itens.length})</h3>
                      </div>
                      <div className="p-0">
                        <div className="max-h-80 overflow-y-auto">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="font-semibold text-xs text-slate-600 uppercase">Tipo</TableHead>
                                <TableHead className="font-semibold text-xs text-slate-600 uppercase">Descrição</TableHead>
                                <TableHead className="font-semibold text-xs text-slate-600 uppercase text-center">Qtd</TableHead>
                                <TableHead className="font-semibold text-xs text-slate-600 uppercase text-right">Vlr. Unit.</TableHead>
                                <TableHead className="font-semibold text-xs text-slate-600 uppercase text-right">Total</TableHead>
                                <TableHead className="font-semibold text-xs text-slate-600 uppercase text-center">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {formData.itens.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan="6" className="text-center py-12 text-slate-400 text-sm">
                                    Nenhum item adicionado ainda.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                formData.itens.map((item, index) => (
                                  <TableRow key={item.id} className="hover:bg-slate-50 border-b border-slate-50 last:border-0">
                                    <TableCell className="capitalize text-xs text-slate-500 font-medium">{item.tipo}</TableCell>
                                    <TableCell className="text-sm text-slate-700 font-medium">{item.descricao}</TableCell>
                                    <TableCell className="text-sm text-slate-600 text-center">{item.quantidade}</TableCell>
                                    <TableCell className="text-sm text-slate-600 text-right">{formatCurrency(item.valor_unitario)}</TableCell>
                                    <TableCell className="font-bold text-sm text-slate-900 text-right">{formatCurrency(item.valor_total)}</TableCell>
                                    <TableCell className="text-center">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removerItem(index)}
                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 rounded-full"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-100 border-b border-slate-200 px-5 py-3">
                          <h3 className="text-sm font-bold text-slate-700">Pagamento</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                              <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">Forma de Pagamento</Label>
                              <SmartInput
                                options={formasPagamento.map(fp => ({ value: fp.id, label: fp.nome }))}
                                value={formData.forma_pagamento_id}
                                onChange={(v) => handleInputChange('forma_pagamento_id', v)}
                                placeholder="Selecione..."
                                className="modern-input"
                              />
                            </div>

                            <div>
                              <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">Condição de Pagamento</Label>
                              <SmartInput
                                options={condicoesPagamento.map(c => ({ value: c.id, label: c.nome }))}
                                value={formData.condicao_pagamento_id}
                                onChange={(v) => handleInputChange('condicao_pagamento_id', v)}
                                placeholder="Selecione..."
                                className="modern-input"
                              />
                            </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-100 border-b border-slate-200 px-5 py-3">
                          <h3 className="text-sm font-bold text-slate-700">Valores</h3>
                        </div>
                        <div className="p-5 space-y-4">
                           <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">Outras Despesas</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={formData.outras_despesas}
                                  onChange={(e) => handleInputChange('outras_despesas', Number(e.target.value))}
                                  className="modern-input text-right"
                                />
                              </div>
                              {isEditing && (
                                <div>
                                  <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">Despesas Lançadas</Label>
                                  <Input
                                    type="text"
                                    value={formatCurrency(despesasExternas)}
                                    disabled
                                    className="modern-input text-right bg-slate-100 text-slate-700 font-semibold"
                                  />
                                </div>
                              )}
                              <div>
                                <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">Entrada</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={formData.entrada}
                                  onChange={(e) => handleInputChange('entrada', Number(e.target.value))}
                                  className="modern-input text-right"
                                />
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">Tipo Desconto</Label>
                                <Select
                                  value={formData.desconto_tipo}
                                  onValueChange={(v) => handleInputChange('desconto_tipo', v)}
                                >
                                  <SelectTrigger className="modern-input">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="valor">R$</SelectItem>
                                    <SelectItem value="percentual">%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase">Valor Desconto</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={formData.desconto_valor}
                                  onChange={(e) => handleInputChange('desconto_valor', Number(e.target.value))}
                                  className="modern-input text-right"
                                />
                              </div>
                           </div>

                           <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                              <span className="text-sm font-bold text-slate-700 uppercase">Total Final</span>
                              <span className="text-2xl font-bold text-slate-900">{formatCurrency(formData.valor_total)}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="observacoes" className="mt-0 h-full">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full flex flex-col shadow-sm">
                       <div className="bg-slate-100 border-b border-slate-200 px-5 py-3">
                          <h3 className="text-sm font-bold text-slate-700">Observações</h3>
                        </div>
                        <div className="p-5 flex-1">
                          <Textarea
                            value={formData.observacoes}
                            onChange={(e) => handleInputChange('observacoes', e.target.value)}
                            placeholder="Digite observações sobre esta ordem de serviço..."
                            className="resize-none bg-slate-50 border-slate-200 text-slate-700 h-full min-h-[300px] rounded-md focus:bg-white transition-all p-4"
                          />
                        </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <DialogFooter className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                   <p className="text-xs font-medium text-slate-500">Total Previsto</p>
                   <p className="text-base font-bold text-slate-900">{formatCurrency(formData.valor_total)}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSaving}
                    className="bg-slate-800 text-white hover:bg-slate-700 font-semibold flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-5 flex items-center gap-2 font-semibold"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {isEditing ? 'Salvar' : 'Criar Ordem'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}