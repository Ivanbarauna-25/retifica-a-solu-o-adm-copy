// src/components/ponto/CalendarioPonto.jsx

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarioPonto({ registros = [], onSelecionar }) {
  const [mes, setMes] = useState(new Date());

  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1).getDay();

  const mapa = useMemo(() => {
    const m = {};
    registros.forEach(r => (m[r.data] = true));
    return m;
  }, [registros]);

  const dias = [];
  for (let i = 0; i < inicio; i++) dias.push(null);
  for (let d = 1; d <= diasMes; d++) dias.push(d);

  return (
    <Card className="p-3">
      <div className="flex justify-between mb-2">
        <Button size="icon" variant="ghost" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>
          <ChevronLeft />
        </Button>
        <span className="font-semibold text-sm">
          {mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </span>
        <Button size="icon" variant="ghost" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
        {["D","S","T","Q","Q","S","S"].map(d => (
          <div key={d} className="text-center font-bold">{d}</div>
        ))}
        {dias.map((d, i) =>
          d ? (
            <button
              key={i}
              className={`aspect-square border rounded ${
                mapa[`${mes.getFullYear()}-${String(mes.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`]
                  ? "bg-green-100"
                  : ""
              }`}
              onClick={() =>
                onSelecionar(
                  `${mes.getFullYear()}-${String(mes.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
                )
              }
            >
              {d}
            </button>
          ) : <div key={i} />
        )}
      </div>
    </Card>
  );
}