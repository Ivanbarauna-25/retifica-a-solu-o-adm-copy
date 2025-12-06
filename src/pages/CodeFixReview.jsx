import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileCode, 
  Loader2,
  Download,
  RefreshCw,
  Bot,
  Activity,
  Eye,
  BarChart3,
  FileText
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import ErrorActionsModal from '@/components/errors/ErrorActionsModal';
import AgentChat from '@/components/errors/AgentChat';
import AgentDashboard from '@/components/errors/AgentDashboard';
import AgentReportModal from '@/components/errors/AgentReportModal';
import { Switch } from '@/components/ui/switch';

export default function CodeFixReviewPage() {
  const [errors, setErrors] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [patches, setPatches] = useState([]);
  const [acoes, setAcoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [windowHours, setWindowHours] = useState(72);
  const [selectedError, setSelectedError] = useState(null);
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [monitoramentoAtivo, setMonitoramentoAtivo] = useState(false);
  const [ultimaVerificacao, setUltimaVerificacao] = useState(null);
  const [modalTransitioning, setModalTransitioning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    loadWhatsAppUrl();
    
    const monitoramento = localStorage.getItem('agente_monitoramento_ativo');
    if (monitoramento === 'true') {
      setMonitoramentoAtivo(true);
    }
  }, []);

  const loadWhatsAppUrl = () => {
    try {
      const url = base44.agents.getWhatsAppConnectURL('code_fixer');
      setWhatsappUrl(url);
    } catch (error) {
      console.error('Erro ao gerar URL:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [errorsData, tasksData, patchesData, acoesData] = await Promise.all([
        base44.entities.ErrorLog.list('-last_seen', 100),
        base44.entities.CodeFixTask.list('-updated_date', 100),
        base44.entities.CodePatchSuggestion.list('-updated_date', 100),
        base44.entities.AcaoAgente.list('-created_date', 50)
      ]);

      setErrors(errorsData || []);
      setTasks(tasksData || []);
      setPatches(patchesData || []);
      setAcoes(acoesData || []);
    } catch (error) {
      console.error('Erro ao carregar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const response = await base44.functions.invoke('generateSurgicalReport', {
        windowHours: parseInt(windowHours),
        limitTop: 5
      });

      if (response.data && response.data.report) {
        setReport(response.data.report);
        toast({
          title: 'Sucesso',
          description: `${response.data.metrics?.total || 0} erros analisados`
        });
      }
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Tente novamente',
        variant: 'destructive'
      });
    } finally {
      setReportLoading(false);
    }
  };

  const handleToggleMonitoramento = async () => {
    const novoEstado = !monitoramentoAtivo;
    setMonitoramentoAtivo(novoEstado);
    localStorage.setItem('agente_monitoramento_ativo', novoEstado.toString());
    
    toast({
      title: novoEstado ? '🤖 Ativado' : '⏸️ Pausado',
      description: novoEstado ? 'Monitorando automaticamente' : 'Monitoramento pausado'
    });
  };

  const handleForceMonitor = async () => {
    toast({
      title: '🔍 Varredura iniciada',
      description: 'Verificando erros...'
    });

    try {
      const response = await base44.functions.invoke('monitorErrosAutonomo', {});
      setUltimaVerificacao(new Date().toLocaleString('pt-BR'));
      
      if (response.data) {
        toast({
          title: '✅ Concluído',
          description: `${response.data.errors_processed || 0} erros processados`
        });
      }
      
      await fetchData();
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Tente novamente',
        variant: 'destructive'
      });
    }
  };

  // Debounce para prevenir cliques múltiplos rápidos
  const handleViewError = useCallback((errorId) => {
    if (modalTransitioning) return;
    
    const error = errors.find(e => e.id === errorId);
    if (!error) return;
    
    // Prevenir múltiplos cliques
    setModalTransitioning(true);
    
    // Fechar qualquer modal aberto primeiro
    if (isActionsModalOpen || isReportModalOpen) {
      setIsActionsModalOpen(false);
      setIsReportModalOpen(false);
      
      // Aguardar fechamento completo
      setTimeout(() => {
        setSelectedError(error);
        setIsActionsModalOpen(true);
        setModalTransitioning(false);
      }, 300);
    } else {
      setSelectedError(error);
      setIsActionsModalOpen(true);
      setTimeout(() => setModalTransitioning(false), 300);
    }
  }, [errors, isActionsModalOpen, isReportModalOpen, modalTransitioning]);

  const handleCloseActionsModal = useCallback(() => {
    setIsActionsModalOpen(false);
    // Cleanup completo após animação
    setTimeout(() => {
      setSelectedError(null);
      setModalTransitioning(false);
    }, 300);
  }, []);

  const handleOpenReportModal = useCallback(() => {
    if (modalTransitioning) return;
    
    setModalTransitioning(true);
    
    // Fechar modal de ações se estiver aberto
    if (isActionsModalOpen) {
      setIsActionsModalOpen(false);
      setTimeout(() => {
        setIsReportModalOpen(true);
        setModalTransitioning(false);
      }, 300);
    } else {
      setIsReportModalOpen(true);
      setTimeout(() => setModalTransitioning(false), 300);
    }
  }, [isActionsModalOpen, modalTransitioning]);

  const handleCloseReportModal = useCallback(() => {
    setIsReportModalOpen(false);
    setTimeout(() => setModalTransitioning(false), 300);
  }, []);

  const handleViewTask = (taskId) => {
    toast({
      title: 'Tarefa',
      description: `ID: ${taskId}`
    });
  };

  const criticalErrors = errors.filter(e => e.severity === 'critical').length;
  const totalErrors = errors.length;
  const openTasks = tasks.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length;
  const pendingPatches = patches.filter(p => p.status === 'sugerido' || p.status === 'aprovado').length;

  return (
    <>
      <Toaster />
      <div className="container mx-auto p-4 space-y-6">
        <Card className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Bot className="h-8 w-8" />
                <div>
                  <CardTitle className="text-2xl">🤖 CodeFixer</CardTitle>
                  <p className="text-sm text-slate-300 mt-1">Agente Autônomo de Qualidade</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                  <span className="text-sm">{monitoramentoAtivo ? 'Ativo' : 'Pausado'}</span>
                  <Switch checked={monitoramentoAtivo} onCheckedChange={handleToggleMonitoramento} />
                </div>
                <Button onClick={handleForceMonitor} variant="secondary" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Varrer
                </Button>
                <Button 
                  onClick={handleOpenReportModal} 
                  variant="secondary" 
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                  disabled={modalTransitioning}
                >
                  <FileText className="h-4 w-4" />
                  Relatório
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Erros Críticos</p>
                  <p className="text-3xl font-bold text-red-600">{criticalErrors}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-3xl font-bold">{totalErrors}</p>
                </div>
                <BarChart3 className="h-10 w-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Tarefas</p>
                  <p className="text-3xl font-bold text-yellow-600">{openTasks}</p>
                </div>
                <Clock className="h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Patches</p>
                  <p className="text-3xl font-bold text-blue-600">{pendingPatches}</p>
                </div>
                <FileCode className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="relatorio" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="relatorio">📊 Relatório</TabsTrigger>
            <TabsTrigger value="erros">🐛 Erros ({totalErrors})</TabsTrigger>
            <TabsTrigger value="tarefas">📋 Tarefas ({openTasks})</TabsTrigger>
            <TabsTrigger value="chat">💬 Chat</TabsTrigger>
            <TabsTrigger value="acoes">🤖 Ações</TabsTrigger>
          </TabsList>

          <TabsContent value="relatorio">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 Relatório Cirúrgico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="windowHours">Janela (horas)</Label>
                  <Input
                    id="windowHours"
                    type="number"
                    value={windowHours}
                    onChange={(e) => setWindowHours(e.target.value)}
                    placeholder="72"
                    className="max-w-xs"
                  />
                </div>

                <Button
                  onClick={handleGenerateReport}
                  disabled={reportLoading}
                  className="gap-2"
                >
                  {reportLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4" />
                      Gerar
                    </>
                  )}
                </Button>

                {report && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold">Relatório</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(report);
                          toast({ title: 'Copiado!' });
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm bg-white p-4 rounded border overflow-auto max-h-96">
                      {report}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="erros">
            <Card>
              <CardHeader>
                <CardTitle>🐛 Erros</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                  </div>
                ) : errors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>Nenhum erro</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {errors.slice(0, 20).map((error) => (
                      <div
                        key={error.id}
                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                        onClick={() => !modalTransitioning && handleViewError(error.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={error.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {error.severity}
                            </Badge>
                            <Badge variant="outline">{error.status}</Badge>
                          </div>
                          <p className="font-medium text-sm">{error.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {error.file}:{error.line} • {new Date(error.last_seen || error.created_date).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          disabled={modalTransitioning}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tarefas">
            <Card>
              <CardHeader>
                <CardTitle>📋 Tarefas</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>Nenhuma tarefa</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge>{task.priority}</Badge>
                            <Badge variant="outline">{task.status}</Badge>
                            {task.category && <Badge variant="secondary">{task.category}</Badge>}
                          </div>
                          <p className="font-medium text-sm">{task.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <AgentChat whatsappUrl={whatsappUrl} />
          </TabsContent>

          <TabsContent value="acoes">
            <AgentDashboard 
              acoes={acoes} 
              onViewError={handleViewError}
              onViewTask={handleViewTask}
            />
          </TabsContent>
        </Tabs>

        {monitoramentoAtivo && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-green-600 animate-pulse" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900">Monitoramento Ativo</p>
                  <p className="text-sm text-green-700">
                    Verificando erros automaticamente. E-mails para erros críticos.
                  </p>
                  {ultimaVerificacao && (
                    <p className="text-xs text-green-600 mt-1">
                      Última: {ultimaVerificacao}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Renderizar modais condicionalmente com keys únicas */}
      {isActionsModalOpen && selectedError && (
        <ErrorActionsModal
          key={`error-modal-${selectedError.id}`}
          isOpen={isActionsModalOpen}
          onClose={handleCloseActionsModal}
          error={selectedError}
          onRefresh={fetchData}
        />
      )}

      {isReportModalOpen && (
        <AgentReportModal
          key="report-modal"
          isOpen={isReportModalOpen}
          onClose={handleCloseReportModal}
        />
      )}
    </>
  );
}