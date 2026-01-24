// ValidadorPonto.jsx
// FRONT-END ONLY – compatível com Base44 (sem backend)


// ===============================
// 1. Validar batida individual
// ===============================
export function validarBatida(batida, registrosDoDia = []) {
  const erros = [];
  const avisos = [];

  if (!batida.hora || !/^\d{2}:\d{2}$/.test(batida.hora)) {
    erros.push("Hora inválida");
  }

  const duplicada = registrosDoDia.find(
    r => r.hora === batida.hora && r.origem === batida.origem
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
// 2. Validar lote de batidas
// (IMPORTAÇÃO TXT / EXCEL)
// ===============================
export function validarLote(batidas = []) {
  const resumo = {
    total: batidas.length,
    validas: 0,
    comErros: 0,
    comAvisos: 0,
    detalhes: []
  };

  batidas.forEach((batida, index) => {
    const registrosAnteriores = batidas.slice(0, index);
    const resultado = validarBatida(batida, registrosAnteriores);

    if (!resultado.valido) {
      resumo.comErros++;
    } else if (resultado.avisos.length > 0) {
      resumo.comAvisos++;
    } else {
      resumo.validas++;
    }

    resumo.detalhes.push({
      index,
      batida,
      ...resultado
    });
  });

  return resumo;
}


// ===============================
// 3. Recomendar ajustes (opcional)
// ===============================
export function recomendarAjustes(batida, registrosDoDia = []) {
  const sugestoes = [];

  // Número ímpar de batidas
  if (registrosDoDia.length % 2 !== 0) {
    sugestoes.push({
      tipo: "batida_impar",
      mensagem: "Número ímpar de batidas no dia. Pode faltar entrada ou saída."
    });
  }

  // Horário fora do padrão
  if (batida.hora) {
    const [h] = batida.hora.split(":").map(Number);
    if (h < 6 || h > 22) {
      sugestoes.push({
        tipo: "horario_atipico",
        mensagem: "Horário fora do padrão legal (antes 06h ou após 22h)."
      });
    }
  }

  return sugestoes;
}