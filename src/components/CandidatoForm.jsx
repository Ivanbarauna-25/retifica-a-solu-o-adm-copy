import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CandidatoForm({ isOpen, candidato, cargos = [], onSave, onClose }) {
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    data_nascimento: "",
    endereco: "",
    cargo_id: "",
    salario_pretendido: "",
    periodo_experiencia: 90,
    anotacoes: "",
  });

  useEffect(() => {
    if (candidato) {
      setFormData({
        nome: candidato.nome || "",
        cpf: candidato.cpf || "",
        email: candidato.email || "",
        telefone: candidato.telefone || "",
        data_nascimento: candidato.data_nascimento || "",
        endereco: candidato.endereco || "",
        cargo_id: candidato.cargo_id || "",
        salario_pretendido: candidato.salario_pretendido ?? "",
        periodo_experiencia: candidato.periodo_experiencia ?? 90,
        anotacoes: candidato.anotacoes || "",
      });
    } else {
      setFormData({
        nome: "",
        cpf: "",
        email: "",
        telefone: "",
        data_nascimento: "",
        endereco: "",
        cargo_id: "",
        salario_pretendido: "",
        periodo_experiencia: 90,
        anotacoes: "",
      });
    }
  }, [candidato]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Campos obrigatórios da entidade: nome, cpf, cargo_id
    if (!formData.nome || !formData.cpf || !formData.cargo_id) {
      alert("Preencha Nome, CPF e Cargo.");
      return;
    }
    onSave?.(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>{candidato ? "Editar Contratação" : "Nova Contratação"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" value={formData.cpf} onChange={(e) => handleChange("cpf", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={formData.telefone} onChange={(e) => handleChange("telefone", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => handleChange("data_nascimento", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cargo_id">Cargo Pretendido</Label>
              <Select value={String(formData.cargo_id || "")} onValueChange={(v) => handleChange("cargo_id", v)} required>
                <SelectTrigger id="cargo_id">
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  {cargos.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" value={formData.endereco} onChange={(e) => handleChange("endereco", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="salario_pretendido">Salário Pretendido (R$)</Label>
              <Input
                id="salario_pretendido"
                type="number"
                step="0.01"
                value={formData.salario_pretendido}
                onChange={(e) => handleChange("salario_pretendido", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="periodo_experiencia">Período de Experiência (dias)</Label>
              <Input
                id="periodo_experiencia"
                type="number"
                value={formData.periodo_experiencia}
                onChange={(e) => handleChange("periodo_experiencia", Number(e.target.value))}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="anotacoes">Anotações</Label>
              <Textarea
                id="anotacoes"
                rows={4}
                value={formData.anotacoes}
                onChange={(e) => handleChange("anotacoes", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between mt-2">
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