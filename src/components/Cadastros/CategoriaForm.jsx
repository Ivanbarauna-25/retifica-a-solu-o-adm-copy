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
      <DialogContent className="max-w-lg modern-modal">
        <DialogHeader className="modern-modal-header">
          <DialogTitle className="text-white">
            {categoria ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <Label htmlFor="nome" className="text-neutral-900 font-medium">
              Nome *
            </Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
              placeholder="Digite o nome da categoria"
              className="bg-white text-neutral-900 placeholder:text-neutral-500"
            />
          </div>

          {!fixedTipo && (
            <div>
              <Label htmlFor="tipo" className="text-neutral-900 font-medium">
                Tipo *
              </Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger id="tipo" className="bg-white text-neutral-900">
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
            <div className="p-3 bg-slate-100 rounded-md border border-slate-300">
              <p className="text-sm text-neutral-900">
                <strong>Tipo:</strong> {
                  fixedTipo === 'receita' ? 'Receita' :
                  fixedTipo === 'despesa' ? 'Despesa' :
                  fixedTipo === 'ativo' ? 'Ativo' : 'Passivo'
                }
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                Este tipo não pode ser alterado nesta tela
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="descricao" className="text-neutral-900 font-medium">
              Descrição
            </Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
              placeholder="Descrição opcional"
              className="bg-white text-neutral-900 placeholder:text-neutral-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
            <Label htmlFor="ativa" className="text-neutral-900 font-medium">
              Categoria Ativa
            </Label>
            <Switch
              id="ativa"
              checked={formData.ativa}
              onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="text-neutral-900">
              Cancelar
            </Button>
            <Button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white">
              {categoria ? "Salvar Alterações" : "Criar Categoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}