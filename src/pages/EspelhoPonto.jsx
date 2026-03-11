import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatMinutes } from "@/components/ponto/parseZKTeco";
import { getDaysInMonth, getDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

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
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      <style>{`
        @media print {
          .no-print { display: none !important; }
          button { display: none !important; }
          body { background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        * { font-family: 'Outfit', system-ui, sans-serif; }
      `}</style>

      <div style={{minHeight:'100vh', background:'#F1F5F9', padding:'24px', fontFamily:"'Outfit', sans-serif"}} className="space-y-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Ponto')}>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-shrink-0 border-slate-200 text-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px', margin: '0', lineHeight: '1.2' }}>
                Espelho de Ponto
              </h1>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
                Visualização mensal detalhada por funcionário
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="gap-2 text-sm border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 self-start sm:self-auto"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 no-print">
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

        {/* Estado vazio */}
        {!selectedFunc && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
            <p className="text-slate-400 text-sm">Selecione um funcionário para visualizar o espelho de ponto</p>
          </div>
        )}

        {/* Loading */}
        {selectedFunc && loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            <span className="text-slate-500 text-sm">Carregando registros...</span>
          </div>
        )}

        {/* Conteúdo */}
        {selectedFunc && !loading && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
              <div className="kpi-bar kpi-bar-blue bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dias Trabalhados</p>
                <p className="text-2xl font-extrabold text-slate-900 font-mono">{diasTrabalhados}</p>
              </div>
              <div className="kpi-bar kpi-bar-green bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Trabalhado</p>
                <p className="text-2xl font-extrabold text-emerald-600 font-mono">{formatMinutes(totalTrabalhado)}</p>
              </div>
              <div className="kpi-bar kpi-bar-red bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Faltas</p>
                <p className="text-2xl font-extrabold text-red-600 font-mono">{formatMinutes(totalFaltas)}</p>
              </div>
              <div className="kpi-bar kpi-bar-sky bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Horas Extras</p>
                <p className="text-2xl font-extrabold text-sky-600 font-mono">{formatMinutes(totalExtras)}</p>
              </div>
            </div>

            {/* Tabela espelho */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Sub-header da tabela */}
              <div className="flex items-center justify-between" style={{background:'#0B1629', padding:'14px 18px'}}>
                <div>
                  <span style={{fontWeight:'700', color:'#FFFFFF', fontSize:'15px'}}>{funcionario?.nome}</span>
                  <span style={{color:'rgba(255,255,255,0.35)', margin:'0 8px'}}>—</span>
                  <span style={{color:'rgba(255,255,255,0.65)', fontSize:'14px'}} className="capitalize">
                    {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })}
                  </span>
                </div>
                <span style={{fontSize:'11px', color:'rgba(255,255,255,0.4)'}} className="hidden sm:block">{daysInMonth} dias no mês</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr style={{ background: '#0B1629' }} className="text-xs">
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', fontSize: '10.5px' }}>Data</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', fontSize: '10.5px' }}>Dia</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', fontSize: '10.5px' }}>Batida 1</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', fontSize: '10.5px' }}>Batida 2</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', fontSize: '10.5px' }}>Batida 3</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', fontSize: '10.5px' }}>Batida 4</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', fontSize: '10.5px' }}>Total</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', fontSize: '10.5px' }}>H. Extra</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', fontSize: '10.5px' }}>Falta</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', fontSize: '10.5px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(({ dateStr, day, dow, apuracao }) => {
                      const isWeekend = dow === 0 || dow === 6;
                      const batidas = getBatidasDoDia(registros, dateStr);
                      return (
                        <tr
                          key={dateStr}
                          className="border-b border-slate-100 last:border-0"
                          style={{ background: isWeekend ? '#EFF6FF' : '#FFFFFF' }}
                          onMouseEnter={e => { if (!isWeekend) e.currentTarget.style.background = '#F8FAFF'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isWeekend ? '#EFF6FF' : '#FFFFFF'; }}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                            {String(day).padStart(2, '0')}/{String(month).padStart(2, '0')}
                          </td>
                          <td className={`px-4 py-2.5 text-xs font-semibold ${isWeekend ? 'text-blue-600' : 'text-slate-500'}`}>
                            {DIAS_SEMANA[dow]}
                          </td>
                          {[0, 1, 2, 3].map(i => (
                            <td key={i} className="px-4 py-2.5 text-center font-mono text-xs text-slate-700">
                              {batidas[i] ? batidas[i].hora?.substring(0, 5) : <span className="text-slate-200">—</span>}
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-slate-800">
                            {apuracao ? formatMinutes(apuracao.total_trabalhado_min) : <span className="text-slate-200">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-sky-600">
                            {apuracao?.hora_extra_min > 0 ? formatMinutes(apuracao.hora_extra_min) : ''}
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-red-600">
                            {apuracao?.falta_min > 0 ? formatMinutes(apuracao.falta_min) : ''}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {apuracao && (
                              <StatusBadge status={apuracao.status} label={STATUS_LABEL[apuracao.status] || apuracao.status} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#0B1629' }} className="text-sm font-bold">
                      <td colSpan={6} className="px-4 py-3 text-white font-bold text-xs uppercase tracking-wider">
                        TOTAIS — {diasTrabalhados} dias trabalhados
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-white">{formatMinutes(totalTrabalhado)}</td>
                      <td className="px-4 py-3 text-center font-mono" style={{ color: '#93c5fd' }}>{formatMinutes(totalExtras)}</td>
                      <td className="px-4 py-3 text-center font-mono" style={{ color: '#fca5a5' }}>{formatMinutes(totalFaltas)}</td>
                      <td className="px-4 py-3 text-center font-mono">
                        <span style={{ color: saldoBH >= 0 ? '#86efac' : '#fca5a5' }}>
                          {saldoBH >= 0 ? '+' : ''}{formatMinutes(saldoBH)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Assinatura impressão */}
              <div className="hidden print:block p-8 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-16 mt-10">
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