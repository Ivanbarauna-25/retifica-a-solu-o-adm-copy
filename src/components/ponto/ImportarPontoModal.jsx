import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, CheckCircle2, X, Loader2, AlertCircle, Download, Eye } from "lucide-react";
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

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setConteudoColado("");
    setPreview(null);
    setPreviewGerado(false);
  };

  const gerarPreview = async () => {
    if (!arquivo && !conteudoColado) {
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
      let conteudo;
      if (conteudoColado) {
        conteudo = conteudoColado;
      } else {
        conteudo = await arquivo.text();
      }

      const { data } = await base44.functions.invoke('processarImportacaoPonto', {
        conteudo,
        nome_arquivo: arquivo?.name || 'Conteúdo Colado'
      });

      if (!data.success) {
        toast({
          title: "Erro no processamento",
          description: data.error || "Formato não reconhecido",
          variant: "destructive"
        });
        return;
      }

      setPreview(data);
      setPreviewGerado(true);
      
      toast({
        title: "Preview gerado",
        description: `${data.total_lidos} registros processados. Formato: ${data.formato_detectado}`
      });
    } catch (error) {
      console.error("Erro ao gerar preview:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao processar arquivo",
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
        description: "Clique em 'Gerar Preview' antes de confirmar",
        variant: "destructive"
      });
      return;
    }

    setProcessando(true);

    try {
      const { data } = await base44.functions.invoke('confirmarImportacaoPonto', {
        registros_normalizados: preview.registros_completos,
        arquivo_nome: preview.arquivo_nome,
        metadados: preview.metadados,
        log_erros: preview.log_erros,
        total_validos: preview.total_validos,
        total_invalidos: preview.total_invalidos,
        periodo_inicio: preview.periodo_inicio,
        periodo_fim: preview.periodo_fim
      });

      if (!data.success) {
        toast({
          title: "Erro na importação",
          description: data.error || data.mensagem || "Falha ao salvar registros",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Importação concluída",
        description: data.message
      });

      setArquivo(null);
      setConteudoColado("");
      setPreview(null);
      setPreviewGerado(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      if (onImportado) onImportado();
      onClose();
    } catch (error) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro na importação",
        description: error.message || "Falha ao processar",
        variant: "destructive"
      });
    } finally {
      setProcessando(false);
    }
  };

  const baixarLog = () => {
    if (!preview?.log_erros) return;
    
    const blob = new Blob([preview.log_erros], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log_erros_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
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
              onClick={onClose}
              className="text-white hover:bg-slate-600 h-7 w-7 sm:h-8 sm:w-8 p-0 md:hidden"
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
                  <strong>TXT:</strong> ACL.001.TXT (AttendLog) com batidas individuais<br/>
                  <strong>Excel:</strong> RegistroPresença.xls ou similar
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="arquivo" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="arquivo" className="text-xs">Upload de Arquivo</TabsTrigger>
              <TabsTrigger value="colar" className="text-xs">Colar Conteúdo</TabsTrigger>
            </TabsList>

            <TabsContent value="arquivo" className="space-y-3 mt-3">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-slate-400 transition-colors bg-slate-50">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.xls,.xlsx"
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
                  placeholder="Cole aqui o conteúdo do arquivo TXT (AttendLog)...&#10;&#10;Exemplo:&#10;# DeviceModel = S362E Excel&#10;No	TMNo	EnNo	Name	DateTime&#10;1	1	1	IVAN DOS SANTOS	2026-01-20 01:02:23"
                  value={conteudoColado}
                  onChange={(e) => {
                    setConteudoColado(e.target.value);
                    setArquivo(null);
                    setPreview(null);
                    setPreviewGerado(false);
                  }}
                  rows={8}
                  className="text-[11px] sm:text-xs font-mono border-0 focus-visible:ring-0 resize-none"
                />
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500">
                💡 Cole o conteúdo completo do arquivo TXT/XML exportado pelo relógio
              </p>
            </TabsContent>
          </Tabs>

          {preview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Preview da Importação ({preview.formato_detectado})
                </Label>
                {preview.log_erros && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={baixarLog}
                    className="gap-1 h-7 text-xs"
                  >
                    <Download className="w-3 h-3" />
                    Log de Erros
                  </Button>
                )}
              </div>
              
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-300 rounded-lg p-3 sm:p-4 space-y-3 shadow-sm">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="bg-white p-2.5 sm:p-3 rounded-lg border-2 border-slate-200 shadow-sm">
                    <div className="text-slate-600 text-[10px] sm:text-xs font-medium mb-1">Total Lidos</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{preview.total_lidos}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-2.5 sm:p-3 rounded-lg border-2 border-green-300 shadow-sm">
                    <div className="text-green-700 text-[10px] sm:text-xs font-medium mb-1">✓ Válidos</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-700">{preview.total_validos}</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 p-2.5 sm:p-3 rounded-lg border-2 border-red-300 shadow-sm">
                    <div className="text-red-700 text-[10px] sm:text-xs font-medium mb-1">✗ Inválidos</div>
                    <div className="text-xl sm:text-2xl font-bold text-red-700">{preview.total_invalidos}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-2.5 sm:p-3 rounded-lg border-2 border-blue-300 shadow-sm">
                    <div className="text-blue-700 text-[10px] sm:text-xs font-medium mb-1">📅 Período</div>
                    <div className="text-xs sm:text-sm font-bold text-blue-900 break-words">
                      {preview.periodo_inicio || "N/A"}<br/>a {preview.periodo_fim || "N/A"}
                    </div>
                  </div>
                </div>
                
                {preview.total_sem_mapeamento > 0 && preview.ids_sem_mapeamento && (
                  <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-lg shadow-sm">
                    <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-yellow-900 mb-1">
                        ⚠️ IDs sem mapeamento ({preview.ids_sem_mapeamento.length})
                      </p>
                      <p className="text-[10px] sm:text-xs text-yellow-800 mb-2">
                        Após importar, use <strong>"Mapear IDs"</strong> para vincular:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {preview.ids_sem_mapeamento.slice(0, 10).map(id => (
                          <span key={id} className="inline-block px-2 py-0.5 bg-yellow-200 text-yellow-900 text-[10px] font-mono rounded">
                            ID {id}
                          </span>
                        ))}
                        {preview.ids_sem_mapeamento.length > 10 && (
                          <span className="text-[10px] text-yellow-700">
                            +{preview.ids_sem_mapeamento.length - 10} mais
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {preview.total_validos > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-green-900">
                        ✅ Pronto para importar
                      </p>
                      <p className="text-[10px] sm:text-xs text-green-800">
                        {preview.total_validos} registros serão importados com sucesso.
                      </p>
                    </div>
                  </div>
                )}

                {/* Preview das primeiras batidas */}
                {preview.preview && preview.preview.length > 0 && (
                  <div className="mt-3">
                    <details className="group">
                      <summary className="cursor-pointer flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900">
                        <Eye className="w-4 h-4" />
                        Ver primeiras {preview.preview.length} batidas
                      </summary>
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-slate-700 text-white">
                              <th className="p-1 border">ID</th>
                              <th className="p-1 border">Nome</th>
                              <th className="p-1 border">Data/Hora</th>
                              <th className="p-1 border">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.preview.map((r, i) => (
                              <tr key={i} className={r.valido ? 'bg-green-50' : 'bg-red-50'}>
                                <td className="p-1 border font-mono">{r.user_id_relogio}</td>
                                <td className="p-1 border">{r.nome_detectado || '-'}</td>
                                <td className="p-1 border font-mono">{r.data} {r.hora}</td>
                                <td className="p-1 border text-[9px]">
                                  {r.valido ? (
                                    <span className="text-green-700">✓ OK</span>
                                  ) : (
                                    <span className="text-red-700" title={r.motivo_invalido}>✗ {r.motivo_invalido}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
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
              onClick={onClose}
              className="w-full sm:w-auto gap-2 text-xs sm:text-sm h-9 sm:h-10 border-slate-300 hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Cancelar
            </Button>
            
            {!previewGerado && (
              <Button
                onClick={gerarPreview}
                disabled={gerandoPreview || (!arquivo && !conteudoColado)}
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
            )}
            
            {previewGerado && (
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
                    Confirmar e Salvar ({preview?.total_validos || 0})
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