import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import UFS from '@/components/constants/ufs';
import SmartInput from '@/components/SmartInput';
import { Search, Loader2, Check, ChevronsUpDown, User, Briefcase, MapPin, CreditCard, DollarSign, Settings, CheckCircle2, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function FuncionarioForm({ isOpen, funcionario, candidato, onSave, onClose }) {
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    data_inicio: '',
    data_fim_experiencia: '',
    status: 'experiencia',
    cargo_id: '',
    departamento_id: '',
    salario: '',
    regime: 'clt',
    user_id_relogio: '',
    email: '',
    telefone: '',
    telefone2: '',
    contato_emergencia: '',
    telefone_emergencia: '',
    parente_emergencia: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo_conta: '',
    pix: '',
    regra_desconto_falta: 'dia_cheio',
    fator_hora_extra_semana: 1.5,
    fator_hora_extra_fds: 2,
    observacoes: '',
    tem_acesso_sistema: false,
    email_acesso: '',
    usuario_id: '',
    convite_enviado_em: '',
    convite_status: ''
  });

  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openDepartamento, setOpenDepartamento] = useState(false);
  const [usuarioJaVinculado, setUsuarioJaVinculado] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [cargosData, departamentosData] = await Promise.all([
        base44.entities.Cargo.list(),
        base44.entities.Departamento.list()
      ]);
      setCargos(cargosData || []);
      setDepartamentos(departamentosData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (funcionario) {
      const jaTemUsuario = !!(funcionario.usuario_id && funcionario.usuario_id !== 'unassigned');
      setUsuarioJaVinculado(jaTemUsuario);

      setFormData({
        ...funcionario,
        data_inicio: funcionario.data_inicio || '',
        data_fim_experiencia: funcionario.data_fim_experiencia || '',
        data_nascimento: funcionario.data_nascimento || '',
        salario: funcionario.salario || '',
        cargo_id: funcionario.cargo_id || '',
        departamento_id: funcionario.departamento_id || '',
        regime: funcionario.regime || 'clt',
        status: funcionario.status || 'ativo',
        tem_acesso_sistema: funcionario.tem_acesso_sistema || false,
        email_acesso: funcionario.email_acesso || '',
        usuario_id: funcionario.usuario_id || '',
        convite_enviado_em: funcionario.convite_enviado_em || '',
        convite_status: funcionario.convite_status || ''
      });
    } else if (candidato) {
      setUsuarioJaVinculado(false);
      setFormData((prevFormData) => ({
        ...prevFormData,
        nome: candidato.nome || '',
        cpf: candidato.cpf || '',
        email: candidato.email || '',
        telefone: candidato.telefone || '',
        data_nascimento: candidato.data_nascimento || '',
        cargo_id: candidato.cargo_id || '',
        salario: candidato.salario_pretendido || '',
        data_fim_experiencia: candidato.periodo_experiencia ?
          new Date(Date.now() + candidato.periodo_experiencia * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
          ''
      }));
    } else {
      setUsuarioJaVinculado(false);
      setFormData({
        nome: '', cpf: '', rg: '', data_nascimento: '', data_inicio: '', data_fim_experiencia: '',
        status: 'experiencia', cargo_id: '', departamento_id: '', salario: '', regime: 'clt',
        user_id_relogio: '', email: '', telefone: '', telefone2: '', contato_emergencia: '', telefone_emergencia: '',
        parente_emergencia: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '',
        cidade: '', uf: '', banco: '', agencia: '', conta: '', tipo_conta: '', pix: '',
        regra_desconto_falta: 'dia_cheio', fator_hora_extra_semana: 1.5, fator_hora_extra_fds: 2,
        observacoes: '', tem_acesso_sistema: false, email_acesso: '', usuario_id: '',
        convite_enviado_em: '', convite_status: ''
      });
    }
  }, [isOpen, funcionario, candidato]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const buscarCep = async () => {
    if (!formData.cep) {
      toast({ title: 'CEP não informado', description: 'Por favor, informe o CEP.', variant: 'destructive' });
      return;
    }

    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast({
        title: 'CEP inválido',
        description: 'Digite um CEP válido com 8 dígitos',
        variant: 'destructive'
      });
      return;
    }

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: 'CEP não encontrado',
          description: 'O CEP informado não foi encontrado.',
          variant: 'destructive'
        });
        return;
      }

      setFormData((prev) => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || ''
      }));

      toast({ title: 'Endereço encontrado!', description: 'Os campos foram preenchidos automaticamente.' });
    } catch (error) {
      toast({
        title: 'Erro ao buscar CEP',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.nome || !formData.cpf || !formData.cargo_id || !formData.data_inicio) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }

    if (formData.tem_acesso_sistema && !formData.email_acesso) {
      toast({
        title: 'Email obrigatório',
        description: 'Informe o email de acesso ao sistema.',
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }

    try {
      const {
        tem_acesso_sistema,
        email_acesso,
        usuario_id,
        convite_enviado_em,
        convite_status,
        ...funcionarioBaseData
      } = formData;

      const funcionarioData = {
        ...funcionarioBaseData,
        tem_acesso_sistema,
        email_acesso: tem_acesso_sistema ? email_acesso : null,
        usuario_id: usuario_id || null,
        convite_enviado_em: convite_enviado_em || null,
        convite_status: convite_status || null
      };

      let savedFuncionario;

      if (funcionario) {
        await base44.entities.Funcionario.update(funcionario.id, funcionarioData);
        savedFuncionario = { ...funcionario, ...funcionarioData };
      } else {
        savedFuncionario = await base44.entities.Funcionario.create(funcionarioData);
      }

      if (tem_acesso_sistema && email_acesso && !usuarioJaVinculado) {
        try {
          let currentUserId = usuario_id;
          let currentConviteStatus = convite_status;
          let currentConviteEnviadoEm = convite_enviado_em;

          const usuariosExistentes = await base44.entities.User.filter({
            email: email_acesso
          });

          if (usuariosExistentes && usuariosExistentes.length > 0) {
            const existingUser = usuariosExistentes[0];
            currentUserId = existingUser.id;
            currentConviteStatus = 'aceito';
            currentConviteEnviadoEm = new Date().toISOString();

            await base44.entities.User.update(currentUserId, {
              funcionario_id: savedFuncionario.id,
              status_convite: 'aceito'
            });

            toast({
              title: 'Usuário vinculado!',
              description: `Usuário existente ${email_acesso} foi vinculado ao funcionário.`
            });
          } else {
            const novoUsuario = await base44.entities.User.create({
              email: email_acesso,
              full_name: formData.nome,
              funcionario_id: savedFuncionario.id,
              system_role: 'user',
              status_convite: 'pendente'
            });

            currentUserId = novoUsuario.id;
            currentConviteStatus = 'pendente';
            currentConviteEnviadoEm = new Date().toISOString();

            try {
              await base44.functions.invoke('enviarConviteUsuario', {
                email: email_acesso,
                nome: formData.nome,
                funcionario_id: savedFuncionario.id,
                user_id: novoUsuario.id
              });

              toast({
                title: 'Convite enviado!',
                description: `Convite de acesso enviado para ${email_acesso}`
              });
            } catch (inviteError) {
              console.error('Erro ao enviar convite:', inviteError);
              toast({
                title: 'Aviso',
                description: 'Funcionário criado, mas houve erro ao enviar convite. Tente reenviar manualmente.',
                variant: 'warning'
              });
            }
          }

          await base44.entities.Funcionario.update(savedFuncionario.id, {
            usuario_id: currentUserId,
            convite_status: currentConviteStatus,
            convite_enviado_em: currentConviteEnviadoEm
          });

          savedFuncionario = {
            ...savedFuncionario,
            usuario_id: currentUserId,
            convite_status: currentConviteStatus,
            convite_enviado_em: currentConviteEnviadoEm
          };

        } catch (userError) {
          console.error('Erro ao criar/vincular usuário:', userError);
          toast({
            title: 'Aviso',
            description: 'Funcionário salvo, mas houve erro ao criar acesso ao sistema.',
            variant: 'warning'
          });
        }
      }

      // Vincular escala padrão ao funcionário (apenas para novos)
      if (!funcionario) {
        try {
          const escalas = await base44.entities.EscalaTrabalho.filter({ escala_padrao: true, ativo: true });
          if (escalas && escalas.length > 0) {
            const escalaPadrao = escalas[0];
            await base44.entities.FuncionarioEscala.create({
              funcionario_id: savedFuncionario.id,
              escala_id: escalaPadrao.id,
              vigencia_inicio: formData.data_inicio || new Date().toISOString().split('T')[0]
            });
          }
        } catch (escalaError) {
          console.error('Erro ao vincular escala padrão:', escalaError);
          // Não bloqueia o cadastro, apenas avisa
        }
      }

      toast({
        title: funcionario ? 'Funcionário atualizado!' : 'Funcionário cadastrado!',
        description: funcionario ? 'Os dados foram atualizados com sucesso.' : 'Novo funcionário cadastrado com sucesso.'
      });

      onSave(savedFuncionario);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Não foi possível salvar o funcionário.';
      toast({
        title: 'Erro ao salvar',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDepartamentoNome = (id) => {
    const departamento = departamentos.find((d) => d.id === id);
    return departamento ? departamento.nome : 'Selecione um departamento';
  };

  const SectionTitle = ({ children, icon: Icon }) =>
    <div className="flex items-center gap-2 md:gap-3 bg-slate-800 text-white px-3 md:px-4 py-2 md:py-3 rounded-lg mb-3 md:mb-4 mt-4 md:mt-6 first:mt-0 shadow-sm">
      {Icon && <Icon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />}
      <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider">{children}</h3>
    </div>;

  const RequiredLabel = ({ children, htmlFor }) =>
    <Label htmlFor={htmlFor} className="text-slate-700 font-medium text-sm flex items-center gap-1">
      {children}
      <span className="text-red-500 font-bold text-base">*</span>
    </Label>;

  const OptionalLabel = ({ children, htmlFor }) =>
    <Label htmlFor={htmlFor} className="text-slate-700 font-medium text-sm">
      {children}
    </Label>;

  return (
    <>
      <style>{`
        .funcionario-form-scroll {
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
        }

        .funcionario-form-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .funcionario-form-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .funcionario-form-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.3);
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .funcionario-form-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.5);
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col modern-modal p-0">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <DialogHeader className="px-3 md:px-6 py-3 md:py-4 bg-slate-800 text-white border-b border-slate-700 rounded-t-lg">
              <DialogTitle className="text-base md:text-xl font-bold text-white">
                {funcionario ? 'Editar Funcionário' : 'Novo Funcionário'}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="pessoal" className="flex-1 overflow-hidden flex flex-col px-3 md:px-6 mt-2 md:mt-4">
              <TabsList className="grid grid-cols-5 bg-slate-100 p-0.5 md:p-1 rounded-lg mb-2 md:mb-4 h-auto">
                <TabsTrigger value="pessoal" className="text-[10px] md:text-xs flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 py-1.5 md:py-2 px-1">
                  <User className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">Pessoal</span><span className="sm:hidden">Pessoal</span>
                </TabsTrigger>
                <TabsTrigger value="profissional" className="text-[10px] md:text-xs flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 py-1.5 md:py-2 px-1">
                  <Briefcase className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">Profissional</span><span className="sm:hidden">Prof.</span>
                </TabsTrigger>
                <TabsTrigger value="endereco" className="text-[10px] md:text-xs flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 py-1.5 md:py-2 px-1">
                  <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">Endereço</span><span className="sm:hidden">End.</span>
                </TabsTrigger>
                <TabsTrigger value="bancario" className="text-[10px] md:text-xs flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 py-1.5 md:py-2 px-1">
                  <CreditCard className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">Bancário</span><span className="sm:hidden">Banco</span>
                </TabsTrigger>
                <TabsTrigger value="acesso" className="text-[10px] md:text-xs flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 py-1.5 md:py-2 px-1">
                  <Settings className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">Acesso</span><span className="sm:hidden">Acesso</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2 pb-4 funcionario-form-scroll">
                <TabsContent value="pessoal" className="space-y-3 md:space-y-4 mt-0">
                  <SectionTitle icon={User}>Dados Pessoais</SectionTitle>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <RequiredLabel htmlFor="nome">Nome Completo</RequiredLabel>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => handleChange('nome', e.target.value)}
                        required className="text-slate-950 mt-1.5 modern-input"
                        placeholder="Digite o nome completo" />
                    </div>

                    <div>
                      <RequiredLabel htmlFor="cpf">CPF</RequiredLabel>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => handleChange('cpf', e.target.value)}
                        placeholder="000.000.000-00"
                        required className="text-slate-950 mt-1.5 modern-input" />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="rg">RG</OptionalLabel>
                      <Input
                        id="rg"
                        value={formData.rg}
                        onChange={(e) => handleChange('rg', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input"
                        placeholder="00.000.000-0" />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="data_nascimento">Data de Nascimento</OptionalLabel>
                      <Input
                        id="data_nascimento"
                        type="date"
                        value={formData.data_nascimento}
                        onChange={(e) => handleChange('data_nascimento', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input" />
                    </div>
                  </div>

                  <SectionTitle icon={Phone}>Contatos</SectionTitle>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <OptionalLabel htmlFor="email">Email</OptionalLabel>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input"
                        placeholder="email@exemplo.com" />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="telefone">Telefone</OptionalLabel>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => handleChange('telefone', e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="text-slate-950 mt-1.5 modern-input" />
                    </div>

                    <div className="col-span-2">
                      <OptionalLabel htmlFor="telefone2">Telefone 2</OptionalLabel>
                      <Input
                        id="telefone2"
                        value={formData.telefone2}
                        onChange={(e) => handleChange('telefone2', e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="text-slate-950 mt-1.5 modern-input" />
                    </div>
                  </div>

                  <SectionTitle icon={Phone}>Contato de Emergência</SectionTitle>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <OptionalLabel htmlFor="contato_emergencia">Nome do Contato</OptionalLabel>
                      <Input
                        id="contato_emergencia"
                        value={formData.contato_emergencia}
                        onChange={(e) => handleChange('contato_emergencia', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input"
                        placeholder="Nome completo" />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="telefone_emergencia">Telefone</OptionalLabel>
                      <Input
                        id="telefone_emergencia"
                        value={formData.telefone_emergencia}
                        onChange={(e) => handleChange('telefone_emergencia', e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="text-slate-950 mt-1.5 modern-input" />
                    </div>

                    <div className="col-span-2">
                      <OptionalLabel htmlFor="parente_emergencia">Parentesco</OptionalLabel>
                      <Input
                        id="parente_emergencia"
                        value={formData.parente_emergencia}
                        onChange={(e) => handleChange('parente_emergencia', e.target.value)}
                        placeholder="Ex: Mãe, Pai, Cônjuge"
                        className="text-slate-950 mt-1.5 modern-input" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="profissional" className="space-y-3 md:space-y-4 mt-0">
                  <SectionTitle icon={Briefcase}>Informações Profissionais</SectionTitle>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <RequiredLabel htmlFor="cargo_id">Cargo</RequiredLabel>
                      <SmartInput
                        value={formData.cargo_id}
                        onChange={(value) => handleChange('cargo_id', value)}
                        options={cargos.map(c => ({ value: c.id, label: c.nome }))}
                        placeholder="Selecione um cargo..."
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="user_id_relogio">ID do Relógio de Ponto (EnNo)</OptionalLabel>
                      <Input
                        id="user_id_relogio"
                        type="text"
                        value={formData.user_id_relogio || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          handleChange('user_id_relogio', value);
                        }}
                        placeholder="Ex: 1, 13, 8..."
                        maxLength={10}
                        className="text-slate-950 mt-1.5 modern-input font-mono"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        ID numérico do funcionário no relógio de ponto (EnNo). Obrigatório para importação de batidas.
                      </p>
                    </div>

                    <div>
                      <RequiredLabel htmlFor="departamento_id">Departamento</RequiredLabel>
                      <Popover open={openDepartamento} onOpenChange={setOpenDepartamento}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openDepartamento}
                            className="w-full justify-between text-slate-950 modern-input mt-1.5 h-10">
                            <span className="truncate">{getDepartamentoNome(formData.departamento_id)}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Buscar departamento..." />
                            <CommandList>
                              <CommandEmpty>Nenhum departamento encontrado.</CommandEmpty>
                              <CommandGroup>
                                {departamentos.map((dept) =>
                                  <CommandItem
                                    key={dept.id}
                                    value={dept.nome}
                                    onSelect={() => {
                                      handleChange('departamento_id', dept.id);
                                      setOpenDepartamento(false);
                                    }}
                                    className="cursor-pointer">
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.departamento_id === dept.id ? "opacity-100" : "opacity-0"
                                      )} />
                                    {dept.nome}
                                  </CommandItem>
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <RequiredLabel htmlFor="status">Status</RequiredLabel>
                      <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                        <SelectTrigger id="status" className="modern-input mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="experiencia">Em Experiência</SelectItem>
                          <SelectItem value="ferias">Férias</SelectItem>
                          <SelectItem value="afastado">Afastado</SelectItem>
                          <SelectItem value="demitido">Demitido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <RequiredLabel htmlFor="data_inicio">Data de Início</RequiredLabel>
                      <Input
                        id="data_inicio"
                        type="date"
                        value={formData.data_inicio}
                        onChange={(e) => handleChange('data_inicio', e.target.value)}
                        required
                        className="text-slate-950 mt-1.5 modern-input" />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="data_fim_experiencia">Fim da Experiência</OptionalLabel>
                      <Input
                        id="data_fim_experiencia"
                        type="date"
                        value={formData.data_fim_experiencia}
                        onChange={(e) => handleChange('data_fim_experiencia', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input" />
                    </div>

                    <div>
                      <RequiredLabel htmlFor="regime">Regime de Contratação</RequiredLabel>
                      <Select value={formData.regime} onValueChange={(value) => handleChange('regime', value)}>
                        <SelectTrigger id="regime" className="modern-input mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clt">CLT</SelectItem>
                          <SelectItem value="pj">PJ</SelectItem>
                          <SelectItem value="estagio">Estágio</SelectItem>
                          <SelectItem value="aprendiz">Aprendiz</SelectItem>
                          <SelectItem value="temporario">Temporário</SelectItem>
                          <SelectItem value="terceirizado">Terceirizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <SectionTitle icon={DollarSign}>Remuneração e Benefícios</SectionTitle>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <RequiredLabel htmlFor="salario">Salário Bruto</RequiredLabel>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">R$</span>
                        <Input
                          id="salario"
                          type="number"
                          step="0.01"
                          value={formData.salario}
                          onChange={(e) => handleChange('salario', e.target.value)}
                          placeholder="0,00"
                          required
                          className="text-slate-950 modern-input pl-11" />
                      </div>
                    </div>

                    <div>
                      <OptionalLabel htmlFor="regra_desconto_falta">Desconto por Falta</OptionalLabel>
                      <Select
                        value={formData.regra_desconto_falta}
                        onValueChange={(value) => handleChange('regra_desconto_falta', value)}>
                        <SelectTrigger id="regra_desconto_falta" className="modern-input mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dia_cheio">Dia Cheio</SelectItem>
                          <SelectItem value="horas">Por Horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <OptionalLabel htmlFor="fator_hora_extra_semana">Fator H.E. Semana</OptionalLabel>
                      <Input
                        id="fator_hora_extra_semana"
                        type="number"
                        step="0.1"
                        value={formData.fator_hora_extra_semana}
                        onChange={(e) => handleChange('fator_hora_extra_semana', parseFloat(e.target.value))}
                        placeholder="1.5"
                        className="text-slate-950 mt-1.5 modern-input" />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="fator_hora_extra_fds">Fator H.E. FDS/Feriado</OptionalLabel>
                      <Input
                        id="fator_hora_extra_fds"
                        type="number"
                        step="0.1"
                        value={formData.fator_hora_extra_fds}
                        onChange={(e) => handleChange('fator_hora_extra_fds', parseFloat(e.target.value))}
                        placeholder="2"
                        className="text-slate-950 mt-1.5 modern-input" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="endereco" className="space-y-3 md:space-y-4 mt-0">
                  <SectionTitle icon={MapPin}>Endereço Residencial</SectionTitle>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <div>
                      <OptionalLabel htmlFor="cep">CEP</OptionalLabel>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          id="cep"
                          value={formData.cep}
                          onChange={(e) => handleChange('cep', e.target.value)}
                          placeholder="00000-000"
                          maxLength={9}
                          className="text-slate-950 modern-input flex-1" />
                        <Button
                          type="button"
                          variant="default"
                          size="icon"
                          onClick={buscarCep}
                          disabled={isLoadingCep}
                          title="Buscar CEP"
                          className="bg-slate-800 hover:bg-slate-700 flex-shrink-0 h-10 w-10">
                          {isLoadingCep ?
                            <Loader2 className="h-4 w-4 animate-spin" /> :
                            <Search className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </div>

                    <div>
                      <OptionalLabel htmlFor="uf">UF</OptionalLabel>
                      <Select value={formData.uf} onValueChange={(value) => handleChange('uf', value)}>
                        <SelectTrigger id="uf" className="modern-input mt-1.5">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {UFS.map((uf) =>
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <OptionalLabel htmlFor="cidade">Cidade</OptionalLabel>
                      <Input
                        id="cidade"
                        value={formData.cidade}
                        onChange={(e) => handleChange('cidade', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input"
                        placeholder="Nome da cidade" />
                    </div>

                    <div className="col-span-2">
                      <OptionalLabel htmlFor="logradouro">Logradouro</OptionalLabel>
                      <Input
                        id="logradouro"
                        value={formData.logradouro}
                        onChange={(e) => handleChange('logradouro', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input"
                        placeholder="Rua, Avenida, etc." />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="numero">Número</OptionalLabel>
                      <Input
                        id="numero"
                        value={formData.numero}
                        onChange={(e) => handleChange('numero', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input"
                        placeholder="123" />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="complemento">Complemento</OptionalLabel>
                      <Input
                        id="complemento"
                        value={formData.complemento}
                        onChange={(e) => handleChange('complemento', e.target.value)}
                        placeholder="Apto, Bloco, etc"
                        className="text-slate-950 mt-1.5 modern-input" />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="bairro">Bairro</OptionalLabel>
                      <Input
                        id="bairro"
                        value={formData.bairro}
                        onChange={(e) => handleChange('bairro', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input"
                        placeholder="Nome do bairro" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bancario" className="space-y-3 md:space-y-4 mt-0">
                  <SectionTitle icon={CreditCard}>Dados Bancários</SectionTitle>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <OptionalLabel htmlFor="banco">Banco</OptionalLabel>
                      <Input
                        id="banco"
                        value={formData.banco}
                        onChange={(e) => handleChange('banco', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input"
                        placeholder="Nome do banco" />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="tipo_conta">Tipo de Conta</OptionalLabel>
                      <Select value={formData.tipo_conta} onValueChange={(value) => handleChange('tipo_conta', value)}>
                        <SelectTrigger id="tipo_conta" className="modern-input mt-1.5">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corrente">Corrente</SelectItem>
                          <SelectItem value="poupanca">Poupança</SelectItem>
                          <SelectItem value="salario">Salário</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <OptionalLabel htmlFor="agencia">Agência</OptionalLabel>
                      <Input
                        id="agencia"
                        value={formData.agencia}
                        onChange={(e) => handleChange('agencia', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input"
                        placeholder="0000" />
                    </div>

                    <div>
                      <OptionalLabel htmlFor="conta">Conta</OptionalLabel>
                      <Input
                        id="conta"
                        value={formData.conta}
                        onChange={(e) => handleChange('conta', e.target.value)}
                        className="text-slate-950 mt-1.5 modern-input"
                        placeholder="00000-0" />
                    </div>

                    <div className="col-span-2">
                      <OptionalLabel htmlFor="pix">Chave PIX</OptionalLabel>
                      <Input
                        id="pix"
                        value={formData.pix}
                        onChange={(e) => handleChange('pix', e.target.value)}
                        placeholder="CPF, email, telefone ou chave aleatória"
                        className="text-slate-950 mt-1.5 modern-input" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="acesso" className="space-y-3 md:space-y-4 mt-0">
                  <SectionTitle icon={Settings}>Configurações de Acesso ao Sistema</SectionTitle>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg border">
                      <Checkbox
                        id="tem_acesso_sistema"
                        checked={formData.tem_acesso_sistema}
                        onCheckedChange={(checked) => {
                          handleChange('tem_acesso_sistema', checked);
                          if (!checked) {
                            handleChange('email_acesso', '');
                          }
                        }}
                        disabled={usuarioJaVinculado}
                        className={usuarioJaVinculado ? "opacity-50 cursor-not-allowed" : ""} />
                      <Label
                        htmlFor="tem_acesso_sistema"
                        className={`font-medium ${usuarioJaVinculado ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                        Este funcionário terá acesso ao sistema
                      </Label>
                    </div>

                    {usuarioJaVinculado &&
                      <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800 text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            ✅ <strong>Usuário já vinculado ao sistema.</strong> Não é possível alterar as configurações de acesso.
                          </span>
                        </AlertDescription>
                      </Alert>
                    }

                    {formData.tem_acesso_sistema &&
                      <div className="space-y-4 pt-4 border-t">
                        <div>
                          <RequiredLabel htmlFor="email_acesso">Email de Acesso ao Sistema</RequiredLabel>
                          <div className="flex gap-2 mt-1.5">
                            <Mail className="w-5 h-5 text-slate-400 mt-2" />
                            <Input
                              id="email_acesso"
                              type="email"
                              value={formData.email_acesso}
                              onChange={(e) => handleChange('email_acesso', e.target.value)}
                              placeholder="email@exemplo.com"
                              className="text-slate-950 modern-input flex-1"
                              required={formData.tem_acesso_sistema}
                              disabled={usuarioJaVinculado} />
                          </div>
                          {!usuarioJaVinculado ?
                            <p className="text-xs text-gray-500 mt-2">
                              Este será o email usado para login. Um convite será enviado automaticamente após salvar.
                            </p> :
                            <p className="text-xs text-green-600 mt-2 font-medium">
                              ✅ Email já cadastrado e convite enviado. Não é possível alterar.
                            </p>
                          }
                        </div>

                        {formData.convite_status &&
                          <Alert className={
                            formData.convite_status === 'aceito' ? 'bg-green-50 border-green-200' :
                              formData.convite_status === 'pendente' ? 'bg-yellow-50 border-yellow-200' :
                                'bg-gray-50 border-gray-200'
                          }>
                            <AlertDescription className="text-sm">
                              <strong>Status do Convite:</strong> {
                                formData.convite_status === 'aceito' ? '✅ Aceito' :
                                  formData.convite_status === 'pendente' ? '⏳ Pendente' :
                                    '❌ Expirado/Cancelado'
                              }
                              {formData.convite_enviado_em &&
                                <span className="block text-xs mt-1 text-slate-600">
                                  Enviado em: {new Date(formData.convite_enviado_em).toLocaleString('pt-BR')}
                                </span>
                              }
                            </AlertDescription>
                          </Alert>
                        }
                      </div>
                    }
                  </div>

                  <div className="mt-6">
                    <OptionalLabel htmlFor="observacoes">Observações</OptionalLabel>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => handleChange('observacoes', e.target.value)}
                      rows={12}
                      placeholder="Informações adicionais sobre o funcionário..."
                      className="text-slate-950 mt-1.5 modern-input resize-none" />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="gap-2 md:gap-3 px-3 md:px-6 py-3 md:py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex-col-reverse sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose} className="border-2 border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold px-4 md:px-6 w-full sm:w-auto text-sm" disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 md:px-6 w-full sm:w-auto text-sm" disabled={isLoading}>
                {isLoading ?
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                  null}
                {funcionario ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}