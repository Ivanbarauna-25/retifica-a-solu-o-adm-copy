import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function VeiculoForm({ isOpen, veiculo, clientes, clientePreSelecionado, onSave, onClose }) {
  const [formData, setFormData] = useState({
    cliente_id: '',
    placa: '',
    marca: '',
    modelo: '',
    ano_fabricacao: '',
  });

  useEffect(() => {
    if (veiculo) {
      setFormData({
        cliente_id: veiculo.cliente_id || '',
        placa: veiculo.placa || '',
        marca: veiculo.marca || '',
        modelo: veiculo.modelo || '',
        ano_fabricacao: veiculo.ano_fabricacao || '',
      });
    } else if (clientePreSelecionado) {
      setFormData({
        cliente_id: clientePreSelecionado.id,
        placa: '',
        marca: '',
        modelo: '',
        ano_fabricacao: '',
      });
    } else {
        setFormData({
            cliente_id: '',
            placa: '',
            marca: '',
            modelo: '',
            ano_fabricacao: '',
        });
    }
  }, [veiculo, clientePreSelecionado]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value) => {
    setFormData((prev) => ({ ...prev, cliente_id: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] md:max-w-2xl p-0 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <DialogHeader className="px-3 md:px-6 py-3 md:py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700">
                <DialogTitle className="text-sm md:text-lg text-white">{veiculo ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="p-3 md:p-6 space-y-3 md:space-y-4">
                <div>
                    <Label htmlFor="cliente_id" className="text-xs md:text-sm">Cliente</Label>
                    <Select value={formData.cliente_id} onValueChange={handleSelectChange} required>
                    <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm mt-1">
                        <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                        {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div>
                    <Label htmlFor="placa" className="text-xs md:text-sm">Placa</Label>
                    <Input id="placa" value={formData.placa} onChange={handleChange} required className="h-9 md:h-10 text-xs md:text-sm mt-1" />
                    </div>
                    <div>
                    <Label htmlFor="ano_fabricacao" className="text-xs md:text-sm">Ano</Label>
                    <Input id="ano_fabricacao" value={formData.ano_fabricacao} onChange={handleChange} className="h-9 md:h-10 text-xs md:text-sm mt-1" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div>
                    <Label htmlFor="marca" className="text-xs md:text-sm">Marca</Label>
                    <Input id="marca" value={formData.marca} onChange={handleChange} required className="h-9 md:h-10 text-xs md:text-sm mt-1" />
                    </div>
                    <div>
                    <Label htmlFor="modelo" className="text-xs md:text-sm">Modelo</Label>
                    <Input id="modelo" value={formData.modelo} onChange={handleChange} required className="h-9 md:h-10 text-xs md:text-sm mt-1" />
                    </div>
                </div>
                <DialogFooter className="gap-2 pt-3 md:pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose} className="h-8 md:h-10 text-xs md:text-sm px-3 md:px-4">Cancelar</Button>
                    <Button type="submit" className="h-8 md:h-10 text-xs md:text-sm px-3 md:px-4">Salvar</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}