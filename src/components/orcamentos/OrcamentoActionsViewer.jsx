import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


import {
  Pencil,
  CheckCircle2,
  XCircle,
  Printer,
  FileText,
  Wallet,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Info,
  User as UserIcon,
  Car as CarIcon,
  DollarSign
} from "lucide-react";
import { formatCurrency, formatDate } from "@/components/formatters";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function OrcamentoActionsViewer(props) {
  const {
    open,
    onClose,
    orcamento,
    clientes = [],
    funcionarios = [],
    veiculos = [],
    configuracoes = {},
    formasPagamento = [],
    condicoesPagamento = [],
    onEdit,
    onApprove,
    onConvert,
    onCancel,
    onOpenDespesas,
    onOpenLancamentos
  } = props;

  const hasData = !!open && !!orcamento;

  const [confirmAction, setConfirmAction] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('geral');
  const tabsOrder = ['geral', 'itens', 'financeiro', 'observacoes'];
  const nextTab = () => setActiveTab((t) => tabsOrder[Math.min(tabsOrder.indexOf(t) + 1, tabsOrder.length - 1)]);
  const prevTab = () => setActiveTab((t) => tabsOrder[Math.max(tabsOrder.indexOf(t) - 1, 0)]);

  const cliente = useMemo(
    () => clientes.find((c) => c.id === orcamento?.contato_id),
    [clientes, orcamento]
  );
  const vendedor = useMemo(
    () => funcionarios.find((f) => f.id === orcamento?.vendedor_id),
    [funcionarios, orcamento]
  );
  const veiculo = useMemo(
    () => veiculos.find((v) => v.id === orcamento?.veiculo_id),
    [veiculos, orcamento]
  );

  const clienteNome = React.useMemo(() => {
    if (!orcamento) return "";
    if (orcamento.contato_tipo === 'cliente' && orcamento.contato_id) {
      return clientes.find((c) => c.id === orcamento.contato_id)?.nome || "";
    }
    if (orcamento.cliente_id) {
      return clientes.find((c) => c.id === orcamento.cliente_id)?.nome || "";
    }
    if (orcamento.contato_tipo === 'funcionario' && orcamento.contato_id) {
      return funcionarios.find((f) => f.id === orcamento.contato_id)?.nome || "";
    }
    return "";
  }, [orcamento, clientes, funcionarios]);

  const veiculoTexto = React.useMemo(() => {
    if (!orcamento?.veiculo_id) return "Nenhum veículo";
    const v = veiculos.find((v) => v.id === orcamento.veiculo_id);
    if (!v) return "Nenhum veículo";
    const parts = [v.marca, v.modelo].filter(Boolean).join(" ");
    return parts || v.placa || "Nenhum veículo";
  }, [orcamento, veiculos]);

  const statusConfig = {
    pendente: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
    aprovado: { label: "Aprovado", className: "bg-green-100 text-green-800" },
    rejeitado: { label: "Rejeitado", className: "bg-red-100 text-red-800" },
    expirado: { label: "Expirado", className: "bg-gray-200 text-gray-800" },
    convertido: { label: "Convertido", className: "bg-blue-100 text-blue-800" },
    cancelado: { label: "Cancelado", className: "bg-zinc-200 text-zinc-800" }
  };

  const st = statusConfig[orcamento?.status] || {
    label: orcamento?.status,
    className: "bg-slate-100 text-slate-800"
  };

  const valorProdutos = (orcamento?.itens || [])
    .filter((i) => i.tipo === "produto")
    .reduce(
      (acc, it) =>
        acc + (Number(it.quantidade || 0) * Number(it.valor_unitario || 0) - (Number(it.desconto_valor || it.desconto || 0) || 0)),
      0
    );

  const valorServicos = (orcamento?.itens || [])
    .filter((i) => i.tipo === "servico")
    .reduce(
      (acc, it) =>
        acc + (Number(it.quantidade || 0) * Number(it.valor_unitario || 0) - (Number(it.desconto_valor || it.desconto || 0) || 0)),
      0
    );

  const subtotal = valorProdutos + valorServicos;
  const desconto =
    orcamento?.desconto_tipo === "percentual"
      ? subtotal * (Number(orcamento?.desconto_valor) || 0) / 100
      : Number(orcamento?.desconto_valor) || 0;

  const total = Number(
    orcamento?.valor_total ??
    subtotal - desconto + (Number(orcamento?.outras_despesas) || 0)
  );

  const formaNome =
    formasPagamento.find((f) => f.id === orcamento?.forma_pagamento_id)?.nome ||
    "—";
  const condicaoNome =
    condicoesPagamento.find(
      (c) => c.id === orcamento?.condicao_pagamento_id
    )?.nome || "—";

  const status = orcamento?.status;
  const canApprove = status === "pendente";
  const canConvert = status === "aprovado";
  const canCancel = status !== "cancelado" && status !== "convertido";

  const safe = (v) => v === null || v === undefined || v === "null" ? "" : String(v);

  if (!orcamento) return null;

  return (
    <>
      <style>{`
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
          body * { visibility: hidden; }
          .printable-content, .printable-content * { visibility: visible; }
          .printable-content { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: auto;
            margin: 0; 
            padding: 0.5cm; 
            font-family: Inter, Arial, sans-serif; 
            color: #0f172a; 
            font-size: 11.5px; 
            line-height: 1.34; 
          }
          @page { size: A4 portrait; margin: 0.5cm; }
          .no-print { display: none !important; }

          .print-title { font-size: 18px; font-weight: 700; }
          .print-subtle { color: #475569; }

          .header-row { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 10px; }
          .company-box { display: flex; gap: 12px; }
          .company-box img { height: 38px; object-fit: contain; }
          .meta { text-align: right; }
          .meta .line { margin: 0; font-size: 10.5px; }

          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
          .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; break-inside: avoid; }

          .table-wrapper { overflow: visible; break-inside: avoid; }
          table.print-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .print-table th, .print-table td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
          .print-table th { background: #0f172a !important; color: #ffffff !important; font-weight: 600; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }

          .totals { display: flex; flex-direction: column; gap: 4px; }
          .totals .row { display: flex; justify-content: space-between; gap: 8px; }

          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 14px; }
          .signatures .line { border-top: 1px solid #94a3b8; margin-top: 22px; padding-top: 6px; text-align: center; }

          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .page-break { break-before: page; page-break-before: always; }
          
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <Dialog open={!!open} onOpenChange={(v) => !v && onClose?.()}>
        <DialogContent className="max-w-5xl w-[96%] max-h-[92vh] flex flex-col p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="bg-slate-800 text-white px-6 py-4 text-center flex flex-col space-y-1.5 sm:text-left from-slate-800 to-slate-700 no-print border-b border-slate-600">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-white">
                <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center shadow-inner">
                  <Info className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold">Orçamento</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300">Nº {orcamento.numero_orcamento}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize" style={{ backgroundColor: st.className.split(' ')[0].replace('bg-', '#'), color: st.className.split(' ')[1].replace('text-', '#') }}>
                      {orcamento.status || 'pendente'}
                    </span>
                  </div>
                </div>
              </DialogTitle>

              <TooltipProvider>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => onEdit?.(orcamento)} className="text-white hover:bg-white/10">
                        <Pencil className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => onOpenDespesas?.(orcamento)} className="text-white hover:bg-white/10">
                        <FileText className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Despesas</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => onOpenLancamentos?.(orcamento)} className="text-white hover:bg-white/10">
                        <Wallet className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Lançamentos</TooltipContent>
                  </Tooltip>

                  <div className="w-px h-6 bg-white/20 mx-1" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={!canApprove} onClick={() => setConfirmAction('approve')} className="text-white hover:bg-white/10">
                        <CheckCircle2 className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Aprovar</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={!canConvert} onClick={() => setConfirmAction('convert')} className="text-white hover:bg-white/10">
                        <Banknote className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Converter em OS</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={!canCancel} onClick={() => setConfirmAction('cancel')} className="text-red-300 hover:bg-white/10">
                        <XCircle className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancelar</TooltipContent>
                  </Tooltip>

                  <div className="w-px h-6 bg-white/20 mx-1" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => window.print()} className="text-white hover:bg-white/10">
                        <Printer className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Imprimir A4</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            {/* Chips de contexto */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/90 ring-1 ring-white/15 text-sm">
                <UserIcon className="w-3.5 h-3.5" /> {clienteNome || "Cliente não informado"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/90 ring-1 ring-white/15 text-sm">
                <CarIcon className="w-3.5 h-3.5" /> {veiculoTexto}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/90 ring-1 ring-white/15 text-sm">
                <DollarSign className="w-3.5 h-3.5" /> {formatCurrency(total)}
              </span>
            </div>
          </DialogHeader>

          {/* Navegação por abas */}
          <div className="px-6 pt-4 pb-2 bg-gradient-to-b from-white to-slate-50 border-b no-print">
            <div className="flex items-center justify-between gap-3">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-xl grid grid-cols-4 gap-1">
                  <TabsTrigger value="geral" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">Geral</TabsTrigger>
                  <TabsTrigger value="itens" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">Itens</TabsTrigger>
                  <TabsTrigger value="financeiro" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">Financeiro</TabsTrigger>
                  <TabsTrigger value="observacoes" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">Observações</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevTab} className="rounded-full">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextTab} className="rounded-full">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab}>

              <TabsContent value="geral" className="m-0">
                <div className="printable-content">
                  <div className="px-4 py-4 md:px-0 md:py-0">
                    {/* Cabeçalho empresa/orçamento */}
                    <div className="header-row avoid-break">
                      <div className="company-box">
                        {configuracoes?.logo_url && <img src={configuracoes.logo_url} alt="Logo" />}
                        <div>
                          <div className="print-title">{safe(configuracoes?.nome_empresa)}</div>
                          {!!configuracoes?.cnpj && <p className="print-subtle">CNPJ: {safe(configuracoes.cnpj)}</p>}
                          {!!configuracoes?.endereco && <p className="print-subtle">{safe(configuracoes.endereco)}</p>}
                          {(configuracoes?.telefone || configuracoes?.email) && (
                            <p className="print-subtle">
                              {safe(configuracoes.telefone) ? `Fone: ${safe(configuracoes.telefone)}` : ""}
                              {safe(configuracoes.email) ? ` • ${safe(configuracoes.email)}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="meta">
                        <p className="line"><strong>Orçamento</strong> #{orcamento?.numero_orcamento}</p>
                        <p className="line">Emissão: {formatDate(orcamento?.data_orcamento)}</p>
                        {!!orcamento?.data_validade && <p className="line">Validade: {formatDate(orcamento?.data_validade)}</p>}
                      </div>
                    </div>

                    {/* Cliente / Veículo */}
                    <div className="grid-2 section">
                      <div className="card">
                        <div className="label">Cliente</div>
                        <div className="font-semibold">{safe(cliente?.nome) || "—"}</div>
                        {!!cliente?.cpf_cnpj && <div className="print-subtle">CPF/CNPJ: {safe(cliente.cpf_cnpj)}</div>}
                        {(cliente?.telefone || cliente?.email) && (
                          <div className="print-subtle">
                            {safe(cliente?.telefone) ? `Tel: ${safe(cliente.telefone)}` : ""}
                            {safe(cliente?.email) ? ` • ${safe(cliente.email)}` : ""}
                          </div>
                        )}
                      </div>
                      {veiculo && (
                        <div className="card">
                          <div className="label">Veículo</div>
                          <div className="font-semibold">
                            {safe(veiculo.placa)} • {safe(veiculo.modelo)} {veiculo.ano ? `• ${safe(veiculo.ano)}` : ""}
                          </div>
                          <div className="print-subtle">
                            {safe(veiculo.marca) ? `${safe(veiculo.marca)} • ` : ""}{safe(veiculo.cor) || ""}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Produtos / Serviços */}
                    {["produto", "servico"].map((tipo) => {
                      const lista = (orcamento?.itens || []).filter((i) => i.tipo === tipo);
                      const subtotalTipo = lista.reduce((acc, it) => {
                        const totalItem = Number(it.quantidade || 0) * Number(it.valor_unitario || 0) - (Number(it.desconto_valor || it.desconto || 0) || 0);
                        const itemTotal = it.valor_total ?? totalItem;
                        return acc + (itemTotal || 0);
                      }, 0);
                      return (
                        <div key={tipo} className="section avoid-break">
                          <h3 className="font-semibold mb-2 capitalize">{tipo === "produto" ? "Produtos" : "Serviços"}</h3>
                          <div className="table-wrapper">
                            <table className="print-table">
                              <thead>
                                <tr>
                                  <th>Descrição</th>
                                  <th className="text-center" style={{ width: "60px" }}>Qtd</th>
                                  <th className="text-right" style={{ width: "120px" }}>Vlr. Unit.</th>
                                  <th className="text-right" style={{ width: "110px" }}>Desconto</th>
                                  <th className="text-right" style={{ width: "120px" }}>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lista.length ? (
                                  lista.map((it, idx) => {
                                    const totalItem = Number(it.quantidade || 0) * Number(it.valor_unitario || 0) - (Number(it.desconto_valor || it.desconto || 0) || 0);
                                    return (
                                      <tr key={`${tipo}-${idx}`}>
                                        <td>{safe(it.descricao) || "-"}</td>
                                        <td className="text-center">{it.quantidade || 0}</td>
                                        <td className="text-right">{formatCurrency(it.valor_unitario || 0)}</td>
                                        <td className="text-right">{formatCurrency(it.desconto_valor || it.desconto || 0)}</td>
                                        <td className="text-right">{formatCurrency(it.valor_total ?? totalItem)}</td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td className="text-center" colSpan={5}>
                                      Sem {tipo === "produto" ? "produtos" : "serviços"}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan={4} className="text-right"><strong>Subtotal de {tipo === "produto" ? "Produtos" : "Serviços"}</strong></td>
                                  <td className="text-right"><strong>{formatCurrency(subtotalTipo)}</strong></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      );
                    })}

                    {/* Observações */}
                    {orcamento?.observacoes && (
                      <div className="card section avoid-break">
                        <div className="label">Observações</div>
                        <div className="whitespace-pre-wrap">{safe(orcamento.observacoes)}</div>
                      </div>
                    )}

                    {/* Assinaturas */}
                    <div className="signatures section avoid-break">
                      <div>
                        <div className="line">Assinatura do Cliente</div>
                      </div>
                      <div>
                        <div className="line">Assinatura da Empresa</div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="itens" className="m-0 no-print">
                <div className="px-4 py-4 space-y-6">
                  {["produto", "servico"].map((tipo) => {
                    const lista = (orcamento?.itens || []).filter((i) => i.tipo === tipo);
                    return (
                      <div key={`tab-${tipo}`} className="avoid-break">
                        <h3 className="font-semibold capitalize mb-2">{tipo === "produto" ? "Produtos" : "Serviços"}</h3>
                        <div className="table-wrapper overflow-x-auto">
                          <table className="min-w-[720px] w-full border text-sm">
                            <thead className="bg-slate-800 text-white">
                              <tr>
                                <th className="p-2 text-left">Descrição</th>
                                <th className="p-2 text-right">Qtd</th>
                                <th className="p-2 text-right">Valor Unit.</th>
                                <th className="p-2 text-right">Desconto</th>
                                <th className="p-2 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lista.length ? (
                                lista.map((it, idx) => {
                                  const totalItem = Number(it.quantidade || 0) * Number(it.valor_unitario || 0) - (Number(it.desconto_valor || it.desconto || 0) || 0);
                                  return (
                                    <tr key={`${tipo}-${idx}-tab`} className="border-t">
                                      <td className="p-2">{safe(it.descricao) || "-"}</td>
                                      <td className="p-2 text-right">{it.quantidade || 0}</td>
                                      <td className="p-2 text-right">{formatCurrency(it.valor_unitario || 0)}</td>
                                      <td className="p-2 text-right">{formatCurrency(it.desconto_valor || it.desconto || 0)}</td>
                                      <td className="p-2 text-right">{formatCurrency(it.valor_total ?? totalItem)}</td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td className="p-2 text-center text-gray-500" colSpan={5}>
                                    Sem {tipo === "produto" ? "produtos" : "serviços"}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr className="border-t">
                                <td className="p-2 font-semibold text-right" colSpan={4}>
                                  Subtotal de {tipo === "produto" ? "Produtos" : "Serviços"}
                                </td>
                                <td className="p-2 text-right font-semibold">
                                  {formatCurrency(tipo === "produto" ? valorProdutos : valorServicos)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="financeiro" className="m-0 no-print">
                <div className="px-4 py-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card border rounded-md p-3">
                      <div className="text-sm font-semibold mb-2">Informações de Pagamento</div>
                      <div className="text-sm">Condição de Pagamento: <strong>{condicaoNome}</strong></div>
                      <div className="text-sm">Forma de Pagamento: <strong>{formaNome}</strong></div>
                      {orcamento?.vendedor_id && <div className="text-sm">Vendedor: <strong>{safe(vendedor?.nome)}</strong></div>}
                      {Number(orcamento?.entrada) > 0 && <div className="text-sm">Entrada: <strong>{formatCurrency(orcamento?.entrada)}</strong></div>}
                    </div>

                    <div className="card border rounded-md p-3">
                      <div className="text-sm font-semibold mb-2">Resumo Financeiro</div>
                      <div className="totals text-sm">
                        <div className="row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        <div className="row"><span>Desconto</span><span>{formatCurrency(desconto)}</span></div>
                        <div className="row"><span>Outras Despesas</span><span>{formatCurrency(orcamento?.outras_despesas || 0)}</span></div>
                        <div className="row font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
                      </div>
                    </div>
                  </div>
                  {(orcamento?.pagamentos || []).length > 0 && (
                    <div className="avoid-break mt-4">
                      <h3 className="font-semibold mb-2">Parcelas Geradas</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-[540px] w-full border text-sm">
                          <thead className="bg-slate-800 text-white">
                            <tr>
                              <th className="p-2 text-left">#</th>
                              <th className="p-2 text-center">Vencimento</th>
                              <th className="p-2 text-right">Valor</th>
                              <th className="p-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orcamento.pagamentos.map((p, i) => (
                              <tr key={p.id || i} className="border-t">
                                <td className="p-2 text-center">{p.numero_parcela || i + 1}</td>
                                <td className="p-2 text-center">{formatDate(p.data_vencimento)}</td>
                                <td className="p-2 text-right">{formatCurrency(p.valor || 0)}</td>
                                <td className="p-2 capitalize">{p.status || "pendente"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {
                    (orcamento?.pagamentos || []).length === 0 && (
                      <div className="text-center text-gray-500 p-4">Nenhuma parcela gerada para este orçamento.</div>
                    )
                  }
                </div>
              </TabsContent>

              <TabsContent value="observacoes" className="m-0 no-print">
                <div className="px-4 py-4">
                  <div className="border rounded-md p-3">
                    <div className="text-xs text-slate-500 mb-1">Observações</div>
                    <div className="whitespace-pre-wrap text-sm">{orcamento?.observacoes || "—"}</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmações */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction === 'approve') onApprove?.(orcamento);
          if (confirmAction === 'convert') onConvert?.(orcamento);
          if (confirmAction === 'cancel') onCancel?.(orcamento);
          setConfirmAction(null);
        }}
        title={
          confirmAction === 'approve' ? 'Confirmar aprovação' :
          confirmAction === 'convert' ? 'Confirmar conversão' :
          confirmAction === 'cancel' ? 'Confirmar cancelamento' : ''
        }
        description={
          confirmAction === 'approve' ? 'Deseja realmente aprovar este orçamento? Esta ação o tornará apto para conversão em Ordem de Serviço.' :
          confirmAction === 'convert' ? 'Deseja realmente converter este orçamento em Ordem de Serviço? Esta ação é irreversível e criará uma nova OS.' :
          confirmAction === 'cancel' ? 'Deseja realmente cancelar este orçamento? Esta ação não poderá ser desfeita.' : ''
        }
        confirmText={
          confirmAction === 'approve' ? 'Aprovar Orçamento' :
          confirmAction === 'convert' ? 'Converter em OS' :
          confirmAction === 'cancel' ? 'Cancelar Orçamento' : 'Confirmar'
        }
        confirmVariant={confirmAction === 'cancel' ? 'destructive' : 'default'}
      />
    </>
  );
}