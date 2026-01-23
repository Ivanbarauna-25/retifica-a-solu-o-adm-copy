import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText, Plus, Save, Pencil, Trash2, Loader2, Camera, Upload, Sparkles, X } from
"lucide-react";
import { base44 } from "@/api/base44Client";
import SmartInput from "@/components/SmartInput";
import { formatCurrency } from "@/components/formatters";
import { useToast } from "@/components/ui/use-toast";

export default function OrcamentoFormModal({
  isOpen,
  onClose,
  onSaved,
  orcamento = null,
  clientes = [],
  funcionarios = [],
  veiculos = [],
  formasPagamento = [],
  condicoesPagamento = []
}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [pecas, setPecas] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [editingItemIndex, setEditingItemIndex] = useState(null);

  const [formData, setFormData] = useState({
    numero_orcamento: "",
    data_orcamento: new Date().toISOString().split("T")[0],
    data_validade: "",
    contato_id: "",
    contato_tipo: "cliente",
    veiculo_id: "",
    vendedor_id: "",
    responsavel_tecnico_id: "",
    itens: [],
    outras_despesas: 0,
    desconto_tipo: "valor",
    desconto_valor: 0,
    valor_total: 0,
    observacoes: "",
    entrada: 0,
    forma_pagamento_id: "",
    condicao_pagamento_id: "",
    status: "pendente"
  });

  const [novoItem, setNovoItem] = useState({
    id: "",
    item_id: "",
    descricao: "",
    tipo: "",
    quantidade: 1,
    valor_unitario: 0,
    desconto_tipo: "valor",
    desconto_valor: 0,
    valor_total: 0
  });

  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [modeloOrcamentoUrl, setModeloOrcamentoUrl] = useState(null);
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      loadModeloOrcamento();
      if (orcamento) {
        setFormData({
          ...orcamento,
          data_orcamento: orcamento.data_orcamento || new Date().toISOString().split("T")[0],
          itens: orcamento.itens || []
        });
      } else {
        gerarNumeroOrcamento();
      }
    }
  }, [isOpen, orcamento]);

  const loadModeloOrcamento = async () => {
    try {
      const configs = await base44.entities.Configuracoes.list();
      if (configs?.[0]?.modelo_orcamento_url) {
        setModeloOrcamentoUrl(configs[0].modelo_orcamento_url);
      }
    } catch (error) {
      console.error("Erro ao carregar modelo:", error);
    }
  };

  const processarImagemOCR = async (file) => {
    setIsProcessingOCR(true);
    try {
      // Upload do arquivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Montar prompt com contexto do modelo
      let promptContexto = "";
      if (modeloOrcamentoUrl) {
        promptContexto = `Você tem acesso a um modelo de orçamento padrão da empresa em: ${modeloOrcamentoUrl}. Use este modelo como referência para entender o layout e campos esperados.`;
      }

      // Usar LLM com visão para extrair dados
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${promptContexto}
        
Analise esta imagem/documento de orçamento e extraia TODOS os dados possíveis.
Retorne um JSON com os seguintes campos (deixe vazio se não encontrar):

- numero_orcamento: número/código do orçamento
- data_orcamento: data no formato YYYY-MM-DD
- data_validade: data de validade no formato YYYY-MM-DD
- cliente_nome: nome do cliente
- vendedor_nome: nome do vendedor
- observacoes: observações gerais
- outras_despesas: valor numérico de outras despesas
- desconto_valor: valor numérico do desconto total
- forma_pagamento: forma de pagamento (texto)
- condicao_pagamento: condição de pagamento (texto)
- itens: array de itens, cada um com:
  - descricao: descrição do produto/serviço
  - tipo: "produto" ou "servico"
  - quantidade: número
  - valor_unitario: valor numérico
  - desconto_valor: desconto do item (numérico)

Extraia o máximo de informações possível. Se houver tabela de itens/produtos/serviços, extraia cada linha.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            numero_orcamento: { type: "string" },
            data_orcamento: { type: "string" },
            data_validade: { type: "string" },
            cliente_nome: { type: "string" },
            vendedor_nome: { type: "string" },
            observacoes: { type: "string" },
            outras_despesas: { type: "number" },
            desconto_valor: { type: "number" },
            forma_pagamento: { type: "string" },
            condicao_pagamento: { type: "string" },
            itens: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  descricao: { type: "string" },
                  tipo: { type: "string" },
                  quantidade: { type: "number" },
                  valor_unitario: { type: "number" },
                  desconto_valor: { type: "number" }
                }
              }
            }
          }
        }
      });

      // Preencher formulário com dados extraídos
      const dados = result;
      
      // Buscar cliente pelo nome
      let clienteId = "";
      if (dados.cliente_nome) {
        const clienteEncontrado = clientes.find(c => 
          c.nome.toLowerCase().includes(dados.cliente_nome.toLowerCase()) ||
          dados.cliente_nome.toLowerCase().includes(c.nome.toLowerCase())
        );
        if (clienteEncontrado) clienteId = clienteEncontrado.id;
      }

      // Buscar vendedor pelo nome
      let vendedorId = "";
      if (dados.vendedor_nome) {
        const vendedorEncontrado = funcionarios.find(f => 
          f.nome.toLowerCase().includes(dados.vendedor_nome.toLowerCase()) ||
          dados.vendedor_nome.toLowerCase().includes(f.nome.toLowerCase())
        );
        if (vendedorEncontrado) vendedorId = vendedorEncontrado.id;
      }

      // Buscar forma de pagamento
      let formaPagamentoId = "";
      if (dados.forma_pagamento) {
        const formaEncontrada = formasPagamento.find(f => 
          f.nome.toLowerCase().includes(dados.forma_pagamento.toLowerCase())
        );
        if (formaEncontrada) formaPagamentoId = formaEncontrada.id;
      }

      // Buscar condição de pagamento
      let condicaoPagamentoId = "";
      if (dados.condicao_pagamento) {
        const condicaoEncontrada = condicoesPagamento.find(c => 
          c.nome.toLowerCase().includes(dados.condicao_pagamento.toLowerCase())
        );
        if (condicaoEncontrada) condicaoPagamentoId = condicaoEncontrada.id;
      }

      // Processar itens
      const itensProcessados = (dados.itens || []).map((item, idx) => ({
        id: `item-ocr-${Date.now()}-${idx}`,
        item_id: "",
        descricao: item.descricao || "",
        tipo: item.tipo || "produto",
        quantidade: Number(item.quantidade) || 1,
        valor_unitario: Number(item.valor_unitario) || 0,
        desconto_tipo: "valor",
        desconto_valor: Number(item.desconto_valor) || 0,
        valor_total: Math.max(0, (Number(item.quantidade) || 1) * (Number(item.valor_unitario) || 0) - (Number(item.desconto_valor) || 0))
      }));

      setFormData(prev => ({
        ...prev,
        numero_orcamento: dados.numero_orcamento || prev.numero_orcamento,
        data_orcamento: dados.data_orcamento || prev.data_orcamento,
        data_validade: dados.data_validade || prev.data_validade,
        contato_id: clienteId || prev.contato_id,
        vendedor_id: vendedorId || prev.vendedor_id,
        forma_pagamento_id: formaPagamentoId || prev.forma_pagamento_id,
        condicao_pagamento_id: condicaoPagamentoId || prev.condicao_pagamento_id,
        outras_despesas: Number(dados.outras_despesas) || prev.outras_despesas,
        desconto_valor: Number(dados.desconto_valor) || prev.desconto_valor,
        observacoes: dados.observacoes || prev.observacoes,
        itens: itensProcessados.length > 0 ? itensProcessados : prev.itens
      }));

      toast({
        title: "✅ Dados extraídos com sucesso!",
        description: `${itensProcessados.length} item(s) encontrado(s). Confira e ajuste se necessário.`
      });

    } catch (error) {
      console.error("Erro ao processar OCR:", error);
      toast({
        title: "❌ Erro ao processar imagem",
        description: error.message || "Não foi possível extrair os dados. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processarImagemOCR(file);
    }
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processarImagemOCR(file);
    }
  };

  const loadData = async () => {
    try {
      const [p, s] = await Promise.all([
      base44.entities.Peca.list(),
      base44.entities.Servico.list()]
      );
      setPecas(p || []);
      setServicos(s || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const gerarNumeroOrcamento = async () => {
    try {
      const orcamentos = await base44.entities.Orcamento.list("-created_date", 1);
      const ultimo = orcamentos[0];
      let proximoNumero = 1;
      if (ultimo?.numero_orcamento) {
        const match = ultimo.numero_orcamento.match(/\d+$/);
        if (match) {
          proximoNumero = parseInt(match[0]) + 1;
        }
      }
      const ano = new Date().getFullYear();
      setFormData((prev) => ({
        ...prev,
        numero_orcamento: `${ano}-${String(proximoNumero).padStart(6, "0")}`
      }));
    } catch (error) {
      console.error("Erro ao gerar número:", error);
    }
  };

  const veiculosFiltrados = useMemo(() => {
    if (!formData.contato_id) return [];
    return veiculos.filter((v) => v.cliente_id === formData.contato_id);
  }, [formData.contato_id, veiculos]);

  const valorTotalOrcamento = useMemo(() => {
    const totalItens = formData.itens.reduce((sum, item) => sum + (item.valor_total || 0), 0);
    const total = totalItens + (formData.outras_despesas || 0) - (formData.desconto_valor || 0);
    return Math.max(0, total);
  }, [formData.itens, formData.outras_despesas, formData.desconto_valor]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, valor_total: valorTotalOrcamento }));
  }, [valorTotalOrcamento]);

  const handleItemChange = (field, value) => {
    setNovoItem((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "item_id") {
        const peca = pecas.find((p) => p.id === value);
        const servico = servicos.find((s) => s.id === value);
        const item = peca || servico;

        if (item) {
          updated.descricao = peca ? item.descricao : item.nome;
          updated.valor_unitario = peca ? item.preco_venda : item.preco;
        } else { // Clear description and unit value if item_id is cleared or not found
          updated.descricao = "";
          updated.valor_unitario = 0;
        }
      }

      const qtd = Number(updated.quantidade) || 0;
      const valorUnit = Number(updated.valor_unitario) || 0;
      const desconto = Number(updated.desconto_valor) || 0;
      updated.valor_total = Math.max(0, qtd * valorUnit - desconto);

      return updated;
    });
  };

  const addItem = () => {
    if (!novoItem.descricao || !novoItem.tipo || novoItem.quantidade <= 0 || novoItem.valor_unitario < 0) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios e garanta valores válidos para Quantidade e Valor Unitário.",
        variant: "destructive"
      });
      return;
    }

    const itemToAdd = {
      ...novoItem,
      id: `item-${Date.now()}-${Math.random()}`
    };

    setFormData((prev) => ({
      ...prev,
      itens: [...prev.itens, itemToAdd]
    }));

    setNovoItem({
      id: "",
      item_id: "",
      descricao: "",
      tipo: "",
      quantidade: 1,
      valor_unitario: 0,
      desconto_tipo: "valor",
      desconto_valor: 0,
      valor_total: 0
    });

    toast({ title: "✅ Item adicionado!" });
  };

  const removeItem = (id) => {
    setFormData((prev) => ({
      ...prev,
      itens: prev.itens.filter((item) => item.id !== id)
    }));
    toast({ title: "✅ Item removido" });
  };

  const editItem = (index) => {
    setEditingItemIndex(index);
  };

  const updateItemField = (index, field, value) => {
    setFormData((prev) => {
      const updatedItens = [...prev.itens];
      updatedItens[index] = { ...updatedItens[index], [field]: value };

      const item = updatedItens[index];
      const qtd = Number(item.quantidade) || 0;
      const valorUnit = Number(item.valor_unitario) || 0;
      const desconto = Number(item.desconto_valor) || 0;
      item.valor_total = Math.max(0, qtd * valorUnit - desconto);

      return { ...prev, itens: updatedItens };
    });
  };

  const handleSave = async () => {
    if (!formData.numero_orcamento || !formData.data_orcamento || !formData.contato_id) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: "Preencha o número, a data do orçamento e selecione o cliente.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        ...formData,
        cliente_id: formData.contato_id,
        valor_total: valorTotalOrcamento
      };

      if (orcamento?.id) {
        await base44.entities.Orcamento.update(orcamento.id, dataToSave);
        toast({ title: "✅ Orçamento atualizado com sucesso!" });
      } else {
        await base44.entities.Orcamento.create(dataToSave);
        toast({ title: "✅ Orçamento criado com sucesso!" });
      }

      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "❌ Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[96vw] md:max-w-4xl max-h-[88vh] modern-modal"
        onPointerDownOutside={(e) => e.preventDefault()}>

        <DialogHeader className="modern-modal-header">
          <DialogTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="h-8 w-8 md:h-11 md:w-11 rounded-lg md:rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm md:text-base font-semibold text-white truncate">{orcamento ? `Editar Orçamento` : "Novo Orçamento"}</h2>
                <p className="text-[10px] md:text-xs text-slate-300 mt-0.5 hidden sm:block truncate">{formData.numero_orcamento || "Gerando número..."}</p>
              </div>
            </div>
            
            {/* Botões de ação (mobile no header) */}
            <div className="flex items-center gap-1.5">
              {/* Botões de Captura/Upload (apenas quando não está editando) */}
              {!orcamento && (
                <div className="hidden md:flex items-center gap-1.5 md:gap-2">
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} className="hidden" />
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                  
                  <Button type="button" variant="ghost" size="sm" onClick={() => cameraInputRef.current?.click()} disabled={isProcessingOCR}
                    className="h-8 md:h-9 px-2 md:px-3 bg-white/10 hover:bg-white/20 text-white border-0" title="Fotografar orçamento">
                    {isProcessingOCR ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    <span className="hidden md:inline ml-1.5 text-xs">Câmera</span>
                  </Button>
                  
                  <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessingOCR}
                    className="h-8 md:h-9 px-2 md:px-3 bg-white/10 hover:bg-white/20 text-white border-0" title="Enviar foto ou PDF">
                    <Upload className="w-4 h-4" />
                    <span className="hidden md:inline ml-1.5 text-xs">Upload</span>
                  </Button>
                </div>
              )}
              
              {/* Botões salvar/cancelar (mobile) */}
              <div className="modern-modal-header-actions">
                <Button type="button" onClick={onClose} disabled={isSaving}
                  className="bg-transparent border border-white/30 text-white hover:bg-white/10">
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" onClick={handleSave} disabled={isSaving}
                  className="bg-white text-slate-800 hover:bg-slate-100">
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        {/* Banner de processamento OCR */}
        {isProcessingOCR && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2.5 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <div className="flex-1">
              <p className="text-xs md:text-sm font-medium">Processando imagem...</p>
              <p className="text-[10px] md:text-xs opacity-80">Extraindo dados do orçamento com IA</p>
            </div>
            <Sparkles className="w-5 h-5 opacity-80" />
          </div>
        )}

        {/* CONTEÚDO COM SCROLL */}
        <div className="modern-modal-content p-2.5 md:p-5 bg-slate-100/50">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="bg-slate-200 border border-slate-300 p-0.5 md:p-1 rounded-lg md:rounded-xl grid grid-cols-4 gap-0.5 md:gap-1 mb-3 md:mb-5 sticky top-0 z-10 shadow-sm">
              <TabsTrigger
                value="geral"
                className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 font-medium text-[10px] md:text-xs py-1.5 md:py-2 transition-all flex items-center justify-center gap-1">
                <span className="hidden sm:inline">Dados</span><span className="sm:hidden">Geral</span>
              </TabsTrigger>
              <TabsTrigger
                value="itens"
                className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 font-medium text-[10px] md:text-xs py-1.5 md:py-2 transition-all flex items-center justify-center gap-1">
                Itens ({formData.itens.length})
              </TabsTrigger>
              <TabsTrigger
                value="financeiro"
                className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 font-medium text-[10px] md:text-xs py-1.5 md:py-2 transition-all flex items-center justify-center gap-1">
                <span className="hidden sm:inline">Financeiro</span><span className="sm:hidden">$</span>
              </TabsTrigger>
              <TabsTrigger
                value="observacoes"
                className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 font-medium text-[10px] md:text-xs py-1.5 md:py-2 transition-all flex items-center justify-center gap-1">
                Obs
              </TabsTrigger>
            </TabsList>

            {/* TAB: Dados Gerais */}
            <TabsContent value="geral" className="p-0 m-0">
              <div className="bg-white rounded-lg md:rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-100 border-b border-slate-200 px-2.5 md:px-5 py-2 md:py-3">
                  <h3 className="text-xs md:text-sm font-bold text-slate-700">Dados Principais</h3>
                </div>
                <div className="p-2.5 md:p-5 space-y-2.5 md:space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-4">
                    <div>
                      <Label className="text-[11px] md:text-xs font-semibold text-slate-600 mb-1 block">Número *</Label>
                      <Input
                        value={formData.numero_orcamento}
                        onChange={(e) => setFormData((prev) => ({ ...prev, numero_orcamento: e.target.value }))}
                        className="bg-white text-black text-xs md:text-sm h-8 md:h-10"
                        placeholder="2025-000001" />
                    </div>

                    <div>
                      <Label className="text-[11px] md:text-xs font-semibold text-slate-600 mb-1 block">Data *</Label>
                      <Input
                        type="date"
                        value={formData.data_orcamento}
                        onChange={(e) => setFormData((prev) => ({ ...prev, data_orcamento: e.target.value }))}
                        className="bg-white text-black text-xs md:text-sm h-8 md:h-10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-4">
                    <div>
                      <Label className="text-[11px] md:text-xs font-semibold text-slate-600 mb-1 block">Validade</Label>
                      <Input
                        type="date"
                        value={formData.data_validade}
                        onChange={(e) => setFormData((prev) => ({ ...prev, data_validade: e.target.value }))}
                        className="bg-white text-black text-xs md:text-sm h-8 md:h-10" />
                    </div>

                    <div>
                      <Label className="text-[11px] md:text-xs font-semibold text-slate-600 mb-1 block">Cliente *</Label>
                      <SmartInput
                        options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                        value={formData.contato_id}
                        onChange={(v) => setFormData((prev) => ({ ...prev, contato_id: v, veiculo_id: "" }))}
                        placeholder="Selecione" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-4">
                    <div>
                      <Label className="text-[11px] md:text-xs font-semibold text-slate-600 mb-1 block">Veículo</Label>
                      <SmartInput
                        options={veiculosFiltrados.map((v) => ({
                          value: v.id,
                          label: `${v.placa} - ${v.marca} ${v.modelo}`
                        }))}
                        value={formData.veiculo_id}
                        onChange={(v) => setFormData((prev) => ({ ...prev, veiculo_id: v }))}
                        placeholder="Selecione" />
                    </div>

                    <div>
                      <Label className="text-[11px] md:text-xs font-semibold text-slate-600 mb-1 block">Vendedor</Label>
                      <SmartInput
                        options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))}
                        value={formData.vendedor_id}
                        onChange={(v) => setFormData((prev) => ({ ...prev, vendedor_id: v }))}
                        placeholder="Selecione" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] md:text-xs font-semibold text-slate-600 mb-1 block">Responsável Técnico</Label>
                    <SmartInput
                      options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))}
                      value={formData.responsavel_tecnico_id}
                      onChange={(v) => setFormData((prev) => ({ ...prev, responsavel_tecnico_id: v }))}
                      placeholder="Selecione" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Itens */}
            <TabsContent value="itens" className="p-0 m-0">
              <div className="bg-white">
                {/* Formulário de novo item */}
                <div className="bg-slate-100 rounded-lg p-2.5 md:p-4 mb-3 md:mb-4 border border-slate-200">
                  <h3 className="text-xs md:text-sm font-bold mb-2 md:mb-3 text-slate-900">Adicionar Item</h3>
                  <div className="space-y-2 md:space-y-3">
                    <div>
                      <Label className="text-[11px] md:text-xs text-slate-600 font-semibold">Produto/Serviço *</Label>
                      <SmartInput
                        options={[
                        ...pecas.map((p) => ({
                          value: p.id,
                          label: `${p.codigo ? p.codigo + " - " : ""}${p.descricao}`,
                          tipo: "produto"
                        })),
                        ...servicos.map((s) => ({
                          value: s.id,
                          label: s.nome,
                          tipo: "servico"
                        }))]
                        }
                        value={novoItem.item_id}
                        onChange={(v) => {
                          const tipo = pecas.find((p) => p.id === v) ? "produto" : "servico";
                          handleItemChange("item_id", v);
                          handleItemChange("tipo", tipo);
                        }}
                        placeholder="Buscar..."
                        className="mt-0.5 md:mt-1" />

                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-[2fr_2fr_2fr_auto] gap-1.5 md:gap-4 items-end">
                      <div>
                        <Label className="text-[11px] md:text-xs text-slate-600 font-semibold">Qtd *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={novoItem.quantidade}
                          onChange={(e) => handleItemChange("quantidade", e.target.value)}
                          className="mt-0.5 md:mt-1 h-8 md:h-9 text-xs md:text-sm bg-white text-black" />

                      </div>

                      <div>
                        <Label className="text-[11px] md:text-xs text-slate-600 font-semibold">V. Unit. *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={novoItem.valor_unitario}
                          onChange={(e) => handleItemChange("valor_unitario", e.target.value)}
                          className="mt-0.5 md:mt-1 h-8 md:h-9 text-xs md:text-sm bg-white text-black" />

                      </div>

                      <div>
                        <Label className="text-[11px] md:text-xs text-slate-600 font-semibold">Desc.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={novoItem.desconto_valor}
                          onChange={(e) => handleItemChange("desconto_valor", e.target.value)}
                          className="mt-0.5 md:mt-1 h-8 md:h-9 text-xs md:text-sm bg-white text-black" />

                      </div>

                      <Button
                        type="button"
                        onClick={addItem}
                        size="sm"
                        className="bg-slate-800 hover:bg-slate-700 text-white h-8 md:h-9 text-[10px] md:text-xs px-3 md:px-6 whitespace-nowrap col-span-3 md:col-span-1">
                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                    
                    <div className="text-xs md:text-sm font-semibold text-slate-900 bg-blue-50 rounded-lg p-2 md:p-3 border border-blue-200">
                      Total: {formatCurrency(novoItem.valor_total)}
                    </div>
                  </div>
                </div>

                {/* Lista de itens */}
                <div className="border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="text-[10px] md:text-xs font-semibold text-slate-900 px-2 md:px-4">Descrição</TableHead>
                        <TableHead className="text-[10px] md:text-xs font-semibold text-slate-900 text-center w-16 md:w-24 px-1 md:px-4">Qtd</TableHead>
                        <TableHead className="text-[10px] md:text-xs font-semibold text-slate-900 text-right w-20 md:w-32 px-1 md:px-4 hidden sm:table-cell">V.Un.</TableHead>
                        <TableHead className="text-[10px] md:text-xs font-semibold text-slate-900 text-right w-20 md:w-32 px-1 md:px-4 hidden md:table-cell">Desc.</TableHead>
                        <TableHead className="text-[10px] md:text-xs font-semibold text-slate-900 text-right w-24 md:w-36 px-1 md:px-4">Total</TableHead>
                        <TableHead className="text-[10px] md:text-xs font-semibold text-slate-900 text-center w-16 md:w-28 px-1 md:px-4">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.itens.length === 0 ?
                      <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 md:py-8 text-slate-500 text-xs md:text-sm">
                            Nenhum item adicionado
                          </TableCell>
                        </TableRow> :

                      formData.itens.map((item, index) =>
                      <TableRow key={item.id} className="text-[10px] md:text-xs">
                            <TableCell className="font-medium text-slate-900 max-w-[100px] md:max-w-none truncate px-2 md:px-4">{item.descricao}</TableCell>
                            <TableCell className="text-center text-slate-900 px-1 md:px-4">
                              {editingItemIndex === index ?
                          <Input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => updateItemField(index, "quantidade", e.target.value)}
                            className="w-14 md:w-20 h-7 md:h-8 text-[10px] md:text-xs text-center bg-white text-black" /> :


                          item.quantidade
                          }
                            </TableCell>
                            <TableCell className="text-right text-slate-900 px-1 md:px-4 hidden sm:table-cell">
                              {editingItemIndex === index ?
                          <Input
                            type="number"
                            step="0.01"
                            value={item.valor_unitario}
                            onChange={(e) => updateItemField(index, "valor_unitario", e.target.value)}
                            className="w-20 md:w-28 h-7 md:h-8 text-[10px] md:text-xs text-right bg-white text-black" /> :


                          formatCurrency(item.valor_unitario)
                          }
                            </TableCell>
                            <TableCell className="text-right text-slate-900 px-1 md:px-4 hidden md:table-cell">
                              {editingItemIndex === index ?
                          <Input
                            type="number"
                            step="0.01"
                            value={item.desconto_valor}
                            onChange={(e) => updateItemField(index, "desconto_valor", e.target.value)}
                            className="w-20 md:w-28 h-7 md:h-8 text-[10px] md:text-xs text-right bg-white text-black" /> :


                          formatCurrency(item.desconto_valor)
                          }
                            </TableCell>
                            <TableCell className="text-right font-semibold text-slate-900 px-1 md:px-4">
                              {formatCurrency(item.valor_total)}
                            </TableCell>
                            <TableCell className="text-center px-1 md:px-4">
                              <div className="flex items-center justify-center gap-0.5 md:gap-1">
                                <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => editingItemIndex === index ? setEditingItemIndex(null) : editItem(index)}
                              className="h-7 w-7">
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              className="h-7 w-7 text-red-600 hover:bg-red-50">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                      )
                      }
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Financeiro */}
            <TabsContent value="financeiro" className="p-0 m-0">
              <div className="bg-white rounded-lg md:rounded-xl border border-slate-200 overflow-hidden p-2.5 md:p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-4">
                  <div>
                    <Label className="text-[11px] md:text-xs uppercase text-slate-600 font-semibold">Forma Pagamento</Label>
                    <SmartInput
                      options={formasPagamento.map((f) => ({ value: f.id, label: f.nome }))}
                      value={formData.forma_pagamento_id}
                      onChange={(v) => setFormData((prev) => ({ ...prev, forma_pagamento_id: v }))}
                      placeholder="Selecione"
                      className="mt-1" />

                  </div>

                  <div>
                    <Label className="text-[11px] md:text-xs uppercase text-slate-600 font-semibold">Condição</Label>
                    <SmartInput
                      options={condicoesPagamento.map((c) => ({ value: c.id, label: c.nome }))}
                      value={formData.condicao_pagamento_id}
                      onChange={(v) => setFormData((prev) => ({ ...prev, condicao_pagamento_id: v }))}
                      placeholder="Selecione"
                      className="mt-1" />

                  </div>

                  <div>
                    <Label className="text-[11px] md:text-xs uppercase text-slate-600 font-semibold">Entrada</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.entrada}
                      onChange={(e) => setFormData((prev) => ({ ...prev, entrada: Number(e.target.value) }))}
                      className="mt-1 h-8 md:h-9 text-xs md:text-sm bg-white text-black" />

                  </div>

                  <div>
                    <Label className="text-[11px] md:text-xs uppercase text-slate-600 font-semibold">Outras Despesas</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.outras_despesas}
                      onChange={(e) => setFormData((prev) => ({ ...prev, outras_despesas: Number(e.target.value) }))}
                      className="mt-1 h-8 md:h-9 text-xs md:text-sm bg-white text-black" />

                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-[11px] md:text-xs uppercase text-slate-600 font-semibold">Desconto (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.desconto_valor}
                      onChange={(e) => setFormData((prev) => ({ ...prev, desconto_valor: Number(e.target.value) }))}
                      className="mt-1 h-8 md:h-9 text-xs md:text-sm bg-white text-black" />

                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Observações */}
            <TabsContent value="observacoes" className="p-0 m-0">
              <div className="bg-white rounded-lg md:rounded-xl border border-slate-200 overflow-hidden p-2.5 md:p-4">
                <Label className="text-[11px] md:text-xs uppercase text-slate-600 font-semibold">Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                  rows={8}
                  className="mt-1 text-xs md:text-sm resize-none bg-white text-black"
                  placeholder="Digite observações..." />

              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* FOOTER */}
        <div className="modern-modal-footer flex flex-col sm:flex-row justify-between items-center gap-2 px-3 md:px-5 py-2.5 md:py-3.5 border-t border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg w-full sm:w-auto justify-between sm:justify-start">
            <p className="text-[10px] md:text-xs font-medium text-slate-500">Total</p>
            <p className="text-sm md:text-base font-bold text-slate-900">{formatCurrency(valorTotalOrcamento)}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-8 md:h-9 text-xs md:text-sm flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-3 md:px-5 h-8 md:h-9 text-xs md:text-sm flex-1 sm:flex-none">
              {isSaving ?
              <>
                  <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                  Salvando...
                </> :

              <>
                  <Save className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
                  {orcamento ? "Salvar" : "Criar"}
                </>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}