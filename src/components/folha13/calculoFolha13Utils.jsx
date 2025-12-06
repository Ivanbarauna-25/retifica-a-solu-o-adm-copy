/**
 * Utilitários de Cálculo do 13º Salário conforme CLT
 * 
 * Referências legais:
 * - Lei 4.090/1962 - Institui o 13º salário
 * - Lei 4.749/1965 - Regulamenta o pagamento
 * - Decreto 57.155/1965 - Regras de cálculo
 * - CLT Art. 130 - Faltas e avos
 */

// ============================================
// TABELAS INSS PROGRESSIVO (2024/2025)
// ============================================

export const TABELAS_INSS = {
  "2024": [
    { ate: 1412.00, aliquota: 0.075, deducao: 0 },
    { ate: 2666.68, aliquota: 0.09, deducao: 21.18 },
    { ate: 4000.03, aliquota: 0.12, deducao: 101.18 },
    { ate: 7786.02, aliquota: 0.14, deducao: 181.18 },
    { teto: 908.86 }
  ],
  "2025": [
    { ate: 1518.00, aliquota: 0.075, deducao: 0 },
    { ate: 2793.88, aliquota: 0.09, deducao: 22.77 },
    { ate: 4190.83, aliquota: 0.12, deducao: 106.59 },
    { ate: 8157.41, aliquota: 0.14, deducao: 190.40 },
    { teto: 951.63 }
  ]
};

// ============================================
// TABELAS IRRF PROGRESSIVO (2024/2025)
// ============================================

export const TABELAS_IRRF = {
  "2024": [
    { ate: 2259.20, aliquota: 0, deducao: 0 },
    { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
    { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { acima: true, aliquota: 0.275, deducao: 896.00 }
  ],
  "2025": [
    { ate: 2428.80, aliquota: 0, deducao: 0 },
    { ate: 2826.66, aliquota: 0.075, deducao: 182.16 },
    { ate: 3751.06, aliquota: 0.15, deducao: 394.16 },
    { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
    { acima: true, aliquota: 0.275, deducao: 908.73 }
  ]
};

export const VALOR_DEPENDENTE_IRRF = {
  "2024": 189.59,
  "2025": 189.59
};

// ============================================
// CÁLCULO PROGRESSIVO INSS (CLT)
// ============================================

export function calcularINSSProgressivo(salario, tabelaAno = "2024") {
  const tabela = TABELAS_INSS[tabelaAno] || TABELAS_INSS["2024"];
  const teto = tabela.find(f => f.teto)?.teto || 908.86;
  
  if (salario <= 0) return { valor: 0, faixa: "Isento", detalhes: [] };
  
  let inssTotal = 0;
  let salarioRestante = salario;
  let faixaAnterior = 0;
  const detalhes = [];
  
  for (const faixa of tabela) {
    if (faixa.teto) continue;
    
    const limiteFaixa = faixa.ate;
    const baseNaFaixa = Math.min(salarioRestante, limiteFaixa - faixaAnterior);
    
    if (baseNaFaixa > 0) {
      const contribuicaoFaixa = baseNaFaixa * faixa.aliquota;
      inssTotal += contribuicaoFaixa;
      detalhes.push({
        faixa: `Até R$ ${limiteFaixa.toFixed(2)}`,
        base: baseNaFaixa,
        aliquota: faixa.aliquota * 100,
        contribuicao: contribuicaoFaixa
      });
    }
    
    salarioRestante -= baseNaFaixa;
    faixaAnterior = limiteFaixa;
    
    if (salarioRestante <= 0) break;
  }
  
  // Aplica teto
  const valorFinal = Math.min(inssTotal, teto);
  const faixaDescricao = valorFinal >= teto 
    ? `Teto INSS: R$ ${teto.toFixed(2)}` 
    : `Progressivo: R$ ${valorFinal.toFixed(2)}`;
  
  return {
    valor: Number(valorFinal.toFixed(2)),
    faixa: faixaDescricao,
    detalhes,
    atingiuTeto: valorFinal >= teto
  };
}

// ============================================
// CÁLCULO PROGRESSIVO IRRF (CLT)
// ============================================

export function calcularIRRFProgressivo(baseCalculo, dependentes = 0, tabelaAno = "2024", valorDependenteCustom = null) {
  const tabela = TABELAS_IRRF[tabelaAno] || TABELAS_IRRF["2024"];
  const valorDependente = valorDependenteCustom || VALOR_DEPENDENTE_IRRF[tabelaAno] || 189.59;
  
  // Dedução por dependentes
  const deducaoDependentes = dependentes * valorDependente;
  const baseReal = Math.max(0, baseCalculo - deducaoDependentes);
  
  if (baseReal <= 0) {
    return { 
      valor: 0, 
      faixa: "Isento", 
      baseCalculo: baseReal,
      deducaoDependentes,
      dependentes
    };
  }
  
  // Encontra faixa aplicável
  let faixaAplicavel = tabela[0];
  for (const faixa of tabela) {
    if (faixa.acima || baseReal <= faixa.ate) {
      faixaAplicavel = faixa;
      break;
    }
  }
  
  // Cálculo do IRRF
  const irrf = (baseReal * faixaAplicavel.aliquota) - faixaAplicavel.deducao;
  const valorFinal = Math.max(0, irrf);
  
  const faixaDescricao = faixaAplicavel.aliquota === 0 
    ? "Isento"
    : `${(faixaAplicavel.aliquota * 100).toFixed(1)}%`;
  
  return {
    valor: Number(valorFinal.toFixed(2)),
    faixa: faixaDescricao,
    aliquota: faixaAplicavel.aliquota * 100,
    deducaoFaixa: faixaAplicavel.deducao,
    baseCalculo: baseReal,
    deducaoDependentes,
    dependentes
  };
}

// ============================================
// CÁLCULO DE AVOS (CLT Art. 130)
// ============================================

/**
 * Calcula avos do 13º baseado na data de admissão e faltas/afastamentos
 * CLT: Considera-se 1 avo para cada mês trabalhado por 15 dias ou mais
 */
export function calcularAvos(params) {
  const {
    dataAdmissao,
    dataDemissao,
    anoReferencia,
    controlePonto = [],
    afastamentos = [],
    config = {}
  } = params;
  
  const {
    descontar_faltas_avos = true,
    dias_tolerancia_falta_avo = 15,
    considerar_afastamentos = true,
    dias_afastamento_perda_avo = 15
  } = config;
  
  const alertas = [];
  const detalhes = {};
  
  // Data início do período (admissão ou 1º jan)
  const dataAdmissaoObj = new Date(dataAdmissao + 'T00:00:00');
  const inicioAno = new Date(anoReferencia, 0, 1);
  const fimAno = new Date(anoReferencia, 11, 31);
  
  // Verifica se funcionário foi admitido no ano ou antes
  const admitidoNoAno = dataAdmissaoObj.getFullYear() === anoReferencia;
  const admitidoAntes = dataAdmissaoObj.getFullYear() < anoReferencia;
  const admitidoDepois = dataAdmissaoObj.getFullYear() > anoReferencia;
  
  if (admitidoDepois) {
    return {
      avosCalculados: 0,
      avosPorFaltas: 0,
      avosPorAfastamento: 0,
      avosFinais: 0,
      alertas: ["Funcionário não trabalhava no ano de referência"],
      detalhes: {}
    };
  }
  
  // Data fim do período (demissão ou 31/dez ou hoje se ano atual)
  let dataFimPeriodo = fimAno;
  if (dataDemissao) {
    const dataDemissaoObj = new Date(dataDemissao + 'T00:00:00');
    if (dataDemissaoObj.getFullYear() === anoReferencia) {
      dataFimPeriodo = dataDemissaoObj;
    }
  }
  
  let avosCalculados = 0;
  let avosPorFaltas = 0;
  let avosPorAfastamento = 0;
  
  // Calcula para cada mês
  for (let mes = 0; mes < 12; mes++) {
    const primeiroDiaMes = new Date(anoReferencia, mes, 1);
    const ultimoDiaMes = new Date(anoReferencia, mes + 1, 0);
    const diasNoMes = ultimoDiaMes.getDate();
    
    // Verifica se o mês está no período de trabalho
    if (primeiroDiaMes > dataFimPeriodo || ultimoDiaMes < dataAdmissaoObj) {
      detalhes[mes + 1] = { 
        trabalhado: false, 
        motivo: "Fora do período de trabalho",
        diasTrabalhados: 0,
        avo: false
      };
      continue;
    }
    
    // Calcula dias trabalhados no mês
    let inicioTrabalhoMes = primeiroDiaMes;
    let fimTrabalhoMes = ultimoDiaMes;
    
    if (dataAdmissaoObj > primeiroDiaMes && dataAdmissaoObj <= ultimoDiaMes) {
      inicioTrabalhoMes = dataAdmissaoObj;
    }
    if (dataFimPeriodo < ultimoDiaMes && dataFimPeriodo >= primeiroDiaMes) {
      fimTrabalhoMes = dataFimPeriodo;
    }
    
    const diasTrabalhadosMes = Math.floor((fimTrabalhoMes - inicioTrabalhoMes) / (1000 * 60 * 60 * 24)) + 1;
    
    // Busca faltas do mês no controle de ponto
    const competencia = `${anoReferencia}-${String(mes + 1).padStart(2, '0')}`;
    const pontoMes = controlePonto.find(p => p.mes_referencia === competencia);
    const faltasDias = pontoMes?.faltas_dias || 0;
    
    // Busca afastamentos no mês
    let diasAfastamentoMes = 0;
    if (considerar_afastamentos && afastamentos.length > 0) {
      for (const afast of afastamentos) {
        const inicioAfast = new Date(afast.data_inicio + 'T00:00:00');
        const fimAfast = afast.data_fim ? new Date(afast.data_fim + 'T00:00:00') : ultimoDiaMes;
        
        // Intersecção com o mês
        if (inicioAfast <= ultimoDiaMes && fimAfast >= primeiroDiaMes) {
          const inicioEfetivo = inicioAfast > primeiroDiaMes ? inicioAfast : primeiroDiaMes;
          const fimEfetivo = fimAfast < ultimoDiaMes ? fimAfast : ultimoDiaMes;
          diasAfastamentoMes += Math.floor((fimEfetivo - inicioEfetivo) / (1000 * 60 * 60 * 24)) + 1;
        }
      }
    }
    
    // Dias efetivamente trabalhados
    const diasEfetivos = diasTrabalhadosMes - faltasDias - diasAfastamentoMes;
    const temAvo = diasEfetivos >= dias_tolerancia_falta_avo;
    
    detalhes[mes + 1] = {
      trabalhado: true,
      diasNoMes,
      diasTrabalhadosPeriodo: diasTrabalhadosMes,
      faltasDias,
      diasAfastamento: diasAfastamentoMes,
      diasEfetivos: Math.max(0, diasEfetivos),
      avo: temAvo
    };
    
    if (temAvo) {
      avosCalculados++;
    } else {
      if (faltasDias > dias_tolerancia_falta_avo) {
        avosPorFaltas++;
        alertas.push(`Mês ${mes + 1}: perdeu avo por ${faltasDias} faltas`);
      }
      if (diasAfastamentoMes > dias_afastamento_perda_avo) {
        avosPorAfastamento++;
        alertas.push(`Mês ${mes + 1}: perdeu avo por ${diasAfastamentoMes} dias de afastamento`);
      }
    }
  }
  
  return {
    avosCalculados,
    avosPorFaltas,
    avosPorAfastamento,
    avosFinais: avosCalculados,
    alertas,
    detalhes
  };
}

// ============================================
// CÁLCULO DE MÉDIAS VARIÁVEIS (CLT)
// ============================================

/**
 * Calcula médias de verbas variáveis (horas extras, comissões, etc.)
 * CLT: A média deve considerar os valores efetivamente pagos no período
 */
export function calcularMediasVariaveis(params) {
  const {
    folhasPagamento = [],
    funcionarioId,
    anoReferencia,
    avosCalculados,
    config = {}
  } = params;
  
  const {
    periodo_calculo_medias = "meses_trabalhados",
    percentual_medias_variaveis = 100,
    incluir_horas_extras_media = true,
    incluir_comissoes_media = true,
    incluir_adicionais_media = true,
    incluir_bonus_media = false
  } = config;
  
  // Filtra folhas do funcionário no ano
  const folhasAno = folhasPagamento.filter(f => 
    f.funcionario_id === funcionarioId &&
    f.competencia?.startsWith(String(anoReferencia))
  );
  
  // Totais
  let totalHorasExtras = 0;
  let totalComissoes = 0;
  let totalOutros = 0;
  
  const detalhesHE = {};
  const detalhesCom = {};
  const detalhesOutros = {};
  
  for (const folha of folhasAno) {
    const mes = parseInt(folha.competencia.split('-')[1]);
    
    if (incluir_horas_extras_media) {
      const he = Number(folha.horas_extras) || 0;
      totalHorasExtras += he;
      detalhesHE[mes] = he;
    }
    
    if (incluir_comissoes_media) {
      const com = Number(folha.comissoes) || 0;
      totalComissoes += com;
      detalhesCom[mes] = com;
    }
    
    if (incluir_adicionais_media) {
      const outros = Number(folha.outras_entradas) || 0;
      totalOutros += outros;
      detalhesOutros[mes] = outros;
    }
    
    if (incluir_bonus_media) {
      const bonus = Number(folha.bonus) || 0;
      totalOutros += bonus;
      detalhesOutros[mes] = (detalhesOutros[mes] || 0) + bonus;
    }
  }
  
  // Define divisor baseado na configuração
  let divisor;
  let periodoDescricao;
  
  switch (periodo_calculo_medias) {
    case "12_meses":
      divisor = 12;
      periodoDescricao = "12 meses (fixo)";
      break;
    case "ano_civil":
      divisor = new Date().getFullYear() === anoReferencia 
        ? new Date().getMonth() + 1 
        : 12;
      periodoDescricao = `Ano civil (${divisor} meses)`;
      break;
    case "meses_trabalhados":
    default:
      divisor = avosCalculados || 12;
      periodoDescricao = `Meses trabalhados (${divisor} meses)`;
      break;
  }
  
  // Aplica percentual
  const fator = percentual_medias_variaveis / 100;
  
  return {
    mediaHorasExtras: Number(((totalHorasExtras / divisor) * fator).toFixed(2)),
    mediaComissoes: Number(((totalComissoes / divisor) * fator).toFixed(2)),
    mediaOutros: Number(((totalOutros / divisor) * fator).toFixed(2)),
    totalHorasExtras,
    totalComissoes,
    totalOutros,
    divisor,
    periodoDescricao,
    detalhesHE,
    detalhesCom,
    detalhesOutros
  };
}

// ============================================
// CÁLCULO COMPLETO DO 13º SALÁRIO
// ============================================

export function calcularFolha13Completo(params) {
  const {
    funcionario,
    anoReferencia,
    tipoParcela,
    folhasPagamento = [],
    controlePonto = [],
    afastamentos = [],
    configuracoes = {},
    avosManual = null,
    dependentesIRRF = 0,
    pensaoAlimenticia = 0,
    outrosDescontos = 0,
    outrosDescontosDescricao = ""
  } = params;
  
  // Extrai configurações do 13º
  const config = configuracoes?.config_13_salario || {};
  
  const alertas = [];
  
  // Validações iniciais
  if (!funcionario) {
    return { erro: "Funcionário não informado", alertas: ["Funcionário não informado"] };
  }
  
  if (!funcionario.data_inicio) {
    alertas.push("Data de admissão não cadastrada");
  }
  
  if (!funcionario.salario || funcionario.salario <= 0) {
    alertas.push("Salário não cadastrado ou zerado");
  }
  
  // 1. CÁLCULO DE AVOS
  const avosResult = calcularAvos({
    dataAdmissao: funcionario.data_inicio,
    dataDemissao: funcionario.data_demissao,
    anoReferencia,
    controlePonto,
    afastamentos,
    config
  });
  
  alertas.push(...avosResult.alertas);
  
  const avosFinais = avosManual ?? avosResult.avosFinais;
  
  if (avosFinais === 0) {
    return {
      avos_calculados: avosResult.avosFinais,
      avos_editados: avosManual,
      avos_descontados_faltas: avosResult.avosPorFaltas,
      avos_descontados_afastamento: avosResult.avosPorAfastamento,
      meses_trabalhados_detalhes: JSON.stringify(avosResult.detalhes),
      salario_base: 0,
      valor_bruto: 0,
      valor_liquido: 0,
      alertas,
      alertas_calculo: JSON.stringify(alertas)
    };
  }
  
  // 2. SALÁRIO BASE
  const salarioBase = Number(funcionario.salario) || 0;
  const salarioBaseOrigem = config.usar_salario_dezembro !== false
    ? "Salário atual (base dezembro)"
    : "Salário cadastrado";
  
  // 3. CÁLCULO DE MÉDIAS
  const mediasResult = calcularMediasVariaveis({
    folhasPagamento,
    funcionarioId: funcionario.id,
    anoReferencia,
    avosCalculados: avosFinais,
    config
  });
  
  // 4. VALOR BRUTO (proporcional aos avos)
  const baseTotal = salarioBase + 
                    mediasResult.mediaHorasExtras + 
                    mediasResult.mediaComissoes + 
                    mediasResult.mediaOutros;
  
  const valorBruto = Number(((baseTotal / 12) * avosFinais).toFixed(2));
  
  // 5. CÁLCULOS POR TIPO DE PARCELA
  let inss = 0;
  let irrf = 0;
  let valorPrimeiraParcela = 0;
  let valorLiquido = 0;
  let inssResult = { valor: 0, faixa: "N/A" };
  let irrfResult = { valor: 0, faixa: "Isento" };
  
  const tabelaAno = config.tabela_inss_vigente || "2024";
  const dependentes = funcionario.dependentes_irrf || 0;
  
  if (tipoParcela === "1_parcela") {
    // 1ª Parcela: 50% sem descontos (adiantamento)
    valorPrimeiraParcela = Number((valorBruto / 2).toFixed(2));
    valorLiquido = valorPrimeiraParcela;
    
  } else if (tipoParcela === "2_parcela") {
    // 2ª Parcela: diferença com descontos sobre o valor TOTAL
    valorPrimeiraParcela = Number((valorBruto / 2).toFixed(2));
    
    // INSS sobre valor bruto total
    inssResult = calcularINSSProgressivo(valorBruto, tabelaAno);
    inss = inssResult.valor;
    
    // IRRF sobre (valor bruto - INSS - dependentes)
    const baseIRRF = valorBruto - inss;
    irrfResult = calcularIRRFProgressivo(baseIRRF, dependentes, tabelaAno);
    irrf = irrfResult.valor;
    
    // Valor líquido da 2ª parcela
    valorLiquido = Number((valorBruto - valorPrimeiraParcela - inss - irrf - outrosDescontos).toFixed(2));
    
  } else {
    // Parcela Única: valor total com descontos
    inssResult = calcularINSSProgressivo(valorBruto, tabelaAno);
    inss = inssResult.valor;
    
    const baseIRRF = valorBruto - inss;
    irrfResult = calcularIRRFProgressivo(baseIRRF, dependentes, tabelaAno);
    irrf = irrfResult.valor;
    
    valorLiquido = Number((valorBruto - inss - irrf - outrosDescontos).toFixed(2));
  }
  
  // Validação final
  if (valorLiquido < 0) {
    alertas.push("ATENÇÃO: Valor líquido negativo - verificar descontos");
  }
  
  return {
    // Avos
    avos_calculados: avosResult.avosFinais,
    avos_editados: avosManual !== avosResult.avosFinais ? avosManual : null,
    avos_descontados_faltas: avosResult.avosPorFaltas,
    avos_descontados_afastamento: avosResult.avosPorAfastamento,
    meses_trabalhados_detalhes: JSON.stringify(avosResult.detalhes),
    
    // Salário
    salario_base: salarioBase,
    salario_base_origem: salarioBaseOrigem,
    
    // Médias
    media_horas_extras: mediasResult.mediaHorasExtras,
    media_horas_extras_detalhes: JSON.stringify(mediasResult.detalhesHE),
    media_comissoes: mediasResult.mediaComissoes,
    media_comissoes_detalhes: JSON.stringify(mediasResult.detalhesCom),
    media_outros: mediasResult.mediaOutros,
    media_outros_detalhes: JSON.stringify(mediasResult.detalhesOutros),
    periodo_calculo_medias: mediasResult.periodoDescricao,
    meses_considerados_media: mediasResult.divisor,
    
    // Valores
    valor_bruto: valorBruto,
    valor_primeira_parcela: valorPrimeiraParcela,
    
    // INSS
    base_calculo_inss: valorBruto,
    inss,
    inss_faixa: inssResult.faixa,
    
    // IRRF
    base_calculo_irrf: irrfResult.baseCalculo || 0,
    dependentes_irrf: dependentes,
    deducao_dependentes: irrfResult.deducaoDependentes || 0,
    irrf,
    irrf_faixa: irrfResult.faixa,
    
    // Outros
    outros_descontos: outrosDescontos,
    outros_descontos_descricao: outrosDescontosDescricao,
    
    // Final
    valor_liquido: Math.max(0, valorLiquido),
    
    // Alertas
    alertas,
    alertas_calculo: JSON.stringify(alertas),
    
    // Metadados
    status: "gerado"
  };
}

// ============================================
// VALIDAÇÕES
// ============================================

export function validarFolha13(folha13, funcionario, config = {}) {
  const erros = [];
  const avisos = [];
  
  // Validações obrigatórias
  if (!folha13.funcionario_id) {
    erros.push("Funcionário não informado");
  }
  
  if (!folha13.ano_referencia || folha13.ano_referencia < 2000) {
    erros.push("Ano de referência inválido");
  }
  
  if (!folha13.tipo_parcela) {
    erros.push("Tipo de parcela não informado");
  }
  
  // Validações de valores
  if (folha13.valor_bruto < 0) {
    erros.push("Valor bruto não pode ser negativo");
  }
  
  if (folha13.valor_liquido < 0) {
    avisos.push("Valor líquido está negativo - verificar descontos");
  }
  
  // Validações de avos
  const avos = folha13.avos_editados ?? folha13.avos_calculados;
  if (avos < 0 || avos > 12) {
    erros.push("Avos deve estar entre 0 e 12");
  }
  
  // Validações de data
  if (folha13.tipo_parcela === "1_parcela" && folha13.data_pagamento) {
    const dataPgto = new Date(folha13.data_pagamento);
    const limitePrimeiraParcela = new Date(folha13.ano_referencia, 10, 30); // 30/Nov
    if (dataPgto > limitePrimeiraParcela) {
      avisos.push("1ª parcela deve ser paga até 30/Nov conforme CLT");
    }
  }
  
  if (folha13.tipo_parcela === "2_parcela" && folha13.data_pagamento) {
    const dataPgto = new Date(folha13.data_pagamento);
    const limiteSegundaParcela = new Date(folha13.ano_referencia, 11, 20); // 20/Dez
    if (dataPgto > limiteSegundaParcela) {
      avisos.push("2ª parcela deve ser paga até 20/Dez conforme CLT");
    }
  }
  
  // Validações de funcionário
  if (funcionario) {
    if (funcionario.status === 'demitido' && !funcionario.data_demissao) {
      avisos.push("Funcionário demitido sem data de demissão cadastrada");
    }
    
    if (!funcionario.salario || funcionario.salario <= 0) {
      avisos.push("Salário do funcionário não cadastrado");
    }
  }
  
  return {
    valido: erros.length === 0,
    erros,
    avisos
  };
}

export default {
  calcularINSSProgressivo,
  calcularIRRFProgressivo,
  calcularAvos,
  calcularMediasVariaveis,
  calcularFolha13Completo,
  validarFolha13,
  TABELAS_INSS,
  TABELAS_IRRF
};