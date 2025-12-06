import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

export default function FluxoCaixaForm({ movimento, contasBancarias, formasPagamento, planoContas, onSave, onClose }) {
  const [formData, setFormData] = useState({
    data_movimento: new Date().toISOString().split('T')[0],
    tipo_movimento: 'saida',
    conta_bancaria_id: '',
    forma_pagamento_id: '',
    plano_contas_id: '',
    descricao: '',
    valor: 0,
    observacoes: '',
  });

  useEffect(() => {
    if (movimento) {
      setFormData({
        data_movimento: movimento.data_movimento?.split('T')[0] || new Date().toISOString().split('T')[0],
        tipo_movimento: movimento.tipo_movimento || 'saida',
        conta_bancaria_id: movimento.conta_bancaria_id || '',
        forma_pagamento_id: movimento.forma_pagamento_id || '',
        plano_contas_id: movimento.plano_contas_id || '',
        descricao: movimento.descricao || '',
        valor: movimento.valor || 0,
        observacoes: movimento.observacoes || '',
      });
    } else {
      // Reset for new entry
      setFormData({
        data_movimento: new Date().toISOString().split('T')[0],
        tipo_movimento: 'saida',
        conta_bancaria_id: '',
        forma_pagamento_id: '',
        plano_contas_id: '',
        descricao: '',
        valor: 0,
        observacoes: '',
      });
    }
  }, [movimento]);

  const handleChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleValueChange = (e) => {
    const { id, value } = e.target;
    // Permite números e um único ponto decimal
    const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    handleChange(id, sanitizedValue);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, valor: parseFloat(formData.valor) || 0 });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{movimento ? 'Editar Movimento' : 'Novo Lançamento no Caixa'}</DialogTitle>
          <DialogDescription>Preencha os detalhes da movimentação financeira.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label>Tipo de Movimento</Label>
              <RadioGroup
                value={formData.tipo_movimento}
                onValueChange={(value) => handleChange('tipo_movimento', value)}
                className="flex gap-4 pt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="entrada" id="r_entrada" />
                  <Label htmlFor="r_entrada">Entrada</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="saida" id="r_saida" />
                  <Label htmlFor="r_saida">Saída</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="valor">Valor *</Label>
                    <Input id="valor" type="text" value={formData.valor} onChange={handleValueChange} required />
                </div>
                <div>
                    <Label htmlFor="data_movimento">Data *</Label>
                    <Input id="data_movimento" type="date" value={formData.data_movimento} onChange={(e) => handleChange('data_movimento', e.target.value)} required />
                </div>
            </div>

            <div>
                <Label htmlFor="descricao">Descrição *</Label>
                <Input id="descricao" value={formData.descricao} onChange={(e) => handleChange('descricao', e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="conta_bancaria_id">Conta Bancária *</Label>
              <Select value={formData.conta_bancaria_id} onValueChange={(value) => handleChange('conta_bancaria_id', value)} required>
                <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
                <SelectContent>
                  {contasBancarias.map(conta => <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="forma_pagamento_id">Forma de Pagamento</Label>
              <Select value={formData.forma_pagamento_id} onValueChange={(value) => handleChange('forma_pagamento_id', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione uma forma" /></SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(forma => <SelectItem key={forma.id} value={forma.id}>{forma.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={formData.observacoes} onChange={(e) => handleChange('observacoes', e.target.value)} />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}