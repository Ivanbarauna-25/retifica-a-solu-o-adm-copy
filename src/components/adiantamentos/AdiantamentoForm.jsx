import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Wallet } from "lucide-react";
import SmartInput from "@/components/SmartInput";
import { useToast } from "@/components/ui/use-toast";

export default function AdiantamentoForm({ isOpen, adiantamento, funcionarios, planos, onSave, onClose }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    funcionario_id: "",
    plano_contas_id: "",
    competencia: "",
    data_adiantamento: "",
    valor: "",
    motivo: "",
    status: "pendente"
  });

  useEffect(() => {
    if (adiantamento) {
      setForm({
        funcionario_id: adiantamento.funcionario_id || "",
        plano_contas_id: adiantamento.plano_contas_id || "",
        competencia: adiantamento.competencia || "",
        data_adiantamento: adiantamento.data_adiantamento || "",
        valor: adiantamento.valor ?? "",
        motivo: adiantamento.motivo || "",
        status: adiantamento.status || "pendente"
      });
    } else {
      setForm((prev) => ({
        ...prev,
        funcionario_id: "",
        plano_contas_id: "",
        competencia: "",
        data_adiantamento: new Date().toISOString().slice(0, 10),
        valor: "",
        motivo: "",
        status: "pendente"
      }));
    }
  }, [adiantamento, isOpen]);

  const canSave = useMemo(() => {
    return form.funcionario_id && form.data_adiantamento && form.valor !== "";
  }, [form]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!canSave) {
      toast({
        variant: "destructive",
        title: "Erro de validação",
        description: "Preencha todos os campos obrigatórios (Funcionário, Data e Valor)."
      });
      return;
    }

    const payload = {
      ...form,
      valor: form.valor === "" ? 0 : Number(String(form.valor).replace(",", "."))
    };
    onSave(payload);
  };

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const funcionariosOptions = funcionarios.map((f) => ({ value: String(f.id), label: f.nome }));
  const planosOptions = planos.map((p) => ({
    value: String(p.id),
    label: p.codigo ? `${p.codigo} - ${p.nome}` : p.nome
  }));
  const statusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "pago", label: "Pago" }];


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[92vh] modern-modal bg-white border-2 border-slate-800 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        style={{
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#94a3b8 #f1f5f9'
        }}>

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
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{adiantamento ? "Editar Adiantamento" : "Novo Adiantamento"}</h2>
              <p className="text-sm text-slate-300">Preencha os dados do adiantamento</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 bg-slate-100/50 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-800 text-sm">Dados do Adiantamento</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-bold text-slate-900 mb-2">Funcionário</Label>
              <SmartInput
                options={funcionariosOptions}
                value={form.funcionario_id}
                onChange={(v) => setField("funcionario_id", v)}
                placeholder="Selecione o funcionário"
                className="modern-input text-black border border-slate-400 shadow-sm" />

            </div>

            <div>
              <Label className="text-sm font-bold text-slate-900 mb-2">Plano de Contas</Label>
              <SmartInput
                options={planosOptions}
                value={form.plano_contas_id}
                onChange={(v) => setField("plano_contas_id", v)}
                placeholder="Selecione o plano"
                className="modern-input text-black border border-slate-400 shadow-sm" />

            </div>

            <div>
              <Label className="text-sm font-bold text-slate-900 mb-2">Competência (AAAA-MM)</Label>
              <Input
                type="month"
                value={form.competencia}
                onChange={(e) => setField("competencia", e.target.value)}
                className="modern-input text-black border border-slate-400 shadow-sm" />

            </div>

            <div>
              <Label className="text-sm font-bold text-slate-900 mb-2">Data</Label>
              <Input
                type="date"
                value={form.data_adiantamento}
                onChange={(e) => setField("data_adiantamento", e.target.value)}
                required
                className="modern-input text-black border border-slate-400 shadow-sm" />

            </div>

            <div>
              <Label className="text-sm font-bold text-slate-900 mb-2">Valor</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => setField("valor", e.target.value)}
                required
                className="modern-input text-black border border-slate-400 shadow-sm" />

            </div>

            <div>
              <Label className="text-sm font-bold text-slate-900 mb-2">Status</Label>
              <SmartInput
                options={statusOptions}
                value={form.status}
                onChange={(v) => setField("status", v)}
                placeholder="Selecione o status"
                className="modern-input text-black border border-slate-400 shadow-sm" />

            </div>

            <div className="md:col-span-2">
              <Label className="text-sm font-bold text-slate-900 mb-2">Motivo</Label>
              <Textarea
                placeholder="Descreva o motivo do adiantamento"
                value={form.motivo}
                onChange={(e) => setField("motivo", e.target.value)}
                className="modern-input text-black border border-slate-400 shadow-sm" />

            </div>
          </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 bg-white px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
            >
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);

}