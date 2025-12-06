import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ImprimirOSAvancado from '@/components/os/ImprimirOSAvancado';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ImprimirOSPage() {
  const [searchParams] = useSearchParams();
  const osId = searchParams.get('id');
  const tipo = searchParams.get('tipo') || 'a4'; // 'a4' ou 'termica'

  const [ordem, setOrdem] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [veiculo, setVeiculo] = useState(null);
  const [funcionario, setFuncionario] = useState(null);
  const [vendedor, setVendedor] = useState(null);
  const [configuracoes, setConfiguracoes] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!osId) {
        setError('ID da OS não fornecido');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const ordemData = await base44.entities.OrdemServico.get(osId);
        setOrdem(ordemData);

        const [configData, clienteData, veiculoData, funcData, vendedorData] = await Promise.all([
          base44.entities.Configuracoes.list().then(res => res[0]),
          ordemData.contato_tipo === 'cliente' && ordemData.contato_id
            ? base44.entities.Cliente.get(ordemData.contato_id)
            : Promise.resolve(null),
          ordemData.veiculo_id
            ? base44.entities.Veiculo.get(ordemData.veiculo_id)
            : Promise.resolve(null),
          ordemData.funcionario_id
            ? base44.entities.Funcionario.get(ordemData.funcionario_id)
            : Promise.resolve(null),
          ordemData.vendedor_id
            ? base44.entities.Funcionario.get(ordemData.vendedor_id)
            : Promise.resolve(null)
        ]);

        setConfiguracoes(configData);
        setCliente(clienteData);
        setVeiculo(veiculoData);
        setFuncionario(funcData);
        setVendedor(vendedorData);

        // Auto-imprimir após 1 segundo
        setTimeout(() => {
          window.print();
        }, 1000);

      } catch (err) {
        console.error('Erro ao carregar dados da OS:', err);
        setError('Erro ao carregar dados da OS: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [osId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando dados da OS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Erro ao Carregar OS</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={() => window.close()}>Fechar</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Botões de controle - apenas na tela */}
      <div className="no-print fixed top-4 right-4 flex gap-2 bg-white p-2 rounded-lg shadow-lg z-50">
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir
        </Button>
        <Button variant="outline" onClick={() => window.close()}>
          Fechar
        </Button>
      </div>

      {/* Conteúdo a ser impresso */}
      <ImprimirOSAvancado
        ordem={ordem}
        cliente={cliente}
        veiculo={veiculo}
        funcionario={funcionario}
        vendedor={vendedor}
        configuracoes={configuracoes}
        tipo={tipo}
      />
    </>
  );
}