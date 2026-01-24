import React, { useMemo } from "react";

export default function EspelhoPontoDoc({
  funcionario,
  registros,
  ocorrencias,
  dataInicio,
  dataFim,
  configuracoes,
  escalas,
  funcionariosEscalas,
  cargos = {},
  departamento = null,
  departamentoResponsavel = null
}) {
  const formatarData = (data) => {
    if (!data) return "-";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const formatarHora = (hora) => {
    if (!hora) return "00:00";
    return hora.substring(0, 5);
  };

  const minToHHmm = (min) => {
    if (!min || min === 0) return "00:00";
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    const sinal = min < 0 ? "-" : "+";
    return `${sinal}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Agrupar registros por dia
  const registrosAgrupados = useMemo(() => {
    const grupos = {};
    for (const reg of registros) {
      // Extrair data de data_hora se data não existir
      let data = reg.data;
      if (!data && reg.data_hora) {
        data = reg.data_hora.substring(0, 10);
      }
      if (!data) continue;
      
      if (!grupos[data]) {
        grupos[data] = [];
      }
      grupos[data].push(reg);
    }
    
    // Ordenar batidas e converter em objeto
    const resultado = {};
    for (const data in grupos) {
      const batidas = grupos[data].sort((a, b) => {
        const horaA = a.hora || a.data_hora?.substring(11, 19) || "00:00:00";
        const horaB = b.hora || b.data_hora?.substring(11, 19) || "00:00:00";
        return horaA.localeCompare(horaB);
      });
      resultado[data] = batidas;
    }
    return resultado;
  }, [registros]);

  // Gerar lista de datas do período
  const datasDoPeríodo = useMemo(() => {
    const datas = [];
    let data = new Date(dataInicio + "T12:00:00");
    const fim = new Date(dataFim + "T12:00:00");
    
    while (data <= fim) {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const dia = String(data.getDate()).padStart(2, "0");
      datas.push(`${ano}-${mes}-${dia}`);
      data.setDate(data.getDate() + 1);
    }
    return datas;
  }, [dataInicio, dataFim]);

  const funcEscala = funcionariosEscalas.find(fe => fe.funcionario_id === funcionario?.id);
  const escala = funcEscala ? escalas.find(e => e.id === funcEscala.escala_id) : null;

  return (
    <div className="bg-white p-8 md:p-10 rounded-lg shadow-lg print:shadow-none print:rounded-none print:p-0">
      {/* CABEÇALHO - INFORMAÇÕES DA EMPRESA */}
      <div className="border-b-2 border-slate-800 pb-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {configuracoes?.logo_url && (
            <div>
              <img 
                src={configuracoes.logo_url} 
                alt="Logo" 
                className="h-16 w-auto" 
              />
            </div>
          )}
          <div className="text-center md:text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{configuracoes?.nome_empresa || "EMPRESA"}</h1>
            <p className="text-slate-600 text-xs md:text-sm mt-1">CNPJ: {configuracoes?.cnpj || "-"}</p>
            <p className="text-slate-600 text-xs md:text-sm">{configuracoes?.endereco || ""}</p>
          </div>
          <div className="text-right text-slate-600 text-xs md:text-sm">
            <p><strong>Período:</strong></p>
            <p>{formatarData(dataInicio)} a {formatarData(dataFim)}</p>
          </div>
        </div>
      </div>

      {/* TÍTULO DO DOCUMENTO */}
      <div className="text-center mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">ESPELHO DE PONTO</h2>
        <p className="text-slate-600 text-xs md:text-sm">Documento oficial para assinatura</p>
      </div>

      {/* INFORMAÇÕES DO FUNCIONÁRIO */}
      <div className="border border-slate-300 rounded-lg p-4 md:p-6 mb-8 bg-slate-50">
        <h3 className="text-sm md:text-base font-bold text-slate-900 mb-4">INFORMAÇÕES DO FUNCIONÁRIO</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
          <div>
            <p className="text-slate-600"><strong>Nome:</strong> {funcionario?.nome || "-"}</p>
            <p className="text-slate-600"><strong>CPF:</strong> {funcionario?.cpf || "-"}</p>
            <p className="text-slate-600"><strong>Cargo:</strong> {cargos[funcionario?.cargo_id]?.nome || funcionario?.cargo_id || "-"}</p>
          </div>
          <div>
            <p className="text-slate-600"><strong>Departamento:</strong> {funcionario?.departamento_id || "-"}</p>
            <p className="text-slate-600"><strong>Regime:</strong> {funcionario?.regime?.toUpperCase() || "-"}</p>
            <p className="text-slate-600"><strong>Escala:</strong> {escala?.nome || "Não definida"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-slate-600"><strong>Período de Referência:</strong> {formatarData(dataInicio)} a {formatarData(dataFim)}</p>
          </div>
        </div>
      </div>

      {/* TABELA DE BATIDAS */}
      <div className="mb-8">
        <h3 className="text-sm md:text-base font-bold text-slate-900 mb-4">REGISTRO DE BATIDAS</h3>
        <div className="overflow-x-auto border border-slate-300 rounded-lg">
          <table className="w-full text-xs md:text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-3 md:px-4 py-3 text-left font-semibold border-r border-slate-600">Data</th>
                <th className="px-3 md:px-4 py-3 text-center font-semibold border-r border-slate-600">1ª Batida</th>
                <th className="px-3 md:px-4 py-3 text-center font-semibold border-r border-slate-600">2ª Batida</th>
                <th className="px-3 md:px-4 py-3 text-center font-semibold border-r border-slate-600">3ª Batida</th>
                <th className="px-3 md:px-4 py-3 text-center font-semibold border-r border-slate-600">4ª Batida</th>
                <th className="px-3 md:px-4 py-3 text-center font-semibold">Observações</th>
              </tr>
            </thead>
            <tbody>
              {datasDoPeríodo.map((data) => {
                const batidas = registrosAgrupados[data] || [];
                const ocorrencia = ocorrencias.find(o => o.data === data);
                const batidasArray = ["", "", "", ""];
                
                for (let i = 0; i < batidas.length && i < 4; i++) {
                  const hora = batidas[i].hora || batidas[i].data_hora?.substring(11, 19) || "00:00:00";
                  batidasArray[i] = formatarHora(hora);
                }

                const diaSemana = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"][new Date(data + "T12:00:00").getDay()];

                return (
                  <tr key={data} className="border-b border-slate-300 hover:bg-slate-50">
                    <td className="px-3 md:px-4 py-2 font-semibold text-slate-900 border-r border-slate-200">
                      {formatarData(data)} <span className="text-slate-500">({diaSemana})</span>
                    </td>
                    <td className="px-3 md:px-4 py-2 text-center font-mono text-slate-900 border-r border-slate-200">
                      {batidasArray[0] || "-"}
                    </td>
                    <td className="px-3 md:px-4 py-2 text-center font-mono text-slate-900 border-r border-slate-200">
                      {batidasArray[1] || "-"}
                    </td>
                    <td className="px-3 md:px-4 py-2 text-center font-mono text-slate-900 border-r border-slate-200">
                      {batidasArray[2] || "-"}
                    </td>
                    <td className="px-3 md:px-4 py-2 text-center font-mono text-slate-900 border-r border-slate-200">
                      {batidasArray[3] || "-"}
                    </td>
                    <td className="px-3 md:px-4 py-2 text-left text-slate-600">
                      {ocorrencia ? (
                        <span className="inline-block bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-semibold">
                          {ocorrencia.tipo.toUpperCase()}
                        </span>
                      ) : batidas.length === 0 ? (
                        <span className="text-red-600 font-semibold">SEM REGISTRO</span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESUMO DO PERÍODO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border border-slate-300 rounded-lg p-4 bg-blue-50">
          <p className="text-xs md:text-sm text-slate-600"><strong>Total de Dias Trabalhados:</strong></p>
          <p className="text-2xl font-bold text-blue-700">{datasDoPeríodo.filter(d => registrosAgrupados[d]?.length > 0).length}</p>
        </div>
        <div className="border border-slate-300 rounded-lg p-4 bg-yellow-50">
          <p className="text-xs md:text-sm text-slate-600"><strong>Total de Faltas/Ocorrências:</strong></p>
          <p className="text-2xl font-bold text-yellow-700">{ocorrencias.length}</p>
        </div>
        <div className="border border-slate-300 rounded-lg p-4 bg-green-50">
          <p className="text-xs md:text-sm text-slate-600"><strong>Dias do Período:</strong></p>
          <p className="text-2xl font-bold text-green-700">{datasDoPeríodo.length}</p>
        </div>
      </div>

      {/* ASSINATURAS */}
      <div className="border-t-2 border-slate-800 pt-8 mt-8">
        <h3 className="text-sm md:text-base font-bold text-slate-900 mb-8">ASSINATURAS E AUTORIZAÇÕES</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Funcionário */}
          <div className="text-center">
            <p className="text-slate-600 text-xs md:text-sm mb-2">Funcionário (A):</p>
            <p className="text-slate-600 text-xs md:text-sm mb-1">{funcionario?.nome || "_".repeat(30)}</p>
            <div className="border-t-2 border-slate-800 h-16 print:h-12"></div>
            <p className="text-slate-600 text-xs mt-2">Data: ___/___/______</p>
          </div>

          {/* Responsável Departamento */}
          <div className="text-center">
            <p className="text-slate-600 text-xs md:text-sm mb-2">Responsável do Departamento:</p>
            <p className="text-slate-600 text-xs md:text-sm mb-1">
              {departamentoResponsavel?.nome || "_".repeat(30)}
            </p>
            {departamentoResponsavel?.cargo && (
              <p className="text-slate-500 text-[10px] md:text-xs">{cargos[departamentoResponsavel.cargo_id]?.nome || ""}</p>
            )}
            <div className="border-t-2 border-slate-800 h-16 print:h-12"></div>
            <p className="text-slate-600 text-xs mt-2">Data: ___/___/______</p>
          </div>

          {/* Responsável RH */}
          <div className="text-center">
            <p className="text-slate-600 text-xs md:text-sm mb-2">Responsável RH:</p>
            <p className="text-slate-600 text-xs md:text-sm mb-1">
              {configuracoes?.responsavel_rh_nome || "_".repeat(30)}
            </p>
            {configuracoes?.responsavel_rh_cargo && (
              <p className="text-slate-500 text-[10px] md:text-xs">{configuracoes.responsavel_rh_cargo}</p>
            )}
            <div className="border-t-2 border-slate-800 h-16 print:h-12"></div>
            <p className="text-slate-600 text-xs mt-2">Data: ___/___/______</p>
          </div>

          {/* Responsável Empresa */}
          <div className="text-center">
            <p className="text-slate-600 text-xs md:text-sm mb-2">Responsável Empresa:</p>
            <p className="text-slate-600 text-xs md:text-sm mb-1">
              {configuracoes?.responsavel_empresa_nome || "_".repeat(30)}
            </p>
            {configuracoes?.responsavel_empresa_cargo && (
              <p className="text-slate-500 text-[10px] md:text-xs">{configuracoes.responsavel_empresa_cargo}</p>
            )}
            <div className="border-t-2 border-slate-800 h-16 print:h-12"></div>
            <p className="text-slate-600 text-xs mt-2">Data: ___/___/______</p>
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="border-t-2 border-slate-800 mt-8 pt-4 text-center text-[10px] md:text-xs text-slate-500">
        <p>Documento gerado em {new Date().toLocaleDateString("pt-BR")} - Sistema de Gestão</p>
        <p className="mt-1">Este documento não substitui a comprovação de imposto e legislação trabalhista vigente.</p>
      </div>

      {/* CSS PARA IMPRESSÃO */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:h-12 { height: 3rem !important; }
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}