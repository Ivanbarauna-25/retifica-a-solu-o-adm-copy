import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { tipo, tarefa, destinatario_email, destinatario_nome } = await req.json();
    
    if (!tipo || !tarefa || !destinatario_email) {
      return Response.json({ error: 'Parâmetros obrigatórios: tipo, tarefa, destinatario_email' }, { status: 400 });
    }

    // Buscar configurações da empresa
    const configs = await base44.asServiceRole.entities.Configuracoes.list();
    const config = configs?.[0] || {};
    const emailConfig = config.config_email_tarefas || {};
    
    const nomeEmpresa = config.nome_empresa || 'Sistema de Gestão';
    const remetenteNome = emailConfig.remetente_nome || nomeEmpresa;
    const telefoneEmpresa = config.telefone || '';
    const emailEmpresa = config.email || '';
    const enderecoEmpresa = config.endereco || '';
    
    // Verificar preferências do usuário
    const users = await base44.asServiceRole.entities.User.filter({ email: destinatario_email });
    const user = users?.[0];
    const prefs = user?.notificacoes_tarefas || {};
    
    // Verificar se o usuário quer receber este tipo de notificação
    if (!prefs.email_ativo) {
      return Response.json({ success: false, motivo: 'Notificações por email desativadas pelo usuário' });
    }
    
    const verificarPreferencia = () => {
      switch (tipo) {
        case 'vencida': return prefs.notificar_vencidas !== false;
        case 'proxima_vencer': return prefs.notificar_proximas_vencer !== false;
        case 'nova_atribuida': return prefs.notificar_novas_atribuidas !== false;
        case 'atualizada': return prefs.notificar_atualizacoes === true;
        case 'concluida': return prefs.notificar_concluidas === true;
        default: return true;
      }
    };
    
    if (!verificarPreferencia()) {
      return Response.json({ success: false, motivo: 'Tipo de notificação desativado pelo usuário' });
    }

    // Construir assunto e corpo do email
    let assunto = '';
    let corpo = '';
    
    const prazoFormatado = tarefa.prazo ? new Date(tarefa.prazo).toLocaleDateString('pt-BR') : 'Não definido';
    const prioridadeLabel = { baixa: '🟢 Baixa', media: '🟡 Média', alta: '🟠 Alta', urgente: '🔴 Urgente' }[tarefa.prioridade] || tarefa.prioridade;
    
    switch (tipo) {
      case 'vencida':
        assunto = `⚠️ Tarefa Vencida: ${tarefa.titulo}`;
        corpo = `
          <h2 style="color: #dc2626;">Tarefa Vencida</h2>
          <p>Olá ${destinatario_nome || 'Usuário'},</p>
          <p>A tarefa abaixo está <strong>vencida</strong> e requer sua atenção:</p>
        `;
        break;
        
      case 'proxima_vencer':
        assunto = `⏰ Tarefa próxima do vencimento: ${tarefa.titulo}`;
        corpo = `
          <h2 style="color: #f59e0b;">Lembrete de Prazo</h2>
          <p>Olá ${destinatario_nome || 'Usuário'},</p>
          <p>A tarefa abaixo está <strong>próxima do vencimento</strong>:</p>
        `;
        break;
        
      case 'nova_atribuida':
        assunto = `📋 Nova tarefa atribuída: ${tarefa.titulo}`;
        corpo = `
          <h2 style="color: #2563eb;">Nova Tarefa</h2>
          <p>Olá ${destinatario_nome || 'Usuário'},</p>
          <p>Uma nova tarefa foi <strong>atribuída a você</strong>:</p>
        `;
        break;
        
      case 'atualizada':
        assunto = `🔄 Tarefa atualizada: ${tarefa.titulo}`;
        corpo = `
          <h2 style="color: #7c3aed;">Tarefa Atualizada</h2>
          <p>Olá ${destinatario_nome || 'Usuário'},</p>
          <p>Uma tarefa atribuída a você foi <strong>atualizada</strong>:</p>
        `;
        break;
        
      case 'concluida':
        assunto = `✅ Tarefa concluída: ${tarefa.titulo}`;
        corpo = `
          <h2 style="color: #16a34a;">Tarefa Concluída</h2>
          <p>Olá ${destinatario_nome || 'Usuário'},</p>
          <p>A tarefa abaixo foi <strong>concluída</strong>:</p>
        `;
        break;
        
      default:
        assunto = `📋 Notificação de Tarefa: ${tarefa.titulo}`;
        corpo = `
          <h2>Notificação de Tarefa</h2>
          <p>Olá ${destinatario_nome || 'Usuário'},</p>
        `;
    }
    
    // Detalhes da tarefa
    corpo += `
      <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 12px 0; color: #1e293b;">${tarefa.titulo}</h3>
        ${tarefa.descricao ? `<p style="color: #475569; margin: 0 0 12px 0;">${tarefa.descricao}</p>` : ''}
        <table style="width: 100%; font-size: 14px; color: #475569;">
          <tr>
            <td style="padding: 4px 0;"><strong>Prazo:</strong></td>
            <td>${prazoFormatado}${tarefa.hora_prazo ? ` às ${tarefa.hora_prazo}` : ''}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>Prioridade:</strong></td>
            <td>${prioridadeLabel}</td>
          </tr>
          ${tarefa.vinculo_descricao ? `
          <tr>
            <td style="padding: 4px 0;"><strong>Vínculo:</strong></td>
            <td>${tarefa.vinculo_descricao}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `;

    // Rodapé com informações da empresa
    const rodapeTexto = emailConfig.rodape_texto || '';
    corpo += `
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <div style="font-size: 12px; color: #64748b; text-align: center;">
        ${rodapeTexto ? `<p style="margin-bottom: 12px;">${rodapeTexto}</p>` : ''}
        <p style="margin: 4px 0;"><strong>${nomeEmpresa}</strong></p>
        ${enderecoEmpresa ? `<p style="margin: 4px 0;">${enderecoEmpresa}</p>` : ''}
        ${telefoneEmpresa ? `<p style="margin: 4px 0;">📞 ${telefoneEmpresa}</p>` : ''}
        ${emailEmpresa ? `<p style="margin: 4px 0;">✉️ ${emailEmpresa}</p>` : ''}
        <p style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
          Esta é uma notificação automática. Para alterar suas preferências de notificação, acesse o sistema.
        </p>
      </div>
    `;

    // Enviar email usando a integração Core
    await base44.integrations.Core.SendEmail({
      from_name: remetenteNome,
      to: destinatario_email,
      subject: assunto,
      body: corpo
    });

    return Response.json({ 
      success: true, 
      message: 'Notificação enviada com sucesso',
      tipo,
      destinatario: destinatario_email
    });

  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});