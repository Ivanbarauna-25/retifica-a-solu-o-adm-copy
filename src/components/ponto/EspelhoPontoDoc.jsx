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
    if (!hora) return "—";
    return hora.substring(0, 5);
  };

  const minToHHmm = (min) => {
    if (!min || min === 0) return "00:00";
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    const sinal = min < 0 ? "-" : "+";
    return `${sinal}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const registrosAgrupados = useMemo(() => {
    const grupos = {};
    for (const reg of registros) {
      let data = reg.data;
      if (!data && reg.data_hora) {
        data = reg.data_hora.substring(0, 10);
      }
      if (!data) continue;
      
      if (!grupos[data]) grupos[data] = [];
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

  const calcularResumo = () => {
    let totalTrabalhado = 0;
    let totalEsperado = 0;
    let diasPresentes = 0;
    let diasAusentes = 0;
    let ocorrenciasJustificadas = 0;

    datasDoPeríodo.forEach(data => {
      const batidas = registrosAgrupados[data] || [];
      const ocorrencia = ocorrencias.find(o => o.data === data);
      const diaSemana = new Date(data + "T12:00:00").getDay();
      
      const isDiaTrabalho = escala?.dias_semana ? 
        escala.dias_semana.split(',').includes(String(diaSemana === 0 ? 7 : diaSemana)) :
        diaSemana >= 1 && diaSemana <= 5;

      if (!isDiaTrabalho) return;

      const temJustificativa = ocorrencia && ['atestado', 'ferias', 'abonado', 'folga'].includes(ocorrencia.tipo);
      
      if (temJustificativa) {
        ocorrenciasJustificadas++;
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
          minutosTrabalhadosDia += ((hS * 60 + mS) - (hE * 60 + mE));
        }
      }

      totalTrabalhado += minutosTrabalhadosDia;

      const cargaDiaria = escala?.carga_diaria_minutos || 480;
      if (batidas.length > 0) {
        totalEsperado += cargaDiaria;
        diasPresentes++;
      } else {
        diasAusentes++;
        totalEsperado += cargaDiaria;
      }
    });

    const saldoMin = totalTrabalhado - totalEsperado;
    
    return {
      trabalhadas: minToHHmm(totalTrabalhado),
      esperadas: minToHHmm(totalEsperado),
      saldo: minToHHmm(saldoMin),
      saldoPositivo: saldoMin >= 0,
      diasPresentes,
      diasAusentes,
      ocorrenciasJustificadas
    };
  };

  const resumo = calcularResumo();

  return (
    <div className="bg-white">
      <style>{`
        @page {
          size: A4;
          margin: 18mm 15mm;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: white;
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
          
          .signature-area {
            page-break-inside: avoid;
            margin-top: 25mm;
          }

          .header-gradient {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
          }

          .border-primary { border-color: #0f172a !important; }
          .bg-subtle { background-color: #f8fafc !important; }
          .bg-info { background-color: #eff6ff !important; }
        }

        @media screen {
          .page-container {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      <div className="page-container p-0">
        {/* ========== CABEÇALHO INSTITUCIONAL ========== */}
        <div className="header-gradient bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {configuracoes?.logo_url && (
                <div className="bg-white p-2 rounded-lg shadow-lg">
                  <img 
                    src={configuracoes.logo_url} 
                    alt="Logo" 
                    className="h-12 w-auto" 
                  />
                </div>
              )}
              <div>
                <h1 className="text-xl font-extrabold uppercase tracking-wider mb-1">
                  {configuracoes?.nome_empresa || "EMPRESA"}
                </h1>
                <div className="text-xs text-slate-300 space-y-0.5">
                  <p>CNPJ: {configuracoes?.cnpj || "—"}</p>
                  {configuracoes?.endereco && <p>{configuracoes.endereco}</p>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                <p className="text-[10px] text-slate-300 uppercase tracking-wide mb-1">Período de Referência</p>
                <p className="text-sm font-bold">{formatarData(dataInicio)}</p>
                <p className="text-xs">até</p>
                <p className="text-sm font-bold">{formatarData(dataFim)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========== IDENTIFICAÇÃO DO DOCUMENTO ========== */}
        <div className="px-8 py-6">
          <div className="text-center mb-6">
            <div className="inline-block border-4 border-primary border-slate-900 px-10 py-4 bg-subtle bg-slate-50">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">ESPELHO DE PONTO</h2>
              <p className="text-xs text-slate-600 uppercase tracking-widest">Registro Oficial de Jornada de Trabalho</p>
              <div className="mt-3 pt-2 border-t border-slate-300">
                <p className="text-[10px] text-slate-500">
                  Emitido em conformidade com a Portaria MTE nº 671/2021
                </p>
              </div>
            </div>
          </div>

          {/* ========== DADOS DO COLABORADOR ========== */}
          <div className="border-2 border-primary border-slate-900 mb-6">
            <div className="header-gradient bg-slate-900 text-white px-4 py-2.5">
              <h3 className="text-sm font-bold uppercase tracking-wide">Dados do Colaborador</h3>
            </div>
            <div className="bg-subtle bg-slate-50 px-6 py-5">
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div className="col-span-2 border-b border-slate-300 pb-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Nome Completo</p>
                  <p className="font-bold text-slate-900">{funcionario?.nome || "—"}</p>
                </div>
                <div className="border-b border-slate-300 pb-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">CPF</p>
                  <p className="font-bold text-slate-900 font-mono">{funcionario?.cpf || "—"}</p>
                </div>
                <div className="border-b border-slate-300 pb-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Matrícula</p>
                  <p className="font-bold text-slate-900 font-mono">{funcionario?.user_id_relogio || "—"}</p>
                </div>
                <div className="border-b border-slate-300 pb-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Cargo</p>
                  <p className="font-bold text-slate-900">{cargos[funcionario?.cargo_id]?.nome || "—"}</p>
                </div>
                <div className="border-b border-slate-300 pb-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Departamento</p>
                  <p className="font-bold text-slate-900">{departamento?.nome || "—"}</p>
                </div>
                <div className="border-b border-slate-300 pb-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Regime</p>
                  <p className="font-bold text-slate-900 uppercase">{funcionario?.regime || "—"}</p>
                </div>
                <div className="border-b border-slate-300 pb-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Admissão</p>
                  <p className="font-bold text-slate-900">{funcionario?.data_inicio ? formatarData(funcionario.data_inicio) : "—"}</p>
                </div>
                <div className="col-span-4 pt-2">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Escala de Trabalho</p>
                  <p className="font-bold text-slate-900">
                    {escala?.nome || "Não definida"} 
                    {escala && <span className="text-slate-600 font-normal"> • {escala.hora_entrada_prevista} às {escala.hora_saida_prevista}</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========== REGISTROS DE PONTO ========== */}
          <div className="mb-6">
            <div className="header-gradient bg-slate-900 text-white px-4 py-2.5 mb-0">
              <h3 className="text-sm font-bold uppercase tracking-wide">Registros de Marcações de Ponto</h3>
            </div>
            <table className="w-full text-[10px] border-2 border-primary border-slate-900">
              <thead>
                <tr className="header-gradient bg-slate-900 text-white divide-x divide-white/10">
                  <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide">Data</th>
                  <th className="px-2 py-2.5 text-center font-bold uppercase tracking-wide">Dia</th>
                  <th className="px-2 py-2.5 text-center font-bold uppercase tracking-wide">1ª Ent.</th>
                  <th className="px-2 py-2.5 text-center font-bold uppercase tracking-wide">1ª Saí.</th>
                  <th className="px-2 py-2.5 text-center font-bold uppercase tracking-wide">2ª Ent.</th>
                  <th className="px-2 py-2.5 text-center font-bold uppercase tracking-wide">2ª Saí.</th>
                  <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
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
                    <tr key={data} className={`divide-x divide-slate-200 ${isWeekend ? 'bg-subtle bg-slate-100' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <td className="px-3 py-2 font-bold text-slate-900">
                        {formatarData(data)}
                      </td>
                      <td className="px-2 py-2 text-center font-semibold text-slate-700">
                        {diaSemana}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-slate-900">
                        {batidasArray[0]}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-slate-900">
                        {batidasArray[1]}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-slate-900">
                        {batidasArray[2]}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-slate-900">
                        {batidasArray[3]}
                      </td>
                      <td className="px-3 py-2 text-left">
                        {ocorrencia ? (
                          <span className="font-bold uppercase text-[9px] tracking-wide">
                            {ocorrencia.tipo === "atestado" && "🏥 ATESTADO"}
                            {ocorrencia.tipo === "abonado" && "✓ ABONADO"}
                            {ocorrencia.tipo === "ferias" && "🏖 FÉRIAS"}
                            {ocorrencia.tipo === "folga" && "📅 FOLGA"}
                            {!["atestado", "abonado", "ferias", "folga"].includes(ocorrencia.tipo) && ocorrencia.tipo.toUpperCase()}
                          </span>
                        ) : batidas.length === 0 && !isWeekend ? (
                          <span className="font-bold text-red-700 text-[9px]">⚠ AUSENTE</span>
                        ) : batidas.length > 4 ? (
                          <span className="font-semibold text-[9px]">{batidas.length} BATIDAS</span>
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

          {/* ========== APURAÇÃO E TOTALIZADORES ========== */}
          <div className="border-2 border-primary border-slate-900 mb-6">
            <div className="header-gradient bg-slate-900 text-white px-4 py-2.5">
              <h3 className="text-sm font-bold uppercase tracking-wide">Apuração do Período</h3>
            </div>
            <div className="grid grid-cols-4 divide-x divide-slate-300">
              <div className="p-4 text-center bg-info bg-blue-50">
                <p className="text-[10px] text-blue-900 font-bold uppercase tracking-wide mb-2">Dias Presentes</p>
                <p className="text-4xl font-black text-blue-700">{resumo.diasPresentes}</p>
              </div>
              <div className="p-4 text-center bg-red-50">
                <p className="text-[10px] text-red-900 font-bold uppercase tracking-wide mb-2">Ausências</p>
                <p className="text-4xl font-black text-red-700">{resumo.diasAusentes}</p>
              </div>
              <div className="p-4 text-center bg-amber-50">
                <p className="text-[10px] text-amber-900 font-bold uppercase tracking-wide mb-2">Justificativas</p>
                <p className="text-4xl font-black text-amber-700">{resumo.ocorrenciasJustificadas}</p>
              </div>
              <div className={`p-4 text-center ${resumo.saldoPositivo ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${resumo.saldoPositivo ? 'text-emerald-900' : 'text-red-900'}`}>
                  Saldo Final
                </p>
                <p className={`text-4xl font-black ${resumo.saldoPositivo ? 'text-emerald-700' : 'text-red-700'}`}>
                  {resumo.saldo}
                </p>
                <p className="text-[9px] text-slate-600 mt-2">
                  Trab: {resumo.trabalhadas} • Esp: {resumo.esperadas}
                </p>
              </div>
            </div>
          </div>

          {/* ========== DECLARAÇÃO DE CONFORMIDADE ========== */}
          <div className="border-l-4 border-primary border-slate-900 bg-info bg-blue-50 px-4 py-3 mb-6">
            <p className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">Declaração de Conformidade</p>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Declaro, sob as penas da lei, que as informações constantes neste Espelho de Ponto são verdadeiras 
              e correspondem fielmente à minha jornada de trabalho durante o período especificado, conforme 
              registros do sistema eletrônico de controle de ponto adotado pela empresa.
            </p>
          </div>

          {/* ========== ASSINATURAS ========== */}
          <div className="signature-area border-t-4 border-primary border-slate-900 pt-8">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6 text-center">
              Validação e Autenticação do Documento
            </h3>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {/* Colaborador */}
              <div>
                <div className="mb-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Colaborador</p>
                  <p className="text-xs font-bold text-slate-900">{funcionario?.nome || "_".repeat(50)}</p>
                  <p className="text-[9px] text-slate-600">{cargos[funcionario?.cargo_id]?.nome || ""}</p>
                </div>
                <div className="border-b-2 border-primary border-slate-900 mb-2 h-14"></div>
                <div className="flex justify-between text-[9px] text-slate-600">
                  <span>Assinatura</span>
                  <span>Data: ___/___/______</span>
                </div>
              </div>

              {/* Gestor Imediato */}
              <div>
                <div className="mb-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Gestor Imediato</p>
                  <p className="text-xs font-bold text-slate-900">{departamentoResponsavel?.nome || "_".repeat(50)}</p>
                  <p className="text-[9px] text-slate-600">{departamentoResponsavel?.cargo_id ? cargos[departamentoResponsavel.cargo_id]?.nome : ""}</p>
                </div>
                <div className="border-b-2 border-primary border-slate-900 mb-2 h-14"></div>
                <div className="flex justify-between text-[9px] text-slate-600">
                  <span>Assinatura</span>
                  <span>Data: ___/___/______</span>
                </div>
              </div>

              {/* Recursos Humanos */}
              <div>
                <div className="mb-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Recursos Humanos</p>
                  <p className="text-xs font-bold text-slate-900">{configuracoes?.responsavel_rh_nome || "_".repeat(50)}</p>
                  <p className="text-[9px] text-slate-600">{configuracoes?.responsavel_rh_cargo || ""}</p>
                </div>
                <div className="border-b-2 border-primary border-slate-900 mb-2 h-14"></div>
                <div className="flex justify-between text-[9px] text-slate-600">
                  <span>Assinatura e Carimbo</span>
                  <span>Data: ___/___/______</span>
                </div>
              </div>

              {/* Representante Legal */}
              <div>
                <div className="mb-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Representante Legal</p>
                  <p className="text-xs font-bold text-slate-900">{configuracoes?.responsavel_empresa_nome || "_".repeat(50)}</p>
                  <p className="text-[9px] text-slate-600">{configuracoes?.responsavel_empresa_cargo || ""}</p>
                </div>
                <div className="border-b-2 border-primary border-slate-900 mb-2 h-14"></div>
                <div className="flex justify-between text-[9px] text-slate-600">
                  <span>Assinatura e Carimbo</span>
                  <span>Data: ___/___/______</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========== RODAPÉ INSTITUCIONAL ========== */}
          <div className="border-t-2 border-slate-300 mt-8 pt-4 text-center">
            <p className="text-[9px] text-slate-600 font-bold mb-1">
              Documento gerado eletronicamente em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}h
            </p>
            <p className="text-[9px] text-slate-500 mb-0.5">
              Válido como comprovante oficial de frequência • Portaria MTE nº 671/2021
            </p>
            <p className="text-[9px] text-slate-500">
              {configuracoes?.endereco} • {configuracoes?.telefone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}