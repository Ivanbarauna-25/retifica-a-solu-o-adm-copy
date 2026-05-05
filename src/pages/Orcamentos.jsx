import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import OrcamentoViewer from "@/components/orcamentos/OrcamentoViewer";
import OrcamentoFormModal from "@/components/orcamentos/OrcamentoFormModal";
import RelatorioOrcamentosFiltersModal from "@/components/orcamentos/RelatorioOrcamentosFiltersModal";
import ImportarOrcamentosModal from "@/components/orcamentos/ImportarOrcamentosModal";
import AdvancedSearchFilters from "@/components/filters/AdvancedSearchFilters";
import { useAdvancedFilters } from "@/components/filters/useAdvancedFilters";
import StandardDialog from "@/components/ui/StandardDialog";
import {
  Plus, Eye, Pencil, Trash2, FileText, BarChart3, Upload,
  Filter, ChevronDown, MoreHorizontal, Loader2,
  Clock, CheckCircle, XCircle, DollarSign, ClipboardList, MessageCircle, Printer
} from "lucide-react";
import { formatCurrency, formatDate } from "@/components/formatters";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const STATUS_CFG = {
  pendente:   { label: 'Pendente',   dot: '#F59E0B', bg: '#FFFBEB', color: '#92400E' },
  aprovado:   { label: 'Aprovado',   dot: '#10B981', bg: '#ECFDF5', color: '#065F46' },
  rejeitado:  { label: 'Rejeitado',  dot: '#EF4444', bg: '#FEF2F2', color: '#991B1B' },
  expirado:   { label: 'Expirado',   dot: '#9CA3AF', bg: '#F9FAFB', color: '#6B7280' },
  convertido: { label: 'Convertido', dot: '#3B82F6', bg: '#EFF6FF', color: '#1E40AF' },
  cancelado:  { label: 'Cancelado',  dot: '#6B7280', bg: '#F3F4F6', color: '#374151' },
};

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || { label: status, dot: '#9CA3AF', bg: '#F9FAFB', color: '#6B7280' };
  return (
    <span style={{ background: s.bg, color: s.color }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap">
      <span style={{ background: s.dot, width: 6, height: 6, borderRadius: '50%', flexShrink: 0, display: 'inline-block' }} />
      {s.label}
    </span>
  );
}

export default function OrcamentosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [orcamentoToDelete, setOrcamentoToDelete] = useState(null);
  const [pendingReportUrl, setPendingReportUrl] = useState(null);
  const [advancedFilters, setAdvancedFilters] = useState(null);

  const { data: orcamentos = [], isLoading } = useQuery({
    queryKey: ["orcamentos"],
    queryFn: () => base44.entities.Orcamento.list("-created_date")
  });
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: () => base44.entities.Cliente.list() });
  const { data: funcionarios = [] } = useQuery({ queryKey: ["funcionarios"], queryFn: () => base44.entities.Funcionario.list() });
  const { data: veiculos = [] } = useQuery({ queryKey: ["veiculos"], queryFn: () => base44.entities.Veiculo.list() });
  const { data: formasPagamento = [] } = useQuery({ queryKey: ["formasPagamento"], queryFn: () => base44.entities.FormaPagamento.list() });
  const { data: condicoesPagamento = [] } = useQuery({ queryKey: ["condicoesPagamento"], queryFn: () => base44.entities.CondicaoPagamento.list() });
  const { data: configuracoes } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => { const d = await base44.entities.Configuracoes.list(); return d?.[0] || null; }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Orcamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      toast({ title: "✅ Orçamento excluído com sucesso!" });
    },
    onError: (err) => toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" })
  });

  const mapCliente = useMemo(() => Object.fromEntries(clientes.map(c => [c.id, c.nome])), [clientes]);
  const mapFuncionario = useMemo(() => Object.fromEntries(funcionarios.map(f => [f.id, f.nome])), [funcionarios]);
  const mapVeiculoPlaca = useMemo(() => Object.fromEntries(veiculos.map(v => [v.id, v.placa])), [veiculos]);
  const mapCondicao = useMemo(() => Object.fromEntries(condicoesPagamento.map(c => [c.id, c.nome])), [condicoesPagamento]);
  const mapForma = useMemo(() => Object.fromEntries(formasPagamento.map(f => [f.id, f.nome])), [formasPagamento]);

  const orcamentosComCampos = useMemo(() => orcamentos.map(o => ({
    ...o,
    _clienteNome: mapCliente[o.contato_id || o.cliente_id] || '',
    _vendedorNome: mapFuncionario[o.vendedor_id] || '',
  })), [orcamentos, mapCliente, mapFuncionario]);

  const filteredOrcamentos = useAdvancedFilters(orcamentosComCampos, advancedFilters);

  const resumo = useMemo(() => ({
    total: orcamentos.length,
    pendentes: orcamentos.filter(o => o.status === 'pendente').length,
    aprovados: orcamentos.filter(o => o.status === 'aprovado').length,
    convertidos: orcamentos.filter(o => o.status === 'convertido').length,
    valorTotal: orcamentos.reduce((s, o) => s + (o.valor_total || 0), 0),
  }), [orcamentos]);

  const handleNew = () => { setSelectedOrcamento(null); setShowForm(true); };
  const handleEdit = (o) => { setSelectedOrcamento(o); setShowForm(true); };
  const handleView = (o) => { setSelectedOrcamento(o); setShowViewer(true); };
  const handleDelete = (o) => { setOrcamentoToDelete(o); setConfirmDeleteOpen(true); };
  const confirmarExclusao = () => { if (orcamentoToDelete) { deleteMutation.mutate(orcamentoToDelete.id); } setConfirmDeleteOpen(false); setOrcamentoToDelete(null); };
  const handleFormSaved = (saved) => { setShowForm(false); setSelectedOrcamento(saved); setShowViewer(true); queryClient.invalidateQueries({ queryKey: ["orcamentos"] }); };

  const onGenerateRelatorio = (f) => {
    const params = new URLSearchParams();
    if (f.status && f.status !== "todos") { params.append("status", f.status); params.append("statusLabel", STATUS_CFG[f.status]?.label || ""); }
    if (f.numeroOrcamento) params.append("numeroOrcamento", f.numeroOrcamento);
    if (f.clienteId) { params.append("clienteId", f.clienteId); params.append("clienteNome", mapCliente[f.clienteId] || ""); }
    if (f.vendedorId && f.vendedorId !== "todos") { params.append("vendedorId", f.vendedorId); params.append("vendedorNome", mapFuncionario[f.vendedorId] || ""); }
    if (f.veiculoId) { params.append("veiculoId", f.veiculoId); params.append("veiculoPlaca", mapVeiculoPlaca[f.veiculoId] || ""); }
    if (f.condicaoId) { params.append("condicaoId", f.condicaoId); params.append("condicaoNome", mapCondicao[f.condicaoId] || ""); }
    if (f.formaId) { params.append("formaId", f.formaId); params.append("formaNome", mapForma[f.formaId] || ""); }
    if (f.dataInicio) params.append("dataInicio", f.dataInicio);
    if (f.dataFim) params.append("dataFim", f.dataFim);
    params.append("incluirDespesas", f.incluirDespesas ? "1" : "0");
    if (f.situacao && f.situacao !== "todos") params.append("situacao", f.situacao);
    setPendingReportUrl(`/RelatorioOrcamentos?${params.toString()}`);
    setShowRelatorioModal(false);
  };

  useEffect(() => {
    if (!showRelatorioModal && pendingReportUrl) { window.open(pendingReportUrl, "_blank"); setPendingReportUrl(null); }
  }, [showRelatorioModal, pendingReportUrl]);

  const searchFields = [
    { key: 'numero_orcamento', label: 'Nº Orçamento' },
    { key: '_clienteNome', label: 'Cliente' },
    { key: '_vendedorNome', label: 'Vendedor' },
  ];
  const filterFields = [{
    key: 'status', label: 'Status',
    options: Object.entries(STATUS_CFG).map(([v, c]) => ({ value: v, label: c.label }))
  }];
  const sortFields = [
    { key: 'data_orcamento', label: 'Data' },
    { key: 'numero_orcamento', label: 'Número' },
    { key: 'valor_total', label: 'Valor Total' },
    { key: 'created_date', label: 'Data Criação' },
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center"><Loader2 className="h-10 w-10 animate-spin text-slate-400 mx-auto" /><p className="mt-3 text-slate-400">Carregando...</p></div>
    </div>
  );

  return (
    <>
      <Toaster />
      <div className="space-y-5">

        {/* ── KPI CARDS + AÇÕES ── */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">

            <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-300 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total</p>
              <div className="flex items-end justify-between">
                <span className="text-[2.8rem] font-black text-slate-800 leading-none">{resumo.total}</span>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-1">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">todos os orçamentos</p>
            </div>

            <div className="relative bg-white rounded-2xl border border-amber-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-400 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Pendentes</p>
              <div className="flex items-end justify-between">
                <span className="text-[2.8rem] font-black text-amber-500 leading-none">{resumo.pendentes}</span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-1">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">aguardando aprovação</p>
            </div>

            <div className="relative bg-white rounded-2xl border border-emerald-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Aprovados</p>
              <div className="flex items-end justify-between">
                <span className="text-[2.8rem] font-black text-emerald-600 leading-none">{resumo.aprovados}</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-1">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">{resumo.convertidos} convertido{resumo.convertidos !== 1 ? 's' : ''}</p>
            </div>

            <div className="relative bg-white rounded-2xl border border-blue-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-500 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Valor Total</p>
              <div className="flex items-end justify-between">
                <span className="text-xl font-black text-blue-700 leading-none">{formatCurrency(resumo.valorTotal)}</span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-1">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">soma de todos</p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-row lg:flex-col gap-2 lg:items-stretch lg:justify-center flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-[13px] font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap">
                  <Filter className="w-4 h-4 text-slate-400" />
                  Ações
                  <ChevronDown className="w-3.5 h-3.5 opacity-40" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="py-2.5 text-sm cursor-pointer" onClick={() => setShowRelatorioModal(true)}>
                  <BarChart3 className="w-4 h-4 mr-2.5 text-slate-400" />Gerar Relatório
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="py-2.5 text-sm cursor-pointer" onClick={() => setShowImportModal(true)}>
                  <Upload className="w-4 h-4 mr-2.5 text-slate-400" />Importar
                </DropdownMenuItem>
                <DropdownMenuItem className="py-2.5 text-sm cursor-pointer" asChild>
                  <a href={base44.agents.getWhatsAppConnectURL('orcamento_importer')} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2.5 text-green-500" />WhatsApp
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={handleNew}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl text-[13px] font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-200 whitespace-nowrap">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Novo Orçamento
            </button>
          </div>
        </div>

        {/* ── TABELA ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <AdvancedSearchFilters
              entityName="orcamentos"
              searchFields={searchFields}
              filterFields={filterFields}
              dateField="data_orcamento"
              sortFields={sortFields}
              defaultSort={{ field: 'data_orcamento', direction: 'desc' }}
              onFiltersChange={setAdvancedFilters}
              placeholder="Buscar por nº, cliente, vendedor..."
            />
          </div>

          <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/70 border-b border-slate-100">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">Resultados</span>
            <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {filteredOrcamentos.length} registro{filteredOrcamentos.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0B1629' }}>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Nº</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap hidden sm:table-cell">Data</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Veículo</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Vendedor</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell whitespace-nowrap">Valor</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrcamentos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20">
                      <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 text-sm font-semibold">Nenhum orçamento encontrado</p>
                      <p className="text-slate-300 text-xs mt-1">Tente ajustar os filtros ou criar um novo</p>
                    </td>
                  </tr>
                ) : filteredOrcamentos.map((o, idx) => {
                  const veiculo = veiculos.find(v => v.id === o.veiculo_id);
                  const veiculoTexto = veiculo ? `${veiculo.modelo || ''} ${veiculo.placa ? `(${veiculo.placa})` : ''}`.trim() : '—';
                  return (
                    <tr key={o.id}
                      className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/30 hover:bg-slate-50/80'}`}>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button onClick={() => handleView(o)} className="text-blue-600 font-bold text-[13px] hover:text-blue-800 hover:underline transition-colors">
                          {o.numero_orcamento}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-[12px] text-slate-500 whitespace-nowrap hidden sm:table-cell font-medium tabular-nums">
                        {formatDate(o.data_orcamento)}
                      </td>
                      <td className="py-3.5 px-4 max-w-[180px]">
                        <span className="text-[13px] font-semibold text-slate-800 truncate block">{mapCliente[o.contato_id || o.cliente_id] || '—'}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[140px] hidden md:table-cell">
                        <span className="text-[12px] text-slate-500 truncate block">{veiculoTexto}</span>
                      </td>
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <span className="text-[12px] text-slate-500">{mapFuncionario[o.vendedor_id] || '—'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right hidden md:table-cell">
                        <span className="text-[13px] font-bold text-slate-800 tabular-nums">{formatCurrency(o.valor_total || 0)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleView(o)} title="Visualizar"
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <Eye className="w-[15px] h-[15px]" />
                          </button>
                          <button onClick={() => handleEdit(o)} title="Editar"
                            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                            <Pencil className="w-[15px] h-[15px]" />
                          </button>
                          <button onClick={() => handleDelete(o)} title="Excluir"
                            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 className="w-[15px] h-[15px]" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => handleView(o)} className="py-2.5 cursor-pointer">
                                <Eye className="w-4 h-4 mr-2 text-blue-500" />Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(o)} className="py-2.5 cursor-pointer">
                                <Pencil className="w-4 h-4 mr-2 text-amber-500" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(o)} className="py-2.5 text-red-600 cursor-pointer">
                                <Trash2 className="w-4 h-4 mr-2" />Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modais */}
      {showForm && (
        <OrcamentoFormModal
          isOpen={showForm}
          onClose={() => { setShowForm(false); setSelectedOrcamento(null); }}
          onSaved={handleFormSaved}
          orcamento={selectedOrcamento}
          clientes={clientes}
          funcionarios={funcionarios}
          veiculos={veiculos}
          formasPagamento={formasPagamento}
          condicoesPagamento={condicoesPagamento}
        />
      )}

      {showViewer && selectedOrcamento && (
        <OrcamentoViewer
          isOpen={showViewer}
          onClose={() => { setShowViewer(false); setSelectedOrcamento(null); }}
          orcamento={selectedOrcamento}
          onEdit={handleEdit}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["orcamentos"] })}
          clientes={clientes}
          veiculos={veiculos}
          funcionarios={funcionarios}
          configuracoes={configuracoes}
        />
      )}

      <RelatorioOrcamentosFiltersModal
        isOpen={showRelatorioModal}
        onClose={() => setShowRelatorioModal(false)}
        onGenerate={onGenerateRelatorio}
        clientes={clientes}
        funcionarios={funcionarios}
        veiculos={veiculos}
        condicoes={condicoesPagamento}
        formas={formasPagamento}
      />

      {showImportModal && (
        <ImportarOrcamentosModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { setShowImportModal(false); queryClient.invalidateQueries({ queryKey: ["orcamentos"] }); }}
        />
      )}

      <StandardDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={confirmarExclusao}
        title="Excluir Orçamento"
        description={orcamentoToDelete ? `O orçamento ${orcamentoToDelete.numero_orcamento} será permanentemente excluído. Esta ação não pode ser desfeita.` : ''}
        variant="danger"
        confirmText="Sim, excluir"
        cancelText="Cancelar"
      />
    </>
  );
}