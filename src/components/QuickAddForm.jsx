import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Componente genérico para cadastros rápidos
export default function QuickAddForm({ isOpen, onClose, onSave, title, fields }) {
  const [formData, setFormData] = useState({});

  const handleChange = (e) => {
    const { id, value, type } = e.target;
    setFormData(prev => ({ ...prev, [id]: type === 'number' ? parseFloat(value) : value }));
  };

  const handleSave = async () => {
    await onSave(formData);
    setFormData({}); // Limpa o form após salvar
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {fields.map(field => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                type={field.type || 'text'}
                placeholder={field.placeholder}
                onChange={handleChange}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}