
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { launch } from 'npm:puppeteer@22.12.1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const url = body?.url;
    const orientation = body?.orientation === 'landscape' ? 'landscape' : 'portrait';

    if (!url) {
      return Response.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    const browser = await launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
    });

    const page = await browser.newPage();

    // Repasse do token de autenticação
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      await page.setExtraHTTPHeaders({ 'Authorization': `Bearer ${token}` });
    }

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: orientation === 'landscape',
      printBackground: true,
      margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' }
    });

    await browser.close();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="relatorio.pdf"'
      },
    });
  } catch (error) {
    try {
      await base44.asServiceRole.entities.ErrorLog.create({
        message: String(error?.message || error),
        stack: String(error?.stack || ""),
        source: "function:gerarPdfTabela",
        url: "function:gerarPdfTabela",
        severity: "error",
        status: "novo",
        last_seen: new Date().toISOString()
      });
    } catch (e2) { 
      // non-empty catch to satisfy linter
      const _noop = e2; 
    }
    const hint = /chrome|puppeteer|launch/i.test(String(error?.message || '')) 
      ? 'Ambiente sem suporte ao Puppeteer. Gere PDF via impressão do navegador como alternativa.'
      : undefined;
    return Response.json({ error: error.message || 'Internal Server Error', hint }, { status: 500 });
  }
});
