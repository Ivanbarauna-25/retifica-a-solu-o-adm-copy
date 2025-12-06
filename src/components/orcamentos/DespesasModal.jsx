import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, DollarSign, X, Package, Tag } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatDate } from "@/components/formatters";
import { useToast } from "@/components/ui/use-toast";
import SmartInput from "@/components/SmartInput";

export default function DespesasModal({ isOpen, onClose, orcamento }) {
  const { toast } = useToast();
  const [tiposDespesa, setTiposDespesa] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [nova, setNova] = useState({ 
    tipo: "outros",
    peca_id: "",
    tipo_despesa_id: "",
    quantidade: 1,
    valor_unitario: 0,
    valor: 0,
    data: "",
    descricao: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    if (!orcamento?.id) return;
    setIsLoading(true);
    try {
      const [tipos, pecasData, despesasData] = await Promise.all([
        base44.entities.TipoDespesa.filter({ ativo: true }),
        base44.entities.Peca.list(),
        base44.entities.DespesaOrcamento.filter({ orcamento_id: orcamento.id }, "-created_date")
      ]);
      setTiposDespesa(tipos || []);
      setPecas(pecasData || []);
      setDespesas(despesasData || []);
    } catch (error) {
      console.error("Erro ao carregar despesas:", error);
      toast({
        title: "Erro ao carregar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0];
      setNova({ 
        tipo: "outros",
        peca_id: "",
        tipo_despesa_id: "",
        quantidade: 1,
        valor_unitario: 0,
        valor: 0,
        data: today,
        descricao: ""
      });
      load();
    }
  }, [isOpen]);

  // Atualizar valor total quando quantidade ou valor unitário mudam
  useEffect(() => {
    if (nova.tipo === "peca") {
      const valorTotal = nova.quantidade * nova.valor_unitario;
      setNova(prev => ({ ...prev, valor: valorTotal }));
    }
  }, [nova.quantidade, nova.valor_unitario, nova.tipo]);

  // Quando selecionar uma peça, preencher valor unitário com o preço de custo
  useEffect(() => {
    if (nova.tipo === "peca" && nova.peca_id) {
      const peca = pecas.find(p => p.id === nova.peca_id);
      if (peca) {
        setNova(prev => ({
          ...prev,
          valor_unitario: peca.preco_custo || 0,
          descricao: peca.descricao || ""
        }));
      }
    }
  }, [nova.peca_id, nova.tipo, pecas]);

  const totalDespesas = useMemo(() => despesas.reduce((acc, d) => acc + (d.valor || 0), 0), [despesas]);
  const receitaOrcamento = orcamento?.valor_total || 0;
  const margemLiquida = receitaOrcamento - totalDespesas;
  const percentualMargem = receitaOrcamento > 0 ? ((margemLiquida / receitaOrcamento) * 100).toFixed(2) : 0;

  const addDespesa = async () => {
    if (!nova.data || Number(nova.valor) <= 0) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: "Preencha data e valor.",
        variant: "destructive"
      });
      return;
    }

    if (nova.tipo === "peca" && !nova.peca_id) {
      toast({
        title: "⚠️ Peça obrigatória",
        description: "Selecione uma peça do estoque.",
        variant: "destructive"
      });
      return;
    }

    if (nova.tipo === "outros" && !nova.tipo_despesa_id) {
      toast({
        title: "⚠️ Tipo obrigatório",
        description: "Selecione um tipo de despesa.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const despesaData = {
        orcamento_id: orcamento.id,
        tipo: nova.tipo,
        descricao: (nova.descricao || "").trim(),
        valor: Number(nova.valor),
        data: nova.data
      };

      if (nova.tipo === "peca") {
        despesaData.peca_id = nova.peca_id;
        despesaData.quantidade = Number(nova.quantidade);
        despesaData.valor_unitario = Number(nova.valor_unitario);
      } else {
        despesaData.tipo_despesa_id = nova.tipo_despesa_id;
      }

      await base44.entities.DespesaOrcamento.create(despesaData);
      toast({ title: "✅ Despesa adicionada com sucesso!" });
      await load();
      const today = new Date().toISOString().split("T")[0];
      setNova({ 
        tipo: nova.tipo,
        peca_id: "",
        tipo_despesa_id: "",
        quantidade: 1,
        valor_unitario: 0,
        valor: 0,
        data: today,
        descricao: ""
      });
    } catch (error) {
      console.error("Erro ao adicionar despesa:", error);
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta despesa?")) return;
    try {
      await base44.entities.DespesaOrcamento.delete(id);
      toast({ title: "✅ Despesa removida com sucesso!" });
      await load();
    } catch (error) {
      console.error("Erro ao remover despesa:", error);
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Opções formatadas para SmartInput
  const pecasOptions = useMemo(() => 
    pecas.map(p => ({
      value: p.id,
      label: `${p.codigo} - ${p.descricao}`
    })),
    [pecas]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[65vw] w-[65vw] h-[80vh] max-h-[80vh] overflow-y-auto modern-modal bg-white border border-slate-200 rounded-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <style>{`
          .modern-modal::-webkit-scrollbar {
            width: 8px;
          }
          .modern-modal::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .modern-modal::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 4px;
          }
          .modern-modal::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}</style>

        <DialogHeader className="sticky top-0 z-10 px-6 py-5 bg-slate-900 text-white no-print border-b border-slate-800">
          <DialogTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center ring-1 ring-white/10">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Despesas do Orçamento</h2>
                <p className="text-sm text-slate-400 font-medium">{orcamento?.numero_orcamento || ""}</p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* CONTEÚDO COM SCROLL */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
              <span className="ml-2 text-slate-800">Carregando...</span>
            </div>
          ) : (
            <>
              {/* Cards de Resumo Financeiro */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                  <div className="text-xs text-green-800 font-semibold mb-1">RECEITA (ORÇAMENTO)</div>
                  <div className="text-xl font-bold text-green-700">{formatCurrency(receitaOrcamento)}</div>
                </div>
                
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                  <div className="text-xs text-red-800 font-semibold mb-1">DESPESAS</div>
                  <div className="text-xl font-bold text-red-700">{formatCurrency(totalDespesas)}</div>
                </div>
                
                <div className={`${margemLiquida >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'} border-2 rounded-lg p-3`}>
                  <div className={`text-xs font-semibold mb-1 ${margemLiquida >= 0 ? 'text-blue-800' : 'text-amber-800'}`}>
                    MARGEM LÍQUIDA
                  </div>
                  <div className={`text-xl font-bold ${margemLiquida >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                    {formatCurrency(margemLiquida)}
                  </div>
                  <div className="text-xs mt-1 opacity-80 text-slate-900">{percentualMargem}% da receita</div>
                </div>
              </div>

              {/* Formulário de Nova Despesa */}
              <div className="bg-slate-100 rounded-lg p-4 mb-5 border border-slate-200">
                <h3 className="text-sm font-bold mb-3 text-slate-900">Adicionar Nova Despesa</h3>
                
                {/* Seletor de Tipo */}
                <div className="mb-4">
                  <Label className="text-xs text-slate-600 font-semibold mb-2 block">Tipo de Despesa *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNova(prev => ({ 
                        ...prev, 
                        tipo: "peca",
                        tipo_despesa_id: "",
                        quantidade: 1,
                        valor_unitario: 0,
                        valor: 0
                      }))}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        nova.tipo === "peca" 
                          ? "bg-blue-50 border-blue-500 text-blue-700" 
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}>
                      <Package className="w-4 h-4" />
                      <span className="font-semibold text-sm">Peça do Estoque</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setNova(prev => ({ 
                        ...prev, 
                        tipo: "outros",
                        peca_id: "",
                        quantidade: 1,
                        valor_unitario: 0,
                        valor: 0
                      }))}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        nova.tipo === "outros" 
                          ? "bg-purple-50 border-purple-500 text-purple-700" 
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}>
                      <Tag className="w-4 h-4" />
                      <span className="font-semibold text-sm">Outros</span>
                    </button>
                  </div>
                </div>

                {/* Campos para Peça */}
                {nova.tipo === "peca" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-600 font-semibold">Peça do Estoque *</Label>
                      <SmartInput
                        value={nova.peca_id}
                        onChange={(v) => setNova(prev => ({ ...prev, peca_id: v }))}
                        options={pecasOptions}
                        placeholder="Digite para buscar uma peça..."
                        className="mt-1 bg-white text-black h-9 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-[1.5fr_1.5fr_1.5fr_1.5fr_auto] gap-3 items-end">
                      <div>
                        <Label className="text-xs text-slate-600 font-semibold">Quantidade *</Label>
                        <Input 
                          type="number" 
                          min="1"
                          value={nova.quantidade} 
                          onChange={(e) => setNova(prev => ({ ...prev, quantidade: e.target.value }))}
                          className="mt-1 h-9 text-sm bg-white text-black"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-slate-600 font-semibold">Valor Unitário *</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={nova.valor_unitario} 
                          onChange={(e) => setNova(prev => ({ ...prev, valor_unitario: e.target.value }))}
                          className="mt-1 h-9 text-sm bg-white text-black"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-slate-600 font-semibold">Valor Total</Label>
                        <Input 
                          type="number"
                          value={nova.valor} 
                          disabled
                          className="mt-1 h-9 text-sm bg-slate-100 text-black font-semibold"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-slate-600 font-semibold">Data *</Label>
                        <Input 
                          type="date" 
                          value={nova.data} 
                          onChange={(e) => setNova(prev => ({ ...prev, data: e.target.value }))}
                          className="mt-1 h-9 text-sm bg-white text-black"
                        />
                      </div>

                      <Button 
                        onClick={addDespesa} 
                        size="sm"
                        className="bg-slate-800 hover:bg-slate-700 text-white h-9 text-xs px-6">
                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Campos para Outros */}
                {nova.tipo === "outros" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-600 font-semibold">Tipo da Despesa *</Label>
                      <Select 
                        value={nova.tipo_despesa_id} 
                        onValueChange={(v) => setNova(prev => ({ ...prev, tipo_despesa_id: v }))}>
                        <SelectTrigger className="mt-1 bg-white text-black h-9 text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposDespesa.length === 0 ? (
                            <div className="p-4 text-center text-slate-600 text-sm">
                              Nenhum tipo cadastrado
                            </div>
                          ) : (
                            tiposDespesa.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-[1.5fr_1.5fr_auto] gap-3 items-end">
                      <div>
                        <Label className="text-xs text-slate-600 font-semibold">Valor *</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={nova.valor} 
                          onChange={(e) => setNova(prev => ({ ...prev, valor: e.target.value }))}
                          className="mt-1 h-9 text-sm bg-white text-black"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs text-slate-600 font-semibold">Data *</Label>
                        <Input 
                          type="date" 
                          value={nova.data} 
                          onChange={(e) => setNova(prev => ({ ...prev, data: e.target.value }))}
                          className="mt-1 h-9 text-sm bg-white text-black"
                        />
                      </div>

                      <Button 
                        onClick={addDespesa} 
                        size="sm"
                        className="bg-slate-800 hover:bg-slate-700 text-white h-9 text-xs px-6">
                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="mt-3">
                  <Label className="text-xs text-slate-600 font-semibold">Descrição (opcional)</Label>
                  <Input 
                    value={nova.descricao} 
                    onChange={(e) => setNova(prev => ({ ...prev, descricao: e.target.value }))} 
                    placeholder="Ex.: Observações adicionais"
                    className="mt-1 h-9 text-sm bg-white text-black"
                  />
                </div>
              </div>

              {/* Lista de Despesas */}
              <div>
                <h3 className="text-sm font-bold mb-3 text-slate-900">Despesas Lançadas</h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-slate-900">Data</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-900">Tipo</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-900">Descrição</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-900 text-center">Qtd</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-900 text-right">Valor</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-900 text-center w-20">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {despesas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-500 py-12 text-sm">
                            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="font-medium">Nenhuma despesa lançada</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        despesas.map(d => {
                          let tipoLabel = "—";
                          let descricao = d.descricao || "—";
                          
                          if (d.tipo === "peca") {
                            const peca = pecas.find(p => p.id === d.peca_id);
                            tipoLabel = "Peça";
                            descricao = peca ? `${peca.codigo} - ${peca.descricao}` : descricao;
                          } else {
                            const tipo = tiposDespesa.find(t => t.id === d.tipo_despesa_id);
                            tipoLabel = tipo?.nome || "Outros";
                          }
                          
                          return (
                            <TableRow key={d.id} className="text-xs">
                              <TableCell className="text-slate-900">{formatDate(d.data)}</TableCell>
                              <TableCell className="font-medium text-slate-900">{tipoLabel}</TableCell>
                              <TableCell className="text-slate-900">{descricao}</TableCell>
                              <TableCell className="text-center text-slate-900">
                                {d.tipo === "peca" ? d.quantidade : "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-red-700">
                                {formatCurrency(d.valor)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => remove(d.id)} 
                                  className="h-7 w-7 text-red-600 hover:bg-red-50">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button 
            variant="outline" 
            onClick={onClose} 
            size="sm"
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs">
            <X className="w-4 h-4 mr-1" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}