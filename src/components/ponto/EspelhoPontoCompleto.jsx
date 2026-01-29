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

  const formatarHora = (hora) => (hora ? hora.substring(0, 5) : "—");

  const minToHHmm = (min) => {
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    return `${min < 0 ? "-" : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const registrosAgrupados = useMemo(() => {
    const g = {};
    registros.forEach(r => {
      const data = r.data || r.data_hora?.substring(0, 10);
      if (!data) return;
      g[data] = g[data] || [];
      g[data].push(r);
    });
    Object.values(g).forEach(lista =>
      lista.sort((a, b) =>
        (a.hora || a.data_hora).localeCompare(b.hora || b.data_hora)
      )
    );
    return g;
  }, [registros]);

  const datasDoPeriodo = useMemo(() => {
    const arr = [];
    let d = new Date(dataInicio + "T12:00");
    const fim = new Date(dataFim + "T12:00");
    while (d <= fim) {
      arr.push(d.toISOString().substring(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [dataInicio, dataFim]);

  const funcEscala =
    funcionariosEscalas?.find(f => f.funcionario_id === funcionario?.id) || null;
  const escala =
    escalas?.find(e => e.id === funcEscala?.escala_id) || null;

  const resumo = useMemo(() => {
    let trab = 0, esp = 0, pres = 0, aus = 0, just = 0;

    datasDoPeriodo.forEach(data => {
      const bat = registrosAgrupados[data] || [];
      const ocorr = ocorrencias.find(o => o.data === data);
      const dia = new Date(data + "T12:00").getDay();
      const diaEscala = dia === 0 ? 7 : dia;

      if (escala?.dias_semana &&
        !escala.dias_semana.split(",").includes(String(diaEscala))) return;

      if (ocorr && ["atestado", "ferias", "abonado", "folga"].includes(ocorr.tipo)) {
        just++;
        return;
      }

      let minutos = 0;
      for (let i = 0; i < bat.length - 1; i += 2) {
        const [h1, m1] = (bat[i].hora || bat[i].data_hora.substring(11, 16)).split(":");
        const [h2, m2] = (bat[i + 1].hora || bat[i + 1].data_hora.substring(11, 16)).split(":");
        minutos += (h2 * 60 + +m2) - (h1 * 60 + +m1);
      }

      if (bat.length >= 2) {
        pres++;
        trab += minutos;
      } else {
        aus++;
      }

      esp += escala?.carga_diaria_minutos || 480;
    });

    return {
      pres,
      aus,
      just,
      trab: minToHHmm(trab),
      esp: minToHHmm(esp),
      saldo: minToHHmm(trab - esp)
    };
  }, [datasDoPeriodo, registrosAgrupados, ocorrencias, escala]);

  return (
    <div className="bg-white">
      <style>{`
        @page { size: A4; margin: 18mm 15mm; }
        @media print {
          * { print-color-adjust: exact; }
          .no-print { display: none !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
        @media screen {
          .page {
            max-width: 210mm;
            margin: auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,.12);
          }
        }
      `}</style>

      <div className="page">
        {/* CABEÇALHO */}
        <div className="bg-slate-900 text-white px-8 py-3 flex justify-between">
          <div className="flex gap-4 items-center">
            {configuracoes?.logo_url && (
              <img src={configuracoes.logo_url} className="h-9 bg-white p-1 rounded" />
            )}
            <div>
              <p className="text-sm font-bold uppercase">
                {configuracoes?.nome_empresa}
              </p>
              <p className="text-[11px] text-slate-300">
                CNPJ: {configuracoes?.cnpj}
              </p>
            </div>
          </div>
          <div className="text-right text-[11px]">
            <p className="uppercase text-slate-300">Período</p>
            <p className="font-bold">
              {formatarData(dataInicio)} a {formatarData(dataFim)}
            </p>
          </div>
        </div>

        {/* TÍTULO */}
        <div className="text-center my-8">
          <div className="inline-block border border-slate-800 px-10 py-3">
            <h2 className="text-3xl font-extrabold tracking-wide">
              ESPELHO DE PONTO
            </h2>
            <p className="text-[11px] text-slate-600 mt-1">
              Registro oficial de jornada – Portaria MTE nº 671/2021
            </p>
          </div>
        </div>

        {/* DADOS DO COLABORADOR */}
        <div className="px-8 mb-6 text-[11px]">
          <div className="grid grid-cols-4 gap-4 border-b border-slate-300 pb-4">
            <div className="col-span-2">
              <span className="text-slate-500">Colaborador</span>
              <p className="font-bold">{funcionario?.nome}</p>
            </div>
            <div>
              <span className="text-slate-500">CPF</span>
              <p className="font-mono">{funcionario?.cpf}</p>
            </div>
            <div>
              <span className="text-slate-500">Cargo</span>
              <p>{cargos[funcionario?.cargo_id]?.nome}</p>
            </div>
          </div>
        </div>

        {/* REGISTROS */}
        <table className="w-full text-[11px] border-t border-b border-slate-800">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-2 text-left">Data</th>
              <th className="p-2 text-center">Dia</th>
              <th className="p-2 text-center">1ª Ent.</th>
              <th className="p-2 text-center">1ª Saí.</th>
              <th className="p-2 text-center">2ª Ent.</th>
              <th className="p-2 text-center">2ª Saí.</th>
              <th className="p-2 text-left">Observações</th>
            </tr>
          </thead>
          <tbody>
            {datasDoPeriodo.map(data => {
              const bat = registrosAgrupados[data] || [];
              const dia = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"]
                [new Date(data+"T12").getDay()];
              return (
                <tr key={data} className="border-t border-slate-300">
                  <td className="p-2">{formatarData(data)}</td>
                  <td className="p-2 text-center">{dia}</td>
                  {[0,1,2,3].map(i => (
                    <td key={i} className="p-2 text-center font-mono font-medium">
                      {formatarHora(bat[i]?.hora || bat[i]?.data_hora?.substring(11,16))}
                    </td>
                  ))}
                  <td className="p-2"></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* APURAÇÃO */}
        <div className="px-8 mt-6">
          <table className="w-full border border-slate-800 text-[11px]">
            <tbody>
              <tr>
                <td className="p-3 font-bold">Dias Presentes</td>
                <td className="p-3 text-center">{resumo.pres}</td>
                <td className="p-3 font-bold">Ausências</td>
                <td className="p-3 text-center">{resumo.aus}</td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-bold">Justificativas</td>
                <td className="p-3 text-center">{resumo.just}</td>
                <td className="p-3 font-bold">Saldo Final</td>
                <td className="p-3 text-center font-bold">{resumo.saldo}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ASSINATURAS */}
        <div className="grid grid-cols-2 gap-10 px-8 mt-20 text-[11px]">
          {[funcionario?.nome, departamentoResponsavel?.nome].map((n,i)=>(
            <div key={i}>
              <p className="font-bold">{n || " "}</p>
              <div className="border-b border-slate-800 h-10 my-2"></div>
              <p>Assinatura</p>
            </div>
          ))}
        </div>

        {/* RODAPÉ */}
        <div className="text-center text-[9px] mt-10 text-slate-500 italic border-t pt-3">
          Documento gerado eletronicamente pelo sistema de controle de ponto da empresa.  
          Válido para fins legais conforme Portaria MTE nº 671/2021.
        </div>
      </div>
    </div>
  );
}