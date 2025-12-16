import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  UserPlus,
  Calendar,
  TrendingUp,
  Briefcase,
  Building2,
  UserX,
  Search,
  Filter,
  FileText,
  Download,
  Users,
  Upload,
  CheckCircle, // Added
  AlertCircle // Added
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import FuncionarioFormModal from '@/components/funcionarios/FuncionarioForm'; // Renamed import to reflect outline's usage
import FuncionarioViewer from '@/components/FuncionarioViewer';
import FuncionarioFeriasForm from '@/components/funcionarios/forms/FuncionarioFeriasForm';
import FuncionarioCargoForm from '@/components/funcionarios/forms/FuncionarioCargoForm';
import FuncionarioSalarioForm from '@/components/funcionarios/forms/FuncionarioSalarioForm';
import FuncionarioDepartamentoForm from '@/components/funcionarios/forms/FuncionarioDepartamentoForm';
import FuncionarioDesligamentoForm from '@/components/funcionarios/forms/FuncionarioDesligamentoForm';
import RelatorioFuncionariosViewer from '@/components/funcionarios/RelatorioFuncionariosFiltersModal'; // Renamed import to reflect outline's usage
import ImportarFuncionariosModal from '@/components/funcionarios/ImportarFuncionariosModal'; // New import
import { createPageUrl } from '@/utils';
import ProtectedPage from '@/components/ProtectedPage';
import { usePermissions } from '@/components/ProtectedPage';
import StandardDialog, { useStandardDialog } from '@/components/ui/StandardDialog';
import { formatCurrency } from '@/components/formatters';

const statusColors = {
  ativo: 'bg-green-100 text-green-800 border-green-200',
  experiencia: 'bg-blue-100 text-blue-800 border-blue-200',
  ferias: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  afastado: 'bg-orange-100 text-orange-800 border-orange-200',
  demitido: 'bg-red-100 text-red-800 border-red-200'
};

const statusLabels = {
  ativo: 'Ativo',
  experiencia: 'Em Experiência',
  ferias: 'Férias',
  afastado: 'Afastado',
  demitido: 'Demitido'
};

const regimeLabels = {
  clt: 'CLT',
  pj: 'PJ',
  estagio: 'Estágio',
  aprendiz: 'Aprendiz',
  temporario: 'Temporário',
  terceirizado: 'Terceirizado'
};

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Renamed state variables to match outline for Form and Viewer
  const [showModal, setShowModal] = useState(false); // Replaces isFormOpen
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null); // Replaces selectedFuncionario and viewingFuncionario
  const [showViewer, setShowViewer] = useState(false); // Replaces isViewerOpen

  const { toast } = useToast();

  // Estados para os modais de RH
  const [isFeriasModalOpen, setIsFeriasModalOpen] = useState(false);
  const [isCargoModalOpen, setIsCargoModalOpen] = useState(false);
  const [isSalarioModalOpen, setIsSalarioModalOpen] = useState(false);
  const [isDepartamentoModalOpen, setIsDepartamentoModalOpen] = useState(false);
  const [isDesligamentoModalOpen, setIsDesligamentoModalOpen] = useState(false);
  const [funcionarioParaAcao, setFuncionarioParaAcao] = useState(null);

  // Estados para filtros e relatórios
  const [showRelatorio, setShowRelatorio] = useState(false); // Replaces isRelatorioModalOpen
  const [modalImportar, setModalImportar] = useState(false); // New state variable

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterCargo, setFilterCargo] = useState('todos');
  const [filterDepartamento, setFilterDepartamento] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);

  // Adicionar hook de permissões
  const { canCreate, canEdit, canDelete, isLoading: permissionsLoading } = usePermissions();
  
  // Hook para diálogos padronizados
  const { dialogState, showDanger, closeDialog, DialogComponent } = useStandardDialog();

  // Helpers de permissão específicos para este módulo
  const canCreateFunc = canCreate('funcionarios');
  const canEditFunc = canEdit('funcionarios');
  const canDeleteFunc = canDelete('funcionarios');

  const fetchFuncionarios = async () => {
    setIsLoading(true);
    try {
      // Carregar cargos e departamentos primeiro para garantir que temos os mapas
      const [cargosData, departamentosData] = await Promise.all([
        base44.entities.Cargo.list(),
        base44.entities.Departamento.list()
      ]);
      
      setCargos(cargosData || []);
      setDepartamentos(departamentosData || []);

      // Tentar carregar funcionários
      try {
        const funcionariosData = await base44.entities.Funcionario.list('-created_date');
        setFuncionarios(funcionariosData || []);
      } catch (funcError) {
        console.error('Erro ao carregar lista de funcionários:', funcError);
        // Se falhar ao listar, pode ser um erro de dados corrompidos (ex: ID inválido em relacionamento)
        // Vamos tentar carregar sem ordenação ou com limite para ver se recupera algo
        try {
          const funcionariosFallback = await base44.entities.Funcionario.list();
          setFuncionarios(funcionariosFallback || []);
        } catch (fallbackError) {
           console.error('Falha crítica ao carregar funcionários:', fallbackError);
           toast({
             title: 'Erro de Dados',
             description: 'Detectamos um problema nos dados dos funcionários. Alguns registros podem estar com IDs inválidos.',
             variant: 'destructive'
           });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar a lista de funcionários.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFuncionarios();
  }, []);

  const handleSave = async (savedFuncionario) => {
    try {
      toast({
        title: savedFuncionario.id !== funcionarioSelecionado?.id ? 'Funcionário cadastrado!' : 'Funcionário atualizado!',
        description: 'Os dados foram salvos com sucesso.'
      });

      setShowModal(false);
      setFuncionarioSelecionado(null);

      setTimeout(() => {
        fetchFuncionarios();
      }, 100);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Erro desconhecido ao processar operação.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (funcionarioOrId) => {
    const id = typeof funcionarioOrId === 'string' ? funcionarioOrId : funcionarioOrId?.id;
    const nome = typeof funcionarioOrId === 'object' ? funcionarioOrId?.nome : 'este funcionário';
    
    showDanger(
      'Excluir Funcionário',
      `Tem certeza que deseja excluir ${nome}? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await base44.entities.Funcionario.delete(id);
          toast({ title: '✅ Funcionário excluído com sucesso!' });
          fetchFuncionarios();
          setShowViewer(false);
          setFuncionarioSelecionado(null);
          closeDialog();
        } catch (error) {
          console.error('Erro ao excluir funcionário:', error);
          toast({
            title: '❌ Erro ao excluir',
            description: 'Não foi possível excluir o funcionário.',
            variant: 'destructive'
          });
        }
      }
    );
  };

  const openFormForEdit = (funcionario) => {
    setFuncionarioSelecionado(funcionario);
    setShowModal(true);
  };

  const handleNovo = () => { // Renamed from openFormForNew
    setFuncionarioSelecionado(null);
    setShowModal(true);
  };

  const handleCloseModal = () => { // New handler to reset both form and selected funcionario
    setShowModal(false);
    setFuncionarioSelecionado(null);
  };

  const handleView = (funcionario) => { // Renamed from openViewer
    setFuncionarioSelecionado(funcionario);
    setShowViewer(true);
  };

  // Funções para abrir modais de RH
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

  // handleOpenRelatorio removed as per outline, direct call `setShowRelatorio(true)` in JSX

  // Helper para buscar dados relacionados
  const getCargoNome = useCallback((cargoId) => {
    // Validar se ID é válido antes de buscar
    if (!cargoId || cargoId === 'unassigned' || cargoId === 'todos' || cargoId === 'all' || cargoId === 'null' || cargoId === 'undefined') {
      return 'Não definido';
    }
    const cargo = cargos.find(c => c.id === cargoId);
    return cargo?.nome || 'Não definido';
  }, [cargos]);

  const getDepartamentoNome = useCallback((deptId) => {
    // Validar se ID é válido antes de buscar
    if (!deptId || deptId === 'unassigned' || deptId === 'todos' || deptId === 'all' || deptId === 'null' || deptId === 'undefined') {
      return 'Não definido';
    }
    const dept = departamentos.find(d => d.id === deptId);
    return dept?.nome || 'Não definido';
  }, [departamentos]);

  // Validar funcionário antes de passar para os modais
  const validarFuncionarioParaModal = (funcionario) => {
    if (!funcionario) return null;
    
    // Criar cópia com IDs validados
    return {
      ...funcionario,
      cargo_id: (!funcionario.cargo_id || funcionario.cargo_id === 'unassigned') ? null : funcionario.cargo_id,
      departamento_id: (!funcionario.departamento_id || funcionario.departamento_id === 'unassigned') ? null : funcionario.departamento_id
    };
  };

  // Filtrar funcionários
  const funcionariosFiltrados = useMemo(() => {
    return funcionarios.filter((func) => {
      const matchSearch = !searchTerm ||
        func.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        func.cpf?.includes(searchTerm) ||
        func.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = filterStatus === 'todos' || func.status === filterStatus;
      
      // Validar cargo_id antes de filtrar
      const cargoIdValido = func.cargo_id && func.cargo_id !== 'unassigned' ? func.cargo_id : null;
      const matchCargo = filterCargo === 'todos' || cargoIdValido === filterCargo;
      
      // Validar departamento_id antes de filtrar
      const deptIdValido = func.departamento_id && func.departamento_id !== 'unassigned' ? func.departamento_id : null;
      const matchDepartamento = filterDepartamento === 'todos' || deptIdValido === filterDepartamento;

      return matchSearch && matchStatus && matchCargo && matchDepartamento;
    });
  }, [funcionarios, searchTerm, filterStatus, filterCargo, filterDepartamento]);

  return (
    <ProtectedPage pageName="Funcionarios">
      <Toaster />
      <div className="min-h-screen bg-slate-50">
        {/* Header com Botões */}
        <div className="bg-slate-800 text-white px-6 py-8 mb-6 shadow-xl">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Equipe</h1>
                  <p className="text-slate-300">Gerenciamento de funcionários e colaboradores</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros
                </Button>
                {canCreateFunc && (
                  <Button
                    onClick={() => setModalImportar(true)}
                    variant="outline"
                    className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2">
                    <Upload className="w-4 h-4" />
                    Importar
                  </Button>
                )}
                <Button
                  onClick={() => setShowRelatorio(true)}
                  variant="outline"
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2">
                  <FileText className="w-4 h-4" />
                  Relatório
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white w-10 px-0"
                      title="Mais opções">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={async () => {
                        if(!window.confirm("Deseja executar a correção automática de dados? Isso irá corrigir funcionários com cargo 'Mecânico' inválido.")) return;
                        try {
                           const res = await base44.functions.invoke('dataRepair', {});
                           if (res.data && res.data.success) {
                             alert(res.data.message);
                             fetchFuncionarios();
                           } else {
                             throw new Error(res.data?.error || "Erro desconhecido");
                           }
                        } catch (e) {
                           alert("Erro no reparo: " + e.message);
                        }
                      }}
                      className="text-amber-600 focus:text-amber-700 cursor-pointer">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Reparar Dados
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {canCreateFunc && (
                  <Button
                    onClick={handleNovo}
                    variant="outline"
                    className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2">
                    <UserPlus className="w-4 h-4" />
                    Novo Funcionário
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Funcionários</p>
                    <div className="text-2xl font-bold text-slate-900">{funcionarios.length}</div>
                  </div>
                  <Users className="w-8 h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Ativos</p>
                    <div className="text-2xl font-bold text-green-600">{funcionarios.filter(f => f.status === 'ativo').length}</div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Férias</p>
                    <div className="text-2xl font-bold text-yellow-600">{funcionarios.filter(f => f.status === 'ferias').length}</div>
                  </div>
                  <Calendar className="w-8 h-8 text-yellow-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Demitidos/Afastados</p>
                    <div className="text-2xl font-bold text-red-600">{funcionarios.filter(f => f.status === 'demitido' || f.status === 'afastado').length}</div>
                  </div>
                  <UserX className="w-8 h-8 text-red-100" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros Expansíveis */}
          {showFilters &&
            <Card className="mb-6 border-slate-200 shadow-md">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1">Busca Geral</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Nome, CPF, Email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1">Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {Object.entries(statusLabels).map(([key, label]) =>
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1">Cargo</label>
                    <Select value={filterCargo} onValueChange={setFilterCargo}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {cargos.map((cargo) =>
                          <SelectItem key={cargo.id} value={cargo.id}>{cargo.nome}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1">Departamento</label>
                    <Select value={filterDepartamento} onValueChange={setFilterDepartamento}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {departamentos.map((depto) =>
                          <SelectItem key={depto.id} value={depto.id}>{depto.nome}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          }

          {/* Busca Simples */}
          {!showFilters && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar por nome, CPF ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-200" />
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white font-semibold">Nome</TableHead>
                    <TableHead className="text-white font-semibold">CPF</TableHead>
                    <TableHead className="text-white font-semibold">Contato</TableHead>
                    <TableHead className="text-white font-semibold">Cargo</TableHead>
                    <TableHead className="text-white font-semibold">Departamento</TableHead>
                    <TableHead className="text-white font-semibold">Regime</TableHead>
                    <TableHead className="text-white font-semibold text-right">Salário</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-right text-white font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500 bg-white">
                        Carregando funcionários...
                      </TableCell>
                    </TableRow>
                  ) : funcionariosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500 bg-white">
                        Nenhum funcionário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    funcionariosFiltrados.map((funcionario) => (
                      <TableRow key={funcionario.id} className="hover:bg-slate-50 bg-white">
                        <TableCell className="font-medium text-black bg-white">{funcionario.nome}</TableCell>
                        <TableCell className="font-mono text-sm text-black bg-white">{funcionario.cpf}</TableCell>
                        <TableCell className="text-sm text-black bg-white">
                          <div className="flex flex-col">
                            <span>{funcionario.email}</span>
                            <span className="text-gray-500 text-xs">{funcionario.telefone}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-black bg-white">{getCargoNome(funcionario.cargo_id)}</TableCell>
                        <TableCell className="text-black bg-white">{getDepartamentoNome(funcionario.departamento_id)}</TableCell>
                        <TableCell className="text-black bg-white">
                          <Badge variant="outline" className="font-normal">
                            {regimeLabels[funcionario.regime] || funcionario.regime}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-black bg-white font-semibold">
                          {formatCurrency(funcionario.salario || 0)}
                        </TableCell>
                        <TableCell className="text-black bg-white">
                          <Badge className={statusColors[funcionario.status] || 'bg-gray-100 text-gray-800'}>
                            {statusLabels[funcionario.status] || funcionario.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-black bg-white">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleView(funcionario)}
                              title="Visualizar">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canEditFunc && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openFormForEdit(funcionario)}
                                title="Editar"
                                className="text-gray-950 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 w-10">
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {(canEditFunc || canDeleteFunc) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" title="Mais ações">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  {canEditFunc && (
                                    <>
                                      <DropdownMenuItem onClick={() => openFeriasModal(funcionario)}>
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Programar Férias
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openCargoModal(funcionario)}>
                                        <Briefcase className="w-4 h-4 mr-2" />
                                        Alterar Cargo
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openSalarioModal(funcionario)}>
                                        <TrendingUp className="w-4 h-4 mr-2" />
                                        Reajustar Salário
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openDepartamentoModal(funcionario)}>
                                        <Building2 className="w-4 h-4 mr-2" />
                                        Alterar Departamento
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => openDesligamentoModal(funcionario)}
                                        className="text-red-600 focus:text-red-600">
                                        <UserX className="w-4 h-4 mr-2" />
                                        Registrar Desligamento
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {canDeleteFunc && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(funcionario.id)}
                                        className="text-red-600 focus:text-red-600">
                                        <Trash2 className="w-4 h-4 mr-2" />
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Formulário - Condição simplificada */}
      <FuncionarioFormModal
        isOpen={showModal}
        funcionario={validarFuncionarioParaModal(funcionarioSelecionado)}
        onSave={handleSave}
        onClose={handleCloseModal}
      />

      {/* Modal de Visualização */}
      {showViewer && funcionarioSelecionado && (
        <FuncionarioViewer
          funcionario={validarFuncionarioParaModal(funcionarioSelecionado)}
          isOpen={showViewer}
          onClose={() => {
            setShowViewer(false);
            setFuncionarioSelecionado(null);
          }}
          onEdit={canEditFunc ? () => {
            setShowViewer(false);
            openFormForEdit(funcionarioSelecionado);
          } : undefined}
          onDelete={canDeleteFunc ? handleDelete : undefined}
          onProgramarFerias={canEditFunc ? () => {
            setShowViewer(false);
            openFeriasModal(funcionarioSelecionado);
          } : undefined}
          onAlterarCargo={canEditFunc ? () => {
            setShowViewer(false);
            openCargoModal(funcionarioSelecionado);
          } : undefined}
          onReajustarSalario={canEditFunc ? () => {
            setShowViewer(false);
            openSalarioModal(funcionarioSelecionado);
          } : undefined}
          onAlterarDepartamento={canEditFunc ? () => {
            setShowViewer(false);
            openDepartamentoModal(funcionarioSelecionado);
          } : undefined}
          onDesligar={canEditFunc ? () => {
            setShowViewer(false);
            openDesligamentoModal(funcionarioSelecionado);
          } : undefined}
        />
      )}

      {/* Modais de RH */}
      {canEditFunc && <FuncionarioFeriasForm
        isOpen={isFeriasModalOpen}
        onClose={() => {
          setIsFeriasModalOpen(false);
          setFuncionarioParaAcao(null);
        }}
        funcionario={validarFuncionarioParaModal(funcionarioParaAcao)}
        onSuccess={fetchFuncionarios} />
      }

      {canEditFunc && <FuncionarioCargoForm
        isOpen={isCargoModalOpen}
        onClose={() => {
          setIsCargoModalOpen(false);
          setFuncionarioParaAcao(null);
        }}
        funcionario={validarFuncionarioParaModal(funcionarioParaAcao)}
        cargos={cargos}
        onSuccess={fetchFuncionarios} />
      }

      {canEditFunc && <FuncionarioSalarioForm
        isOpen={isSalarioModalOpen}
        onClose={() => {
          setIsSalarioModalOpen(false);
          setFuncionarioParaAcao(null);
        }}
        funcionario={validarFuncionarioParaModal(funcionarioParaAcao)}
        onSuccess={fetchFuncionarios} />
      }

      {canEditFunc && <FuncionarioDepartamentoForm
        isOpen={isDepartamentoModalOpen}
        onClose={() => {
          setIsDepartamentoModalOpen(false);
          setFuncionarioParaAcao(null);
        }}
        funcionario={validarFuncionarioParaModal(funcionarioParaAcao)}
        departamentos={departamentos}
        onSuccess={fetchFuncionarios} />
      }

      {canEditFunc && <FuncionarioDesligamentoForm
        isOpen={isDesligamentoModalOpen}
        onClose={() => {
          setIsDesligamentoModalOpen(false);
          setFuncionarioParaAcao(null);
        }}
        funcionario={validarFuncionarioParaModal(funcionarioParaAcao)}
        onSuccess={fetchFuncionarios} />
      }

      {/* Modal de Relatório */}
      {showRelatorio &&
        <RelatorioFuncionariosViewer
          isOpen={showRelatorio}
          onClose={() => setShowRelatorio(false)}
          funcionarios={funcionariosFiltrados}
          cargos={cargos}
          departamentos={departamentos}
          filtroStatus={filterStatus !== 'todos' ? filterStatus : ''}
          filtroDepartamento={filterDepartamento !== 'todos' ? filterDepartamento : ''}
          filtroCargo={filterCargo !== 'todos' ? filterCargo : ''} />

      }

      {/* Modal de Importação */}
      {canCreateFunc && modalImportar &&
        <ImportarFuncionariosModal
          isOpen={modalImportar}
          onClose={() => setModalImportar(false)}
          onSuccess={() => {
            fetchFuncionarios();
            setModalImportar(false);
          }} />

      }

      {/* Diálogo de Confirmação Padronizado */}
      <DialogComponent />
    </ProtectedPage>
  );
}