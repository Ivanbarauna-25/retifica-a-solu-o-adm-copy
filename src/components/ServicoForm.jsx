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
      <DialogContent className="w-[95vw] md:max-w-2xl p-0 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="sticky top-0 z-10 px-3 md:px-6 py-3 md:py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700 flex-shrink-0">
          <DialogTitle className="text-sm md:text-lg text-white">{servico ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div>
              <Label htmlFor="nome" className="text-xs md:text-sm">Nome do Serviço</Label>
              <Input id="nome" value={formData.nome} onChange={handleChange} required 
                placeholder="Ex: Troca de Óleo..." className="h-9 md:h-10 mt-1" />
            </div>
            <div>
              <Label htmlFor="descricao" className="text-xs md:text-sm">Descrição</Label>
              <Textarea id="descricao" value={formData.descricao} onChange={handleChange} 
                placeholder="Descrição detalhada..." 
                className="h-20 md:h-24 mt-1" />
            </div>
            <div>
              <Label htmlFor="valor_padrao" className="text-xs md:text-sm">Valor Padrão R$</Label>
              <Input id="valor_padrao" type="number" step="0.01" value={formData.valor_padrao} onChange={handleChange} required 
                placeholder="0,00" className="h-9 md:h-10 mt-1" />
            </div>
          </div>
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 md:px-6 py-3 md:py-4 flex justify-end gap-2 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4">Cancelar</Button>
            <Button type="submit" className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}