import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, TrendingUp, AlertCircle } from "lucide-react";
import CategoriaForm from "@/components/Cadastros/CategoriaForm";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

export default function TiposReceita() {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [busca, setBusca] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategorias = async () => {
    setIsLoading(true);
    try {
      // ✅ Buscar APENAS categorias do tipo "receita"
      const data = await base44.entities.Categoria.filter({ tipo: 'receita' });
      setCategorias(Array.isArray(data) ? data.sort((a, b) => b.created_date?.localeCompare(a.created_date)) : []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const handleSave = async (data) => {
    try {
      // ✅ Forçar tipo=receita
      const receitaData = { ...data, tipo: 'receita' };
      
      if (selectedCategoria) {
        await base44.entities.Categoria.update(selectedCategoria.id, receitaData);
        toast({
          title: '✅ Tipo de receita atualizado!',
          description: 'As alterações foram salvas com sucesso.'
        });
      } else {
        await base44.entities.Categoria.create(receitaData);
        toast({
          title: '✅ Tipo de receita criado!',
          description: 'O novo tipo foi cadastrado com sucesso.'
        });
      }
      
      await fetchCategorias();
      setIsFormOpen(false);
      setSelectedCategoria(null);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente excluir este tipo de receita?")) {
      try {
        await base44.entities.Categoria.delete(id);
        toast({
          title: '✅ Tipo de receita excluído!',
          description: 'O registro foi removido com sucesso.'
        });
        await fetchCategorias();
      } catch (error) {
        console.error('Erro ao excluir:', error);
        toast({
          title: 'Erro ao excluir',
          description: error.message,
          variant: 'destructive'
        });
      }
    }
  };

  const openForm = (categoria = null) => {
    setSelectedCategoria(categoria);
    setIsFormOpen(true);
  };

  const categoriasFiltradas = categorias.filter((cat) => {
    const passaBusca =
      busca === "" ||
      cat.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      cat.descricao?.toLowerCase().includes(busca.toLowerCase());
    return passaBusca;
  });

  const categoriasAtivas = categorias.filter((c) => c.ativa).length;
  const categoriasInativas = categorias.filter((c) => !c.ativa).length;

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
        <div className="container mx-auto space-y-6">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 uppercase font-medium mb-1">Total de Tipos</p>
                    <p className="text-3xl font-bold text-slate-900">{categorias.length}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 uppercase font-medium mb-1">Tipos Ativos</p>
                    <p className="text-3xl font-bold text-green-600">{categoriasAtivas}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <AlertCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 uppercase font-medium mb-1">Tipos Inativos</p>
                    <p className="text-3xl font-bold text-slate-400">{categoriasInativas}</p>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-lg">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card Principal */}
          <Card className="bg-white shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-bold">Tipos de Receita</CardTitle>
                <Button onClick={() => openForm()} className="bg-white text-green-600 hover:bg-green-50">
                  <Plus className="mr-2 h-4 w-4" /> Novo Tipo de Receita
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Barra de Busca */}
              <div className="mb-6">
                <Input
                  placeholder="🔍 Buscar por nome ou descrição..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="max-w-md"
                />
              </div>

              {/* Alerta Informativo */}
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Sobre os Tipos de Receita</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Cadastre aqui as categorias de receitas do seu negócio.
                      Exemplos: <strong>Vendas de Produtos</strong>, <strong>Prestação de Serviços</strong>, 
                      <strong>Rendimentos Financeiros</strong>, <strong>Outras Receitas</strong>, etc.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabela */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-slate-800">
                    <TableRow>
                      <TableHead className="text-white">Nome</TableHead>
                      <TableHead className="text-white">Descrição</TableHead>
                      <TableHead className="text-white">Situação</TableHead>
                      <TableHead className="text-white w-[120px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan="4" className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : categoriasFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan="4" className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <TrendingUp className="w-12 h-12 text-slate-300" />
                            <p className="text-slate-500">
                              {busca ? 'Nenhum tipo de receita encontrado.' : 'Nenhum tipo de receita cadastrado.'}
                            </p>
                            {!busca && (
                              <Button onClick={() => openForm()} variant="outline" size="sm" className="mt-2">
                                <Plus className="w-4 h-4 mr-2" />
                                Cadastrar Primeiro Tipo
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      categoriasFiltradas.map((cat) => (
                        <TableRow key={cat.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-900">{cat.nome}</TableCell>
                          <TableCell className="text-slate-600">{cat.descricao || "—"}</TableCell>
                          <TableCell>
                            <Badge className={cat.ativa ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"}>
                              {cat.ativa ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openForm(cat)}
                                className="hover:bg-blue-50"
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-red-50"
                                onClick={() => handleDelete(cat.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
          fixedTipo="receita"
        />
      )}
    </>
  );
}