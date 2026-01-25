import React, { useMemo } from "react";

export default function EspelhoPontoDoc({
  funcionario,
  registros,
  ocorrencias,
  escala,
  dataInicio,
  dataFim
}) {
  const diasPeriodo = useMemo(() => {
    const dias = [];
    let d = new Date(dataInicio + "T12:00:00");
    const fim = new Date(dataFim + "T12:00:00");

    while (d <= fim) {
      dias.push(d.toISOString().substring(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return dias;
  }, [dataInicio, dataFim]);

  const registrosDia = (data) =>
    registros
      .filter(r => (r.data || r.data_hora?.substring(0, 10)) === data)
      .sort((a, b) =>
        (a.hora || a.data_hora).localeCompare(b.hora || b.data_hora)
      );

  const horasPrevistasDia = (data) => {
    if (!escala?.dias_semana) return 0;
    const diaSemana = new Date(data + "T12:00:00").getDay();
    const conf = escala.dias_semana[diaSemana];
    return conf?.ativo ? conf.horas_previstas || 8 : 0;
  };

  let totalTrabalhado = 0;
  let totalPrevisto = 0;

  diasPeriodo.forEach(data => {
    const batidas = registrosDia(data);
    const oc = ocorrencias.find(o => o.data === data);

    if (!oc) {
      totalPrevisto += horasPrevistasDia(data);
    }

    for (let i = 0; i < batidas.length - 1; i += 2) {
      const e = batidas[i];
      const s = batidas[i + 1];
      if (e && s) {
        const he = (e.hora || e.data_hora.substring(11, 16)).split(":").map(Number);
        const hs = (s.hora || s.data_hora.substring(11, 16)).split(":").map(Number);
        totalTrabalhado += (hs[0] * 60 + hs[1] - (he[0] * 60 + he[1])) / 60;
      }
    }
  });

  const saldo = totalTrabalhado - totalPrevisto;

  return (
    <div className="p-10 bg-white print:p-0">
      <h1 className="text-2xl font-bold text-center mb-6">ESPELHO DE PONTO</h1>

      <div className="mb-6 text-sm">
        <p><strong>Funcionário:</strong> {funcionario?.nome}</p>
        <p><strong>Período:</strong> {dataInicio} a {dataFim}</p>
        <p><strong>Escala:</strong> {escala?.nome || "Não definida"}</p>
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-slate-800 text-white">
          <tr>
            <th>Data</th>
            <th>1ª</th>
            <th>2ª</th>
            <th>3ª</th>
            <th>4ª</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          {diasPeriodo.map(data => {
            const batidas = registrosDia(data);
            const oc = ocorrencias.find(o => o.data === data);

            const h = ["-", "-", "-", "-"];
            batidas.slice(0, 4).forEach((b, i) => {
              h[i] = b.hora || b.data_hora?.substring(11, 16);
            });

            return (
              <tr key={data} className="border-b">
                <td>{data}</td>
                {h.map((x, i) => (
                  <td key={i} className="text-center">{x}</td>
                ))}
                <td className="text-center">
                  {oc ? oc.tipo : batidas.length ? "OK" : "SEM REGISTRO"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-6 text-sm">
        <p><strong>Horas previstas:</strong> {totalPrevisto.toFixed(2)}h</p>
        <p><strong>Horas trabalhadas:</strong> {totalTrabalhado.toFixed(2)}h</p>
        <p className={saldo >= 0 ? "text-green-700" : "text-red-700"}>
          <strong>Saldo:</strong> {saldo >= 0 ? "+" : ""}{saldo.toFixed(2)}h
        </p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-12 text-center">
        <div>
          <div className="border-t mt-12"></div>
          <p className="text-xs">Funcionário</p>
        </div>
        <div>
          <div className="border-t mt-12"></div>
          <p className="text-xs">Responsável</p>
        </div>
      </div>
    </div>
  );
}