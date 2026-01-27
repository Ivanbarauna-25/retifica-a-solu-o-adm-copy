import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, X } from "lucide-react";
import { formatDate } from "@/components/formatters";

export default function VincularEscalaFuncionarioModal({ isOpen, onClose, funcionario, onVinculoFeito }) {
  const [escalas, setEscalas] = useState([]);
  const [vinculos, setVinculos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [formData, setFormData] = useState({
    escala_id: "",
    vigencia_inicio: "",
    vigencia_fim: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && funcionario) {
      carregarDados();
    }
  }, [isOpen, funcionario]);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [escalasList, vinculosList] = await Promise.all([
        base44.entities.EscalaTrabalho.filter({ ativo: true }),
        base44.entities.FuncionarioEscala.filter({ funcionario_id: funcionario.id })
      ]);
      setEscalas((escalasList || []).sort((a, b) => (a?.nome || "").localeCompare(b?.nome || "")));
      setVinculos((vinculosList || []).sort((a, b) => (b?.vigencia_inicio || "").localeCompare(a?.vigencia_inicio || "")));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const validarSobreposicao = () => {
    const novoInicio = new Date(formData.vigencia_inicio);
    const novoFim = formData.vigencia_fim ? new Date(formData.vigencia_fim) : null;

    for (const vinculo of vinculos) {
      const vInicio = new Date(vinculo.vigencia_inicio);
      const vFim = vinculo.vigencia_fim ? new Date(vinculo.vigencia_fim) : null;

      // Verifica sobreposição
      const sobrepoe = (
        (!novoFim || !vFim) || // Algum é aberto
        (novoInicio <= (vFim || new Date("9999-12-31")) && (novoFim || new Date("9999-12-31")) >= vInicio)
      );

      if (sobrepoe && (!vFim || vFim >= novoInicio)) {
        return vinculo;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.escala_id || !formData.vigencia_inicio) {
      toast({ title: "Erro", description: "Escala e data de início são obrigatórios.", variant: "destructive" });
      return;
    }

    const sobreposicao = validarSobreposicao();
    if (sobreposicao) {
      const escalaAtual = escalas.find(e => e.id === sobreposicao.escala_id);
      const confirmacao = window.confirm(
        `Já existe uma escala vigente (${escalaAtual?.nome || "N/A"}) no período informado.\n\n` +
        `Deseja encerrar a escala anterior em ${new Date(new Date(formData.vigencia_inicio).getTime() - 86400000).toISOString().split("T")[0]} e criar a nova?`
      );

      if (!confirmacao) return;

      // Encerrar escala anterior
      const dataFim = new Date(new Date(formData.vigencia_inicio).getTime() - 86400000).toISOString().split("T")[0];
      await base44.entities.FuncionarioEscala.update(sobreposicao.id, { vigencia_fim: dataFim });
    }

    setSalvando(true);
    try {
      await base44.entities.FuncionarioEscala.create({
        funcionario_id: funcionario.id,
        escala_id: formData.escala_id,
        vigencia_inicio: formData.vigencia_inicio,
        vigencia_fim: formData.vigencia_fim || null
      });

      toast({ title: "Sucesso", description: "Escala vinculada ao funcionário." });
      setFormData({ escala_id: "", vigencia_inicio: "", vigencia_fim: "" });
      await carregarDados();
      if (onVinculoFeito) onVinculoFeito();
    } catch (error) {
      console.error("Erro ao vincular escala:", error);
      toast({ title: "Erro", description: error.message || "Erro ao vincular escala.", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const getNomeEscala = (escalaId) => {
    return escalas.find(e => e.id === escalaId)?.nome || "N/A";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl w-[96vw] max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-3 md:px-4 py-2.5 md:py-3 rounded-t-lg">
          <DialogTitle className="text-xs md:text-sm font-bold">
            Escalas de Trabalho - {funcionario?.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 md:py-4 space-y-3 md:space-y-4">
          {/* Formulário de Vínculo */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 md:p-3">
            <h3 className="text-[10px] md:text-xs font-semibold text-slate-900 mb-2 md:mb-3">Vincular Nova Escala</h3>
            <form onSubmit={handleSubmit} className="space-y-2.5 md:space-y-3">
              <div>
                <Label className="text-[10px] md:text-xs font-medium">Escala *</Label>
                <Select value={formData.escala_id} onValueChange={(v) => setFormData(prev => ({ ...prev, escala_id: v }))}>
                  <SelectTrigger className="text-xs h-8 md:h-9">
                    <SelectValue placeholder="Selecione uma escala" />
                  </SelectTrigger>
                  <SelectContent>
                    {escalas.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div>
                  <Label className="text-[10px] md:text-xs font-medium">Início da Vigência *</Label>
                  <Input
                    type="date"
                    value={formData.vigencia_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, vigencia_inicio: e.target.value }))}
                    className="text-xs h-8 md:h-9"
                  />
                </div>
                <div>
                  <Label className="text-[10px] md:text-xs font-medium">Fim da Vigência</Label>
                  <Input
                    type="date"
                    value={formData.vigencia_fim}
                    onChange={(e) => setFormData(prev => ({ ...prev, vigencia_fim: e.target.value }))}
                    className="text-xs h-8 md:h-9"
                  />
                </div>
              </div>

              <Button type="submit" disabled={salvando} className="w-full gap-2 text-[10px] md:text-xs h-8 md:h-9">
                {salvando ? <Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" /> : <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                Vincular Escala
              </Button>
            </form>
          </div>

          {/* Histórico de Vínculos */}
          <div>
            <h3 className="text-[10px] md:text-xs font-semibold text-slate-900 mb-2">Histórico de Escalas</h3>
            {isLoading ? (
              <div className="py-6 md:py-8 text-center">
                <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-slate-600 mx-auto" />
              </div>
            ) : vinculos.length === 0 ? (
              <p className="text-[10px] md:text-xs text-slate-500 text-center py-4 md:py-6 bg-slate-50 rounded-lg border">Nenhuma escala vinculada ainda.</p>
            ) : (
              <>
                {/* Tabela Desktop */}
                <div className="hidden md:block border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-700">
                      <TableRow>
                        <TableHead className="text-white text-xs">Escala</TableHead>
                        <TableHead className="text-white text-xs">Início</TableHead>
                        <TableHead className="text-white text-xs">Fim</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vinculos.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="text-xs font-medium">{getNomeEscala(v.escala_id)}</TableCell>
                          <TableCell className="text-xs">{formatDate(v.vigencia_inicio)}</TableCell>
                          <TableCell className="text-xs">{v.vigencia_fim ? formatDate(v.vigencia_fim) : <span className="text-green-600 font-medium">Em vigor</span>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Cards Mobile */}
                <div className="md:hidden space-y-2">
                  {vinculos.map(v => (
                    <div key={v.id} className="bg-white border rounded-lg p-2.5">
                      <div className="flex items-start justify-between mb-1.5">
                        <h4 className="font-medium text-xs text-slate-900">{getNomeEscala(v.escala_id)}</h4>
                        {!v.vigencia_fim && (
                          <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Em vigor</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-600 space-y-0.5">
                        <div>📅 Início: {formatDate(v.vigencia_inicio)}</div>
                        {v.vigencia_fim && <div>🏁 Fim: {formatDate(v.vigencia_fim)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t bg-slate-50 px-3 md:px-4 py-2.5 md:py-3 rounded-b-lg">
          <Button variant="outline" onClick={onClose} className="w-full gap-2 text-[10px] md:text-xs h-8 md:h-9">
            <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}