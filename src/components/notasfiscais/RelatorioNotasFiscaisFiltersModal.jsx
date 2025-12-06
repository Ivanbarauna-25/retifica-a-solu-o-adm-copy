import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Printer, FileText, Calendar, Building2, X, Package } from 'lucide-react';

export default function RelatorioNotasFiscaisFiltersModal({ isOpen, onClose, onGenerate, fornecedores }) {
  const [status, setStatus] = useState('todos');
  const [fornecedorId, setFornecedorId] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoEntrada, setTipoEntrada] = useState('todos');
  const [apenasProcessadas, setApenasProcessadas] = useState(false);

  const handleGenerate = () => {
    const filters = {
      status: status === 'todos' ? '' : status,
      fornecedorId: fornecedorId === 'todos' ? '' : fornecedorId,
      tipoEntrada: tipoEntrada === 'todos' ? '' : tipoEntrada,
      dataInicio,
      dataFim,
      apenasProcessadas
    };
    onGenerate(filters);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-white" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="pb-4 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-slate-900 text-xl font-bold">
              <div className="bg-slate-100 p-2 rounded-lg">
                <Printer className="w-5 h-5 text-slate-800" />
              </div>
              Gerar Relatório de Notas Fiscais
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-slate-600 font-medium mt-2">
            Configure os filtros para gerar relatórios de análise de produtos e estoque
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-4">
          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="border-2 border-slate-300 focus:border-slate-600 text-slate-900 font-medium">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="processada">Processada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              Fornecedor
            </Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger className="border-2 border-slate-300 focus:border-slate-600 text-slate-900 font-medium">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="todos">Todos</SelectItem>
                {fornecedores.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-600" />
              Tipo de Entrada
            </Label>
            <Select value={tipoEntrada} onValueChange={setTipoEntrada}>
              <SelectTrigger className="border-2 border-slate-300 focus:border-slate-600 text-slate-900 font-medium">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="consumo">Consumo</SelectItem>
                <SelectItem value="revenda">Revenda</SelectItem>
                <SelectItem value="remessa">Remessa</SelectItem>
                <SelectItem value="uso_consumo">Uso e Consumo</SelectItem>
                <SelectItem value="ativo_imobilizado">Ativo Imobilizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" />
              Data Início
            </Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="border-2 border-slate-300 focus:border-slate-600 text-slate-900 font-medium"
            />
          </div>

          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" />
              Data Fim
            </Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="border-2 border-slate-300 focus:border-slate-600 text-slate-900 font-medium"
            />
          </div>

          <div className="md:col-span-2 mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <Checkbox
                id="processadas"
                checked={apenasProcessadas}
                onCheckedChange={(v) => setApenasProcessadas(!!v)}
                className="border-2 border-slate-400"
              />
              <Label htmlFor="processadas" className="cursor-pointer text-sm font-semibold text-slate-900">
                Apenas notas já processadas (com produtos cadastrados)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t-2 border-slate-200 flex items-center justify-between gap-4 bg-slate-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
          <p className="text-sm text-slate-700 font-medium">Aplique os filtros desejados e clique em Gerar</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-white border-2 border-slate-400 text-slate-900 hover:bg-slate-100 font-bold px-6"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 shadow-lg gap-2"
            >
              <Printer className="w-4 h-4" />
              Gerar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}