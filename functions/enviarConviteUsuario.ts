import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('=== INÍCIO: enviarConviteUsuario ===');
    
    // Validar autenticação
    console.log('1. Validando autenticação...');
    const user = await base44.auth.me();
    if (!user) {
      console.error('Usuário não autenticado');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✓ Usuário autenticado:', user.email);

    // Parse do body
    console.log('2. Parsing body...');
    const body = await req.json();
    console.log('Body recebido:', JSON.stringify(body));
    
    const { funcionario_id, email_acesso, nome_funcionario } = body;

    // Validar parâmetros
    console.log('3. Validando parâmetros...');
    if (!funcionario_id) {
      console.error('funcionario_id não fornecido');
      return Response.json({ error: 'funcionario_id é obrigatório' }, { status: 400 });
    }
    if (!email_acesso) {
      console.error('email_acesso não fornecido');
      return Response.json({ error: 'email_acesso é obrigatório' }, { status: 400 });
    }
    if (!nome_funcionario) {
      console.error('nome_funcionario não fornecido');
      return Response.json({ error: 'nome_funcionario é obrigatório' }, { status: 400 });
    }
    console.log('✓ Parâmetros válidos');

    // Verificar usuário existente
    console.log('4. Verificando se usuário já existe...');
    let usuariosExistentes;
    try {
      usuariosExistentes = await base44.asServiceRole.entities.User.filter({ 
        email: email_acesso 
      });
      console.log('✓ Consulta de usuários existentes concluída. Total:', usuariosExistentes?.length || 0);
    } catch (err) {
      console.error('Erro ao consultar usuários existentes:', err);
      throw new Error('Erro ao consultar usuários existentes: ' + err.message);
    }

    let userId;

    if (usuariosExistentes && usuariosExistentes.length > 0) {
      console.log('5a. Usuário já existe, vinculando...');
      userId = usuariosExistentes[0].id;
      
      try {
        await base44.asServiceRole.entities.User.update(userId, {
          funcionario_id: funcionario_id,
          status_convite: 'aceito'
        });
        console.log('✓ Usuário atualizado');
      } catch (err) {
        console.error('Erro ao atualizar usuário:', err);
        throw new Error('Erro ao atualizar usuário: ' + err.message);
      }

      try {
        await base44.asServiceRole.entities.Funcionario.update(funcionario_id, {
          usuario_id: userId,
          convite_status: 'aceito',
          convite_enviado_em: new Date().toISOString()
        });
        console.log('✓ Funcionário atualizado');
      } catch (err) {
        console.error('Erro ao atualizar funcionário:', err);
        throw new Error('Erro ao atualizar funcionário: ' + err.message);
      }

      return Response.json({ 
        success: true,
        message: 'Usuário já existente vinculado ao funcionário',
        usuario_id: userId,
        convite_enviado: false
      });
    }

    // Criar novo usuário
    console.log('5b. Criando novo usuário...');
    let novoUsuario;
    try {
      novoUsuario = await base44.asServiceRole.entities.User.create({
        email: email_acesso,
        full_name: nome_funcionario,
        funcionario_id: funcionario_id,
        system_role: 'user',
        status_convite: 'pendente'
      });
      userId = novoUsuario.id;
      console.log('✓ Novo usuário criado. ID:', userId);
    } catch (err) {
      console.error('Erro ao criar usuário:', err);
      console.error('Stack:', err.stack);
      throw new Error('Erro ao criar usuário: ' + err.message);
    }

    // Atualizar funcionário
    console.log('6. Atualizando funcionário...');
    try {
      await base44.asServiceRole.entities.Funcionario.update(funcionario_id, {
        usuario_id: userId,
        convite_status: 'pendente',
        convite_enviado_em: new Date().toISOString()
      });
      console.log('✓ Funcionário atualizado');
    } catch (err) {
      console.error('Erro ao atualizar funcionário:', err);
      throw new Error('Erro ao atualizar funcionário: ' + err.message);
    }

    // Enviar email
    console.log('7. Enviando email de convite...');
    const loginUrl = `${new URL(req.url).origin}/`;
    console.log('URL de login:', loginUrl);
    
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email_acesso,
        subject: '🎉 Bem-vindo ao Sistema de Gestão!',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e293b;">Olá, ${nome_funcionario}!</h2>
            
            <p>Você foi convidado para acessar o <strong>Sistema de Gestão</strong>.</p>
            
            <p>Para começar, clique no botão abaixo para fazer login:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background-color: #1e293b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                Acessar Sistema
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
              Seu email de acesso é: <strong>${email_acesso}</strong>
            </p>
            
            <p style="color: #64748b; font-size: 14px;">
              Na primeira vez que acessar, você poderá configurar sua senha através do Google Sign-In.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            
            <p style="color: #94a3b8; font-size: 12px;">
              Se você não solicitou este acesso, ignore este email.
            </p>
          </div>
        `
      });
      console.log('✓ Email enviado com sucesso');
    } catch (err) {
      console.error('Erro ao enviar email:', err);
      // Não falha se o email não for enviado, mas loga o erro
      console.warn('Email não foi enviado, mas usuário foi criado');
    }

    console.log('=== SUCESSO: enviarConviteUsuario ===');
    return Response.json({ 
      success: true,
      message: 'Convite enviado com sucesso',
      usuario_id: userId,
      convite_enviado: true
    });

  } catch (error) {
    console.error('=== ERRO: enviarConviteUsuario ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    // Tentar logar o erro
    try {
      await base44.asServiceRole.entities.ErrorLog.create({
        message: String(error?.message || error),
        stack: String(error?.stack || ""),
        source: "function:enviarConviteUsuario",
        url: "function:enviarConviteUsuario",
        severity: "error",
        status: "novo",
        last_seen: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Erro ao logar erro:', logError);
    }

    return Response.json({ 
      error: error.message || 'Erro ao processar convite',
      details: String(error),
      stack: error.stack || '',
      success: false
    }, { status: 500 });
  }
});