import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Upload,
  FileText,
  CheckCircle2,
  X,
  Loader2,
  Save,
  Eye,
  AlertCircle
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import { validarLote } from "./ValidadorPonto";

export default function ImportarPontoModal({ isOpen, onClose, onImportado }) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [arquivo, setArquivo] = useState(null);
  const [conteudoColado, setConteudoColado] = useState("");
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [preview, setPreview] = useState(null);
  const [progresso, setProgresso] = useState(0);
  const [registrosEditaveis, setRegistrosEditaveis] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [validacoes, setValidacoes] = useState(null);

  /* ================= RESET ================= */
  const resetTudo = () => {
    setArquivo(null);
    setConteudoColado("");
    setPreview(null);
    setRegistrosEditaveis([]);
    setProcessando(false);
    setSalvando(false);
    setProgresso(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const temEntrada = useMemo(
    () => Boolean((conteudoColado || "").trim() || arquivo),
    [conteudoColado, arquivo]
  );

  /* ================= PARSERS ================= */
  const parseTXT = (conteudo) =>
    conteudo
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => {
        const [enNo, , dateTime] = l.split(/\s+/);
        return { enNo, dateTime, raw: l };
      })
      .filter(r => r.enNo && r.dateTime);

  const parseXLSX = (buffer) => {
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    return rows
      .map(r => ({
        enNo: String(r.EnNo || r.EmpNo || "").trim(),
        dateTime: String(r.DateTime || r.CheckTime || "").trim(),
        raw: JSON.stringify(r)
      }))
      .filter(r => r.enNo && r.dateTime);
  };

  const normalizar = (registros, funcs) =>
    registros.map(r => {
      const funcionario = funcs.find(
        f => String(f.user_id_relogio).trim() === String(r.enNo).trim()
      );

      const dt = new Date(r.dateTime.replace(/\//g, "-"));
      if (isNaN(dt)) {
        return { ...r, valido: false, motivo_invalido: "Data inválida" };
      }

      return {
        funcionario_id: funcionario?.id || null,
        user_id_relogio: r.enNo,
        data: dt.toISOString().substring(0, 10),
        hora: dt.toISOString().substring(11, 19),
        data_hora: dt.toISOString(),
        valido: !!funcionario,
        motivo_invalido: funcionario ? null : "Funcionário não vinculado",
        raw_linha: r.raw
      };
    });

  /* ================= PROCESSAR ================= */
  const processarArquivo = async () => {
    if (!temEntrada) return;

    setProcessando(true);
    setProgresso(20);

    try {
      const funcs = await base44.entities.Funcionario.list();
      setFuncionarios(funcs);

      let registros = [];
      if (arquivo) {
        const reader = new FileReader();
        const content = await new Promise(res => {
          reader.onload = e => res(e.target.result);
          reader.readAsArrayBuffer(arquivo);
        });
        registros = arquivo.name.endsWith(".txt")
          ? parseTXT(new TextDecoder().decode(content))
          : parseXLSX(content);
      } else {
        registros = parseTXT(conteudoColado);
      }

      const normalizados = normalizar(registros, funcs);
      const validacao = validarLote(normalizados);

      setValidacoes(validacao);
      setRegistrosEditaveis(normalizados);
      setPreview({ total: normalizados.length });
      setProgresso(100);

      toast({ title: "Preview gerado com sucesso" });
    } catch (e) {
      toast({
        title: "Erro",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setProcessando(false);
    }
  };

  /* ================= IMPORTAR ================= */
  const confirmarImportacao = async () => {
    const validos = registrosEditaveis.filter(r => r.valido);
    if (!validos.length) return;

    setSalvando(true);
    setProgresso(0);

    for (let i = 0; i < validos.length; i++) {
      await base44.entities.PontoRegistro.create(validos[i]);
      setProgresso(Math.round(((i + 1) / validos.length) * 100));
    }

    toast({ title: "Importação concluída" });

    /* ✅ FECHAMENTO AUTOMÁTICO */
    setTimeout(() => {
      setSalvando(false);
      resetTudo();
      if (onImportado) onImportado();
      onClose();
    }, 1300);
  };

  /* ================= UI ================= */
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="
          max-w-7xl w-full
          max-h-[90vh]
          rounded-2xl
          shadow-2xl
          p-0
          overflow-hidden
        "
      >
        <DialogHeader className="bg-slate-800 text-white px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              {preview ? "Revisar Importação" : "Importar Batidas"}
            </DialogTitle>
            <Button variant="ghost" onClick={onClose}>
              <X />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50">
          {!preview ? (
            <>
              <Tabs defaultValue="arquivo">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="arquivo">Arquivo</TabsTrigger>
                  <TabsTrigger value="colar">Colar</TabsTrigger>
                </TabsList>

                <TabsContent value="arquivo" className="pt-4">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.xls,.xlsx"
                    onChange={e => setArquivo(e.target.files[0])}
                  />
                </TabsContent>

                <TabsContent value="colar" className="pt-4">
                  <Textarea
                    rows={10}
                    className="font-mono"
                    value={conteudoColado}
                    onChange={e => setConteudoColado(e.target.value)}
                  />
                </TabsContent>
              </Tabs>

              <Button
                onClick={processarArquivo}
                disabled={!temEntrada || processando}
                className="w-full bg-blue-600"
              >
                {processando ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <Eye className="mr-2" />
                )}
                Gerar Preview
              </Button>

              {processando && <Progress value={progresso} />}
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <div className="text-sm">
                  Total registros:{" "}
                  <strong>{registrosEditaveis.length}</strong>
                </div>
                <Button
                  onClick={confirmarImportacao}
                  className="bg-green-600"
                  disabled={salvando}
                >
                  {salvando ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <Save className="mr-2" />
                  )}
                  Confirmar Importação
                </Button>
              </div>

              {salvando && <Progress value={progresso} />}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}