import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * NÍVEL 4 - GESTÃO ESTRATÉGICA
 * Envia relatório semanal por e-mail
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gerar relatório de saúde
    const healthResponse = await base44.asServiceRole.functions.invoke('generateSystemHealthReport', {
      hours: 168 // 7 dias
    });

    if (!healthResponse.data || !healthResponse.data.success) {
      return Response.json({ error: 'Failed to generate health report' }, { status: 500 });
    }

    const report = healthResponse.data;

    // Buscar configurações para e-mail
    const configs = await base44.asServiceRole.entities.Configuracoes.list();
    const emailAdmin = configs?.[0]?.email || 'admin@sistema.com';
    const nomeEmpresa = configs?.[0]?.nome_empresa || 'Sistema de Gestão';

    // Buscar últimas ações do agente
    const acoes = await base44.asServiceRole.entities.AcaoAgente.list('-created_date', 20);

    // Buscar patches aplicados
    const patches = await base44.asServiceRole.entities.CodePatchSuggestion.filter({
      status: 'aplicado'
    });
    const patchesAplicados = (patches || []).slice(0, 10);

    // Buscar base de conhecimento atual
    const kb = await base44.asServiceRole.entities.CodeFixKnowledgeBase.list('-version', 1);
    const knowledgeBase = kb && kb[0];

    // Determinar cor do health score
    let healthColor = '#10b981'; // verde
    if (report.health_score < 60) healthColor = '#ef4444'; // vermelho
    else if (report.health_score < 80) healthColor = '#f59e0b'; // amarelo

    // Gerar e-mail HTML
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #f8f9fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📊 Relatório Semanal CodeFixer</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${nomeEmpresa}</p>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">
            Período: ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')} - ${new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <!-- System Health Score -->
        <div style="background: white; padding: 30px; margin: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #334155; margin: 0 0 20px 0;">System Health Score</h2>
            <div style="display: inline-block; position: relative; width: 200px; height: 200px;">
              <svg viewBox="0 0 200 200" style="transform: rotate(-90deg);">
                <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" stroke-width="20"/>
                <circle cx="100" cy="100" r="90" fill="none" stroke="${healthColor}" stroke-width="20"
                        stroke-dasharray="${(report.health_score / 100) * 565} 565" 
                        stroke-linecap="round"/>
              </svg>
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                <div style="font-size: 48px; font-weight: bold; color: ${healthColor};">${report.health_score}</div>
                <div style="font-size: 16px; color: #64748b;">/ 100</div>
              </div>
            </div>
            <p style="margin: 20px 0 0 0; font-size: 18px; color: #475569;">
              ${report.trend}
            </p>
          </div>

          <!-- Métricas em Grid -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 30px;">
            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
              <div style="font-size: 14px; color: #7f1d1d; margin-bottom: 5px;">ERROS CRÍTICOS</div>
              <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${report.metrics.criticals}</div>
            </div>
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <div style="font-size: 14px; color: #78350f; margin-bottom: 5px;">TOTAL DE ERROS</div>
              <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${report.metrics.total_errors}</div>
            </div>
            <div style="background: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a;">
              <div style="font-size: 14px; color: #14532d; margin-bottom: 5px;">RESOLVIDOS</div>
              <div style="font-size: 32px; font-weight: bold; color: #16a34a;">${report.metrics.resolved}</div>
            </div>
            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <div style="font-size: 14px; color: #1e3a8a; margin-bottom: 5px;">MTTR (HORAS)</div>
              <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${report.metrics.mttr_hours}</div>
            </div>
          </div>
        </div>

        <!-- Top Componentes Problemáticos -->
        ${report.top_components.length > 0 ? `
        <div style="background: white; padding: 30px; margin: 20px;">
          <h3 style="color: #334155; margin: 0 0 20px 0;">🎯 Componentes que Precisam de Atenção</h3>
          ${report.top_components.slice(0, 5).map((comp, i) => `
            <div style="padding: 15px; margin-bottom: 10px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #94a3b8;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: bold; color: #334155; margin-bottom: 5px;">${i + 1}. ${comp.component}</div>
                  <div style="font-size: 14px; color: #64748b;">${comp.error_count} erros detectados</div>
                </div>
                <div style="background: #ef4444; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold;">
                  ${comp.error_count}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- Ações do Agente -->
        ${acoes.length > 0 ? `
        <div style="background: white; padding: 30px; margin: 20px;">
          <h3 style="color: #334155; margin: 0 0 20px 0;">🤖 Ações Realizadas pelo Agente</h3>
          ${acoes.slice(0, 5).map(acao => `
            <div style="padding: 15px; margin-bottom: 10px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <div style="font-weight: bold; color: #1e40af; margin-bottom: 5px;">
                ${acao.tipo_acao === 'analise_automatica' ? '🔍 Análise Automática' :
                  acao.tipo_acao === 'correcao_sugerida' ? '🔧 Correção Sugerida' :
                  acao.tipo_acao === 'patch_aplicado' ? '✅ Patch Aplicado' :
                  acao.tipo_acao === 'relatorio_gerado' ? '📊 Relatório Gerado' :
                  acao.tipo_acao === 'tarefa_criada' ? '📋 Tarefa Criada' : acao.tipo_acao}
              </div>
              <div style="font-size: 14px; color: #475569;">${acao.descricao}</div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 5px;">
                ${new Date(acao.created_date).toLocaleString('pt-BR')}
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- Patches Aplicados -->
        ${patchesAplicados.length > 0 ? `
        <div style="background: white; padding: 30px; margin: 20px;">
          <h3 style="color: #334155; margin: 0 0 20px 0;">✅ Correções Aplicadas</h3>
          <p style="color: #64748b; margin-bottom: 20px;">
            ${patchesAplicados.length} patch(es) aplicado(s) automaticamente esta semana
          </p>
          ${patchesAplicados.slice(0, 3).map((patch, i) => `
            <div style="padding: 15px; margin-bottom: 10px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #16a34a;">
              <div style="font-weight: bold; color: #15803d; margin-bottom: 5px;">
                ${i + 1}. ${patch.file_path || 'Correção aplicada'}
              </div>
              <div style="font-size: 14px; color: #475569;">${patch.notes?.slice(0, 100) || 'Patch aplicado com sucesso'}...</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- Base de Conhecimento -->
        ${knowledgeBase ? `
        <div style="background: white; padding: 30px; margin: 20px;">
          <h3 style="color: #334155; margin: 0 0 20px 0;">🧠 Evolução do Aprendizado</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
            <div style="text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 28px; font-weight: bold; color: #667eea;">${knowledgeBase.metrics?.total_patterns || 0}</div>
              <div style="font-size: 14px; color: #64748b;">Padrões Aprendidos</div>
            </div>
            <div style="text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${knowledgeBase.metrics?.avg_success_rate || 0}%</div>
              <div style="font-size: 14px; color: #64748b;">Taxa de Sucesso</div>
            </div>
            <div style="text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">v${knowledgeBase.version || 1}</div>
              <div style="font-size: 14px; color: #64748b;">Versão do Modelo</div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Recomendações -->
        <div style="background: white; padding: 30px; margin: 20px;">
          <h3 style="color: #334155; margin: 0 0 20px 0;">💡 Recomendações Estratégicas</h3>
          <div style="background: #fffbeb; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <pre style="white-space: pre-wrap; font-family: inherit; color: #78350f; margin: 0;">${report.recommendations.join('\n')}</pre>
          </div>
        </div>

        <!-- Call to Action -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; margin: 20px; border-radius: 8px; text-align: center;">
          <h3 style="color: white; margin: 0 0 15px 0;">Acesse o Sistema para Mais Detalhes</h3>
          <p style="color: rgba(255,255,255,0.9); margin: 0 0 20px 0;">
            Veja análises completas, patches sugeridos e converse com o agente CodeFixer
          </p>
          <a href="${new URL(req.url).origin}/CodeFixReview" 
             style="display: inline-block; background: white; color: #667eea; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Acessar CodeFix Review →
          </a>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">
            Este é um relatório automático gerado pelo CodeFixer AI<br/>
            Enviado em: ${new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    `;

    // Enviar e-mail
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: emailAdmin,
      subject: `📊 Relatório Semanal CodeFixer - Health Score: ${report.health_score}/100`,
      body: emailBody
    });

    // Registrar ação
    await base44.asServiceRole.entities.AcaoAgente.create({
      tipo_acao: 'relatorio_gerado',
      status: 'concluido',
      prioridade: 'media',
      descricao: `Relatório semanal enviado para ${emailAdmin}`,
      resultado: `Relatório completo enviado por e-mail com métricas da semana`,
      contexto: {
        email_sent_to: emailAdmin,
        health_score: report.health_score,
        total_errors: report.metrics.total_errors,
        patches_applied: patchesAplicados.length
      },
      iniciado_por: 'sistema',
      data_conclusao: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: `Relatório semanal enviado para ${emailAdmin}`,
      health_score: report.health_score,
      email_sent_to: emailAdmin
    });

  } catch (error) {
    console.error('Error sending weekly report:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
});