import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  ClipboardList, Package, Users, User, Banknote, ListTodo, TrendingUp,
  Loader2, AlertCircle, AlertTriangle, ArrowRight, Clock, Activity,
  CheckCircle2, DollarSign, ChevronRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOS: 0, osEmAndamento: 0, osFinalizado: 0, totalClientes: 0,
    totalFuncionarios: 0, estoqueItens: 0,
    contasReceberPendentes: 0, contasPagarPendentes: 0, tarefasPendentes: 0,
    faturamentoTotal: 0, barData: []
  });
  const [osData, setOsData] = useState([]);
  const [recentOS, setRecentOS] = useState([]);
  const [alertas, setAlertas] = useState({ contasPagarVencidas: 0, contasReceberVencidas: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ordensServico, clientes, funcionarios, pecas, contasReceber, contasPagar, tarefas] =
          await Promise.all([
            base44.entities.OrdemServico.list('-data_abertura', 100),
            base44.entities.Cliente.list(),
            base44.entities.Funcionario.filter({ status: 'ativo' }),
            base44.entities.Peca.list(),
            base44.entities.ContasReceber.list(),
            base44.entities.ContasPagar.list(),
            base44.entities.Tarefa.filter({ status: 'pendente' })
          ]);

        if (!mounted) return;

        const hoje = new Date();
        const osEmAndamento = ordensServico.filter(os => os.status === 'em_andamento').length;
        const osFinalizado = ordensServico.filter(os => os.status === 'finalizado').length;
        const faturamentoTotal = ordensServico.reduce((s, os) => s + (os.valor_total || 0), 0);
        const cpVencidas = contasPagar.filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < hoje).length;
        const crVencidas = contasReceber.filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < hoje).length;

        const statusCounts = { em_andamento: 0, finalizado: 0, cancelado: 0 };
        ordensServico.forEach(os => { if (statusCounts[os.status] !== undefined) statusCounts[os.status]++; });
        setOsData([
          { name: 'Em Andamento', value: statusCounts.em_andamento, color: '#F59E0B' },
          { name: 'Finalizado', value: statusCounts.finalizado, color: '#10B981' },
          { name: 'Cancelado', value: statusCounts.cancelado, color: '#EF4444' },
        ]);

        const meses = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const mes = d.toLocaleString('pt-BR', { month: 'short' });
          const mesNum = String(d.getMonth() + 1).padStart(2, '0');
          const filtro = `${d.getFullYear()}-${mesNum}`;
          const count = ordensServico.filter(os => os.data_abertura?.startsWith(filtro)).length;
          meses.push({ mes, count });
        }

        setStats({
          totalOS: ordensServico.length, osEmAndamento, osFinalizado, faturamentoTotal,
          totalClientes: clientes.length, totalFuncionarios: funcionarios.length,
          estoqueItens: pecas.length,
          contasReceberPendentes: contasReceber.filter(c => c.status === 'pendente').length,
          contasPagarPendentes: contasPagar.filter(c => c.status === 'pendente').length,
          tarefasPendentes: tarefas.length,
          barData: meses
        });
        setRecentOS(ordensServico.slice(0, 6));
        setAlertas({ contasPagarVencidas: cpVencidas, contasReceberVencidas: crVencidas });
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

  const kpiCards = [
    {
      label: 'Ordens de Serviço', value: stats.totalOS,
      sub: `${stats.osEmAndamento} em andamento`,
      icon: ClipboardList, accent: '#3B82F6', bg: '#EFF6FF', iconColor: '#3B82F6',
      href: 'OrdensServico'
    },
    {
      label: 'Clientes', value: stats.totalClientes,
      sub: 'cadastrados',
      icon: Users, accent: '#10B981', bg: '#ECFDF5', iconColor: '#10B981',
      href: 'Clientes'
    },
    {
      label: 'Funcionários', value: stats.totalFuncionarios,
      sub: 'ativos',
      icon: User, accent: '#8B5CF6', bg: '#F5F3FF', iconColor: '#8B5CF6',
      href: 'Funcionarios'
    },
    {
      label: 'Produtos', value: stats.estoqueItens,
      sub: 'em estoque',
      icon: Package, accent: '#F97316', bg: '#FFF7ED', iconColor: '#F97316',
      href: 'Estoque'
    },
    {
      label: 'A Receber', value: stats.contasReceberPendentes,
      sub: 'pendentes',
      icon: TrendingUp, accent: '#059669', bg: '#ECFDF5', iconColor: '#059669',
      href: 'ContasReceber'
    },
    {
      label: 'A Pagar', value: stats.contasPagarPendentes,
      sub: 'pendentes',
      icon: Banknote, accent: '#EF4444', bg: '#FEF2F2', iconColor: '#EF4444',
      href: 'ContasPagar'
    },
    {
      label: 'Tarefas', value: stats.tarefasPendentes,
      sub: 'pendentes',
      icon: ListTodo, accent: '#F59E0B', bg: '#FFFBEB', iconColor: '#F59E0B',
      href: 'Tarefas'
    },
  ];

  const StatusDot = ({ status }) => {
    const cfg = {
      em_andamento: { dot: '#F59E0B', bg: '#FFFBEB', color: '#92400E', label: 'Em Andamento' },
      finalizado:   { dot: '#10B981', bg: '#ECFDF5', color: '#065F46', label: 'Finalizado' },
      cancelado:    { dot: '#EF4444', bg: '#FEF2F2', color: '#991B1B', label: 'Cancelado' },
    };
    const s = cfg[status] || { dot: '#9CA3AF', bg: '#F9FAFB', color: '#6B7280', label: status };
    return (
      <span style={{ background: s.bg, color: s.color }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap">
        <span style={{ background: s.dot, width: 6, height: 6, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
        {s.label}
      </span>
    );
  };

  return (
    <div className="w-full space-y-5">

      {/* ── HEADER DA PÁGINA ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 leading-tight tracking-tight">Visão Geral</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">Resumo operacional atualizado</p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold px-3 py-1.5 rounded-full">
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Online
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* ── ALERTAS ── */}
      {!loading && (alertas.contasPagarVencidas > 0 || alertas.contasReceberVencidas > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alertas.contasPagarVencidas > 0 && (
            <Link to={createPageUrl('ContasPagar')}>
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 hover:bg-red-100 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-red-800">{alertas.contasPagarVencidas} conta(s) a pagar vencida(s)</p>
                  <p className="text-[11px] text-red-500">Clique para ver detalhes</p>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )}
          {alertas.contasReceberVencidas > 0 && (
            <Link to={createPageUrl('ContasReceber')}>
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-amber-800">{alertas.contasReceberVencidas} conta(s) a receber vencida(s)</p>
                  <p className="text-[11px] text-amber-500">Clique para ver detalhes</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {kpiCards.map((card, i) => (
          <Link key={i} to={createPageUrl(card.href)}>
            <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 h-full overflow-hidden group">
              {/* barra colorida topo */}
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: card.accent }} />
              <div className="flex items-start justify-between gap-1 mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{card.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: card.bg }}>
                  <card.icon className="w-3.5 h-3.5" style={{ color: card.iconColor }} />
                </div>
              </div>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-300 mt-1" />
              ) : (
                <p className="text-[2rem] font-black text-slate-900 leading-none tabular-nums">{card.value}</p>
              )}
              {card.sub && !loading && (
                <p className="text-[10.5px] text-slate-400 mt-1.5 truncate">{card.sub}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* ── FATURAMENTO DESTAQUE ── */}
      {!loading && (
        <div className="relative bg-white rounded-2xl border border-blue-100 shadow-sm px-6 py-5 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-500 rounded-t-2xl" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Faturamento Total — Todas as OS</p>
              <p className="text-[2.2rem] font-black text-blue-700 leading-none tabular-nums">{formatCurrency(stats.faturamentoTotal)}</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Finalizadas</p>
                <p className="text-2xl font-black text-emerald-600">{stats.osFinalizado}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Em Andamento</p>
                <p className="text-2xl font-black text-amber-500">{stats.osEmAndamento}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GRÁFICOS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Barras */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">OS por Mês</p>
              <p className="text-[10.5px] text-slate-400">Últimos 6 meses</p>
            </div>
          </div>
          {loading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={stats.barData || []} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  formatter={(v) => [v, 'Ordens de Serviço']}
                  cursor={{ fill: '#F1F5F9' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pizza */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">Status das OS</p>
              <p className="text-[10.5px] text-slate-400">Distribuição atual</p>
            </div>
          </div>
          {loading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <PieChart>
                <Pie data={osData} cx="50%" cy="42%" innerRadius={48} outerRadius={70} paddingAngle={4} dataKey="value">
                  {osData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E2E8F0' }} />
                <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ fontSize: 11, color: '#64748B' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── OS RECENTES ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-[13px] font-bold text-slate-800">Últimas Ordens de Serviço</p>
          </div>
          <Link to={createPageUrl('OrdensServico')}
            className="flex items-center gap-1 text-[11.5px] font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : recentOS.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">Nenhuma OS encontrada</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOS.map((os, idx) => (
              <div key={os.id} className={`flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <Link to={createPageUrl('OrdensServico')}
                    className="text-[13px] font-bold text-blue-600 hover:underline whitespace-nowrap">{os.numero_os}</Link>
                  <span className="text-[12px] text-slate-400 hidden sm:block">{formatDate(os.data_abertura)}</span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-[13px] font-bold text-slate-800 tabular-nums">{formatCurrency(os.valor_total || 0)}</span>
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