import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { UFS } from '@/components/constants/ufs';
import { Search, Loader2, Check, ChevronsUpDown, User, Briefcase, MapPin, CreditCard, FileText, Phone, AlertCircle } from 'lucide-react';
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
    observacoes: ''
  });

  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [openCargo, setOpenCargo] = useState(false);
  const [openDepartamento, setOpenDepartamento] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
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
    fetchData();
  }, []);

  useEffect(() => {
    if (funcionario) {
      setFormData({
        ...funcionario,
        data_inicio: funcionario.data_inicio || '',
        data_fim_experiencia: funcionario.data_fim_experiencia || '',
        data_nascimento: funcionario.data_nascimento || '',
        salario: funcionario.salario || '',
        cargo_id: funcionario.cargo_id || '',
        departamento_id: funcionario.departamento_id || ''
      });
    } else if (candidato) {
      setFormData({
        ...formData,
        nome: candidato.nome || '',
        cpf: candidato.cpf || '',
        email: candidato.email || '',
        telefone: candidato.telefone || '',
        data_nascimento: candidato.data_nascimento || '',
        // The original `endereco` field from candidato is not directly mapped to a specific field
        // in formData, if it was a single string it should be parsed or ignored for now.
        // Assuming `endereco` from candidate is not directly mapped to a single field here.
        cargo_id: candidato.cargo_id || '',
        salario: candidato.salario_pretendido || '',
        data_fim_experiencia: candidato.periodo_experiencia 
          ? new Date(Date.now() + candidato.periodo_experiencia * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : ''
      });
    } else if (isOpen) {
      // Reset form quando abre modal para novo funcionário
      setFormData({
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
        observacoes: ''
      });
    }
  }, [funcionario, candidato, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const buscarCep = async () => {
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
          description: 'Verifique o CEP digitado',
          variant: 'destructive'
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || ''
      }));

      toast({
        title: 'Endereço encontrado!',
        description: 'Os campos foram preenchidos automaticamente'
      });
    } catch (error) {
      toast({
        title: 'Erro ao buscar CEP',
        description: 'Não foi possível consultar o CEP. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.cpf || !formData.cargo_id || !formData.data_inicio) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    // Chamar onSave, onClose será chamado pela página após sucesso
    onSave(formData);
  };

  const getCargoNome = (id) => {
    const cargo = cargos.find(c => c.id === id);
    return cargo ? cargo.nome : 'Selecione um cargo';
  };

  const getDepartamentoNome = (id) => {
    const departamento = departamentos.find(d => d.id === id);
    return departamento ? departamento.nome : 'Selecione um departamento';
  };

  // Componente auxiliar para título de seção com ícone
  const SectionTitle = ({ children, icon: Icon }) => (
    <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 text-slate-800 px-4 py-3 rounded-lg mb-4 mt-6 first:mt-0">
      {Icon && <Icon className="w-5 h-5 flex-shrink-0 text-slate-600" />}
      <h3 className="text-sm font-bold uppercase tracking-wider">{children}</h3>
    </div>
  );

  // Componente auxiliar para label obrigatório
  const RequiredLabel = ({ children, htmlFor }) => (
    <Label htmlFor={htmlFor} className="text-slate-700 font-medium text-sm flex items-center gap-1">
      {children}
      <span className="text-red-500 font-bold text-base">*</span>
    </Label>
  );

  // Componente auxiliar para label opcional
  const OptionalLabel = ({ children, htmlFor }) => (
    <Label htmlFor={htmlFor} className="text-slate-700 font-medium text-sm">
      {children}
    </Label>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto modern-modal p-0 bg-white border border-slate-200 rounded-xl">
        <DialogHeader className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{funcionario ? 'Editar Funcionário' : candidato ? 'Contratar Candidato' : 'Novo Funcionário'}</h2>
              <p className="text-xs text-slate-300 mt-0.5">Preencha os dados do funcionário</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 bg-slate-100/50">
          <Tabs defaultValue="pessoal" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-200 border border-slate-300 p-1 rounded-lg mb-4">
              <TabsTrigger value="pessoal" className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 text-xs font-semibold transition-all">
                Pessoal
              </TabsTrigger>
              <TabsTrigger value="profissional" className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 text-xs font-semibold transition-all">
                Profissional
              </TabsTrigger>
              <TabsTrigger value="endereco" className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 text-xs font-semibold transition-all">
                Endereço
              </TabsTrigger>
              <TabsTrigger value="bancario" className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 text-xs font-semibold transition-all">
                Bancário
              </TabsTrigger>
              <TabsTrigger value="observacoes" className="rounded-md bg-slate-100 text-slate-600 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-slate-50 text-xs font-semibold transition-all">
                Observações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pessoal" className="space-y-1 mt-6">
              <SectionTitle icon={User}>Informações Básicas</SectionTitle>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <div className="col-span-2">
                  <RequiredLabel htmlFor="nome">Nome Completo</RequiredLabel>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    required
                    className="modern-input mt-1.5"
                    placeholder="Digite o nome completo"
                  />
                </div>

                <div>
                  <RequiredLabel htmlFor="cpf">CPF</RequiredLabel>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => handleChange('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    required
                    className="modern-input mt-1.5"
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="rg">RG</OptionalLabel>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) => handleChange('rg', e.target.value)}
                    className="modern-input mt-1.5"
                    placeholder="00.000.000-0"
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="data_nascimento">Data de Nascimento</OptionalLabel>
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => handleChange('data_nascimento', e.target.value)}
                    className="modern-input mt-1.5"
                  />
                </div>
              </div>

              <Separator className="my-6" />

              <SectionTitle icon={Phone}>Contato</SectionTitle>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <div>
                  <OptionalLabel htmlFor="email">Email</OptionalLabel>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="modern-input mt-1.5"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="telefone">Telefone Principal</OptionalLabel>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleChange('telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="modern-input mt-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <OptionalLabel htmlFor="telefone2">Telefone Secundário</OptionalLabel>
                  <Input
                    id="telefone2"
                    value={formData.telefone2}
                    onChange={(e) => handleChange('telefone2', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="modern-input mt-1.5"
                  />
                </div>
              </div>

              <Separator className="my-6" />

              <SectionTitle icon={AlertCircle}>Contato de Emergência</SectionTitle>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <div>
                  <OptionalLabel htmlFor="contato_emergencia">Nome do Contato</OptionalLabel>
                  <Input
                    id="contato_emergencia"
                    value={formData.contato_emergencia}
                    onChange={(e) => handleChange('contato_emergencia', e.target.value)}
                    className="modern-input mt-1.5"
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="telefone_emergencia">Telefone de Emergência</OptionalLabel>
                  <Input
                    id="telefone_emergencia"
                    value={formData.telefone_emergencia}
                    onChange={(e) => handleChange('telefone_emergencia', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="modern-input mt-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <OptionalLabel htmlFor="parente_emergencia">Parentesco</OptionalLabel>
                  <Input
                    id="parente_emergencia"
                    value={formData.parente_emergencia}
                    onChange={(e) => handleChange('parente_emergencia', e.target.value)}
                    placeholder="Ex: Mãe, Pai, Cônjuge"
                    className="modern-input mt-1.5"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profissional" className="space-y-1 mt-6">
              <SectionTitle icon={Briefcase}>Cargo e Departamento</SectionTitle>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <div>
                  <RequiredLabel htmlFor="cargo">Cargo</RequiredLabel>
                  <Popover open={openCargo} onOpenChange={setOpenCargo}>
                    <PopoverTrigger asChild>
                      <Button
                        id="cargo"
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCargo}
                        className="w-full justify-between modern-input mt-1.5 h-10"
                      >
                        <span className="truncate">{getCargoNome(formData.cargo_id)}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar cargo..." className="h-10 border-0" />
                        <CommandList>
                          <CommandEmpty>Nenhum cargo encontrado.</CommandEmpty>
                          <CommandGroup>
                            {cargos.map((cargo) => (
                              <CommandItem
                                key={cargo.id}
                                value={cargo.nome}
                                onSelect={() => {
                                  handleChange('cargo_id', cargo.id);
                                  setOpenCargo(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.cargo_id === cargo.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {cargo.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <RequiredLabel htmlFor="departamento">Departamento</RequiredLabel>
                  <Popover open={openDepartamento} onOpenChange={setOpenDepartamento}>
                    <PopoverTrigger asChild>
                      <Button
                        id="departamento"
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDepartamento}
                        className="w-full justify-between modern-input mt-1.5 h-10"
                      >
                        <span className="truncate">{getDepartamentoNome(formData.departamento_id)}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar departamento..." className="h-10 border-0" />
                        <CommandList>
                          <CommandEmpty>Nenhum departamento encontrado.</CommandEmpty>
                          <CommandGroup>
                            {departamentos.map((dept) => (
                              <CommandItem
                                key={dept.id}
                                value={dept.nome}
                                onSelect={() => {
                                  handleChange('departamento_id', dept.id);
                                  setOpenDepartamento(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.departamento_id === dept.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {dept.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Separator className="my-6" />

              <SectionTitle icon={FileText}>Datas e Status</SectionTitle>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <div>
                  <RequiredLabel htmlFor="data_inicio">Data de Início</RequiredLabel>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => handleChange('data_inicio', e.target.value)}
                    required
                    className="modern-input mt-1.5"
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="data_fim_experiencia">Fim do Período de Experiência</OptionalLabel>
                  <Input
                    id="data_fim_experiencia"
                    type="date"
                    value={formData.data_fim_experiencia}
                    onChange={(e) => handleChange('data_fim_experiencia', e.target.value)}
                    className="modern-input mt-1.5"
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="status">Status</OptionalLabel>
                  <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger id="status" className="modern-input mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="experiencia">Em Experiência</SelectItem>
                      <SelectItem value="ferias">Em Férias</SelectItem>
                      <SelectItem value="afastado">Afastado</SelectItem>
                      <SelectItem value="demitido">Demitido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <OptionalLabel htmlFor="regime">Regime de Contratação</OptionalLabel>
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

              <Separator className="my-6" />

              <SectionTitle icon={CreditCard}>Remuneração</SectionTitle>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <div>
                  <RequiredLabel htmlFor="salario">Salário</RequiredLabel>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm pointer-events-none z-10">
                      R$
                    </span>
                    <Input
                      id="salario"
                      type="number"
                      step="0.01"
                      value={formData.salario}
                      onChange={(e) => handleChange('salario', e.target.value)}
                      placeholder="0,00"
                      required
                      className="modern-input pl-11"
                    />
                  </div>
                </div>

                <div>
                  <OptionalLabel htmlFor="regra_desconto_falta">Desconto por Falta</OptionalLabel>
                  <Select 
                    value={formData.regra_desconto_falta} 
                    onValueChange={(value) => handleChange('regra_desconto_falta', value)}
                  >
                    <SelectTrigger id="regra_desconto_falta" className="modern-input mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dia_cheio">Dia Completo</SelectItem>
                      <SelectItem value="horas">Por Horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <OptionalLabel htmlFor="fator_hora_extra_semana">Fator Hora Extra Semana</OptionalLabel>
                  <Input
                    id="fator_hora_extra_semana"
                    type="number"
                    step="0.1"
                    value={formData.fator_hora_extra_semana}
                    onChange={(e) => handleChange('fator_hora_extra_semana', parseFloat(e.target.value))}
                    placeholder="1.5"
                    className="modern-input mt-1.5"
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="fator_hora_extra_fds">Fator Hora Extra Fim de Semana</OptionalLabel>
                  <Input
                    id="fator_hora_extra_fds"
                    type="number"
                    step="0.1"
                    value={formData.fator_hora_extra_fds}
                    onChange={(e) => handleChange('fator_hora_extra_fds', parseFloat(e.target.value))}
                    placeholder="2"
                    className="modern-input mt-1.5"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="endereco" className="space-y-1 mt-6">
              <SectionTitle icon={Search}>Busca de Endereço</SectionTitle>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <div>
                  <OptionalLabel htmlFor="cep">CEP</OptionalLabel>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => handleChange('cep', e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      className="modern-input flex-1"
                    />
                    <Button
                      type="button"
                      variant="default"
                      size="icon"
                      onClick={buscarCep}
                      disabled={isLoadingCep}
                      title="Buscar CEP"
                      className="bg-slate-800 hover:bg-slate-700 flex-shrink-0 h-10 w-10"
                    >
                      {isLoadingCep ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
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
                      {UFS.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-6" />

              <SectionTitle icon={MapPin}>Endereço Completo</SectionTitle>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <div className="col-span-2">
                  <OptionalLabel htmlFor="logradouro">Logradouro (Rua/Avenida)</OptionalLabel>
                  <Input
                    id="logradouro"
                    value={formData.logradouro}
                    onChange={(e) => handleChange('logradouro', e.target.value)}
                    className="modern-input mt-1.5"
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="numero">Número</OptionalLabel>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => handleChange('numero', e.target.value)}
                    className="modern-input mt-1.5"
                    placeholder="123"
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="complemento">Complemento</OptionalLabel>
                  <Input
                    id="complemento"
                    value={formData.complemento}
                    onChange={(e) => handleChange('complemento', e.target.value)}
                    placeholder="Apto, Bloco, etc"
                    className="modern-input mt-1.5"
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="bairro">Bairro</OptionalLabel>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => handleChange('bairro', e.target.value)}
                    className="modern-input mt-1.5"
                    placeholder="Nome do bairro"
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="cidade">Cidade</OptionalLabel>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => handleChange('cidade', e.target.value)}
                    className="modern-input mt-1.5"
                    placeholder="Nome da cidade"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bancario" className="space-y-1 mt-6">
              <SectionTitle icon={CreditCard}>Dados Bancários</SectionTitle>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <div>
                  <OptionalLabel htmlFor="banco">Banco</OptionalLabel>
                  <Input
                    id="banco"
                    value={formData.banco}
                    onChange={(e) => handleChange('banco', e.target.value)}
                    className="modern-input mt-1.5"
                    placeholder="Nome do banco"
                  />
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
                    className="modern-input mt-1.5"
                    placeholder="0000"
                  />
                </div>

                <div>
                  <OptionalLabel htmlFor="conta">Conta</OptionalLabel>
                  <Input
                    id="conta"
                    value={formData.conta}
                    onChange={(e) => handleChange('conta', e.target.value)}
                    className="modern-input mt-1.5"
                    placeholder="00000-0"
                  />
                </div>

                <div className="col-span-2">
                  <OptionalLabel htmlFor="pix">Chave PIX</OptionalLabel>
                  <Input
                    id="pix"
                    value={formData.pix}
                    onChange={(e) => handleChange('pix', e.target.value)}
                    placeholder="CPF, email, telefone ou chave aleatória"
                    className="modern-input mt-1.5"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="observacoes" className="space-y-1 mt-6">
              <SectionTitle icon={FileText}>Observações Gerais</SectionTitle>
              
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                <OptionalLabel htmlFor="observacoes">Observações</OptionalLabel>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                  rows={12}
                  placeholder="Informações adicionais sobre o funcionário..."
                  className="modern-input mt-1.5 resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="px-6 border-slate-300 text-slate-700 hover:bg-slate-50">
              Cancelar
            </Button>
            <Button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white px-6">
              {funcionario ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}