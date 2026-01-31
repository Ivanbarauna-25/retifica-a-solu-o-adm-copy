import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Plus,
  Eye,
  MoreVertical,
  Search,
  Filter,
  FileText,
  Upload,
  Wrench,
} from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { usePermissions } from "@/components/ProtectedPage";

import FuncionarioFormModal from "@/components/funcionarios/FuncionarioForm";
import FuncionarioViewer from "@/components/FuncionarioViewer";
import FuncionarioFeriasForm from "@/components/funcionarios/forms/FuncionarioFeriasForm";
import FuncionarioCargoForm from "@/components/funcionarios/forms/FuncionarioCargoForm";
import FuncionarioSalarioForm from "@/components/funcionarios/forms/FuncionarioSalarioForm";
import FuncionarioDepartamentoForm from "@/components/funcionarios/forms/FuncionarioDepartamentoForm";
import FuncionarioDesligamentoForm from "@/components/funcionarios/forms/FuncionarioDesligamentoForm";
import RelatorioFuncionariosViewer from "@/components/funcionarios/RelatorioFuncionariosFiltersModal";
import ImportarFuncionariosModal from "@/components/funcionarios/ImportarFuncionariosModal";

import { formatCurrency } from "@/components/formatters";
import { useStandardDialog } from "@/components/ui/StandardDialog";

const statusColors = {
  ativo: "bg-green-100 text-green-800 border-green-200",
  experiencia: "bg-blue-100 text-blue-800 border-blue-200",
  ferias: "bg-yellow-100 text-yellow-800 border-yellow-200",
  afastado: "bg-orange-100 text-orange-800 border-orange-200",
  demitido: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  ativo: "Ativo",
  experiencia: "Em Experiência",
  ferias: "Férias",
  afastado: "Afastado",
  demitido: "Demitido",
};

const regimeLabels = {
  clt: "CLT",
  pj: "PJ",
  estagio: "Estágio",
  aprendiz: "Aprendiz",
  temporario: "Temporário",
  terceirizado: "Terceirizado",
};

function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

export default function FuncionariosPage() {
  const { toast } = useToast();

  const [funcionarios, setFuncionarios] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);

  const [showViewer, setShowViewer] = useState(false);

  // Modais RH
  const [isFeriasModalOpen, setIsFeriasModalOpen] = useState(false);
  const [isCargoModalOpen, setIsCargoModalOpen] = useState(false);
  const [isSalarioModalOpen, setIsSalarioModalOpen] = useState(false);
  const [isDepartamentoModalOpen, setIsDepartamentoModalOpen] = useState(false);
  const [isDesligamentoModalOpen, setIsDesligamentoModalOpen] = useState(false);
  const [funcionarioParaAcao, setFuncionarioParaAcao] = useState(null);

  // Relatórios / Importação
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterCargo, setFilterCargo] = useState("todos");
  const [filterDepartamento, setFilterDepartamento] = useState("todos");
  const [showFilters, setShowFilters] = useState(false);

  const { canCreate, canEdit, canDelete } = usePermissions();
  const canCreateFunc = canCreate("funcionarios");
  const canEditFunc = canEdit("funcionarios");
  const canDeleteFunc = canDelete("funcionarios");

  const { showDanger, closeDialog, DialogComponent } = useStandardDialog();

  const fetchFuncionarios = async () => {
    setIsLoading(true);
    try {
      const [cargosData, departamentosData] = await Promise.all([
        base44.entities.Cargo.list(),
        base44.entities.Departamento.list(),
      ]);

      setCargos(cargosData || []);
      setDepartamentos(departamentosData || []);

      try {
        const funcionariosData = await base44.entities.Funcionario.list(
          "-created_date"
        );
        setFuncionarios(funcionariosData || []);
      } catch (funcError) {
        console.error("Erro ao carregar lista de funcionários:", funcError);
        try {
          const funcionariosFallback = await base44.entities.Funcionario.list();
          setFuncionarios(funcionariosFallback || []);
        } catch (fallbackError) {
          console.error("Falha crítica ao carregar funcionários:", fallbackError);
          toast({
            title: "Erro de Dados",
            description:
              "Detectamos um problema nos dados dos funcionários. Alguns registros podem estar com IDs inválidos.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a lista de funcionários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFuncionarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCargoNome = useCallback(
    (cargoId) => {
      const id = safeStr(cargoId).trim();
      if (!id || ["unassigned", "todos", "all", "null", "undefined"].includes(id))
        return "Não definido";
      return cargos.find((c) => c.id === id)?.nome || "Não definido";
    },
    [cargos]
  );

  const getDepartamentoNome = useCallback(
    (deptId) => {
      const id = safeStr(deptId).trim();
      if (!id || ["unassigned", "todos", "all", "null", "undefined"].includes(id))
        return "Não definido";
      return departamentos.find((d) => d.id === id)?.nome || "Não definido";
    },
    [departamentos]
  );

  const validarFuncionarioParaModal = (funcionario) => {
    if (!funcionario) return null;
    return {
      ...funcionario,
      cargo_id:
        !funcionario.cargo_id || funcionario.cargo_id === "unassigned"
          ? null
          : funcionario.cargo_id,
      departamento_id:
        !funcionario.departamento_id || funcionario.departamento_id === "unassigned"
          ? null
          : funcionario.departamento_id,
      user_id_relogio: safeStr(funcionario.user_id_relogio).trim(),
    };
  };

  const funcionariosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (funcionarios || []).filter((func) => {
      const nome = safeStr(func?.nome).toLowerCase();
      const cpf = safeStr(func?.cpf);
      const email = safeStr(func?.email).toLowerCase();
      const telefone = safeStr(func?.telefone);
      const enno = safeStr(func?.user_id_relogio); // ID relógio (EnNo)

      const matchSearch =
        !term ||
        nome.includes(term) ||
        cpf.includes(term) ||
        email.includes(term) ||
        telefone.includes(term) ||
        enno.includes(term);

      const matchStatus = filterStatus === "todos" || func?.status === filterStatus;

      const cargoIdValido =
        func?.cargo_id && func?.cargo_id !== "unassigned" ? func.cargo_id : null;
      const matchCargo = filterCargo === "todos" || cargoIdValido === filterCargo;

      const deptIdValido =
        func?.departamento_id && func?.departamento_id !== "unassigned"
          ? func.departamento_id
          : null;
      const matchDepartamento =
        filterDepartamento === "todos" || deptIdValido === filterDepartamento;

      return matchSearch && matchStatus && matchCargo && matchDepartamento;
    });
  }, [funcionarios, searchTerm, filterStatus, filterCargo, filterDepartamento]);

  const handleNovo = () => {
    setFuncionarioSelecionado(null);
    setShowModal(true);
  };

  const openFormForEdit = (funcionario) => {
    setFuncionarioSelecionado(funcionario);
    setShowModal(true);
  };

  const handleView = (funcionario) => {
    setFuncionarioSelecionado(funcionario);
    setShowViewer(true);
  };

  const handleSave = async (savedFuncionario) => {
    toast({
      title:
        savedFuncionario?.id && savedFuncionario?.id !== funcionarioSelecionado?.id
          ? "Funcionário cadastrado!"
          : "Funcionário atualizado!",
      description: "Os dados foram salvos com sucesso.",
    });

    setShowModal(false);
    setFuncionarioSelecionado(null);

    setTimeout(() => {
      fetchFuncionarios();
    }, 150);
  };

  const handleDelete = async (funcionarioOrId) => {
    const id =
      typeof funcionarioOrId === "string"
        ? funcionarioOrId
        : funcionarioOrId?.id;

    const nome =
      typeof funcionarioOrId === "object" ? funcionarioOrId?.nome : "este funcionário";

    showDanger(
      "Excluir Funcionário",
      `Tem certeza que deseja excluir ${nome}? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await base44.entities.Funcionario.delete(id);
          toast({ title: "✅ Funcionário excluído com sucesso!" });
          fetchFuncionarios();
          setShowViewer(false);
          setFuncionarioSelecionado(null);
          closeDialog();
        } catch (error) {
          console.error("Erro ao excluir funcionário:", error);
          toast({
            title: "❌ Erro ao excluir",
            description: "Não foi possível excluir o funcionário.",
            variant: "destructive",
          });
        }
      }
    );
  };

  // Modais RH
  const openFeriasModal = (funcionario) => {
    setFuncionarioParaAcao(funcionario);
    setIsFeriasModalOpen(true);
  };
  const openCargoModal = (funcionario) => {
    setFuncionarioParaAcao(funcionario);
    setIsCargoModalOpen(true);
  };
  const openSalarioModal = (funcionario) => {
    setFuncionarioParaAcao(funcionario);
    setIsSalarioModalOpen(true);
  };
  const openDepartamentoModal = (funcionario) => {
    setFuncionarioParaAcao(funcionario);
    setIsDepartamentoModalOpen(true);
  };
  const openDesligamentoModal = (funcionario) => {
    setFuncionarioParaAcao(funcionario);
    setIsDesligamentoModalOpen(true);
  };

  const repararDados = async () => {
    const ok = window.confirm(
      "Deseja executar a correção automática de dados? Isso pode ajustar registros com IDs inválidos."
    );
    if (!ok) return;

    try {
      const res = await base44.functions.invoke("dataRepair", {});
      if (res?.data?.success) {
        toast({ title: "Reparo concluído", description: res.data.message });
        fetchFuncionarios();
      } else {
        throw new Error(res?.data?.error || "Erro desconhecido");
      }
    } catch (e) {
      toast({
        title: "Erro no reparo",
        description: e?.message || "Falha ao executar reparo",
        variant: "destructive",
      });
    }
  };

  const totalAtivos = funcionarios.filter((f) => f.status === "ativo").length;
  const totalFerias = funcionarios.filter((f) => f.status === "ferias").length;
  const totalAfastados = funcionarios.filter(
    (f) => f.status === "demitido" || f.status === "afastado"
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-6">
      <Toaster />

      <div className="container mx-auto max-w-[1800px] space-y-4">
        {/* Header */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base md:text-2xl">Equipe</CardTitle>
                <CardDescription className="text-slate-200">
                  Gerenciamento de funcionários
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowFilters((v) => !v)}
                  variant="outline"
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 text-xs md:text-sm"
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                </Button>

                {canCreateFunc && (
                  <Button
                    onClick={() => setModalImportar(true)}
                    variant="outline"
                    className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 text-xs md:text-sm hidden sm:flex"
                  >
                    <Upload className="w-4 h-4" />
                    Importar
                  </Button>
                )}

                <Button
                  onClick={() => setShowRelatorio(true)}
                  variant="outline"
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 text-xs md:text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Relatório
                </Button>

                <Button
                  onClick={repararDados}
                  variant="outline"
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 text-xs md:text-sm"
                >
                  <Wrench className="w-4 h-4" />
                  Reparar dados
                </Button>

                {canCreateFunc && (
                  <Button
                    onClick={handleNovo}
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2 text-xs md:text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Novo
                  </Button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              <div className="bg-white/10 border border-white/15 rounded-lg p-3">
                <div className="text-[10px] text-slate-200">Total</div>
                <div className="text-xl font-bold">{funcionarios.length}</div>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-lg p-3">
                <div className="text-[10px] text-slate-200">Ativos</div>
                <div className="text-xl font-bold">{totalAtivos}</div>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-lg p-3">
                <div className="text-[10px] text-slate-200">Férias</div>
                <div className="text-xl font-bold">{totalFerias}</div>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-lg p-3">
                <div className="text-[10px] text-slate-200">Afastados/Demitidos</div>
                <div className="text-xl font-bold">{totalAfastados}</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-6 space-y-4">
            {/* Filtros */}
            {showFilters ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-700">
                    Busca Geral
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="Nome, CPF, Email, Tel, ID relógio (EnNo)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-700">Status</div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-700">Cargo</div>
                  <Select value={filterCargo} onValueChange={setFilterCargo}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {cargos.map((cargo) => (
                        <SelectItem key={cargo.id} value={cargo.id}>
                          {cargo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-700">
                    Departamento
                  </div>
                  <Select
                    value={filterDepartamento}
                    onValueChange={setFilterDepartamento}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {departamentos.map((depto) => (
                        <SelectItem key={depto.id} value={depto.id}>
                          {depto.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Buscar (inclui ID relógio EnNo)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-800">
                  <TableRow>
                    <TableHead className="text-white text-xs">Nome</TableHead>
                    <TableHead className="text-white text-xs">ID Relógio (EnNo)</TableHead>
                    <TableHead className="text-white text-xs">CPF</TableHead>
                    <TableHead className="text-white text-xs">Contato</TableHead>
                    <TableHead className="text-white text-xs">Cargo</TableHead>
                    <TableHead className="text-white text-xs">Departamento</TableHead>
                    <TableHead className="text-white text-xs">Regime</TableHead>
                    <TableHead className="text-white text-xs text-right">Salário</TableHead>
                    <TableHead className="text-white text-xs">Status</TableHead>
                    <TableHead className="text-white text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-sm">
                        Carregando funcionários...
                      </TableCell>
                    </TableRow>
                  ) : funcionariosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-sm">
                        Nenhum funcionário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    funcionariosFiltrados.map((funcionario) => {
                      const enno = safeStr(funcionario.user_id_relogio).trim();
                      return (
                        <TableRow key={funcionario.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium">
                            {funcionario.nome}
                          </TableCell>

                          <TableCell className="font-mono text-xs">
                            {enno || "-"}
                          </TableCell>

                          <TableCell className="text-xs">
                            {funcionario.cpf || "-"}
                          </TableCell>

                          <TableCell className="text-xs">
                            {funcionario.email || funcionario.telefone || "-"}
                          </TableCell>

                          <TableCell className="text-xs">
                            {getCargoNome(funcionario.cargo_id)}
                          </TableCell>

                          <TableCell className="text-xs">
                            {getDepartamentoNome(funcionario.departamento_id)}
                          </TableCell>

                          <TableCell className="text-xs">
                            {regimeLabels[funcionario.regime] || funcionario.regime || "-"}
                          </TableCell>

                          <TableCell className="text-xs text-right">
                            {formatCurrency(funcionario.salario || 0)}
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={
                                statusColors[funcionario.status] ||
                                "bg-gray-100 text-gray-800 border-gray-200"
                              }
                            >
                              {statusLabels[funcionario.status] || funcionario.status}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleView(funcionario)}
                                title="Visualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              {(canEditFunc || canDeleteFunc) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" title="Mais opções">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {canEditFunc && (
                                      <>
                                        <DropdownMenuItem onClick={() => openFormForEdit(funcionario)}>
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openFeriasModal(funcionario)}>
                                          Programar Férias
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openCargoModal(funcionario)}>
                                          Alterar Cargo
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openSalarioModal(funcionario)}>
                                          Reajustar Salário
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDepartamentoModal(funcionario)}>
                                          Alterar Departamento
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => openDesligamentoModal(funcionario)}
                                          className="text-red-600 focus:text-red-600"
                                        >
                                          Registrar Desligamento
                                        </DropdownMenuItem>
                                      </>
                                    )}

                                    {canDeleteFunc && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleDelete(funcionario)}
                                          className="text-red-600 focus:text-red-600"
                                        >
                                          Excluir
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {isLoading ? (
                <div className="py-8 text-center text-sm">Carregando funcionários...</div>
              ) : funcionariosFiltrados.length === 0 ? (
                <div className="py-8 text-center text-sm">Nenhum funcionário encontrado</div>
              ) : (
                funcionariosFiltrados.map((funcionario) => {
                  const enno = safeStr(funcionario.user_id_relogio).trim();
                  return (
                    <Card key={funcionario.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-base">{funcionario.nome}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              ID Relógio (EnNo):{" "}
                              <span className="font-mono font-semibold text-slate-700">
                                {enno || "-"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleView(funcionario)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {(canEditFunc || canDeleteFunc) && (
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-[9999]" sideOffset={5}>
                                  {canEditFunc && (
                                    <>
                                      <DropdownMenuItem onClick={() => openFormForEdit(funcionario)}>
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openFeriasModal(funcionario)}>
                                        Programar Férias
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openCargoModal(funcionario)}>
                                        Alterar Cargo
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openSalarioModal(funcionario)}>
                                        Reajustar Salário
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openDepartamentoModal(funcionario)}>
                                        Alterar Departamento
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => openDesligamentoModal(funcionario)}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        Registrar Desligamento
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  {canDeleteFunc && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(funcionario)}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        Excluir
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge
                            className={
                              statusColors[funcionario.status] ||
                              "bg-gray-100 text-gray-800 border-gray-200"
                            }
                          >
                            {statusLabels[funcionario.status] || funcionario.status}
                          </Badge>

                          <Badge variant="secondary" className="text-xs">
                            {getCargoNome(funcionario.cargo_id)}
                          </Badge>

                          <Badge variant="secondary" className="text-xs">
                            {getDepartamentoNome(funcionario.departamento_id)}
                          </Badge>
                        </div>

                        <div className="mt-3 text-xs text-slate-600 space-y-1">
                          <div>CPF: <span className="font-medium text-slate-800">{funcionario.cpf || "-"}</span></div>
                          <div>Salário: <span className="font-medium text-slate-800">{formatCurrency(funcionario.salario || 0)}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Form */}
      {showModal && (
        <FuncionarioFormModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setFuncionarioSelecionado(null);
          }}
          funcionario={validarFuncionarioParaModal(funcionarioSelecionado)}
          cargos={cargos}
          departamentos={departamentos}
          onSave={handleSave}
        />
      )}

      {/* Viewer */}
      {showViewer && funcionarioSelecionado && (
        <FuncionarioViewer
          funcionario={validarFuncionarioParaModal(funcionarioSelecionado)}
          isOpen={showViewer}
          onClose={() => {
            setShowViewer(false);
            setFuncionarioSelecionado(null);
          }}
          onEdit={
            canEditFunc
              ? () => {
                  setShowViewer(false);
                  openFormForEdit(funcionarioSelecionado);
                }
              : undefined
          }
          onDelete={canDeleteFunc ? handleDelete : undefined}
          onProgramarFerias={
            canEditFunc
              ? () => {
                  setShowViewer(false);
                  openFeriasModal(funcionarioSelecionado);
                }
              : undefined
          }
          onAlterarCargo={
            canEditFunc
              ? () => {
                  setShowViewer(false);
                  openCargoModal(funcionarioSelecionado);
                }
              : undefined
          }
          onReajustarSalario={
            canEditFunc
              ? () => {
                  setShowViewer(false);
                  openSalarioModal(funcionarioSelecionado);
                }
              : undefined
          }
          onAlterarDepartamento={
            canEditFunc
              ? () => {
                  setShowViewer(false);
                  openDepartamentoModal(funcionarioSelecionado);
                }
              : undefined
          }
          onDesligar={
            canEditFunc
              ? () => {
                  setShowViewer(false);
                  openDesligamentoModal(funcionarioSelecionado);
                }
              : undefined
          }
        />
      )}

      {/* Modais RH */}
      {canEditFunc && (
        <>
          <FuncionarioFeriasForm
            isOpen={isFeriasModalOpen}
            onClose={() => {
              setIsFeriasModalOpen(false);
              setFuncionarioParaAcao(null);
            }}
            funcionario={validarFuncionarioParaModal(funcionarioParaAcao)}
            onSuccess={fetchFuncionarios}
          />

          <FuncionarioCargoForm
            isOpen={isCargoModalOpen}
            onClose={() => {
              setIsCargoModalOpen(false);
              setFuncionarioParaAcao(null);
            }}
            funcionario={validarFuncionarioParaModal(funcionarioParaAcao)}
            cargos={cargos}
            onSuccess={fetchFuncionarios}
          />

          <FuncionarioSalarioForm
            isOpen={isSalarioModalOpen}
            onClose={() => {
              setIsSalarioModalOpen(false);
              setFuncionarioParaAcao(null);
            }}
            funcionario={validarFuncionarioParaModal(funcionarioParaAcao)}
            onSuccess={fetchFuncionarios}
          />

          <FuncionarioDepartamentoForm
            isOpen={isDepartamentoModalOpen}
            onClose={() => {
              setIsDepartamentoModalOpen(false);
              setFuncionarioParaAcao(null);
            }}
            funcionario={validarFuncionarioParaModal(funcionarioParaAcao)}
            departamentos={departamentos}
            onSuccess={fetchFuncionarios}
          />

          <FuncionarioDesligamentoForm
            isOpen={isDesligamentoModalOpen}
            onClose={() => {
              setIsDesligamentoModalOpen(false);
              setFuncionarioParaAcao(null);
            }}
            funcionario={validarFuncionarioParaModal(funcionarioParaAcao)}
            onSuccess={fetchFuncionarios}
          />
        </>
      )}

      {/* Relatório */}
      {showRelatorio && (
        <RelatorioFuncionariosViewer
          isOpen={showRelatorio}
          onClose={() => setShowRelatorio(false)}
          funcionarios={funcionariosFiltrados}
          cargos={cargos}
          departamentos={departamentos}
          filtroStatus={filterStatus !== "todos" ? filterStatus : ""}
          filtroDepartamento={filterDepartamento !== "todos" ? filterDepartamento : ""}
          filtroCargo={filterCargo !== "todos" ? filterCargo : ""}
        />
      )}

      {/* Importação */}
      {canCreateFunc && modalImportar && (
        <ImportarFuncionariosModal
          isOpen={modalImportar}
          onClose={() => setModalImportar(false)}
          onSuccess={() => {
            fetchFuncionarios();
            setModalImportar(false);
          }}
        />
      )}

      {/* Diálogo padrão */}
      {DialogComponent}

      {/* Toast */}
      <Toaster />
    </div>
  );
}