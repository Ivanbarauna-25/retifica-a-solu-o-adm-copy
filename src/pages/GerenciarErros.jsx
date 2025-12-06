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
  Search,
  Eye,
  Trash2,
  MessageSquare,
  Copy,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
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
    setErroSelecionado(erro);
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

──────────────────────────────────────────────────────────────────────
🎯 PROMPT PARA CORREÇÃO COM IA
──────────────────────────────────────────────────────────────────────

Você é um especialista em debugging e análise de código. Analise o seguinte erro:

**CONTEXTO DO SISTEMA:**
- Plataforma: React + Base44 + Shadcn/UI
- Tipo: Sistema ERP para gestão de oficina mecânica

**ERRO DETECTADO:**
${erro.message}

**LOCALIZAÇÃO:**
Arquivo: ${erro.file || 'Não especificado'}
Linha: ${erro.line || 'Não especificada'}

**STACK TRACE:**
${erro.stack ? erro.stack.split('\n').slice(0, 10).join('\n') : 'Não disponível'}

**SOLICITAÇÃO:**

Por favor, forneça uma análise técnica completa contendo:

1. **Causa Raiz**: Identifique a causa fundamental do erro
2. **Impacto**: Avalie a gravidade e o impacto no sistema
3. **Solução Detalhada**: Forneça instruções passo a passo para correção
4. **Código de Exemplo**: Mostre o código corrigido (antes e depois)
5. **Prevenção**: Como evitar erros similares no futuro
6. **Testes**: Sugestões de testes para validar a correção

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

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-900/50 text-red-300 border-red-700',
      error: 'bg-orange-900/50 text-orange-300 border-orange-700',
      warning: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
      info: 'bg-blue-900/50 text-blue-300 border-blue-700'
    };
    return colors[severity] || 'bg-slate-700 text-slate-300 border-slate-600';
  };

  const getStatusColor = (status) => {
    const colors = {
      novo: 'bg-slate-700 text-slate-300 border-slate-600',
      em_analise: 'bg-blue-900/50 text-blue-300 border-blue-700',
      resolvido: 'bg-green-900/50 text-green-300 border-green-700',
      ignorado: 'bg-slate-700 text-slate-400 border-slate-600'
    };
    return colors[status] || 'bg-slate-700 text-slate-300 border-slate-600';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: <AlertTriangle className="h-4 w-4 text-red-400" />,
      error: <AlertTriangle className="h-4 w-4 text-orange-400" />,
      warning: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
      info: <AlertTriangle className="h-4 w-4 text-blue-400" />
    };
    return icons[severity] || <AlertTriangle className="h-4 w-4 text-slate-400" />;
  };

  const stats = {
  total: erros.length,
  criticos: erros.filter((e) => e.severity === 'critical').length,
  novos: erros.filter((e) => e.status === 'novo').length,
  resolvidos: erros.filter((e) => e.status === 'resolvido').length
  };

  return (
  <>
  <div className="min-h-screen bg-slate-50">
  <div className="bg-slate-800 text-white px-6 py-8 mb-6 shadow-xl">
  <div className="max-w-[1800px] mx-auto">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="bg-slate-700 p-3 rounded-lg">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-1">Gerenciar Erros</h1>
          <p className="text-slate-300">Sistema de gestão e análise de erros</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={carregarErros}
          variant="outline"
          className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>
    </div>
  </div>
  </div>

  <div className="max-w-[1800px] mx-auto px-6">
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card className="border-l-4 border-l-slate-600 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Total</p>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </div>
          <div className="p-2 bg-slate-100 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-slate-600" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="border-l-4 border-l-red-500 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Críticos</p>
            <div className="text-2xl font-bold text-red-600">{stats.criticos}</div>
          </div>
          <div className="p-2 bg-red-50 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="border-l-4 border-l-orange-500 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Novos</p>
            <div className="text-2xl font-bold text-orange-600">{stats.novos}</div>
          </div>
          <div className="p-2 bg-orange-50 rounded-lg">
            <Clock className="h-6 w-6 text-orange-500" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="border-l-4 border-l-green-500 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Resolvidos</p>
            <div className="text-2xl font-bold text-green-600">{stats.resolvidos}</div>
          </div>
          <div className="p-2 bg-green-50 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <Card className="mb-6 border-0 shadow-sm">
    <CardContent className="pt-6">
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

  <Card className="bg-white border-0 shadow-sm">
    <CardHeader className="border-b border-slate-100 pb-4">
      <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-red-500"></div>
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
              {errosFiltrados.map((erro) => (
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
                    <div className="flex items-center justify-end gap-2">
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
                        onClick={() => handleAbrirChat(erro)}
                        className="h-8 w-8 p-0 hover:bg-blue-50 text-blue-600"
                        title="Chat IA"
                      >
                        <MessageSquare className="h-4 w-4" />
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
  </div>
  </div>

      {/* Modal de Detalhes */}
      {modalDetalhes && erroSelecionado && (
        <Dialog open={modalDetalhes} onOpenChange={setModalDetalhes}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader className="border-b border-slate-200 pb-4">
              <DialogTitle className="flex items-center gap-2 text-lg text-slate-800">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Detalhes do Erro
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="relatorio" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="relatorio">Relatório Completo</TabsTrigger>
                <TabsTrigger value="acoes">Ações</TabsTrigger>
              </TabsList>

              <TabsContent value="relatorio" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      onClick={() => copiarRelatorioCompleto(erroSelecionado)}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Relatório
                    </Button>
                  </div>
                  <div className="bg-slate-950 text-green-400 p-6 rounded-lg font-mono text-xs overflow-auto max-h-[600px] border border-slate-800 shadow-inner">
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
                  <h4 className="font-medium mb-4 text-slate-900">Gerenciar Status</h4>
                  <div className="flex gap-3">
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
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-white">
            <DialogHeader className="border-b border-slate-200 pb-4">
              <DialogTitle className="flex items-center gap-2 text-lg text-slate-800">
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