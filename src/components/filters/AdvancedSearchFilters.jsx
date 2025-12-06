import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  X,
  Star,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Save,
  Trash2,
  RotateCcw
} from 'lucide-react';

// Períodos pré-definidos
const PRESET_PERIODS = [
  { id: 'today', label: 'Hoje', getValue: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: today, end };
  }},
  { id: 'yesterday', label: 'Ontem', getValue: () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const end = new Date(yesterday);
    end.setHours(23, 59, 59, 999);
    return { start: yesterday, end };
  }},
  { id: 'this_week', label: 'Esta semana', getValue: () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }},
  { id: 'last_week', label: 'Semana passada', getValue: () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }},
  { id: 'this_month', label: 'Este mês', getValue: () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }},
  { id: 'last_month', label: 'Mês passado', getValue: () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }},
  { id: 'this_quarter', label: 'Este trimestre', getValue: () => {
    const today = new Date();
    const quarter = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), quarter * 3, 1);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }},
  { id: 'last_quarter', label: 'Último trimestre', getValue: () => {
    const today = new Date();
    const quarter = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
    const end = new Date(today.getFullYear(), quarter * 3, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }},
  { id: 'this_year', label: 'Este ano', getValue: () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }},
  { id: 'last_year', label: 'Ano passado', getValue: () => {
    const today = new Date();
    const start = new Date(today.getFullYear() - 1, 0, 1);
    const end = new Date(today.getFullYear() - 1, 11, 31);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }},
  { id: 'last_7_days', label: 'Últimos 7 dias', getValue: () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }},
  { id: 'last_30_days', label: 'Últimos 30 dias', getValue: () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }},
  { id: 'last_90_days', label: 'Últimos 90 dias', getValue: () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 90);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }},
  { id: 'custom', label: 'Personalizado', getValue: () => null }
];

const STORAGE_KEY_PREFIX = 'saved_filters_';

export default function AdvancedSearchFilters({
  entityName,
  searchFields = [], // [{key: 'nome', label: 'Nome'}, ...]
  filterFields = [], // [{key: 'status', label: 'Status', options: [{value: 'ativo', label: 'Ativo'}]}]
  dateField = null, // 'data_abertura'
  sortFields = [], // [{key: 'created_date', label: 'Data Criação'}]
  defaultSort = { field: 'created_date', direction: 'desc' },
  onFiltersChange,
  className = ''
}) {
  const storageKey = `${STORAGE_KEY_PREFIX}${entityName}`;
  
  // Estados
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [sortConfig, setSortConfig] = useState(defaultSort);
  const [savedFilters, setSavedFilters] = useState([]);
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Carregar filtros salvos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setSavedFilters(JSON.parse(saved));
    }
  }, [storageKey]);

  // Notificar mudanças
  useEffect(() => {
    const filters = buildFiltersObject();
    onFiltersChange?.(filters);
  }, [searchTerm, activeFilters, selectedPeriod, customDateStart, customDateEnd, sortConfig]);

  const buildFiltersObject = () => {
    let dateRange = null;
    
    if (selectedPeriod && selectedPeriod !== 'custom') {
      const preset = PRESET_PERIODS.find(p => p.id === selectedPeriod);
      if (preset) {
        dateRange = preset.getValue();
      }
    } else if (selectedPeriod === 'custom' && (customDateStart || customDateEnd)) {
      dateRange = {
        start: customDateStart ? new Date(customDateStart) : null,
        end: customDateEnd ? new Date(customDateEnd + 'T23:59:59') : null
      };
    }

    return {
      searchTerm,
      searchFields: searchFields.map(f => f.key),
      filters: activeFilters,
      dateField,
      dateRange,
      sort: sortConfig
    };
  };

  const handleFilterChange = (key, value) => {
    if (value === '' || value === 'all') {
      const newFilters = { ...activeFilters };
      delete newFilters[key];
      setActiveFilters(newFilters);
    } else {
      setActiveFilters({ ...activeFilters, [key]: value });
    }
  };

  const handlePeriodChange = (periodId) => {
    setSelectedPeriod(periodId);
    if (periodId !== 'custom') {
      setCustomDateStart('');
      setCustomDateEnd('');
    }
  };

  const handleSortChange = (field) => {
    if (sortConfig.field === field) {
      setSortConfig({
        field,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortConfig({ field, direction: 'desc' });
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setActiveFilters({});
    setSelectedPeriod(null);
    setCustomDateStart('');
    setCustomDateEnd('');
    setSortConfig(defaultSort);
  };

  const saveCurrentFilters = () => {
    if (!filterName.trim()) return;
    
    const newFilter = {
      id: Date.now().toString(),
      name: filterName,
      config: {
        searchTerm,
        activeFilters,
        selectedPeriod,
        customDateStart,
        customDateEnd,
        sortConfig
      }
    };
    
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setFilterName('');
    setShowSaveDialog(false);
  };

  const loadSavedFilter = (filter) => {
    const { config } = filter;
    setSearchTerm(config.searchTerm || '');
    setActiveFilters(config.activeFilters || {});
    setSelectedPeriod(config.selectedPeriod || null);
    setCustomDateStart(config.customDateStart || '');
    setCustomDateEnd(config.customDateEnd || '');
    setSortConfig(config.sortConfig || defaultSort);
  };

  const deleteSavedFilter = (filterId) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchTerm) count++;
    count += Object.keys(activeFilters).length;
    if (selectedPeriod) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Linha Principal */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={`Buscar por ${searchFields.map(f => f.label.toLowerCase()).join(', ')}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros de Status/Tipo */}
        {filterFields.map((field) => (
          <Select
            key={field.key}
            value={activeFilters[field.key] || 'all'}
            onValueChange={(value) => handleFilterChange(field.key, value)}
          >
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder={field.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {field.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* Seletor de Período */}
        {dateField && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 gap-2">
                <Calendar className="w-4 h-4" />
                {selectedPeriod ? (
                  PRESET_PERIODS.find(p => p.id === selectedPeriod)?.label || 'Período'
                ) : (
                  'Período'
                )}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-500 uppercase">Período Rápido</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_PERIODS.filter(p => p.id !== 'custom').map((period) => (
                    <Button
                      key={period.id}
                      variant={selectedPeriod === period.id ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs justify-start"
                      onClick={() => handlePeriodChange(period.id)}
                    >
                      {period.label}
                    </Button>
                  ))}
                </div>
                
                <div className="border-t pt-3">
                  <Label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Personalizado</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs mb-1 block">De</Label>
                      <Input
                        type="date"
                        value={customDateStart}
                        onChange={(e) => {
                          setCustomDateStart(e.target.value);
                          setSelectedPeriod('custom');
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs mb-1 block">Até</Label>
                      <Input
                        type="date"
                        value={customDateEnd}
                        onChange={(e) => {
                          setCustomDateEnd(e.target.value);
                          setSelectedPeriod('custom');
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {selectedPeriod && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-slate-500"
                    onClick={() => {
                      setSelectedPeriod(null);
                      setCustomDateStart('');
                      setCustomDateEnd('');
                    }}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Limpar período
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Ordenação */}
        {sortFields.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2">
                <ArrowUpDown className="w-4 h-4" />
                Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortFields.map((field) => (
                <DropdownMenuItem
                  key={field.key}
                  onClick={() => handleSortChange(field.key)}
                  className="flex justify-between"
                >
                  <span>{field.label}</span>
                  {sortConfig.field === field.key && (
                    sortConfig.direction === 'asc' ? 
                      <ArrowUp className="w-4 h-4" /> : 
                      <ArrowDown className="w-4 h-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Filtros Salvos */}
        {savedFilters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2">
                <Star className="w-4 h-4" />
                Favoritos
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filtros Salvos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {savedFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  className="flex justify-between group"
                >
                  <span 
                    onClick={() => loadSavedFilter(filter)}
                    className="flex-1 cursor-pointer"
                  >
                    {filter.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSavedFilter(filter.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Salvar Filtro Atual */}
        <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10" title="Salvar filtros atuais">
              <Save className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Salvar Filtros Atuais</Label>
              <Input
                placeholder="Nome do filtro"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="h-9"
              />
              <Button 
                onClick={saveCurrentFilters} 
                disabled={!filterName.trim()}
                className="w-full"
                size="sm"
              >
                <Star className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Limpar Tudo */}
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-10 text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Badges de Filtros Ativos */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500 font-medium">Filtros ativos:</span>
          
          {searchTerm && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Busca: "{searchTerm}"
              <button onClick={() => setSearchTerm('')} className="ml-1 hover:bg-slate-300 rounded p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          
          {Object.entries(activeFilters).map(([key, value]) => {
            const field = filterFields.find(f => f.key === key);
            const option = field?.options.find(o => o.value === value);
            return (
              <Badge key={key} variant="secondary" className="gap-1 pr-1">
                {field?.label}: {option?.label || value}
                <button onClick={() => handleFilterChange(key, '')} className="ml-1 hover:bg-slate-300 rounded p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
          
          {selectedPeriod && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {PRESET_PERIODS.find(p => p.id === selectedPeriod)?.label}
              <button onClick={() => { setSelectedPeriod(null); setCustomDateStart(''); setCustomDateEnd(''); }} className="ml-1 hover:bg-slate-300 rounded p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}