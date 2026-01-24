// ValidadorPonto.js
// Funções de validação para registros de ponto (100% frontend)
// Compatível com ImportarPontoModal:
// - validarLote() retorna { resumo, detalhes, duplicatas }
// - detalhes[] contém { index, ok, erros[], avisos[] }
// - seu modal usa validacoes.detalhes.filter(d => d.avisos.length > 0)

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMMSS_RE = /^\d{2}:\d{2}:\d{2}$/;
const HHMM_RE = /^\d{2}:\d{2}$/;

function safeStr(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function parseMinutos(hora) {
  // aceita "HH:MM" ou "HH:MM:SS"
  const h = safeStr(hora).trim();
  if (!h) return null;

  let hh, mm;
  if (HHMMSS_RE.test(h)) {
    [hh, mm] = h.split(":").slice(0, 2).map((n) => parseInt(n, 10));
  } else if (HHMM_RE.test(h)) {
    [hh, mm] = h.split(":").map((n) => parseInt(n, 10));
  } else {
    return null;
  }

  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;

  return hh * 60 + mm;
}

function isValidDate(dateStr) {
  const d = safeStr(dateStr).trim();
  if (!ISO_DATE_RE.test(d)) return false;

  const dt = new Date(`${d}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return false;

  // garante que não “corrigiu” data inválida
  const [y, m, da] = d.split("-").map((n) => parseInt(n, 10));
  return (
    dt.getFullYear() === y &&
    dt.getMonth() + 1 === m &&
    dt.getDate() === da
  );
}

function makeKey(batida) {
  // chave para deduplicação: funcionario + data + hora
  const fid = safeStr(batida?.funcionario_id).trim();
  const data = safeStr(batida?.data).trim();
  // usa hora (campo principal). se não tiver, tenta extrair de data_hora
  let hora = safeStr(batida?.hora).trim();

  if (!hora) {
    const dh = safeStr(batida?.data_hora).trim();
    // tenta pegar HH:MM:SS do ISO
    if (dh && dh.length >= 19) {
      const t = dh.substring(11, 19);
      if (HHMMSS_RE.test(t)) hora = t;
    }
  }

  if (!fid || !data || !hora) return "";
  return `${fid}__${data}__${hora}`;
}

/**
 * Valida um registro individual.
 * @param {object} batida
 * @param {Set<string>} chavesExistentesSet (opcional) - deduplicação rápida
 * @returns {{ ok: boolean, erros: string[], avisos: string[] }}
 */
export const validarRegistro = (batida, chavesExistentesSet = null) => {
  const erros = [];
  const avisos = [];

  const b = batida || {};
  const funcionarioId = safeStr(b.funcionario_id).trim();
  const data = safeStr(b.data).trim();
  const hora = safeStr(b.hora).trim();
  const horaSaida = safeStr(b.hora_saida).trim(); // opcional (se existir)
  const userIdRelogio = safeStr(b.user_id_relogio).trim();

  // 0) Campos mínimos (no seu fluxo, o funcionário pode ser ajustado no preview)
  if (!userIdRelogio) avisos.push("ID do relógio (user_id_relogio) vazio.");
  if (!data || !isValidDate(data)) erros.push("Data inválida (YYYY-MM-DD).");

  // Hora obrigatória para registro de batida
  const minEntrada = parseMinutos(hora);
  if (minEntrada == null) erros.push("Hora inválida (HH:MM ou HH:MM:SS).");

  // 1) Validar hora de entrada/saída invertidas (se existir hora_saida)
  if (horaSaida) {
    const minSaida = parseMinutos(horaSaida);
    if (minSaida == null) {
      erros.push("Hora de saída inválida (HH:MM ou HH:MM:SS).");
    } else if (minEntrada != null && minSaida < minEntrada) {
      erros.push("Hora de saída anterior à entrada.");
    }
  }

  // 2) Validar batida duplicada (mesmo funcionário, mesma data, mesmo horário)
  // Só faz sentido se tiver funcionario_id já vinculado
  if (funcionarioId) {
    const key = makeKey(b);
    if (key && chavesExistentesSet && chavesExistentesSet.has(key)) {
      erros.push("Batida duplicada no mesmo horário (no lote).");
    }
  } else {
    // No seu preview, isso é comum até o usuário selecionar o funcionário
    avisos.push("Sem funcionário vinculado (selecione no preview).");
  }

  // 3) Avisos (não erros) para horário muito cedo/tarde
  if (minEntrada != null) {
    // Muito cedo (antes 06:00)
    if (minEntrada < 360) avisos.push("Batida muito cedo (antes 6h).");
    // Muito tarde (depois 22:00)
    if (minEntrada > 1320) avisos.push("Batida muito tarde (após 22h).");
  }

  return { ok: erros.length === 0, erros, avisos };
};

/**
 * Valida um lote inteiro.
 * Retorna no formato que seu modal espera: validacoes.detalhes[]
 * @param {Array<object>} batidas
 * @returns {{ resumo: object, detalhes: Array, duplicatas: Array }}
 */
export const validarLote = (batidas = []) => {
  const detalhes = [];
  const chavesSet = new Set();          // para validar duplicata rapidamente
  const mapaDuplicatas = new Map();     // key -> [indexes]

  let totalOk = 0;
  let totalErros = 0;
  let totalAvisosLinhas = 0;

  for (let idx = 0; idx < (batidas || []).length; idx++) {
    const batida = batidas[idx] || {};

    const key = makeKey(batida);
    if (key) {
      const arr = mapaDuplicatas.get(key) || [];
      arr.push(idx);
      mapaDuplicatas.set(key, arr);
    }

    const v = validarRegistro(batida, chavesSet);

    // Só adiciona chave como “existente” se conseguir formar chave e tiver funcionario_id
    // Isso evita marcar duplicata quando ainda não selecionou funcionário no preview
    const funcionarioId = safeStr(batida.funcionario_id).trim();
    if (funcionarioId && key) chavesSet.add(key);

    if (v.ok) totalOk++;
    else totalErros++;

    if ((v.avisos || []).length > 0) totalAvisosLinhas++;

    detalhes.push({
      index: idx,
      ok: v.ok,
      erros: v.erros || [],
      avisos: v.avisos || []
    });
  }

  // Lista duplicatas detectadas no lote (para auditoria/diagnóstico)
  const duplicatas = [];
  for (const [key, indexes] of mapaDuplicatas.entries()) {
    if (indexes.length > 1) {
      duplicatas.push({ key, indexes });

      // Se você quiser que duplicata apareça como AVISO em todas as linhas, habilite:
      // (não transforma em erro automaticamente aqui, porque você já marca como erro no validarRegistro)
      // for (const i of indexes) {
      //   detalhes[i].avisos.push("Duplicata detectada dentro do próprio lote.");
      // }
    }
  }

  const resumo = {
    total: detalhes.length,
    ok: totalOk,
    comErros: totalErros,
    comAvisos: totalAvisosLinhas,
    duplicatasNoLote: duplicatas.length
  };

  return { resumo, detalhes, duplicatas };
};

/**
 * Recomendar ajustes automáticos (sem funções/closures — mais seguro no front)
 * @param {object} batida
 * @returns {{ sugestoes: Array<{ tipo: string, descricao: string, patch: object }> }}
 */
export const recomendarAjustes = (batida) => {
  const sugestoes = [];
  const b = batida || {};

  const hora = safeStr(b.hora).trim();
  const horaSaida = safeStr(b.hora_saida).trim();

  // Se hora de saída < hora de entrada, sugerir inverter (se existir hora_saida)
  if (hora && horaSaida) {
    const minEntrada = parseMinutos(hora);
    const minSaida = parseMinutos(horaSaida);
    if (minEntrada != null && minSaida != null && minSaida < minEntrada) {
      sugestoes.push({
        tipo: "inverter_horarios",
        descricao: "Hora de saída anterior à entrada. Inverter entrada e saída?",
        patch: { hora: horaSaida, hora_saida: hora }
      });
    }
  }

  return { sugestoes };
};