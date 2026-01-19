import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2, Tags } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

export default function TiposDespesaPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    categoria_id: "",
    plano_contas_id: "",
    ativo: true
  });
  
  // Criar um mapa de ID -> Nome para lookup rápido
  const [categoriaNomeMap, setCategoriaNomeMap] = useState({});
  const [planoContasNomeMap, setPlanoContasNomeMap] = useState({});

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ["tiposDespesa"],
    queryFn: () => base44.entities.TipoDespesa.list("-created_date")
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: () => base44.entities.Categoria.list()
  });

  const { data: planosContas = [] } = useQuery({
    queryKey: ["planosContas"],
    queryFn: () => base44.entities.PlanoContas.filter({ tipo: "despesa" })
  });
  
  // Atualizar mapa quando categorias ou planos mudam
  React.useEffect(() => {
    const catMap = {};
    categorias.forEach(cat => {
      catMap[cat.id] = cat.nome;
    });
    setCategoriaNomeMap(catMap);
  }, [categorias]);
  
  React.useEffect(() => {
    const planoMap = {};
    planosContas.forEach(plano => {
      planoMap[plano.id] = plano.nome;
    });
    setPlanoContasNomeMap(planoMap);
  }, [planosContas]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingItem) {
        return base44.entities.TipoDespesa.update(editingItem.id, data);
      }
      return base44.entities.TipoDespesa.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiposDespesa"] });
      toast({ title: `✅ Tipo de despesa ${editingItem ? "atualizado" : "criado"} com sucesso!` });
      handleCloseForm();
    },
    onError: (error) => {
      toast({
        title: "❌ Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TipoDespesa.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiposDespesa"] });
      toast({ title: "✅ Tipo de despesa excluído com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "❌ Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleNew = () => {
    setEditingItem(null);
    setFormData({
      nome: "",
      descricao: "",
      categoria_id: "",
      plano_contas_id: "",
      ativo: true
    });
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome || "",
      descricao: item.descricao || "",
      categoria_id: item.categoria_id || "",
      plano_contas_id: item.plano_contas_id || "",
      ativo: item.ativo !== false
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (!formData.nome?.trim()) {
      toast({
        title: "⚠️ Campo obrigatório",
        description: "O nome do tipo de despesa é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Tem certeza que deseja excluir "${item.nome}"?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-slate-800 text-white px-3 md:px-6 py-4 md:py-6 mb-3 md:mb-6 shadow-lg sticky top-0 z-10">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 md:p-3 rounded-lg">
                  <Tags className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl lg:text-3xl font-bold">Tipos de Despesas</h1>
                  <p className="text-slate-300 text-xs md:text-sm">Categorização de despesas</p>
                </div>
              </div>

              <Button
                onClick={handleNew}
                variant="outline"
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 h-8 md:h-9 text-xs md:text-sm px-3 md:px-4"
              >
                <Plus className="w-4 h-4" />
                Novo Tipo
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1800px] mx-auto px-2 md:px-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                <span className="ml-2 text-slate-600">Carregando...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800 hover:bg-slate-800">
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Nome</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden md:table-cell">Descrição</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden lg:table-cell">Categoria</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden xl:table-cell">Plano</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center text-xs md:text-sm">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tipos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Tags className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-600">Nenhum tipo de despesa cadastrado</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    tipos.map((tipo) => {
                      const categoria = categorias.find(c => c.id === tipo.categoria_id);
                      const plano = planosContas.find(p => p.id === tipo.plano_contas_id);
                      
                      return (
                        <TableRow key={tipo.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-black text-xs md:text-sm max-w-[120px] md:max-w-none truncate">{tipo.nome}</TableCell>
                          <TableCell className="text-black text-xs md:text-sm hidden md:table-cell max-w-[200px] truncate">{tipo.descricao || "—"}</TableCell>
                          <TableCell className="text-black text-xs md:text-sm hidden lg:table-cell">{categoria?.nome || "—"}</TableCell>
                          <TableCell className="text-black text-xs md:text-sm hidden xl:table-cell max-w-[150px] truncate">{plano?.nome || "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className={`px-2 py-1 rounded text-[10px] md:text-xs font-semibold ${
                              tipo.ativo !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}>
                              {tipo.ativo !== false ? "Ativo" : "Inativo"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(tipo)}
                                title="Editar"
                                className="h-8 w-8 md:h-9 md:w-9 hover:bg-amber-50 text-amber-600">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(tipo)}
                                title="Excluir"
                                className="h-8 w-8 md:h-9 md:w-9 text-red-600 hover:bg-red-50 hidden md:flex">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-[600px] modern-modal bg-white">
          <DialogHeader className="modern-modal-header">
            <DialogTitle className="text-white">
              {editingItem ? "Editar Tipo de Despesa" : "Novo Tipo de Despesa"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div>
              <Label className="text-black font-semibold">Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Comissão, Frete, Impostos"
                className="mt-1 bg-white text-black"
              />
            </div>

            <div>
              <Label className="text-black font-semibold">Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional"
                className="mt-1 bg-white text-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-black font-semibold">Categoria</Label>
                <Select
                  value={formData.categoria_id || "_empty"}
                  onValueChange={(value) => setFormData({ ...formData, categoria_id: value === "_empty" ? "" : value })}>
                  <SelectTrigger className="mt-1 bg-white text-black">
                    <SelectValue placeholder="Selecione">
                      {formData.categoria_id && categoriaNomeMap[formData.categoria_id] 
                        ? categoriaNomeMap[formData.categoria_id]
                        : "Selecione"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_empty">Nenhuma</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-black font-semibold">Plano de Contas</Label>
                <Select
                  value={formData.plano_contas_id || "_empty"}
                  onValueChange={(value) => setFormData({ ...formData, plano_contas_id: value === "_empty" ? "" : value })}>
                  <SelectTrigger className="mt-1 bg-white text-black">
                    <SelectValue placeholder="Selecione">
                      {formData.plano_contas_id && planoContasNomeMap[formData.plano_contas_id]
                        ? planoContasNomeMap[formData.plano_contas_id]
                        : "Selecione"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_empty">Nenhum</SelectItem>
                    {planosContas.map((plano) => (
                      <SelectItem key={plano.id} value={plano.id}>
                        {plano.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="ativo" className="text-black font-semibold cursor-pointer">
                Tipo de despesa ativo
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button
              variant="outline"
              onClick={handleCloseForm}
              className="bg-white text-black border-slate-300">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-slate-800 hover:bg-slate-700 text-white">
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}