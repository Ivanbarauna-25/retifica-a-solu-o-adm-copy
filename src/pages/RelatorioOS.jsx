import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

const statusLabels = {
  'em_andamento': 'Em Andamento',
  'finalizado': 'Finalizado',
  'cancelado': 'Cancelado'
};

const statusColors = {
  'em_andamento': 'bg-yellow-100 text-yellow-800',
  'finalizado': 'bg-green-100 text-green-800',
  'cancelado': 'bg-red-100 text-red-800'
};

export default function RelatorioOSPage() {
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [configuracoes, setConfiguracoes] = useState(null);
  const [filtros, setFiltros] = useState({});
  const [despesasOS, setDespesasOS] = useState([]);

  // Impedir que o layout seja renderizado
  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      
      const [ordensData, clientesData, funcionariosData, veiculosData, configData, despesasData] = await Promise.all([
        base44.entities.OrdemServico.list('-data_abertura'),
        base44.entities.Cliente.list(),
        base44.entities.Funcionario.list(),
        base44.entities.Veiculo.list(),
        base44.entities.Configuracoes.list(),
        base44.entities.DespesaOS.list()
      ]);

      let filtered = ordensData || [];

      const status = params.get('status');
      const numeroOS = params.get('numeroOS');
      const clienteId = params.get('clienteId');
      const responsavelId = params.get('responsavelId');
      const vendedorId = params.get('vendedorId');
      const veiculoId = params.get('veiculoId');
      const dataInicio = params.get('dataInicio');
      const dataFim = params.get('dataFim');
      const somenteCanceladas = params.get('somenteCanceladas') === 'true';

      if (status && status !== 'todos') filtered = filtered.filter(o => o.status === status);
      if (numeroOS) filtered = filtered.filter(o => o.numero_os?.toLowerCase().includes(numeroOS.toLowerCase()));
      if (clienteId && clienteId !== 'todos') filtered = filtered.filter(o => (o.contato_tipo === 'cliente' && o.contato_id === clienteId) || o.cliente_id === clienteId);
      if (responsavelId && responsavelId !== 'todos') filtered = filtered.filter(o => o.funcionario_id === responsavelId);
      if (vendedorId && vendedorId !== 'todos') filtered = filtered.filter(o => o.vendedor_id === vendedorId);
      if (veiculoId && veiculoId !== 'todos') filtered = filtered.filter(o => o.veiculo_id === veiculoId);
      if (dataInicio) filtered = filtered.filter(o => new Date(o.data_abertura + 'T00:00:00') >= new Date(dataInicio + 'T00:00:00'));
      if (dataFim) filtered = filtered.filter(o => new Date(o.data_abertura + 'T00:00:00') <= new Date(dataFim + 'T23:59:59'));
      if (somenteCanceladas) filtered = filtered.filter(o => o.status === 'cancelado');

      setOrdens(filtered);
      setClientes(clientesData || []);
      setFuncionarios(funcionariosData || []);
      setVeiculos(veiculosData || []);
      setConfiguracoes(configData?.[0] || null);
      setDespesasOS(despesasData || []);
      setFiltros({
        status: params.get('statusLabel'),
        numeroOS: params.get('numeroOS'),
        clienteNome: params.get('clienteNome'),
        responsavelNome: params.get('responsavelNome'),
        vendedorNome: params.get('vendedorNome'),
        veiculoInfo: params.get('veiculoInfo'),
        dataInicio: params.get('dataInicio'),
        dataFim: params.get('dataFim'),
        somenteCanceladas
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const totalGeral = useMemo(() => ordens.reduce((acc, os) => acc + (os.valor_total || 0), 0), [ordens]);
  const totalProdutos = useMemo(() => ordens.reduce((acc, os) => {
    const produtos = (os.itens || [])
      .filter(item => item.tipo === 'produto')
      .reduce((sum, item) => sum + (item.valor_total || 0), 0);
    return acc + produtos;
  }, 0), [ordens]);
  const totalServicos = useMemo(() => ordens.reduce((acc, os) => {
    const servicos = (os.itens || [])
      .filter(item => item.tipo === 'servico')
      .reduce((sum, item) => sum + (item.valor_total || 0), 0);
    return acc + servicos;
  }, 0), [ordens]);
  const totalDespesas = useMemo(() => ordens.reduce((acc, os) => {
    const despesasDaOS = despesasOS
      .filter(d => d.ordem_id === os.id)
      .reduce((sum, d) => sum + (d.valor || 0), 0);
    return acc + (os.outras_despesas || 0) + despesasDaOS;
  }, 0), [ordens, despesasOS]);
  const totalDescontos = useMemo(() => ordens.reduce((acc, os) => acc + (os.desconto_valor || 0), 0), [ordens]);
  const totalLiquido = useMemo(() => totalGeral - totalDespesas, [totalGeral, totalDespesas]);
  const margemGeralPercentual = useMemo(() => totalGeral > 0 ? ((totalLiquido / totalGeral) * 100) : 0, [totalGeral, totalLiquido]);

  const textoFiltros = useMemo(() => {
    const items = [];
    if (filtros.dataInicio && filtros.dataFim) items.push(`De: ${formatDate(filtros.dataInicio)} até ${formatDate(filtros.dataFim)}`);
    else if (filtros.dataInicio) items.push(`A partir de: ${formatDate(filtros.dataInicio)}`);
    else if (filtros.dataFim) items.push(`Até: ${formatDate(filtros.dataFim)}`);
    if (filtros.status) items.push(`Status: ${filtros.status}`);
    if (filtros.clienteNome) items.push(`Cliente: ${filtros.clienteNome}`);
    if (filtros.vendedorNome) items.push(`Vendedor: ${filtros.vendedorNome}`);
    if (filtros.responsavelNome) items.push(`Responsável: ${filtros.responsavelNome}`);
    if (filtros.numeroOS) items.push(`Nº OS: ${filtros.numeroOS}`);
    if (filtros.somenteCanceladas) items.push(`Situação: Somente canceladas`);
    items.push(`Total de registros: ${ordens.length}`);
    return items.join(' | ');
  }, [filtros, ordens.length]);

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
        <Button onClick={() => window.close()} variant="outline" className="border-slate-300 hover:bg-slate-50 shadow-lg">
          <X className="mr-2 h-4 w-4" /> Fechar
        </Button>
      </div>

      <div className="report-container">
        <div className="header-section">
          <div className="company-info">
            <div className="company-name">{configuracoes?.nome_empresa || "Nome da Empresa"}</div>
            {configuracoes?.cnpj && (
              <div className="company-details">CNPJ: {configuracoes.cnpj}</div>
            )}
            <div className="company-details">
              Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        <div className="report-title">
          Relatório de Ordens de Serviço
        </div>

        {textoFiltros && (
          <div className="filters-line" translate="no">
            {textoFiltros}
          </div>
        )}

        <table translate="no">
          <thead>
            <tr>
              <th style={{width: '6%'}}>Nº OS</th>
              <th style={{width: '7%'}}>Data Abertura</th>
              <th style={{width: '7%'}}>Data Conclusão</th>
              <th style={{width: '15%'}}>Cliente</th>
              <th style={{width: '10%'}}>Veículo</th>
              <th style={{width: '9%'}}>Responsável</th>
              <th style={{width: '9%'}}>Vendedor</th>
              <th className="text-right" style={{width: '7%'}}>Produtos</th>
              <th className="text-right" style={{width: '7%'}}>Serviços</th>
              <th className="text-right" style={{width: '6%'}}>Desconto</th>
              <th className="text-right" style={{width: '8%'}}>Valor Total Cliente</th>
              <th className="text-right" style={{width: '6%'}}>Despesas</th>
              <th className="text-right" style={{width: '8%'}}>Valor Líquido Empresa</th>
              <th className="text-right" style={{width: '4%'}}>Margem %</th>
              <th className="text-center" style={{width: '5%'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {ordens.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center" style={{ padding: '40px', color: '#94a3b8' }}>
                  Nenhuma ordem de serviço encontrada com os filtros aplicados
                </td>
              </tr>
            ) : (
              ordens.map((ordem, idx) => {
                const nomeContato = (() => {
                  if (!ordem) return '—';
                  if (ordem.contato_tipo === 'cliente' && ordem.contato_id) return clientes.find((c) => c.id === ordem.contato_id)?.nome || '—';
                  if (ordem.contato_tipo === 'funcionario' && ordem.contato_id) return funcionarios.find((f) => f.id === ordem.contato_id)?.nome || '—';
                  if (ordem.cliente_id) return clientes.find((c) => c.id === ordem.cliente_id)?.nome || '—';
                  return '—';
                })();

                const infoVeiculo = (() => {
                  if (!ordem.veiculo_id) return '—';
                  const v = veiculos.find((veh) => veh.id === ordem.veiculo_id);
                  if (!v) return '—';
                  return `${v.placa || ''} ${v.marca || ''} ${v.modelo || ''}`.trim() || '—';
                })();

                const nomeFuncionario = (() => {
                  if (!ordem.funcionario_id) return '—';
                  return funcionarios.find((f) => f.id === ordem.funcionario_id)?.nome || '—';
                })();

                const nomeVendedor = (() => {
                  if (!ordem.vendedor_id) return '—';
                  return funcionarios.find((f) => f.id === ordem.vendedor_id)?.nome || '—';
                })();

                // Calcular valores de produtos e serviços
                const valorProdutos = (ordem.itens || [])
                  .filter(item => item.tipo === 'produto')
                  .reduce((sum, item) => sum + (item.valor_total || 0), 0);

                const valorServicos = (ordem.itens || [])
                  .filter(item => item.tipo === 'servico')
                  .reduce((sum, item) => sum + (item.valor_total || 0), 0);

                // Calcular despesas da OS (outras_despesas + DespesaOS)
                const despesasDaOS = despesasOS
                  .filter(d => d.ordem_id === ordem.id)
                  .reduce((sum, d) => sum + (d.valor || 0), 0);
                const valorDespesas = (ordem.outras_despesas || 0) + despesasDaOS;
                const valorDesconto = ordem.desconto_valor || 0;
                const valorTotal = ordem.valor_total || 0;
                const valorLiquido = valorTotal - valorDespesas;
                const margemPercentual = valorTotal > 0 ? ((valorLiquido / valorTotal) * 100) : 0;

                return (
                  <tr key={ordem.id}>
                    <td style={{fontWeight: 500}}>{ordem.numero_os}</td>
                    <td>{formatDate(ordem.data_abertura)}</td>
                    <td>{ordem.data_conclusao ? formatDate(ordem.data_conclusao) : '—'}</td>
                    <td>{nomeContato}</td>
                    <td style={{color: '#64748b'}}>{infoVeiculo}</td>
                    <td>{nomeFuncionario}</td>
                    <td>{nomeVendedor}</td>
                    <td className="text-right">{formatCurrency(valorProdutos)}</td>
                    <td className="text-right">{formatCurrency(valorServicos)}</td>
                    <td className="text-right">{formatCurrency(valorDesconto)}</td>
                    <td className="text-right" style={{fontWeight: 600}}>{formatCurrency(valorTotal)}</td>
                    <td className="text-right">{formatCurrency(valorDespesas)}</td>
                    <td className="text-right" style={{color: '#10b981', fontWeight: 600}}>{formatCurrency(valorLiquido)}</td>
                    <td className="text-right" style={{color: margemPercentual >= 0 ? '#10b981' : '#ef4444', fontWeight: 600}}>{margemPercentual.toFixed(1)}%</td>
                    <td className="text-center">
                      <span className={`status-badge ${statusColors[ordem.status]}`}>
                        {statusLabels[ordem.status]}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {ordens.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={7} className="text-right font-bold uppercase text-white">TOTAIS:</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalProdutos)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalServicos)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalDescontos)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalGeral)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalDespesas)}</td>
                <td className="text-right font-bold text-white">{formatCurrency(totalLiquido)}</td>
                <td className="text-right font-bold text-white">{margemGeralPercentual.toFixed(1)}%</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}