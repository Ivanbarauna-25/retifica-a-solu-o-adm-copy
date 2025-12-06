import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate } from '@/components/formatters';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Função auxiliar para formatar CPF
const formatCPF = (cpf) => {
  if (!cpf) return '-';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
};

// Função auxiliar para formatar telefone
const formatPhone = (phone) => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export default function FichaFuncionarioPage() {
  const [funcionario, setFuncionario] = useState(null);
  const [cargo, setCargo] = useState(null);
  const [departamento, setDepartamento] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const params = new URLSearchParams(window.location.search);
      const funcionarioId = params.get('id');

      if (!funcionarioId) {
        setError('ID do funcionário não fornecido');
        setLoading(false);
        return;
      }

      try {
        const [funcionarioData, configData] = await Promise.all([
          base44.entities.Funcionario.filter({ id: funcionarioId }),
          base44.entities.Configuracoes.list()
        ]);

        const func = funcionarioData?.[0];
        if (!func) {
          setError('Funcionário não encontrado');
          setLoading(false);
          return;
        }

        setFuncionario(func);
        setConfig(configData?.[0]);

        // Buscar cargo e departamento
        if (func.cargo_id) {
          const cargoData = await base44.entities.Cargo.filter({ id: func.cargo_id });
          setCargo(cargoData?.[0]);
        }

        if (func.departamento_id) {
          const deptData = await base44.entities.Departamento.filter({ id: func.departamento_id });
          setDepartamento(deptData?.[0]);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar dados do funcionário');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const getStatusLabel = (status) => {
    const labels = {
      ativo: 'Ativo',
      experiencia: 'Em Experiência',
      ferias: 'Em Férias',
      afastado: 'Afastado',
      demitido: 'Demitido'
    };
    return labels[status] || status;
  };

  const getRegimeLabel = (regime) => {
    const regimes = {
      clt: 'CLT',
      pj: 'PJ',
      estagio: 'Estágio',
      aprendiz: 'Aprendiz',
      temporario: 'Temporário',
      terceirizado: 'Terceirizado'
    };
    return regimes[regime] || regime;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (error || !funcionario) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-slate-600">{error || 'Funcionário não encontrado'}</p>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
        
        @media screen {
          body {
            background: #f1f5f9;
          }
        }
      `}} />

      <div className="p-8 bg-white max-w-4xl mx-auto my-8 shadow-lg print:shadow-none print:my-0">
        {/* Botão de Impressão - Apenas na tela */}
        <div className="no-print flex justify-end mb-4">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir Ficha
          </Button>
        </div>

        {/* Cabeçalho com Logo e Nome da Empresa */}
        <div className="text-center mb-8 pb-6 border-b-2 border-slate-800">
          {config?.logo_url && (
            <img src={config.logo_url} alt="Logo" className="h-16 mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold text-slate-900">
            {config?.nome_empresa || 'Retifica a Solução Ltda'}
          </h1>
          <h2 className="text-lg text-slate-600 mt-2">
            Ficha de Funcionário
          </h2>
          <p className="text-sm text-slate-500 mt-3">
            Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Dados Principais */}
        <div className="mb-6">
          <div className="bg-slate-100 p-4 rounded-lg mb-6">
            <h3 className="font-bold text-slate-800 text-xl mb-2">{funcionario.nome}</h3>
            <div className="flex gap-6 mt-3 text-sm flex-wrap">
              <div>
                <span className="text-slate-500 font-medium">Status:</span>{' '}
                <span className="text-slate-900 font-semibold">{getStatusLabel(funcionario.status)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Regime:</span>{' '}
                <span className="text-slate-900 font-semibold">{getRegimeLabel(funcionario.regime)}</span>
              </div>
            </div>
          </div>

          {/* Informações Pessoais */}
          <div className="mb-6">
            <h4 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-300 text-base">
              Informações Pessoais
            </h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {funcionario.cpf && (
                <div>
                  <span className="text-slate-500 block text-xs mb-1">CPF</span>
                  <span className="text-slate-900 font-medium">{formatCPF(funcionario.cpf)}</span>
                </div>
              )}
              {funcionario.rg && (
                <div>
                  <span className="text-slate-500 block text-xs mb-1">RG</span>
                  <span className="text-slate-900 font-medium">{funcionario.rg}</span>
                </div>
              )}
              {funcionario.data_nascimento && (
                <div>
                  <span className="text-slate-500 block text-xs mb-1">Data de Nascimento</span>
                  <span className="text-slate-900 font-medium">{formatDate(funcionario.data_nascimento)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Informações Profissionais */}
          <div className="mb-6">
            <h4 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-300 text-base">
              Informações Profissionais
            </h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {cargo && (
                <div>
                  <span className="text-slate-500 block text-xs mb-1">Cargo</span>
                  <span className="text-slate-900 font-medium">{cargo.nome}</span>
                </div>
              )}
              {departamento && (
                <div>
                  <span className="text-slate-500 block text-xs mb-1">Departamento</span>
                  <span className="text-slate-900 font-medium">{departamento.nome}</span>
                </div>
              )}
              {funcionario.data_inicio && (
                <div>
                  <span className="text-slate-500 block text-xs mb-1">Data de Início</span>
                  <span className="text-slate-900 font-medium">{formatDate(funcionario.data_inicio)}</span>
                </div>
              )}
              {funcionario.data_fim_experiencia && (
                <div>
                  <span className="text-slate-500 block text-xs mb-1">Fim do Período de Experiência</span>
                  <span className="text-slate-900 font-medium">{formatDate(funcionario.data_fim_experiencia)}</span>
                </div>
              )}
              {funcionario.salario && (
                <div>
                  <span className="text-slate-500 block text-xs mb-1">Salário</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(funcionario.salario)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contato */}
          {(funcionario.email || funcionario.telefone || funcionario.telefone2) && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-300 text-base">
                Contato
              </h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {funcionario.email && (
                  <div>
                    <span className="text-slate-500 block text-xs mb-1">Email</span>
                    <span className="text-slate-900 font-medium">{funcionario.email}</span>
                  </div>
                )}
                {funcionario.telefone && (
                  <div>
                    <span className="text-slate-500 block text-xs mb-1">Telefone</span>
                    <span className="text-slate-900 font-medium">{formatPhone(funcionario.telefone)}</span>
                  </div>
                )}
                {funcionario.telefone2 && (
                  <div>
                    <span className="text-slate-500 block text-xs mb-1">Telefone 2</span>
                    <span className="text-slate-900 font-medium">{formatPhone(funcionario.telefone2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Endereço */}
          {(funcionario.logradouro || funcionario.cep) && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-300 text-base">
                Endereço
              </h4>
              <div className="text-sm text-slate-900 space-y-1">
                {funcionario.logradouro && (
                  <p>{funcionario.logradouro}{funcionario.numero ? `, ${funcionario.numero}` : ''}</p>
                )}
                {funcionario.complemento && <p>{funcionario.complemento}</p>}
                {funcionario.bairro && <p>{funcionario.bairro}</p>}
                {(funcionario.cidade || funcionario.uf) && (
                  <p>{funcionario.cidade}{funcionario.uf ? ` - ${funcionario.uf}` : ''}</p>
                )}
                {funcionario.cep && <p>CEP: {funcionario.cep}</p>}
              </div>
            </div>
          )}

          {/* Dados Bancários */}
          {(funcionario.banco || funcionario.pix) && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-300 text-base">
                Dados Bancários
              </h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {funcionario.banco && (
                  <>
                    <div>
                      <span className="text-slate-500 block text-xs mb-1">Banco</span>
                      <span className="text-slate-900 font-medium">{funcionario.banco}</span>
                    </div>
                    {funcionario.agencia && (
                      <div>
                        <span className="text-slate-500 block text-xs mb-1">Agência</span>
                        <span className="text-slate-900 font-medium">{funcionario.agencia}</span>
                      </div>
                    )}
                    {funcionario.conta && (
                      <div>
                        <span className="text-slate-500 block text-xs mb-1">Conta</span>
                        <span className="text-slate-900 font-medium">{funcionario.conta}</span>
                      </div>
                    )}
                    {funcionario.tipo_conta && (
                      <div>
                        <span className="text-slate-500 block text-xs mb-1">Tipo de Conta</span>
                        <span className="text-slate-900 font-medium capitalize">{funcionario.tipo_conta}</span>
                      </div>
                    )}
                  </>
                )}
                {funcionario.pix && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-xs mb-1">Chave PIX</span>
                    <span className="text-slate-900 font-medium">{funcionario.pix}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contato de Emergência */}
          {funcionario.contato_emergencia && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-300 text-base">
                Contato de Emergência
              </h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs mb-1">Nome</span>
                  <span className="text-slate-900 font-medium">{funcionario.contato_emergencia}</span>
                </div>
                {funcionario.telefone_emergencia && (
                  <div>
                    <span className="text-slate-500 block text-xs mb-1">Telefone</span>
                    <span className="text-slate-900 font-medium">{formatPhone(funcionario.telefone_emergencia)}</span>
                  </div>
                )}
                {funcionario.parente_emergencia && (
                  <div>
                    <span className="text-slate-500 block text-xs mb-1">Parentesco</span>
                    <span className="text-slate-900 font-medium">{funcionario.parente_emergencia}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Configurações de Ponto e Horas Extras */}
          {(funcionario.regra_desconto_falta || funcionario.fator_hora_extra_semana || funcionario.fator_hora_extra_fds) && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-300 text-base">
                Configurações de Ponto
              </h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {funcionario.regra_desconto_falta && (
                  <div>
                    <span className="text-slate-500 block text-xs mb-1">Regra Desconto Falta</span>
                    <span className="text-slate-900 font-medium capitalize">{funcionario.regra_desconto_falta.replace('_', ' ')}</span>
                  </div>
                )}
                {funcionario.fator_hora_extra_semana && (
                  <div>
                    <span className="text-slate-500 block text-xs mb-1">Fator Hora Extra (Semana)</span>
                    <span className="text-slate-900 font-medium">{funcionario.fator_hora_extra_semana}x</span>
                  </div>
                )}
                {funcionario.fator_hora_extra_fds && (
                  <div>
                    <span className="text-slate-500 block text-xs mb-1">Fator Hora Extra (FDS/Feriado)</span>
                    <span className="text-slate-900 font-medium">{funcionario.fator_hora_extra_fds}x</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observações */}
          {funcionario.observacoes && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-300 text-base">
                Observações
              </h4>
              <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">{funcionario.observacoes}</p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="mt-8 pt-4 border-t border-slate-300 text-center text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-700">{config?.nome_empresa || 'Retifica a Solução Ltda'}</p>
          {config?.endereco && <p>{config.endereco}</p>}
          {config?.telefone && <p>Telefone: {config.telefone}</p>}
          {config?.email && <p>Email: {config.email}</p>}
        </div>
      </div>
    </>
  );
}