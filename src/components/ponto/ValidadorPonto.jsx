// ValidadorPonto.jsx
// FRONT-END ONLY — sem backend

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

  return { valido: erros.length === 0, erros, avisos };
}

/**
 * Sugestões automáticas (NÃO altera dados sozinho)
 * Apenas recomenda para o usuário
 */
export function recomendarAjustes(batida, registrosDoDia = []) {
  const sugestoes = [];

  // Batida isolada (ímpar)
  if (registrosDoDia.length % 2 !== 0) {
    sugestoes.push({
      tipo: "batida_impar",
      mensagem: "Número ímpar de batidas no dia. Verifique falta de entrada ou saída."
    });
  }

  // Horário suspeito
  if (batida.hora) {
    const [h] = batida.hora.split(":").map(Number);
    if (h < 6 || h > 22) {
      sugestoes.push({
        tipo: "horario_atipico",
        mensagem: "Horário fora do padrão (antes das 06h ou após 22h)."
      });
    }
  }

  return sugestoes;
}