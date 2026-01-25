// components/ponto/CalendarioPonto.jsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarioPonto({ onDiaClicado }) {
  const [mes, setMes] = useState(new Date());

  const diasMes = new Date(
    mes.getFullYear(),
    mes.getMonth() + 1,
    0
  ).getDate();

  const primeiroDia = new Date(
    mes.getFullYear(),
    mes.getMonth(),
    1
  ).getDay();

  const dias = [];
  for (let i = 0; i < primeiroDia; i++) dias.push(null);
  for (let d = 1; d <= diasMes; d++) dias.push(d);

  return (
    <Card className="max-w-md">
      <CardHeader className="flex justify-between items-center">
        <Button
          size="icon"
          variant="ghost"
          onClick={() =>
            setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))
          }
        >
          <ChevronLeft />
        </Button>
        <span className="font-semibold">
          {mes.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric"
          })}
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() =>
            setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))
          }
        >
          <ChevronRight />
        </Button>
      </CardHeader>

      <CardContent className="grid grid-cols-7 gap-1 text-xs">
        {["D","S","T","Q","Q","S","S"].map(d => (
          <div key={d} className="text-center font-bold">{d}</div>
        ))}

        {dias.map((dia, i) =>
          dia ? (
            <button
              key={i}
              className="border rounded h-8 hover:bg-slate-100"
              onClick={() => {
                const data = new Date(
                  mes.getFullYear(),
                  mes.getMonth(),
                  dia
                )
                  .toISOString()
                  .substring(0, 10);
                onDiaClicado(data);
              }}
            >
              {dia}
            </button>
          ) : (
            <div key={i} />
          )
        )}
      </CardContent>
    </Card>
  );
}