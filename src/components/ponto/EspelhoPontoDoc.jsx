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
  /* ================= UTILIDADES ================= */
  const formatarData = (data) => {
    if (!data) return "—";
    const [a, m, d] = data.split("-");
    return `${d}/${m}/${a}`;
  };

  const formatarHora = (hora) =>
    hora ? hora.substring(0, 5) : "—";

  const minToHHmm = (min) => {
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    return `${min < 0 ? "-" : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  /* ================= REGISTROS POR DATA ================= */
  const registrosPorData = useMemo(() => {
    const map = {};
    registros.forEach(r => {
      const data = r.data || r.data_hora?.substring(0, 10);
      if (!data) return;
      map[data] = map[data] || [];
      map[data].push(r);
    });
    Object.values(map).forEach(lista =>
      lista.sort((a, b) =>
        (a.hora || a.data_hora).localeCompare(b.hora || b.data_hora)
      )
    );
    return map;
  }, [registros]);

  /* ================= PERÍODO ================= */
  const datasPeriodo = useMemo(() => {
    const arr = [];
    let d = new Date(dataInicio + "T12:00");
    const fim = new Date(dataFim + "T12:00");
    while (d <= fim) {
      arr.push(d.toISOString().substring(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [dataInicio, dataFim]);

  /* ================= ESCALA ================= */
  const funcEscala = funcionariosEscalas.find(
    f => f.funcionario_id === funcionario?.id
  );
  const escala = escalas.find(e => e.id === funcEscala?.escala_id);

  /* ================= RESUMO CORRIGIDO ================= */
  const resumo = useMemo(() => {
    let pres = 0;
    let aus = 0;
    let just = 0;
    let trab = 0;
    let esp = 0;

    datasPeriodo.forEach(data => {
      if (!escala) return;

      const diaSemana = new Date(data + "T12").getDay();
      const diaEscala = diaSemana === 0 ? 7 : diaSemana;

      if (
        escala.dias_semana &&
        !escala.dias_semana.split(",").includes(String(diaEscala))
      ) {
        return; // fora da escala → não conta
      }

      const batidas = registrosPorData[data] || [];
      const ocorr = ocorrencias.find(o => o.data === data);

      // Justificativas
      if (ocorr && ["atestado", "abonado", "ferias", "folga"].includes(ocorr.tipo)) {
        just++;
        esp += escala.carga_diaria_minutos || 480;
        return;
      }

      // Carga esperada
      esp += escala.carga_diaria_minutos || 480;

      if (batidas.length >= 2) {
        pres++;

        let minutos = 0;
        for (let i = 0; i < batidas.length - 1; i += 2) {
          const h1 = batidas[i].hora || batidas[i].data_hora.substring(11, 16);
          const h2 = batidas[i + 1].hora || batidas[i + 1].data_hora.substring(11, 16);
          const [h1h, h1m] = h1.split(":").map(Number);
          const [h2h, h2m] = h2.split(":").map(Number);
          minutos += (h2h * 60 + h2m) - (h1h * 60 + h1m);
        }

        trab += minutos;
      } else {
        aus++;
      }
    });

    return {
      pres,
      aus,
      just,
      trab: minToHHmm(trab),
      esp: minToHHmm(esp),
      saldo: minToHHmm(trab - esp)
    };
  }, [datasPeriodo, registrosPorData, ocorrencias, escala]);

  /* ================= RENDER ================= */
  return (
    <div className="bg-white">
      <style>{`
        @page { size: A4; margin: 18mm 15mm; }
        @media print {
          * { print-color-adjust: exact; }
          .no-print { display: none !important; }
          thead { display: table-header-group; }
          tr, tbody tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-[210mm] mx-auto">

        {/* CABEÇALHO */}
        <div className="bg-slate-900 text-white px-8 py-4 flex justify-between">
          <div>
            <p className="font-bold uppercase">{configuracoes?.nome_empresa}</p>
            <p className="text-[11px] text-slate-300">
              CNPJ: {configuracoes?.cnpj} • {configuracoes?.endereco}
            </p>
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
            <p className="text-[11px] text-slate-600">
              Registro oficial de jornada – Portaria MTE nº 671/2021
            </p>
          </div>
        </div>

        {/* DADOS */}
        <div className="px-8 text-[11px] mb-6">
          <div className="grid grid-cols-4 gap-4 border-b pb-4">
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

        {/* TABELA */}
        <table className="w-full text-[11px] border-t border-b border-slate-800">
          <thead className="bg-slate-800 text-white">
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
            {datasPeriodo.map(data => {
              const bat = registrosPorData[data] || [];
              const ocorr = ocorrencias.find(o => o.data === data);
              const dia = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"]
                [new Date(data+"T12").getDay()];
              return (
                <tr key={data} className="border-t">
                  <td className="p-2">{formatarData(data)}</td>
                  <td className="p-2 text-center">{dia}</td>
                  {[0,1,2,3].map(i => (
                    <td key={i} className="p-2 text-center font-mono">
                      {formatarHora(bat[i]?.hora || bat[i]?.data_hora?.substring(11,16))}
                    </td>
                  ))}
                  <td className="p-2 text-[10px]">
                    {ocorr?.descricao || ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* APURAÇÃO */}
        <div className="px-8 mt-6">
          <table className="w-full border text-[11px]">
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
        <div className={`grid ${departamentoResponsavel ? "grid-cols-2" : "grid-cols-1"} gap-10 px-8 mt-20 text-[11px]`}>
          <div>
            <p className="font-bold">{funcionario?.nome}</p>
            <div className="border-b h-10 my-2"></div>
            <p>Assinatura</p>
          </div>
          {departamentoResponsavel && (
            <div>
              <p className="font-bold">{departamentoResponsavel?.nome}</p>
              <div className="border-b h-10 my-2"></div>
              <p>Assinatura</p>
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="text-center text-[9px] mt-10 text-slate-500 border-t pt-3">
          Documento gerado eletronicamente • Portaria MTE nº 671/2021
        </div>

      </div>
    </div>
  );
}