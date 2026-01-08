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
    totalReceber: 0,
    contasReceberPendentes: 0,
    totalPagar: 0,
    contasPagarPendentes: 0,
    tarefasPendentes: 0
  });
  const [recentOS, setRecentOS] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          ordensServico,
          clientes,
          funcionarios,
          pecas,
          contasReceber,
          contasPagar,
          tarefas
        ] = await Promise.all([
          base44.entities.OrdemServico.list('-created_date', 10),
          base44.entities.Cliente.list(),
          base44.entities.Funcionario.filter({ status: 'ativo' }),
          base44.entities.Peca.list(),
          base44.entities.ContasReceber.filter({ status: 'pendente' }),
          base44.entities.ContasPagar.filter({ status: 'pendente' }),
          base44.entities.Tarefa.filter({ status: 'pendente' })
        ]);

        if (!mounted) return;

        const osEmAndamento = ordensServico.filter(os => os.status === 'em_andamento').length;
        const totalReceber = contasReceber.reduce((acc, c) => acc + (c.valor || 0), 0);
        const totalPagar = contasPagar.reduce((acc, c) => acc + (c.valor || 0), 0);

        setStats({
          totalOS: ordensServico.length,
          osEmAndamento,
          totalClientes: clientes.length,
          totalFuncionarios: funcionarios.length,
          estoqueItens: pecas.length,
          totalReceber,
          contasReceberPendentes: contasReceber.length,
          totalPagar,
          contasPagarPendentes: contasPagar.length,
          tarefasPendentes: tarefas.length
        });
        
        // Pegar as 5 OS mais recentes
        setRecentOS(ordensServico.slice(0, 5));
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

  const getOSStatusInfo = (status) => {
    const statusMap = {
      em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
      finalizado: { label: 'Finalizado', color: 'bg-green-100 text-green-700' },
      cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700' }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  const quickActions = [
    { title: 'Ordens de Serviço', icon: ClipboardList, url: 'OrdensServico', bgColor: 'bg-blue-500' },
    { title: 'Clientes', icon: Users, url: 'Clientes', bgColor: 'bg-cyan-500' },
    { title: 'Estoque', icon: Package, url: 'Estoque', bgColor: 'bg-green-500' },
    { title: 'Serviços', icon: Wrench, url: 'Servicos', bgColor: 'bg-purple-500' }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Stats Cards - Grid 2x2 no mobile */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          title="A Receber"
          value={formatCurrency(stats.totalReceber)}
          subtitle={`${stats.contasReceberPendentes} pendentes`}
          icon={TrendingUp}
          iconBgColor="bg-emerald-500"
          loading={loading}
          isLarge
        />
        <StatsCard
          title="Clientes Ativos"
          value={stats.totalClientes}
          subtitle="total"
          icon={Users}
          iconBgColor="bg-blue-500"
          loading={loading}
        />
        <StatsCard
          title="A Pagar"
          value={stats.contasPagarPendentes}
          subtitle={formatCurrency(stats.totalPagar)}
          icon={AlertTriangle}
          iconBgColor="bg-rose-500"
          loading={loading}
        />
        <StatsCard
          title="OS Abertas"
          value={stats.osEmAndamento}
          icon={ClipboardList}
          iconBgColor="bg-violet-500"
          loading={loading}
        />
      </div>

      {/* OS Recentes */}
      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">OS Recentes</h3>
            <Link 
              to={createPageUrl('OrdensServico')} 
              className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700"
            >
              Ver todas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : recentOS.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">Nenhuma OS encontrada</p>
          ) : (
            <div>
              {recentOS.map((os) => {
                const statusInfo = getOSStatusInfo(os.status);
                return (
                  <RecentItem
                    key={os.id}
                    title={os.numero_os || `OS #${os.id?.slice(-6)}`}
                    subtitle={os.data_abertura ? new Date(os.data_abertura).toLocaleDateString('pt-BR') : '-'}
                    value={formatCurrency(os.valor_total || 0)}
                    status={statusInfo.label}
                    statusColor={statusInfo.color}
                    onClick={() => window.location.href = createPageUrl('OrdensServico')}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-semibold text-sm mb-3">Ações Rápidas</h3>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <QuickActionCard key={action.title} {...action} />
          ))}
        </div>
      </div>
    </div>
  );
}