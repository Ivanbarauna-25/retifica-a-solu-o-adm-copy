import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  ClipboardList, Package, Users, User, Banknote, ListTodo, TrendingUp,
  Loader2, AlertCircle, AlertTriangle, ArrowRight, Clock, Activity
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

const COLORS_STATUS = {
  em_andamento: '#D97706',
  finalizado: '#059669',
  cancelado: '#DC2626'
};

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

        // Gráfico: OS por status
        const statusCounts = { em_andamento: 0, finalizado: 0, cancelado: 0 };
        ordensServico.forEach(os => { if (statusCounts[os.status] !== undefined) statusCounts[os.status]++; });
        setOsData([
          { name: 'Em Andamento', value: statusCounts.em_andamento, color: '#D97706' },
          { name: 'Finalizado', value: statusCounts.finalizado, color: '#059669' },
          { name: 'Cancelado', value: statusCounts.cancelado, color: '#DC2626' },
        ]);

        // Gráfico de barras por mês (últimos 6 meses)
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

  const statCards = [
    { title: 'Ordens de Serviço', value: stats.totalOS, sub: `${stats.osEmAndamento} em andamento`, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50', href: 'OrdensServico' },
    { title: 'Clientes', value: stats.totalClientes, icon: Users, color: 'text-green-600', bg: 'bg-green-50', href: 'Clientes' },
    { title: 'Funcionários Ativos', value: stats.totalFuncionarios, icon: User, color: 'text-purple-600', bg: 'bg-purple-50', href: 'Funcionarios' },
    { title: 'Produtos Estoque', value: stats.estoqueItens, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50', href: 'Estoque' },
    { title: 'Contas a Receber', value: stats.contasReceberPendentes, sub: 'pendentes', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', href: 'ContasReceber' },
    { title: 'Contas a Pagar', value: stats.contasPagarPendentes, sub: 'pendentes', icon: Banknote, color: 'text-red-600', bg: 'bg-red-50', href: 'ContasPagar' },
    { title: 'Tarefas Pendentes', value: stats.tarefasPendentes, icon: ListTodo, color: 'text-amber-600', bg: 'bg-amber-50', href: 'Tarefas' },
  ];

  const statusBadge = {
    em_andamento: <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">Em Andamento</Badge>,
    finalizado: <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">Finalizado</Badge>,
    cancelado: <Badge className="bg-red-100 text-red-800 border-0 text-[10px]">Cancelado</Badge>,
  };

  return (
    <div className="w-full space-y-4 md:space-y-6">
      {/* Linha de status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-slate-800">Visão Geral</h2>
          <p className="text-xs text-slate-500">Resumo operacional do dia</p>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-medium">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Online
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Alertas de Vencimento */}
      {!loading && (alertas.contasPagarVencidas > 0 || alertas.contasReceberVencidas > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alertas.contasPagarVencidas > 0 && (
            <Link to={createPageUrl('ContasPagar')}>
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3 md:p-4 hover:bg-red-100 transition-colors cursor-pointer">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">{alertas.contasPagarVencidas} conta(s) a pagar vencida(s)</p>
                  <p className="text-xs text-red-600">Clique para ver detalhes</p>
                </div>
                <ArrowRight className="w-4 h-4 text-red-500" />
              </div>
            </Link>
          )}
          {alertas.contasReceberVencidas > 0 && (
            <Link to={createPageUrl('ContasReceber')}>
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 md:p-4 hover:bg-amber-100 transition-colors cursor-pointer">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">{alertas.contasReceberVencidas} conta(s) a receber vencida(s)</p>
                  <p className="text-xs text-amber-600">Clique para ver detalhes</p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-500" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 md:gap-3">
        {statCards.map((card, i) => (
          <Link key={i} to={createPageUrl(card.href)}>
            <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer h-full">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] md:text-xs font-medium text-slate-500 truncate mb-1">{card.title}</p>
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                    ) : (
                      <h3 className="text-2xl md:text-3xl font-bold text-slate-800">{card.value}</h3>
                    )}
                    {card.sub && !loading && (
                      <span className="text-[10px] text-slate-500 block truncate">{card.sub}</span>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${card.bg} flex-shrink-0`}>
                    <card.icon className={`w-4 h-4 md:w-5 md:h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Barras: OS por mês */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Ordens de Serviço — Últimos 6 meses
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.barData || []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v) => [v, 'OS']}
                  />
                  <Bar dataKey="count" fill="#1e293b" radius={[4, 4, 0, 0]} name="OS" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pizza: OS por status */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-600" />
              Status das OS
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={osData}
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {osData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* OS Recentes */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            Últimas Ordens de Serviço
          </CardTitle>
          <Link to={createPageUrl('OrdensServico')}>
            <span className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : recentOS.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Nenhuma OS encontrada</p>
          ) : (
            <div className="space-y-2">
              {recentOS.map((os) => (
                <div key={os.id} className="flex items-center justify-between p-2 md:p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <span className="font-semibold text-blue-600 text-xs md:text-sm whitespace-nowrap">{os.numero_os}</span>
                    <span className="text-slate-600 text-xs truncate hidden sm:inline">{formatDate(os.data_abertura)}</span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    <span className="font-semibold text-slate-800 text-xs md:text-sm">{formatCurrency(os.valor_total || 0)}</span>
                    {statusBadge[os.status]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}