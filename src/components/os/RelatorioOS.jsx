import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function RelatorioOS({
  isOpen, // This prop is no longer used for the Dialog, but can remain if needed for other logic
  onClose,
  ordens,
  getContatoNome,
  getVeiculoInfo,
  getFuncionarioNome,
  statusLabels,
  statusColors,
  nomeEmpresa,
  cnpj,
  filtros = {}
}) {

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    onClose();
  };

  const totalGeral = ordens.reduce((acc, os) => acc + (os.valor_total || 0), 0);
  const totalProdutos = ordens.reduce((acc, os) => {
    const produtos = (os.itens || [])
      .filter(item => item.tipo === 'produto')
      .reduce((sum, item) => sum + (item.valor_total || 0), 0);
    return acc + produtos;
  }, 0);
  const totalServicos = ordens.reduce((acc, os) => {
    const servicos = (os.itens || [])
      .filter(item => item.tipo === 'servico')
      .reduce((sum, item) => sum + (item.valor_total || 0), 0);
    return acc + servicos;
  }, 0);
  const totalDespesas = ordens.reduce((acc, os) => acc + (os.outras_despesas || 0), 0);
  const totalDescontos = ordens.reduce((acc, os) => acc + (os.desconto_valor || 0), 0);
  const totalLiquido = totalGeral - totalDespesas;
  const margemGeralPercentual = totalGeral > 0 ? ((totalLiquido / totalGeral) * 100) : 0;

  // Formatar filtros aplicados
  const getFiltrosAplicados = () => {
    const filtrosTexto = [];
    
    if (filtros.dataInicio && filtros.dataFim) {
      filtrosTexto.push(`De: ${formatDate(filtros.dataInicio)} até ${formatDate(filtros.dataFim)}`);
    } else if (filtros.dataInicio) {
      filtrosTexto.push(`A partir de: ${formatDate(filtros.dataInicio)}`);
    } else if (filtros.dataFim) {
      filtrosTexto.push(`Até: ${formatDate(filtros.dataFim)}`);
    }
    
    if (filtros.status && filtros.status !== 'todos') {
      filtrosTexto.push(`Status: ${statusLabels[filtros.status] || filtros.status}`);
    }
    
    if (filtros.clienteNome) {
      filtrosTexto.push(`Cliente: ${filtros.clienteNome}`);
    }
    
    if (filtros.vendedorNome) {
      filtrosTexto.push(`Vendedor: ${filtros.vendedorNome}`);
    }
    
    if (filtros.responsavelNome) {
      filtrosTexto.push(`Responsável: ${filtros.responsavelNome}`);
    }
    
    if (filtros.numeroOS) {
      filtrosTexto.push(`Nº OS: ${filtros.numeroOS}`);
    }
    
    if (filtros.somenteCanceladas) {
      filtrosTexto.push(`Situação: Somente canceladas`);
    }
    
    filtrosTexto.push(`Total de registros: ${ordens.length}`);
    
    return filtrosTexto.join(' | ');
  };

  return (
    <>
      <style>{`
        /* PRINT STYLES */
        @media print {
          body * { visibility: hidden; }
          .report-container, .report-container * { visibility: visible; }
          .report-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: auto; 
            margin: 0; 
            padding: 1cm; 
          }
          @page { 
            size: A4 landscape; 
            margin: 0.5cm; 
          }
          .no-print { display: none !important; }
          
          .header-section { 
            text-align: center; 
            margin-bottom: 20px; 
            padding-bottom: 15px; 
            border-bottom: 1px solid #e2e8f0; /* Added for visual separation in print */
          }
          
          .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
          }
          
          .company-details {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 8px;
          }
          
          .report-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
            margin: 16px 0 12px 0;
            text-align: center;
          }
          
          .filters-line {
            font-size: 10px;
            color: #475569;
            margin-bottom: 16px;
            text-align: center;
            padding: 8px;
            background-color: #f8fafc;
            border-radius: 4px;
          }
          
          table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            font-size: 9px !important; 
            margin-top: 12px;
          }
          
          th, td { 
            padding: 6px 4px !important; 
            border: 1px solid #e2e8f0 !important; 
            text-align: left !important; 
          }
          
          th { 
            background-color: #1e293b !important; 
            color: white !important;
            font-weight: 600 !important;
            text-transform: uppercase;
            font-size: 8px !important;
            letter-spacing: 0.5px;
          }
          
          td {
            background-color: white !important;
            color: #1e293b !important;
          }
          
          tr:nth-child(even) td {
            background-color: #f8fafc !important;
          }
          
          .text-right {
            text-align: right !important;
          }
          
          .text-center {
            text-align: center !important;
          }
          
          .summary-box {
            margin-top: 16px;
            text-align: right;
            font-size: 12px;
            font-weight: bold;
            color: #1e293b;
            padding: 8px;
            background-color: #f1f5f9;
            border-radius: 4px;
          }

          .summary-item {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
          }
          
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: 600;
          }
          
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
        }
        
        /* SCREEN STYLES */
        .action-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin: 1rem;
        }

        .report-container {
          padding: 2rem;
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          margin: 2rem auto; /* Center the report and add some margin */
          max-width: 95vw; /* Ensure it doesn't get too wide on large screens */
        }
        
        .header-section {
          text-align: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .company-name {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }
        
        .company-details {
          font-size: 0.875rem;
          color: #64748b;
          margin-bottom: 0.5rem;
        }
        
        .report-title {
          font-size: 1.25rem;
          font-weight: bold;
          color: #1e293b;
          margin: 1rem 0 0.75rem 0;
          text-align: center;
        }
        
        .filters-line {
          font-size: 0.75rem;
          color: #475569;
          margin-bottom: 1rem;
          text-align: center;
          padding: 0.5rem;
          background-color: #f8fafc;
          border-radius: 0.375rem;
        }
        
        .summary-box {
          margin-top: 1rem;
          text-align: right;
          font-size: 1rem;
          font-weight: bold;
          color: #1e293b;
          padding: 0.75rem;
          background-color: #f1f5f9;
          border-radius: 0.375rem;
        }

        .summary-item {
          display: flex;
          justify-content: flex-end;
          gap: 1.5rem;
        }
        
        /* Table styles for screen */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          font-size: 0.875rem;
        }

        th, td {
          padding: 0.75rem 0.5rem;
          border: 1px solid #e2e8f0;
          text-align: left;
        }

        th {
          background-color: #f8fafc;
          font-weight: 600;
          color: #1e293b;
          text-transform: uppercase;
        }

        tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
        }
      `}</style>
      
      {/* Botões de ação - apenas na tela */}
      <div className="action-buttons no-print">
        <Button 
          onClick={handlePrint} 
          className="bg-slate-800 hover:bg-slate-700 text-white shadow-lg"
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Button 
          onClick={handleClose} 
          variant="outline"
          className="border-slate-300 hover:bg-slate-50 shadow-lg"
        >
          <X className="mr-2 h-4 w-4" />
          Fechar
        </Button>
      </div>

      <div className="report-container" translate="no">
        {/* Cabeçalho */}
        <div className="header-section">
          <div className="company-name" translate="no">{nomeEmpresa || "Nome da Empresa"}</div>
          {cnpj && (
            <div className="company-details" translate="no">CNPJ: {cnpj}</div>
          )}
          <div className="company-details" translate="no">
            Gerado em: {new Date().toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })} às {new Date().toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>

        {/* Título */}
        <div className="report-title" translate="no">Relatório de Ordens de Serviço</div>

        {/* Filtros */}
        {getFiltrosAplicados() && (
          <div className="filters-line" translate="no">
            {getFiltrosAplicados()}
          </div>
        )}

        {/* Tabela */}
        <table>
          <thead>
            <tr>
              <th translate="no">Nº OS</th>
              <th className="text-center" translate="no">Data Abertura</th>
              <th className="text-center" translate="no">Data Conclusão</th>
              <th translate="no">Cliente</th>
              <th translate="no">Veículo</th>
              <th translate="no">Responsável</th>
              <th translate="no">Vendedor</th>
              <th className="text-right" translate="no">Produtos</th>
              <th className="text-right" translate="no">Serviços</th>
              <th className="text-right" translate="no">Desconto</th>
              <th className="text-right" translate="no">Valor Total Cliente</th>
              <th className="text-right" translate="no">Despesas</th>
              <th className="text-right" translate="no">Valor Líquido Empresa</th>
              <th className="text-right" translate="no">Margem %</th>
              <th className="text-center" translate="no">Status</th>
            </tr>
          </thead>
          <tbody>
            {ordens.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center" style={{padding: '40px', color: '#94a3b8'}} translate="no">
                  Nenhuma ordem de serviço encontrada com os filtros aplicados
                </td>
              </tr>
            ) : (
              ordens.map((ordem) => {
                const valorProdutos = (ordem.itens || [])
                  .filter(item => item.tipo === 'produto')
                  .reduce((sum, item) => sum + (item.valor_total || 0), 0);
                
                const valorServicos = (ordem.itens || [])
                  .filter(item => item.tipo === 'servico')
                  .reduce((sum, item) => sum + (item.valor_total || 0), 0);
                
                const valorDespesas = ordem.outras_despesas || 0;
                const valorDesconto = ordem.desconto_valor || 0;
                const valorTotal = ordem.valor_total || 0;
                const valorLiquido = valorTotal - valorDespesas;
                const margemPercentual = valorTotal > 0 ? ((valorLiquido / valorTotal) * 100) : 0;

                return (
                  <tr key={ordem.id}>
                    <td style={{fontWeight: 500}} translate="no">{ordem.numero_os}</td>
                    <td className="text-center" translate="no">{formatDate(ordem.data_abertura)}</td>
                    <td className="text-center" translate="no">{ordem.data_conclusao ? formatDate(ordem.data_conclusao) : '—'}</td>
                    <td translate="no">{getContatoNome(ordem)}</td>
                    <td style={{color: '#64748b'}} translate="no">{getVeiculoInfo(ordem.veiculo_id)}</td>
                    <td translate="no">{getFuncionarioNome ? getFuncionarioNome(ordem.funcionario_id) : '—'}</td>
                    <td translate="no">{getFuncionarioNome && ordem.vendedor_id ? getFuncionarioNome(ordem.vendedor_id) : '—'}</td>
                    <td className="text-right" translate="no">{formatCurrency(valorProdutos)}</td>
                    <td className="text-right" translate="no">{formatCurrency(valorServicos)}</td>
                    <td className="text-right" translate="no">{formatCurrency(valorDesconto)}</td>
                    <td className="text-right" style={{fontWeight: 600}} translate="no">{formatCurrency(valorTotal)}</td>
                    <td className="text-right" translate="no">{formatCurrency(valorDespesas)}</td>
                    <td className="text-right" style={{color: '#10b981', fontWeight: 600}} translate="no">{formatCurrency(valorLiquido)}</td>
                    <td className="text-right" style={{color: margemPercentual >= 0 ? '#10b981' : '#ef4444', fontWeight: 600}} translate="no">{margemPercentual.toFixed(1)}%</td>
                    <td className="text-center">
                      <span className={`status-badge ${statusColors[ordem.status]}`} translate="no">
                        {statusLabels[ordem.status]}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Resumo */}
        {ordens.length > 0 && (
          <div className="summary-box" translate="no">
            <div className="summary-item">
              <span>Total Produtos:</span>
              <span>{formatCurrency(totalProdutos)}</span>
            </div>
            <div className="summary-item">
              <span>Total Serviços:</span>
              <span>{formatCurrency(totalServicos)}</span>
            </div>
            <div className="summary-item">
              <span>Total Despesas:</span>
              <span style={{color: '#ef4444'}}>{formatCurrency(totalDespesas)}</span>
            </div>
            <div className="summary-item">
              <span>Total Descontos:</span>
              <span style={{color: '#ef4444'}}>{formatCurrency(totalDescontos)}</span>
            </div>
            <div className="summary-item" style={{borderTop: '2px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.5rem'}}>
              <span>Total Geral (Cliente):</span>
              <span style={{fontSize: '1.2rem'}}>{formatCurrency(totalGeral)}</span>
            </div>
            <div className="summary-item">
              <span>Total Líquido (Empresa):</span>
              <span style={{color: '#10b981', fontSize: '1.2rem', fontWeight: 'bold'}}>{formatCurrency(totalLiquido)}</span>
            </div>
            <div className="summary-item">
              <span>Margem Geral:</span>
              <span style={{color: margemGeralPercentual >= 0 ? '#10b981' : '#ef4444', fontSize: '1.2rem', fontWeight: 'bold'}}>{margemGeralPercentual.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}