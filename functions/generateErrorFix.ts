import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

function generateFix(error) {
  const msg = error.message || '';
  const file = error.file || '';
  const line = error.line || 0;
  
  if (msg.includes('Cannot read properties of undefined')) {
    const match = msg.match(/Cannot read properties? of undefined \(reading '(\w+)'\)/);
    const prop = match ? match[1] : 'property';
    
    return {
      title: `Corrigir acesso a propriedade '${prop}' de objeto undefined`,
      description: `Adicionar validação de null/undefined antes de acessar a propriedade '${prop}'`,
      file_path: file,
      change_type: 'edit',
      patch: `// Adicione validação antes do acesso à propriedade
// Localização: ${file}:${line}

// OPÇÃO 1: Optional Chaining (recomendado)
const value = obj?.${prop};

// OPÇÃO 2: Verificação explícita
if (obj && obj.${prop}) {
  const value = obj.${prop};
  // seu código aqui
}

// OPÇÃO 3: Valor padrão
const value = obj?.${prop} || defaultValue;`,
      priority: 'alta',
      estimated_time: '10 minutos'
    };
  }
  
  if (msg.includes('map') && msg.includes('not a function')) {
    return {
      title: 'Corrigir uso de .map() em variável não-array',
      description: 'Garantir que a variável é um array antes de usar .map()',
      file_path: file,
      change_type: 'edit',
      patch: `// Adicione validação antes do .map()
// Localização: ${file}:${line}

// ANTES:
data.map(item => ...)

// DEPOIS (recomendado):
(data || []).map(item => ...)

// OU com validação explícita:
if (Array.isArray(data)) {
  data.map(item => ...)
}

// OU com valor inicial:
const items = Array.isArray(data) ? data : [];
items.map(item => ...)`,
      priority: 'alta',
      estimated_time: '5 minutos'
    };
  }
  
  if (msg.includes('500')) {
    return {
      title: 'Corrigir erro 500 no backend',
      description: 'Revisar função backend e validar payload da requisição',
      file_path: file,
      change_type: 'edit',
      patch: `// Passos para corrigir erro 500:
// Localização: ${file}:${line}

// 1. Adicione try/catch para capturar erro específico
try {
  // código que está falhando
} catch (error) {
  console.error('Erro detalhado:', error);
  // tratar erro apropriadamente
}

// 2. Valide o payload antes de enviar
const payload = {
  // seus dados aqui
};

// Validação de campos obrigatórios
if (!payload.campo_obrigatorio) {
  console.error('Campo obrigatório faltando');
  return;
}

// 3. Verifique os logs do backend para erro específico

// 4. Valide tipos de dados
if (typeof payload.numero !== 'number') {
  payload.numero = Number(payload.numero);
}`,
      priority: 'crítica',
      estimated_time: '30 minutos'
    };
  }
  
  if (msg.includes('401') || msg.includes('403')) {
    return {
      title: 'Corrigir problema de autenticação',
      description: 'Adicionar validação de autenticação e tratamento de sessão expirada',
      file_path: file,
      change_type: 'edit',
      patch: `// Correção de autenticação
// Localização: ${file}:${line}

// 1. Verificar se usuário está autenticado
const authed = await base44.auth.isAuthenticated();
if (!authed) {
  // Redirecionar para login
  base44.auth.redirectToLogin(window.location.href);
  return;
}

// 2. Adicionar tratamento de erro 401/403
try {
  // sua requisição aqui
} catch (error) {
  if (error.response?.status === 401 || error.response?.status === 403) {
    // Sessão expirou - redirecionar para login
    base44.auth.redirectToLogin(window.location.href);
  }
}

// 3. Implementar refresh token se necessário`,
      priority: 'crítica',
      estimated_time: '20 minutos'
    };
  }
  
  return {
    title: 'Correção genérica do erro',
    description: 'Análise manual necessária',
    file_path: file,
    change_type: 'edit',
    patch: `// Erro detectado: ${msg}
// Localização: ${file}:${line}

// Passos sugeridos:
// 1. Revisar o código no arquivo indicado
// 2. Adicionar logs para debug
console.log('Debug:', variavel);

// 3. Adicionar try/catch
try {
  // código com erro
} catch (error) {
  console.error('Erro:', error);
}

// 4. Validar dados de entrada
// 5. Testar correção`,
    priority: 'média',
    estimated_time: '30 minutos'
  };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const errorId = payload.errorId;

    if (!errorId) {
      return Response.json({ error: 'errorId required' }, { status: 400 });
    }

    // Buscar erro
    const errors = await base44.asServiceRole.entities.ErrorLog.filter({ id: errorId });
    const error = errors && errors[0];

    if (!error) {
      return Response.json({ error: 'Error not found' }, { status: 404 });
    }

    // Gerar correção
    const fix = generateFix(error);

    // Criar tarefa automaticamente
    const task = await base44.asServiceRole.entities.CodeFixTask.create({
      title: fix.title,
      description: fix.description,
      status: 'aberta',
      priority: fix.priority === 'crítica' ? 'urgente' : fix.priority === 'alta' ? 'alta' : 'media',
      error_log_id: errorId,
      assignee: user.email
    });

    // Criar patch suggestion
    const patch = await base44.asServiceRole.entities.CodePatchSuggestion.create({
      file_path: fix.file_path,
      change_type: fix.change_type,
      patch: fix.patch,
      notes: `Correção automática gerada para: ${error.message}`,
      status: 'sugerido',
      task_id: task.id
    });

    return Response.json({
      success: true,
      fix,
      task_id: task.id,
      patch_id: patch.id,
      message: 'Correção gerada e tarefa criada com sucesso'
    });

  } catch (error) {
    console.error('Error generating fix:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
});