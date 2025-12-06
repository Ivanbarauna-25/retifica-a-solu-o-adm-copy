import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function Relatorio13SalarioPage() {
  const [folhas13, setFolhas13] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [configuracoes, setConfiguracoes] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const tipoParcelaLabels = {
    '1_parcela': '1ª Parcela',
    '2_parcela': '2ª Parcela',
    'parcela_unica': 'Parcela Única'
  };

  const statusLabels = {
    'gerado': 'Gerado',
    'editado': 'Editado',
    'pago': 'Pago',
    'cancelado': 'Cancelado'
  };

  const statusColors = {
    'gerado': 'bg-blue-50 text-blue-700 border-blue-200',
    'editado': 'bg-amber-50 text-amber-700 border-amber-200',
    'pago': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'cancelado': 'bg-red-50 text-red-700 border-red-200'
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const filtrosJSON = urlParams.get('filters');

        let filtrosObj = {};
        if (filtrosJSON) {
          filtrosObj = JSON.parse(decodeURIComponent(filtrosJSON));
          setFiltros(filtrosObj);
        }

        const [configData, funcsData, deptsData, todasFolhas13] = await Promise.all([
          base44.entities.Configuracoes.list(),
          base44.entities.Funcionario.list(),
          base44.entities.Departamento.list(),
          base44.entities.Folha13.list('-created_date', 1000)
        ]);

        setConfiguracoes(configData?.[0] || null);
        setFuncionarios(funcsData || []);
        setDepartamentos(deptsData || []);

        // Aplicar filtros
        let filtered = todasFolhas13 || [];

        if (filtrosObj.anoReferencia) {
          filtered = filtered.filter(f => f.ano_referencia === filtrosObj.anoReferencia);
        }

        if (filtrosObj.tipoParcela) {
          filtered = filtered.filter(f => f.tipo_parcela === filtrosObj.tipoParcela);
        }

        if (filtrosObj.status) {
          filtered = filtered.filter(f => f.status === filtrosObj.status);
        }

        if (filtrosObj.funcionarioId) {
          filtered = filtered.filter(f => f.funcionario_id === filtrosObj.funcionarioId);
        }

        if (filtrosObj.departamentoId) {
          const funcionariosDoDepartamento = funcsData.filter(func =>
            func.departamento_id === filtrosObj.departamentoId
          ).map(func => func.id);
          filtered = filtered.filter(f => funcionariosDoDepartamento.includes(f.funcionario_id));
        }

        if (!filtrosObj.incluirDemitidos) {
          const funcionariosAtivos = funcsData.filter(func => func.status === 'ativo').map(func => func.id);
          filtered = filtered.filter(f => funcionariosAtivos.includes(f.funcionario_id));
        }

        setFolhas13(filtered);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const getFuncionarioNome = (id) => {
    if (!id) return 'Não encontrado';
    const func = funcionarios.find(f => f.id === id);
    return func?.nome || 'Não encontrado';
  };

  const getDepartamentoNome = (funcionarioId) => {
    if (!funcionarioId) return '—';
    const func = funcionarios.find(f => f.id === funcionarioId);
    if (!func || !func.departamento_id) return '—';
    const dept = departamentos.find(d => d.id === func.departamento_id);
    return dept?.nome || '—';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  const totalGeral = folhas13.reduce((acc, f) => acc + (f.valor_liquido || 0), 0);
  const totalBruto = folhas13.reduce((acc, f) => acc + (f.valor_bruto || 0), 0);
  const totalINSS = folhas13.reduce((acc, f) => acc + (f.inss || 0), 0);
  const totalIRRF = folhas13.reduce((acc, f) => acc + (f.irrf || 0), 0);
  const totalSalarioBase = folhas13.reduce((acc, f) => acc + (f.salario_base || 0), 0);
  const totalMediaHE = folhas13.reduce((acc, f) => acc + (f.media_horas_extras || 0), 0);
  const totalMediaCom = folhas13.reduce((acc, f) => acc + (f.media_comissoes || 0), 0);

  const getFiltrosAplicados = () => {
    const filtrosTexto = [];

    if (filtros.anoReferencia) {
      filtrosTexto.push(`Ano: ${filtros.anoReferencia}`);
    }

    if (filtros.tipoParcela) {
      filtrosTexto.push(`Parcela: ${tipoParcelaLabels[filtros.tipoParcela] || filtros.tipoParcela}`);
    }

    if (filtros.status) {
      filtrosTexto.push(`Status: ${statusLabels[filtros.status] || filtros.status}`);
    }

    if (filtros.funcionarioNome) {
      filtrosTexto.push(`Funcionário: ${filtros.funcionarioNome}`);
    }

    if (filtros.departamentoNome) {
      filtrosTexto.push(`Departamento: ${filtros.departamentoNome}`);
    }

    filtrosTexto.push(`Total de registros: ${folhas13.length}`);

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
        <div className="report-title">Relatório de 13º Salário</div>

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
              <th>Departamento</th>
              <th className="text-center">Ano</th>
              <th className="text-center">Parcela</th>
              <th className="text-center">Avos</th>
              <th className="text-right">Sal. Base</th>
              <th className="text-right">Média H.E.</th>
              <th className="text-right">Média Com.</th>
              <th className="text-right">Valor Bruto</th>
              <th className="text-right" style={{ color: '#ef4444' }}>INSS</th>
              <th className="text-right" style={{ color: '#ef4444' }}>IRRF</th>
              <th className="text-right">Líquido</th>
              <th className="text-center">Data Pag.</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {folhas13.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center" style={{ padding: '40px', color: '#94a3b8' }}>
                  Nenhum lançamento de 13º encontrado com os filtros aplicados
                </td>
              </tr>
            ) : (
              folhas13.map((folha) => (
                <tr key={folha.id}>
                  <td style={{ fontWeight: 500 }}>{getFuncionarioNome(folha.funcionario_id)}</td>
                  <td style={{ color: '#64748b' }}>{getDepartamentoNome(folha.funcionario_id)}</td>
                  <td className="text-center">{folha.ano_referencia}</td>
                  <td className="text-center">
                    <span style={{ color: '#6366f1', fontWeight: 600 }}>
                      {tipoParcelaLabels[folha.tipo_parcela]}
                    </span>
                  </td>
                  <td className="text-center">
                    <span style={{ color: '#3b82f6', fontWeight: 600 }}>
                      {folha.avos_editados ?? folha.avos_calculados}/12
                    </span>
                  </td>
                  <td className="text-right">{formatCurrency(folha.salario_base)}</td>
                  <td className="text-right">{formatCurrency(folha.media_horas_extras)}</td>
                  <td className="text-right">{formatCurrency(folha.media_comissoes)}</td>
                  <td className="text-right" style={{ fontWeight: 600 }}>
                    {formatCurrency(folha.valor_bruto)}
                  </td>
                  <td className="text-right" style={{ fontWeight: 600, color: '#ef4444' }}>
                    {formatCurrency(folha.inss)}
                  </td>
                  <td className="text-right" style={{ fontWeight: 600, color: '#ef4444' }}>
                    {formatCurrency(folha.irrf)}
                  </td>
                  <td className="text-right" style={{ fontWeight: 700 }}>
                    {formatCurrency(folha.valor_liquido)}
                  </td>
                  <td className="text-center">{formatDate(folha.data_pagamento)}</td>
                  <td className="text-center">
                    <span className={`status-badge ${statusColors[folha.status]}`}>
                      {statusLabels[folha.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {folhas13.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} className="text-center font-bold uppercase text-white">TOTAIS</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalSalarioBase)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalMediaHE)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalMediaCom)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalBruto)}</td>
                <td className="text-right font-bold" style={{ color: '#ef4444' }}>{formatCurrency(totalINSS)}</td>
                <td className="text-right font-bold" style={{ color: '#ef4444' }}>{formatCurrency(totalIRRF)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalGeral)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Resumo por tipo de parcela */}
        {folhas13.length > 0 && filtros.mostrarTotais !== false && (
          <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {['1_parcela', '2_parcela', 'parcela_unica'].map(tipo => {
              const folhasTipo = folhas13.filter(f => f.tipo_parcela === tipo);
              if (folhasTipo.length === 0) return null;
              const totalTipo = folhasTipo.reduce((sum, f) => sum + (f.valor_liquido || 0), 0);
              return (
                <div key={tipo} style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{tipoParcelaLabels[tipo]}</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(totalTipo)}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>{folhasTipo.length} lançamento(s)</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}