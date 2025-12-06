
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Bot, 
  User as UserIcon,
  Sparkles,
  CheckCircle2,
  Copy
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateErrorPrompt } from './ErrorPromptGenerator';

export default function AgentChat({ selectedError = null }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPromptSuggestions, setShowPromptSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const { toast } = useToast();

  // Auto-scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar conversas existentes
  useEffect(() => {
    loadConversations();
  }, []);

  const promptSuggestions = [
    {
      icon: '🔍',
      title: 'Analisar Erros Críticos',
      prompt: 'Analise todos os erros críticos do sistema e forneça um plano de ação priorizado para corrigi-los.'
    },
    {
      icon: '📊',
      title: 'Relatório de Saúde',
      prompt: 'Gere um relatório de saúde do sistema com métricas atuais e recomendações de melhoria.'
    },
    {
      icon: '🔧',
      title: 'Sugerir Correções',
      prompt: 'Revise os erros mais frequentes e sugira correções automáticas com patches de código.'
    },
    {
      icon: '📈',
      title: 'Análise de Tendências',
      prompt: 'Analise as tendências de erros da última semana e identifique padrões emergentes.'
    }
  ];

  const handleCopyPrompt = async (prompt) => {
    await navigator.clipboard.writeText(prompt);
    toast({
      title: '📋 Prompt Copiado!',
      description: 'Cole no chat ou em outra IA para análise'
    });
  };

  const handleUseSuggestion = (prompt) => {
    setInputMessage(prompt);
    setShowPromptSuggestions(false);
  };

  // Se um erro foi selecionado, criar mensagem automática
  useEffect(() => {
    if (selectedError && currentConversation) {
      const autoMessage = generateErrorPrompt(selectedError, {
        includeStackTrace: true,
        includeSolution: true,
        customInstructions: 'Analise este erro e forneça uma solução compatível com nosso stack (React + Base44 + Shadcn/ui)'
      });

      setInputMessage(autoMessage);
      setShowPromptSuggestions(false);
    }
  }, [selectedError, currentConversation]);

  const loadConversations = async () => {
    try {
      const convs = await base44.agents.listConversations({
        agent_name: 'code_fixer'
      });
      setConversations(convs || []);
      
      // Se já existe uma conversa, carregar a mais recente
      if (convs && convs.length > 0) {
        loadConversation(convs[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      setIsLoading(true);
      const conversation = await base44.agents.getConversation(conversationId);
      setCurrentConversation(conversation);
      setMessages(conversation.messages || []);
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
      toast({
        title: 'Erro ao carregar conversa',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async () => {
    try {
      setIsLoading(true);
      const conversation = await base44.agents.createConversation({
        agent_name: 'code_fixer',
        metadata: {
          name: `Análise de Erros - ${new Date().toLocaleString('pt-BR')}`,
          description: 'Conversa sobre análise e correção de erros'
        }
      });
      
      setCurrentConversation(conversation);
      setMessages([]);
      setConversations([conversation, ...conversations]);
      setShowPromptSuggestions(true); // Show suggestions for new conversation
      
      toast({
        title: 'Nova conversa criada!',
        description: 'Você pode começar a fazer perguntas ao agente.'
      });
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      toast({
        title: 'Erro ao criar conversa',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;
    
    if (!currentConversation) {
      await createNewConversation();
      return;
    }

    setIsSending(true);
    const messageToSend = inputMessage;
    setInputMessage('');

    try {
      // Adicionar mensagem do usuário imediatamente na UI
      const userMessage = {
        role: 'user',
        content: messageToSend,
        created_date: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      // Enviar mensagem e aguardar resposta do agente
      await base44.agents.addMessage(currentConversation, {
        role: 'user',
        content: messageToSend
      });

      // A resposta será atualizada via subscription (se implementado)
      // Por enquanto, recarregar a conversa
      await loadConversation(currentConversation.id);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageIcon = (role) => {
    return role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />;
  };

  const getMessageColor = (role) => {
    return role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500';
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Chat com CodeFixer AI
          </CardTitle>
          <div className="flex gap-2">
            {conversations.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="w-3 h-3" />
                {conversations.length} conversa(s)
              </Badge>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={createNewConversation}
              disabled={isLoading}
            >
              Nova Conversa
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Área de Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bot className="w-16 h-16 text-purple-300 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Comece uma conversa com o CodeFixer</h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Peça análises detalhadas de erros, sugestões de correção, relatórios cirúrgicos e muito mais!
              </p>
              
              {showPromptSuggestions && (
                <div className="w-full max-w-2xl space-y-3">
                  <h4 className="text-sm font-semibold text-purple-600 mb-3">💡 Sugestões de Prompts</h4>
                  {promptSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-white p-4 rounded-lg border hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <span className="text-2xl">{suggestion.icon}</span>
                      <div className="flex-1 text-left">
                        <h5 className="font-semibold text-sm group-hover:text-purple-600">{suggestion.title}</h5>
                        <p className="text-xs text-gray-600">{suggestion.prompt.slice(0, 80)}...</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleCopyPrompt(suggestion.prompt); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copiar prompt"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => { e.stopPropagation(); handleUseSuggestion(suggestion.prompt); }}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Usar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role !== 'user' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getMessageColor(message.role)} text-white flex-shrink-0`}>
                    {getMessageIcon(message.role)}
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg p-3 relative group`}>
                  {message.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <ReactMarkdown 
                      className="text-sm prose prose-sm max-w-none"
                      components={{
                        code: ({ inline, className, children, ...props }) => {
                          return !inline ? (
                            <pre className="bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto my-2">
                              <code {...props}>{children}</code>
                            </pre>
                          ) : (
                            <code className="bg-gray-200 px-1 py-0.5 rounded text-xs" {...props}>
                              {children}
                            </code>
                          );
                        },
                        p: ({ children }) => <p className="mb-2">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                  
                  {/* Botão de copiar no hover */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                      toast({ title: '✅ Copiado!' });
                    }}
                    className="absolute top-2 right-2 p-1 bg-white rounded shadow opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Copiar mensagem"
                  >
                    <Copy className="w-3 h-3 text-gray-600" />
                  </button>
                  
                  {message.tool_calls && message.tool_calls.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.tool_calls.map((tool, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{tool.name.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getMessageColor(message.role)} text-white flex-shrink-0`}>
                    {getMessageIcon(message.role)}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Área de Input */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex gap-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={currentConversation ? "Digite sua mensagem... (Enter = enviar, Shift+Enter = linha)" : "Clique em 'Nova Conversa' para começar"}
              className="resize-none"
              rows={3}
              disabled={!currentConversation || isSending}
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || !currentConversation || isSending}
                className="px-4"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
              {inputMessage && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyPrompt(inputMessage)}
                  disabled={!inputMessage.trim()}
                  title="Copiar mensagem"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
