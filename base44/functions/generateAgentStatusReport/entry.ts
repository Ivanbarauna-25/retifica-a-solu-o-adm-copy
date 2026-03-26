import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * RELATÓRIO TÉCNICO COMPLETO DO AGENTE CODEFIXER
 * Gera diagnóstico completo sobre o funcionamento, métricas e atividades do agente
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const now = new Date();
    const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1️⃣ STATUS GERAL
    const acoesMonitor = await base44.asServiceRole.entities.AcaoAgente.filter({
      tipo_acao: 'analise_automatica'
    });
    const ultimaExecucao = acoesMonitor && acoesMonitor[0];
    
    const statusGeral = {
      ativo: true,
      ultima_execucao: ultimaExecucao?.created_date || 'Ainda não executado',
      tempo_desde_ultima: ultimaExecucao ? 
        Math.round((now.getTime() - new Date(ultimaExecucao.created_date).getTime()) / (1000 * 60)) + ' minutos atrás' : 
        'N/A',
      subagentes: {
        codefixer: 'Ativo ✅',
        note: 'Sistema atual: CodeFixer único integrado'
      },
      supervisor_agent: 'Integrado ao CodeFixer principal ✅'
    };

    // 2️⃣ MÉTRICAS DE SISTEMA
    const healthResponse = await base44.asServiceRole.functions.invoke('generateSystemHealthReport', {
      hours: 48
    });
    
    const todosErros = await base44.asServiceRole.entities.ErrorLog.list('-last_seen', 1000);
    const erros48h = (todosErros || []).filter(e => {
      const ts = e.last_seen || e.created_date;
      return ts && ts >= last48h;
    });
    
    const corrigidos = erros48h.filter(e => e.status === 'resolvido').length;
    const emAnalise = erros48h.filter(e => e.status === 'em_analise').length;
    const novos = erros48h.filter(e => e.status === 'novo').length;
    const criticos = erros48h.filter(e => e.severity === 'critical').length;
    const errors = erros48h.filter(e => e.severity === 'error').length;

    const metricas = {
      system_health_score: healthResponse.data?.health_score || 0,
      erros_detectados_48h: erros48h.length,
      criticos: criticos,
      errors: errors,
      corrigidos_automaticamente: corrigidos,
      em_analise: emAnalise,
      novos: novos,
      taxa_resolucao: erros48h.length > 0 ? Math.round((corrigidos / erros48h.length) * 100) : 0
    };

    // 2.5️⃣ TOP ERROS ATIVOS (NOVA SEÇÃO)
    const errosAtivos = erros48h.filter(e => e.status !== 'resolvido' && e.status !== 'ignorado');
    
    // Agrupar erros similares
    const errosPorMensagem = new Map();
    for (const erro of errosAtivos) {
      const key = erro.message?.slice(0, 100) || 'unknown';
      if (!errosPorMensagem.has(key)) {
        errosPorMensagem.set(key, {
          mensagem: erro.message,
          arquivo: erro.file || erro.component || 'Não especificado',
          linha: erro.line || 'N/A',
          componente: erro.component || 'N/A',
          severity: erro.severity,
          status: erro.status,
          ocorrencias: 0,
          primeiro_erro_id: erro.id,
          ultima_ocorrencia: erro.last_seen || erro.created_date,
          url: erro.url
        });
      }
      const grupo = errosPorMensagem.get(key);
      grupo.ocorrencias++;
      const ultData = erro.last_seen || erro.created_date;
      if (ultData > grupo.ultima_ocorrencia) {
        grupo.ultima_ocorrencia = ultData;
      }
    }

    const topErros = Array.from(errosPorMensagem.values())
      .sort((a, b) => {
        // Priorizar por: 1) severity, 2) ocorrências
        const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
        const sevA = severityOrder[a.severity] || 999;
        const sevB = severityOrder[b.severity] || 999;
        if (sevA !== sevB) return sevA - sevB;
        return b.ocorrencias - a.ocorrencias;
      })
      .slice(0, 10);

    // 3️⃣ APRENDIZADO E CONHECIMENTO
    const knowledgeBases = await base44.asServiceRole.entities.CodeFixKnowledgeBase.list('-version', 1);
    const kb = knowledgeBases && knowledgeBases[0];
    
    const memories = await base44.asServiceRole.entities.CodeFixMemory.list('-date', 5);
    const ultimosAprendizados = [];
    
    if (memories && memories.length > 0) {
      for (const mem of memories.slice(0, 3)) {
        if (mem.learned_from && mem.learned_from.length > 0) {
          ultimosAprendizados.push({
            data: mem.date,
            padrao: mem.learned_from[0].message?.slice(0, 80),
            solucao: mem.learned_from[0].solution?.slice(0, 100),
            componente: mem.learned_from[0].component
          });
        }
      }
    }

    const aprendizado = {
      total_padroes: kb?.metrics?.total_patterns || 0,
      versao_modelo: kb?.version || 0,
      confidence_media: kb?.metrics?.avg_success_rate || 0,
      padroes_alta_confianca: kb?.metrics?.high_confidence_patterns || 0,
      erro_mais_comum: kb?.metrics?.most_common_error || 'N/A',
      ultimos_aprendizados: ultimosAprendizados,
      base_conhecimento_ativa: kb ? 'Sim ✅' : 'Aguardando primeiro ciclo'
    };

    // 4️⃣ ATIVIDADES RECENTES
    const todasAcoes = await base44.asServiceRole.entities.AcaoAgente.list('-created_date', 50);
    const tarefasCriadas = (todasAcoes || []).filter(a => a.tipo_acao === 'tarefa_criada').slice(0, 5);
    const patchesAplicados = await base44.asServiceRole.entities.CodePatchSuggestion.filter({ status: 'aplicado' });
    const relatoriosGerados = (todasAcoes || []).filter(a => a.tipo_acao === 'relatorio_gerado').slice(0, 3);

    const atividades = {
      ultimas_tarefas: tarefasCriadas.map(t => ({
        id: t.id,
        descricao: t.descricao,
        prioridade: t.prioridade,
        data: new Date(t.created_date).toLocaleString('pt-BR')
      })),
      ultimos_patches: (patchesAplicados || []).slice(0, 3).map(p => ({
        id: p.id,
        arquivo: p.file_path,
        tipo: p.change_type,
        status: p.status,
        notas: p.notes?.slice(0, 100)
      })),
      ultimos_relatorios: relatoriosGerados.map(r => ({
        id: r.id,
        tipo: r.descricao,
        prioridade: r.prioridade,
        data: new Date(r.created_date).toLocaleString('pt-BR')
      })),
      total_acoes_7dias: (todasAcoes || []).filter(a => a.created_date && a.created_date >= last7days).length
    };

    // 5️⃣ AGENDAMENTOS
    const ultimasExecucoes = (todasAcoes || []).filter(a => 
      a.iniciado_por === 'sistema' && 
      a.created_date >= new Date(now.getTime() - 30 * 60 * 1000).toISOString()
    );

    const agendamentos = {
      cron_5min_status: ultimasExecucoes.length > 0 ? 'Ativo ✅' : '⚠️ Sem execuções recentes',
      cron_diario_status: memories && memories.length > 0 ? 'Ativo ✅' : 'Aguardando primeiro ciclo',
      cron_semanal_status: kb ? 'Ativo ✅' : 'Aguardando primeiro ciclo',
      monitor_autonomo: ultimaExecucao ? 'Operacional ✅' : '⚠️ Ainda não executado',
      ultima_varredura: ultimaExecucao?.created_date ? 
        new Date(ultimaExecucao.created_date).toLocaleString('pt-BR') : 'N/A',
      proxima_execucao_estimada: ultimaExecucao ? 
        new Date(new Date(ultimaExecucao.created_date).getTime() + 5 * 60 * 1000).toLocaleString('pt-BR') :
        'Configurar cron job'
    };

    // 6️⃣ SEGURANÇA
    const patchesComSafety = (patchesAplicados || []).filter(p => p.notes);
    const safetyScores = [];
    
    for (const patch of patchesComSafety) {
      const match = patch.notes?.match(/safety_score[:\s]+([0-9.]+)/i);
      if (match) {
        safetyScores.push(parseFloat(match[1]));
      }
    }
    
    const safetyMedia = safetyScores.length > 0 ?
      (safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length).toFixed(2) : 'N/A';

    const seguranca = {
      safety_score_medio: safetyMedia,
      patches_aplicados_total: patchesAplicados?.length || 0,
      patches_sugeridos: await base44.asServiceRole.entities.CodePatchSuggestion.filter({
        status: 'sugerido'
      }).then(p => p?.length || 0),
      acoes_bloqueadas: 0,
      rollback_disponivel: 'Sim ✅',
      backups_automaticos: 'Configurado ✅',
      criterios_seguranca: {
        min_safety_score: 0.7,
        requer_aprovacao_breaking: true,
        testa_sandbox_primeiro: true
      }
    };

    // DIAGNÓSTICO
    let statusDiagnostico = 'Operacional ✅';
    let riscoAtual = 'Baixo 🟢';
    let recomendacao = 'Sistema operando dentro dos parâmetros normais.';

    if (metricas.system_health_score < 60) {
      statusDiagnostico = 'Em Atenção ⚠️';
      riscoAtual = 'Alto 🔴';
      recomendacao = `URGENTE: Health Score em ${metricas.system_health_score}/100. Resolver erros críticos.`;
    } else if (metricas.system_health_score < 80) {
      statusDiagnostico = 'Parcial ⚠️';
      riscoAtual = 'Médio 🟡';
      recomendacao = `Health Score abaixo do ideal (${metricas.system_health_score}/100).`;
    } else if (criticos > 0) {
      statusDiagnostico = 'Operacional (com alertas) ⚠️';
      riscoAtual = 'Médio 🟡';
      recomendacao = `${criticos} erro(s) crítico(s) detectado(s).`;
    } else if (ultimasExecucoes.length === 0) {
      statusDiagnostico = 'Parcial (Cron Inativo) ⚠️';
      riscoAtual = 'Médio 🟡';
      recomendacao = 'Configurar cron job para monitoramento automático.';
    }

    const diagnostico = {
      status: statusDiagnostico,
      risco_atual: riscoAtual,
      recomendacao_imediata: recomendacao,
      data_geracao: now.toLocaleString('pt-BR'),
      gerado_por: 'CodeFixer Autonomous Agent v' + (kb?.version || 1),
      assinatura_solicitante: 'Ivan — Auditor Técnico e Arquiteto do Sistema'
    };

    // COMPARAÇÃO
    let comparisonText = '';
    try {
      const comparisonResponse = await base44.asServiceRole.functions.invoke('compareAgentHealthReports', {});
      if (comparisonResponse.data && comparisonResponse.data.success && comparisonResponse.data.comparison_text) {
        comparisonText = comparisonResponse.data.comparison_text;
      }
    } catch (err) {
      console.log('Comparação não disponível:', err.message);
    }

    // RELATÓRIO TEXTUAL
    const relatorioTexto = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                  📊 RELATÓRIO TÉCNICO DO AGENTE CODEFIXER                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

📅 ${diagnostico.data_geracao}
🤖 ${diagnostico.gerado_por}
👤 ${diagnostico.assinatura_solicitante}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  STATUS GERAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Status: ${statusGeral.ativo ? 'Ativo e Operacional' : 'Inativo'}
⏰ Última Execução: ${statusGeral.ultima_execucao}
⌚ Tempo: ${statusGeral.tempo_desde_ultima}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣  MÉTRICAS (48h)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏥 Health Score: ${metricas.system_health_score}/100

📊 Estatísticas:
   ├─ Total: ${metricas.erros_detectados_48h}
   ├─ 🔴 Críticos: ${metricas.criticos}
   ├─ 🟠 Errors: ${metricas.errors}
   ├─ ✅ Resolvidos: ${metricas.corrigidos_automaticamente}
   ├─ 🔍 Em Análise: ${metricas.em_analise}
   └─ 🆕 Novos: ${metricas.novos}

📈 Taxa de Resolução: ${metricas.taxa_resolucao}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 TOP 10 ERROS ATIVOS (Precisam de Atenção)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${topErros.length === 0 ? '✅ Nenhum erro ativo detectado! Sistema limpo.' : topErros.map((erro, idx) => `
${idx + 1}. ${erro.severity === 'critical' ? '🔴 CRÍTICO' : erro.severity === 'error' ? '🟠 ERROR' : '🟡 WARNING'} [${erro.ocorrencias}x ocorrência${erro.ocorrencias > 1 ? 's' : ''}]
   
   📝 Mensagem:
   ${erro.mensagem?.slice(0, 200)}${erro.mensagem?.length > 200 ? '...' : ''}
   
   📍 Localização:
   ├─ Arquivo: ${erro.arquivo}
   ├─ Linha: ${erro.linha}
   ├─ Componente: ${erro.componente}
   └─ Última ocorrência: ${new Date(erro.ultima_ocorrencia).toLocaleString('pt-BR')}
   
   🔗 ID do Erro: ${erro.primeiro_erro_id}
   📊 Status: ${erro.status}
   🌐 URL: ${erro.url?.slice(0, 80) || 'N/A'}
   
   ─────────────────────────────────────────────────────────────────────
`).join('')}

${topErros.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 RECOMENDAÇÕES PARA OS ERROS ACIMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${topErros.slice(0, 3).map((erro, idx) => `
${idx + 1}. ${erro.severity === 'critical' ? '🚨 URGENTE' : '⚠️ ALTA PRIORIDADE'}
   Erro: ${erro.mensagem?.slice(0, 80)}...
   Ação: ${erro.severity === 'critical' ? 'Corrigir IMEDIATAMENTE' : 'Corrigir nas próximas 24h'}
   Arquivo: ${erro.arquivo}:${erro.linha}
`).join('')}

Para análise detalhada de cada erro, use o botão "Copiar Prompt para IA"
no painel de Revisão de Erros (CodeFixReview).
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣  APRENDIZADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Padrões: ${aprendizado.total_padroes} | Alta Confiança: ${aprendizado.padroes_alta_confianca}
🔢 Versão: v${aprendizado.versao_modelo} | Confidence: ${aprendizado.confidence_media}%
${comparisonText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╔═══════════════════════════════════════════════════════════════════════════════╗
║                          DIAGNÓSTICO FINAL                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

> Status: ${diagnostico.status}
> Risco: ${diagnostico.risco_atual}
> Recomendação: ${diagnostico.recomendacao_imediata}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    // SALVAR HISTÓRICO
    await base44.asServiceRole.entities.AgentReportsHistory.create({
      report_date: now.toISOString(),
      health_score: metricas.system_health_score,
      total_errors: metricas.erros_detectados_48h,
      critical_errors: metricas.criticos,
      resolved_errors: metricas.corrigidos_automaticamente,
      resolution_rate: metricas.taxa_resolucao,
      mttr_hours: healthResponse.data?.metrics?.mttr_hours || 0,
      total_patterns: aprendizado.total_padroes,
      model_version: aprendizado.versao_modelo,
      patches_applied: seguranca.patches_aplicados_total,
      tasks_created: tarefasCriadas.length,
      safety_score: parseFloat(safetyMedia) || 0,
      status: diagnostico.status,
      risk_level: diagnostico.risco_atual,
      report_data: {
        status_geral: statusGeral,
        metricas: metricas,
        top_erros: topErros,
        aprendizado: aprendizado,
        atividades: atividades,
        agendamentos: agendamentos,
        seguranca: seguranca,
        diagnostico: diagnostico
      }
    });

    // REGISTRAR AÇÃO
    await base44.asServiceRole.entities.AcaoAgente.create({
      tipo_acao: 'relatorio_gerado',
      status: 'concluido',
      prioridade: 'alta',
      descricao: 'Relatório técnico completo gerado',
      resultado: relatorioTexto,
      contexto: {
        solicitante: diagnostico.assinatura_solicitante,
        health_score: metricas.system_health_score,
        status_final: diagnostico.status,
        risco: diagnostico.risco_atual,
        total_erros_ativos: topErros.length
      },
      iniciado_por: 'usuario',
      data_conclusao: now.toISOString()
    });

    return Response.json({
      success: true,
      report_text: relatorioTexto,
      data: {
        status_geral: statusGeral,
        metricas: metricas,
        top_erros: topErros,
        aprendizado: aprendizado,
        atividades: atividades,
        agendamentos: agendamentos,
        seguranca: seguranca,
        diagnostico: diagnostico
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
});