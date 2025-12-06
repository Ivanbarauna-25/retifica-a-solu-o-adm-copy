import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { base44 } from '@/api/base44Client';
import { Loader2, Shield, Check, AlertCircle, Info, Percent, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


// Define available special permissions
const PERMISSOES_ESPECIAIS = [
{ id: 'editar_numero_orcamento', nome: 'Editar Número do Orçamento' },
{ id: 'editar_data_orcamento', nome: 'Editar Data do Orçamento' },
{ id: 'editar_numero_os', nome: 'Editar Número da OS' },
{ id: 'editar_data_os', nome: 'Editar Data da OS' }];



export default function CargoPermissoesForm({ isOpen, onClose, onSave, cargo = null }) {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    nivel_hierarquico: 5,
    permissoes_modulos_acoes: [],
    permissoes_aprovacao: [],
    permissoes_especiais: [],
    tem_comissao: false,
    tipo_comissao: 'individual',
    percentual_comissao: 0,
    meta_minima_individual: 0,
    meta_minima_empresa: 0,
    base_calculo_comissao: 'total'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && cargo) {
      // Migrar dados antigos se necessário
      let modulosAcoes = cargo.permissoes_modulos_acoes || [];

      // Se tiver permissoes antigas mas não tiver a nova estrutura, migrar
      if (modulosAcoes.length === 0 && cargo.permissoes_modulos && cargo.permissoes_modulos.length > 0) {
        modulosAcoes = cargo.permissoes_modulos.map((modulo) => ({
          modulo: modulo,
          acoes: cargo.permissoes_acoes || ['visualizar']
        }));
      }

      setFormData({
        nome: cargo.nome || '',
        descricao: cargo.descricao || '',
        nivel_hierarquico: cargo.nivel_hierarquico || 5,
        permissoes_modulos_acoes: modulosAcoes,
        permissoes_aprovacao: cargo.permissoes_aprovacao || [],
        permissoes_especiais: cargo.permissoes_especiais || [],
        tem_comissao: cargo.tem_comissao || false,
        tipo_comissao: cargo.tipo_comissao || 'individual',
        percentual_comissao: cargo.percentual_comissao || 0,
        meta_minima_individual: cargo.meta_minima_individual || 0,
        meta_minima_empresa: cargo.meta_minima_empresa || 0,
        base_calculo_comissao: cargo.base_calculo_comissao || 'total'
      });
    } else if (isOpen && !cargo) {
      setFormData({
        nome: '',
        descricao: '',
        nivel_hierarquico: 5,
        permissoes_modulos_acoes: [],
        permissoes_aprovacao: [],
        permissoes_especiais: [],
        tem_comissao: false,
        tipo_comissao: 'individual',
        percentual_comissao: 0,
        meta_minima_individual: 0,
        meta_minima_empresa: 0,
        base_calculo_comissao: 'total'
      });
    }
    setErrors({}); // Reset errors when form opens or cargo changes
  }, [isOpen, cargo]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.nome || formData.nome.trim().length < 2) {
      newErrors.nome = 'O nome do cargo deve ter pelo menos 2 caracteres.';
    }

    if (formData.tem_comissao) {
      if (formData.percentual_comissao < 0 || formData.percentual_comissao > 100) {
        newErrors.percentual_comissao = 'O percentual de comissão deve estar entre 0 e 100.';
      }
      if (formData.tipo_comissao === 'individual' && formData.meta_minima_individual < 0) {
        newErrors.meta_minima_individual = 'A meta mínima individual não pode ser negativa.';
      }
      if (formData.tipo_comissao === 'empresa' && formData.meta_minima_empresa < 0) {
        newErrors.meta_minima_empresa = 'A meta mínima da empresa não pode ser negativa.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: 'Erro de validação',
        description: 'Por favor, corrija os campos destacados.',
        variant: 'destructive'
      });
      return;
    }
    setErrors({});

    setIsLoading(true);
    try {
      // Preparar dados garantindo tipos corretos
      const cargoData = {
        nome: formData.nome.trim(),
        descricao: formData.descricao?.trim() || '',
        nivel_hierarquico: Number(formData.nivel_hierarquico) || 5,
        permissoes_modulos_acoes: formData.permissoes_modulos_acoes || [],
        permissoes_aprovacao: formData.permissoes_aprovacao || [],
        permissoes_especiais: formData.permissoes_especiais || [],
        tem_comissao: Boolean(formData.tem_comissao),
        tipo_comissao: formData.tem_comissao ? formData.tipo_comissao : null,
        percentual_comissao: formData.tem_comissao ? Number(formData.percentual_comissao) || 0 : 0,
        meta_minima_individual: formData.tem_comissao && formData.tipo_comissao === 'individual' ?
        Number(formData.meta_minima_individual) || 0 :
        0,
        meta_minima_empresa: formData.tem_comissao && formData.tipo_comissao === 'empresa' ?
        Number(formData.meta_minima_empresa) || 0 :
        0,
        base_calculo_comissao: formData.tem_comissao ? formData.base_calculo_comissao : 'total'
      };

      console.log('📤 Enviando dados do cargo:', cargoData);

      if (cargo?.id) {
        await base44.entities.Cargo.update(cargo.id, cargoData);
        toast({
          title: 'Cargo atualizado!',
          description: 'As permissões do cargo foram atualizadas com sucesso.'
        });
      } else {
        await base44.entities.Cargo.create(cargoData);
        toast({
          title: 'Cargo criado!',
          description: 'O novo cargo foi criado com sucesso.'
        });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('❌ Erro ao salvar cargo:', error);

      // Função auxiliar para extrair texto legível de um objeto
      const extractErrorText = (obj, visited = new Set()) => {
        if (visited.has(obj)) return null;
        
        if (typeof obj === 'string') return obj;
        if (!obj || typeof obj !== 'object') return null;
        
        visited.add(obj);
        
        // Propriedades comuns de erro em ordem de prioridade
        const errorProps = ['message', 'error', 'detail', 'details', 'description', 'msg', 'title'];
        
        for (const prop of errorProps) {
          if (obj[prop]) {
            if (typeof obj[prop] === 'string') return obj[prop];
            const nested = extractErrorText(obj[prop], visited);
            if (nested) return nested;
          }
        }
        
        // Se nada encontrado, tentar stringify mas apenas se tiver conteúdo útil
        try {
          const keys = Object.keys(obj).filter(k => !['response', 'request', 'config', 'stack'].includes(k));
          if (keys.length > 0) {
            const simplified = {};
            keys.forEach(k => {
              const val = obj[k];
              if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                simplified[k] = val;
              }
            });
            if (Object.keys(simplified).length > 0) {
              return JSON.stringify(simplified, null, 2);
            }
          }
        } catch (e) {
          // Ignorar erro de stringify
        }
        
        return null;
      };

      let errorMessage = 'Não foi possível salvar o cargo.';

      // Tentar extrair mensagem de erro
      const extracted = extractErrorText(error?.response?.data) || 
                       extractErrorText(error?.response) || 
                       extractErrorText(error) ||
                       error?.message ||
                       (typeof error === 'string' ? error : null);

      if (extracted && extracted.trim() && !extracted.includes('[object Object]')) {
        errorMessage = extracted;
      } else {
        // Se não conseguiu extrair nada útil, dar mensagem genérica útil
        errorMessage = 'Erro ao salvar o cargo. Verifique se todos os campos estão preenchidos corretamente.';
      }

      console.error('📋 Mensagem de erro extraída:', errorMessage);

      toast({
        title: 'Erro ao salvar cargo',
        description: errorMessage,
        variant: 'destructive',
        duration: 6000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModulo = (moduloValue) => {
    setFormData((prev) => {
      const existe = prev.permissoes_modulos_acoes.find((m) => m.modulo === moduloValue);

      if (existe) {
        // Remove o módulo
        return {
          ...prev,
          permissoes_modulos_acoes: prev.permissoes_modulos_acoes.filter((m) => m.modulo !== moduloValue)
        };
      } else {
        // Adiciona o módulo com visualizar por padrão
        return {
          ...prev,
          permissoes_modulos_acoes: [
          ...prev.permissoes_modulos_acoes,
          { modulo: moduloValue, acoes: ['visualizar'] }]

        };
      }
    });
  };

  const toggleAcao = (moduloValue, acaoValue) => {
    setFormData((prev) => {
      const novasPermissoes = prev.permissoes_modulos_acoes.map((item) => {
        if (item.modulo === moduloValue) {
          const acoes = item.acoes || [];
          if (acoes.includes(acaoValue)) {
            // Remove a ação
            return { ...item, acoes: acoes.filter((a) => a !== acaoValue) };
          } else {
            // Adiciona a ação
            return { ...item, acoes: [...acoes, acaoValue] };
          }
        }
        return item;
      });

      return { ...prev, permissoes_modulos_acoes: novasPermissoes };
    });
  };

  const toggleAprovacao = (valor) => {
    setFormData((prev) => {
      const lista = prev.permissoes_aprovacao || [];
      if (lista.includes(valor)) {
        return { ...prev, permissoes_aprovacao: lista.filter((v) => v !== valor) };
      } else {
        return { ...prev, permissoes_aprovacao: [...lista, valor] };
      }
    });
  };

  const toggleEspecial = (permissaoId, checked) => {
    setFormData((prev) => {
      const current = prev.permissoes_especiais || [];
      if (checked) {
        return { ...prev, permissoes_especiais: [...current, permissaoId] };
      } else {
        return { ...prev, permissoes_especiais: current.filter((p) => p !== permissaoId) };
      }
    });
  };

  const modulosDisponiveis = [
  { value: 'dashboard', label: '📊 Dashboard', grupo: 'Principal' },
  { value: 'os', label: '🔧 Ordens de Serviço', grupo: 'Operacional' },
  { value: 'orcamentos', label: '📋 Orçamentos', grupo: 'Operacional' },
  { value: 'estoque', label: '📦 Estoque', grupo: 'Operacional' },
  { value: 'patrimonio', label: '🏢 Patrimônio', grupo: 'Operacional' },
  { value: 'tarefas', label: '✅ Tarefas', grupo: 'Operacional' },
  { value: 'clientes', label: '👥 Clientes', grupo: 'Cadastros' },
  { value: 'fornecedores', label: '🏭 Fornecedores', grupo: 'Cadastros' },
  { value: 'servicos', label: '🔧 Serviços', grupo: 'Cadastros' },
  { value: 'categorias', label: '🏷️ Categorias', grupo: 'Cadastros' },
  { value: 'funcionarios', label: '👤 Funcionários', grupo: 'RH' },
  { value: 'rh', label: '💼 Gestão de RH', grupo: 'RH' },
  { value: 'ponto', label: '⏰ Ponto', grupo: 'RH' },
  { value: 'folha', label: '💰 Folha Pagamento', grupo: 'RH' },
  { value: 'adiantamentos', label: '💵 Adiantamentos', grupo: 'RH' },
  { value: 'contratacao', label: '📝 Contratação', grupo: 'RH' },
  { value: 'departamentos', label: '🏢 Departamentos', grupo: 'RH' },
  { value: 'cargos', label: '👔 Cargos', grupo: 'RH' },
  { value: 'compras', label: '🛒 Compras', grupo: 'Compras' },
  { value: 'financeiro', label: '💳 Financeiro', grupo: 'Financeiro' },
  { value: 'contas_pagar', label: '📤 Contas a Pagar', grupo: 'Financeiro' },
  { value: 'contas_receber', label: '📥 Contas a Receber', grupo: 'Financeiro' },
  { value: 'fluxo_caixa', label: '💹 Fluxo de Caixa', grupo: 'Financeiro' },
  { value: 'movimentacao', label: '💸 Movimentação', grupo: 'Financeiro' },
  { value: 'plano_contas', label: '📊 Plano Contas', grupo: 'Financeiro' },
  { value: 'dre', label: '📈 DRE', grupo: 'Financeiro' },
  { value: 'contas_bancarias', label: '🏦 Contas Bancárias', grupo: 'Financeiro' },
  { value: 'formas_pagamento', label: '💳 Formas Pagamento', grupo: 'Financeiro' },
  { value: 'condicoes_pagamento', label: '📋 Condições Pagamento', grupo: 'Financeiro' },
  { value: 'usuarios', label: '👥 Usuários', grupo: 'Administração' },
  { value: 'configuracoes', label: '⚙️ Configurações', grupo: 'Administração' }];


  const acoesDisponiveis = [
  { value: 'visualizar', label: '👁️ Visualizar', color: 'bg-blue-100 text-blue-800' },
  { value: 'criar', label: '➕ Criar', color: 'bg-green-100 text-green-800' },
  { value: 'editar', label: '✏️ Editar', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'deletar', label: '🗑️ Deletar', color: 'bg-red-100 text-red-800' },
  { value: 'aprovar', label: '✅ Aprovar', color: 'bg-purple-100 text-purple-800' }];


  const aprovacoesDisponiveis = [
  { value: 'ferias', label: '🏖️ Férias' },
  { value: 'salario', label: '💰 Reajuste Salarial' },
  { value: 'cargo', label: '📊 Alteração de Cargo' },
  { value: 'departamento', label: '🏢 Mudança Departamento' },
  { value: 'desligamento', label: '👋 Desligamento' },
  { value: 'adiantamento', label: '💵 Adiantamento' },
  { value: 'compras', label: '🛒 Compras' }];


  const niveis = [
  { value: 1, label: 'Nível 1 - Diretoria' },
  { value: 2, label: 'Nível 2 - Gerência' },
  { value: 3, label: 'Nível 3 - Supervisão' },
  { value: 4, label: 'Nível 4 - Especialista' },
  { value: 5, label: 'Nível 5 - Operacional' }];


  const totalPermissoes = formData.permissoes_modulos_acoes.length + formData.permissoes_aprovacao.length;

  // Agrupar módulos
  const modulosPorGrupo = modulosDisponiveis.reduce((acc, mod) => {
    if (!acc[mod.grupo]) acc[mod.grupo] = [];
    acc[mod.grupo].push(mod);
    return acc;
  }, {});

  const getModuloPermissao = (moduloValue) => {
    return formData.permissoes_modulos_acoes.find((m) => m.modulo === moduloValue);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {cargo ? 'Editar Cargo e Permissões' : 'Novo Cargo'}
          </DialogTitle>
          <DialogDescription>
            Configure as informações básicas, permissões de acesso e políticas de comissão do cargo
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basico" className="text-slate-950 w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basico">Informações Básicas</TabsTrigger>
            <TabsTrigger value="permissoes">Permissões</TabsTrigger>
            <TabsTrigger value="comissoes" className="gap-2">
              <Percent className="w-4 h-4" />
              Comissões
            </TabsTrigger>
          </TabsList>

          {/* ABA BÁSICO */}
          <TabsContent value="basico" className="text-zinc-950 mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 space-y-4">
            {/* Informações Básicas */}
            <div className="space-y-2">
              <Label htmlFor="nome">
                Nome do Cargo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Gerente Financeiro"
                required />

              {errors.nome && <p className="text-sm text-red-500">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva as responsabilidades e atribuições deste cargo..."
                rows={3} />

            </div>

            <div className="space-y-2">
              <Label htmlFor="nivel">Nível Hierárquico</Label>
              <Input
                id="nivel"
                type="number"
                min="1"
                max="10"
                value={formData.nivel_hierarquico}
                onChange={(e) => setFormData((prev) => ({ ...prev, nivel_hierarquico: Number(e.target.value) }))} />

              <p className="text-xs text-gray-500">
                1 = Mais alto na hierarquia (CEO, Diretor) | 10 = Mais baixo (Assistente, Estagiário)
              </p>
            </div>
          </TabsContent>

          {/* ABA PERMISSÕES */}
          <TabsContent value="permissoes" className="space-y-6 mt-4">
            {/* Indicador (removed as per outline, only total is in footer) */}

            {/* Permissões por Módulo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Permissões por Módulo
                </h3>
                <Badge variant="outline">
                  {formData.permissoes_modulos_acoes.length} módulos selecionados
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                Selecione os módulos que este cargo pode acessar e as ações permitidas em cada um.
              </p>

              <Accordion type="multiple" className="w-full">
                {Object.entries(modulosPorGrupo).map(([grupo, modulos]) =>
                <AccordionItem key={grupo} value={grupo} className="border rounded-lg mb-2">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium">{grupo}</span>
                        <Badge variant="secondary" className="ml-2">
                          {modulos.filter((m) => getModuloPermissao(m.value)).length}/{modulos.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {modulos.map((modulo) => {
                        const permissao = getModuloPermissao(modulo.value);
                        const isSelected = !!permissao;

                        return (
                          <div key={modulo.value} className={`border rounded-lg p-3 transition-all ${
                          isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`
                          }>
                              <div className="flex items-start gap-3">
                                <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleModulo(modulo.value)}
                                className="mt-1" />

                                <div className="flex-1">
                                  <div className="font-medium text-sm flex items-center gap-2">
                                    {modulo.label}
                                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                  </div>
                                  
                                  {isSelected &&
                                <div className="mt-3 flex flex-wrap gap-2">
                                      {acoesDisponiveis.map((acao) => {
                                    const temAcao = permissao?.acoes?.includes(acao.value);
                                    return (
                                      <button
                                        key={acao.value}
                                        type="button"
                                        onClick={() => toggleAcao(modulo.value, acao.value)}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                        temAcao ?
                                        acao.color :
                                        'bg-gray-100 text-gray-400 hover:bg-gray-200'}`
                                        }>
                                            {acao.label}
                                          </button>);

                                  })}
                                    </div>
                                }
                                </div>
                              </div>
                            </div>);

                      })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>

            <Separator />

            {/* Permissões de Aprovação */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800">✅ Permissões de Aprovação</h3>
              <p className="text-sm text-gray-600">
                Selecione quais tipos de solicitações os usuários deste cargo podem aprovar
              </p>
              <div className="bg-white border rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3">
                  {aprovacoesDisponiveis.map((aprov) =>
                  <div key={aprov.value} className="flex items-center gap-2">
                      <Checkbox
                      id={`aprov-${aprov.value}`}
                      checked={formData.permissoes_aprovacao.includes(aprov.value)}
                      onCheckedChange={() => toggleAprovacao(aprov.value)} />

                      <label htmlFor={`aprov-${aprov.value}`} className="text-sm cursor-pointer">
                        {aprov.label}
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Permissões Especiais */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800">✨ Permissões Especiais</h3>
              <p className="text-sm text-gray-600">Permissões adicionais para ações específicas</p>
              <div className="bg-white border rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3">
                  {PERMISSOES_ESPECIAIS.map((perm) =>
                  <div key={perm.id} className="flex items-center gap-2">
                      <Checkbox
                      id={`perm-${perm.id}`}
                      checked={(formData.permissoes_especiais || []).includes(perm.id)}
                      onCheckedChange={(checked) => toggleEspecial(perm.id, checked)} />

                      <label htmlFor={`perm-${perm.id}`} className="text-sm cursor-pointer">
                        {perm.nome}
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ABA COMISSÕES - NOVA */}
          <TabsContent value="comissoes" className="space-y-6 mt-4">
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Configure as políticas de comissão para este cargo. As comissões serão calculadas 
                automaticamente com base nas vendas realizadas.
              </AlertDescription>
            </Alert>

            {/* Tem Comissão? */}
            <div className="border rounded-lg p-4 bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-base font-semibold">
                    Este cargo tem direito a comissão?
                  </Label>
                  <p className="text-sm text-slate-600">
                    Ative para configurar as regras de comissionamento para funcionários neste cargo.
                  </p>
                </div>
                
                <RadioGroup
                  value={formData.tem_comissao ? "sim" : "nao"}
                  onValueChange={(value) =>
                  setFormData({ ...formData, tem_comissao: value === "sim" })
                  }
                  className="flex gap-4">

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="comissao-sim" />
                    <Label htmlFor="comissao-sim" className="font-normal cursor-pointer">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="comissao-nao" />
                    <Label htmlFor="comissao-nao" className="font-normal cursor-pointer">Não</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Configurações de Comissão (só aparece se tem_comissao = true) */}
            {formData.tem_comissao &&
            <>
                <Separator />

                {/* Tipo de Comissão */}
                <div className="border rounded-lg p-4 bg-white">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-semibold mb-2 block">
                        Tipo de Comissão
                      </Label>
                      <p className="text-sm text-slate-600 mb-3">
                        Defina se a comissão é baseada nas vendas individuais do funcionário 
                        ou nas vendas totais da empresa.
                      </p>
                    </div>

                    <RadioGroup
                    value={formData.tipo_comissao}
                    onValueChange={(value) =>
                    setFormData({ ...formData, tipo_comissao: value })
                    }
                    className="space-y-3">

                      <div className="flex items-start space-x-3 border rounded-lg p-3 hover:bg-slate-50 transition-colors">
                        <RadioGroupItem value="individual" id="tipo-individual" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="tipo-individual" className="font-semibold cursor-pointer">
                            Comissão Individual
                          </Label>
                          <p className="text-xs text-slate-500 mt-1">
                            A comissão é calculada apenas sobre as vendas realizadas pelo próprio funcionário
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 border rounded-lg p-3 hover:bg-slate-50 transition-colors">
                        <RadioGroupItem value="empresa" id="tipo-empresa" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="tipo-empresa" className="font-semibold cursor-pointer">
                            Comissão sobre Vendas da Empresa
                          </Label>
                          <p className="text-xs text-slate-500 mt-1">
                            A comissão é calculada sobre o total de vendas da empresa (ex: gerentes, diretores)
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Separator />

                {/* Percentual de Comissão */}
                <div className="border rounded-lg p-4 bg-white">
                  <div className="space-y-3">
                    <Label htmlFor="percentual" className="text-base font-semibold">
                      Percentual de Comissão
                    </Label>
                    <p className="text-sm text-slate-600">
                      Defina o percentual que será aplicado sobre as vendas
                    </p>
                    <div className="flex items-center gap-3">
                      <Input
                      id="percentual"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.percentual_comissao || ''}
                      onChange={(e) =>
                      setFormData({ ...formData, percentual_comissao: e.target.value ? Number(e.target.value) : 0 })
                      }
                      placeholder="0.00"
                      className="w-32" />

                      <span className="text-lg font-semibold">%</span>
                      <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Exemplo:</strong> Em uma venda de R$ 10.000,00, a comissão será de{' '}
                          <strong>{formatCurrency(10000 * ((formData.percentual_comissao || 0) / 100))}</strong>
                        </p>
                      </div>
                    </div>
                    {errors.percentual_comissao && <p className="text-sm text-red-500 mt-2">{errors.percentual_comissao}</p>}
                  </div>
                </div>

                <Separator />

                {/* Meta Mínima (condicional baseado no tipo) */}
                {formData.tipo_comissao === 'individual' ?
              <div className="border rounded-lg p-4 bg-white">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <Label htmlFor="meta-individual" className="text-base font-semibold">
                            Meta Mínima para Comissão Individual
                          </Label>
                          <p className="text-sm text-slate-600 mt-1">
                            Valor mínimo de vendas que o funcionário precisa atingir para começar a receber comissão
                          </p>
                        </div>
                      </div>
                      <Input
                    id="meta-individual"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.meta_minima_individual || ''}
                    onChange={(e) =>
                    setFormData({ ...formData, meta_minima_individual: e.target.value ? Number(e.target.value) : 0 })
                    }
                    placeholder="0.00" />

                      {errors.meta_minima_individual && <p className="text-sm text-red-500 mt-2">{errors.meta_minima_individual}</p>}
                      {formData.meta_minima_individual > 0 &&
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm text-amber-800">
                            ⚠️ O funcionário só receberá comissão se vender <strong>acima de {formatCurrency(formData.meta_minima_individual)}</strong> no período
                          </p>
                        </div>
                  }
                    </div>
                  </div> :

              <div className="border rounded-lg p-4 bg-white">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <Label htmlFor="meta-empresa" className="text-base font-semibold">
                            Meta Mínima de Vendas da Empresa
                          </Label>
                          <p className="text-sm text-slate-600 mt-1">
                            Valor mínimo que a empresa precisa vender no período para que este cargo receba comissão
                          </p>
                        </div>
                      </div>
                      <Input
                    id="meta-empresa"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.meta_minima_empresa || ''}
                    onChange={(e) =>
                    setFormData({ ...formData, meta_minima_empresa: e.target.value ? Number(e.target.value) : 0 })
                    }
                    placeholder="0.00" />

                      {errors.meta_minima_empresa && <p className="text-sm text-red-500 mt-2">{errors.meta_minima_empresa}</p>}
                      {formData.meta_minima_empresa > 0 &&
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm text-amber-800">
                            ⚠️ A comissão só será paga se a empresa vender <strong>acima de {formatCurrency(formData.meta_minima_empresa)}</strong> no período
                          </p>
                        </div>
                  }
                    </div>
                  </div>
              }

                <Separator />

                {/* Base de Cálculo */}
                <div className="border rounded-lg p-4 bg-white">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      Base de Cálculo da Comissão
                    </Label>
                    <p className="text-sm text-slate-600 mb-3">
                      Defina se a comissão incide sobre o valor total ou apenas sobre o excedente da meta
                    </p>

                    <Select
                    value={formData.base_calculo_comissao}
                    onValueChange={(value) =>
                    setFormData({ ...formData, base_calculo_comissao: value })
                    }>

                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a base de cálculo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total">
                          <div className="flex flex-col items-start">
                            <span className="font-semibold">Sobre o Valor Total</span>
                            <span className="text-xs text-slate-500">
                              Comissão calculada sobre todo o valor vendido
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="excedente">
                          <div className="flex flex-col items-start">
                            <span className="font-semibold">Apenas sobre o Excedente</span>
                            <span className="text-xs text-slate-500">
                              Comissão apenas sobre o que passar da meta
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Exemplo prático */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        💡 Exemplo Prático:
                      </p>
                      {formData.tipo_comissao === 'individual' && formData.meta_minima_individual > 0 ?
                    <>
                          <p className="text-sm text-blue-800">
                            Vendedor vendeu <strong>R$ 15.000,00</strong> | Meta: <strong>{formatCurrency(formData.meta_minima_individual)}</strong> | Comissão: <strong>{formData.percentual_comissao}%</strong>
                          </p>
                          <p className="text-sm text-blue-800 mt-2">
                            {formData.base_calculo_comissao === 'total' ?
                        <>
                                ✓ <strong>Total:</strong> {formData.percentual_comissao}% de R$ 15.000 = <strong>{formatCurrency(15000 * (formData.percentual_comissao / 100))}</strong>
                              </> :

                        <>
                                {15000 > formData.meta_minima_individual ?
                          <>
                                    ✓ <strong>Excedente:</strong> {formData.percentual_comissao}% de R$ {(15000 - formData.meta_minima_individual).toFixed(2).replace('.', ',')} = <strong>{formatCurrency((15000 - formData.meta_minima_individual) * (formData.percentual_comissao / 100))}</strong>
                                  </> :

                          <>
                                    ✗ Não atingiu a meta mínima, comissão: <strong>{formatCurrency(0)}</strong>
                                  </>
                          }
                              </>
                        }
                          </p>
                        </> :

                    <p className="text-sm text-blue-800">
                          Configure a meta e o percentual para ver um exemplo de cálculo
                        </p>
                    }
                    </div>
                  </div>
                </div>
              </>
            }
          </TabsContent>
        </Tabs>

        {/* Botões */}
        <DialogFooter className="mt-6">
          <div className="text-sm text-gray-500 flex items-center justify-start flex-1">
            {totalPermissoes === 0 ?
            <span className="text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Nenhuma permissão configurada
              </span> :

            <span className="text-green-600 flex items-center gap-1">
                <Check className="w-4 h-4" />
                {totalPermissoes} permissões configuradas
              </span>
            }
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            onClick={handleSubmit}
            className="bg-slate-800 hover:bg-slate-700">
            {isLoading ?
            <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </> :

            <>
                <Shield className="mr-2 h-4 w-4" />
                {cargo ? 'Atualizar Cargo' : 'Criar Cargo'}
              </>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}