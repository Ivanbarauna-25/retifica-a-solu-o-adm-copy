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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-white">
            <DialogHeader className="bg-slate-800 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10">
                <DialogTitle className="text-white text-sm md:text-lg font-semibold">{peca ? 'Editar Peça' : 'Nova Peça'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="text-slate-950 space-y-3 md:space-y-4 p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                        <Label htmlFor="codigo" className="text-xs md:text-sm font-medium">Código</Label>
                        <Input id="codigo" value={formData.codigo} onChange={handleChange} required className="mt-1 h-9 md:h-10 text-sm" />
                    </div>
                    <div>
                        <Label htmlFor="descricao" className="text-xs md:text-sm font-medium">Descrição</Label>
                        <Input id="descricao" value={formData.descricao} onChange={handleChange} required className="mt-1 h-9 md:h-10 text-sm" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                     <div>
                        <Label htmlFor="fabricante" className="text-xs md:text-sm font-medium">Fabricante</Label>
                        <Input id="fabricante" value={formData.fabricante} onChange={handleChange} className="mt-1 h-9 md:h-10 text-sm" />
                    </div>
                    <div>
                        <Label htmlFor="localizacao" className="text-xs md:text-sm font-medium">Localização</Label>
                        <Input id="localizacao" value={formData.localizacao} onChange={handleChange} className="mt-1 h-9 md:h-10 text-sm" />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                        <Label htmlFor="preco_custo" className="text-xs md:text-sm font-medium">Preço Custo</Label>
                        <Input id="preco_custo" type="number" step="0.01" value={formData.preco_custo} onChange={handleChange} required className="mt-1 h-9 md:h-10 text-sm" />
                    </div>
                    <div>
                        <Label htmlFor="preco_venda" className="text-xs md:text-sm font-medium">Preço Venda</Label>
                        <Input id="preco_venda" type="number" step="0.01" value={formData.preco_venda} onChange={handleChange} required className="mt-1 h-9 md:h-10 text-sm" />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                        <Label htmlFor="quantidade_estoque" className="text-xs md:text-sm font-medium">Estoque Atual</Label>
                        <Input id="quantidade_estoque" type="number" value={formData.quantidade_estoque} onChange={handleChange} className="mt-1 h-9 md:h-10 text-sm" />
                    </div>
                    <div>
                        <Label htmlFor="quantidade_minima" className="text-xs md:text-sm font-medium">Estoque Mín.</Label>
                        <Input id="quantidade_minima" type="number" value={formData.quantidade_minima} onChange={handleChange} className="mt-1 h-9 md:h-10 text-sm" />
                    </div>
                </div>
                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 sm:justify-end sm:space-x-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto h-9 md:h-10 text-xs md:text-sm">Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto h-9 md:h-10 text-xs md:text-sm bg-slate-800 hover:bg-slate-700">Salvar</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>);

}