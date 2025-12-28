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
      <div className={`absolute top-0 left-0 w-1 md:w-1.5 h-full ${color}`} />
      <CardContent className="p-3 md:p-5 flex flex-col items-start gap-2 md:gap-4">
        <div className={`p-2.5 md:p-4 ${color} rounded-lg md:rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5 md:w-7 md:h-7 text-white" />
        </div>
        <div className="w-full">
          <h3 className="text-sm md:text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors leading-tight mb-0.5 md:mb-1">
            {title}
          </h3>
          <p className="text-[11px] md:text-sm text-gray-500 leading-relaxed hidden md:block">{description}</p>
        </div>
      </CardContent>
    </Card>
  </Link>
);

const StatsCard = ({ title, value, icon: Icon, color, loading }) => (
  <Card className="border-slate-100 bg-white hover:shadow-md transition-shadow">
    <CardContent className="p-3 md:p-4">
      <div className="flex justify-between items-center gap-2">
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase truncate">{title}</p>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
          ) : (
            <h3 className="text-xl md:text-2xl font-bold text-gray-900">{value}</h3>
          )}
        </div>
        <div className={`p-2 ${color} bg-opacity-10 rounded-lg flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
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

        if (!mounted) return;

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
        if (!mounted) return;
        console.error('Erro ao carregar dados do dashboard:', err);
        setError('Não foi possível carregar os dados. Tente novamente.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDashboardData();
    return () => { mounted = false; };
  }, []);

  const statsData = [
    {
      title: 'OS em Andamento',
      value: stats.osEmAndamento,
      icon: ClipboardList,
      color: 'bg-blue-500'
    },
    {
      title: 'Clientes',
      value: stats.totalClientes,
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Contas a Receber',
      value: stats.contasReceberPendentes,
      icon: TrendingUp,
      color: 'bg-emerald-500'
    },
    {
      title: 'Contas a Pagar',
      value: stats.contasPagarPendentes,
      icon: Banknote,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="w-full min-h-full space-y-4 md:space-y-6">


      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} loading={loading} />
        ))}
      </div>

      {/* Quick Access Section */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 px-1 border-l-4 border-slate-800 pl-3 md:pl-4">Módulos Essenciais</h2>
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {cardItems.map((item) => (
            <DashboardCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}