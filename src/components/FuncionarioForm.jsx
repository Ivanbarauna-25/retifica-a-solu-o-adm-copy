import React, { useEffect, useMemo, useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import UFS from "@/components/constants/ufs";
import SmartInput from "@/components/SmartInput";

import { cn } from "@/lib/utils";

import {
  Check,
  ChevronsUpDown,
  Loader2,
  Search,
  User,
  Briefcase,
  MapPin,
  CreditCard,
  Settings,
  Mail,
} from "lucide-react";

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeMoneyInput(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s === "") return "";
  return s;
}

export default function FuncionarioForm({ isOpen, funcionario, candidato, onSave, onClose }) {
  const { toast } = useToast();

  const initialForm = useMemo(
    () => ({
      // Pessoal
      nome: "",
      cpf: "",
      rg: "",
      data_nascimento: "",

      // Profissional
      data_inicio: "",
      data_fim_experiencia: "",
      status: "experiencia",
      cargo_id: "",
      departamento_id: "",
      salario: "",
      regime: "clt",

      // >>> ESSENCIAL PARA O PONTO (EnNo do relógio)
      user_id_relogio: "",

      // Contato
      email: "",
      telefone: "",
      telefone2: "",
      contato_emergencia: "",
      telefone_emergencia: "",
      parente_emergencia: "",

      // Endereço
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",

      // Bancário
      banco: "",
      agencia: "",
      conta: "",
      tipo_conta: "",
      pix: "",

      // Regras / Ponto / Folha
      regra_desconto_falta: "dia_cheio",
      fator_hora_extra_semana: 1.5,
      fator_hora_extra_fds: 2,

      // Observações
      observacoes: "",

      // Acesso
      tem_acesso_sistema: false,
      email_acesso: "",
      usuario_id: "",
      convite_enviado_em: "",
      convite_status: "",
    }),
    []
  );

  const [formData, setFormData] = useState(initialForm);

  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);

  const [openDepartamento, setOpenDepartamento] = useState(false);
  const [usuarioJaVinculado, setUsuarioJaVinculado] = useState(false);

  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar combos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cargosData, departamentosData] = await Promise.all([
          base44.entities.Cargo.list(),
          base44.entities.Departamento.list(),
        ]);
        setCargos(cargosData || []);
        setDepartamentos(departamentosData || []);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };

    fetchData();
  }, []);

  // Popular formulário (editar / candidato / novo)
  useEffect(() => {
    if (!isOpen) return;

    if (funcionario) {
      const jaTemUsuario = !!(funcionario.usuario_id && funcionario.usuario_id !== "unassigned");
      setUsuarioJaVinculado(jaTemUsuario);

      setFormData({
        ...initialForm,
        ...funcionario,

        data_inicio: funcionario.data_inicio || "",
        data_fim_experiencia: funcionario.data_fim_experiencia || "",
        data_nascimento: funcionario.data_nascimento || "",

        salario: normalizeMoneyInput(funcionario.salario ?? ""),

        cargo_id: funcionario.cargo_id || "",
        departamento_id: funcionario.departamento_id || "",

        regime: funcionario.regime || "clt",
        status: funcionario.status || "ativo",

        // >>> importante
        user_id_relogio: onlyDigits(funcionario.user_id_relogio),

        tem_acesso_sistema: !!funcionario.tem_acesso_sistema,
        email_acesso: funcionario.email_acesso || "",
        usuario_id: funcionario.usuario_id || "",
        convite_enviado_em: funcionario.convite_enviado_em || "",
        convite_status: funcionario.convite_status || "",
      });
      return;
    }

    if (candidato) {
      setUsuarioJaVinculado(false);
      setFormData((prev) => ({
        ...prev,
        ...initialForm,
        nome: candidato.nome || "",
        cpf: candidato.cpf || "",
        email: candidato.email || "",
        telefone: candidato.telefone || "",
        data_nascimento: candidato.data_nascimento || "",
        cargo_id: candidato.cargo_id || "",
        salario: normalizeMoneyInput(candidato.salario_pretendido ?? ""),
        data_fim_experiencia: candidato.periodo_experiencia
          ? new Date(Date.now() + candidato.periodo_experiencia * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          : "",
      }));
      return;
    }

    setUsuarioJaVinculado(false);
    setFormData(initialForm);
  }, [isOpen, funcionario, candidato, initialForm]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getDepartamentoNome = (id) => {
    const departamento = departamentos.find((d) => d.id === id);
    return departamento ? departamento.nome : "Selecione um departamento";
  };

  const buscarCep = async () => {
    if (!formData.cep) {
      toast({
        title: "CEP não informado",
        description: "Por favor, informe o CEP.",
        variant: "destructive",
      });
      return;
    }

    const cep = onlyDigits(formData.cep);
    if (cep.length !== 8) {
      toast({
        title: "CEP inválido",
        description: "Digite um CEP válido com 8 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "O CEP informado não foi encontrado.",
          variant: "destructive",
        });
        return;
      }

      setFormData((prev) => ({
        ...prev,
        logradouro: data.logradouro || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        uf: data.uf || "",
      }));

      toast({
        title: "Endereço encontrado",
        description: "Os campos foram preenchidos automaticamente.",
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: error?.message || "Falha ao consultar CEP.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  // >>> validação objetiva do ID do relógio (EnNo)
  const validateUserIdRelogio = () => {
    const v = onlyDigits(formData.user_id_relogio);
    if (!v) return true; // opcional — você pode tornar obrigatório depois
    if (!/^\d+$/.test(v)) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.nome || !formData.cpf || !formData.cargo_id || !formData.data_inicio) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha Nome, CPF, Cargo e Data de Início.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!validateUserIdRelogio()) {
      toast({
        title: "ID do relógio inválido",
        description: "O campo ID do relógio (EnNo) aceita apenas números.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (formData.tem_acesso_sistema && !formData.email_acesso) {
      toast({
        title: "Email obrigatório",
        description: "Informe o email de acesso ao sistema.",
        variant: "destructive",
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

        // normalizações seguras
        salario: formData.salario === "" ? null : Number(formData.salario),
        fator_hora_extra_semana:
          formData.fator_hora_extra_semana === "" ? 1.5 : Number(formData.fator_hora_extra_semana),
        fator_hora_extra_fds: formData.fator_hora_extra_fds === "" ? 2 : Number(formData.fator_hora_extra_fds),

        // >>> garantir que vá como string numérica
        user_id_relogio: onlyDigits(formData.user_id_relogio) || null,

        tem_acesso_sistema,
        email_acesso: tem_acesso_sistema ? email_acesso : null,
        usuario_id: usuario_id || null,
        convite_enviado_em: convite_enviado_em || null,
        convite_status: convite_status || null,
      };

      let savedFuncionario;

      if (funcionario) {
        await base44.entities.Funcionario.update(funcionario.id, funcionarioData);
        savedFuncionario = { ...funcionario, ...funcionarioData };
      } else {
        savedFuncionario = await base44.entities.Funcionario.create(funcionarioData);
      }

      // Acesso ao sistema (mantido)
      if (tem_acesso_sistema && email_acesso && !usuarioJaVinculado) {
        try {
          let currentUserId = usuario_id || null;
          let currentConviteStatus = convite_status || null;
          let currentConviteEnviadoEm = convite_enviado_em || null;

          const usuariosExistentes = await base44.entities.User.filter({ email: email_acesso });

          if (usuariosExistentes && usuariosExistentes.length > 0) {
            const existingUser = usuariosExistentes[0];
            currentUserId = existingUser.id;
            currentConviteStatus = "aceito";
            currentConviteEnviadoEm = new Date().toISOString();

            await base44.entities.User.update(currentUserId, {
              funcionario_id: savedFuncionario.id,
              status_convite: "aceito",
            });

            toast({
              title: "Usuário vinculado",
              description: `Usuário existente (${email_acesso}) foi vinculado ao funcionário.`,
            });
          } else {
            const novoUsuario = await base44.entities.User.create({
              email: email_acesso,
              full_name: formData.nome,
              funcionario_id: savedFuncionario.id,
              system_role: "user",
              status_convite: "pendente",
            });

            currentUserId = novoUsuario.id;
            currentConviteStatus = "pendente";
            currentConviteEnviadoEm = new Date().toISOString();

            try {
              await base44.functions.invoke("enviarConviteUsuario", {
                email: email_acesso,
                nome: formData.nome,
                funcionario_id: savedFuncionario.id,
                user_id: novoUsuario.id,
              });

              toast({
                title: "Convite enviado",
                description: `Convite de acesso enviado para ${email_acesso}`,
              });
            } catch (inviteError) {
              console.error("Erro ao enviar convite:", inviteError);
              toast({
                title: "Aviso",
                description:
                  "Funcionário criado, mas houve erro ao enviar convite. Você pode reenviar depois.",
                variant: "warning",
              });
            }
          }

          await base44.entities.Funcionario.update(savedFuncionario.id, {
            usuario_id: currentUserId,
            convite_status: currentConviteStatus,
            convite_enviado_em: currentConviteEnviadoEm,
          });

          savedFuncionario = {
            ...savedFuncionario,
            usuario_id: currentUserId,
            convite_status: currentConviteStatus,
            convite_enviado_em: currentConviteEnviadoEm,
          };
        } catch (userError) {
          console.error("Erro ao criar/vincular usuário:", userError);
          toast({
            title: "Aviso",
            description: "Funcionário salvo, mas houve erro ao configurar acesso ao sistema.",
            variant: "warning",
          });
        }
      }

      toast({
        title: funcionario ? "Funcionário atualizado" : "Funcionário cadastrado",
        description: funcionario ? "Os dados foram atualizados com sucesso." : "Novo funcionário cadastrado com sucesso.",
      });

      onSave?.(savedFuncionario);
      onClose?.();
    } catch (error) {
      console.error("Erro ao salvar funcionário:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Não foi possível salvar o funcionário.";
      toast({
        title: "Erro ao salvar",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const SectionTitle = ({ children, icon: Icon }) => (
    <div className="flex items-center gap-2 mb-3 mt-2">
      {Icon ? <div className="p-2 rounded-lg bg-slate-100 border"><Icon className="w-4 h-4 text-slate-700" /></div> : null}
      <h3 className="text-sm font-semibold text-slate-900">{children}</h3>
    </div>
  );

  const RequiredLabel = ({ children, htmlFor }) => (
    <Label htmlFor={htmlFor} className="text-xs font-medium text-slate-700">
      {children} <span className="text-red-600">*</span>
    </Label>
  );

  const OptionalLabel = ({ children, htmlFor }) => (
    <Label htmlFor={htmlFor} className="text-xs font-medium text-slate-700">
      {children}
    </Label>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogContent className="max-w-4xl w-[96vw] max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <DialogTitle className="text-sm md:text-lg font-bold">
            {funcionario ? "Editar Funcionário" : "Novo Funcionário"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            <Tabs defaultValue="pessoal" className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="pessoal" className="text-xs">Pessoal</TabsTrigger>
                <TabsTrigger value="profissional" className="text-xs">Prof.</TabsTrigger>
                <TabsTrigger value="endereco" className="text-xs">End.</TabsTrigger>
                <TabsTrigger value="bancario" className="text-xs">Banco</TabsTrigger>
                <TabsTrigger value="acesso" className="text-xs">Acesso</TabsTrigger>
              </TabsList>

              {/* PESSOAL */}
              <TabsContent value="pessoal" className="mt-4 space-y-4">
                <SectionTitle icon={User}>Dados Pessoais</SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <RequiredLabel htmlFor="nome">Nome Completo</RequiredLabel>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleChange("nome", e.target.value)}
                      required
                      className="mt-1.5"
                      placeholder="Digite o nome completo"
                    />
                  </div>

                  <div>
                    <RequiredLabel htmlFor="cpf">CPF</RequiredLabel>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleChange("cpf", e.target.value)}
                      placeholder="000.000.000-00"
                      required
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="rg">RG</OptionalLabel>
                    <Input
                      id="rg"
                      value={formData.rg || ""}
                      onChange={(e) => handleChange("rg", e.target.value)}
                      className="mt-1.5"
                      placeholder="00.000.000-0"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="data_nascimento">Data de Nascimento</OptionalLabel>
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={formData.data_nascimento || ""}
                      onChange={(e) => handleChange("data_nascimento", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <SectionTitle icon={Mail}>Contatos</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <OptionalLabel htmlFor="email">Email</OptionalLabel>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="mt-1.5"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="telefone">Telefone</OptionalLabel>
                    <Input
                      id="telefone"
                      value={formData.telefone || ""}
                      onChange={(e) => handleChange("telefone", e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="telefone2">Telefone 2</OptionalLabel>
                    <Input
                      id="telefone2"
                      value={formData.telefone2 || ""}
                      onChange={(e) => handleChange("telefone2", e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <SectionTitle icon={Search}>Contato de Emergência</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <OptionalLabel htmlFor="contato_emergencia">Nome do Contato</OptionalLabel>
                    <Input
                      id="contato_emergencia"
                      value={formData.contato_emergencia || ""}
                      onChange={(e) => handleChange("contato_emergencia", e.target.value)}
                      className="mt-1.5"
                      placeholder="Nome completo"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="telefone_emergencia">Telefone</OptionalLabel>
                    <Input
                      id="telefone_emergencia"
                      value={formData.telefone_emergencia || ""}
                      onChange={(e) => handleChange("telefone_emergencia", e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="parente_emergencia">Parentesco</OptionalLabel>
                    <Input
                      id="parente_emergencia"
                      value={formData.parente_emergencia || ""}
                      onChange={(e) => handleChange("parente_emergencia", e.target.value)}
                      placeholder="Ex: Mãe, Pai, Cônjuge"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* PROFISSIONAL */}
              <TabsContent value="profissional" className="mt-4 space-y-4">
                <SectionTitle icon={Briefcase}>Informações Profissionais</SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <RequiredLabel htmlFor="cargo_id">Cargo</RequiredLabel>
                    <div className="mt-1.5">
                      <SmartInput
                        value={formData.cargo_id}
                        onChange={(value) => handleChange("cargo_id", value)}
                        options={(cargos || []).map((c) => ({ value: c.id, label: c.nome }))}
                        placeholder="Selecione um cargo..."
                      />
                    </div>
                  </div>

                  <div>
                    <OptionalLabel htmlFor="departamento_id">Departamento</OptionalLabel>
                    <Popover open={openDepartamento} onOpenChange={setOpenDepartamento}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={openDepartamento}
                          className="w-full justify-between mt-1.5"
                        >
                          <span className="truncate">{getDepartamentoNome(formData.departamento_id)}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[340px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar departamento..." />
                          <CommandList>
                            <CommandEmpty>Nenhum departamento encontrado.</CommandEmpty>
                            <CommandGroup>
                              {(departamentos || []).map((dept) => (
                                <CommandItem
                                  key={dept.id}
                                  value={dept.nome}
                                  onSelect={() => {
                                    handleChange("departamento_id", dept.id);
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

                  {/* >>> CAMPO NOVO: ID do relógio (EnNo) */}
                  <div>
                    <OptionalLabel htmlFor="user_id_relogio">ID do Relógio (EnNo)</OptionalLabel>
                    <Input
                      id="user_id_relogio"
                      value={formData.user_id_relogio || ""}
                      onChange={(e) => handleChange("user_id_relogio", onlyDigits(e.target.value))}
                      className="mt-1.5 font-mono"
                      placeholder="Ex: 13"
                      inputMode="numeric"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Use o mesmo número que aparece no relógio/exportação (coluna <strong>EnNo</strong>). Ex.: 1, 12, 13...
                    </p>
                  </div>

                  <div>
                    <RequiredLabel htmlFor="status">Status</RequiredLabel>
                    <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione..." />
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
                      value={formData.data_inicio || ""}
                      onChange={(e) => handleChange("data_inicio", e.target.value)}
                      required
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="data_fim_experiencia">Fim da Experiência</OptionalLabel>
                    <Input
                      id="data_fim_experiencia"
                      type="date"
                      value={formData.data_fim_experiencia || ""}
                      onChange={(e) => handleChange("data_fim_experiencia", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="regime">Regime de Contratação</OptionalLabel>
                    <Select value={formData.regime} onValueChange={(value) => handleChange("regime", value)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione..." />
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

                <SectionTitle icon={CreditCard}>Remuneração e Regras</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <RequiredLabel htmlFor="salario">Salário Bruto</RequiredLabel>
                    <Input
                      id="salario"
                      type="number"
                      step="0.01"
                      value={formData.salario}
                      onChange={(e) => handleChange("salario", e.target.value)}
                      placeholder="0,00"
                      required
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="regra_desconto_falta">Desconto por Falta</OptionalLabel>
                    <Select
                      value={formData.regra_desconto_falta}
                      onValueChange={(value) => handleChange("regra_desconto_falta", value)}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dia_cheio">Dia Cheio</SelectItem>
                        <SelectItem value="por_horas">Por Horas</SelectItem>
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
                      onChange={(e) => handleChange("fator_hora_extra_semana", Number(e.target.value))}
                      placeholder="1.5"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="fator_hora_extra_fds">Fator H.E. FDS/Feriado</OptionalLabel>
                    <Input
                      id="fator_hora_extra_fds"
                      type="number"
                      step="0.1"
                      value={formData.fator_hora_extra_fds}
                      onChange={(e) => handleChange("fator_hora_extra_fds", Number(e.target.value))}
                      placeholder="2"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ENDEREÇO */}
              <TabsContent value="endereco" className="mt-4 space-y-4">
                <SectionTitle icon={MapPin}>Endereço Residencial</SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <OptionalLabel htmlFor="cep">CEP</OptionalLabel>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        id="cep"
                        value={formData.cep || ""}
                        onChange={(e) => handleChange("cep", e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={buscarCep} disabled={isLoadingCep}>
                        {isLoadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <OptionalLabel htmlFor="uf">UF</OptionalLabel>
                    <Select value={formData.uf || ""} onValueChange={(value) => handleChange("uf", value)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {UFS.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <OptionalLabel htmlFor="cidade">Cidade</OptionalLabel>
                    <Input
                      id="cidade"
                      value={formData.cidade || ""}
                      onChange={(e) => handleChange("cidade", e.target.value)}
                      className="mt-1.5"
                      placeholder="Nome da cidade"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <OptionalLabel htmlFor="logradouro">Logradouro</OptionalLabel>
                    <Input
                      id="logradouro"
                      value={formData.logradouro || ""}
                      onChange={(e) => handleChange("logradouro", e.target.value)}
                      className="mt-1.5"
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="numero">Número</OptionalLabel>
                    <Input
                      id="numero"
                      value={formData.numero || ""}
                      onChange={(e) => handleChange("numero", e.target.value)}
                      className="mt-1.5"
                      placeholder="123"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="complemento">Complemento</OptionalLabel>
                    <Input
                      id="complemento"
                      value={formData.complemento || ""}
                      onChange={(e) => handleChange("complemento", e.target.value)}
                      className="mt-1.5"
                      placeholder="Apto, Bloco, etc"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <OptionalLabel htmlFor="bairro">Bairro</OptionalLabel>
                    <Input
                      id="bairro"
                      value={formData.bairro || ""}
                      onChange={(e) => handleChange("bairro", e.target.value)}
                      className="mt-1.5"
                      placeholder="Nome do bairro"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* BANCÁRIO */}
              <TabsContent value="bancario" className="mt-4 space-y-4">
                <SectionTitle icon={CreditCard}>Dados Bancários</SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <OptionalLabel htmlFor="banco">Banco</OptionalLabel>
                    <Input
                      id="banco"
                      value={formData.banco || ""}
                      onChange={(e) => handleChange("banco", e.target.value)}
                      className="mt-1.5"
                      placeholder="Nome do banco"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="tipo_conta">Tipo de Conta</OptionalLabel>
                    <Select value={formData.tipo_conta || ""} onValueChange={(value) => handleChange("tipo_conta", value)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione..." />
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
                      value={formData.agencia || ""}
                      onChange={(e) => handleChange("agencia", e.target.value)}
                      className="mt-1.5"
                      placeholder="0000"
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="conta">Conta</OptionalLabel>
                    <Input
                      id="conta"
                      value={formData.conta || ""}
                      onChange={(e) => handleChange("conta", e.target.value)}
                      className="mt-1.5"
                      placeholder="00000-0"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <OptionalLabel htmlFor="pix">Chave PIX</OptionalLabel>
                    <Input
                      id="pix"
                      value={formData.pix || ""}
                      onChange={(e) => handleChange("pix", e.target.value)}
                      className="mt-1.5"
                      placeholder="CPF, email, telefone ou chave aleatória"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ACESSO */}
              <TabsContent value="acesso" className="mt-4 space-y-4">
                <SectionTitle icon={Settings}>Configurações de Acesso</SectionTitle>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="tem_acesso_sistema"
                    checked={!!formData.tem_acesso_sistema}
                    onCheckedChange={(checked) => {
                      handleChange("tem_acesso_sistema", !!checked);
                      if (!checked) handleChange("email_acesso", "");
                    }}
                    disabled={usuarioJaVinculado}
                    className={usuarioJaVinculado ? "opacity-50 cursor-not-allowed" : ""}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="tem_acesso_sistema"
                      className={cn(
                        "font-medium",
                        usuarioJaVinculado ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                      )}
                    >
                      Este funcionário terá acesso ao sistema
                    </Label>
                    {usuarioJaVinculado && (
                      <p className="text-xs text-slate-600">
                        ✅ Usuário já vinculado ao sistema. Não é possível alterar configurações de acesso aqui.
                      </p>
                    )}
                  </div>
                </div>

                {formData.tem_acesso_sistema && (
                  <div className="space-y-2">
                    <OptionalLabel htmlFor="email_acesso">Email de Acesso ao Sistema</OptionalLabel>
                    <Input
                      id="email_acesso"
                      type="email"
                      value={formData.email_acesso || ""}
                      onChange={(e) => handleChange("email_acesso", e.target.value)}
                      placeholder="email@exemplo.com"
                      className="mt-1.5"
                      required={!!formData.tem_acesso_sistema}
                      disabled={usuarioJaVinculado}
                    />
                    {!usuarioJaVinculado ? (
                      <p className="text-xs text-slate-600">
                        Este email será usado no login. Um convite será enviado automaticamente após salvar.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600">✅ Email já cadastrado. Não é possível alterar.</p>
                    )}

                    {!!formData.convite_status && (
                      <Alert
                        className={cn(
                          formData.convite_status === "aceito"
                            ? "bg-green-50 border-green-200"
                            : formData.convite_status === "pendente"
                            ? "bg-yellow-50 border-yellow-200"
                            : "bg-slate-50 border-slate-200"
                        )}
                      >
                        <AlertDescription className="text-xs">
                          <div className="font-semibold">
                            Status do Convite:{" "}
                            {formData.convite_status === "aceito"
                              ? "✅ Aceito"
                              : formData.convite_status === "pendente"
                              ? "⏳ Pendente"
                              : "❌ Expirado/Cancelado"}
                          </div>
                          {formData.convite_enviado_em ? (
                            <div className="mt-1">
                              Enviado em:{" "}
                              {new Date(formData.convite_enviado_em).toLocaleString("pt-BR")}
                            </div>
                          ) : null}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <SectionTitle>Observações</SectionTitle>
                <div>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes || ""}
                    onChange={(e) => handleChange("observacoes", e.target.value)}
                    rows={10}
                    placeholder="Informações adicionais sobre o funcionário..."
                    className="mt-1.5 resize-none"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </form>

        <DialogFooter className="px-4 py-3 border-t bg-slate-50 flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>

          <Button type="button" variant="outline" onClick={() => { /* noop */ }} className="hidden">
            {/* placeholder */}
          </Button>

          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {funcionario ? "Salvar" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}