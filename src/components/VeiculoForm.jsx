
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
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{veiculo ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="cliente_id">Cliente</Label>
                    <Select value={formData.cliente_id} onValueChange={handleSelectChange} required>
                    <SelectTrigger>
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
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <Label htmlFor="placa">Placa</Label>
                    <Input id="placa" value={formData.placa} onChange={handleChange} required />
                    </div>
                    <div>
                    <Label htmlFor="ano_fabricacao">Ano</Label>
                    <Input id="ano_fabricacao" value={formData.ano_fabricacao} onChange={handleChange} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <Label htmlFor="marca">Marca</Label>
                    <Input id="marca" value={formData.marca} onChange={handleChange} required />
                    </div>
                    <div>
                    <Label htmlFor="modelo">Modelo</Label>
                    <Input id="modelo" value={formData.modelo} onChange={handleChange} required />
                    </div>
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
