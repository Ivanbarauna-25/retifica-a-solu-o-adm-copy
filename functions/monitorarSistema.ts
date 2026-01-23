import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MONITORAMENTO AUTÔNOMO DO SISTEMA
 * Roda periodicamente para detectar problemas
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('🔍 Iniciando monitoramento do sistema...');
    
    const issues = [];
    const warnings = [];
    
    // 1. Verificar erros novos (últimas 24h)
    try {
      const errors = await base44.asServiceRole.entities.ErrorLog.filter({
        status: 'novo'
      }, '-created_date', 50);
      
      const errosCriticos = errors.filter(e => e.severity === 'critical');
      const errosRecentes = errors.filter(e => {
        const horasAtras = (Date.now() - new Date(e.created_date).getTime()) / (1000 * 60 * 60);
        return horasAtras < 24;
      });
      
      if (errosCriticos.length > 0) {
        issues.push({
          tipo: 'CRÍTICO',
          mensagem: `${errosCriticos.length} erro(s) crítico(s) não resolvido(s)`,
          detalhes: errosCriticos.map(e => e.error_message).join(', '),
          severidade: 'critical'
        });
      }
      
      if (errosRecentes.length > 10) {
        warnings.push({
          tipo: 'AVISO',
          mensagem: `${errosRecentes.length} novos erros nas últimas 24h`,
          severidade: 'warning'
        });
      }
    } catch (e) {
      console.error('Erro ao verificar ErrorLog:', e);
    }
    
    // 2. Verificar registros de ponto não vinculados
    try {
      const registros = await base44.asServiceRole.entities.PontoRegistro.filter({
        valido: false
      }, '-created_date', 100);
      
      const recentes = registros.filter(r => {
        const diasAtras = (Date.now() - new Date(r.created_date).getTime()) / (1000 * 60 * 60 * 24);
        return diasAtras < 7;
      });
      
      if (recentes.length > 50) {
        warnings.push({
          tipo: 'DADOS',
          mensagem: `${recentes.length} registros de ponto inválidos (última semana)`,
          detalhes: 'Possível problema no mapeamento EnNo → Funcionário',
          severidade: 'warning'
        });
      }
    } catch (e) {
      console.error('Erro ao verificar PontoRegistro:', e);
    }
    
    // 3. Verificar tarefas CodeFix pendentes há muito tempo
    try {
      const tarefas = await base44.asServiceRole.entities.CodeFixTask.filter({
        status: 'pendente'
      }, '-created_date', 50);
      
      const antigasNaoResolvidas = tarefas.filter(t => {
        const diasAtras = (Date.now() - new Date(t.created_date).getTime()) / (1000 * 60 * 60 * 24);
        return diasAtras > 3;
      });
      
      if (antigasNaoResolvidas.length > 5) {
        warnings.push({
          tipo: 'AGENTE',
          mensagem: `${antigasNaoResolvidas.length} tarefas pendentes há mais de 3 dias`,
          severidade: 'info'
        });
      }
    } catch (e) {
      console.error('Erro ao verificar CodeFixTask:', e);
    }
    
    // 4. Auto-criar tarefas para erros críticos não atendidos
    if (issues.length > 0) {
      for (const issue of issues) {
        if (issue.severidade === 'critical') {
          try {
            // Buscar o erro específico
            const erros = await base44.asServiceRole.entities.ErrorLog.filter({
              status: 'novo',
              severity: 'critical'
            }, '-created_date', 5);
            
            for (const erro of erros) {
              // Verificar se já existe tarefa para este erro
              const tarefasExistentes = await base44.asServiceRole.entities.CodeFixTask.filter({
                error_log_id: erro.id
              });
              
              if (tarefasExistentes.length === 0) {
                // Criar tarefa automaticamente
                await base44.asServiceRole.entities.CodeFixTask.create({
                  error_log_id: erro.id,
                  titulo: `[AUTO] Erro crítico: ${erro.error_message?.substring(0, 80)}`,
                  descricao: `
🚨 **ERRO CRÍTICO DETECTADO AUTOMATICAMENTE**

📍 Componente: ${erro.component_name || 'Desconhecido'}
📍 URL: ${erro.url || 'N/A'}

❌ **Erro:**
${erro.error_message}

📚 **Stack:**
${erro.error_stack?.substring(0, 500) || 'N/A'}

⏰ **Detectado em:** ${new Date(erro.created_date).toLocaleString('pt-BR')}

🎯 **Ação Requerida:**
Este erro foi detectado pelo sistema de monitoramento autônomo e requer atenção imediata.
                  `.trim(),
                  status: 'pendente',
                  prioridade: 'urgente',
                  tipo: 'correcao',
                  delegado_agente: true,
                  criado_por: 'Sistema de Monitoramento'
                });
                
                // Marcar erro como em análise
                await base44.asServiceRole.entities.ErrorLog.update(erro.id, {
                  status: 'em_analise'
                });
                
                console.log(`✅ Tarefa auto-criada para erro ${erro.id}`);
              }
            }
          } catch (taskError) {
            console.error('Erro ao criar tarefa:', taskError);
          }
        }
      }
    }
    
    // Salvar relatório
    const healthScore = issues.length === 0 && warnings.length === 0 ? 100 :
                       issues.length === 0 ? 85 : 60;
    
    const relatorio = {
      timestamp: new Date().toISOString(),
      health_score: healthScore,
      issues: issues,
      warnings: warnings,
      status: issues.length === 0 ? (warnings.length === 0 ? 'Operacional' : 'Parcial') : 'Crítico'
    };
    
    console.log('📊 Relatório:', relatorio);
    
    return Response.json({
      success: true,
      relatorio,
      message: `Monitoramento concluído. ${issues.length} problema(s) crítico(s), ${warnings.length} aviso(s)`
    });
    
  } catch (error) {
    console.error('❌ Erro no monitoramento:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});