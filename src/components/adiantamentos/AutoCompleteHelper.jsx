import React, { useMemo } from "react";

export function useAutoCompleteHelper(funcionarios, adiantamentos) {
  return useMemo(() => {
    const helper = {
      // Sugere valor baseado no histórico do funcionário
      sugerirValor: (funcionarioId) => {
        if (!funcionarioId) return null;
        const historico = adiantamentos.filter(a => a.funcionario_id === funcionarioId);
        if (historico.length === 0) return null;
        
        const valoresAprovados = historico
          .filter(a => a.status === 'aprovado' || a.status === 'pago')
          .map(a => Number(a.valor) || 0);
        
        if (valoresAprovados.length === 0) return null;
        
        // Retorna a média dos 3 últimos adiantamentos aprovados
        const media = valoresAprovados
          .slice(-3)
          .reduce((a, b) => a + b, 0) / Math.min(3, valoresAprovados.length);
        
        return Math.round(media);
      },

      // Sugere competência baseado no mês atual
      sugerirCompetencia: () => {
        const hoje = new Date();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        return `${ano}-${mes}`;
      },

      // Sugere motivo baseado no histórico
      sugerirMotivo: (funcionarioId) => {
        if (!funcionarioId) return null;
        const historico = adiantamentos.filter(a => a.funcionario_id === funcionarioId && a.motivo);
        if (historico.length === 0) return null;
        
        // Retorna o motivo mais frequente
        const motivos = {};
        historico.forEach(a => {
          motivos[a.motivo] = (motivos[a.motivo] || 0) + 1;
        });
        
        return Object.entries(motivos)
          .sort(([, a], [, b]) => b - a)[0][0];
      },

      // Obtém últimos valores do funcionário para quick suggestion
      obterUltimosValores: (funcionarioId) => {
        if (!funcionarioId) return [];
        const historico = adiantamentos
          .filter(a => a.funcionario_id === funcionarioId)
          .sort((a, b) => new Date(b.data_adiantamento) - new Date(a.data_adiantamento))
          .slice(0, 5);
        
        return [...new Set(historico.map(a => Number(a.valor) || 0))];
      },

      // Valida se o valor é coerente com histórico
      validarValor: (funcionarioId, valor) => {
        if (!funcionarioId) return { valido: true, avisos: [] };
        
        const historico = adiantamentos.filter(a => a.funcionario_id === funcionarioId);
        if (historico.length === 0) return { valido: true, avisos: [] };
        
        const valores = historico.map(a => Number(a.valor) || 0);
        const media = valores.reduce((a, b) => a + b, 0) / valores.length;
        const desvio = Math.sqrt(valores.reduce((a, v) => a + Math.pow(v - media, 2), 0) / valores.length);
        
        const avisos = [];
        if (valor > media + desvio * 2) {
          avisos.push(`⚠️ Valor muito alto comparado ao histórico (média: ${Math.round(media)})`);
        }
        if (valor < media * 0.5 && valor > 0) {
          avisos.push(`ℹ️ Valor muito baixo comparado ao histórico (média: ${Math.round(media)})`);
        }
        
        return {
          valido: avisos.length === 0,
          avisos
        };
      }
    };
    
    return helper;
  }, [funcionarios, adiantamentos]);
}