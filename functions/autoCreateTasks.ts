import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * NÍVEL 4 - GESTÃO ESTRATÉGICA
 * Cria tarefas automaticamente baseado em métricas do sistema
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const report = payload.report;

    if (!report) {
      return Response.json({ error: 'report required' }, { status: 400 });
    }

    const tasksCreated = [];

    // 1. Se health score < 60, criar tarefa de auditoria
    if (report.health_score < 60) {
      const task = await base44.asServiceRole.entities.CodeFixTask.create({
        title: `🚨 Auditoria de Sistema - Health Score Crítico (${report.health_score}/100)`,
        description: `O sistema está com saúde abaixo do aceitável.

📊 **Métricas Atuais:**
- Health Score: ${report.health_score}/100
- Erros Críticos: ${report.metrics.criticals}
- Total de Erros: ${report.metrics.total_errors}
- Tendência: ${report.trend}

🎯 **Ações Necessárias:**
${report.recommendations.join('\n')}

⏰ **Prazo:** URGENTE - Resolver nas próximas 24h`,
        status: 'aberta',
        priority: 'urgente',
        category: 'erro_codigo'
      });

      tasksCreated.push({
        id: task.id,
        reason: 'Health score crítico',
        priority: 'urgente'
      });
    }

    // 2. Se há muitos erros críticos, criar tarefa específica
    if (report.metrics.criticals > 5) {
      const task = await base44.asServiceRole.entities.CodeFixTask.create({
        title: `🔴 Resolver ${report.metrics.criticals} Erros Críticos Detectados`,
        description: `Múltiplos erros críticos foram detectados no sistema.

📊 **Detalhes:**
- Erros Críticos: ${report.metrics.criticals}
- MTTR Atual: ${report.metrics.mttr_hours}h
- Componentes afetados: ${report.top_components.length}

🎯 **Prioridade:** Resolver erros críticos antes de novos desenvolvimentos.

💡 **Sugestão:** Verificar aba "Erros" no CodeFixReview para detalhes completos.`,
        status: 'aberta',
        priority: 'urgente',
        category: 'erro_codigo'
      });

      tasksCreated.push({
        id: task.id,
        reason: 'Múltiplos erros críticos',
        priority: 'urgente'
      });
    }

    // 3. Se há reincidências, criar tarefa de refatoração
    if (report.metrics.recurrences > 10) {
      const task = await base44.asServiceRole.entities.CodeFixTask.create({
        title: `🔄 Refatorar Código - ${report.metrics.recurrences} Padrões Reincidentes`,
        description: `Detectados ${report.metrics.recurrences} padrões de erros reincidentes.

📊 **Análise:**
Erros reincidentes indicam problemas estruturais no código que precisam de correção definitiva.

🎯 **Ações Recomendadas:**
1. Identificar causas raízes comuns
2. Implementar validações defensivas
3. Adicionar testes automatizados
4. Refatorar componentes problemáticos

💡 **Componentes mais afetados:**
${report.top_components.slice(0, 3).map(c => `- ${c.component}: ${c.error_count} erros`).join('\n')}`,
        status: 'aberta',
        priority: 'alta',
        category: 'melhoria_ux'
      });

      tasksCreated.push({
        id: task.id,
        reason: 'Erros reincidentes',
        priority: 'alta'
      });
    }

    // 4. Se MTTR é alto, criar tarefa de otimização
    if (report.metrics.mttr_hours > 24) {
      const task = await base44.asServiceRole.entities.CodeFixTask.create({
        title: `⏱️ Otimizar Processo de Resolução - MTTR em ${report.metrics.mttr_hours}h`,
        description: `O tempo médio de resolução está muito alto.

📊 **Métrica Atual:**
- MTTR: ${report.metrics.mttr_hours}h
- Meta: < 2h para erros críticos

🎯 **Ações Sugeridas:**
1. Implementar mais automação de correções
2. Melhorar documentação de erros comuns
3. Criar playbooks de resolução rápida
4. Aumentar cobertura de testes

💡 **Benefício Esperado:** Redução de 50% no tempo de resolução`,
        status: 'aberta',
        priority: 'media',
        category: 'performance'
      });

      tasksCreated.push({
        id: task.id,
        reason: 'MTTR alto',
        priority: 'media'
      });
    }

    // 5. Se componente específico tem muitos erros, criar tarefa de refatoração
    if (report.top_components.length > 0 && report.top_components[0].error_count > 15) {
      const topComp = report.top_components[0];
      const task = await base44.asServiceRole.entities.CodeFixTask.create({
        title: `🎯 Refatorar Componente: ${topComp.component}`,
        description: `O componente "${topComp.component}" está com alto número de erros.

📊 **Estatísticas:**
- Total de erros: ${topComp.error_count}
- Posição: Componente mais problemático do sistema

🎯 **Plano de Ação:**
1. Análise profunda do código do componente
2. Identificar pontos de falha recorrentes
3. Adicionar validações e tratamento de erros
4. Implementar testes unitários
5. Considerar reescrita se necessário

💡 **Impacto:** Potencial redução de ${Math.round(topComp.error_count / report.metrics.total_errors * 100)}% nos erros totais`,
        status: 'aberta',
        priority: 'alta',
        category: 'erro_codigo',
        component: topComp.component
      });

      tasksCreated.push({
        id: task.id,
        reason: `Componente ${topComp.component} problemático`,
        priority: 'alta'
      });
    }

    // Registrar ação
    if (tasksCreated.length > 0) {
      await base44.asServiceRole.entities.AcaoAgente.create({
        tipo_acao: 'tarefa_criada',
        status: 'concluido',
        prioridade: tasksCreated.some(t => t.priority === 'urgente') ? 'critica' : 'alta',
        descricao: `${tasksCreated.length} tarefa(s) criada(s) automaticamente baseado em métricas`,
        resultado: JSON.stringify(tasksCreated, null, 2),
        contexto: {
          health_score: report.health_score,
          tasks_created: tasksCreated.length,
          reasons: tasksCreated.map(t => t.reason)
        },
        iniciado_por: 'sistema',
        data_conclusao: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      tasks_created: tasksCreated.length,
      tasks: tasksCreated,
      message: tasksCreated.length > 0 
        ? `${tasksCreated.length} tarefa(s) criada(s) automaticamente`
        : 'Nenhuma tarefa necessária no momento'
    });

  } catch (error) {
    console.error('Error auto-creating tasks:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
});