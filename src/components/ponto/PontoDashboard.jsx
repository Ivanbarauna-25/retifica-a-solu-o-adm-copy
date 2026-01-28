import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Check, AlertTriangle, CheckCircle, X } from "lucide-react";

export default function PontoDashboard({ registros, funcionarios, ocorrencias, dataInicio, dataFim }) {
  const [mostrarFaltas, setMostrarFaltas] = useState(false);

  const metricas = useMemo(() => {
    const registrosData = {};
    
    registros.forEach(r => {
      const key = `${r.funcionario_id}_${r.data}`;
      if (!registrosData[key]) registrosData[key] = { funcionario_id: r.funcionario_id, data: r.data, batidas: [] };
      registrosData[key].batidas.push(r);
    });

    const diasRegistrados = Object.keys(registrosData).length;
    const funcionariosComPonto = [...new Set(registros.map(r => r.funcionario_id))].length;
    
    // Calcular faltas
    const funcionariosComFaltas = [];
    funcionarios.forEach(func => {
      let faltasCount = 0;
      const keys = Object.keys(registrosData).filter(k => k.startsWith(func.id));
      
      keys.forEach(key => {
        const [, data] = key.split('_');
        const temOcorrencia = ocorrencias.some(o => o.funcionario_id === func.id && o.data === data);
        const batidas = registrosData[key].batidas.length;
        
        if (batidas === 0 && !temOcorrencia) {
          faltasCount++;
        }
      });
      
      if (faltasCount > 0) {
        funcionariosComFaltas.push({ id: func.id, nome: func.nome, faltas: faltasCount });
      }
    });

    const totalFaltas = funcionariosComFaltas.reduce((sum, f) => sum + f.faltas, 0);
    const regularizacao = funcionarios.length > 0 
      ? Math.round((funcionariosComPonto / funcionarios.length) * 100) 
      : 0;

    return {
      diasRegistrados,
      funcionariosComPonto,
      faltasNaoJustificadas: totalFaltas,
      funcionariosComFaltas: funcionariosComFaltas.slice(0, 10),
      regularizacao
    };
  }, [registros, funcionarios, ocorrencias]);

  return (
    <>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {/* Dias Registrados */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-2">
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-1.5 rounded">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-500 leading-none mb-0.5">Dias</p>
                <p className="text-base font-bold text-slate-900 leading-none">{metricas.diasRegistrados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Com Ponto */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-2">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 p-1.5 rounded">
                <Check className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-500 leading-none mb-0.5">Presente</p>
                <p className="text-base font-bold text-green-600 leading-none">{metricas.funcionariosComPonto}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Faltas */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMostrarFaltas(!mostrarFaltas)}
                className="bg-red-100 p-1.5 rounded hover:bg-red-200 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-500 leading-none mb-0.5">Faltas</p>
                <p className="text-base font-bold text-red-600 leading-none">{metricas.faltasNaoJustificadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Geral */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded ${
                metricas.regularizacao >= 90 ? "bg-green-100" : metricas.regularizacao >= 70 ? "bg-yellow-100" : "bg-red-100"
              }`}>
                <CheckCircle className={`w-3.5 h-3.5 ${
                  metricas.regularizacao >= 90 ? "text-green-600" : metricas.regularizacao >= 70 ? "text-yellow-600" : "text-red-600"
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-500 leading-none mb-0.5">Regular</p>
                <p className={`text-base font-bold leading-none ${
                  metricas.regularizacao >= 90 ? "text-green-600" : metricas.regularizacao >= 70 ? "text-yellow-600" : "text-red-600"
                }`}>{metricas.regularizacao}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Compacta de Faltas */}
      {mostrarFaltas && metricas.faltasNaoJustificadas > 0 && (
        <Card className="mb-3 shadow-sm bg-red-50 border-red-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[10px] font-bold text-red-800">Com Faltas</h3>
              <button onClick={() => setMostrarFaltas(false)} className="text-red-600 hover:text-red-800">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {metricas.funcionariosComFaltas.map((func) => (
                <div key={func.id} className="flex items-center justify-between bg-white rounded p-1.5 border border-red-100 text-[10px]">
                  <span className="font-medium text-slate-700 truncate">{func.nome}</span>
                  <span className="text-red-600 font-bold ml-2">{func.faltas}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}