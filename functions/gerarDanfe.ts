import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nota_fiscal_id } = await req.json();

    if (!nota_fiscal_id) {
      return Response.json({ 
        success: false, 
        error: 'nota_fiscal_id é obrigatório' 
      }, { status: 400 });
    }

    // Buscar nota fiscal
    const nota = await base44.entities.NotaFiscalEntrada.get(nota_fiscal_id);
    
    if (!nota) {
      return Response.json({ 
        success: false, 
        error: 'Nota fiscal não encontrada' 
      }, { status: 404 });
    }

    if (!nota.xml_nfe) {
      return Response.json({ 
        success: false, 
        error: 'XML da nota fiscal não disponível' 
      }, { status: 400 });
    }

    // Buscar fornecedor
    const fornecedor = await base44.entities.Fornecedor.get(nota.fornecedor_id);

    // Buscar itens
    const itens = await base44.entities.ItemNotaFiscal.filter({ 
      nota_fiscal_id: nota.id 
    });

    // Gerar HTML do DANFE
    const danfeHtml = gerarHTMLDanfe(nota, fornecedor, itens);

    return Response.json({
      success: true,
      danfe_html: danfeHtml
    });

  } catch (error) {
    console.error('Erro ao gerar DANFE:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

function gerarHTMLDanfe(nota, fornecedor, itens) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DANFE - NF-e ${nota.numero_nota}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      padding: 20px;
      background: white;
    }
    
    .danfe-container {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #000;
      padding: 10px;
    }
    
    .danfe-header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    
    .danfe-title {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .danfe-subtitle {
      font-size: 11pt;
      color: #555;
    }
    
    .section {
      border: 1px solid #000;
      padding: 8px;
      margin-bottom: 10px;
    }
    
    .section-title {
      font-weight: bold;
      font-size: 9pt;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    
    .info-row {
      display: flex;
      gap: 10px;
      margin-bottom: 5px;
    }
    
    .info-item {
      flex: 1;
    }
    
    .info-label {
      font-size: 8pt;
      color: #555;
      font-weight: bold;
    }
    
    .info-value {
      font-size: 10pt;
      margin-top: 2px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    .items-table th,
    .items-table td {
      border: 1px solid #000;
      padding: 5px;
      text-align: left;
      font-size: 9pt;
    }
    
    .items-table th {
      background: #f0f0f0;
      font-weight: bold;
    }
    
    .items-table td.number {
      text-align: right;
    }
    
    .totals-section {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    
    .total-box {
      flex: 1;
      border: 1px solid #000;
      padding: 8px;
    }
    
    .total-label {
      font-size: 8pt;
      color: #555;
      font-weight: bold;
    }
    
    .total-value {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 5px;
    }
    
    .chave-acesso {
      font-family: 'Courier New', monospace;
      font-size: 11pt;
      letter-spacing: 2px;
      text-align: center;
      padding: 10px;
      border: 1px solid #000;
      margin-top: 10px;
      background: #f9f9f9;
    }
    
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 14pt;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
    }
    
    .print-button:hover {
      background: #45a049;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .print-button {
        display: none;
      }
      
      .danfe-container {
        border: none;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">🖨️ Imprimir DANFE</button>
  
  <div class="danfe-container">
    <!-- Header -->
    <div class="danfe-header">
      <div class="danfe-title">DANFE</div>
      <div class="danfe-subtitle">Documento Auxiliar da Nota Fiscal Eletrônica</div>
    </div>
    
    <!-- Informações do Fornecedor -->
    <div class="section">
      <div class="section-title">Emitente</div>
      <div class="info-row">
        <div class="info-item" style="flex: 3;">
          <div class="info-label">Nome / Razão Social</div>
          <div class="info-value">${fornecedor?.nome || '-'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">CNPJ</div>
          <div class="info-value">${fornecedor?.cnpj || '-'}</div>
        </div>
      </div>
      <div class="info-row">
        <div class="info-item" style="flex: 2;">
          <div class="info-label">Endereço</div>
          <div class="info-value">${fornecedor?.endereco || '-'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Telefone</div>
          <div class="info-value">${fornecedor?.contato || '-'}</div>
        </div>
      </div>
    </div>
    
    <!-- Dados da Nota -->
    <div class="section">
      <div class="section-title">Nota Fiscal</div>
      <div class="info-row">
        <div class="info-item">
          <div class="info-label">Número</div>
          <div class="info-value">${nota.numero_nota}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Série</div>
          <div class="info-value">${nota.serie || '-'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Data de Emissão</div>
          <div class="info-value">${formatDate(nota.data_emissao)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Data de Entrada</div>
          <div class="info-value">${formatDate(nota.data_entrada)}</div>
        </div>
      </div>
    </div>
    
    <!-- Itens -->
    <div class="section">
      <div class="section-title">Itens da Nota Fiscal</div>
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 60px;">Código</th>
            <th>Descrição</th>
            <th style="width: 60px;">NCM</th>
            <th style="width: 50px;">UN</th>
            <th style="width: 60px;">Qtd</th>
            <th style="width: 80px;">Valor Unit.</th>
            <th style="width: 80px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itens.map(item => `
            <tr>
              <td>${item.codigo_produto || '-'}</td>
              <td>${item.descricao}</td>
              <td>${item.ncm || '-'}</td>
              <td>${item.unidade || 'UN'}</td>
              <td class="number">${item.quantidade}</td>
              <td class="number">${formatCurrency(item.valor_unitario)}</td>
              <td class="number">${formatCurrency(item.valor_total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- Totais -->
    <div class="totals-section">
      <div class="total-box">
        <div class="total-label">Base de Cálculo ICMS</div>
        <div class="total-value">${formatCurrency(nota.valor_produtos)}</div>
      </div>
      <div class="total-box">
        <div class="total-label">Valor do ICMS</div>
        <div class="total-value">${formatCurrency(nota.valor_icms)}</div>
      </div>
      <div class="total-box">
        <div class="total-label">Valor do IPI</div>
        <div class="total-value">${formatCurrency(nota.valor_ipi)}</div>
      </div>
      <div class="total-box">
        <div class="total-label">Valor Total da NF-e</div>
        <div class="total-value" style="color: #2e7d32;">${formatCurrency(nota.valor_total)}</div>
      </div>
    </div>
    
    <!-- Chave de Acesso -->
    ${nota.chave_acesso ? `
      <div class="section">
        <div class="section-title">Chave de Acesso</div>
        <div class="chave-acesso">${formatChaveAcesso(nota.chave_acesso)}</div>
      </div>
    ` : ''}
    
    <!-- Observações -->
    ${nota.observacoes ? `
      <div class="section">
        <div class="section-title">Observações</div>
        <div class="info-value">${nota.observacoes}</div>
      </div>
    ` : ''}
  </div>
</body>
</html>
  `;
}

function formatChaveAcesso(chave) {
  if (!chave) return '';
  
  // Remove espaços e formata em grupos de 4 dígitos
  const cleaned = chave.replace(/\s/g, '');
  const grupos = [];
  
  for (let i = 0; i < cleaned.length; i += 4) {
    grupos.push(cleaned.substr(i, 4));
  }
  
  return grupos.join(' ');
}