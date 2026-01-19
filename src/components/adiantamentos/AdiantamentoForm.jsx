import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wallet } from "lucide-react";
import SmartInput from "@/components/SmartInput";
import { useToast } from "@/components/ui/use-toast";
import ResponsiveModal from "@/components/ui/ResponsiveModal";

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
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSubmit}
      title={adiantamento ? "Editar Adiantamento" : "Novo Adiantamento"}
      subtitle="Preencha os dados do adiantamento"
      icon={Wallet}
      isSaving={false}
      maxWidth="max-w-2xl"
    >
      <div className="bg-white rounded-lg md:rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 border-b border-slate-200 px-3 md:px-4 py-2 md:py-3">
          <h3 className="font-bold text-slate-800 text-xs md:text-sm">Dados do Adiantamento</h3>
        </div>
        <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div>
            <Label className="text-xs md:text-sm font-bold text-slate-900 mb-1 md:mb-2 block">Funcionário</Label>
            <SmartInput
              options={funcionariosOptions}
              value={form.funcionario_id}
              onChange={(v) => setField("funcionario_id", v)}
              placeholder="Selecione"
              className="modern-input text-black border border-slate-400 shadow-sm text-sm" />
          </div>

          <div>
            <Label className="text-xs md:text-sm font-bold text-slate-900 mb-1 md:mb-2 block">Plano de Contas</Label>
            <SmartInput
              options={planosOptions}
              value={form.plano_contas_id}
              onChange={(v) => setField("plano_contas_id", v)}
              placeholder="Selecione"
              className="modern-input text-black border border-slate-400 shadow-sm text-sm" />
          </div>

          <div>
            <Label className="text-xs md:text-sm font-bold text-slate-900 mb-1 md:mb-2 block">Competência</Label>
            <Input
              type="month"
              value={form.competencia}
              onChange={(e) => setField("competencia", e.target.value)}
              className="modern-input text-black border border-slate-400 shadow-sm h-9 md:h-10 text-sm" />
          </div>

          <div>
            <Label className="text-xs md:text-sm font-bold text-slate-900 mb-1 md:mb-2 block">Data</Label>
            <Input
              type="date"
              value={form.data_adiantamento}
              onChange={(e) => setField("data_adiantamento", e.target.value)}
              required
              className="modern-input text-black border border-slate-400 shadow-sm h-9 md:h-10 text-sm" />
          </div>

          <div>
            <Label className="text-xs md:text-sm font-bold text-slate-900 mb-1 md:mb-2 block">Valor</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={form.valor}
              onChange={(e) => setField("valor", e.target.value)}
              required
              className="modern-input text-black border border-slate-400 shadow-sm h-9 md:h-10 text-sm" />
          </div>

          <div>
            <Label className="text-xs md:text-sm font-bold text-slate-900 mb-1 md:mb-2 block">Status</Label>
            <SmartInput
              options={statusOptions}
              value={form.status}
              onChange={(v) => setField("status", v)}
              placeholder="Selecione"
              className="modern-input text-black border border-slate-400 shadow-sm text-sm" />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs md:text-sm font-bold text-slate-900 mb-1 md:mb-2 block">Motivo</Label>
            <Textarea
              placeholder="Descreva o motivo"
              value={form.motivo}
              onChange={(e) => setField("motivo", e.target.value)}
              className="modern-input text-black border border-slate-400 shadow-sm text-sm min-h-[60px] md:min-h-[80px]" />
          </div>
        </div>
      </div>
    </ResponsiveModal>);

}