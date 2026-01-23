import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Clock, Plus, Edit, Trash2, Search, Loader2 } from "lucide-react";
import EscalaForm from "@/components/ponto/EscalaForm";

function minToHHmm(min) {
  if (!min) return "00:00";
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function EscalasTrabalhoPage() {
  const [escalas, setEscalas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [escalaEditando, setEscalaEditando] = useState(null);

  const { toast } = useToast();

  const carregarEscalas = async () => {
    setIsLoading(true);
    try {
      const lista = await base44.entities.EscalaTrabalho.list("-created_date");
      setEscalas(lista || []);
    } catch (error) {
      console.error("Erro ao carregar escalas:", error);
      toast({ title: "Erro", description: "Não foi possível carregar as escalas.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarEscalas();
  }, []);

  const escalasFiltradas = escalas.filter(e => {
    const passaBusca = !busca || (e.nome || "").toLowerCase().includes(busca.toLowerCase());
    const passaAtivo = filtroAtivo === "todos" || 
      (filtroAtivo === "ativo" && e.ativo !== false) || 
      (filtroAtivo === "inativo" && e.ativo === false);
    return passaBusca && passaAtivo;
  });

  const handleSalvar = async (dados) => {
    try {
      // Se marcou como padrão, desmarcar outras
      if (dados.escala_padrao) {
        const todasEscalas = await base44.entities.EscalaTrabalho.list();
        for (const escala of todasEscalas) {
          if (escala.escala_padrao && escala.id !== escalaEditando?.id) {
            await base44.entities.EscalaTrabalho.update(escala.id, { escala_padrao: false });
          }
        }
      }
      
      if (escalaEditando) {
        await base44.entities.EscalaTrabalho.update(escalaEditando.id, dados);
        toast({ title: "Sucesso", description: "Escala atualizada com sucesso." });
      } else {
        await base44.entities.EscalaTrabalho.create(dados);
        toast({ title: "Sucesso", description: "Escala criada com sucesso." });
      }
      setIsModalOpen(false);
      setEscalaEditando(null);
      await carregarEscalas();
    } catch (error) {
      throw error;
    }
  };

  const handleExcluir = async (escala) => {
    if (!window.confirm(`Deseja excluir a escala "${escala.nome}"?`)) return;

    try {
      await base44.entities.EscalaTrabalho.delete(escala.id);
      toast({ title: "Sucesso", description: "Escala excluída com sucesso." });
      await carregarEscalas();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({ title: "Erro", description: "Não foi possível excluir a escala.", variant: "destructive" });
    }
  };

  const openEditar = (escala) => {
    setEscalaEditando(escala);
    setIsModalOpen(true);
  };

  const openNova = () => {
    setEscalaEditando(null);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <div className="bg-slate-800 text-white px-2 md:px-6 py-3 md:py-5 mb-3 md:mb-4 shadow-lg rounded-lg md:rounded-xl mx-1 md:mx-0">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-slate-700 p-1.5 md:p-2 rounded-lg">
                  <Clock className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div>
                  <h1 className="text-sm md:text-xl font-bold">Escalas de Trabalho</h1>
                  <p className="text-slate-400 text-[9px] md:text-xs">Gestão de horários e jornadas</p>
                </div>
              </div>
              <Button onClick={openNova} className="gap-2 bg-white text-slate-800 hover:bg-slate-100 text-xs md:text-sm h-8 md:h-10">
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Nova Escala
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-1 md:px-4">
          <Card>
            <CardContent className="p-3 md:p-6">
              {/* Filtros */}
              <div className="bg-slate-50 rounded-lg p-3 mb-4 border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Buscar por Nome</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                      <Input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Digite o nome da escala..."
                        className="pl-9 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Status</Label>
                    <Select value={filtroAtivo} onValueChange={setFiltroAtivo}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas</SelectItem>
                        <SelectItem value="ativo">Ativas</SelectItem>
                        <SelectItem value="inativo">Inativas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Tabela Desktop */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-800">
                    <TableRow>
                      <TableHead className="text-white text-sm">Nome</TableHead>
                      <TableHead className="text-white text-sm">Tipo</TableHead>
                      <TableHead className="text-white text-sm">Horário</TableHead>
                      <TableHead className="text-white text-sm text-center">Carga Diária</TableHead>
                      <TableHead className="text-white text-sm text-center">Status</TableHead>
                      <TableHead className="text-white text-sm text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : escalasFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                          Nenhuma escala encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      escalasFiltradas.map(escala => (
                        <TableRow key={escala.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-sm">{escala.nome}</TableCell>
                          <TableCell className="text-sm capitalize">{escala.tipo}</TableCell>
                          <TableCell className="text-sm font-mono">
                            {escala.hora_entrada_prevista} - {escala.hora_saida_prevista}
                          </TableCell>
                          <TableCell className="text-sm text-center">{minToHHmm(escala.carga_diaria_minutos)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col gap-1 items-center">
                              <Badge className={escala.ativo !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                {escala.ativo !== false ? "Ativa" : "Inativa"}
                              </Badge>
                              {escala.escala_padrao &&
                                <Badge className="bg-blue-100 text-blue-800">
                                  Padrão
                                </Badge>
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              <Button variant="ghost" size="sm" onClick={() => openEditar(escala)} className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleExcluir(escala)} className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600">
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

              {/* Cards Mobile */}
              <div className="md:hidden space-y-3">
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                  </div>
                ) : escalasFiltradas.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8">Nenhuma escala encontrada.</p>
                ) : (
                  escalasFiltradas.map(escala => (
                    <Card key={escala.id} className="border-slate-200">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm text-slate-900">{escala.nome}</h3>
                            <p className="text-xs text-slate-500 capitalize">{escala.tipo}</p>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <Badge className={escala.ativo !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {escala.ativo !== false ? "Ativa" : "Inativa"}
                            </Badge>
                            {escala.escala_padrao &&
                              <Badge className="bg-blue-100 text-blue-800 text-[9px]">
                                Padrão
                              </Badge>
                            }
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600 mb-3">
                          <div>⏰ {escala.hora_entrada_prevista} - {escala.hora_saida_prevista}</div>
                          <div>📊 Carga: {minToHHmm(escala.carga_diaria_minutos)}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditar(escala)} className="flex-1 gap-2 text-xs">
                            <Edit className="w-3.5 h-3.5" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleExcluir(escala)} className="gap-2 text-xs text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <div className="mt-3 text-xs text-slate-500">
                <strong>{escalasFiltradas.length}</strong> escala(s) encontrada(s)
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Formulário */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) { setIsModalOpen(false); setEscalaEditando(null); } }}>
        <DialogContent className="max-w-2xl w-[96vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {escalaEditando ? "Editar Escala" : "Nova Escala"}
            </DialogTitle>
          </DialogHeader>
          <EscalaForm
            escala={escalaEditando}
            onSave={handleSalvar}
            onCancel={() => { setIsModalOpen(false); setEscalaEditando(null); }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}