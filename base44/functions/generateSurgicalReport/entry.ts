import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

function formatDateBR(s) {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getSeverityEmoji(severity) {
  const map = {
    critical: '🔴',
    error: '🟠',
    warning: '🟡',
    info: '🔵'
  };
  return map[severity] || '⚪';
}

function getPriorityLevel(count, severity, file) {
  if (severity === 'critical' || count > 50) return 'URGENTE';
  if (count > 20 || severity === 'error') return 'ALTA';
  if (count > 5 || severity === 'warning') return 'MÉDIA';
  return 'BAIXA';
}

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
    const limitTop = Number(payload.limitTop) || 5;
    const now = new Date();
    const cutoffISO = new Date(now.getTime() - windowHours * 60 * 60 * 1000).toISOString();

    // Usar visão administrativa para agregar
    const logsRaw = await base44.asServiceRole.entities.ErrorLog.list('-last_seen', 500);
    const tasks = await base44.asServiceRole.entities.CodeFixTask.list('-updated_date', 300);
    const patches = await base44.asServiceRole.entities.CodePatchSuggestion.list('-updated_date', 300);

    const logs = (logsRaw || []).filter((l) => {
      const ts = l.last_seen || l.updated_date || l.created_date;
      return !ts || ts >= cutoffISO;
    });

    // Mapear tarefas e patches
    const tasksByLogId = new Map();
    for (const t of (tasks || [])) {
      if (!t) continue;
      const key = t.error_log_id || '';
      if (!key) continue;
      const arr = tasksByLogId.get(key) || [];
      arr.push(t);
      tasksByLogId.set(key, arr);
    }

    const patchesByTaskId = new Map();
    for (const p of (patches || [])) {
      if (!p) continue;
      const tid = p.task_id || '';
      if (!tid) continue;
      const arr = patchesByTaskId.get(tid) || [];
      arr.push(p);
      patchesByTaskId.set(tid, arr);
    }

    // Agrupar erros por (message + source + file)
    const groupsMap = new Map();
    for (const l of logs) {
      const key = [
        (l.message || '').slice(0, 300),
        l.source || '',
        l.file || ''
      ].join('|');

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          message: l.message || '',
          source: l.source || '',
          file: l.file || '-',
          line: l.line || 0,
          severity: l.severity || 'error',
          count: 0,
          last_seen: l.last_seen || l.updated_date || l.created_date,
          sample_url: l.url || '',
          sample_log_id: l.id,
          log_ids: [l.id],
          stack: l.stack || ''
        });
      }
      const g = groupsMap.get(key);
      g.count += 1;
      const ts = l.last_seen || l.updated_date || l.created_date;
      if (ts && (!g.last_seen || ts > g.last_seen)) {
        g.last_seen = ts;
        g.stack = l.stack || g.stack;
      }
      if (!g.sample_url && l.url) g.sample_url = l.url;
      if (g.log_ids.length < 10) g.log_ids.push(l.id);
    }

    // Ordenar por prioridade (críticos primeiro, depois por contagem)
    const groups = Array.from(groupsMap.values())
      .sort((a, b) => {
        const aSeverityWeight = a.severity === 'critical' ? 1000 : a.severity === 'error' ? 500 : 100;
        const bSeverityWeight = b.severity === 'critical' ? 1000 : b.severity === 'error' ? 500 : 100;
        return (bSeverityWeight + b.count) - (aSeverityWeight + a.count);
      })
      .slice(0, limitTop);

    const total = logs.length;
    const critical = logs.filter((l) => l.severity === 'critical').length;
    const errors = logs.filter((l) => l.severity === 'error').length;
    const warnings = logs.filter((l) => l.severity === 'warning').length;
    const unique = groupsMap.size;

    // Gerar relatório formatado
    const lines = [];
    lines.push('📊 RELATÓRIO CIRÚRGICO DE ERROS');
    lines.push('═'.repeat(60));
    lines.push(`⏰ Período: Últimas ${windowHours}h (${formatDateBR(cutoffISO)} até ${formatDateBR(now.toISOString())})`);
    lines.push(`📈 Total de Ocorrências: ${total}`);
    lines.push(`🔴 Críticos: ${critical} | 🟠 Erros: ${errors} | 🟡 Avisos: ${warnings}`);
    lines.push(`🎯 Erros Únicos: ${unique}`);
    lines.push('');
    lines.push(`🎯 TOP ${limitTop} ERROS MAIS FREQUENTES:`);
    lines.push('');

    groups.forEach((g, idx) => {
      const relatedTasks = tasksByLogId.get(g.sample_log_id) || [];
      const priority = getPriorityLevel(g.count, g.severity, g.file);
      const emoji = getSeverityEmoji(g.severity);
      
      // Resumir stack para encontrar causa raiz
      let rootCause = 'Causa raiz não identificada';
      if (g.stack) {
        const stackLines = g.stack.split('\n').slice(0, 3);
        rootCause = stackLines.join(' → ');
      }
      
      // Determinar solução
      let solution = 'Investigar e corrigir manualmente';
      if (g.message.includes('Cannot read properties of undefined')) {
        solution = 'Adicionar validação de null/undefined antes do acesso';
      } else if (g.message.includes('Request failed with status code 500')) {
        solution = 'Verificar logs do backend e validar payload da requisição';
      } else if (g.message.includes('Request failed with status code 401')) {
        solution = 'Revisar autenticação/token - usuário não autenticado';
      } else if (g.message.includes('map')) {
        solution = 'Garantir que variável é array antes do .map() usando (arr || [])';
      }
      
      // Status das tarefas
      let taskStatus = 'Nenhuma tarefa criada';
      if (relatedTasks.length > 0) {
        const statuses = relatedTasks.map(t => t.status);
        if (statuses.includes('concluida')) taskStatus = '✅ Concluída';
        else if (statuses.includes('em_progresso')) taskStatus = '🔄 Em progresso';
        else taskStatus = '📋 Aberta';
      }

      lines.push(`${idx + 1}️⃣ ${emoji} ${g.message.slice(0, 100)}${g.message.length > 100 ? '...' : ''}`);
      lines.push(`   📍 Origem: ${g.file}${g.line ? `:${g.line}` : ''}`);
      lines.push(`   🔢 Ocorrências: ${g.count} vezes`);
      lines.push(`   📅 Último visto: ${formatDateBR(g.last_seen)}`);
      lines.push(`   🎯 Causa raiz: ${rootCause}`);
      lines.push(`   💊 Solução: ${solution}`);
      lines.push(`   ⚡ Prioridade: ${priority}`);
      lines.push(`   📋 Status tarefa: ${taskStatus}`);
      if (g.sample_url) {
        lines.push(`   🔗 URL exemplo: ${g.sample_url}`);
      }
      lines.push('');
    });

    // Recomendações estratégicas
    lines.push('💡 RECOMENDAÇÕES ESTRATÉGICAS:');
    lines.push('');
    
    const recommendations = [];
    if (critical > 0) {
      recommendations.push('🔴 URGENTE: Resolver erros críticos imediatamente - podem impactar usuários');
    }
    if (unique > 10) {
      recommendations.push('📊 Alto número de erros únicos - considerar refatoração geral do código');
    }
    if (groups.some(g => g.count > 50)) {
      recommendations.push('⚠️ Erros muito frequentes detectados - podem indicar problema sistêmico');
    }
    recommendations.push('🔍 Implementar monitoramento proativo de erros');
    recommendations.push('📝 Adicionar testes automatizados para prevenir regressões');
    recommendations.push('🛡️ Implementar validações defensivas no código');
    
    recommendations.forEach(rec => lines.push(`• ${rec}`));
    lines.push('');
    lines.push('═'.repeat(60));
    lines.push(`Relatório gerado em: ${formatDateBR(now.toISOString())}`);

    const report = lines.join('\n');

    return Response.json({
      report,
      metrics: { 
        total, 
        unique, 
        critical,
        errors,
        warnings,
        windowHours,
        generated_at: now.toISOString()
      },
      top: groups.map(g => ({
        message: g.message,
        file: g.file,
        line: g.line,
        count: g.count,
        severity: g.severity,
        priority: getPriorityLevel(g.count, g.severity, g.file),
        last_seen: g.last_seen,
        sample_url: g.sample_url
      }))
    });
  } catch (error) {
    try {
      await base44.asServiceRole.entities.ErrorLog.create({
        message: String(error?.message || error),
        stack: String(error?.stack || ""),
        source: "function:generateSurgicalReport",
        url: "function:generateSurgicalReport",
        severity: "error",
        status: "novo",
        last_seen: new Date().toISOString()
      });
    } catch (e2) { 
      const _noop = e2; 
    }
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});