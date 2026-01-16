import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2,
  FileText,
  Loader2,
  Check,
  ShoppingCart,
  DollarSign,
  Settings,
  AlertTriangle,
  Info,
  Gift,
  Calculator,
  Bell,
  Mail
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ProtectedPage from '@/components/ProtectedPage';

function ConfiguracoesPage() {
  const [config, setConfig] = useState(null);
  const [originalConfig, setOriginalConfig] = useState(null); // Para detectar mudanças
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [planosContas, setPlanosContas] = useState([]);
  const [loadingPlanos, setLoadingPlanos] = useState(true);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("empresa"); // State to track active tab

  // Detectar mudanças não salvas
  useEffect(() => {
    if (config && originalConfig) {
      const configChanged = JSON.stringify(config) !== JSON.stringify(originalConfig);
      setHasUnsavedChanges(configChanged);
    }
  }, [config, originalConfig]);

  // Avisar usuário ao sair da página com mudanças não salvas
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    fetchConfig();
    fetchPlanosContas();
  }, []);

  const fetchPlanosContas = async () => {
    setLoadingPlanos(true);
    try {
      const planos = await base44.entities.PlanoContas.filter({ ativa: true });
      setPlanosContas(planos || []);
    } catch (error) {
      console.error('Erro ao carregar planos de contas:', error);
    } finally {
      setLoadingPlanos(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const configs = await base44.entities.Configuracoes.list();
      
      // Define a complete default configuration object
      const defaultGlobalConfig = {
        nome_empresa: '',
        cnpj: '',
        endereco: '',
        telefone: '',
        email: '',
        logo_url: '',
        contrato_social_url: '',
        alvara_url: '',
        outros_docs_url: '',
        bloquear_edicao_os_com_financeiro: false,
        permitir_conversao_multipla_orcamento: false,
        finalizar_os_ao_gerar_financeiro: false,
        bloquear_edicao_parcela_com_baixa: false,
        permitir_cancelamento_movimentacoes_pagas: false,
        calcular_comissao_apenas_os_finalizadas: true,
      };

      if (configs && configs[0]) {
        // Merge fetched config with defaults, ensuring all fields are present
        const loadedConfig = {
          ...defaultGlobalConfig,
          ...configs[0],
        };
        setConfig(loadedConfig);
        setOriginalConfig(loadedConfig); // Guardar estado original
      } else {
        // If no config exists, use the full default object
        setConfig(defaultGlobalConfig);
        setOriginalConfig(defaultGlobalConfig);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let savedConfig;
      if (config.id) {
        await base44.entities.Configuracoes.update(config.id, config);
        savedConfig = config;
      } else {
        savedConfig = await base44.entities.Configuracoes.create(config);
        setConfig(savedConfig);
      }
      
      setOriginalConfig(savedConfig); // Atualizar estado original após salvar
      setHasUnsavedChanges(false);
      
      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso',
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setConfig({ ...config, logo_url: file_url });
      
      toast({
        title: 'Sucesso',
        description: 'Logo carregada com sucesso',
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload da logo',
        variant: 'destructive'
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDocUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setConfig({ ...config, [field]: file_url });
      
      toast({
        title: 'Sucesso',
        description: 'Documento carregado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload do documento',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 md:p-6 max-w-6xl">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-slate-900">Configurações</h1>
        <p className="text-xs md:text-base text-slate-600 mt-1">
          Configure as informações da empresa e regras de negócio
        </p>
      </div>

      <Tabs defaultValue="empresa" value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 h-auto p-1">
          <TabsTrigger value="empresa" className="gap-1 md:gap-2 text-[10px] md:text-sm py-2 px-1 md:px-3">
            <Building2 className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Empresa</span>
            <span className="sm:hidden">Emp.</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1 md:gap-2 text-[10px] md:text-sm py-2 px-1 md:px-3">
            <FileText className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Documentos</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="comercial" className="gap-1 md:gap-2 text-[10px] md:text-sm py-2 px-1 md:px-3">
            <ShoppingCart className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Comercial</span>
            <span className="sm:hidden">Com.</span>
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-1 md:gap-2 text-[10px] md:text-sm py-2 px-1 md:px-3">
            <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Financeiro</span>
            <span className="sm:hidden">Fin.</span>
          </TabsTrigger>
          <TabsTrigger value="13salario" className="gap-1 md:gap-2 text-[10px] md:text-sm py-2 px-1 md:px-3">
            <Gift className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">13º Salário</span>
            <span className="sm:hidden">13º</span>
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-1 md:gap-2 text-[10px] md:text-sm py-2 px-1 md:px-3">
            <Bell className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Notificações</span>
            <span className="sm:hidden">Not.</span>
          </TabsTrigger>
        </TabsList>

        {/* ABA EMPRESA */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-xl">Informações da Empresa</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Dados básicos da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0 md:pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="nome_empresa" className="text-xs md:text-sm">Nome da Empresa *</Label>
                  <Input
                    id="nome_empresa"
                    value={config?.nome_empresa || ''}
                    onChange={(e) => setConfig({ ...config, nome_empresa: e.target.value })}
                    placeholder="Digite o nome da empresa"
                    className="h-9 md:h-10 text-xs md:text-sm"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="cnpj" className="text-xs md:text-sm">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={config?.cnpj || ''}
                    onChange={(e) => setConfig({ ...config, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="h-9 md:h-10 text-xs md:text-sm"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="telefone" className="text-xs md:text-sm">Telefone</Label>
                  <Input
                    id="telefone"
                    value={config?.telefone || ''}
                    onChange={(e) => setConfig({ ...config, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="h-9 md:h-10 text-xs md:text-sm"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="email" className="text-xs md:text-sm">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={config?.email || ''}
                    onChange={(e) => setConfig({ ...config, email: e.target.value })}
                    placeholder="contato@empresa.com"
                    className="h-9 md:h-10 text-xs md:text-sm"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                  <Label htmlFor="endereco" className="text-xs md:text-sm">Endereço</Label>
                  <Input
                    id="endereco"
                    value={config?.endereco || ''}
                    onChange={(e) => setConfig({ ...config, endereco: e.target.value })}
                    placeholder="Rua, número, bairro, cidade - UF"
                    className="h-9 md:h-10 text-xs md:text-sm"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="logo" className="text-xs md:text-sm">Logo da Empresa</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                  {config?.logo_url && (
                    <img
                      src={config.logo_url}
                      alt="Logo"
                      className="w-16 h-16 md:w-20 md:h-20 object-contain border rounded"
                    />
                  )}
                  <div className="flex-1 w-full">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="h-9 md:h-10 text-xs md:text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA DOCUMENTOS */}
        <TabsContent value="documentos">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-xl">Documentos da Empresa</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Faça upload dos documentos importantes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0 md:pt-0">
              <div className="space-y-3 md:space-y-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="contrato_social" className="text-xs md:text-sm">Contrato Social</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Input
                      id="contrato_social"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocUpload(e, 'contrato_social_url')}
                      className="h-9 md:h-10 text-xs md:text-sm flex-1"
                    />
                    {config?.contrato_social_url && (
                      <a
                        href={config.contrato_social_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs md:text-sm whitespace-nowrap"
                      >
                        Ver arquivo
                      </a>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="alvara" className="text-xs md:text-sm">Alvará de Funcionamento</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Input
                      id="alvara"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocUpload(e, 'alvara_url')}
                      className="h-9 md:h-10 text-xs md:text-sm flex-1"
                    />
                    {config?.alvara_url && (
                      <a
                        href={config.alvara_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs md:text-sm whitespace-nowrap"
                      >
                        Ver arquivo
                      </a>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="outros_docs" className="text-xs md:text-sm">Outros Documentos</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Input
                      id="outros_docs"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocUpload(e, 'outros_docs_url')}
                      className="h-9 md:h-10 text-xs md:text-sm flex-1"
                    />
                    {config?.outros_docs_url && (
                      <a
                        href={config.outros_docs_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs md:text-sm whitespace-nowrap"
                      >
                        Ver arquivo
                      </a>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Modelo de Orçamento para OCR */}
                <div className="space-y-1.5 md:space-y-2 p-3 md:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <Label htmlFor="modelo_orcamento" className="text-xs md:text-sm font-semibold text-blue-900">
                    📋 Modelo de Orçamento (para reconhecimento automático)
                  </Label>
                  <p className="text-[10px] md:text-xs text-blue-700 mb-2">
                    Faça upload de um modelo de orçamento em PDF. O sistema usará este modelo como referência para extrair dados automaticamente de fotos ou PDFs de orçamentos.
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Input
                      id="modelo_orcamento"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleDocUpload(e, 'modelo_orcamento_url')}
                      className="h-9 md:h-10 text-xs md:text-sm flex-1 bg-white"
                    />
                    {config?.modelo_orcamento_url && (
                      <a
                        href={config.modelo_orcamento_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs md:text-sm whitespace-nowrap font-medium"
                      >
                        Ver modelo
                      </a>
                    )}
                  </div>
                  {config?.modelo_orcamento_url && (
                    <div className="mt-2 p-2 bg-green-100 rounded text-[10px] md:text-xs text-green-800">
                      ✅ Modelo configurado! Agora você pode usar a câmera no formulário de orçamento ou enviar pelo WhatsApp.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA COMERCIAL - NOVA */}
        <TabsContent value="comercial">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-xl">
                <Settings className="w-4 h-4 md:w-5 md:h-5" />
                Configurações Comerciais
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Defina regras de negócio para ordens de serviço e orçamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0 md:pt-0">
              <Alert className="text-xs md:text-sm">
                <Info className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <AlertDescription className="text-xs md:text-sm">
                  Estas configurações afetam como o sistema controla as operações comerciais.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 md:space-y-6">
                {/* Configuração 1: Bloqueio de Edição de OS */}
                <div className="border rounded-lg p-3 md:p-4 bg-slate-50">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                    <div className="flex-1 space-y-1.5 md:space-y-2">
                      <Label className="text-sm md:text-base font-semibold">
                        Bloquear Edição de OS com Movimentação Financeira
                      </Label>
                      <p className="text-[11px] md:text-sm text-slate-600">
                        Impede a edição de OS que já possuem movimentação financeira gerada.
                      </p>
                      <div className="text-[10px] md:text-xs space-y-0.5 md:space-y-1 hidden sm:block">
                        <p className="text-slate-500">
                          <strong>✅ Benefício:</strong> Garante integridade entre OS e financeiro
                        </p>
                        <p className="text-slate-500">
                          <strong>⚠️ Impacto:</strong> Não poderá alterar valores após cobrança
                        </p>
                      </div>
                    </div>
                    
                    <RadioGroup
                      value={config?.bloquear_edicao_os_com_financeiro ? "sim" : "nao"}
                      onValueChange={(value) => 
                        setConfig({ ...config, bloquear_edicao_os_com_financeiro: value === "sim" })
                      }
                      className="flex gap-3 md:gap-4"
                    >
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="sim" id="os-sim" />
                        <Label htmlFor="os-sim" className="font-normal cursor-pointer text-xs md:text-sm">Sim</Label>
                      </div>
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="nao" id="os-nao" />
                        <Label htmlFor="os-nao" className="font-normal cursor-pointer text-xs md:text-sm">Não</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Separator />

                {/* Configuração 2: Conversão Múltipla de Orçamento */}
                <div className="border rounded-lg p-3 md:p-4 bg-slate-50">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                    <div className="flex-1 space-y-1.5 md:space-y-2">
                      <Label className="text-sm md:text-base font-semibold">
                        Permitir Converter Orçamento Mais de Uma Vez
                      </Label>
                      <p className="text-[11px] md:text-sm text-slate-600">
                        Permite converter um mesmo orçamento em múltiplas OS.
                      </p>
                    </div>
                    
                    <RadioGroup
                      value={config?.permitir_conversao_multipla_orcamento ? "sim" : "nao"}
                      onValueChange={(value) => 
                        setConfig({ ...config, permitir_conversao_multipla_orcamento: value === "sim" })
                      }
                      className="flex gap-3 md:gap-4"
                    >
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="sim" id="conv-sim" />
                        <Label htmlFor="conv-sim" className="font-normal cursor-pointer text-xs md:text-sm">Sim</Label>
                      </div>
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="nao" id="conv-nao" />
                        <Label htmlFor="conv-nao" className="font-normal cursor-pointer text-xs md:text-sm">Não</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Separator />

                {/* Configuração 3: Finalizar OS Automaticamente */}
                <div className="border rounded-lg p-3 md:p-4 bg-slate-50">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                    <div className="flex-1 space-y-1.5 md:space-y-2">
                      <Label className="text-sm md:text-base font-semibold">
                        Finalizar OS ao Gerar Financeiro
                      </Label>
                      <p className="text-[11px] md:text-sm text-slate-600">
                        Muda automaticamente o status da OS para "Finalizado" ao gerar financeiro.
                      </p>
                    </div>
                    
                    <RadioGroup
                      value={config?.finalizar_os_ao_gerar_financeiro ? "sim" : "nao"}
                      onValueChange={(value) => 
                        setConfig({ ...config, finalizar_os_ao_gerar_financeiro: value === "sim" })
                      }
                      className="flex gap-3 md:gap-4"
                    >
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="sim" id="fin-sim" />
                        <Label htmlFor="fin-sim" className="font-normal cursor-pointer text-xs md:text-sm">Sim</Label>
                      </div>
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="nao" id="fin-nao" />
                        <Label htmlFor="fin-nao" className="font-normal cursor-pointer text-xs md:text-sm">Não</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Separator />

                {/* NOVA Configuração 4: Comissões apenas para OS Finalizadas */}
                <div className="border rounded-lg p-3 md:p-4 bg-slate-50">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                    <div className="flex-1 space-y-1.5 md:space-y-2">
                      <Label className="text-sm md:text-base font-semibold">
                        Comissões Apenas para OS Finalizadas
                      </Label>
                      <p className="text-[11px] md:text-sm text-slate-600">
                        Calcula comissões apenas para OS com status "Finalizado".
                      </p>
                    </div>
                    
                    <RadioGroup
                      value={config?.calcular_comissao_apenas_os_finalizadas ? "sim" : "nao"}
                      onValueChange={(value) => 
                        setConfig({ ...config, calcular_comissao_apenas_os_finalizadas: value === "sim" })
                      }
                      className="flex gap-3 md:gap-4"
                    >
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="sim" id="comissao-sim" />
                        <Label htmlFor="comissao-sim" className="font-normal cursor-pointer text-xs md:text-sm">Sim</Label>
                      </div>
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="nao" id="comissao-nao" />
                        <Label htmlFor="comissao-nao" className="font-normal cursor-pointer text-xs md:text-sm">Não</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA FINANCEIRO - NOVA */}
        <TabsContent value="financeiro">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-xl">
                <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
                Configurações Financeiras
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Defina regras de controle financeiro e baixas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0 md:pt-0">
              <Alert className="text-xs md:text-sm">
                <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <AlertDescription className="text-xs md:text-sm">
                  Configurações financeiras são críticas. Certifique-se de entender o impacto.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 md:space-y-6">
                {/* Configuração 1: Bloqueio de Edição de Parcelas */}
                <div className="border rounded-lg p-3 md:p-4 bg-slate-50">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                    <div className="flex-1 space-y-1.5 md:space-y-2">
                      <Label className="text-sm md:text-base font-semibold">
                        Bloquear Edição de Parcelas com Baixa
                      </Label>
                      <p className="text-[11px] md:text-sm text-slate-600">
                        Impede a alteração de parcelas já baixadas.
                      </p>
                    </div>
                    
                    <RadioGroup
                      value={config?.bloquear_edicao_parcela_com_baixa ? "sim" : "nao"}
                      onValueChange={(value) => 
                        setConfig({ ...config, bloquear_edicao_parcela_com_baixa: value === "sim" })
                      }
                      className="flex gap-3 md:gap-4"
                    >
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="sim" id="parc-sim" />
                        <Label htmlFor="parc-sim" className="font-normal cursor-pointer text-xs md:text-sm">Sim</Label>
                      </div>
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="nao" id="parc-nao" />
                        <Label htmlFor="parc-nao" className="font-normal cursor-pointer text-xs md:text-sm">Não</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Separator />

                {/* Configuração 2: Permitir Cancelamento de Movimentações */}
                <div className="border rounded-lg p-3 md:p-4 bg-slate-50">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                    <div className="flex-1 space-y-1.5 md:space-y-2">
                      <Label className="text-sm md:text-base font-semibold">
                        Permitir Cancelamento de Movimentações Pagas
                      </Label>
                      <p className="text-[11px] md:text-sm text-slate-600">
                        Permite cancelar movimentações já baixadas.
                      </p>
                    </div>
                    
                    <RadioGroup
                      value={config?.permitir_cancelamento_movimentacoes_pagas ? "sim" : "nao"}
                      onValueChange={(value) => 
                        setConfig({ ...config, permitir_cancelamento_movimentacoes_pagas: value === "sim" })
                      }
                      className="flex gap-3 md:gap-4"
                    >
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="sim" id="canc-sim" />
                        <Label htmlFor="canc-sim" className="font-normal cursor-pointer text-xs md:text-sm">Sim</Label>
                      </div>
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <RadioGroupItem value="nao" id="canc-nao" />
                        <Label htmlFor="canc-nao" className="font-normal cursor-pointer text-xs md:text-sm">Não</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Separator />

                {/* Seção: Planos de Contas Padrão */}
                <div className="border rounded-lg p-3 md:p-4 bg-gradient-to-br from-indigo-50 to-white">
                  <Label className="text-sm md:text-base font-bold text-slate-900 mb-2 md:mb-3 block">
                    📋 Planos de Contas Padrão
                  </Label>
                  <p className="text-[11px] md:text-sm text-slate-600 mb-3 md:mb-4">
                    Defina os planos de contas padrão para lançamentos automáticos
                  </p>

                  <div className="space-y-3 md:space-y-4">
                    {/* Plano de Contas Padrão para Receitas de OS */}
                    <div className="p-2.5 md:p-3 border border-slate-200 rounded-lg bg-white">
                      <Label className="text-xs md:text-sm font-semibold text-black mb-1.5 md:mb-2 block">
                        Receitas de Ordem de Serviço
                      </Label>
                      <Select
                        value={config?.plano_contas_padrao_receita_os || ""}
                        onValueChange={(value) => setConfig({ ...config, plano_contas_padrao_receita_os: value })}
                      >
                        <SelectTrigger className="w-full h-9 md:h-10 text-xs md:text-sm">
                          <SelectValue placeholder={loadingPlanos ? "Carregando..." : "Selecione"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Nenhum</SelectItem>
                          {planosContas
                            .filter(p => p.tipo === 'receita')
                            .map((plano) => (
                              <SelectItem key={plano.id} value={plano.id}>
                                {plano.codigo} - {plano.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Plano de Contas Padrão para Despesas de Compras */}
                    <div className="p-2.5 md:p-3 border border-slate-200 rounded-lg bg-white">
                      <Label className="text-xs md:text-sm font-semibold text-black mb-1.5 md:mb-2 block">
                        Despesas de Compras / NF-e
                      </Label>
                      <Select
                        value={config?.plano_contas_padrao_despesa_compras || ""}
                        onValueChange={(value) => setConfig({ ...config, plano_contas_padrao_despesa_compras: value })}
                      >
                        <SelectTrigger className="w-full h-9 md:h-10 text-xs md:text-sm">
                          <SelectValue placeholder={loadingPlanos ? "Carregando..." : "Selecione"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Nenhum</SelectItem>
                          {planosContas
                            .filter(p => p.tipo === 'despesa')
                            .map((plano) => (
                              <SelectItem key={plano.id} value={plano.id}>
                                {plano.codigo} - {plano.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 13º SALÁRIO - NOVA */}
        <TabsContent value="13salario">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-xl">
                <Gift className="w-4 h-4 md:w-5 md:h-5" />
                Configurações do 13º Salário
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Regras para cálculo do décimo terceiro conforme CLT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0 md:pt-0">
              <Alert className="text-xs md:text-sm">
                <Calculator className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <AlertDescription className="text-xs md:text-sm">
                  Estas configurações afetam o cálculo automático do 13º salário.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 md:space-y-6">
                {/* Seção 1: Período de Cálculo das Médias */}
                <div className="border rounded-lg p-3 md:p-4 bg-gradient-to-br from-blue-50 to-white">
                  <Label className="text-sm md:text-base font-bold text-slate-900 mb-2 md:mb-3 block">
                    📊 Período para Cálculo de Médias
                  </Label>
                  <p className="text-[11px] md:text-sm text-slate-600 mb-3 md:mb-4">
                    Período para calcular médias de verbas variáveis no 13º
                  </p>
                  
                  <RadioGroup
                    value={config?.config_13_salario?.periodo_calculo_medias || "meses_trabalhados"}
                    onValueChange={(value) => setConfig({
                      ...config,
                      config_13_salario: {
                        ...config?.config_13_salario,
                        periodo_calculo_medias: value
                      }
                    })}
                    className="space-y-2 md:space-y-3"
                  >
                    <div className="flex items-start space-x-2 md:space-x-3 p-2.5 md:p-3 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                      <RadioGroupItem value="meses_trabalhados" id="media-trabalhados" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="media-trabalhados" className="font-semibold cursor-pointer text-black text-xs md:text-sm">
                          Meses Trabalhados (Proporcional)
                        </Label>
                        <p className="text-[10px] md:text-xs text-slate-600 mt-0.5 md:mt-1">
                          <span className="text-green-700 font-medium">Recomendado CLT</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 md:space-x-3 p-2.5 md:p-3 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                      <RadioGroupItem value="12_meses" id="media-12" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="media-12" className="font-semibold cursor-pointer text-black text-xs md:text-sm">
                          12 Meses (Fixo)
                        </Label>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 md:space-x-3 p-2.5 md:p-3 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                      <RadioGroupItem value="ano_civil" id="media-civil" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="media-civil" className="font-semibold cursor-pointer text-black text-xs md:text-sm">
                          Ano Civil (Jan-Dez)
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {/* Seção 2: Verbas a Incluir nas Médias */}
                <div className="border rounded-lg p-3 md:p-4 bg-gradient-to-br from-green-50 to-white">
                  <Label className="text-sm md:text-base font-bold text-slate-900 mb-2 md:mb-3 block">
                    💰 Verbas a Incluir nas Médias
                  </Label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                    <div className="flex items-center justify-between p-2.5 md:p-3 border border-slate-200 rounded-lg bg-white">
                      <div>
                        <Label className="font-semibold text-black cursor-pointer text-xs md:text-sm">Horas Extras</Label>
                      </div>
                      <RadioGroup
                        value={config?.config_13_salario?.incluir_horas_extras_media !== false ? "sim" : "nao"}
                        onValueChange={(value) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            incluir_horas_extras_media: value === "sim"
                          }
                        })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="sim" id="he-sim" />
                          <Label htmlFor="he-sim" className="text-[10px] md:text-xs cursor-pointer">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="nao" id="he-nao" />
                          <Label htmlFor="he-nao" className="text-[10px] md:text-xs cursor-pointer">Não</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex items-center justify-between p-2.5 md:p-3 border border-slate-200 rounded-lg bg-white">
                      <div>
                        <Label className="font-semibold text-black cursor-pointer text-xs md:text-sm">Comissões</Label>
                      </div>
                      <RadioGroup
                        value={config?.config_13_salario?.incluir_comissoes_media !== false ? "sim" : "nao"}
                        onValueChange={(value) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            incluir_comissoes_media: value === "sim"
                          }
                        })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="sim" id="com-sim" />
                          <Label htmlFor="com-sim" className="text-[10px] md:text-xs cursor-pointer">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="nao" id="com-nao" />
                          <Label htmlFor="com-nao" className="text-[10px] md:text-xs cursor-pointer">Não</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex items-center justify-between p-2.5 md:p-3 border border-slate-200 rounded-lg bg-white">
                      <div>
                        <Label className="font-semibold text-black cursor-pointer text-xs md:text-sm">Adicionais</Label>
                      </div>
                      <RadioGroup
                        value={config?.config_13_salario?.incluir_adicionais_media !== false ? "sim" : "nao"}
                        onValueChange={(value) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            incluir_adicionais_media: value === "sim"
                          }
                        })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="sim" id="ad-sim" />
                          <Label htmlFor="ad-sim" className="text-[10px] md:text-xs cursor-pointer">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="nao" id="ad-nao" />
                          <Label htmlFor="ad-nao" className="text-[10px] md:text-xs cursor-pointer">Não</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex items-center justify-between p-2.5 md:p-3 border border-slate-200 rounded-lg bg-white">
                      <div>
                        <Label className="font-semibold text-black cursor-pointer text-xs md:text-sm">Bônus</Label>
                      </div>
                      <RadioGroup
                        value={config?.config_13_salario?.incluir_bonus_media === true ? "sim" : "nao"}
                        onValueChange={(value) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            incluir_bonus_media: value === "sim"
                          }
                        })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="sim" id="bon-sim" />
                          <Label htmlFor="bon-sim" className="text-[10px] md:text-xs cursor-pointer">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="nao" id="bon-nao" />
                          <Label htmlFor="bon-nao" className="text-[10px] md:text-xs cursor-pointer">Não</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Percentual das Médias */}
                  <div className="mt-3 md:mt-4 p-2.5 md:p-3 bg-white border border-slate-200 rounded-lg">
                    <Label className="text-xs md:text-sm font-semibold text-black mb-1.5 md:mb-2 block">
                      Percentual das Médias
                    </Label>
                    <div className="flex items-center gap-2 md:gap-3">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={config?.config_13_salario?.percentual_medias_variaveis || 100}
                        onChange={(e) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            percentual_medias_variaveis: Number(e.target.value)
                          }
                        })}
                        className="w-16 md:w-24 text-black border-slate-300 h-8 md:h-10 text-xs md:text-sm"
                      />
                      <span className="text-xs md:text-sm text-slate-700 font-medium">%</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Seção 3: Regras de Faltas e Afastamentos */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-amber-50 to-white">
                  <Label className="text-base font-bold text-slate-900 mb-3 block">
                    ⚠️ Regras de Faltas e Afastamentos
                  </Label>
                  <p className="text-sm text-slate-600 mb-4">
                    Configure como o sistema deve tratar faltas injustificadas e afastamentos
                  </p>

                  <div className="space-y-4">
                    {/* Descontar Faltas dos Avos */}
                    <div className="flex items-start justify-between p-3 border border-slate-200 rounded-lg bg-white">
                      <div className="flex-1">
                        <Label className="font-semibold text-black">Descontar Faltas dos Avos</Label>
                        <p className="text-xs text-slate-600 mt-1">
                          CLT: Se o funcionário faltar mais de 15 dias no mês (injustificadas), perde o avo daquele mês
                        </p>
                      </div>
                      <RadioGroup
                        value={config?.config_13_salario?.descontar_faltas_avos !== false ? "sim" : "nao"}
                        onValueChange={(value) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            descontar_faltas_avos: value === "sim"
                          }
                        })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="sim" id="falta-sim" />
                          <Label htmlFor="falta-sim" className="text-xs cursor-pointer">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="nao" id="falta-nao" />
                          <Label htmlFor="falta-nao" className="text-xs cursor-pointer">Não</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Dias de Tolerância para Perda do Avo */}
                    <div className="p-3 border border-slate-200 rounded-lg bg-white">
                      <Label className="text-sm font-semibold text-black mb-2 block">
                        Dias de Falta para Perder o Avo do Mês
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={config?.config_13_salario?.dias_tolerancia_falta_avo || 15}
                          onChange={(e) => setConfig({
                            ...config,
                            config_13_salario: {
                              ...config?.config_13_salario,
                              dias_tolerancia_falta_avo: Number(e.target.value)
                            }
                          })}
                          className="w-24 text-black border-slate-300"
                        />
                        <span className="text-sm text-slate-700 font-medium">dias</span>
                        <p className="text-xs text-slate-600 flex-1">
                          CLT padrão: 15 dias. Se funcionário faltar mais que isso no mês, perde o avo.
                        </p>
                      </div>
                    </div>

                    {/* Considerar Afastamentos */}
                    <div className="flex items-start justify-between p-3 border border-slate-200 rounded-lg bg-white">
                      <div className="flex-1">
                        <Label className="font-semibold text-black">Considerar Afastamentos (INSS, Licenças)</Label>
                        <p className="text-xs text-slate-600 mt-1">
                          Se ativado, afastamentos longos (INSS assume após 15 dias) podem reduzir avos
                        </p>
                      </div>
                      <RadioGroup
                        value={config?.config_13_salario?.considerar_afastamentos !== false ? "sim" : "nao"}
                        onValueChange={(value) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            considerar_afastamentos: value === "sim"
                          }
                        })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="sim" id="afast-sim" />
                          <Label htmlFor="afast-sim" className="text-xs cursor-pointer">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="nao" id="afast-nao" />
                          <Label htmlFor="afast-nao" className="text-xs cursor-pointer">Não</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Dias de Afastamento para Perda */}
                    <div className="p-3 border border-slate-200 rounded-lg bg-white">
                      <Label className="text-sm font-semibold text-black mb-2 block">
                        Dias de Afastamento para Perder o Avo
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={config?.config_13_salario?.dias_afastamento_perda_avo || 15}
                          onChange={(e) => setConfig({
                            ...config,
                            config_13_salario: {
                              ...config?.config_13_salario,
                              dias_afastamento_perda_avo: Number(e.target.value)
                            }
                          })}
                          className="w-24 text-black border-slate-300"
                        />
                        <span className="text-sm text-slate-700 font-medium">dias</span>
                        <p className="text-xs text-slate-600 flex-1">
                          Normalmente 15 dias (empresa paga até 15º dia, INSS assume depois).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Seção 4: Tabelas INSS/IRRF */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white">
                  <Label className="text-base font-bold text-slate-900 mb-3 block">
                    📋 Tabelas de Encargos
                  </Label>
                  <p className="text-sm text-slate-600 mb-4">
                    Selecione as tabelas vigentes de INSS e IRRF para o ano
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-black">Tabela INSS Vigente</Label>
                      <RadioGroup
                        value={config?.config_13_salario?.tabela_inss_vigente || "2024"}
                        onValueChange={(value) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            tabela_inss_vigente: value
                          }
                        })}
                        className="flex gap-3"
                      >
                        <div className="flex items-center space-x-2 p-2 border border-slate-200 rounded-lg bg-white">
                          <RadioGroupItem value="2024" id="inss-2024" />
                          <Label htmlFor="inss-2024" className="cursor-pointer font-medium text-black">2024</Label>
                        </div>
                        <div className="flex items-center space-x-2 p-2 border border-slate-200 rounded-lg bg-white">
                          <RadioGroupItem value="2025" id="inss-2025" />
                          <Label htmlFor="inss-2025" className="cursor-pointer font-medium text-black">2025</Label>
                        </div>
                      </RadioGroup>
                      <p className="text-xs text-slate-600">
                        Teto 2024: R$ 908,86 | Teto 2025: R$ 951,63
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-black">Tabela IRRF Vigente</Label>
                      <RadioGroup
                        value={config?.config_13_salario?.tabela_irrf_vigente || "2024"}
                        onValueChange={(value) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            tabela_irrf_vigente: value
                          }
                        })}
                        className="flex gap-3"
                      >
                        <div className="flex items-center space-x-2 p-2 border border-slate-200 rounded-lg bg-white">
                          <RadioGroupItem value="2024" id="irrf-2024" />
                          <Label htmlFor="irrf-2024" className="cursor-pointer font-medium text-black">2024</Label>
                        </div>
                        <div className="flex items-center space-x-2 p-2 border border-slate-200 rounded-lg bg-white">
                          <RadioGroupItem value="2025" id="irrf-2025" />
                          <Label htmlFor="irrf-2025" className="cursor-pointer font-medium text-black">2025</Label>
                        </div>
                      </RadioGroup>
                      <p className="text-xs text-slate-600">
                        Dedução por dependente: R$ 189,59
                      </p>
                    </div>
                  </div>

                  {/* Valor Dedução Dependente */}
                  <div className="mt-4 p-3 border border-slate-200 rounded-lg bg-white">
                    <Label className="text-sm font-semibold text-black mb-2 block">
                      Valor de Dedução por Dependente (IRRF)
                    </Label>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-700 font-medium">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config?.config_13_salario?.dependentes_irrf_valor || 189.59}
                        onChange={(e) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            dependentes_irrf_valor: Number(e.target.value)
                          }
                        })}
                        className="w-32 text-black border-slate-300"
                      />
                      <p className="text-xs text-slate-600 flex-1">
                        Valor padrão 2024/2025: R$ 189,59 por dependente
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Seção 5: Outras Configurações */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-slate-50 to-white">
                  <Label className="text-base font-bold text-slate-900 mb-3 block">
                    ⚙️ Outras Configurações
                  </Label>

                  <div className="space-y-4">
                    {/* Usar Salário de Dezembro */}
                    <div className="flex items-start justify-between p-3 border border-slate-200 rounded-lg bg-white">
                      <div className="flex-1">
                        <Label className="font-semibold text-black">Usar Salário de Dezembro como Base</Label>
                        <p className="text-xs text-slate-600 mt-1">
                          Utiliza o salário de dezembro (ou mais recente) como base para cálculo do 13º
                        </p>
                      </div>
                      <RadioGroup
                        value={config?.config_13_salario?.usar_salario_dezembro !== false ? "sim" : "nao"}
                        onValueChange={(value) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            usar_salario_dezembro: value === "sim"
                          }
                        })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="sim" id="dez-sim" />
                          <Label htmlFor="dez-sim" className="text-xs cursor-pointer">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="nao" id="dez-nao" />
                          <Label htmlFor="dez-nao" className="text-xs cursor-pointer">Não</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Plano de Contas Padrão */}
                    <div className="p-3 border border-slate-200 rounded-lg bg-white">
                      <Label className="text-sm font-semibold text-black mb-2 block">
                        Plano de Contas Padrão para 13º Salário
                      </Label>
                      <Select
                        value={config?.config_13_salario?.plano_contas_padrao_13 || ""}
                        onValueChange={(value) => setConfig({
                          ...config,
                          config_13_salario: {
                            ...config?.config_13_salario,
                            plano_contas_padrao_13: value
                          }
                        })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={loadingPlanos ? "Carregando..." : "Selecione um plano de contas"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Nenhum</SelectItem>
                          {planosContas
                            .filter(p => p.tipo === 'despesa')
                            .map((plano) => (
                              <SelectItem key={plano.id} value={plano.id}>
                                {plano.codigo} - {plano.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-600 mt-1">
                        Este plano será sugerido automaticamente ao criar novos lançamentos de 13º
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resumo das Configurações */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm text-blue-900">
                      <p className="font-semibold">Resumo da Configuração Atual:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Período das médias: <strong>{
                          config?.config_13_salario?.periodo_calculo_medias === "12_meses" ? "12 meses fixo" :
                          config?.config_13_salario?.periodo_calculo_medias === "ano_civil" ? "Ano civil" :
                          "Meses trabalhados (proporcional)"
                        }</strong></li>
                        <li>• Incluir H.E.: <strong>{config?.config_13_salario?.incluir_horas_extras_media !== false ? "Sim" : "Não"}</strong></li>
                        <li>• Incluir comissões: <strong>{config?.config_13_salario?.incluir_comissoes_media !== false ? "Sim" : "Não"}</strong></li>
                        <li>• Descontar faltas: <strong>{config?.config_13_salario?.descontar_faltas_avos !== false ? "Sim (>" + (config?.config_13_salario?.dias_tolerancia_falta_avo || 15) + " dias)" : "Não"}</strong></li>
                        <li>• Tabelas: <strong>INSS {config?.config_13_salario?.tabela_inss_vigente || "2024"}</strong> | <strong>IRRF {config?.config_13_salario?.tabela_irrf_vigente || "2024"}</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA NOTIFICAÇÕES - NOVA */}
        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Configurações de Notificações por Email
              </CardTitle>
              <CardDescription>
                Configure o remetente e rodapé dos emails de notificação de tarefas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Estas configurações se aplicam aos emails de notificação de tarefas enviados pelo sistema.
                  Cada usuário pode configurar suas preferências individuais em "Meu Perfil".
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                {/* Remetente */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <Label className="text-base font-semibold mb-3 block">Configurações do Remetente</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="remetente_nome">Nome do Remetente</Label>
                      <Input
                        id="remetente_nome"
                        value={config?.config_email_tarefas?.remetente_nome || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          config_email_tarefas: {
                            ...config?.config_email_tarefas,
                            remetente_nome: e.target.value
                          }
                        })}
                        placeholder={config?.nome_empresa || 'Nome da Empresa'}
                      />
                      <p className="text-xs text-slate-500">
                        Se vazio, será usado o nome da empresa
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dias_antecedencia">Dias de Antecedência para Lembrete</Label>
                      <Input
                        id="dias_antecedencia"
                        type="number"
                        min="1"
                        max="30"
                        value={config?.config_email_tarefas?.dias_antecedencia_lembrete || 1}
                        onChange={(e) => setConfig({
                          ...config,
                          config_email_tarefas: {
                            ...config?.config_email_tarefas,
                            dias_antecedencia_lembrete: Number(e.target.value)
                          }
                        })}
                      />
                      <p className="text-xs text-slate-500">
                        Quantos dias antes do prazo enviar lembrete
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Rodapé do Email */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <Label className="text-base font-semibold mb-3 block">Rodapé dos Emails</Label>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="rodape_texto">Texto do Rodapé</Label>
                      <textarea
                        id="rodape_texto"
                        className="w-full min-h-[100px] p-3 border rounded-lg resize-none text-sm"
                        value={config?.config_email_tarefas?.rodape_texto || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          config_email_tarefas: {
                            ...config?.config_email_tarefas,
                            rodape_texto: e.target.value
                          }
                        })}
                        placeholder="Ex: Atenciosamente, Equipe de Gestão. Este é um email automático, favor não responder."
                      />
                      <p className="text-xs text-slate-500">
                        Este texto aparecerá no rodapé de todos os emails de notificação.
                        Os dados da empresa (telefone, email, endereço) são incluídos automaticamente.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white">
                      <div>
                        <Label className="font-semibold">Incluir Logo no Rodapé</Label>
                        <p className="text-xs text-slate-600">Exibe a logo da empresa nos emails (se configurada)</p>
                      </div>
                      <RadioGroup
                        value={config?.config_email_tarefas?.incluir_logo_rodape !== false ? "sim" : "nao"}
                        onValueChange={(value) => setConfig({
                          ...config,
                          config_email_tarefas: {
                            ...config?.config_email_tarefas,
                            incluir_logo_rodape: value === "sim"
                          }
                        })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="sim" id="logo-sim" />
                          <Label htmlFor="logo-sim" className="text-xs cursor-pointer">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="nao" id="logo-nao" />
                          <Label htmlFor="logo-nao" className="text-xs cursor-pointer">Não</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>

                {/* Preview do Email */}
                <div className="border rounded-lg p-4 bg-white">
                  <Label className="text-base font-semibold mb-3 block">Pré-visualização do Rodapé</Label>
                  <div className="border rounded-lg p-4 bg-slate-50 text-sm">
                    <hr className="border-slate-200 mb-4" />
                    <div className="text-center text-slate-600">
                      {config?.config_email_tarefas?.rodape_texto && (
                        <p className="mb-3">{config.config_email_tarefas.rodape_texto}</p>
                      )}
                      <p className="font-medium">{config?.nome_empresa || 'Nome da Empresa'}</p>
                      {config?.endereco && <p>{config.endereco}</p>}
                      {config?.telefone && <p>📞 {config.telefone}</p>}
                      {config?.email && <p>✉️ {config.email}</p>}
                      <p className="text-xs text-slate-400 mt-3">
                        Esta é uma notificação automática. Para alterar suas preferências, acesse o sistema.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botão de Salvar Fixo */}
      <div className={`sticky bottom-0 mt-4 md:mt-6 p-3 md:p-4 border-t shadow-lg rounded-lg transition-colors ${
        hasUnsavedChanges ? 'bg-amber-50 border-amber-200' : 'bg-white'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 md:gap-3">
            {hasUnsavedChanges ? (
              <>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <p className="text-xs md:text-sm text-amber-700 font-medium">
                  Alterações não salvas
                </p>
              </>
            ) : (
              <p className="text-xs md:text-sm text-slate-600">
                Alterações salvas
              </p>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className={`h-8 md:h-10 text-xs md:text-sm ${hasUnsavedChanges 
              ? "bg-amber-600 hover:bg-amber-700" 
              : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Configuracoes() {
  return (
    <ProtectedPage requiredModule="configuracoes">
      <ConfiguracoesPage />
    </ProtectedPage>
  );
}