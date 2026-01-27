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

  // Calcular saldo de horas
  const calcularSaldoHoras = () => {
    let totalTrabalhado = 0;
    let totalEsperado = 0;
    let diasComRegistro = 0;
    let diasSemRegistro = 0;
    let ocorrenciasCount = 0;

    datasDoPeríodo.forEach(data => {
      const batidas = registrosAgrupados[data] || [];
      const ocorrencia = ocorrencias.find(o => o.data === data);
      const diaSemana = new Date(data + "T12:00:00").getDay();
      
      // Verificar se é dia de trabalho segundo a escala
      const isDiaTrabalho = escala?.dias_semana ? 
        escala.dias_semana.split(',').includes(String(diaSemana === 0 ? 7 : diaSemana)) :
        diaSemana >= 1 && diaSemana <= 5; // Segunda a Sexta por padrão

      if (!isDiaTrabalho) return; // Ignora finais de semana/folgas

      // Se tem justificativa que isenta, não conta como falta nem trabalho
      const temJustificativaIsenta = ocorrencia && ['atestado', 'ferias', 'abonado', 'folga'].includes(ocorrencia.tipo);
      
      if (temJustificativaIsenta) {
        ocorrenciasCount++;
        return;
      }

      // Calcular horas trabalhadas
      let minutosTrabalhadosDia = 0;
      for (let i = 0; i < batidas.length - 1; i += 2) {
        const entrada = batidas[i];
        const saida = batidas[i + 1];
        if (entrada && saida) {
          const horaEntrada = entrada.hora || entrada.data_hora?.substring(11, 19) || "00:00:00";
          const horaSaida = saida.hora || saida.data_hora?.substring(11, 19) || "00:00:00";
          
          const [hE, mE] = horaEntrada.split(':').map(Number);
          const [hS, mS] = horaSaida.split(':').map(Number);
          const minEntrada = hE * 60 + mE;
          const minSaida = hS * 60 + mS;
          minutosTrabalhadosDia += (minSaida - minEntrada);
        }
      }

      totalTrabalhado += minutosTrabalhadosDia;

      // Horas esperadas
      const cargaDiaria = escala?.carga_diaria_minutos || 480;
      if (batidas.length > 0) {
        totalEsperado += cargaDiaria;
        diasComRegistro++;
      } else {
        // Sem batidas e sem justificativa = falta
        diasSemRegistro++;
        totalEsperado += cargaDiaria; // Conta como esperado mesmo sem batida
      }
    });

    const saldoMin = totalTrabalhado - totalEsperado;
    
    return {
      trabalhadas: minToHHmm(totalTrabalhado),
      esperadas: minToHHmm(totalEsperado),
      saldo: minToHHmm(saldoMin),
      diasComRegistro,
      diasSemRegistro,
      ocorrenciasCount
    };
  };

  const resumo = calcularSaldoHoras();

  return (
    <div className="bg-white print:bg-white">
      <style>{`
        @page {
          size: A4;
          margin: 15mm;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .print-page {
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: auto;
          }

          table {
            page-break-inside: auto;
            width: 100%;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          .signature-section {
            page-break-inside: avoid;
            margin-top: 20mm;
          }

          /* Cores mantidas na impressão */
          .bg-slate-800 { background-color: #1e293b !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-green-50 { background-color: #f0fdf4 !important; }
          .bg-yellow-50 { background-color: #fefce8 !important; }
          .bg-red-50 { background-color: #fef2f2 !important; }
          .border-slate-800 { border-color: #1e293b !important; }
          .border-slate-300 { border-color: #cbd5e1 !important; }
          .border-slate-200 { border-color: #e2e8f0 !important; }
        }
      `}</style>

      <div className="print-page p-6 md:p-8">
        {/* CABEÇALHO EMPRESARIAL */}
        <div className="border-b-4 border-slate-800 pb-6 mb-6 bg-gradient-to-r from-slate-50 to-white rounded-t-lg print:bg-white print:rounded-none">
          <div className="flex items-start justify-between gap-4">
            {configuracoes?.logo_url && (
              <div className="flex-shrink-0">
                <img 
                  src={configuracoes.logo_url} 
                  alt="Logo da Empresa" 
                  className="h-16 md:h-20 w-auto object-contain" 
                />
              </div>
            )}
            <div className="flex-1 text-center">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 uppercase tracking-wide">
                {configuracoes?.nome_empresa || "EMPRESA"}
              </h1>
              <div className="text-slate-700 text-xs md:text-sm mt-2 space-y-0.5">
                <p><strong>CNPJ:</strong> {configuracoes?.cnpj || "-"}</p>
                {configuracoes?.endereco && <p>{configuracoes.endereco}</p>}
                {configuracoes?.telefone && <p><strong>Tel:</strong> {configuracoes.telefone}</p>}
              </div>
            </div>
            <div className="flex-shrink-0 text-right text-slate-700 text-xs md:text-sm bg-slate-100 px-4 py-2 rounded-lg border border-slate-300">
              <p className="font-bold text-slate-900">PERÍODO</p>
              <p className="mt-1">{formatarData(dataInicio)}</p>
              <p>a</p>
              <p>{formatarData(dataFim)}</p>
            </div>
          </div>
        </div>

        {/* TÍTULO DO DOCUMENTO */}
        <div className="text-center mb-6 py-4 bg-slate-800 text-white rounded-lg print:bg-slate-800 print:rounded-none">
          <h2 className="text-lg md:text-xl font-bold tracking-wider">ESPELHO DE PONTO</h2>
          <p className="text-slate-300 text-xs mt-1">Registro oficial de jornada de trabalho</p>
        </div>

        {/* DADOS DO FUNCIONÁRIO */}
        <div className="border-2 border-slate-800 rounded-lg p-4 md:p-5 mb-6 bg-slate-50 print:bg-slate-50">
          <h3 className="text-sm md:text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-300">
            DADOS DO FUNCIONÁRIO
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs md:text-sm text-slate-700">
            <div className="flex">
              <span className="font-bold min-w-[120px]">Nome:</span>
              <span>{funcionario?.nome || "-"}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[120px]">CPF:</span>
              <span>{funcionario?.cpf || "-"}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[120px]">Cargo:</span>
              <span>{cargos[funcionario?.cargo_id]?.nome || funcionario?.cargo_id || "-"}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[120px]">Departamento:</span>
              <span>{departamento?.nome || funcionario?.departamento_id || "-"}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[120px]">Regime:</span>
              <span className="uppercase">{funcionario?.regime || "-"}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[120px]">ID Relógio:</span>
              <span>{funcionario?.user_id_relogio || "-"}</span>
            </div>
            <div className="flex md:col-span-2">
              <span className="font-bold min-w-[120px]">Escala:</span>
              <span>{escala?.nome || "Não definida"} {escala && `(${escala.hora_entrada_prevista} - ${escala.hora_saida_prevista})`}</span>
            </div>
          </div>
        </div>

        {/* TABELA DE REGISTROS DE PONTO */}
        <div className="mb-6">
          <h3 className="text-sm md:text-base font-bold text-slate-900 mb-3">REGISTRO DE BATIDAS</h3>
          <div className="overflow-x-auto border-2 border-slate-300 rounded-lg print:border-slate-800">
            <table className="w-full text-[10px] md:text-xs border-collapse">
              <thead className="bg-gradient-to-r from-slate-800 to-slate-700 text-white print:bg-slate-800">
                <tr>
                  <th className="px-2 md:px-3 py-2.5 text-left font-bold border-r border-slate-600 whitespace-nowrap">Data</th>
                  <th className="px-2 md:px-3 py-2.5 text-left font-bold border-r border-slate-600 whitespace-nowrap">Dia</th>
                  <th className="px-2 md:px-3 py-2.5 text-center font-bold border-r border-slate-600 whitespace-nowrap">1ª Batida</th>
                  <th className="px-2 md:px-3 py-2.5 text-center font-bold border-r border-slate-600 whitespace-nowrap">2ª Batida</th>
                  <th className="px-2 md:px-3 py-2.5 text-center font-bold border-r border-slate-600 whitespace-nowrap">3ª Batida</th>
                  <th className="px-2 md:px-3 py-2.5 text-center font-bold border-r border-slate-600 whitespace-nowrap">4ª Batida</th>
                  <th className="px-2 md:px-3 py-2.5 text-left font-bold whitespace-nowrap">Observações</th>
                </tr>
              </thead>
              <tbody>
                {datasDoPeríodo.map((data, idx) => {
                  const batidas = registrosAgrupados[data] || [];
                  const ocorrencia = ocorrencias.find(o => o.data === data);
                  const batidasArray = ["", "", "", ""];
                  
                  for (let i = 0; i < batidas.length && i < 4; i++) {
                    const hora = batidas[i].hora || batidas[i].data_hora?.substring(11, 19) || "00:00:00";
                    batidasArray[i] = formatarHora(hora);
                  }

                  const diaSemana = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"][new Date(data + "T12:00:00").getDay()];
                  const isWeekend = diaSemana === "DOM" || diaSemana === "SÁB";

                  return (
                    <tr key={data} className={`border-b border-slate-200 ${isWeekend ? 'bg-slate-100 print:bg-slate-100' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50 print:bg-slate-50'}`}>
                      <td className="px-2 md:px-3 py-2 font-semibold text-slate-900 border-r border-slate-200">
                        {formatarData(data)}
                      </td>
                      <td className="px-2 md:px-3 py-2 text-slate-700 border-r border-slate-200 font-medium">
                        {diaSemana}
                      </td>
                      <td className="px-2 md:px-3 py-2 text-center font-mono font-semibold text-slate-900 border-r border-slate-200">
                        {batidasArray[0] || "-"}
                      </td>
                      <td className="px-2 md:px-3 py-2 text-center font-mono font-semibold text-slate-900 border-r border-slate-200">
                        {batidasArray[1] || "-"}
                      </td>
                      <td className="px-2 md:px-3 py-2 text-center font-mono font-semibold text-slate-900 border-r border-slate-200">
                        {batidasArray[2] || "-"}
                      </td>
                      <td className="px-2 md:px-3 py-2 text-center font-mono font-semibold text-slate-900 border-r border-slate-200">
                        {batidasArray[3] || "-"}
                      </td>
                      <td className="px-2 md:px-3 py-2 text-left text-slate-700">
                        {ocorrencia ? (
                          <span className={`inline-block px-2 py-0.5 rounded font-bold text-[9px] md:text-[10px] uppercase ${
                            ocorrencia.tipo === "atestado" ? "bg-purple-200 text-purple-900" :
                            ocorrencia.tipo === "abonado" ? "bg-green-200 text-green-900" :
                            ocorrencia.tipo === "ferias" ? "bg-cyan-200 text-cyan-900" :
                            ocorrencia.tipo === "folga" ? "bg-blue-200 text-blue-900" :
                            "bg-yellow-200 text-yellow-900"
                          }`}>
                            {ocorrencia.tipo}
                          </span>
                        ) : batidas.length === 0 && !isWeekend ? (
                          <span className="text-red-600 font-bold text-[9px] md:text-[10px]">SEM REGISTRO</span>
                        ) : batidas.length > 4 ? (
                          <span className="inline-block bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-bold text-[9px] md:text-[10px]">
                            {batidas.length} BATIDAS
                          </span>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <div className="border-2 border-blue-300 rounded-lg p-3 bg-gradient-to-br from-blue-50 to-blue-100 print:from-blue-50 print:to-blue-50">
            <p className="text-[9px] md:text-xs text-blue-900 font-bold uppercase mb-1">Dias com Registro</p>
            <p className="text-2xl md:text-3xl font-bold text-blue-700">{resumo.diasComRegistro}</p>
          </div>
          <div className="border-2 border-red-300 rounded-lg p-3 bg-gradient-to-br from-red-50 to-red-100 print:from-red-50 print:to-red-50">
            <p className="text-[9px] md:text-xs text-red-900 font-bold uppercase mb-1">Faltas</p>
            <p className="text-2xl md:text-3xl font-bold text-red-700">{resumo.diasSemRegistro}</p>
          </div>
          <div className="border-2 border-yellow-300 rounded-lg p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 print:from-yellow-50 print:to-yellow-50">
            <p className="text-[9px] md:text-xs text-yellow-900 font-bold uppercase mb-1">Ocorrências</p>
            <p className="text-2xl md:text-3xl font-bold text-yellow-700">{resumo.ocorrenciasCount}</p>
          </div>
          <div className={`border-2 rounded-lg p-3 ${
            resumo.saldo.startsWith('+') ? 
            'border-green-300 bg-gradient-to-br from-green-50 to-green-100 print:from-green-50 print:to-green-50' : 
            'border-red-300 bg-gradient-to-br from-red-50 to-red-100 print:from-red-50 print:to-red-50'
          }`}>
            <p className={`text-[9px] md:text-xs font-bold uppercase mb-1 ${resumo.saldo.startsWith('+') ? 'text-green-900' : 'text-red-900'}`}>
              Saldo de Horas
            </p>
            <p className={`text-2xl md:text-3xl font-bold ${resumo.saldo.startsWith('+') ? 'text-green-700' : 'text-red-700'}`}>
              {resumo.saldo}
            </p>
            <p className="text-[9px] md:text-xs text-slate-600 mt-1">
              {resumo.trabalhadas} / {resumo.esperadas}
            </p>
          </div>
        </div>

        {/* DECLARAÇÃO */}
        <div className="bg-blue-50 border-l-4 border-blue-600 p-3 md:p-4 mb-8 rounded-r-lg print:bg-blue-50">
          <p className="text-xs md:text-sm text-slate-800 leading-relaxed">
            Declaro que as informações contidas neste espelho de ponto são verdadeiras e correspondem 
            à minha jornada de trabalho no período especificado, conforme registros do sistema de 
            controle de ponto eletrônico.
          </p>
        </div>

        {/* ASSINATURAS */}
        <div className="signature-section border-t-4 border-slate-800 pt-8">
          <h3 className="text-sm md:text-base font-bold text-slate-900 mb-6 uppercase">Assinaturas e Autorizações</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Funcionário */}
            <div>
              <p className="text-slate-700 text-xs md:text-sm mb-2 font-semibold">FUNCIONÁRIO(A):</p>
              <p className="text-slate-900 text-xs md:text-sm font-bold mb-3">{funcionario?.nome || "_".repeat(40)}</p>
              <div className="border-b-2 border-slate-800 mb-2 h-16 print:h-12"></div>
              <div className="flex justify-between text-[10px] md:text-xs text-slate-600">
                <span>Assinatura do Funcionário</span>
                <span>Data: ___/___/______</span>
              </div>
            </div>

            {/* Responsável Departamento */}
            <div>
              <p className="text-slate-700 text-xs md:text-sm mb-2 font-semibold">RESPONSÁVEL DO DEPARTAMENTO:</p>
              <p className="text-slate-900 text-xs md:text-sm font-bold mb-3">
                {departamentoResponsavel?.nome || "_".repeat(40)}
              </p>
              {departamentoResponsavel?.cargo_id && (
                <p className="text-slate-600 text-[10px] md:text-xs mb-2">{cargos[departamentoResponsavel.cargo_id]?.nome || ""}</p>
              )}
              <div className="border-b-2 border-slate-800 mb-2 h-16 print:h-12"></div>
              <div className="flex justify-between text-[10px] md:text-xs text-slate-600">
                <span>Assinatura do Responsável</span>
                <span>Data: ___/___/______</span>
              </div>
            </div>

            {/* Responsável RH */}
            <div>
              <p className="text-slate-700 text-xs md:text-sm mb-2 font-semibold">RESPONSÁVEL RH:</p>
              <p className="text-slate-900 text-xs md:text-sm font-bold mb-3">
                {configuracoes?.responsavel_rh_nome || "_".repeat(40)}
              </p>
              {configuracoes?.responsavel_rh_cargo && (
                <p className="text-slate-600 text-[10px] md:text-xs mb-2">{configuracoes.responsavel_rh_cargo}</p>
              )}
              <div className="border-b-2 border-slate-800 mb-2 h-16 print:h-12"></div>
              <div className="flex justify-between text-[10px] md:text-xs text-slate-600">
                <span>Assinatura RH</span>
                <span>Data: ___/___/______</span>
              </div>
            </div>

            {/* Responsável Empresa */}
            <div>
              <p className="text-slate-700 text-xs md:text-sm mb-2 font-semibold">RESPONSÁVEL LEGAL:</p>
              <p className="text-slate-900 text-xs md:text-sm font-bold mb-3">
                {configuracoes?.responsavel_empresa_nome || "_".repeat(40)}
              </p>
              {configuracoes?.responsavel_empresa_cargo && (
                <p className="text-slate-600 text-[10px] md:text-xs mb-2">{configuracoes.responsavel_empresa_cargo}</p>
              )}
              <div className="border-b-2 border-slate-800 mb-2 h-16 print:h-12"></div>
              <div className="flex justify-between text-[10px] md:text-xs text-slate-600">
                <span>Assinatura Responsável Legal</span>
                <span>Data: ___/___/______</span>
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="border-t-2 border-slate-300 mt-8 pt-4 text-center">
          <p className="text-[9px] md:text-xs text-slate-600">
            <strong>Documento gerado automaticamente em:</strong> {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-[9px] md:text-xs text-slate-500 mt-1">
            Este documento é válido como comprovante de frequência para fins administrativos e trabalhistas.
          </p>
          <p className="text-[9px] md:text-xs text-slate-500 mt-1">
            Sistema de Gestão de Ponto Eletrônico - Conforme Portaria MTE nº 671/2021
          </p>
        </div>
      </div>
    </div>
  );
}