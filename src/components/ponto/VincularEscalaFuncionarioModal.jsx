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
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-3 rounded-t-lg">
          <DialogTitle className="text-sm md:text-base font-bold">
            Escalas de Trabalho - {funcionario?.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Formulário de Vínculo */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-slate-900 mb-3">Vincular Nova Escala</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Escala *</Label>
                <Select value={formData.escala_id} onValueChange={(v) => setFormData(prev => ({ ...prev, escala_id: v }))}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione uma escala" />
                  </SelectTrigger>
                  <SelectContent>
                    {escalas.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Início da Vigência *</Label>
                  <Input
                    type="date"
                    value={formData.vigencia_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, vigencia_inicio: e.target.value }))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Fim da Vigência</Label>
                  <Input
                    type="date"
                    value={formData.vigencia_fim}
                    onChange={(e) => setFormData(prev => ({ ...prev, vigencia_fim: e.target.value }))}
                    className="text-xs"
                  />
                </div>
              </div>

              <Button type="submit" disabled={salvando} className="w-full gap-2 text-xs">
                {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Vincular Escala
              </Button>
            </form>
          </div>

          {/* Histórico de Vínculos */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 mb-2">Histórico de Escalas</h3>
            {isLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
              </div>
            ) : vinculos.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Nenhuma escala vinculada ainda.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
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
                        <TableCell className="text-xs">{v.vigencia_fim ? formatDate(v.vigencia_fim) : "Em vigor"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t bg-slate-50 px-4 py-3 rounded-b-lg">
          <Button variant="outline" onClick={onClose} className="w-full gap-2 text-xs">
            <X className="w-3.5 h-3.5" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}