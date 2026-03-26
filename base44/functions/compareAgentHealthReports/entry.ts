import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * INTELIGÊNCIA COMPARATIVA
 * Compara relatórios de saúde para identificar evolução
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { current, previous } = payload;

    // Se não foram passados relatórios, buscar os 2 últimos do histórico
    let currentReport = current;
    let previousReport = previous;

    if (!currentReport || !previousReport) {
      const history = await base44.asServiceRole.entities.AgentReportsHistory.list('-report_date', 2);
      
      if (!history || history.length < 2) {
        return Response.json({
          success: true,
          comparison: null,
          message: 'Histórico insuficiente para comparação. Aguarde próximo relatório.'
        });
      }

      currentReport = history[0];
      previousReport = history[1];
    }

    // Calcular diferenças
    const comparison = {
      period: {
        current: new Date(currentReport.report_date).toLocaleDateString('pt-BR'),
        previous: new Date(previousReport.report_date).toLocaleDateString('pt-BR'),
        days_between: Math.round(
          (new Date(currentReport.report_date) - new Date(previousReport.report_date)) / (1000 * 60 * 60 * 24)
        )
      },
      
      health_score: {
        current: currentReport.health_score,
        previous: previousReport.health_score,
        change: currentReport.health_score - previousReport.health_score,
        change_percent: previousReport.health_score > 0 
          ? ((currentReport.health_score - previousReport.health_score) / previousReport.health_score * 100).toFixed(1)
          : 0,
        trend: getTrend(currentReport.health_score, previousReport.health_score),
        icon: getTrendIcon(currentReport.health_score, previousReport.health_score)
      },

      errors: {
        total: {
          current: currentReport.total_errors,
          previous: previousReport.total_errors,
          change: currentReport.total_errors - previousReport.total_errors,
          change_percent: previousReport.total_errors > 0
            ? ((currentReport.total_errors - previousReport.total_errors) / previousReport.total_errors * 100).toFixed(1)
            : 0,
          trend: getTrend(previousReport.total_errors, currentReport.total_errors), // Invertido: menos erros = melhor
          icon: getTrendIcon(previousReport.total_errors, currentReport.total_errors)
        },
        critical: {
          current: currentReport.critical_errors,
          previous: previousReport.critical_errors,
          change: currentReport.critical_errors - previousReport.critical_errors,
          change_percent: previousReport.critical_errors > 0
            ? ((currentReport.critical_errors - previousReport.critical_errors) / previousReport.critical_errors * 100).toFixed(1)
            : 0,
          trend: getTrend(previousReport.critical_errors, currentReport.critical_errors),
          icon: getTrendIcon(previousReport.critical_errors, currentReport.critical_errors)
        },
        resolved: {
          current: currentReport.resolved_errors,
          previous: previousReport.resolved_errors,
          change: currentReport.resolved_errors - previousReport.resolved_errors,
          change_percent: previousReport.resolved_errors > 0
            ? ((currentReport.resolved_errors - previousReport.resolved_errors) / previousReport.resolved_errors * 100).toFixed(1)
            : 0,
          trend: getTrend(currentReport.resolved_errors, previousReport.resolved_errors),
          icon: getTrendIcon(currentReport.resolved_errors, previousReport.resolved_errors)
        }
      },

      resolution_rate: {
        current: currentReport.resolution_rate || 0,
        previous: previousReport.resolution_rate || 0,
        change: (currentReport.resolution_rate || 0) - (previousReport.resolution_rate || 0),
        trend: getTrend(currentReport.resolution_rate, previousReport.resolution_rate),
        icon: getTrendIcon(currentReport.resolution_rate, previousReport.resolution_rate)
      },

      mttr: {
        current: currentReport.mttr_hours,
        previous: previousReport.mttr_hours,
        change: currentReport.mttr_hours - previousReport.mttr_hours,
        change_percent: previousReport.mttr_hours > 0
          ? ((currentReport.mttr_hours - previousReport.mttr_hours) / previousReport.mttr_hours * 100).toFixed(1)
          : 0,
        trend: getTrend(previousReport.mttr_hours, currentReport.mttr_hours), // Menos tempo = melhor
        icon: getTrendIcon(previousReport.mttr_hours, currentReport.mttr_hours)
      },

      learning: {
        patterns: {
          current: currentReport.total_patterns,
          previous: previousReport.total_patterns,
          change: currentReport.total_patterns - previousReport.total_patterns,
          change_percent: previousReport.total_patterns > 0
            ? ((currentReport.total_patterns - previousReport.total_patterns) / previousReport.total_patterns * 100).toFixed(1)
            : 0,
          trend: getTrend(currentReport.total_patterns, previousReport.total_patterns),
          icon: getTrendIcon(currentReport.total_patterns, previousReport.total_patterns)
        },
        model_version: {
          current: currentReport.model_version,
          previous: previousReport.model_version,
          evolved: currentReport.model_version > previousReport.model_version
        }
      },

      actions: {
        patches: {
          current: currentReport.patches_applied,
          previous: previousReport.patches_applied,
          change: currentReport.patches_applied - previousReport.patches_applied,
          trend: getTrend(currentReport.patches_applied, previousReport.patches_applied),
          icon: getTrendIcon(currentReport.patches_applied, previousReport.patches_applied)
        },
        tasks: {
          current: currentReport.tasks_created,
          previous: previousReport.tasks_created,
          change: currentReport.tasks_created - previousReport.tasks_created,
          trend: getTrend(currentReport.tasks_created, previousReport.tasks_created),
          icon: getTrendIcon(currentReport.tasks_created, previousReport.tasks_created)
        }
      },

      safety: {
        current: currentReport.safety_score,
        previous: previousReport.safety_score,
        change: currentReport.safety_score - previousReport.safety_score,
        trend: getTrend(currentReport.safety_score, previousReport.safety_score),
        icon: getTrendIcon(currentReport.safety_score, previousReport.safety_score)
      }
    };

    // Gerar resumo executivo
    const summary = generateExecutiveSummary(comparison);

    // Gerar texto formatado para inclusão no relatório
    const comparisonText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 ANÁLISE COMPARATIVA (Evolução Semanal)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Período: ${comparison.period.previous} → ${comparison.period.current} (${comparison.period.days_between} dias)

🏥 SAÚDE DO SISTEMA
   Health Score: ${comparison.health_score.previous} → ${comparison.health_score.current} (${comparison.health_score.change > 0 ? '+' : ''}${comparison.health_score.change_percent}%) ${comparison.health_score.icon}

🐛 ERROS DETECTADOS
   Total: ${comparison.errors.total.previous} → ${comparison.errors.total.current} (${comparison.errors.total.change > 0 ? '+' : ''}${comparison.errors.total.change}) ${comparison.errors.total.icon}
   Críticos: ${comparison.errors.critical.previous} → ${comparison.errors.critical.current} (${comparison.errors.critical.change > 0 ? '+' : ''}${comparison.errors.critical.change}) ${comparison.errors.critical.icon}
   Resolvidos: ${comparison.errors.resolved.previous} → ${comparison.errors.resolved.current} (${comparison.errors.resolved.change > 0 ? '+' : ''}${comparison.errors.resolved.change}) ${comparison.errors.resolved.icon}

📊 PERFORMANCE
   Taxa de Resolução: ${comparison.resolution_rate.previous}% → ${comparison.resolution_rate.current}% (${comparison.resolution_rate.change > 0 ? '+' : ''}${comparison.resolution_rate.change.toFixed(1)}%) ${comparison.resolution_rate.icon}
   MTTR: ${comparison.mttr.previous}h → ${comparison.mttr.current}h (${comparison.mttr.change > 0 ? '+' : ''}${comparison.mttr.change_percent}%) ${comparison.mttr.icon}

🧠 APRENDIZADO
   Padrões Aprendidos: ${comparison.learning.patterns.previous} → ${comparison.learning.patterns.current} (${comparison.learning.patterns.change > 0 ? '+' : ''}${comparison.learning.patterns.change}) ${comparison.learning.patterns.icon}
   Versão do Modelo: v${comparison.learning.model_version.previous} → v${comparison.learning.model_version.current} ${comparison.learning.model_version.evolved ? '🆙' : '➡️'}

🔧 AÇÕES REALIZADAS
   Patches Aplicados: ${comparison.actions.patches.previous} → ${comparison.actions.patches.current} (${comparison.actions.patches.change > 0 ? '+' : ''}${comparison.actions.patches.change}) ${comparison.actions.patches.icon}
   Tarefas Criadas: ${comparison.actions.tasks.previous} → ${comparison.actions.tasks.current} (${comparison.actions.tasks.change > 0 ? '+' : ''}${comparison.actions.tasks.change}) ${comparison.actions.tasks.icon}

💡 RESUMO EXECUTIVO
${summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    return Response.json({
      success: true,
      comparison: comparison,
      summary: summary,
      comparison_text: comparisonText
    });

  } catch (error) {
    console.error('Error comparing reports:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
});

function getTrend(current, previous) {
  if (current > previous) return 'improving';
  if (current < previous) return 'declining';
  return 'stable';
}

function getTrendIcon(current, previous) {
  if (current > previous) return '🔼';
  if (current < previous) return '🔽';
  return '➡️';
}

function generateExecutiveSummary(comparison) {
  const insights = [];

  // Análise de Health Score
  if (comparison.health_score.change > 10) {
    insights.push(`✅ Melhora significativa na saúde do sistema (+${comparison.health_score.change_percent}%)`);
  } else if (comparison.health_score.change < -10) {
    insights.push(`⚠️ Deterioração preocupante na saúde do sistema (${comparison.health_score.change_percent}%)`);
  } else if (Math.abs(comparison.health_score.change) <= 5) {
    insights.push(`➡️ Saúde do sistema estável (${comparison.health_score.change > 0 ? '+' : ''}${comparison.health_score.change_percent}%)`);
  }

  // Análise de Erros
  if (comparison.errors.critical.change < 0) {
    insights.push(`🎯 Redução de ${Math.abs(comparison.errors.critical.change)} erro(s) crítico(s) - Excelente!`);
  } else if (comparison.errors.critical.change > 0) {
    insights.push(`🚨 Aumento de ${comparison.errors.critical.change} erro(s) crítico(s) - Requer atenção`);
  }

  // Análise de Resolução
  if (comparison.resolution_rate.change > 10) {
    insights.push(`📈 Taxa de resolução aumentou ${comparison.resolution_rate.change.toFixed(1)}% - Ótimo trabalho!`);
  } else if (comparison.resolution_rate.change < -10) {
    insights.push(`📉 Taxa de resolução caiu ${Math.abs(comparison.resolution_rate.change).toFixed(1)}% - Revisar processos`);
  }

  // Análise de MTTR
  if (comparison.mttr.change < 0) {
    insights.push(`⚡ Tempo de resolução ${Math.abs(comparison.mttr.change_percent)}% mais rápido`);
  } else if (comparison.mttr.change > 0 && comparison.mttr.change_percent > 20) {
    insights.push(`⏱️ Tempo de resolução ${comparison.mttr.change_percent}% mais lento - Investigar`);
  }

  // Análise de Aprendizado
  if (comparison.learning.patterns.change > 0) {
    insights.push(`🧠 Sistema aprendeu ${comparison.learning.patterns.change} novo(s) padrão(ões)`);
  }

  if (comparison.learning.model_version.evolved) {
    insights.push(`🆙 Modelo do agente evoluiu para v${comparison.learning.model_version.current}`);
  }

  // Análise de Ações
  if (comparison.actions.patches.change > 5) {
    insights.push(`🔧 Aumento significativo de correções aplicadas (+${comparison.actions.patches.change})`);
  }

  // Conclusão geral
  const overallTrend = comparison.health_score.change > 5 ? 'positiva' : 
                       comparison.health_score.change < -5 ? 'negativa' : 'estável';
  
  insights.push(`\n🎯 Tendência Geral: ${overallTrend.toUpperCase()}`);

  if (overallTrend === 'positiva') {
    insights.push('   Recomendação: Manter práticas atuais e continuar monitoramento');
  } else if (overallTrend === 'negativa') {
    insights.push('   Recomendação: Ação corretiva necessária - revisar erros críticos');
  } else {
    insights.push('   Recomendação: Manter vigilância e buscar melhorias incrementais');
  }

  return insights.map(i => `   ${i}`).join('\n');
}