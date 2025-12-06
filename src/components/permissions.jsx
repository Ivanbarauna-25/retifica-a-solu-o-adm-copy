/**
 * Sistema de Permissões Simplificado
 * 
 * Este módulo centraliza toda a lógica de permissões do sistema.
 */

// ============================================
// MATRIZ DE PERMISSÕES POR ROLE
// ============================================

export const PERMISSIONS_MATRIX = {
  admin: {
    modulos: ['dashboard', 'os', 'orcamentos', 'estoque', 'patrimonio', 'tarefas', 
              'clientes', 'fornecedores', 'funcionarios', 'rh', 'ponto', 'folha', 
              'adiantamentos', 'compras', 'financeiro', 'usuarios', 'configuracoes'],
    acoes: ['criar', 'editar', 'deletar', 'visualizar', 'aprovar'],
    pode_aprovar: ['ferias', 'salario', 'cargo', 'departamento', 'desligamento', 'adiantamento', 'compras']
  },
  
  rh: {
    modulos: ['dashboard', 'funcionarios', 'rh', 'ponto', 'folha', 'adiantamentos', 'contratacao'],
    acoes: ['criar', 'editar', 'visualizar', 'aprovar'],
    pode_aprovar: ['ferias', 'salario', 'cargo', 'departamento', 'desligamento', 'adiantamento'],
    restricoes: {
      financeiro: 'somente_leitura'
    }
  },
  
  gerente: {
    modulos: ['dashboard', 'os', 'orcamentos', 'estoque', 'clientes', 'funcionarios', 'rh', 'tarefas'],
    acoes: ['criar', 'editar', 'visualizar', 'aprovar'],
    pode_aprovar: ['ferias', 'adiantamento'],
    restricoes: {
      financeiro: 'apenas_relatorios',
      usuarios: 'nao_pode_criar'
    }
  },
  
  financeiro: {
    modulos: ['dashboard', 'financeiro', 'contas_pagar', 'contas_receber', 'fluxo_caixa', 
              'movimentacao', 'plano_contas', 'dre', 'fornecedores'],
    acoes: ['criar', 'editar', 'visualizar'],
    pode_aprovar: ['compras'],
    restricoes: {
      rh: 'somente_folha',
      usuarios: 'nao_pode_acessar'
    }
  },
  
  vendedor: {
    modulos: ['dashboard', 'os', 'orcamentos', 'clientes', 'estoque'],
    acoes: ['criar', 'editar', 'visualizar'],
    pode_aprovar: [],
    restricoes: {
      estoque: 'somente_consulta',
      financeiro: 'nao_pode_acessar',
      rh: 'nao_pode_acessar'
    }
  },
  
  mecanico: {
    modulos: ['dashboard', 'os', 'tarefas'],
    acoes: ['visualizar', 'editar'],
    pode_aprovar: [],
    restricoes: {
      os: 'apenas_atribuidas',
      financeiro: 'nao_pode_acessar',
      rh: 'nao_pode_acessar'
    }
  },
  
  user: {
    modulos: ['dashboard'],
    acoes: ['visualizar'],
    pode_aprovar: [],
    restricoes: {
      tudo: 'acesso_limitado'
    }
  }
};

// ============================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================

/**
 * Retorna o role padrão se não tiver role definido
 */
export function getUserDefaultRole() {
  return 'user';
}

/**
 * Busca as permissões do cargo de um usuário
 * @param {Object} user - Objeto do usuário
 * @param {Object} funcionario - Objeto do funcionário vinculado
 * @param {Object} cargo - Objeto do cargo do funcionário
 * @returns {Object} Objeto com permissões do cargo
 */
function getCargoPermissions(user, funcionario, cargo) {
  if (!cargo) return null;
  
  return {
    modulos: cargo.permissoes_modulos || [],
    acoes: cargo.permissoes_acoes || [],
    pode_aprovar: cargo.permissoes_aprovacao || [],
    restricoes: cargo.restricoes_especiais || {}
  };
}

/**
 * Verifica se o usuário tem permissão para acessar um módulo
 */
export function canAccessModule(user, moduloNome) {
  if (!user) return false;
  
  const role = user.system_role || user.role || getUserDefaultRole();
  
  // Admin sempre pode tudo
  if (role === 'admin') return true;
  
  // Se o usuário tem um cargo vinculado via funcionário, usar permissões do cargo
  if (user._cargo) {
    const cargoPerms = getCargoPermissions(user, user._funcionario, user._cargo);
    if (cargoPerms) {
      return cargoPerms.modulos.includes(moduloNome);
    }
  }
  
  // Fallback para PERMISSIONS_MATRIX (compatibilidade com system_role antigo)
  const permissions = PERMISSIONS_MATRIX[role];
  if (!permissions) return false;
  
  return permissions.modulos.includes(moduloNome);
}

/**
 * Verifica se o usuário pode realizar uma ação específica
 */
export function canPerformAction(user, acao) {
  if (!user) return false;
  
  const role = user.system_role || user.role || getUserDefaultRole();
  
  // Admin sempre pode tudo
  if (role === 'admin') return true;
  
  // Se o usuário tem um cargo vinculado via funcionário, usar permissões do cargo
  if (user._cargo) {
    const cargoPerms = getCargoPermissions(user, user._funcionario, user._cargo);
    if (cargoPerms) {
      return cargoPerms.acoes.includes(acao);
    }
  }
  
  // Fallback para PERMISSIONS_MATRIX
  const permissions = PERMISSIONS_MATRIX[role];
  if (!permissions) return false;
  
  return permissions.acoes.includes(acao);
}

/**
 * Verifica se o usuário pode aprovar um tipo de solicitação
 */
export function canApprove(user, tipoSolicitacao = null) {
  if (!user) return false;
  
  const role = user.system_role || user.role || getUserDefaultRole();
  
  // Admins podem aprovar tudo
  if (role === 'admin') return true;
  
  // Se o usuário tem um cargo vinculado via funcionário, usar permissões do cargo
  if (user._cargo) {
    const cargoPerms = getCargoPermissions(user, user._funcionario, user._cargo);
    if (cargoPerms) {
      // Se não especificou tipo, verifica se pode aprovar algo
      if (!tipoSolicitacao) {
        return cargoPerms.pode_aprovar.length > 0 || 
               (user.pode_aprovar && user.pode_aprovar.length > 0);
      }
      
      // Verifica permissão do cargo
      if (cargoPerms.pode_aprovar.includes(tipoSolicitacao)) {
        return true;
      }
    }
  }
  
  // Verifica permissões individuais do usuário
  if (user.pode_aprovar && Array.isArray(user.pode_aprovar)) {
    if (!tipoSolicitacao) {
      return user.pode_aprovar.length > 0;
    }
    if (user.pode_aprovar.includes(tipoSolicitacao)) {
      return true;
    }
  }
  
  // Fallback para PERMISSIONS_MATRIX
  const permissions = PERMISSIONS_MATRIX[role];
  if (!permissions) return false;
  
  if (!tipoSolicitacao) {
    return permissions.pode_aprovar.length > 0;
  }
  
  return permissions.pode_aprovar.includes(tipoSolicitacao);
}

/**
 * Verifica se o usuário é chefe de outro usuário
 */
export function isChefeDe(userChefe, userSubordinado) {
  if (!userChefe || !userSubordinado) return false;
  
  // Verifica hierarquia direta
  if (userSubordinado.superior_id === userChefe.id) {
    return true;
  }
  
  // Verifica se são do mesmo departamento e o chefe é gerente
  const roleChefe = userChefe.system_role || userChefe.role;
  if (roleChefe === 'gerente' || roleChefe === 'rh') {
    return userChefe.departamento_id === userSubordinado.departamento_id;
  }
  
  // Verifica por nível hierárquico do cargo
  if (userChefe._cargo && userSubordinado._cargo) {
    return (userChefe._cargo.nivel_hierarquico || 5) < (userSubordinado._cargo.nivel_hierarquico || 5);
  }
  
  return false;
}

/**
 * Retorna lista de usuários que podem aprovar um tipo de solicitação
 */
export function getAprovadores(users, tipoSolicitacao) {
  if (!users || !Array.isArray(users)) return [];
  
  return users.filter(user => canApprove(user, tipoSolicitacao));
}

/**
 * Verifica se usuário pode editar uma OS específica
 */
export function canEditOS(user, os) {
  if (!user || !os) return false;
  
  const role = user.system_role || user.role || getUserDefaultRole();
  
  // Admin e gerente podem editar qualquer OS
  if (role === 'admin' || role === 'gerente') return true;
  
  // Vendedor pode editar OS que ele criou
  if (role === 'vendedor') {
    return os.created_by === user.email || os.vendedor_id === user.funcionario_id;
  }
  
  // Mecânico pode editar apenas OS atribuídas a ele
  if (role === 'mecanico') {
    return os.funcionario_id === user.funcionario_id;
  }
  
  return false;
}

/**
 * Retorna label amigável para o role
 */
export function getRoleLabel(role) {
  const labels = {
    admin: 'Administrador',
    rh: 'Recursos Humanos',
    gerente: 'Gerente',
    financeiro: 'Financeiro',
    vendedor: 'Vendedor',
    mecanico: 'Mecânico',
    user: 'Usuário Básico'
  };
  
  return labels[role] || 'Usuário';
}

/**
 * Retorna cores para badges de roles
 */
export function getRoleColor(role) {
  const colors = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    rh: 'bg-blue-100 text-blue-800 border-blue-200',
    gerente: 'bg-green-100 text-green-800 border-green-200',
    financeiro: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    vendedor: 'bg-orange-100 text-orange-800 border-orange-200',
    mecanico: 'bg-gray-100 text-gray-800 border-gray-200',
    user: 'bg-slate-100 text-slate-800 border-slate-200'
  };
  
  return colors[role] || colors.user;
}

/**
 * Valida se usuário tem permissão para acessar rota
 */
export function validateRouteAccess(user, pageName) {
  if (!user || !pageName) return false;
  
  const moduleMap = {
    'Dashboard': 'dashboard',
    'OrdensServico': 'os',
    'Orcamentos': 'orcamentos',
    'Estoque': 'estoque',
    'Patrimonio': 'patrimonio',
    'Tarefas': 'tarefas',
    'Clientes': 'clientes',
    'Fornecedores': 'fornecedores',
    'Funcionarios': 'funcionarios',
    'GestaoRH': 'rh',
    'Ponto': 'ponto',
    'FolhaPagamento': 'folha',
    'Adiantamentos': 'adiantamentos',
    'Contratacao': 'contratacao',
    'ComprasRevenda': 'compras',
    'ComprasConsumo': 'compras',
    'MovimentacaoFinanceira': 'financeiro',
    'FluxoCaixa': 'financeiro',
    'ContasPagar': 'contas_pagar',
    'ContasReceber': 'contas_receber',
    'PlanoContas': 'financeiro',
    'DRE': 'financeiro',
    'GestaoUsuarios': 'usuarios',
    'Configuracoes': 'configuracoes'
  };
  
  const modulo = moduleMap[pageName];
  if (!modulo) return true; // Páginas não mapeadas são acessíveis
  
  return canAccessModule(user, modulo);
}

// ============================================
// EXPORTAÇÃO DEFAULT (OPCIONAL)
// ============================================

export default {
  canAccessModule,
  canPerformAction,
  canApprove,
  isChefeDe,
  getAprovadores,
  canEditOS,
  getRoleLabel,
  getRoleColor,
  validateRouteAccess,
  getUserDefaultRole,
  PERMISSIONS_MATRIX
};