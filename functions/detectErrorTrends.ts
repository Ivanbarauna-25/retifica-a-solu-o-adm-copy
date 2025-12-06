import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * NÍVEL 1 - INTELIGÊNCIA ANALÍTICA
 * Detecta tendências e calcula crescimento de erros
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Buscar erros
    const allErrors = await base44.asServiceRole.entities.ErrorLog.list('-last_seen', 2000);

    // Agrupar por períodos
    const errors24h = (allErrors || []).filter(e => {
      const ts = e.last_seen || e.created_date;
      return ts && ts >= last24h;
    });

    const errors24to48h = (allErrors || []).filter(e => {
      const ts = e.last_seen || e.created_date;
      return ts && ts >= last48h && ts < last24h;
    });

    const errors7days = (allErrors || []).filter(e => {
      const ts = e.last_seen || e.created_date;
      return ts && ts >= last7days;
    });

    // Agrupar por mensagem para detectar tendências
    const trendsByMessage = new Map();

    for (const erro of errors7days) {
      const key = (erro.message || '').slice(0, 200);
      
      if (!trendsByMessage.has(key)) {
        trendsByMessage.set(key, {
          message: erro.message,
          last_24h: 0,
          previous_24h: 0,
          last_7days: 0,
          severity: erro.severity
        });
      }
      
      const trend = trendsByMessage.get(key);
      trend.last_7days += 1;
      
      const ts = erro.last_seen || erro.created_date;
      if (ts >= last24h) {
        trend.last_24h += 1;
      } else if (ts >= last48h) {
        trend.previous_24h += 1;
      }
    }

    // Calcular variações
    const trends = Array.from(trendsByMessage.values())
      .map(t => {
        const growth = t.previous_24h > 0 
          ? ((t.last_24h - t.previous_24h) / t.previous_24h * 100).toFixed(1)
          : (t.last_24h > 0 ? 100 : 0);
        
        const dailyAverage = (t.last_7days / 7).toFixed(1);
        
        return {
          message: t.message,
          last_24h: t.last_24h,
          previous_24h: t.previous_24h,
          growth_percentage: parseFloat(growth),
          daily_average_7days: parseFloat(dailyAverage),
          severity: t.severity,
          trend_status: getTrendStatus(growth, t.last_24h),
          alert_level: getAlertLevel(growth, t.last_24h, t.severity)
        };
      })
      .filter(t => t.last_24h > 0 || t.previous_24h > 0)
      .sort((a, b) => b.growth_percentage - a.growth_percentage);

    // Identificar tendências preocupantes
    const escalating = trends.filter(t => t.growth_percentage > 50 && t.last_24h > 5);
    const stable = trends.filter(t => Math.abs(t.growth_percentage) <= 20);
    const declining = trends.filter(t => t.growth_percentage < -20);
    const emerging = trends.filter(t => t.previous_24h === 0 && t.last_24h >= 3);

    // Métricas gerais
    const totalErrorsLast24h = errors24h.length;
    const totalErrorsPrevious24h = errors24to48h.length;
    const overallGrowth = totalErrorsPrevious24h > 0
      ? ((totalErrorsLast24h - totalErrorsPrevious24h) / totalErrorsPrevious24h * 100).toFixed(1)
      : (totalErrorsLast24h > 0 ? 100 : 0);

    // Sistema de saúde
    const healthScore = calculateSystemHealth(trends, totalErrorsLast24h, escalating.length);

    return Response.json({
      success: true,
      summary: {
        total_errors_last_24h: totalErrorsLast24h,
        total_errors_previous_24h: totalErrorsPrevious24h,
        overall_growth: parseFloat(overallGrowth),
        unique_error_patterns: trends.length,
        health_score: healthScore,
        status: getHealthStatus(healthScore),
        analyzed_at: now.toISOString()
      },
      trends: {
        escalating: escalating.slice(0, 10),
        emerging: emerging.slice(0, 10),
        stable: stable.slice(0, 5),
        declining: declining.slice(0, 5)
      },
      alerts: generateAlerts(escalating, emerging, healthScore),
      forecast: generateForecast(trends, totalErrorsLast24h)
    });

  } catch (error) {
    console.error('Error detecting trends:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
});

function getTrendStatus(growth, count) {
  if (count === 0) return 'resolved';
  if (growth > 100) return 'critical_escalation';
  if (growth > 50) return 'escalating';
  if (growth > 20) return 'increasing';
  if (growth < -20) return 'declining';
  return 'stable';
}

function getAlertLevel(growth, count, severity) {
  if (severity === 'critical' && count > 0) return 'critical';
  if (growth > 100 && count > 5) return 'critical';
  if (growth > 50 && count > 3) return 'high';
  if (growth > 20 || (severity === 'error' && count > 10)) return 'medium';
  return 'low';
}

function calculateSystemHealth(trends, totalErrors, escalatingCount) {
  let score = 100;
  
  // Penalizar por total de erros
  score -= Math.min(totalErrors * 0.5, 30);
  
  // Penalizar por erros escalando
  score -= escalatingCount * 5;
  
  // Penalizar por erros críticos
  const criticalCount = trends.filter(t => t.severity === 'critical').length;
  score -= criticalCount * 3;
  
  return Math.max(Math.round(score), 0);
}

function getHealthStatus(score) {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'critical';
}

function generateAlerts(escalating, emerging, healthScore) {
  const alerts = [];
  
  if (escalating.length > 0) {
    alerts.push({
      type: 'trend_escalation',
      severity: 'high',
      message: `${escalating.length} erro(s) em escalação detectados`,
      action: 'Investigar e corrigir imediatamente',
      affected_patterns: escalating.slice(0, 3).map(e => e.message.slice(0, 60))
    });
  }
  
  if (emerging.length >= 3) {
    alerts.push({
      type: 'new_errors',
      severity: 'medium',
      message: `${emerging.length} novo(s) padrão(ões) de erro surgiram`,
      action: 'Monitorar nas próximas 24h',
      affected_patterns: emerging.slice(0, 3).map(e => e.message.slice(0, 60))
    });
  }
  
  if (healthScore < 60) {
    alerts.push({
      type: 'system_health',
      severity: 'high',
      message: `Saúde do sistema em ${healthScore}/100`,
      action: 'Ação corretiva urgente necessária',
      recommendation: 'Executar varredura completa e resolver erros críticos'
    });
  }
  
  return alerts;
}

function generateForecast(trends, currentTotal) {
  const growthRates = trends
    .filter(t => t.last_24h > 0)
    .map(t => t.growth_percentage);
  
  const avgGrowth = growthRates.length > 0
    ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
    : 0;
  
  const forecast24h = Math.round(currentTotal * (1 + avgGrowth / 100));
  const forecast48h = Math.round(forecast24h * (1 + avgGrowth / 100));
  
  return {
    next_24h: forecast24h,
    next_48h: forecast48h,
    confidence: growthRates.length >= 5 ? 'high' : 'low',
    trend: avgGrowth > 10 ? 'worsening' : avgGrowth < -10 ? 'improving' : 'stable'
  };
}