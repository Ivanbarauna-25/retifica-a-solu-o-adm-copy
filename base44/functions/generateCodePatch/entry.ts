import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * NÍVEL 3 - AUTONOMIA CONTROLADA
 * Gera patches de código inteligentes baseados em análise de IA
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { errorId, taskId, aiAnalysis } = payload;

    if (!errorId && !taskId) {
      return Response.json({ error: 'errorId or taskId required' }, { status: 400 });
    }

    // Buscar dados
    let error = null;
    let task = null;
    let analysis = aiAnalysis;

    if (errorId) {
      const errors = await base44.asServiceRole.entities.ErrorLog.filter({ id: errorId });
      error = errors?.[0];
      
      if (!error) {
        return Response.json({ error: 'Error not found' }, { status: 404 });
      }
      
      // Se não tem análise, buscar do extra
      if (!analysis && error.extra) {
        try {
          const extra = JSON.parse(error.extra);
          analysis = extra.ai_analysis;
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    if (taskId) {
      const tasks = await base44.asServiceRole.entities.CodeFixTask.filter({ id: taskId });
      task = tasks?.[0];
    }

    // Se não tem análise de IA, fazer uma nova
    if (!analysis && error) {
      const aiResponse = await base44.asServiceRole.functions.invoke('analyzeErrorWithAI', {
        errorId: error.id
      });
      
      if (aiResponse.data && aiResponse.data.analysis) {
        analysis = aiResponse.data.analysis;
      }
    }

    if (!analysis) {
      return Response.json({ 
        error: 'No AI analysis available for this error' 
      }, { status: 400 });
    }

    // Gerar patch detalhado usando IA
    const patchPrompt = `
Você é um especialista em geração de patches de código. Com base na análise a seguir, gere um patch de código detalhado e pronto para aplicar:

**ANÁLISE DO ERRO:**
${JSON.stringify(analysis, null, 2)}

**ARQUIVO:**
${error?.file || task?.component || 'Não especificado'}

**LINHA:**
${error?.line || 'Não especificada'}

**STACK TRACE (se disponível):**
${error?.stack || 'N/A'}

Gere um patch seguindo este formato JSON exato:
{
  "patch_type": "edit|create|delete",
  "target_file": "string - caminho do arquivo",
  "line_number": number,
  "original_code": "string - código original (se edit)",
  "fixed_code": "string - código corrigido",
  "diff": "string - diff unificado",
  "explanation": "string - explicação da mudança",
  "safety_score": number (0-1),
  "breaking_changes": boolean,
  "test_suggestions": ["string"],
  "rollback_instructions": "string"
}

IMPORTANTE:
- O código deve ser válido JavaScript/React
- Inclua comentários explicativos
- Garanta que não quebrará código existente
- Se a mudança for arriscada, indique breaking_changes: true e safety_score baixo
`;

    const patchResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: patchPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          patch_type: { type: "string", enum: ["edit", "create", "delete"] },
          target_file: { type: "string" },
          line_number: { type: "number" },
          original_code: { type: "string" },
          fixed_code: { type: "string" },
          diff: { type: "string" },
          explanation: { type: "string" },
          safety_score: { type: "number" },
          breaking_changes: { type: "boolean" },
          test_suggestions: { type: "array", items: { type: "string" } },
          rollback_instructions: { type: "string" }
        }
      }
    });

    const patch = patchResponse;

    // Validar patch
    const validation = validatePatch(patch, error || task);

    // Criar CodePatchSuggestion
    const patchSuggestion = await base44.asServiceRole.entities.CodePatchSuggestion.create({
      file_path: patch.target_file,
      change_type: patch.patch_type,
      patch: `${patch.explanation}\n\n${patch.diff}\n\n${patch.fixed_code}`,
      notes: `Patch gerado por IA com safety_score: ${patch.safety_score}\n\n${patch.rollback_instructions}`,
      status: patch.safety_score >= 0.8 && !patch.breaking_changes ? 'aprovado' : 'sugerido',
      task_id: taskId || null
    });

    // Registrar ação
    await base44.asServiceRole.entities.AcaoAgente.create({
      tipo_acao: 'correcao_sugerida',
      status: 'concluido',
      prioridade: patch.safety_score < 0.6 ? 'media' : 'alta',
      erro_relacionado_id: errorId || null,
      tarefa_relacionada_id: taskId || null,
      descricao: `Patch gerado para: ${patch.target_file}`,
      resultado: JSON.stringify(patch, null, 2),
      contexto: {
        safety_score: patch.safety_score,
        breaking_changes: patch.breaking_changes,
        validation: validation
      },
      iniciado_por: 'sistema',
      data_conclusao: new Date().toISOString()
    });

    return Response.json({
      success: true,
      patch_id: patchSuggestion.id,
      patch: patch,
      validation: validation,
      auto_apply_eligible: patch.safety_score >= 0.9 && !patch.breaking_changes && validation.is_safe,
      recommendations: generatePatchRecommendations(patch, validation)
    });

  } catch (error) {
    console.error('Error generating patch:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
});

function validatePatch(patch, errorOrTask) {
  const validation = {
    is_safe: true,
    warnings: [],
    blockers: []
  };

  // Validar safety score
  if (patch.safety_score < 0.5) {
    validation.is_safe = false;
    validation.blockers.push('Safety score muito baixo - revisão manual obrigatória');
  } else if (patch.safety_score < 0.7) {
    validation.warnings.push('Safety score médio - recomendar revisão');
  }

  // Validar breaking changes
  if (patch.breaking_changes) {
    validation.is_safe = false;
    validation.blockers.push('Patch contém mudanças que podem quebrar código existente');
  }

  // Validar arquivo alvo
  if (!patch.target_file || patch.target_file === 'Não especificado') {
    validation.is_safe = false;
    validation.blockers.push('Arquivo alvo não especificado');
  }

  // Validar código
  if (!patch.fixed_code || patch.fixed_code.length < 10) {
    validation.warnings.push('Código da correção muito curto - pode estar incompleto');
  }

  // Validações específicas de React/JavaScript
  const hasReactHooks = /use[A-Z]/.test(patch.fixed_code);
  const hasJSX = /<[A-Z]/.test(patch.fixed_code);
  
  if (hasReactHooks) {
    validation.warnings.push('Patch modifica React Hooks - testar cuidadosamente');
  }
  
  if (hasJSX) {
    validation.warnings.push('Patch modifica JSX - verificar renderização');
  }

  return validation;
}

function generatePatchRecommendations(patch, validation) {
  const recommendations = [];

  if (validation.is_safe && patch.safety_score >= 0.9) {
    recommendations.push({
      action: 'auto_apply',
      priority: 'high',
      description: 'Patch seguro - pode ser aplicado automaticamente',
      automated: true
    });
  } else if (validation.warnings.length > 0) {
    recommendations.push({
      action: 'review_then_apply',
      priority: 'medium',
      description: 'Revisar avisos antes de aplicar',
      warnings: validation.warnings
    });
  } else if (validation.blockers.length > 0) {
    recommendations.push({
      action: 'manual_review',
      priority: 'low',
      description: 'Revisão manual obrigatória',
      blockers: validation.blockers
    });
  }

  if (patch.test_suggestions && patch.test_suggestions.length > 0) {
    recommendations.push({
      action: 'implement_tests',
      priority: 'medium',
      description: 'Implementar testes sugeridos',
      tests: patch.test_suggestions
    });
  }

  return recommendations;
}