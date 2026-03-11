import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Info, FileText, Loader2, Save, X } from "lucide-react";
import SmartInput from "@/components/SmartInput";
import { useToast } from '@/components/ui/use-toast';
import { base44 } from "@/api/base44Client";

// Helper function to calculate days in a month
const calcularDiasDoMes = (competencia) => {
  if (!competencia) return 30; // Default if no competence
  const [ano, mes] = competencia.split('-');
  return new Date(Number(ano), Number(mes), 0).getDate();
};

export default function FolhaPagamentoForm({ isOpen, onClose, folha, funcionarios, planoContas, onSave }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("geral");
  const [isCalculating, setIsCalculating] = useState(false);
  const [salarioIntegral, setSalarioIntegral] = useState(0); // Stores the full salary of the selected employee

  const [formData, setFormData] = useState({
    funcionario_id: "",
    plano_contas_id: "",
    competencia: "",
    dias_trabalhados: 0,
    data_inicio_competencia: "",
    salario_base: 0,
    comissoes: 0,
    horas_extras: 0,
    bonus: 0,
    outras_entradas: 0,
    adiantamentos: 0,
    faltas: 0,
    encargos: 0,
    outras_saidas: 0,
    data_pagamento: "",
    status_pagamento: "pendente",
    observacoes: "",
    salario_liquido: 0, // NEW FIELD
  });

  useEffect(() => {
    if (folha) {
      setFormData({
        funcionario_id: folha.funcionario_id || "",
        plano_contas_id: folha.plano_contas_id || "",
        competencia: folha.competencia || "",
        dias_trabalhados: Number(folha.dias_trabalhados) || 0,
        data_inicio_competencia: folha.data_inicio_competencia || "",
        salario_base: Number(folha.salario_base) || 0,
        comissoes: Number(folha.comissoes) || 0,
        horas_extras: Number(folha.horas_extras) || 0,
        bonus: Number(folha.bonus) || 0,
        outras_entradas: Number(folha.outras_entradas) || 0,
        adiantamentos: Number(folha.adiantamentos) || 0,
        faltas: Number(folha.faltas) || 0,
        encargos: Number(folha.encargos) || 0,
        outras_saidas: Number(folha.outras_saidas) || 0,
        data_pagamento: folha.data_pagamento || "",
        status_pagamento: folha.status_pagamento || "pendente",
        observacoes: folha.observacoes || "",
        salario_liquido: Number(folha.salario_liquido) || 0
      });
      // Set salarioIntegral if editing an existing 'folha'
      const func = funcionarios.find((f) => f.id === folha.funcionario_id);
      if (func) {
        setSalarioIntegral(Number(func.salario) || 0);
      }
    } else {
      setFormData({
        funcionario_id: "",
        plano_contas_id: "",
        competencia: "",
        dias_trabalhados: 0,
        data_inicio_competencia: "",
        salario_base: 0,
        comissoes: 0,
        horas_extras: 0,
        bonus: 0,
        outras_entradas: 0,
        adiantamentos: 0,
        faltas: 0,
        encargos: 0,
        outras_saidas: 0,
        data_pagamento: "",
        status_pagamento: "pendente",
        observacoes: "",
        salario_liquido: 0
      });
      setSalarioIntegral(0); // Reset for new form
    }
    setActiveTab("geral");
  }, [folha, isOpen, funcionarios]);

  // Calculate proportional salary when dias_trabalhados or data_inicio_competencia change
  useEffect(() => {
    if (!formData.competencia || salarioIntegral === 0) {
      // If essential data is missing or salarioIntegral is not set yet, or if competence is empty, do nothing.
      // If dias_trabalhados becomes 0 and data_inicio_competencia is empty, revert salario_base to salarioIntegral
      if (salarioIntegral > 0 && formData.salario_base !== salarioIntegral && formData.dias_trabalhados === 0 && !formData.data_inicio_competencia) {
        setFormData((prev) => ({ ...prev, salario_base: salarioIntegral }));
      }
      return;
    }

    const currentDataInicioCompetencia = formData.data_inicio_competencia;
    let currentDiasTrabalhados = 0;

    // If data_inicio_competencia is provided, it takes precedence for dias_trabalhados calculation
    if (currentDataInicioCompetencia && formData.competencia) {
      const [ano, mes] = formData.competencia.split('-');
      const dataInicio = new Date(currentDataInicioCompetencia + 'T00:00:00'); // Ensure consistent time zone

      // Check if dataInicio is within the competence month
      const mesCompetenciaNum = Number(mes);
      if (dataInicio.getFullYear() === Number(ano) && dataInicio.getMonth() + 1 === mesCompetenciaNum) {
        const ultimoDiaMes = calcularDiasDoMes(formData.competencia);
        currentDiasTrabalhados = ultimoDiaMes - dataInicio.getDate() + 1;
      } else {
        // If dataInicio is not in the current competence month, treat as full month or user specified days
        currentDiasTrabalhados = 0; // Will revert to full salary
      }

      // Update dias_trabalhados automatically in state only if it changed
      if (formData.dias_trabalhados !== currentDiasTrabalhados) {
        setFormData((prev) => ({
          ...prev,
          dias_trabalhados: currentDiasTrabalhados
        }));
      }
    } else {
      // If no data_inicio_competencia, then currentDiasTrabalhados should reflect user input, or 0 if user input is 0.
      // However, the input for dias_trabalhados is now read-only. So if data_inicio_competencia is cleared,
      // dias_trabalhados should also be cleared (set to 0) to revert to full month.
      if (!currentDataInicioCompetencia && formData.dias_trabalhados !== 0) {
        setFormData((prev) => ({ ...prev, dias_trabalhados: 0 }));
      }
    }

    // Calculate proportional salary if currentDiasTrabalhados > 0
    if (currentDiasTrabalhados > 0) {
      const diasDoMes = calcularDiasDoMes(formData.competencia);
      const salarioProporcional = salarioIntegral / diasDoMes * currentDiasTrabalhados;

      if (formData.salario_base !== Number(salarioProporcional.toFixed(2))) {
        setFormData((prev) => ({
          ...prev,
          salario_base: Number(salarioProporcional.toFixed(2))
        }));
      }
    } else {
      // If dias_trabalhados is 0 or not applicable (e.g. data_inicio_competencia not in month), revert to integral salary
      if (formData.salario_base !== salarioIntegral) {
        setFormData((prev) => ({
          ...prev,
          salario_base: salarioIntegral
        }));
      }
    }
  }, [formData.data_inicio_competencia, formData.competencia, salarioIntegral, formData.dias_trabalhados, formData.salario_base]);

  // Calculate data when employee and competence are selected
  useEffect(() => {
    // Only auto-calculate for new entries (folha is null) or if a specific folha is not being edited
    // and funcionario_id/competencia change
    if (!folha && formData.funcionario_id && formData.competencia) {
      calcularDadosFuncionario();
    } else if (folha && formData.funcionario_id && formData.competencia) {
      // If editing, ensure salarioIntegral is set if not already, then let the proportional effect handle the rest
      const func = funcionarios.find((f) => f.id === formData.funcionario_id);
      if (func && salarioIntegral === 0) { // Only fetch if not already set or updated by a previous calculation
        setSalarioIntegral(Number(func.salario) || 0);
      }
    }
  }, [formData.funcionario_id, formData.competencia]);


  const calcularDadosFuncionario = async () => {
    if (!formData.funcionario_id || !formData.competencia) return;

    setIsCalculating(true);
    try {
      // Fetch employee data
      const funcionario = funcionarios.find((f) => f.id === formData.funcionario_id);
      if (!funcionario) {
        setIsCalculating(false);
        return;
      }

      // Store integral salary for proportional and other calculations
      const salarioFuncionario = Number(funcionario.salario) || 0;
      setSalarioIntegral(salarioFuncionario);

      let salarioBaseCalculated = salarioFuncionario; // Default to full salary
      let diasTrabalhadosCalculated = 0;
      let dataInicioCompetenciaCalculated = "";

      // Check if employee started in the middle of the month
      const [ano, mes] = formData.competencia.split('-');
      const mesCompetenciaNum = Number(mes);
      const dataInicioFunc = funcionario.data_inicio ? new Date(funcionario.data_inicio + 'T00:00:00') : null;

      // If employee's start date is within the competence month
      if (dataInicioFunc &&
        dataInicioFunc.getFullYear() === Number(ano) &&
        dataInicioFunc.getMonth() + 1 === mesCompetenciaNum) {
        const ultimoDiaMes = calcularDiasDoMes(formData.competencia);
        diasTrabalhadosCalculated = ultimoDiaMes - dataInicioFunc.getDate() + 1;
        dataInicioCompetenciaCalculated = funcionario.data_inicio;

        // Calculate proportional base salary
        salarioBaseCalculated = salarioFuncionario / ultimoDiaMes * diasTrabalhadosCalculated;
      }

      // Fetch configurations
      const configs = await base44.entities.Configuracoes.list();
      const config = configs?.[0] || {};
      const apenasOSFinalizadas = config.calcular_comissao_apenas_os_finalizadas !== false;

      // Fetch approved/paid advances for the competence period
      // Include both "pago" and "aprovado" status since approved advances should also be deducted
      const todosAdiantamentos = await base44.entities.Adiantamento.filter({
        funcionario_id: formData.funcionario_id,
        competencia: formData.competencia
      });
      // Filter for status "pago" or "aprovado" (paid or approved advances)
      const adiantamentosValidos = todosAdiantamentos.filter(a => 
        a.status === "pago" || a.status === "aprovado"
      );
      const totalAdiantamentos = adiantamentosValidos.reduce((sum, a) => sum + (Number(a.valor) || 0), 0);

      // Fetch point records for the competence period
      const pontos = await base44.entities.ControlePonto.filter({
        funcionario_id: formData.funcionario_id,
        mes_referencia: formData.competencia
      });
      const pontoFuncionario = pontos?.[0];

      // Calculate overtime (using full salary for per hour rate)
      const horasExtrasSemana = Number(pontoFuncionario?.horas_extras_semana || 0);
      const horasExtrasFds = Number(pontoFuncionario?.horas_extras_fds || 0);
      const fatorSemana = Number(funcionario.fator_hora_extra_semana || 1.5);
      const fatorFds = Number(funcionario.fator_hora_extra_fds || 2);
      const salarioPorHora = salarioFuncionario / 220; // Use full salary
      const valorHorasExtras =
        horasExtrasSemana * salarioPorHora * fatorSemana +
        horasExtrasFds * salarioPorHora * fatorFds;

      // Calculate absences (using full salary for daily/hourly rate)
      const faltasDias = Number(pontoFuncionario?.faltas_dias || 0);
      const faltasHoras = Number(pontoFuncionario?.faltas_horas || 0);
      let valorFaltas = 0;
      if (funcionario.regra_desconto_falta === "dia_cheio") {
        valorFaltas = salarioFuncionario / 30 * faltasDias; // Use full salary
      } else {
        valorFaltas = salarioPorHora * faltasHoras + salarioFuncionario / 30 * faltasDias; // Use full salary
      }

      // Calculate charges (Estimated INSS + FGTS: 11% INSS + 8% FGTS = 19%)
      const encargos = salarioFuncionario * 0.19; // Use full salary

      // Calculate commissions
      let comissoes = 0;
      if (funcionario.cargo_id) {
        const cargos = await base44.entities.Cargo.list();
        const cargo = cargos.find((c) => c.id === funcionario.cargo_id);

        if (cargo && cargo.tem_comissao) {
          const percentualComissao = Number(cargo.percentual_comissao || 0);

          if (percentualComissao > 0) {
            // Fetch service orders for the competence period
            const dataInicio = `${ano}-${mes}-01`;
            const ultimoDia = calcularDiasDoMes(formData.competencia);
            const dataFim = `${ano}-${mes}-${ultimoDia}`;

            const todasOS = await base44.entities.OrdemServico.list();
            const osDaCompetencia = todasOS.filter((os) => {
              if (!os?.data_conclusao) return false;
              const dataOS = os.data_conclusao;
              return dataOS >= dataInicio && dataOS <= dataFim;
            });

            // Filter only finalized if configured
            const osParaComissao = apenasOSFinalizadas ?
              osDaCompetencia.filter((os) => os.status === 'finalizado') :
              osDaCompetencia;

            if (cargo.tipo_comissao === 'individual') {
              // Individual commission
              const vendasFuncionario = osParaComissao.
                filter((os) => os.vendedor_id === formData.funcionario_id).
                reduce((sum, os) => sum + (Number(os.valor_total) || 0), 0);

              const metaMinima = Number(cargo.meta_minima_individual || 0);

              if (vendasFuncionario >= metaMinima) {
                if (cargo.base_calculo_comissao === 'excedente' && metaMinima > 0) {
                  const excedente = vendasFuncionario - metaMinima;
                  comissoes = excedente * percentualComissao / 100;
                } else {
                  comissoes = vendasFuncionario * percentualComissao / 100;
                }
              }
            } else if (cargo.tipo_comissao === 'empresa') {
              // Commission on total company sales
              const valorTotalEmpresa = osParaComissao.reduce((sum, os) =>
                sum + (Number(os.valor_total) || 0), 0
              );
              const metaMinimaEmpresa = Number(cargo.meta_minima_empresa || 0);

              if (valorTotalEmpresa >= metaMinimaEmpresa) {
                if (cargo.base_calculo_comissao === 'excedente' && metaMinimaEmpresa > 0) {
                  const excedente = valorTotalEmpresa - metaMinimaEmpresa;
                  comissoes = excedente * percentualComissao / 100;
                } else {
                  comissoes = valorTotalEmpresa * percentualComissao / 100;
                }
              }
            }
          }
        }
      }

      // Update formData with calculated values
      setFormData((prev) => ({
        ...prev,
        dias_trabalhados: diasTrabalhadosCalculated,
        data_inicio_competencia: dataInicioCompetenciaCalculated,
        salario_base: Number(salarioBaseCalculated.toFixed(2)),
        comissoes: Number(comissoes.toFixed(2)),
        horas_extras: Number(valorHorasExtras.toFixed(2)),
        adiantamentos: Number(totalAdiantamentos.toFixed(2)),
        faltas: Number(valorFaltas.toFixed(2)),
        encargos: Number(encargos.toFixed(2))
      }));

    } catch (error) {
      console.error('Erro ao calcular dados do funcionário:', error);
      toast({ title: 'Erro', description: 'Não foi possível calcular dados automaticamente.', variant: 'destructive' });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calcularTotais = () => {
    const entradas =
      Number(formData.salario_base || 0) +
      Number(formData.comissoes || 0) +
      Number(formData.horas_extras || 0) +
      Number(formData.bonus || 0) +
      Number(formData.outras_entradas || 0);

    const saidas =
      Number(formData.adiantamentos || 0) +
      Number(formData.faltas || 0) +
      Number(formData.encargos || 0) +
      Number(formData.outras_saidas || 0);

    const liquido = entradas - saidas;

    return { entradas, saidas, liquido };
  };

  // Effect to update salario_liquido whenever relevant fields change
  useEffect(() => {
    const { liquido } = calcularTotais();
    if (formData.salario_liquido !== Number(liquido.toFixed(2))) { // Ensure two decimal places for comparison
      setFormData((prev) => ({ ...prev, salario_liquido: Number(liquido.toFixed(2)) }));
    }
  }, [
    formData.salario_base,
    formData.comissoes,
    formData.horas_extras,
    formData.bonus,
    formData.outras_entradas,
    formData.adiantamentos,
    formData.faltas,
    formData.encargos,
    formData.outras_saidas
  ]);


  const handleSave = async () => {
    if (!formData.funcionario_id || !formData.competencia) {
      toast({ title: '⚠️ Atenção', description: 'Preencha o funcionário e a competência.', variant: 'destructive' });
      return;
    }

    try {
      const { entradas, saidas, liquido } = calcularTotais();
      const dataToSave = {
        ...formData,
        total_entradas: Number(entradas.toFixed(2)),
        total_saidas: Number(saidas.toFixed(2)),
        salario_liquido: Number(liquido.toFixed(2))
      };

      if (folha) {
        await base44.entities.FolhaPagamento.update(folha.id, dataToSave);
        toast({ title: 'Sucesso', description: 'Folha de pagamento atualizada com êxito.' });
      } else {
        await base44.entities.FolhaPagamento.create(dataToSave);
        toast({ title: 'Sucesso', description: 'Folha de pagamento criada com êxito.' });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a folha de pagamento. Verifique os dados e tente novamente.', variant: 'destructive' });
    }
  };

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const tabTriggerClass = "flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent whitespace-nowrap";
  const SectionHdr = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 mb-3">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl border-0"
        data-custom-modal="true"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-4 rounded-t-xl flex-shrink-0" style={{ background: "#0B1629" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight truncate" style={{ color: '#fff' }}>
                {folha ? 'Editar Folha de Pagamento' : 'Nova Folha de Pagamento'}
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Preencha os dados da folha</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs nav */}
        <div className="border-b border-slate-200 bg-white flex-shrink-0 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="flex bg-transparent p-0 h-auto gap-0 w-max min-w-full">
              <TabsTrigger value="geral" className={tabTriggerClass}><Info className="w-3.5 h-3.5" /> Geral</TabsTrigger>
              <TabsTrigger value="valores" className={tabTriggerClass}><DollarSign className="w-3.5 h-3.5" /> Valores</TabsTrigger>
              <TabsTrigger value="observacoes" className={tabTriggerClass}><FileText className="w-3.5 h-3.5" /> Observações</TabsTrigger>
            </TabsList>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-5">
              {isCalculating && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700">Calculando valores automaticamente...</span>
                </div>
              )}

              <TabsContent value="geral" className="space-y-3 mt-0">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHdr icon={Info} title="Funcionário e Competência" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Funcionário *</Label>
                      <SmartInput options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))} value={formData.funcionario_id} onChange={(v) => handleInputChange("funcionario_id", v)} placeholder="Selecione o funcionário" className="text-sm h-9" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Competência *</Label>
                      <Input type="month" value={formData.competencia} onChange={(e) => handleInputChange("competencia", e.target.value)} className="text-sm h-9" required />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHdr icon={Info} title="Cálculo Proporcional (Opcional)" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Data de Início na Competência</Label>
                      <Input type="date" value={formData.data_inicio_competencia} onChange={(e) => handleInputChange("data_inicio_competencia", e.target.value)} className="text-sm h-9" disabled={!formData.funcionario_id || !formData.competencia} />
                      <p className="text-[10px] text-slate-400 mt-1">O sistema calcula os dias automaticamente</p>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Dias Trabalhados</Label>
                      <Input type="number" value={formData.dias_trabalhados} readOnly disabled className="text-sm h-9 bg-slate-100" />
                      <p className="text-[10px] text-slate-400 mt-1">{formData.dias_trabalhados > 0 ? 'Cálculo proporcional ativo' : 'Mês integral'}</p>
                    </div>
                  </div>
                  {salarioIntegral > 0 && formData.dias_trabalhados > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>Cálculo:</strong> R$ {salarioIntegral.toFixed(2)} ÷ {calcularDiasDoMes(formData.competencia)} dias × {formData.dias_trabalhados} dias = <strong>R$ {formData.salario_base.toFixed(2)}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHdr icon={DollarSign} title="Dados de Pagamento" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Plano de Contas</Label>
                      <SmartInput options={planoContas.map((pc) => ({ value: pc.id, label: pc.nome }))} value={formData.plano_contas_id} onChange={(v) => handleInputChange("plano_contas_id", v)} placeholder="Selecione" className="text-sm h-9" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Data de Pagamento</Label>
                      <Input type="date" value={formData.data_pagamento} onChange={(e) => handleInputChange("data_pagamento", e.target.value)} className="text-sm h-9" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="valores" className="space-y-3 mt-0">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHdr icon={DollarSign} title="Entradas" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { id: 'salario_base', label: 'Salário Base' },
                      { id: 'comissoes', label: 'Comissões' },
                      { id: 'horas_extras', label: 'Horas Extras' },
                      { id: 'bonus', label: 'Bônus' },
                      { id: 'outras_entradas', label: 'Outras Entradas' },
                    ].map(f => (
                      <div key={f.id} className={f.id === 'outras_entradas' ? 'md:col-span-2' : ''}>
                        <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">{f.label}</Label>
                        <Input type="number" step="0.01" value={formData[f.id]} onChange={(e) => handleInputChange(f.id, Number(e.target.value))} className="text-sm h-9" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHdr icon={FileText} title="Saídas / Descontos" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { id: 'adiantamentos', label: 'Adiantamentos' },
                      { id: 'faltas', label: 'Faltas' },
                      { id: 'encargos', label: 'Encargos' },
                      { id: 'outras_saidas', label: 'Outras Saídas' },
                    ].map(f => (
                      <div key={f.id}>
                        <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">{f.label}</Label>
                        <Input type="number" step="0.01" value={formData[f.id]} onChange={(e) => handleInputChange(f.id, Number(e.target.value))} className="text-sm h-9" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totais */}
                <div className="rounded-xl p-4 grid grid-cols-3 gap-3 text-center" style={{ background: '#0B1629' }}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Entradas</p>
                    <p className="text-sm font-bold" style={{ color: '#fff' }}>{fmt(calcularTotais().entradas)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Saídas</p>
                    <p className="text-sm font-bold" style={{ color: '#fff' }}>{fmt(calcularTotais().saidas)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Salário Líquido</p>
                    <p className="text-lg font-bold" style={{ color: '#34d399' }}>{fmt(calcularTotais().liquido)}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="observacoes" className="mt-0">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHdr icon={FileText} title="Observações" />
                  <Textarea placeholder="Observações sobre a folha de pagamento..." value={formData.observacoes} onChange={(e) => handleInputChange("observacoes", e.target.value)} rows={8} className="resize-none text-sm" />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 md:px-5 py-3 border-t border-slate-200 bg-white rounded-b-xl flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="h-9 px-4 text-sm border-slate-300 text-slate-700 gap-1.5">
            <X className="w-3.5 h-3.5" /> Cancelar
          </Button>
          <Button onClick={handleSave} className="h-9 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white gap-1.5" disabled={isCalculating}>
            <Save className="w-3.5 h-3.5" /> {folha ? "Salvar" : "Criar Folha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}