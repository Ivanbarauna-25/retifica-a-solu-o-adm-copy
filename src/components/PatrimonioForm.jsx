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
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{patrimonio ? 'Editar Item de Patrimônio' : 'Novo Item de Patrimônio'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="codigo">Código</Label>
                        <Input id="codigo" value={formData.codigo} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label htmlFor="descricao">Descrição</Label>
                        <Input id="descricao" value={formData.descricao} onChange={handleChange} required />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="categoria">Categoria</Label>
                        <Select value={formData.categoria} onValueChange={(value) => handleSelectChange('categoria', value)} required>
                            <SelectTrigger><SelectValue placeholder="Selecione uma categoria"/></SelectTrigger>
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
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)} required>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ativo">Ativo</SelectItem>
                                <SelectItem value="inativo">Inativo</SelectItem>
                                <SelectItem value="manutencao">Em Manutenção</SelectItem>
                                <SelectItem value="vendido">Vendido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="valor_aquisicao">Valor de Aquisição (R$)</Label>
                        <Input id="valor_aquisicao" type="number" step="0.01" value={formData.valor_aquisicao} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label htmlFor="data_aquisicao">Data de Aquisição</Label>
                        <Input id="data_aquisicao" type="date" value={formData.data_aquisicao} onChange={handleChange} required />
                    </div>
                </div>
                 <div>
                    <Label htmlFor="localizacao_fisica">Localização Física</Label>
                    <Input id="localizacao_fisica" value={formData.localizacao_fisica} onChange={handleChange} />
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