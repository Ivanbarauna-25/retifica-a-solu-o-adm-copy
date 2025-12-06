import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { clientes } = body;

    if (!clientes || !Array.isArray(clientes) || clientes.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'Nenhum cliente para notificar' 
      });
    }

    // Buscar configurações da empresa para enviar e-mail
    const configuracoes = await base44.asServiceRole.entities.Configuracoes.list();
    const config = configuracoes?.[0];

    // Buscar usuários admin para notificar
    const usuarios = await base44.asServiceRole.entities.User.list();
    const admins = usuarios.filter(u => u.role === 'admin' || u.system_role === 'admin');

    // Preparar lista de clientes para o e-mail
    const listaClientes = clientes.map((c, idx) => 
      `${idx + 1}. ${c.nome} (ID: ${c.id})`
    ).join('\n');

    const mensagemEmail = `
Olá,

Durante a importação de orçamentos, ${clientes.length} cliente(s) foram cadastrados automaticamente com dados incompletos.

Esses clientes possuem apenas o nome cadastrado e precisam ter seus dados complementados (telefone, CPF/CNPJ, endereço, etc.).

CLIENTES QUE PRECISAM SER COMPLETADOS:
${listaClientes}

Por favor, acesse o sistema e complete o cadastro desses clientes em:
Dashboard > Clientes

Atenciosamente,
Sistema de Gestão ${config?.nome_empresa || ''}
    `.trim();

    // Enviar e-mail para cada admin
    const envios = [];
    for (const admin of admins) {
      if (admin.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: config?.nome_empresa || 'Sistema de Gestão',
            to: admin.email,
            subject: `⚠️ ${clientes.length} Cliente(s) com Cadastro Incompleto`,
            body: mensagemEmail
          });
          envios.push({ email: admin.email, status: 'enviado' });
        } catch (emailError) {
          console.error('Erro ao enviar e-mail para', admin.email, emailError);
          envios.push({ email: admin.email, status: 'erro', erro: emailError.message });
        }
      }
    }

    // Retornar resultado
    return Response.json({
      success: true,
      message: `Alertas enviados para ${envios.filter(e => e.status === 'enviado').length} administrador(es)`,
      detalhes: {
        total_clientes: clientes.length,
        emails_enviados: envios.filter(e => e.status === 'enviado').length,
        emails_falhos: envios.filter(e => e.status === 'erro').length,
        envios: envios
      }
    });

  } catch (error) {
    console.error('❌ Erro em notificarClientesIncompletos:', error);
    return Response.json({ 
      error: error.message || 'Erro ao enviar notificações' 
    }, { status: 500 });
  }
});