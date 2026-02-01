import React, { useMemo } from "react";

export default function EspelhoPontoDoc({
  funcionario,
  registros = [],
  ocorrencias = [],
  dataInicio,
  dataFim,
  configuracoes,
  escalas = [],
  funcionariosEscalas = [],
  cargos = {},
  departamento = null,
  departamentoResponsavel = null
}) {
  const formatarData = (data) => {
    if (!data) return "—";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const formatarHora = (hora) => hora ? hora.substring(0, 5) : "—";

  const minToHHmm = (min) => {
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    return `${min < 0 ? "-" : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const registrosAgrupados = useMemo(() => {
    const grupos = {};
    registros.forEach(r => {
      const data = r.data || r.data_hora?.substring(0, 10);
      if (!data) return;
      grupos[data] = grupos[data] || [];
      grupos[data].push(r);
    });
    Object.values(grupos).forEach(lista =>
      lista.sort((a, b) =>
        (a.hora || a.data_hora).localeCompare(b.hora || b.data_hora)
      )
    );
    return grupos;
  }, [registros]);

  const datasDoPeriodo = useMemo(() => {
    const datas = [];
    let d = new Date(dataInicio + "T12:00");
    const fim = new Date(dataFim + "T12:00");
    while (d <= fim) {
      datas.push(d.toISOString().substring(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return datas;
  }, [dataInicio, dataFim]);

  const funcEscala = funcionariosEscalas.find(f => f.funcionario_id === funcionario?.id);
  const escala = escalas.find(e => e.id === funcEscala?.escala_id);

  const resumo = useMemo(() => {
    let trab = 0, esp = 0, pres = 0, aus = 0, just = 0;

    datasDoPeriodo.forEach(data => {
      const batidas = registrosAgrupados[data] || [];
      const ocorr = ocorrencias.find(o => o.data === data);
      const dia = new Date(data + "T12:00").getDay();
      const diaEscala = dia === 0 ? 7 : dia;

      // Verificar se é dia de trabalho na escala
      const escalaAtiva = escala?.dias_semana?.[dia]?.ativo;
      if (escala?.dias_semana && escalaAtiva === false) return;

      if (ocorr && ["atestado", "ferias", "abonado", "folga"].includes(ocorr.tipo)) {
        just++;
        return;
      }

      let minutos = 0;
      for (let i = 0; i < batidas.length - 1; i += 2) {
        if (!batidas[i + 1]) break; // Sem par completo
        const h1 = batidas[i].hora || batidas[i].data_hora.substring(11, 16);
        const h2 = batidas[i + 1].hora || batidas[i + 1].data_hora.substring(11, 16);
        const [h1h, h1m] = h1.split(":").map(Number);
        const [h2h, h2m] = h2.split(":").map(Number);
        minutos += (h2h * 60 + h2m) - (h1h * 60 + h1m);
      }

      // Considerar presente se tem pelo menos 1 par de batidas (entrada + saída)
      if (batidas.length >= 2 && minutos > 0) {
        pres++;
        trab += minutos;
      } else if (batidas.length > 0) {
        // Tem batidas mas incompletas
        aus++;
      } else {
        // Sem batidas
        aus++;
      }

      esp += escala?.carga_diaria_minutos || 480;
    });

    return {
      pres, aus, just,
      trab: minToHHmm(trab),
      esp: minToHHmm(esp),
      saldo: minToHHmm(trab - esp),
      positivo: trab >= esp
    };
  }, [datasDoPeriodo, registrosAgrupados, ocorrencias, escala]);

  return (
    <div className="bg-white">
      <style>{`
        @page { size: A4; margin: 15mm 12mm; }
        @media print {
          * { print-color-adjust: exact; }
          .no-print { display: none !important; }
          button { display: none !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
        @media screen {
          .page { max-width: 210mm; margin: auto; box-shadow: 0 0 8px rgba(0,0,0,.08); }
        }
      `}</style>

      <div className="page p-0">
        {/* CABEÇALHO */}
        <div className="bg-slate-800 text-white px-6 py-3 flex justify-between items-center">
          <div className="flex gap-3 items-center">
            {configuracoes?.logo_url && (
              <img src={configuracoes.logo_url} className="h-8 bg-white p-1 rounded" alt="Logo" />
            )}
            <div>
              <h1 className="text-base font-bold uppercase tracking-wide">{configuracoes?.nome_empresa}</h1>
              <p className="text-[10px] text-slate-300">CNPJ: {configuracoes?.cnpj}</p>
            </div>
          </div>
          <div className="text-[10px] text-right">
            <p className="text-slate-300">Período</p>
            <p className="font-bold">{formatarData(dataInicio)} a {formatarData(dataFim)}</p>
          </div>
        </div>

        {/* TÍTULO */}
        <div className="text-center my-6">
          <div className="inline-block border-2 border-slate-800 px-8 py-3">
            <h2 className="text-2xl font-black tracking-tight">ESPELHO DE PONTO</h2>
            <p className="text-[9px] mt-1 text-slate-500">
              Registro oficial de jornada – Portaria MTE nº 671/2021
            </p>
          </div>
        </div>

        {/* IDENTIFICAÇÃO */}
        <div className="px-6 mb-4 text-[10px] border-2 border-slate-800">
          <div className="bg-slate-800 text-white px-3 py-1.5 -mx-0 -mt-0 mb-3">
            <p className="font-bold text-xs uppercase tracking-wide">Dados do Colaborador</p>
          </div>
          <div className="grid grid-cols-4 gap-3 pb-3">
            <div className="col-span-2">
              <span className="text-slate-500 uppercase tracking-wide">Colaborador</span>
              <p className="font-bold text-slate-900">{funcionario?.nome}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wide">CPF</span>
              <p className="font-mono text-slate-900">{funcionario?.cpf}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wide">Cargo</span>
              <p className="text-slate-900">{cargos[funcionario?.cargo_id]?.nome}</p>
            </div>
          </div>
        </div>

        {/* TABELA */}
        <div className="px-6 mb-4">
          <table className="w-full text-[9px] border-2 border-slate-800">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-2 py-2 text-left font-bold uppercase tracking-wide">Data</th>
                <th className="px-2 py-2 text-center font-bold uppercase tracking-wide">Dia</th>
                <th className="px-2 py-2 text-center font-bold uppercase tracking-wide">1ª Ent.</th>
                <th className="px-2 py-2 text-center font-bold uppercase tracking-wide">1ª Saí.</th>
                <th className="px-2 py-2 text-center font-bold uppercase tracking-wide">2ª Ent.</th>
                <th className="px-2 py-2 text-center font-bold uppercase tracking-wide">2ª Saí.</th>
                <th className="px-2 py-2 text-left font-bold uppercase tracking-wide">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {datasDoPeriodo.map((data, idx) => {
                const bat = registrosAgrupados[data] || [];
                const dia = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"][new Date(data+"T12").getDay()];
                const ocorr = ocorrencias.find(o => o.data === data);
                return (
                  <tr key={data} className={`border-t border-slate-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-2 py-1.5 font-semibold">{formatarData(data)}</td>
                    <td className="px-2 py-1.5 text-center">{dia}</td>
                    {[0,1,2,3].map(i => (
                      <td key={i} className="px-2 py-1.5 text-center font-mono font-semibold">
                        {formatarHora(bat[i]?.hora || bat[i]?.data_hora?.substring(11,16))}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-[8px] uppercase">
                      {ocorr ? ocorr.tipo : bat.length === 0 ? "AUSENTE" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* APURAÇÃO */}
        <div className="px-6 mb-4">
          <div className="grid grid-cols-4 text-center border-2 border-slate-800">
            <div className="p-3 border-r border-slate-300">
              <p className="text-[9px] uppercase text-slate-500 mb-1">Presentes</p>
              <p className="text-2xl font-black">{resumo.pres}</p>
            </div>
            <div className="p-3 border-r border-slate-300">
              <p className="text-[9px] uppercase text-slate-500 mb-1">Ausências</p>
              <p className="text-2xl font-black">{resumo.aus}</p>
            </div>
            <div className="p-3 border-r border-slate-300">
              <p className="text-[9px] uppercase text-slate-500 mb-1">Justificadas</p>
              <p className="text-2xl font-black">{resumo.just}</p>
            </div>
            <div className="p-3">
              <p className="text-[9px] uppercase text-slate-500 mb-1">Saldo</p>
              <p className="text-2xl font-black">{resumo.saldo}</p>
            </div>
          </div>
        </div>

        {/* ASSINATURAS */}
        <div className="px-6 mt-10">
          <div className="grid grid-cols-2 gap-8 text-[10px]">
            <div>
              <p className="font-bold mb-1">{funcionario?.nome}</p>
              <p className="text-slate-500 mb-2">Colaborador</p>
              <div className="border-b-2 border-slate-800 h-10 mb-2"></div>
              <p className="text-slate-500">Assinatura</p>
            </div>
            <div>
              <p className="font-bold mb-1">{configuracoes?.responsavel_empresa_nome || departamentoResponsavel?.nome}</p>
              <p className="text-slate-500 mb-2">Responsável / Empresa</p>
              <div className="border-b-2 border-slate-800 h-10 mb-2"></div>
              <p className="text-slate-500">Assinatura</p>
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="text-center text-[8px] mt-8 px-6 pt-3 border-t text-slate-500">
          Documento gerado eletronicamente em {new Date().toLocaleDateString("pt-BR")} • Portaria MTE nº 671/2021
        </div>
      </div>
    </div>
  );
}