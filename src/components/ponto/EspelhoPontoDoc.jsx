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
    const grupos = {};
    registros.forEach((r) => {
      const data = r.data || r.data_hora?.substring(0, 10);
      if (!data) return;
      grupos[data] = grupos[data] || [];
      grupos[data].push(r);
    });
    Object.values(grupos).forEach((lista) =>
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

  const funcEscala = funcionariosEscalas.find(
    (f) => f.funcionario_id === funcionario?.id
  );
  const escala = escalas.find((e) => e.id === funcEscala?.escala_id);

  const resumo = useMemo(() => {
    let trab = 0,
      esp = 0,
      pres = 0,
      aus = 0,
      just = 0;

    datasDoPeriodo.forEach((data) => {
      const batidas = registrosAgrupados[data] || [];
      const ocorr = ocorrencias.find((o) => o.data === data);

      const diaJS = new Date(data + "T12:00").getDay();
      const diaEscala = diaJS === 0 ? 7 : diaJS;
      const escalaAtiva = escala?.dias_semana?.[diaEscala]?.ativo;

      if (escala?.dias_semana && escalaAtiva === false) return;

      if (ocorr && ["atestado", "ferias", "abonado", "folga"].includes(ocorr.tipo)) {
        just++;
        return;
      }

      let minutos = 0;
      for (let i = 0; i < batidas.length - 1; i += 2) {
        if (!batidas[i + 1]) break;
        const h1 = batidas[i].hora || batidas[i].data_hora.substring(11, 16);
        const h2 = batidas[i + 1].hora || batidas[i + 1].data_hora.substring(11, 16);
        const [h1h, h1m] = h1.split(":").map(Number);
        const [h2h, h2m] = h2.split(":").map(Number);
        minutos += h2h * 60 + h2m - (h1h * 60 + h1m);
      }

      if (batidas.length >= 2 && minutos > 0) {
        pres++;
        trab += minutos;
      } else if (batidas.length > 0) {
        pres++;
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
        @page { size: A4; margin: 15mm 12mm; }
        @media print {
          * { print-color-adjust: exact; }
          button { display: none !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
        @media screen {
          .page { max-width: 210mm; margin: auto; }
        }
      `}</style>

      <div className="page text-[10px] text-black">

        {/* CABEÇALHO */}
        <div className="px-6 py-3 border-b border-black flex justify-between">
          <div>
            <p className="font-semibold uppercase">{configuracoes?.nome_empresa}</p>
            <p className="text-[9px]">CNPJ: {configuracoes?.cnpj}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px]">Período</p>
            <p className="font-semibold">
              {formatarData(dataInicio)} a {formatarData(dataFim)}
            </p>
          </div>
        </div>

        {/* TÍTULO */}
        <div className="text-center my-4">
          <p className="text-lg font-bold uppercase">Espelho de Ponto</p>
          <p className="text-[9px]">
            Registro de Jornada de Trabalho – Portaria MTE nº 671/2021
          </p>
        </div>

        {/* DADOS */}
        <div className="px-6 mb-3">
          <div className="border-b border-black mb-2 pb-1 font-semibold uppercase">
            Dados do Colaborador
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              Colaborador: <strong>{funcionario?.nome}</strong>
            </div>
            <div>CPF: {funcionario?.cpf}</div>
            <div>Cargo: {cargos[funcionario?.cargo_id]?.nome}</div>
          </div>
        </div>

        {/* TABELA */}
        <div className="px-6 mb-4">
          <table className="w-full border border-black text-[9px]">
            <thead className="bg-slate-100 border-b border-black">
              <tr>
                {["Data", "Dia", "1ª Ent.", "1ª Saí.", "2ª Ent.", "2ª Saí.", "Obs."].map(
                  (h) => (
                    <th key={h} className="px-2 py-1 text-center font-semibold uppercase">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {datasDoPeriodo.map((data, idx) => {
                const bat = registrosAgrupados[data] || [];
                const dia = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"][
                  new Date(data + "T12").getDay()
                ];
                const ocorr = ocorrencias.find((o) => o.data === data);

                return (
                  <tr key={data} className="border-t border-black">
                    <td className="px-2 py-1">{formatarData(data)}</td>
                    <td className="px-2 py-1 text-center">{dia}</td>
                    {[0, 1, 2, 3].map((i) => (
                      <td key={i} className="px-2 py-1 text-center font-mono">
                        {formatarHora(bat[i]?.hora || bat[i]?.data_hora?.substring(11, 16))}
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      {ocorr
                        ? ocorr.tipo.toUpperCase()
                        : bat.length === 0
                        ? "AUSENTE"
                        : bat.length % 2 !== 0
                        ? "REGISTRO INCOMPLETO"
                        : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* APURAÇÃO */}
        <div className="px-6 border-t border-b border-black py-2 mb-6">
          <div className="flex justify-between">
            <span>Presentes: <strong>{resumo.pres}</strong></span>
            <span>Ausências: <strong>{resumo.aus}</strong></span>
            <span>Justificadas: <strong>{resumo.just}</strong></span>
            <span>Saldo: <strong>{resumo.saldo}</strong></span>
          </div>
        </div>

        {/* ASSINATURAS */}
        <div className="px-6 grid grid-cols-2 gap-10 mt-10">
          <div>
            <div className="border-b border-black h-8 mb-1"></div>
            <p>{funcionario?.nome}</p>
            <p className="text-[9px]">Colaborador</p>
          </div>
          <div>
            <div className="border-b border-black h-8 mb-1"></div>
            <p>{configuracoes?.responsavel_empresa_nome || departamentoResponsavel?.nome}</p>
            <p className="text-[9px]">Responsável / Empresa</p>
          </div>
        </div>

        <div className="text-center text-[8px] mt-6">
          Documento gerado eletronicamente em {new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>
    </div>
  );
}