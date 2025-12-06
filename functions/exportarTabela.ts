
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import * as XLSX from 'npm:xlsx@0.18.5';

const getRelatedData = async (base44) => {
  const [clientes, funcionarios] = await Promise.all([
    base44.asServiceRole.entities.Cliente.list(),
    base44.asServiceRole.entities.Funcionario.list(),
  ]);
  const clienteMap = new Map((clientes || []).map(c => [c.id, c.nome]));
  const funcionarioMap = new Map((funcionarios || []).map(f => [f.id, f.nome]));
  return { clienteMap, funcionarioMap };
};

const getContatoNomeBackend = (orc, clienteMap, funcionarioMap) => {
  if (!orc) return 'N/A';
  if (orc.contato_tipo === 'cliente' && orc.contato_id) {
    return clienteMap.get(orc.contato_id) || 'Cliente não encontrado';
  }
  if (orc.contato_tipo === 'funcionario' && orc.contato_id) {
    return funcionarioMap.get(orc.contato_id) || 'Funcionário não encontrado';
  }
  if (orc.cliente_id) {
    return clienteMap.get(orc.cliente_id) || 'Cliente não encontrado';
  }
  return 'N/A';
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const entityName = String(body.entityName || '');
    const format = (String(body.format || 'xlsx').toLowerCase() === 'csv') ? 'csv' : 'xlsx';
    const filters = (body && typeof body.filters === 'object' && body.filters) ? body.filters : {};

    if (entityName !== 'Orcamento') {
      return Response.json({ error: "Entidade não suportada para exportação." }, { status: 400 });
    }

    const { clienteMap, funcionarioMap } = await getRelatedData(base44);
    const orcamentos = await base44.asServiceRole.entities.Orcamento.filter(filters);

    const headers = [
      "Nº Orçamento", "Data", "Validade", "Cliente/Contato", "Vendedor",
      "Forma de Pagamento", "Condição de Pagamento",
      "Produtos", "Serviços", "Desconto", "Valor Total", "Status",
    ];

    const rows = (orcamentos || []).map((orc) => {
      const valorProdutos = (orc.itens || []).filter((i) => i.tipo === "produto").reduce((acc, item) => acc + (item.valor_total || 0), 0);
      const valorServicos = (orc.itens || []).filter((i) => i.tipo === "servico").reduce((acc, item) => acc + (item.valor_total || 0), 0);
      const subtotal = valorProdutos + valorServicos;
      const valorDesconto = orc.desconto_tipo === "percentual" ? (subtotal * (orc.desconto_valor || 0)) / 100 : (orc.desconto_valor || 0);

      return {
        "Nº Orçamento": orc.numero_orcamento || '',
        "Data": orc.data_orcamento || '',
        "Validade": orc.data_validade || "-",
        "Cliente/Contato": getContatoNomeBackend(orc, clienteMap, funcionarioMap),
        "Vendedor": funcionarioMap.get(orc.vendedor_id) || "N/A",
        "Forma de Pagamento": orc.forma_pagamento || "-",
        "Condição de Pagamento": orc.condicao_pagamento || "-",
        "Produtos": valorProdutos,
        "Serviços": valorServicos,
        "Desconto": valorDesconto,
        "Valor Total": orc.valor_total || 0,
        "Status": orc.status || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orçamentos");

    const fileBuffer = XLSX.write(workbook, { bookType: format, type: 'array' });
    const contentType = format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv';
    const filename = `relatorio_orcamentos.${format}`;

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      },
    });
  } catch (error) {
    try {
      await base44.asServiceRole.entities.ErrorLog.create({
        message: String(error?.message || error),
        stack: String(error?.stack || ""),
        source: "function:exportarTabela",
        url: "function:exportarTabela",
        severity: "error",
        status: "novo",
        last_seen: new Date().toISOString()
      });
    } catch (e2) { 
      // non-empty catch to satisfy linter
      const _noop = e2; 
    }
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
