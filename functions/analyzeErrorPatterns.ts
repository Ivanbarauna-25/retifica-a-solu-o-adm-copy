import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * NÍVEL 1 - INTELIGÊNCIA ANALÍTICA
 * Agrupa erros por padrões e identifica problemas recorrentes
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

    const windowHours = Number(payload.windowHours) || 72;
    const now = new Date();
    const cutoffISO = new Date(now.getTime() - windowHours * 60 * 60 * 1000).toISOString();

    // Buscar todos os erros recentes
    const allErrors = await base44.asServiceRole.entities.ErrorLog.list('-last_seen', 1000);
    
    const recentErrors = (allErrors || []).filter(erro => {
      const ts = erro.last_seen || erro.updated_date || erro.created_date;
      return ts && ts >= cutoffISO;
    });

    // Agrupar por mensagem
    const patternsByMessage = new Map();
    
    for (const erro of recentErrors) {
      const key = (erro.message || '').slice(0, 200);
      
      if (!patternsByMessage.has(key)) {
        patternsByMessage.set(key, {
          message: erro.message,
          count: 0,
          components: new Set(),
          files: new Set(),
          severities: new Map(),
          first_seen: erro.created_date,
          last_seen: erro.last_seen || erro.created_date,
          error_ids: []
        });
      }
      
      const pattern = patternsByMessage.get(key);
      pattern.count += 1;
      
      if (erro.component) pattern.components.add(erro.component);
      if (erro.file) pattern.files.add(erro.file);
      if (erro.severity) {
        pattern.severities.set(erro.severity, (pattern.severities.get(erro.severity) || 0) + 1);
      }
      
      if (erro.last_seen && erro.last_seen > pattern.last_seen) {
        pattern.last_seen = erro.last_seen;
      }
      
      pattern.error_ids.push(erro.id);
    }

    // Converter para array e ordenar por frequência
    const patterns = Array.from(patternsByMessage.values())
      .map(p => ({
        message: p.message,
        count: p.count,
        components: Array.from(p.components),
        files: Array.from(p.files),
        severities: Object.fromEntries(p.severities),
        dominant_severity: [...p.severities.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown',
        first_seen: p.first_seen,
        last_seen: p.last_seen,
        error_ids: p.error_ids.slice(0, 10),
        frequency_per_hour: (p.count / windowHours).toFixed(2),
        risk_score: calculateRiskScore(p)
      }))
      .sort((a, b) => b.risk_score - a.risk_score);

    // Identificar padrões críticos
    const criticalPatterns = patterns.filter(p => p.risk_score >= 70);
    const warningPatterns = patterns.filter(p => p.risk_score >= 40 && p.risk_score < 70);
    const lowRiskPatterns = patterns.filter(p => p.risk_score < 40);

    // Análise de componentes mais problemáticos
    const componentIssues = new Map();
    for (const pattern of patterns) {
      for (const comp of pattern.components) {
        if (!componentIssues.has(comp)) {
          componentIssues.set(comp, { count: 0, patterns: [] });
        }
        const compData = componentIssues.get(comp);
        compData.count += pattern.count;
        compData.patterns.push(pattern.message.slice(0, 50));
      }
    }

    const topProblematicComponents = Array.from(componentIssues.entries())
      .map(([comp, data]) => ({
        component: comp,
        error_count: data.count,
        unique_patterns: data.patterns.length,
        sample_errors: data.patterns.slice(0, 3)
      }))
      .sort((a, b) => b.error_count - a.error_count)
      .slice(0, 10);

    return Response.json({
      success: true,
      analysis: {
        total_errors: recentErrors.length,
        unique_patterns: patterns.length,
        window_hours: windowHours,
        analyzed_at: now.toISOString()
      },
      patterns: {
        critical: criticalPatterns,
        warning: warningPatterns,
        low_risk: lowRiskPatterns
      },
      top_problematic_components: topProblematicComponents,
      recommendations: generateRecommendations(criticalPatterns, warningPatterns, topProblematicComponents)
    });

  } catch (error) {
    console.error('Error analyzing patterns:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
});

function calculateRiskScore(pattern) {
  let score = 0;
  
  // Frequência (0-40 pontos)
  score += Math.min(pattern.count * 2, 40);
  
  // Severidade (0-30 pontos)
  const severityScores = { critical: 30, error: 20, warning: 10, info: 5 };
  score += severityScores[pattern.dominant_severity] || 0;
  
  // Componentes afetados (0-20 pontos)
  score += Math.min(pattern.components.length * 5, 20);
  
  // Recência (0-10 pontos)
  const hoursAgo = (Date.now() - new Date(pattern.last_seen).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 1) score += 10;
  else if (hoursAgo < 6) score += 7;
  else if (hoursAgo < 24) score += 4;
  
  return Math.min(score, 100);
}

function generateRecommendations(critical, warning, components) {
  const recommendations = [];
  
  if (critical.length > 0) {
    recommendations.push({
      priority: 'URGENTE',
      action: `Resolver ${critical.length} padrão(ões) crítico(s) imediatamente`,
      reason: 'Alto risco de impacto nos usuários',
      patterns: critical.slice(0, 3).map(p => p.message.slice(0, 60))
    });
  }
  
  if (components.length > 0 && components[0].error_count > 10) {
    recommendations.push({
      priority: 'ALTA',
      action: `Refatorar componente "${components[0].component}"`,
      reason: `Responsável por ${components[0].error_count} erros`,
      suggestion: 'Adicionar validações e tratamento de erros defensivo'
    });
  }
  
  if (warning.length > 5) {
    recommendations.push({
      priority: 'MÉDIA',
      action: 'Implementar testes automatizados',
      reason: `${warning.length} padrões de aviso detectados`,
      suggestion: 'Prevenir regressões com cobertura de testes'
    });
  }
  
  return recommendations;
}