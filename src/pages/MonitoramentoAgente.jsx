import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  FileText,
  BarChart3,
  Zap
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import AgentDashboard from '@/components/errors/AgentDashboard';
import AgentReportModal from '@/components/errors/AgentReportModal';

export default function MonitoramentoAgentePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [relatorioSelecionado, setRelatorioSelecionado] = useState(null);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Buscar dados de forma segura
      const [errors, tasks, actions, reports] = await Promise.allSettled([
        base44.entities.ErrorLog.list('-last_seen', 100).catch(() => []),
        base44.entities.CodeFixTask.list('-created_date', 50).catch(() => []),
        base44.entities.AcaoAgente.list('-created_date', 50).catch(() => []),
        base44.entities.AgentReportsHistory.list('-report_date', 10).catch(() => [])
      ]);

      setDashboardData({
        errors: errors.status === 'fulfilled' ? errors.value || [] : [],
        tasks: tasks.status === 'fulfilled' ? tasks.value || [] : [],
        actions: actions.status === 'fulfilled' ? actions.value || [] : [],
        reports: reports.status === 'fulfilled' ? reports.value || [] : []
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados do monitoramento.',
        variant: 'destructive'
      });
      // Garantir que sempre temos um objeto válido
      setDashboardData({
        errors: [],
        tasks: [],
        actions: [],
        reports: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const calcularMetricas = () => {
    if (!dashboardData) return null;

    const totalErros = dashboardData.errors?.length || 0;
    const errosCriticos = dashboardData.errors?.filter(e => e.severity === 'critical')?.length || 0;
    const errosResolvidos = dashboardData.errors?.filter(e => e.status === 'resolvido')?.length || 0;
    const tarefasAbertas = dashboardData.tasks?.filter(t => t.status === 'aberta')?.length || 0;
    const acoesHoje = dashboardData.actions?.filter(a => {
      const hoje = new Date().toDateString();
      const dataAcao = new Date(a.created_date).toDateString();
      return hoje === dataAcao;
    })?.length || 0;

    const taxaResolucao = totalErros > 0 ? ((errosResolvidos / totalErros) * 100).toFixed(1) : 0;

    return {
      totalErros,
      errosCriticos,
      errosResolvidos,
      tarefasAbertas,
      acoesHoje,
      taxaResolucao
    };
  };

  const handleOpenReport = (report) => {
    setRelatorioSelecionado(report);
    setShowReportModal(true);
  };

  const handleGerarNovoRelatorio = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('generateAgentStatusReport', {});
      
      if (response.data?.success) {
        toast({
          title: '✅ Relatório Gerado',
          description: 'Novo relatório técnico criado'
        });
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600">Carregando dados do agente...</p>
        </div>
      </div>
    );
  }

  const metricas = calcularMetricas();

  return (
    <>
      <Toaster />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Monitoramento do Agente CodeFix
            </h1>
            <p className="text-slate-600 mt-1">
              Acompanhamento em tempo real das atividades e performance do agente autônomo
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchDashboardData} variant="outline" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={handleGerarNovoRelatorio} disabled={isLoading}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </div>
        </div>

        {/* Métricas */}
        {metricas && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card key="metrica-erros">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-600 mb-1">Total de Erros</p>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{metricas.totalErros}</div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
                {metricas.errosCriticos > 0 && (
                  <p className="text-xs text-red-600 mt-2">
                    {metricas.errosCriticos} crítico(s)
                  </p>
                )}
              </CardContent>
            </Card>

            <Card key="metrica-resolvidos">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-600 mb-1">Erros Resolvidos</p>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-green-600">{metricas.errosResolvidos}</div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Taxa: {metricas.taxaResolucao}%
                </p>
              </CardContent>
            </Card>

            <Card key="metrica-tarefas">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-600 mb-1">Tarefas Abertas</p>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{metricas.tarefasAbertas}</div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card key="metrica-acoes">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-600 mb-1">Ações Hoje</p>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{metricas.acoesHoje}</div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <Zap className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs de Conteúdo */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="historico">Histórico de Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {dashboardData && <AgentDashboard data={dashboardData} />}
          </TabsContent>

          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Relatórios de Status</CardTitle>
                <CardDescription>
                  Relatórios de saúde do sistema gerados pelo agente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!dashboardData?.reports || dashboardData.reports.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Nenhum relatório disponível
                  </div>
                ) : (
                  <div className="space-y-3">
                   {(dashboardData.reports || []).map((report, index) => (
                     <Card key={report.id || `report-${report.created_date || index}`} className="hover:bg-slate-50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold">
                                  Relatório de {new Date(report.report_date).toLocaleDateString('pt-BR')}
                                </span>
                                <Badge variant={
                                  report.status === 'Operacional' ? 'success' :
                                  report.status === 'Parcial' ? 'warning' : 'destructive'
                                }>
                                  {report.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                                <div>
                                  <span className="font-medium">Health Score:</span> {report.health_score?.toFixed(1) || 'N/A'}%
                                </div>
                                <div>
                                  <span className="font-medium">Erros:</span> {report.total_errors || 0}
                                </div>
                                <div>
                                  <span className="font-medium">Resolvidos:</span> {report.resolved_errors || 0}
                                </div>
                                <div>
                                  <span className="font-medium">Taxa:</span> {report.resolution_rate?.toFixed(1) || 0}%
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleOpenReport(report)}
                              variant="outline"
                              size="sm">
                              <FileText className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Relatório */}
      {showReportModal && relatorioSelecionado && (
        <AgentReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setRelatorioSelecionado(null);
          }}
          report={relatorioSelecionado}
        />
      )}
    </>
  );
}