import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * NÍVEL 2 - INTELIGÊNCIA COGNITIVA
 * Usa IA para análise semântica profunda de erros
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const payload = await req.json();
    
    // Suporte para automação de entidade (event.entity_id) ou chamada manual (errorId)
    let errorId;
    if (payload.event && payload.event.entity_id) {
      // Chamada via automação de entidade
      errorId = payload.event.entity_id;
    } else if (payload.errorId) {
      // Chamada manual
      errorId = payload.errorId;
    }

    if (!errorId) {
      return Response.json({ error: 'errorId required (or entity automation event)' }, { status: 400 });
    }

    // Buscar erro
    const errors = await base44.asServiceRole.entities.ErrorLog.filter({ id: errorId });
    const error = errors && errors[0];

    if (!error) {
      return Response.json({ error: 'Error not found' }, { status: 404 });
    }

    // Buscar contexto adicional
    const similarErrors = await base44.asServiceRole.entities.ErrorLog.filter({
      message: error.message
    });

    const existingTasks = await base44.asServiceRole.entities.CodeFixTask.filter({
      error_log_id: errorId
    });

    // Preparar prompt para IA
    const analysisPrompt = `
Você é um especialista em debugging e análise de código. Analise o seguinte erro de forma profunda e técnica:

**ERRO:**
Mensagem: ${error.message}
Arquivo: ${error.file || 'Não especificado'}
Linha: ${error.line || 'Não especificada'}
Severidade: ${error.severity}
Componente: ${error.component || error.source}

**STACK TRACE:**
${error.stack || 'Não disponível'}

**CONTEXTO:**
- URL onde ocorreu: ${error.url || 'Não especificado'}
- Navegador: ${error.user_agent || 'Não especificado'}
- Ocorrências similares: ${similarErrors.length}
- Tarefas já criadas: ${existingTasks.length}

**SUA ANÁLISE DEVE INCLUIR:**
1. **Root Cause (Causa Raiz)**: Identifique a causa fundamental do erro
2. **Technical Explanation**: Explique tecnicamente por que isso acontece
3. **Impact Assessment**: Avalie o impacto no sistema (usuários afetados, funcionalidades quebradas)
4. **Suggested Fix**: Proponha uma solução técnica específica com código
5. **Prevention Strategy**: Como prevenir este erro no futuro
6. **Confidence Score**: De 0 a 1, quão confiante você está na análise

Responda em formato JSON seguindo este schema exato:
{
  "root_cause": "string",
  "technical_explanation": "string",
  "impact_assessment": {
    "severity": "low|medium|high|critical",
    "affected_users": "none|few|many|all",
    "affected_features": ["string"]
  },
  "suggested_fix": {
    "description": "string",
    "code_example": "string",
    "files_to_modify": ["string"]
  },
  "prevention_strategy": "string",
  "confidence": 0.0
}
`;

    // Invocar IA
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          root_cause: { type: "string" },
          technical_explanation: { type: "string" },
          impact_assessment: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
              affected_users: { type: "string", enum: ["none", "few", "many", "all"] },
              affected_features: { type: "array", items: { type: "string" } }
            }
          },
          suggested_fix: {
            type: "object",
            properties: {
              description: { type: "string" },
              code_example: { type: "string" },
              files_to_modify: { type: "array", items: { type: "string" } }
            }
          },
          prevention_strategy: { type: "string" },
          confidence: { type: "number" }
        }
      }
    });

    const analysis = aiResponse;

    // Registrar análise como ação do agente
    await base44.asServiceRole.entities.AcaoAgente.create({
      tipo_acao: 'analise_automatica',
      status: 'concluido',
      prioridade: analysis.impact_assessment?.severity === 'critical' ? 'critica' : 
                  analysis.impact_assessment?.severity === 'high' ? 'alta' : 'media',
      erro_relacionado_id: errorId,
      descricao: `Análise de IA para erro: ${error.message?.slice(0, 100)}`,
      resultado: JSON.stringify(analysis, null, 2),
      contexto: {
        confidence: analysis.confidence,
        root_cause: analysis.root_cause,
        impact: analysis.impact_assessment
      },
      iniciado_por: 'sistema',
      data_conclusao: new Date().toISOString()
    });

    // Atualizar ErrorLog com análise
    await base44.asServiceRole.entities.ErrorLog.update(errorId, {
      extra: JSON.stringify({
        ai_analysis: {
          analyzed_at: new Date().toISOString(),
          root_cause: analysis.root_cause,
          confidence: analysis.confidence,
          impact: analysis.impact_assessment
        }
      })
    });

    return Response.json({
      success: true,
      error_id: errorId,
      analysis: analysis,
      recommendations: generateActionableRecommendations(analysis, error),
      next_steps: generateNextSteps(analysis, existingTasks.length > 0)
    });

  } catch (error) {
    console.error('Error analyzing with AI:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
});

function generateActionableRecommendations(analysis, error) {
  const recommendations = [];
  
  if (analysis.confidence >= 0.8) {
    recommendations.push({
      action: 'apply_fix',
      priority: 'high',
      description: 'Aplicar correção sugerida - alta confiança',
      automated: true
    });
  } else if (analysis.confidence >= 0.6) {
    recommendations.push({
      action: 'review_and_apply',
      priority: 'medium',
      description: 'Revisar e aplicar correção manualmente',
      automated: false
    });
  } else {
    recommendations.push({
      action: 'manual_investigation',
      priority: 'medium',
      description: 'Investigação manual necessária - confiança baixa',
      automated: false
    });
  }
  
  if (analysis.impact_assessment?.severity === 'critical' || analysis.impact_assessment?.severity === 'high') {
    recommendations.push({
      action: 'alert_team',
      priority: 'urgent',
      description: 'Notificar equipe imediatamente',
      automated: true
    });
  }
  
  if (analysis.prevention_strategy) {
    recommendations.push({
      action: 'implement_prevention',
      priority: 'medium',
      description: 'Implementar estratégia de prevenção',
      details: analysis.prevention_strategy
    });
  }
  
  return recommendations;
}

function generateNextSteps(analysis, hasExistingTasks) {
  const steps = [];
  
  if (!hasExistingTasks) {
    steps.push({
      step: 1,
      action: 'Criar CodeFixTask automática',
      status: 'pending'
    });
  }
  
  if (analysis.suggested_fix?.code_example) {
    steps.push({
      step: 2,
      action: 'Gerar CodePatchSuggestion',
      status: 'pending'
    });
  }
  
  if (analysis.confidence >= 0.8 && analysis.impact_assessment?.severity !== 'critical') {
    steps.push({
      step: 3,
      action: 'Validar correção em sandbox',
      status: 'pending'
    });
    
    steps.push({
      step: 4,
      action: 'Aplicar correção automaticamente',
      status: 'pending',
      requires_approval: false
    });
  } else {
    steps.push({
      step: 3,
      action: 'Aguardar aprovação manual',
      status: 'pending',
      requires_approval: true
    });
  }
  
  return steps;
}