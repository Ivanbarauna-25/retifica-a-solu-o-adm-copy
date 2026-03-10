import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatMinutes } from "@/components/ponto/parseZKTeco";
import { getDaysInMonth, getDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer, ArrowLeft, FileText } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

// Agrupa registros de ponto por data e retorna até 4 batidas ordenadas
function getBatidasDoDia(registros, dateStr) {
  return registros
    .filter(r => r.data === dateStr)
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
    .slice(0, 4);
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_LABEL = {
  ok: 'OK', incompleto: 'Incompleto', divergente: 'Divergente',
  falta: 'Falta', ajustado: 'Ajustado', abonado: 'Abonado',
  folga: 'Folga', ferias: 'Férias', desconto: 'Desconto',
};

export default function EspelhoPonto() {
  const urlParams = new URLSearchParams(window.location.search);
  const [funcionarios, setFuncionarios] = useState([]);
  const [selectedFunc, setSelectedFunc] = useState(urlParams.get('func') || '');
  const [selectedMonth, setSelectedMonth] = useState(urlParams.get('mes') || format(new Date(), 'yyyy-MM'));
  const [apuracoes, setApuracoes] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.entities.Funcionario.list().then(setFuncionarios);
  }, []);

  useEffect(() => {
    if (!selectedFunc) return;
    setLoading(true);
    const [y, m] = selectedMonth.split('-');
    const start = `${y}-${m}-01`;
    const end = `${y}-${m}-${String(getDaysInMonth(new Date(+y, +m - 1))).padStart(2, '0')}`;
    Promise.all([
      base44.entities.ApuracaoDiariaPonto.filter({ funcionario_id: selectedFunc }),
      base44.entities.PontoRegistro.filter({ funcionario_id: selectedFunc }),
    ]).then(([apurs, regs]) => {
      setApuracoes(apurs.filter(a => a.data >= start && a.data <= end));
      setRegistros(regs.filter(r => r.data >= start && r.data <= end));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedFunc, selectedMonth]);

  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = String(i + 1).padStart(2, '0');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${d}`;
    const dow = getDay(new Date(year, month - 1, i + 1));
    return { dateStr, day: i + 1, dow, apuracao: apuracoes.find(a => a.data === dateStr) };
  });

  const totalTrabalhado = apuracoes.reduce((s, a) => s + (a.total_trabalhado_min || 0), 0);
  const totalFaltas = apuracoes.reduce((s, a) => s + (a.falta_min || 0), 0);
  const totalExtras = apuracoes.reduce((s, a) => s + (a.hora_extra_min || 0), 0);
  const saldoBH = totalExtras - totalFaltas;
  const diasTrabalhados = apuracoes.filter(a => (a.total_trabalhado_min || 0) > 0).length;

  const funcionario = funcionarios.find(f => f.id === selectedFunc);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return format(d, 'yyyy-MM');
  });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .page-inner { padding: 0 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 space-y-3">
        {/* Header limpo */}
        <div className="mb-2 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <Link to={createPageUrl('Ponto')}>
                <Button variant="outline" size="icon" className="flex-shrink-0 h-8 w-8">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Espelho de Ponto</h1>
                <p className="text-slate-500 text-xs mt-0.5">Visualização mensal por funcionário</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="gap-1 md:gap-1.5 text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3 self-start sm:self-auto"
            >
              <Printer className="w-3 h-3 md:w-4 md:h-4" />
              <span>Imprimir</span>
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 no-print mx-1 md:mx-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedFunc} onValueChange={setSelectedFunc}>
              <SelectTrigger className="sm:w-72">
                <SelectValue placeholder="Selecionar funcionário..." />
              </SelectTrigger>
              <SelectContent>
                {funcionarios.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m} value={m}>
                    {format(new Date(m + '-01'), 'MMMM yyyy', { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedFunc ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
            Selecione um funcionário para visualizar o espelho de ponto
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
            Carregando...
          </div>
        ) : (
          <>
            {/* Cards resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
              {[
                { label: 'Dias Trabalhados', value: diasTrabalhados, color: 'text-slate-900', bar: 'kpi-bar-blue' },
                { label: 'Total Trabalhado', value: formatMinutes(totalTrabalhado), color: 'text-emerald-600', bar: 'kpi-bar-green' },
                { label: 'Total Faltas', value: formatMinutes(totalFaltas), color: 'text-red-600', bar: 'kpi-bar-red' },
                { label: 'Horas Extras', value: formatMinutes(totalExtras), color: 'text-blue-700', bar: 'kpi-bar-sky' },
              ].map(c => (
                <div key={c.label} className={`kpi-bar ${c.bar} bg-white rounded-xl border border-slate-200 shadow-sm p-4`}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{c.label}</p>
                  <p className={`text-xl font-extrabold mt-1 font-mono ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Tabela espelho */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">
                  {funcionario?.nome} — {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white text-xs">
                      <th className="px-3 py-2.5 text-left w-20">Data</th>
                      <th className="px-3 py-2.5 text-left w-12">Dia</th>
                      <th className="px-3 py-2.5 text-center">Batida 1</th>
                      <th className="px-3 py-2.5 text-center">Batida 2</th>
                      <th className="px-3 py-2.5 text-center">Batida 3</th>
                      <th className="px-3 py-2.5 text-center">Batida 4</th>
                      <th className="px-3 py-2.5 text-center">Total</th>
                      <th className="px-3 py-2.5 text-center">H. Extra</th>
                      <th className="px-3 py-2.5 text-center">Falta</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(({ dateStr, day, dow, apuracao }) => {
                      const isWeekend = dow === 0 || dow === 6;
                      const batidas = getBatidasDoDia(registros, dateStr);
                      return (
                        <tr key={dateStr} className={isWeekend ? 'bg-blue-50/40' : 'bg-white hover:bg-slate-50'}>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">
                            {String(day).padStart(2, '0')}/{String(month).padStart(2, '0')}
                          </td>
                          <td className={`px-3 py-2 text-xs font-medium ${isWeekend ? 'text-blue-600' : 'text-slate-500'}`}>
                            {DIAS_SEMANA[dow]}
                          </td>
                          {[0, 1, 2, 3].map(i => (
                            <td key={i} className="px-3 py-2 text-center font-mono text-xs text-slate-700">
                              {batidas[i] ? batidas[i].hora?.substring(0, 5) : ''}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-mono text-xs font-semibold text-slate-700">
                            {apuracao ? formatMinutes(apuracao.total_trabalhado_min) : ''}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-xs text-blue-700 font-medium">
                            {apuracao?.hora_extra_min > 0 ? formatMinutes(apuracao.hora_extra_min) : ''}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-xs text-red-600 font-medium">
                            {apuracao?.falta_min > 0 ? formatMinutes(apuracao.falta_min) : ''}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {apuracao && (
                              <StatusBadge status={apuracao.status} label={STATUS_LABEL[apuracao.status] || apuracao.status} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white text-sm font-bold">
                      <td colSpan={6} className="px-3 py-3">
                        TOTAIS — {diasTrabalhados} dias trabalhados
                      </td>
                      <td className="px-3 py-3 text-center font-mono">{formatMinutes(totalTrabalhado)}</td>
                      <td className="px-3 py-3 text-center font-mono text-blue-300">{formatMinutes(totalExtras)}</td>
                      <td className="px-3 py-3 text-center font-mono text-red-300">{formatMinutes(totalFaltas)}</td>
                      <td className="px-3 py-3 text-center font-mono">
                        <span className={saldoBH >= 0 ? 'text-green-300' : 'text-red-300'}>
                          {saldoBH >= 0 ? '+' : ''}{formatMinutes(saldoBH)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {/* Assinatura para impressão */}
              <div className="hidden print:block p-6 mt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-12 mt-8">
                  <div className="border-t border-slate-400 pt-2 text-center text-sm text-slate-600">
                    Assinatura do Funcionário
                  </div>
                  <div className="border-t border-slate-400 pt-2 text-center text-sm text-slate-600">
                    Assinatura do Responsável
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}