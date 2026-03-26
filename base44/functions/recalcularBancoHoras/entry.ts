import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { funcionario_id, mes_referencia } = await req.json();

    if (!funcionario_id || !mes_referencia) {
      return Response.json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: funcionario_id e mes_referencia (YYYY-MM)' 
      }, { status: 400 });
    }

    // Buscar apurações do mês
    const apuracoes = await base44.asServiceRole.entities.ApuracaoDiariaPonto.filter({
      funcionario_id,
    });

    const apuracoesMes = apuracoes.filter(a => 
      a.data && a.data.startsWith(mes_referencia)
    );

    let totalLancamentos = 0;
    let totalJaExistente = 0;

    for (const apu of apuracoesMes) {
      const saldo = apu.banco_horas_min || 0;
      if (saldo === 0) continue;

      // Verificar se já existe lançamento para esta apuração
      const existentes = await base44.asServiceRole.entities.BancoHoras.filter({
        referencia_id: apu.id,
        origem: 'apuracao'
      });

      if (existentes && existentes.length > 0) {
        totalJaExistente++;
        continue;
      }

      // Criar lançamento
      await base44.asServiceRole.entities.BancoHoras.create({
        funcionario_id,
        data: apu.data,
        tipo: saldo > 0 ? 'credito' : 'debito',
        origem: 'apuracao',
        minutos: Math.abs(saldo),
        observacao: `Apuração automática do dia ${apu.data}`,
        referencia_id: apu.id
      });

      totalLancamentos++;
    }

    return Response.json({
      success: true,
      message: `Recálculo concluído: ${totalLancamentos} lançamentos criados, ${totalJaExistente} já existentes.`,
      totalLancamentos,
      totalJaExistente
    });
  } catch (error) {
    console.error('Erro no recálculo de banco de horas:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro ao recalcular banco de horas'
    }, { status: 500 });
  }
});