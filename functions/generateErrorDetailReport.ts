import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

function formatDateBR(s) {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getSeverityEmoji(severity) {
  const map = {
    critical: '🔴',
    error: '🟠',
    warning: '🟡',
    info: '🔵'
  };
  return map[severity] || '⚪';
}

function analyzeCause(error) {
  const msg = error.message || '';
  const stack = error.stack || '';
  
  if (msg.includes('Cannot read properties of undefined')) {
    return {
      cause: 'Tentativa de acessar propriedade de objeto undefined/null',
      solution: 'Adicionar validação: if (obj && obj.property) { ... } ou usar optional chaining: obj?.property',
      impact: 'ALTO - Pode quebrar funcionalidade',
      code_example: `// Antes:\nconst value = obj.property;\n\n// Depois:\nconst value = obj?.property;`
    };
  }
  
  if (msg.includes('map') && msg.includes('not a function')) {
    return {
      cause: 'Tentativa de usar .map() em variável que não é um array',
      solution: 'Garantir que a variável é array: (arr || []).map(...)',
      impact: 'ALTO - Quebra renderização de lista',
      code_example: `// Antes:\ndata.map(item => ...)\n\n// Depois:\n(data || []).map(item => ...)`
    };
  }
  
  if (msg.includes('500')) {
    return {
      cause: 'Erro no servidor - validação ou processamento backend',
      solution: 'Verificar logs do servidor, validar payload da requisição',
      impact: 'CRÍTICO - Falha na operação',
      code_example: 'Revisar função backend e validar dados enviados'
    };
  }
  
  if (msg.includes('401') || msg.includes('403')) {
    return {
      cause: 'Problema de autenticação/autorização',
      solution: 'Verificar token de autenticação, renovar sessão',
      impact: 'CRÍTICO - Usuário não consegue usar funcionalidade',
      code_example: 'Implementar refresh token ou redirecionar para login'
    };
  }
  
  return {
    cause: 'Causa não identificada automaticamente',
    solution: 'Análise manual do stack trace necessária',
    impact: 'MÉDIO',
    code_example: 'Revisar código no arquivo indicado'
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

    // Buscar erro específico
    const errors = await base44.asServiceRole.entities.ErrorLog.filter({ id: errorId });
    const error = errors && errors[0];

    if (!error) {
      return Response.json({ error: 'Error not found' }, { status: 404 });
    }

    // Buscar erros similares
    const similarErrors = await base44.asServiceRole.entities.ErrorLog.filter({
      message: error.message,
      file: error.file
    });

    // Buscar tarefas relacionadas
    const tasks = await base44.asServiceRole.entities.CodeFixTask.filter({
      error_log_id: errorId
    });

    // Análise automática
    const analysis = analyzeCause(error);
    const emoji = getSeverityEmoji(error.severity);

    // Gerar relatório detalhado
    const lines = [];
    lines.push('═'.repeat(70));
    lines.push(`${emoji} RELATÓRIO DETALHADO DE ERRO`);
    lines.push('═'.repeat(70));
    lines.push('');
    
    lines.push('📋 INFORMAÇÕES BÁSICAS:');
    lines.push(`   • ID: ${error.id}`);
    lines.push(`   • Mensagem: ${error.message}`);
    lines.push(`   • Severidade: ${error.severity?.toUpperCase()}`);
    lines.push(`   • Status: ${error.status}`);
    lines.push(`   • Primeira ocorrência: ${formatDateBR(error.created_date)}`);
    lines.push(`   • Última ocorrência: ${formatDateBR(error.last_seen || error.created_date)}`);
    lines.push('');
    
    lines.push('📍 LOCALIZAÇÃO:');
    lines.push(`   • Arquivo: ${error.file || 'Não especificado'}`);
    lines.push(`   • Linha: ${error.line || 'Não especificada'}`);
    lines.push(`   • Coluna: ${error.column || 'Não especificada'}`);
    lines.push(`   • URL: ${error.url || 'Não especificada'}`);
    lines.push(`   • Componente: ${error.component || error.source || 'Não especificado'}`);
    lines.push('');
    
    lines.push('🔍 ANÁLISE AUTOMÁTICA:');
    lines.push(`   • Causa raiz: ${analysis.cause}`);
    lines.push(`   • Impacto: ${analysis.impact}`);
    lines.push(`   • Solução sugerida: ${analysis.solution}`);
    lines.push('');
    
    if (analysis.code_example) {
      lines.push('💻 EXEMPLO DE CORREÇÃO:');
      lines.push(analysis.code_example);
      lines.push('');
    }
    
    if (error.stack) {
      lines.push('📚 STACK TRACE:');
      const stackLines = error.stack.split('\n').slice(0, 10);
      stackLines.forEach(line => lines.push(`   ${line}`));
      if (error.stack.split('\n').length > 10) {
        lines.push('   ... (stack trace truncado)');
      }
      lines.push('');
    }
    
    if (similarErrors && similarErrors.length > 1) {
      lines.push(`📊 OCORRÊNCIAS SIMILARES: ${similarErrors.length} encontradas`);
      lines.push(`   • Este erro ocorreu ${similarErrors.length} vezes`);
      lines.push(`   • Frequência média: ${(similarErrors.length / 7).toFixed(1)} vezes por dia`);
      lines.push('');
    }
    
    if (tasks && tasks.length > 0) {
      lines.push('📋 TAREFAS RELACIONADAS:');
      tasks.forEach(task => {
        lines.push(`   • ${task.title} (${task.status})`);
        if (task.assignee) {
          lines.push(`     Responsável: ${task.assignee}`);
        }
      });
      lines.push('');
    }
    
    lines.push('🎯 PRÓXIMOS PASSOS:');
    if (error.severity === 'critical' || error.severity === 'error') {
      lines.push('   1. ⚠️ URGENTE: Priorizar correção imediatamente');
      lines.push('   2. 🔧 Aplicar solução sugerida no arquivo indicado');
      lines.push('   3. ✅ Testar correção em ambiente de desenvolvimento');
      lines.push('   4. 🚀 Deploy da correção em produção');
      lines.push('   5. 📊 Monitorar para garantir que o erro não retorna');
    } else {
      lines.push('   1. 📝 Criar tarefa para correção');
      lines.push('   2. 🔍 Investigar causa raiz se necessário');
      lines.push('   3. 🔧 Implementar correção');
      lines.push('   4. ✅ Marcar erro como resolvido após correção');
    }
    lines.push('');
    
    lines.push('═'.repeat(70));
    lines.push(`Relatório gerado em: ${formatDateBR(new Date().toISOString())}`);
    lines.push(`Gerado por: ${user.email}`);
    lines.push('═'.repeat(70));

    const report = lines.join('\n');

    return Response.json({
      success: true,
      report,
      error: {
        id: error.id,
        message: error.message,
        severity: error.severity,
        file: error.file,
        line: error.line
      },
      analysis,
      similar_count: similarErrors ? similarErrors.length : 1,
      tasks_count: tasks ? tasks.length : 0
    });

  } catch (error) {
    console.error('Error generating detail report:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
});