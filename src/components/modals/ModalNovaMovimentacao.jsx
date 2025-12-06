import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, X, ArrowRight, ArrowLeft, Wallet, FileText, CreditCard, DollarSign, Paperclip, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SearchableContactSelect from '@/components/SearchableContactSelect';
import { formatCurrency } from '@/components/formatters';
import { base44 as base44Client } from "@/api/base44Client";

export default function ModalNovaMovimentacao({
  open,
  onClose,
  onSubmit,
  movimentacao,
  contasBancarias = [],
  formasPagamento = [],
  condicoesPagamento = [],
  planoContas = [],
  allContacts = [],
}) {
  const { toast } = useToast();

  const initialState = useMemo(() => ({
    tipo_movimentacao: 'debito',
    contato_id: '',
    contato_tipo: '',
    data_faturamento: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    historico: '',
    conta_bancaria_id: '',
    forma_pagamento_id: '',
    condicao_pagamento_id: '',
    planos_contas: [],
  }), []);

  const [formData, setFormData] = useState(initialState);
  const [activeTab, setActiveTab] = useState('detalhes');
  const [isUploading, setIsUploading] = useState(false);

  // States for Parcelas and Anexos
  const [parcelas, setParcelas] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [gerarQtd, setGerarQtd] = useState(1);
  const [gerarPrimeiroVenc, setGerarPrimeiroVenc] = useState("");
  const [gerarTotal, setGerarTotal] = useState(0);

  useEffect(() => {
    if (movimentacao) {
      setFormData({
        ...initialState,
        ...movimentacao,
        planos_contas: Array.isArray(movimentacao.planos_contas) ? movimentacao.planos_contas : [],
      });
      setParcelas(Array.isArray(movimentacao.parcelas) ? movimentacao.parcelas : []);
      setAnexos(Array.isArray(movimentacao.anexos) ? movimentacao.anexos : []);
      if (movimentacao.valor_total) setGerarTotal(Number(movimentacao.valor_total));
      else if (Array.isArray(movimentacao.planos_contas)) {
        const debito = movimentacao.planos_contas
          .filter(p => p.tipo === 'debito')
          .reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
        const credito = movimentacao.planos_contas
          .filter(p => p.tipo === 'credito')
          .reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
        setGerarTotal(debito - credito);
      }
    } else {
      setFormData(initialState);
      setParcelas([]);
      setAnexos([]);
      setGerarQtd(1);
      setGerarPrimeiroVenc("");
      setGerarTotal(0);
    }
  }, [movimentacao, open, initialState]);

  useEffect(() => {
    if (!formData?.condicao_pagamento_id) return;
    const cond = (condicoesPagamento || []).find(c => c.id === formData.condicao_pagamento_id);
    if (!cond) return;

    const qtd = Number(cond.num_parcelas || (cond.tipo === 'a_vista' ? 1 : 1));
    if (!Number.isNaN(qtd) && qtd > 0) {
      setGerarQtd(qtd);
    }

    const baseStr = formData?.data_faturamento || new Date().toISOString().split('T')[0];
    const baseDate = new Date(baseStr);
    const first = new Date(baseDate);

    if (cond.tipo === 'prazo' || cond.tipo === 'parcelado') {
      const dias = Number(cond.intervalo_dias || 0);
      if (!Number.isNaN(dias) && dias > 0) {
        first.setDate(first.getDate() + dias);
      }
    }
    const firstStr = first.toISOString().split('T')[0];
    setGerarPrimeiroVenc(firstStr);
  }, [formData?.condicao_pagamento_id, formData?.data_faturamento, condicoesPagamento]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContatoChange = (v) => {
    const s = typeof v === "string" ? v : (v?.value ?? "");
    const [tipo, id] = (s || "").split(":");
    setFormData(f => ({ ...f, contato_tipo: tipo || "", contato_id: id || "" }));
  };

  const handlePlanoContasChange = (index, field, value) => {
    const updatedPlanosContas = [...formData.planos_contas];
    updatedPlanosContas[index] = { ...updatedPlanosContas[index], [field]: value };
    setFormData(prev => ({ ...prev, planos_contas: updatedPlanosContas }));
  };

  const addPlanoContas = () => {
    setFormData(prev => ({
      ...prev,
      planos_contas: [...prev.planos_contas, { plano_contas_id: '', valor: 0, tipo: 'debito', observacao: '' }]
    }));
  };

  const removePlanoContas = (index) => {
    setFormData(prev => ({
      ...prev,
      planos_contas: prev.planos_contas.filter((_, i) => i !== index)
    }));
  };

  const totalDebito = formData.planos_contas
    .filter(p => p.tipo === 'debito')
    .reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
  const totalCredito = formData.planos_contas
    .filter(p => p.tipo === 'credito')
    .reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
  const valorLiquido = totalDebito - totalCredito;
  
  useEffect(() => {
    if (!movimentacao && gerarTotal === 0) { 
      setGerarTotal(valorLiquido);
    }
  }, [valorLiquido, movimentacao, gerarTotal]);

  const addParcela = () => {
    setParcelas((prev) => [
      ...prev,
      {
        numero_parcela: (prev?.length || 0) + 1,
        data_vencimento: "",
        valor: 0,
        status: "pendente",
      },
    ]);
  };

  const updateParcela = (idx, field, value) => {
    setParcelas((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  };

  const removeParcela = (idx) => {
    setParcelas((prev) => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, numero_parcela: i + 1 })));
  };

  const generateParcelas = () => {
    const n = Math.max(1, Number(gerarQtd) || 1);
    const total = Number(gerarTotal) || 0;
    const primeira = gerarPrimeiroVenc || new Date().toISOString().split("T")[0];
    const baseParcela = Math.floor((total / n) * 100) / 100;
    const parcelasGeradas = Array.from({ length: n }).map((_, i) => {
      const d = new Date(primeira);
      d.setMonth(d.getMonth() + i);
      const data = d.toISOString().split("T")[0];
      return {
        numero_parcela: i + 1,
        data_vencimento: data,
        valor: baseParcela,
        status: "pendente",
      };
    });
    const soma = parcelasGeradas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const diff = Math.round((total - soma) * 100) / 100;
    if (parcelasGeradas.length > 0) {
      parcelasGeradas[parcelasGeradas.length - 1].valor =
        Math.round((Number(parcelasGeradas[parcelasGeradas.length - 1].valor) + diff) * 100) / 100;
    }
    setParcelas(parcelasGeradas);
  };

  const handleUploadFiles = async (files) => {
    if (!files || !files.length) return;
    setIsUploading(true);
    try {
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const { file_url } = await base44Client.integrations.Core.UploadFile({ file: f });
        if (file_url) newUrls.push(file_url);
      }
      if (newUrls.length) {
        setAnexos((prev) => [...prev, ...newUrls]);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({ title: 'Erro ao fazer upload', description: 'Não foi possível enviar os arquivos.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const addAnexoUrl = (url) => {
    if (!url || anexos.includes(url)) return;
    setAnexos((prev) => [...prev, url]);
  };

  const removeAnexoByIndex = (idx) => {
    setAnexos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.contato_id) {
      setActiveTab('detalhes');
      toast({ title: 'Campo obrigatório', description: 'Por favor, selecione um contato.', variant: 'destructive' });
      return;
    }
    if (valorLiquido <= 0) {
      setActiveTab('planos');
      toast({ title: 'Valor Inválido', description: 'O valor líquido da movimentação não pode ser zero ou negativo.', variant: 'destructive' });
      return;
    }

    const finalData = { 
      ...formData, 
      valor_total: valorLiquido, 
      parcelas: parcelas.map(p => ({
        ...p,
        valor: parseFloat(p.valor) || 0
      })), 
      anexos: anexos 
    };
    
    if (typeof onSubmit === 'function') onSubmit(finalData);
    if (typeof onClose === 'function') onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl w-[95%] max-h-[92vh] modern-modal bg-white border-2 border-slate-800 shadow-2xl flex flex-col p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <style>{`
          .modern-modal::-webkit-scrollbar {
            width: 8px;
          }
          .modern-modal::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .modern-modal::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 4px;
          }
          .modern-modal::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}</style>

        <DialogHeader className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b border-slate-600 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{movimentacao ? 'Editar' : 'Nova'} Movimentação</h2>
                <p className="text-sm text-slate-300">Preencha os dados financeiros</p>
              </div>
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-300 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto bg-slate-100/50 flex flex-col">
          <div className="px-6 pt-6 pb-6 flex-grow">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full bg-white p-1 rounded-xl grid grid-cols-4 gap-1 border border-slate-200 mb-4 shadow-sm">
                <TabsTrigger 
                  value="detalhes" 
                  className="rounded-lg data-[state=active]:bg-slate-800 data-[state=active]:text-white font-medium transition-all"
                >
                  <FileText className="w-4 h-4 mr-2" /> Dados
                </TabsTrigger>
                <TabsTrigger 
                  value="planos" 
                  className="rounded-lg data-[state=active]:bg-slate-800 data-[state=active]:text-white font-medium transition-all"
                >
                  <DollarSign className="w-4 h-4 mr-2" /> Planos
                </TabsTrigger>
                <TabsTrigger 
                  value="parcelas" 
                  className="rounded-lg data-[state=active]:bg-slate-800 data-[state=active]:text-white font-medium transition-all"
                >
                  <CreditCard className="w-4 h-4 mr-2" /> Parcelas
                </TabsTrigger>
                <TabsTrigger 
                  value="anexos" 
                  className="rounded-lg data-[state=active]:bg-slate-800 data-[state=active]:text-white font-medium transition-all"
                >
                  <Paperclip className="w-4 h-4 mr-2" /> Anexos
                </TabsTrigger>
              </TabsList>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <TabsContent value="detalhes" className="m-0 focus-visible:ring-0">
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
                    <h3 className="font-bold text-slate-800 text-sm">Detalhes da Movimentação</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <Label className="text-sm font-bold text-slate-900 mb-2">Contato</Label>
                      <SearchableContactSelect
                        contacts={allContacts}
                        value={formData.contato_id ? `${formData.contato_tipo}:${formData.contato_id}` : ''}
                        onChange={handleContatoChange}
                        onValueChange={handleContatoChange}
                        placeholder="Busque por cliente, funcionário ou fornecedor..."
                        className="modern-input text-black border border-slate-400 shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="data_faturamento" className="text-sm font-bold text-slate-900 mb-2">Data Faturamento</Label>
                        <Input 
                          id="data_faturamento" 
                          type="date" 
                          value={formData.data_faturamento} 
                          onChange={e => handleChange('data_faturamento', e.target.value)}
                          className="modern-input text-black border border-slate-400 shadow-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="data_vencimento" className="text-sm font-bold text-slate-900 mb-2">Data Vencimento</Label>
                        <Input 
                          id="data_vencimento" 
                          type="date" 
                          value={formData.data_vencimento} 
                          onChange={e => handleChange('data_vencimento', e.target.value)}
                          className="modern-input text-black border border-slate-400 shadow-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="historico" className="text-sm font-bold text-slate-900 mb-2">Histórico / Descrição</Label>
                      <Textarea 
                        id="historico" 
                        value={formData.historico} 
                        onChange={e => handleChange('historico', e.target.value)}
                        className="modern-input text-black border border-slate-400 shadow-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-bold text-slate-900 mb-2">Conta Bancária</Label>
                        <Select value={formData.conta_bancaria_id} onValueChange={(v) => handleChange('conta_bancaria_id', v)}>
                          <SelectTrigger className="modern-input text-black border border-slate-400 shadow-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>{contasBancarias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-bold text-slate-900 mb-2">Forma de Pagamento</Label>
                        <Select value={formData.forma_pagamento_id} onValueChange={(v) => handleChange('forma_pagamento_id', v)}>
                          <SelectTrigger className="modern-input text-black border border-slate-400 shadow-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>{formasPagamento.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-bold text-slate-900 mb-2">Condição de Pagamento</Label>
                        <Select value={formData.condicao_pagamento_id} onValueChange={(v) => handleChange('condicao_pagamento_id', v)}>
                          <SelectTrigger className="modern-input text-black border border-slate-400 shadow-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>{condicoesPagamento.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="button" onClick={() => setActiveTab('planos')} className="gap-2 bg-slate-800 hover:bg-slate-700 text-white">
                        Próximo <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="planos" className="m-0 focus-visible:ring-0">
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">Lançamentos de Contas</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addPlanoContas} className="h-8 border-slate-300 hover:bg-white">
                      <Plus className="h-3 w-3 mr-2"/> Adicionar
                    </Button>
                  </div>
                  <div className="p-6 space-y-4">
                    {formData.planos_contas.length > 0 ? (
                      <div className="rounded-md border border-slate-200 bg-slate-50/50 overflow-hidden">
                        {formData.planos_contas.map((plano, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 border-b last:border-b-0 bg-white">
                            <div className="flex-1">
                              <Select value={plano.plano_contas_id} onValueChange={(v) => handlePlanoContasChange(index, 'plano_contas_id', v)}>
                                <SelectTrigger className="border-slate-300"><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
                                <SelectContent>{planoContas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.codigo})</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <Select value={plano.tipo} onValueChange={(v) => handlePlanoContasChange(index, 'tipo', v)}>
                              <SelectTrigger className="w-[110px] border-slate-300"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="debito">Débito</SelectItem>
                                <SelectItem value="credito">Crédito</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              type="number" 
                              placeholder="Valor" 
                              value={plano.valor} 
                              onChange={e => handlePlanoContasChange(index, 'valor', parseFloat(e.target.value) || 0)} 
                              className="w-[120px] border-slate-300"
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePlanoContas(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4"/>
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        Nenhum plano de contas adicionado.
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-6 pt-4 border-t border-slate-100">
                      <div className="text-right">
                        <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Débito</span>
                        <p className="font-bold text-red-600">{formatCurrency(totalDebito)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Crédito</span>
                        <p className="font-bold text-emerald-600">{formatCurrency(totalCredito)}</p>
                      </div>
                      <div className="text-right bg-slate-100 px-4 py-1 rounded-lg">
                        <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Líquido</span>
                        <p className="font-bold text-lg text-slate-900">{formatCurrency(valorLiquido)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between mt-4 pt-2">
                      <Button type="button" variant="outline" onClick={() => setActiveTab('detalhes')} className="gap-2 border-slate-300">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                      </Button>
                      <Button type="button" onClick={() => setActiveTab('parcelas')} className="gap-2 bg-slate-800 hover:bg-slate-700 text-white">
                        Próximo <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="parcelas" className="m-0 focus-visible:ring-0">
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
                    <h3 className="font-bold text-slate-800 text-sm">Gerar Parcelas</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-700 mb-1 uppercase">Quantidade</label>
                        <Input
                          type="number"
                          min={1}
                          value={gerarQtd}
                          onChange={(e) => setGerarQtd(e.target.value)}
                          className="bg-white border-slate-300"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-700 mb-1 uppercase">1º Vencimento</label>
                        <Input
                          type="date"
                          value={gerarPrimeiroVenc}
                          onChange={(e) => setGerarPrimeiroVenc(e.target.value)}
                          className="bg-white border-slate-300"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-700 mb-1 uppercase">Total a distribuir</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={gerarTotal}
                          onChange={(e) => setGerarTotal(e.target.value)}
                          className="bg-white border-slate-300"
                        />
                      </div>
                      <div className="md:col-span-3 flex gap-2 pt-2">
                        <Button type="button" onClick={generateParcelas} className="bg-slate-800 text-white hover:bg-slate-700 flex-1" disabled={valorLiquido <= 0}>
                          <DollarSign className="w-4 h-4 mr-2" /> Gerar Parcelas Automaticamente
                        </Button>
                        <Button type="button" variant="outline" onClick={addParcela} className="border-slate-300 bg-white">
                          <Plus className="w-4 h-4 mr-2" /> Adicionar Manual
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-xs">
                          <tr>
                            <th className="p-3 text-left border-b border-slate-200">Parcela</th>
                            <th className="p-3 text-left border-b border-slate-200">Vencimento</th>
                            <th className="p-3 text-left border-b border-slate-200">Valor</th>
                            <th className="p-3 text-left border-b border-slate-200">Status</th>
                            <th className="p-3 text-right border-b border-slate-200">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {parcelas?.length ? (
                            parcelas.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-medium text-slate-900">{p.numero_parcela}</td>
                                <td className="p-3">
                                  <Input
                                    type="date"
                                    value={p.data_vencimento || ""}
                                    onChange={(e) => updateParcela(idx, "data_vencimento", e.target.value)}
                                    className="h-8 w-full border-slate-200"
                                  />
                                </td>
                                <td className="p-3">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={p.valor ?? 0}
                                    onChange={(e) => updateParcela(idx, "valor", Number(e.target.value || 0))}
                                    className="h-8 w-full border-slate-200"
                                  />
                                </td>
                                <td className="p-3">
                                  <Select value={p.status || "pendente"} onValueChange={(v) => updateParcela(idx, "status", v)}>
                                    <SelectTrigger className="h-8 w-[110px] border-slate-200"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pendente">Pendente</SelectItem>
                                      <SelectItem value="pago">Pago</SelectItem>
                                      <SelectItem value="vencido">Vencido</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-3 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeParcela(idx)}
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4"/>
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="p-8 text-center text-slate-500 italic" colSpan={5}>
                                Nenhuma parcela gerada.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between mt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab('planos')} className="gap-2 border-slate-300">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                      </Button>
                      <Button type="button" onClick={() => setActiveTab('anexos')} className="gap-2 bg-slate-800 hover:bg-slate-700 text-white">
                        Próximo <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="anexos" className="m-0 focus-visible:ring-0">
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
                    <h3 className="font-bold text-slate-800 text-sm">Anexos e Documentos</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-4">
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-bold text-slate-700 uppercase">Upload de Arquivo</Label>
                        <Input
                          id="file-upload-input"
                          type="file"
                          multiple
                          onChange={(e) => handleUploadFiles(e.target.files)}
                          className="bg-white border-slate-300"
                          disabled={isUploading}
                        />
                        <span className="text-xs text-slate-500">Suporta: PDF, JPG, PNG, CSV</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-bold text-slate-700 uppercase">Link Externo</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="url"
                            placeholder="https://..."
                            className="flex-1 bg-white border-slate-300"
                            id="anexoUrlInput"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const el = document.getElementById("anexoUrlInput");
                              if (!el) return;
                              const u = el.value?.trim();
                              if (u) {
                                addAnexoUrl(u);
                                el.value = "";
                              }
                            }}
                            className="border-slate-300 bg-white"
                          >
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-semibold text-sm text-slate-700">
                        Arquivos Anexados ({anexos.length})
                      </div>
                      {anexos?.length ? (
                        <ul className="divide-y divide-slate-100">
                          {anexos.map((url, idx) => (
                            <li key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                              <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[80%] flex items-center gap-2">
                                <Paperclip className="w-4 h-4" />
                                {url.split('/').pop()}
                              </a>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAnexoByIndex(idx)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                              >
                                <X className="h-4 w-4"/>
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-8 text-center text-slate-400 italic">
                          Nenhum anexo adicionado.
                        </div>
                      )}
                    </div>

                    <div className="flex justify-start mt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab('parcelas')} className="gap-2 border-slate-300">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <DialogFooter className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 bg-white px-6 pb-6 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-white text-slate-700 px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-50 gap-2 h-10"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-slate-800 text-white px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-700 gap-2 h-10"
              disabled={valorLiquido <= 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> {movimentacao ? 'Salvar Alterações' : 'Criar Movimentação'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}