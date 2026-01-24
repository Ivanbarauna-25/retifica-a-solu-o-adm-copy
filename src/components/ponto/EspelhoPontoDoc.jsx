import React, { useMemo } from "react";

export default function EspelhoPontoDoc({
  funcionario,
  registros,
  ocorrencias,
  dataInicio,
  dataFim
}) {
  const datas = useMemo(() => {
    const lista = [];
    let d = new Date(dataInicio + "T12:00:00");
    const fim = new Date(dataFim + "T12:00:00");

    while (d <= fim) {
      lista.push(d.toISOString().substring(0,10));
      d.setDate(d.getDate() + 1);
    }
    return lista;
  }, [dataInicio, dataFim]);

  const registrosDia = (data) =>
    registros
      .filter(r => (r.data || r.data_hora?.substring(0,10)) === data)
      .sort((a,b) =>
        (a.hora || a.data_hora).localeCompare(b.hora || b.data_hora)
      );

  return (
    <div className="p-8 bg-white print:p-0">
      <h1 className="text-2xl font-bold text-center mb-6">ESPELHO DE PONTO</h1>

      <div className="mb-6 text-sm">
        <p><strong>Funcionário:</strong> {funcionario?.nome}</p>
        <p><strong>Período:</strong> {dataInicio} a {dataFim}</p>
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-slate-800 text-white">
          <tr>
            <th className="p-2">Data</th>
            <th className="p-2">1ª</th>
            <th className="p-2">2ª</th>
            <th className="p-2">3ª</th>
            <th className="p-2">4ª</th>
            <th className="p-2">Observação</th>
          </tr>
        </thead>
        <tbody>
          {datas.map(data => {
            const batidas = registrosDia(data);
            const oc = ocorrencias.find(o => o.data === data);

            const h = ["-","-","-","-"];
            batidas.slice(0,4).forEach((b,i) => {
              h[i] = b.hora || b.data_hora?.substring(11,16);
            });

            return (
              <tr key={data} className="border-b">
                <td className="p-2">{data}</td>
                {h.map((x,i) => <td key={i} className="p-2 text-center">{x}</td>)}
                <td className="p-2 text-center">
                  {oc ? oc.tipo : batidas.length ? "OK" : "SEM REGISTRO"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-12 grid grid-cols-2 gap-12 text-center">
        <div>
          <div className="border-t mt-12"></div>
          <p className="mt-2 text-xs">Funcionário</p>
        </div>
        <div>
          <div className="border-t mt-12"></div>
          <p className="mt-2 text-xs">Responsável</p>
        </div>
      </div>
    </div>
  );
}