import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Gift, Info, DollarSign, FileText, Loader2, Save, X, Calculator, RefreshCw, AlertTriangle } from "lucide-react";
import SmartInput from "@/components/SmartInput";
import { useToast } from '@/components/ui/use-toast';
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/components/formatters";
import { 
  calcularFolha13Completo, 
  calcularINSSProgressivo, 
  calcularIRRFProgressivo,
  validarFolha13 
} from "./calculoFolha13Utils";

export default function Folha13Form({ 
  isOpen, 
  onClose, 
  folha13, 
  funcionarios, 
  planoContas,
  folhasPagamento,
  controlePonto = [],
  configuracoes = {},
  onSave 
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("geral");
  const [isCalculating, setIsCalculating] = useState(false);
  const [alertasCalculo, setAlertasCalculo] = useState([]);
  const [validacao, setValidacao] = useState({ valido: true, erros: [], avisos: [] });

  const [formData, setFormData] = useState({
    funcionario_id: "",
    ano_referencia: new Date().getFullYear(),
    tipo_parcela: "1_parcela",
    avos_calculados: 12,
    avos_editados: null,
    avos_descontados_faltas: 0,
    avos_descontados_afastamento: 0,
    salario_base: 0,
    salario_base_origem: "",
    media_horas_extras: 0,
    media_comissoes: 0,
    media_outros: 0,
    periodo_calculo_medias: "",
    meses_considerados_media: 12,
    valor_bruto: 0,
    base_calculo_inss: 0,
    inss: 0,
    inss_faixa: "",
    base_calculo_irrf: 0,
    dependentes_irrf: 0,
    deducao_dependentes: 0,
    irrf: 0,
    irrf_faixa: "",
    outros_descontos: 0,
    outros_descontos_descricao: "",
    valor_primeira_parcela: 0,
    valor_liquido: 0,
    status: "gerado",
    data_pagamento: "",
    plano_contas_id: "",
    observacoes: "",
    alertas_calculo: ""
  });

  useEffect(() => {
    if (folha13) {
      setFormData({
        funcionario_id: folha13.funcionario_id || "",
        ano_referencia: folha13.ano_referencia || new Date().getFullYear(),
        tipo_parcela: folha13.tipo_parcela || "1_parcela",
        avos_calculados: folha13.avos_calculados || 12,
        avos_editados: folha13.avos_editados || null,
        avos_descontados_faltas: folha13.avos_descontados_faltas || 0,
        avos_descontados_afastamento: folha13.avos_descontados_afastamento || 0,
        salario_base: Number(folha13.salario_base) || 0,
        salario_base_origem: folha13.salario_base_origem || "",
        media_horas_extras: Number(folha13.media_horas_extras) || 0,
        media_comissoes: Number(folha13.media_comissoes) || 0,
        media_outros: Number(folha13.media_outros) || 0,
        periodo_calculo_medias: folha13.periodo_calculo_medias || "",
        meses_considerados_media: folha13.meses_considerados_media || 12,
        valor_bruto: Number(folha13.valor_bruto) || 0,
        base_calculo_inss: Number(folha13.base_calculo_inss) || 0,
        inss: Number(folha13.inss) || 0,
        inss_faixa: folha13.inss_faixa || "",
        base_calculo_irrf: Number(folha13.base_calculo_irrf) || 0,
        dependentes_irrf: folha13.dependentes_irrf || 0,
        deducao_dependentes: Number(folha13.deducao_dependentes) || 0,
        irrf: Number(folha13.irrf) || 0,
        irrf_faixa: folha13.irrf_faixa || "",
        outros_descontos: Number(folha13.outros_descontos) || 0,
        outros_descontos_descricao: folha13.outros_descontos_descricao || "",
        valor_primeira_parcela: Number(folha13.valor_primeira_parcela) || 0,
        valor_liquido: Number(folha13.valor_liquido) || 0,
        status: folha13.status || "gerado",
        data_pagamento: folha13.data_pagamento || "",
        plano_contas_id: folha13.plano_contas_id || "",
        observacoes: folha13.observacoes || "",
        alertas_calculo: folha13.alertas_calculo || ""
      });
      
      // Carregar alertas existentes
      if (folha13.alertas_calculo) {
        try {
          setAlertasCalculo(JSON.parse(folha13.alertas_calculo));
        } catch (e) {
          setAlertasCalculo([]);
        }
      }
    } else {
      setFormData({
        funcionario_id: "",
        ano_referencia: new Date().getFullYear(),
        tipo_parcela: "1_parcela",
        avos_calculados: 12,
        avos_editados: null,
        avos_descontados_faltas: 0,
        avos_descontados_afastamento: 0,
        salario_base: 0,
        salario_base_origem: "",
        media_horas_extras: 0,
        media_comissoes: 0,
        media_outros: 0,
        periodo_calculo_medias: "",
        meses_considerados_media: 12,
        valor_bruto: 0,
        base_calculo_inss: 0,
        inss: 0,
        inss_faixa: "",
        base_calculo_irrf: 0,
        dependentes_irrf: 0,
        deducao_dependentes: 0,
        irrf: 0,
        irrf_faixa: "",
        outros_descontos: 0,
        outros_descontos_descricao: "",
        valor_primeira_parcela: 0,
        valor_liquido: 0,
        status: "gerado",
        data_pagamento: "",
        plano_contas_id: "",
        observacoes: "",
        alertas_calculo: ""
      });
      setAlertasCalculo([]);
    }
    setActiveTab("geral");
    setValidacao({ valido: true, erros: [], avisos: [] });
  }, [folha13, isOpen]);

  // Calcular dados quando funcionário e ano mudarem
  useEffect(() => {
    if (!folha13 && formData.funcionario_id && formData.ano_referencia) {
      calcularDadosFuncionario();
    }
  }, [formData.funcionario_id, formData.ano_referencia]);

  // Recalcular valores quando campos relevantes mudarem
  useEffect(() => {
    recalcularValores();
  }, [
    formData.avos_editados,
    formData.avos_calculados,
    formData.salario_base,
    formData.media_horas_extras,
    formData.media_comissoes,
    formData.media_outros,
    formData.outros_descontos,
    formData.tipo_parcela
  ]);

  const calcularDadosFuncionario = async () => {
    if (!formData.funcionario_id || !formData.ano_referencia) return;

    setIsCalculating(true);
    try {
      const funcionario = funcionarios.find(f => f.id === formData.funcionario_id);
      if (!funcionario) {
        setIsCalculating(false);
        return;
      }

      // Buscar configurações do 13º
      const config13 = configuracoes?.config_13_salario || {};
      
      // Buscar controle de ponto do funcionário
      const pontosFunc = controlePonto.filter(p => 
        p.funcionario_id === formData.funcionario_id &&
        p.mes_referencia?.startsWith(String(formData.ano_referencia))
      );

      // Usar função de cálculo completo CLT
      const resultado = calcularFolha13Completo({
        funcionario,
        anoReferencia: formData.ano_referencia,
        tipoParcela: formData.tipo_parcela,
        folhasPagamento: folhasPagamento || [],
        controlePonto: pontosFunc,
        afastamentos: [], // TODO: buscar afastamentos se houver entidade
        configuracoes: configuracoes,
        avosManual: formData.avos_editados,
        dependentesIRRF: formData.dependentes_irrf,
        pensaoAlimenticia: formData.pensao_alimenticia,
        outrosDescontos: formData.outros_descontos,
        outrosDescontosDescricao: formData.outros_descontos_descricao
      });

      if (resultado.erro) {
        toast({ title: 'Erro', description: resultado.erro, variant: 'destructive' });
        setIsCalculating(false);
        return;
      }

      // Atualizar alertas
      setAlertasCalculo(resultado.alertas || []);

      setFormData(prev => ({
        ...prev,
        avos_calculados: resultado.avos_calculados,
        avos_descontados_faltas: resultado.avos_descontados_faltas,
        avos_descontados_afastamento: resultado.avos_descontados_afastamento,
        salario_base: resultado.salario_base,
        salario_base_origem: resultado.salario_base_origem,
        media_horas_extras: resultado.media_horas_extras,
        media_comissoes: resultado.media_comissoes,
        media_outros: resultado.media_outros,
        periodo_calculo_medias: resultado.periodo_calculo_medias,
        meses_considerados_media: resultado.meses_considerados_media,
        valor_bruto: resultado.valor_bruto,
        base_calculo_inss: resultado.base_calculo_inss,
        inss: resultado.inss,
        inss_faixa: resultado.inss_faixa,
        base_calculo_irrf: resultado.base_calculo_irrf,
        dependentes_irrf: resultado.dependentes_irrf,
        deducao_dependentes: resultado.deducao_dependentes,
        irrf: resultado.irrf,
        irrf_faixa: resultado.irrf_faixa,
        valor_primeira_parcela: resultado.valor_primeira_parcela,
        valor_liquido: resultado.valor_liquido,
        alertas_calculo: resultado.alertas_calculo
      }));

    } catch (error) {
      console.error('Erro ao calcular dados:', error);
      toast({ title: 'Erro', description: 'Não foi possível calcular dados automaticamente.', variant: 'destructive' });
    } finally {
      setIsCalculating(false);
    }
  };

  const recalcularValores = () => {
    const avos = formData.avos_editados ?? formData.avos_calculados;
    const baseTotal = Number(formData.salario_base) + 
                      Number(formData.media_horas_extras) + 
                      Number(formData.media_comissoes) + 
                      Number(formData.media_outros);
    
    // Valor bruto proporcional aos avos
    const valorBruto = (baseTotal / 12) * avos;
    
    const config13 = configuracoes?.config_13_salario || {};
    const tabelaAno = config13.tabela_inss_vigente || "2024";
    
    let inssResult = { valor: 0, faixa: "N/A" };
    let irrfResult = { valor: 0, faixa: "Isento" };
    let valorPrimeiraParcela = 0;
    let valorLiquido = 0;
    let baseCalcINSS = 0;
    let baseCalcIRRF = 0;

    if (formData.tipo_parcela === "1_parcela") {
      // 1ª parcela: 50% sem descontos
      valorPrimeiraParcela = valorBruto / 2;
      valorLiquido = valorPrimeiraParcela;
    } else if (formData.tipo_parcela === "2_parcela") {
      // 2ª parcela: diferença com descontos sobre valor TOTAL
      valorPrimeiraParcela = valorBruto / 2;
      baseCalcINSS = valorBruto;
      inssResult = calcularINSSProgressivo(valorBruto, tabelaAno);
      baseCalcIRRF = valorBruto - inssResult.valor;
      irrfResult = calcularIRRFProgressivo(baseCalcIRRF, formData.dependentes_irrf, tabelaAno);
      valorLiquido = valorBruto - valorPrimeiraParcela - inssResult.valor - irrfResult.valor - Number(formData.outros_descontos);
    } else {
      // Parcela única: valor total com descontos
      baseCalcINSS = valorBruto;
      inssResult = calcularINSSProgressivo(valorBruto, tabelaAno);
      baseCalcIRRF = valorBruto - inssResult.valor;
      irrfResult = calcularIRRFProgressivo(baseCalcIRRF, formData.dependentes_irrf, tabelaAno);
      valorLiquido = valorBruto - inssResult.valor - irrfResult.valor - Number(formData.outros_descontos);
    }

    setFormData(prev => ({
      ...prev,
      valor_bruto: Number(valorBruto.toFixed(2)),
      base_calculo_inss: Number(baseCalcINSS.toFixed(2)),
      inss: inssResult.valor,
      inss_faixa: inssResult.faixa,
      base_calculo_irrf: irrfResult.baseCalculo || 0,
      deducao_dependentes: irrfResult.deducaoDependentes || 0,
      irrf: irrfResult.valor,
      irrf_faixa: irrfResult.faixa,
      valor_primeira_parcela: Number(valorPrimeiraParcela.toFixed(2)),
      valor_liquido: Number(Math.max(0, valorLiquido).toFixed(2))
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field !== 'avos_editados' && field !== 'avos_calculados') {
      setFormData(prev => ({ ...prev, status: 'editado' }));
    }
  };

  const handleSave = async () => {
    // Validar antes de salvar
    const funcionario = funcionarios.find(f => f.id === formData.funcionario_id);
    const validacaoResult = validarFolha13(formData, funcionario, configuracoes?.config_13_salario);
    setValidacao(validacaoResult);
    
    if (!validacaoResult.valido) {
      toast({ 
        title: '⚠️ Erro de Validação', 
        description: validacaoResult.erros.join('. '), 
        variant: 'destructive' 
      });
      return;
    }
    
    if (validacaoResult.avisos.length > 0) {
      // Mostrar avisos mas permitir continuar
      toast({ 
        title: '⚠️ Atenção', 
        description: validacaoResult.avisos[0], 
        variant: 'default' 
      });
    }

    try {
      const dataToSave = {
        ...formData,
        avos_editados: formData.avos_editados !== formData.avos_calculados ? formData.avos_editados : null,
        status: formData.avos_editados !== null || formData.outros_descontos > 0 ? 'editado' : formData.status
      };

      if (folha13) {
        await base44.entities.Folha13.update(folha13.id, dataToSave);
        toast({ title: 'Sucesso', description: '13º salário atualizado.' });
      } else {
        await base44.entities.Folha13.create(dataToSave);
        toast({ title: 'Sucesso', description: '13º salário criado.' });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    }
  };

  const tipoParcelaLabels = {
    "1_parcela": "1ª Parcela",
    "2_parcela": "2ª Parcela",
    "parcela_unica": "Parcela Única"
  };

  const avosAtual = formData.avos_editados ?? formData.avos_calculados;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[88vh] modern-modal" 
        onPointerDownOutside={(e) => e.preventDefault()}
        style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
      >
        <style>{`
          .modern-modal::-webkit-scrollbar { width: 8px; }
          .modern-modal::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
          .modern-modal::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; }
          .modern-modal::-webkit-scrollbar-thumb:hover { background: #64748b; }
        `}</style>
        
        <DialogHeader className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b border-slate-600">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{folha13 ? 'Editar 13º Salário' : 'Novo 13º Salário'}</h2>
              <p className="text-sm text-slate-300">Preencha os dados do 13º salário</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div onClick={(e) => e.stopPropagation()} className="p-5 pt-2">
          {isCalculating && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">Calculando valores automaticamente...</span>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="bg-slate-100 p-1 rounded-lg grid grid-cols-3 gap-1 mb-4">
              <TabsTrigger value="geral" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 text-xs py-2">
                <Info className="w-3 h-3" /> Geral
              </TabsTrigger>
              <TabsTrigger value="valores" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 text-xs py-2">
                <DollarSign className="w-3 h-3" /> Valores
              </TabsTrigger>
              <TabsTrigger value="observacoes" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 text-xs py-2">
                <FileText className="w-3 h-3" /> Observações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50/50 to-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-black mb-3">Informações Principais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Funcionário *</Label>
                    <SmartInput
                      options={funcionarios.map(f => ({ value: f.id, label: f.nome }))}
                      value={formData.funcionario_id}
                      onChange={(v) => handleInputChange("funcionario_id", v)}
                      placeholder="Selecione o funcionário"
                      className="modern-input text-sm h-9 text-black border border-slate-300"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Ano de Referência *</Label>
                    <Input
                      type="number"
                      min="2020"
                      max="2030"
                      value={formData.ano_referencia}
                      onChange={(e) => handleInputChange("ano_referencia", Number(e.target.value))}
                      className="modern-input text-sm h-9 text-black border border-slate-300"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Tipo de Parcela *</Label>
                    <Select value={formData.tipo_parcela} onValueChange={(v) => handleInputChange("tipo_parcela", v)}>
                      <SelectTrigger className="modern-input text-sm h-9 text-black border border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1_parcela">1ª Parcela (50% s/ descontos)</SelectItem>
                        <SelectItem value="2_parcela">2ª Parcela (diferença c/ descontos)</SelectItem>
                        <SelectItem value="parcela_unica">Parcela Única</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Plano de Contas</Label>
                    <SmartInput
                      options={planoContas.map(pc => ({ value: pc.id, label: `${pc.codigo || ''} ${pc.nome}` }))}
                      value={formData.plano_contas_id}
                      onChange={(v) => handleInputChange("plano_contas_id", v)}
                      placeholder="Selecione"
                      className="modern-input text-sm h-9 text-black border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-black flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-700" /> Avos do 13º
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={calcularDadosFuncionario}
                    disabled={isCalculating}
                    className="text-xs h-7 gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Recalcular
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Avos Calculados</Label>
                    <Input
                      type="number"
                      value={formData.avos_calculados}
                      readOnly
                      className="modern-input bg-slate-100 text-sm h-9 text-slate-900 border border-slate-300 font-semibold"
                    />
                    <p className="text-xs text-slate-600 mt-1">Calculado automaticamente</p>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Avos (Editável)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="12"
                      value={formData.avos_editados ?? formData.avos_calculados}
                      onChange={(e) => handleInputChange("avos_editados", Number(e.target.value))}
                      className="modern-input text-sm h-9 text-black border border-slate-300 font-semibold"
                    />
                    <p className="text-xs text-slate-600 mt-1">Altere se necessário</p>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded-md">
                  <p className="text-xs text-blue-800">
                    <strong>💡 {avosAtual}/12 avos</strong> — O 13º será calculado proporcionalmente
                  </p>
                </div>
                
                {/* Alertas de faltas/afastamentos */}
                {(formData.avos_descontados_faltas > 0 || formData.avos_descontados_afastamento > 0) && (
                  <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded-md">
                    <p className="text-xs text-amber-800 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Avos descontados:
                    </p>
                    {formData.avos_descontados_faltas > 0 && (
                      <p className="text-xs text-amber-700 ml-4">• {formData.avos_descontados_faltas} por faltas</p>
                    )}
                    {formData.avos_descontados_afastamento > 0 && (
                      <p className="text-xs text-amber-700 ml-4">• {formData.avos_descontados_afastamento} por afastamento</p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Alertas do Cálculo */}
              {alertasCalculo.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Alertas do Cálculo
                  </h3>
                  <ul className="space-y-1">
                    {alertasCalculo.map((alerta, idx) => (
                      <li key={idx} className="text-xs text-amber-800 flex items-start gap-2">
                        <span className="text-amber-600">•</span>
                        {alerta}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50/50 to-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-black mb-3">Pagamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Data de Pagamento</Label>
                    <Input
                      type="date"
                      value={formData.data_pagamento}
                      onChange={(e) => handleInputChange("data_pagamento", e.target.value)}
                      className="modern-input text-sm h-9 text-black border border-slate-300"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="valores" className="space-y-4 mt-4">
              <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50/50 to-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-green-900 mb-3">Base de Cálculo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Salário Base</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.salario_base}
                      onChange={(e) => handleInputChange("salario_base", Number(e.target.value))}
                      className="modern-input text-sm h-9 text-black border border-slate-300"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Média Horas Extras</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.media_horas_extras}
                      onChange={(e) => handleInputChange("media_horas_extras", Number(e.target.value))}
                      className="modern-input text-sm h-9 text-black border border-slate-300"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Média Comissões</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.media_comissoes}
                      onChange={(e) => handleInputChange("media_comissoes", Number(e.target.value))}
                      className="modern-input text-sm h-9 text-black border border-slate-300"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Média Outros Adicionais</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.media_outros}
                      onChange={(e) => handleInputChange("media_outros", Number(e.target.value))}
                      className="modern-input text-sm h-9 text-black border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-red-200 bg-gradient-to-br from-red-50/50 to-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-red-900 mb-3">Descontos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">INSS</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.inss}
                      onChange={(e) => handleInputChange("inss", Number(e.target.value))}
                      className="modern-input text-sm h-9 text-black bg-red-50 border border-red-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">IRRF</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.irrf}
                      onChange={(e) => handleInputChange("irrf", Number(e.target.value))}
                      className="modern-input text-sm h-9 text-black bg-red-50 border border-red-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-black mb-1">Outros Descontos</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.outros_descontos}
                      onChange={(e) => handleInputChange("outros_descontos", Number(e.target.value))}
                      className="modern-input text-sm h-9 text-black bg-red-50 border border-red-200"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4 rounded-lg text-white">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-300 mb-1">Valor Bruto ({avosAtual}/12 avos)</p>
                    <p className="text-lg font-bold">{formatCurrency(formData.valor_bruto)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 mb-1">Total Descontos</p>
                    <p className="text-lg font-bold text-red-300">
                      {formatCurrency(formData.inss + formData.irrf + formData.outros_descontos)}
                    </p>
                    <div className="flex justify-center gap-2 mt-1">
                      {formData.inss_faixa && (
                        <Badge variant="outline" className="text-[10px] bg-white/10 border-white/30 text-white">
                          INSS: {formData.inss_faixa}
                        </Badge>
                      )}
                      {formData.irrf_faixa && (
                        <Badge variant="outline" className="text-[10px] bg-white/10 border-white/30 text-white">
                          IRRF: {formData.irrf_faixa}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 mb-1">
                      {formData.tipo_parcela === "1_parcela" ? "1ª Parcela" : 
                       formData.tipo_parcela === "2_parcela" ? "2ª Parcela" : "Valor Líquido"}
                    </p>
                    <p className="text-2xl font-bold">{formatCurrency(formData.valor_liquido)}</p>
                    {formData.valor_liquido < 0 && (
                      <Badge variant="destructive" className="mt-1 text-[10px]">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Valor Negativo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Detalhes INSS/IRRF */}
              {(formData.tipo_parcela !== "1_parcela") && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-semibold text-black mb-2">Cálculo INSS Progressivo</p>
                    <div className="space-y-1 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span>Base de cálculo:</span>
                        <span className="font-medium text-black">{formatCurrency(formData.base_calculo_inss)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Faixa aplicada:</span>
                        <span className="font-medium text-black">{formData.inss_faixa || '-'}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-semibold">Total INSS:</span>
                        <span className="font-bold text-red-700">{formatCurrency(formData.inss)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-semibold text-black mb-2">Cálculo IRRF Progressivo</p>
                    <div className="space-y-1 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span>Base de cálculo:</span>
                        <span className="font-medium text-black">{formatCurrency(formData.base_calculo_irrf)}</span>
                      </div>
                      {formData.dependentes_irrf > 0 && (
                        <div className="flex justify-between">
                          <span>Dedução ({formData.dependentes_irrf} dep.):</span>
                          <span className="font-medium text-black">- {formatCurrency(formData.deducao_dependentes)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Faixa aplicada:</span>
                        <span className="font-medium text-black">{formData.irrf_faixa || '-'}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-semibold">Total IRRF:</span>
                        <span className="font-bold text-red-700">{formatCurrency(formData.irrf)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {formData.tipo_parcela !== "parcela_unica" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    <strong>ℹ️ {tipoParcelaLabels[formData.tipo_parcela]}:</strong>{" "}
                    {formData.tipo_parcela === "1_parcela" 
                      ? "50% do valor bruto, sem descontos de INSS/IRRF."
                      : "Diferença do valor bruto menos 1ª parcela, com descontos de INSS e IRRF."}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="observacoes" className="mt-4">
              <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50/50 to-white p-4 shadow-sm">
                <Label className="text-xs font-semibold text-black mb-2 block">Observações</Label>
                <Textarea
                  placeholder="Observações sobre o 13º salário..."
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange("observacoes", e.target.value)}
                  rows={8}
                  className="modern-input resize-none text-sm text-black border border-slate-300"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="gap-2 px-6 text-sm h-9 border-2 border-slate-300 text-slate-900 hover:bg-slate-50 font-semibold"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              className="gap-2 px-6 bg-slate-900 hover:bg-slate-800 text-white text-sm h-9 font-semibold"
              disabled={isCalculating}
            >
              <Save className="w-4 h-4" /> {folha13 ? "Salvar Alterações" : "Criar 13º"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}