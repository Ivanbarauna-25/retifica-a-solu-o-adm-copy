import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  Eye,
  Trash2,
  MessageSquare,
  Copy,
  Loader2,
  RefreshCw,
  Zap,
  Bot,
  Play,
  FileText,
  Wrench
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';

export default function GerenciarErros() {
  const [erros, setErros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    severity: 'all',
    status: 'all',
    busca: ''
  });
  const [erroSelecionado, setErroSelecionado] = useState(null);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalChat, setModalChat] = useState(false);
  const [mensagemChat, setMensagemChat] = useState('');
  const [conversaChat, setConversaChat] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [delegandoAgente, setDelegandoAgente] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    carregarErros();
  }, []);

  const carregarErros = async () => {
    setLoading(true);
    try {
      const dados = await base44.entities.ErrorLog.list('-last_seen', 200);
      setErros(dados || []);
    } catch (error) {
      console.error('Erro ao carregar:', error);
      toast({
        title: 'Erro ao carregar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const errosFiltrados = erros.filter((erro) => {
    const matchSeverity = filtros.severity === 'all' || erro.severity === filtros.severity;
    const matchStatus = filtros.status === 'all' || erro.status === filtros.status;
    const matchBusca = !filtros.busca ||
    erro.message?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
    erro.file?.toLowerCase().includes(filtros.busca.toLowerCase());

    return matchSeverity && matchStatus && matchBusca;
  });

  const handleVerDetalhes = async (erro) => {
    // Carregar análise salva se existir
    let analiseIA = null;
    try {
      const extra = erro.extra ? JSON.parse(erro.extra) : {};
      analiseIA = extra.ai_analysis || null;
    } catch (e) {
      console.warn('Erro ao parsear extra:', e);
    }
    
    setErroSelecionado({ ...erro, analise_ia: analiseIA });
    setModalDetalhes(true);
  };

  const handleMarcarStatus = async (erro, novoStatus) => {
    try {
      await base44.entities.ErrorLog.update(erro.id, {
        status: novoStatus
      });

      toast({
        title: 'Status atualizado',
        description: `Erro marcado como ${novoStatus}`
      });

      await carregarErros();
      setModalDetalhes(false);
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeletar = async (erro) => {
    if (!confirm('Tem certeza que deseja deletar este erro?')) return;

    try {
      await base44.entities.ErrorLog.delete(erro.id);

      toast({
        title: 'Erro deletado',
        description: 'O registro foi removido'
      });

      await carregarErros();
      setModalDetalhes(false);
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro ao deletar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleAbrirChat = (erro) => {
    setErroSelecionado(erro);
    setConversaChat([]);
    setMensagemChat('');
    setModalChat(true);
  };

  const handleAnalisarComIA = async (erro) => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('analyzeErrorWithAI', {
        errorId: erro.id
      });
      
      if (response.data?.success) {
        toast({
          title: '✅ Análise Completa',
          description: 'Análise técnica gerada com sucesso'
        });
        
        // Atualizar erro selecionado com análise
        setErroSelecionado({
          ...erro,
          analise_ia: response.data.analysis
        });
        setModalDetalhes(true);
        await carregarErros();
      }
    } catch (error) {
      console.error('Erro ao analisar:', error);
      toast({
        title: 'Erro na análise',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelegarAgente = async (erro) => {
    setDelegandoAgente(true);
    try {
      // 1. Criar tarefa para o agente
      const taskResponse = await base44.entities.CodeFixTask.create({
        error_log_id: erro.id,
        titulo: `[DELEGADO] Resolver: ${erro.message?.slice(0, 80)}`,
        descricao: `
**Erro delegado para resolução automática**

📍 Arquivo: ${erro.file || 'Desconhecido'}
📍 Linha: ${erro.line || 'N/A'}
📍 Componente: ${erro.component || erro.source || 'Desconhecido'}

❌ **Mensagem:**
${erro.message}

📚 **Stack Trace:**
${erro.stack?.slice(0, 1000) || 'Não disponível'}

🎯 **Instruções:**
Analisar este erro e propor solução. Se possível resolver automaticamente, aplicar correção.
        `.trim(),
        status: 'pendente',
        prioridade: erro.severity === 'critical' ? 'urgente' : 'alta',
        tipo: 'correcao',
        arquivo_alvo: erro.file || '',
        delegado_agente: true,
        criado_por: 'Usuário (delegação manual)'
      });

      // 2. Registrar ação do agente
      await base44.entities.AcaoAgente.create({
        tipo_acao: 'tarefa_delegada',
        status: 'em_andamento',
        prioridade: erro.severity === 'critical' ? 'critica' : 'alta',
        erro_relacionado_id: erro.id,
        descricao: `Tarefa delegada pelo usuário para resolução: ${erro.message?.slice(0, 100)}`,
        resultado: JSON.stringify({
          task_id: taskResponse.id,
          error_id: erro.id,
          delegated_at: new Date().toISOString()
        }),
        contexto: {
          source: 'manual_delegation',
          error_severity: erro.severity
        },
        iniciado_por: 'usuario',
        data_conclusao: null
      });

      // 3. Atualizar status do erro
      await base44.entities.ErrorLog.update(erro.id, {
        status: 'em_analise'
      });

      // 4. Invocar análise automática
      try {
        await base44.functions.invoke('analyzeErrorWithAI', {
          errorId: erro.id
        });
      } catch (e) {
        console.warn('Análise automática não completou:', e);
      }

      toast({
        title: '🤖 Delegado ao Agente',
        description: 'Tarefa criada e agente notificado para resolver'
      });

      await carregarErros();
      setModalDetalhes(false);

    } catch (error) {
      console.error('Erro ao delegar:', error);
      toast({
        title: 'Erro ao delegar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setDelegandoAgente(false);
    }
  };

  const podeAgenteResolver = (erro) => {
    // Verificar se o agente pode resolver baseado na análise
    try {
      const extra = erro.extra ? JSON.parse(erro.extra) : {};
      const analise = extra.ai_analysis;
      
      if (analise?.confianca >= 0.7) {
        return { pode: true, confianca: analise.confianca, motivo: 'Alta confiança na solução' };
      } else if (analise?.confianca >= 0.5) {
        return { pode: true, confianca: analise.confianca, motivo: 'Confiança moderada - pode precisar revisão' };
      } else if (analise?.confianca) {
        return { pode: false, confianca: analise.confianca, motivo: 'Confiança baixa - requer intervenção manual' };
      }
    } catch (e) {
      // Sem análise ainda
    }
    
    // Heurísticas baseadas no tipo de erro
    const msg = erro.message?.toLowerCase() || '';
    
    if (msg.includes('cannot read') || msg.includes('undefined')) {
      return { pode: true, confianca: 0.75, motivo: 'Erro comum de referência nula - geralmente resolúvel' };
    }
    if (msg.includes('is not a function')) {
      return { pode: true, confianca: 0.7, motivo: 'Erro de tipo - geralmente resolúvel' };
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return { pode: false, confianca: 0.3, motivo: 'Erro de rede - requer verificação de infraestrutura' };
    }
    if (msg.includes('syntax') || msg.includes('unexpected token')) {
      return { pode: true, confianca: 0.8, motivo: 'Erro de sintaxe - alta chance de correção automática' };
    }
    
    return { pode: true, confianca: 0.6, motivo: 'Análise necessária para determinar' };
  };

  const handleEnviarMensagem = async () => {
    if (!mensagemChat.trim()) return;

    const mensagemUsuario = {
      role: 'user',
      content: mensagemChat,
      timestamp: new Date().toISOString()
    };

    setConversaChat((prev) => [...prev, mensagemUsuario]);
    setMensagemChat('');
    setLoadingChat(true);

    try {
      const prompt = `Você é o CodeFixer AI, um agente especializado em análise e correção de erros.

ERRO A SER ANALISADO:
ID: ${erroSelecionado.id}
Mensagem: ${erroSelecionado.message}
Arquivo: ${erroSelecionado.file}:${erroSelecionado.line}
Severidade: ${erroSelecionado.severity}
Stack: ${erroSelecionado.stack || 'Não disponível'}

PERGUNTA DO USUÁRIO:
${mensagemUsuario.content}

Por favor, forneça uma análise técnica detalhada e sugestões de correção.`;

      const resposta = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const mensagemBot = {
        role: 'assistant',
        content: resposta,
        timestamp: new Date().toISOString()
      };

      setConversaChat((prev) => [...prev, mensagemBot]);

    } catch (error) {
      console.error('Erro no chat:', error);
      toast({
        title: 'Erro no chat',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoadingChat(false);
    }
  };

  const gerarRelatorioCompleto = (erro) => {
    let analiseTexto = '';
    try {
      const extra = erro.extra ? JSON.parse(erro.extra) : {};
      if (extra.ai_analysis) {
        analiseTexto = `
──────────────────────────────────────────────────────────────────────
🤖 ANÁLISE DO AGENTE
──────────────────────────────────────────────────────────────────────

Causa Raiz: ${extra.ai_analysis.causa_raiz || extra.ai_analysis.root_cause || 'N/A'}

Solução Sugerida:
${extra.ai_analysis.solucao || extra.ai_analysis.suggested_fix?.description || 'N/A'}

Confiança: ${Math.round((extra.ai_analysis.confianca || extra.ai_analysis.confidence || 0) * 100)}%

Impacto: ${extra.ai_analysis.impacto || extra.ai_analysis.impact_assessment?.severity || 'N/A'}

Prevenção:
${extra.ai_analysis.prevencao || extra.ai_analysis.prevention_strategy || 'N/A'}
`;
      }
    } catch (e) {}

    return `══════════════════════════════════════════════════════════════════════
🔴 RELATÓRIO TÉCNICO COMPLETO DE ERRO
══════════════════════════════════════════════════════════════════════

📋 INFORMAÇÕES BÁSICAS
──────────────────────────────────────────────────────────────────────

ID: ${erro.id}
Mensagem: ${erro.message}
Severidade: ${erro.severity?.toUpperCase()}
Status: ${erro.status}
Primeira ocorrência: ${new Date(erro.created_date).toLocaleString('pt-BR')}
Última ocorrência: ${new Date(erro.last_seen || erro.created_date).toLocaleString('pt-BR')}

──────────────────────────────────────────────────────────────────────
📍 LOCALIZAÇÃO
──────────────────────────────────────────────────────────────────────

Arquivo: ${erro.file || 'Não especificado'}
Linha: ${erro.line || 'Não especificada'}
Coluna: ${erro.column || 'Não especificada'}
URL: ${erro.url || 'Não especificada'}
Componente: ${erro.component || erro.source || 'Não especificado'}
User Agent: ${erro.user_agent || 'Não disponível'}

──────────────────────────────────────────────────────────────────────
📚 STACK TRACE
──────────────────────────────────────────────────────────────────────

${erro.stack || 'Stack trace não disponível'}
${analiseTexto}
──────────────────────────────────────────────────────────────────────
🎯 PROMPT PARA CORREÇÃO COM IA
──────────────────────────────────────────────────────────────────────

Você é um especialista em debugging. Analise e corrija este erro:

**CONTEXTO DO SISTEMA:**
- Plataforma: React + Base44 + Shadcn/UI
- Tipo: Sistema ERP

**ERRO:**
${erro.message}

**ARQUIVO:** ${erro.file || 'Não especificado'}
**LINHA:** ${erro.line || 'N/A'}

**STACK:**
${erro.stack ? erro.stack.split('\n').slice(0, 10).join('\n') : 'Não disponível'}

Forneça:
1. Causa Raiz
2. Código corrigido (antes/depois)
3. Como prevenir

══════════════════════════════════════════════════════════════════════
Relatório gerado em: ${new Date().toLocaleString('pt-BR')}
══════════════════════════════════════════════════════════════════════`;
  };

  const copiarRelatorioCompleto = (erro) => {
    const relatorio = gerarRelatorioCompleto(erro);
    navigator.clipboard.writeText(relatorio);
    toast({
      title: '✅ Relatório copiado!',
      description: 'Documento completo copiado para a área de transferência'
    });
  };

  const stats = {
    total: erros.length,
    criticos: erros.filter((e) => e.severity === 'critical').length,
    novos: erros.filter((e) => e.status === 'novo').length,
    resolvidos: erros.filter((e) => e.status === 'resolvido').length
  };

  return (
    <>
      <Toaster />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gerenciar Erros</h1>
            <p className="text-slate-600 mt-1">Sistema de gestão e análise de erros com IA</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={carregarErros} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total</p>
                  <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Críticos</p>
                  <div className="text-2xl font-bold text-red-600">{stats.criticos}</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Novos</p>
                  <div className="text-2xl font-bold text-orange-600">{stats.novos}</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Resolvidos</p>
                  <div className="text-2xl font-bold text-green-600">{stats.resolvidos}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por mensagem ou arquivo..."
                    value={filtros.busca}
                    onChange={(e) => setFiltros((prev) => ({ ...prev, busca: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Severidade</label>
                <Select
                  value={filtros.severity}
                  onValueChange={(value) => setFiltros((prev) => ({ ...prev, severity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
                <Select
                  value={filtros.status}
                  onValueChange={(value) => setFiltros((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                    <SelectItem value="ignorado">Ignorado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Erros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {errosFiltrados.length} erro(s) encontrado(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : errosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhum erro encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Severidade</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Mensagem</th>
                      <th className="px-6 py-4">Local</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {errosFiltrados.map((erro) => {
                      const capacidade = podeAgenteResolver(erro);
                      return (
                        <tr key={erro.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <Badge 
                              variant="outline" 
                              className={
                                erro.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                                erro.severity === 'error' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                erro.severity === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                              }
                            >
                              {erro.severity}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge 
                              variant="outline"
                              className={
                                erro.status === 'novo' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                erro.status === 'em_analise' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                erro.status === 'resolvido' ? 'bg-green-50 text-green-700 border-green-200' :
                                'bg-gray-100 text-gray-600 border-gray-200'
                              }
                            >
                              {erro.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-md truncate font-medium text-slate-900" title={erro.message}>
                              {erro.message}
                            </div>
                            {capacidade.pode && (
                              <div className="flex items-center gap-1 mt-1">
                                <Bot className="h-3 w-3 text-purple-500" />
                                <span className="text-xs text-purple-600">
                                  Agente pode resolver ({Math.round(capacidade.confianca * 100)}%)
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            <div className="max-w-xs truncate" title={`${erro.file}:${erro.line}`}>
                              {erro.file ? `${erro.file}:${erro.line}` : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                            {new Date(erro.last_seen || erro.created_date).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelegarAgente(erro)}
                                className="h-8 w-8 p-0 hover:bg-purple-50 text-purple-600"
                                title="Delegar ao Agente"
                                disabled={delegandoAgente}
                              >
                                <Bot className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAnalisarComIA(erro)}
                                className="h-8 w-8 p-0 hover:bg-blue-50 text-blue-600"
                                title="Analisar com IA"
                                disabled={isLoading}
                              >
                                <Zap className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copiarRelatorioCompleto(erro)}
                                className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-500"
                                title="Copiar relatório"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleVerDetalhes(erro)}
                                className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-700"
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes */}
      {modalDetalhes && erroSelecionado && (
        <Dialog open={modalDetalhes} onOpenChange={setModalDetalhes}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Detalhes do Erro
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="analise" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analise">🤖 Análise IA</TabsTrigger>
                <TabsTrigger value="relatorio">📄 Relatório</TabsTrigger>
                <TabsTrigger value="acoes">⚡ Ações</TabsTrigger>
              </TabsList>

              <TabsContent value="analise" className="mt-6 space-y-4">
                {erroSelecionado.analise_ia ? (
                  <>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Diagnóstico do Agente
                        <Badge className="ml-auto">
                          {Math.round((erroSelecionado.analise_ia.confianca || erroSelecionado.analise_ia.confidence || 0) * 100)}% confiança
                        </Badge>
                      </h4>
                      
                      <div className="space-y-4">
                        <div>
                          <h5 className="font-semibold text-purple-800 mb-1">🔍 Causa Raiz:</h5>
                          <p className="text-slate-700 bg-white p-3 rounded border">
                            {erroSelecionado.analise_ia.causa_raiz || erroSelecionado.analise_ia.root_cause}
                          </p>
                        </div>
                        
                        <div>
                          <h5 className="font-semibold text-purple-800 mb-1">💊 Solução Sugerida:</h5>
                          <div className="bg-white p-3 rounded border text-slate-700">
                            <ReactMarkdown className="prose prose-sm max-w-none">
                              {erroSelecionado.analise_ia.solucao || erroSelecionado.analise_ia.suggested_fix?.description || 'N/A'}
                            </ReactMarkdown>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-semibold text-purple-800 mb-1">🛡️ Prevenção:</h5>
                          <p className="text-slate-700 bg-white p-3 rounded border">
                            {erroSelecionado.analise_ia.prevencao || erroSelecionado.analise_ia.prevention_strategy || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Avaliação de capacidade do agente */}
                    {(() => {
                      const cap = podeAgenteResolver(erroSelecionado);
                      return (
                        <div className={`p-4 rounded-lg border ${cap.pode ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                          <h4 className="font-semibold flex items-center gap-2 mb-2">
                            <Bot className={`h-5 w-5 ${cap.pode ? 'text-green-600' : 'text-yellow-600'}`} />
                            {cap.pode ? 'Agente PODE resolver automaticamente' : 'Requer intervenção manual'}
                          </h4>
                          <p className="text-sm text-slate-600">{cap.motivo}</p>
                          
                          {cap.pode && (
                            <Button 
                              onClick={() => handleDelegarAgente(erroSelecionado)}
                              className="mt-3 bg-purple-600 hover:bg-purple-700"
                              disabled={delegandoAgente}
                            >
                              {delegandoAgente ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-2" />
                              )}
                              Delegar ao Agente
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Zap className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 mb-4">Nenhuma análise disponível ainda</p>
                    <Button onClick={() => handleAnalisarComIA(erroSelecionado)} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Analisar com IA
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="relatorio" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => copiarRelatorioCompleto(erroSelecionado)}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Relatório
                    </Button>
                  </div>
                  
                  <div className="bg-slate-950 text-green-400 p-6 rounded-lg font-mono text-xs overflow-auto max-h-[500px] border border-slate-800 shadow-inner">
                    <pre className="whitespace-pre-wrap">
                      {gerarRelatorioCompleto(erroSelecionado)}
                    </pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="acoes" className="mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-500">ID</label>
                    <p className="font-mono text-sm mt-1 text-slate-900">{erroSelecionado.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Severidade</label>
                    <div className="mt-1">
                      <Badge className={
                        erroSelecionado.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        erroSelecionado.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                        erroSelecionado.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {erroSelecionado.severity}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Status</label>
                    <div className="mt-1">
                      <Badge className={
                        erroSelecionado.status === 'novo' ? 'bg-slate-100 text-slate-800' :
                        erroSelecionado.status === 'em_analise' ? 'bg-blue-100 text-blue-800' :
                        erroSelecionado.status === 'resolvido' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {erroSelecionado.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Última Ocorrência</label>
                    <p className="text-sm mt-1 text-slate-900">
                      {new Date(erroSelecionado.last_seen || erroSelecionado.created_date).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="font-medium mb-4 text-slate-900">Gerenciar</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleDelegarAgente(erroSelecionado)}
                      className="bg-purple-600 hover:bg-purple-700"
                      disabled={delegandoAgente}
                    >
                      {delegandoAgente ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Bot className="h-4 w-4 mr-2" />
                      )}
                      Delegar ao Agente
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleMarcarStatus(erroSelecionado, 'resolvido')}
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marcar Resolvido
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleMarcarStatus(erroSelecionado, 'ignorado')}
                      className="border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Ignorar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeletar(erroSelecionado)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="border-t border-slate-100 pt-4 mt-6">
              <Button 
                variant="outline"
                onClick={() => handleAbrirChat(erroSelecionado)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat com IA
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setModalDetalhes(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Chat */}
      {modalChat && erroSelecionado && (
        <Dialog open={modalChat} onOpenChange={setModalChat}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Chat com CodeFixer AI
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 min-h-[400px] max-h-[500px] border border-slate-200 rounded-lg p-4 bg-slate-50">
              {conversaChat.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p>Faça uma pergunta sobre este erro</p>
                </div>
              ) : (
                conversaChat.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-sm">{msg.content}</p>
                      ) : (
                        <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none">
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))
              )}
              {loadingChat && (
                <div className="flex gap-3">
                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Digite sua pergunta..."
                value={mensagemChat}
                onChange={(e) => setMensagemChat(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEnviarMensagem();
                  }
                }}
                rows={3}
                className="bg-white border-slate-200 text-slate-900 placeholder-slate-400 resize-none"
              />
              <Button
                onClick={handleEnviarMensagem}
                disabled={loadingChat || !mensagemChat.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loadingChat ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}