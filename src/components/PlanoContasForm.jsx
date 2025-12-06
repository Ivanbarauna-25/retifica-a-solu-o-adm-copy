import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose } from
'@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { base44 } from '@/api/base44Client';

export default function PlanoContasForm({ conta, onSave, onClose }) {
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    tipo: 'receita',
    categoria_id: '',
    ativa: true
  });
  const [categorias, setCategorias] = useState([]);
  const [categoriaNomeMap, setCategoriaNomeMap] = useState({});

  useEffect(() => {
    if (conta) {
      setFormData({
        codigo: conta.codigo || '',
        nome: conta.nome || '',
        tipo: conta.tipo || 'receita',
        categoria_id: conta.categoria_id || '',
        ativa: conta.ativa !== undefined ? conta.ativa : true
      });
    }
  }, [conta]);

  // Carregar categorias ativas filtradas pelo tipo selecionado
  useEffect(() => {
    async function carregarCategorias() {
      try {
        const todas = await base44.entities.Categoria.list();
        const filtradas = (Array.isArray(todas) ? todas : []).filter(
          (c) => c.ativa && c.tipo === (formData?.tipo || "receita")
        );
        setCategorias(filtradas);
        
        // Criar mapa de ID -> Nome
        const catMap = {};
        filtradas.forEach(cat => {
          catMap[cat.id] = cat.nome;
        });
        setCategoriaNomeMap(catMap);
        
        // Se a categoria atual não for compatível, limpar seleção
        if (formData.categoria_id && !filtradas.some((c) => c.id === formData.categoria_id)) {
          setFormData((prev) => ({ ...prev, categoria_id: "" }));
        }
        // Se não houver categoria selecionada e houver categorias filtradas, selecionar a primeira
        if (!formData.categoria_id && filtradas.length > 0) {
          setFormData((prev) => ({ ...prev, categoria_id: filtradas[0].id }));
        }
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
        setCategorias([]);
      }
    }
    carregarCategorias();
  }, [formData.tipo, formData.categoria_id]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData((prev) => ({ ...prev, ativa: checked }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="bg-slate-800 text-white px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-white text-xl font-semibold">
            {conta ? 'Editar Conta' : 'Nova Conta'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 bg-white grid gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo" className="text-slate-950 font-semibold">Código</Label>
                <Input id="codigo" value={formData.codigo} onChange={handleChange} required className="bg-white text-slate-950" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-950 font-semibold">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(value) => handleSelectChange('tipo', value)}>
                  <SelectTrigger className="bg-white text-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="passivo">Passivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-slate-950 font-semibold">Nome da Conta</Label>
              <Input id="nome" value={formData.nome} onChange={handleChange} required className="bg-white text-slate-950" />
            </div>
            {/* Campo Categoria com opções dinâmicas */}
            <div className="space-y-2">
              <Label className="text-slate-950 font-semibold">Categoria</Label>
              <Select
                value={formData.categoria_id || "_empty"}
                onValueChange={(value) => handleSelectChange('categoria_id', value === "_empty" ? "" : value)}>
                <SelectTrigger className="bg-white text-slate-950">
                  <SelectValue placeholder="Selecione uma categoria">
                    {formData.categoria_id && categoriaNomeMap[formData.categoria_id] 
                      ? categoriaNomeMap[formData.categoria_id]
                      : "Selecione uma categoria"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">Nenhuma</SelectItem>
                  {categorias.map((cat) =>
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ativa"
                checked={formData.ativa}
                onCheckedChange={handleSwitchChange} />
              <Label htmlFor="ativa" className="text-slate-950 font-semibold">Conta Ativa</Label>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 rounded-b-lg">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-slate-300">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);

}