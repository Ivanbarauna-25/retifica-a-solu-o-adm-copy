import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import EstoqueForm from '@/components/EstoqueForm';
import AdvancedSearchFilters from '@/components/filters/AdvancedSearchFilters';
import { useAdvancedFilters } from '@/components/filters/useAdvancedFilters';
import StandardDialog, { useStandardDialog } from '@/components/ui/StandardDialog';
import {
  Plus, Pencil, Trash2, Package, AlertTriangle, DollarSign,
  Loader2, Filter, ChevronDown, MoreHorizontal, Printer
} from 'lucide-react';
import { formatCurrency } from '@/components/formatters';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function EstoquePage() {
  const [pecas, setPecas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState(null);
  const [advancedFilters, setAdvancedFilters] = useState(null);
  const { toast } = useToast();
  const { showDanger, closeDialog, DialogComponent } = useStandardDialog();

  const fetchPecas = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.Peca.list('-created_date');
      setPecas(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPecas(); }, []);

  const handleSave = async (data) => {
    if (selectedPeca) {
      await base44.entities.Peca.update(selectedPeca.id, data);
    } else {
      await base44.entities.Peca.create(data);
    }
    setIsFormOpen(false);
    setSelectedPeca(null);
    await fetchPecas();
  };

  const handleDelete = (peca) => {
    showDanger(
      'Excluir Peça',
      `Tem certeza que deseja excluir "${peca.descricao}"? Esta ação não pode ser desfeita.`,
      async () => {
        await base44.entities.Peca.delete(peca.id);
        toast({ title: '✅ Peça excluída com sucesso.' });
        await fetchPecas();
        closeDialog();
      }
    );
  };

  const openForm = (peca = null) => { setSelectedPeca(peca); setIsFormOpen(true); };

  const handlePrint = () => { window.print(); };

  const searchFields = [
    { key: 'codigo', label: 'Código' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'fabricante', label: 'Fabricante' },
    { key: 'localizacao', label: 'Localização' },
  ];
  const filterFields = [{
    key: 'tipo_entrada', label: 'Tipo',
    options: [
      { value: 'consumo', label: 'Consumo' },
      { value: 'revenda', label: 'Revenda' },
      { value: 'remessa', label: 'Remessa' },
      { value: 'uso_consumo', label: 'Uso/Consumo' },
      { value: 'ativo_imobilizado', label: 'Ativo Imobilizado' },
    ]
  }];
  const sortFields = [
    { key: 'descricao', label: 'Descrição' },
    { key: 'codigo', label: 'Código' },
    { key: 'quantidade_estoque', label: 'Quantidade' },
    { key: 'preco_venda', label: 'Preço Venda' },
    { key: 'created_date', label: 'Data Cadastro' },
  ];

  const pecasFiltradas = useAdvancedFilters(pecas, advancedFilters);

  const stats = {
    totalProdutos: pecas.length,
    totalItens: pecas.reduce((a, p) => a + (Number(p.quantidade_estoque) || 0), 0),
    valorVenda: pecas.reduce((a, p) => a + ((Number(p.quantidade_estoque) || 0) * (Number(p.preco_venda) || 0)), 0),
    baixoEstoque: pecas.filter(p => (Number(p.quantidade_estoque) || 0) <= (Number(p.quantidade_minima) || 5)).length,
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center"><Loader2 className="h-10 w-10 animate-spin text-slate-400 mx-auto" /><p className="mt-3 text-slate-400">Carregando...</p></div>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact !important; }
          @page { size: A4 landscape; margin: 0.5cm; }
          table { font-size: 8px !important; }
          thead tr { background: #0B1629 !important; }
          thead th { color: white !important; }
        }
      `}</style>
      <Toaster />

      <div className="space-y-5">

        {/* ── KPI CARDS + AÇÕES ── */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">

            <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-300 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Produtos</p>
              <div className="flex items-end justify-between">
                <span className="text-[2.8rem] font-black text-slate-800 leading-none">{stats.totalProdutos}</span>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-1">
                  <Package className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">itens cadastrados</p>
            </div>

            <div className="relative bg-white rounded-2xl border border-blue-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-500 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Qtd. Total</p>
              <div className="flex items-end justify-between">
                <span className="text-[2.8rem] font-black text-blue-600 leading-none">{stats.totalItens}</span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-1">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">unidades em estoque</p>
            </div>

            <div className="relative bg-white rounded-2xl border border-emerald-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Valor em Estoque</p>
              <div className="flex items-end justify-between">
                <span className="text-xl font-black text-emerald-700 leading-none">{formatCurrency(stats.valorVenda)}</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-1">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">valor de venda total</p>
            </div>

            <div className="relative bg-white rounded-2xl border border-red-100 shadow-sm px-5 pt-5 pb-4 overflow-hidden hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500 rounded-t-2xl" />
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">Baixo Estoque</p>
              <div className="flex items-end justify-between">
                <span className="text-[2.8rem] font-black text-red-500 leading-none">{stats.baixoEstoque}</span>
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-1">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">abaixo do mínimo</p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-row lg:flex-col gap-2 lg:items-stretch lg:justify-center flex-shrink-0 no-print">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-[12px] font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  Ações
                  <ChevronDown className="w-3 h-3 opacity-40" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="py-2.5 text-sm cursor-pointer" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2.5 text-slate-400" />Imprimir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={() => openForm()}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl text-[13px] font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-200 whitespace-nowrap">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Novo Produto
            </button>
          </div>
        </div>

        {/* ── TABELA ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 no-print">
            <AdvancedSearchFilters
              entityName="estoque"
              searchFields={searchFields}
              filterFields={filterFields}
              dateField="created_date"
              sortFields={sortFields}
              defaultSort={{ field: 'descricao', direction: 'asc' }}
              onFiltersChange={setAdvancedFilters}
              placeholder="Buscar por código, descrição, fabricante..."
            />
          </div>

          <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 no-print">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">Resultados</span>
            <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {pecasFiltradas.length} produto{pecasFiltradas.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0B1629' }}>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Fabricante</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Estoque</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell whitespace-nowrap">P. Custo</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell whitespace-nowrap">P. Venda</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest no-print">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pecasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20">
                      <Package className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 text-sm font-semibold">Nenhum produto encontrado</p>
                      <p className="text-slate-300 text-xs mt-1">Tente ajustar os filtros ou cadastrar um novo produto</p>
                    </td>
                  </tr>
                ) : pecasFiltradas.map((peca, idx) => {
                  const baixo = (Number(peca.quantidade_estoque) || 0) <= (Number(peca.quantidade_minima) || 5);
                  return (
                    <tr key={peca.id}
                      className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/30 hover:bg-slate-50/80'}`}>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[13px] font-bold text-slate-700">{peca.codigo}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <span className="text-[13px] font-semibold text-slate-800 truncate block">{peca.descricao}</span>
                        {peca.localizacao && <span className="text-[10.5px] text-slate-400">{peca.localizacao}</span>}
                      </td>
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <span className="text-[12px] text-slate-500">{peca.fabricante || '—'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`text-[13px] font-bold tabular-nums ${baixo ? 'text-red-600' : 'text-slate-800'}`}>
                            {peca.quantidade_estoque || 0}
                          </span>
                          {baixo && <AlertTriangle className="w-3.5 h-3.5 text-red-400 no-print flex-shrink-0" />}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right hidden md:table-cell">
                        <span className="text-[12px] text-slate-500 tabular-nums">{formatCurrency(peca.preco_custo)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right hidden sm:table-cell">
                        <span className="text-[13px] font-bold text-slate-800 tabular-nums">{formatCurrency(peca.preco_venda)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                        <span style={{
                          background: baixo ? '#FEF2F2' : '#ECFDF5',
                          color: baixo ? '#991B1B' : '#065F46'
                        }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap">
                          <span style={{ background: baixo ? '#EF4444' : '#10B981', width: 6, height: 6, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
                          {baixo ? 'Baixo' : 'OK'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 no-print">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openForm(peca)} title="Editar"
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                            <Pencil className="w-[15px] h-[15px]" />
                          </button>
                          <button onClick={() => handleDelete(peca)} title="Excluir"
                            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 className="w-[15px] h-[15px]" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openForm(peca)} className="py-2.5 cursor-pointer">
                                <Pencil className="w-4 h-4 mr-2 text-amber-500" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(peca)} className="py-2.5 text-red-600 cursor-pointer">
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

      <EstoqueForm
        isOpen={isFormOpen}
        peca={selectedPeca}
        onSave={handleSave}
        onClose={() => { setIsFormOpen(false); setSelectedPeca(null); }}
      />

      <DialogComponent />
    </>
  );
}