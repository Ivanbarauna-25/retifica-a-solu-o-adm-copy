import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SALVAR REGISTROS DE PONTO (PÓS-REVISÃO)
 * Recebe registros editados e validados do preview
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { registros } = await req.json();
    
    if (!Array.isArray(registros) || registros.length === 0) {
      return Response.json({
        success: false,
        error: 'Nenhum registro fornecido'
      }, { status: 400 });
    }
    
    // Salvar todos os registros
    const salvos = [];
    const erros = [];
    
    for (const registro of registros) {
      try {
        const salvo = await base44.asServiceRole.entities.PontoRegistro.create({
          funcionario_id: registro.funcionario_id || null,
          user_id_relogio: registro.user_id_relogio,
          data: registro.data,
          hora: registro.hora,
          data_hora: registro.data_hora,
          origem: registro.origem || 'relogio',
          metodo: registro.metodo || '',
          dispositivo_id: registro.dispositivo_id || '',
          raw_linha: registro.raw_linha || '',
          valido: registro.valido || false,
          motivo_invalido: registro.motivo_invalido || null
        });
        salvos.push(salvo);
      } catch (e) {
        console.error('Erro ao salvar registro:', e);
        erros.push({
          registro,
          erro: e.message
        });
      }
    }
    
    // Criar log de importação
    const validos = salvos.filter(r => r.valido).length;
    const datas = salvos.filter(r => r.data).map(r => r.data).sort();
    
    await base44.asServiceRole.entities.ImportacaoPonto.create({
      data_importacao: new Date().toISOString(),
      arquivo_nome: 'Importação manual (revisada)',
      periodo_inicio: datas[0] || null,
      periodo_fim: datas[datas.length - 1] || null,
      total_linhas: registros.length,
      total_registros_validos: validos,
      total_ignorados: salvos.length - validos,
      status: 'concluida',
      log_erros: erros.length > 0 ? JSON.stringify(erros) : null
    });
    
    return Response.json({
      success: true,
      message: `${salvos.length} registros salvos com sucesso`,
      stats: {
        total_salvos: salvos.length,
        total_validos: validos,
        total_erros: erros.length
      }
    });
    
  } catch (error) {
    console.error('Erro ao salvar:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro ao salvar registros'
    }, { status: 500 });
  }
});