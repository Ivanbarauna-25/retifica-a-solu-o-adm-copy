import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarioPonto({
  registros = [],
  funcionariosEscalas = [],
  ocorrencias = [],
  funcionarioSelecionado = "todos",
  onDiaClicado
}) {
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  /* ==========================
     Utils de calendário
  ========================== */
  const getDaysInMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const formatDate = (dia) =>
    `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

  /* ==========================
     Mapa de status por dia
     verde   → tem batida
     cinza   → justificado
     amarelo → justificativa
     vazio   → sem registro
  ========================== */
  const statusPorDia = useMemo(() => {
    const map = {};

    // Helper
    const isJustificado = (tipo) =>
      ["atestado", "abonado", "folga", "ferias"].includes(tipo);

    if (funcionarioSelecionado === "todos") {
      registros.forEach((r) => {
        if (!r.data) return;
        if (!map[r.data]) {
          map[r.data] = "verde";
        }
      });

      ocorrencias.forEach((o) => {
        if (!o.data) return;
        if (isJustificado(o.tipo)) {
          map[o.data] = "cinza";
        }
      });

    } else {
      registros
        .filter((r) => r.funcionario_id === funcionarioSelecionado)
        .forEach((r) => {
          if (!r.data) return;
          map[r.data] = "verde";
        });

      ocorrencias
        .filter((o) => o.funcionario_id === funcionarioSelecionado)
        .forEach((o) => {
          if (!o.data) return;
          map[o.data] = isJustificado(o.tipo) ? "cinza" : "amarelo";
        });
    }

    return map;
  }, [registros, ocorrencias, funcionarioSelecionado]);

  const getStatusDia = (dataStr) => {
    const cor = statusPorDia[dataStr];

    if (cor === "verde") {
      return { class: "bg-green-100 border-green-300 text-green-700", label: "✓" };
    }
    if (cor === "cinza") {
      return { class: "bg-gray-100 border-gray-300 text-gray-700", label: "○" };
    }
    if (cor === "amarelo") {
      return { class: "bg-yellow-100 border-yellow-300 text-yellow-700", label: "!" };
    }
    return { class: "bg-slate-50 border-slate-200 text-slate-500", label: "-" };
  };

  /* ==========================
     Geração do grid
  ========================== */
  const daysInMonth = getDaysInMonth(mes);
  const firstDay = getFirstDayOfMonth(mes);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const handlePrevMes = () =>
    setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1));

  const handleNextMes = () =>
    setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1));

  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  /* ==========================
     Render
  ========================== */
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base">
            Calendário de Ponto
          </CardTitle>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handlePrevMes}>
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-xs md:text-sm font-semibold px-2">
              {meses[mes.getMonth()]} {mes.getFullYear()}
            </span>

            <Button variant="ghost" size="sm" onClick={handleNextMes}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Legenda */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-[10px] md:text-xs">
          <Legenda cor="bg-green-100 border-green-300" label="Com ponto" />
          <Legenda cor="bg-yellow-100 border-yellow-300" label="Justificativa" />
          <Legenda cor="bg-gray-100 border-gray-300" label="Justificado" />
          <Legenda cor="bg-slate-50 border-slate-200" label="Sem registro" />
        </div>

        {/* Cabeçalho dias */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {diasSemana.map((d) => (
            <div key={d} className="text-center text-[9px] md:text-xs font-semibold text-slate-600">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((dia, idx) => {
            if (!dia) return <div key={`empty-${idx}`} />;

            const dataStr = formatDate(dia);
            const status = getStatusDia(dataStr);

            return (
              <button
                key={dataStr}
                onClick={() => onDiaClicado?.(dataStr)}
                className={`aspect-square flex flex-col items-center justify-center rounded border-2 text-xs font-semibold transition hover:shadow ${status.class}`}
              >
                <span>{dia}</span>
                <span className="text-[9px] opacity-70">{status.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================
   Subcomponente
========================== */
function Legenda({ cor, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 md:w-4 md:h-4 rounded border ${cor}`} />
      <span className="truncate">{label}</span>
    </div>
  );
}