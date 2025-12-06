import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import {
  Download,
  Mail,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Brain,
  Shield,
  TrendingUp,
  Clock,
  BarChart3,
  FileCode,
  MapPin,
  Copy
} from 'lucide-react';

export default function AgentReportModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const isMountedRef = useRef(true);
  const { toast } = useToast();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isOpen && !report && !loading) {
      loadReport();
    }
    
    if (!isOpen) {
      // Cleanup quando modal fecha
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setReport(null);
          setLoading(false);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const loadReport = async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateAgentStatusReport', {});
      
      if (isMountedRef.current && response.data && response.data.success) {
        setReport(response.data);
        toast({
          title: '✅ Relatório Gerado',
          description: 'Relatório técnico completo'
        });
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      if (isMountedRef.current) {
        toast({
          title: 'Erro',
          description: error.message || 'Tente novamente',
          variant: 'destructive'
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleDownload = () => {
    if (!report?.report_text || !isMountedRef.current) return;
    
    const blob = new Blob([report.report_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_CodeFixer_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    if (isMountedRef.current) {
      toast({
        title: '💾 Download Concluído',
        description: 'Relatório salvo'
      });
    }
  };

  const handleSendEmail = async () => {
    if (!isMountedRef.current) return;
    
    setSendingEmail(true);
    try {
      const configs = await base44.entities.Configuracoes.list();
      const emailAdmin = configs?.[0]?.email || 'admin@sistema.com';
      
      await base44.integrations.Core.SendEmail({
        to: emailAdmin,
        subject: `📊 Relatório CodeFixer - ${new Date().toLocaleDateString('pt-BR')}`,
        body: `<pre style="font-family: monospace; white-space: pre-wrap; background: #1e1e1e; color: #d4d4d4; padding: 20px;">${report.report_text}</pre>`
      });
      
      if (isMountedRef.current) {
        toast({
          title: '📧 E-mail Enviado',
          description: `Enviado para ${emailAdmin}`
        });
      }
    } catch (error) {
      console.error('Erro:', error);
      if (isMountedRef.current) {
        toast({
          title: 'Erro ao enviar',
          description: error.message,
          variant: 'destructive'
        });
      }
    } finally {
      if (isMountedRef.current) {
        setSendingEmail(false);
      }
    }
  };

  const handleRefresh = () => {
    if (!isMountedRef.current) return;
    setReport(null);
    loadReport();
  };

  const handleClose = () => {
    if (!isMountedRef.current) return;
    setReport(null);
    setLoading(false);
    onClose();
  };

  const handleCopyErrorId = (errorId) => {
    if (!isMountedRef.current) return;
    navigator.clipboard.writeText(errorId);
    toast({
      title: '📋 ID Copiado',
      description: 'Use para buscar o erro'
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-purple-600" />
              Relatório Técnico CodeFixer
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading}>
              <Activity className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Gerando relatório...</p>
            </div>
          </div>
        ) : report?.data ? (
          <Tabs defaultValue="erros" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="erros">🔴 Erros Ativos</TabsTrigger>
              <TabsTrigger value="visual">📊 Visual</TabsTrigger>
              <TabsTrigger value="texto">📄 Texto</TabsTrigger>
            </TabsList>

            <TabsContent value="erros" className="flex-1 overflow-y-auto mt-4 space-y-4">
              {report.data.top_erros && report.data.top_erros.length > 0 ? (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      {report.data.top_erros.length} Erro(s) Ativo(s) Detectado(s)
                    </h3>
                    <p className="text-sm text-red-700">
                      Estes erros precisam de atenção. Use o botão "Copiar ID" para buscar detalhes.
                    </p>
                  </div>

                  {report.data.top_erros.map((erro, idx) => (
                    <div
                      key={idx}
                      className={`border-l-4 rounded-lg p-4 space-y-3 ${
                        erro.severity === 'critical' ? 'bg-red-50 border-red-500' :
                        erro.severity === 'error' ? 'bg-orange-50 border-orange-500' :
                        'bg-yellow-50 border-yellow-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={erro.severity === 'critical' ? 'destructive' : 'default'}
                            className="font-semibold"
                          >
                            {erro.severity === 'critical' ? '🔴 CRÍTICO' :
                             erro.severity === 'error' ? '🟠 ERROR' : '🟡 WARNING'}
                          </Badge>
                          {erro.ocorrencias > 1 && (
                            <Badge variant="outline" className="gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {erro.ocorrencias}x
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyErrorId(erro.primeiro_erro_id)}
                          className="gap-2"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar ID
                        </Button>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">📝 Mensagem:</h4>
                        <p className="text-sm text-gray-900 font-mono bg-white p-2 rounded border">
                          {erro.mensagem}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          <FileCode className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-gray-600 font-medium">Arquivo:</span>
                            <p className="font-mono text-xs text-gray-900 break-all">{erro.arquivo}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-gray-600 font-medium">Linha:</span>
                            <p className="font-mono text-gray-900">{erro.linha}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Activity className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-gray-600 font-medium">Componente:</span>
                            <p className="font-mono text-xs text-gray-900">{erro.componente}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-gray-600 font-medium">Última ocorrência:</span>
                            <p className="text-xs text-gray-900">
                              {new Date(erro.ultima_ocorrencia).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{erro.status}</Badge>
                          <span className="text-xs text-gray-500 font-mono">
                            ID: {erro.primeiro_erro_id}
                          </span>
                        </div>
                        {erro.severity === 'critical' && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Ação Imediata
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    ✅ Sistema Limpo!
                  </h3>
                  <p className="text-gray-600">
                    Nenhum erro ativo detectado nas últimas 48 horas.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="visual" className="flex-1 overflow-y-auto mt-4 space-y-4">
              <div className={`p-6 rounded-lg border-l-4 ${
                report.data.diagnostico.status.includes('Operacional') ? 'bg-green-50 border-green-500' : 
                report.data.diagnostico.status.includes('Parcial') ? 'bg-yellow-50 border-yellow-500' : 
                'bg-red-50 border-red-500'
              }`}>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6" />
                  Diagnóstico Final
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Status:</span>
                    <span className="font-bold">{report.data.diagnostico.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Risco:</span>
                    <Badge>{report.data.diagnostico.risco_atual}</Badge>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-700">{report.data.diagnostico.recomendacao_imediata}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Health Score</span>
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-600">
                    {report.data.metricas.system_health_score}/100
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Críticos</span>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="text-3xl font-bold text-red-600">
                    {report.data.metricas.criticos}
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Taxa</span>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {report.data.metricas.taxa_resolucao}%
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Aprendizado
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Padrões</div>
                    <div className="text-2xl font-bold">{report.data.aprendizado.total_padroes}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Versão</div>
                    <div className="text-2xl font-bold">v{report.data.aprendizado.versao_modelo}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Confidence</div>
                    <div className="text-2xl font-bold">{report.data.aprendizado.confidence_media}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Alta Conf.</div>
                    <div className="text-2xl font-bold text-green-600">{report.data.aprendizado.padroes_alta_confianca}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Segurança
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Safety Score</div>
                    <div className="text-2xl font-bold text-green-600">{report.data.seguranca.safety_score_medio}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Patches</div>
                    <div className="text-2xl font-bold text-blue-600">{report.data.seguranca.patches_aplicados_total}</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="texto" className="flex-1 overflow-y-auto mt-4">
              <div className="bg-black text-green-400 p-6 rounded-lg font-mono text-sm">
                <pre className="whitespace-pre-wrap">{report.report_text}</pre>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload} disabled={!report || loading} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar
            </Button>
            <Button variant="outline" onClick={handleSendEmail} disabled={!report || loading || sendingEmail} className="gap-2">
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              E-mail
            </Button>
          </div>
          <Button variant="outline" onClick={handleClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}