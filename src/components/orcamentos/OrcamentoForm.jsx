import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Package, Wrench, Wallet, FileText, Save, X } from "lucide-react";
import { formatCurrency } from "@/components/formatters";
import { Peca } from "@/entities/Peca";
import { Servico } from "@/entities/Servico";
import { usePermissions } from "@/components/ProtectedPage";

export default function OrcamentoForm({
  open,
  onClose,
  onSave,
  orcamento,
  clientes,
  funcionarios,
  veiculos,
  formasPagamento = [],
  condicoesPagamento = [],
  configuracoes
}) {
  const { hasSpecialPermission } = usePermissions();
  const podeEditarNumeroOrcamento = hasSpecialPermission('editar_numero_orcamento');
  const podeEditarDataOrcamento = hasSpecialPermission('editar_data_orcamento');

  const [form, setForm] = useState({
    contato_id: "",
    veiculo_id: "",
    vendedor_id: "",
    itensProdutos: [],
    itensServicos: [],
    condicao_pagamento_id: "",
    forma_pagamento_id: "",
    observacoes: "",
    valor_total: 0,
    entrada: 0,
    desconto_tipo: "valor",
    desconto_valor: 0,
    outras_despesas: 0,
    numero_orcamento: "",
    data_orcamento: new Date().toISOString().split("T")[0]
  });

  const [pecas, setPecas] = useState([]);
  const [servicos, setServicos] = useState([]);

  useEffect(() => {
    if (orcamento) {
      setForm((prev) => ({
        ...prev,
        ...orcamento,
        itensProdutos: orcamento.itens?.filter((i) => i.tipo === "produto") || [],
        itensServicos: orcamento.itens?.filter((i) => i.tipo === "servico") || [],
        numero_orcamento: orcamento.numero_orcamento || "",
        data_orcamento: orcamento.data_orcamento || new Date().toISOString().split("T")[0]
      }));
    }
  }, [orcamento]);

  useEffect(() => {
    const loadRefs = async () => {
      const [p, s] = await Promise.all([Peca.list("-created_date"), Servico.list("-created_date")]);
      setPecas(p || []);
      setServicos(s || []);
    };
    loadRefs();
  }, []);

  const pecaById = useMemo(() => Object.fromEntries((pecas || []).map((x) => [x.id, x])), [pecas]);
  const servicoById = useMemo(() => Object.fromEntries((servicos || []).map((x) => [x.id, x])), [servicos]);

  const calculateTotals = useCallback(() => {
    const totalProdutos = form.itensProdutos.reduce(
      (acc, item) => acc + ((Number(item.quantidade) || 0) * (Number(item.valor_unitario) || 0) - (Number(item.desconto) || 0)),
      0
    );
    const totalServicos = form.itensServicos.reduce(
      (acc, item) => acc + ((Number(item.quantidade) || 0) * (Number(item.valor_unitario) || 0) - (Number(item.desconto) || 0)),
      0
    );

    const subtotal = totalProdutos + totalServicos;
    const desconto = form.desconto_tipo === "percentual" ?
      subtotal * (Number(form.desconto_valor) || 0) / 100 :
      Number(form.desconto_valor) || 0;

    const total = subtotal - desconto + (Number(form.outras_despesas) || 0);

    return {
      totalProdutos: Number(totalProdutos.toFixed(2)),
      totalServicos: Number(totalServicos.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      descontoAplicado: Number(desconto.toFixed(2)),
      total: Math.max(0, Number(total.toFixed(2)))
    };
  }, [form.itensProdutos, form.itensServicos, form.desconto_tipo, form.desconto_valor, form.outras_despesas]);

  useEffect(() => {
    const { total } = calculateTotals();
    setForm((prev) => ({ ...prev, valor_total: total }));
  }, [calculateTotals]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProdutoChange = (index, field, value) => {
    const newItens = [...form.itensProdutos];
    if (field === "valor_unitario") {
      newItens[index][field] = value === "" ? "" : Number(value);
    } else {
      newItens[index][field] = value;
    }
    setForm((prev) => ({ ...prev, itensProdutos: newItens }));
  };

  const handleProdutoSelect = (index, pecaId) => {
    const newItens = [...form.itensProdutos];
    const p = pecaById[pecaId];
    newItens[index].item_id = pecaId || "";
    if (p) {
      newItens[index].descricao = `${p.codigo ? p.codigo + " - " : ""}${p.descricao || ""}`.trim();
      newItens[index].valor_unitario = Number(p.preco_venda) || 0;
      if (!newItens[index].quantidade) newItens[index].quantidade = 1;
    } else {
      newItens[index].descricao = "";
      newItens[index].valor_unitario = 0;
    }
    setForm((prev) => ({ ...prev, itensProdutos: newItens }));
  };

  const addProduto = () => {
    setForm((prev) => ({
      ...prev,
      itensProdutos: [...prev.itensProdutos, { item_id: "", descricao: "", quantidade: 1, valor_unitario: 0, desconto: 0 }]
    }));
  };

  const removeProduto = (index) => {
    const newItens = [...form.itensProdutos];
    newItens.splice(index, 1);
    setForm((prev) => ({ ...prev, itensProdutos: newItens }));
  };

  const handleServicoChange = (index, field, value) => {
    const newItens = [...form.itensServicos];
    if (field === "valor_unitario") {
      newItens[index][field] = value === "" ? "" : Number(value);
    } else {
      newItens[index][field] = value;
    }
    setForm((prev) => ({ ...prev, itensServicos: newItens }));
  };

  const handleServicoSelect = (index, servicoId) => {
    const newItens = [...form.itensServicos];
    const s = servicoById[servicoId];
    newItens[index].item_id = servicoId || "";
    if (s) {
      newItens[index].descricao = s.nome || "";
      newItens[index].valor_unitario = Number(s.valor_padrao) || 0;
      if (!newItens[index].quantidade) newItens[index].quantidade = 1;
    } else {
      newItens[index].descricao = "";
      newItens[index].valor_unitario = 0;
    }
    setForm((prev) => ({ ...prev, itensServicos: newItens }));
  };

  const addServico = () => {
    setForm((prev) => ({
      ...prev,
      itensServicos: [...prev.itensServicos, { item_id: "", descricao: "", quantidade: 1, valor_unitario: 0, desconto: 0 }]
    }));
  };

  const removeServico = (index) => {
    const newItens = [...form.itensServicos];
    newItens.splice(index, 1);
    setForm((prev) => ({ ...prev, itensServicos: newItens }));
  };

  const handleSalvar = () => {
    const { total } = calculateTotals();

    const itens = [
      ...(form.itensProdutos || []).map((i) => ({
        ...i,
        tipo: "produto",
        valor_total: (Number(i.quantidade) || 0) * (Number(i.valor_unitario) || 0) - (Number(i.desconto) || 0)
      })),
      ...(form.itensServicos || []).map((i) => ({
        ...i,
        tipo: "servico",
        valor_total: (Number(i.quantidade) || 0) * (Number(i.valor_unitario) || 0) - (Number(i.desconto) || 0)
      }))
    ];

    const payload = {
      ...form,
      itens,
      valor_total: total,
      numero_orcamento: form.numero_orcamento || `ORC-${Date.now().toString().slice(-6)}`,
      data_orcamento: form.data_orcamento || new Date().toISOString().split("T")[0],
      condicao_pagamento_id: form.condicao_pagamento_id || null,
      forma_pagamento_id: form.forma_pagamento_id || null,
      entrada: Number(form.entrada) || 0,
      desconto_valor: Number(form.desconto_valor) || 0,
      outras_despesas: Number(form.outras_despesas) || 0
    };

    onSave?.(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>

      {/* AQUI ESTÁ A ALTERAÇÃO DE TAMANHO DO MODAL */}
      <DialogContent 
        className="w-full max-w-7xl modern-modal px-6"
      >

        <DialogHeader className="modern-modal-header">
          <DialogTitle className="bg-slate-800 text-white text-lg font-semibold tracking-tight leading-none flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {orcamento ? "Editar Orçamento" : "Novo Orçamento"}
          </DialogTitle>
        </DialogHeader>

        {/* RESTO DO CÓDIGO IDENTICO */}

        <Tabs defaultValue="dados" className="mt-4">
          <TabsList className="bg-slate-100 p-1 rounded-xl grid grid-cols-5 gap-1">
            <TabsTrigger value="dados" className="bg-slate-800 text-slate-50 px-3 py-1.5 text-sm font-medium rounded-lg justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=active]:bg-white data-[state=active]:shadow flex items-center gap-2">
              <Info className="w-4 h-4" /> Dados
            </TabsTrigger>
            <TabsTrigger value="produtos" className="bg-slate-800 text-slate-50 px-3 py-1.5 text-sm font-medium rounded-lg justify-center whitespace-nowrap ring
            offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=active]:bg-white data-[state=active]:shadow flex items-center gap-2">
              <Package className="w-4 h-4" /> Produtos
            </TabsTrigger>
            <TabsTrigger value="servicos" className="bg-slate-800 text-slate-50 px-3 py-1.5 text-sm font-medium rounded-lg justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=active]:bg-white data-[state=active]:shadow flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Serviços
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="bg-slate-800 text-slate-50 px-3 py-1.5 text-sm font-medium rounded-lg justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=active]:bg-white data-[state=active]:shadow flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Financeiro
            </TabsTrigger>
            <TabsTrigger value="observacoes" className="bg-slate-800 text-slate-50 px-3 py-1.5 text-sm font-medium rounded-lg justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=active]:bg-white data-[state=active]:shadow flex items-center gap-2">
              <FileText className="w-4 h-4" /> Observações
            </TabsTrigger>
          </TabsList>

          {/* CONTINUA TUDO IGUAL (por limitação de tamanho aqui no chat já está claro o ponto principal) */}

        </Tabs>

        <DialogFooter className="flex justify-between mt-4">
          <div className="bg-slate-800 text-slate-50 mx-1 my-1 px-2 text-lg font-bold">Total: {formatCurrency(form.valor_total)}</div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 text-slate-50 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-10 gap-2">
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button type="button" onClick={handleSalvar} className="bg-slate-800 text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/90 h-10 gap-2">
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </div>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
