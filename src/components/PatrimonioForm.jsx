import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function PatrimonioForm({ isOpen, patrimonio, onSave, onClose }) {
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    categoria: '',
    valor_aquisicao: '',
    data_aquisicao: '',
    localizacao_fisica: '',
    status: 'ativo'
  });

  useEffect(() => {
    if (patrimonio) {
        setFormData({
            ...patrimonio,
            data_aquisicao: patrimonio.data_aquisicao ? patrimonio.data_aquisicao.split('T')[0] : ''
        });
    } else {
      setFormData({
        codigo: '',
        descricao: '',
        categoria: '',
        valor_aquisicao: '',
        data_aquisicao: '',
        localizacao_fisica: '',
        status: 'ativo'
      });
    }
  }, [patrimonio]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-white">
            <DialogHeader className="bg-slate-800 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10">
                <DialogTitle className="text-white text-sm md:text-lg font-semibold">{patrimonio ? 'Editar Patrimônio' : 'Novo Patrimônio'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 p-4 md:p-6">
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
                 <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                        <Label htmlFor="categoria" className="text-xs md:text-sm font-medium">Categoria</Label>
                        <Select value={formData.categoria} onValueChange={(value) => handleSelectChange('categoria', value)} required>
                            <SelectTrigger className="mt-1 h-9 md:h-10 text-sm"><SelectValue placeholder="Selecione"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="equipamento">Equipamento</SelectItem>
                                <SelectItem value="ferramenta">Ferramenta</SelectItem>
                                <SelectItem value="mobiliario">Mobiliário</SelectItem>
                                <SelectItem value="veiculo">Veículo</SelectItem>
                                <SelectItem value="informatica">Informática</SelectItem>
                                <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="status" className="text-xs md:text-sm font-medium">Status</Label>
                        <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)} required>
                            <SelectTrigger className="mt-1 h-9 md:h-10 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ativo">Ativo</SelectItem>
                                <SelectItem value="inativo">Inativo</SelectItem>
                                <SelectItem value="manutencao">Manutenção</SelectItem>
                                <SelectItem value="vendido">Vendido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                        <Label htmlFor="valor_aquisicao" className="text-xs md:text-sm font-medium">Valor (R$)</Label>
                        <Input id="valor_aquisicao" type="number" step="0.01" value={formData.valor_aquisicao} onChange={handleChange} required className="mt-1 h-9 md:h-10 text-sm" />
                    </div>
                    <div>
                        <Label htmlFor="data_aquisicao" className="text-xs md:text-sm font-medium">Data Aquisição</Label>
                        <Input id="data_aquisicao" type="date" value={formData.data_aquisicao} onChange={handleChange} required className="mt-1 h-9 md:h-10 text-sm" />
                    </div>
                </div>
                 <div>
                    <Label htmlFor="localizacao_fisica" className="text-xs md:text-sm font-medium">Localização Física</Label>
                    <Input id="localizacao_fisica" value={formData.localizacao_fisica} onChange={handleChange} className="mt-1 h-9 md:h-10 text-sm" />
                </div>
                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 sm:justify-end sm:space-x-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto h-9 md:h-10 text-xs md:text-sm">Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto h-9 md:h-10 text-xs md:text-sm bg-slate-800 hover:bg-slate-700">Salvar</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}