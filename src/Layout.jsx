import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ErrorBoundary from "@/components/errors/ErrorBoundary";
import MobileMenu from "@/components/layout/MobileMenu";
import { base44 } from "@/api/base44Client";
import { usePermissions } from '@/components/ProtectedPage';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Landmark,
  ListTodo,
  Users,
  Building2,
  User as UserIcon,
  UserPlus,
  Timer,
  Wallet,
  CalendarCheck,
  ShoppingCart,
  Banknote,
  FileText,
  FileBarChart2,
  Wrench,
  Settings,
  PanelLeft,
  BarChart3,
  UserCog,
  Loader2,
  LogOut,
  UserCircle,
  CreditCard,
  ArrowRightLeft,
  Tags,
  Shield,
  HardHat } from
"lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger } from
"@/components/ui/accordion";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar } from
"@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator } from
"@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/toaster";

// Componente de Transição de Página Simplificado
const PageTransition = ({ children, error }) => {
  if (error) {
    return (
      <main role="main" className="flex-1 flex items-center justify-center bg-gray-50">
        <section className="text-center p-8 bg-white rounded-lg shadow-sm border max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao Carregar Página</h3>
          <p className="text-gray-600 mb-4" role="alert">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Recarregar Página
          </Button>
        </section>
      </main>);

  }

  return (
    <main role="main" className="mx-auto flex-1 animate-in fade-in duration-200">
      {children}
    </main>);

};

const navigationGroups = [
{
  group: "DASHBOARD",
  items: [{ title: "Dashboard", url: "Dashboard", icon: LayoutDashboard, module: "dashboard" }]
},
{
  group: "OPERACIONAL",
  icon: Wrench,
  items: [
  { title: "Ordens de Serviço", url: "OrdensServico", icon: ClipboardList, module: "os" },
  { title: "Orçamentos", url: "Orcamentos", icon: FileText, module: "orcamentos" },
  { title: "Estoque de Produtos", url: "Estoque", icon: Package, module: "estoque" },
  { title: "Controle de Patrimônio", url: "Patrimonio", icon: Landmark, module: "patrimonio" },
  { title: "Tarefas Internas", url: "Tarefas", icon: ListTodo, module: "tarefas" }]

},
{
  group: "CADASTROS",
  icon: FileText,
  items: [
  { title: "Clientes e Veículos", url: "Clientes", icon: Users, module: "clientes" },
  { title: "Fornecedores", url: "Fornecedores", icon: Building2, module: "fornecedores" },
  { title: "Serviços", url: "Servicos", icon: Wrench, module: "os" },
  { title: "Motores", url: "Motores", icon: Wrench, module: "configuracoes" },
  { title: "Categorias", url: "Categorias", icon: Tags, module: "configuracoes" },
  { title: "Formas de Pagamento", url: "FormasPagamento", icon: CreditCard, module: "configuracoes" },
  { title: "Condições de Pagamento", url: "CondicoesPagamento", icon: FileText, module: "configuracoes" },
  { title: "Departamentos", url: "Departamentos", icon: Building2, module: "rh" },
  { title: "Cargos", url: "Cargos", icon: Users, module: "rh" },
  { title: "Tipos de Despesas", url: "TiposDespesa", icon: Tags, module: "configuracoes" },
  { title: "EPIs", url: "EPIs", icon: HardHat, module: "configuracoes" },
  { title: "Cotações EPI", url: "CotacoesEPI", icon: ShoppingCart, module: "configuracoes" },
  { title: "Relatório Entregas EPI", url: "RelatorioEntregasEPI", icon: FileText, module: "configuracoes" }]

},
{
  group: "RECURSOS HUMANOS",
  icon: Users,
  items: [
  { title: "Contratação", url: "Contratacao", icon: UserPlus, module: "contratacao" },
  { title: "Equipe", url: "Funcionarios", icon: UserIcon, module: "funcionarios" },
  { title: "Gestão de RH", url: "GestaoRH", icon: UserCog, module: "rh" },

  { title: "Folha de Pagamento", url: "FolhaPagamento", icon: Wallet, module: "folha" },
  { title: "13º Salário", url: "Folha13", icon: Wallet, module: "folha" },
  { title: "Adiantamentos", url: "Adiantamentos", icon: CalendarCheck, module: "adiantamentos" }]

},

{
  group: "FINANCEIRO",
  icon: Banknote,
  items: [
  { title: "Movimentação Financeira", url: "MovimentacaoFinanceira", icon: ArrowRightLeft, module: "financeiro" },
  { title: "Fluxo de Caixa", url: "FluxoCaixa", icon: FileBarChart2, module: "fluxo_caixa" },
  { title: "Contas Bancarias", url: "ContasBancarias", icon: Banknote, module: "financeiro" },
  { title: "Plano de Contas", url: "PlanoContas", icon: FileBarChart2, module: "plano_contas" },
  { title: "Contas a Pagar", url: "ContasPagar", icon: Banknote, module: "contas_pagar" },
  { title: "Contas a Receber", url: "ContasReceber", icon: Banknote, module: "contas_receber" }]

},
{
  group: "ADMINISTRAÇÃO",
  icon: Settings,
  items: [
  { title: "Gestão de Usuários", url: "GestaoUsuarios", icon: UserCog, module: "usuarios" },
  { title: "Matriz de Permissões", url: "MatrizPermissoes", icon: Shield, module: "usuarios" },
  { title: "Configurações", url: "Configuracoes", icon: Settings, module: "configuracoes" }]

}];


const NavItem = ({ item, currentPath }) => {
  const isActive = currentPath === createPageUrl(item.url);
  const { isCollapsed } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={`w-full justify-start transition-all duration-200 rounded-lg ${
        isActive ?
        "bg-slate-600 text-white shadow-sm" :
        "text-slate-300 hover:bg-slate-700/70 hover:text-white"}`
        }
        aria-current={isActive ? "page" : undefined}>

        <Link to={createPageUrl(item.url)} className="flex items-center gap-3 px-3 py-3 w-full text-left">
          <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          {!isCollapsed && <span className="font-medium text-[15px]">{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>);

};

const AccordionNavGroup = ({ groupData, currentPath }) => {
  const { isCollapsed } = useSidebar();

  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {groupData.items.map((item) =>
        <NavItem key={`${groupData.group}-${item.title}`} item={item} currentPath={currentPath} />
        )}
      </div>);

  }

  return (
    <Accordion type="multiple" className="w-full" collapsible>
      <AccordionItem value={groupData.group} className="border-b-0" key={groupData.group}>
        <AccordionTrigger className="text-slate-400 px-3 py-2.5 text-xs font-bold uppercase flex flex-1 items-center justify-between transition-all [&[data-state=open]>svg]:rotate-180 tracking-wider hover:no-underline hover:bg-slate-700/30 hover:text-slate-300 rounded-lg">
          <div className="flex items-center gap-2">
            {groupData.icon && <groupData.icon className="w-4 h-4" />}
            {groupData.group}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-1 pt-1 pb-2">
          <div className="space-y-1">
            {groupData.items.map((item) =>
            <NavItem key={`${groupData.group}-${item.title}`} item={item} currentPath={currentPath} />
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>);

};

const CustomSidebarHeader = () => {
  const { isCollapsed } = useSidebar();
  return (
    <SidebarHeader className="border-b border-slate-700/50 p-5 bg-slate-800/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-md" aria-label="Logo">
          <Wrench className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        {!isCollapsed && <h2 className="font-bold text-base text-white">Sistema de Gestão</h2>}
      </div>
    </SidebarHeader>);

};

const CustomSidebarFooter = () => {
  return (
    <SidebarFooter className="border-t border-slate-700/50 p-4 bg-slate-800/50" aria-label="Rodapé Sidebar">
      {/* Conteúdo do rodapé, se necessário */}
    </SidebarFooter>);

};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navigationError, setNavigationError] = useState(null);
  const [nomeEmpresa, setNomeEmpresa] = useState("");

  const { hasModule, isAdmin } = usePermissions();

  useEffect(() => {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    // Prevent zoom, ensure proper scaling on all devices
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

    // Prevent browser auto-translation
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.classList.add('notranslate');

    // Add Google Translate meta tag
    let googleTranslateMeta = document.querySelector('meta[name="google"]');
    if (!googleTranslateMeta) {
      googleTranslateMeta = document.createElement('meta');
      googleTranslateMeta.name = 'google';
      googleTranslateMeta.content = 'notranslate';
      document.head.appendChild(googleTranslateMeta);
    }
  }, []);

  // Buscar configurações da empresa
  useEffect(() => {
    let mounted = true;
    const fetchConfiguracoes = async () => {
      try {
        const configs = await base44.entities.Configuracoes.list();
        if (mounted && configs && configs[0]?.nome_empresa) {
          setNomeEmpresa(configs[0].nome_empresa);
        }
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
      }
    };
    fetchConfiguracoes();
    return () => {mounted = false;};
  }, []);

  // Verificar autenticação
  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      setIsLoading(true);
      setNavigationError(null);
      try {
        const authed = await base44.auth.isAuthenticated();
        if (authed && mounted) {
          const currentUser = await base44.auth.me();
          if (mounted) {
            setUser(currentUser);
          }
        } else if (mounted) {
          setUser(null);
        }
      } catch (error) {
        console.log('User not authenticated:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const currentNavItem = React.useMemo(() => {
    for (const group of navigationGroups) {
      const item = group.items.find((i) => i.url === currentPageName);
      if (item) return item;
    }
    return null;
  }, [currentPageName]);

  // Filtrar grupos de navegação baseado nas permissões do usuário
  const navigationGroupsFiltered = React.useMemo(() => {
    if (!user) return [];

    return navigationGroups.
    filter((group) => {
      if (group.requireAdmin && user.role !== 'admin') {
        return false;
      }
      return true;
    }).
    map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (isAdmin) return true;
        if (item.module === 'dashboard') return true;
        return hasModule(item.module);
      })
    })).
    filter((group) => group.items.length > 0);
  }, [user, isAdmin, hasModule]);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setUser(null);
      setNavigationError(null);

      await base44.auth.logout();
      await base44.auth.redirectToLogin();
    } catch (error) {
      console.error('Erro no logout:', error);
      try {
        await base44.auth.redirectToLogin();
      } catch (redirectError) {
        window.location.href = '/';
      }
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await base44.auth.redirectToLogin(window.location.href);
    } catch (error) {
      console.error('Erro no login:', error);
      const msg = error && (error.message || String(error)) || 'Erro ao fazer login';
      const disabledHints = [
      'Google não está habilitada',
      'Google login is not enabled',
      'auth is not enabled'];

      const isDisabled = disabledHints.some((h) => msg.toLowerCase().includes(h.toLowerCase()));
      setNavigationError(
        isDisabled ?
        'Login desabilitado neste app. Peça ao administrador para ativar "Google Login" em Settings > Authentication.' :
        'Erro ao fazer login. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (currentPageName === 'RelatorioOrcamentos' ||
  currentPageName === 'VisualizarOrcamento' ||
  currentPageName === 'FichaCandidato' ||
  currentPageName === 'RelatorioAdiantamentos' ||
  currentPageName === 'RelatorioAdiantamentosPrint' ||
  currentPageName === 'RelatorioFuncionarios' ||
  currentPageName === 'FichaFuncionario' ||
  currentPageName === 'RelatorioFolhaPagamento' ||
  currentPageName === 'RelatorioContasPagar' ||
  currentPageName === 'RelatorioContasReceber' ||
  currentPageName === 'Relatorio13Salario' ||
  currentPageName === 'RelatorioOS' ||
  currentPageName === 'TermoRecebimentoEPI' ||
  currentPageName === 'RelatorioCotacaoEPI') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-slate-600" />
          <p className="text-slate-600">Carregando sistema...</p>
        </div>
      </div>);

  }

  const pageTitle = currentPageName === "Funcionarios" && nomeEmpresa ?
  nomeEmpresa :
  currentPageName;

  const PageIcon = currentNavItem?.icon;

  return (
    <>
      <style>{`
        /* ===== RESET ESTRUTURAL ===== */
        html, body, #root {
          height: 100%;
          width: 100%;
          overflow: hidden;
        }

        /* ===== MODAIS ===== */
        .modern-modal { background-color: white !important; }
        .modern-modal input:not([type="checkbox"]):not([type="radio"]),
        .modern-modal textarea,
        .modern-modal select {
          background-color: white !important;
          color: #1f2937 !important;
        }
        .modern-modal-header,
        .modern-modal-header * {
          background-color: #1e293b !important;
          color: white !important;
        }
        .modern-modal table thead { background-color: #1e293b !important; }
        .modern-modal table thead th { color: white !important; }
        .modern-modal table tbody td { color: #1f2937 !important; }
        .TabsTrigger[data-state="active"] {
          background-color: #1e293b !important;
          color: white !important;
        }

        /* ===== LAYOUT PRINCIPAL ===== */
        .app-shell {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: #f1f5f9;
        }

        .app-main {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          height: 100vh;
          overflow: hidden;
        }

        /* ===== HEADER ===== */
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          flex-shrink: 0;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border-bottom: 1px solid #334155;
          padding: 0 1.25rem;
          height: 60px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          position: sticky;
          top: 0;
          z-index: 30;
        }

        .app-header-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #f1f5f9;
          letter-spacing: 0.01em;
          line-height: 1.3;
        }

        .app-header-breadcrumb {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        /* Botão sidebar trigger - área de toque grande */
        .sidebar-trigger-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .sidebar-trigger-btn:hover,
        .sidebar-trigger-btn:active {
          background: rgba(100,116,139,0.4);
        }

        @media (max-width: 767px) {
          .app-header {
            padding: 0 0.875rem;
            height: 56px;
          }
        }

        /* ===== ÁREA DE CONTEÚDO ===== */
        .app-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scroll-behavior: smooth;
          touch-action: pan-x pan-y;
        }

        /* ===== PAGE INNER - SEM MAX-WIDTH LIMITANTE ===== */
        .page-inner {
          width: 100%;
          min-width: 0;
          padding: 1.25rem 1.5rem;
          color: #1e293b;
          font-size: 0.9375rem;
          line-height: 1.5;
        }

        @media (max-width: 767px) {
          .page-inner {
            padding: 0.875rem 0.875rem;
            font-size: 0.875rem;
          }
        }

        /* ===== SCROLLBARS DESKTOP ===== */
        @media (min-width: 768px) {
          .app-content::-webkit-scrollbar { width: 8px; height: 8px; }
          .app-content::-webkit-scrollbar-track { background: #e2e8f0; }
          .app-content::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 6px;
            border: 2px solid #e2e8f0;
          }
          .app-content::-webkit-scrollbar-thumb:hover { background: #64748b; }
          .app-content::-webkit-scrollbar-corner { background: #e2e8f0; }
        }

        /* ===== TABELAS RESPONSIVAS ===== */
        .table-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          border-radius: 0.5rem;
        }

        @media (min-width: 768px) {
          .table-wrapper::-webkit-scrollbar { height: 8px; }
          .table-wrapper::-webkit-scrollbar-track { background: #f8fafc; border-radius: 4px; }
          .table-wrapper::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .table-wrapper::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        }

        /* ===== SIDEBAR ===== */
        [data-sidebar] { flex-shrink: 0; }

        /* ===== PADRONIZAÇÃO GLOBAL DE TIPOGRAFIA ===== */
        .page-inner h1 { font-size: 1.5rem; font-weight: 700; color: #0f172a; line-height: 1.3; }
        .page-inner h2 { font-size: 1.25rem; font-weight: 600; color: #1e293b; line-height: 1.35; }
        .page-inner h3 { font-size: 1.0625rem; font-weight: 600; color: #1e293b; line-height: 1.4; }
        .page-inner p, .page-inner span, .page-inner label { color: #334155; }
        .page-inner .text-muted { color: #64748b; font-size: 0.8125rem; }

        @media (max-width: 767px) {
          .page-inner h1 { font-size: 1.2rem; }
          .page-inner h2 { font-size: 1.0625rem; }
          .page-inner h3 { font-size: 0.9375rem; }
        }
      `}</style>
      
      <SidebarProvider>
        <div className="app-shell">
          {/* Sidebar - apenas desktop */}
          <Sidebar
            className="no-print border-r-0 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex-col transition-all duration-300 shadow-xl hidden md:flex"
            aria-label="Sidebar de Navegação"
          >
            <CustomSidebarHeader />
            <SidebarContent className="flex min-h-0 flex-col gap-3 overflow-auto group-data-[collapsible=icon]:overflow-hidden p-3 flex-1">
              <SidebarMenu className="space-y-3">
                {navigationGroupsFiltered.map((group) =>
                  <AccordionNavGroup key={group.group} groupData={group} currentPath={location.pathname} />
                )}
              </SidebarMenu>
            </SidebarContent>
            <CustomSidebarFooter />
          </Sidebar>

          <div className="app-main">
            {/* Header fixo, full-width */}
            <header className="app-header no-print" role="banner">
              <div className="flex items-center gap-2 min-w-0">
                {/* Toggle sidebar desktop - área de toque grande */}
                <SidebarTrigger
                  className="sidebar-trigger-btn hidden md:flex flex-shrink-0"
                  aria-label="Alternar menu Sidebar"
                >
                  <PanelLeft className="w-5 h-5 text-slate-400" aria-hidden="true" />
                </SidebarTrigger>
                {/* Menu hamburguer mobile */}
                <MobileMenu navigationGroups={navigationGroupsFiltered} />
                {/* Breadcrumb desktop */}
                <div className="hidden md:flex items-center gap-2 min-w-0">
                  <span className="app-header-breadcrumb flex-shrink-0">Sistema /</span>
                  {PageIcon && <PageIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  <span className="app-header-title truncate">{pageTitle}</span>
                </div>
                {/* Título mobile */}
                <div className="md:hidden flex items-center gap-2 min-w-0">
                  {PageIcon && <PageIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  <span className="app-header-title truncate">{pageTitle}</span>
                </div>
              </div>

              {/* Usuário */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700/60 transition-colors flex-shrink-0 touch-manipulation"
                      aria-haspopup="true"
                      style={{ minWidth: 44, minHeight: 44 }}
                    >
                      <UserCircle className="w-6 h-6 text-slate-200 flex-shrink-0" aria-hidden="true" />
                      <div className="text-left hidden md:block">
                        <p className="text-sm font-semibold text-slate-100 leading-tight">{user?.full_name || user?.email}</p>
                        <p className="text-xs text-slate-400 leading-tight">{user?.email}</p>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" role="menu">
                    <DropdownMenuItem onClick={() => navigate(createPageUrl('MeuPerfil'))}>
                      <UserCog className="mr-2 h-4 w-4" />
                      <span>Meu Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair do Sistema</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={handleLogin} variant="outline" className="text-slate-50 border-slate-600 hover:bg-slate-700 flex-shrink-0">
                  Entrar
                </Button>
              )}
            </header>

            {/* Conteúdo principal com scroll */}
            <div className="app-content">
              <PageTransition error={navigationError}>
                <ErrorBoundary currentPageName={currentPageName}>
                  <div className="page-inner text-slate-800">
                    {children}
                  </div>
                </ErrorBoundary>
              </PageTransition>
            </div>
          </div>
        </div>
        <Toaster />
      </SidebarProvider>
    </>);

}