import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * NÍVEL 4 - GESTÃO ESTRATÉGICA
 * Gera relatório completo de saúde do sistema
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload = {};
    try {
      payload = await req.json();
    } catch (e) {
      payload = {};
    }

    const hours = Number(payload.hours) || 72;
    const now = new Date();
    const cutoffISO = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

    // Buscar dados
    const allErrors = await base44.asServiceRole.entities.ErrorLog.list('-last_seen', 1000);
    const allTasks = await base44.asServiceRole.entities.CodeFixTask.list('-updated_date', 500);
    const allPatches = await base44.asServiceRole.entities.CodePatchSuggestion.list('-updated_date', 500);

    // Filtrar por período
    const errors = (allErrors || []).filter(e => {
      const ts = e.last_seen || e.created_date;
      return ts && ts >= cutoffISO;
    });

    const tasks = (allTasks || []).filter(t => {
      const ts = t.updated_date || t.created_date;
      return ts && ts >= cutoffISO;
    });

    // Métricas básicas
    const total = errors.length;
    const criticals = errors.filter(e => e.severity === 'critical').length;
    const errorsOnly = errors.filter(e => e.severity === 'error').length;
    const warnings = errors.filter(e => e.severity === 'warning').length;
    const resolved = errors.filter(e => e.status === 'resolvido').length;
    const inAnalysis = errors.filter(e => e.status === 'em_analise').length;
    const newErrors = errors.filter(e => e.status === 'novo').length;

    // Calcular reincidências (erros com mesma mensagem)
    const errorMessages = new Map();
    for (const err of errors) {
      const key = err.message?.slice(0, 100) || 'unknown';
      errorMessages.set(key, (errorMessages.get(key) || 0) + 1);
    }
    const recurrences = Array.from(errorMessages.values()).filter(count => count > 1).length;

    // Componentes mais problemáticos
    const componentIssues = new Map();
    for (const err of errors) {
      const comp = err.component || err.file || 'unknown';
      componentIssues.set(comp, (componentIssues.get(comp) || 0) + 1);
    }
    const topComponents = Array.from(componentIssues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ component: name, error_count: count }));

    // Métricas de tarefas
    const tasksOpen = tasks.filter(t => t.status === 'aberta').length;
    const tasksInProgress = tasks.filter(t => t.status === 'em_progresso').length;
    const tasksCompleted = tasks.filter(t => t.status === 'concluida').length;

    // Métricas de patches
    const patchesSuggested = allPatches.filter(p => p.status === 'sugerido').length;
    const patchesApproved = allPatches.filter(p => p.status === 'aprovado').length;
    const patchesApplied = allPatches.filter(p => p.status === 'aplicado').length;

    // Calcular System Health Score (0-100)
    let healthScore = 100;
    healthScore -= criticals * 10; // -10 por erro crítico
    healthScore -= errorsOnly * 5; // -5 por erro
    healthScore -= warnings * 2; // -2 por warning
    healthScore -= recurrences * 3; // -3 por reincidência
    healthScore += resolved * 2; // +2 por erro resolvido
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Determinar tendência
    let trend = 'Estável';
    let trendIcon = '➡️';
    if (total > 50) {
      trend = 'Atenção: Aumento recente de ocorrências';
      trendIcon = '⚠️';
    } else if (criticals > 5) {
      trend = 'Crítico: Múltiplos erros graves';
      trendIcon = '🔴';
    } else if (resolved > total * 0.5) {
      trend = 'Melhorando: Boa taxa de resolução';
      trendIcon = '✅';
    }

    // Calcular MTTR (Mean Time To Resolution)
    const resolvedWithTime = errors.filter(e => 
      e.status === 'resolvido' && e.created_date && e.updated_date
    );
    let mttr = 0;
    if (resolvedWithTime.length > 0) {
      const totalTime = resolvedWithTime.reduce((acc, e) => {
        const created = new Date(e.created_date).getTime();
        const updated = new Date(e.updated_date).getTime();
        return acc + (updated - created);
      }, 0);
      mttr = Math.round(totalTime / resolvedWithTime.length / (1000 * 60 * 60)); // em horas
    }

    // Gerar relatório textual
    const reportText = `
═══════════════════════════════════════════════════════════
⚙️  RELATÓRIO DE SAÚDE DO SISTEMA
═══════════════════════════════════════════════════════════

📊 PERÍODO ANALISADO: Últimas ${hours} horas
📅 Gerado em: ${now.toLocaleString('pt-BR')}

═══════════════════════════════════════════════════════════
🎯 INDICADORES PRINCIPAIS
═══════════════════════════════════════════════════════════

🏥 System Health Score: ${healthScore}/100
${trendIcon} Tendência: ${trend}
⏱️  MTTR (Tempo Médio de Resolução): ${mttr}h

═══════════════════════════════════════════════════════════
🐛 ERROS DETECTADOS
═══════════════════════════════════════════════════════════

Total de Erros: ${total}
├─ 🔴 Críticos: ${criticals}
├─ 🟠 Erros: ${errorsOnly}
├─ 🟡 Avisos: ${warnings}
└─ 🔄 Reincidências: ${recurrences}

Status:
├─ 🆕 Novos: ${newErrors}
├─ 🔍 Em Análise: ${inAnalysis}
└─ ✅ Resolvidos: ${resolved}

═══════════════════════════════════════════════════════════
📋 TAREFAS DE CORREÇÃO
═══════════════════════════════════════════════════════════

Total de Tarefas: ${tasks.length}
├─ 📂 Abertas: ${tasksOpen}
├─ 🔄 Em Progresso: ${tasksInProgress}
└─ ✅ Concluídas: ${tasksCompleted}

═══════════════════════════════════════════════════════════
🔧 PATCHES GERADOS
═══════════════════════════════════════════════════════════

├─ 💡 Sugeridos: ${patchesSuggested}
├─ ✅ Aprovados: ${patchesApproved}
└─ 🚀 Aplicados: ${patchesApplied}

═══════════════════════════════════════════════════════════
🎯 TOP 5 COMPONENTES PROBLEMÁTICOS
═══════════════════════════════════════════════════════════

${topComponents.map((c, i) => `${i + 1}. ${c.component}: ${c.error_count} erros`).join('\n')}

═══════════════════════════════════════════════════════════
💡 RECOMENDAÇÕES ESTRATÉGICAS
═══════════════════════════════════════════════════════════

${generateRecommendations(healthScore, criticals, recurrences, topComponents)}

═══════════════════════════════════════════════════════════
`;

    // Registrar ação
    await base44.asServiceRole.entities.AcaoAgente.create({
      tipo_acao: 'relatorio_gerado',
      status: 'concluido',
      prioridade: healthScore < 60 ? 'critica' : healthScore < 80 ? 'alta' : 'media',
      descricao: `Relatório de saúde do sistema gerado - Score: ${healthScore}/100`,
      resultado: reportText,
      contexto: {
        health_score: healthScore,
        total_errors: total,
        criticals: criticals,
        resolved: resolved,
        mttr: mttr
      },
      iniciado_por: 'sistema',
      data_conclusao: new Date().toISOString()
    });

    return Response.json({
      success: true,
      health_score: healthScore,
      trend: trend,
      metrics: {
        total_errors: total,
        criticals: criticals,
        errors: errorsOnly,
        warnings: warnings,
        resolved: resolved,
        in_analysis: inAnalysis,
        new_errors: newErrors,
        recurrences: recurrences,
        mttr_hours: mttr
      },
      tasks: {
        total: tasks.length,
        open: tasksOpen,
        in_progress: tasksInProgress,
        completed: tasksCompleted
      },
      patches: {
        suggested: patchesSuggested,
        approved: patchesApproved,
        applied: patchesApplied
      },
      top_components: topComponents,
      report_text: reportText,
      recommendations: generateRecommendations(healthScore, criticals, recurrences, topComponents)
    });

  } catch (error) {
    console.error('Error generating health report:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
});

function generateRecommendations(healthScore, criticals, recurrences, topComponents) {
  const recommendations = [];

  if (healthScore < 40) {
    recommendations.push('🚨 URGENTE: Sistema em estado crítico - Ação imediata necessária');
    recommendations.push('   • Priorizar resolução de erros críticos');
    recommendations.push('   • Considerar rollback de últimas mudanças');
    recommendations.push('   • Escalar para equipe técnica sênior');
  } else if (healthScore < 60) {
    recommendations.push('⚠️  ATENÇÃO: Saúde do sistema abaixo do ideal');
    recommendations.push('   • Revisar e corrigir erros pendentes');
    recommendations.push('   • Implementar monitoramento adicional');
  } else if (healthScore < 80) {
    recommendations.push('📊 Saúde do sistema aceitável, mas há espaço para melhoria');
    recommendations.push('   • Resolver erros reincidentes');
    recommendations.push('   • Implementar testes preventivos');
  } else {
    recommendations.push('✅ Sistema operando em ótimas condições');
    recommendations.push('   • Manter práticas atuais');
    recommendations.push('   • Monitorar tendências');
  }

  if (criticals > 0) {
    recommendations.push(`\n🔴 ${criticals} erro(s) crítico(s) detectado(s) - Resolver IMEDIATAMENTE`);
  }

  if (recurrences > 5) {
    recommendations.push(`\n🔄 ${recurrences} padrões de reincidência detectados`);
    recommendations.push('   • Implementar correções definitivas');
    recommendations.push('   • Adicionar validações preventivas');
  }

  if (topComponents.length > 0 && topComponents[0].error_count > 10) {
    recommendations.push(`\n🎯 Componente "${topComponents[0].component}" necessita refatoração`);
    recommendations.push('   • Revisar lógica do componente');
    recommendations.push('   • Adicionar tratamento de erros defensivo');
  }

  return recommendations.join('\n');
}