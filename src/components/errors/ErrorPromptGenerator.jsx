/**
 * Gerador de Prompts para IA
 * Gera prompts formatados para enviar ao assistente de IA
 */

export function generateErrorPrompt(error, context = {}) {
  const { 
    includeStackTrace = true, 
    includeSolution = true,
    includeHistory = false,
    customInstructions = ''
  } = context;

  let prompt = `🔴 ANÁLISE DE ERRO URGENTE

Por favor, analise este erro e forneça uma solução técnica detalhada:

═══════════════════════════════════════════════════════════════════
📋 INFORMAÇÕES DO ERRO
═══════════════════════════════════════════════════════════════════

🆔 ID do Erro: ${error.id}
📝 Mensagem: ${error.message}
⚠️ Severidade: ${error.severity?.toUpperCase()}
📊 Status: ${error.status}
📅 Última Ocorrência: ${new Date(error.last_seen || error.created_date).toLocaleString('pt-BR')}

═══════════════════════════════════════════════════════════════════
📍 LOCALIZAÇÃO
═══════════════════════════════════════════════════════════════════

📂 Arquivo: ${error.file || 'Não especificado'}
📏 Linha: ${error.line || 'Não especificada'}
📐 Coluna: ${error.column || 'Não especificada'}
🌐 URL: ${error.url || 'Não especificada'}
🧩 Componente: ${error.component || error.source || 'Não especificado'}
🖥️ Navegador: ${error.user_agent || 'Não especificado'}
`;

  if (includeStackTrace && error.stack) {
    prompt += `
═══════════════════════════════════════════════════════════════════
📚 STACK TRACE COMPLETO
═══════════════════════════════════════════════════════════════════

${error.stack}
`;
  }

  if (error.extra) {
    try {
      const extra = JSON.parse(error.extra);
      if (extra && Object.keys(extra).length > 0) {
        prompt += `
═══════════════════════════════════════════════════════════════════
🔍 CONTEXTO ADICIONAL
═══════════════════════════════════════════════════════════════════

${JSON.stringify(extra, null, 2)}
`;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  if (includeSolution) {
    prompt += `
═══════════════════════════════════════════════════════════════════
✅ POR FAVOR, FORNEÇA:
═══════════════════════════════════════════════════════════════════

1️⃣ **CAUSA RAIZ**: Identifique a causa fundamental do erro
2️⃣ **ANÁLISE TÉCNICA**: Explique por que isso está acontecendo
3️⃣ **SOLUÇÃO IMEDIATA**: Código ou patch para corrigir (se possível)
4️⃣ **PREVENÇÃO**: Como evitar que isso aconteça novamente
5️⃣ **ARQUIVOS AFETADOS**: Quais arquivos precisam ser modificados
6️⃣ **CÓDIGO DE EXEMPLO**: Mostre o antes e depois da correção
`;
  }

  if (customInstructions) {
    prompt += `
═══════════════════════════════════════════════════════════════════
📌 INSTRUÇÕES ESPECIAIS
═══════════════════════════════════════════════════════════════════

${customInstructions}
`;
  }

  prompt += `
═══════════════════════════════════════════════════════════════════
🎯 SISTEMA: ERP para Oficina Mecânica
🛠️ Stack: React + Base44 + Tailwind CSS
📦 Componentes: Shadcn/ui
═══════════════════════════════════════════════════════════════════
`;

  return prompt;
}

export function generateSystemPrompt(data) {
  return `🤖 ANÁLISE DO SISTEMA - CODEFIXER

═══════════════════════════════════════════════════════════════════
📊 MÉTRICAS ATUAIS DO SISTEMA
═══════════════════════════════════════════════════════════════════

🏥 Health Score: ${data.health_score}/100
🐛 Total de Erros: ${data.total_errors}
🔴 Erros Críticos: ${data.critical_errors}
✅ Taxa de Resolução: ${data.resolution_rate}%
⏱️ MTTR: ${data.mttr_hours}h

═══════════════════════════════════════════════════════════════════
🧠 APRENDIZADO DO AGENTE
═══════════════════════════════════════════════════════════════════

📚 Padrões Aprendidos: ${data.total_patterns}
🎯 Alta Confiança: ${data.high_confidence_patterns}
🔢 Versão do Modelo: v${data.model_version}
🔧 Patches Aplicados: ${data.patches_applied}

═══════════════════════════════════════════════════════════════════
❓ PERGUNTAS PARA ANÁLISE
═══════════════════════════════════════════════════════════════════

Com base nestes dados:

1️⃣ O sistema está saudável?
2️⃣ Quais são os pontos de atenção?
3️⃣ Que ações imediatas você recomenda?
4️⃣ Como melhorar o Health Score?
5️⃣ Há padrões de erros recorrentes que precisam ser corrigidos?

Por favor, forneça uma análise técnica detalhada e acionável.
═══════════════════════════════════════════════════════════════════
`;
}

export function generateComparisonPrompt(comparison) {
  return `📈 ANÁLISE COMPARATIVA - EVOLUÇÃO DO SISTEMA

═══════════════════════════════════════════════════════════════════
📊 COMPARAÇÃO: ${comparison.period.previous} → ${comparison.period.current}
═══════════════════════════════════════════════════════════════════

🏥 Health Score: ${comparison.health_score.previous} → ${comparison.health_score.current} (${comparison.health_score.change > 0 ? '+' : ''}${comparison.health_score.change_percent}%)
🐛 Erros Totais: ${comparison.errors.total.previous} → ${comparison.errors.total.current} (${comparison.errors.total.change > 0 ? '+' : ''}${comparison.errors.total.change})
🔴 Críticos: ${comparison.errors.critical.previous} → ${comparison.errors.critical.current} (${comparison.errors.critical.change > 0 ? '+' : ''}${comparison.errors.critical.change})
📈 Taxa Resolução: ${comparison.resolution_rate.previous}% → ${comparison.resolution_rate.current}% (${comparison.resolution_rate.change > 0 ? '+' : ''}${comparison.resolution_rate.change.toFixed(1)}%)

═══════════════════════════════════════════════════════════════════
❓ ANÁLISE SOLICITADA
═══════════════════════════════════════════════════════════════════

Com base na evolução dos últimos ${comparison.period.days_between} dias:

1️⃣ A tendência é positiva ou negativa?
2️⃣ Quais melhorias foram mais significativas?
3️⃣ Onde ainda há espaço para melhoria?
4️⃣ Que estratégias devemos manter/mudar?
5️⃣ Qual a previsão para a próxima semana?

Por favor, forneça insights estratégicos e recomendações.
═══════════════════════════════════════════════════════════════════
`;
}

export default {
  generateErrorPrompt,
  generateSystemPrompt,
  generateComparisonPrompt
};