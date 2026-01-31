import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function OcorrenciaPontoModal({ isOpen, onClose, grupo, onSalvo }) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState("justificativa");
  const [descricao, setDescricao] = useState("");
  const [ocorrenciaId, setOcorrenciaId] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen && grupo) {
      if (grupo.ocorr) {
        setTipo(grupo.ocorr.tipo);
        setDescricao(grupo.ocorr.descricao || "");
        setOcorrenciaId(grupo.ocorr.id);
      } else {
        setTipo("justificativa");
        setDescricao("");
        setOcorrenciaId(null);
      }
    }
  }, [isOpen, grupo]);

  const handleSalvar = async () => {
    if (!descricao.trim()) {
      toast({
        title: "Atenção",
        description: "Por favor, informe uma descrição/justificativa.",
        variant: "destructive"
      });
      return;
    }

    setSalvando(true);
    try {
      if (ocorrenciaId) {
        await base44.entities.OcorrenciaPonto.update(ocorrenciaId, {
          tipo,
          descricao
        });
      } else {
        await base44.entities.OcorrenciaPonto.create({
          funcionario_id: grupo.f.id,
          data: grupo.d,
          tipo,
          descricao,
          status: "aprovado"
        });
      }

      toast({
        title: "✅ Sucesso",
        description: "Ocorrência salva com sucesso"
      });

      if (onSalvo) onSalvo();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a ocorrência",
        variant: "destructive"
      });
    } finally {
      setSalvando(false);
    }
  };

  if (!grupo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white -mx-6 -mt-6 px-6 py-4 rounded-t-2xl mb-4">
          <DialogTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Gerenciar Ocorrência
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-1">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="space-y-1 text-xs">
              <div><span className="text-slate-600">Funcionário:</span> <span className="font-bold">{grupo.f.nome}</span></div>
              <div><span className="text-slate-600">Data:</span> <span className="font-bold">{grupo.d}</span></div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Tipo de Ação *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="text-sm h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atestado">🏥 Atestado</SelectItem>
                <SelectItem value="abonado">✅ Abonado</SelectItem>
                <SelectItem value="folga">🏖️ Folga</SelectItem>
                <SelectItem value="ferias">🌴 Férias</SelectItem>
                <SelectItem value="justificativa">📝 Justificativa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Descrição/Justificativa *</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Atestado médico, reunião externa, feriado local, etc..."
              rows={4}
              className="text-sm"
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-900 leading-relaxed">
              <strong>📋 Importante:</strong> As batidas originais nunca são alteradas. 
              Esta ação apenas registra a justificativa/abono para fins de gestão.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={salvando}
            className="flex-1 text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}