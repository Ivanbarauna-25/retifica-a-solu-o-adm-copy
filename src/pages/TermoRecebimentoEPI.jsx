import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { formatDate } from '@/components/formatters';

export default function TermoRecebimentoEPI() {
  const [entrega, setEntrega] = useState(null);
  const [funcionario, setFuncionario] = useState(null);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const entregaId = params.get('entrega_id');
    
    if (entregaId) {
      fetchData(entregaId);
    }
  }, []);

  const fetchData = async (entregaId) => {
    setIsLoading(true);
    try {
      const [entregaData, configData] = await Promise.all([
        base44.entities.EntregaEPI.filter({ id: entregaId }),
        base44.entities.Configuracoes.list()
      ]);

      const entregaItem = entregaData?.[0];
      setEntrega(entregaItem);
      setConfig(configData?.[0]);

      if (entregaItem?.funcionario_id) {
        const funcData = await base44.entities.Funcionario.filter({ id: entregaItem.funcionario_id });
        setFuncionario(funcData?.[0]);
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

  if (!entrega || !funcionario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Dados não encontrados</p>
          <Button onClick={handleClose}>Fechar</Button>
        </div>
      </div>
    );
  }

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

      {/* Conteúdo do Termo */}
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="print-content max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8">
          {/* Cabeçalho */}
          <div className="text-center border-b pb-6 mb-6">
            {config?.logo_url && (
              <img src={config.logo_url} alt="Logo" className="h-16 mx-auto mb-3" />
            )}
            <h1 className="text-xl font-bold text-gray-900">{config?.nome_empresa || 'Empresa'}</h1>
            {config?.endereco && <p className="text-sm text-gray-600">{config.endereco}</p>}
            {config?.cnpj && <p className="text-sm text-gray-600">CNPJ: {config.cnpj}</p>}
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-gray-900 uppercase">
              Termo de Recebimento e Responsabilidade
            </h2>
            <h3 className="text-base font-semibold text-gray-700">
              Equipamentos de Proteção Individual - EPI
            </h3>
          </div>

          {/* Dados do Funcionário */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Funcionário:</span>
                <span className="ml-2 text-gray-900">{funcionario.nome}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">CPF:</span>
                <span className="ml-2 text-gray-900">{funcionario.cpf || '-'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Data da Entrega:</span>
                <span className="ml-2 text-gray-900">{formatDate(entrega.data_entrega)}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Entregue por:</span>
                <span className="ml-2 text-gray-900">{entrega.entregue_por || '-'}</span>
              </div>
            </div>
          </div>

          {/* Tabela de EPIs */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Equipamentos Recebidos:</h4>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">EPI</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">CA</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Qtd</th>
                </tr>
              </thead>
              <tbody>
                {entrega.itens?.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{item.epi_nome}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm font-mono">{item.numero_ca || '-'}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">{item.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Texto do Termo */}
          <div className="mb-8 text-sm text-gray-700 leading-relaxed text-justify">
            <p className="mb-3">
              Declaro ter recebido gratuitamente os Equipamentos de Proteção Individual (EPI) acima descritos, 
              em perfeito estado de conservação e funcionamento, comprometendo-me a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Usar os EPIs apenas para a finalidade a que se destinam, durante toda a jornada de trabalho;</li>
              <li>Responsabilizar-me pela guarda e conservação dos mesmos;</li>
              <li>Comunicar imediatamente ao empregador qualquer alteração que os torne impróprios para uso;</li>
              <li>Devolver os EPIs ao empregador quando solicitado ou em caso de rescisão contratual;</li>
              <li>Responsabilizar-me pelo extravio ou dano causado aos equipamentos por mau uso ou negligência.</li>
            </ul>
            <p className="mt-3">
              Estou ciente de que o não cumprimento das disposições legais e regulamentares sobre segurança 
              e medicina do trabalho constitui ato faltoso, conforme Art. 158 da CLT.
            </p>
          </div>

          {/* Observações */}
          {entrega.observacoes && (
            <div className="mb-8 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800"><strong>Observações:</strong> {entrega.observacoes}</p>
            </div>
          )}

          {/* Assinaturas */}
          <div className="grid grid-cols-2 gap-8 mt-12 pt-8">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mx-4">
                <p className="font-semibold text-gray-900">{funcionario.nome}</p>
                <p className="text-sm text-gray-600">Funcionário</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mx-4">
                <p className="font-semibold text-gray-900">{entrega.entregue_por || 'Responsável'}</p>
                <p className="text-sm text-gray-600">Responsável pela Entrega</p>
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