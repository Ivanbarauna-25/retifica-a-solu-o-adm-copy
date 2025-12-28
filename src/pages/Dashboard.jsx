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

const DashboardCard = ({ title, icon: Icon, url, color }) => (
  <Link to={createPageUrl(url)}>
    <Card className="hover:shadow-md transition-all h-full group border-slate-100 bg-white overflow-hidden">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 ${color} rounded-lg`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-gray-900 group-hover:text-slate-600">{title}</span>
      </CardContent>
    </Card>
  </Link>
);

const StatsCard = ({ title, value, icon: Icon, color, loading }) => (
  <Card className="border-slate-100 bg-white">
    <CardContent className="p-3">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 ${color} bg-opacity-10 rounded-md`}>
          <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-gray-500 uppercase truncate">{title}</p>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <span className="text-lg font-bold text-gray-900">{value}</span>
          )}
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
    <div className="w-full space-y-4">


      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} loading={loading} />
        ))}
      </div>

      {/* Quick Access Section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acesso Rápido</h2>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
          {cardItems.map((item) => (
            <DashboardCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}