
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, ArrowLeft, Save, Info, Package, FileText, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/components/formatters';
import SmartInput from '@/components/SmartInput';
import SimularParcelasModal from '@/components/os/SimularParcelasModal';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { createPageUrl } from '@/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

// Initialize QueryClient outside the component
const queryClient = new QueryClient();

// Wrap the FormularioOSContent with QueryClientProvider
export default function FormularioOS() {
  return (
    <QueryClientProvider client={queryClient}>
      <FormularioOSContent />
    </QueryClientProvider>
  );
}

function FormularioOSContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Pegar ID da OS da URL se estiver editando
  const searchParams = new URLSearchParams(location.search);
  const osId = searchParams.get('id');
  const returnToViewer = searchParams.get('returnToViewer') === 'true'; // NEW: Read returnToViewer param
  const isEditing = !!osId; // Consistent use of isEditing

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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
    pagamentos: [],
    orcamento_id: null // NEW field for linked budget
  });

  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [selectedCondicao, setSelectedCondicao] = useState(null);
  
  const [novoItem, setNovoItem] = useState({
    tipo: 'produto',
    item_id: '',
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    valor_total: 0
  });

  const [isSimularOpen, setIsSimularOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('geral'); // Renamed from activeSection

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  // Carregar OS se estiver editando ou gerar novo número
  useEffect(() => {
    if (osId) {
      loadOS();
    } else {
      generateNextNumber();
    }
  }, [osId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clientesData, veiculosData, funcionariosData, pecasData, servicosData, condicoesData, formasData] = await Promise.all([
        base44.entities.Cliente.list(),
        base44.entities.Veiculo.list(),
        base44.entities.Funcionario.list(),
        base44.entities.Peca.list(),
        base44.entities.Servico.list(),
        base44.entities.CondicaoPagamento.list(),
        base44.entities.FormaPagamento.list()
      ]);
      
      setClientes(clientesData || []);
      setVeiculos(veiculosData || []);
      setFuncionarios(funcionariosData || []);
      setPecas(pecasData || []);
      setServicos(servicosData || []);
      setCondicoesPagamento(condicoesData || []);
      setFormasPagamento(formasData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados necessários',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadOS = async () => {
    try {
      const os = await base44.entities.OrdemServico.get(osId);
      // Ensure that numeric fields are numbers, not strings from API
      const parsedOs = {
        ...os,
        outras_despesas: Number(os.outras_despesas || 0),
        desconto_valor: Number(os.desconto_valor || 0),
        entrada: Number(os.entrada || 0),
        itens: os.itens.map(item => ({
          ...item,
          quantidade: Number(item.quantidade || 0),
          valor_unitario: Number(item.valor_unitario || 0),
          valor_total: Number(item.valor_total || 0),
        }))
      };
      setFormData(parsedOs);
    } catch (error) {
      console.error('Erro ao carregar OS:', error);
      toast({
        title: 'Erro ao carregar OS',
        description: 'Não foi possível carregar a ordem de serviço',
        variant: 'destructive'
      });
    }
  };

  const generateNextNumber = () => {
    const numero = `OS${Date.now().toString().slice(-6)}`;
    setFormData(prev => ({ ...prev, numero_os: numero }));
  };

  // Data query for approved Orcamentos
  const { data: orcamentos = [] } = useQuery({
    queryKey: ['orcamentos'],
    queryFn: async () => {
      const data = await base44.entities.Orcamento.list('-data_orcamento');
      return (data || []).filter(o => o.status === 'aprovado'); // Apenas orçamentos aprovados
    },
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Se tiver orçamento selecionado, preencher dados automaticamente
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
          funcionario_id: orcamento.responsavel_tecnico_id || '', // Note: different field name in Orcamento
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
  }, [formData.orcamento_id, orcamentos, isEditing, toast]);

  useEffect(() => {
    if (formData.condicao_pagamento_id && condicoesPagamento.length > 0) {
      const condicao = condicoesPagamento.find(c => c.id === formData.condicao_pagamento_id);
      setSelectedCondicao(condicao || null);
    } else {
      setSelectedCondicao(null);
    }
  }, [formData.condicao_pagamento_id, condicoesPagamento]);

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
        veiculo_id: '' // Clear vehicle selection when contact changes
      }));
    } else {
      // If selectedValue is cleared (e.g., SmartInput reset), clear contact_id and type
      setFormData(prev => ({
        ...prev,
        contato_id: '',
        contato_tipo: 'cliente', // Default back to client, or null
        veiculo_id: ''
      }));
    }
  };

  const calcularValorTotal = useCallback(() => {
    const subtotal = formData.itens.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const desconto = formData.desconto_tipo === 'percentual' 
      ? (subtotal * (formData.desconto_valor || 0)) / 100 
      : (formData.desconto_valor || 0);
    // Ensure total doesn't go below zero
    return Math.max(0, subtotal + (formData.outras_despesas || 0) - desconto);
  }, [formData.itens, formData.outras_despesas, formData.desconto_tipo, formData.desconto_valor]);

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
      id: Date.now().toString(), // Unique ID for React list key and potential future modifications
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
      // If item is cleared from SmartInput
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
    // Limpar seleção ao trocar de tipo
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
      let savedOsId;
      if (isEditing) {
        await base44.entities.OrdemServico.update(osId, formData);
        savedOsId = osId;
        toast({
          title: 'OS atualizada!',
          description: 'A ordem de serviço foi atualizada com sucesso'
        });
      } else {
        const newOs = await base44.entities.OrdemServico.create(formData);
        savedOsId = newOs.id; // Get the ID of the newly created OS
        toast({
          title: 'OS criada!',
          description: 'A ordem de serviço foi criada com sucesso'
        });
      }
      
      setTimeout(() => {
        if (returnToViewer && savedOsId) {
          // Retornar para a página de ordens com parâmetros para reabrir o modal do viewer
          navigate(createPageUrl(`OrdensServico?returnToViewer=true&osId=${savedOsId}`));
        } else {
          navigate(createPageUrl('OrdensServico'));
        }
      }, 1000);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleSalvar();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
        {/* Header */}
        <div className="bg-slate-800 text-white rounded-lg p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => {
                  if (returnToViewer && osId) { // NEW: Conditional navigation for Cancel
                    navigate(createPageUrl(`OrdensServico?returnToViewer=true&osId=${osId}`));
                  } else {
                    navigate(createPageUrl('OrdensServico'));
                  }
                }}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div> {/* Simplified header content */}
                <h1 className="text-2xl font-bold">
                  {isEditing ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                  {formData.numero_os || 'Gerando número...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white mb-6 border w-full justify-start rounded-lg shadow-sm">
              <TabsTrigger value="geral" className="flex items-center gap-2 px-6 py-3">
                <Info className="w-4 h-4" />
                Informações Gerais
              </TabsTrigger>
              <TabsTrigger value="itens" className="flex items-center gap-2 px-6 py-3">
                <Package className="w-4 h-4" />
                Itens ({formData.itens.length})
              </TabsTrigger>
              <TabsTrigger value="observacoes" className="flex items-center gap-2 px-6 py-3">
                <FileText className="w-4 h-4" />
                Observações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="geral">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white">
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <Info className="w-5 h-5" />
                    Dados Principais
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Orçamento de Origem - NEW */}
                    <div>
                      <Label htmlFor="orcamento_id" className="text-sm font-medium text-slate-700">
                        Orçamento de Origem (Opcional)
                      </Label>
                      <Select
                        value={formData.orcamento_id || 'null'} // Handle null value for Select
                        onValueChange={(value) => handleInputChange('orcamento_id', value === 'null' ? null : value)}
                        disabled={isEditing} // Disable if editing an existing OS
                      >
                        <SelectTrigger id="orcamento_id" className="mt-1">
                          <SelectValue placeholder="Nenhum - OS independente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">Nenhum - OS independente</SelectItem> {/* Use string 'null' for Select value */}
                          {orcamentos.map((orc) => {
                            const cliente = clientes.find(c => c.id === (orc.contato_id || orc.cliente_id));
                            return (
                              <SelectItem key={orc.id} value={orc.id}>
                                {orc.numero_orcamento} - {cliente?.nome || 'Cliente não identificado'} - {formatCurrency(orc.valor_total || 0)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {formData.orcamento_id && (
                        <p className="text-xs text-blue-600 mt-1">
                          💡 Dados preenchidos automaticamente do orçamento
                        </p>
                      )}
                    </div>
                    {/* Existing Number da OS field */}
                    <div>
                      <Label htmlFor="numero_os" className="text-sm font-medium text-slate-700">Número da OS</Label>
                      <Input
                        id="numero_os"
                        value={formData.numero_os}
                        disabled
                        className="mt-1 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="data_abertura" className="text-sm font-medium text-slate-700">Data de Abertura</Label>
                      <Input
                        id="data_abertura"
                        type="date"
                        value={formData.data_abertura}
                        onChange={(e) => handleInputChange('data_abertura', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Cliente/Contato</Label>
                      <SmartInput
                        options={[
                          ...clientes.map(c => ({ value: c.id, label: c.nome, type: 'cliente' })),
                          ...funcionarios.map(f => ({ value: f.id, label: `${f.nome} (Funcionário)`, type: 'funcionario' }))
                        ]}
                        value={formData.contato_id}
                        onChange={handleContatoChange}
                        placeholder="Digite o nome do cliente..."
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Veículo</Label>
                      <Select
                        value={formData.veiculo_id}
                        onValueChange={(v) => handleInputChange('veiculo_id', v)}
                        disabled={formData.contato_tipo !== 'cliente' || !formData.contato_id}
                      >
                        <SelectTrigger className="mt-1">
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
                      <Label className="text-sm font-medium text-slate-700">Técnico Responsável</Label>
                      <SmartInput
                        options={funcionarios.map(f => ({ value: f.id, label: f.nome }))}
                        value={formData.funcionario_id}
                        onChange={(v) => handleInputChange('funcionario_id', v)}
                        placeholder="Digite o nome do técnico..."
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Vendedor</Label>
                      <SmartInput
                        options={funcionarios.map(f => ({ value: f.id, label: f.nome }))}
                        value={formData.vendedor_id}
                        onChange={(v) => handleInputChange('vendedor_id', v)}
                        placeholder="Digite o nome do vendedor..."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="data_conclusao" className="text-sm font-medium text-slate-700">Data de Conclusão (Previsão)</Label>
                      <Input
                        id="data_conclusao"
                        type="date"
                        value={formData.data_conclusao}
                        onChange={(e) => handleInputChange('data_conclusao', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="itens">
              <div className="space-y-4">
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-slate-800 py-3">
                    <CardTitle className="flex items-center gap-2 text-white text-base">
                      <Plus className="w-4 h-4" />
                      Adicionar Item
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* Abas para Produtos e Serviços */}
                    <Tabs value={novoItem.tipo} onValueChange={handleTipoChange} className="w-full mb-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="produto">Produtos</TabsTrigger>
                        <TabsTrigger value="servico">Serviços</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-slate-700">
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
                          placeholder={`Digite para buscar ${novoItem.tipo === 'produto' ? 'produto' : 'serviço'}...`}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-700">Quantidade</Label>
                        <Input
                          type="number"
                          value={novoItem.quantidade}
                          onChange={(e) => setNovoItem(p => ({ ...p, quantidade: Number(e.target.value) }))}
                          min="1"
                          step="0.01"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-700">Valor Unitário</Label>
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
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {novoItem.item_id && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Item selecionado:</p>
                            <p className="font-medium text-slate-800">{novoItem.descricao}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Total:</p>
                            <p className="text-lg font-bold text-blue-600">
                              {formatCurrency(novoItem.valor_total)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={adicionarItem}
                        className="bg-slate-800 hover:bg-slate-700 text-white gap-2"
                        disabled={!novoItem.item_id || novoItem.quantidade <= 0}
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar {novoItem.tipo === 'produto' ? 'Produto' : 'Serviço'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-slate-800 py-3">
                    <CardTitle className="flex items-center gap-2 text-white text-base">
                      <Package className="w-4 h-4" />
                      Itens Adicionados ({formData.itens.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="font-semibold">Tipo</TableHead>
                            <TableHead className="font-semibold">Descrição</TableHead>
                            <TableHead className="font-semibold">Qtd</TableHead>
                            <TableHead className="font-semibold">Vlr. Unit.</TableHead>
                            <TableHead className="font-semibold">Total</TableHead>
                            <TableHead className="font-semibold text-center">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.itens.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan="6" className="text-center py-8 text-slate-500">
                                Nenhum item adicionado ainda
                              </TableCell>
                            </TableRow>
                          ) : (
                            formData.itens.map((item, index) => (
                              <TableRow key={item.id} className="hover:bg-slate-50">
                                <TableCell className="capitalize">{item.tipo}</TableCell>
                                <TableCell>{item.descricao}</TableCell>
                                <TableCell>{item.quantidade}</TableCell>
                                <TableCell>{formatCurrency(item.valor_unitario)}</TableCell>
                                <TableCell className="font-semibold">{formatCurrency(item.valor_total)}</TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removerItem(index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* NOVA SEÇÃO: Dados de Pagamento na aba Itens */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-slate-800 py-3">
                    <CardTitle className="flex items-center gap-2 text-white text-base">
                      <CreditCard className="w-4 h-4" />
                      Dados de Pagamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Forma de Pagamento</Label>
                        <SmartInput
                          options={formasPagamento.map(fp => ({ value: fp.id, label: fp.nome }))}
                          value={formData.forma_pagamento_id}
                          onChange={(v) => handleInputChange('forma_pagamento_id', v)}
                          placeholder="Selecione a forma..."
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-slate-700">Condição de Pagamento</Label>
                        <SmartInput
                          options={condicoesPagamento.map(c => ({ value: c.id, label: c.nome }))}
                          value={formData.condicao_pagamento_id}
                          onChange={(v) => handleInputChange('condicao_pagamento_id', v)}
                          placeholder="Selecione a condição..."
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-slate-700">Entrada</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.entrada}
                          onChange={(e) => handleInputChange('entrada', Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-slate-800 py-3">
                    <CardTitle className="text-white text-base">Valores e Descontos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Outras Despesas</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.outras_despesas}
                          onChange={(e) => handleInputChange('outras_despesas', Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-slate-700">Tipo de Desconto</Label>
                        <Select
                          value={formData.desconto_tipo}
                          onValueChange={(v) => handleInputChange('desconto_tipo', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="valor">Desconto (R$)</SelectItem>
                            <SelectItem value="percentual">Desconto (%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-slate-700">Valor do Desconto</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.desconto_valor}
                          onChange={(e) => handleInputChange('desconto_valor', Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Valor Total da OS</span>
                        <span className="text-xl font-bold">{formatCurrency(formData.valor_total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="observacoes">
              <div className="space-y-4">
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-slate-800 py-3">
                    <CardTitle className="flex items-center gap-2 text-white text-base">
                      <FileText className="w-4 h-4" />
                      Observações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Textarea
                      value={formData.observacoes}
                      onChange={(e) => handleInputChange('observacoes', e.target.value)}
                      placeholder="Digite observações sobre esta ordem de serviço..."
                      rows={8}
                      className="resize-none"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Bar - Fixed no final */}
          <Card className="shadow-lg border-0 sticky bottom-4">
            <CardContent className="p-3 bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white">
                  {formData.itens.length} {formData.itens.length === 1 ? 'item' : 'itens'} • 
                  Total: <span className="font-bold">{formatCurrency(formData.valor_total)}</span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (returnToViewer && osId) { // NEW: Conditional navigation for Cancel
                        navigate(createPageUrl(`OrdensServico?returnToViewer=true&osId=${osId}`));
                      } else {
                        navigate(createPageUrl('OrdensServico'));
                      }
                    }}
                    className="bg-white border-white text-slate-800 hover:bg-slate-100 text-sm h-9"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm h-9"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar OS')} {/* NEW: Updated text */}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>

      {/* Modal de Simulação */}
      {isSimularOpen && isEditing && (
        <SimularParcelasModal
          isOpen={isSimularOpen}
          onClose={() => setIsSimularOpen(false)}
          ordem={{ ...formData, id: osId }}
          onGenerated={() => setIsSimularOpen(false)}
        />
      )}
    </>
  );
}
