import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  PlusCircle,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* =========================
   HELPERS
========================= */
const formatarHora = (h) => (h ? h.substring(0, 5) : "—");
const formatarData = (d) => {
  if (!d) return "—";
  const [y, m, dia] = d.split("-");
  return `${dia}/${m}/${y}`;
};
const minToHHmm = (min) => {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  const s = min < 0 ? "-" : "+";
  return `${s}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/* =========================
   PAGE
========================= */
export default function PontoPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funcEscalas, setFuncEscalas] = useState([]);
  const [loading, setLoading] = useState(true);

  /* =========================
     LOAD DATA
  ========================= */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [
        f,
        r,
        o,
        e,
        fe
      ] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.PontoRegistro.list("-data_hora", 5000),
        base44.entities.OcorrenciaPonto.list("-data", 2000),
        base44.entities.EscalaTrabalho.list(),
        base44.entities.FuncionarioEscala.list()
      ]);

      setFuncionarios(f || []);
      setRegistros(r || []);
      setOcorrencias(o || []);
      setEscalas(e || []);
      setFuncEscalas(fe || []);
      setLoading(false);
    })();
  }, []);

  /* =========================
     GERAR DIAS (MÊS ATUAL)
  ========================= */
  const diasMes = useMemo(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const ultimo = new Date(ano, mes + 1, 0).getDate();
    return Array.from({ length: ultimo }).map((_, i) => {
      const d = String(i + 1).padStart(2, "0");
      const m = String(mes + 1).padStart(2, "0");
      return `${ano}-${m}-${d}`;
    });
  }, []);

  /* =========================
     AGRUPAR POR FUNC + DIA
  ========================= */
  const linhas = useMemo(() => {
    const mapa = {};

    for (const f of funcionarios) {
      for (const d of diasMes) {
        mapa[`${f.id}_${d}`] = {
          funcionario: f,
          data: d,
          batidas: []
        };
      }
    }

    for (const r of registros) {
      if (!r.funcionario_id || !r.data) continue;
      const k = `${r.funcionario_id}_${r.data}`;
      if (mapa[k]) mapa[k].batidas.push(r);
    }

    Object.values(mapa).forEach(l =>
      l.batidas.sort((a, b) =>
        (a.hora || a.data_hora).localeCompare(b.hora || b.data_hora)
      )
    );

    return Object.values(mapa);
  }, [funcionarios, registros, diasMes]);

  /* =========================
     SALDO
  ========================= */
  const calcularSaldo = (linha) => {
    const ocorr = ocorrencias.find(
      o => o.funcionario_id === linha.funcionario.id && o.data === linha.data
    );

    if (ocorr && ["atestado", "folga", "abonado", "ferias"].includes(ocorr.tipo)) {
      return { saldo: 0, justificado: true };
    }

    const fe = funcEscalas.find(f => f.funcionario_id === linha.funcionario.id);
    const esc = fe && escalas.find(e => e.id === fe.escala_id);
    const esperado = esc?.carga_diaria_minutos || 480;

    let trab = 0;
    for (let i = 0; i < linha.batidas.length; i += 2) {
      if (!linha.batidas[i + 1]) break;
      const h1 = linha.batidas[i].hora || linha.batidas[i].data_hora.substring(11, 16);
      const h2 = linha.batidas[i + 1].hora || linha.batidas[i + 1].data_hora.substring(11, 16);
      const [a, b] = h1.split(":").map(Number);
      const [c, d] = h2.split(":").map(Number);
      trab += (c * 60 + d) - (a * 60 + b);
    }

    return { saldo: trab - esperado, justificado: false };
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="p-4 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-6 h-6 text-slate-700" />
        <h1 className="text-xl font-bold text-slate-800">Controle de Ponto</h1>
      </div>

      <div className="overflow-x-auto bg-white border rounded-lg shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="px-3 py-2 text-left">Funcionário</th>
              <th className="px-3 py-2 text-center">Data</th>
              <th className="px-2 py-2 text-center">1ª</th>
              <th className="px-2 py-2 text-center">2ª</th>
              <th className="px-2 py-2 text-center">3ª</th>
              <th className="px-2 py-2 text-center">4ª</th>
              <th className="px-2 py-2 text-center">Saldo</th>
              <th className="px-2 py-2 text-center">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="py-10 text-center">
                  Carregando…
                </td>
              </tr>
            )}

            {!loading &&
              linhas.map((l, idx) => {
                const saldo = calcularSaldo(l);
                const extras = l.batidas.length > 4 ? l.batidas.length - 4 : 0;
                const bat = ["", "", "", ""];
                l.batidas.slice(0, 4).forEach((b, i) => {
                  bat[i] = formatarHora(b.hora || b.data_hora.substring(11, 16));
                });

                return (
                  <tr
                    key={idx}
                    className="border-b hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 font-medium">
                      {l.funcionario.nome}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {formatarData(l.data)}
                    </td>

                    {bat.map((h, i) => (
                      <td key={i} className="px-2 py-2 text-center font-mono">
                        {h || <span className="text-red-500">—</span>}
                      </td>
                    ))}

                    <td className="px-2 py-2 text-center">
                      {extras > 0 && (
                        <Badge variant="secondary">+{extras}</Badge>
                      )}
                    </td>

                    <td className="px-2 py-2 text-center">
                      {saldo.justificado ? (
                        <Badge className="bg-blue-100 text-blue-700">OK</Badge>
                      ) : (
                        <span
                          className={`font-mono font-bold ${
                            saldo.saldo >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {minToHHmm(saldo.saldo)}
                        </span>
                      )}
                    </td>

                    <td className="px-2 py-2 text-center">
                      <div className="flex justify-center gap-2">
                        <Eye className="w-4 h-4 text-slate-500 cursor-pointer" />
                        <PlusCircle className="w-4 h-4 text-blue-600 cursor-pointer" />
                        <AlertTriangle className="w-4 h-4 text-amber-600 cursor-pointer" />
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}