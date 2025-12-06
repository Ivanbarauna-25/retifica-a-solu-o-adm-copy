import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate, formatCompetencia } from '@/components/formatters';

export default function RelatorioAdiantamentos() {
  const [adiantamentos, setAdiantamentos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [configuracoes, setConfiguracoes] = useState(null);
  const [filtros, setFiltros] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const statusLabels = {
    'pendente': 'Pendente',
    'aprovado': 'Aprovado',
    'pago': 'Pago',
    'cancelado': 'Cancelado'
  };

  const statusColors = {
    'pendente': 'bg-amber-50 text-amber-700 border-amber-200',
    'aprovado': 'bg-blue-50 text-blue-700 border-blue-200',
    'pago': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'cancelado': 'bg-red-50 text-red-700 border-red-200'
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const filtrosJSON = urlParams.get('filtros');
      const adiantamentosJSON = urlParams.get('adiantamentos');

      if (filtrosJSON) {
        setFiltros(JSON.parse(decodeURIComponent(filtrosJSON)));
      }

      if (adiantamentosJSON) {
        const adiantamentosData = JSON.parse(decodeURIComponent(adiantamentosJSON));
        setAdiantamentos(adiantamentosData);
      }

      const [funcs, pcs, depts, configs] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.PlanoContas.list(),
        base44.entities.Departamento.list(),
        base44.entities.Configuracoes.list()
      ]);

      setFuncionarios(funcs || []);
      setPlanos(pcs || []);
      setDepartamentos(depts || []);
      setConfiguracoes(configs?.[0] || null);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFuncionarioNome = (id) => {
    if (!id) return 'Não encontrado';
    const func = funcionarios.find(f => f.id === id);
    return func?.nome || 'Não encontrado';
  };

  const getFuncionarioPix = (id) => {
    if (!id) return '-';
    const func = funcionarios.find(f => f.id === id);
    return func?.pix || '-';
  };

  const getDepartamentoNome = (funcionarioId) => {
    if (!funcionarioId) return '—';
    const func = funcionarios.find(f => f.id === funcionarioId);
    if (!func || !func.departamento_id) return '—';
    
    const dept = departamentos.find(d => d.id === func.departamento_id);
    return dept?.nome || '—';
  };

  const getPlanoNome = (id) => {
    const p = planos.find(p => p.id === id);
    return p ? (p.codigo ? `${p.codigo} - ${p.nome}` : p.nome) : '-';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  const totalGeral = adiantamentos.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
  const totalPago = adiantamentos.reduce((acc, a) => acc + (Number(a.valor_pago) || 0), 0);
  const totalRestante = adiantamentos.reduce((acc, a) => acc + ((Number(a.valor) || 0) - (Number(a.valor_pago) || 0)), 0);

  const getFiltrosAplicados = () => {
    const filtrosTexto = [];
    
    if (filtros.competencia) {
      filtrosTexto.push(`Competência: ${formatCompetencia(filtros.competencia)}`);
    }
    
    if (filtros.dataInicio && filtros.dataFim) {
      filtrosTexto.push(`Período: ${formatDate(filtros.dataInicio)} até ${formatDate(filtros.dataFim)}`);
    }
    
    if (filtros.status && filtros.status !== 'todos') {
      filtrosTexto.push(`Status: ${statusLabels[filtros.status] || filtros.status}`);
    }
    
    if (filtros.funcionarioNome && filtros.funcionarioNome !== 'Todos') {
      filtrosTexto.push(`Funcionário: ${filtros.funcionarioNome}`);
    }
    
    if (filtros.departamentoNome && filtros.departamentoNome !== 'Todos') {
      filtrosTexto.push(`Departamento: ${filtros.departamentoNome}`);
    }

    if (filtros.apenasAprovados) {
      filtrosTexto.push('Apenas Aprovados');
    }

    if (filtros.apenasPagos) {
      filtrosTexto.push('Apenas Pagos');
    }

    if (filtros.comPagamentoParcial) {
      filtrosTexto.push('Com Pagamento Parcial');
    }
    
    filtrosTexto.push(`Total de registros: ${adiantamentos.length}`);
    
    return filtrosTexto.join(' | ');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p>Carregando relatório...</p>
      </div>
    );
  }

  return (
    <div translate="no" className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        @media print {
          @page {
            size: A4 landscape;
            margin: 15mm 10mm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .report-container {
            page-break-inside: avoid;
          }
          
          .header-section {
            margin-bottom: 12px;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 10px;
          }
          
          .report-title {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          
          .filters-line {
            font-size: 9px;
            padding: 6px 0;
            border-top: 1px solid #e2e8f0;
            margin-top: 8px;
          }
          
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 8px;
            margin-top: 10px;
          }

          thead {
            display: table-row-group;
          }
          
          tfoot {
            display: table-row-group;
          }
          
          th {
            background: #1e293b !important;
            color: white !important;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 7px;
            letter-spacing: 0.5px;
            padding: 6px 4px !important;
            border: none !important;
          }
          
          td, tfoot td {
            padding: 5px 4px !important;
            border-bottom: 1px solid #f1f5f9 !important;
            color: #1e293b;
          }
          
          tfoot td {
            background: #1e293b !important;
            color: white !important;
            font-weight: 700;
            text-transform: uppercase;
            border: none !important;
            padding: 8px 4px !important;
          }
          
          tr:hover td {
            background-color: #f8fafc !important;
          }
          
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 7px;
            font-weight: 600;
            border: 1px solid;
          }
          
          .summary-box {
            margin-top: 12px;
            padding: 10px;
            background: #f8fafc;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          
          .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 9px;
          }
          
          .summary-total {
            border-top: 2px solid #1e293b;
            padding-top: 6px;
            margin-top: 6px;
            font-size: 11px;
            font-weight: 700;
          }
        }
        
        @media screen {
          .report-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 40px;
            background: white;
          }

          .header-section {
            margin-bottom: 12px;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 10px;
          }

          .company-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .company-name {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.5px;
            margin-bottom: 2px;
          }

          .company-details {
            font-size: 11px;
            color: #64748b;
            font-weight: 400;
            line-height: 1.2;
          }

          .report-title {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            text-align: center;
            margin: 12px 0;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }

          .filters-line {
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 11px;
            color: #475569;
            border: 1px solid #e2e8f0;
            margin-bottom: 12px;
          }

          .action-buttons {
            position: fixed;
            top: 24px;
            right: 24px;
            display: flex;
            gap: 12px;
            z-index: 1000;
          }

          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          th {
            background: #1e293b;
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
            padding: 14px 12px;
            text-align: left;
            border-bottom: 2px solid #0f172a;
          }

          td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
            color: #1e293b;
          }

          tfoot td {
            background: #1e293b;
            color: white;
            font-weight: 700;
            text-transform: uppercase;
            border: none;
            padding: 14px 12px;
          }

          tr:last-child td {
            border-bottom: none;
          }

          tr:hover td {
            background-color: #f8fafc;
          }

          .text-right {
            text-align: right;
          }

          .text-center {
            text-align: center;
          }

          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            border: 1px solid;
          }

          .truncate {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
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
          <div className="company-info">
            <div className="company-name">{configuracoes?.nome_empresa || "Nome da Empresa"}</div>
            {configuracoes?.cnpj && (
              <div className="company-details">CNPJ: {configuracoes.cnpj}</div>
            )}
            <div className="company-details">
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
        </div>

        {/* Título */}
        <div className="report-title">Relatório de Adiantamentos</div>

        {/* Filtros */}
        {getFiltrosAplicados() && (
          <div className="filters-line" translate="no">
            {getFiltrosAplicados()}
          </div>
        )}

        {/* Tabela */}
        <table translate="no">
          <thead>
            <tr>
              <th>Funcionário</th>
              <th className="text-center" style={{width: '80px'}}>Competência</th>
              <th className="text-center" style={{width: '80px'}}>Data</th>
              <th className="text-right" style={{width: '100px'}}>Valor</th>
              <th className="text-left" style={{width: '120px'}}>Pago Parcialmente</th>
              <th className="text-left" style={{width: '120px'}}>Valor a Receber</th>
              <th className="text-left" style={{width: '150px'}}>Chave PIX</th>
              <th className="truncate" style={{width: '150px'}}>Motivo</th>
              <th className="text-center" style={{width: '90px'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {adiantamentos.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center" style={{padding: '40px', color: '#94a3b8'}}>
                  Nenhum adiantamento encontrado com os filtros aplicados
                </td>
              </tr>
            ) : (
              adiantamentos.map((a) => {
                const valorPago = Number(a.valor_pago) || 0;
                const valorRestante = Number(a.valor) - valorPago;
                
                return (
                  <tr key={a.id}>
                    <td style={{fontWeight: 500}}>
                      {getFuncionarioNome(a.funcionario_id)}
                      {valorPago > 0 && valorRestante > 0 && (
                        <div style={{fontSize: '9px', color: '#ea580c', marginTop: '2px', fontWeight: 600}}>
                          Parcialmente Pago em {a.data_pagamento ? formatDate(a.data_pagamento) : '-'}
                        </div>
                      )}
                    </td>
                    <td className="text-center">{formatCompetencia(a.competencia)}</td>
                    <td className="text-center">{formatDate(a.data_adiantamento)}</td>
                    <td className="text-right" style={{fontWeight: 700}}>
                      {formatCurrency(a.valor)}
                    </td>
                    <td className="text-left" style={{color: '#059669', fontWeight: 600}}>
                      {valorPago > 0 ? formatCurrency(valorPago) : '-'}
                    </td>
                    <td className="text-left" style={{color: '#dc2626', fontWeight: 600}}>
                      {valorRestante > 0 ? formatCurrency(valorRestante) : '-'}
                    </td>
                    <td className="text-left" style={{color: '#475569', fontSize: '11px'}}>{getFuncionarioPix(a.funcionario_id)}</td>
                    <td className="truncate" style={{color: '#475569'}}>{a.motivo || '-'}</td>
                    <td className="text-center">
                      <span className={`status-badge ${statusColors[a.status]}`}>
                        {statusLabels[a.status]}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {adiantamentos.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} className="text-center font-bold uppercase text-white">TOTAIS</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalGeral)}</td>
                <td className="text-left font-bold text-emerald-400">{formatCurrency(totalPago)}</td>
                <td className="text-left font-bold text-red-400">{formatCurrency(totalRestante)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}