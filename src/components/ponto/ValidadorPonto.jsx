// src/components/ponto/ValidadorPonto.jsx

export function validarRegistro(batida, registrosDoDia = []) {
  const erros = [];
  const avisos = [];

  if (!batida.hora || !/^\d{2}:\d{2}/.test(batida.hora)) {
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

  if (minutos < 360) avisos.push("Antes das 06:00");
  if (minutos > 1320) avisos.push("Após 22:00");

  return { valido: erros.length === 0, erros, avisos };
}

export function validarLote(batidas) {
  return batidas.map((b, i) => ({
    ...validarRegistro(b, batidas.slice(0, i)),
    batida: b
  }));
}