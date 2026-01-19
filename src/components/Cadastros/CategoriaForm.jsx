import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function CategoriaForm({ categoria, onSave, onClose, fixedTipo }) {
  const [formData, setFormData] = useState({
    nome: "",
    tipo: fixedTipo || "receita",
    descricao: "",
    ativa: true,
  });

  useEffect(() => {
    if (categoria) {
      setFormData({
        nome: categoria.nome || "",
        tipo: fixedTipo || categoria.tipo || "receita",
        descricao: categoria.descricao || "",
        ativa: categoria.ativa !== undefined ? categoria.ativa : true,
      });
    } else {
      setFormData({
        nome: "",
        tipo: fixedTipo || "receita",
        descricao: "",
        ativa: true,
      });
    }
  }, [categoria, fixedTipo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] md:max-w-lg p-0 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="sticky top-0 z-10 px-3 md:px-6 py-3 md:py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700 flex-shrink-0">
          <DialogTitle className="text-sm md:text-lg text-white">
            {categoria ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div>
              <Label htmlFor="nome" className="text-neutral-900 font-medium text-xs md:text-sm">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                placeholder="Nome da categoria"
                className="bg-white text-neutral-900 h-9 md:h-10 mt-1"
              />
            </div>

            {!fixedTipo && (
              <div>
                <Label htmlFor="tipo" className="text-neutral-900 font-medium text-xs md:text-sm">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger id="tipo" className="bg-white text-neutral-900 h-9 md:h-10 mt-1">
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
            )}

            {fixedTipo && (
              <div className="p-2 md:p-3 bg-slate-100 rounded-md border border-slate-300">
                <p className="text-xs md:text-sm text-neutral-900">
                  <strong>Tipo:</strong> {
                    fixedTipo === 'receita' ? 'Receita' :
                    fixedTipo === 'despesa' ? 'Despesa' :
                    fixedTipo === 'ativo' ? 'Ativo' : 'Passivo'
                  }
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="descricao" className="text-neutral-900 font-medium text-xs md:text-sm">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
                placeholder="Descrição opcional"
                className="bg-white text-neutral-900 mt-1"
              />
            </div>

            <div className="flex items-center justify-between p-2 md:p-3 bg-slate-50 rounded-lg border">
              <Label htmlFor="ativa" className="text-neutral-900 font-medium text-xs md:text-sm">
                Categoria Ativa
              </Label>
              <Switch
                id="ativa"
                checked={formData.ativa}
                onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
              />
            </div>
          </div>
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 md:px-6 py-3 md:py-4 flex justify-end gap-2 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4">
              Cancelar
            </Button>
            <Button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white h-8 md:h-9 text-xs md:text-sm px-3 md:px-4">
              {categoria ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}