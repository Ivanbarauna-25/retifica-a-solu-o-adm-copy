import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import {
  FileText,
  Wrench,
  ClipboardList,
  CheckCircle2,
  EyeOff,
  Code,
  TrendingUp,
  Loader2,
  Copy,
  MessageSquare,
  X
} from 'lucide-react';
import { generateErrorPrompt } from './ErrorPromptGenerator';

export default function ErrorActionsModal({ isOpen, error, onClose, onRefresh }) {
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [whatsappAgentUrl, setWhatsappAgentUrl] = useState('');
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  // Marcar componente como montado/desmontado
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      // Usar setTimeout para evitar state updates durante desmontagem
      setTimeout(() => {
        if (isMountedRef.current) {
          setAction(null);
          setResult(null);
          setLoading(false);
        }
      }, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      try {
        const url = base44.agents.getWhatsAppConnectURL('code_fixer');
        if (isMountedRef.current) {
          setWhatsappAgentUrl(url);
        }
      } catch (error) {
        console.error('Erro ao gerar URL do WhatsApp:', error);
      }
    }
  }, [isOpen]);

  const actions = [
    {
      id: 'copy_prompt',
      label: 'Copiar Prompt para IA',
      icon: Copy,
      description: 'Gera prompt formatado para análise externa',
      color: 'bg-purple-500'
    },
    {
      id: 'detail_report',
      label: 'Gerar Relatório Detalhado',
      icon: FileText,
      description: 'Análise completa com causa raiz e solução',
      color: 'bg-blue-500'
    },
    {
      id: 'generate_fix',
      label: 'Gerar Correção Automática',
      icon: Wrench,
      description: 'Cria patch de correção e tarefa',
      color: 'bg-green-500'
    },
    {
      id: 'create_task',
      label: 'Criar Tarefa',
      icon: ClipboardList,
      description: 'Adiciona à lista de tarefas',
      color: 'bg-purple-500'
    },
    {
      id: 'mark_resolved',
      label: 'Marcar como Resolvido',
      icon: CheckCircle2,
      description: 'Marca o erro como corrigido',
      color: 'bg-emerald-500'
    },
    {
      id: 'ignore',
      label: 'Ignorar Erro',
      icon: EyeOff,
      description: 'Remove da lista de pendências',
      color: 'bg-gray-500'
    },
    {
      id: 'view_stack',
      label: 'Ver Stack Trace Completo',
      icon: Code,
      description: 'Visualizar stack trace detalhado',
      color: 'bg-orange-500'
    },
    {
      id: 'analyze_impact',
      label: 'Analisar Impacto',
      icon: TrendingUp,
      description: 'Ver ocorrências similares e frequência',
      color: 'bg-red-500'
    }
  ];

  const generateDetailReport = (error) => {
    const lines = [];
    lines.push('═'.repeat(70));
    lines.push(`🔴 RELATÓRIO DETALHADO DE ERRO`);
    lines.push('═'.repeat(70));
    lines.push('');
    
    lines.push('📋 INFORMAÇÕES BÁSICAS:');
    lines.push(`   • ID: ${error.id}`);
    lines.push(`   • Mensagem: ${error.message}`);
    lines.push(`   • Severidade: ${error.severity?.toUpperCase()}`);
    lines.push(`   • Status: ${error.status}`);
    lines.push(`   • Última ocorrência: ${new Date(error.last_seen || error.created_date).toLocaleString('pt-BR')}`);
    lines.push('');
    
    lines.push('📍 LOCALIZAÇÃO:');
    lines.push(`   • Arquivo: ${error.file || 'Não especificado'}`);
    lines.push(`   • Linha: ${error.line || 'Não especificada'}`);
    lines.push(`   • Coluna: ${error.column || 'Não especificada'}`);
    lines.push(`   • URL: ${error.url || 'Não especificada'}`);
    lines.push(`   • Componente: ${error.component || error.source || 'Não especificado'}`);
    lines.push('');
    
    let cause = 'Causa não identificada automaticamente';
    let solution = 'Análise manual necessária';
    let codeExample = '';
    
    const msg = error.message || '';
    if (msg.includes('Cannot read properties of undefined')) {
      const match = msg.match(/Cannot read properties? of undefined \(reading '(\w+)'\)/);
      const prop = match ? match[1] : 'property';
      cause = `Tentativa de acessar propriedade '${prop}' de objeto undefined/null`;
      solution = `Adicionar validação: obj?.${prop} ou verificar se obj existe`;
      codeExample = `// Antes:\nconst value = obj.${prop};\n\n// Depois:\nconst value = obj?.${prop};`;
    } else if (msg.includes('map') && msg.includes('not a function')) {
      cause = 'Tentativa de usar .map() em variável que não é um array';
      solution = 'Garantir que a variável é array: (arr || []).map(...)';
      codeExample = `// Antes:\ndata.map(item => ...)\n\n// Depois:\n(data || []).map(item => ...)`;
    } else if (msg.includes('500')) {
      cause = 'Erro no servidor - validação ou processamento backend';
      solution = 'Verificar logs do servidor, validar payload da requisição';
      codeExample = 'Revisar função backend e validar dados enviados';
    }
    
    lines.push('🔍 ANÁLISE AUTOMÁTICA:');
    lines.push(`   • Causa raiz: ${cause}`);
    lines.push(`   • Solução sugerida: ${solution}`);
    lines.push('');
    
    if (codeExample) {
      lines.push('💻 EXEMPLO DE CORREÇÃO:');
      lines.push(codeExample);
      lines.push('');
    }
    
    if (error.stack) {
      lines.push('📚 STACK TRACE:');
      const stackLines = error.stack.split('\n').slice(0, 10);
      stackLines.forEach(line => lines.push(`   ${line}`));
      if (error.stack.split('\n').length > 10) {
        lines.push('   ... (stack trace truncado)');
      }
      lines.push('');
    }
    
    lines.push('🎯 PRÓXIMOS PASSOS:');
    if (error.severity === 'critical' || error.severity === 'error') {
      lines.push('   1. ⚠️ URGENTE: Priorizar correção imediatamente');
      lines.push('   2. 🔧 Aplicar solução sugerida no arquivo indicado');
      lines.push('   3. ✅ Testar correção em ambiente de desenvolvimento');
      lines.push('   4. 🚀 Deploy da correção em produção');
    } else {
      lines.push('   1. 📝 Criar tarefa para correção');
      lines.push('   2. 🔍 Investigar causa raiz se necessário');
      lines.push('   3. 🔧 Implementar correção');
      lines.push('   4. ✅ Marcar erro como resolvido após correção');
    }
    lines.push('');
    
    lines.push('═'.repeat(70));
    lines.push(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`);
    lines.push('═'.repeat(70));

    return lines.join('\n');
  };

  const generateFix = (error) => {
    const msg = error.message || '';
    const file = error.file || '';
    const line = error.line || 0;
    
    let title = 'Correção genérica do erro';
    let description = 'Análise manual necessária';
    let patch = `// Erro detectado: ${msg}\n// Localização: ${file}:${line}\n\n// Revisar código no arquivo indicado`;
    let priority = 'média';
    
    if (msg.includes('Cannot read properties of undefined')) {
      const match = msg.match(/Cannot read properties? of undefined \(reading '(\w+)'\)/);
      const prop = match ? match[1] : 'property';
      title = `Corrigir acesso a propriedade '${prop}' de objeto undefined`;
      description = `Adicionar validação de null/undefined antes de acessar a propriedade '${prop}'`;
      patch = `// Localização: ${file}:${line}\n\n// ANTES:\nconst value = obj.${prop};\n\n// DEPOIS (recomendado):\nconst value = obj?.${prop};\n\n// OU com valor padrão:\nconst value = obj?.${prop} || defaultValue;`;
      priority = 'alta';
    } else if (msg.includes('map') && msg.includes('not a function')) {
      title = 'Corrigir uso de .map() em variável não-array';
      description = 'Garantir que a variável é um array antes de usar .map()';
      patch = `// Localização: ${file}:${line}\n\n// ANTES:\ndata.map(item => ...)\n\n// DEPOIS:\n(data || []).map(item => ...)`;
      priority = 'alta';
    } else if (msg.includes('500')) {
      title = 'Corrigir erro 500 no backend';
      description = 'Revisar função backend e validar payload';
      patch = `// Localização: ${file}:${line}\n\n// 1. Adicione try/catch\ntry {\n  // código\n} catch (error) {\n  console.error('Erro:', error);\n}\n\n// 2. Valide dados de entrada`;
      priority = 'crítica';
    }
    
    return { title, description, patch, priority, file_path: file };
  };

  const handleAction = async (actionId) => {
    // Previnir ações se componente já foi desmontado
    if (!isMountedRef.current) return;
    
    setAction(actionId);
    setLoading(true);
    setResult(null);

    try {
      switch (actionId) {
        case 'copy_prompt':
          const prompt = generateErrorPrompt(error, {
            includeStackTrace: true,
            includeSolution: true,
            customInstructions: 'Este erro está ocorrendo no sistema ERP de oficina mecânica. Por favor, forneça uma solução que seja compatível com React, Base44 e Shadcn/ui.'
          });
          
          await navigator.clipboard.writeText(prompt);
          
          if (isMountedRef.current) {
            setResult({
              type: 'prompt',
              data: prompt
            });
            
            toast({
              title: '✅ Prompt Copiado!',
              description: 'Cole no chat da IA para análise detalhada'
            });
          }
          break;

        case 'detail_report':
          const report = generateDetailReport(error);
          if (isMountedRef.current) {
            setResult({
              type: 'report',
              data: report
            });
            toast({
              title: 'Relatório Gerado!',
              description: 'Análise detalhada criada'
            });
          }
          break;

        case 'generate_fix':
          const fix = generateFix(error);
          
          const task = await base44.entities.CodeFixTask.create({
            title: fix.title,
            description: fix.description,
            status: 'aberta',
            priority: fix.priority === 'crítica' ? 'urgente' : fix.priority === 'alta' ? 'alta' : 'media',
            error_log_id: error.id
          });
          
          await base44.entities.CodePatchSuggestion.create({
            file_path: fix.file_path,
            change_type: 'edit',
            patch: fix.patch,
            notes: `Correção automática gerada para: ${error.message}`,
            status: 'sugerido',
            task_id: task.id
          });
          
          if (isMountedRef.current) {
            setResult({
              type: 'fix',
              data: fix.patch,
              meta: fix
            });
            toast({
              title: 'Correção Gerada!',
              description: 'Tarefa criada e patch sugerido'
            });
          }
          break;

        case 'create_task':
          await base44.entities.CodeFixTask.create({
            title: `Corrigir: ${error.message.substring(0, 50)}...`,
            description: `Erro detectado em ${error.file}:${error.line}\n\n${error.message}`,
            status: 'aberta',
            priority: error.severity === 'critical' ? 'urgente' : 'media',
            error_log_id: error.id
          });
          
          if (isMountedRef.current) {
            toast({
              title: 'Tarefa Criada!',
              description: 'Adicionada à lista'
            });
          }
          
          // Usar setTimeout para fechar após state update
          setTimeout(() => {
            if (isMountedRef.current) {
              handleClose();
              if (onRefresh) onRefresh();
            }
          }, 100);
          break;

        case 'mark_resolved':
          await base44.entities.ErrorLog.update(error.id, {
            status: 'resolvido'
          });
          
          if (isMountedRef.current) {
            toast({
              title: 'Resolvido',
              description: 'Erro marcado como resolvido'
            });
          }
          
          setTimeout(() => {
            if (isMountedRef.current) {
              handleClose();
              if (onRefresh) onRefresh();
            }
          }, 100);
          break;

        case 'ignore':
          await base44.entities.ErrorLog.update(error.id, {
            status: 'ignorado'
          });
          
          if (isMountedRef.current) {
            toast({
              title: 'Ignorado',
              description: 'Erro marcado como ignorado'
            });
          }
          
          setTimeout(() => {
            if (isMountedRef.current) {
              handleClose();
              if (onRefresh) onRefresh();
            }
          }, 100);
          break;

        case 'view_stack':
          if (isMountedRef.current) {
            setResult({
              type: 'stack',
              data: error.stack || 'Stack trace não disponível'
            });
          }
          break;

        case 'analyze_impact':
          const similarErrors = await base44.entities.ErrorLog.filter({
            message: error.message,
            file: error.file
          });
          
          if (isMountedRef.current) {
            setResult({
              type: 'impact',
              data: similarErrors || [],
              meta: {
                total: similarErrors?.length || 0,
                message: error.message,
                file: error.file
              }
            });
          }
          break;
      }
    } catch (err) {
      console.error('Error executing action:', err);
      if (isMountedRef.current) {
        toast({
          title: 'Erro',
          description: err.message || 'Não foi possível executar',
          variant: 'destructive'
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleCopy = () => {
    if (!result?.data || !isMountedRef.current) return;
    const textToCopy = typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: 'Copiado!',
      description: 'Conteúdo copiado'
    });
  };

  const handleWhatsAppShare = () => {
    if (!isMountedRef.current) return;
    
    if (whatsappAgentUrl && result?.data) {
      const whatsappMessage = encodeURIComponent(result.data);
      const separator = whatsappAgentUrl.includes('?') ? '&' : '?';
      const finalWhatsappUrl = `${whatsappAgentUrl}${separator}text=${whatsappMessage}`;
      window.open(finalWhatsappUrl, '_blank');
    } else {
      toast({
        title: 'Erro',
        description: 'URL do WhatsApp não disponível',
        variant: 'destructive'
      });
    }
  };

  const handleClose = () => {
    if (!isMountedRef.current) return;
    
    // Limpar estado antes de fechar
    setAction(null);
    setResult(null);
    setLoading(false);
    
    // Usar setTimeout para garantir que não há updates pendentes
    setTimeout(() => {
      onClose();
    }, 0);
  };

  if (!isOpen || !error) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span>Ações para o Erro</span>
              <Badge variant={error.severity === 'critical' ? 'destructive' : 'default'}>
                {error.severity}
              </Badge>
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-slate-600 mt-2">{error.message}</p>
        </DialogHeader>

        {!result ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <Button
                  key={act.id}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-slate-50"
                  onClick={() => handleAction(act.id)}
                  disabled={loading}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={`${act.color} p-2 rounded-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-left flex-1">{act.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 text-left">{act.description}</p>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Resultado</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                    {result.type === 'prompt' && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={handleCopy}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Prompt Pronto
                      </Button>
                    )}
                    {result.type === 'report' && whatsappAgentUrl && (
                      <Button variant="outline" size="sm" onClick={handleWhatsAppShare} className="text-green-600">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                    )}
                  </div>
                </div>

                {result.type === 'prompt' && (
                  <div className="space-y-3">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                        Prompt Formatado para IA
                      </h4>
                      <p className="text-sm text-slate-600">
                        Este prompt foi copiado! Cole no chat da IA para análise detalhada.
                      </p>
                    </div>
                    <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-[500px]">
                      <pre className="whitespace-pre-wrap">{result.data}</pre>
                    </div>
                  </div>
                )}

                {result.type === 'report' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Relatório Completo</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Tudo
                      </Button>
                    </div>
                    <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-[500px]">
                      <pre className="whitespace-pre-wrap">{result.data}</pre>
                    </div>
                  </div>
                )}

                {result.type === 'fix' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{result.meta.title}</h4>
                      <p className="text-sm text-slate-600 mb-2">{result.meta.description}</p>
                      <div className="flex gap-2">
                        <Badge>{result.meta.priority}</Badge>
                        <Badge variant="outline">Correção Sugerida</Badge>
                      </div>
                    </div>
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm overflow-auto max-h-[400px]">
                      <pre className="whitespace-pre-wrap">{result.data}</pre>
                    </div>
                  </div>
                )}

                {result.type === 'stack' && (
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-auto max-h-[500px]">
                    <pre className="whitespace-pre-wrap">{result.data}</pre>
                  </div>
                )}

                {result.type === 'impact' && (
                  <div className="space-y-3">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Análise de Impacto</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Total:</span>
                          <span className="ml-2 text-orange-600 font-bold">{result.meta.total}</span>
                        </div>
                        <div>
                          <span className="font-medium">Frequência:</span>
                          <span className="ml-2">{(result.meta.total / 7).toFixed(1)} vezes/dia</span>
                        </div>
                        <div>
                          <span className="font-medium">Arquivo:</span>
                          <span className="ml-2 font-mono text-xs">{result.meta.file}</span>
                        </div>
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-auto space-y-2">
                      {result.data.map((err, idx) => (
                        <div key={idx} className="border rounded-lg p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{new Date(err.created_date).toLocaleDateString('pt-BR')}</Badge>
                            <span className="text-xs text-slate-500">{err.url}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => {
                  if (isMountedRef.current) {
                    setResult(null);
                  }
                }}>
                  Voltar às Ações
                </Button>
              </>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}