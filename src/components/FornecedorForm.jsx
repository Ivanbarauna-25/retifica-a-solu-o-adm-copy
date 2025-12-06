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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome / Razão Social</Label>
              <Input id="nome" value={formData.nome} onChange={handleChange} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" value={formData.cnpj} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contato">Telefone de Contato</Label>
                <Input id="contato" value={formData.contato} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea id="endereco" value={formData.endereco} onChange={handleChange} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.categoria} onValueChange={(value) => handleSelectChange('categoria', value)}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                  <SelectTrigger>
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
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}