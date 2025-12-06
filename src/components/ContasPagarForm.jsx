import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard } from 'lucide-react';

export default function ContasPagarForm({ conta, fornecedores, planoContas, onSave, onClose }) {
  const [formData, setFormData] = useState({
    fornecedor_id: '',
    plano_contas_id: '',
    descricao: '',
    numero_documento: '',
    data_vencimento: '',
    data_pagamento: '',
    competencia: '',
    valor_original: '',
    valor_pago: '',
    juros_multa: '0',
    desconto: '0',
    status: 'pendente',
    observacoes: ''
  });

  useEffect(() => {
    if (conta) {
      setFormData({ ...conta });
    }
  }, [conta]);

  useEffect(() => {
    if (formData.data_vencimento && !formData.competencia) {
      const data = new Date(formData.data_vencimento + 'T00:00:00');
      const competencia = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, competencia }));
    }
  }, [formData.data_vencimento]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const contasDespesa = planoContas.filter(conta => conta.tipo === 'despesa' && conta.ativa);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 bg-white border border-slate-200 rounded-xl">
        <DialogHeader className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{conta ? 'Editar' : 'Nova'} Conta a Pagar</h2>
              <p className="text-xs text-slate-300 mt-0.5">Preencha os dados da conta</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-6 bg-slate-100/50 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-800 text-sm">Dados Gerais</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fornecedor_id" className="text-sm font-semibold text-slate-700">Fornecedor *</Label>
                  <Select value={formData.fornecedor_id} onValueChange={(value) => handleSelectChange('fornecedor_id', value)}>
                    <SelectTrigger className="text-black">
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores.map(fornecedor => (
                        <SelectItem key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="plano_contas_id" className="text-sm font-semibold text-slate-700">Categoria *</Label>
                  <Select value={formData.plano_contas_id} onValueChange={(value) => handleSelectChange('plano_contas_id', value)}>
                    <SelectTrigger className="text-black">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasDespesa.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.codigo} - {conta.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-sm font-semibold text-slate-700">Descrição *</Label>
                <Input id="descricao" value={formData.descricao} onChange={handleChange} required className="text-black" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-800 text-sm">Valores e Datas</h3>
            </div>
            <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_documento" className="text-black">Número do Documento</Label>
              <Input id="numero_documento" value={formData.numero_documento} onChange={handleChange} className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_vencimento" className="text-black">Data de Vencimento *</Label>
              <Input id="data_vencimento" type="date" value={formData.data_vencimento} onChange={handleChange} required className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competencia" className="text-black">Competência *</Label>
              <Input 
                id="competencia" 
                type="month" 
                value={formData.competencia} 
                onChange={handleChange} 
                required 
                placeholder="AAAA-MM"
                className="text-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_original" className="text-black">Valor Original *</Label>
              <Input id="valor_original" type="number" step="0.01" value={formData.valor_original} onChange={handleChange} required className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="juros_multa" className="text-black">Juros/Multa</Label>
              <Input id="juros_multa" type="number" step="0.01" value={formData.juros_multa} onChange={handleChange} className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desconto" className="text-black">Desconto</Label>
              <Input id="desconto" type="number" step="0.01" value={formData.desconto} onChange={handleChange} className="text-black" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_pago" className="text-black">Valor Pago</Label>
              <Input id="valor_pago" type="number" step="0.01" value={formData.valor_pago} onChange={handleChange} className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_pagamento" className="text-black">Data do Pagamento</Label>
              <Input id="data_pagamento" type="date" value={formData.data_pagamento} onChange={handleChange} className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-black">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger className="text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes" className="text-sm font-semibold text-slate-700">Observações</Label>
            <Textarea id="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} className="text-black" />
          </div>
          </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-300 text-slate-700 hover:bg-slate-50">Cancelar</Button>
            <Button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}