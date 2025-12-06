import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * NÍVEL 5 - APRENDIZADO CONTÍNUO
 * Otimiza o próprio modelo do agente baseado em padrões aprendidos
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar memórias recentes
    const memories = await base44.asServiceRole.entities.CodeFixMemory.list('-date', 50);

    if (!memories || memories.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhuma memória disponível para aprendizado',
        patterns_learned: 0
      });
    }

    // Analisar padrões
    const patterns = new Map();
    let totalLearned = 0;

    for (const memory of memories) {
      if (!memory.learned_from) continue;

      for (const item of memory.learned_from) {
        totalLearned++;
        const key = item.message?.slice(0, 100) || 'unknown';

        if (!patterns.has(key)) {
          patterns.set(key, {
            message: key,
            full_message: item.message,
            occurrences: 0,
            solutions: [],
            components: new Set(),
            severities: new Map(),
            files: new Set()
          });
        }

        const pattern = patterns.get(key);
        pattern.occurrences++;
        pattern.solutions.push(item.solution);
        if (item.component) pattern.components.add(item.component);
        if (item.severity) {
          pattern.severities.set(item.severity, (pattern.severities.get(item.severity) || 0) + 1);
        }
        if (item.file) pattern.files.add(item.file);
      }
    }

    // Converter para array e calcular taxa de sucesso
    const learnedPatterns = Array.from(patterns.values())
      .map(p => {
        // Calcular taxa de sucesso baseada em:
        // - Número de ocorrências (quanto mais, mais confiável)
        // - Consistência de soluções (mesma solução = mais confiável)
        const uniqueSolutions = new Set(p.solutions).size;
        const consistencyScore = 1 - (uniqueSolutions / p.solutions.length);
        const frequencyScore = Math.min(p.occurrences / 10, 1);
        const successRate = (consistencyScore * 0.6 + frequencyScore * 0.4) * 100;

        // Encontrar solução mais comum
        const solutionCounts = new Map();
        for (const sol of p.solutions) {
          solutionCounts.set(sol, (solutionCounts.get(sol) || 0) + 1);
        }
        const preferredSolution = Array.from(solutionCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Solução não especificada';

        return {
          message: p.full_message,
          message_key: p.message,
          occurrences: p.occurrences,
          preferred_solution: preferredSolution,
          alternative_solutions: Array.from(new Set(p.solutions)).slice(0, 3),
          success_rate: Math.round(successRate),
          affected_components: Array.from(p.components),
          affected_files: Array.from(p.files),
          dominant_severity: Array.from(p.severities.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown',
          confidence_level: successRate > 80 ? 'alta' : successRate > 60 ? 'média' : 'baixa'
        };
      })
      .sort((a, b) => b.success_rate - a.success_rate);

    // Calcular métricas gerais
    const avgSuccessRate = learnedPatterns.length > 0
      ? Math.round(learnedPatterns.reduce((acc, p) => acc + p.success_rate, 0) / learnedPatterns.length)
      : 0;

    const mostCommonError = learnedPatterns[0];

    const highConfidencePatterns = learnedPatterns.filter(p => p.success_rate > 80);

    // Buscar versão atual
    const existingKB = await base44.asServiceRole.entities.CodeFixKnowledgeBase.list('-version', 1);
    const currentVersion = existingKB && existingKB[0] ? existingKB[0].version : 0;

    // Criar nova versão da base de conhecimento
    const knowledgeBase = await base44.asServiceRole.entities.CodeFixKnowledgeBase.create({
      learned_patterns: learnedPatterns,
      updated_at: new Date().toISOString(),
      version: currentVersion + 1,
      metrics: {
        total_patterns: learnedPatterns.length,
        total_learned_errors: totalLearned,
        avg_success_rate: avgSuccessRate,
        high_confidence_patterns: highConfidencePatterns.length,
        most_common_error: mostCommonError?.message || 'N/A',
        most_reliable_solution: mostCommonError?.preferred_solution || 'N/A'
      }
    });

    // Registrar ação
    await base44.asServiceRole.entities.AcaoAgente.create({
      tipo_acao: 'analise_automatica',
      status: 'concluido',
      prioridade: 'media',
      descricao: `Modelo do agente atualizado - Versão ${currentVersion + 1}`,
      resultado: `🧠 **Base de Conhecimento Atualizada**

📊 **Métricas Gerais:**
- Total de padrões aprendidos: ${learnedPatterns.length}
- Total de erros analisados: ${totalLearned}
- Taxa média de sucesso: ${avgSuccessRate}%
- Padrões de alta confiança: ${highConfidencePatterns.length}

🎯 **Erro Mais Comum:**
${mostCommonError?.message?.slice(0, 100) || 'N/A'}

💡 **Solução Mais Confiável:**
${mostCommonError?.preferred_solution || 'N/A'}

🔝 **Top 5 Padrões Mais Confiáveis:**
${highConfidencePatterns.slice(0, 5).map((p, i) => `
${i + 1}. ${p.message?.slice(0, 60)}...
   Taxa de Sucesso: ${p.success_rate}%
   Solução: ${p.preferred_solution?.slice(0, 80)}...
`).join('\n')}

🚀 **Próxima Evolução:**
O agente agora pode aplicar correções automáticas com maior confiança para os ${highConfidencePatterns.length} padrões de alta confiança.`,
      contexto: {
        knowledge_base_id: knowledgeBase.id,
        version: currentVersion + 1,
        patterns_learned: learnedPatterns.length,
        avg_success_rate: avgSuccessRate,
        high_confidence_count: highConfidencePatterns.length
      },
      iniciado_por: 'sistema',
      data_conclusao: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Modelo do agente atualizado com novos padrões aprendidos',
      knowledge_base_id: knowledgeBase.id,
      version: currentVersion + 1,
      metrics: knowledgeBase.metrics,
      top_patterns: learnedPatterns.slice(0, 5),
      insights: generateModelInsights(learnedPatterns, highConfidencePatterns, avgSuccessRate)
    });

  } catch (error) {
    console.error('Error improving agent model:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
});

function generateModelInsights(patterns, highConfidence, avgSuccess) {
  const insights = [];

  insights.push(`🎯 Taxa de Sucesso Geral: ${avgSuccess}%`);

  if (avgSuccess > 80) {
    insights.push(`✅ Modelo altamente confiável - Recomenda-se aumentar automação`);
  } else if (avgSuccess > 60) {
    insights.push(`📊 Modelo em desenvolvimento - Continue coletando dados`);
  } else {
    insights.push(`⚠️  Modelo necessita mais dados - Aumentar período de aprendizado`);
  }

  if (highConfidence.length > 0) {
    insights.push(`\n🏆 ${highConfidence.length} padrões com alta confiança (>80%)`);
    insights.push(`   Estes podem ser corrigidos automaticamente pelo agente`);
  }

  // Identificar áreas que precisam atenção
  const lowConfidence = patterns.filter(p => p.success_rate < 60);
  if (lowConfidence.length > 0) {
    insights.push(`\n⚠️  ${lowConfidence.length} padrões com baixa confiança (<60%)`);
    insights.push(`   Requerem análise manual antes de automação`);
  }

  // Componentes que se beneficiariam de refatoração
  const componentCounts = new Map();
  for (const pattern of patterns) {
    for (const comp of pattern.affected_components) {
      componentCounts.set(comp, (componentCounts.get(comp) || 0) + pattern.occurrences);
    }
  }

  const topComponent = Array.from(componentCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (topComponent && topComponent[1] > 10) {
    insights.push(`\n🎯 Componente "${topComponent[0]}" aparece em ${topComponent[1]} ocorrências`);
    insights.push(`   Recomendação: Priorizar refatoração deste componente`);
  }

  return insights;
}