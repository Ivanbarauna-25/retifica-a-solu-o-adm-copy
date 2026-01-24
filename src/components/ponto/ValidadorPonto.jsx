// components/ponto/ValidadorPonto.jsx

// ===============================
// Validação individual de batida
// ===============================
export function validarRegistro(batida, registrosDoDia = []) {
  const erros = [];
  const avisos = [];

  if (!batida?.hora || !/^\d{2}:\d{2}/.test(batida.hora)) {
    erros.push("Hora inválida");
  }

  const duplicada = registrosDoDia.find(
    r =>
      r.hora === batida.hora &&
      r.funcionario_id === batida.funcionario_id &&
      r.data === batida.data
  );

  if (duplicada) {
    erros.push("Batida duplicada");
  }

  if (batida.hora) {
    const [h, m] = batida.hora.split(":").map(Number);
    const minutos = h * 60 + m;

    if (minutos < 360) avisos.push("Batida antes das 06:00");
    if (minutos > 1320) avisos.push("Batida após 22:00");
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos
  };
}

// ===============================
// Validação em lote (importação)
// ===============================
export function validarLote(batidas = []) {
  const resumo = {
    total: batidas.length,
    validas: 0,
    comErros: 0,
    comAvisos: 0,
    detalhes: []
  };

  batidas.forEach((batida, idx) => {
    const anteriores = batidas.slice(0, idx);
    const validacao = validarRegistro(batida, anteriores);

    if (!validacao.valido) resumo.comErros++;
    else if (validacao.avisos.length) resumo.comAvisos++;
    else resumo.validas++;

    resumo.detalhes.push({
      index: idx,
      batida,
      ...validacao
    });
  });

  return resumo;
}

// ===============================
// Sugestões automáticas (NÃO altera)
// ===============================
export function recomendarAjustes(batida) {
  const sugestoes = [];

  if (batida?.hora_entrada && batida?.hora_saida) {
    const [h1, m1] = batida.hora_entrada.split(":").map(Number);
    const [h2, m2] = batida.hora_saida.split(":").map(Number);

    if (h2 * 60 + m2 < h1 * 60 + m1) {
      sugestoes.push({
        tipo: "inverter",
        descricao: "Hora de saída anterior à entrada"
      });
    }
  }

  return sugestoes;
}