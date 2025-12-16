import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function RelatorioCotacaoEPI() {
  const [cotacao, setCotacao] = useState(null);
  const [fornecedor, setFornecedor] = useState(null);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cotacaoId = params.get('cotacao_id');
    
    if (cotacaoId) {
      fetchData(cotacaoId);
    }
  }, []);

  const fetchData = async (cotacaoId) => {
    setIsLoading(true);
    try {
      const [cotacaoData, configData, fornecedoresData] = await Promise.all([
        base44.entities.CotacaoEPI.filter({ id: cotacaoId }),
        base44.entities.Configuracoes.list(),
        base44.entities.Fornecedor.list()
      ]);

      const cotacaoItem = cotacaoData?.[0];
      setCotacao(cotacaoItem);
      setConfig(configData?.[0]);

      if (cotacaoItem?.fornecedor_id) {
        const forn = fornecedoresData.find(f => f.id === cotacaoItem.fornecedor_id);
        setFornecedor(forn);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!cotacao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Cotação não encontrada</p>
          <Button onClick={handleClose}>Fechar</Button>
        </div>
      </div>
    );
  }

  const statusLabels = {
    rascunho: 'Rascunho',
    pendente: 'Pendente Aprovação',
    aprovada: 'Aprovada',
    rejeitada: 'Rejeitada'
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 20px; }
          .print-content { box-shadow: none !important; }
        }
      `}</style>

      {/* Botões de ação */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <Button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-700 text-white gap-2">
          <Printer className="w-4 h-4" />
          Imprimir
        </Button>
        <Button variant="outline" onClick={handleClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Conteúdo do Relatório */}
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="print-content max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start border-b pb-6 mb-6">
            <div>
              {config?.logo_url && (
                <img src={config.logo_url} alt="Logo" className="h-16 mb-3" />
              )}
              <h1 className="text-xl font-bold text-gray-900">{config?.nome_empresa || 'Empresa'}</h1>
              {config?.endereco && <p className="text-sm text-gray-600">{config.endereco}</p>}
              {config?.cnpj && <p className="text-sm text-gray-600">CNPJ: {config.cnpj}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-gray-900">COTAÇÃO DE EPI</h2>
              <p className="text-lg font-semibold text-blue-600">
                {cotacao.numero || `COT-${cotacao.id.substring(0, 6).toUpperCase()}`}
              </p>
              <p className="text-sm text-gray-600">Data: {formatDate(cotacao.data_cotacao)}</p>
              <p className={`text-sm font-medium mt-2 ${
                cotacao.status === 'aprovada' ? 'text-green-600' :
                cotacao.status === 'rejeitada' ? 'text-red-600' :
                cotacao.status === 'pendente' ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                Status: {statusLabels[cotacao.status] || 'Rascunho'}
              </p>
            </div>
          </div>

          {/* Fornecedor */}
          {fornecedor && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Fornecedor</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nome:</span> {fornecedor.nome}
                </div>
                {fornecedor.cnpj && (
                  <div>
                    <span className="font-medium">CNPJ:</span> {fornecedor.cnpj}
                  </div>
                )}
                {fornecedor.contato && (
                  <div>
                    <span className="font-medium">Contato:</span> {fornecedor.contato}
                  </div>
                )}
                {fornecedor.email && (
                  <div>
                    <span className="font-medium">Email:</span> {fornecedor.email}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabela de Itens */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Itens da Cotação</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">EPI</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Qtd</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Preço Unit.</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {cotacao.itens?.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{item.epi_nome}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">{item.quantidade}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">{formatCurrency(item.preco_unitario || 0)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">{formatCurrency(item.total_item || 0)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={3} className="border border-gray-300 px-3 py-2 text-right">TOTAL:</td>
                  <td className="border border-gray-300 px-3 py-2 text-right text-lg">{formatCurrency(cotacao.valor_total || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Funcionários Vinculados */}
          {cotacao.funcionarios_vinculados?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Funcionários que Receberão os EPIs</h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Funcionário</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Cargo/Função</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">EPIs</th>
                  </tr>
                </thead>
                <tbody>
                  {cotacao.funcionarios_vinculados.map((func, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{func.funcionario_nome}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{func.cargo || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        {func.epis?.map(e => e.epi_nome).join(', ') || 'Todos os itens'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Observações */}
          {cotacao.observacoes && (
            <div className="mb-8 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800"><strong>Observações:</strong> {cotacao.observacoes}</p>
            </div>
          )}

          {/* Assinaturas */}
          <div className="grid grid-cols-2 gap-8 mt-12 pt-8">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mx-4">
                <p className="text-sm text-gray-600">Solicitante</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mx-4">
                <p className="text-sm text-gray-600">Aprovação</p>
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="mt-12 pt-4 border-t text-center text-xs text-gray-500">
            <p>Documento gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </>
  );
}