import React, { useState, useEffect } from 'react';
import { MovimentacaoFinanceira } from '@/entities/MovimentacaoFinanceira';
import { ContaBancaria } from '@/entities/ContaBancaria';
import { PlanoContas } from '@/entities/PlanoContas';
import { formatCurrency, formatDate } from '@/components/formatters';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function RelatorioFluxoCaixa() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    movimentos: [],
    saldoAnterior: 0,
    totalEntradas: 0,
    totalSaidas: 0,
    saldoFinal: 0,
    filtros: {}
  });
  const [contasMap, setContasMap] = useState({});
  const [planosMap, setPlanosMap] = useState({});

  useEffect(() => {
    const loadData = async () => {
      const params = new URLSearchParams(window.location.search);
      const dataInicio = params.get('data_inicio');
      const dataFim = params.get('data_fim');
      const contaId = params.get('conta_id');
      const incluirPrevistos = params.get('incluir_previstos') === 'true';

      try {
        // 1. Carregar cadastros auxiliares
        const [contas, planos] = await Promise.all([
          ContaBancaria.list(),
          PlanoContas.list()
        ]);
        
        const cMap = {};
        contas.forEach(c => cMap[c.id] = c.nome);
        setContasMap(cMap);

        const pMap = {};
        planos.forEach(p => pMap[p.id] = p.nome);
        setPlanosMap(pMap);

        // 2. Carregar todas as movimentações (para cálculo correto do saldo anterior)
        // Idealmente, teríamos um endpoint de saldo acumulado, mas vamos calcular no frontend por enquanto
        // ou pegar o saldo atual da conta e subtrair movimentos futuros/do período inverso.
        // Estratégia: 
        // - Pegar Saldo Atual das contas selecionadas.
        // - Pegar movimentos APÓS a data de início até HOJE (ou infinito) e "desfazer" para chegar no saldo anterior.
        // OU
        // - Pegar todos os movimentos desde o início dos tempos até data_inicio para somar o saldo anterior.
        
        // Vamos usar a estratégia de pegar todos os movimentos e calcular tudo, pois é mais seguro em bases pequenas/médias.
        // Filtraremos na memória.
        const todosMovimentos = await MovimentacaoFinanceira.list();

        // 3. Processar dados
        let saldoAnterior = 0;
        let movimentosPeriodo = [];
        let totalEntradas = 0;
        let totalSaidas = 0;

        // Filtrar por conta se necessário
        const movimentosFiltradosPorConta = contaId && contaId !== 'todas'
          ? todosMovimentos.filter(m => 
              m.conta_bancaria_baixa_id === contaId || 
              m.conta_bancaria_id === contaId
            )
          : todosMovimentos;

        // Ordenar por data
        movimentosFiltradosPorConta.sort((a, b) => {
          const dateA = new Date(a.data_baixa || a.data_vencimento || a.data_faturamento);
          const dateB = new Date(b.data_baixa || b.data_vencimento || b.data_faturamento);
          return dateA - dateB;
        });

        const start = new Date(dataInicio);
        start.setHours(0,0,0,0);
        const end = new Date(dataFim);
        end.setHours(23,59,59,999);

        movimentosFiltradosPorConta.forEach(m => {
            // Determinar status e data efetiva
            const isPago = m.status === 'pago' || m.status === 'parcial';
            if (!incluirPrevistos && !isPago) return;

            const dataMov = new Date(m.data_baixa || m.data_vencimento || m.data_faturamento);
            const valor = m.valor_total || 0;
            const tipo = m.tipo_movimentacao; // credito, debito

            // Cálculo do Saldo Anterior (movimentos ANTES do inicio)
            if (dataMov < start) {
                if (isPago) { // Saldo anterior geralmente considera apenas realizado, a menos que seja fluxo projetado
                    if (tipo === 'credito') saldoAnterior += valor;
                    else if (tipo === 'debito') saldoAnterior -= valor;
                } else if (incluirPrevistos) {
                    if (tipo === 'credito') saldoAnterior += valor;
                    else if (tipo === 'debito') saldoAnterior -= valor;
                }
            }
            // Movimentos do Período
            else if (dataMov <= end) {
                movimentosPeriodo.push({
                    ...m,
                    data_efetiva: dataMov
                });

                if (tipo === 'credito') totalEntradas += valor;
                else if (tipo === 'debito') totalSaidas += valor;
            }
        });

        // Saldo Inicial se conta especifica (pegar saldo inicial do cadastro de contas se houver, mas geralmente é 0 + movimentos)
        // Se filtrarmos todas as contas, saldo anterior é a soma de todas.
        // Nota: Se a base for muito grande, isso ficará lento. O ideal seria backend support.
        
        // Ajuste fino: Se o usuário selecionou "todas", o saldo anterior é global.
        // Se selecionou conta X, o saldo anterior é da conta X.

        setData({
          movimentos: movimentosPeriodo,
          saldoAnterior,
          totalEntradas,
          totalSaidas,
          saldoFinal: saldoAnterior + totalEntradas - totalSaidas,
          filtros: { dataInicio, dataFim, contaId, incluirPrevistos, contaNome: contaId !== 'todas' ? cMap[contaId] : 'Todas as Contas' }
        });

      } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        alert("Erro ao gerar relatório. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    try {
        const { data: pdfData } = await base44.functions.invoke('gerarPdfTabela', {
            titulo: 'Relatório de Fluxo de Caixa',
            filtros: `Período: ${formatDate(data.filtros.dataInicio)} a ${formatDate(data.filtros.dataFim)} | Conta: ${data.filtros.contaNome}`,
            colunas: ['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Valor'],
            dados: data.movimentos.map(m => [
                formatDate(m.data_efetiva),
                m.historico || m.descricao || m.numero_documento || '-',
                m.planos_contas?.[0]?.plano_contas_id ? planosMap[m.planos_contas[0].plano_contas_id] : '-',
                (m.conta_bancaria_baixa_id || m.conta_bancaria_id) ? contasMap[m.conta_bancaria_baixa_id || m.conta_bancaria_id] : '-',
                m.tipo_movimentacao === 'credito' ? 'Entrada' : 'Saída',
                formatCurrency(m.valor_total)
            ]),
            resumo: [
                { label: 'Saldo Anterior', value: formatCurrency(data.saldoAnterior) },
                { label: 'Total Entradas', value: formatCurrency(data.totalEntradas) },
                { label: 'Total Saídas', value: formatCurrency(data.totalSaidas) },
                { label: 'Saldo Final', value: formatCurrency(data.saldoFinal) }
            ]
        });

        const blob = new Blob([new Uint8Array(pdfData.data)], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fluxo_caixa_${data.filtros.dataInicio}_${data.filtros.dataFim}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao gerar PDF. Tente imprimir diretamente pelo navegador.');
        window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Gerando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 p-8 print:p-0">
      {/* Header de Controle (Não impresso) */}
      <div className="max-w-[210mm] mx-auto mb-8 flex justify-between items-center no-print">
        <Button variant="outline" onClick={() => window.close()} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar PDF
          </Button>
          <Button onClick={handlePrint} className="bg-slate-900 text-white gap-2 hover:bg-slate-800">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Relatório */}
      <div className="max-w-[210mm] mx-auto bg-white print:w-full">
        {/* Cabeçalho do Relatório */}
        <div className="border-b border-slate-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Relatório de Fluxo de Caixa</h1>
              <p className="text-slate-500 text-sm">
                Período: <strong>{formatDate(data.filtros.dataInicio)}</strong> até <strong>{formatDate(data.filtros.dataFim)}</strong>
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Conta: <strong>{data.filtros.contaNome}</strong>
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Status: <strong>{data.filtros.incluirPrevistos ? 'Realizado + Previsto' : 'Apenas Realizado'}</strong>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-1">Gerado em</p>
              <p className="text-sm font-medium text-slate-700">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 font-medium uppercase mb-1">Saldo Anterior</p>
            <p className="text-lg font-bold text-slate-700">{formatCurrency(data.saldoAnterior)}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <p className="text-xs text-green-700 font-medium uppercase">Entradas</p>
            </div>
            <p className="text-lg font-bold text-green-700">{formatCurrency(data.totalEntradas)}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-3 h-3 text-red-600" />
              <p className="text-xs text-red-700 font-medium uppercase">Saídas</p>
            </div>
            <p className="text-lg font-bold text-red-700">{formatCurrency(data.totalSaidas)}</p>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg shadow-sm text-white">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3 h-3 text-slate-300" />
              <p className="text-xs text-slate-300 font-medium uppercase">Saldo Final</p>
            </div>
            <p className="text-lg font-bold">{formatCurrency(data.saldoFinal)}</p>
          </div>
        </div>

        {/* Tabela de Movimentações */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-900 uppercase mb-4 border-l-4 border-slate-900 pl-3">
            Detalhamento das Movimentações
          </h3>
          
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-2 font-semibold text-slate-700 w-[100px]">Data</th>
                <th className="py-3 px-2 font-semibold text-slate-700">Descrição</th>
                <th className="py-3 px-2 font-semibold text-slate-700">Categoria</th>
                <th className="py-3 px-2 font-semibold text-slate-700">Conta</th>
                <th className="py-3 px-2 font-semibold text-slate-700 w-[80px] text-center">Tipo</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right w-[120px]">Valor</th>
                <th className="py-3 px-2 font-semibold text-slate-700 text-right w-[120px]">Saldo Acum.</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {data.movimentos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 italic">
                    Nenhuma movimentação encontrada neste período.
                  </td>
                </tr>
              ) : (
                (() => {
                  let saldoCorrente = data.saldoAnterior;
                  return data.movimentos.map((movimento, index) => {
                    const valor = movimento.valor_total || 0;
                    const isEntrada = movimento.tipo_movimentacao === 'credito';
                    if (isEntrada) saldoCorrente += valor;
                    else saldoCorrente -= valor;

                    const isPago = movimento.status === 'pago' || movimento.status === 'parcial';

                    return (
                      <tr key={index} className={`border-b border-slate-100 hover:bg-slate-50 ${!isPago ? 'bg-yellow-50/50' : ''}`}>
                        <td className="py-2 px-2">
                          {formatDate(movimento.data_efetiva)}
                          {!isPago && <span className="text-[10px] ml-1 text-yellow-600 font-bold">(Aberto)</span>}
                        </td>
                        <td className="py-2 px-2 truncate max-w-[200px]">
                          {movimento.historico || movimento.descricao || movimento.numero_documento || '-'}
                        </td>
                        <td className="py-2 px-2 truncate max-w-[150px]">
                          {movimento.planos_contas?.[0]?.plano_contas_id ? planosMap[movimento.planos_contas[0].plano_contas_id] : '-'}
                        </td>
                        <td className="py-2 px-2 truncate max-w-[120px]">
                          {(movimento.conta_bancaria_baixa_id || movimento.conta_bancaria_id) ? contasMap[movimento.conta_bancaria_baixa_id || movimento.conta_bancaria_id] : '-'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${isEntrada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isEntrada ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className={`py-2 px-2 text-right font-medium ${isEntrada ? 'text-green-600' : 'text-red-600'}`}>
                          {isEntrada ? '+' : '-'}{formatCurrency(valor)}
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-slate-700">
                          {formatCurrency(saldoCorrente)}
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
            {data.movimentos.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                  <td colSpan="5" className="py-3 px-2 text-right uppercase text-xs text-slate-500">Total do Período</td>
                  <td className={`py-3 px-2 text-right ${(data.totalEntradas - data.totalSaidas) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(data.totalEntradas - data.totalSaidas)}
                  </td>
                  <td className="py-3 px-2 text-right text-slate-900">
                    {formatCurrency(data.saldoFinal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer do Relatório */}
        <div className="border-t border-slate-200 pt-6 mt-12 flex justify-between text-xs text-slate-400">
          <p>Base44 - Sistema de Gestão</p>
          <p>Página 1 de 1</p>
        </div>
      </div>
    </div>
  );
}