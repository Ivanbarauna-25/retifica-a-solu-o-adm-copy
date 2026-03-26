import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * NÍVEL 5 - APRENDIZADO CONTÍNUO
 * Aprende com erros resolvidos e constrói base de conhecimento
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar erros resolvidos que ainda não foram aprendidos
    const allErrors = await base44.asServiceRole.entities.ErrorLog.list('-updated_date', 500);
    const resolved = (allErrors || []).filter(e => e.status === 'resolvido');

    if (resolved.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhum erro resolvido novo para aprender',
        learned_count: 0
      });
    }

    // Extrair aprendizados
    const learning = resolved.map(err => {
      let cause = 'Não especificada';
      let solution = 'Correção aplicada';

      // Tentar extrair análise de IA se existir
      if (err.extra) {
        try {
          const extra = JSON.parse(err.extra);
          if (extra.ai_analysis) {
            cause = extra.ai_analysis.root_cause || cause;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Gerar resumo de solução baseado na mensagem do erro
      if (err.message?.includes('Cannot read properties of undefined')) {
        solution = 'Adicionar validação de null/undefined antes do acesso';
      } else if (err.message?.includes('map') && err.message?.includes('not a function')) {
        solution = 'Garantir que variável é array antes do .map()';
      } else if (err.message?.includes('500')) {
        solution = 'Revisar e validar função backend';
      } else if (err.message?.includes('insertBefore')) {
        solution = 'Verificar ciclo de vida de componentes React';
      }

      return {
        error_id: err.id,
        message: err.message,
        cause: cause,
        solution: solution,
        component: err.component || err.file || 'Não especificado',
        severity: err.severity,
        resolved_at: err.updated_date || err.created_date,
        file: err.file,
        line: err.line
      };
    });

    // Criar registro de memória
    const memory = await base44.asServiceRole.entities.CodeFixMemory.create({
      learned_from: learning,
      date: new Date().toISOString(),
      total_learned: learning.length
    });

    // Registrar ação
    await base44.asServiceRole.entities.AcaoAgente.create({
      tipo_acao: 'analise_automatica',
      status: 'concluido',
      prioridade: 'media',
      descricao: `Aprendizado de ${learning.length} erro(s) resolvido(s)`,
      resultado: `Base de conhecimento atualizada com ${learning.length} novos padrões de solução.

📚 **Exemplos de Aprendizados:**
${learning.slice(0, 3).map(l => `
• Erro: ${l.message?.slice(0, 60)}...
  Solução: ${l.solution}
  Componente: ${l.component}
`).join('\n')}`,
      contexto: {
        memory_id: memory.id,
        learned_count: learning.length,
        sample_solutions: learning.slice(0, 3).map(l => l.solution)
      },
      iniciado_por: 'sistema',
      data_conclusao: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: `Memória atualizada com ${learning.length} correções`,
      memory_id: memory.id,
      learned_count: learning.length,
      sample: learning.slice(0, 3),
      insights: generateInsights(learning)
    });

  } catch (error) {
    console.error('Error learning from resolved errors:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
});

function generateInsights(learning) {
  const insights = [];

  // Agrupar por tipo de solução
  const solutionTypes = new Map();
  for (const item of learning) {
    const key = item.solution?.slice(0, 50) || 'unknown';
    solutionTypes.set(key, (solutionTypes.get(key) || 0) + 1);
  }

  // Encontrar solução mais comum
  const mostCommon = Array.from(solutionTypes.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (mostCommon) {
    insights.push(`💡 Solução mais frequente: "${mostCommon[0]}" (${mostCommon[1]}x)`);
  }

  // Componentes mais corrigidos
  const components = new Map();
  for (const item of learning) {
    const comp = item.component || 'unknown';
    components.set(comp, (components.get(comp) || 0) + 1);
  }

  const topComponent = Array.from(components.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (topComponent && topComponent[1] > 2) {
    insights.push(`🎯 Componente mais corrigido: "${topComponent[0]}" (${topComponent[1]}x)`);
    insights.push(`   Recomendação: Considerar refatoração deste componente`);
  }

  // Severidade predominante
  const severities = learning.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    return acc;
  }, {});

  const topSeverity = Object.entries(severities)
    .sort((a, b) => b[1] - a[1])[0];

  if (topSeverity) {
    insights.push(`📊 Severidade predominante: ${topSeverity[0]} (${topSeverity[1]}x)`);
  }

  return insights;
}