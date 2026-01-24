import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarioPonto({
  registros = [],
  ocorrencias = [],
  funcionarioSelecionado,
  onDiaClicado
}) {
  const [mes, setMes] = useState(new Date());

  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const primeiroDia = new Date(mes.getFullYear(), mes.getMonth(), 1).getDay();

  const statusMap = useMemo(() => {
    const map = {};
    registros.forEach(r => {
      map[r.data] = "verde";
    });
    ocorrencias.forEach(o => {
      map[o.data] = "cinza";
    });
    return map;
  }, [registros, ocorrencias]);

  const getStatus = (data) => {
    if (statusMap[data] === "verde") return "bg-green-100 border-green-300";
    if (statusMap[data] === "cinza") return "bg-gray-100 border-gray-300";
    return "bg-slate-50 border-slate-200";
  };

  const datas = [];
  for (let i = 0; i < primeiroDia; i++) datas.push(null);
  for (let d = 1; d <= diasMes; d++) datas.push(d);

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Calendário</CardTitle>
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>
            <ChevronLeft />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>
            <ChevronRight />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-7 gap-1">
        {["D","S","T","Q","Q","S","S"].map(d => (
          <div key={d} className="text-center text-xs font-bold">{d}</div>
        ))}

        {datas.map((dia, i) => {
          if (!dia) return <div key={i} />;
          const data = `${mes.getFullYear()}-${String(mes.getMonth()+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
          return (
            <button
              key={data}
              onClick={() => onDiaClicado?.(data)}
              className={`border rounded aspect-square text-xs ${getStatus(data)}`}
            >
              {dia}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}