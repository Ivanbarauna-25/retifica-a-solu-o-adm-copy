// ValidadorPonto.js
// Validação 100% frontend para lote de registros de ponto importados.
// Exporta: validarRegistro, validarLote, recomendarAjustes

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMMSS_RE = /^\d{2}:\d{2}:\d{2}$/;

function isValidDateParts(dateStr) {
  if (!ISO_DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return false;
  if (m < 1 || m > 12) return false;

  const dt = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return false;

  // Confere se o Date não “corrigiu” o dia (ex: 2025-02-31 vira março)
  const yy = dt.getFullYear();
  const mm = dt.getMonth() + 1;
  const dd = dt.getDate();
  return yy === y && mm === m && dd === d;
}

function isValidTimeParts(timeStr) {
  if (!HHMMSS_RE.test(timeStr)) return false;
  const [hh, mm, ss] = timeStr.split(":").map((n) => parseInt(n, 10));
  if (hh < 0 || hh > 23) return false;
  if (mm < 0 || mm > 59) return false;
  if (ss < 0 || ss > 59) return false;
  return true;
}

function safeString(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function makeKey(reg) {
  // Chave estável para detectar duplicatas no lote
  const fid = safeString(reg.funcionario_id).trim();
  const dt = safeString(reg.data_hora).trim();
  const d = safeString(reg.data).trim();
  const h = safeString(reg.hora).trim();
  // prioriza data_hora; se não tiver, usa data+hora
  const stamp = dt || (d && h ? `${d}T${h}` : "");
  return fid && stamp ? `${fid}__${stamp}` : "";
}

/**
 * Valida um registro individual.
 * Retorno:
 * {
 *   ok: boolean,
 *   erros: string[],
 *   avisos: string[]
 * }
 */
export function validarRegistro(registro) {
  const erros = [];
  const avisos = [];

  const reg = registro || {};

  // Campos esperados pelo seu fluxo:
  // funcionario_id, user_id_relogio, data, hora, data_hora, origem, metodo, dispositivo_id, raw_linha

  const funcionarioId = safeString(reg.funcionario_id).trim();
  const userIdRelogio = safeString(reg.user_id_relogio).trim();
  const data = safeString(reg.data).trim();
  const hora = safeString(reg.hora).trim();
  const dataHora = safeString(reg.data_hora).trim();

  // Regras duras (erros)
  if (!userIdRelogio) erros.push("ID do relógio (user_id_relogio) vazio.");
  if (userIdRelogio && !/^\d+$/.test(userIdRelogio)) {
    // Se você quiser permitir alfanumérico, remova este bloco
    avisos.push("ID do relógio não é numérico (pode indicar formato fora do padrão do equipamento).");
  }

  if (!data || !isValidDateParts(data)) erros.push("Data inválida (esperado YYYY-MM-DD).");
  if (!hora || !isValidTimeParts(hora)) erros.push("Hora inválida (esperado HH:MM:SS).");

  if (!funcionarioId) {
    // No seu fluxo, registro inválido pode ser revisado e vinculado manualmente no Select
    avisos.push("Sem funcionário vinculado (selecione um funcionário no preview).");
  }

  // data_hora: não é obrigatório, mas se existir deve ser parseável
  if (dataHora) {
    const dt = new Date(dataHora);
    if (Number.isNaN(dt.getTime())) {
      avisos.push("data_hora existe, mas não é um ISO válido (pode causar inconsistência em filtros/ordenação).");
    }
  } else {
    // Se não vier, dá para montar no create, mas melhor avisar
    avisos.push("data_hora ausente (o sistema pode depender desse campo para ordenação/duplicidade).");
  }

  // Consistência data/hora vs data_hora (aviso)
  if (dataHora && data && hora) {
    const dt = new Date(dataHora);
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      const hh = String(dt.getHours()).padStart(2, "0");
      const mm = String(dt.getMinutes()).padStart(2, "0");
      const ss = String(dt.getSeconds()).padStart(2, "0");

      const localDate = `${y}-${m}-${d}`;
      const localTime = `${hh}:${mm}:${ss}`;

      // Pode divergir por timezone dependendo de como foi gerado o ISO no normalizar
      // Então é aviso, não erro.
      if (localDate !== data) {
        avisos.push(`data_hora não bate com data (${data}) — possível efeito de timezone.`);
      }
      if (localTime !== hora) {
        avisos.push(`data_hora não bate com hora (${hora}) — possível efeito de timezone.`);
      }
    }
  }

  // Avisos úteis (não bloqueiam)
  const origem = safeString(reg.origem).trim();
  if (!origem) avisos.push("Origem não informada (ex: 'relogio', 'manual').");

  const raw = safeString(reg.raw_linha);
  if (!raw) avisos.push("Linha bruta (raw_linha) vazia — dificulta auditoria.");
  if (raw && raw.length > 480) avisos.push("Linha bruta muito longa (será truncada no armazenamento).");

  const ok = erros.length === 0;

  return { ok, erros, avisos };
}

/**
 * Valida um lote e também detecta duplicatas no próprio arquivo.
 * Retorno:
 * {
 *   resumo: { total, ok, comErros, avisos, duplicatasNoLote },
 *   detalhes: Array<{ index, ok, erros: string[], avisos: string[] }>,
 *   duplicatas: Array<{ key, indexes: number[] }>
 * }
 */
export function validarLote(registros = []) {
  const detalhes = [];
  const mapKeys = new Map(); // key -> indexes

  let okCount = 0;
  let errorCount = 0;
  let avisosCount = 0;

  for (let i = 0; i < (registros || []).length; i++) {
    const reg = registros[i];
    const v = validarRegistro(reg);

    // Contabiliza avisos por registro (quantidade de mensagens)
    avisosCount += (v.avisos || []).length;

    if (v.ok) okCount++;
    else errorCount++;

    // Indexação de duplicatas no lote (somente se tiver key suficiente)
    const key = makeKey(reg);
    if (key) {
      const arr = mapKeys.get(key) || [];
      arr.push(i);
      mapKeys.set(key, arr);
    }

    detalhes.push({
      index: i,
      ok: v.ok,
      erros: v.erros || [],
      avisos: v.avisos || []
    });
  }

  // Marca duplicatas no lote como AVISO (não erro)
  const duplicatas = [];
  for (const [key, indexes] of mapKeys.entries()) {
    if ((indexes || []).length > 1) {
      duplicatas.push({ key, indexes });

      for (const idx of indexes) {
        const d = detalhes[idx];
        if (d) {
          d.avisos = d.avisos || [];
          d.avisos.push("Duplicata detectada dentro do próprio arquivo/lote (mesmo funcionário e data/hora).");
        }
      }
    }
  }

  const resumo = {
    total: detalhes.length,
    ok: okCount,
    comErros: errorCount,
    avisos: avisosCount,
    duplicatasNoLote: duplicatas.length
  };

  return { resumo, detalhes, duplicatas };
}

/**
 * Recomenda ajustes automáticos (não altera nada sozinho; apenas sugere).
 * Útil caso você queira exibir sugestões no preview no futuro.
 *
 * Retorno:
 * {
 *   sugestoes: Array<{ index, tipo, mensagem }>
 * }
 */
export function recomendarAjustes(registros = []) {
  const sugestoes = [];

  // Exemplo: registros sem funcionario_id
  for (let i = 0; i < (registros || []).length; i++) {
    const r = registros[i] || {};
    if (!safeString(r.funcionario_id).trim()) {
      const nome = safeString(r.nome_detectado || r.nome_arquivo).trim();
      if (nome) {
        sugestoes.push({
          index: i,
          tipo: "vinculo_funcionario",
          mensagem: `Registro sem funcionário vinculado. Nome detectado no arquivo: "${nome}". Selecione o funcionário correto no preview.`
        });
      } else {
        sugestoes.push({
          index: i,
          tipo: "vinculo_funcionario",
          mensagem: "Registro sem funcionário vinculado. Selecione o funcionário correto no preview."
        });
      }
    }

    // Exemplo: data_hora ausente
    if (!safeString(r.data_hora).trim() && safeString(r.data).trim() && safeString(r.hora).trim()) {
      sugestoes.push({
        index: i,
        tipo: "data_hora",
        mensagem: "data_hora está ausente. Ideal gerar data_hora para garantir ordenação e deduplicação mais confiável."
      });
    }
  }

  return { sugestoes };
}