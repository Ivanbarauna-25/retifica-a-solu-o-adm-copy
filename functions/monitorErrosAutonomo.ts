import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * FUNÇÃO DE MONITORAMENTO AUTÔNOMO COM 5 NÍVEIS DE INTELIGÊNCIA
 * 
 * Esta função é o coração do CodeFixer e executa todos os níveis:
 * Nível 1: Análise de Padrões
 * Nível 2: Diagnóstico com IA
 * Nível 3: Geração de Patches
 * Nível 4: Gestão e Prioridade
 * Nível 5: Aprendizado Contínuo
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('🤖 [MONITOR] Iniciando varredura autônoma completa...');
    
    const agora = new Date();
    const results = {
      timestamp: agora.toISOString(),
      levels_executed: [],
      actions_taken: [],
      errors_processed: 0,
      tasks_created: 0,
      patches_generated: 0
    };

    // ============================================================
    // NÍVEL 1: INTELIGÊNCIA ANALÍTICA
    // ============================================================
    console.log('📊 [NÍVEL 1] Executando análise de padrões...');
    
    try {
      const patternsResponse = await base44.asServiceRole.functions.invoke('analyzeErrorPatterns', {
        windowHours: 72
      });
      
      if (patternsResponse?.data?.success) {
        results.levels_executed.push('Nível 1: Análise de Padrões');
        results.actions_taken.push({
          level: 1,
          action: 'Padrões analisados',
          critical_patterns: patternsResponse.data.patterns?.critical?.length || 0,
          warning_patterns: patternsResponse.data.patterns?.warning?.length || 0
        });
      }
    } catch (e) {
      console.warn('⚠️ [NÍVEL 1] Erro em analyzeErrorPatterns:', e.message);
    }

    try {
      const trendsResponse = await base44.asServiceRole.functions.invoke('detectErrorTrends', {});
      
      if (trendsResponse?.data?.success) {
        results.actions_taken.push({
          level: 1,
          action: 'Tendências detectadas',
          health_score: trendsResponse.data.summary?.health_score || 0,
          escalating: trendsResponse.data.trends?.escalating?.length || 0
        });
      }
    } catch (e) {
      console.warn('⚠️ [NÍVEL 1] Erro em detectErrorTrends:', e.message);
    }

    // ============================================================
    // NÍVEL 2: INTELIGÊNCIA COGNITIVA
    // ============================================================
    console.log('🧠 [NÍVEL 2] Executando análise com IA...');
    
    const cincoMinutosAtras = new Date(agora.getTime() - 5 * 60 * 1000).toISOString();
    const todosErros = await base44.asServiceRole.entities.ErrorLog.list('-last_seen', 100);
    
    const errosParaInvestigar = (todosErros || []).filter(erro => {
      const isNovo = erro.status === 'novo';
      const isCritico = erro.severity === 'critical' || erro.severity === 'error';
      const isRecente = erro.last_seen && erro.last_seen >= cincoMinutosAtras;
      
      return (isNovo || (isCritico && isRecente));
    });
    
    console.log(`🔍 [NÍVEL 2] Encontrados ${errosParaInvestigar.length} erros para investigar`);
    results.errors_processed = errosParaInvestigar.length;

    for (const erro of errosParaInvestigar.slice(0, 3)) { // Limitar a 3 por vez
      try {
        // Análise com IA
        const aiResponse = await base44.asServiceRole.functions.invoke('analyzeErrorWithAI', {
          errorId: erro.id
        });
        
        if (aiResponse.data && aiResponse.data.success) {
          results.levels_executed.push('Nível 2: Análise com IA');
          results.actions_taken.push({
            level: 2,
            action: 'Erro analisado com IA',
            error_id: erro.id,
            confidence: aiResponse.data.analysis.confidence
          });

          // ============================================================
          // NÍVEL 3: AUTONOMIA CONTROLADA
          // ============================================================
          if (aiResponse.data.analysis.confidence >= 0.7) {
            console.log(`🔧 [NÍVEL 3] Gerando patch para erro ${erro.id}...`);
            
            const patchResponse = await base44.asServiceRole.functions.invoke('generateCodePatch', {
              errorId: erro.id,
              aiAnalysis: aiResponse.data.analysis
            });
            
            if (patchResponse.data && patchResponse.data.success) {
              results.levels_executed.push('Nível 3: Geração de Patch');
              results.patches_generated++;
              results.actions_taken.push({
                level: 3,
                action: 'Patch gerado',
                error_id: erro.id,
                patch_id: patchResponse.data.patch_id,
                safety_score: patchResponse.data.patch.safety_score
              });
            }
          }

          // Atualizar status do erro
          await base44.asServiceRole.entities.ErrorLog.update(erro.id, {
            status: 'em_analise'
          });

          // Enviar e-mail e registrar alerta WhatsApp para erros críticos
          if (erro.severity === 'critical') {
            const configs = await base44.asServiceRole.entities.Configuracoes.list();
            const emailAdmin = configs?.[0]?.email || 'admin@sistema.com';
            
            // Enviar email
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: emailAdmin,
              subject: `🚨 ALERTA CRÍTICO: ${erro.message.slice(0, 50)}...`,
              body: `
                <div style="font-family: Arial, sans-serif;">
                  <h2 style="color: #dc2626;">🚨 Erro Crítico Detectado</h2>
                  <p><strong>Mensagem:</strong> ${erro.message}</p>
                  <p><strong>Arquivo:</strong> ${erro.file}:${erro.line}</p>
                  <p><strong>Análise IA:</strong> ${aiResponse.data.analysis.root_cause}</p>
                  <p><strong>Solução Sugerida:</strong> ${aiResponse.data.analysis.suggested_fix?.description || 'Análise em andamento'}</p>
                  <p><a href="${new URL(req.url).origin}/CodeFixReview">Ver Detalhes no Sistema →</a></p>
                </div>
              `
            });

            // Registrar ação de notificação WhatsApp
            await base44.asServiceRole.entities.AcaoAgente.create({
              tipo_acao: 'notificacao_whatsapp',
              status: 'concluido',
              prioridade: 'critica',
              erro_relacionado_id: erro.id,
              descricao: `🚨 CRÍTICO: ${erro.message.slice(0, 100)}`,
              resultado: JSON.stringify({
                whatsapp_message: `🚨 *ERRO CRÍTICO DETECTADO*\n\n📍 *Arquivo:* ${erro.file || 'N/A'}\n📍 *Linha:* ${erro.line || 'N/A'}\n\n❌ *Mensagem:*\n${erro.message.slice(0, 200)}\n\n🔍 *Causa:* ${aiResponse.data.analysis.root_cause?.slice(0, 150) || 'Em análise'}\n\n⏰ ${new Date().toLocaleString('pt-BR')}`,
                email_sent: true,
                severity: 'critical'
              }),
              contexto: {
                channel: 'whatsapp',
                error_id: erro.id,
                requires_immediate_attention: true
              },
              iniciado_por: 'monitor_automatico',
              data_conclusao: new Date().toISOString()
            });

            console.log(`📱 [WHATSAPP] Alerta crítico registrado para erro ${erro.id}`);
          }
        }
      } catch (err) {
        console.error(`❌ Erro ao processar erro ${erro.id}:`, err);
      }
    }

    // ============================================================
    // NÍVEL 4: GESTÃO ESTRATÉGICA
    // ============================================================
    console.log('📊 [NÍVEL 4] Gerando relatório de saúde e criando tarefas...');
    
    try {
      const healthResponse = await base44.asServiceRole.functions.invoke('generateSystemHealthReport', {
        hours: 72
      });
      
      if (healthResponse?.data?.success) {
        results.levels_executed.push('Nível 4: Gestão e Prioridade');
        results.actions_taken.push({
          level: 4,
          action: 'Relatório de saúde gerado',
          health_score: healthResponse.data.health_score || 0
        });

        // Criar tarefas automaticamente baseado no relatório
        try {
          const tasksResponse = await base44.asServiceRole.functions.invoke('autoCreateTasks', {
            report: healthResponse.data
          });
          
          if (tasksResponse?.data?.success) {
            results.tasks_created = tasksResponse.data.tasks_created || 0;
            results.actions_taken.push({
              level: 4,
              action: 'Tarefas criadas automaticamente',
              count: tasksResponse.data.tasks_created || 0
            });
          }
        } catch (e) {
          console.warn('⚠️ [NÍVEL 4] Erro em autoCreateTasks:', e.message);
        }
      }
    } catch (e) {
      console.warn('⚠️ [NÍVEL 4] Erro em generateSystemHealthReport:', e.message);
    }

    // ============================================================
    // NÍVEL 5: APRENDIZADO CONTÍNUO
    // ============================================================
    console.log('🧠 [NÍVEL 5] Verificando tarefas de aprendizado...');
    
    // Executar aprendizado de erros resolvidos (diariamente às 02:00)
    const horaAtual = agora.getHours();
    if (horaAtual === 2) {
      try {
        const learnResponse = await base44.asServiceRole.functions.invoke('learnFromResolvedErrors', {});
        
        if (learnResponse?.data?.success) {
          results.levels_executed.push('Nível 5: Aprendizado de Erros');
          results.actions_taken.push({
            level: 5,
            action: 'Aprendizado de erros resolvidos',
            learned_count: learnResponse.data.learned_count || 0
          });
        }
      } catch (e) {
        console.warn('⚠️ [NÍVEL 5] Erro em learnFromResolvedErrors:', e.message);
      }
    }

    // Melhorar modelo do agente (semanalmente - segunda às 03:00)
    const diaSemana = agora.getDay();
    if (diaSemana === 1 && horaAtual === 3) {
      try {
        const improveResponse = await base44.asServiceRole.functions.invoke('selfImproveAgentModel', {});
        
        if (improveResponse?.data?.success) {
          results.levels_executed.push('Nível 5: Auto-Melhoria');
          results.actions_taken.push({
            level: 5,
            action: 'Modelo do agente melhorado',
            version: improveResponse.data.version || 1,
            patterns_learned: improveResponse.data.metrics?.total_patterns || 0
          });
        }
      } catch (e) {
        console.warn('⚠️ [NÍVEL 5] Erro em selfImproveAgentModel:', e.message);
      }
    }

    // Enviar relatório semanal (segunda às 09:00)
    if (diaSemana === 1 && horaAtual === 9) {
      try {
        await base44.asServiceRole.functions.invoke('sendWeeklyReport', {});
        results.actions_taken.push({
          level: 4,
          action: 'Relatório semanal enviado'
        });
      } catch (e) {
        console.warn('⚠️ [NÍVEL 5] Erro em sendWeeklyReport:', e.message);
      }
    }

    console.log(`✅ [MONITOR] Varredura concluída. ${results.errors_processed} erros processados.`);
    
    return Response.json({
      success: true,
      message: 'Monitoramento autônomo executado com sucesso',
      ...results,
      summary: `
🤖 MONITORAMENTO AUTÔNOMO COMPLETO

⏰ Timestamp: ${results.timestamp}

📊 NÍVEIS EXECUTADOS:
${results.levels_executed.map((level, i) => `${i + 1}. ${level}`).join('\n')}

🎯 RESUMO DE AÇÕES:
- Erros processados: ${results.errors_processed}
- Tarefas criadas: ${results.tasks_created}
- Patches gerados: ${results.patches_generated}
- Total de ações: ${results.actions_taken.length}

✅ Sistema operando em modo autônomo.
      `
    });
    
  } catch (error) {
    console.error('❌ [MONITOR] Erro fatal no monitoramento:', error);
    
    // Registrar erro do próprio monitor
    try {
      await base44.asServiceRole.entities.ErrorLog.create({
        message: `Erro no monitor autônomo: ${error.message}`,
        stack: String(error.stack || ''),
        source: 'function:monitorErrosAutonomo',
        severity: 'error',
        status: 'novo',
        last_seen: new Date().toISOString()
      });
    } catch (e) {
      console.error('Não foi possível registrar erro do monitor:', e);
    }
    
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});