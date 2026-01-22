import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

/**
 * Confirma e persiste a importação de batidas do relógio
 * - Cria ImportacaoPonto
 * - Persiste PontoRegistro
 * - Evita duplicidade por hash
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function s(v) {
  return String(v ?? "").trim();
}

async function sha256Hex(input) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isPersistivel(r) {
  // Só salva se tiver funcionário vinculado e data_hora
  return Boolean(r && r.valido === true && r.funcionario_id && s(r.data_hora));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json();

    const registros_normalizados = Array.isArray(body?.registros_normalizados)
      ? body.registros_normalizados
      : [];

    if (registros_normalizados.length === 0) {
      return json({ success: false, error: "Nenhum registro para importar" }, 400);
    }

    // 1) Filtra apenas persistíveis
    const validos = registros_normalizados.filter(isPersistivel);

    if (validos.length === 0) {
      return json(
        {
          success: false,
          error: "Nenhum registro válido para persistir",
          dica: "Mapeie os IDs do relógio (EnNo) para funcionários antes de confirmar.",
        },
        400
      );
    }

    // 2) Dedup dentro do arquivo (funcionario_id + data_hora)
    const seen = new Set();
    const dedup = [];

    for (const r of validos) {
      const key = `${s(r.funcionario_id)}|${s(r.data_hora)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dedup.push(r);
    }

    // 3) Hash do conteúdo (somente válidos)
    const hashBase = dedup
      .map((r) => `${s(r.user_id_relogio)}|${s(r.funcionario_id)}|${s(r.data_hora)}`)
      .sort()
      .join("\n");

    const hash = await sha256Hex(hashBase);

    // 4) Duplicidade
    let existentes = [];
    try {
      existentes = await base44.entities.ImportacaoPonto.filter({ arquivo_hash: hash });
    } catch (e) {
      // se a entidade/campo não existir, devolve erro claro
      return json(
        {
          success: false,
          error:
            "Falha ao checar duplicidade. Verifique se existe a entidade ImportacaoPonto e o campo arquivo_hash.",
          detalhe: s(e?.message || e),
        },
        500
      );
    }

    if (Array.isArray(existentes) && existentes.length > 0) {
      return json(
        {
          success: false,
          error: "Arquivo duplicado",
          mensagem: "Este conteúdo já foi importado anteriormente",
          arquivo_hash: hash,
        },
        409
      );
    }

    // 5) Criar ImportacaoPonto
    const arquivo_nome = s(body?.arquivo_nome) || "Importação Manual";

    let importacao;
    try {
      importacao = await base44.entities.ImportacaoPonto.create({
        data_importacao: new Date().toISOString(),
        arquivo_nome,
        arquivo_hash: hash,
        periodo_inicio: body?.periodo_inicio ?? null,
        periodo_fim: body?.periodo_fim ?? null,
        total_linhas: registros_normalizados.length,
        total_registros_validos: Number(body?.total_validos ?? validos.length),
        total_ignorados: Number(body?.total_invalidos ?? (registros_normalizados.length - validos.length)),
        status: "processando",
        conteudo_txt: s(body?.metadados) || "",
        log_erros: s(body?.log_erros) || "",
      });
    } catch (e) {
      return json(
        {
          success: false,
          error:
            "Erro ao criar ImportacaoPonto. Verifique campos da entidade (data_importacao, arquivo_nome, arquivo_hash, status...).",
          detalhe: s(e?.message || e),
        },
        500
      );
    }

    // 6) Inserir PontoRegistro
    const CHUNK_SIZE = 100;
    let inseridos = 0;

    for (let i = 0; i < dedup.length; i += CHUNK_SIZE) {
      const chunk = dedup.slice(i, i + CHUNK_SIZE);

      for (const reg of chunk) {
        const funcionario_id = s(reg.funcionario_id);
        const data_hora = s(reg.data_hora);
        const user_id_relogio = s(reg.user_id_relogio);

        if (!funcionario_id || !data_hora || !user_id_relogio) continue;

        // limpa extras
        const { _tr, _inOut, ...rest } = reg || {};

        // relógio fixo = 1
        const relogio_id = "1";

        // tenta criar com relogio_id; se seu schema não tiver, cria sem ele
        try {
          await base44.entities.PontoRegistro.create({
            ...rest,
            funcionario_id,
            user_id_relogio,
            data_hora,
            importacao_id: importacao.id,
            relogio_id,
            valido: true,
            motivo_invalido: null,
          });
        } catch (e1) {
          // fallback (sem relogio_id)
          try {
            await base44.entities.PontoRegistro.create({
              ...rest,
              funcionario_id,
              user_id_relogio,
              data_hora,
              importacao_id: importacao.id,
              valido: true,
              motivo_invalido: null,
            });
          } catch (e2) {
            // erro real: devolve uma mensagem que te diz o campo que tá quebrando
            await base44.entities.ImportacaoPonto.update(importacao.id, { status: "erro" }).catch(() => {});
            return json(
              {
                success: false,
                error:
                  "Erro ao criar PontoRegistro. Provável campo inexistente ou tipo errado no schema.",
                detalhe: s(e2?.message || e2),
                dica:
                  "Abra a entidade PontoRegistro e confira nomes/tipos dos campos: funcionario_id, user_id_relogio, data_hora, importacao_id, valido, motivo_invalido.",
              },
              500
            );
          }
        }

        inseridos++;
      }
    }

    // 7) concluir
    await base44.entities.ImportacaoPonto.update(importacao.id, { status: "concluida" }).catch(() => {});

    return json({
      success: true,
      message: `Importação concluída: ${inseridos} registros salvos`,
      importacao_id: importacao.id,
      total_inseridos: inseridos,
      arquivo_hash: hash,
    });
  } catch (error) {
    return json(
      {
        success: false,
        error: s(error?.message || error) || "Erro ao confirmar importação",
      },
      500
    );
  }
});
