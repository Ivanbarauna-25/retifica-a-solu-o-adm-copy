import { useMemo } from 'react';

/**
 * Hook para aplicar filtros avançados em uma lista de dados
 * @param {Array} data - Array de dados a filtrar
 * @param {Object} filters - Objeto de filtros do AdvancedSearchFilters
 * @returns {Array} - Dados filtrados e ordenados
 */
export function useAdvancedFilters(data, filters) {
  return useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (!filters) return data;

    let result = [...data];

    // 1. Aplicar busca textual
    if (filters.searchTerm && filters.searchFields?.length > 0) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      result = result.filter(item => {
        return filters.searchFields.some(field => {
          const value = getNestedValue(item, field);
          if (value == null) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    }

    // 2. Aplicar filtros de campos específicos
    if (filters.filters && Object.keys(filters.filters).length > 0) {
      Object.entries(filters.filters).forEach(([key, value]) => {
        if (value != null && value !== '' && value !== 'all') {
          result = result.filter(item => {
            const itemValue = getNestedValue(item, key);
            return String(itemValue) === String(value);
          });
        }
      });
    }

    // 3. Aplicar filtro de período
    if (filters.dateField && filters.dateRange) {
      const { start, end } = filters.dateRange;
      result = result.filter(item => {
        const itemDate = new Date(getNestedValue(item, filters.dateField));
        if (isNaN(itemDate.getTime())) return true; // Se data inválida, manter item
        
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
      });
    }

    // 4. Aplicar ordenação
    if (filters.sort?.field) {
      const { field, direction } = filters.sort;
      result.sort((a, b) => {
        let aVal = getNestedValue(a, field);
        let bVal = getNestedValue(b, field);

        // Tratar datas
        if (field.includes('date') || field.includes('data')) {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }
        // Tratar números
        else if (typeof aVal === 'number' || typeof bVal === 'number') {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        }
        // Tratar strings
        else {
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filters]);
}

// Helper para acessar propriedades aninhadas (ex: 'cliente.nome')
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

export default useAdvancedFilters;