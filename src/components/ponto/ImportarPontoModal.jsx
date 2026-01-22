import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, CheckCircle2, X, Loader2, AlertCircle, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ImportarPontoModal({ isOpen, onClose, onImportado }) {
  const [arquivo, setArquivo] = useState(null);
  const [conteudoColado, setConteudoColado] = useState("");
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const resetTudo = () => {
    setArquivo(null);
    setConteudoColado("");
    setResultado(null);
    setProcessando(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivo(file);
    setConteudoColado("");
    setResultado(null);
  };

  const temEntrada = useMemo(() => {
    return Boolean((conteudoColado || "").trim() || arquivo);
  }, [conteudoColado, arquivo]);

  const importarDireto = async () => {
    if (!temEntrada) {
      toast({
        title: "Atenção",
        description: "Selecione um arquivo ou cole o conteúdo.",
        variant: "destructive"
      });
      return;
    }

    setProcessando(true);
    setResultado(null);

    try {
      const formData = new FormData();
      
      if (conteudoColado.trim()) {
        formData.append('conteudo_colado', conteudoColado);
        formData.append('nome_arquivo', 'conteudo_colado.txt');
      } else if (arquivo) {
        formData.append('file', arquivo);
        formData.append('nome_arquivo', arquivo.name);
      }

      const response = await fetch('/api/functions/importarPontoDireto', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await base44.auth.getToken()}`
        },
        body: formData
      });

      const data = await response.json();

      if (!data?.success) {
        toast({
          title: "Erro na importação",
          description: data?.error || "Falha ao importar registros.",
          variant: "destructive"
        });
        return;
      }

      setResultado(data);

      toast({
        title: "Importação concluída",
        description: data.message || `${data.stats?.total_salvos || 0} registros importados`
      });

      setTimeout(() => {
        resetTudo();
        if (onImportado) onImportado();
        onClose();
      }, 3000);

    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({
        title: "Erro",
        description: error?.message || "Falha ao importar",
        variant: "destructive"
      });
    } finally {
      setProcessando(false);
    }
  };

  const baixarLog = () => {
    const log = resultado?.stats?.log_erros || "";
    if (!log) {
      toast({
        title: "Sem log",
        description: "Não há log disponível.",
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

  const stats = resultado?.stats || {};
  const totalSalvos = stats.total_salvos ?? 0;
  const totalValidos = stats.total_validos ?? 0;
  const totalInvalidos = stats.total_invalidos ?? 0;
  const periodoInicio = stats.periodo_inicio ?? "N/A";
  const periodoFim = stats.periodo_fim ?? "N/A";
  const formato = stats.formato_detectado || resultado?.formato_detectado || "N/A";
  const idsSemMapeamento = resultado?.ids_sem_mapeamento || [];

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

          {!resultado && (
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
                      setResultado(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    rows={10}
                    className="text-[11px] sm:text-xs font-mono border-0 focus-visible:ring-0 resize-none"
                  />
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  Cole o conteúdo completo. O sistema mapeia automaticamente EnNo → user_id_relogio.
                </p>
              </TabsContent>
            </Tabs>
          )}

          {resultado && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-semibold text-green-700">
                  ✅ Importação Concluída ({formato})
                </Label>
                {stats.log_erros && (
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

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-3 sm:p-4 space-y-3 shadow-sm">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="bg-white p-2.5 sm:p-3 rounded-lg border shadow-sm">
                    <div className="text-slate-600 text-[10px] sm:text-xs font-medium mb-1">Total Salvos</div>
                    <div className="text-xl sm:text-2xl font-bold text-emerald-700">{totalSalvos}</div>
                  </div>

                  <div className="bg-white p-2.5 sm:p-3 rounded-lg border shadow-sm">
                    <div className="text-green-700 text-[10px] sm:text-xs font-medium mb-1">✓ Válidos</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-700">{totalValidos}</div>
                  </div>

                  <div className="bg-white p-2.5 sm:p-3 rounded-lg border shadow-sm">
                    <div className="text-amber-700 text-[10px] sm:text-xs font-medium mb-1">⚠ Pendentes</div>
                    <div className="text-xl sm:text-2xl font-bold text-amber-700">{totalInvalidos}</div>
                  </div>

                  <div className="bg-white p-2.5 sm:p-3 rounded-lg border shadow-sm">
                    <div className="text-blue-700 text-[10px] sm:text-xs font-medium mb-1">Período</div>
                    <div className="text-xs sm:text-sm font-bold text-blue-900 break-words">
                      {periodoInicio}<br />→ {periodoFim}
                    </div>
                  </div>
                </div>

                {Array.isArray(idsSemMapeamento) && idsSemMapeamento.length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-amber-900 mb-1">
                        {idsSemMapeamento.length} EnNo(s) sem funcionário vinculado
                      </p>
                      <p className="text-[10px] sm:text-xs text-amber-800 mb-2">
                        Estes IDs foram salvos mas ficaram pendentes. Use <strong>"Mapear IDs"</strong> na tela de Ponto para vincular.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {idsSemMapeamento.slice(0, 12).map((id) => (
                          <span
                            key={String(id)}
                            className="inline-block px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-mono rounded"
                          >
                            {String(id)}
                          </span>
                        ))}
                        {idsSemMapeamento.length > 12 && (
                          <span className="text-[10px] text-amber-700">
                            +{idsSemMapeamento.length - 12} mais
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-300 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-green-900">
                      Registros salvos com sucesso!
                    </p>
                    <p className="text-[10px] sm:text-xs text-green-800">
                      Você pode fechar este modal. O sistema fechará automaticamente em instantes.
                    </p>
                  </div>
                </div>
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
              className="w-full sm:w-auto gap-2 text-xs sm:text-sm h-9 sm:h-10"
              disabled={processando}
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Cancelar
            </Button>

            <Button
              onClick={importarDireto}
              disabled={processando || !temEntrada || resultado}
              className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm h-9 sm:h-10 font-semibold"
            >
              {processando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Importar Agora
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}