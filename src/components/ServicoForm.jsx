import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ServicoForm({ isOpen, servico, onSave, onClose }) {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor_padrao: ''
  });

  useEffect(() => {
    if (servico) {
      setFormData(servico);
    } else {
      setFormData({
        nome: '',
        descricao: '',
        valor_padrao: ''
      });
    }
  }, [servico]);

  const handleChange = (e) => {
    const { id, value, type } = e.target;
    setFormData(prev => ({ ...prev, [id]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{servico ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome do Serviço</Label>
            <Input id="nome" value={formData.nome} onChange={handleChange} required 
              placeholder="Ex: Troca de Óleo, Alinhamento, Balanceamento..." />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" value={formData.descricao} onChange={handleChange} 
              placeholder="Descrição detalhada do que o serviço inclui..." 
              className="h-24" />
          </div>
          <div>
            <Label htmlFor="valor_padrao">Valor Padrão (R$)</Label>
            <Input id="valor_padrao" type="number" step="0.01" value={formData.valor_padrao} onChange={handleChange} required 
              placeholder="0,00" />
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