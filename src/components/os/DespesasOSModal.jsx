import React from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, Trash2, Loader2, AlertTriangle, Receipt, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

export default function DespesasOSModal({ isOpen, onClose, ordem }) {
  const { toast } = useToast();
  const [categoriasDespesa, setCategoriasDespesa] = React.useState([]);
  const [despesas, setDespesas] = React.useState([]);
  const [form, setForm] = React.useState({
    categoria_despesa_id: "",
    descricao: "",
    valor: "",
    data: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!ordem?.id) return;
    
    setIsLoadingData(true);
    try {
      const categoriasData = await base44.entities.Categoria.filter({
        tipo: 'despesa',
        ativa: true
      });
      
      const despesasData = await base44.entities.DespesaOS.filter({ ordem_id: ordem.id });
      
      setCategoriasDespesa(categoriasData || []);
      setDespesas(despesasData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [ordem?.id, toast]);

  React.useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const addDespesa = async () => {
    if (!ordem?.id) {
      toast({
        title: "Erro",
        description: "Ordem de serviço não identificada",
        variant: "destructive"
      });
      return;
    }

    if (!form.categoria_despesa_id) {
      toast({
        title: "Categoria obrigatória",
        description: "Selecione uma categoria de despesa",
        variant: "destructive"
      });
      return;
    }

    if (!form.valor || Number(form.valor) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor maior que zero",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await base44.entities.DespesaOS.create({
        ordem_id: ordem.id,
        categoria_despesa_id: form.categoria_despesa_id,
        descricao: form.descricao || "",
        valor: Number(form.valor),
        data: form.data || new Date().toISOString().split("T")[0],
      });

      toast({
        title: "✅ Despesa adicionada!",
        description: "A despesa foi registrada com sucesso."
      });

      setForm({
        categoria_despesa_id: "",
        descricao: "",
        valor: "",
        data: new Date().toISOString().split("T")[0],
      });

      await loadData();
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      toast({
        title: "Erro ao adicionar despesa",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDespesa = async (id) => {
    if (!window.confirm("Tem certeza que deseja remover esta despesa?")) return;
    
    try {
      await base44.entities.DespesaOS.delete(id);
      
      toast({
        title: "✅ Despesa removida!",
        description: "A despesa foi excluída com sucesso."
      });
      
      await loadData();
    } catch (error) {
      console.error('Erro ao deletar despesa:', error);
      toast({
        title: "Erro ao remover despesa",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getCategoriaNome = (id) => {
    const categoria = categoriasDespesa.find(c => c.id === id);
    return categoria?.nome || "—";
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { 
      style: "currency", 
      currency: "BRL" 
    }).format(value || 0);
  };

  const totalDespesas = despesas.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  const receitaOS = ordem?.valor_total || 0;
  const margemLiquida = receitaOS - totalDespesas;
  const percentualMargem = receitaOS > 0 ? ((margemLiquida / receitaOS) * 100).toFixed(2) : 0;

  return (
    <Dialog open={!!isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col modern-modal p-0 bg-white border border-slate-200 rounded-xl">
        <DialogHeader className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center ring-1 ring-white/10">
              <Receipt className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white tracking-tight">
                Despesas da OS {ordem?.numero_os || ""}
              </DialogTitle>
              <p className="text-sm text-slate-400 font-medium">Gerencie as despesas associadas a esta ordem de serviço</p>
            </div>
          </div>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center p-12 flex-1">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1 tracking-wide">Receita (OS)</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(receitaOS)}</p>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1 tracking-wide">Despesas</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </div>

              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-blue-600 uppercase font-semibold mb-1 tracking-wide">Margem Líquida</p>
                    <p className={`text-2xl font-bold ${margemLiquida >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {formatCurrency(margemLiquida)}
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5 font-medium">{percentualMargem}% da receita</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
                <h3 className="font-bold text-slate-800 text-sm">Adicionar Nova Despesa</h3>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Categoria de Despesa *</Label>
                    <Select
                      value={form.categoria_despesa_id}
                      onValueChange={(v) => setForm((p) => ({ ...p, categoria_despesa_id: v }))}
                    >
                      <SelectTrigger className="bg-white h-10 border-slate-300">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {categoriasDespesa.length === 0 ? (
                          <div className="p-4 text-center text-slate-600 text-sm">
                            Nenhuma categoria de despesa cadastrada
                          </div>
                        ) : (
                          categoriasDespesa.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {categoriasDespesa.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Cadastre categorias em Tipos de Despesa
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Data *</Label>
                    <Input
                      type="date"
                      value={form.data}
                      onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
                      className="bg-white h-10 border-slate-300"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Valor *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.valor}
                      onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
                      placeholder="0,00"
                      className="bg-white h-10 border-slate-300"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Descrição</Label>
                    <Input
                      value={form.descricao}
                      onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                      placeholder="Detalhe opcional da despesa"
                      className="bg-white h-10 border-slate-300"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={addDespesa} 
                      disabled={loading || !form.categoria_despesa_id || categoriasDespesa.length === 0}
                      className="bg-slate-800 hover:bg-slate-700 text-white h-10 w-full gap-2 font-medium"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adicionando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">Despesas Lançadas</h3>
                <Badge variant="outline" className="text-xs text-slate-600 border-slate-300 bg-white">
                  {despesas.length} registro(s)
                </Badge>
              </div>
              
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0">
                    <TableRow>
                      <TableHead className="text-slate-700 font-semibold text-xs">Data</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Categoria</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Descrição</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs text-right">Valor</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {despesas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-slate-500 text-sm">
                          Nenhuma despesa lançada ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      despesas.map((d) => (
                        <TableRow key={d.id} className="hover:bg-slate-50 border-b border-slate-100">
                          <TableCell className="font-medium text-slate-900 text-sm">
                            {new Date(d.data).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs text-slate-700 border-slate-300">
                              {getCategoriaNome(d.categoria_despesa_id || d.tipo_despesa_id)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm">{d.descricao || "—"}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600 text-sm">
                            {formatCurrency(d.valor)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteDespesa(d.id)}
                              className="hover:bg-red-50 h-8 w-8"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}