
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added import for Card components
import { PlusCircle, Trash2 } from 'lucide-react';

export default function CompraForm({ compra, fornecedores, pecas, tipo, onSave, onClose }) {
  const [formData, setFormData] = useState({
    fornecedor_id: '',
    data_compra: new Date().toISOString().split('T')[0],
    status: 'pendente',
    valor_total: 0,
    itens: [],
    observacoes: ''
  });

  useEffect(() => {
    if (compra) {
      setFormData(compra);
    }
  }, [compra]);

  const handleMainChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.itens];
    newItems[index][field] = value;
    if (field === 'item_id' && tipo === 'revenda') {
        const peca = pecas.find(p => p.id === value);
        if (peca) {
            newItems[index].descricao = peca.descricao;
            newItems[index].valor_unitario = peca.preco_custo;
        }
    }
    setFormData(prev => ({ ...prev, itens: newItems }));
    updateTotal();
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, { item_id: '', descricao: '', quantidade: 1, valor_unitario: 0 }]
    }));
  };

  const removeItem = (index) => {
    const newItems = formData.itens.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, itens: newItems }));
    updateTotal();
  };
  
  const updateTotal = () => {
    setFormData(prev => {
        const total = prev.itens.reduce((sum, item) => sum + (item.quantidade * item.valor_unitario), 0);
        return { ...prev, valor_total: total };
    });
  };

  useEffect(updateTotal, [formData.itens]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>{compra ? 'Editar' : 'Nova'} Compra de {tipo === 'revenda' ? 'Revenda' : 'Consumo'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Fornecedor</Label>
                    <Select value={formData.fornecedor_id} onValueChange={v => handleSelectChange('fornecedor_id', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div><Label>Data da Compra</Label><Input type="date" id="data_compra" value={formData.data_compra} onChange={handleMainChange}/></div>
            </div>
            
            <Card>
                <CardHeader><CardTitle>Itens da Compra</CardTitle></CardHeader>
                <CardContent>
                    {formData.itens.map((item, index) => (
                        <div key={index} className="flex gap-2 items-center mb-2">
                            {tipo === 'revenda' ? (
                                <Select value={item.item_id} onValueChange={v => handleItemChange(index, 'item_id', v)}>
                                    <SelectTrigger className="w-1/2"><SelectValue placeholder="Selecione a peça"/></SelectTrigger>
                                    <SelectContent>{pecas.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.descricao}</SelectItem>)}</SelectContent>
                                </Select>
                            ) : (
                                <Input className="w-1/2" placeholder="Descrição do item" value={item.descricao} onChange={e => handleItemChange(index, 'descricao', e.target.value)} />
                            )}
                            <Input type="number" placeholder="Qtd" className="w-24" value={item.quantidade} onChange={e => handleItemChange(index, 'quantidade', parseFloat(e.target.value))}/>
                            <Input type="number" placeholder="Valor Un." className="w-32" value={item.valor_unitario} onChange={e => handleItemChange(index, 'valor_unitario', parseFloat(e.target.value))}/>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="text-red-500 h-4 w-4"/></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addItem}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Item</Button>
                </CardContent>
            </Card>

            <div>
                <Label>Observações</Label>
                <Input id="observacoes" value={formData.observacoes} onChange={handleMainChange} />
            </div>

            <div className="text-right font-bold text-xl">
                Total: {formatCurrency(formData.valor_total)}
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Salvar Compra</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }
}
