import React, { useState, useEffect } from "react";
import { Categoria } from "@/entities/Categoria";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, List, Filter, Search } from "lucide-react";
import CategoriaForm from "@/components/Cadastros/CategoriaForm";
import { Label } from "@/components/ui/label";

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const tipoColors = {
    receita: "bg-green-100 text-green-800 border-green-200",
    despesa: "bg-red-100 text-red-800 border-red-200",
    ativo: "bg-blue-100 text-blue-800 border-blue-200",
    passivo: "bg-orange-100 text-orange-800 border-orange-200",
  };

  const tipoLabels = {
    receita: "Receita",
    despesa: "Despesa",
    ativo: "Ativo",
    passivo: "Passivo",
  };

  const fetchCategorias = async () => {
    setIsLoading(true);
    const data = await Categoria.list("-created_date");
    setCategorias(Array.isArray(data) ? data : []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const handleSave = async (data) => {
    if (selectedCategoria) {
      await Categoria.update(selectedCategoria.id, data);
    } else {
      await Categoria.create(data);
    }
    await fetchCategorias();
    setIsFormOpen(false);
    setSelectedCategoria(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente excluir esta categoria?")) {
      await Categoria.delete(id);
      await fetchCategorias();
    }
  };

  const openForm = (categoria = null) => {
    setSelectedCategoria(categoria);
    setIsFormOpen(true);
  };

  const categoriasFiltradas = categorias.filter((cat) => {
    const passaTipo = filtroTipo === "todos" || cat.tipo === filtroTipo;
    const passaBusca =
      busca === "" ||
      cat.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      cat.descricao?.toLowerCase().includes(busca.toLowerCase());
    return passaTipo && passaBusca;
  });

  const categoriasPorTipo = {
    receita: categorias.filter((c) => c.tipo === "receita" && c.ativa).length,
    despesa: categorias.filter((c) => c.tipo === "despesa" && c.ativa).length,
    ativo: categorias.filter((c) => c.tipo === "ativo" && c.ativa).length,
    passivo: categorias.filter((c) => c.tipo === "passivo" && c.ativa).length,
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-slate-800 text-white px-3 md:px-6 py-4 md:py-6 mb-3 md:mb-6 shadow-lg sticky top-0 z-10">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 md:p-3 rounded-lg">
                  <List className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl lg:text-3xl font-bold">Categorias</h1>
                  <p className="text-slate-300 text-xs md:text-sm">Classificação financeira e contábil</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 h-8 md:h-9 text-xs md:text-sm px-3 md:px-4"
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openForm()}
                  className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 h-8 md:h-9 text-xs md:text-sm px-3 md:px-4"
                >
                  <Plus className="w-4 h-4" />
                  Nova Categoria
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-2 md:px-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-3 md:mb-6">
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-5">
                <div>
                  <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-1">Receita</p>
                  <div className="text-xl md:text-3xl font-bold text-green-600">{categoriasPorTipo.receita}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-5">
                <div>
                  <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-1">Despesa</p>
                  <div className="text-xl md:text-3xl font-bold text-red-600">{categoriasPorTipo.despesa}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-5">
                <div>
                  <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-1">Ativo</p>
                  <div className="text-xl md:text-3xl font-bold text-blue-600">{categoriasPorTipo.ativo}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-5">
                <div>
                  <p className="text-[10px] md:text-sm font-medium text-slate-600 mb-1">Passivo</p>
                  <div className="text-xl md:text-3xl font-bold text-orange-600">{categoriasPorTipo.passivo}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          {showFilters && (
            <Card className="mb-3 md:mb-4 border-slate-200 shadow-sm">
              <CardContent className="p-3 md:p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1 block">Busca Geral</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</Label>
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="passivo">Passivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Barra de Busca (se filtros ocultos) */}
          {!showFilters && (
            <div className="bg-white rounded-lg shadow-sm p-2 md:p-4 mb-3 md:mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
                <Input
                  placeholder="Buscar por nome ou descrição..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 md:pl-10 border-slate-200 h-9 md:h-10"
                />
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-700 hover:bg-slate-700">
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Nome</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Tipo</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden md:table-cell">Descrição</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm hidden sm:table-cell">Situação</TableHead>
                    <TableHead className="text-white font-semibold text-center w-[80px] md:w-[120px] text-xs md:text-sm">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan="5" className="text-center py-8 text-gray-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : categoriasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="5" className="text-center py-8 text-gray-500">
                        Nenhuma categoria encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categoriasFiltradas.map((cat) => (
                      <TableRow key={cat.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900 text-xs md:text-sm max-w-[100px] md:max-w-none truncate">{cat.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${tipoColors[cat.tipo]} font-normal border text-[10px] md:text-xs`}>
                            {tipoLabels[cat.tipo]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs md:text-sm hidden md:table-cell max-w-[200px] truncate">{cat.descricao || "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className={`text-[10px] md:text-xs ${cat.ativa ? "bg-slate-100 text-slate-800 border-slate-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {cat.ativa ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openForm(cat)} title="Editar" className="h-8 w-8 md:h-9 md:w-9 hover:bg-amber-50 text-amber-600">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir"
                              className="h-8 w-8 md:h-9 md:w-9 text-red-600 hover:text-red-700 hover:bg-red-50 hidden md:flex"
                              onClick={() => handleDelete(cat.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <CategoriaForm
          categoria={selectedCategoria}
          onSave={handleSave}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedCategoria(null);
          }}
        />
      )}
    </>
  );
}