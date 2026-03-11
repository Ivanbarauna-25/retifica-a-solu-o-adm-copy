import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Settings, DollarSign, Save, X, Calendar, Calculator, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { formatCurrency } from "@/components/formatters";
import { base44 } from "@/api/base44Client";

export default function FolhaPagamentoLoteForm({
  isOpen,
  funcionarios,
  planoContas,
  onSave,
  onClose,
}) {
  const [dataPagamento, setDataPagamento] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [activeTab, setActiveTab] = useState("configuracao");
  const [folhasFuncionarios, setFolhasFuncionarios] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calcular dados quando competência mudar
  useEffect(() => {
    if (competencia && funcionarios.length > 0) {
      calcularDadosFolhas();
    }
  }, [competencia, funcionarios]);

  const calcularDadosFolhas = async () => {
    setIsCalculating(true);
    try {
      // Buscar configurações
      const configuracoes = await base44.entities.Configuracoes.list();
      const config = configuracoes?.[0] || {};
      const apenasOSFinalizadas = config.calcular_comissao_apenas_os_finalizadas !== false;

      // Buscar adiantamentos da competência (incluir aprovados E pagos)
      const todosAdiantamentos = await base44.entities.Adiantamento.filter({
        competencia: competencia
      });
      const adiantamentos = todosAdiantamentos.filter(a => 
        a.status === "pago" || (a.status === "aprovado" && a.data_pagamento)
      );

      // Buscar pontos da competência
      const pontos = await base44.entities.ControlePonto.filter({
        mes_referencia: competencia
      });

      // Buscar OS da competência para cálculo de comissões
      const [anoStr, mesStr] = competencia.split('-');
      const ano = Number(anoStr);
      const mes = Number(mesStr); // 1-indexed month
      const dataInicio = `${anoStr}-${mesStr}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate(); // Get last day of the month
      const dataFim = `${anoStr}-${mesStr}-${ultimoDia}`;
      const diasDoMes = ultimoDia;

      // Buscar todas as OS da competência
      const todasOS = await base44.entities.OrdemServico.list();
      const osDaCompetencia = todasOS.filter(os => {
        if (!os?.data_conclusao) return false;
        // Ensure data_conclusao is in 'YYYY-MM-DD' format for comparison
        const dataConclusaoFormatted = os.data_conclusao.split('T')[0]; // Assuming ISO string 'YYYY-MM-DDTHH:mm:ss.sssZ'
        return dataConclusaoFormatted >= dataInicio && dataConclusaoFormatted <= dataFim;
      });

      // Filtrar apenas finalizadas se configurado
      const osParaComissao = apenasOSFinalizadas
        ? osDaCompetencia.filter(os => os.status === 'finalizado')
        : osDaCompetencia;

      // Buscar cargos para pegar políticas de comissão
      const cargos = await base44.entities.Cargo.list();
      const cargosMap = {};
      cargos.forEach(c => {
        if (c?.id) cargosMap[c.id] = c; // Ensure c.id exists
      });

      // Calcular valor total de vendas da empresa (para metas de empresa)
      const valorTotalEmpresa = osParaComissao.reduce((sum, os) =>
        sum + (Number(os.valor_total) || 0), 0
      );

      // Criar mapa de funcionários com seus dados
      const folhas = funcionarios.map(func => {
        // Lógica para salário proporcional (início no meio do mês)
        const salarioIntegral = Number(func.salario) || 0;
        let salarioBase = salarioIntegral;
        let diasTrabalhados = diasDoMes;
        let dataInicioCompetencia = null; // Storing this for reference if needed

        if (func.data_inicio) {
          const dataInicioFunc = new Date(func.data_inicio + 'T00:00:00'); // Ensure it's treated as UTC/start of day
          
          // Check if employee started in the current competence month and year
          if (dataInicioFunc.getFullYear() === ano && dataInicioFunc.getMonth() + 1 === mes) {
            diasTrabalhados = diasDoMes - dataInicioFunc.getDate() + 1;
            salarioBase = (salarioIntegral / diasDoMes) * diasTrabalhados;
            dataInicioCompetencia = func.data_inicio; // Store original start date string
          }
        }

        // Adiantamentos do funcionário
        const adiantamentosFuncionario = adiantamentos?.filter(a => a.funcionario_id === func.id) || [];
        const totalAdiantamentos = adiantamentosFuncionario.reduce((sum, a) => sum + (Number(a.valor) || 0), 0);

        // Ponto do funcionário
        const pontoFuncionario = pontos?.find(p => p.funcionario_id === func.id);

        // Calcular horas extras
        const horasExtrasSemana = Number(pontoFuncionario?.horas_extras_semana || 0);
        const horasExtrasFds = Number(pontoFuncionario?.horas_extras_fds || 0);
        const fatorSemana = Number(func.fator_hora_extra_semana || 1.5);
        const fatorFds = Number(func.fator_hora_extra_fds || 2);
        const salarioPorHora = salarioIntegral / 220; // 220 horas/mês
        const valorHorasExtras =
          (horasExtrasSemana * salarioPorHora * fatorSemana) +
          (horasExtrasFds * salarioPorHora * fatorFds);

        // Calcular faltas
        const faltasDias = Number(pontoFuncionario?.faltas_dias || 0);
        const faltasHoras = Number(pontoFuncionario?.faltas_horas || 0);
        let valorFaltas = 0;
        if (func.regra_desconto_falta === "dia_cheio") {
          valorFaltas = (salarioIntegral / 30) * faltasDias;
        } else {
          valorFaltas = salarioPorHora * faltasHoras;
        }

        // ===== CALCULAR COMISSÕES =====
        let comissoes = 0;

        // Verificar se o cargo tem direito a comissão
        const cargo = cargosMap[func.cargo_id];
        if (cargo && cargo.tem_comissao) {
          const percentualComissao = Number(cargo.percentual_comissao || 0);

          if (percentualComissao > 0) {
            if (cargo.tipo_comissao === 'individual') {
              // Comissão individual: sobre vendas do próprio funcionário
              const vendasFuncionario = osParaComissao
                .filter(os => os.vendedor_id === func.id)
                .reduce((sum, os) => sum + (Number(os.valor_total) || 0), 0);

              const metaMinima = Number(cargo.meta_minima_individual || 0);

              if (vendasFuncionario >= metaMinima) {
                if (cargo.base_calculo_comissao === 'excedente' && metaMinima > 0) {
                  // Comissão sobre o que exceder a meta
                  const excedente = vendasFuncionario - metaMinima;
                  comissoes = (excedente * percentualComissao) / 100;
                } else {
                  // Comissão sobre o total
                  comissoes = (vendasFuncionario * percentualComissao) / 100;
                }
              }
            } else if (cargo.tipo_comissao === 'empresa') {
              // Comissão sobre vendas totais da empresa
              const metaMinimaEmpresa = Number(cargo.meta_minima_empresa || 0);

              if (valorTotalEmpresa >= metaMinimaEmpresa) {
                if (cargo.base_calculo_comissao === 'excedente' && metaMinimaEmpresa > 0) {
                  // Comissão sobre o que exceder a meta
                  const excedente = valorTotalEmpresa - metaMinimaEmpresa;
                  comissoes = (excedente * percentualComissao) / 100;
                } else {
                  comissoes = (valorTotalEmpresa * percentualComissao) / 100;
                }
              }
            }
          }
        }

        const totalEntradas = salarioBase + valorHorasExtras + comissoes;
        const totalSaidas = totalAdiantamentos + valorFaltas;
        const salarioLiquido = totalEntradas - totalSaidas;

        return {
          funcionario_id: func.id,
          nome: func.nome,
          cargo: func.funcao || "N/A",
          departamento: func.departamento || "N/A",
          dias_trabalhados: diasTrabalhados, // New field
          data_inicio_competencia: dataInicioCompetencia, // New field (string date)
          salario_integral: salarioIntegral, // New field
          salario_base: Number(salarioBase.toFixed(2)),
          comissoes: Number(comissoes.toFixed(2)),
          horas_extras: Number(valorHorasExtras.toFixed(2)),
          bonus: 0,
          outras_entradas: 0,
          adiantamentos: Number(totalAdiantamentos.toFixed(2)),
          faltas: Number(valorFaltas.toFixed(2)),
          encargos: 0,
          outras_saidas: 0,
          total_entradas: Number(totalEntradas.toFixed(2)),
          total_saidas: Number(totalSaidas.toFixed(2)),
          salario_liquido: Number(salarioLiquido.toFixed(2)),
          selecionado: true,
          // Dados para referência
          _horas_extras_semana: horasExtrasSemana,
          _horas_extras_fds: horasExtrasFds,
          _faltas_dias: faltasDias,
          _faltas_horas: faltasHoras,
          _dias_do_mes: diasDoMes, // For proportional salary calculation
        };
      });

      setFolhasFuncionarios(folhas);
    } catch (error) {
      console.error("Erro ao calcular dados das folhas:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFieldChange = (funcionarioId, field, value) => {
    setFolhasFuncionarios(prev => {
      return prev.map(folha => {
        if (folha.funcionario_id !== funcionarioId) return folha;

        const updatedFolha = { ...folha, [field]: Number(value) || 0 };

        // Recalcular totais
        const totalEntradas =
          Number(updatedFolha.salario_base) +
          Number(updatedFolha.comissoes) +
          Number(updatedFolha.horas_extras) +
          Number(updatedFolha.bonus) +
          Number(updatedFolha.outras_entradas);

        const totalSaidas =
          Number(updatedFolha.adiantamentos) +
          Number(updatedFolha.faltas) +
          Number(updatedFolha.encargos) +
          Number(updatedFolha.outras_saidas);

        updatedFolha.total_entradas = Number(totalEntradas.toFixed(2));
        updatedFolha.total_saidas = Number(totalSaidas.toFixed(2));
        updatedFolha.salario_liquido = Number((totalEntradas - totalSaidas).toFixed(2));

        return updatedFolha;
      });
    });
  };

  const toggleSelecionado = (funcionarioId) => {
    setFolhasFuncionarios(prev =>
      prev.map(folha =>
        folha.funcionario_id === funcionarioId
          ? { ...folha, selecionado: !folha.selecionado }
          : folha
      )
    );
  };

  const toggleSelectAll = (checked) => {
    setFolhasFuncionarios(prev =>
      prev.map(folha => ({ ...folha, selecionado: checked }))
    );
  };

  const folhasSelecionadas = useMemo(
    () => folhasFuncionarios.filter(f => f.selecionado),
    [folhasFuncionarios]
  );

  const totalSelecionado = useMemo(
    () => folhasSelecionadas.reduce((sum, f) => sum + (Number(f.salario_liquido) || 0), 0),
    [folhasSelecionadas]
  );

  const todosSelecionados = useMemo(
    () => folhasFuncionarios.length > 0 && folhasFuncionarios.every(f => f.selecionado),
    [folhasFuncionarios]
  );

  const handleGenerate = async () => {
    if (!dataPagamento) {
      alert("Informe a data do pagamento.");
      return;
    }
    if (!competencia) {
      alert("Informe a competência.");
      return;
    }
    if (folhasSelecionadas.length === 0) {
      alert("Selecione pelo menos um funcionário.");
      return;
    }

    const registros = folhasSelecionadas.map(folha => ({
      funcionario_id: folha.funcionario_id,
      competencia,
      dias_trabalhados: folha.dias_trabalhados || 0,
      data_inicio_competencia: folha.data_inicio_competencia || null,
      data_pagamento: dataPagamento,
      salario_base: folha.salario_base || 0,
      comissoes: folha.comissoes || 0,
      horas_extras: folha.horas_extras || 0,
      bonus: folha.bonus || 0,
      outras_entradas: folha.outras_entradas || 0,
      adiantamentos: folha.adiantamentos || 0,
      faltas: folha.faltas || 0,
      encargos: folha.encargos || 0,
      outras_saidas: folha.outras_saidas || 0,
      total_entradas: folha.total_entradas || 0,
      total_saidas: folha.total_saidas || 0,
      salario_liquido: folha.salario_liquido || 0,
      status_pagamento: "pendente",
      observacoes: (folha.dias_trabalhados && folha._dias_do_mes && folha.dias_trabalhados < folha._dias_do_mes)
        ? `Folha gerada em lote - ${new Date().toLocaleDateString()} | Salário proporcional: ${folha.dias_trabalhados} dias trabalhados`
        : `Folha gerada em lote - ${new Date().toLocaleDateString()}`
    }));

    try {
      await onSave(registros);
    } catch (error) {
      console.error("Erro ao salvar folhas:", error);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setDataPagamento("");
      setCompetencia("");
      setFolhasFuncionarios([]);
      setActiveTab("configuracao");
    }
  }, [isOpen]);

  const tabTriggerClass = "flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent whitespace-nowrap";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[98vw] w-full max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl border-0"
        data-custom-modal="true"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-4 rounded-t-xl flex-shrink-0" style={{ background: "#0B1629" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight" style={{ color: '#fff' }}>Folha de Pagamento em Lote</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Configure a competência e edite os valores</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="bg-slate-100 p-1 rounded-xl grid grid-cols-2 gap-1 mb-6">
              <TabsTrigger
                value="configuracao"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 transition-all"
              >
                <Settings className="w-4 h-4" /> Configuração
              </TabsTrigger>
              <TabsTrigger
                value="funcionarios"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 transition-all"
                disabled={!competencia}
              >
                <Users className="w-4 h-4" /> Funcionários ({folhasSelecionadas.length}/{folhasFuncionarios.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="configuracao" className="space-y-4 mt-0 animate-in fade-in duration-300">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 mb-3">
                  <Settings className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dados da Folha</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="competencia" className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" /> Competência (AAAA-MM) *
                    </Label>
                    <Input
                      id="competencia"
                      type="month"
                      value={competencia}
                      onChange={(e) => setCompetencia(e.target.value)}
                      className="modern-input text-black"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Os adiantamentos, pontos e salários proporcionais desta competência serão calculados automaticamente
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dataPagamento" className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" /> Data do Pagamento *
                    </Label>
                    <Input
                      id="dataPagamento"
                      type="date"
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                      className="modern-input text-black"
                    />
                  </div>
                </div>
              </div>

              {competencia && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                  {isCalculating ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-sm text-slate-600">Calculando...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-4xl font-bold text-slate-700 mb-1">{folhasFuncionarios.length}</p>
                      <p className="text-sm text-slate-500 mb-4">funcionário(s) encontrado(s)</p>
                      <Button onClick={() => setActiveTab("funcionarios")} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-9">
                        <Users className="w-3.5 h-3.5" /> Ver Funcionários
                      </Button>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="funcionarios" className="space-y-3 mt-0 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200">
                <Checkbox
                  id="checkAll"
                  checked={todosSelecionados}
                  onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                  className="rounded"
                />
                <Label htmlFor="checkAll" className="cursor-pointer font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Selecionar Todos ({folhasFuncionarios.length} funcionários)
                </Label>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold uppercase">
                          <Checkbox className="border-white/30" />
                        </th>
                        <th className="p-3 text-left text-xs font-semibold uppercase min-w-[150px]">Funcionário</th>
                        <th className="p-3 text-center text-xs font-semibold uppercase min-w-[100px]">Dias Trab.</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase min-w-[120px]">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-3 h-3" />
                            Salário Base
                          </div>
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase min-w-[120px]">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Comissões
                          </div>
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase min-w-[120px]">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="w-3 h-3" />
                            H. Extras
                          </div>
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase min-w-[120px]">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Bônus
                          </div>
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase text-red-300 min-w-[120px]">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Adiantam.
                          </div>
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase text-red-300 min-w-[120px]">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Faltas
                          </div>
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase text-red-300 min-w-[120px]">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Encargos
                          </div>
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase min-w-[130px] bg-slate-700">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-3 h-3" />
                            Líquido
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {folhasFuncionarios.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-slate-500">
                            Nenhum funcionário encontrado ou competência não informada
                          </td>
                        </tr>
                      ) : (
                        folhasFuncionarios.map((folha) => (
                          <tr
                            key={folha.funcionario_id}
                            className={`hover:bg-slate-50 transition-colors ${
                              folha.selecionado ? 'bg-blue-50' : ''
                            }`}
                          >
                            <td className="p-3">
                              <Checkbox
                                checked={folha.selecionado}
                                onCheckedChange={() => toggleSelecionado(folha.funcionario_id)}
                                className="rounded"
                              />
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-semibold text-slate-900">{folha.nome}</p>
                                <p className="text-xs text-slate-500">{folha.cargo} • {folha.departamento}</p>
                                {folha.dias_trabalhados < folha._dias_do_mes && folha.dias_trabalhados > 0 && (
                                  <p className="text-xs text-blue-600 font-medium mt-1">
                                    🔹 Proporcional: {folha.dias_trabalhados} dias
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Input
                                type="number"
                                min="0"
                                max={folha._dias_do_mes}
                                step="1"
                                value={folha.dias_trabalhados}
                                onChange={(e) => {
                                  const dias = Number(e.target.value);
                                  setFolhasFuncionarios(prev => prev.map(f =>
                                    f.funcionario_id === folha.funcionario_id
                                      ? { ...f, dias_trabalhados: dias }
                                      : f
                                  ));

                                  if (folha.salario_integral && folha._dias_do_mes > 0) {
                                    let newSalarioBase = 0;
                                    if (dias > 0) {
                                       newSalarioBase = (folha.salario_integral / folha._dias_do_mes) * dias;
                                    }
                                    handleFieldChange(folha.funcionario_id, 'salario_base', newSalarioBase);
                                  } else {
                                     handleFieldChange(folha.funcionario_id, 'dias_trabalhados', dias);
                                  }
                                }}
                                className="text-center text-sm h-8 w-16 text-black"
                                disabled={!folha.selecionado}
                                title={folha.salario_integral ? `Salário integral: ${formatCurrency(folha.salario_integral)}` : ''}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={folha.salario_base}
                                onChange={(e) => handleFieldChange(folha.funcionario_id, 'salario_base', e.target.value)}
                                className="text-right text-sm h-8 text-black"
                                disabled={!folha.selecionado}
                                title={folha.salario_integral && folha.dias_trabalhados < folha._dias_do_mes ? `Integral: ${formatCurrency(folha.salario_integral)}` : ''}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={folha.comissoes}
                                onChange={(e) => handleFieldChange(folha.funcionario_id, 'comissoes', e.target.value)}
                                className="text-right text-sm h-8 text-black"
                                disabled={!folha.selecionado}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={folha.horas_extras}
                                onChange={(e) => handleFieldChange(folha.funcionario_id, 'horas_extras', e.target.value)}
                                className="text-right text-sm h-8 text-black"
                                disabled={!folha.selecionado}
                                title={`${folha._horas_extras_semana}h semana + ${folha._horas_extras_fds}h FDS`}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={folha.bonus}
                                onChange={(e) => handleFieldChange(folha.funcionario_id, 'bonus', e.target.value)}
                                className="text-right text-sm h-8 text-black"
                                disabled={!folha.selecionado}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={folha.adiantamentos}
                                onChange={(e) => handleFieldChange(folha.funcionario_id, 'adiantamentos', e.target.value)}
                                className="text-right text-sm h-8 bg-red-50 text-black"
                                disabled={!folha.selecionado}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={folha.faltas}
                                onChange={(e) => handleFieldChange(folha.funcionario_id, 'faltas', e.target.value)}
                                className="text-right text-sm h-8 bg-red-50 text-black"
                                disabled={!folha.selecionado}
                                title={`${folha._faltas_dias} dias + ${folha._faltas_horas}h`}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={folha.encargos}
                                onChange={(e) => handleFieldChange(folha.funcionario_id, 'encargos', e.target.value)}
                                className="text-right text-sm h-8 bg-red-50 text-black"
                                disabled={!folha.selecionado}
                              />
                            </td>
                            <td className="p-3 bg-slate-50">
                              <p className="text-right font-bold text-slate-700">
                                {formatCurrency(folha.salario_liquido)}
                              </p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-t border-slate-200 bg-white rounded-b-xl flex-shrink-0">
          <div className="text-sm text-slate-600">
            {folhasSelecionadas.length > 0 && (
              <span>Total: <strong className="text-slate-800">{formatCurrency(totalSelecionado)}</strong> · <strong>{folhasSelecionadas.length}</strong> funcionário(s)</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="h-9 px-4 text-sm border-slate-300 text-slate-700 gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={folhasSelecionadas.length === 0 || !competencia || !dataPagamento} className="h-9 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white gap-1.5 disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> Gerar {folhasSelecionadas.length} Folha(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}