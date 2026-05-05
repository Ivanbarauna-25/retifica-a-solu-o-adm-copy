import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  ClipboardList, Package, Users, User, Banknote, ListTodo, TrendingUp,
  Loader2, AlertCircle, AlertTriangle, ArrowRight, Clock, Activity,
  ChevronRight, Calendar, Filter, BarChart2, TrendingDown, DollarSign
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

const PERIOD_OPTIONS = [
  { label: '30 dias', value: '30d' },
  { label: '3 meses', value: '3m' },
  { label: '6 meses', value: '6m' },
  { label: '12 meses', value: '12m' },
  { label: 'Este ano', value: 'year' },
];

const STATUS_COLORS = {
  em_andamento: { dot: '#F59E0B', bg: '#FFFBEB', color: '#92400E', label: 'Em Andamento' },
  finalizado:   { dot: '#10B981', bg: '#ECFDF5', color: '#065F46', label: 'Finalizado' },
  cancelado:    { dot: '#EF4444', bg: '#FEF2F2', color: '#991B1B', label: 'Cancelado' },
};

function StatusDot({ status }) {
  const s = STATUS_COLORS[status] || { dot: '#9CA3AF', bg: '#F9FAFB', color: '#6B7280', label: status };
  return (
    <span style={{ background: s.bg, color: s.color }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap">
      <span style={{ background: s.dot, width: 6, height: 6, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

const CHART_TYPES = [
  { id: 'bar', label: 'Barras' },
  { id: 'line', label: 'Linha' },
  { id: 'area', label: 'Área' },
];

function ChartTypeToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
      {CHART_TYPES.map(c => (
        <button key={c.id} onClick={() => onChange(c.id)}
          className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${value === c.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          {c.label}
        </button>
      ))}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { fontSize: 12, borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', background: '#fff' }
};

export default function Dashboard() {
  const [rawOS, setRawOS] = useState([]);
  const [rawCR, setRawCR] = useState([]);
  const [rawCP, setRawCP] = useState([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalFuncionarios, setTotalFuncionarios] = useState(0);
  const [estoqueItens, setEstoqueItens] = useState(0);
  const [tarefasPendentes, setTarefasPendentes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [period, setPeriod] = useState('6m');
  const [statusFilter, setStatusFilter] = useState('all');
  const [chartType, setChartType] = useState('bar');
  const [faturamentoChart, setFaturamentoChart] = useState('area');

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ordensServico, clientes, funcionarios, pecas, contasReceber, contasPagar, tarefas] =
          await Promise.all([
            base44.entities.OrdemServico.list('-data_abertura', 500),
            base44.entities.Cliente.list(),
            base44.entities.Funcionario.filter({ status: 'ativo' }),
            base44.entities.Peca.list(),
            base44.entities.ContasReceber.list(),
            base44.entities.ContasPagar.list(),
            base44.entities.Tarefa.filter({ status: 'pendente' })
          ]);
        if (!mounted) return;
        setRawOS(ordensServico);
        setRawCR(contasReceber);
        setRawCP(contasPagar);
        setTotalClientes(clientes.length);
        setTotalFuncionarios(funcionarios.length);
        setEstoqueItens(pecas.length);
        setTarefasPendentes(tarefas.length);
      } catch (err) {
        if (!mounted) return;
        setError('Não foi possível carregar os dados. Tente novamente.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => { mounted = false; };
  }, []);

  // Calcula início do período
  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === '30d') { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    if (period === '3m')  { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
    if (period === '6m')  { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
    if (period === '12m') { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
    if (period === 'year') { const d = new Date(now); d.setMonth(0); d.setDate(1); return d; }
    return new Date(0);
  }, [period]);

  // OS filtradas pelo período e status
  const filteredOS = useMemo(() => {
    return rawOS.filter(os => {
      const dt = os.data_abertura ? new Date(os.data_abertura) : null;
      if (!dt || dt < periodStart) return false;
      if (statusFilter !== 'all' && os.status !== statusFilter) return false;
      return true;
    });
  }, [rawOS, periodStart, statusFilter]);

  // KPIs do período
  const kpis = useMemo(() => {
    const total = filteredOS.length;
    const emAndamento = filteredOS.filter(o => o.status === 'em_andamento').length;
    const finalizado = filteredOS.filter(o => o.status === 'finalizado').length;
    const cancelado = filteredOS.filter(o => o.status === 'cancelado').length;
    const faturamento = filteredOS.reduce((s, o) => s + (o.valor_total || 0), 0);
    const ticketMedio = finalizado > 0 ? faturamento / finalizado : 0;
    const hoje = new Date();
    const cpPendentes = rawCP.filter(c => c.status === 'pendente').length;
    const crPendentes = rawCR.filter(c => c.status === 'pendente').length;
    const cpVencidas = rawCP.filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < hoje).length;
    const crVencidas = rawCR.filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < hoje).length;
    return { total, emAndamento, finalizado, cancelado, faturamento, ticketMedio, cpPendentes, crPendentes, cpVencidas, crVencidas };
  }, [filteredOS, rawCP, rawCR]);

  // Timeline — agrupado por mês (para 6m/12m) ou semana (30d/3m)
  const timelineData = useMemo(() => {
    const useWeeks = period === '30d' || period === '3m';
    const buckets = {};
    filteredOS.forEach(os => {
      const dt = new Date(os.data_abertura);
      let key;
      if (useWeeks) {
        // Semana ISO
        const jan1 = new Date(dt.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((dt - jan1) / 86400000 + jan1.getDay() + 1) / 7);
        key = `S${weekNum}`;
      } else {
        key = dt.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      }
      if (!buckets[key]) buckets[key] = { periodo: key, total: 0, finalizado: 0, em_andamento: 0, cancelado: 0, faturamento: 0 };
      buckets[key].total++;
      if (os.status === 'finalizado') { buckets[key].finalizado++; buckets[key].faturamento += (os.valor_total || 0); }
      if (os.status === 'em_andamento') buckets[key].em_andamento++;
      if (os.status === 'cancelado') buckets[key].cancelado++;
    });
    return Object.values(buckets).slice(-16);
  }, [filteredOS, period]);

  // Distribuição por status (pizza)
  const pieData = useMemo(() => [
    { name: 'Em Andamento', value: kpis.emAndamento, color: '#F59E0B' },
    { name: 'Finalizado',   value: kpis.finalizado,   color: '#10B981' },
    { name: 'Cancelado',    value: kpis.cancelado,     color: '#EF4444' },
  ].filter(d => d.value > 0), [kpis]);

  // Radar — distribuição semana da abertura
  const radarData = useMemo(() => {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts = Array(7).fill(0);
    filteredOS.forEach(os => { if (os.data_abertura) counts[new Date(os.data_abertura).getDay()]++; });
    return dias.map((d, i) => ({ dia: d, OS: counts[i] }));
  }, [filteredOS]);

  // OS recentes
  const recentOS = useMemo(() => rawOS.slice(0, 8), [rawOS]);

  const renderTimeline = () => {
    const commonProps = {
      data: timelineData,
      margin: { top: 4, right: 4, left: -20, bottom: 0 }
    };
    const commonAxes = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle} formatter={(v, n) => [v, n === 'total' ? 'Total OS' : n === 'finalizado' ? 'Finalizadas' : 'Em Andamento']} />
      </>
    );
    if (chartType === 'line') return (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart {...commonProps}>
          {commonAxes}
          <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3, fill: '#3B82F6' }} />
          <Line type="monotone" dataKey="finalizado" stroke="#10B981" strokeWidth={2} dot={{ r: 2, fill: '#10B981' }} />
        </LineChart>
      </ResponsiveContainer>
    );
    if (chartType === 'area') return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gFin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          {commonAxes}
          <Area type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} fill="url(#gTotal)" />
          <Area type="monotone" dataKey="finalizado" stroke="#10B981" strokeWidth={2} fill="url(#gFin)" />
        </AreaChart>
      </ResponsiveContainer>
    );
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart {...commonProps}>
          {commonAxes}
          <Bar dataKey="em_andamento" stackId="a" fill="#F59E0B" radius={[0,0,0,0]} maxBarSize={36} name="Em Andamento" />
          <Bar dataKey="finalizado" stackId="a" fill="#10B981" radius={[4,4,0,0]} maxBarSize={36} name="Finalizadas" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderFaturamento = () => {
    const commonProps = { data: timelineData, margin: { top: 4, right: 4, left: 0, bottom: 0 } };
    const fmtCur = (v) => formatCurrency(v);
    if (faturamentoChart === 'area') return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="gFat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.20} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          <Tooltip {...tooltipStyle} formatter={(v) => [fmtCur(v), 'Faturamento']} />
          <Area type="monotone" dataKey="faturamento" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#gFat)" />
        </AreaChart>
      </ResponsiveContainer>
    );
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          <Tooltip {...tooltipStyle} formatter={(v) => [fmtCur(v), 'Faturamento']} />
          <Bar dataKey="faturamento" fill="#8B5CF6" radius={[6,6,0,0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="w-full space-y-5">

      {/* ── HEADER + FILTROS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tight">Visão Geral</h1>
          <p className="text-xs text-slate-400 mt-0.5">Resumo operacional em tempo real</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de status */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            {[
              { v: 'all', label: 'Todos' },
              { v: 'em_andamento', label: 'Andamento' },
              { v: 'finalizado', label: 'Finalizado' },
              { v: 'cancelado', label: 'Cancelado' },
            ].map(opt => (
              <button key={opt.v} onClick={() => setStatusFilter(opt.v)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${statusFilter === opt.v ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {opt.label}
              </button>
            ))}
          </div>
          {/* Filtro de período */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setPeriod(opt.value)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${period === opt.value ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* ── ALERTAS ── */}
      {!loading && (kpis.cpVencidas > 0 || kpis.crVencidas > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kpis.cpVencidas > 0 && (
            <Link to={createPageUrl('ContasPagar')}>
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 hover:bg-red-100 transition-colors group">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-red-800">{kpis.cpVencidas} conta(s) a pagar vencida(s)</p>
                  <p className="text-[11px] text-red-400">Clique para resolver</p>
                </div>
                <ChevronRight className="w-4 h-4 text-red-300 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )}
          {kpis.crVencidas > 0 && (
            <Link to={createPageUrl('ContasReceber')}>
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors group">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-amber-800">{kpis.crVencidas} conta(s) a receber vencida(s)</p>
                  <p className="text-[11px] text-amber-400">Clique para resolver</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-300 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── KPI CARDS — Período Filtrado ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {[
          { label: 'Total OS', value: loading ? null : kpis.total, sub: 'no período', accent: '#3B82F6', icon: ClipboardList, iconColor: '#3B82F6', iconBg: '#EFF6FF' },
          { label: 'Faturamento', value: loading ? null : formatCurrency(kpis.faturamento), sub: 'no período', accent: '#8B5CF6', icon: DollarSign, iconColor: '#8B5CF6', iconBg: '#F5F3FF', small: true },
          { label: 'Ticket Médio', value: loading ? null : formatCurrency(kpis.ticketMedio), sub: 'por OS finalizada', accent: '#10B981', icon: TrendingUp, iconColor: '#10B981', iconBg: '#ECFDF5', small: true },
          { label: 'Finalizadas', value: loading ? null : kpis.finalizado, sub: 'no período', accent: '#10B981', icon: Activity, iconColor: '#10B981', iconBg: '#ECFDF5' },
          { label: 'A Receber', value: loading ? null : kpis.crPendentes, sub: 'pendentes total', accent: '#F97316', icon: TrendingUp, iconColor: '#F97316', iconBg: '#FFF7ED' },
          { label: 'A Pagar', value: loading ? null : kpis.cpPendentes, sub: 'pendentes total', accent: '#EF4444', icon: Banknote, iconColor: '#EF4444', iconBg: '#FEF2F2' },
        ].map((card, i) => (
          <div key={i} className="relative bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: card.accent }} />
            <div className="flex items-start justify-between gap-1 mb-1.5">
              <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{card.label}</p>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: card.iconBg }}>
                <card.icon className="w-3 h-3" style={{ color: card.iconColor }} />
              </div>
            </div>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-300 mt-1" />
            ) : (
              <p className={`font-black text-slate-900 leading-none tabular-nums ${card.small ? 'text-[1.1rem]' : 'text-[1.7rem]'}`}>{card.value}</p>
            )}
            {card.sub && !loading && <p className="text-[10px] text-slate-400 mt-1 truncate">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── LINHA 2: RADAR + PIZZA ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Radar — OS por dia da semana */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">OS por Dia da Semana</p>
              <p className="text-[10px] text-slate-400">Concentração de abertura</p>
            </div>
          </div>
          {loading ? (
            <div className="h-44 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#F1F5F9" />
                <PolarAngleAxis dataKey="dia" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Radar name="OS" dataKey="OS" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.18} strokeWidth={2} />
                <Tooltip {...tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pizza — status */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-slate-50 flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">Distribuição de Status</p>
              <p className="text-[10px] text-slate-400">Período selecionado</p>
            </div>
          </div>
          {loading ? (
            <div className="h-44 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="43%" innerRadius={46} outerRadius={68} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ fontSize: 10.5, color: '#64748B' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Mini KPIs globais */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-xl bg-slate-50 flex items-center justify-center">
              <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">Cadastros Gerais</p>
              <p className="text-[10px] text-slate-400">Totais no sistema</p>
            </div>
          </div>
          {[
            { label: 'Clientes', value: totalClientes, color: '#10B981', href: 'Clientes', icon: Users },
            { label: 'Funcionários Ativos', value: totalFuncionarios, color: '#8B5CF6', href: 'Funcionarios', icon: User },
            { label: 'Produtos em Estoque', value: estoqueItens, color: '#F97316', href: 'Estoque', icon: Package },
            { label: 'Tarefas Pendentes', value: tarefasPendentes, color: '#F59E0B', href: 'Tarefas', icon: ListTodo },
          ].map((item, i) => (
            <Link key={i} to={createPageUrl(item.href)} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 -mx-2 px-2 rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${item.color}18` }}>
                  <item.icon className="w-3 h-3" style={{ color: item.color }} />
                </div>
                <span className="text-[12px] text-slate-600 font-medium">{item.label}</span>
              </div>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" /> : (
                <span className="text-[14px] font-black tabular-nums" style={{ color: item.color }}>{item.value}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* ── LINHA DO TEMPO OS ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">Linha do Tempo — Ordens de Serviço</p>
              <p className="text-[10px] text-slate-400">Volume de abertura por período</p>
            </div>
          </div>
          <ChartTypeToggle value={chartType} onChange={setChartType} />
        </div>
        {loading ? (
          <div className="h-52 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : timelineData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sem dados no período selecionado</div>
        ) : renderTimeline()}
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500"><span style={{ width: 10, height: 3, background: '#3B82F6', display: 'inline-block', borderRadius: 2 }} /> Total</span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500"><span style={{ width: 10, height: 3, background: '#10B981', display: 'inline-block', borderRadius: 2 }} /> Finalizadas</span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500"><span style={{ width: 10, height: 3, background: '#F59E0B', display: 'inline-block', borderRadius: 2 }} /> Em Andamento</span>
        </div>
      </div>

      {/* ── FATURAMENTO TIMELINE ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-purple-50 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">Faturamento por Período</p>
              <p className="text-[10px] text-slate-400">Receita das OS finalizadas</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {[{ id: 'area', label: 'Área' }, { id: 'bar', label: 'Barras' }].map(c => (
              <button key={c.id} onClick={() => setFaturamentoChart(c.id)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${faturamentoChart === c.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-52 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : renderFaturamento()}
      </div>

      {/* ── OS RECENTES ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-slate-50 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <p className="text-[13px] font-bold text-slate-800">Últimas Ordens de Serviço</p>
          </div>
          <Link to={createPageUrl('OrdensServico')} className="flex items-center gap-1 text-[11.5px] font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : recentOS.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">Nenhuma OS encontrada</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOS.map((os, idx) => (
              <div key={os.id} className={`flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <Link to={createPageUrl('OrdensServico')} className="text-[13px] font-bold text-blue-600 hover:underline whitespace-nowrap">{os.numero_os}</Link>
                  <span className="text-[11.5px] text-slate-400 hidden sm:block">{formatDate(os.data_abertura)}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[13px] font-bold text-slate-800 tabular-nums hidden sm:block">{formatCurrency(os.valor_total || 0)}</span>
                  <StatusDot status={os.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}