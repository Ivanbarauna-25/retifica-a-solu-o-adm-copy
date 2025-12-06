import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function RelatorioFluxoCaixaFiltersModal({ isOpen, onClose, contasBancarias }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    contaBancariaId: 'todas',
    considerarPrevistos: false,
  });

  const handleGenerate = () => {
    const params = new URLSearchParams({
      data_inicio: filters.dataInicio,
      data_fim: filters.dataFim,
      conta_id: filters.contaBancariaId,
      incluir_previstos: filters.considerarPrevistos
    });
    
    // Open in new tab
    window.open(`${createPageUrl('RelatorioFluxoCaixa')}?${params.toString()}`, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden modern-modal">
        <div className="modern-modal-header flex justify-between items-center p-4 bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1.5 rounded-lg">
              <FilterIcon className="w-4 h-4 text-slate-200" />
            </div>
            <div>
              <DialogTitle className="text-white text-base font-medium">Relatório de Fluxo de Caixa</DialogTitle>
              <p className="text-slate-400 text-xs">Configure os filtros para gerar o relatório</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6 bg-white">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase">Data Início</Label>
              <Input
                type="date"
                className="modern-input"
                value={filters.dataInicio}
                onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase">Data Fim</Label>
              <Input
                type="date"
                className="modern-input"
                value={filters.dataFim}
                onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-600 uppercase">Conta Bancária</Label>
            <Select 
              value={filters.contaBancariaId} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, contaBancariaId: value }))}
            >
              <SelectTrigger className="modern-input">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Contas</SelectItem>
                {contasBancarias.map(conta => (
                  <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <Checkbox 
              id="previstos" 
              checked={filters.considerarPrevistos}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, considerarPrevistos: checked }))}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="previstos" className="text-sm font-medium text-slate-700 cursor-pointer">
                Incluir lançamentos previstos (não pagos)
              </Label>
              <p className="text-xs text-slate-500">
                Se marcado, o relatório incluirá movimentações pendentes baseadas na data de vencimento.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 bg-slate-50 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700">
            Cancelar
          </Button>
          <Button onClick={handleGenerate} className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20">
            Gerar Relatório
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}