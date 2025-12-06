import React, { useState, useEffect, useMemo } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, X, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { MovimentacaoFinanceira } from "@/entities/MovimentacaoFinanceira";
import SearchableContactSelect from "../SearchableContactSelect";
import { formatCurrency, formatDate } from "@/components/formatters";

export default function RenegociarModal({
  open,
  onClose,
  onComplete,
  allContacts,
  formasPagamento,
}) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({ contato: "", tipoMovimento: "todos" });
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [renegociacao, setRenegociacao] = useState({ novaDataInicio: "", parcelas: 1, juros: 0, formaPagamentoId: "" });
  const { toast } = useToast();

  const totalSelecionado = useMemo(() => {
    return results.filter((r) => selectedIds.includes(r.id)).reduce((sum, item) => sum + (item.valor_total || 0), 0);
  }, [selectedIds, results]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setResults([]);
      setSelectedIds([]);
      setFilters({ contato: "", tipoMovimento: "todos" });
      setRenegociacao({ novaDataInicio: "", parcelas: 1, juros: 0, formaPagamentoId: "" });
    }
  }, [open]);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const todas = await MovimentacaoFinanceira.list();
      let pendentes = todas.filter((m) => m.status === "pendente");
      if (filters.tipoMovimento !== "todos") {
        const tipoMap = { despesa: "debito", receita: "credito" };
        pendentes = pendentes.filter((m) => m.tipo_movimentacao === tipoMap[filters.tipoMovimento]);
      }
      if (filters.contato) {
        const [tipo, id] = filters.contato.split(":");
        pendentes = pendentes.filter((m) => m.contato_tipo === tipo && m.contato_id === id);
      }
      setResults(pendentes);
      setStep(2);
    } catch (err) {
      toast({ title: "Erro ao buscar", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmarRenegociacao = async () => {
    if (!renegociacao.novaDataInicio) {
      toast({ title: "Campo obrigatório", description: "Informe a nova data inicial.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const promises = selectedIds.map(async (id) => {
        const mov = results.find((r) => r.id === id);
        const novoValor = mov.valor_total * (1 + renegociacao.juros / 100);
        const parcelas = [];
        const valorParcela = novoValor / renegociacao.parcelas;
        for (let i = 0; i < renegociacao.parcelas; i++) {
          const dataParcela = new Date(renegociacao.novaDataInicio);
          dataParcela.setMonth(dataParcela.getMonth() + i);
          parcelas.push({
            numero_parcela: i + 1,
            data_vencimento: dataParcela.toISOString().split("T")[0],
            valor: valorParcela,
          });
        }
        await MovimentacaoFinanceira.update(id, {
          status: "renegociado",
          parcelas,
          forma_pagamento_id: renegociacao.formaPagamentoId || mov.forma_pagamento_id,
        });
      });
      await Promise.all(promises);
      toast({ title: "Sucesso!", description: "Renegociação concluída." });
      onComplete();
      onClose();
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="p-4 grid grid-cols-1 gap-4">
      <div>
        <Label className="text-sm font-bold text-slate-900 mb-2">Tipo</Label>
        <div className="flex gap-4">
          {["todos", "despesa", "receita"].map((t) => (
            <label key={t} className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-2 rounded-md cursor-pointer">
              <input type="radio" name="tipo" value={t} checked={filters.tipoMovimento === t} onChange={(e) => setFilters((p) => ({ ...p, tipoMovimento: e.target.value }))} />
              {t[0].toUpperCase() + t.slice(1)}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-sm font-bold text-slate-900 mb-2">Contato</Label>
        <SearchableContactSelect value={filters.contato} onValueChange={(v) => setFilters((p) => ({ ...p, contato: v || "" }))} className="modern-input text-black border border-slate-400 shadow-sm" />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="p-4 space-y-4">
      <div className="rounded-md border border-slate-200 max-h-[40vh] overflow-y-auto">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="w-12"><Checkbox checked={selectedIds.length > 0 && selectedIds.length === results.length} onCheckedChange={(c) => setSelectedIds(c ? results.map((r) => r.id) : [])} /></TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((item) => (
              <TableRow key={item.id}>
                <TableCell><Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={(c) => setSelectedIds((p) => c ? [...p, item.id] : p.filter((id) => id !== item.id))} /></TableCell>
                <TableCell>{allContacts.find((c) => c.value === `${item.contato_tipo}:${item.contato_id}`)?.label || "-"}</TableCell>
                <TableCell>{formatCurrency(item.valor_total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {selectedIds.length > 0 && (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
          <div className="col-span-2 text-right font-bold text-lg text-slate-900 border-b pb-2 mb-2 border-slate-200">Total: {formatCurrency(totalSelecionado)}</div>
          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2">Nova Data</Label>
            <Input type="date" value={renegociacao.novaDataInicio} onChange={(e) => setRenegociacao((p) => ({ ...p, novaDataInicio: e.target.value }))} className="modern-input text-black border border-slate-400 shadow-sm" />
          </div>
          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2">Parcelas</Label>
            <Input type="number" min="1" value={renegociacao.parcelas} onChange={(e) => setRenegociacao((p) => ({ ...p, parcelas: e.target.value }))} className="modern-input text-black border border-slate-400 shadow-sm" />
          </div>
          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2">Juros (%)</Label>
            <Input type="number" step="0.01" value={renegociacao.juros} onChange={(e) => setRenegociacao((p) => ({ ...p, juros: e.target.value }))} className="modern-input text-black border border-slate-400 shadow-sm" />
          </div>
          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2">Forma Pagamento</Label>
            <Select value={renegociacao.formaPagamentoId} onValueChange={(v) => setRenegociacao((p) => ({ ...p, formaPagamentoId: v }))}>
              <SelectTrigger className="modern-input text-black border border-slate-400 shadow-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{formasPagamento.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200">
        <AlertTriangle className="w-6 h-6" />
        <div>
          <h3 className="font-bold text-lg">Confirmar Renegociação</h3>
          <p className="text-sm text-amber-800">
            {selectedIds.length} movimentações serão renegociadas com {renegociacao.juros}% de juros em {renegociacao.parcelas}x.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border border-slate-200">
        <div><strong>Nova Data:</strong> {formatDate(renegociacao.novaDataInicio)}</div>
        <div><strong>Forma:</strong> {formasPagamento.find(f => f.id === renegociacao.formaPagamentoId)?.nome || "Original"}</div>
        <div className="col-span-2 text-lg font-bold text-right border-t pt-2 mt-2">Total Original: {formatCurrency(totalSelecionado)}</div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95%] modern-modal bg-white border-2 border-slate-800 shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b border-slate-600">
          <div className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Renegociar Movimentações</DialogTitle>
              <p className="text-sm text-slate-300">
                {step === 1 && "Filtre as contas"} {step === 2 && "Defina novas condições"} {step === 3 && "Confirme o acordo"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-slate-100/50 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-800 text-sm">
                {step === 1 ? "Buscar Pendências" : step === 2 ? "Configurar Renegociação" : "Revisão"}
              </h3>
            </div>
            {step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 bg-white px-6 pb-6">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={onClose} className="bg-white text-slate-700 px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-50 gap-2 h-10">
                <X className="w-4 h-4" /> Cancelar
              </Button>
              <Button onClick={handleSearch} disabled={isLoading} className="bg-slate-800 text-white px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-700 gap-2 h-10">
                Buscar
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="bg-white text-slate-700 px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-50 gap-2 h-10">
                Voltar
              </Button>
              <Button onClick={() => setStep(3)} disabled={selectedIds.length === 0} className="bg-slate-800 text-white px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-700 gap-2 h-10">
                Avançar
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)} className="bg-white text-slate-700 px-4 py-2 text-sm font-bold rounded-md border-2 border-slate-800 hover:bg-slate-50 gap-2 h-10">
                Voltar
              </Button>
              <Button onClick={handleConfirmarRenegociacao} disabled={isLoading} className="bg-amber-600 text-white px-4 py-2 text-sm font-bold rounded-md border-2 border-amber-600 hover:bg-amber-700 gap-2 h-10">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}