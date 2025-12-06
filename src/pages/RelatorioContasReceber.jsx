import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { formatCurrency, formatDate, formatCompetencia } from '@/components/formatters';

const printStyles = `
  @media print {
    @page { 
      size: A4 landscape; 
      margin: 0.3cm 0.6cm 0.6cm 0.6cm; 
    }
    html, body {
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .printable-content {
      font-size: 10px;
      padding: 8px !important;
    }

    h1 { font-size: 16px !important; }
    h2 { font-size: 14px !important; }

    .print-table thead { display: table-header-group; }
    .print-table tfoot { display: table-footer-group; }

    .print-table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
    .print-table tr { page-break-inside: avoid; break-inside: avoid; }
    .print-table td, .print-table th { page-break-inside: avoid; padding: 4px 6px; border: 1px solid #ddd; }

    .table-wrapper { overflow: visible !important; }

    .bg-slate-700 { background-color: #334155 !important; }
    .text-white { color: #ffffff !important; }
    .bg-slate-50 { background-color: #f8fafc !important; }
    .border { border-color: #e5e7eb !important; }

    .report-header { margin-top: 0.2cm !important; margin-bottom: 0.08rem !important; }
    .report-title { margin-top: 0.03rem !important; margin-bottom: 0.08rem !important; }
    .report-filters { margin-top: 0.06rem !important; margin-bottom: 0.1rem !important; }
  }

  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  .print-table th, .print-table td {
    border: 1px solid #e5e7eb;
    padding: 0.35rem 0.5rem;
    text-align: left;
  }
  .print-table th {
    background-color: #334155;
    color: #ffffff;
    font-weight: 600;
  }
  .print-table tbody tr:nth-child(even) {
    background-color: #f9fafb;
  }
  .print-table .total-row {
    background-color: #334155;
    color: #ffffff;
    font-weight: 700;
  }
  .text-right { text-align: right; }
  .small-text { font-size: 0.85rem; }
`;

export default function RelatorioContasReceberPage() {
  const [contas, setContas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [planosContas, setPlanosContas] = useState([]);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const filterClienteId = urlParams.get('cliente_id') || '';
  const filterStatus = urlParams.get('status') || '';
  const filterPlanoContasId = urlParams.get('plano_contas_id') || '';
  const filterInicio = urlParams.get('data_inicio') || '';
  const filterFim = urlParams.get('data_fim') || '';
  const ordenacao = urlParams.get('ordenacao') || 'data_vencimento';

  const statusColors = {
    'pendente': 'bg-yellow-100 text-yellow-800',
    'recebido': 'bg-green-100 text-green-800',
    'vencido': 'bg-red-100 text-red-800',
    'cancelado': 'bg-gray-100 text-gray-800'
  };

  const statusLabels = {
    'pendente': 'Pendente',
    'recebido': 'Recebido',
    'vencido': 'Vencido',
    'cancelado': 'Cancelado'
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [contasData, clientesData, planosData, configData] = await Promise.all([
      base44.entities.ContasReceber.list('-created_date'),
      base44.entities.Cliente.list(),
      base44.entities.PlanoContas.list(),
      base44.entities.Configuracoes.list()
    ]);

    let contasFiltradas = contasData;

    if (filterClienteId) {
      contasFiltradas = contasFiltradas.filter(c => c.cliente_id === filterClienteId);
    }

    if (filterStatus) {
      contasFiltradas = contasFiltradas.filter(c => c.status === filterStatus);
    }

    if (filterPlanoContasId) {
      contasFiltradas = contasFiltradas.filter(c => c.plano_contas_id === filterPlanoContasId);
    }

    if (filterInicio) {
      contasFiltradas = contasFiltradas.filter(c => c.data_vencimento >= filterInicio);
    }

    if (filterFim) {
      contasFiltradas = contasFiltradas.filter(c => c.data_vencimento <= filterFim);
    }

    if (ordenacao === 'cliente') {
      contasFiltradas.sort((a, b) => {
        const cliA = clientesData.find(c => c.id === a.cliente_id)?.nome || '';
        const cliB = clientesData.find(c => c.id === b.cliente_id)?.nome || '';
        return cliA.localeCompare(cliB);
      });
    } else if (ordenacao === 'valor') {
      contasFiltradas.sort((a, b) => (b.valor_original || 0) - (a.valor_original || 0));
    } else if (ordenacao === 'categoria') {
      contasFiltradas.sort((a, b) => {
        const planoA = planosData.find(p => p.id === a.plano_contas_id)?.nome || '';
        const planoB = planosData.find(p => p.id === b.plano_contas_id)?.nome || '';
        return planoA.localeCompare(planoB);
      });
    } else {
      contasFiltradas.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
    }

    setContas(contasFiltradas);
    setClientes(clientesData);
    setPlanosContas(planosData);
    setConfig((configData && configData[0]) || null);
    setIsLoading(false);
  };

  const getClienteNome = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nome : 'N/A';
  };

  const getPlanoContasNome = (planoId) => {
    const plano = planosContas.find(p => p.id === planoId);
    return plano ? `${plano.codigo} - ${plano.nome}` : 'N/A';
  };

  const totalOriginal = contas.reduce((total, c) => total + (c.valor_original || 0), 0);
  const totalRecebido = contas.reduce((total, c) => total + (c.valor_recebido || 0), 0);

  return (
    <div translate="no" className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; }

        @media print {
          @page { size: A4 landscape; margin: 15mm 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .report-container { page-break-inside: avoid; }
          .header-section { margin-bottom: 12px; border-bottom: 2px solid #1e293b; padding-bottom: 10px; }
          .report-title { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
          .filters-line { font-size: 9px; padding: 6px 0; border-top: 1px solid #e2e8f0; margin-top: 8px; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 8px; margin-top: 10px; }
          thead, tfoot { display: table-row-group; }
          th { background: #1e293b !important; color: white !important; font-weight: 600; text-transform: uppercase; font-size: 7px; letter-spacing: 0.5px; padding: 6px 4px !important; border: none !important; }
          td, tfoot td { padding: 5px 4px !important; border-bottom: 1px solid #f1f5f9 !important; color: #1e293b; }
          tfoot td { background: #1e293b !important; color: white !important; font-weight: 700; text-transform: uppercase; border: none !important; padding: 8px 4px !important; }
          tr:hover td { background-color: #f8fafc !important; }
          .status-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 7px; font-weight: 600; border: 1px solid; }
        }

        @media screen {
          .report-container { max-width: 1600px; margin: 0 auto; padding: 40px; background: white; }
          .header-section { margin-bottom: 12px; border-bottom: 2px solid #1e293b; padding-bottom: 10px; }
          .company-info { display: flex; flex-direction: column; gap: 4px; }
          .company-name { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 2px; }
          .company-details { font-size: 11px; color: #64748b; font-weight: 400; line-height: 1.2; }
          .report-title { font-size: 18px; font-weight: 700; color: #0f172a; text-align: center; margin: 12px 0; letter-spacing: 0.5px; text-transform: uppercase; }
          .filters-line { background: #f8fafc; padding: 8px 12px; border-radius: 6px; font-size: 11px; color: #475569; border: 1px solid #e2e8f0; margin-bottom: 12px; }
          .action-buttons { position: fixed; top: 24px; right: 24px; display: flex; gap: 12px; z-index: 1000; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); }
          th { background: #1e293b; color: white; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; padding: 14px 12px; text-align: left; border-bottom: 2px solid #0f172a; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; }
          tfoot td { background: #1e293b; color: white; font-weight: 700; text-transform: uppercase; border: none; padding: 14px 12px; }
          tr:last-child td { border-bottom: none; }
          tr:hover td { background-color: #f8fafc; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .status-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; border: 1px solid; }
        }
      `}</style>
      
      <div className="action-buttons no-print">
        <Button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-white shadow-lg">
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
      </div>

      <div className="report-container" translate="no">
        <div className="header-section">
          <div className="company-info">
            <div className="company-name">{config?.nome_empresa || "Relatório de Contas a Receber"}</div>
            {config?.cnpj && <div className="company-details">CNPJ: {config.cnpj}</div>}
            <div className="company-details">Gerado em {new Date().toLocaleString("pt-BR")}</div>
          </div>
        </div>

        <div className="report-title">Relatório de Contas a Receber</div>

        <div className="filters-line" translate="no">
          <div className="flex gap-4 flex-wrap">
            {filterClienteId && <span>Cliente: {getClienteNome(filterClienteId)}</span>}
            {filterStatus && <span>Status: {statusLabels[filterStatus]}</span>}
            {filterPlanoContasId && <span>Categoria: {getPlanoContasNome(filterPlanoContasId)}</span>}
            {filterInicio && <span>De: {formatDate(filterInicio)}</span>}
            {filterFim && <span>Até: {formatDate(filterFim)}</span>}
            <span>Total de registros: {contas.length}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Carregando relatório...</p>
          </div>
        ) : (
          <>
            <table translate="no">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Nº Doc</th>
                  <th>Cliente</th>
                  <th>Categoria</th>
                  <th>Competência</th>
                  <th>Vencimento</th>
                  <th className="text-right">Valor Original</th>
                  <th className="text-right">Valor Recebido</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contas.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center text-gray-500" style={{padding: '40px'}}>
                      Nenhuma conta encontrada com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  contas.map((conta) => (
                    <tr key={conta.id}>
                      <td>{conta.descricao}</td>
                      <td>{conta.numero_documento || '-'}</td>
                      <td>{getClienteNome(conta.cliente_id)}</td>
                      <td className="small-text">{getPlanoContasNome(conta.plano_contas_id)}</td>
                      <td>{conta.competencia ? formatCompetencia(conta.competencia) : '-'}</td>
                      <td>{formatDate(conta.data_vencimento)}</td>
                      <td className="text-right">{formatCurrency(conta.valor_original)}</td>
                      <td className="text-right">{formatCurrency(conta.valor_recebido || 0)}</td>
                      <td>
                        <span className={`status-badge ${statusColors[conta.status]}`}>
                          {statusLabels[conta.status]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="6" className="text-center font-bold uppercase text-white">TOTAIS</td>
                  <td className="text-right font-bold text-white">{formatCurrency(totalOriginal)}</td>
                  <td className="text-right font-bold text-white">{formatCurrency(totalRecebido)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    </div>
  );
}