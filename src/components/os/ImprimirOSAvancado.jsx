import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function ImprimirOSAvancado({ 
  ordem, 
  cliente, 
  veiculo, 
  funcionario, 
  vendedor,
  configuracoes,
  tipo = 'a4' // 'a4' ou 'termica'
}) {
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (configuracoes?.logo_url) {
      setLogoUrl(configuracoes.logo_url);
    }
  }, [configuracoes]);

  if (!ordem) return null;

  const itens = ordem.itens || [];
  const subtotal = itens.reduce((acc, item) => acc + (item.valor_total || 0), 0);

  // Estilo para impressão A4
  if (tipo === 'a4') {
    return (
      <>
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 1cm;
            }
            
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            
            .os-print-container {
              width: 100%;
              max-width: 210mm;
              margin: 0 auto;
              font-family: 'Arial', sans-serif;
            }
          }
          
          .os-print-container {
            background: white;
            padding: 2rem;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            border-radius: 8px;
          }
          
          .os-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e293b;
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
          }
          
          .os-logo-section {
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          
          .os-logo {
            max-width: 120px;
            max-height: 80px;
            object-fit: contain;
          }
          
          .os-company-info h1 {
            font-size: 1.5rem;
            font-weight: bold;
            color: #1e293b;
            margin: 0;
          }
          
          .os-company-info p {
            font-size: 0.875rem;
            color: #64748b;
            margin: 0.25rem 0;
          }
          
          .os-number-section {
            text-align: right;
          }
          
          .os-number-label {
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .os-number {
            font-size: 2rem;
            font-weight: bold;
            color: #1e293b;
            line-height: 1;
          }
          
          .os-status {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-top: 0.5rem;
          }
          
          .status-em-andamento {
            background-color: #fef3c7;
            color: #92400e;
          }
          
          .status-finalizado {
            background-color: #d1fae5;
            color: #065f46;
          }
          
          .status-cancelado {
            background-color: #fee2e2;
            color: #991b1b;
          }
          
          .os-info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
          }
          
          .os-info-card {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 1rem;
          }
          
          .os-info-card h3 {
            font-size: 0.75rem;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 0 0 0.5rem 0;
          }
          
          .os-info-card p {
            font-size: 0.875rem;
            color: #1e293b;
            margin: 0.25rem 0;
          }
          
          .os-info-card .highlight {
            font-weight: 600;
            color: #0f172a;
          }
          
          .os-items-section {
            margin: 2rem 0;
          }
          
          .os-items-section h2 {
            font-size: 1.25rem;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 1rem;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 0.5rem;
          }
          
          .os-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
          }
          
          .os-table thead {
            background: #1e293b;
            color: white;
          }
          
          .os-table th {
            padding: 0.75rem;
            text-align: left;
            font-size: 0.875rem;
            font-weight: 600;
          }
          
          .os-table th:last-child,
          .os-table td:last-child {
            text-align: right;
          }
          
          .os-table tbody tr {
            border-bottom: 1px solid #e2e8f0;
          }
          
          .os-table tbody tr:hover {
            background: #f8fafc;
          }
          
          .os-table td {
            padding: 0.75rem;
            font-size: 0.875rem;
            color: #334155;
          }
          
          .os-totals {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0.5rem;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 2px solid #e2e8f0;
          }
          
          .os-total-row {
            display: flex;
            justify-content: space-between;
            width: 300px;
            font-size: 0.875rem;
          }
          
          .os-total-row.final {
            font-size: 1.25rem;
            font-weight: bold;
            color: #1e293b;
            border-top: 2px solid #1e293b;
            padding-top: 0.5rem;
          }
          
          .os-observations {
            background: #fffbeb;
            border: 2px solid #fcd34d;
            border-radius: 8px;
            padding: 1rem;
            margin: 2rem 0;
          }
          
          .os-observations h3 {
            font-size: 1rem;
            font-weight: 600;
            color: #92400e;
            margin: 0 0 0.5rem 0;
          }
          
          .os-observations p {
            font-size: 0.875rem;
            color: #78350f;
            line-height: 1.5;
            margin: 0;
            white-space: pre-wrap;
          }
          
          .os-footer {
            display: flex;
            justify-content: space-around;
            align-items: center;
            margin-top: 3rem;
            padding-top: 1.5rem;
            border-top: 2px solid #e2e8f0;
          }
          
          .os-signatures {
            display: flex;
            gap: 3rem;
            justify-content: center;
            width: 100%;
          }
          
          .os-signature {
            text-align: center;
          }
          
          .os-signature-line {
            width: 200px;
            border-top: 2px solid #1e293b;
            margin-bottom: 0.5rem;
          }
          
          .os-signature p {
            font-size: 0.75rem;
            color: #64748b;
            margin: 0;
          }
          
          .os-watermark {
            text-align: center;
            color: #cbd5e1;
            font-size: 0.75rem;
            margin-top: 2rem;
          }
        `}</style>

        <div className="os-print-container">
          {/* CABEÇALHO */}
          <div className="os-header">
            <div className="os-logo-section">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="os-logo" />
              )}
              <div className="os-company-info">
                <h1>{configuracoes?.nome_empresa || 'Empresa'}</h1>
                {configuracoes?.cnpj && <p>CNPJ: {configuracoes.cnpj}</p>}
                {configuracoes?.endereco && <p>{configuracoes.endereco}</p>}
                {configuracoes?.telefone && <p>Tel: {configuracoes.telefone}</p>}
              </div>
            </div>

            <div className="os-number-section">
              <div className="os-number-label">Ordem de Serviço</div>
              <div className="os-number">#{ordem.numero_os}</div>
              <span className={`os-status status-${ordem.status}`}>
                {ordem.status === 'em_andamento' && 'Em Andamento'}
                {ordem.status === 'finalizado' && 'Finalizado'}
                {ordem.status === 'cancelado' && 'Cancelado'}
              </span>
            </div>
          </div>

          {/* INFORMAÇÕES PRINCIPAIS */}
          <div className="os-info-grid">
            <div className="os-info-card">
              <h3>👤 Cliente</h3>
              <p className="highlight">{cliente?.nome || '—'}</p>
              {cliente?.cpf_cnpj && <p>CPF/CNPJ: {cliente.cpf_cnpj}</p>}
              {cliente?.telefone && <p>Tel: {cliente.telefone}</p>}
              {cliente?.email && <p>Email: {cliente.email}</p>}
            </div>

            <div className="os-info-card">
              <h3>🚗 Veículo</h3>
              {veiculo ? (
                <>
                  <p className="highlight">{[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ')}</p>
                  {veiculo.placa && <p>Placa: {veiculo.placa}</p>}
                  {veiculo.ano && <p>Ano: {veiculo.ano}</p>}
                  {veiculo.cor && <p>Cor: {veiculo.cor}</p>}
                </>
              ) : (
                <p>—</p>
              )}
            </div>

            <div className="os-info-card">
              <h3>📅 Datas</h3>
              <p><strong>Abertura:</strong> {formatDate(ordem.data_abertura)}</p>
              {ordem.data_conclusao && (
                <p><strong>Conclusão:</strong> {formatDate(ordem.data_conclusao)}</p>
              )}
            </div>

            <div className="os-info-card">
              <h3>👷 Responsáveis</h3>
              {funcionario?.nome && <p><strong>Técnico:</strong> {funcionario.nome}</p>}
              {vendedor?.nome && <p><strong>Vendedor:</strong> {vendedor.nome}</p>}
            </div>
          </div>

          {/* ITENS */}
          <div className="os-items-section">
            <h2>📋 Itens e Serviços</h2>
            <table className="os-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Qtd</th>
                  <th>Valor Unitário</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>
                      Nenhum item adicionado
                    </td>
                  </tr>
                ) : (
                  itens.map((item, index) => (
                    <tr key={index}>
                      <td>
                        {item.descricao}
                        {item.tipo === 'servico' && <span style={{ color: '#3b82f6', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Serviço</span>}
                        {item.tipo === 'produto' && <span style={{ color: '#10b981', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Produto</span>}
                      </td>
                      <td>{item.quantidade}</td>
                      <td>{formatCurrency(item.valor_unitario)}</td>
                      <td><strong>{formatCurrency(item.valor_total)}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="os-totals">
              <div className="os-total-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {ordem.outras_despesas > 0 && (
                <div className="os-total-row">
                  <span>Outras Despesas:</span>
                  <span>{formatCurrency(ordem.outras_despesas)}</span>
                </div>
              )}
              
              {ordem.desconto_valor > 0 && (
                <div className="os-total-row" style={{ color: '#dc2626' }}>
                  <span>Desconto:</span>
                  <span>- {formatCurrency(ordem.desconto_valor)}</span>
                </div>
              )}
              
              <div className="os-total-row final">
                <span>VALOR TOTAL:</span>
                <span>{formatCurrency(ordem.valor_total)}</span>
              </div>
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          {ordem.observacoes && (
            <div className="os-observations">
              <h3>📝 Observações</h3>
              <p>{ordem.observacoes}</p>
            </div>
          )}

          {/* RODAPÉ */}
          <div className="os-footer">
            <div className="os-signatures">
              <div className="os-signature">
                <div className="os-signature-line"></div>
                <p>Assinatura do Cliente</p>
              </div>
              <div className="os-signature">
                <div className="os-signature-line"></div>
                <p>Assinatura do Responsável</p>
              </div>
            </div>
          </div>

          <div className="os-watermark">
            <p>Documento emitido em {new Date().toLocaleString('pt-BR')}</p>
            <p>Sistema de Gestão - OS #{ordem.numero_os}</p>
          </div>
        </div>
      </>
    );
  }

  // Estilo para impressão Térmica (80mm)
  return (
    <>
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
        
        .os-termica-container {
          width: 80mm;
          padding: 5mm;
          font-family: 'Courier New', monospace;
          font-size: 10pt;
          line-height: 1.4;
        }
        
        .os-termica-header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 5mm;
          margin-bottom: 5mm;
        }
        
        .os-termica-header h1 {
          font-size: 14pt;
          font-weight: bold;
          margin: 0 0 2mm 0;
        }
        
        .os-termica-header p {
          margin: 1mm 0;
          font-size: 9pt;
        }
        
        .os-termica-section {
          margin: 3mm 0;
          padding: 2mm 0;
          border-bottom: 1px dashed #ccc;
        }
        
        .os-termica-section h3 {
          font-size: 10pt;
          font-weight: bold;
          margin: 0 0 2mm 0;
          text-transform: uppercase;
        }
        
        .os-termica-section p {
          margin: 1mm 0;
          font-size: 9pt;
        }
        
        .os-termica-table {
          width: 100%;
          font-size: 9pt;
          margin: 2mm 0;
        }
        
        .os-termica-table td {
          padding: 1mm 0;
        }
        
        .os-termica-total {
          font-size: 12pt;
          font-weight: bold;
          text-align: center;
          margin: 5mm 0;
          padding: 3mm;
          border: 2px solid #000;
        }
        
        .os-termica-footer {
          text-align: center;
          margin-top: 5mm;
          padding-top: 3mm;
          border-top: 2px dashed #000;
          font-size: 8pt;
        }
      `}</style>

      <div className="os-termica-container">
        {/* CABEÇALHO */}
        <div className="os-termica-header">
          <h1>{configuracoes?.nome_empresa || 'Empresa'}</h1>
          {configuracoes?.cnpj && <p>CNPJ: {configuracoes.cnpj}</p>}
          {configuracoes?.telefone && <p>Tel: {configuracoes.telefone}</p>}
          <p style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '3mm' }}>
            OS #{ordem.numero_os}
          </p>
        </div>

        {/* CLIENTE */}
        <div className="os-termica-section">
          <h3>CLIENTE</h3>
          <p><strong>{cliente?.nome || '—'}</strong></p>
          {cliente?.telefone && <p>Tel: {cliente.telefone}</p>}
        </div>

        {/* VEÍCULO */}
        {veiculo && (
          <div className="os-termica-section">
            <h3>VEÍCULO</h3>
            <p><strong>{[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ')}</strong></p>
            {veiculo.placa && <p>Placa: {veiculo.placa}</p>}
          </div>
        )}

        {/* ITENS */}
        <div className="os-termica-section">
          <h3>ITENS</h3>
          {itens.map((item, index) => (
            <div key={index} style={{ marginBottom: '2mm' }}>
              <p><strong>{item.descricao}</strong></p>
              <table className="os-termica-table">
                <tbody>
                  <tr>
                    <td>Qtd: {item.quantidade}</td>
                    <td>Unit: {formatCurrency(item.valor_unitario)}</td>
                    <td align="right"><strong>{formatCurrency(item.valor_total)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* TOTAL */}
        <div className="os-termica-total">
          TOTAL: {formatCurrency(ordem.valor_total)}
        </div>

        {/* RODAPÉ */}
        <div className="os-termica-footer">
          <p>{new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR')}</p>
          <p>_____________________________</p>
          <p>Assinatura do Cliente</p>
          <p style={{ marginTop: '3mm', fontSize: '7pt', color: '#666' }}>
            OS #{ordem.numero_os}
          </p>
        </div>
      </div>
    </>
  );
}