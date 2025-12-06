import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  FileText,
  Code,
  Bot,
  Eye,
  MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AgentDashboard({ acoes, onViewError, onViewTask }) {
  const [expandedAcao, setExpandedAcao] = useState(null);

  const getStatusColor = (status) => {
    const colors = {
      'em_andamento': 'bg-blue-100 text-blue-800',
      'concluido': 'bg-green-100 text-green-800',
      'falhou': 'bg-red-100 text-red-800',
      'cancelado': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPrioridadeColor = (prioridade) => {
    const colors = {
      'critica': 'bg-red-500 text-white',
      'alta': 'bg-orange-500 text-white',
      'media': 'bg-yellow-500 text-white',
      'baixa': 'bg-green-500 text-white'
    };
    return colors[prioridade] || 'bg-gray-500 text-white';
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      'analise_automatica': Activity,
      'chat_usuario': MessageSquare,
      'correcao_sugerida': Code,
      'relatorio_gerado': FileText,
      'erro_investigado': AlertCircle,
      'tarefa_criada': CheckCircle2,
      'patch_aplicado': Zap
    };
    return icons[tipo] || Activity;
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      'analise_automatica': 'Análise Automática',
      'chat_usuario': 'Chat com Usuário',
      'correcao_sugerida': 'Correção Sugerida',
      'relatorio_gerado': 'Relatório Gerado',
      'erro_investigado': 'Erro Investigado',
      'tarefa_criada': 'Tarefa Criada',
      'patch_aplicado': 'Patch Aplicado'
    };
    return labels[tipo] || tipo;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Estatísticas
  const stats = {
    total: acoes.length,
    concluidas: acoes.filter(a => a.status === 'concluido').length,
    em_andamento: acoes.filter(a => a.status === 'em_andamento').length,
    criticas: acoes.filter(a => a.prioridade === 'critica').length
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Ações</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{stats.concluidas}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-600">{stats.em_andamento}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Críticas</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticas}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Histórico de Ações do Agente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {acoes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma ação registrada ainda</p>
              <p className="text-sm">O agente começará a registrar ações automaticamente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {acoes.map((acao) => {
                const Icon = getTipoIcon(acao.tipo_acao);
                const isExpanded = expandedAcao === acao.id;

                return (
                  <div
                    key={acao.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Icon className="h-5 w-5 text-slate-700" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{getTipoLabel(acao.tipo_acao)}</h4>
                            <Badge className={getStatusColor(acao.status)}>
                              {acao.status}
                            </Badge>
                            <Badge className={getPrioridadeColor(acao.prioridade)}>
                              {acao.prioridade}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{acao.descricao}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>📅 {formatDate(acao.created_date)}</span>
                            {acao.data_conclusao && (
                              <span>✅ Concluído: {formatDate(acao.data_conclusao)}</span>
                            )}
                            {acao.tempo_execucao && (
                              <span>⏱️ {acao.tempo_execucao.toFixed(2)}s</span>
                            )}
                            <span>👤 {acao.iniciado_por === 'sistema' ? '🤖 Sistema' : '👨‍💻 Usuário'}</span>
                          </div>

                          {/* Links para entidades relacionadas */}
                          <div className="flex gap-2 mt-3">
                            {acao.erro_relacionado_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onViewError && onViewError(acao.erro_relacionado_id)}
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Ver Erro
                              </Button>
                            )}
                            {acao.tarefa_relacionada_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onViewTask && onViewTask(acao.tarefa_relacionada_id)}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Ver Tarefa
                              </Button>
                            )}
                          </div>

                          {/* Resultado expandível */}
                          {acao.resultado && (
                            <div className="mt-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedAcao(isExpanded ? null : acao.id)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                {isExpanded ? 'Ocultar' : 'Ver'} Resultado
                              </Button>
                              {isExpanded && (
                                <div className="mt-2 p-3 bg-slate-50 rounded-lg border">
                                  <ReactMarkdown className="prose prose-sm max-w-none">
                                    {acao.resultado}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}