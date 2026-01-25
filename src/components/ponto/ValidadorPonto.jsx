// Funções de validação para registros de ponto
export const validarRegistro = (batida, registrosExistentes = []) => {
  const erros = [];
  const avisos = [];

  // 1. Validar hora de entrada/saída invertidas
  if (batida.hora && batida.hora_saida) {
    const [hh, mm] = batida.hora.split(':').map(Number);
    const [hs, ms] = batida.hora_saida.split(':').map(Number);
    const minEntrada = hh * 60 + mm;
    const minSaida = hs * 60 + ms;
    
    if (minSaida < minEntrada) {
      erros.push('Hora de saída anterior à entrada');
    }
  }

  // 2. Validar batida dupla (mesmo funcionário, mesmo horário)
  const batidaDupla = registrosExistentes.find(
    r => r.funcionario_id === batida.funcionario_id && 
         r.hora === batida.hora &&
         r.data === batida.data
  );
  if (batidaDupla) {
    erros.push('Batida duplicada no mesmo horário');
  }

  // 3. Avisos (não erros)
  if (batida.hora) {
    const [hh, mm] = batida.hora.split(':').map(Number);
    const minutos = hh * 60 + mm;
    
    // Muito cedo (antes 6am)
    if (minutos < 360) {
      avisos.push('Batida muito cedo (antes 6h)');
    }
    
    // Muito tarde (depois 22h)
    if (minutos > 1320) {
      avisos.push('Batida muito tarde (após 22h)');
    }
  }

  return { erros, avisos, valido: erros.length === 0 };
};

export const validarLote = (batidas) => {
  const resumo = {
    total: batidas.length,
    validas: 0,
    comErros: 0,
    comAvisos: 0,
    detalhes: []
  };

  batidas.forEach((batida, idx) => {
    const validacao = validarRegistro(batida, batidas.slice(0, idx));
    
    if (validacao.valido && validacao.avisos.length === 0) {
      resumo.validas++;
    } else if (!validacao.valido) {
      resumo.comErros++;
    } else {
      resumo.comAvisos++;
    }

    resumo.detalhes.push({
      index: idx,
      batida,
      ...validacao
    });
  });

  return resumo;
};

// Recomendar ajustes automáticos
export const recomendarAjustes = (batida) => {
  const sugestoes = [];

  // Se hora de saída < hora de entrada, inverter
  if (batida.hora && batida.hora_saida) {
    const [hh, mm] = batida.hora.split(':').map(Number);
    const [hs, ms] = batida.hora_saida.split(':').map(Number);
    const minEntrada = hh * 60 + mm;
    const minSaida = hs * 60 + ms;
    
    if (minSaida < minEntrada) {
      sugestoes.push({
        tipo: 'inverter',
        descricao: 'Inverter hora de entrada e saída?',
        acao: () => ({ ...batida, hora: batida.hora_saida, hora_saida: batida.hora })
      });
    }
  }

  return sugestoes;
};