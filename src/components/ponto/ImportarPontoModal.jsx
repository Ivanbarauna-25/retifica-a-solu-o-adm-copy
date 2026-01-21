import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Upload,
  FileText,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  Download,
  Eye
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ImportarPontoModal({ isOpen, onClose, onImportado }) {
  const [arquivo, setArquivo] = useState(null);
  const [conteudoColado, setConteudoColado] = useState("");
  const [processando, setProcessando] = useState(false);
  const [gerandoPreview, setGerandoPreview] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewGerado, setPreviewGerado] = useState(false);

  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const resetTudo = () => {
    setArquivo(null);
    setConteudoColado("");
    setPreview(null);
    setPreviewGerado(false);
    setProcessando(false);
    setGerandoPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isTextLikeFile = (file) => {
    const name = (file?.name || "").toLowerCase();
    return name.endsWith(".txt") || name.endsWith(".xml");
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setConteudoColado("");
    setPreview(null);
    setPreviewGerado(false);
  };

  const temEntrada = useMemo(() => {
    return Boolean((conteudoColado || "").trim() || arquivo);
  }, [conteudoColado, arquivo]);

  const gerarPayloadPreview = async () => {
    // 1) Conteúdo colado (TXT/XML)
    if ((conteudoColado || "").trim()) {
      return {
        input_type: "PASTE",
        text_content: conteudoColado,
        file_name: "conteudo_colado.txt"
      };
    }

    // 2) Arquivo
    if (!arquivo) {
      throw new Error("Selecione um arquivo ou cole o conteúdo.");
    }

    // TXT / XML (texto)
    if (isTextLikeFile(arquivo)) {
      const text = await arquivo.text();
      return {
        input_type: "FILE_TEXT",
        text_content: text,
        file_name: arquivo.name
      };
    }

    // XLS / XLSX (binário)
    const file_base64 = await readFileAsBase64(arquivo);
    return {
      input_type: "FILE_BINARY",
      file_base64,
      file_name: arquivo.name,
      mime_type: arquivo.type || null
    };
  };

  const gerarPreview = async () => {
    if (!temEntrada) {
      toast({
        title: "Atenção",
        description: "Selecione um arquivo ou cole o conteúdo.",
        variant: "destructive"
      });
      return;
    }

    setGerandoPreview(true);
    setPreview(null);

    try {
      const payload = await gerarPayloadPreview();

      // CORREÇÃO: preview tem que chamar função de preview, não de processamento/salvamento
      const { data } = await base44.functions.invoke("gerarPreviewImportacaoPonto", payload);

      if (!data?.success) {
        toast({
          title: "Erro no preview",
          description: data?.error || "Formato não reconhecido ou falha ao processar.",
          variant: "destructive"
        });
        return;
      }

      setPreview(data);
      setPreviewGerado(true);

      const total = data?.stats?.total_lidos ?? data?.total_lidos ?? 0;
      const formato = data?.formato_detectado ?? data?.detected_format ?? "desconhecido";

      toast({
        title: "Preview gerado",
        description: `${total} registros lidos. Formato: ${formato}`
      });
    } catch (error) {
      console.error("Erro ao gerar preview:", error);
      toast({
        title: "Erro",
        description: error?.message || "Falha ao gerar preview",
        variant: "destructive"
      });
    } finally {
      setGerandoPreview(false);
    }
  };

  const confirmarImportacao = async () => {
    if (!previewGerado || !preview) {
      toast({
        title: "Preview necessário",
        description: "Clique em “Gerar Preview” antes de confirmar.",
        variant: "destructive"
      });
      return;
    }

    // Recomendado: confirmar via importacao_temp_id
    // Caso seu backend ainda retorne apenas registros_normalizados, adapte no backend para gerar temp_id.
    const importacaoTempId = preview?.importacao_temp_id || preview?.temp_id || null;

    if (!importacaoTempId) {
      toast({
        title: "Backend incompleto",
        description:
          "O preview não retornou importacao_temp_id. Ajuste o backend para retornar um ID temporário de preview e confirmar por ele.",
        variant: "destructive"
      });
      return;
    }

    setProcessando(true);
    try {
      const { data } = await base44.functions.invoke("confirmarImportacaoPonto", {
        importacao_temp_id: importacaoTempId
      });

      if (!data?.success) {
        toast({
          title: "Erro na importação",
          description: data?.error || data?.mensagem || "Falha ao salvar registros",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Importação concluída",
        description: data?.message || "Registros importados com sucesso."
      });

      resetTudo();
      if (onImportado) onImportado();
      onClose();
    } catch (error) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro na importação",
        description: error?.message || "Falha ao confirmar importação",
        variant: "destructive"
      });
    } finally {
      setProcessando(false);
    }
  };

  const baixarLog = () => {
    const log = preview?.log_erros || preview?.log || "";
    if (!log) {
      toast({
        title: "Sem log",
        description: "Não há log disponível nesta importação.",
        variant: "destructive"
      });
      return;
    }

    const blob = new Blob([log], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `log_importacao_ponto_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = preview?.stats || {};
  const totalLidos = stats.total_lidos ?? preview?.total_lidos ?? 0;
  const totalValidos = stats.total_validos ?? preview?.total_validos ?? 0;
  const totalInvalidos = stats.total_invalidos ?? preview?.total_invalidos ?? 0;
  const periodoInicio = stats.periodo_inicio ?? preview?.periodo_inicio ?? "N/A";
  const periodoFim = stats.periodo_fim ?? preview?.periodo_fim ?? "N/A";
  const formatoDetectado = preview?.formato_detectado ?? preview?.detected_format ?? "N/A";
  const idsSemMapeamento = preview?.ids_sem_mapeamento || stats?.ids_sem_mapeamento || [];
  const previewRows = preview?.preview || preview?.preview_rows || [];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetTudo();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl w-[96vw] sm:w-[90vw] md:w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-3 sm:px-5 sm:py-4 rounded-t-lg sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm sm:text-base md:text-lg font-bold flex items-center gap-2">
              <div className="bg-slate-600 p-1.5 sm:p-2 rounded-lg">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span>Importar Batidas do Relógio</span>
            </DialogTitle>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetTudo();
                onClose();
              }}
              className="text-white hover:bg-slate-600 h-7 w-7 sm:h-8 sm:w-8 p-0"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4 space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm text-blue-900 font-semibold mb-1">
                  Formatos suportados
                </p>
                <p className="text-[10px] sm:text-xs text-blue-800">
                  <strong>TXT:</strong> AttendLog (ACL.001.TXT) com colunas TAB (EnNo, Name, DateTime...)<br />
                  <strong>XML:</strong> export do relógio (caso exista) <br />
                  <strong>Excel:</strong> RegistroPresença.xls / Relatórios do relógio
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="arquivo" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="arquivo" className="text-xs">
                Upload de Arquivo
              </TabsTrigger>
              <TabsTrigger value="colar" className="text-xs">
                Colar Conteúdo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="arquivo" className="space-y-3 mt-3">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-slate-400 transition-colors bg-slate-50">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.xml,.xls,.xlsx"
                  onChange={handleFileChange}
                  className="text-xs sm:text-sm cursor-pointer file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
                />
                {arquivo && (
                  <div className="mt-3 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-green-700 font-medium truncate">
                      {arquivo.name}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="colar" className="space-y-3 mt-3">
              <div className="border-2 border-slate-200 rounded-lg overflow-hidden focus-within:border-slate-400 transition-colors bg-white">
                <Textarea
                  placeholder={
                    "Cole aqui o conteúdo do arquivo TXT/XML exportado pelo relógio...\n\n" +
                    "Exemplo (TXT AttendLog):\n" +
                    "# DeviceModel = S362E Excel\n" +
                    "No\tTMNo\tEnNo\tName\t...\tDateTime\tTR\n" +
                    "1\t1\t1\tIVAN...\t...\t2026-01-20 01:02:23\tBreak Off\n"
                  }
                  value={conteudoColado}
                  onChange={(e) => {
                    setConteudoColado(e.target.value);
                    setArquivo(null);
                    setPreview(null);
                    setPreviewGerado(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  rows={10}
                  className="text-[11px] sm:text-xs font-mono border-0 focus-visible:ring-0 resize-none"
                />
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500">
                Cole o conteúdo completo. O sistema irá detectar formato e mapear EnNo → user_id_relogio.
              </p>
            </TabsContent>
          </Tabs>

          {preview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Preview da Importação ({formatoDetectado})
                </Label>
                {(preview?.log_erros || preview?.log) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={baixarLog}
                    className="gap-1 h-7 text-xs"
                  >
                    <Download className="w-3 h-3" />
                    Log
                  </Button>
                )}
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-300 rounded-lg p-3 sm:p-4 space-y-3 shadow-sm">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="bg-white p-2.5 sm:p-3 rounded-lg border-2 border-slate-200 shadow-sm">
                    <div className="text-slate-600 text-[10px] sm:text-xs font-medium mb-1">Total Lidos</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalLidos}</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-2.5 sm:p-3 rounded-lg border-2 border-green-300 shadow-sm">
                    <div className="text-green-700 text-[10px] sm:text-xs font-medium mb-1">Válidos</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-700">{totalValidos}</div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-rose-50 p-2.5 sm:p-3 rounded-lg border-2 border-red-300 shadow-sm">
                    <div className="text-red-700 text-[10px] sm:text-xs font-medium mb-1">Inválidos</div>
                    <div className="text-xl sm:text-2xl font-bold text-red-700">{totalInvalidos}</div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-2.5 sm:p-3 rounded-lg border-2 border-blue-300 shadow-sm">
                    <div className="text-blue-700 text-[10px] sm:text-xs font-medium mb-1">Período</div>
                    <div className="text-xs sm:text-sm font-bold text-blue-900 break-words">
                      {periodoInicio}<br />a {periodoFim}
                    </div>
                  </div>
                </div>

                {Array.isArray(idsSemMapeamento) && idsSemMapeamento.length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-lg shadow-sm">
                    <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-yellow-900 mb-1">
                        IDs sem mapeamento ({idsSemMapeamento.length})
                      </p>
                      <p className="text-[10px] sm:text-xs text-yellow-800 mb-2">
                        Após importar, use <strong>“Mapear IDs”</strong> para vincular.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {idsSemMapeamento.slice(0, 12).map((id) => (
                          <span
                            key={String(id)}
                            className="inline-block px-2 py-0.5 bg-yellow-200 text-yellow-900 text-[10px] font-mono rounded"
                          >
                            ID {String(id)}
                          </span>
                        ))}
                        {idsSemMapeamento.length > 12 && (
                          <span className="text-[10px] text-yellow-700">
                            +{idsSemMapeamento.length - 12} mais
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {totalValidos > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-green-900">Pronto para importar</p>
                      <p className="text-[10px] sm:text-xs text-green-800">
                        {totalValidos} registros serão importados.
                      </p>
                    </div>
                  </div>
                )}

                {Array.isArray(previewRows) && previewRows.length > 0 && (
                  <div className="mt-3">
                    <details className="group">
                      <summary className="cursor-pointer flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900">
                        <Eye className="w-4 h-4" />
                        Ver amostra ({previewRows.length})
                      </summary>

                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-slate-700 text-white">
                              <th className="p-1 border">EnNo</th>
                              <th className="p-1 border">Nome</th>
                              <th className="p-1 border">Data/Hora</th>
                              <th className="p-1 border">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((r, i) => {
                              const ok = Boolean(r?.valido);
                              const enno = r?.user_id_relogio ?? r?.EnNo ?? r?.enno ?? "-";
                              const nome = r?.nome_detectado ?? r?.Name ?? r?.nome ?? "-";
                              const dh = r?.data_hora || `${r?.data || ""} ${r?.hora || ""}`.trim() || "-";
                              const motivo = r?.motivo_invalido || r?.erro || "";

                              return (
                                <tr key={i} className={ok ? "bg-green-50" : "bg-red-50"}>
                                  <td className="p-1 border font-mono">{String(enno)}</td>
                                  <td className="p-1 border">{String(nome)}</td>
                                  <td className="p-1 border font-mono">{String(dh)}</td>
                                  <td className="p-1 border text-[9px]">
                                    {ok ? (
                                      <span className="text-green-700">OK</span>
                                    ) : (
                                      <span className="text-red-700" title={motivo}>
                                        ERRO{motivo ? `: ${motivo}` : ""}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t bg-slate-50 px-4 py-3 sm:px-5 sm:py-4 rounded-b-lg sticky bottom-0">
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                resetTudo();
                onClose();
              }}
              className="w-full sm:w-auto gap-2 text-xs sm:text-sm h-9 sm:h-10 border-slate-300 hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Cancelar
            </Button>

            {!previewGerado ? (
              <Button
                onClick={gerarPreview}
                disabled={gerandoPreview || !temEntrada}
                className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm h-9 sm:h-10 font-semibold"
              >
                {gerandoPreview ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Gerar Preview
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={confirmarImportacao}
                disabled={processando}
                className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-9 sm:h-10 font-semibold"
              >
                {processando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Confirmar e Salvar ({totalValidos})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}