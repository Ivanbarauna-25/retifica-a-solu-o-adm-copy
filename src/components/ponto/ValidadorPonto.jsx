/* =========================================================
   ValidadorPonto.jsx
   Arquivo CENTRAL de validação de ponto
   FRONT-END ONLY (Base44)
   ========================================================= */

/* =========================
   VALIDAR BATIDA INDIVIDUAL
   ========================= */
export function validarBatida(batida, registrosDoDia = []) {
  const erros = [];
  const avisos = [];

  if (!batida?.hora || !/^\d{2}:\d{2}/.test(batida.hora)) {
    erros.push("Hora inválida");
  }

  const duplicada = registrosDoDia.find(
    r => r.hora === batida.hora && r.origem === batida.origem
  );

  if (duplicada) {
    erros.push("Batida duplicada");
  }

  const [h, m] = batida.hora.split(":").map(Number);
  const minutos = h * 60 + m;

  if (minutos < 360) avisos.push("Batida antes das 06:00");
  if (minutos > 1320) avisos.push("Batida após 22:00");

  return {
    valido: erros.length === 0,
    erros,
    avisos
  };
}

/* =========================
   VALIDAR REGISTRO (1 DIA)
   ========================= */
export function validarRegistro(registrosDoDia = []) {
  const erros = [];
  const avisos = [];

  if (registrosDoDia.length === 0) {
    erros.push("Dia sem nenhuma batida");
  }

  if (registrosDoDia.length % 2 !== 0) {
    avisos.push("Quantidade ímpar de batidas");
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos
  };
}

/* =========================
   VALIDAR LOTE (IMPORTAÇÃO)
   ========================= */
export function validarLote(registros = []) {
  const resultado = [];

  const agrupadoPorDia = {};

  registros.forEach(r => {
    const data = r.data || r.data_hora?.substring(0, 10);
    if (!data) return;

    if (!agrupadoPorDia[data]) {
      agrupadoPorDia[data] = [];
    }

    agrupadoPorDia[data].push(r);
  });

  Object.entries(agrupadoPorDia).forEach(([data, lista]) => {
    const validacao = validarRegistro(lista);

    resultado.push({
      data,
      ...validacao
    });
  });

  return resultado;
}

/* =========================
   RECOMENDAR AJUSTES (UX)
   ========================= */
export function recomendarAjustes(registrosDoDia = []) {
  const recomendacoes = [];

  if (registrosDoDia.length === 1) {
    recomendacoes.push("Registrar saída");
  }

  if (registrosDoDia.length === 3) {
    recomendacoes.push("Registrar última saída");
  }

  if (registrosDoDia.length > 4) {
    recomendacoes.push("Excesso de batidas no dia");
  }

  return recomendacoes;
}