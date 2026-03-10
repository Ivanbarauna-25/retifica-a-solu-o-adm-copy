/**
 * Parser para arquivos TXT do relógio ZKTeco (formato AttendLog, UTF-16)
 */

export function parseZKTecoFile(arrayBuffer) {
  // Arquivo é UTF-16 com BOM
  const decoder = new TextDecoder('utf-16');
  let text = decoder.decode(arrayBuffer);

  // Remove BOM se presente
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const lines = text.split(/\r?\n/);
  const records = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split('\t').map(p => p.trim());

    // Pular linha de cabeçalho
    if (parts[0] === 'No') continue;
    if (parts.length < 10) continue;
    if (isNaN(parseInt(parts[0]))) continue;

    // Colunas: No, TMNo, EnNo, Name, (vazio), GMNo, Mode, IN/OUT, Antipass, DaiGong, DateTime, TR
    const enNo = parts[2];
    const name = parts[3];
    const inOut = parts[7]; // S=Entrada, O=Saída, A=Retorno intervalo, E=Saída definitiva
    const dateTimeStr = parts[10];
    const tr = parts[11] || '';

    if (!enNo || !dateTimeStr) continue;

    // DateTime: "2026-01-20   07:44:20" (múltiplos espaços)
    const cleanDT = dateTimeStr.replace(/\s+/, ' ').trim();
    const [datePart, timePart] = cleanDT.split(' ');
    if (!datePart || !timePart) continue;

    records.push({
      enNo,
      name: name || '',
      inOut,
      data: datePart,
      hora: timePart,
      dataHora: new Date(`${datePart}T${timePart}`),
      tr: tr.trim(),
      rawLine: line,
    });
  }

  return records;
}

/**
 * Calcula apuração diária de um conjunto de batidas de um funcionário em um dia
 */
export function calcularApuracaoDiaria(batidas, cargaDiariaMin = 480, toleranciaMin = 5) {
  if (!batidas || batidas.length === 0) {
    return {
      entrada_1: null, saida_1: null, entrada_2: null, saida_2: null,
      total_trabalhado_min: 0, falta_min: cargaDiariaMin,
      hora_extra_min: 0, atraso_min: 0,
      banco_horas_min: -cargaDiariaMin, status: 'falta',
    };
  }

  const sorted = [...batidas].sort((a, b) => a.dataHora - b.dataHora);

  // Separar entradas e saídas
  const entradas = sorted.filter(b => b.inOut === 'S' || b.inOut === 'A');
  const saidas = sorted.filter(b => b.inOut === 'O' || b.inOut === 'E');

  const entrada_1 = entradas[0]?.hora?.substring(0, 5) || null;
  const saida_1 = saidas[0]?.hora?.substring(0, 5) || null;
  const entrada_2 = entradas[1]?.hora?.substring(0, 5) || null;
  const saida_2 = saidas.length > 1 ? saidas[saidas.length - 1]?.hora?.substring(0, 5) : null;

  const toMin = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  let totalMin = 0;
  const e1 = toMin(entrada_1), s1 = toMin(saida_1);
  const e2 = toMin(entrada_2), s2 = toMin(saida_2);

  if (e1 !== null && s1 !== null && s1 > e1) totalMin += s1 - e1;
  if (e2 !== null && s2 !== null && s2 > e2) totalMin += s2 - e2;

  let status = 'ok';
  let falta_min = 0;
  let hora_extra_min = 0;

  if (!saida_1) {
    status = 'incompleto';
  } else if (totalMin < cargaDiariaMin - toleranciaMin) {
    falta_min = cargaDiariaMin - totalMin;
    status = 'divergente';
  } else if (totalMin > cargaDiariaMin + toleranciaMin) {
    hora_extra_min = totalMin - cargaDiariaMin;
  }

  return {
    entrada_1, saida_1, entrada_2, saida_2,
    total_trabalhado_min: totalMin,
    falta_min,
    hora_extra_min,
    atraso_min: 0,
    banco_horas_min: hora_extra_min - falta_min,
    status,
  };
}

export function formatMinutes(min) {
  if (min === null || min === undefined) return '-';
  const sign = min < 0 ? '-' : '';
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}