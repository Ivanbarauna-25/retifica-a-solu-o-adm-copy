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
import { Trash2, X, ArrowRight, ArrowLeft, Wallet, FileText, CreditCard, DollarSign, Paperclip, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SearchableContactSelect from '@/components/SearchableContactSelect';
import { formatCurrency } from '@/components/formatters';
import { base44 } from "@/api/base44Client";
import { Badge } from '@/components/ui/badge';

/**
 * ✅ MODAL ATUALIZADO - ABAS UNIFICADAS
 * 
 * MUDANÇA: As abas "Planos de Contas" e "Parcelas" foram unificadas em uma única aba "Parcelamento"
 * 
 * NOVO FLUXO:
 * 1. Usuário define plano de contas principal
 * 2. Define condição de pagamento e gera parcelas
 * 3. Sistema aplica automaticamente o plano de contas a todas as parcelas
 * 4. Usuário pode editar planos individuais se necessário
 */
export default function FinancialMovementGeneratorModal({
  open,
  onClose,
  onGenerated,
  prefillData,
  duplicatas = [],
  origem_id = null,
  contasBancarias = [],
  formasPagamento = [],
  condicoesPagamento = [],
  planoContas = [],
  allContacts = [],
}) {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    tipo_movimentacao: 'credito',
    contato_id: '',
    contato_tipo: '',
    numero_documento: '',
    data_faturamento: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    historico: '',
    conta_bancaria_id: '',
    forma_pagamento_id: '',
    condicao_pagamento_id: '',
    origem: 'manual',
    plano_contas_principal: '', // ✅ NOVO: Plano de contas que será aplicado às parcelas
    valor_total: 0
  });

  const [activeTab, setActiveTab] = useState('detalhes');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // ✅ NOVO: Parcelas agora incluem plano_contas_id diretamente
  const [parcelas, setParcelas] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [gerarQtd, setGerarQtd] = useState(1);
  const [gerarPrimeiroVenc, setGerarPrimeiroVenc] = useState("");
  const [gerarTotal, setGerarTotal] = useState(0);

  const hasDuplicatasXML = useMemo(() => {
    return Array.isArray(duplicatas) && duplicatas.length > 0;
  }, [duplicatas]);

  useEffect(() => {
    if (open) {
      setFormData({
        tipo_movimentacao: prefillData?.tipo_movimentacao || 'credito',
        contato_id: prefillData?.contato_id || '',
        contato_tipo: prefillData?.contato_tipo || '',
        numero_documento: prefillData?.numero_documento || '',
        data_faturamento: prefillData?.data_faturamento || new Date().toISOString().split('T')[0],
        data_vencimento: prefillData?.data_vencimento || '',
        historico: prefillData?.historico || '',
        conta_bancaria_id: '',
        forma_pagamento_id: prefillData?.forma_pagamento_id || '',
        condicao_pagamento_id: prefillData?.condicao_pagamento_id || '',
        origem: prefillData?.origem || 'manual',
        plano_contas_principal: prefillData?.planos_contas?.[0]?.plano_contas_id || '', // ✅ Usar primeiro plano se existir
        valor_total: prefillData?.valor_total || 0
      });

      if (hasDuplicatasXML) {
        const parcelasFromXML = duplicatas.map((dup, idx) => ({
          numero_parcela: idx + 1,
          data_vencimento: dup.vencimento,
          valor: Number(dup.valor || 0),
          numero_duplicata: dup.numero,
          status: 'pendente',
          plano_contas_id: '' // ✅ Será preenchido depois
        }));
        setParcelas(parcelasFromXML);
        setGerarQtd(duplicatas.length);
        setGerarTotal(duplicatas.reduce((sum, d) => sum + Number(d.valor || 0), 0));
        setGerarPrimeiroVenc(duplicatas[0]?.vencimento || new Date().toISOString().split('T')[0]);
      } else {
        setParcelas([]);
        setGerarQtd(1);
        setGerarPrimeiroVenc(prefillData?.data_vencimento || new Date().toISOString().split('T')[0]);
        setGerarTotal(prefillData?.valor_total || 0);
      }
      setAnexos([]);
    }
  }, [open, prefillData, duplicatas, hasDuplicatasXML]);

  // Autopreencher quantidade e 1º vencimento com base na condição de pagamento
  useEffect(() => {
    if (hasDuplicatasXML) return;
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
    setGerarPrimeiroVenc(first.toISOString().split('T')[0]);
  }, [formData?.condicao_pagamento_id, formData?.data_faturamento, condicoesPagamento, hasDuplicatasXML]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContatoChange = (v) => {
    const s = typeof v === "string" ? v : (v?.value ?? "");
    const [tipo, id] = (s || "").split(":");
    setFormData(f => ({ ...f, contato_tipo: tipo || "", contato_id: id || "" }));
  };

  // ✅ NOVO: Quando o plano principal muda, aplicar a todas as parcelas existentes
  const handlePlanoContasPrincipalChange = (planoId) => {
    handleChange('plano_contas_principal', planoId);
    
    // Aplicar a todas as parcelas que não têm plano definido
    if (parcelas.length > 0 && planoId) {
      setParcelas(prev => prev.map(p => ({
        ...p,
        plano_contas_id: p.plano_contas_id || planoId // Manter se já tem, senão aplicar o novo
      })));
      
      toast({
        title: '✅ Plano aplicado!',
        description: `O plano de contas foi aplicado a ${parcelas.length} ${parcelas.length === 1 ? 'parcela' : 'parcelas'}.`
      });
    }
  };

  // ✅ NOVO: Atualizar plano de contas de uma parcela específica
  const updateParcelaPlano = (idx, planoId) => {
    setParcelas(prev =>
      prev.map((p, i) => (i === idx ? { ...p, plano_contas_id: planoId } : p))
    );
  };

  // ✅ CORRIGIDO: Função de gerar parcelas com aplicação automática do plano
  const generateParcelas = () => {
    try {
      const n = Math.max(1, parseInt(gerarQtd) || 1);
      const total = parseFloat(gerarTotal) || 0;
      const primeira = gerarPrimeiroVenc || new Date().toISOString().split("T")[0];

      if (total <= 0) {
        toast({
          title: 'Valor inválido',
          description: 'Informe um valor total válido para distribuir entre as parcelas.',
          variant: 'destructive'
        });
        return;
      }

      if (!primeira) {
        toast({
          title: 'Data inválida',
          description: 'Informe a data do primeiro vencimento.',
          variant: 'destructive'
        });
        return;
      }

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
          plano_contas_id: formData.plano_contas_principal || '' // ✅ Aplicar plano principal
        };
      });

      // Ajustar diferença de centavos na última parcela
      const soma = parcelasGeradas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      const diff = Math.round((total - soma) * 100) / 100;

      if (parcelasGeradas.length > 0 && diff !== 0) {
        parcelasGeradas[parcelasGeradas.length - 1].valor =
          Math.round((Number(parcelasGeradas[parcelasGeradas.length - 1].valor) + diff) * 100) / 100;
      }

      setParcelas(parcelasGeradas);

      toast({
        title: '✅ Parcelas geradas!',
        description: `${n} ${n === 1 ? 'parcela gerada' : 'parcelas geradas'} ${formData.plano_contas_principal ? 'com plano de contas aplicado' : 'com sucesso'}.`
      });

    } catch (error) {
      console.error('Erro ao gerar parcelas:', error);
      toast({
        title: 'Erro ao gerar parcelas',
        description: 'Ocorreu um erro ao gerar as parcelas. Verifique os valores informados.',
        variant: 'destructive'
      });
    }
  };

  const addParcela = () => {
    setParcelas((prev) => [
      ...prev,
      {
        numero_parcela: (prev?.length || 0) + 1,
        data_vencimento: "",
        valor: 0,
        status: "pendente",
        plano_contas_id: formData.plano_contas_principal || '' // ✅ Aplicar plano principal
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

  // Helpers Anexos
  const handleUploadFiles = async (files) => {
    if (!files || !files.length) return;
    setIsUploading(true);
    try {
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
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

  const validateBeforeGenerate = () => {
    const errors = [];

    if (!formData.contato_id) {
      errors.push('Selecione um contato');
    }

    if (!formData.plano_contas_principal) {
      errors.push('Selecione um plano de contas principal');
    }

    if (parcelas.length === 0) {
      errors.push('Gere ou adicione pelo menos uma parcela');
    }

    // ✅ Validar que todas as parcelas têm plano de contas
    const parcelasSemPlano = parcelas.filter(p => !p.plano_contas_id);
    if (parcelasSemPlano.length > 0) {
      errors.push(`${parcelasSemPlano.length} ${parcelasSemPlano.length === 1 ? 'parcela não tem' : 'parcelas não têm'} plano de contas definido`);
    }

    const totalParcelas = parcelas.reduce((sum, p) => sum + (Number(p.valor) || 0), 0);
    if (totalParcelas <= 0) {
      errors.push('O valor total das parcelas deve ser maior que zero');
    }

    if (!formData.conta_bancaria_id) {
      errors.push('Selecione uma conta bancária');
    }

    if (!formData.forma_pagamento_id) {
      errors.push('Selecione uma forma de pagamento');
    }

    return errors;
  };

  const handleGenerate = async () => {
    const errors = validateBeforeGenerate();
    if (errors.length > 0) {
      toast({
        title: 'Campos obrigatórios faltando',
        description: errors.join('; '),
        variant: 'destructive'
      });
      
      if (!formData.contato_id || !formData.conta_bancaria_id || !formData.forma_pagamento_id) {
        setActiveTab('detalhes');
      } else {
        setActiveTab('parcelamento');
      }
      return;
    }

    setIsGenerating(true);

    try {
      const totalParcelas = parcelas.reduce((sum, p) => sum + (Number(p.valor) || 0), 0);

      // ✅ Construir planos_contas baseado nas parcelas e seus planos individuais
      const planosContasUnicos = {};
      parcelas.forEach(parcela => {
        if (parcela.plano_contas_id) {
          if (!planosContasUnicos[parcela.plano_contas_id]) {
            planosContasUnicos[parcela.plano_contas_id] = 0;
          }
          planosContasUnicos[parcela.plano_contas_id] += Number(parcela.valor || 0);
        }
      });

      const planos_contas = Object.entries(planosContasUnicos).map(([planoId, valor]) => ({
        plano_contas_id: planoId,
        valor: Math.round(valor * 100) / 100,
        tipo: formData.tipo_movimentacao === 'debito' ? 'debito' : 'credito',
        observacao: ''
      }));

      const movimentacaoData = {
        tipo_movimentacao: formData.tipo_movimentacao,
        numero_documento: formData.numero_documento,
        contato_tipo: formData.contato_tipo,
        contato_id: formData.contato_id,
        data_faturamento: formData.data_faturamento,
        data_vencimento: parcelas[0]?.data_vencimento || formData.data_vencimento,
        historico: formData.historico,
        forma_pagamento_id: formData.forma_pagamento_id,
        condicao_pagamento_id: formData.condicao_pagamento_id,
        conta_bancaria_id: formData.conta_bancaria_id,
        origem: formData.origem,
        valor_total: totalParcelas,
        status: 'pendente',
        parcelas: parcelas.map(p => ({
          numero_parcela: p.numero_parcela,
          data_vencimento: p.data_vencimento,
          valor: parseFloat(p.valor) || 0,
          status: p.status || 'pendente',
          numero_duplicata: p.numero_duplicata || null
        })),
        planos_contas: planos_contas,
        anexos: anexos
      };

      if (origem_id) {
        if (formData.origem === 'os') {
          movimentacaoData.os_id = origem_id;
        } else if (formData.origem === 'nota_fiscal') {
          movimentacaoData.nota_fiscal_id = origem_id;
        } else if (formData.origem === 'orcamento') {
          movimentacaoData.orcamento_id = origem_id;
        }
      }

      await base44.entities.MovimentacaoFinanceira.create(movimentacaoData);

      // Criar registros em ContasReceber ou ContasPagar
      const tipoContaEntity = formData.tipo_movimentacao === 'credito' ? 'ContasReceber' : 'ContasPagar';

      for (const parcela of parcelas) {
        const contaData = {
          descricao: formData.historico || `${formData.numero_documento} - Parcela ${parcela.numero_parcela}/${parcelas.length}`,
          numero_documento: formData.numero_documento,
          data_vencimento: parcela.data_vencimento,
          valor_original: parcela.valor,
          status: 'pendente',
          observacoes: `Gerado automaticamente de ${formData.origem}\n${formData.historico || ''}`,
        };

        if (formData.contato_tipo === 'cliente') {
          contaData.cliente_id = formData.contato_id;
        } else if (formData.contato_tipo === 'fornecedor') {
          contaData.fornecedor_id = formData.contato_id;
        } else if (formData.contato_tipo === 'funcionario') {
          contaData.funcionario_id = formData.contato_id;
        }

        await base44.entities[tipoContaEntity].create(contaData);
      }

      toast({
        title: '✅ Movimentação gerada com sucesso!',
        description: `${parcelas.length} ${parcelas.length === 1 ? 'lançamento criado' : 'lançamentos criados'}.`
      });

      if (typeof onGenerated === 'function') {
        await onGenerated();
      }

      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      console.error('Erro ao gerar movimentação financeira:', error);
      toast({
        title: 'Erro ao gerar movimentação',
        description: error.message || 'Ocorreu um erro ao processar a requisição.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95%] max-h-[90vh] flex flex-col p-0 modern-modal">
        <DialogHeader className="p-6 pb-0 modern-modal-header">
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Gerar Movimentação Financeira
            {hasDuplicatasXML && (
              <Badge className="ml-2 bg-blue-600 text-white">
                <FileText className="w-3 h-3 mr-1" />
                {duplicatas.length} Duplicata{duplicatas.length > 1 ? 's' : ''} XML
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="flex-grow overflow-hidden flex flex-col">
          <div className="px-6 pt-4 no-print">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* ✅ NOVO: Apenas 3 abas agora */}
              <TabsList className="bg-slate-100 p-1 rounded-xl grid grid-cols-3 gap-1">
                <TabsTrigger value="detalhes" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                  <FileText className="w-4 h-4 mr-2" /> Dados
                </TabsTrigger>
                <TabsTrigger value="parcelamento" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                  <CreditCard className="w-4 h-4 mr-2" /> Parcelamento
                </TabsTrigger>
                <TabsTrigger value="anexos" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                  <Paperclip className="w-4 h-4 mr-2" /> Anexos
                </TabsTrigger>
              </TabsList>

              <div className="flex-grow overflow-y-auto mt-4">
                {/* ABA 1: DETALHES */}
                <TabsContent value="detalhes" className="space-y-6 px-0">
                  <div>
                      <Label className="font-semibold">Contato</Label>
                      <SearchableContactSelect
                          contacts={allContacts}
                          value={formData.contato_id ? `${formData.contato_tipo}:${formData.contato_id}` : ''}
                          onChange={handleContatoChange}
                          onValueChange={handleContatoChange}
                          placeholder="Busque por cliente, funcionário ou fornecedor..."
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="numero_documento">Número Documento</Label>
                      <Input
                        id="numero_documento"
                        value={formData.numero_documento}
                        onChange={e => handleChange('numero_documento', e.target.value)}
                        disabled={!!prefillData?.numero_documento}
                      />
                    </div>
                    <div>
                      <Label htmlFor="data_faturamento">Data Faturamento</Label>
                      <Input id="data_faturamento" type="date" value={formData.data_faturamento} onChange={e => handleChange('data_faturamento', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="historico">Histórico / Descrição</Label>
                    <Textarea id="historico" value={formData.historico} onChange={e => handleChange('historico', e.target.value)} rows={3} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                          <Label>Conta Bancária *</Label>
                          <Select
                            value={formData.conta_bancaria_id || undefined}
                            onValueChange={(v) => handleChange('conta_bancaria_id', v)}
                          >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {contasBancarias.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div>
                          <Label>Forma de Pagamento *</Label>
                          <Select
                            value={formData.forma_pagamento_id || undefined}
                            onValueChange={(v) => handleChange('forma_pagamento_id', v)}
                          >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {formasPagamento.map(f => (
                                  <SelectItem key={f.id} value={f.id}>
                                    {f.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div>
                          <Label>Condição de Pagamento</Label>
                          <Select
                            value={formData.condicao_pagamento_id || undefined}
                            onValueChange={(v) => handleChange('condicao_pagamento_id', v)}
                          >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {condicoesPagamento.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button type="button" onClick={() => setActiveTab('parcelamento')} className="gap-2">
                      Próximo <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* ✅ ABA 2: PARCELAMENTO (UNIFICADA - PLANOS + PARCELAS) */}
                <TabsContent value="parcelamento" className="space-y-6 px-0">
                  {/* Seção 1: Plano de Contas Principal */}
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 mb-2">Plano de Contas Principal</h3>
                        <p className="text-sm text-blue-700 mb-3">
                          Este plano será aplicado automaticamente a todas as parcelas geradas. 
                          Você pode editar planos individuais depois, se necessário.
                        </p>
                        
                        <Label className="text-sm font-medium text-blue-900">Selecione o Plano de Contas *</Label>
                        <Select
                          value={formData.plano_contas_principal}
                          onValueChange={handlePlanoContasPrincipalChange}
                        >
                          <SelectTrigger className="bg-white mt-1">
                            <SelectValue placeholder="Selecione um plano de contas..." />
                          </SelectTrigger>
                          <SelectContent>
                            {planoContas.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{p.codigo}</Badge>
                                  {p.nome}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {formData.plano_contas_principal && (
                          <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-md">
                            <p className="text-xs text-green-800 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Plano de contas selecionado e pronto para ser aplicado às parcelas
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Geração de Parcelas */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Parcelas</h3>
                      {formData.plano_contas_principal && (
                        <Badge className="bg-green-600 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Plano aplicado
                        </Badge>
                      )}
                    </div>

                    {hasDuplicatasXML && (
                      <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-blue-900">Duplicatas Extraídas do XML da NF-e</p>
                            <p className="text-sm text-blue-700 mt-1">
                              As parcelas foram automaticamente importadas. Você pode editá-las se necessário.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-md border bg-slate-50">
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-600 mb-1">Quantidade</label>
                            <Input
                                type="number"
                                min={1}
                                value={gerarQtd}
                                onChange={(e) => setGerarQtd(parseInt(e.target.value) || 1)}
                                disabled={hasDuplicatasXML}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-600 mb-1">1º Vencimento</label>
                            <Input
                                type="date"
                                value={gerarPrimeiroVenc}
                                onChange={(e) => setGerarPrimeiroVenc(e.target.value)}
                                disabled={hasDuplicatasXML}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-slate-600 mb-1">Total a distribuir</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={gerarTotal}
                                onChange={(e) => setGerarTotal(parseFloat(e.target.value) || 0)}
                                disabled={hasDuplicatasXML}
                            />
                        </div>
                        <div className="md:col-span-3 flex gap-2">
                            <Button 
                              type="button" 
                              onClick={generateParcelas} 
                              className="bg-slate-800 text-white hover:bg-slate-700 text-sm" 
                              disabled={hasDuplicatasXML || !gerarTotal || !gerarPrimeiroVenc || !formData.plano_contas_principal}
                            >
                                {formData.plano_contas_principal ? 'Gerar Parcelas com Plano' : 'Selecione um plano primeiro'}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={addParcela} 
                              className="text-sm"
                              disabled={hasDuplicatasXML || !formData.plano_contas_principal}
                            >
                                Adicionar Parcela
                            </Button>
                        </div>
                    </div>

                    {/* Tabela de Parcelas com Planos */}
                    <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800 text-white">
                                <tr>
                                    <th className="p-2 text-left">Parcela</th>
                                    {hasDuplicatasXML && <th className="p-2 text-left">Nº Duplicata</th>}
                                    <th className="p-2 text-left">Vencimento</th>
                                    <th className="p-2 text-left">Valor</th>
                                    <th className="p-2 text-left">Plano de Contas</th>
                                    <th className="p-2 text-left">Status</th>
                                    <th className="p-2 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parcelas?.length ? (
                                    parcelas.map((p, idx) => (
                                        <tr key={idx} className="border-t hover:bg-slate-50">
                                            <td className="p-2 font-medium">{p.numero_parcela}</td>
                                            {hasDuplicatasXML && (
                                              <td className="p-2">
                                                <Badge variant="outline" className="text-xs">
                                                  {p.numero_duplicata || '-'}
                                                </Badge>
                                              </td>
                                            )}
                                            <td className="p-2">
                                                <Input
                                                    type="date"
                                                    value={p.data_vencimento || ""}
                                                    onChange={(e) => updateParcela(idx, "data_vencimento", e.target.value)}
                                                    className="h-8"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={p.valor ?? 0}
                                                    onChange={(e) => updateParcela(idx, "valor", parseFloat(e.target.value) || 0)}
                                                    className="h-8 w-28"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Select
                                                  value={p.plano_contas_id || formData.plano_contas_principal}
                                                  onValueChange={(v) => updateParcelaPlano(idx, v)}
                                                >
                                                  <SelectTrigger className="h-8">
                                                    <SelectValue placeholder="Selecione..." />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {planoContas.map(plano => (
                                                      <SelectItem key={plano.id} value={plano.id}>
                                                        {plano.codigo} - {plano.nome}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="p-2">
                                                <Select value={p.status || "pendente"} onValueChange={(v) => updateParcela(idx, "status", v)}>
                                                    <SelectTrigger className="w-[100px] h-8"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pendente">Pendente</SelectItem>
                                                        <SelectItem value="pago">Pago</SelectItem>
                                                        <SelectItem value="vencido">Vencido</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="p-2 text-right">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeParcela(idx)}
                                                    className="text-red-500 hover:text-red-600 h-8 w-8"
                                                    disabled={hasDuplicatasXML}
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="p-4 text-center text-slate-500" colSpan={hasDuplicatasXML ? 7 : 6}>
                                            {formData.plano_contas_principal 
                                              ? 'Clique em "Gerar Parcelas" para criar as parcelas automaticamente'
                                              : 'Selecione um plano de contas principal primeiro'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Resumo Total */}
                    {parcelas.length > 0 && (
                      <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-slate-600">Total de Parcelas</p>
                            <p className="text-2xl font-bold text-slate-900">
                              {parcelas.length} {parcelas.length === 1 ? 'parcela' : 'parcelas'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Valor Total</p>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(parcelas.reduce((sum, p) => sum + (Number(p.valor) || 0), 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between mt-4">
                    <Button type="button" variant="outline" onClick={() => setActiveTab('detalhes')} className="gap-2">
                      <ArrowLeft className="w-4 h-4" /> Voltar
                    </Button>
                    <Button type="button" onClick={() => setActiveTab('anexos')} className="gap-2">
                      Próximo <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* ABA 3: ANEXOS */}
                <TabsContent value="anexos" className="mt-4 px-0">
                  <div className="space-y-4">
                      <div className="p-3 rounded-md border bg-slate-50 space-y-3">
                          <div className="flex items-center gap-3">
                              <Input
                                  id="file-upload-input"
                                  type="file"
                                  multiple
                                  onChange={(e) => handleUploadFiles(e.target.files)}
                                  className="text-sm"
                                  disabled={isUploading}
                              />
                              <span className="text-xs text-slate-600">Arquivos suportados: pdf, jpg, jpeg, png, csv</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <Input
                                  type="url"
                                  placeholder="Cole um link para anexar (URL)"
                                  className="flex-1"
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
                                  className="text-sm"
                              >
                                  Adicionar URL
                              </Button>
                          </div>
                      </div>

                      <div className="rounded-md border">
                          <div className="p-3">
                              <h4 className="text-sm font-semibold mb-2">Arquivos Anexados</h4>
                              {anexos?.length ? (
                                  <ul className="space-y-2">
                                      {anexos.map((url, idx) => (
                                          <li key={idx} className="flex items-center justify-between bg-white border rounded-md px-3 py-2">
                                              <a href={url} target="_blank" rel="noreferrer" className="text-slate-700 underline break-all">
                                                  {url.split('/').pop()}
                                              </a>
                                              <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => removeAnexoByIndex(idx)}
                                                  className="text-red-500 hover:text-red-600"
                                              >
                                                  <X className="h-4 w-4"/>
                                              </Button>
                                          </li>
                                      ))}
                                  </ul>
                              ) : (
                                  <p className="text-sm text-slate-500">Nenhum anexo adicionado.</p>
                              )}
                          </div>
                      </div>
                  </div>
                  <div className="flex justify-start mt-4">
                    <Button type="button" variant="outline" onClick={() => setActiveTab('parcelamento')} className="gap-2">
                      <ArrowLeft className="w-4 h-4" /> Voltar
                    </Button>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <DialogFooter className="bg-slate-50 p-4 border-t flex justify-end items-center w-full">
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isGenerating}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={isGenerating || !formData.plano_contas_principal || parcelas.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar e Gerar
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}