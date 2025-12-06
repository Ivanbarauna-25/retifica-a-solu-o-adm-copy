
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatCurrency } from '@/components/formatters';
import {
  Eye,
  Calendar,
  TrendingUp,
  Briefcase,
  Building2,
  UserX,
  CheckCircle2,
  XCircle,
  Send,
  ArrowRightCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function GestaoRHPage() {
  const [ferias, setFerias] = useState([]);
  const [salarios, setSalarios] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [desligamentos, setDesligamentos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargosList, setCargosList] = useState([]);
  const [departamentosList, setDepartamentosList] = useState([]);
  const [users, setUsers] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Estado para o modal de visualização detalhada
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    tipo: null,
    item: null
  });

  // Estados para as ações (aprovar, reprovar, responder, encaminhar)
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    action: null, // 'aprovar', 'reprovar', 'responder', 'encaminhar'
    texto: '',
    encaminharPara: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [
        feriasData,
        salariosData,
        cargosData,
        deptosData,
        desligData,
        funcsData,
        cargosListData,
        deptosListData,
        usersData,
        comentariosData
      ] = await Promise.all([
        base44.entities.FuncionarioFerias.list('-created_date'),
        base44.entities.FuncionarioSalarioHistorico.list('-created_date'),
        base44.entities.FuncionarioCargoHistorico.list('-created_date'),
        base44.entities.FuncionarioDepartamentoHistorico.list('-created_date'),
        base44.entities.FuncionarioDesligamento.list('-created_date'),
        base44.entities.Funcionario.list(),
        base44.entities.Cargo.list(),
        base44.entities.Departamento.list(),
        base44.entities.User.list(),
        base44.entities.SolicitacaoComentario.list('-created_date')
      ]);

      setFerias(feriasData || []);
      setSalarios(salariosData || []);
      setCargos(cargosData || []);
      setDepartamentos(deptosData || []);
      setDesligamentos(desligData || []);
      setFuncionarios(funcsData || []);
      setCargosList(cargosListData || []);
      setDepartamentosList(deptosListData || []);
      setUsers(usersData || []);
      setComentarios(comentariosData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getFuncionarioNome = (id) => {
    // Validar se ID é válido antes de buscar
    if (!id || id === 'unassigned' || id === 'todos' || id === 'all' || id === 'null' || id === 'undefined') {
      return 'Não atribuído';
    }
    const func = funcionarios.find(f => f.id === id);
    return func?.nome || 'Não encontrado';
  };

  const getFuncionario = (id) => {
    // Validar se ID é válido antes de buscar
    if (!id || id === 'unassigned' || id === 'todos' || id === 'all' || id === 'null' || id === 'undefined') {
      return null;
    }
    return funcionarios.find(f => f.id === id);
  };

  const getCargoNome = (id) => {
    // Validar se ID é válido antes de buscar
    if (!id || id === 'unassigned' || id === 'todos' || id === 'all' || id === 'null' || id === 'undefined') {
      return '-';
    }
    const cargo = cargosList.find(c => c.id === id);
    return cargo?.nome || '-';
  };

  const getDepartamentoNome = (id) => {
    // Validar se ID é válido antes de buscar
    if (!id || id === 'unassigned' || id === 'todos' || id === 'all' || id === 'null' || id === 'undefined') {
      return '-';
    }
    const dept = departamentosList.find(d => d.id === id);
    return dept?.nome || '-';
  };

  const getUserEmail = (id) => {
    // Validar se ID é válido antes de buscar
    if (!id || id === 'unassigned' || id === 'todos' || id === 'all' || id === 'null' || id === 'undefined') {
      return 'Sistema';
    }
    const user = users.find(u => u.id === id);
    return user?.email || 'Sistema';
  };

  const statusColors = {
    programado: 'bg-blue-100 text-blue-800',
    aprovado: 'bg-green-100 text-green-800',
    gozando: 'bg-yellow-100 text-yellow-800',
    concluido: 'bg-gray-100 text-gray-800',
    cancelado: 'bg-red-100 text-red-800',
    solicitado: 'bg-orange-100 text-orange-800',
    reprovado: 'bg-red-100 text-red-800',
    aguardando_aprovacao: 'bg-yellow-100 text-yellow-800'
  };

  const statusLabels = {
    programado: 'Programado',
    aprovado: 'Aprovado',
    gozando: 'Em Andamento',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    solicitado: 'Aguardando Aprovação',
    reprovado: 'Reprovado',
    aguardando_aprovacao: 'Aguardando Aprovação'
  };

  // Buscar comentários de uma solicitação específica
  const getComentarios = (tipo, solicitacaoId) => {
    return comentarios.filter(c => c.solicitacao_tipo === tipo && c.solicitacao_id === solicitacaoId);
  };

  // Abrir modal de visualização detalhada
  const openDetailModal = (tipo, item) => {
    setDetailModal({ isOpen: true, tipo, item });
  };

  // Abrir modal de ação (aprovar, reprovar, etc.)
  const openActionModal = (action) => {
    setActionModal({ isOpen: true, action, texto: '', encaminharPara: '' });
  };

  // Executar ação (aprovar, reprovar, responder, encaminhar)
  const executeAction = async () => {
    const { action, texto, encaminharPara } = actionModal;
    const { tipo, item } = detailModal;

    try {
      const user = await base44.auth.me();

      // Verificar permissões para aprovação/reprovação
      const podeAprovar = user.role === 'admin' ||
                         user.funcao?.toLowerCase().includes('rh') ||
                         user.funcao?.toLowerCase().includes('gerente') ||
                         user.funcao?.toLowerCase().includes('diretor') ||
                         user.id === item.aprovador_id; // É o aprovador designado

      if ((action === 'aprovar' || action === 'reprovar') && !podeAprovar) {
        toast({
          title: 'Permissão negada',
          description: 'Você não tem permissão para aprovar/reprovar esta solicitação',
          variant: 'destructive'
        });
        return;
      }

      if (action === 'aprovar' || action === 'reprovar') {
        const isAprovacao = action === 'aprovar';

        let updateData = {
          status: isAprovacao ? 'aprovado' : 'reprovado',
          aprovador_id: user.id,
          data_aprovacao: new Date().toISOString()
        };

        if (!isAprovacao && texto) {
          updateData.motivo_reprovacao = texto;
        }

        if (isAprovacao && texto) {
          updateData.observacoes_aprovacao = texto;
        }

        // Atualizar o registro específico
        switch (tipo) {
          case 'ferias':
            await base44.entities.FuncionarioFerias.update(item.id, updateData);
            if (isAprovacao) {
              await base44.entities.Funcionario.update(item.funcionario_id, {
                status: 'ferias',
                data_ferias_inicio: item.inicio,
                data_ferias_fim: item.fim
              });
            }
            break;
          case 'salario':
            await base44.entities.FuncionarioSalarioHistorico.update(item.id, updateData);
            if (isAprovacao) {
              await base44.entities.Funcionario.update(item.funcionario_id, {
                salario: item.salario_novo
              });
            }
            break;
          case 'cargo':
            await base44.entities.FuncionarioCargoHistorico.update(item.id, updateData);
            if (isAprovacao) {
              await base44.entities.Funcionario.update(item.funcionario_id, {
                cargo_id: item.cargo_novo_id
              });
            }
            break;
          case 'departamento':
            await base44.entities.FuncionarioDepartamentoHistorico.update(item.id, updateData);
            if (isAprovacao) {
              await base44.entities.Funcionario.update(item.funcionario_id, {
                departamento_id: item.departamento_novo_id
              });
            }
            break;
          case 'desligamento':
            await base44.entities.FuncionarioDesligamento.update(item.id, updateData);
            if (isAprovacao) {
              await base44.entities.Funcionario.update(item.funcionario_id, {
                status: 'demitido',
                data_demissao: item.data_desligamento,
                motivo_demissao: item.motivo
              });
            }
            break;
        }

        // Registrar comentário da aprovação/reprovação
        await base44.entities.SolicitacaoComentario.create({
          solicitacao_tipo: tipo,
          solicitacao_id: item.id,
          autor_id: user.id,
          autor_nome: user.full_name || user.email,
          comentario: texto || (isAprovacao ? 'Solicitação aprovada.' : 'Solicitação reprovada.'),
          tipo_comentario: isAprovacao ? 'aprovacao' : 'reprovacao'
        });

        // Enviar email para o solicitante
        try {
          const solicitante = users.find(u => u.id === item.solicitante_id);
          if (solicitante) {
            const funcionario = getFuncionario(item.funcionario_id);
            await base44.integrations.Core.SendEmail({
              to: solicitante.email,
              subject: `Solicitação de RH ${isAprovacao ? 'Aprovada' : 'Reprovada'} - ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} para ${funcionario?.nome}`,
              body: `
                <h2>Sua solicitação de RH foi ${isAprovacao ? 'Aprovada' : 'Reprovada'}!</h2>
                <p>Prezado(a) ${solicitante.full_name || solicitante.email},</p>
                <p>Sua solicitação de <strong>${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</strong> para o funcionário <strong>${funcionario?.nome}</strong> foi <strong>${isAprovacao ? 'APROVADA' : 'REPROVADA'}</strong>.</p>
                <p><strong>${isAprovacao ? 'Aprovado' : 'Reprovado'} por:</strong> ${user.full_name || user.email}</p>
                ${texto ? `<p><strong>${isAprovacao ? 'Observações' : 'Motivo'}:</strong> ${texto}</p>` : ''}
                <p>Para mais detalhes, acesse o sistema.</p>
                <br>
                <p>Atenciosamente,</p>
                <p>Equipe de RH</p>
              `
            });
          }
        } catch (emailError) {
          console.error('Erro ao enviar email de aprovação/reprovação:', emailError);
          toast({
            title: 'Aviso',
            description: 'Erro ao enviar e-mail de notificação.',
            variant: 'warning'
          });
        }

        toast({
          title: isAprovacao ? 'Solicitação aprovada' : 'Solicitação reprovada',
          description: `A solicitação foi ${isAprovacao ? 'aprovada' : 'reprovada'} com sucesso.`
        });

        setActionModal({ isOpen: false, action: null, texto: '', encaminharPara: '' });
        setDetailModal({ isOpen: false, tipo: null, item: null });
        fetchData();

      } else if (action === 'responder') {
        if (!texto.trim()) {
          toast({
            title: 'Erro',
            description: 'Digite uma resposta',
            variant: 'destructive'
          });
          return;
        }

        // Registrar comentário/resposta
        await base44.entities.SolicitacaoComentario.create({
          solicitacao_tipo: tipo,
          solicitacao_id: item.id,
          autor_id: user.id,
          autor_nome: user.full_name || user.email,
          comentario: texto,
          tipo_comentario: 'resposta'
        });

        // Enviar email para o solicitante
        try {
          const solicitante = users.find(u => u.id === item.solicitante_id);
          if (solicitante) {
            const funcionario = getFuncionario(item.funcionario_id);
            await base44.integrations.Core.SendEmail({
              to: solicitante.email,
              subject: `Resposta à sua Solicitação de RH - ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} para ${funcionario?.nome}`,
              body: `
                <h2>Resposta à sua Solicitação de RH</h2>
                <p>Prezado(a) ${solicitante.full_name || solicitante.email},</p>
                <p>Recebemos uma resposta sobre sua solicitação de <strong>${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</strong> para o funcionário <strong>${funcionario?.nome}</strong>:</p>
                <p><strong>De:</strong> ${user.full_name || user.email}</p>
                <p><strong>Mensagem:</strong></p>
                <blockquote style="border-left: 2px solid #ccc; margin: 0; padding-left: 10px;">
                  <p>${texto}</p>
                </blockquote>
                <p>Para mais detalhes ou para continuar a comunicação, acesse o sistema.</p>
                <br>
                <p>Atenciosamente,</p>
                <p>Equipe de RH</p>
              `
            });
          }
        } catch (emailError) {
          console.error('Erro ao enviar email de resposta:', emailError);
          toast({
            title: 'Aviso',
            description: 'Erro ao enviar e-mail de notificação.',
            variant: 'warning'
          });
        }

        toast({
          title: 'Resposta enviada',
          description: 'Sua resposta foi registrada.'
        });

        setActionModal({ isOpen: false, action: null, texto: '', encaminharPara: '' });
        fetchData();

      } else if (action === 'encaminhar') {
        if (!encaminharPara.trim()) {
          toast({
            title: 'Erro',
            description: 'Selecione um usuário para encaminhar',
            variant: 'destructive'
          });
          return;
        }

        const usuarioDestino = users.find(u => u.email === encaminharPara);
        if (!usuarioDestino) {
          toast({
            title: 'Erro',
            description: 'Usuário não encontrado',
            variant: 'destructive'
          });
          return;
        }

        // Registrar encaminhamento
        await base44.entities.SolicitacaoComentario.create({
          solicitacao_tipo: tipo,
          solicitacao_id: item.id,
          autor_id: user.id,
          autor_nome: user.full_name || user.email,
          comentario: `Solicitação encaminhada para ${usuarioDestino.full_name || usuarioDestino.email}. ${texto || ''}`,
          tipo_comentario: 'encaminhamento'
        });

        // Enviar email para o novo responsável
        try {
          const funcionario = getFuncionario(item.funcionario_id);
          await base44.integrations.Core.SendEmail({
            to: usuarioDestino.email,
            subject: `Solicitação de RH Encaminhada para Você - ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} para ${funcionario?.nome}`,
            body: `
              <h2>Solicitação de RH Encaminhada para Você!</h2>
              <p>Prezado(a) ${usuarioDestino.full_name || usuarioDestino.email},</p>
              <p>O(A) usuário(a) <strong>${user.full_name || user.email}</strong> encaminhou uma solicitação de <strong>${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</strong> para sua análise.</p>
              <p><strong>Funcionário:</strong> ${funcionario?.nome}</p>
              ${texto ? `<p><strong>Observações do encaminhamento:</strong> ${texto}</p>` : ''}
              <p>Por favor, acesse o sistema para revisar e tomar as ações necessárias.</p>
              <br>
              <p>Atenciosamente,</p>
              <p>Equipe de RH</p>
            `
          });
        } catch (emailError) {
          console.error('Erro ao enviar email de encaminhamento:', emailError);
          toast({
            title: 'Aviso',
            description: 'Erro ao enviar e-mail de notificação.',
            variant: 'warning'
          });
        }

        toast({
          title: 'Solicitação encaminhada',
          description: `Encaminhado para ${usuarioDestino.full_name || usuarioDestino.email}`
        });

        setActionModal({ isOpen: false, action: null, texto: '', encaminharPara: '' });
        fetchData();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Componente de visualização detalhada
  const DetailViewer = () => {
    const { tipo, item } = detailModal;
    if (!item) return null;

    const funcionario = getFuncionario(item.funcionario_id);
    const solicitante = getUserEmail(item.solicitante_id);
    const isPendente = ['solicitado', 'programado', 'aguardando_aprovacao'].includes(item.status);
    const comentariosSolicitacao = getComentarios(tipo, item.id);

    return (
      <div className="space-y-6">
        {/* Header com Status */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {tipo === 'ferias' && 'Solicitação de Férias'}
              {tipo === 'salario' && 'Reajuste Salarial'}
              {tipo === 'cargo' && 'Alteração de Cargo'}
              {tipo === 'departamento' && 'Transferência de Departamento'}
              {tipo === 'desligamento' && 'Desligamento de Funcionário'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Protocolo: #{item.id.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <Badge className={statusColors[item.status] || 'bg-gray-100 text-gray-800'}>
            {statusLabels[item.status] || item.status}
          </Badge>
        </div>

        <Separator />

        {/* Informações do Funcionário */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">📋 Funcionário</h4>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Nome:</span>
              <span className="text-sm font-medium">{funcionario?.nome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">CPF:</span>
              <span className="text-sm font-mono">{funcionario?.cpf}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Cargo Atual:</span>
              <span className="text-sm">{getCargoNome(funcionario?.cargo_id)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Departamento:</span>
              <span className="text-sm">{getDepartamentoNome(funcionario?.departamento_id)}</span>
            </div>
          </div>
        </div>

        {/* Detalhes da Solicitação */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">📄 Detalhes da Solicitação</h4>
          <div className="bg-blue-50 rounded-lg p-4 space-y-3">
            {tipo === 'ferias' && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Período:</span>
                  <span className="text-sm font-medium">
                    {formatDate(item.inicio)} até {formatDate(item.fim)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Dias:</span>
                  <span className="text-sm font-medium">{item.dias} dias</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Abono Pecuniário:</span>
                  <span className="text-sm">{item.abono_pecuniario ? 'Sim' : 'Não'}</span>
                </div>
              </>
            )}

            {tipo === 'salario' && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Salário Atual:</span>
                  <span className="text-sm font-medium">{formatCurrency(item.salario_anterior)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Salário Novo:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(item.salario_novo)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Reajuste:</span>
                  <span className="text-sm font-medium text-green-600">
                    {((item.salario_novo - item.salario_anterior) / item.salario_anterior * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Vigência:</span>
                  <span className="text-sm">{formatDate(item.data_vigencia)}</span>
                </div>
              </>
            )}

            {tipo === 'cargo' && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Cargo Atual:</span>
                  <span className="text-sm">{item.cargo_anterior || getCargoNome(item.cargo_anterior_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Cargo Novo:</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {item.cargo_novo || getCargoNome(item.cargo_novo_id)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Vigência:</span>
                  <span className="text-sm">{formatDate(item.data_vigencia)}</span>
                </div>
              </>
            )}

            {tipo === 'departamento' && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Departamento Atual:</span>
                  <span className="text-sm">{item.departamento_anterior || getDepartamentoNome(item.departamento_anterior_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Departamento Novo:</span>
                  <span className="text-sm font-semibold text-purple-600">
                    {item.departamento_novo || getDepartamentoNome(item.departamento_novo_id)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Vigência:</span>
                  <span className="text-sm">{formatDate(item.data_vigencia)}</span>
                </div>
              </>
            )}

            {tipo === 'desligamento' && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Data do Aviso:</span>
                  <span className="text-sm">{formatDate(item.data_aviso)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Data do Desligamento:</span>
                  <span className="text-sm font-medium">{formatDate(item.data_desligamento)}</span>
                </div>
              </>
            )}

            {item.motivo && (
              <div>
                <span className="text-sm text-slate-600 block mb-1">Motivo:</span>
                <p className="text-sm bg-white p-2 rounded">{item.motivo}</p>
              </div>
            )}

            {item.observacoes && (
              <div>
                <span className="text-sm text-slate-600 block mb-1">Observações:</span>
                <p className="text-sm bg-white p-2 rounded">{item.observacoes}</p>
              </div>
            )}
            {item.motivo_reprovacao && (
              <div>
                <span className="text-sm text-slate-600 block mb-1">Motivo da Reprovação:</span>
                <p className="text-sm bg-white p-2 rounded">{item.motivo_reprovacao}</p>
              </div>
            )}
            {item.observacoes_aprovacao && (
              <div>
                <span className="text-sm text-slate-600 block mb-1">Observações da Aprovação:</span>
                <p className="text-sm bg-white p-2 rounded">{item.observacoes_aprovacao}</p>
              </div>
            )}
          </div>
        </div>

        {/* Informações da Solicitação */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">👤 Informações da Solicitação</h4>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Solicitado por:</span>
              <span className="text-sm font-medium">{solicitante}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Data da Solicitação:</span>
              <span className="text-sm">{formatDate(item.created_date)}</span>
            </div>
            {item.aprovador_id && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Aprovado/Reprovado por:</span>
                  <span className="text-sm font-medium">{getUserEmail(item.aprovador_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Data da Decisão:</span>
                  <span className="text-sm">{formatDate(item.data_aprovacao)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Histórico de Comentários */}
        {comentariosSolicitacao.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">💬 Histórico de Comunicação</h4>
            <ScrollArea className="h-[200px] rounded-lg border bg-white p-4">
              <div className="space-y-4">
                {comentariosSolicitacao.map((comentario) => (
                  <div key={comentario.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {comentario.autor_nome?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{comentario.autor_nome}</span>
                        <Badge variant="outline" className="text-xs">
                          {comentario.tipo_comentario === 'aprovacao' ? 'Aprovação' :
                           comentario.tipo_comentario === 'reprovacao' ? 'Reprovação' :
                           comentario.tipo_comentario === 'resposta' ? 'Resposta' :
                           comentario.tipo_comentario === 'encaminhamento' ? 'Encaminhamento' :
                           comentario.tipo_comentario}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatDate(comentario.created_date)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{comentario.comentario}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Ações */}
        {isPendente && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => openActionModal('responder')}
            >
              <Send className="w-4 h-4" />
              Responder
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => openActionModal('encaminhar')}
            >
              <ArrowRightCircle className="w-4 h-4" />
              Encaminhar
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => openActionModal('reprovar')}
            >
              <XCircle className="w-4 h-4" />
              Reprovar
            </Button>
            <Button
              variant="default"
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => openActionModal('aprovar')}
            >
              <CheckCircle2 className="w-4 h-4" />
              Aprovar
            </Button>
          </div>
        )}
      </div>
    );
  };

  const feriasPendentes = useMemo(() =>
    ferias.filter(f => f.status === 'programado' || f.status === 'solicitado'),
    [ferias]
  );

  const salariosPendentes = useMemo(() =>
    salarios.filter(s => s.status === 'solicitado'),
    [salarios]
  );

  const cargosPendentes = useMemo(() =>
    cargos.filter(c => c.status === 'solicitado'),
    [cargos]
  );

  const departamentosPendentes = useMemo(() =>
    departamentos.filter(d => d.status === 'solicitado'),
    [departamentos]
  );

  const desligamentosPendentes = useMemo(() =>
    desligamentos.filter(d => d.status === 'aguardando_aprovacao'),
    [desligamentos]
  );

  // Calcula todas as solicitações para as métricas rápidas
  const totalSolicitacoes = useMemo(() => {
    return {
      pendentes: feriasPendentes.length + salariosPendentes.length +
                 cargosPendentes.length + departamentosPendentes.length +
                 desligamentosPendentes.length,
      aprovadas: ferias.filter(f => f.status === 'aprovado').length +
                 salarios.filter(s => s.status === 'aprovado').length +
                 cargos.filter(c => c.status === 'aprovado').length +
                 departamentos.filter(d => d.status === 'aprovado').length +
                 desligamentos.filter(d => d.status === 'aprovado').length,
      reprovadas: ferias.filter(f => f.status === 'reprovado').length +
                  salarios.filter(s => s.status === 'reprovado').length +
                  cargos.filter(c => c.status === 'reprovado').length +
                  departamentos.filter(d => d.status === 'reprovado').length +
                  desligamentos.filter(d => d.status === 'reprovado').length,
    };
  }, [ferias, salarios, cargos, departamentos, desligamentos, feriasPendentes, salariosPendentes, cargosPendentes, departamentosPendentes, desligamentosPendentes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">Gestão de RH - Aprovações e Histórico</CardTitle>
              {/* Métricas rápidas */}
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {totalSolicitacoes.pendentes}
                  </div>
                  <div className="text-xs opacity-90">Pendentes</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-2xl text-green-300">
                    {totalSolicitacoes.aprovadas}
                  </div>
                  <div className="text-xs opacity-90">Aprovadas</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-2xl text-red-300">
                    {totalSolicitacoes.reprovadas}
                  </div>
                  <div className="text-xs opacity-90">Reprovadas</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="ferias" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="ferias" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Férias
                  {feriasPendentes.length > 0 && (
                    <Badge className="ml-2 bg-red-500">{feriasPendentes.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="salarios" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Salários
                  {salariosPendentes.length > 0 && (
                    <Badge className="ml-2 bg-red-500">{salariosPendentes.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="cargos" className="gap-2">
                  <Briefcase className="w-4 h-4" />
                  Cargos
                  {cargosPendentes.length > 0 && (
                    <Badge className="ml-2 bg-red-500">{cargosPendentes.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="departamentos" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  Departamentos
                  {departamentosPendentes.length > 0 && (
                    <Badge className="ml-2 bg-red-500">{departamentosPendentes.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="desligamentos" className="gap-2">
                  <UserX className="w-4 h-4" />
                  Desligamentos
                  {desligamentosPendentes.length > 0 && (
                    <Badge className="ml-2 bg-red-500">{desligamentosPendentes.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ABA DE FÉRIAS */}
              <TabsContent value="ferias" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Solicitado em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ferias.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            Nenhuma solicitação de férias encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        ferias.map(f => (
                          <TableRow
                            key={f.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => openDetailModal('ferias', f)}
                          >
                            <TableCell className="font-medium">{getFuncionarioNome(f.funcionario_id)}</TableCell>
                            <TableCell>
                              {formatDate(f.inicio)} - {formatDate(f.fim)}
                            </TableCell>
                            <TableCell>{f.dias} dias</TableCell>
                            <TableCell>{formatDate(f.created_date)}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[f.status] || 'bg-gray-100 text-gray-800'}>
                                {statusLabels[f.status] || f.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailModal('ferias', f);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                                Ver Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* ABA DE SALÁRIOS */}
              <TabsContent value="salarios" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>De</TableHead>
                        <TableHead>Para</TableHead>
                        <TableHead>Vigência</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salarios.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            Nenhum histórico de salário encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        salarios.map(s => (
                          <TableRow
                            key={s.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => openDetailModal('salario', s)}
                          >
                            <TableCell className="font-medium">{getFuncionarioNome(s.funcionario_id)}</TableCell>
                            <TableCell>{formatCurrency(s.salario_anterior)}</TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(s.salario_novo)}
                            </TableCell>
                            <TableCell>{formatDate(s.data_vigencia)}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[s.status] || 'bg-gray-100 text-gray-800'}>
                                {statusLabels[s.status] || s.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailModal('salario', s);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                                Ver Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* ABA DE CARGOS */}
              <TabsContent value="cargos" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>De</TableHead>
                        <TableHead>Para</TableHead>
                        <TableHead>Vigência</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cargos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            Nenhum histórico de cargo encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        cargos.map(c => (
                          <TableRow
                            key={c.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => openDetailModal('cargo', c)}
                          >
                            <TableCell className="font-medium">{getFuncionarioNome(c.funcionario_id)}</TableCell>
                            <TableCell>{c.cargo_anterior || getCargoNome(c.cargo_anterior_id)}</TableCell>
                            <TableCell className="font-semibold text-blue-600">
                              {c.cargo_novo || getCargoNome(c.cargo_novo_id)}
                            </TableCell>
                            <TableCell>{formatDate(c.data_vigencia)}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[c.status] || 'bg-gray-100 text-gray-800'}>
                                {statusLabels[c.status] || c.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailModal('cargo', c);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                                Ver Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* ABA DE DEPARTAMENTOS */}
              <TabsContent value="departamentos" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>De</TableHead>
                        <TableHead>Para</TableHead>
                        <TableHead>Vigência</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departamentos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            Nenhum histórico de departamento encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        departamentos.map(d => (
                          <TableRow
                            key={d.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => openDetailModal('departamento', d)}
                          >
                            <TableCell className="font-medium">{getFuncionarioNome(d.funcionario_id)}</TableCell>
                            <TableCell>{d.departamento_anterior || getDepartamentoNome(d.departamento_anterior_id)}</TableCell>
                            <TableCell className="font-semibold text-purple-600">
                              {d.departamento_novo || getDepartamentoNome(d.departamento_novo_id)}
                            </TableCell>
                            <TableCell>{formatDate(d.data_vigencia)}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[d.status] || 'bg-gray-100 text-gray-800'}>
                                {statusLabels[d.status] || d.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailModal('departamento', d);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                                Ver Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* ABA DE DESLIGAMENTOS */}
              <TabsContent value="desligamentos" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Data Aviso</TableHead>
                        <TableHead>Desligamento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {desligamentos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            Nenhuma solicitação de desligamento encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        desligamentos.map(d => (
                          <TableRow
                            key={d.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => openDetailModal('desligamento', d)}
                          >
                            <TableCell className="font-medium">{getFuncionarioNome(d.funcionario_id)}</TableCell>
                            <TableCell className="max-w-xs truncate">{d.motivo}</TableCell>
                            <TableCell>{formatDate(d.data_aviso)}</TableCell>
                            <TableCell>{formatDate(d.data_desligamento)}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[d.status] || 'bg-gray-100 text-gray-800'}>
                                {statusLabels[d.status] || d.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailModal('desligamento', d);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                                Ver Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Visualização Detalhada */}
      <Dialog
        open={detailModal.isOpen}
        onOpenChange={(open) => {
          if (!open) setDetailModal({ isOpen: false, tipo: null, item: null });
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DetailViewer />
        </DialogContent>
      </Dialog>

      {/* Modal de Ação (Aprovar, Reprovar, Responder, Encaminhar) */}
      <Dialog
        open={actionModal.isOpen}
        onOpenChange={(open) => {
          if (!open) setActionModal({ isOpen: false, action: null, texto: '', encaminharPara: '' });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal.action === 'aprovar' && '✅ Aprovar Solicitação'}
              {actionModal.action === 'reprovar' && '❌ Reprovar Solicitação'}
              {actionModal.action === 'responder' && '💬 Responder Solicitação'}
              {actionModal.action === 'encaminhar' && '➡️ Encaminhar Solicitação'}
            </DialogTitle>
            <DialogDescription>
              {actionModal.action === 'aprovar' && 'Adicione observações (opcional) e confirme a aprovação.'}
              {actionModal.action === 'reprovar' && 'Informe o motivo da reprovação.'}
              {actionModal.action === 'responder' && 'Digite sua resposta para o solicitante.'}
              {actionModal.action === 'encaminhar' && 'Selecione o usuário para encaminhar esta solicitação.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionModal.action === 'encaminhar' && (
              <div>
                <Label htmlFor="encaminharPara">Encaminhar para *</Label>
                <select
                  id="encaminharPara"
                  value={actionModal.encaminharPara}
                  onChange={(e) => setActionModal({ ...actionModal, encaminharPara: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Selecione um usuário...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.email}>
                      {u.full_name || u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label htmlFor="texto">
                {actionModal.action === 'aprovar' && 'Observações (opcional)'}
                {actionModal.action === 'reprovar' && 'Motivo da Reprovação *'}
                {actionModal.action === 'responder' && 'Mensagem *'}
                {actionModal.action === 'encaminhar' && 'Observações (opcional)'}
              </Label>
              <Textarea
                id="texto"
                value={actionModal.texto}
                onChange={(e) => setActionModal({ ...actionModal, texto: e.target.value })}
                rows={4}
                placeholder={
                  actionModal.action === 'aprovar' ? 'Observações sobre a aprovação...' :
                  actionModal.action === 'reprovar' ? 'Motivo da reprovação...' :
                  actionModal.action === 'responder' ? 'Sua mensagem...' :
                  'Observações adicionais...'
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionModal({ isOpen: false, action: null, texto: '', encaminharPara: '' })}
            >
              Cancelar
            </Button>
            <Button
              variant={actionModal.action === 'reprovar' ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={
                (actionModal.action === 'reprovar' && !actionModal.texto.trim()) ||
                (actionModal.action === 'responder' && !actionModal.texto.trim()) ||
                (actionModal.action === 'encaminhar' && !actionModal.encaminharPara.trim())
              }
              className={actionModal.action === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {actionModal.action === 'aprovar' && 'Confirmar Aprovação'}
              {actionModal.action === 'reprovar' && 'Confirmar Reprovação'}
              {actionModal.action === 'responder' && 'Enviar Resposta'}
              {actionModal.action === 'encaminhar' && 'Encaminhar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
