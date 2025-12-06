import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, X, FileText, Package } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function RelatorioNotasFiscais() {
  const [notas, setNotas] = useState([]);
  const [itens, setItens] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [configuracoes, setConfiguracoes] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filtrosJSON = params.get('filtros');
    const notasJSON = params.get('notas');

    if (filtrosJSON) {
      setFiltros(JSON.parse(decodeURIComponent(filtrosJSON)));
    }

    if (notasJSON) {
      const notasData = JSON.parse(decodeURIComponent(notasJSON));
      setNotas(notasData);
      loadRelatedData(notasData);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadRelatedData = async (notasData) => {
    setIsLoading(true);
    try {
      const [fornecedoresData, configData] = await Promise.all([
        base44.entities.Fornecedor.list(),
        base44.entities.Configuracoes.list()
      ]);

      setFornecedores(fornecedoresData || []);
      setConfiguracoes(configData?.[0] || null);

      const notaIds = notasData.map(n => n.id);
      const todosItens = [];
      
      for (const notaId of notaIds) {
        try {
          const itensNota = await base44.entities.ItemNotaFiscal.filter({ nota_fiscal_id: notaId });
          todosItens.push(...(itensNota || []));
        } catch (error) {
          console.error(`Erro ao carregar itens da nota ${notaId}:`, error);
        }
      }
      
      setItens(todosItens);
    } catch (error) {
      console.error('Erro ao carregar dados relacionados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFornecedorNome = (id) => {
    const fornecedor = fornecedores.find(f => f.id === id);
    return fornecedor?.nome || '-';
  };

  const analiseEstoque = useMemo(() => {
    const produtosPorCodigo = {};
    
    itens.forEach(item => {
      const codigo = item.codigo_produto || 'SEM_CODIGO';
      if (!produtosPorCodigo[codigo]) {
        produtosPorCodigo[codigo] = {
          codigo: codigo,
          descricao: item.descricao || 'Sem descrição',
          quantidadeTotal: 0,
          valorTotal: 0,
          ocorrencias: 0,
          processado: item.processado
        };
      }
      
      produtosPorCodigo[codigo].quantidadeTotal += item.quantidade || 0;
      produtosPorCodigo[codigo].valorTotal += item.valor_total || 0;
      produtosPorCodigo[codigo].ocorrencias += 1;
    });

    return Object.values(produtosPorCodigo).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [itens]);

  const resumo = {
    totalNotas: notas.length,
    totalItens: itens.length,
    valorTotal: notas.reduce((sum, n) => sum + (n.valor_total || 0), 0),
    totalProdutos: analiseEstoque.length,
    produtosProcessados: analiseEstoque.filter(p => p.processado).length,
    produtosPendentes: analiseEstoque.filter(p => !p.processado).length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-slate-800 mx-auto" />
          <p className="mt-4 text-slate-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

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
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Button onClick={() => window.close()} variant="outline" className="border-slate-300 hover:bg-slate-50 shadow-lg">
          <X className="mr-2 h-4 w-4" />
          Fechar
        </Button>
      </div>

      <div className="report-container" translate="no">
        <div className="header-section">
          <div className="company-info">
            <div className="company-name">{configuracoes?.nome_empresa || "Nome da Empresa"}</div>
            {configuracoes?.cnpj && <div className="company-details">CNPJ: {configuracoes.cnpj}</div>}
            <div className="company-details">Gerado em {new Date().toLocaleString("pt-BR")}</div>
          </div>
        </div>

        <div className="report-title">Relatório de Notas Fiscais de Entrada</div>

        {(filtros.status || filtros.fornecedorNome || filtros.dataInicio || filtros.dataFim) && (
          <div className="filters-line" translate="no">
            <div className="flex gap-4 flex-wrap">
              {filtros.status && filtros.status !== 'todos' && <span>Status: {filtros.status}</span>}
              {filtros.fornecedorNome && filtros.fornecedorNome !== 'Todos' && <span>Fornecedor: {filtros.fornecedorNome}</span>}
              {filtros.dataInicio && <span>De: {formatDate(filtros.dataInicio)}</span>}
              {filtros.dataFim && <span>Até: {formatDate(filtros.dataFim)}</span>}
            </div>
          </div>
        )}

        {/* Resumo removido para usar o padrão de footer da tabela */}

        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Notas Fiscais ({resumo.totalNotas})
          </h2>
          <table translate="no">
            <thead>
              <tr>
                <th>Nº Nota</th>
                <th>Fornecedor</th>
                <th>Data</th>
                <th className="text-right">Valor</th>
                <th className="text-center">Itens</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {notas.map((nota, idx) => {
                const itensNota = itens.filter(i => i.nota_fiscal_id === nota.id);
                return (
                  <tr key={nota.id}>
                    <td style={{fontWeight: 500}}>{nota.numero_nota}</td>
                    <td>{getFornecedorNome(nota.fornecedor_id)}</td>
                    <td>{formatDate(nota.data_emissao)}</td>
                    <td className="text-right" style={{fontWeight: 600}}>{formatCurrency(nota.valor_total)}</td>
                    <td className="text-center">{itensNota.length}</td>
                    <td className="text-center">
                      <span className={`status-badge ${
                        nota.status === 'processada' ? 'bg-green-100 text-green-800' :
                        nota.status === 'cancelada' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {nota.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-center font-bold uppercase text-white">TOTAIS</td>
                <td className="text-right font-bold text-white">{formatCurrency(resumo.valorTotal)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mb-8 page-break-before">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Análise de Produtos ({resumo.totalProdutos})
          </h2>
          <table translate="no">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th className="text-right">Qtd Total</th>
                <th className="text-right">Valor Total</th>
                <th className="text-right">Valor Médio</th>
                <th className="text-center">Ocorrências</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {analiseEstoque.map((produto, idx) => (
                <tr key={produto.codigo + idx}>
                  <td style={{fontFamily: 'monospace', fontSize: '11px'}}>{produto.codigo}</td>
                  <td>{produto.descricao}</td>
                  <td className="text-right" style={{fontWeight: 600}}>{produto.quantidadeTotal}</td>
                  <td className="text-right" style={{fontWeight: 600}}>{formatCurrency(produto.valorTotal)}</td>
                  <td className="text-right">{formatCurrency(produto.valorTotal / produto.quantidadeTotal)}</td>
                  <td className="text-center">{produto.ocorrencias}x</td>
                  <td className="text-center">
                    <span className={`status-badge ${
                      produto.processado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {produto.processado ? 'Processado' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="text-center font-bold uppercase text-white">TOTAIS</td>
                <td className="text-right font-bold text-white">
                  {analiseEstoque.reduce((sum, p) => sum + p.quantidadeTotal, 0)}
                </td>
                <td className="text-right font-bold text-white">
                  {formatCurrency(analiseEstoque.reduce((sum, p) => sum + p.valorTotal, 0))}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-12 pt-6 border-t-2 border-slate-300 text-center text-sm text-slate-600">
          <p>Relatório gerado em {new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
}