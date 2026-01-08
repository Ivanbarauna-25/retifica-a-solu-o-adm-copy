import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/components/formatters';
import {
  ClipboardList,
  Package,
  Users,
  Banknote,
  TrendingUp,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Wrench
} from 'lucide-react';

// Card de estatística estilo app moderno
const StatsCard = ({ title, value, subtitle, icon: Icon, bgColor, iconBgColor, loading, isLarge }) => (
  <Card className={`border-0 shadow-sm rounded-2xl overflow-hidden ${isLarge ? 'col-span-2 md:col-span-1' : ''}`}>
    <CardContent className={`${isLarge ? 'p-4' : 'p-3'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium mb-1">{title}</p>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : (
            <>
              <p className={`font-bold text-gray-900 ${isLarge ? 'text-2xl md:text-3xl' : 'text-xl'}`}>{value}</p>
              {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </>
          )}
        </div>
        <div className={`${iconBgColor} p-2.5 rounded-xl flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Card de ação rápida
const QuickActionCard = ({ title, icon: Icon, url, bgColor }) => (
  <Link to={createPageUrl(url)}>
    <Card className="border-0 shadow-sm rounded-xl overflow-hidden active:scale-95 transition-transform bg-white hover:shadow-md">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`${bgColor} p-2 rounded-lg flex-shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-gray-700 truncate">{title}</span>
      </CardContent>
    </Card>
  </Link>
);

// Item de lista recente
const RecentItem = ({ title, subtitle, value, status, statusColor, onClick }) => (
  <div 
    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 -mx-4 px-4 transition-colors"
    onClick={onClick}
  >
    <div className="min-w-0 flex-1">
      <p className="font-medium text-gray-900 text-sm truncate">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
      <span className="font-semibold text-gray-900 text-sm">{value}</span>
      {status && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
          {status}
        </span>
      )}
    </div>
  </div>
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
    <div className="w-full space-y-4 md:space-y-6">
      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} loading={loading} />
        ))}
      </div>

      {/* Quick Access Section */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 md:text-sm md:mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-4 md:gap-4">
          {cardItems.map((item) => (
            <DashboardCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}