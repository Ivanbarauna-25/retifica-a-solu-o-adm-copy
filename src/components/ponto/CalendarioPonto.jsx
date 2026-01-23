import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarioPonto({ 
  registros, 
  funcionariosEscalas, 
  ocorrencias, 
  funcionarioSelecionado,
  onDiaClicado 
}) {
  const [mes, setMes] = React.useState(new Date());

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const cores = useMemo(() => {
    const map = {};

    if (funcionarioSelecionado === "todos") {
      // Visão geral: verde se tem ponto, vermelho se sem ponto com escala
      registros.forEach(r => {
        const key = r.data;
        const temEscala = funcionariosEscalas.some(fe => fe.funcionario_id === r.funcionario_id);
        if (temEscala && !map[key]) {
          map[key] = "verde"; // tem ponto
        }
      });

      // Marcar faltas não justificadas
      ocorrencias.forEach(o => {
        const key = o.data;
        if (!registros.some(r => r.funcionario_id === o.funcionario_id && r.data === o.data)) {
          if (['atestado', 'abonado', 'folga', 'ferias'].includes(o.tipo)) {
            map[key] = "cinza"; // justificado
          }
        }
      });
    } else {
      // Visão individual do funcionário
      registros.forEach(r => {
        if (r.funcionario_id === funcionarioSelecionado) {
          const key = r.data;
          const temOcorrencia = ocorrencias.find(o => o.funcionario_id === r.funcionario_id && o.data === key);
          
          if (temOcorrencia) {
            if (['atestado', 'abonado', 'folga', 'ferias'].includes(temOcorrencia.tipo)) {
              map[key] = "cinza"; // justificado
            } else {
              map[key] = "amarelo"; // justificativa pendente
            }
          } else {
            map[key] = "verde"; // com ponto
          }
        }
      });
    }

    return map;
  }, [registros, ocorrencias, funcionarioSelecionado]);

  const getStatusDia = (dia) => {
    const dataStr = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const cor = cores[dataStr];

    if (cor === "verde") return { class: "bg-green-100 border-green-300 text-green-700", label: "✓" };
    if (cor === "cinza") return { class: "bg-gray-100 border-gray-300 text-gray-700", label: "○" };
    if (cor === "amarelo") return { class: "bg-yellow-100 border-yellow-300 text-yellow-700", label: "!" };
    return { class: "bg-slate-50 border-slate-200 text-slate-500", label: "-" };
  };

  const daysInMonth = getDaysInMonth(mes);
  const firstDay = getFirstDayOfMonth(mes);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMes = () => {
    setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1));
  };

  const handleProxMes = () => {
    setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1));
  };

  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const diaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 md:pb-3 px-2 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs md:text-base truncate">Calendário de Ponto</CardTitle>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handlePrevMes}
              className="h-9 w-9 md:h-8 md:w-8 p-0 hover:bg-slate-100"
            >
              <ChevronLeft className="w-5 md:w-4 h-5 md:h-4" />
            </Button>
            <span className="text-xs md:text-sm font-semibold whitespace-nowrap px-2">
              {meses[mes.getMonth()]} {mes.getFullYear()}
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleProxMes}
              className="h-9 w-9 md:h-8 md:w-8 p-0 hover:bg-slate-100"
            >
              <ChevronRight className="w-5 md:w-4 h-5 md:h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 md:px-6 py-3 md:py-4">
        {/* Legenda */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2 mb-3 md:mb-4 text-[9px] md:text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-green-100 border border-green-300 rounded flex-shrink-0"></div>
            <span className="truncate">Com ponto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-100 border border-yellow-300 rounded flex-shrink-0"></div>
            <span className="truncate">Justificativa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-gray-100 border border-gray-300 rounded flex-shrink-0"></div>
            <span className="truncate">Justificado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-slate-50 border border-slate-200 rounded flex-shrink-0"></div>
            <span className="truncate">Sem registro</span>
          </div>
        </div>

        {/* Grid do calendário */}
        <div className="grid grid-cols-7 gap-0.5 md:gap-1">
          {/* Cabeçalho com dias da semana */}
          {diaSemana.map(dia => (
            <div key={dia} className="text-center font-semibold text-[8px] md:text-xs text-slate-600 py-1 md:py-2">
              {dia}
            </div>
          ))}

          {/* Dias */}
          {days.map((dia, idx) => {
            if (!dia) {
              return <div key={`empty-${idx}`} className="aspect-square"></div>;
            }

            const dataStr = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const status = getStatusDia(dia);

            return (
              <button
                key={dia}
                onClick={() => onDiaClicado?.(dataStr)}
                className={`aspect-square min-h-[32px] md:min-h-[40px] flex items-center justify-center rounded border-2 text-xs md:text-sm font-semibold transition-colors hover:shadow-md active:scale-95 cursor-pointer ${status.class}`}
                title={dataStr}
              >
                <div className="flex flex-col items-center">
                  <span className="leading-tight">{dia}</span>
                  <span className="text-[7px] md:text-[10px] opacity-70 leading-tight">{status.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}