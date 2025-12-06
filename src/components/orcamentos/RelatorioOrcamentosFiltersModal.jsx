import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Users, CreditCard, Calendar, Printer, Filter } from "lucide-react";
import SmartInput from "@/components/SmartInput";

export default function RelatorioOrcamentosFiltersModal({
  isOpen,
  onClose,
  onGenerate,
  clientes = [],
  funcionarios = [],
  veiculos = [],
  condicoes = [],
  formas = []
}) {
  const [status, setStatus] = useState("todos");
  const [numeroOrcamento, setNumeroOrcamento] = useState("");
  const [clienteId, setClienteId] = useState("todos");
  const [vendedorId, setVendedorId] = useState("todos");
  const [veiculoId, setVeiculoId] = useState("todos");
  const [condicaoId, setCondicaoId] = useState("todos");
  const [formaId, setFormaId] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [incluirDespesas, setIncluirDespesas] = useState(false);
  const [situacao, setSituacao] = useState("todos");

  const handleGenerate = () => {
    const filters = {
      status: status === "todos" ? "" : status,
      numeroOrcamento: numeroOrcamento.trim(),
      clienteId: clienteId === "todos" ? "" : clienteId,
      vendedorId: vendedorId === "todos" ? "" : vendedorId,
      veiculoId: veiculoId === "todos" ? "" : veiculoId,
      condicaoId: condicaoId === "todos" ? "" : condicaoId,
      formaId: formaId === "todos" ? "" : formaId,
      dataInicio,
      dataFim,
      incluirDespesas,
      situacao
    };
    onGenerate?.(filters);
  };

  const statusOptions = [
    { value: "todos", label: "Todos" },
    { value: "pendente", label: "Pendente" },
    { value: "aprovado", label: "Aprovado" },
    { value: "rejeitado", label: "Rejeitado" },
    { value: "expirado", label: "Expirado" },
    { value: "convertido", label: "Convertido" },
    { value: "cancelado", label: "Cancelado" }
  ];

  const clientesOptions = [
    { value: "todos", label: "Todos" },
    ...clientes.map(c => ({ value: c.id, label: c.nome }))
  ];

  const vendedoresOptions = [
    { value: "todos", label: "Todos" },
    ...funcionarios.map(f => ({ value: f.id, label: f.nome }))
  ];

  const formasOptions = [
    { value: "todos", label: "Todas" },
    ...formas.map(f => ({ value: f.id, label: f.nome }))
  ];

  const condicoesOptions = [
    { value: "todos", label: "Todas" },
    ...condicoes.map(c => ({ value: c.id, label: c.nome }))
  ];

  const situacaoOptions = [
    { value: "todos", label: "Todos" },
    { value: "nao_cancelados", label: "Não cancelados" },
    { value: "cancelados", label: "Somente cancelados" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border-0 rounded-2xl shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Filtros do Relatório</h2>
              <p className="text-xs text-slate-300 mt-0.5">Configure os filtros para gerar o relatório personalizado</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-800 text-sm">Filtros de Pesquisa</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Status
              </Label>
              <SmartInput
                options={statusOptions}
                value={status}
                onChange={setStatus}
                placeholder="Selecione o status"
                className="h-10"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Nº Orçamento
              </Label>
              <Input
                value={numeroOrcamento}
                onChange={(e) => setNumeroOrcamento(e.target.value)}
                placeholder="Ex.: 2025-000123"
                className="h-10 bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Cliente
              </Label>
              <SmartInput
                options={clientesOptions}
                value={clienteId}
                onChange={setClienteId}
                placeholder="Selecione o cliente"
                className="h-10"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Vendedor
              </Label>
              <SmartInput
                options={vendedoresOptions}
                value={vendedorId}
                onChange={setVendedorId}
                placeholder="Selecione o vendedor"
                className="h-10"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Forma de Pagamento
              </Label>
              <SmartInput
                options={formasOptions}
                value={formaId}
                onChange={setFormaId}
                placeholder="Selecione a forma"
                className="h-10"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Condição de Pagamento
              </Label>
              <SmartInput
                options={condicoesOptions}
                value={condicaoId}
                onChange={setCondicaoId}
                placeholder="Selecione a condição"
                className="h-10"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data Início
              </Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-10 bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data Fim
              </Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-10 bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="inc-desp"
                checked={incluirDespesas}
                onCheckedChange={(v) => setIncluirDespesas(!!v)}
                className="h-4 w-4 border-2 border-slate-300 data-[state=checked]:bg-slate-800 data-[state=checked]:border-slate-800"
              />
              <Label htmlFor="inc-desp" className="cursor-pointer text-sm font-medium text-slate-700">
                Incluir Despesas no Relatório
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-5"
          >
            <Printer className="w-4 h-4 mr-2" />
            Gerar Relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}