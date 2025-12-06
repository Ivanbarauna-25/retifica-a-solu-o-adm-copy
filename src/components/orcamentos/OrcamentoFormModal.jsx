import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText, Plus, Save, Pencil, Trash2, Loader2 } from
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

  useEffect(() => {
    if (isOpen) {
      loadData();
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
        className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white border-0 rounded-2xl shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}>

        <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-4 flex-shrink-0">
          <DialogTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">{orcamento ? `Editar Orçamento` : "Novo Orçamento"}</h2>
                <p className="text-xs text-slate-300 mt-0.5">{formData.numero_orcamento || "Gerando número..."}</p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* CONTEÚDO COM SCROLL */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-100/50">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="bg-slate-200 border border-slate-300 p-1 rounded-xl grid grid-cols-4 gap-1 mb-5 sticky top-0 z-10 shadow-sm">
              <TabsTrigger
                value="geral"
                className="rounded-lg bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 font-medium text-xs py-2 transition-all flex items-center justify-center gap-1.5">
                Dados Gerais
              </TabsTrigger>
              <TabsTrigger
                value="itens"
                className="rounded-lg bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 font-medium text-xs py-2 transition-all flex items-center justify-center gap-1.5">
                Itens ({formData.itens.length})
              </TabsTrigger>
              <TabsTrigger
                value="financeiro"
                className="rounded-lg bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 font-medium text-xs py-2 transition-all flex items-center justify-center gap-1.5">
                Financeiro
              </TabsTrigger>
              <TabsTrigger
                value="observacoes"
                className="rounded-lg bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 font-medium text-xs py-2 transition-all flex items-center justify-center gap-1.5">
                Obs
              </TabsTrigger>
            </TabsList>

            {/* TAB: Dados Gerais */}
            <TabsContent value="geral" className="p-0 m-0">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-100 border-b border-slate-200 px-5 py-3">
                  <h3 className="text-sm font-bold text-slate-700">Dados Principais</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Número do Orçamento *</Label>
                      <Input
                        value={formData.numero_orcamento}
                        onChange={(e) => setFormData((prev) => ({ ...prev, numero_orcamento: e.target.value }))}
                        className="bg-white text-black text-sm h-10"
                        placeholder="2025-000001" />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Data do Orçamento *</Label>
                      <Input
                        type="date"
                        value={formData.data_orcamento}
                        onChange={(e) => setFormData((prev) => ({ ...prev, data_orcamento: e.target.value }))}
                        className="bg-white text-black text-sm h-10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Data de Validade</Label>
                      <Input
                        type="date"
                        value={formData.data_validade}
                        onChange={(e) => setFormData((prev) => ({ ...prev, data_validade: e.target.value }))}
                        className="bg-white text-black text-sm h-10" />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Cliente *</Label>
                      <SmartInput
                        options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                        value={formData.contato_id}
                        onChange={(v) => setFormData((prev) => ({ ...prev, contato_id: v, veiculo_id: "" }))}
                        placeholder="Selecione o cliente" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Veículo</Label>
                      <SmartInput
                        options={veiculosFiltrados.map((v) => ({
                          value: v.id,
                          label: `${v.placa} - ${v.marca} ${v.modelo}`
                        }))}
                        value={formData.veiculo_id}
                        onChange={(v) => setFormData((prev) => ({ ...prev, veiculo_id: v }))}
                        placeholder="Selecione um veículo" />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Vendedor</Label>
                      <SmartInput
                        options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))}
                        value={formData.vendedor_id}
                        onChange={(v) => setFormData((prev) => ({ ...prev, vendedor_id: v }))}
                        placeholder="Selecione o vendedor" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Responsável Técnico</Label>
                    <SmartInput
                      options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))}
                      value={formData.responsavel_tecnico_id}
                      onChange={(v) => setFormData((prev) => ({ ...prev, responsavel_tecnico_id: v }))}
                      placeholder="Selecione o responsável" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Itens */}
            <TabsContent value="itens" className="p-0 m-0">
              <div className="bg-white">
                {/* Formulário de novo item */}
                <div className="bg-slate-100 rounded-lg p-4 mb-4 border border-slate-200">
                  <h3 className="text-sm font-bold mb-3 text-slate-900">Adicionar Item</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-600 font-semibold">Produto/Serviço *</Label>
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
                        className="mt-1" />

                    </div>

                    <div className="grid grid-cols-[2fr_2fr_2fr_auto] gap-4 items-end">
                      <div>
                        <Label className="text-xs text-slate-600 font-semibold">Quantidade *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={novoItem.quantidade}
                          onChange={(e) => handleItemChange("quantidade", e.target.value)}
                          className="mt-1 h-9 text-sm bg-white text-black" />

                      </div>

                      <div>
                        <Label className="text-xs text-slate-600 font-semibold">Valor Unitário *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={novoItem.valor_unitario}
                          onChange={(e) => handleItemChange("valor_unitario", e.target.value)}
                          className="mt-1 h-9 text-sm bg-white text-black" />

                      </div>

                      <div>
                        <Label className="text-xs text-slate-600 font-semibold">Desconto</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={novoItem.desconto_valor}
                          onChange={(e) => handleItemChange("desconto_valor", e.target.value)}
                          className="mt-1 h-9 text-sm bg-white text-black" />

                      </div>

                      <Button
                        type="button"
                        onClick={addItem}
                        size="sm"
                        className="bg-slate-800 hover:bg-slate-700 text-white h-9 text-xs px-6 whitespace-nowrap">
                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                    
                    <div className="text-sm font-semibold text-slate-900 bg-blue-50 rounded-lg p-3 border border-blue-200">
                      Total do Item: {formatCurrency(novoItem.valor_total)}
                    </div>
                  </div>
                </div>

                {/* Lista de itens */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-slate-900">Descrição</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-900 text-center w-24">Qtd</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-900 text-right w-32">V. Unit.</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-900 text-right w-32">Desconto</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-900 text-right w-36">Total</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-900 text-center w-28">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.itens.length === 0 ?
                      <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                            Nenhum item adicionado
                          </TableCell>
                        </TableRow> :

                      formData.itens.map((item, index) =>
                      <TableRow key={item.id} className="text-xs">
                            <TableCell className="font-medium text-slate-900">{item.descricao}</TableCell>
                            <TableCell className="text-center text-slate-900">
                              {editingItemIndex === index ?
                          <Input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => updateItemField(index, "quantidade", e.target.value)}
                            className="w-20 h-8 text-xs text-center bg-white text-black" /> :


                          item.quantidade
                          }
                            </TableCell>
                            <TableCell className="text-right text-slate-900">
                              {editingItemIndex === index ?
                          <Input
                            type="number"
                            step="0.01"
                            value={item.valor_unitario}
                            onChange={(e) => updateItemField(index, "valor_unitario", e.target.value)}
                            className="w-28 h-8 text-xs text-right bg-white text-black" /> :


                          formatCurrency(item.valor_unitario)
                          }
                            </TableCell>
                            <TableCell className="text-right text-slate-900">
                              {editingItemIndex === index ?
                          <Input
                            type="number"
                            step="0.01"
                            value={item.desconto_valor}
                            onChange={(e) => updateItemField(index, "desconto_valor", e.target.value)}
                            className="w-28 h-8 text-xs text-right bg-white text-black" /> :


                          formatCurrency(item.desconto_valor)
                          }
                            </TableCell>
                            <TableCell className="text-right font-semibold text-slate-900">
                              {formatCurrency(item.valor_total)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
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
              <div className="bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase text-slate-600 font-semibold">Forma de Pagamento</Label>
                    <SmartInput
                      options={formasPagamento.map((f) => ({ value: f.id, label: f.nome }))}
                      value={formData.forma_pagamento_id}
                      onChange={(v) => setFormData((prev) => ({ ...prev, forma_pagamento_id: v }))}
                      placeholder="Selecione"
                      className="mt-1.5" />

                  </div>

                  <div>
                    <Label className="text-xs uppercase text-slate-600 font-semibold">Condição de Pagamento</Label>
                    <SmartInput
                      options={condicoesPagamento.map((c) => ({ value: c.id, label: c.nome }))}
                      value={formData.condicao_pagamento_id}
                      onChange={(v) => setFormData((prev) => ({ ...prev, condicao_pagamento_id: v }))}
                      placeholder="Selecione"
                      className="mt-1.5" />

                  </div>

                  <div>
                    <Label className="text-xs uppercase text-slate-600 font-semibold">Valor de Entrada</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.entrada}
                      onChange={(e) => setFormData((prev) => ({ ...prev, entrada: Number(e.target.value) }))}
                      className="mt-1.5 h-9 text-sm bg-white text-black" />

                  </div>

                  <div>
                    <Label className="text-xs uppercase text-slate-600 font-semibold">Outras Despesas</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.outras_despesas}
                      onChange={(e) => setFormData((prev) => ({ ...prev, outras_despesas: Number(e.target.value) }))}
                      className="mt-1.5 h-9 text-sm bg-white text-black" />

                  </div>

                  <div>
                    <Label className="text-xs uppercase text-slate-600 font-semibold">Desconto (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.desconto_valor}
                      onChange={(e) => setFormData((prev) => ({ ...prev, desconto_valor: Number(e.target.value) }))}
                      className="mt-1.5 h-9 text-sm bg-white text-black" />

                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Observações */}
            <TabsContent value="observacoes" className="p-0 m-0">
              <div className="bg-white">
                <Label className="text-xs uppercase text-slate-600 font-semibold">Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                  rows={10}
                  className="mt-1.5 text-sm resize-none bg-white text-black"
                  placeholder="Digite observações sobre este orçamento..." />

              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center px-5 py-3.5 border-t border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg">
            <p className="text-xs font-medium text-slate-500">Total Previsto</p>
            <p className="text-base font-bold text-slate-900">{formatCurrency(valorTotalOrcamento)}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-5">
              {isSaving ?
              <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </> :

              <>
                  <Save className="w-4 h-4 mr-2" />
                  {orcamento ? "Salvar" : "Criar"}
                </>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}