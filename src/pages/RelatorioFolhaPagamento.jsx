import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate, formatCompetencia } from '@/components/formatters';

export default function RelatorioFolhaPagamentoPage() {
  const [folhas, setFolhas] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [configuracoes, setConfiguracoes] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const statusLabels = {
    'pendente': 'Pendente',
    'pago': 'Pago'
  };

  const statusColors = {
    'pendente': 'bg-amber-50 text-amber-700 border-amber-200',
    'pago': 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        let filtrosJSON = urlParams.get('filtros');
        const folhasJSON = urlParams.get('folhas');

        let filtrosObj = {};
        if (filtrosJSON) {
          // Decodificar duas vezes pois foi codificado duas vezes (uma vez pelo JSON.stringify e outra pelo encodeURIComponent)
          try {
            filtrosObj = JSON.parse(decodeURIComponent(decodeURIComponent(filtrosJSON)));
          } catch {
            // Fallback: tentar decodificar apenas uma vez
            try {
              filtrosObj = JSON.parse(decodeURIComponent(filtrosJSON));
            } catch {
              filtrosObj = JSON.parse(filtrosJSON);
            }
          }
          setFiltros(filtrosObj);
        }

        let folhasData = null;
        if (folhasJSON) {
          folhasData = JSON.parse(decodeURIComponent(folhasJSON));
        }

        const [configData, funcsData, deptsData, todasFolhas] = await Promise.all([
          base44.entities.Configuracoes.list(),
          base44.entities.Funcionario.list(),
          base44.entities.Departamento.list(),
          base44.entities.FolhaPagamento.list('-created_date', 1000)
        ]);

        setConfiguracoes(configData?.[0] || null);
        setFuncionarios(funcsData || []);
        setDepartamentos(deptsData || []);

        // Usar IDs filtrados que vieram do modal
        if (filtrosObj && filtrosObj.folhas && Array.isArray(filtrosObj.folhas) && filtrosObj.folhas.length > 0) {
          const ids = filtrosObj.folhas;
          const filtered = (todasFolhas || []).filter(f => ids.includes(f.id));
          setFolhas(filtered);
        } else if (folhasData && folhasData.length > 0) {
          // Fallback: usar dados passados diretamente na URL (caso antigo)
          setFolhas(folhasData);
        } else {
          // Fallback final: aplicar filtros manualmente
          let filtered = todasFolhas || [];
          
          if (filtrosObj.competencia && filtrosObj.competencia !== '') {
            filtered = filtered.filter(f => f.competencia === filtrosObj.competencia);
          }
          
          if (filtrosObj.status && filtrosObj.status !== '' && filtrosObj.status !== 'todos') {
            filtered = filtered.filter(f => f.status_pagamento === filtrosObj.status);
          }
          
          if (filtrosObj.funcionarioId && filtrosObj.funcionarioId !== '' && filtrosObj.funcionarioId !== 'todos') {
            filtered = filtered.filter(f => f.funcionario_id === filtrosObj.funcionarioId);
          }
          
          if (filtrosObj.departamentoId && filtrosObj.departamentoId !== '' && filtrosObj.departamentoId !== 'todos') {
            const funcionariosDoDepartamento = funcsData.filter((func) =>
              func.departamento_id === filtrosObj.departamentoId
            ).map((func) => func.id);
            filtered = filtered.filter(f => funcionariosDoDepartamento.includes(f.funcionario_id));
          }

          if (filtrosObj.dataInicio && filtrosObj.dataInicio !== '') {
            filtered = filtered.filter(f => f.data_pagamento && f.data_pagamento >= filtrosObj.dataInicio);
          }

          if (filtrosObj.dataFim && filtrosObj.dataFim !== '') {
            filtered = filtered.filter(f => f.data_pagamento && f.data_pagamento <= filtrosObj.dataFim);
          }

          if (filtrosObj.apenasComProporcional) {
            filtered = filtered.filter(f => f.dias_trabalhados > 0);
          }
          
          setFolhas(filtered);
        }
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

  const totalSalarioBase = folhas.reduce((acc, f) => acc + (f.salario_base || 0), 0);
  const totalComissoes = folhas.reduce((acc, f) => acc + (f.comissoes || 0), 0);
  const totalHorasExtras = folhas.reduce((acc, f) => acc + (f.horas_extras || 0), 0);
  const totalBonus = folhas.reduce((acc, f) => acc + (f.bonus || 0), 0);
  const totalOutrasEntradas = folhas.reduce((acc, f) => acc + (f.outras_entradas || 0), 0);
  const totalAdiantamentos = folhas.reduce((acc, f) => acc + (f.adiantamentos || 0), 0);
  const totalFaltas = folhas.reduce((acc, f) => acc + (f.faltas || 0), 0);
  const totalEncargos = folhas.reduce((acc, f) => acc + (f.encargos || 0), 0);
  const totalOutrasSaidas = folhas.reduce((acc, f) => acc + (f.outras_saidas || 0), 0);
  const totalLiquido = folhas.reduce((acc, f) => acc + (f.salario_liquido || 0), 0);
  const totalBruto = totalSalarioBase + totalComissoes + totalHorasExtras + totalBonus + totalOutrasEntradas;
  const totalDescontos = totalAdiantamentos + totalFaltas + totalEncargos + totalOutrasSaidas;

  const getFiltrosAplicados = () => {
    const filtrosTexto = [];
    
    if (filtros.competencia) {
      filtrosTexto.push(`Competência: ${formatCompetencia(filtros.competencia)}`);
    }
    
    if (filtros.dataInicio && filtros.dataFim) {
      filtrosTexto.push(`Pagamento: ${formatDate(filtros.dataInicio)} até ${formatDate(filtros.dataFim)}`);
    }
    
    if (filtros.status && filtros.status !== 'todos') {
      filtrosTexto.push(`Status: ${statusLabels[filtros.status] || filtros.status}`);
    }
    
    if (filtros.funcionarioNome) {
      filtrosTexto.push(`Funcionário: ${filtros.funcionarioNome}`);
    }
    
    if (filtros.departamentoNome) {
      filtrosTexto.push(`Departamento: ${filtros.departamentoNome}`);
    }
    
    filtrosTexto.push(`Total de registros: ${folhas.length}`);
    
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
          
          .summary-box {
            margin-top: 32px;
            padding: 24px;
            background: linear-gradient(to bottom, #f8fafc, #ffffff);
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          
          .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
            color: #475569;
          }
          
          .summary-total {
            border-top: 2px solid #1e293b;
            padding-top: 16px;
            margin-top: 12px;
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
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
        <div className="report-title">Relatório de Folha de Pagamento</div>

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
              <th className="text-center">Competência</th>
              <th className="text-right">Sal. Base</th>
              <th className="text-right">Comissões</th>
              <th className="text-right">H. Extras</th>
              <th className="text-right">Bônus</th>
              <th className="text-right">Outras Entradas</th>
              <th className="text-right" style={{color: '#ef4444'}}>Adiant.</th>
              <th className="text-right" style={{color: '#ef4444'}}>Faltas</th>
              <th className="text-right" style={{color: '#ef4444'}}>Encargos</th>
              <th className="text-right" style={{color: '#ef4444'}}>Outras Saídas</th>
              <th className="text-right">Líquido</th>
              <th className="text-center">Data Pag.</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {folhas.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center" style={{padding: '40px', color: '#94a3b8'}}>
                  Nenhuma folha de pagamento encontrada com os filtros aplicados
                </td>
              </tr>
            ) : (
              folhas.map((folha) => (
                <tr key={folha.id}>
                  <td style={{fontWeight: 500}}>{getFuncionarioNome(folha.funcionario_id)}</td>
                  <td className="text-center">{formatCompetencia(folha.competencia)}</td>
                  <td className="text-right">{formatCurrency(folha.salario_base || 0)}</td>
                  <td className="text-right">{formatCurrency(folha.comissoes || 0)}</td>
                  <td className="text-right">{formatCurrency(folha.horas_extras || 0)}</td>
                  <td className="text-right">{formatCurrency(folha.bonus || 0)}</td>
                  <td className="text-right">{formatCurrency(folha.outras_entradas || 0)}</td>
                  <td className="text-right" style={{fontWeight: 600, color: '#ef4444'}}>
                    {formatCurrency(folha.adiantamentos || 0)}
                  </td>
                  <td className="text-right" style={{fontWeight: 600, color: '#ef4444'}}>
                    {formatCurrency(folha.faltas || 0)}
                  </td>
                  <td className="text-right" style={{fontWeight: 600, color: '#ef4444'}}>
                    {formatCurrency(folha.encargos || 0)}
                  </td>
                  <td className="text-right" style={{fontWeight: 600, color: '#ef4444'}}>
                    {formatCurrency(folha.outras_saidas || 0)}
                  </td>
                  <td className="text-right" style={{fontWeight: 700}}>
                    {formatCurrency(folha.salario_liquido || 0)}
                  </td>
                  <td className="text-center">{formatDate(folha.data_pagamento)}</td>
                  <td className="text-center">
                    <span className={`status-badge ${statusColors[folha.status_pagamento]}`}>
                      {statusLabels[folha.status_pagamento]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {folhas.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2} className="text-center font-bold uppercase text-white">TOTAIS</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalSalarioBase)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalComissoes)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalHorasExtras)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalBonus)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalOutrasEntradas)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalAdiantamentos)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalFaltas)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalEncargos)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalOutrasSaidas)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalLiquido)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Resumo da Folha */}
        {folhas.length > 0 && (
          <div className="summary-box" style={{ marginTop: '32px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Resumo da Folha de Pagamento
            </h3>
            
            {/* Entradas */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', marginBottom: '8px', textTransform: 'uppercase' }}>Entradas</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Salário Base</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>{formatCurrency(totalSalarioBase)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Comissões</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>{formatCurrency(totalComissoes)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Comissões</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>{formatCurrency(totalHorasExtras)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Bônus</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>{formatCurrency(totalBonus)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Outras Entradas</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>{formatCurrency(totalOutrasEntradas)}</span>
                </div>
              </div>
            </div>

            {/* Descontos */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', marginBottom: '8px', textTransform: 'uppercase' }}>Descontos</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Adiantamentos</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>{formatCurrency(totalAdiantamentos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Faltas</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>{formatCurrency(totalFaltas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Encargos</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>{formatCurrency(totalEncargos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Outras Saídas</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>{formatCurrency(totalOutrasSaidas)}</span>
                </div>
              </div>
            </div>

            {/* Totais Finais */}
            <div style={{ borderTop: '2px solid #1e293b', paddingTop: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>TOTAL BRUTO DA FOLHA</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(totalBruto)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>TOTAL DESCONTOS</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(totalDescontos)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: '8px', background: '#1e293b', borderRadius: '8px', paddingLeft: '16px', paddingRight: '16px' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>TOTAL LÍQUIDO DA FOLHA</span>
                <span style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>{formatCurrency(totalLiquido)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}