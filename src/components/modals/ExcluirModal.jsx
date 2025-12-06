import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { XCircle, X, Loader2, Trash2 } from "lucide-react";
import { MovimentacaoFinanceira } from "@/entities/MovimentacaoFinanceira";
import { NotaFiscalEntrada } from "@/entities/NotaFiscalEntrada";
import SearchableContactSelect from "../SearchableContactSelect";
import { formatCurrency, formatDate } from "@/components/formatters";

export default function ExcluirModal({
  isOpen,
  onClose,
  onComplete,
  allContacts,
}) {
  const [step, setStep] = useState(1);
  const [filters, setFilters] = useState({
    tipoMovimento: "debito",
    dataInicio: "",
    dataFim: "",
    contato: "",
  });
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setResults([]);
      setSelectedIds([]);
      setFilters({ tipoMovimento: "debito", dataInicio: "", dataFim: "", contato: "" });
    }
  }, [isOpen]);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const data = await MovimentacaoFinanceira.list();
      let filtrados = data.filter((mov) => mov.tipo_movimentacao === filters.tipoMovimento);
      if (filters.contato) {
        const [tipo, id] = filters.contato.split(":");
        filtrados = filtrados.filter((mov) => mov.contato_tipo === tipo && mov.contato_id === id);
      }
      if (filters.dataInicio)
        filtrados = filtrados.filter((mov) => mov.data_vencimento >= filters.dataInicio);
      if (filters.dataFim)
        filtrados = filtrados.filter((mov) => mov.data_vencimento <= filters.dataFim);

      setResults(filtrados);
      setStep(2);
    } catch (error) {
      toast({ title: "Erro ao buscar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedIds || selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const notasFiscaisIds = new Set();
      for (const id of selectedIds) {
        const movimentacoes = await MovimentacaoFinanceira.filter({ id });
        if (movimentacoes && movimentacoes[0]?.nota_fiscal_id) {
          notasFiscaisIds.add(movimentacoes[0].nota_fiscal_id);
        }
        await MovimentacaoFinanceira.delete(id);
      }
      for (const notaId of notasFiscaisIds) {
        try {
          const movimentacoesRestantes = await MovimentacaoFinanceira.filter({
            nota_fiscal_id: notaId,
            origem: 'compras'
          });
          if (!movimentacoesRestantes || movimentacoesRestantes.length === 0) {
            await NotaFiscalEntrada.update(notaId, { movimentacao_financeira_gerada: false });
          }
        } catch (e) { console.error(e); }
      }
      toast({ title: 'Movimentações excluídas com sucesso!' });
      if (onComplete) await onComplete();
      onClose();
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStep1 = () => (
    <div className="p-4 grid grid-cols-1 gap-4">
      <div>
        <Label className="text-sm font-bold text-slate-900 mb-2">Tipo de Movimento</Label>
        <RadioGroup
          value={filters.tipoMovimento}
          onValueChange={(v) => setFilters((p) => ({ ...p, tipoMovimento: v }))}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2 bg-white border border-slate-300 px-3 py-2 rounded-md">
            <RadioGroupItem value="debito" id="ex-despesa" />
            <Label htmlFor="ex-despesa" className="cursor-pointer">Despesa</Label>
          </div>
          <div className="flex items-center space-x-2 bg-white border border-slate-300 px-3 py-2 rounded-md">
            <RadioGroupItem value="credito" id="ex-receita" />
            <Label htmlFor="ex-receita" className="cursor-pointer">Receita</Label>
          </div>
        </RadioGroup>
      </div>
      <div>
        <Label className="text-sm font-bold text-slate-900 mb-2">Contato</Label>
        <SearchableContactSelect
          contacts={allContacts}
          onSelect={(value) => setFilters((p) => ({ ...p, contato: value }))}
          className="modern-input text-black border border-slate-400 shadow-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-bold text-slate-900 mb-2">Data Início</Label>
          <Input 
            type="date" 
            value={filters.dataInicio} 
            onChange={(e) => setFilters((p) => ({ ...p, dataInicio: e.target.value }))} 
            className="modern-input text-black border border-slate-400 shadow-sm"
          />
        </div>
        <div>
          <Label className="text-sm font-bold text-slate-900 mb-2">Data Fim</Label>
          <Input 
            type="date" 
            value={filters.dataFim} 
            onChange={(e) => setFilters((p) => ({ ...p, dataFim: e.target.value }))} 
            className="modern-input text-black border border-slate-400 shadow-sm"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="p-4">
      <div className="rounded-md border border-slate-200 max-h-[50vh] overflow-y-auto">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="w-12"><Checkbox checked={selectedIds.length > 0 && selectedIds.length === results.length} onCheckedChange={(c) => setSelectedIds(c ? results.map((r) => r.id) : [])} /></TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.length > 0 ? (
              results.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={(c) => setSelectedIds((p) => c ? [...p, item.id] : p.filter((id) => id !== item.id))} /></TableCell>
                  <TableCell>{allContacts.find((c) => c.id === item.contato_id)?.nome || "N/A"}</TableCell>
                  <TableCell>{formatDate(item.data_vencimento)}</TableCell>
                  <TableCell>{formatCurrency(item.valor_total)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Nenhuma movimentação encontrada</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95%] modern-modal bg-white border-2 border-slate-800 shadow-2xl p-0 overflow-hidden">
        {isDeleting && (
          <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-slate-600" />
              <p className="text-lg font-semibold text-slate-900">Excluindo...</p>
            </div>
          </div>
        )}

        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b border-slate-600">
          <div className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Excluir Movimentações</DialogTitle>
              <p className="text-sm text-slate-300">
                {step === 1 ? "Filtre os itens para exclusão" : "Selecione os itens para remover"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-slate-100/50 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-800 text-sm">Filtros e Seleção</h3>
            </div>
            {step === 1 ? renderStep1() : renderStep2()}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 bg-white px-6 pb-6">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onClose} className="bg-white text-slate-700 px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-50 gap-2 h-10">
                <X className="w-4 h-4" /> Cancelar
              </Button>
              <Button onClick={handleSearch} disabled={isLoading} className="bg-slate-800 text-white px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-700 gap-2 h-10">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="bg-white text-slate-700 px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-50 gap-2 h-10">
                Voltar
              </Button>
              <Button onClick={handleDelete} disabled={selectedIds.length === 0} className="bg-red-600 text-white px-4 py-2 text-sm font-bold rounded-md border-2 border-red-600 hover:bg-red-700 gap-2 h-10">
                <Trash2 className="w-4 h-4" /> Confirmar Exclusão
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}