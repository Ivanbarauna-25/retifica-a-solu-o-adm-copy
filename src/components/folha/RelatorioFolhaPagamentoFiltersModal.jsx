import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Calendar, Users, DollarSign, X, Building2 } from "lucide-react";
import SmartInput from "@/components/SmartInput";

export default function RelatorioFolhaPagamentoFiltersModal({
  isOpen,
  onClose,
  onGenerate,
  funcionarios = [],
  departamentos = []
}) {
  const [status, setStatus] = useState("todos");
  const [funcionarioId, setFuncionarioId] = useState("todos");
  const [departamentoId, setDepartamentoId] = useState("todos");
  const [competencia, setCompetencia] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [apenasComProporcional, setApenasComProporcional] = useState(false);

  const handleGenerate = () => {
    const filters = {
      status: status === "todos" ? "" : status,
      funcionarioId: funcionarioId === "todos" ? "" : funcionarioId,
      departamentoId: departamentoId === "todos" ? "" : departamentoId,
      competencia,
      dataInicio,
      dataFim,
      apenasComProporcional
    };
    
    onGenerate?.(filters);
  };

  const statusOptions = [
    { value: "todos", label: "Todos" },
    { value: "pendente", label: "Pendente" },
    { value: "pago_parcial", label: "Pago Parcial" },
    { value: "pago", label: "Pago" }
  ];

  const funcionariosOptions = [
    { value: "todos", label: "Todos" },
    ...funcionarios.map(f => ({ value: f.id, label: f.nome }))
  ];

  const departamentosOptions = [
    { value: "todos", label: "Todos" },
    ...departamentos.map(d => ({ value: d.id, label: d.nome }))
  ];

  const SectionHdr = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 mb-3">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl border-0"
        data-custom-modal="true"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-4 rounded-t-xl flex-shrink-0" style={{ background: "#0B1629" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Printer className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight" style={{ color: '#fff' }}>Relatório de Folha de Pagamento</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Configure os filtros para gerar o relatório</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <SectionHdr icon={DollarSign} title="Filtros" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Status</Label>
                <SmartInput options={statusOptions} value={status} onChange={setStatus} placeholder="Selecione o status" className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Competência</Label>
                <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Funcionário</Label>
                <SmartInput options={funcionariosOptions} value={funcionarioId} onChange={setFuncionarioId} placeholder="Todos" className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Departamento</Label>
                <SmartInput options={departamentosOptions} value={departamentoId} onChange={setDepartamentoId} placeholder="Todos" className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Data Pagamento (Início)</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Data Pagamento (Fim)</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="text-sm h-9" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <Checkbox id="proporcional" checked={apenasComProporcional} onCheckedChange={(v) => setApenasComProporcional(!!v)} />
              <Label htmlFor="proporcional" className="cursor-pointer text-sm font-medium text-slate-700">
                Apenas salários proporcionais (funcionários que começaram no meio do mês)
              </Label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 md:px-5 py-3 border-t border-slate-200 bg-white rounded-b-xl flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="h-9 px-4 text-sm border-slate-300 text-slate-700 gap-1.5">
            <X className="w-3.5 h-3.5" /> Cancelar
          </Button>
          <Button onClick={handleGenerate} className="h-9 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Gerar Relatório
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}