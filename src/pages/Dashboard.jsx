import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  ClipboardList, Package, Users, User, Banknote, ListTodo, TrendingUp,
  Loader2, AlertCircle, AlertTriangle, ArrowRight, Clock, CheckCircle2,
  XCircle, Activity
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOS: 0, osEmAndamento: 0, totalClientes: 0,
    totalFuncionarios: 0, estoqueItens: 0,
    contasReceberPendentes: 0, contasPagarPendentes: 0, tarefasPendentes: 0
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
        const cpVencidas = contasPagar.filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < hoje).length;
        const crVencidas = contasReceber.filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < hoje).length;

        const statusCounts = { em_andamento: 0, finalizado: 0, cancelado: 0 };
        ordensServico.forEach(os => { if (statusCounts[os.status] !== undefined) statusCounts[os.status]++; });
        setOsData([
          { name: 'Em Andamento', value: statusCounts.em_andamento, color: '#f59e0b' },
          { name: 'Finalizado', value: statusCounts.finalizado, color: '#10b981' },
          { name: 'Cancelado', value: statusCounts.cancelado, color: '#ef4444' },
        ]);

        const meses = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const mes = d.toLocaleString('pt-BR', { month: 'short' });
          const ano = d.getFullYear();
          const mesNum = String(d.getMonth() + 1).padStart(2, '0');
          const filtro = `${ano}-${mesNum}`;
          const count = ordensServico.filter(os => os.data_abertura?.startsWith(filtro)).length;
          meses.push({ mes, count });
        }

        setStats({
          totalOS: ordensServico.length, osEmAndamento,
          totalClientes: clientes.length, totalFuncionarios: funcionarios.length,
          estoqueItens: pecas.length,
          contasReceberPendentes: contasReceber.filter(c => c.status === 'pendente').length,
          contasPagarPendentes: contasPagar.filter(c => c.status === 'pendente').length,
          tarefasPendentes: tarefas.length,
          barData: meses
        });
        setRecentOS(ordensServico.slice(0, 5));
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
    { title: 'Ordens de Serviço', value: stats.totalOS, sub: `${stats.osEmAndamento} em andamento`, icon: ClipboardList, href: 'OrdensServico', accent: '#3b7ff5' },
    { title: 'Clientes', value: stats.totalClientes, icon: Users, href: 'Clientes', accent: '#f59e0b' },
    { title: 'Funcionários', value: stats.totalFuncionarios, icon: User, href: 'Funcionarios', accent: '#10b981' },
    { title: 'Produtos Estoque', value: stats.estoqueItens, icon: Package, href: 'Estoque', accent: '#ef4444' },
    { title: 'A Receber', value: stats.contasReceberPendentes, sub: 'pendentes', icon: TrendingUp, href: 'ContasReceber', accent: '#10b981' },
    { title: 'A Pagar', value: stats.contasPagarPendentes, sub: 'pendentes', icon: Banknote, href: 'ContasPagar', accent: '#ef4444' },
    { title: 'Tarefas', value: stats.tarefasPendentes, sub: 'pendentes', icon: ListTodo, href: 'Tarefas', accent: '#f59e0b' },
  ];

  const statusBadgeMap = {
    em_andamento: { label: 'Em Andamento', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
    finalizado:   { label: 'Finalizado',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    cancelado:    { label: 'Cancelado',    color: '#f87171', bg: 'rgba(239,68,68,0.12)' },
  };

  return (
    <div className="w-full space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: '#dde3f0', fontWeight: 700, fontSize: 18 }}>Visão Geral</h2>
          <p style={{ color: '#6b7694', fontSize: 13 }}>Resumo operacional do dia</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
          <span style={{ width: 7, height: 7, background: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Online
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle style={{ color: '#f87171', flexShrink: 0 }} size={18} />
          <p style={{ color: '#f87171', fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* Alertas vencimento */}
      {!loading && (alertas.contasPagarVencidas > 0 || alertas.contasReceberVencidas > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alertas.contasPagarVencidas > 0 && (
            <Link to={createPageUrl('ContasPagar')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', cursor: 'pointer' }}>
                <AlertTriangle style={{ color: '#f87171', flexShrink: 0 }} size={18} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#f87171', fontWeight: 600, fontSize: 13 }}>{alertas.contasPagarVencidas} conta(s) a pagar vencida(s)</p>
                  <p style={{ color: '#6b7694', fontSize: 11 }}>Clique para ver detalhes</p>
                </div>
                <ArrowRight style={{ color: '#f87171' }} size={16} />
              </div>
            </Link>
          )}
          {alertas.contasReceberVencidas > 0 && (
            <Link to={createPageUrl('ContasReceber')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '12px 16px', cursor: 'pointer' }}>
                <AlertTriangle style={{ color: '#f59e0b', flexShrink: 0 }} size={18} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>{alertas.contasReceberVencidas} conta(s) a receber vencida(s)</p>
                  <p style={{ color: '#6b7694', fontSize: 11 }}>Clique para ver detalhes</p>
                </div>
                <ArrowRight style={{ color: '#f59e0b' }} size={16} />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {kpiCards.map((card, i) => (
          <Link key={i} to={createPageUrl(card.href)}>
            <div style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
              padding: '20px 18px',
              borderTop: `2px solid ${card.accent}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              height: '100%',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#151e2d'}
              onMouseLeave={e => e.currentTarget.style.background = '#111827'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#6b7694', fontSize: 11, fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.title}</p>
                  {loading ? (
                    <Loader2 style={{ color: '#6b7694', animation: 'spin 1s linear infinite' }} size={20} />
                  ) : (
                    <p style={{ color: '#dde3f0', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{card.value}</p>
                  )}
                  {card.sub && !loading && (
                    <p style={{ color: '#6b7694', fontSize: 11, marginTop: 4 }}>{card.sub}</p>
                  )}
                </div>
                <div style={{ background: `${card.accent}1a`, borderRadius: 10, padding: 8, flexShrink: 0 }}>
                  <card.icon style={{ color: card.accent }} size={18} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 16px' }} className="lg:col-span-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Activity style={{ color: '#3b7ff5' }} size={16} />
            <span style={{ color: '#dde3f0', fontWeight: 600, fontSize: 14 }}>Ordens de Serviço — Últimos 6 meses</span>
          </div>
          {loading ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 style={{ color: '#6b7694', animation: 'spin 1s linear infinite' }} size={24} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.barData || []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7694', fontFamily: 'Outfit' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7694', fontFamily: 'Outfit' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1c2333', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, fontSize: 12, color: '#dde3f0', fontFamily: 'Outfit' }}
                  formatter={(v) => [v, 'OS']}
                />
                <Bar dataKey="count" fill="#3b7ff5" radius={[6, 6, 0, 0]} name="OS" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ClipboardList style={{ color: '#6b7694' }} size={16} />
            <span style={{ color: '#dde3f0', fontWeight: 600, fontSize: 14 }}>Status das OS</span>
          </div>
          {loading ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 style={{ color: '#6b7694', animation: 'spin 1s linear infinite' }} size={24} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={osData} cx="50%" cy="45%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {osData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1c2333', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, fontSize: 12, color: '#dde3f0', fontFamily: 'Outfit' }} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 11, color: '#6b7694', fontFamily: 'Outfit' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent OS */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock style={{ color: '#6b7694' }} size={16} />
            <span style={{ color: '#dde3f0', fontWeight: 600, fontSize: 14 }}>Últimas Ordens de Serviço</span>
          </div>
          <Link to={createPageUrl('OrdensServico')}>
            <span style={{ color: '#3b7ff5', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              Ver todas <ArrowRight size={13} />
            </span>
          </Link>
        </div>
        <div style={{ padding: '12px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <Loader2 style={{ color: '#6b7694', animation: 'spin 1s linear infinite' }} size={24} />
            </div>
          ) : recentOS.length === 0 ? (
            <p style={{ color: '#6b7694', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Nenhuma OS encontrada</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentOS.map((os) => {
                const badge = statusBadgeMap[os.status];
                return (
                  <div key={os.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#1c2333', borderRadius: 10, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,127,245,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = '#1c2333'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <span style={{ color: '#3b7ff5', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{os.numero_os}</span>
                      <span style={{ color: '#6b7694', fontSize: 12 }} className="hidden sm:inline">{formatDate(os.data_abertura)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ color: '#dde3f0', fontWeight: 600, fontSize: 13 }}>{formatCurrency(os.valor_total || 0)}</span>
                      {badge && (
                        <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 600 }}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}