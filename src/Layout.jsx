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
  Users,
  Building2,
  User as UserIcon,
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
  HardHat,
  ChevronDown,
  Zap
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
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
  useSidebar
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/toaster";

const PageTransition = ({ children, error }) => {
  if (error) {
    return (
      <main role="main" className="flex-1 flex items-center justify-center bg-gray-50">
        <section className="text-center p-8 bg-white rounded-2xl shadow-sm border max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao Carregar Página</h3>
          <p className="text-gray-600 mb-4" role="alert">{error}</p>
          <Button onClick={() => window.location.reload()}>Recarregar Página</Button>
        </section>
      </main>
    );
  }
  return (
    <main role="main" className="mx-auto flex-1 animate-in fade-in duration-200">
      {children}
    </main>
  );
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
      { title: "Estoque de Produtos", url: "Estoque", icon: Package, module: "estoque" }
    ]
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
      { title: "Relatório Entregas EPI", url: "RelatorioEntregasEPI", icon: FileText, module: "configuracoes" }
    ]
  },
  {
    group: "RECURSOS HUMANOS",
    icon: Users,
    items: [
      { title: "Equipe", url: "Funcionarios", icon: UserIcon, module: "funcionarios" },
      { title: "Controle de Ponto", url: "Ponto", icon: Timer, module: "ponto" },
      { title: "Espelho de Ponto", url: "EspelhoPonto", icon: FileText, module: "ponto" },
      { title: "Folha de Pagamento", url: "FolhaPagamento", icon: Wallet, module: "folha" },
      { title: "13º Salário", url: "Folha13", icon: Wallet, module: "folha" },
      { title: "Adiantamentos", url: "Adiantamentos", icon: CalendarCheck, module: "adiantamentos" }
    ]
  },
  {
    group: "FINANCEIRO",
    icon: Banknote,
    items: [
      { title: "Movimentação Financeira", url: "MovimentacaoFinanceira", icon: ArrowRightLeft, module: "financeiro" },
      { title: "Fluxo de Caixa", url: "FluxoCaixa", icon: FileBarChart2, module: "fluxo_caixa" },
      { title: "Contas Bancárias", url: "ContasBancarias", icon: Banknote, module: "financeiro" },
      { title: "Plano de Contas", url: "PlanoContas", icon: FileBarChart2, module: "plano_contas" },
      { title: "Contas a Pagar", url: "ContasPagar", icon: Banknote, module: "contas_pagar" },
      { title: "Contas a Receber", url: "ContasReceber", icon: Banknote, module: "contas_receber" }
    ]
  },
  {
    group: "ADMINISTRAÇÃO",
    icon: Settings,
    items: [
      { title: "Gestão de Usuários", url: "GestaoUsuarios", icon: UserCog, module: "usuarios" },
      { title: "Matriz de Permissões", url: "MatrizPermissoes", icon: Shield, module: "usuarios" },
      { title: "Configurações", url: "Configuracoes", icon: Settings, module: "configuracoes" }
    ]
  }
];

const NavItem = ({ item, currentPath }) => {
  const isActive = currentPath === createPageUrl(item.url);
  const { isCollapsed } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={`w-full justify-start transition-all duration-150 rounded-lg nav-item ${
          isActive ? "nav-item-active" : "nav-item-inactive"
        }`}
        aria-current={isActive ? "page" : undefined}
      >
        <Link to={createPageUrl(item.url)} className="flex items-center gap-2.5 px-2.5 py-2 w-full text-left">
          <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {!isCollapsed && <span className="font-medium text-[13px] leading-none">{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const AccordionNavGroup = ({ groupData, currentPath }) => {
  const { isCollapsed } = useSidebar();
  const hasActive = groupData.items.some(
    (item) => currentPath === createPageUrl(item.url)
  );

  if (groupData.group === "DASHBOARD") {
    return (
      <div className="space-y-0.5">
        {groupData.items.map((item) => (
          <NavItem key={item.title} item={item} currentPath={currentPath} />
        ))}
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className="space-y-0.5">
        {groupData.items.map((item) => (
          <NavItem key={`${groupData.group}-${item.title}`} item={item} currentPath={currentPath} />
        ))}
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full" defaultValue={hasActive ? [groupData.group] : []}>
      <AccordionItem value={groupData.group} className="border-b-0">
        <AccordionTrigger className="sidebar-section-trigger px-2.5 py-2 text-[10px] font-bold uppercase tracking-widest hover:no-underline rounded-lg [&[data-state=open]>svg]:rotate-180">
          <div className="flex items-center gap-2">
            {groupData.icon && <groupData.icon className="w-3.5 h-3.5 opacity-60" />}
            <span>{groupData.group}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pl-1 pr-0 pt-0.5 pb-1">
          <div className="space-y-0.5">
            {groupData.items.map((item) => (
              <NavItem key={`${groupData.group}-${item.title}`} item={item} currentPath={currentPath} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

const CustomSidebarHeader = ({ nomeEmpresa }) => {
  const { isCollapsed } = useSidebar();
  return (
    <SidebarHeader className="sidebar-header p-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="sidebar-logo-icon" aria-label="Logo">
          <Zap className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        {!isCollapsed && (
          <div>
            <div className="text-[15px] font-800 text-white leading-tight font-extrabold tracking-tight">
              Sistema de Gestão
            </div>
            {nomeEmpresa && (
              <div className="text-[10.5px] text-blue-300/70 font-medium mt-0.5 truncate max-w-[150px]">
                {nomeEmpresa}
              </div>
            )}
          </div>
        )}
      </div>
    </SidebarHeader>
  );
};

const CustomSidebarFooter = () => (
  <SidebarFooter className="sidebar-footer p-3 flex-shrink-0" aria-label="Rodapé Sidebar" />
);

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
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.classList.add('notranslate');
    let googleTranslateMeta = document.querySelector('meta[name="google"]');
    if (!googleTranslateMeta) {
      googleTranslateMeta = document.createElement('meta');
      googleTranslateMeta.name = 'google';
      googleTranslateMeta.content = 'notranslate';
      document.head.appendChild(googleTranslateMeta);
    }
  }, []);

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
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      setIsLoading(true);
      setNavigationError(null);
      try {
        const authed = await base44.auth.isAuthenticated();
        if (authed && mounted) {
          const currentUser = await base44.auth.me();
          if (mounted) setUser(currentUser);
        } else if (mounted) {
          setUser(null);
        }
      } catch (error) {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    checkAuth();
    return () => { mounted = false; };
  }, []);

  const currentNavItem = React.useMemo(() => {
    for (const group of navigationGroups) {
      const item = group.items.find((i) => i.url === currentPageName);
      if (item) return item;
    }
    return null;
  }, [currentPageName]);

  const navigationGroupsFiltered = React.useMemo(() => {
    if (!user) return [];
    return navigationGroups
      .filter((group) => !(group.requireAdmin && user.role !== 'admin'))
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (isAdmin) return true;
          if (item.module === 'dashboard') return true;
          return hasModule(item.module);
        })
      }))
      .filter((group) => group.items.length > 0);
  }, [user, isAdmin, hasModule]);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setUser(null);
      setNavigationError(null);
      await base44.auth.logout();
      await base44.auth.redirectToLogin();
    } catch (error) {
      try { await base44.auth.redirectToLogin(); }
      catch { window.location.href = '/'; }
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await base44.auth.redirectToLogin(window.location.href);
    } catch (error) {
      const msg = error?.message || String(error) || '';
      const disabledHints = ['Google não está habilitada', 'Google login is not enabled', 'auth is not enabled'];
      const isDisabled = disabledHints.some((h) => msg.toLowerCase().includes(h.toLowerCase()));
      setNavigationError(
        isDisabled
          ? 'Login desabilitado neste app. Peça ao administrador para ativar "Google Login" em Settings > Authentication.'
          : 'Erro ao fazer login. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const pagesWithoutLayout = [
    'RelatorioOrcamentos','VisualizarOrcamento','FichaCandidato',
    'RelatorioAdiantamentos','RelatorioAdiantamentosPrint','RelatorioFuncionarios',
    'FichaFuncionario','RelatorioFolhaPagamento','RelatorioContasPagar',
    'RelatorioContasReceber','Relatorio13Salario','RelatorioOS',
    'TermoRecebimentoEPI','RelatorioCotacaoEPI','EspelhoPonto'
  ];
  if (pagesWithoutLayout.includes(currentPageName)) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1629]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <p className="text-slate-400 text-sm font-medium">Carregando sistema...</p>
          </div>
        </div>
      </div>
    );
  }

  const pageTitle = currentPageName === "Funcionarios" && nomeEmpresa
    ? nomeEmpresa
    : currentNavItem?.title || currentPageName;

  const PageIcon = currentNavItem?.icon;

  const userInitials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

        :root {
          --sb-bg: #0B1629;
          --accent: #1A56DB;
          --border-sb: rgba(255,255,255,0.06);
          --text-sb: rgba(255,255,255,0.72);
          --text-sb-h: rgba(255,255,255,0.95);
        }

        html, body, #root { height: 100%; width: 100%; overflow: hidden; }
        * { font-family: 'Outfit', sans-serif; }

        .app-shell { display: flex; height: 100vh; width: 100vw; overflow: hidden; background: #F1F5F9; }
        .app-main { display: flex; flex-direction: column; flex: 1; min-width: 0; height: 100vh; overflow: hidden; }

        [data-sidebar],
        [data-sidebar] *:not(svg):not(path):not(span):not(a):not(button) {
          --sidebar-background: #0B1629 !important;
        }

        [data-sidebar],
        aside[data-sidebar],
        div[data-sidebar],
        [data-slot="sidebar"],
        [data-slot="sidebar-wrapper"],
        [data-slot="sidebar-gap"] {
          background: #0B1629 !important;
          background-color: #0B1629 !important;
          opacity: 1 !important;
          border-right: none !important;
          box-shadow: 4px 0 24px rgba(0,0,0,0.18) !important;
          flex-shrink: 0;
        }

        [data-slot="sidebar-content"] {
          background: #0B1629 !important;
          background-color: #0B1629 !important;
        }

        .sidebar-header,
        [data-slot="sidebar-header"] {
          background: #0a1525 !important;
          background-color: #0a1525 !important;
          border-bottom: 1px solid rgba(255,255,255,0.07) !important;
        }
        .sidebar-footer,
        [data-slot="sidebar-footer"] {
          background: #0a1525 !important;
          background-color: #0a1525 !important;
          border-top: 1px solid var(--border-sb) !important;
        }

        .sidebar-logo-icon {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: linear-gradient(135deg, #1A56DB, #1e40af);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(26,86,219,0.35);
          flex-shrink: 0;
        }

        .sidebar-section-trigger {
          color: rgba(255,255,255,0.65) !important;
          letter-spacing: 0.12em !important;
          transition: all 0.15s !important;
        }
        .sidebar-section-trigger:hover {
          color: rgba(255,255,255,0.90) !important;
          background: rgba(255,255,255,0.04) !important;
        }
        .sidebar-section-trigger svg { color: rgba(255,255,255,0.2) !important; width: 12px !important; height: 12px !important; }

        .nav-item { position: relative; color: var(--text-sb) !important; transition: all 0.12s !important; margin: 1px 0 !important; }
        .nav-item:hover { background: rgba(255,255,255,0.055) !important; color: var(--text-sb-h) !important; }
        .nav-item svg { opacity: 0.85; }

        .nav-item-active { background: rgba(26,86,219,0.18) !important; color: #ffffff !important; }
        .nav-item-active::before {
          content: '';
          position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          width: 3px; height: 18px;
          background: var(--accent);
          border-radius: 0 3px 3px 0;
        }
        .nav-item-active svg { opacity: 1; color: #93c5fd !important; }
        .nav-item-inactive { background: transparent !important; }
        .nav-item-inactive:hover { background: rgba(255,255,255,0.055) !important; color: rgba(255,255,255,0.8) !important; }

        [data-sidebar] ::-webkit-scrollbar { width: 3px; }
        [data-sidebar] ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

        .app-header {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; flex-shrink: 0;
          background: #0B1629;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 0 1.25rem; height: 56px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
          position: sticky; top: 0; z-index: 30;
        }

        .header-breadcrumb { font-size: 12px; color: rgba(255,255,255,0.3); font-weight: 500; }
        .header-sep { color: rgba(255,255,255,0.15); margin: 0 4px; font-size: 13px; }
        .header-page-title { font-size: 13.5px; font-weight: 700; color: rgba(255,255,255,0.9); letter-spacing: -0.1px; }
        .header-page-icon { color: rgba(255,255,255,0.4); }

        .sidebar-trigger-btn {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 8px;
          background: transparent; border: none; cursor: pointer;
          transition: background 0.15s; color: rgba(255,255,255,0.45);
        }
        .sidebar-trigger-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

        .user-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #1A56DB, #7C3AED);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; color: white; flex-shrink: 0; letter-spacing: 0.5px;
        }
        .user-trigger-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 8px; border-radius: 8px;
          background: transparent; border: none; cursor: pointer;
          transition: background 0.15s; min-height: 38px;
        }
        .user-trigger-btn:hover { background: rgba(255,255,255,0.07); }
        .user-name { font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.88); line-height: 1.2; }
        .user-email { font-size: 10.5px; color: rgba(255,255,255,0.35); line-height: 1.2; }

        .app-content {
          flex: 1; overflow-y: auto; overflow-x: auto;
          -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
          scroll-behavior: smooth; background: #F1F5F9;
        }

        .page-inner {
          width: 100%; min-width: 0;
          padding: 22px 24px;
          color: #1e293b; font-size: 14px; line-height: 1.5;
        }

        @media (max-width: 767px) {
          .page-inner { padding: 14px; font-size: 13.5px; }
          .app-header { padding: 0 14px; height: 52px; }
        }

        @media (min-width: 768px) {
          .app-content::-webkit-scrollbar { width: 6px; height: 6px; }
          .app-content::-webkit-scrollbar-track { background: #E2E8F0; }
          .app-content::-webkit-scrollbar-thumb { background: #94A3B8; border-radius: 6px; }
          .app-content::-webkit-scrollbar-thumb:hover { background: #64748B; }
        }

        .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; }

        .page-inner h1 { font-size: 22px; font-weight: 800; line-height: 1.2; letter-spacing: -0.5px; color: #111827; }
        .page-inner h2 { font-size: 18px; font-weight: 700; line-height: 1.3; color: #1e293b; }
        .page-inner h3 { font-size: 15px; font-weight: 600; line-height: 1.4; color: #1e293b; }

        .modern-modal { background-color: white !important; border-radius: 14px !important; }
        .modern-modal input:not([type="checkbox"]):not([type="radio"]),
        .modern-modal textarea, .modern-modal select {
          background-color: white !important; color: #1f2937 !important;
          border-color: #E5E7EB !important; border-radius: 7px !important;
        }
        .modern-modal input:focus, .modern-modal textarea:focus, .modern-modal select:focus {
          border-color: #1A56DB !important; box-shadow: 0 0 0 3px rgba(26,86,219,0.1) !important;
        }
        .modern-modal-header, .modern-modal-header * {
          background-color: #0B1629 !important; color: white !important; border-radius: 14px 14px 0 0 !important;
        }
        .modern-modal table thead { background-color: #0B1629 !important; }
        .modern-modal table thead th { color: rgba(255,255,255,0.55) !important; font-size: 10.5px !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; }
        .modern-modal table tbody td { color: #1f2937 !important; }
        .TabsTrigger[data-state="active"] { color: #1A56DB !important; border-bottom: 2px solid #1A56DB !important; background: transparent !important; }
      `}</style>

      <SidebarProvider>
        <div className="app-shell">
          <Sidebar className="no-print border-r-0 hidden md:flex" aria-label="Sidebar de Navegação">
            <CustomSidebarHeader nomeEmpresa={nomeEmpresa} />
            <SidebarContent className="flex min-h-0 flex-col gap-1 overflow-auto p-2.5 flex-1">
              <SidebarMenu className="space-y-0.5">
                {navigationGroupsFiltered.map((group) => (
                  <AccordionNavGroup key={group.group} groupData={group} currentPath={location.pathname} />
                ))}
              </SidebarMenu>
            </SidebarContent>
            <CustomSidebarFooter />
          </Sidebar>

          <div className="app-main">
            <header className="app-header no-print" role="banner">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="sidebar-trigger-btn hidden md:flex flex-shrink-0" aria-label="Alternar menu Sidebar">
                  <PanelLeft className="w-4 h-4" aria-hidden="true" />
                </SidebarTrigger>
                <MobileMenu navigationGroups={navigationGroupsFiltered} />
                <div className="hidden md:flex items-center gap-1 min-w-0">
                  <span className="header-breadcrumb flex-shrink-0">Sistema</span>
                  <span className="header-sep">/</span>
                  {PageIcon && <PageIcon className="w-3.5 h-3.5 header-page-icon flex-shrink-0" aria-hidden="true" />}
                  <span className="header-page-title truncate">{pageTitle}</span>
                </div>
                <div className="md:hidden flex items-center gap-2 min-w-0">
                  {PageIcon && <PageIcon className="w-4 h-4 header-page-icon flex-shrink-0" aria-hidden="true" />}
                  <span className="header-page-title truncate">{pageTitle}</span>
                </div>
              </div>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="user-trigger-btn" aria-haspopup="true">
                      <div className="user-avatar">{userInitials}</div>
                      <div className="text-left hidden md:block">
                        <p className="user-name">{user?.full_name?.split(' ')[0] || user?.email}</p>
                        <p className="user-email">{user?.email}</p>
                      </div>
                      <ChevronDown className="w-3 h-3 text-white/30 hidden md:block flex-shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 shadow-lg" role="menu">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-900 truncate">{user?.full_name || user?.email}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuItem onClick={() => navigate(createPageUrl('MeuPerfil'))} className="mt-1">
                      <UserCog className="mr-2 h-4 w-4" />
                      <span>Meu Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair do Sistema</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={handleLogin} variant="outline" className="text-slate-50 border-white/20 hover:bg-white/10 flex-shrink-0 text-sm">
                  Entrar
                </Button>
              )}
            </header>

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
    </>
  );
}