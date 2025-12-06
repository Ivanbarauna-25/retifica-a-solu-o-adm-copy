import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, X, Filter, Calendar, TrendingUp } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

export default function RelatorioContasPagarFiltersModal({ isOpen, onClose, fornecedores }) {
  const [planosContas, setPlanosContas] = useState([]);
  const [filtros, setFiltros] = useState({
    fornecedor_id: 'todos',
    status: 'todos',
    plano_contas_id: 'todos',
    data_inicio: '',
    data_fim: '',
    ordenacao: 'data_vencimento'
  });

  useEffect(() => {
    if (isOpen) {
      loadPlanosContas();
    }
  }, [isOpen]);

  const loadPlanosContas = async () => {
    try {
      const planos = await base44.entities.PlanoContas.list();
      const planosDespesa = (planos || []).filter(p => p.tipo === 'despesa' && p.ativa !== false);
      setPlanosContas(planosDespesa);
    } catch (error) {
      console.error('Erro ao carregar planos de contas:', error);
    }
  };

  const handleGerar = () => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value && value !== 'todos') {
        params.append(key, value);
      }
    });

    const url = `${createPageUrl('RelatorioContasPagar')}?${params.toString()}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden modern-modal p-0">
        <DialogHeader className="modern-modal-header bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">Filtros do Relatório</DialogTitle>
              <p className="text-sm text-slate-200 mt-1">Contas a Pagar</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <Card className="border-2 border-slate-200 shadow-sm">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">Filtros Básicos</h3>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-900 font-semibold mb-2 block">Fornecedor</Label>
                  <Select 
                    value={filtros.fornecedor_id} 
                    onValueChange={(v) => setFiltros({ ...filtros, fornecedor_id: v })}
                  >
                    <SelectTrigger className="bg-white text-slate-900 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Fornecedores</SelectItem>
                      {fornecedores.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-900 font-semibold mb-2 block">Status</Label>
                  <Select 
                    value={filtros.status} 
                    onValueChange={(v) => setFiltros({ ...filtros, status: v })}
                  >
                    <SelectTrigger className="bg-white text-slate-900 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label className="text-slate-900 font-semibold mb-2 block">Categoria (Plano de Contas)</Label>
                  <Select 
                    value={filtros.plano_contas_id} 
                    onValueChange={(v) => setFiltros({ ...filtros, plano_contas_id: v })}
                  >
                    <SelectTrigger className="bg-white text-slate-900 h-11">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as Categorias</SelectItem>
                      {planosContas.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.codigo} - {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 shadow-sm">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">Período</h3>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-900 font-semibold mb-2 block">Data Início</Label>
                  <Input
                    type="date"
                    value={filtros.data_inicio}
                    onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                    className="bg-white text-slate-900 h-11"
                  />
                </div>

                <div>
                  <Label className="text-slate-900 font-semibold mb-2 block">Data Fim</Label>
                  <Input
                    type="date"
                    value={filtros.data_fim}
                    onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                    className="bg-white text-slate-900 h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 shadow-sm">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">Ordenação</h3>
              </div>
            </div>
            <CardContent className="p-4">
              <div>
                <Label className="text-slate-900 font-semibold mb-2 block">Ordenar por</Label>
                <Select 
                  value={filtros.ordenacao} 
                  onValueChange={(v) => setFiltros({ ...filtros, ordenacao: v })}
                >
                  <SelectTrigger className="bg-white text-slate-900 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_vencimento">Data de Vencimento</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="valor">Valor (Maior para Menor)</SelectItem>
                    <SelectItem value="categoria">Categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="border-t-2 border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex gap-3 w-full justify-end">
            <Button variant="outline" onClick={onClose} className="h-11 px-6 border-2 border-slate-300">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleGerar} className="bg-slate-700 hover:bg-slate-800 h-11 px-6 shadow-lg">
              <FileText className="w-4 h-4 mr-2" />
              Gerar Relatório
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}