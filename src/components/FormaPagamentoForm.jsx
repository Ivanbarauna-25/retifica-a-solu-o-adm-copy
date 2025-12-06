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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {formaPagamento ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              placeholder="Ex: Cartão Visa, PIX, Dinheiro..."
              required
            />
          </div>

          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={formData.tipo} onValueChange={(value) => handleChange('tipo', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taxa_percentual">Taxa Percentual (%)</Label>
              <Input
                id="taxa_percentual"
                type="number"
                min="0"
                step="0.01"
                value={formData.taxa_percentual}
                onChange={(e) => handleChange('taxa_percentual', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="taxa_fixa">Taxa Fixa (R$)</Label>
              <Input
                id="taxa_fixa"
                type="number"
                min="0"
                step="0.01"
                value={formData.taxa_fixa}
                onChange={(e) => handleChange('taxa_fixa', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="prazo_recebimento">Prazo de Recebimento (dias)</Label>
            <Input
              id="prazo_recebimento"
              type="number"
              min="0"
              value={formData.prazo_recebimento}
              onChange={(e) => handleChange('prazo_recebimento', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ativa"
              checked={formData.ativa}
              onCheckedChange={(checked) => handleChange('ativa', checked)}
            />
            <Label htmlFor="ativa">Forma de pagamento ativa</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}