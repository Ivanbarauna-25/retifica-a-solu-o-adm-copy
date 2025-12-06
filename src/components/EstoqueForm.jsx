import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function EstoqueForm({ isOpen, peca, onSave, onClose }) {
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    fabricante: '',
    preco_custo: '',
    preco_venda: '',
    quantidade_estoque: 0,
    quantidade_minima: 5,
    localizacao: ''
  });

  useEffect(() => {
    if (peca) {
      setFormData(peca);
    } else {
      setFormData({
        codigo: '',
        descricao: '',
        fabricante: '',
        preco_custo: '',
        preco_venda: '',
        quantidade_estoque: 0,
        quantidade_minima: 5,
        localizacao: ''
      });
    }
  }, [peca]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle className="text-slate-950 text-lg font-semibold tracking-tight leading-none">{peca ? 'Editar Peça' : 'Nova Peça'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="text-slate-950 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="codigo">Código</Label>
                        <Input id="codigo" value={formData.codigo} onChange={handleChange} required className="bg-background text-slate-950 px-3 py-2 text-sm rounded-md flex h-10 w-full border border-input ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                    </div>
                    <div>
                        <Label htmlFor="descricao">Descrição</Label>
                        <Input id="descricao" value={formData.descricao} onChange={handleChange} required />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <Label htmlFor="fabricante">Fabricante</Label>
                        <Input id="fabricante" value={formData.fabricante} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="localizacao">Localização</Label>
                        <Input id="localizacao" value={formData.localizacao} onChange={handleChange} />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="preco_custo">Preço de Custo (R$)</Label>
                        <Input id="preco_custo" type="number" step="0.01" value={formData.preco_custo} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label htmlFor="preco_venda">Preço de Venda (R$)</Label>
                        <Input id="preco_venda" type="number" step="0.01" value={formData.preco_venda} onChange={handleChange} required />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="quantidade_estoque">Estoque Atual</Label>
                        <Input id="quantidade_estoque" type="number" value={formData.quantidade_estoque} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="quantidade_minima">Estoque Mínimo</Label>
                        <Input id="quantidade_minima" type="number" value={formData.quantidade_minima} onChange={handleChange} />
                    </div>
                </div>
                <DialogFooter className="text-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                    <Button type="button" variant="outline" onClick={onClose} className="bg-background text-slate-950 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-10">Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>);

}