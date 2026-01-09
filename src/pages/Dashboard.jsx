import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ClipboardList,
  Package,
  Landmark,
  ListTodo,
  Users,
  Building2,
  User,
  Timer,
  Wallet,
  CalendarCheck,
  Truck,
  ShoppingCart,
  FileBarChart2,
  Banknote,
  FileText,
  BarChart3,
  TrendingUp,
  Activity,
  Loader2,
  AlertCircle } from
'lucide-react';

const StatsCard = ({ title, value, icon: Icon, color, subtitle, loading }) =>
<Card className="relative overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border-0 shadow-sm group">
    <div className={`absolute top-0 left-0 w-full h-1 ${color}`} />
    <CardContent className="mx-auto pt-4 pr-4 pb-4 pl-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
          {loading ?
        <div className="h-9 flex items-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div> :

        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
        }
          {subtitle && !loading &&
        <span className="text-xs text-slate-500 mt-1 block">{subtitle}</span>
        }
        </div>
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </CardContent>
  </Card>;


export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOS: 0,
    osEmAndamento: 0,
    totalClientes: 0,
    totalFuncionarios: 0,
    estoqueItens: 0,
    contasReceberPendentes: 0,
    contasPagarPendentes: 0,
    tarefasPendentes: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Buscar dados em paralelo para melhor performance
        const [
        ordensServico,
        clientes,
        funcionarios,
        pecas,
        contasReceber,
        contasPagar,
        tarefas] =
        await Promise.all([
        base44.entities.OrdemServico.list(),
        base44.entities.Cliente.list(),
        base44.entities.Funcionario.filter({ status: 'ativo' }),
        base44.entities.Peca.list(),
        base44.entities.ContasReceber.filter({ status: 'pendente' }),
        base44.entities.ContasPagar.filter({ status: 'pendente' }),
        base44.entities.Tarefa.filter({ status: 'pendente' })]
        );

        if (!mounted) return;

        const osEmAndamento = ordensServico.filter((os) => os.status === 'em_andamento').length;

        setStats({
          totalOS: ordensServico.length,
          osEmAndamento,
          totalClientes: clientes.length,
          totalFuncionarios: funcionarios.length,
          estoqueItens: pecas.length,
          contasReceberPendentes: contasReceber.length,
          contasPagarPendentes: contasPagar.length,
          tarefasPendentes: tarefas.length
        });
      } catch (err) {
        if (!mounted) return;
        console.error('Erro ao carregar dados do dashboard:', err);
        setError('Não foi possível carregar os dados. Tente novamente.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDashboardData();
    return () => {mounted = false;};
  }, []);

  const statsData = [
  {
    title: 'Ordens de Serviço',
    value: stats.totalOS,
    icon: ClipboardList,
    color: 'bg-blue-500',
    subtitle: `${stats.osEmAndamento} em andamento`
  },
  {
    title: 'Clientes Cadastrados',
    value: stats.totalClientes,
    icon: Users,
    color: 'bg-green-500'
  },
  {
    title: 'Funcionários Ativos',
    value: stats.totalFuncionarios,
    icon: User,
    color: 'bg-purple-500'
  },
  {
    title: 'Produtos no Estoque',
    value: stats.estoqueItens,
    icon: Package,
    color: 'bg-orange-500'
  },
  {
    title: 'Contas a Receber',
    value: stats.contasReceberPendentes,
    icon: TrendingUp,
    color: 'bg-emerald-500',
    subtitle: 'pendentes'
  },
  {
    title: 'Contas a Pagar',
    value: stats.contasPagarPendentes,
    icon: Banknote,
    color: 'bg-red-500',
    subtitle: 'pendentes'
  },
  {
    title: 'Tarefas',
    value: stats.tarefasPendentes,
    icon: ListTodo,
    color: 'bg-amber-500',
    subtitle: 'pendentes'
  }];


  return (
    <div className="w-full h-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Painel de Controle
          </h1>
          <p className="text-slate-300 text-sm">
            Visão geral da sua oficina mecânica
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-emerald-400 bg-slate-900/30 px-4 py-2 rounded-full backdrop-blur-sm">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="font-medium text-sm">Sistema Online</span>
        </div>
      </div>

      {/* Mensagem de erro */}
      {error &&
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      }

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {statsData.map((stat, index) =>
        <StatsCard key={index} {...stat} loading={loading} />
        )}
      </div>
    </div>);

}