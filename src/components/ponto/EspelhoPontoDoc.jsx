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

  // Calcular resumo
  const calcularResumo = () => {
    let totalTrabalhado = 0;
    let totalEsperado = 0;
    let diasComRegistro = 0;
    let diasSemRegistro = 0;
    let ocorrenciasCount = 0;

    datasDoPeríodo.forEach(data => {
      const batidas = registrosAgrupados[data] || [];
      const ocorrencia = ocorrencias.find(o => o.data === data);
      const diaSemana = new Date(data + "T12:00:00").getDay();
      
      const isDiaTrabalho = escala?.dias_semana ? 
        escala.dias_semana.split(',').includes(String(diaSemana === 0 ? 7 : diaSemana)) :
        diaSemana >= 1 && diaSemana <= 5;

      if (!isDiaTrabalho) return;

      const temJustificativaIsenta = ocorrencia && ['atestado', 'ferias', 'abonado', 'folga'].includes(ocorrencia.tipo);
      
      if (temJustificativaIsenta) {
        ocorrenciasCount++;
        return;
      }

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

      const cargaDiaria = escala?.carga_diaria_minutos || 480;
      if (batidas.length > 0) {
        totalEsperado += cargaDiaria;
        diasComRegistro++;
      } else {
        diasSemRegistro++;
        totalEsperado += cargaDiaria;
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

  const resumo = calcularResumo();

  return (
    <div className="bg-white print:bg-white">
      <style>{`
        @page {
          size: A4;
          margin: 20mm 15mm;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print { display: none !important; }
          
          table { 
            page-break-inside: auto;
            border-collapse: collapse;
          }
          
          tr { 
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead { display: table-header-group; }
          
          .signature-section {
            page-break-before: auto;
            page-break-inside: avoid;
            margin-top: 30mm;
          }

          /* Cores exatas para impressão */
          .print-header { background-color: #1e293b !important; }
          .print-border { border-color: #1e293b !important; }
          .print-gray { background-color: #f8fafc !important; }
          .print-blue { background-color: #dbeafe !important; }
        }
      `}</style>

      <div className="p-0">
        {/* CABEÇALHO CORPORATIVO */}
        <div className="print-header bg-slate-800 text-white px-8 py-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {configuracoes?.logo_url && (
              <img 
                src={configuracoes.logo_url} 
                alt="Logo" 
                className="h-14 w-auto bg-white p-1 rounded" 
              />
            )}
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wide">
                {configuracoes?.nome_empresa || "EMPRESA"}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                CNPJ: {configuracoes?.cnpj || "-"}
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="font-bold mb-1">PERÍODO DE APURAÇÃO</div>
            <div>{formatarData(dataInicio)} a {formatarData(dataFim)}</div>
          </div>
        </div>

        {/* TÍTULO E TIPO DO DOCUMENTO */}
        <div className="text-center mb-6">
          <div className="inline-block border-4 print-border border-slate-800 px-8 py-3">
            <h2 className="text-2xl font-bold text-slate-900 tracking-wider">ESPELHO DE PONTO</h2>
            <p className="text-xs text-slate-600 mt-1">Documento Oficial de Registro de Jornada</p>
          </div>
        </div>

        {/* IDENTIFICAÇÃO DO COLABORADOR */}
        <div className="border-2 print-border border-slate-800 mb-6">
          <div className="print-header bg-slate-800 text-white px-4 py-2">
            <h3 className="text-sm font-bold uppercase">Identificação do Colaborador</h3>
          </div>
          <div className="px-6 py-4 print-gray bg-slate-50">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-2 font-bold w-1/4">Nome Completo:</td>
                  <td className="py-2 text-slate-900">{funcionario?.nome || "-"}</td>
                  <td className="py-2 font-bold w-1/6">CPF:</td>
                  <td className="py-2 text-slate-900">{funcionario?.cpf || "-"}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2 font-bold">Cargo:</td>
                  <td className="py-2 text-slate-900">{cargos[funcionario?.cargo_id]?.nome || "-"}</td>
                  <td className="py-2 font-bold">ID Relógio:</td>
                  <td className="py-2 text-slate-900 font-mono">{funcionario?.user_id_relogio || "-"}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2 font-bold">Departamento:</td>
                  <td className="py-2 text-slate-900">{departamento?.nome || "-"}</td>
                  <td className="py-2 font-bold">Regime:</td>
                  <td className="py-2 text-slate-900 uppercase">{funcionario?.regime || "-"}</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold">Escala de Trabalho:</td>
                  <td className="py-2 text-slate-900" colspan="3">
                    {escala?.nome || "Não definida"} 
                    {escala && ` • ${escala.hora_entrada_prevista} às ${escala.hora_saida_prevista}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* REGISTROS DE PONTO */}
        <div className="mb-6">
          <div className="print-header bg-slate-800 text-white px-4 py-2 mb-0">
            <h3 className="text-sm font-bold uppercase">Registros de Ponto do Período</h3>
          </div>
          <table className="w-full text-xs border-2 print-border border-slate-800">
            <thead>
              <tr className="print-header bg-slate-800 text-white">
                <th className="px-3 py-2 text-left font-bold border-r border-white/20">DATA</th>
                <th className="px-3 py-2 text-center font-bold border-r border-white/20">DIA</th>
                <th className="px-3 py-2 text-center font-bold border-r border-white/20">1ª ENTRADA</th>
                <th className="px-3 py-2 text-center font-bold border-r border-white/20">1ª SAÍDA</th>
                <th className="px-3 py-2 text-center font-bold border-r border-white/20">2ª ENTRADA</th>
                <th className="px-3 py-2 text-center font-bold border-r border-white/20">2ª SAÍDA</th>
                <th className="px-3 py-2 text-left font-bold">OBSERVAÇÕES</th>
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
                  <tr key={data} className={`border-b border-slate-300 ${isWeekend ? 'print-gray bg-slate-100' : idx % 2 === 0 ? 'bg-white' : 'print-gray bg-slate-50'}`}>
                    <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-300">
                      {formatarData(data)}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-700 font-semibold border-r border-slate-300">
                      {diaSemana}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-bold border-r border-slate-300">
                      {batidasArray[0] || "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-bold border-r border-slate-300">
                      {batidasArray[1] || "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-bold border-r border-slate-300">
                      {batidasArray[2] || "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-bold border-r border-slate-300">
                      {batidasArray[3] || "—"}
                    </td>
                    <td className="px-3 py-2 text-left">
                      {ocorrencia ? (
                        <span className="font-bold uppercase text-[10px]">
                          {ocorrencia.tipo === "atestado" && "🏥 ATESTADO MÉDICO"}
                          {ocorrencia.tipo === "abonado" && "✅ FALTA ABONADA"}
                          {ocorrencia.tipo === "ferias" && "🌴 PERÍODO DE FÉRIAS"}
                          {ocorrencia.tipo === "folga" && "📅 FOLGA COMPENSATÓRIA"}
                          {!["atestado", "abonado", "ferias", "folga"].includes(ocorrencia.tipo) && ocorrencia.tipo.toUpperCase()}
                        </span>
                      ) : batidas.length === 0 && !isWeekend ? (
                        <span className="font-bold text-red-600 text-[10px]">⚠️ SEM REGISTRO</span>
                      ) : batidas.length > 4 ? (
                        <span className="font-bold text-[10px]">📋 {batidas.length} BATIDAS REGISTRADAS</span>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* APURAÇÃO DO PERÍODO */}
        <div className="border-2 print-border border-slate-800 mb-6">
          <div className="print-header bg-slate-800 text-white px-4 py-2">
            <h3 className="text-sm font-bold uppercase">Apuração do Período</h3>
          </div>
          <div className="grid grid-cols-4 divide-x divide-slate-300">
            <div className="p-4 text-center print-blue bg-blue-50">
              <div className="text-xs text-blue-900 font-bold mb-1">DIAS TRABALHADOS</div>
              <div className="text-3xl font-bold text-blue-700">{resumo.diasComRegistro}</div>
            </div>
            <div className="p-4 text-center bg-red-50">
              <div className="text-xs text-red-900 font-bold mb-1">FALTAS</div>
              <div className="text-3xl font-bold text-red-700">{resumo.diasSemRegistro}</div>
            </div>
            <div className="p-4 text-center bg-yellow-50">
              <div className="text-xs text-yellow-900 font-bold mb-1">OCORRÊNCIAS</div>
              <div className="text-3xl font-bold text-yellow-700">{resumo.ocorrenciasCount}</div>
            </div>
            <div className={`p-4 text-center ${resumo.saldo.startsWith('+') ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`text-xs font-bold mb-1 ${resumo.saldo.startsWith('+') ? 'text-green-900' : 'text-red-900'}`}>
                SALDO DE HORAS
              </div>
              <div className={`text-3xl font-bold ${resumo.saldo.startsWith('+') ? 'text-green-700' : 'text-red-700'}`}>
                {resumo.saldo}
              </div>
              <div className="text-[9px] text-slate-600 mt-1">
                {resumo.trabalhadas} / {resumo.esperadas}
              </div>
            </div>
          </div>
        </div>

        {/* DECLARAÇÃO */}
        <div className="border-l-4 print-border border-slate-800 print-blue bg-blue-50 px-4 py-3 mb-6 text-xs">
          <p className="font-bold mb-2 text-slate-900">DECLARAÇÃO DE VERACIDADE:</p>
          <p className="text-slate-700 leading-relaxed">
            Declaro, para os devidos fins, que as informações constantes neste Espelho de Ponto são verdadeiras 
            e correspondem fielmente à minha jornada de trabalho no período especificado, conforme registros 
            do sistema eletrônico de controle de ponto da empresa.
          </p>
        </div>

        {/* ASSINATURAS */}
        <div className="signature-section border-t-4 print-border border-slate-800 pt-6">
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Funcionário */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2 uppercase">Colaborador(a)</div>
              <div className="text-sm font-bold text-slate-900 mb-4">
                {funcionario?.nome || "_".repeat(50)}
              </div>
              <div className="border-b-2 print-border border-slate-800 mb-2 h-16"></div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Assinatura do Colaborador</span>
                <span>Data: ___/___/______</span>
              </div>
            </div>

            {/* Responsável Departamento */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2 uppercase">Gestor Imediato</div>
              <div className="text-sm font-bold text-slate-900 mb-4">
                {departamentoResponsavel?.nome || "_".repeat(50)}
              </div>
              {departamentoResponsavel?.cargo_id && (
                <div className="text-[10px] text-slate-600 mb-3">{cargos[departamentoResponsavel.cargo_id]?.nome}</div>
              )}
              <div className="border-b-2 print-border border-slate-800 mb-2 h-16"></div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Assinatura do Gestor</span>
                <span>Data: ___/___/______</span>
              </div>
            </div>

            {/* RH */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2 uppercase">Recursos Humanos</div>
              <div className="text-sm font-bold text-slate-900 mb-4">
                {configuracoes?.responsavel_rh_nome || "_".repeat(50)}
              </div>
              {configuracoes?.responsavel_rh_cargo && (
                <div className="text-[10px] text-slate-600 mb-3">{configuracoes.responsavel_rh_cargo}</div>
              )}
              <div className="border-b-2 print-border border-slate-800 mb-2 h-16"></div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Assinatura RH</span>
                <span>Data: ___/___/______</span>
              </div>
            </div>

            {/* Responsável Legal */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2 uppercase">Responsável Legal</div>
              <div className="text-sm font-bold text-slate-900 mb-4">
                {configuracoes?.responsavel_empresa_nome || "_".repeat(50)}
              </div>
              {configuracoes?.responsavel_empresa_cargo && (
                <div className="text-[10px] text-slate-600 mb-3">{configuracoes.responsavel_empresa_cargo}</div>
              )}
              <div className="border-b-2 print-border border-slate-800 mb-2 h-16"></div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Assinatura Responsável</span>
                <span>Data: ___/___/______</span>
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ LEGAL */}
        <div className="border-t-2 border-slate-300 mt-6 pt-3 text-center">
          <p className="text-[9px] text-slate-600 font-bold mb-1">
            Documento gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-[9px] text-slate-500">
            Documento válido como comprovante de frequência • Conforme Portaria MTE nº 671/2021
          </p>
          <p className="text-[9px] text-slate-500">
            {configuracoes?.endereco} • Tel: {configuracoes?.telefone || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}