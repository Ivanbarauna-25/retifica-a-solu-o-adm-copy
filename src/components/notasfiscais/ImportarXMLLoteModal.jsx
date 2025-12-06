import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Loader2, CheckCircle, XCircle, AlertCircle, FileText, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function ImportarXMLLoteModal({ isOpen, onClose, onSuccess }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultados, setResultados] = useState(null);
  const { toast } = useToast();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const xmlFiles = selectedFiles.filter(f => f.name.endsWith('.xml'));
    
    if (xmlFiles.length !== selectedFiles.length) {
      toast({
        title: 'Arquivos inválidos detectados',
        description: 'Alguns arquivos não são XML e foram ignorados.',
        variant: 'destructive'
      });
    }

    if (xmlFiles.length > 50) {
      toast({
        title: 'Limite excedido',
        description: 'Você pode importar no máximo 50 arquivos por vez.',
        variant: 'destructive'
      });
      return;
    }

    setFiles(xmlFiles);
    setResultados(null);
  };

  const handleRemoveFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleImportLote = async () => {
    if (files.length === 0) {
      toast({
        title: 'Nenhum arquivo selecionado',
        description: 'Selecione pelo menos um arquivo XML para importar.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      const filesData = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          content: await file.text()
        }))
      );

      const response = await base44.functions.invoke('importarNotasFiscaisEmLote', {
        files: filesData
      });

      setResultados(response.data);

      if (response.data.sucesso > 0) {
        toast({
          title: '✅ Importação concluída!',
          description: `${response.data.sucesso} nota(s) importada(s) com sucesso. ${response.data.falha} falha(s).`
        });
        
        if (response.data.falha === 0) {
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 2000);
        }
      } else {
        toast({
          title: 'Nenhuma nota importada',
          description: 'Todas as importações falharam. Verifique os erros abaixo.',
          variant: 'destructive'
        });
      }

    } catch (error) {
      console.error('Erro ao importar lote:', error);
      toast({
        title: 'Erro na importação',
        description: error.message || 'Erro desconhecido ao processar arquivos',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setResultados(null);
    onClose();
  };

  return (
    <>
      <style>{`
        .importar-lote-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .importar-lote-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .importar-lote-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .importar-lote-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .importar-lote-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .importar-lote-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .importar-lote-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .importar-lote-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .importar-lote-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .importar-lote-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-5xl h-[95vh] md:max-h-[95vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-4 md:px-6 py-4">
            <DialogTitle className="flex items-center gap-3 text-white">
              <Upload className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-base md:text-lg">Importação em Lote de NF-e</span>
            </DialogTitle>
          </DialogHeader>

          <div className="importar-lote-scroll flex-1 px-4 md:px-6 pb-4 md:pb-6 space-y-4 md:space-y-6 mt-4 md:mt-6">
            {!resultados && (
              <>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="w-4 h-4 text-black" />
                  <AlertDescription className="text-black">
                    Selecione até <strong>50 arquivos XML</strong> de NF-e para importação simultânea.
                    Os fornecedores serão cadastrados automaticamente se não existirem.
                  </AlertDescription>
                </Alert>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Arquivos XML *
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 md:p-6 text-center hover:border-slate-400 transition-colors bg-white">
                    <input
                      type="file"
                      accept=".xml"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload-lote"
                      disabled={isProcessing}
                    />
                    <label
                      htmlFor="file-upload-lote"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-8 h-8 md:w-12 md:h-12 text-slate-400 mb-2" />
                      <span className="text-xs md:text-sm text-black">
                        Clique para selecionar ou arraste os arquivos XML aqui
                      </span>
                      <span className="text-xs text-black mt-1">
                        Máximo de 50 arquivos por vez
                      </span>
                    </label>
                  </div>
                </div>

                {files.length > 0 && (
                  <Card className="bg-white border border-slate-200">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <h3 className="font-bold text-base md:text-lg text-black">
                          Arquivos Selecionados ({files.length})
                        </h3>
                        {files.length > 50 && (
                          <Badge variant="destructive">
                            Limite de 50 arquivos excedido
                          </Badge>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <div className="space-y-2">
                          {files.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 md:p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                                <span className="text-xs md:text-sm text-black truncate" title={file.name}>
                                  {file.name}
                                </span>
                                <span className="text-xs text-black flex-shrink-0">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFile(index)}
                                disabled={isProcessing}
                                className="bg-slate-600 hover:bg-slate-700 text-white h-8 px-2"
                              >
                                <X className="w-3 h-3 md:w-4 md:h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {resultados && (
              <Card className="bg-white border border-slate-200">
                <CardContent className="p-4 md:p-5">
                  <div className="mb-4 md:mb-6">
                    <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-black">Resultado da Importação</h3>
                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                      <div className="bg-blue-50 p-3 md:p-4 rounded-lg text-center">
                        <p className="text-xs md:text-sm text-black font-medium mb-1">Total</p>
                        <p className="text-xl md:text-2xl font-bold text-black">{resultados.total}</p>
                      </div>
                      <div className="bg-green-50 p-3 md:p-4 rounded-lg text-center">
                        <p className="text-xs md:text-sm text-black font-medium mb-1">Sucesso</p>
                        <p className="text-xl md:text-2xl font-bold text-black">{resultados.sucesso}</p>
                      </div>
                      <div className="bg-red-50 p-3 md:p-4 rounded-lg text-center">
                        <p className="text-xs md:text-sm text-black font-medium mb-1">Falhas</p>
                        <p className="text-xl md:text-2xl font-bold text-black">{resultados.falha}</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-800">
                          <TableHead className="text-white text-xs md:text-sm">Status</TableHead>
                          <TableHead className="text-white text-xs md:text-sm">Arquivo</TableHead>
                          <TableHead className="text-white text-xs md:text-sm">Detalhes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultados.resultados.map((res, idx) => (
                          <TableRow key={idx} className="bg-white hover:bg-slate-50">
                            <TableCell>
                              {res.sucesso ? (
                                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs md:text-sm text-black">
                              {res.arquivo}
                            </TableCell>
                            <TableCell>
                              {res.sucesso ? (
                                <div className="text-xs md:text-sm">
                                  <p className="font-semibold text-black">
                                    NF {res.numeroNota} importada
                                  </p>
                                  <p className="text-black">
                                    {res.fornecedor} • {res.itens} item(ns)
                                    {res.duplicatas > 0 && ` • ${res.duplicatas} duplicata(s)`}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs md:text-sm text-red-600">{res.erro}</p>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {isProcessing && (
              <div className="text-center py-12">
                <Loader2 className="h-12 h-12 md:h-16 md:w-16 animate-spin text-slate-600 mx-auto" />
                <p className="mt-4 text-base md:text-lg font-semibold text-black">
                  Processando {files.length} arquivo(s)...
                </p>
                <p className="text-xs md:text-sm text-black">
                  Isso pode levar alguns minutos. Não feche esta janela.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 flex justify-between gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 border-t bg-white">
            {!resultados && !isProcessing && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 h-10"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImportLote}
                  disabled={files.length === 0 || files.length > 50}
                  className="bg-slate-600 hover:bg-slate-700 text-white gap-2 h-10"
                >
                  <Upload className="w-4 h-4" />
                  Importar {files.length} Arquivo(s)
                </Button>
              </>
            )}
            {resultados && (
              <Button 
                onClick={handleClose} 
                className="ml-auto bg-slate-600 hover:bg-slate-700 text-white h-10"
              >
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}