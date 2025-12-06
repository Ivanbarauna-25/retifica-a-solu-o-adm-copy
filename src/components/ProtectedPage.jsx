
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * MAPEAMENTO DE PÁGINAS PARA MÓDULOS DE PERMISSÃO
 */
const PAGE_MODULE_MAP = {
  // Operacional
  'OrdensServico': 'os',
  'Orcamentos': 'orcamentos',
  'FrenteCaixa': 'os',
  'Estoque': 'estoque',
  'Patrimonio': 'patrimonio',
  'Tarefas': 'tarefas',
  
  // Cadastros
  'Clientes': 'clientes',
  'Fornecedores': 'fornecedores',
  'Servicos': 'os',
  'Categorias': 'configuracoes',
  'FormasPagamento': 'configuracoes',
  'CondicoesPagamento': 'configuracoes',
  'Departamentos': 'rh',
  'Cargos': 'rh',
  
  // RH
  'Contratacao': 'contratacao',
  'Funcionarios': 'funcionarios',
  'GestaoRH': 'rh',
  'Ponto': 'ponto',
  'FolhaPagamento': 'folha',
  'Adiantamentos': 'adiantamentos',
  
  // Compras
  'ComprasRevenda': 'compras',
  'ComprasConsumo': 'compras',
  
  // Financeiro
  'MovimentacaoFinanceira': 'financeiro',
  'FluxoCaixa': 'fluxo_caixa',
  'ContasBancarias': 'financeiro',
  'PlanoContas': 'plano_contas',
  'ContasPagar': 'contas_pagar',
  'ContasReceber': 'contas_receber',
  'DRE': 'dre',
  
  // Administração
  'GestaoUsuarios': 'usuarios',
  'MatrizPermissoes': 'usuarios',
  'Configuracoes': 'configuracoes',
  
  // Desenvolvedor
  'GerenciarErros': 'dev',
  'TarefasCodeFix': 'dev',
  'MonitoramentoAgente': 'dev'
};

/**
 * PERMISSÕES PADRÃO POR ROLE (fallback quando não há cargo)
 */
const ROLE_PERMISSIONS = {
  admin: { 
    modulos_acoes: [{ modulo: '*', acoes: ['*'] }],
    permissoes_especiais: ['*'] // Admin has all special permissions
  },
  rh: { 
    modulos_acoes: [
      { modulo: 'dashboard', acoes: ['visualizar'] },
      { modulo: 'funcionarios', acoes: ['visualizar', 'criar', 'editar', 'aprovar'] },
      { modulo: 'rh', acoes: ['visualizar', 'criar', 'editar', 'aprovar'] },
      { modulo: 'ponto', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'folha', acoes: ['visualizar', 'criar', 'editar', 'aprovar'] },
      { modulo: 'adiantamentos', acoes: ['visualizar', 'criar', 'editar', 'aprovar'] },
      { modulo: 'contratacao', acoes: ['visualizar', 'criar', 'editar', 'aprovar'] },
      { modulo: 'usuarios', acoes: ['visualizar', 'criar', 'editar'] }
    ],
    permissoes_especiais: ['aprovar_folha', 'aprovar_adiantamentos', 'aprovar_contratacao']
  },
  gerente: { 
    modulos_acoes: [
      { modulo: 'dashboard', acoes: ['visualizar'] },
      { modulo: 'os', acoes: ['visualizar', 'criar', 'editar', 'aprovar'] },
      { modulo: 'orcamentos', acoes: ['visualizar', 'criar', 'editar', 'aprovar'] },
      { modulo: 'estoque', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'clientes', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'fornecedores', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'funcionarios', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'tarefas', acoes: ['visualizar', 'criar', 'editar', 'deletar'] },
      { modulo: 'financeiro', acoes: ['visualizar', 'criar', 'editar'] }
    ],
    permissoes_especiais: ['aprovar_os', 'aprovar_orcamentos']
  },
  financeiro: { 
    modulos_acoes: [
      { modulo: 'dashboard', acoes: ['visualizar'] },
      { modulo: 'financeiro', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'contas_pagar', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'contas_receber', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'fluxo_caixa', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'plano_contas', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'dre', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'movimentacao', acoes: ['visualizar', 'criar', 'editar'] }
    ],
    permissoes_especiais: []
  },
  vendedor: { 
    modulos_acoes: [
      { modulo: 'dashboard', acoes: ['visualizar'] },
      { modulo: 'os', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'orcamentos', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'clientes', acoes: ['visualizar', 'criar', 'editar'] },
      { modulo: 'estoque', acoes: ['visualizar'] }
    ],
    permissoes_especiais: []
  },
  mecanico: { 
    modulos_acoes: [
      { modulo: 'dashboard', acoes: ['visualizar'] },
      { modulo: 'os', acoes: ['visualizar', 'editar'] }
    ],
    permissoes_especiais: []
  },
  user: { 
    modulos_acoes: [
      { modulo: 'dashboard', acoes: ['visualizar'] }
    ],
    permissoes_especiais: []
  }
};

// Cache global SIMPLIFICADO - armazena apenas os dados essenciais
let permissionsCache = {
  user: null,
  funcionario: null,
  cargo: null,
  timestamp: 0,
  isLoading: false, // Flag para evitar chamadas simultâneas
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos (aumentado)

// Função auxiliar para verificar se cache é válido
const isCacheValid = () => {
  const now = Date.now();
  return permissionsCache.user && (now - permissionsCache.timestamp) < CACHE_DURATION;
};

// Função para carregar dados de permissões (usada por ambos ProtectedPage e usePermissions)
const loadPermissionsData = async () => {
  // Se já está carregando, aguardar um pouco e retornar cache
  if (permissionsCache.isLoading) {
    // Wait for the ongoing fetch to complete, then return the result
    // This is a simple wait; a more robust solution might use a promise queue
    let attempts = 0;
    while (permissionsCache.isLoading && attempts < 20) { // Max 2 seconds wait
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    // After waiting, if cache is still valid, return it.
    // Otherwise, proceed to fetch again (might happen if the first fetch failed or timed out)
    if (isCacheValid()) {
      return {
        user: permissionsCache.user,
        funcionario: permissionsCache.funcionario,
        cargo: permissionsCache.cargo
      };
    }
  }

  // Se cache válido, retornar imediatamente
  if (isCacheValid()) {
    return {
      user: permissionsCache.user,
      funcionario: permissionsCache.funcionario,
      cargo: permissionsCache.cargo
    };
  }

  // Marcar como loading
  permissionsCache.isLoading = true;

  try {
    const currentUser = await base44.auth.me();
    let currentFuncionario = null;
    let currentCargo = null;

    // Buscar funcionário e cargo apenas se não for admin
    if (currentUser.role !== 'admin' && currentUser.funcionario_id) {
      // Validar se funcionario_id não é um valor especial
      const funcionarioId = currentUser.funcionario_id;
      
      if (funcionarioId && 
          funcionarioId !== 'unassigned' && 
          funcionarioId !== 'todos' && 
          funcionarioId !== 'all' && 
          funcionarioId !== 'null' && 
          funcionarioId !== 'undefined') {
        try {
          const fetchedFuncionarios = await base44.entities.Funcionario.filter({ id: funcionarioId });
          if (fetchedFuncionarios && fetchedFuncionarios[0]) {
            currentFuncionario = fetchedFuncionarios[0];

            // Validar cargo_id antes de buscar
            const cargoId = currentFuncionario.cargo_id;
            if (cargoId && 
                cargoId !== 'unassigned' && 
                cargoId !== 'todos' && 
                cargoId !== 'all' && 
                cargoId !== 'null' && 
                cargoId !== 'undefined') {
              const fetchedCargos = await base44.entities.Cargo.filter({ id: cargoId });
              if (fetchedCargos && fetchedCargos[0]) {
                currentCargo = fetchedCargos[0];
              }
            }
          }
        } catch (error) {
          console.warn('Erro ao buscar funcionário ou cargo:', error);
        }
      }
    }

    // Atualizar cache
    permissionsCache = {
      user: currentUser,
      funcionario: currentFuncionario,
      cargo: currentCargo,
      timestamp: Date.now(),
      isLoading: false
    };

    return {
      user: currentUser,
      funcionario: currentFuncionario,
      cargo: currentCargo
    };
  } catch (error) {
    permissionsCache.isLoading = false;
    throw error;
  }
};

/**
 * Helper para ProtectedPage: Busca permissões a partir dos objetos user, funcionario, cargo.
 * Retorna { modulos_acoes: [], permissoes_especiais: [] }
 */
const getPermissionsFromUserAndCargo = ({ user, funcionario, cargo }) => {
  // 1. Tentar permissões do CARGO
  if (cargo) {
      // Usar nova estrutura granular se disponível
      if (cargo.permissoes_modulos_acoes && cargo.permissoes_modulos_acoes.length > 0) {
          return {
              modulos_acoes: cargo.permissoes_modulos_acoes,
              permissoes_especiais: cargo.permissoes_especiais || []
          };
      }
      
      // Fallback para estrutura antiga (migrar para nova)
      if (cargo.permissoes_modulos && cargo.permissoes_modulos.length > 0) {
          const modulosAcoes = cargo.permissoes_modulos.map(modulo => ({
              modulo: modulo,
              acoes: cargo.permissoes_acoes || ['visualizar']
          }));
          return {
              modulos_acoes: modulosAcoes,
              permissoes_especiais: cargo.permissoes_especiais || []
          };
      }
  }

  // 2. Fallback para permissões do ROLE
  const systemRole = user?.system_role || user?.role || 'user';
  return ROLE_PERMISSIONS[systemRole] || ROLE_PERMISSIONS.user;
};

/**
 * Componente de Proteção de Página
 * Verifica permissões antes de renderizar o conteúdo
 */
export default function ProtectedPage({ children, pageName, requiresAuth = true }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [user, setUser] = useState(null); // Keep local user state for display purposes
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const hasCheckedRef = useRef(false); // Evitar verificações múltiplas

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Verificar apenas uma vez por montagem
    // Use pageName as a dependency if the page's permissions might change based on its name dynamically
    // Otherwise, if it's static per page component, remove pageName from dependencies
    if (!hasCheckedRef.current || pageName !== (window._lastPageNameChecked || '')) {
      hasCheckedRef.current = true;
      window._lastPageNameChecked = pageName; // Simple way to track last checked pageName
      checkPermissions();
    }
  }, [pageName]); // Keep pageName here for dynamic page protection

  const checkPermissions = async () => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    
    try {
      // 1. Verificar autenticação
      if (requiresAuth) {
        const authed = await base44.auth.isAuthenticated();
        if (!authed) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }
      }

      // 2. Carregar dados de permissões (usa cache)
      const { user: currentUser, funcionario: currentFuncionario, cargo: currentCargo } = await loadPermissionsData();
      
      if (!isMountedRef.current) return;
      setUser(currentUser);

      // 3. Admin tem acesso total
      if (currentUser.role === 'admin') {
        if (isMountedRef.current) {
          setHasPermission(true);
          setIsLoading(false);
        }
        return;
      }

      // 4. Páginas públicas (não precisam de permissão específica)
      const publicPages = ['Dashboard', 'MeuPerfil'];
      if (publicPages.includes(pageName)) {
        if (isMountedRef.current) {
          setHasPermission(true);
          setIsLoading(false);
        }
        return;
      }

      // 5. Buscar permissões do usuário (usando a função atualizada)
      const userPermissions = getPermissionsFromUserAndCargo({
        user: currentUser,
        funcionario: currentFuncionario,
        cargo: currentCargo
      });
      if (!isMountedRef.current) return;

      // 6. Verificar se tem permissão para esta página
      const requiredModule = PAGE_MODULE_MAP[pageName];
      
      if (!requiredModule) {
        console.warn(`Página ${pageName} não está mapeada no sistema de permissões`);
        if (isMountedRef.current) {
          setHasPermission(true); // Default to true if not mapped
          setIsLoading(false);
        }
        return;
      }

      // Verificar acesso total (*)
      if (userPermissions.modulos_acoes.some(p => p.modulo === '*')) {
        if (isMountedRef.current) {
          setHasPermission(true);
          setIsLoading(false);
        }
        return;
      }

      // Verificar permissão específica
      const hasAccess = userPermissions.modulos_acoes.some(p => p.modulo === requiredModule);
      if (isMountedRef.current) {
        setHasPermission(hasAccess);
      }
      
    } catch (error) {
      console.error('Erro ao verificar permissões na ProtectedPage:', error);
      if (isMountedRef.current) {
        setHasPermission(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };


  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          <p className="text-slate-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Sem permissão
  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-gray-600">
              <p className="mb-2">
                Você não tem permissão para acessar esta página.
              </p>
              <p className="text-sm">
                Entre em contato com o administrador do sistema para solicitar acesso.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-slate-600 mt-0.5" />
                <div className="text-sm text-slate-700">
                  <strong>Página solicitada:</strong> {pageName}
                  <br />
                  <strong>Seu perfil:</strong> {user?.system_role || user?.role || 'user'}
                  <br />
                  <strong>Email:</strong> {user?.email}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                className="flex-1 bg-slate-800 hover:bg-slate-700"
                onClick={() => navigate(createPageUrl('Dashboard'))}
              >
                Ir para Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Com permissão - renderizar conteúdo
  return <>{children}</>;
}

/**
 * Hook para verificar permissões em qualquer lugar do código
 * COM CACHE para evitar chamadas desnecessárias
 */
export function usePermissions() {
  const [user, setUser] = useState(null);
  const [funcionario, setFuncionario] = useState(null);
  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadUserDataAndPermissions();
    }
  }, []);

  const loadUserDataAndPermissions = async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      const { user: currentUser, funcionario: currentFuncionario, cargo: currentCargo } = await loadPermissionsData();
      
      if (isMountedRef.current) {
        setUser(currentUser);
        setFuncionario(currentFuncionario);
        setCargo(currentCargo);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de permissões:', error);
      if (isMountedRef.current) {
        setUser(null);
        setFuncionario(null);
        setCargo(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  // Helper function to get the full permission object (modulos_acoes and permissoes_especiais)
  const getUserPermissionsSource = useCallback(() => {
    if (isAdmin) return { modulos_acoes: [{ modulo: '*', acoes: ['*'] }], permissoes_especiais: ['*'] };
    if (!user) return ROLE_PERMISSIONS.user; // Default if no user

    if (cargo) {
      if (cargo.permissoes_modulos_acoes && cargo.permissoes_modulos_acoes.length > 0) {
        return {
          modulos_acoes: cargo.permissoes_modulos_acoes,
          permissoes_especiais: cargo.permissoes_especiais || []
        };
      }
      if (cargo.permissoes_modulos && cargo.permissoes_modulos.length > 0) {
        const modulosAcoes = cargo.permissoes_modulos.map(modulo => ({
          modulo: modulo,
          acoes: cargo.permissoes_acoes || ['visualizar']
        }));
        return {
          modulos_acoes: modulosAcoes,
          permissoes_especiais: cargo.permissoes_especiais || []
        };
      }
    }

    const systemRole = user.system_role || user.role || 'user';
    return ROLE_PERMISSIONS[systemRole] || ROLE_PERMISSIONS.user;
  }, [user, cargo, isAdmin]);


  const hasModule = useCallback((moduleName) => {
    if (isAdmin) return true;
    if (!user) return false;

    const userPerms = getUserPermissionsSource();
    const temAsterisco = userPerms.modulos_acoes.some(m => m.modulo === '*');
    if (temAsterisco) return true;

    return userPerms.modulos_acoes.some(m => m.modulo === moduleName);
  }, [isAdmin, user, getUserPermissionsSource]);

  const hasAction = useCallback((module, action) => {
    if (isAdmin) return true;
    if (!user) return false;

    const userPerms = getUserPermissionsSource();

    // Check for total access (*)
    const acessoTotalModulo = userPerms.modulos_acoes.find(m => m.modulo === '*');
    if (acessoTotalModulo) {
      if (acessoTotalModulo.acoes.includes('*') || acessoTotalModulo.acoes.includes(action)) {
        return true;
      }
    }

    // Check specific module permission
    const moduloPerm = userPerms.modulos_acoes.find(m => m.modulo === module);
    if (!moduloPerm) return false;

    return moduloPerm.acoes.includes('*') || moduloPerm.acoes.includes(action);
  }, [isAdmin, user, getUserPermissionsSource]);


  const hasApprovalPermission = useCallback((approvalType) => {
    if (isAdmin) return true;
    if (!user) return false;

    const userPerms = getUserPermissionsSource();
    
    // Check for explicit special permission for this approval type
    if (userPerms.permissoes_especiais && Array.isArray(userPerms.permissoes_especiais)) {
      if (userPerms.permissoes_especiais.includes('*') || userPerms.permissoes_especiais.includes(approvalType)) {
        return true;
      }
    }

    // A 'hasApprovalPermission' typically maps to special permissions like 'aprovar_os',
    // or the 'aprovar' action on a specific module.
    // If it's not explicitly in permissoes_especiais, it means the user might not have this specific approval permission.
    // For general approval actions, `hasAction(module, 'aprovar')` should be used.
    // So, we rely on `permissoes_especiais` here for explicit approval permissions.
    return false;

  }, [isAdmin, user, getUserPermissionsSource]);


  // NOVA FUNÇÃO: Verificar permissão especial
  const hasSpecialPermission = useCallback((permissionName) => {
    if (!user) return false;
    
    // Admin sempre tem todas as permissões
    if (isAdmin) return true;
    
    // Verificar se o cargo tem a permissão especial
    const userPerms = getUserPermissionsSource();
    if (userPerms.permissoes_especiais && Array.isArray(userPerms.permissoes_especiais)) {
      return userPerms.permissoes_especiais.includes('*') || userPerms.permissoes_especiais.includes(permissionName);
    }
    
    return false;
  }, [user, isAdmin, getUserPermissionsSource]);

  return {
    user,
    funcionario,
    cargo,
    loading,
    hasModule,
    hasAction, // `canPerformAction` renamed to `hasAction` for consistency with outline
    hasApprovalPermission,
    hasSpecialPermission,
    isAdmin,
    // Convenience functions
    canCreate: (module) => hasAction(module, 'criar'),
    canEdit: (module) => hasAction(module, 'editar'),
    canDelete: (module) => hasAction(module, 'deletar'),
    canView: (module) => hasAction(module, 'visualizar'),
    canApprove: (module) => hasAction(module, 'aprovar')
  };
}
