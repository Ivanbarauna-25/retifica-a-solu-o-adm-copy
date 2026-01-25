import React, { useMemo } from "react";

const formatarData = (data) =>
  data.split("-").reverse().join("/");

const formatarHora = (dt) =>
  dt?.substring(11, 19) || "-";

export default function EspelhoPontoDoc({
  funcionario,
  registros,
  ocorrencias,
  escala,
  dataInicio,
  dataFim
}) {
  const dias = useMemo(() => {
    const lista = [];
    let d = new Date(dataInicio + "T12:00:00");
    const fim = new Date(dataFim + "T12:00:00");

    while (d <= fim) {
      lista.push(d.toISOString().substring(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return lista;
  }, [dataInicio, dataFim]);

  const registrosPorDia = (data) =>
    registros
      .filter(r => (r.data || r.data_hora?.substring(0, 10)) === data)
      .sort((a, b) =>
        (a.data_hora || "").localeCompare(b.data_hora || "")
      );

  const jornadaMin = escala?.jornada_minutos || 0;
  let saldoMin = 0;

  return (
    <div className="p-8 bg-white print:p-0">
      <h1 className="text-2xl font-bold text-center mb-2">
        ESPELHO DE PONTO
      </h1>
      <p className="text-center text-sm mb-6">
        Documento oficial para conferência e assinatura
      </p>

      <div className="mb-6 text-sm grid grid-cols-2 gap-4">
        <div>
          <strong>Funcionário:</strong> {funcionario?.nome}<br />
          <strong>CPF:</strong> {funcionario?.cpf}<br />
          <strong>Regime:</strong> {funcionario?.regime}
        </div>
        <div>
          <strong>Período:</strong> {formatarData(dataInicio)} a {formatarData(dataFim)}<br />
          <strong>Escala:</strong> {escala?.nome || "Não definida"}
        </div>
      </div>

      <table className="w-full border text-xs">
        <thead className="bg-slate-800 text-white">
          <tr>
            <th className="p-2">Data</th>
            <th className="p-2">1ª</th>
            <th className="p-2">2ª</th>
            <th className="p-2">3ª</th>
            <th className="p-2">4ª</th>
            <th className="p-2">Observações</th>
          </tr>
        </thead>
        <tbody>
          {dias.map(data => {
            const batidas = registrosPorDia(data);
            const oc = ocorrencias.find(o => o.data === data);

            const h = ["-", "-", "-", "-"];
            batidas.slice(0, 4).forEach((b, i) => {
              h[i] = formatarHora(b.data_hora);
            });

            let trabalhadoMin = 0;
            if (batidas.length >= 2) {
              for (let i = 0; i < batidas.length; i += 2) {
                const ini = new Date(batidas[i]?.data_hora);
                const fim = new Date(batidas[i + 1]?.data_hora);
                if (ini && fim) {
                  trabalhadoMin += (fim - ini) / 60000;
                }
              }
            }

            saldoMin += trabalhadoMin - jornadaMin;

            return (
              <tr key={data} className="border-b">
                <td className="p-2">
                  {formatarData(data)}
                </td>
                {h.map((x, i) => (
                  <td key={i} className="p-2 text-center">{x}</td>
                ))}
                <td className="p-2 text-center">
                  {oc ? oc.tipo : batidas.length ? "OK" : "SEM REGISTRO"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-6 flex justify-between text-sm">
        <strong>Saldo de Horas:</strong>
        <span className={saldoMin >= 0 ? "text-green-700" : "text-red-700"}>
          {(saldoMin / 60).toFixed(2)}h
        </span>
      </div>

      <div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs">
        <div>
          <div className="border-t pt-2">Funcionário</div>
        </div>
        <div>
          <div className="border-t pt-2">Responsável / Empresa</div>
        </div>
      </div>
    </div>
  );
}