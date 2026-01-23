import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Command, CommandInput, CommandEmpty, CommandList, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Save, X, ClipboardList, FileText, History, Search } from "lucide-react";

export default function AdiantamentoForm({
  isOpen,
  adiantamento,
  funcionarios,
  planos,
  onSave,
  onClose,
}) {
  const [tab, setTab] = useState("dados");
  const [openFuncionario, setOpenFuncionario] = useState(false);
  const [openPlano, setOpenPlano] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    funcionario_id: "",
    plano_contas_id: "",
    competencia: "",
    data_adiantamento: "",
    valor: "",
    motivo: "",
    observacao: "",
    status: "pendente",
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
        observacao: adiantamento.observacao || "",
        status: adiantamento.status || "pendente",
      });
    } else {
      setForm({
        funcionario_id: "",
        plano_contas_id: "",
        competencia: "",
        data_adiantamento: new Date().toISOString().slice(0, 10),
        valor: "",
        motivo: "",
        observacao: "",
        status: "pendente",
      });
    }
  }, [adiantamento, isOpen]);

  const canSave = useMemo(() => {
    return form.funcionario_id && form.data_adiantamento && form.valor !== "";
  }, [form]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        valor: form.valor === "" ? 0 : Number(String(form.valor).replace(",", ".")),
      };
      await onSave(payload);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const getFuncionarioNome = (id) => {
    const f = funcionarios.find((x) => String(x.id) === String(id));
    return f?.nome || "Selecione...";
  };

  const getPlanoNome = (id) => {
    const p = planos.find((x) => String(x.id) === String(id));
    return p ? (p.codigo ? `${p.codigo} - ${p.nome}` : p.nome) : "Selecione...";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[720px] w-[95%] rounded-2xl shadow-2xl p-0 overflow-hidden">
        {/* Cabeçalho */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between">
          <DialogTitle className="text-lg font-bold text-slate-800">
            {adiantamento ? "Editar Adiantamento" : "Novo Adiantamento"}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5 text-slate-600" />
          </Button>
        </DialogHeader>

        {/* Corpo com abas */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto flex flex-col">
          <Tabs value={tab} onValueChange={setTab} className="flex-1">
            <TabsList className="flex justify-start border-b bg-slate-100 px-4 overflow-x-auto">
              <TabsTrigger value="dados" className="flex items-center gap-1 font-medium text-slate-700">
                <ClipboardList className="w-4 h-4" /> Dados principais
              </TabsTrigger>
              <TabsTrigger value="obs" className="flex items-center gap-1 font-medium text-slate-700">
                <FileText className="w-4 h-4" /> Observações
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex items-center gap-1 font-medium text-slate-700">
                <History className="w-4 h-4" /> Histórico
              </TabsTrigger>
            </TabsList>

            {/* --- Aba Dados principais --- */}
            <TabsContent value="dados" className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Funcionário com busca */}
                <div>
                  <Label>Funcionário</Label>
                  <Popover open={openFuncionario} onOpenChange={setOpenFuncionario}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {getFuncionarioNome(form.funcionario_id)}
                        <Search className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                      <Command>
                        <CommandInput placeholder="Buscar funcionário..." />
                        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                        <CommandList>
                          {Array.isArray(funcionarios) &&
                            funcionarios.map((f) => (
                              <CommandItem
                                key={f.id}
                                value={f.nome}
                                onSelect={() => {
                                  setField("funcionario_id", f.id);
                                  setOpenFuncionario(false);
                                }}
                              >
                                {f.nome}
                              </CommandItem>
                            ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Plano de Contas com busca */}
                <div>
                  <Label>Plano de Contas</Label>
                  <Popover open={openPlano} onOpenChange={setOpenPlano}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {getPlanoNome(form.plano_contas_id)}
                        <Search className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                      <Command>
                        <CommandInput placeholder="Buscar plano..." />
                        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                        <CommandList>
                          {Array.isArray(planos) &&
                            planos.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={p.nome}
                                onSelect={() => {
                                  setField("plano_contas_id", p.id);
                                  setOpenPlano(false);
                                }}
                              >
                                {p.codigo ? `${p.codigo} - ${p.nome}` : p.nome}
                              </CommandItem>
                            ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Competência (AAAA-MM)</Label>
                  <Input
                    type="month"
                    value={form.competencia}
                    onChange={(e) => setField("competencia", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.data_adiantamento}
                    onChange={(e) => setField("data_adiantamento", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={form.valor}
                    onChange={(e) => setField("valor", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                    className="w-full border rounded-md px-2 py-1"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Label>Motivo</Label>
                  <Textarea
                    placeholder="Descreva o motivo do adiantamento"
                    value={form.motivo}
                    onChange={(e) => setField("motivo", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* --- Aba Observações --- */}
            <TabsContent value="obs" className="px-6 py-4 space-y-4">
              <Label>Observações adicionais</Label>
              <Textarea
                rows={8}
                placeholder="Anotações internas, justificativas ou observações relevantes..."
                value={form.observacao}
                onChange={(e) => setField("observacao", e.target.value)}
              />
            </TabsContent>

            {/* --- Aba Histórico --- */}
            <TabsContent value="historico" className="px-6 py-4 text-sm text-slate-600">
              <p>Nenhum histórico disponível no momento.</p>
              <p className="text-slate-500 mt-1">
                (Esta seção pode exibir alterações ou movimentações relacionadas ao adiantamento.)
              </p>
            </TabsContent>
          </Tabs>

          {/* Rodapé fixo */}
          <div className="sticky bottom-0 left-0 right-0 bg-white border-t mt-auto px-6 py-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button type="submit" disabled={!canSave || isSaving}>
              <Save className="mr-2 h-4 w-4" /> {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}