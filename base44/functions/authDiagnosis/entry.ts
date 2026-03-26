import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const authed = await base44.auth.isAuthenticated();
    let user = null;
    if (authed) {
      user = await base44.auth.me();
    }

    return Response.json({
      authenticated: !!authed,
      userEmail: user?.email || null,
      hasUser: !!user,
      hint: authed ? "Token presente e válido." : "Sem token/cookie ou expirado. Faça login novamente."
    });
  } catch (error) {
    return Response.json({ authenticated: false, error: String(error?.message || error) }, { status: 500 });
  }
});