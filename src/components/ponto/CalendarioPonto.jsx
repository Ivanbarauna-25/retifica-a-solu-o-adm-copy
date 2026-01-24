import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * CalendarioPonto
  * - Componente CONTROLADO
   * - Deve ser renderizado apenas quando necessário
    * - Não aplica filtros automaticamente
     */
     export default function CalendarioPonto({
       registros = [],
         ocorrencias = [],
           onDiaClicado
           }) {
             const [mes, setMes] = useState(new Date());

               const ano = mes.getFullYear();
                 const mesIndex = mes.getMonth();

                   const totalDias = new Date(ano, mesIndex + 1, 0).getDate();
                     const primeiroDiaSemana = new Date(ano, mesIndex, 1).getDay();

                       /**
                          * Mapa de status por data
                             * verde  = possui batida
                                * cinza  = ocorrência
                                   * vazio  = sem registro
                                      */
                                        const statusMap = useMemo(() => {
                                            const map = {};

                                                registros.forEach(r => {
                                                      if (r?.data) map[r.data] = "verde";
                                                          });

                                                              ocorrencias.forEach(o => {
                                                                    if (o?.data) map[o.data] = "cinza";
                                                                        });

                                                                            return map;
                                                                              }, [registros, ocorrencias]);

                                                                                const getClasseDia = (dataISO) => {
                                                                                    if (statusMap[dataISO] === "verde") {
                                                                                          return "bg-green-100 border-green-300 text-green-800";
                                                                                              }
                                                                                                  if (statusMap[dataISO] === "cinza") {
                                                                                                        return "bg-gray-200 border-gray-300 text-gray-700";
                                                                                                            }
                                                                                                                return "bg-white border-slate-200 text-slate-700";
                                                                                                                  };

                                                                                                                    const dias = [];
                                                                                                                      for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null);
                                                                                                                        for (let d = 1; d <= totalDias; d++) dias.push(d);

                                                                                                                          return (
                                                                                                                              <Card className="p-3 w-full max-w-xs">
                                                                                                                                    {/* Cabeçalho */}
                                                                                                                                          <div className="flex items-center justify-between mb-2">
                                                                                                                                                  <Button
                                                                                                                                                            size="icon"
                                                                                                                                                                      variant="ghost"
                                                                                                                                                                                onClick={() => setMes(new Date(ano, mesIndex - 1, 1))}
                                                                                                                                                                                        >
                                                                                                                                                                                                  <ChevronLeft className="w-4 h-4" />
                                                                                                                                                                                                          </Button>

                                                                                                                                                                                                                  <span className="text-sm font-semibold capitalize">
                                                                                                                                                                                                                            {mes.toLocaleDateString("pt-BR", {
                                                                                                                                                                                                                                        month: "long",
                                                                                                                                                                                                                                                    year: "numeric"
                                                                                                                                                                                                                                                              })}
                                                                                                                                                                                                                                                                      </span>

                                                                                                                                                                                                                                                                              <Button
                                                                                                                                                                                                                                                                                        size="icon"
                                                                                                                                                                                                                                                                                                  variant="ghost"
                                                                                                                                                                                                                                                                                                            onClick={() => setMes(new Date(ano, mesIndex + 1, 1))}
                                                                                                                                                                                                                                                                                                                    >
                                                                                                                                                                                                                                                                                                                              <ChevronRight className="w-4 h-4" />
                                                                                                                                                                                                                                                                                                                                      </Button>
                                                                                                                                                                                                                                                                                                                                            </div>

                                                                                                                                                                                                                                                                                                                                                  {/* Dias da semana */}
                                                                                                                                                                                                                                                                                                                                                        <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold text-center text-slate-500 mb-1">
                                                                                                                                                                                                                                                                                                                                                                {["D", "S", "T", "Q", "Q", "S", "S"].map(d => (
                                                                                                                                                                                                                                                                                                                                                                          <div key={d}>{d}</div>
                                                                                                                                                                                                                                                                                                                                                                                  ))}
                                                                                                                                                                                                                                                                                                                                                                                        </div>

                                                                                                                                                                                                                                                                                                                                                                                              {/* Dias */}
                                                                                                                                                                                                                                                                                                                                                                                                    <div className="grid grid-cols-7 gap-1">
                                                                                                                                                                                                                                                                                                                                                                                                            {dias.map((dia, idx) => {
                                                                                                                                                                                                                                                                                                                                                                                                                      if (!dia) return <div key={idx} />;

                                                                                                                                                                                                                                                                                                                                                                                                                                const dataISO = `${ano}-${String(mesIndex + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

                                                                                                                                                                                                                                                                                                                                                                                                                                          return (
                                                                                                                                                                                                                                                                                                                                                                                                                                                      <button
                                                                                                                                                                                                                                                                                                                                                                                                                                                                    key={dataISO}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  type="button"
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                onClick={() => onDiaClicado?.(dataISO)}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              className={`aspect-square rounded border text-xs font-medium hover:shadow transition ${getClasseDia(dataISO)}`}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            title={dataISO}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        >
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      {dia}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  </button>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    })}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              </Card>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                }