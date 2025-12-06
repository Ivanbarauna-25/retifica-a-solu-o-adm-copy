import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileBarChart2, Filter, Calendar, User, Car, Hash, X, CheckCircle2 } from 'lucide-react';

export default function RelatorioOSFiltersModal({ isOpen, onClose, onGenerate, clientes, funcionarios, veiculos }) {
  const [filtros, setFiltros] = useState({
    status: 'todos',
    numero_os: '',
    cliente_id: '',
    responsavel_id: '',
    vendedor_id: '',
    veiculo_id: '',
    data_inicio: '',
    data_fim: '',
    apenas_canceladas: false
  });

  const handleChange = (field, value) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    onGenerate(filtros);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col modern-modal p-0 bg-white border border-slate-200 rounded-xl">
        <DialogHeader className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center ring-1 ring-white/10">
                <Filter className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-white tracking-tight">
                  Filtros do Relatório
                </DialogTitle>
                <p className="text-sm text-slate-400 font-medium">
                  Configure os filtros para gerar o relatório personalizado
                </p>
              </div>
            </div>
            <Button
              size="icon"
              onClick={onClose}
              className="h-9 w-9 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-800 text-sm">Filtros de Pesquisa</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <FileBarChart2 className="w-3.5 h-3.5 text-slate-400" />
                Status
              </Label>
              <Select value={filtros.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="h-10 bg-white border border-slate-200 rounded-lg text-slate-900">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Nº OS
              </Label>
              <Input
                value={filtros.numero_os}
                onChange={(e) => handleChange('numero_os', e.target.value)}
                placeholder="Ex: OS123456"
                className="h-10 bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Cliente
              </Label>
              <Select value={filtros.cliente_id} onValueChange={(v) => handleChange('cliente_id', v)}>
                <SelectTrigger className="h-10 bg-white border border-slate-200 rounded-lg text-slate-900">
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {clientes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Responsável Técnico
              </Label>
              <Select value={filtros.responsavel_id} onValueChange={(v) => handleChange('responsavel_id', v)}>
                <SelectTrigger className="h-10 bg-white border border-slate-200 rounded-lg text-slate-900">
                  <SelectValue placeholder="Todos os técnicos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {funcionarios?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Vendedor
              </Label>
              <Select value={filtros.vendedor_id} onValueChange={(v) => handleChange('vendedor_id', v)}>
                <SelectTrigger className="h-10 bg-white border border-slate-200 rounded-lg text-slate-900">
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {funcionarios?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-slate-400" />
                Veículo
              </Label>
              <Select value={filtros.veiculo_id} onValueChange={(v) => handleChange('veiculo_id', v)}>
                <SelectTrigger className="h-10 bg-white border border-slate-200 rounded-lg text-slate-900">
                  <SelectValue placeholder="Todos os veículos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {veiculos?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.marca} {v.modelo} {v.placa ? `- ${v.placa}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data Início
              </Label>
              <Input
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => handleChange('data_inicio', e.target.value)}
                className="h-10 bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data Fim
              </Label>
              <Input
                type="date"
                value={filtros.data_fim}
                onChange={(e) => handleChange('data_fim', e.target.value)}
                className="h-10 bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="apenas-canceladas"
                checked={filtros.apenas_canceladas}
                onCheckedChange={(checked) => handleChange('apenas_canceladas', checked)}
                className="h-4 w-4 border-2 border-slate-300 data-[state=checked]:bg-slate-800 data-[state=checked]:border-slate-800"
              />
              <Label 
                htmlFor="apenas-canceladas" 
                className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5 text-red-500" />
                Apenas ordens canceladas
              </Label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-slate-800 text-white hover:bg-slate-700 font-semibold flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              className="bg-slate-800 hover:bg-slate-700 text-white gap-2 font-semibold flex items-center"
            >
              <CheckCircle2 className="w-4 h-4" />
              Gerar Relatório
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}