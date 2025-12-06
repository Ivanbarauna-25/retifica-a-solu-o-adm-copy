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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[92vh] modern-modal bg-white" 
        onPointerDownOutside={(e) => e.preventDefault()}
        style={{
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#94a3b8 #f1f5f9'
        }}
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

        <DialogHeader className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white no-print border-b border-slate-600">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Gerar Relatório de Folha de Pagamento</h2>
              <p className="text-sm text-slate-300">Configure os filtros para gerar o relatório personalizado</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-600" /> 
              Status
            </Label>
            <SmartInput
              options={statusOptions}
              value={status}
              onChange={setStatus}
              placeholder="Selecione o status"
              className="modern-input text-black"
            />
          </div>

          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" /> 
              Competência
            </Label>
            <Input 
              type="month" 
              value={competencia} 
              onChange={(e) => setCompetencia(e.target.value)} 
              placeholder="Selecione o mês"
              className="modern-input text-black" 
            />
          </div>

          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" /> 
              Funcionário
            </Label>
            <SmartInput
              options={funcionariosOptions}
              value={funcionarioId}
              onChange={setFuncionarioId}
              placeholder="Selecione o funcionário"
              className="modern-input text-black"
            />
          </div>

          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" /> 
              Departamento
            </Label>
            <SmartInput
              options={departamentosOptions}
              value={departamentoId}
              onChange={setDepartamentoId}
              placeholder="Selecione o departamento"
              className="modern-input text-black"
            />
          </div>

          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" /> 
              Data Pagamento (Início)
            </Label>
            <Input 
              type="date" 
              value={dataInicio} 
              onChange={(e) => setDataInicio(e.target.value)} 
              className="modern-input text-black" 
            />
          </div>
          
          <div>
            <Label className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" /> 
              Data Pagamento (Fim)
            </Label>
            <Input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)} 
              className="modern-input text-black" 
            />
          </div>

          <div className="md:col-span-2 mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <Checkbox 
                id="proporcional" 
                checked={apenasComProporcional} 
                onCheckedChange={(v) => setApenasComProporcional(!!v)} 
                className="border-2 border-slate-400"
              />
              <Label htmlFor="proporcional" className="cursor-pointer text-sm font-semibold text-slate-900">
                Apenas salários proporcionais (funcionários que começaram no meio do mês)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-200 px-6 pb-6">
          <p className="text-sm text-slate-700 font-medium">Aplique os filtros desejados e clique em Gerar</p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 font-bold px-6"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerate} 
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 shadow-lg gap-2"
            >
              <Printer className="w-4 h-4" />
              Gerar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}