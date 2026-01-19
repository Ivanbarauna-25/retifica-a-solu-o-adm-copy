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
      <DialogContent className="w-[95vw] md:max-w-2xl p-0 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="sticky top-0 z-10 px-3 md:px-6 py-3 md:py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700 flex-shrink-0">
          <DialogTitle className="text-sm md:text-lg text-white">{condicao ? 'Editar Condição' : 'Nova Condição de Pagamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div>
              <Label htmlFor="nome" className="text-xs md:text-sm">Nome da Condição</Label>
              <Input 
                id="nome" 
                value={formData.nome} 
                onChange={handleChange} 
                required 
                placeholder="Ex: À Vista, 30 dias..."
                className="h-9 md:h-10 mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="tipo" className="text-xs md:text-sm">Tipo</Label>
              <Select value={formData.tipo} onValueChange={(value) => handleSelectChange('tipo', value)}>
                <SelectTrigger className="h-9 md:h-10 mt-1">
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
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <div>
                  <Label htmlFor="num_parcelas" className="text-xs md:text-sm">Nº Parcelas</Label>
                  <Input 
                    id="num_parcelas" 
                    type="number" 
                    min="1" 
                    value={formData.num_parcelas} 
                    onChange={handleChange}
                    className="h-9 md:h-10 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="intervalo_dias" className="text-xs md:text-sm">Intervalo (dias)</Label>
                  <Input 
                    id="intervalo_dias" 
                    type="number" 
                    min="1" 
                    value={formData.intervalo_dias} 
                    onChange={handleChange}
                    className="h-9 md:h-10 mt-1"
                  />
                </div>
              </div>
            )}

            {formData.tipo === 'prazo' && (
              <div>
                <Label htmlFor="intervalo_dias" className="text-xs md:text-sm">Prazo (dias)</Label>
                <Input 
                  id="intervalo_dias" 
                  type="number" 
                  min="1" 
                  value={formData.intervalo_dias} 
                  onChange={handleChange}
                  className="h-9 md:h-10 mt-1"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div>
                <Label htmlFor="desconto_percentual" className="text-xs md:text-sm">Desconto %</Label>
                <Input 
                  id="desconto_percentual" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={formData.desconto_percentual} 
                  onChange={handleChange}
                  className="h-9 md:h-10 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="juros_percentual" className="text-xs md:text-sm">Juros %</Label>
                <Input 
                  id="juros_percentual" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={formData.juros_percentual} 
                  onChange={handleChange}
                  className="h-9 md:h-10 mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="entrada_minima" className="text-xs md:text-sm">Entrada Mínima R$</Label>
              <Input 
                id="entrada_minima" 
                type="number" 
                step="0.01" 
                min="0" 
                value={formData.entrada_minima} 
                onChange={handleChange}
                className="h-9 md:h-10 mt-1"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="ativa"
                checked={formData.ativa}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <Label htmlFor="ativa" className="text-xs md:text-sm">Condição Ativa</Label>
            </div>
          </div>
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 md:px-6 py-3 md:py-4 flex justify-end gap-2 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4">
              Cancelar
            </Button>
            <Button type="submit" className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}