import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck } from 'lucide-react';

export default function FornecedorForm({ fornecedor, onSave, onClose }) {
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    contato: '',
    email: '',
    endereco: '',
    categoria: 'pecas',
    status: 'ativo',
  });

  useEffect(() => {
    if (fornecedor) {
      setFormData({
        nome: fornecedor.nome || '',
        cnpj: fornecedor.cnpj || '',
        contato: fornecedor.contato || '',
        email: fornecedor.email || '',
        endereco: fornecedor.endereco || '',
        categoria: fornecedor.categoria || 'pecas',
        status: fornecedor.status || 'ativo',
      });
    }
  }, [fornecedor]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] md:max-w-2xl p-0 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="sticky top-0 z-10 px-3 md:px-6 py-3 md:py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700 flex-shrink-0">
          <DialogTitle className="text-sm md:text-lg text-white flex items-center gap-2">
            <Truck className="w-4 h-4 md:w-5 md:h-5" />
            {fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="grid gap-3 md:gap-4 p-3 md:p-6">
            <div>
              <Label htmlFor="nome" className="text-xs md:text-sm">Nome / Razão Social</Label>
              <Input id="nome" value={formData.nome} onChange={handleChange} required className="h-9 md:h-10 mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div>
                <Label htmlFor="cnpj" className="text-xs md:text-sm">CNPJ</Label>
                <Input id="cnpj" value={formData.cnpj} onChange={handleChange} className="h-9 md:h-10 mt-1" />
              </div>
              <div>
                <Label htmlFor="contato" className="text-xs md:text-sm">Telefone</Label>
                <Input id="contato" value={formData.contato} onChange={handleChange} required className="h-9 md:h-10 mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="text-xs md:text-sm">E-mail</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} className="h-9 md:h-10 mt-1" />
            </div>
            <div>
              <Label htmlFor="endereco" className="text-xs md:text-sm">Endereço</Label>
              <Textarea id="endereco" value={formData.endereco} onChange={handleChange} rows={3} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div>
                <Label className="text-xs md:text-sm">Categoria</Label>
                <Select value={formData.categoria} onValueChange={(value) => handleSelectChange('categoria', value)}>
                  <SelectTrigger className="h-9 md:h-10 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pecas">Peças</SelectItem>
                    <SelectItem value="ferramentas">Ferramentas</SelectItem>
                    <SelectItem value="servicos">Serviços</SelectItem>
                    <SelectItem value="materiais">Materiais</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs md:text-sm">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                  <SelectTrigger className="h-9 md:h-10 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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