import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const DIAS_SEMANA = [
  { value: "1", label: "Segunda" },
  { value: "2", label: "Terça" },
  { value: "3", label: "Quarta" },
  { value: "4", label: "Quinta" },
  { value: "5", label: "Sexta" },
  { value: "6", label: "Sábado" },
  { value: "7", label: "Domingo" }
];

export default function EscalaForm({ escala, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "fixa",
    dias_semana: "1,2,3,4,5",
    hora_entrada_prevista: "08:00",
    hora_saida_prevista: "17:00",
    intervalo_inicio_previsto: "12:00",
    intervalo_fim_previsto: "13:00",
    tolerancia_minutos: 5,
    carga_diaria_minutos: 480,
    ativo: true
  });

  const [diasSelecionados, setDiasSelecionados] = useState(["1", "2", "3", "4", "5"]);
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (escala) {
      setFormData({
        nome: escala.nome || "",
        tipo: escala.tipo || "fixa",
        dias_semana: escala.dias_semana || "1,2,3,4,5",
        hora_entrada_prevista: escala.hora_entrada_prevista || "08:00",
        hora_saida_prevista: escala.hora_saida_prevista || "17:00",
        intervalo_inicio_previsto: escala.intervalo_inicio_previsto || "",
        intervalo_fim_previsto: escala.intervalo_fim_previsto || "",
        tolerancia_minutos: escala.tolerancia_minutos || 5,
        carga_diaria_minutos: escala.carga_diaria_minutos || 480,
        ativo: escala.ativo !== false
      });
      setDiasSelecionados((escala.dias_semana || "1,2,3,4,5").split(",").filter(Boolean));
    }
  }, [escala]);

  const handleDiaChange = (dia, checked) => {
    let novos = [...diasSelecionados];
    if (checked) {
      if (!novos.includes(dia)) novos.push(dia);
    } else {
      novos = novos.filter(d => d !== dia);
    }
    setDiasSelecionados(novos);
    setFormData(prev => ({ ...prev, dias_semana: novos.sort().join(",") }));
  };

  const calcularCargaDiaria = () => {
    const entrada = formData.hora_entrada_prevista;
    const saida = formData.hora_saida_prevista;
    const intervaloInicio = formData.intervalo_inicio_previsto;
    const intervaloFim = formData.intervalo_fim_previsto;

    if (!entrada || !saida) return;

    const [hE, mE] = entrada.split(":").map(Number);
    const [hS, mS] = saida.split(":").map(Number);

    let totalMin = (hS * 60 + mS) - (hE * 60 + mE);

    if (intervaloInicio && intervaloFim) {
      const [hII, mII] = intervaloInicio.split(":").map(Number);
      const [hIF, mIF] = intervaloFim.split(":").map(Number);
      const intervaloMin = (hIF * 60 + mIF) - (hII * 60 + mII);
      totalMin -= intervaloMin;
    }

    if (totalMin > 0) {
      setFormData(prev => ({ ...prev, carga_diaria_minutos: totalMin }));
    }
  };

  const validar = () => {
    if (!formData.nome?.trim()) {
      toast({ title: "Erro", description: "Nome da escala é obrigatório.", variant: "destructive" });
      return false;
    }

    if (!formData.hora_entrada_prevista || !formData.hora_saida_prevista) {
      toast({ title: "Erro", description: "Horários de entrada e saída são obrigatórios.", variant: "destructive" });
      return false;
    }

    const [hE, mE] = formData.hora_entrada_prevista.split(":").map(Number);
    const [hS, mS] = formData.hora_saida_prevista.split(":").map(Number);
    if ((hS * 60 + mS) <= (hE * 60 + mE)) {
      toast({ title: "Erro", description: "Horário de saída deve ser posterior à entrada.", variant: "destructive" });
      return false;
    }

    if (formData.intervalo_inicio_previsto && formData.intervalo_fim_previsto) {
      const [hII, mII] = formData.intervalo_inicio_previsto.split(":").map(Number);
      const [hIF, mIF] = formData.intervalo_fim_previsto.split(":").map(Number);
      if ((hIF * 60 + mIF) <= (hII * 60 + mII)) {
        toast({ title: "Erro", description: "Fim do intervalo deve ser posterior ao início.", variant: "destructive" });
        return false;
      }
    }

    if (!formData.carga_diaria_minutos || formData.carga_diaria_minutos <= 0) {
      toast({ title: "Erro", description: "Carga diária deve ser maior que zero.", variant: "destructive" });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Erro ao salvar escala:", error);
      toast({ title: "Erro", description: error.message || "Erro ao salvar escala.", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-xs font-medium">Nome da Escala *</Label>
        <Input
          value={formData.nome}
          onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
          placeholder="Ex: Expediente Normal"
          className="text-sm"
        />
      </div>

      <div>
        <Label className="text-xs font-medium">Tipo</Label>
        <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixa">Fixa</SelectItem>
            <SelectItem value="semanal">Semanal</SelectItem>
            <SelectItem value="turno">Turno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Dias da Semana</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia.value} className="flex items-center gap-2">
              <Checkbox
                checked={diasSelecionados.includes(dia.value)}
                onCheckedChange={(checked) => handleDiaChange(dia.value, checked)}
              />
              <Label className="text-xs cursor-pointer">{dia.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Entrada *</Label>
          <Input
            type="time"
            value={formData.hora_entrada_prevista}
            onChange={(e) => setFormData(prev => ({ ...prev, hora_entrada_prevista: e.target.value }))}
            onBlur={calcularCargaDiaria}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs font-medium">Saída *</Label>
          <Input
            type="time"
            value={formData.hora_saida_prevista}
            onChange={(e) => setFormData(prev => ({ ...prev, hora_saida_prevista: e.target.value }))}
            onBlur={calcularCargaDiaria}
            className="text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Intervalo Início</Label>
          <Input
            type="time"
            value={formData.intervalo_inicio_previsto}
            onChange={(e) => setFormData(prev => ({ ...prev, intervalo_inicio_previsto: e.target.value }))}
            onBlur={calcularCargaDiaria}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs font-medium">Intervalo Fim</Label>
          <Input
            type="time"
            value={formData.intervalo_fim_previsto}
            onChange={(e) => setFormData(prev => ({ ...prev, intervalo_fim_previsto: e.target.value }))}
            onBlur={calcularCargaDiaria}
            className="text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Tolerância (minutos)</Label>
          <Input
            type="number"
            value={formData.tolerancia_minutos}
            onChange={(e) => setFormData(prev => ({ ...prev, tolerancia_minutos: parseInt(e.target.value) || 0 }))}
            min="0"
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs font-medium">Carga Diária (minutos) *</Label>
          <Input
            type="number"
            value={formData.carga_diaria_minutos}
            onChange={(e) => setFormData(prev => ({ ...prev, carga_diaria_minutos: parseInt(e.target.value) || 0 }))}
            min="1"
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={formData.ativo}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
        />
        <Label className="text-xs cursor-pointer">Escala ativa</Label>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="text-xs">
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando} className="gap-2 text-xs">
          {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {escala ? "Atualizar" : "Criar"} Escala
        </Button>
      </div>
    </form>
  );
}