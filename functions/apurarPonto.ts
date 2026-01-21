import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Apura ponto de um funcionário em um período
 * Gera ApuracaoDiariaPonto com cálculo de atraso, falta e hora extra (intermediário)
 */

function safeStr(v) {
  return (v ?? "").toString();
}

function parseHora(hhmm) {
  // "HH:mm" ou "HH:mm:ss" -> minutos desde 00:00
  if (!hhmm) return null;
  const parts = hhmm.split(":");
  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  return h * 60 + m;
}

function minToHHmm(min) {
  if (!min) return "00:00";
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function calcularDiferencaMin(hora1, hora2) {
  const m1 = parseHora(hora1);
  const m2 = parseHora(hora2);
  if (m1 === null || m2 === null) return 0;
  return m2 - m1;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { funcionario_id, mes_referencia } = body;

    if (!funcionario_id || !mes_referencia) {
      return Response.json({ error: 'funcionario_id e mes_referencia são obrigatórios' }, { status: 400 });
    }

    const mesKey = mes_referencia.slice(0, 7); // "YYYY-MM"
    const [ano, mes] = mesKey.split("-");
    const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
    const dataInicio = `${mesKey}-01`;
    const dataFim = `${mesKey}-${String(ultimoDia).padStart(2, "0")}`;

    // Buscar batidas do período
    const batidas = await base44.entities.PontoRegistro.filter({
      funcionario_id,
      valido: true
    });

    const batidasFiltradas = (batidas || [])
      .filter((b) => b.data >= dataInicio && b.data <= dataFim)
      .sort((a, b) => (a.data_hora || "").localeCompare(b.data_hora || ""));

    // Buscar escala vigente do funcionário
    const escalasFunc = await base44.entities.FuncionarioEscala.filter({ funcionario_id });
    const escalaVigente = (escalasFunc || []).find((e) => {
      const inicio = e.vigencia_inicio;
      const fim = e.vigencia_fim || "9999-12-31";
      return dataInicio >= inicio && dataFim <= fim;
    });

    let escala = null;
    if (escalaVigente) {
      const escalas = await base44.entities.EscalaTrabalho.list();
      escala = escalas.find((e) => e.id === escalaVigente.escala_id);
    }

    // Agrupar batidas por dia
    const batidasPorDia = new Map();
    for (const b of batidasFiltradas) {
      const data = b.data;
      if (!batidasPorDia.has(data)) batidasPorDia.set(data, []);
      batidasPorDia.get(data).push(b);
    }

    // Gerar todas as datas do mês
    const datasDoMes = [];
    for (let dia = 1; dia <= ultimoDia; dia++) {
      datasDoMes.push(`${mesKey}-${String(dia).padStart(2, "0")}`);
    }

    const apuracoes = [];
    const toleranciaMin = escala?.tolerancia_minutos || 5;
    const cargaDiariaMin = escala?.carga_diaria_minutos || 480; // 8h default
    const entradaPrevistaMin = parseHora(escala?.hora_entrada_prevista) || 480; // 08:00 default

    for (const data of datasDoMes) {
      const batidasDia = batidasPorDia.get(data) || [];
      const batidas_ids = batidasDia.map((b) => b.id).join(",");

      // Já existe apuração para este dia?
      const apuracaoExistente = await base44.entities.ApuracaoDiariaPonto.filter({
        funcionario_id,
        data
      });

      if (apuracaoExistente && apuracaoExistente.length > 0) {
        // Atualizar
        const apuId = apuracaoExistente[0].id;
        await processarDia(base44, apuId, funcionario_id, data, batidasDia, batidas_ids, escala, toleranciaMin, cargaDiariaMin, entradaPrevistaMin, true);
      } else {
        // Criar
        await processarDia(base44, null, funcionario_id, data, batidasDia, batidas_ids, escala, toleranciaMin, cargaDiariaMin, entradaPrevistaMin, false);
      }
    }

    return Response.json({
      success: true,
      message: `Apuração gerada para ${funcionario_id} no mês ${mes_referencia}`,
      total_dias: datasDoMes.length
    });

  } catch (error) {
    console.error("Erro na apuração:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processarDia(base44, apuId, funcionario_id, data, batidasDia, batidas_ids, escala, toleranciaMin, cargaDiariaMin, entradaPrevistaMin, isUpdate) {
  const horas = batidasDia.map((b) => b.hora || "").filter(Boolean).sort();

  let entrada_1 = null;
  let saida_1 = null;
  let entrada_2 = null;
  let saida_2 = null;
  let status = "ok";
  let total_trabalhado_min = 0;
  let atraso_min = 0;
  let falta_min = 0;
  let hora_extra_min = 0;

  if (horas.length === 0) {
    // Sem batidas -> falta
    status = "falta";
    falta_min = cargaDiariaMin;
  } else if (horas.length === 1) {
    // Incompleto
    status = "incompleto";
    entrada_1 = horas[0];
  } else if (horas.length === 2) {
    // Padrão simples: entrada e saída
    entrada_1 = horas[0];
    saida_1 = horas[1];
    total_trabalhado_min = calcularDiferencaMin(entrada_1, saida_1);

    // Atraso
    const entradaMin = parseHora(entrada_1);
    if (entradaMin > entradaPrevistaMin + toleranciaMin) {
      atraso_min = entradaMin - entradaPrevistaMin;
    }

    // Hora extra
    if (total_trabalhado_min > cargaDiariaMin) {
      hora_extra_min = total_trabalhado_min - cargaDiariaMin;
    }
  } else if (horas.length >= 4) {
    // 4 batidas: entrada, saída intervalo, entrada pós-intervalo, saída
    entrada_1 = horas[0];
    saida_1 = horas[1];
    entrada_2 = horas[2];
    saida_2 = horas[3];

    const periodo1 = calcularDiferencaMin(entrada_1, saida_1);
    const periodo2 = calcularDiferencaMin(entrada_2, saida_2);
    total_trabalhado_min = periodo1 + periodo2;

    // Atraso
    const entradaMin = parseHora(entrada_1);
    if (entradaMin > entradaPrevistaMin + toleranciaMin) {
      atraso_min = entradaMin - entradaPrevistaMin;
    }

    // Hora extra
    if (total_trabalhado_min > cargaDiariaMin) {
      hora_extra_min = total_trabalhado_min - cargaDiariaMin;
    }
  } else {
    // 3 batidas ou outro caso: incompleto
    status = "incompleto";
    entrada_1 = horas[0];
    saida_1 = horas[horas.length - 1];
    total_trabalhado_min = calcularDiferencaMin(entrada_1, saida_1);
  }

  const payload = {
    funcionario_id,
    data,
    escala_id: escala?.id || null,
    batidas_ids,
    entrada_1,
    saida_1,
    entrada_2,
    saida_2,
    total_trabalhado_min,
    atraso_min,
    falta_min,
    hora_extra_min,
    banco_horas_min: 0, // Será implementado em fase 2
    status,
    observacoes: null,
    gerado_em: new Date().toISOString()
  };

  if (isUpdate) {
    await base44.entities.ApuracaoDiariaPonto.update(apuId, payload);
  } else {
    await base44.entities.ApuracaoDiariaPonto.create(payload);
  }
}

function calcularDiferencaMin(hora1, hora2) {
  const m1 = parseHora(hora1);
  const m2 = parseHora(hora2);
  if (m1 === null || m2 === null) return 0;
  return m2 - m1;
}