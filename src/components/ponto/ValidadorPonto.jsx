// ValidadorPonto.jsx
// CONTRATO ÚNICO E DEFINITIVO PARA TODO O MÓDULO DE PONTO

/**
 * Valida uma batida individual (sem permitir edição)
 */
export function validarBatida(batida, registrosDoDia = []) {
  const erros = [];
  const avisos = [];

  if (!batida?.hora || !/^\d{2}:\d{2}(:\d{2})?$/.test(batida.hora)) {
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

/**
 * Valida um conjunto de registros de um dia
 */
export function validarRegistro(registrosDoDia = [], escala = null) {
  const resultado = {
    status: "OK",
    saldoMinutos: 0,
    observacoes: []
  };

  if (!escala) {
    resultado.status = "SEM_ESCALA";
    resultado.observacoes.push("Funcionário sem escala vinculada");
    return resultado;
  }

  if (registrosDoDia.length === 0) {
    resultado.status = "SEM_REGISTRO";
    resultado.saldoMinutos = -escala.carga_diaria_minutos;
    return resultado;
  }

  return resultado;
}

/**
 * Validação de lote (importação)
 */
export function validarLote(registros = []) {
  return registros.map(r => ({
    registro: r,
    resultado: validarBatida(r, [])
  }));
}

/**
 * Recomenda ações (SEM alterar batidas)
 */
export function recomendarAjustes({ status, saldoMinutos }) {
  if (status === "SEM_REGISTRO") {
    return ["Abonar falta", "Gerar ocorrência"];
  }

  if (saldoMinutos < 0) {
    return ["Descontar horas", "Banco de horas negativo"];
  }

  if (saldoMinutos > 0) {
    return ["Banco de horas positivo"];
  }

  return [];
}