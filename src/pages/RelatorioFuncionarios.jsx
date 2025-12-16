import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function RelatorioFuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filtros, setFiltros] = useState({});

  const statusLabels = {
    'ativo': 'Ativo',
    'experiencia': 'Experiência',
    'ferias': 'Férias',
    'afastado': 'Afastado',
    'demitido': 'Demitido'
  };

  const statusColors = {
    'ativo': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'experiencia': 'bg-blue-50 text-blue-700 border-blue-200',
    'ferias': 'bg-purple-50 text-purple-700 border-purple-200',
    'afastado': 'bg-amber-50 text-amber-700 border-amber-200',
    'demitido': 'bg-red-50 text-red-700 border-red-200'
  };

  const regimeLabels = {
    'clt': 'CLT',
    'pj': 'PJ',
    'estagio': 'Estágio',
    'aprendiz': 'Aprendiz',
    'temporario': 'Temporário',
    'terceirizado': 'Terceirizado'
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    const urlParams = new URLSearchParams(window.location.search);
    const camposParam = urlParams.get('campos');
    const campos = camposParam ? camposParam.split(',') : ['nome', 'cpf', 'cargo', 'status', 'telefone', 'banco', 'pix'];
    
    const filtrosObj = {
      campos,
      status: urlParams.get('status') || '',
      departamento_id: urlParams.get('departamento_id') || '',
      cargo_id: urlParams.get('cargo_id') || '',
      regime: urlParams.get('regime') || '',
      ordenacao: urlParams.get('ordenacao') || 'nome'
    };
    setFiltros(filtrosObj);

    const [funcsData, deptsData, cargosData, configData] = await Promise.all([
      base44.entities.Funcionario.list(),
      base44.entities.Departamento.list(),
      base44.entities.Cargo.list(),
      base44.entities.Configuracoes.list()
    ]);

    let funcsFiltrados = funcsData || [];

    if (filtrosObj.status) {
      funcsFiltrados = funcsFiltrados.filter(f => f.status === filtrosObj.status);
    }

    if (filtrosObj.departamento_id) {
      funcsFiltrados = funcsFiltrados.filter(f => f.departamento_id === filtrosObj.departamento_id);
    }

    if (filtrosObj.cargo_id) {
      funcsFiltrados = funcsFiltrados.filter(f => f.cargo_id === filtrosObj.cargo_id);
    }

    if (filtrosObj.regime) {
      funcsFiltrados = funcsFiltrados.filter(f => f.regime === filtrosObj.regime);
    }

    // Ordenação
    if (filtrosObj.ordenacao === 'nome') {
      funcsFiltrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    } else if (filtrosObj.ordenacao === 'salario') {
      funcsFiltrados.sort((a, b) => (b.salario || 0) - (a.salario || 0));
    } else if (filtrosObj.ordenacao === 'data_inicio') {
      funcsFiltrados.sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
    } else if (filtrosObj.ordenacao === 'departamento') {
      funcsFiltrados.sort((a, b) => {
        const deptA = deptsData.find(d => d.id === a.departamento_id)?.nome || '';
        const deptB = deptsData.find(d => d.id === b.departamento_id)?.nome || '';
        return deptA.localeCompare(deptB);
      });
    }

    setFuncionarios(funcsFiltrados);
    setDepartamentos(deptsData || []);
    setCargos(cargosData || []);
    setConfig((configData && configData[0]) || null);
    setIsLoading(false);
  };

  const getDepartamentoNome = (id) => {
    const dept = departamentos.find(d => d.id === id);
    return dept?.nome || '—';
  };

  const getCargoNome = (id) => {
    const cargo = cargos.find(c => c.id === id);
    return cargo?.nome || '—';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  const totalSalarios = funcionarios.reduce((acc, f) => acc + (f.salario || 0), 0);

  const getFiltrosAplicados = () => {
    const filtrosTexto = [];
    
    if (filtros.status) {
      filtrosTexto.push(`Status: ${statusLabels[filtros.status] || filtros.status}`);
    }
    
    if (filtros.departamento_id) {
      filtrosTexto.push(`Departamento: ${getDepartamentoNome(filtros.departamento_id)}`);
    }
    
    if (filtros.cargo_id) {
      filtrosTexto.push(`Cargo: ${getCargoNome(filtros.cargo_id)}`);
    }
    
    if (filtros.regime) {
      filtrosTexto.push(`Regime: ${regimeLabels[filtros.regime] || filtros.regime}`);
    }
    
    filtrosTexto.push(`Total de registros: ${funcionarios.length}`);
    
    return filtrosTexto.join(' | ');
  };

  const camposVisiveis = filtros.campos || [];

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
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

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

      {/* Botões de ação */}
      <div className="action-buttons no-print">
        <Button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-700 text-white shadow-lg">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Button onClick={handleClose} variant="outline" className="border-slate-300 hover:bg-slate-50 shadow-lg">
          <X className="mr-2 h-4 w-4" />
          Fechar
        </Button>
      </div>

      <div className="report-container" translate="no">
        {/* Cabeçalho */}
        <div className="header-section">
          <div className="company-info">
            <div className="company-name">{config?.nome_empresa || "Nome da Empresa"}</div>
            {config?.cnpj && <div className="company-details">CNPJ: {config.cnpj}</div>}
            <div className="company-details">
              Gerado em: {new Date().toLocaleDateString('pt-BR', { 
                day: '2-digit', month: '2-digit', year: 'numeric' 
              })} às {new Date().toLocaleTimeString('pt-BR', { 
                hour: '2-digit', minute: '2-digit' 
              })}
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="report-title">Relatório de Funcionários</div>

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
              {camposVisiveis.includes('nome') && <th>Nome</th>}
              {camposVisiveis.includes('cpf') && <th>CPF</th>}
              {camposVisiveis.includes('cargo') && <th>Cargo</th>}
              {camposVisiveis.includes('departamento') && <th>Departamento</th>}
              {camposVisiveis.includes('status') && <th className="text-center">Status</th>}
              {camposVisiveis.includes('regime') && <th>Regime</th>}
              {camposVisiveis.includes('salario') && <th className="text-right">Salário</th>}
              {camposVisiveis.includes('data_inicio') && <th>Data Início</th>}
              {camposVisiveis.includes('telefone') && <th>Telefone</th>}
              {camposVisiveis.includes('email') && <th>Email</th>}
              {camposVisiveis.includes('banco') && <th>Banco</th>}
              {camposVisiveis.includes('agencia') && <th>Agência</th>}
              {camposVisiveis.includes('conta') && <th>Conta</th>}
              {camposVisiveis.includes('pix') && <th>PIX</th>}
            </tr>
          </thead>
          <tbody>
            {funcionarios.length === 0 ? (
              <tr>
                <td colSpan={camposVisiveis.length || 10} className="text-center" style={{padding: '40px', color: '#94a3b8'}}>
                  Nenhum funcionário encontrado com os filtros aplicados
                </td>
              </tr>
            ) : (
              funcionarios.map((func) => (
                <tr key={func.id}>
                  {camposVisiveis.includes('nome') && <td style={{fontWeight: 500}}>{func.nome}</td>}
                  {camposVisiveis.includes('cpf') && <td>{func.cpf || '—'}</td>}
                  {camposVisiveis.includes('cargo') && <td>{getCargoNome(func.cargo_id)}</td>}
                  {camposVisiveis.includes('departamento') && <td>{getDepartamentoNome(func.departamento_id)}</td>}
                  {camposVisiveis.includes('status') && (
                    <td className="text-center">
                      <span className={`status-badge ${statusColors[func.status]}`}>
                        {statusLabels[func.status] || func.status}
                      </span>
                    </td>
                  )}
                  {camposVisiveis.includes('regime') && <td>{regimeLabels[func.regime] || func.regime || '—'}</td>}
                  {camposVisiveis.includes('salario') && <td className="text-right">{formatCurrency(func.salario || 0)}</td>}
                  {camposVisiveis.includes('data_inicio') && <td>{formatDate(func.data_inicio)}</td>}
                  {camposVisiveis.includes('telefone') && <td>{func.telefone || '—'}</td>}
                  {camposVisiveis.includes('email') && <td>{func.email || '—'}</td>}
                  {camposVisiveis.includes('banco') && <td>{func.banco || '—'}</td>}
                  {camposVisiveis.includes('agencia') && <td>{func.agencia || '—'}</td>}
                  {camposVisiveis.includes('conta') && <td>{func.conta || '—'}</td>}
                  {camposVisiveis.includes('pix') && <td>{func.pix || '—'}</td>}
                </tr>
              ))
            )}
          </tbody>
          {funcionarios.length > 0 && camposVisiveis.includes('salario') && (
            <tfoot>
              <tr>
                <td colSpan={camposVisiveis.indexOf('salario')} className="text-center font-bold uppercase text-white">TOTAIS</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalSalarios)}</td>
                <td colSpan={camposVisiveis.length - camposVisiveis.indexOf('salario') - 1}></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Resumo */}
        {funcionarios.length > 0 && (
          <div style={{ marginTop: '32px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Resumo
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total de Funcionários</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{funcionarios.length}</p>
              </div>
              
              <div style={{ padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ativos</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>
                  {funcionarios.filter(f => f.status === 'ativo').length}
                </p>
              </div>
              
              <div style={{ padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Em Experiência</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
                  {funcionarios.filter(f => f.status === 'experiencia').length}
                </p>
              </div>
              
              <div style={{ padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Salários</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(totalSalarios)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}