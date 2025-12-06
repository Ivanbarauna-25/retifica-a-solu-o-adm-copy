import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import {
  ClipboardList,
  Package,
  ListTodo,
  Users,
  User,
  Banknote,
  BarChart3,
  TrendingUp,
  Loader2,
  AlertCircle
} from 'lucide-react';

const cardItems = [
  {
    title: 'Ordens de Serviço',
    description: 'Gerenciamento de OS',
    icon: ClipboardList,
    url: 'OrdensServico',
    color: 'bg-blue-600',
    category: 'Operacional'
  },
  {
    title: 'Clientes e Veículos',
    description: 'Base de clientes e frota',
    icon: Users,
    url: 'Clientes',
    color: 'bg-cyan-600',
    category: 'Cadastros'
  },
  {
    title: 'Estoque',
    description: 'Controle de produtos',
    icon: Package,
    url: 'Estoque',
    color: 'bg-green-600',
    category: 'Operacional'
  },
  {
    title: 'Financeiro',
    description: 'Fluxo de caixa e contas',
    icon: BarChart3,
    url: 'FluxoCaixa',
    color: 'bg-indigo-600',
    category: 'Financeiro'
  }
];

const DashboardCard = ({ title, description, icon: Icon, url, color }) => (
  <Link to={createPageUrl(url)}>
    <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group border-slate-100 bg-white overflow-hidden relative">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${color}`} />
      <CardContent className="p-6 flex flex-col items-start gap-4">
        <div className={`p-4 ${color} rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <div className="w-full">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-slate-700 transition-colors leading-tight mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  </Link>
);

const StatsCard = ({ title, value, icon: Icon, color, subtitle, loading }) => (
  <Card className="relative overflow-hidden border-slate-100 bg-white hover:shadow-lg transition-shadow duration-300">
    <CardContent className="p-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
            {loading ? (
              <div className="h-10 flex items-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <h3 className="text-4xl font-extrabold text-gray-900">{value}</h3>
            )}
          </div>
          <div className={`p-3 ${color} bg-opacity-10 rounded-xl`}>
            <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
          </div>
        </div>
        {subtitle && !loading && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium text-slate-600">
              {subtitle}
            </span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

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
          tarefas
        ] = await Promise.all([
          base44.entities.OrdemServico.list(),
          base44.entities.Cliente.list(),
          base44.entities.Funcionario.filter({ status: 'ativo' }),
          base44.entities.Peca.list(),
          base44.entities.ContasReceber.filter({ status: 'pendente' }),
          base44.entities.ContasPagar.filter({ status: 'pendente' }),
          base44.entities.Tarefa.filter({ status: 'pendente' })
        ]);

        const osEmAndamento = ordensServico.filter(os => os.status === 'em_andamento').length;

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
        console.error('Erro ao carregar dados do dashboard:', err);
        setError('Não foi possível carregar os dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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
    }
  ];

  return (
    <div className="w-full h-full p-4 md:p-6 space-y-6 bg-slate-50">
      {/* Header Compacto */}
      <div className="flex justify-between items-center bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Painel de Controle
          </h1>
          <p className="text-gray-500 text-sm">
            Visão geral da sua oficina mecânica.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-medium text-xs">Online</span>
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} loading={loading} />
        ))}
      </div>

      {/* Quick Access Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 px-1 border-l-4 border-slate-800 pl-4">Módulos Essenciais</h2>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {cardItems.map((item) => (
            <DashboardCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}