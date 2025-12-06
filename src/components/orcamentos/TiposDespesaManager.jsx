import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Settings2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function TiposDespesaManager({ isOpen, onClose }) {
  const { toast } = useToast();
  const [tipos, setTipos] = useState([]);
  const [novoTipo, setNovoTipo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTipos();
    }
  }, [isOpen]);

  const loadTipos = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.TipoDespesaOrcamento.list();
      setTipos((data || []).filter(t => t.ativo !== false));
    } catch (error) {
      console.error("Erro ao carregar tipos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTipo = async () => {
    if (!novoTipo.trim()) {
      toast({
        title: "⚠️ Nome obrigatório",
        description: "Digite o nome do tipo de despesa.",
        variant: "destructive"
      });
      return;
    }

    try {
      await base44.entities.TipoDespesaOrcamento.create({
        nome: novoTipo.trim(),
        ativo: true
      });
      toast({ title: "✅ Tipo adicionado com sucesso!" });
      setNovoTipo("");
      await loadTipos();
    } catch (error) {
      console.error("Erro ao adicionar tipo:", error);
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const removeTipo = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este tipo?")) return;

    try {
      await base44.entities.TipoDespesaOrcamento.delete(id);
      toast({ title: "✅ Tipo removido com sucesso!" });
      await loadTipos();
    } catch (error) {
      console.error("Erro ao remover tipo:", error);
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] w-full max-h-[90vh] overflow-hidden modern-modal p-0">
        {/* HEADER ESCURO */}
        <div style={{
          background: '#121826',
          color: '#ffffff',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Settings2 className="w-5 h-5" />
            <span style={{ fontSize: '18px', fontWeight: '700' }}>
              Gerenciar Tipos de Despesa
            </span>
          </div>
        </div>

        {/* CONTEÚDO COM SCROLL */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 140px)', padding: '20px', background: '#ffffff' }}>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-800" />
              <span className="ml-2 text-neutral-800">Carregando...</span>
            </div>
          ) : (
            <>
              {/* Formulário de Novo Tipo */}
              <div style={{
                background: '#f3f4f6',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Adicionar Novo Tipo
                </h3>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
                  <div style={{ flex: 1 }}>
                    <Label style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>
                      Nome do Tipo *
                    </Label>
                    <Input
                      value={novoTipo}
                      onChange={(e) => setNovoTipo(e.target.value)}
                      placeholder="Ex.: Comissão, Frete, etc."
                      className="mt-1 h-9 text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') addTipo();
                      }}
                    />
                  </div>
                  <Button
                    onClick={addTipo}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 h-9 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>

              {/* Lista de Tipos */}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Tipos Cadastrados
                </h3>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                  <Table>
                    <TableHeader style={{ background: '#f3f4f6' }}>
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Nome</TableHead>
                        <TableHead className="text-xs font-semibold text-center w-20">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tipos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-neutral-500 py-12 text-sm">
                            <Settings2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="font-medium">Nenhum tipo cadastrado</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        tipos.map((tipo) => (
                          <TableRow key={tipo.id} className="text-xs">
                            <TableCell className="font-medium">{tipo.nome}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTipo(tipo.id)}
                                className="h-7 w-7 text-red-600 hover:bg-red-50">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '12px 20px',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <Button 
            variant="outline" 
            onClick={onClose} 
            size="sm"
            className="text-xs">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}