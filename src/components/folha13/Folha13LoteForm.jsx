import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Settings, DollarSign, Save, X, Calendar, Calculator, Gift, Loader2 } from "lucide-react";
import { formatCurrency } from "@/components/formatters";

// Tabela INSS 2024 (simplificada)
const calcularINSS = (salario) => {
  if (salario <= 1412.00) return salario * 0.075;
  if (salario <= 2666.68) return 105.90 + (salario - 1412.00) * 0.09;
  if (salario <= 4000.03) return 218.82 + (salario - 2666.68) * 0.12;
  if (salario <= 7786.02) return 378.82 + (salario - 4000.03) * 0.14;
  return 908.86;
};

// Tabela IRRF 2024 (simplificada)
const calcularIRRF = (baseCalculo) => {
  if (baseCalculo <= 2259.20) return 0;
  if (baseCalculo <= 2826.65) return (baseCalculo * 0.075) - 169.44;
  if (baseCalculo <= 3751.05) return (baseCalculo * 0.15) - 381.44;
  if (baseCalculo <= 4664.68) return (baseCalculo * 0.225) - 662.77;
  return (baseCalculo * 0.275) - 896.00;
};

export default function Folha13LoteForm({
  isOpen,
  funcionarios,
  folhasPagamento,
  onSave,
  onClose,
}) {
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear());
  const [tipoParcela, setTipoParcela] = useState("1_parcela");
  const [dataPagamento, setDataPagamento] = useState("");
  const [activeTab, setActiveTab] = useState("configuracao");
  const [folhas13Funcionarios, setFolhas13Funcionarios] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calcular dados quando configuração mudar
  useEffect(() => {
    if (anoReferencia && tipoParcela && funcionarios.length > 0) {
      calcularDadosFolhas13();
    }
  }, [anoReferencia, tipoParcela, funcionarios]);

  const calcularDadosFolhas13 = async () => {
    setIsCalculating(true);
    try {
      const folhas = funcionarios.map(func => {
        const salarioBase = Number(func.salario) || 0;

        // Calcular avos
        let avosCalculados = 12;
        if (func.data_inicio) {
          const dataAdmissao = new Date(func.data_inicio + 'T00:00:00');
          const anoAdmissao = dataAdmissao.getFullYear();
          
          if (anoAdmissao === anoReferencia) {
            const mesAdmissao = dataAdmissao.getMonth();
            const diaAdmissao = dataAdmissao.getDate();
            const mesesTrabalhados = 12 - mesAdmissao - (diaAdmissao > 15 ? 1 : 0);
            avosCalculados = Math.max(0, Math.min(12, mesesTrabalhados));
          } else if (anoAdmissao > anoReferencia) {
            avosCalculados = 0;
          }
        }

        // Calcular médias dos últimos 12 meses
        let mediaHorasExtras = 0;
        let mediaComissoes = 0;
        let mediaOutros = 0;

        if (folhasPagamento && folhasPagamento.length > 0) {
          const folhasFuncionario = folhasPagamento.filter(f => 
            f.funcionario_id === func.id &&
            f.competencia?.startsWith(String(anoReferencia))
          );

          if (folhasFuncionario.length > 0) {
            const totalHorasExtras = folhasFuncionario.reduce((sum, f) => sum + (Number(f.horas_extras) || 0), 0);
            const totalComissoes = folhasFuncionario.reduce((sum, f) => sum + (Number(f.comissoes) || 0), 0);
            const totalBonus = folhasFuncionario.reduce((sum, f) => sum + (Number(f.bonus) || 0), 0);

            mediaHorasExtras = totalHorasExtras / 12;
            mediaComissoes = totalComissoes / 12;
            mediaOutros = totalBonus / 12;
          }
        }

        const baseTotal = salarioBase + mediaHorasExtras + mediaComissoes + mediaOutros;
        const valorBruto = (baseTotal / 12) * avosCalculados;

        let inss = 0;
        let irrf = 0;
        let valorPrimeiraParcela = 0;
        let valorLiquido = 0;

        if (tipoParcela === "1_parcela") {
          valorPrimeiraParcela = valorBruto / 2;
          valorLiquido = valorPrimeiraParcela;
        } else if (tipoParcela === "2_parcela") {
          valorPrimeiraParcela = valorBruto / 2;
          inss = calcularINSS(valorBruto);
          const baseIRRF = valorBruto - inss;
          irrf = Math.max(0, calcularIRRF(baseIRRF));
          valorLiquido = valorBruto - valorPrimeiraParcela - inss - irrf;
        } else {
          inss = calcularINSS(valorBruto);
          const baseIRRF = valorBruto - inss;
          irrf = Math.max(0, calcularIRRF(baseIRRF));
          valorLiquido = valorBruto - inss - irrf;
        }

        return {
          funcionario_id: func.id,
          nome: func.nome,
          cargo: func.funcao || "N/A",
          avos_calculados: avosCalculados,
          avos_editados: null,
          salario_base: salarioBase,
          media_horas_extras: Number(mediaHorasExtras.toFixed(2)),
          media_comissoes: Number(mediaComissoes.toFixed(2)),
          media_outros: Number(mediaOutros.toFixed(2)),
          valor_bruto: Number(valorBruto.toFixed(2)),
          inss: Number(inss.toFixed(2)),
          irrf: Number(irrf.toFixed(2)),
          outros_descontos: 0,
          valor_primeira_parcela: Number(valorPrimeiraParcela.toFixed(2)),
          valor_liquido: Number(valorLiquido.toFixed(2)),
          selecionado: avosCalculados > 0
        };
      });

      setFolhas13Funcionarios(folhas);
    } catch (error) {
      console.error("Erro ao calcular dados:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFieldChange = (funcionarioId, field, value) => {
    setFolhas13Funcionarios(prev => {
      return prev.map(folha => {
        if (folha.funcionario_id !== funcionarioId) return folha;

        const updatedFolha = { ...folha, [field]: Number(value) || 0 };
        
        // Recalcular valores
        const avos = updatedFolha.avos_editados ?? updatedFolha.avos_calculados;
        const baseTotal = Number(updatedFolha.salario_base) + 
                          Number(updatedFolha.media_horas_extras) + 
                          Number(updatedFolha.media_comissoes) + 
                          Number(updatedFolha.media_outros);
        
        const valorBruto = (baseTotal / 12) * avos;
        
        let inss = 0;
        let irrf = 0;
        let valorPrimeiraParcela = 0;
        let valorLiquido = 0;

        if (tipoParcela === "1_parcela") {
          valorPrimeiraParcela = valorBruto / 2;
          valorLiquido = valorPrimeiraParcela;
        } else if (tipoParcela === "2_parcela") {
          valorPrimeiraParcela = valorBruto / 2;
          inss = calcularINSS(valorBruto);
          const baseIRRF = valorBruto - inss;
          irrf = Math.max(0, calcularIRRF(baseIRRF));
          valorLiquido = valorBruto - valorPrimeiraParcela - inss - irrf - Number(updatedFolha.outros_descontos);
        } else {
          inss = calcularINSS(valorBruto);
          const baseIRRF = valorBruto - inss;
          irrf = Math.max(0, calcularIRRF(baseIRRF));
          valorLiquido = valorBruto - inss - irrf - Number(updatedFolha.outros_descontos);
        }

        updatedFolha.valor_bruto = Number(valorBruto.toFixed(2));
        updatedFolha.inss = Number(inss.toFixed(2));
        updatedFolha.irrf = Number(irrf.toFixed(2));
        updatedFolha.valor_primeira_parcela = Number(valorPrimeiraParcela.toFixed(2));
        updatedFolha.valor_liquido = Number(valorLiquido.toFixed(2));

        return updatedFolha;
      });
    });
  };

  const toggleSelecionado = (funcionarioId) => {
    setFolhas13Funcionarios(prev =>
      prev.map(folha =>
        folha.funcionario_id === funcionarioId
          ? { ...folha, selecionado: !folha.selecionado }
          : folha
      )
    );
  };

  const toggleSelectAll = (checked) => {
    setFolhas13Funcionarios(prev =>
      prev.map(folha => ({ ...folha, selecionado: checked && folha.avos_calculados > 0 }))
    );
  };

  const folhasSelecionadas = useMemo(
    () => folhas13Funcionarios.filter(f => f.selecionado),
    [folhas13Funcionarios]
  );

  const totalSelecionado = useMemo(
    () => folhasSelecionadas.reduce((sum, f) => sum + (Number(f.valor_liquido) || 0), 0),
    [folhasSelecionadas]
  );

  const todosSelecionados = useMemo(
    () => folhas13Funcionarios.filter(f => f.avos_calculados > 0).length > 0 && 
          folhas13Funcionarios.filter(f => f.avos_calculados > 0).every(f => f.selecionado),
    [folhas13Funcionarios]
  );

  const handleGenerate = () => {
    if (!anoReferencia) {
      alert("Informe o ano de referência.");
      return;
    }
    if (!tipoParcela) {
      alert("Informe o tipo de parcela.");
      return;
    }
    if (folhasSelecionadas.length === 0) {
      alert("Selecione pelo menos um funcionário.");
      return;
    }

    const registros = folhasSelecionadas.map(folha => ({
      funcionario_id: folha.funcionario_id,
      ano_referencia: anoReferencia,
      tipo_parcela: tipoParcela,
      avos_calculados: folha.avos_calculados,
      avos_editados: folha.avos_editados !== folha.avos_calculados ? folha.avos_editados : null,
      salario_base: folha.salario_base,
      media_horas_extras: folha.media_horas_extras,
      media_comissoes: folha.media_comissoes,
      media_outros: folha.media_outros,
      valor_bruto: folha.valor_bruto,
      inss: folha.inss,
      irrf: folha.irrf,
      outros_descontos: folha.outros_descontos,
      valor_primeira_parcela: folha.valor_primeira_parcela,
      valor_liquido: folha.valor_liquido,
      status: "gerado",
      data_pagamento: dataPagamento || null,
      observacoes: `13º Salário gerado em lote - ${new Date().toLocaleDateString()}`
    }));

    onSave(registros);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setAnoReferencia(new Date().getFullYear());
      setTipoParcela("1_parcela");
      setDataPagamento("");
      setFolhas13Funcionarios([]);
      setActiveTab("configuracao");
    }
  }, [isOpen]);

  const tipoParcelaLabels = {
    "1_parcela": "1ª Parcela",
    "2_parcela": "2ª Parcela",
    "parcela_unica": "Parcela Única"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-full max-w-[95vw] md:max-w-5xl max-h-[85vh] overflow-hidden modern-modal bg-white border-2 border-slate-800 shadow-2xl flex flex-col p-0" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <style>{`
          .modern-modal::-webkit-scrollbar { width: 8px; }
          .modern-modal::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
          .modern-modal::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; }
          .modern-modal::-webkit-scrollbar-thumb:hover { background: #64748b; }
        `}</style>
        
        <DialogHeader className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white no-print border-b border-slate-600">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Gift className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-base md:text-lg font-semibold">Gerar 13º Salário em Lote</p>
              <p className="text-xs text-slate-300 font-normal">Configure o ano e tipo de parcela para gerar em lote</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div onClick={(e) => e.stopPropagation()} className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 md:pb-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="bg-slate-200 p-1 rounded-xl grid grid-cols-2 gap-1 mb-4 md:mb-6 sticky top-0 z-10 shadow-inner">
              <TabsTrigger 
                value="configuracao" 
                className="TabsTrigger rounded-lg bg-white/50 border-2 border-transparent data-[state=active]:border-slate-800 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-700 hover:text-black hover:bg-white data-[state=active]:shadow-md flex items-center justify-center gap-2 transition-all text-sm font-bold py-2"
              >
                <Settings className="w-4 h-4" /> Configuração
              </TabsTrigger>
              <TabsTrigger 
                value="funcionarios" 
                className="TabsTrigger rounded-lg bg-white/50 border-2 border-transparent data-[state=active]:border-slate-800 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-700 hover:text-black hover:bg-white data-[state=active]:shadow-md flex items-center justify-center gap-2 transition-all text-sm font-bold py-2"
                disabled={!anoReferencia}
              >
                <Users className="w-4 h-4" /> Funcionários ({folhasSelecionadas.length}/{folhas13Funcionarios.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="configuracao" className="space-y-5 pt-2">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 md:p-6 shadow-sm">
                <h3 className="font-semibold text-black mb-4 md:mb-5 flex items-center gap-2 text-sm md:text-base">
                  <Settings className="w-4 h-4 md:w-5 md:h-5 text-slate-600" /> Dados do 13º Salário
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                  <div>
                    <Label className="text-sm font-medium text-black mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" /> Ano de Referência *
                    </Label>
                    <Input
                      type="number"
                      min="2020"
                      max="2030"
                      value={anoReferencia}
                      onChange={(e) => setAnoReferencia(Number(e.target.value))}
                      className="modern-input text-black border border-slate-400 shadow-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black mb-2 flex items-center gap-2">
                      <Gift className="w-4 h-4 text-slate-500" /> Tipo de Parcela *
                    </Label>
                    <Select value={tipoParcela} onValueChange={setTipoParcela}>
                      <SelectTrigger className="modern-input text-black border border-slate-400 shadow-sm">
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
                    <Label className="text-sm font-medium text-black mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" /> Data do Pagamento
                    </Label>
                    <Input
                      type="date"
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                      className="modern-input text-black border border-slate-400 shadow-sm"
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>ℹ️ {tipoParcelaLabels[tipoParcela]}:</strong>{" "}
                    {tipoParcela === "1_parcela" 
                      ? "50% do valor bruto, sem descontos de INSS/IRRF. Deve ser paga até 30/Nov."
                      : tipoParcela === "2_parcela"
                      ? "Diferença do valor bruto menos 1ª parcela, com descontos. Deve ser paga até 20/Dez."
                      : "Valor total com todos os descontos aplicados."}
                  </p>
                </div>
              </div>

              {anoReferencia && (
                <div className="rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-8 shadow-lg">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Calculator className="w-6 h-6 text-slate-700" />
                      <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                        {isCalculating ? "Calculando..." : "Pronto para gerar"}
                      </p>
                    </div>
                    {!isCalculating && (
                      <>
                        <p className="text-5xl font-bold text-slate-700">{folhas13Funcionarios.filter(f => f.avos_calculados > 0).length}</p>
                        <div className="flex items-center justify-center gap-2 text-slate-600">
                          <Users className="w-4 h-4" />
                          <p className="text-sm">funcionário(s) elegível(eis)</p>
                        </div>
                        <Button onClick={() => setActiveTab("funcionarios")} className="mt-4 bg-slate-800 hover:bg-slate-700 text-white">
                          Ir para Funcionários
                        </Button>
                      </>
                    )}
                    {isCalculating && <Loader2 className="w-8 h-8 animate-spin text-slate-600 mx-auto" />}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="funcionarios" className="space-y-5 pt-2">
              <div className="flex items-center gap-3 p-3 md:p-4 bg-slate-100 rounded-xl border border-slate-200">
                <Checkbox
                  id="checkAll"
                  checked={todosSelecionados}
                  onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                  className="rounded"
                />
                <Label htmlFor="checkAll" className="cursor-pointer font-medium flex items-center gap-2 text-black text-sm md:text-base">
                  <Users className="w-4 h-4" />
                  Selecionar Todos Elegíveis ({folhas13Funcionarios.filter(f => f.avos_calculados > 0).length} funcionários)
                </Label>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="max-h-[350px] md:max-h-[450px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800 text-white sticky top-0 z-10">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold uppercase w-10"></th>
                        <th className="p-3 text-left text-xs font-semibold uppercase min-w-[150px]">Funcionário</th>
                        <th className="p-3 text-center text-xs font-semibold uppercase min-w-[80px]">Avos</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase min-w-[120px]">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-3 h-3" /> Salário Base
                          </div>
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase min-w-[100px]">Média H.E.</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase min-w-[100px]">Média Com.</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase min-w-[100px]">Valor Bruto</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase text-red-300 min-w-[80px]">INSS</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase text-red-300 min-w-[80px]">IRRF</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase min-w-[120px] bg-slate-700">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-3 h-3" /> Líquido
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {folhas13Funcionarios.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 md:p-12 text-center text-slate-500">
                            <Users className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 text-slate-300" />
                            <p className="font-medium text-black text-sm md:text-base">Nenhum funcionário encontrado</p>
                            <p className="text-xs md:text-sm mt-1 text-slate-600">Configure o ano de referência para ver os funcionários elegíveis</p>
                          </td>
                        </tr>
                      ) : (
                        folhas13Funcionarios.map((folha) => (
                          <tr
                            key={folha.funcionario_id}
                            className={`hover:bg-slate-50 transition-colors ${folha.selecionado ? 'bg-blue-50 border-l-4 border-l-slate-700' : ''} ${folha.avos_calculados === 0 ? 'opacity-50' : ''}`}
                          >
                            <td className="p-3">
                              <Checkbox
                                checked={folha.selecionado}
                                onCheckedChange={() => toggleSelecionado(folha.funcionario_id)}
                                className="rounded"
                                disabled={folha.avos_calculados === 0}
                              />
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-semibold text-slate-900 text-sm md:text-base">{folha.nome}</p>
                                <p className="text-xs text-slate-500">{folha.cargo}</p>
                                {folha.avos_calculados === 0 && (
                                  <p className="text-xs text-red-600 font-medium mt-1">⚠️ Sem avos no ano</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="12"
                                value={folha.avos_editados ?? folha.avos_calculados}
                                onChange={(e) => handleFieldChange(folha.funcionario_id, 'avos_editados', e.target.value)}
                                className="text-center text-sm h-8 w-16 text-black border border-slate-300"
                                disabled={!folha.selecionado}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={folha.salario_base}
                                onChange={(e) => handleFieldChange(folha.funcionario_id, 'salario_base', e.target.value)}
                                className="text-right text-sm h-8 text-black border border-slate-300"
                                disabled={!folha.selecionado}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={folha.media_horas_extras}
                                onChange={(e) => handleFieldChange(folha.funcionario_id, 'media_horas_extras', e.target.value)}
                                className="text-right text-sm h-8 text-black border border-slate-300"
                                disabled={!folha.selecionado}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={folha.media_comissoes}
                                onChange={(e) => handleFieldChange(folha.funcionario_id, 'media_comissoes', e.target.value)}
                                className="text-right text-sm h-8 text-black border border-slate-300"
                                disabled={!folha.selecionado}
                              />
                            </td>
                            <td className="p-3 text-right font-semibold text-slate-900">
                              {formatCurrency(folha.valor_bruto)}
                            </td>
                            <td className="p-3 text-right text-red-700 text-sm font-semibold">
                              {formatCurrency(folha.inss)}
                            </td>
                            <td className="p-3 text-right text-red-700 text-sm font-semibold">
                              {formatCurrency(folha.irrf)}
                            </td>
                            <td className="p-3 bg-slate-50">
                              <p className="text-right font-bold text-slate-900">
                                {formatCurrency(folha.valor_liquido)}
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
          </Tabs>

        </div>

        <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-white">
          <div className="text-xs md:text-sm text-black flex items-center gap-2">
            {folhasSelecionadas.length > 0 && (
              <>
                <DollarSign className="w-4 h-4 text-black" />
                <span>
                  Total: <strong className="text-black text-sm md:text-base">{formatCurrency(totalSelecionado)}</strong> para{' '}
                  <strong>{folhasSelecionadas.length}</strong> funcionário(s)
                </span>
              </>
            )}
          </div>
          <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
              className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGenerate(); }}
              disabled={folhasSelecionadas.length === 0 || !anoReferencia || !tipoParcela}
              className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
            >
              <Save className="w-4 h-4" /> Gerar {folhasSelecionadas.length} Folha(s) de 13º
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}