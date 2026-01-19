import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function FormaPagamentoForm({ isOpen, formaPagamento, onSave, onClose }) {
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'dinheiro',
    taxa_percentual: 0,
    taxa_fixa: 0,
    prazo_recebimento: 0,
    ativa: true
  });

  useEffect(() => {
    if (formaPagamento) {
      setFormData({
        nome: formaPagamento.nome || '',
        tipo: formaPagamento.tipo || 'dinheiro',
        taxa_percentual: formaPagamento.taxa_percentual || 0,
        taxa_fixa: formaPagamento.taxa_fixa || 0,
        prazo_recebimento: formaPagamento.prazo_recebimento || 0,
        ativa: formaPagamento.ativa !== false
      });
    } else {
      setFormData({
        nome: '',
        tipo: 'dinheiro',
        taxa_percentual: 0,
        taxa_fixa: 0,
        prazo_recebimento: 0,
        ativa: true
      });
    }
  }, [formaPagamento]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const tiposOptions = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cartao_credito', label: 'Cartão de Crédito' },
    { value: 'cartao_debito', label: 'Cartão de Débito' },
    { value: 'pix', label: 'PIX' },
    { value: 'ted', label: 'TED' },
    { value: 'doc', label: 'DOC' },
    { value: 'boleto', label: 'Boleto' },
    { value: 'cheque', label: 'Cheque' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] md:max-w-lg p-0 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="sticky top-0 z-10 px-3 md:px-6 py-3 md:py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700 flex-shrink-0">
          <DialogTitle className="text-sm md:text-lg text-white">
            {formaPagamento ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div>
              <Label htmlFor="nome" className="text-xs md:text-sm">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Ex: Cartão Visa, PIX..."
                required
                className="h-9 md:h-10 mt-1"
              />
            </div>

            <div>
              <Label htmlFor="tipo" className="text-xs md:text-sm">Tipo</Label>
              <Select value={formData.tipo} onValueChange={(value) => handleChange('tipo', value)}>
                <SelectTrigger className="h-9 md:h-10 mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tiposOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div>
                <Label htmlFor="taxa_percentual" className="text-xs md:text-sm">Taxa %</Label>
                <Input
                  id="taxa_percentual"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.taxa_percentual}
                  onChange={(e) => handleChange('taxa_percentual', parseFloat(e.target.value) || 0)}
                  className="h-9 md:h-10 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="taxa_fixa" className="text-xs md:text-sm">Taxa Fixa R$</Label>
                <Input
                  id="taxa_fixa"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.taxa_fixa}
                  onChange={(e) => handleChange('taxa_fixa', parseFloat(e.target.value) || 0)}
                  className="h-9 md:h-10 mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="prazo_recebimento" className="text-xs md:text-sm">Prazo (dias)</Label>
              <Input
                id="prazo_recebimento"
                type="number"
                min="0"
                value={formData.prazo_recebimento}
                onChange={(e) => handleChange('prazo_recebimento', parseInt(e.target.value) || 0)}
                className="h-9 md:h-10 mt-1"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="ativa"
                checked={formData.ativa}
                onCheckedChange={(checked) => handleChange('ativa', checked)}
              />
              <Label htmlFor="ativa" className="text-xs md:text-sm">Forma de pagamento ativa</Label>
            </div>
          </div>
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 md:px-6 py-3 md:py-4 flex justify-end gap-2 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4">
              Cancelar
            </Button>
            <Button type="submit" className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}