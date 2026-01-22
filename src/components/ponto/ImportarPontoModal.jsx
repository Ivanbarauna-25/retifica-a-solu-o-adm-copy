import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, CheckCircle2, X, Loader2, AlertCircle, Save, Eye } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export default function ImportarPontoModal({ isOpen, onClose, onImportado }) {
  const [arquivo, setArquivo] = useState(null);
  const [conteudoColado, setConteudoColado] = useState("");
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [preview, setPreview] = useState(null);
  const [registrosEditaveis, setRegistrosEditaveis] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);

  const { toast } = useToast();
  const fileInputRef = useRef(null);

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivo(file);
    setConteudoColado("");
    setPreview(null);
  };

  const temEntrada = useMemo(() => {
    return Boolean((conteudoColado || "").trim() || arquivo);
  }, [conteudoColado, arquivo]);

  const processarArquivo = async () => {
    console.log('🔍 ProcessarArquivo chamado', { 
      temEntrada, 
      conteudoColado: conteudoColado.substring(0, 100), 
      arquivo: arquivo?.name 
    });
    
    if (!temEntrada) {
      console.log('❌ Sem entrada');
      toast({
        title: "Atenção",
        description: "Selecione um arquivo ou cole o conteúdo.",
        variant: "destructive"
      });
      return;
    }

    setProcessando(true);
    setProgresso(10);

    try {
      console.log('1️⃣ Buscando funcionários...');
      const funcs = await base44.entities.Funcionario.list();
      setFuncionarios(funcs || []);
      setProgresso(30);

      console.log('2️⃣ Enviando para backend...', {
        tem_conteudo: !!conteudoColado.trim(),
        tem_arquivo: !!arquivo
      });
      
      const response = await base44.functions.invoke('processarPontoPreview', {
        conteudo_colado: conteudoColado.trim() || null,
        file_data: arquivo ? await arquivo.text() : null,
        nome_arquivo: arquivo ? arquivo.name : 'conteudo_colado.txt'
      });

      console.log('3️⃣ Resposta backend:', response?.data);

      setProgresso(90);

      if (!response?.data?.success) {
        console.log('❌ Erro no backend:', response?.data?.error);
        toast({
          title: "Erro no processamento",
          description: response?.data?.error || "Falha ao processar arquivo.",
          variant: "destructive"
        });
        setProcessando(false);
        return;
      }

      setPreview(response.data);
      setRegistrosEditaveis(response.data.registros || []);
      setProgresso(100);

      console.log('✅ Preview gerado:', response.data.registros?.length);

      toast({
        title: "Preview gerado",
        description: `${response.data.registros?.length || 0} registros prontos para revisão`
      });

    } catch (error) {
      console.error("❌ Erro ao processar:", error);
      console.error("❌ Detalhes:", error.response?.data);
      toast({
        title: "Erro",
        description: error?.response?.data?.error || error?.message || "Falha ao processar",
        variant: "destructive",
        duration: 8000
      });
      setProcessando(false);
    } finally {
      setTimeout(() => setProcessando(false), 500);
    }
  };

  const handleEditRegistro = (index, field, value) => {
    const novosRegistros = [...registrosEditaveis];
    novosRegistros[index] = {
      ...novosRegistros[index],
      [field]: value
    };
    
    // Revalidar se mudou funcionario_id
    if (field === 'funcionario_id') {
      novosRegistros[index].valido = !!value;
      novosRegistros[index].motivo_invalido = value ? null : 'Funcionário não selecionado';
    }
    
    setRegistrosEditaveis(novosRegistros);
  };

  const confirmarImportacao = async () => {
    const validos = registrosEditaveis.filter(r => r.valido);
    
    if (validos.length === 0) {
      toast({
        title: "Nenhum registro válido",
        description: "Corrija os registros antes de confirmar.",
        variant: "destructive"
      });
      return;
    }

    if (!window.confirm(`Confirmar importação de ${validos.length} registros?`)) {
      return;
    }

    setSalvando(true);

    try {
      const response = await base44.functions.invoke('salvarRegistrosPonto', {
        registros: registrosEditaveis
      });

      if (response?.data?.success) {
        toast({
          title: "Importação concluída",
          description: response.data.message || `${validos.length} registros salvos`
        });

        resetTudo();
        if (onImportado) onImportado();
        onClose();
      } else {
        throw new Error(response?.data?.error || "Erro ao salvar");
      }

    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Falha ao salvar registros",
        variant: "destructive"
      });
    } finally {
      setSalvando(false);
    }
  };

  const stats = preview?.stats || {};
  const totalRegistros = registrosEditaveis.length;
  const totalValidos = registrosEditaveis.filter(r => r.valido).length;
  const totalInvalidos = totalRegistros - totalValidos;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !processando && !salvando) {
          resetTudo();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-6xl w-[98vw] max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 bg-slate-800 text-white px-4 py-3 rounded-t-lg sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar Batidas - {preview ? 'Revisar' : 'Selecionar Arquivo'}
            </DialogTitle>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!processando && !salvando) {
                  resetTudo();
                  onClose();
                }
              }}
              className="text-white hover:bg-slate-600 h-8 w-8 p-0"
              disabled={processando || salvando}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {!preview ? (
            <>
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900 font-semibold mb-1">
                      Formatos suportados
                    </p>
                    <p className="text-xs text-blue-800">
                      <strong>TXT:</strong> AttendLog (vínculo por EnNo) | <strong>Excel:</strong> Relatórios do relógio
                    </p>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="arquivo" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="arquivo">Upload de Arquivo</TabsTrigger>
                  <TabsTrigger value="colar">Colar Conteúdo</TabsTrigger>
                </TabsList>

                <TabsContent value="arquivo" className="space-y-3 mt-3">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-slate-400 transition-colors bg-slate-50">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.xml,.xls,.xlsx"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    {arquivo && (
                      <div className="mt-3 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <p className="text-sm text-green-700 font-medium truncate">{arquivo.name}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="colar" className="space-y-3 mt-3">
                  <Textarea
                    placeholder="Cole o conteúdo do arquivo TXT/XML..."
                    value={conteudoColado}
                    onChange={(e) => {
                      setConteudoColado(e.target.value);
                      setArquivo(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    rows={10}
                    className="font-mono text-xs"
                  />
                </TabsContent>
              </Tabs>

              {processando && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Processando arquivo...</Label>
                  <Progress value={progresso} className="h-2" />
                  <p className="text-xs text-slate-500">{progresso}% concluído</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <div className="text-xs text-slate-600 font-medium">Total</div>
                  <div className="text-2xl font-bold text-slate-900">{totalRegistros}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-green-700 font-medium">Válidos</div>
                  <div className="text-2xl font-bold text-green-700">{totalValidos}</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="text-xs text-red-700 font-medium">Pendentes</div>
                  <div className="text-2xl font-bold text-red-700">{totalInvalidos}</div>
                </div>
              </div>

              {/* Tabela Editável */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[50vh] overflow-auto">
                  <Table>
                    <TableHeader className="bg-slate-800 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="text-white text-xs">EnNo</TableHead>
                        <TableHead className="text-white text-xs">Nome</TableHead>
                        <TableHead className="text-white text-xs">Data/Hora</TableHead>
                        <TableHead className="text-white text-xs">Funcionário</TableHead>
                        <TableHead className="text-white text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrosEditaveis.map((reg, idx) => (
                        <TableRow key={idx} className={reg.valido ? "bg-green-50" : "bg-red-50"}>
                          <TableCell className="font-mono text-xs">{reg.user_id_relogio}</TableCell>
                          <TableCell className="text-xs">{reg.nome_detectado || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{reg.data_hora?.substring(0, 16) || '-'}</TableCell>
                          <TableCell className="min-w-[200px]">
                            <Select
                              value={reg.funcionario_id || ''}
                              onValueChange={(value) => handleEditRegistro(idx, 'funcionario_id', value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {funcionarios.map((f) => (
                                  <SelectItem key={f.id} value={f.id} className="text-xs">
                                    {f.nome} {f.user_id_relogio ? `(EnNo: ${f.user_id_relogio})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-xs">
                            {reg.valido ? (
                              <span className="text-green-700 font-medium">✓ OK</span>
                            ) : (
                              <span className="text-red-700 text-[10px]" title={reg.motivo_invalido}>
                                ⚠ {reg.motivo_invalido?.substring(0, 30)}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t bg-slate-50 px-4 py-3 rounded-b-lg sticky bottom-0">
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                if (preview) {
                  setPreview(null);
                  setRegistrosEditaveis([]);
                  setProgresso(0);
                } else {
                  resetTudo();
                  onClose();
                }
              }}
              disabled={processando || salvando}
            >
              <X className="w-4 h-4 mr-2" />
              {preview ? 'Voltar' : 'Cancelar'}
            </Button>

            {!preview ? (
              <Button
                onClick={processarArquivo}
                disabled={processando || !temEntrada}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Gerar Preview
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={confirmarImportacao}
                disabled={salvando || totalValidos === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Confirmar ({totalValidos})
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