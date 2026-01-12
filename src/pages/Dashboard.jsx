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

const StatsCard = ({ title, value, icon: Icon, color, subtitle, loading }) => {
  // Mapeamento de cores para gradientes
  const gradientMap = {
    'bg-blue-500': 'from-blue-500 to-blue-600',
    'bg-green-500': 'from-green-500 to-emerald-600',
    'bg-purple-500': 'from-purple-500 to-violet-600',
    'bg-orange-500': 'from-orange-500 to-amber-600',
    'bg-emerald-500': 'from-emerald-500 to-teal-600',
    'bg-red-500': 'from-red-500 to-rose-600',
    'bg-amber-500': 'from-amber-500 to-yellow-600'
  };

  const bgLightMap = {
    'bg-blue-500': 'bg-blue-50',
    'bg-green-500': 'bg-green-50',
    'bg-purple-500': 'bg-purple-50',
    'bg-orange-500': 'bg-orange-50',
    'bg-emerald-500': 'bg-emerald-50',
    'bg-red-500': 'bg-red-50',
    'bg-amber-500': 'bg-amber-50'
  };

  return (
    <Card className={`relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group ${bgLightMap[color] || 'bg-white'}`}>
      {/* Gradiente decorativo superior */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradientMap[color] || color}`} />
      
      {/* Círculo decorativo de fundo */}
      <div className="bg-green-500 mx-auto opacity-10 rounded-full absolute -right-4 -bottom-4 w-20 h-20 md:w-24 md:h-24 group-hover:scale-125 transition-transform duration-500" />
      
      <CardContent className="mx-auto pt-3 pr-3 pb-3 pl-3 relative md:p-5">
        <div className="mx-auto flex items-start justify-between gap-2">
          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              {title}
            </p>
            
            {loading ?
            <div className="h-8 md:h-10 flex items-center">
                <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-slate-400" />
              </div> :

            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 tracking-tight">
                {value}
              </h3>
            }
            
            {subtitle && !loading &&
            <span className="text-[10px] md:text-xs text-slate-500 font-medium block truncate">
                {subtitle}
              </span>
            }
          </div>
          
          {/* Ícone com fundo gradiente */}
          <div className={`p-2.5 md:p-3.5 rounded-xl bg-gradient-to-br ${gradientMap[color] || color} shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0`}>
            <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>);

};


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
    <div className="w-full h-full space-y-4 md:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-white mb-1">
              Painel de Controle
            </h1>
            <p className="text-slate-400 text-xs md:text-sm">
              Visão geral da sua oficina
            </p>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 md:px-4 py-1.5 md:py-2 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="font-semibold text-[10px] md:text-sm">Sistema Online</span>
          </div>
        </div>
      </div>

      {/* Mensagem de erro */}
      {error &&
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 md:p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      }

      {/* Stats Cards - Grid responsivo otimizado */}
      <div className="mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 md:gap-4">
        {statsData.map((stat, index) =>
        <StatsCard key={index} {...stat} loading={loading} />
        )}
      </div>
    </div>);


}