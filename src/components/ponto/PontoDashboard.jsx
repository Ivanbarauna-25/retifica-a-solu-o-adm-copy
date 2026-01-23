import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";

export default function PontoDashboard({ registros, funcionarios, ocorrencias, escalas, funcionariosEscalas }) {
  const metricas = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioDiasAtras = new Date();
    inicioDiasAtras.setDate(inicioDiasAtras.getDate() - 30);
    const dataInicio = inicioDiasAtras.toISOString().split('T')[0];

    const registrosUltimos30 = registros.filter(r => r.data >= dataInicio);
    const gruposData = {};
    
    registrosUltimos30.forEach(r => {
      const key = `${r.funcionario_id}_${r.data}`;
      if (!gruposData[key]) gruposData[key] = { funcionario_id: r.funcionario_id, data: r.data, count: 0 };
      gruposData[key].count++;
    });

    const diasComPonto = Object.keys(gruposData).length;
    const funcionariosAtivos = [...new Set(registrosUltimos30.map(r => r.funcionario_id))].length;
    
    // Faltas não justificadas (sem batida e sem ocorrência)
    const faltasNaoJustificadas = [];
    for (const key in gruposData) {
      const [funcId, data] = key.split('_');
      const temOcorrencia = ocorrencias.some(o => o.funcionario_id === funcId && o.data === data);
      const funcEscala = funcionariosEscalas.find(fe => fe.funcionario_id === funcId);
      
      // Se tem escala, tem 0 batidas e sem ocorrência = falta
      if (funcEscala && gruposData[key].count === 0 && !temOcorrencia) {
        const func = funcionarios.find(f => f.id === funcId);
        faltasNaoJustificadas.push({
          funcionario_id: funcId,
          nome: func?.nome || '-',
          data
        });
      }
    }

    // Espelhos aguardando validação (com registros mas sem análise completa)
    const registrosData = new Set(registrosUltimos30.map(r => `${r.funcionario_id}_${r.data}`));

    return {
      diasComPonto,
      funcionariosAtivos,
      faltasNaoJustificadas: faltasNaoJustificadas.slice(0, 5),
      percentualPonto: funcionarios.length > 0 
        ? Math.round((funcionariosAtivos / funcionarios.length) * 100) 
        : 0
    };
  }, [registros, funcionarios, ocorrencias, escalas, funcionariosEscalas]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {/* Card: Dias com Ponto */}
      <Card className="shadow-sm border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Dias Registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold text-blue-600">{metricas.diasComPonto}</div>
          <p className="text-xs text-slate-500 mt-1">Últimos 30 dias</p>
        </CardContent>
      </Card>

      {/* Card: Funcionários Ativos */}
      <Card className="shadow-sm border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Com Ponto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold text-green-600">
            {metricas.funcionariosAtivos}/{funcionarios.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">{metricas.percentualPonto}% regularizado</p>
        </CardContent>
      </Card>

      {/* Card: Alertas Críticos */}
      <Card className="shadow-sm border-l-4 border-l-red-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Faltas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold text-red-600">
            {metricas.faltasNaoJustificadas.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Não justificadas</p>
        </CardContent>
      </Card>

      {/* Card: Status Geral */}
      <Card className="shadow-sm border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metricas.percentualPonto >= 80 ? (
            <>
              <Badge className="bg-green-100 text-green-700 text-xs mb-2">✓ Normal</Badge>
              <p className="text-xs text-slate-500">Sistema em dia</p>
            </>
          ) : metricas.percentualPonto >= 50 ? (
            <>
              <Badge className="bg-yellow-100 text-yellow-700 text-xs mb-2">⚠ Atenção</Badge>
              <p className="text-xs text-slate-500">Há pendências</p>
            </>
          ) : (
            <>
              <Badge className="bg-red-100 text-red-700 text-xs mb-2">✗ Crítico</Badge>
              <p className="text-xs text-slate-500">Muitas faltas</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card: Faltas Não Justificadas (expandido) */}
      {metricas.faltasNaoJustificadas.length > 0 && (
        <Card className="shadow-sm border-l-4 border-l-red-500 md:col-span-2 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              ⚠️ Funcionários com Falta Não Justificada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metricas.faltasNaoJustificadas.map((falta, idx) => (
                <div key={idx} className="flex items-center justify-between bg-red-50 p-2 rounded text-xs border border-red-200">
                  <span className="text-slate-700">{falta.nome}</span>
                  <Badge variant="destructive" className="text-[10px]">{falta.data}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}