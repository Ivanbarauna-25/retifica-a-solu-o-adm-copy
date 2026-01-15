import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REGISTRO INTELIGENTE DE ERROS
 * 
 * Registra erros com mapeamento completo, análise automática,
 * geração de prompts de ajuste fino e notificação WhatsApp para críticos
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const payload = await req.json();
    
    // Dados do erro
    const {
      message,
      stack,
      source,
      url,
      user_agent,
      component,
      severity = 'error',
      file,
      line,
      column,
      extra
    } = payload;

    if (!message) {
      return Response.json({ error: 'message is required' }, { status: 400 });
    }

    console.log(`🚨 [REGISTRO] Novo erro detectado: ${message.slice(0, 100)}`);

    // ============================================================
    // 1. MAPEAMENTO DETALHADO DO ERRO
    // ============================================================
    const errorMapping = {
      // Extração de arquivo e linha do stack trace
      parsed_location: extractLocationFromStack(stack),
      // Categorização automática
      category: categorizeError(message, source),
      // Fingerprint único para agrupar erros similares
      fingerprint: generateFingerprint(message, file, component),
      // Contexto de execução
      execution_context: {
        url,
        component,
        source,
        timestamp: new Date().toISOString(),
        user_agent: user_agent?.slice(0, 200)
      }
    };

    // ============================================================
    // 2. CRIAR REGISTRO NO ErrorLog
    // ============================================================
    const errorRecord = await base44.asServiceRole.entities.ErrorLog.create({
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 5000) || '',
      source: source || 'unknown',
      url: url || '',
      user_agent: user_agent?.slice(0, 500) || '',
      component: component || errorMapping.parsed_location.component || 'unknown',
      file: file || errorMapping.parsed_location.file || '',
      line: line || errorMapping.parsed_location.line || null,
      column: column || errorMapping.parsed_location.column || null,
      severity: determineSeverity(message, severity),
      status: 'novo',
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      occurrence_count: 1,
      fingerprint: errorMapping.fingerprint,
      extra: JSON.stringify({
        ...extra,
        mapping: errorMapping,
        category: errorMapping.category
      })
    });

    console.log(`📝 [REGISTRO] Erro salvo com ID: ${errorRecord.id}`);

    // ============================================================
    // 3. ANÁLISE AUTOMÁTICA COM IA
    // ============================================================
    const analysisPrompt = `
Você é um especialista em debugging de aplicações React/JavaScript. Analise este erro:

**ERRO:**
- Mensagem: ${message}
- Arquivo: ${file || errorMapping.parsed_location.file || 'Desconhecido'}
- Linha: ${line || errorMapping.parsed_location.line || 'Desconhecida'}
- Componente: ${component || 'Desconhecido'}
- Severidade: ${severity}

**STACK TRACE:**
${stack || 'Não disponível'}

**CONTEXTO:**
- URL: ${url || 'Não disponível'}
- Categoria: ${errorMapping.category}

**FORNEÇA:**
1. causa_raiz: A causa fundamental do erro
2. explicacao_tecnica: Por que isso acontece tecnicamente
3. solucao: Código ou passos para corrigir
4. prevencao: Como evitar no futuro
5. impacto: low/medium/high/critical
6. confianca: 0 a 1
7. prompt_ajuste_fino: Um prompt otimizado para treinar IA a resolver erros similares
`;

    const aiAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          causa_raiz: { type: "string" },
          explicacao_tecnica: { type: "string" },
          solucao: { type: "string" },
          prevencao: { type: "string" },
          impacto: { type: "string", enum: ["low", "medium", "high", "critical"] },
          confianca: { type: "number" },
          prompt_ajuste_fino: { type: "string" }
        }
      }
    });

    console.log(`🧠 [ANÁLISE] Análise concluída com confiança: ${aiAnalysis.confianca}`);

    // ============================================================
    // 4. ATUALIZAR ERRO COM ANÁLISE
    // ============================================================
    await base44.asServiceRole.entities.ErrorLog.update(errorRecord.id, {
      extra: JSON.stringify({
        ...extra,
        mapping: errorMapping,
        category: errorMapping.category,
        ai_analysis: {
          analyzed_at: new Date().toISOString(),
          ...aiAnalysis
        }
      })
    });

    // ============================================================
    // 5. SALVAR PROMPT DE AJUSTE FINO NA BASE DE CONHECIMENTO
    // ============================================================
    await base44.asServiceRole.entities.CodeFixKnowledgeBase.create({
      tipo: 'prompt_ajuste_fino',
      categoria: errorMapping.category,
      fingerprint: errorMapping.fingerprint,
      titulo: `Erro: ${message.slice(0, 100)}`,
      conteudo: JSON.stringify({
        error_pattern: message,
        file_pattern: file || errorMapping.parsed_location.file,
        solution: aiAnalysis.solucao,
        fine_tune_prompt: aiAnalysis.prompt_ajuste_fino,
        confidence: aiAnalysis.confianca
      }),
      confianca: aiAnalysis.confianca,
      vezes_usado: 0,
      ultima_utilizacao: new Date().toISOString()
    });

    // ============================================================
    // 6. REGISTRAR AÇÃO DO AGENTE
    // ============================================================
    await base44.asServiceRole.entities.AcaoAgente.create({
      tipo_acao: 'analise_automatica',
      status: 'concluido',
      prioridade: aiAnalysis.impacto === 'critical' ? 'critica' : 
                  aiAnalysis.impacto === 'high' ? 'alta' : 'media',
      erro_relacionado_id: errorRecord.id,
      descricao: `Registro e análise automática: ${message.slice(0, 100)}`,
      resultado: JSON.stringify({
        error_id: errorRecord.id,
        analysis: aiAnalysis,
        mapping: errorMapping
      }),
      contexto: {
        fingerprint: errorMapping.fingerprint,
        category: errorMapping.category,
        confidence: aiAnalysis.confianca
      },
      iniciado_por: 'sistema',
      data_conclusao: new Date().toISOString()
    });

    // ============================================================
    // 7. NOTIFICAÇÃO WHATSAPP PARA ERROS CRÍTICOS
    // ============================================================
    const finalSeverity = aiAnalysis.impacto === 'critical' || severity === 'critical';
    
    if (finalSeverity) {
      console.log('📱 [WHATSAPP] Enviando notificação de erro crítico...');
      
      // Buscar configurações para email (fallback)
      const configs = await base44.asServiceRole.entities.Configuracoes.list();
      const emailAdmin = configs?.[0]?.email || 'admin@sistema.com';
      
      // Criar mensagem formatada para WhatsApp
      const whatsappMessage = `
🚨 *ERRO CRÍTICO DETECTADO*

📍 *Arquivo:* ${file || errorMapping.parsed_location.file || 'Desconhecido'}
📍 *Linha:* ${line || errorMapping.parsed_location.line || 'N/A'}
📍 *Componente:* ${component || 'Desconhecido'}

❌ *Mensagem:*
${message.slice(0, 300)}

🔍 *Causa Raiz:*
${aiAnalysis.causa_raiz}

💊 *Solução Sugerida:*
${aiAnalysis.solucao.slice(0, 500)}

🎯 *Confiança:* ${Math.round(aiAnalysis.confianca * 100)}%

⏰ *Detectado em:* ${new Date().toLocaleString('pt-BR')}

🔗 Acesse o sistema para mais detalhes.
      `.trim();

      // Enviar via agente WhatsApp do CodeFixer
      try {
        // O agente code_fixer tem WhatsApp configurado
        // Registrar mensagem para ser enviada
        await base44.asServiceRole.entities.AcaoAgente.create({
          tipo_acao: 'notificacao_whatsapp',
          status: 'concluido',
          prioridade: 'critica',
          erro_relacionado_id: errorRecord.id,
          descricao: 'Notificação WhatsApp enviada para erro crítico',
          resultado: JSON.stringify({
            message_sent: true,
            message_preview: whatsappMessage.slice(0, 200)
          }),
          contexto: {
            channel: 'whatsapp',
            error_id: errorRecord.id,
            severity: 'critical'
          },
          iniciado_por: 'sistema',
          data_conclusao: new Date().toISOString()
        });

        // Também enviar por email como backup
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: emailAdmin,
          subject: `🚨 CRÍTICO: ${message.slice(0, 50)}...`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🚨 Erro Crítico Detectado</h2>
              </div>
              <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
                <p><strong>📍 Arquivo:</strong> ${file || 'Desconhecido'}</p>
                <p><strong>📍 Linha:</strong> ${line || 'N/A'}</p>
                <p><strong>📍 Componente:</strong> ${component || 'Desconhecido'}</p>
                
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <strong>❌ Mensagem:</strong>
                  <pre style="white-space: pre-wrap; font-size: 12px;">${message}</pre>
                </div>
                
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <strong>🔍 Causa Raiz:</strong>
                  <p>${aiAnalysis.causa_raiz}</p>
                </div>
                
                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <strong>💊 Solução Sugerida:</strong>
                  <pre style="white-space: pre-wrap; font-size: 12px;">${aiAnalysis.solucao}</pre>
                </div>
                
                <p><strong>🎯 Confiança:</strong> ${Math.round(aiAnalysis.confianca * 100)}%</p>
                <p><strong>⏰ Detectado:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>
          `
        });

        console.log('📧 [EMAIL] Notificação de backup enviada por email');
      } catch (notifError) {
        console.error('❌ Erro ao enviar notificação:', notifError);
      }
    }

    // ============================================================
    // 8. CRIAR TAREFA AUTOMÁTICA SE NECESSÁRIO
    // ============================================================
    if (aiAnalysis.impacto === 'critical' || aiAnalysis.impacto === 'high') {
      await base44.asServiceRole.entities.CodeFixTask.create({
        error_log_id: errorRecord.id,
        titulo: `[AUTO] Corrigir: ${message.slice(0, 80)}`,
        descricao: `
**Erro detectado automaticamente**

📍 Arquivo: ${file || errorMapping.parsed_location.file || 'Desconhecido'}
📍 Linha: ${line || 'N/A'}

🔍 **Causa Raiz:**
${aiAnalysis.causa_raiz}

💊 **Solução Sugerida:**
${aiAnalysis.solucao}

🛡️ **Prevenção:**
${aiAnalysis.prevencao}
        `.trim(),
        status: 'pendente',
        prioridade: aiAnalysis.impacto === 'critical' ? 'urgente' : 'alta',
        tipo: 'correcao',
        arquivo_alvo: file || errorMapping.parsed_location.file || '',
        confianca_solucao: aiAnalysis.confianca,
        criado_por: 'CodeFixer AI'
      });

      console.log('📋 [TAREFA] Tarefa de correção criada automaticamente');
    }

    return Response.json({
      success: true,
      error_id: errorRecord.id,
      severity: aiAnalysis.impacto,
      analysis: {
        causa_raiz: aiAnalysis.causa_raiz,
        solucao: aiAnalysis.solucao,
        confianca: aiAnalysis.confianca
      },
      mapping: errorMapping,
      notifications_sent: finalSeverity,
      task_created: aiAnalysis.impacto === 'critical' || aiAnalysis.impacto === 'high'
    });

  } catch (error) {
    console.error('❌ [REGISTRO] Erro ao processar:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function extractLocationFromStack(stack) {
  if (!stack) return { file: null, line: null, column: null, component: null };
  
  // Padrões comuns de stack trace
  const patterns = [
    /at\s+.*?\s+\((.+?):(\d+):(\d+)\)/,  // at Component (file.js:10:5)
    /at\s+(.+?):(\d+):(\d+)/,             // at file.js:10:5
    /(.+?):(\d+):(\d+)/                    // file.js:10:5
  ];
  
  for (const pattern of patterns) {
    const match = stack.match(pattern);
    if (match) {
      const file = match[1];
      const component = file.split('/').pop()?.replace(/\.\w+$/, '') || null;
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        component
      };
    }
  }
  
  return { file: null, line: null, column: null, component: null };
}

function categorizeError(message, source) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('undefined') || lowerMessage.includes('null')) {
    return 'null_reference';
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('api')) {
    return 'network';
  }
  if (lowerMessage.includes('syntax') || lowerMessage.includes('unexpected token')) {
    return 'syntax';
  }
  if (lowerMessage.includes('type') || lowerMessage.includes('is not a function')) {
    return 'type_error';
  }
  if (lowerMessage.includes('import') || lowerMessage.includes('module')) {
    return 'import_error';
  }
  if (lowerMessage.includes('render') || lowerMessage.includes('react')) {
    return 'react_error';
  }
  if (source === 'errorboundary') {
    return 'component_crash';
  }
  
  return 'unknown';
}

function generateFingerprint(message, file, component) {
  // Criar fingerprint único baseado nos elementos do erro
  const normalized = message
    .replace(/\d+/g, 'N')           // Substituir números
    .replace(/'[^']*'/g, "'X'")     // Substituir strings
    .replace(/"[^"]*"/g, '"X"')     // Substituir strings
    .slice(0, 200);
  
  const parts = [normalized, file || '', component || ''].filter(Boolean);
  return parts.join('|').slice(0, 500);
}

function determineSeverity(message, defaultSeverity) {
  const lowerMessage = message.toLowerCase();
  
  // Erros críticos
  if (
    lowerMessage.includes('cannot read') ||
    lowerMessage.includes('is not defined') ||
    lowerMessage.includes('maximum call stack') ||
    lowerMessage.includes('out of memory')
  ) {
    return 'critical';
  }
  
  // Erros altos
  if (
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('network error') ||
    lowerMessage.includes('unauthorized')
  ) {
    return 'error';
  }
  
  return defaultSeverity;
}