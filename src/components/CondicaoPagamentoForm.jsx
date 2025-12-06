import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function CondicaoPagamentoForm({ condicao, onSave, onClose }) {
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'a_vista',
    num_parcelas: 1,
    intervalo_dias: 30,
    desconto_percentual: 0,
    juros_percentual: 0,
    entrada_minima: 0,
    ativa: true
  });

  useEffect(() => {
    if (condicao) {
      setFormData({
        nome: condicao.nome || '',
        tipo: condicao.tipo || 'a_vista',
        num_parcelas: condicao.num_parcelas || 1,
        intervalo_dias: condicao.intervalo_dias || 30,
        desconto_percentual: condicao.desconto_percentual || 0,
        juros_percentual: condicao.juros_percentual || 0,
        entrada_minima: condicao.entrada_minima || 0,
        ativa: condicao.ativa !== undefined ? condicao.ativa : true
      });
    } else {
      setFormData({
        nome: '',
        tipo: 'a_vista',
        num_parcelas: 1,
        intervalo_dias: 30,
        desconto_percentual: 0,
        juros_percentual: 0,
        entrada_minima: 0,
        ativa: true
      });
    }
  }, [condicao]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{condicao ? 'Editar Condição' : 'Nova Condição de Pagamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome da Condição</Label>
            <Input 
              id="nome" 
              value={formData.nome} 
              onChange={handleChange} 
              required 
              placeholder="Ex: À Vista, 30 dias, 2x sem juros"
            />
          </div>
          
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={formData.tipo} onValueChange={(value) => handleSelectChange('tipo', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a_vista">À Vista</SelectItem>
                <SelectItem value="parcelado">Parcelado</SelectItem>
                <SelectItem value="prazo">A Prazo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo === 'parcelado' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="num_parcelas">Número de Parcelas</Label>
                <Input 
                  id="num_parcelas" 
                  type="number" 
                  min="1" 
                  value={formData.num_parcelas} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <Label htmlFor="intervalo_dias">Intervalo (dias)</Label>
                <Input 
                  id="intervalo_dias" 
                  type="number" 
                  min="1" 
                  value={formData.intervalo_dias} 
                  onChange={handleChange} 
                />
              </div>
            </div>
          )}

          {formData.tipo === 'prazo' && (
            <div>
              <Label htmlFor="intervalo_dias">Prazo (dias)</Label>
              <Input 
                id="intervalo_dias" 
                type="number" 
                min="1" 
                value={formData.intervalo_dias} 
                onChange={handleChange} 
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="desconto_percentual">Desconto (%)</Label>
              <Input 
                id="desconto_percentual" 
                type="number" 
                step="0.01" 
                min="0" 
                value={formData.desconto_percentual} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <Label htmlFor="juros_percentual">Juros (%)</Label>
              <Input 
                id="juros_percentual" 
                type="number" 
                step="0.01" 
                min="0" 
                value={formData.juros_percentual} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div>
            <Label htmlFor="entrada_minima">Entrada Mínima (R$)</Label>
            <Input 
              id="entrada_minima" 
              type="number" 
              step="0.01" 
              min="0" 
              value={formData.entrada_minima} 
              onChange={handleChange} 
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ativa"
              checked={formData.ativa}
              onChange={handleChange}
            />
            <Label htmlFor="ativa">Condição Ativa</Label>
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