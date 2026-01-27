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
    ativo: true,
    escala_padrao: false
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
        ativo: escala.ativo !== false,
        escala_padrao: escala.escala_padrao || false
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
    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 px-1">
      <div>
        <Label className="text-[10px] md:text-xs font-medium">Nome da Escala *</Label>
        <Input
          value={formData.nome}
          onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
          placeholder="Ex: Expediente Normal"
          className="text-xs md:text-sm h-8 md:h-9"
        />
      </div>

      <div>
        <Label className="text-[10px] md:text-xs font-medium">Tipo</Label>
        <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}>
          <SelectTrigger className="text-xs md:text-sm h-8 md:h-9">
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
        <Label className="text-[10px] md:text-xs font-medium mb-2 block">Dias da Semana</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia.value} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
              <Checkbox
                id={`dia-${dia.value}`}
                checked={diasSelecionados.includes(dia.value)}
                onCheckedChange={(checked) => handleDiaChange(dia.value, checked)}
              />
              <Label htmlFor={`dia-${dia.value}`} className="text-[10px] md:text-xs cursor-pointer flex-1">{dia.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-lg border space-y-3">
        <h4 className="text-[10px] md:text-xs font-semibold text-slate-700">Horários</h4>
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div>
            <Label className="text-[10px] md:text-xs font-medium">Entrada *</Label>
            <Input
              type="time"
              value={formData.hora_entrada_prevista}
              onChange={(e) => setFormData(prev => ({ ...prev, hora_entrada_prevista: e.target.value }))}
              onBlur={calcularCargaDiaria}
              className="text-xs md:text-sm h-8 md:h-9"
            />
          </div>
          <div>
            <Label className="text-[10px] md:text-xs font-medium">Saída *</Label>
            <Input
              type="time"
              value={formData.hora_saida_prevista}
              onChange={(e) => setFormData(prev => ({ ...prev, hora_saida_prevista: e.target.value }))}
              onBlur={calcularCargaDiaria}
              className="text-xs md:text-sm h-8 md:h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div>
            <Label className="text-[10px] md:text-xs font-medium">Intervalo Início</Label>
            <Input
              type="time"
              value={formData.intervalo_inicio_previsto}
              onChange={(e) => setFormData(prev => ({ ...prev, intervalo_inicio_previsto: e.target.value }))}
              onBlur={calcularCargaDiaria}
              className="text-xs md:text-sm h-8 md:h-9"
            />
          </div>
          <div>
            <Label className="text-[10px] md:text-xs font-medium">Intervalo Fim</Label>
            <Input
              type="time"
              value={formData.intervalo_fim_previsto}
              onChange={(e) => setFormData(prev => ({ ...prev, intervalo_fim_previsto: e.target.value }))}
              onBlur={calcularCargaDiaria}
              className="text-xs md:text-sm h-8 md:h-9"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-3">
        <div>
          <Label className="text-[10px] md:text-xs font-medium">Tolerância (min)</Label>
          <Input
            type="number"
            value={formData.tolerancia_minutos}
            onChange={(e) => setFormData(prev => ({ ...prev, tolerancia_minutos: parseInt(e.target.value) || 0 }))}
            min="0"
            className="text-xs md:text-sm h-8 md:h-9"
          />
        </div>
        <div>
          <Label className="text-[10px] md:text-xs font-medium">Carga Diária (min) *</Label>
          <Input
            type="number"
            value={formData.carga_diaria_minutos}
            onChange={(e) => setFormData(prev => ({ ...prev, carga_diaria_minutos: parseInt(e.target.value) || 0 }))}
            min="1"
            className="text-xs md:text-sm h-8 md:h-9"
            readOnly
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
          <Checkbox
            id="escala-ativa"
            checked={formData.ativo}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
          />
          <Label htmlFor="escala-ativa" className="text-[10px] md:text-xs cursor-pointer font-medium">Escala ativa</Label>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <Checkbox
            id="escala-padrao"
            checked={formData.escala_padrao}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, escala_padrao: checked }))}
          />
          <Label htmlFor="escala-padrao" className="text-[10px] md:text-xs cursor-pointer font-medium">
            Definir como escala padrão para novos funcionários
          </Label>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="text-[10px] md:text-xs h-8 md:h-9 flex-1 md:flex-initial">
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando} className="gap-2 text-[10px] md:text-xs h-8 md:h-9 flex-1 md:flex-initial">
          {salvando && <Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" />}
          {escala ? "Atualizar" : "Criar"} Escala
        </Button>
      </div>
    </form>
  );
}