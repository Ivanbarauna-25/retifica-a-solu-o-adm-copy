import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Confirma e persiste a importação de batidas do relógio
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { 
      registros_normalizados, 
      arquivo_nome, 
      metadados, 
      log_erros,
      total_validos,
      total_invalidos,
      periodo_inicio,
      periodo_fim
    } = body;
    
    if (!registros_normalizados || registros_normalizados.length === 0) {
      return Response.json({ error: 'Nenhum registro para importar' }, { status: 400 });
    }
    
    // Gerar hash do conteúdo
    const conteudoHash = JSON.stringify(registros_normalizados.map(r => `${r.user_id_relogio}|${r.data_hora}`).join('|'));
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(conteudoHash));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Verificar duplicidade
    const existente = await base44.entities.ImportacaoPonto.filter({ arquivo_hash: hash });
    if (existente && existente.length > 0) {
      return Response.json({
        success: false,
        error: 'Arquivo duplicado',
        mensagem: 'Este conteúdo já foi importado anteriormente'
      }, { status: 409 });
    }
    
    // Criar registro de importação
    const importacao = await base44.entities.ImportacaoPonto.create({
      data_importacao: new Date().toISOString(),
      arquivo_nome: arquivo_nome || 'Importação Manual',
      arquivo_hash: hash,
      periodo_inicio: periodo_inicio,
      periodo_fim: periodo_fim,
      total_linhas: registros_normalizados.length,
      total_registros_validos: total_validos || 0,
      total_ignorados: total_invalidos || 0,
      status: 'processando',
      conteudo_txt: metadados || '',
      log_erros: log_erros || ''
    });
    
    // Inserir registros em lote
    const CHUNK_SIZE = 100;
    let inseridos = 0;
    
    for (let i = 0; i < registros_normalizados.length; i += CHUNK_SIZE) {
      const chunk = registros_normalizados.slice(i, i + CHUNK_SIZE);
      
      for (const reg of chunk) {
        // Limpar campos internos de preview
        const { _tr, _inOut, ...dadosLimpos } = reg;
        
        await base44.entities.PontoRegistro.create({
          ...dadosLimpos,
          importacao_id: importacao.id
        });
        
        inseridos++;
      }
    }
    
    // Atualizar status da importação
    await base44.entities.ImportacaoPonto.update(importacao.id, {
      status: 'concluida'
    });
    
    return Response.json({
      success: true,
      message: `Importação concluída: ${inseridos} registros salvos`,
      importacao_id: importacao.id,
      total_inseridos: inseridos
    });
    
  } catch (error) {
    console.error('Erro na confirmação:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro ao confirmar importação'
    }, { status: 500 });
  }
});