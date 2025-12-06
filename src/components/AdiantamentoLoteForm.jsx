import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Settings, DollarSign, Save, X, Calendar, Percent, BadgeCheck, User, Briefcase } from "lucide-react";
import { formatCurrency } from "@/components/formatters";

export default function AdiantamentoLoteForm({
  isOpen,
  funcionarios,
  planos,
  onSave,
  onClose,
}) {
  const [valor, setValor] = useState(0);
  const [dataPagamento, setDataPagamento] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [descricao, setDescricao] = useState("");
  const [planoContasId, setPlanoContasId] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState("configuracao");

  const todosSelecionados = useMemo(() => {
    return funcionarios.length > 0 && funcionarios.every((f) => selectedIds.has(f.id));
  }, [funcionarios, selectedIds]);

  const toggleSelectAll = (checked) => {
    const isChecked = !!checked;
    const novoSet = new Set(selectedIds);
    if (isChecked) {
      funcionarios.forEach((f) => novoSet.add(f.id));
    } else {
      funcionarios.forEach((f) => novoSet.delete(f.id));
    }
    setSelectedIds(novoSet);
  };

  const toggleOne = (id, checked) => {
    const isChecked = !!checked;
    const novoSet = new Set(selectedIds);
    if (isChecked) novoSet.add(id);
    else novoSet.delete(id);
    setSelectedIds(novoSet);
  };

  const totalPagamento = useMemo(() => {
    const perc = Number(valor) || 0;
    return funcionarios
      .filter((f) => selectedIds.has(f.id))
      .reduce((acc, f) => {
        const sal = Number(f?.salario) || 0;
        return acc + (sal * perc / 100);
      }, 0);
  }, [funcionarios, selectedIds, valor]);

  const handleGenerate = () => {
    if (!dataPagamento) {
      alert("Informe a data do adiantamento.");
      return;
    }
    if (!competencia) {
      alert("Informe a competência.");
      return;
    }
    if (selectedIds.size === 0) {
      alert("Selecione pelo menos um funcionário.");
      return;
    }
    const perc = Number(valor) || 0;

    const registros = funcionarios
      .filter((f) => selectedIds.has(f.id))
      .map((f) => {
        const sal = Number(f?.salario) || 0;
        const valorAdiantamento = Number(((sal * perc) / 100).toFixed(2));

        return {
          funcionario_id: f.id,
          plano_contas_id: planoContasId || undefined,
          competencia,
          data_adiantamento: dataPagamento,
          valor: valorAdiantamento,
          motivo: descricao || "Adiantamento em lote",
          status: "pendente"
        };
      });

    onSave(registros);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setValor(0);
      setDataPagamento("");
      setCompetencia("");
      setDescricao("");
      setPlanoContasId("");
      setSelectedIds(new Set());
      setActiveTab("configuracao");
    }
  }, [isOpen]);

  return (
    <>
      <style>{`
        .adiantamento-lote-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .adiantamento-lote-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .adiantamento-lote-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .adiantamento-lote-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 4px;
          }
          .adiantamento-lote-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .adiantamento-lote-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .adiantamento-lote-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .adiantamento-lote-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .adiantamento-lote-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .adiantamento-lote-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-4xl max-h-[85vh] overflow-hidden modern-modal bg-white border-2 border-slate-800 shadow-2xl flex flex-col p-0" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white no-print border-b border-slate-600">
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Users className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-base md:text-lg font-semibold">Gerar Adiantamento em Lote</p>
                <p className="text-xs text-slate-300 font-normal">Crie adiantamentos para múltiplos funcionários</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div onClick={(e) => e.stopPropagation()} className="adiantamento-lote-scroll flex-1 px-4 md:px-6 pb-4 md:pb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="bg-slate-200 p-1 rounded-xl grid grid-cols-2 gap-1 mb-4 md:mb-6 sticky top-0 z-10 shadow-inner">
                <TabsTrigger 
                  value="configuracao" 
                  className="TabsTrigger rounded-lg bg-white/50 border-2 border-transparent data-[state=active]:border-slate-800 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-700 hover:text-black hover:bg-white data-[state=active]:shadow-md flex items-center justify-center gap-2 transition-all text-sm font-bold py-2"
                >
                  <Settings className="w-4 h-4" /> Configuração
                </TabsTrigger>
                <TabsTrigger 
                  value="funcionarios" 
                  className="TabsTrigger rounded-lg bg-white/50 border-2 border-transparent data-[state=active]:border-slate-800 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-700 hover:text-black hover:bg-white data-[state=active]:shadow-md flex items-center justify-center gap-2 transition-all text-sm font-bold py-2"
                >
                  <Users className="w-4 h-4" /> Funcionários ({selectedIds.size}/{funcionarios.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="configuracao" className="space-y-4 md:space-y-5 pt-2 animate-in fade-in duration-300">
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 md:p-6 shadow-sm">
                  <h3 className="font-semibold text-black mb-4 md:mb-5 flex items-center gap-2 text-sm md:text-base">
                    <Settings className="w-4 h-4 md:w-5 md:h-5 text-slate-600" /> Dados do Adiantamento
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <div>
                      <Label htmlFor="valor" className="text-sm font-medium text-black mb-2 flex items-center gap-2">
                        <Percent className="w-4 h-4 text-slate-500" /> Percentual do Salário (%)
                      </Label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="valor"
                          type="number"
                          step={0.01}
                          min={0}
                          max={100}
                          value={valor}
                          onChange={(e) => setValor(e.target.value)}
                          className="modern-input text-black border border-slate-400 shadow-sm pl-10"
                          placeholder="Ex: 40 para 40%"
                        />
                      </div>
                      <p className="text-xs text-black mt-2">
                        Informe o percentual do salário para adiantamento (ex: 40 para 40%)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="competencia" className="text-sm font-medium text-black mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" /> Competência (AAAA-MM)
                      </Label>
                      <Input
                        id="competencia"
                        type="month"
                        value={competencia}
                        onChange={(e) => setCompetencia(e.target.value)}
                        className="modern-input text-black border border-slate-400 shadow-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="dataPagamento" className="text-sm font-medium text-black mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" /> Data do Adiantamento
                      </Label>
                      <Input
                        id="dataPagamento"
                        type="date"
                        value={dataPagamento}
                        onChange={(e) => setDataPagamento(e.target.value)}
                        className="modern-input text-black border border-slate-400 shadow-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="planoContasId" className="text-sm font-medium text-black mb-2">Plano de Contas</Label>
                      <select
                        id="planoContasId"
                        value={planoContasId}
                        onChange={(e) => setPlanoContasId(e.target.value)}
                        className="modern-input text-black border border-slate-400 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        {planos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.codigo ? `${p.codigo} - ${p.nome}` : p.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="descricao" className="text-sm font-medium text-black mb-2">Motivo</Label>
                      <Input
                        id="descricao"
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        className="modern-input text-black border border-slate-400 shadow-sm"
                        placeholder="Ex: Adiantamento salarial"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-slate-400 bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-lg">
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <DollarSign className="w-4 h-4 text-black" />
                      <p className="text-xs font-bold text-black uppercase tracking-wide">Total a Pagar</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-black">{formatCurrency(totalPagamento)}</p>
                    <div className="flex items-center justify-center gap-1 text-black">
                      <BadgeCheck className="w-3 h-3" />
                      <p className="text-xs">{selectedIds.size} funcionário(s) selecionado(s)</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="funcionarios" className="space-y-4 md:space-y-5 pt-2 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 p-3 md:p-4 bg-slate-100 rounded-xl border border-slate-200">
                  <Checkbox
                    id="checkAll"
                    checked={todosSelecionados}
                    onCheckedChange={(checked) => toggleSelectAll(checked)}
                    className="rounded"
                  />
                  <Label htmlFor="checkAll" className="cursor-pointer font-medium flex items-center gap-2 text-black text-sm md:text-base">
                    <Users className="w-4 h-4" />
                    Selecionar Todos ({funcionarios.length} funcionários)
                  </Label>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="max-h-[350px] md:max-h-[450px] overflow-y-auto">
                    {funcionarios.length === 0 ? (
                      <div className="p-8 md:p-12 text-center text-slate-500">
                        <Users className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 text-slate-300" />
                        <p className="font-medium text-black text-sm md:text-base">Nenhum funcionário encontrado</p>
                        <p className="text-xs md:text-sm mt-1 text-black">Cadastre funcionários para gerar adiantamentos em lote</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {funcionarios.map((f) => {
                          const isChecked = selectedIds.has(f.id);
                          const valorCalculado = (Number(f?.salario || 0) * Number(valor || 0)) / 100;
                          
                          return (
                            <li
                              key={f.id}
                              className={`flex items-center justify-between p-3 md:p-4 hover:bg-slate-50 cursor-pointer transition-all ${
                                isChecked ? 'bg-slate-100 border-l-4 border-l-slate-700' : ''
                              }`}
                              onClick={() => toggleOne(f.id, !isChecked)}
                            >
                              <div className="flex items-center gap-3 md:gap-4 flex-1">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => toggleOne(f.id, checked)}
                                  className="rounded"
                                />
                                <div className="flex items-center gap-2 md:gap-3 flex-1">
                                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${
                                    isChecked ? 'bg-slate-200' : 'bg-slate-100'
                                  }`}>
                                    <User className={`w-4 h-4 md:w-5 md:h-5 ${isChecked ? 'text-slate-700' : 'text-slate-400'}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-semibold truncate text-sm md:text-base ${isChecked ? 'text-black' : 'text-black'}`}>
                                      {f.nome}
                                    </p>
                                    <div className="flex gap-2 md:gap-4 text-xs text-black mt-1">
                                      <span className="flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" />
                                        Salário: {formatCurrency(f.salario || 0)}
                                      </span>
                                      {f.cargo_id && (
                                        <span className="flex items-center gap-1">
                                          <Briefcase className="w-3 h-3" />
                                          {f.funcao || 'Cargo não informado'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {isChecked && valorCalculado > 0 && (
                                <div className="text-right ml-2 md:ml-4">
                                  <p className="text-xs text-black mb-1">Adiantamento</p>
                                  <p className="font-bold text-black text-base md:text-lg">{formatCurrency(valorCalculado)}</p>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-white">
            <div className="text-xs md:text-sm text-black flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <DollarSign className="w-4 h-4 text-black" />
                  <span>
                    Total: <strong className="text-black text-sm md:text-base">{formatCurrency(totalPagamento)}</strong> para{' '}
                    <strong>{selectedIds.size}</strong> funcionário(s)
                  </span>
                </>
              )}
            </div>
            <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
              >
                <X className="w-4 h-4" /> Cancelar
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleGenerate();
                }}
                className="bg-slate-800 text-gray-50 px-4 py-2 text-sm font-bold opacity-100 rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:text-accent-foreground h-10 border-2 border-slate-800 hover:bg-slate-50 gap-2"
              >
                <Save className="w-4 h-4" /> Gerar Adiantamentos
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}