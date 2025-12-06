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
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-700 to-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                  <Activity className="h-6 w-6" />
                  Monitoramento do Agente CodeFix
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Acompanhamento em tempo real das atividades e performance do agente autônomo
                </CardDescription>
              </div>
              <Button
                onClick={fetchDashboardData}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Métricas Principais - Com keys únicas e estáveis */}
        {metricas && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card key="metrica-erros">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total de Erros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{metricas.totalErros}</div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
                {metricas.errosCriticos > 0 && (
                  <p className="text-xs text-red-600 mt-2">
                    {metricas.errosCriticos} crítico(s)
                  </p>
                )}
              </CardContent>
            </Card>

            <Card key="metrica-resolvidos">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Erros Resolvidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-green-600">{metricas.errosResolvidos}</div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Taxa: {metricas.taxaResolucao}%
                </p>
              </CardContent>
            </Card>

            <Card key="metrica-tarefas">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Tarefas Abertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{metricas.tarefasAbertas}</div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card key="metrica-acoes">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Ações Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{metricas.acoesHoje}</div>
                  <Zap className="h-8 w-8 text-purple-500" />
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
                    {dashboardData.reports.map((report) => (
                      <Card key={report.id || `report-${report.created_date}`} className="hover:bg-slate-50 transition-colors">
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