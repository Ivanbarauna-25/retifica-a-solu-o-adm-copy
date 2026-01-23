import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, CheckCircle2, X, Loader2, Save, Eye } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";

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

  // === PARSERS NO FRONTEND ===
  const parseTXT = (conteudo) => {
    const linhas = conteudo.split('\n');
    const registros = [];
    let headerMap = null;

    for (const linha of linhas) {
      const limpa = linha.replace(/\r/g, '').trim();
      
      if (!limpa) continue;
      if (limpa.startsWith('#')) continue;
      
      if (!headerMap && (limpa.includes('EnNo') || limpa.includes('Name')) && limpa.includes('\t')) {
        const colunas = limpa.split('\t');
        headerMap = {};
        
        colunas.forEach((col, idx) => {
          const colLimpa = col.trim().toLowerCase();
          if (colLimpa === 'enno' || colLimpa === 'empno' || colLimpa === 'userid') {
            headerMap.enNo = idx;
          } else if (colLimpa === 'name' || colLimpa === 'nome' || colLimpa === 'employee') {
            headerMap.name = idx;
          } else if (colLimpa === 'datetime' || colLimpa === 'checktime' || colLimpa === 'timestamp') {
            headerMap.dateTime = idx;
          } else if (colLimpa === 'tmno' || colLimpa === 'deviceid') {
            headerMap.tmNo = idx;
          } else if (colLimpa === 'mode' || colLimpa === 'modo') {
            headerMap.mode = idx;
          }
        });
        
        continue;
      }
      
      if (!headerMap || headerMap.enNo === undefined || headerMap.dateTime === undefined) continue;
      
      const campos = limpa.split('\t');
      if (campos.length < 3) continue;
      
      const enNo = (campos[headerMap.enNo] || '').trim();
      const dateTime = (campos[headerMap.dateTime] || '').trim().replace(/\s+/g, ' ');
      
      if (!enNo || !dateTime) continue;
      
      registros.push({
        enNo,
        name: headerMap.name !== undefined ? (campos[headerMap.name] || '').trim() : '',
        dateTime,
        tmNo: headerMap.tmNo !== undefined ? (campos[headerMap.tmNo] || '').trim() : '',
        mode: headerMap.mode !== undefined ? (campos[headerMap.mode] || '').trim() : '',
        raw: limpa
      });
    }
    
    return registros;
  };

  const parseXLSX = (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    const registros = [];
    
    for (const row of rows) {
      const enNo = String(row['EnNo'] || row['EmpNo'] || row['UserID'] || row['ID'] || '').trim();
      const dateTime = String(row['DateTime'] || row['CheckTime'] || row['Timestamp'] || row['Data/Hora'] || '').trim();
      const name = String(row['Name'] || row['Nome'] || row['Employee'] || '').trim();
      const tmNo = String(row['TMNo'] || row['DeviceID'] || '').trim();
      const mode = String(row['Mode'] || row['Modo'] || '').trim();
      
      if (!enNo || !dateTime) continue;
      
      registros.push({
        enNo,
        name,
        dateTime,
        tmNo,
        mode,
        raw: JSON.stringify(row).substring(0, 500)
      });
    }
    
    return registros;
  };

  const normalizar = (registros, funcionarios) => {
    const normalizados = [];
    
    for (const reg of registros) {
      const enNo = String(reg.enNo || '').trim();
      
      if (!enNo || !/^\d+$/.test(enNo)) {
        normalizados.push({
          user_id_relogio: enNo || null,
          nome_arquivo: reg.name || '',
          nome_detectado: reg.name || '',
          data_hora: null,
          data: null,
          hora: null,
          origem: 'relogio',
          metodo: reg.mode || '',
          dispositivo_id: reg.tmNo || '',
          raw_linha: (reg.raw || '').substring(0, 500),
          valido: false,
          motivo_invalido: !enNo ? 'EnNo vazio' : 'EnNo não numérico',
          funcionario_id: null
        });
        continue;
      }
      
      let dataHora;
      try {
        const dt = String(reg.dateTime || '').trim();
        if (!dt) throw new Error('DateTime vazio');
        
        const normalizado = dt.replace(/\//g, '-').replace(/T/, ' ').split('.')[0];
        dataHora = new Date(normalizado);
        
        if (isNaN(dataHora.getTime())) {
          throw new Error('Data inválida');
        }
      } catch (e) {
        normalizados.push({
          user_id_relogio: enNo,
          nome_arquivo: reg.name || '',
          nome_detectado: reg.name || '',
          data_hora: null,
          data: null,
          hora: null,
          origem: 'relogio',
          metodo: reg.mode || '',
          dispositivo_id: reg.tmNo || '',
          raw_linha: (reg.raw || '').substring(0, 500),
          valido: false,
          motivo_invalido: `DateTime inválido: "${reg.dateTime}"`,
          funcionario_id: null
        });
        continue;
      }
      
      const data = dataHora.toISOString().split('T')[0];
      const hora = dataHora.toISOString().split('T')[1].split('.')[0];
      
      const funcionario = funcionarios.find(f => {
        if (!f || !f.user_id_relogio) return false;
        return String(f.user_id_relogio).trim() === enNo;
      });
      
      normalizados.push({
        funcionario_id: funcionario?.id || null,
        user_id_relogio: enNo,
        nome_arquivo: reg.name || '',
        nome_detectado: reg.name || '',
        data,
        hora,
        data_hora: dataHora.toISOString(),
        origem: 'relogio',
        metodo: reg.mode || '',
        dispositivo_id: reg.tmNo || '',
        raw_linha: (reg.raw || '').substring(0, 500),
        valido: !!funcionario,
        motivo_invalido: funcionario ? null : 'EnNo sem funcionário vinculado'
      });
    }
    
    return normalizados;
  };

  const processarArquivo = async () => {
    if (!temEntrada) {
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
      const funcs = await base44.entities.Funcionario.list();
      setFuncionarios(funcs || []);
      setProgresso(30);

      let registros = [];
      let formato = 'desconhecido';

      if (arquivo) {
        const reader = new FileReader();
        
        const fileContent = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          
          if (arquivo.name.toLowerCase().endsWith('.txt')) {
            reader.readAsText(arquivo);
          } else {
            reader.readAsArrayBuffer(arquivo);
          }
        });

        if (arquivo.name.toLowerCase().endsWith('.txt')) {
          formato = 'txt';
          registros = parseTXT(fileContent);
        } else if (arquivo.name.toLowerCase().endsWith('.xls') || arquivo.name.toLowerCase().endsWith('.xlsx')) {
          formato = 'xlsx';
          registros = parseXLSX(new Uint8Array(fileContent));
        } else {
          throw new Error('Formato não suportado. Use TXT ou XLSX.');
        }
      } else {
        formato = 'txt';
        registros = parseTXT(conteudoColado);
      }

      if (registros.length === 0) {
        throw new Error('Nenhum registro encontrado no arquivo');
      }

      setProgresso(60);

      const normalizados = normalizar(registros, funcs);
      const datas = normalizados.filter(r => r.data).map(r => r.data).sort();

      setPreview({
        stats: {
          total: normalizados.length,
          validos: normalizados.filter(r => r.valido).length,
          invalidos: normalizados.filter(r => !r.valido).length,
          periodo_inicio: datas[0] || null,
          periodo_fim: datas[datas.length - 1] || null,
          formato
        }
      });
      setRegistrosEditaveis(normalizados);
      setProgresso(100);

      toast({
        title: "Preview gerado",
        description: `${normalizados.length} registros prontos para revisão`
      });

    } catch (error) {
      console.error("❌ Erro ao processar:", error);
      
      try {
        await base44.entities.ErrorLog.create({
          error_message: error?.message || "Erro ao processar importação de ponto",
          error_stack: error?.stack || "",
          component_name: "ImportarPontoModal - processarArquivo",
          severity: "error",
          status: 'novo',
          source: 'frontend',
          url: window.location.href,
          extra: JSON.stringify({
            tem_arquivo: !!arquivo,
            tem_conteudo: !!conteudoColado.trim(),
            timestamp: new Date().toISOString()
          })
        });
      } catch (logError) {
        console.error("Erro ao registrar log:", logError);
      }
      
      toast({
        title: "Erro",
        description: error?.message || "Falha ao processar",
        variant: "destructive",
        duration: 8000
      });
    } finally {
      setProcessando(false);
    }
  };

  const handleEditRegistro = (index, field, value) => {
    const novosRegistros = [...registrosEditaveis];
    novosRegistros[index] = {
      ...novosRegistros[index],
      [field]: value
    };
    
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
      const erros = [];
      let salvos = 0;

      for (const registro of validos) {
        try {
          await base44.entities.PontoRegistro.create(registro);
          salvos++;
        } catch (err) {
          erros.push({
            registro,
            erro: err.message
          });
        }
      }

      await base44.entities.ImportacaoPonto.create({
        origem_arquivo: arquivo?.name || "conteudo_colado.txt",
        total_registros: registrosEditaveis.length,
        registros_validos: validos.length,
        registros_salvos: salvos,
        registros_erro: erros.length,
        erros_detalhes: erros.length > 0 ? JSON.stringify(erros) : null
      });

      toast({
        title: "Importação concluída",
        description: `${salvos} registros salvos com sucesso`
      });

      resetTudo();
      if (onImportado) onImportado();
      onClose();

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
      <DialogContent className="max-w-[98vw] w-[98vw] max-h-[98vh] flex flex-col p-0 gap-0 sm:max-w-7xl">
        <DialogHeader className="flex-shrink-0 bg-slate-800 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-t-lg sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Importar Batidas - {preview ? 'Revisar' : 'Selecionar'}</span>
              <span className="sm:hidden">Importar</span>
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

        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-4">
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
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border">
                  <div className="text-[10px] sm:text-xs text-slate-600 font-medium">Total</div>
                  <div className="text-lg sm:text-2xl font-bold text-slate-900">{totalRegistros}</div>
                </div>
                <div className="bg-green-50 p-2 sm:p-3 rounded-lg border border-green-200">
                  <div className="text-[10px] sm:text-xs text-green-700 font-medium">Válidos</div>
                  <div className="text-lg sm:text-2xl font-bold text-green-700">{totalValidos}</div>
                </div>
                <div className="bg-red-50 p-2 sm:p-3 rounded-lg border border-red-200">
                  <div className="text-[10px] sm:text-xs text-red-700 font-medium">Pendentes</div>
                  <div className="text-lg sm:text-2xl font-bold text-red-700">{totalInvalidos}</div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[60vh] overflow-auto">
                  <Table>
                    <TableHeader className="bg-slate-800 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="text-white text-[10px] sm:text-xs px-2 sm:px-4">EnNo</TableHead>
                        <TableHead className="text-white text-[10px] sm:text-xs px-2 sm:px-4">Nome Arquivo</TableHead>
                        <TableHead className="text-white text-[10px] sm:text-xs px-2 sm:px-4 hidden lg:table-cell">Data</TableHead>
                        <TableHead className="text-white text-[10px] sm:text-xs px-2 sm:px-4 hidden lg:table-cell">Hora</TableHead>
                        <TableHead className="text-white text-[10px] sm:text-xs px-2 sm:px-4 lg:hidden">Data/Hora</TableHead>
                        <TableHead className="text-white text-[10px] sm:text-xs px-2 sm:px-4 hidden xl:table-cell">Método</TableHead>
                        <TableHead className="text-white text-[10px] sm:text-xs px-2 sm:px-4 hidden xl:table-cell">Dispositivo</TableHead>
                        <TableHead className="text-white text-[10px] sm:text-xs px-2 sm:px-4">Funcionário</TableHead>
                        <TableHead className="text-white text-[10px] sm:text-xs px-2 sm:px-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrosEditaveis.map((reg, idx) => (
                        <TableRow key={idx} className={reg.valido ? "bg-green-50" : "bg-red-50"}>
                          <TableCell className="font-mono text-[10px] sm:text-xs px-2 sm:px-4">{reg.user_id_relogio}</TableCell>
                          <TableCell className="text-[10px] sm:text-xs px-2 sm:px-4">{reg.nome_arquivo || reg.nome_detectado || '-'}</TableCell>
                          <TableCell className="font-mono text-[10px] sm:text-xs px-2 sm:px-4 hidden lg:table-cell">{reg.data || '-'}</TableCell>
                          <TableCell className="font-mono text-[10px] sm:text-xs px-2 sm:px-4 hidden lg:table-cell">{reg.hora?.substring(0, 8) || '-'}</TableCell>
                          <TableCell className="font-mono text-[10px] sm:text-xs px-2 sm:px-4 lg:hidden">{reg.data_hora?.substring(0, 16).replace('T', ' ') || '-'}</TableCell>
                          <TableCell className="text-[10px] sm:text-xs px-2 sm:px-4 hidden xl:table-cell">{reg.metodo || '-'}</TableCell>
                          <TableCell className="text-[10px] sm:text-xs px-2 sm:px-4 hidden xl:table-cell">{reg.dispositivo_id || '-'}</TableCell>
                          <TableCell className="min-w-[150px] sm:min-w-[200px] px-2 sm:px-4">
                            <Select
                              value={reg.funcionario_id || ''}
                              onValueChange={(value) => handleEditRegistro(idx, 'funcionario_id', value)}
                            >
                              <SelectTrigger className="h-7 sm:h-8 text-[10px] sm:text-xs">
                                <SelectValue placeholder="Selecionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {funcionarios.map((f) => (
                                  <SelectItem key={f.id} value={f.id} className="text-[10px] sm:text-xs">
                                    {f.nome} {f.user_id_relogio ? `(EnNo: ${f.user_id_relogio})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-[10px] sm:text-xs px-2 sm:px-4">
                            {reg.valido ? (
                              <span className="text-green-700 font-medium">✓ OK</span>
                            ) : (
                              <span className="text-red-700 text-[9px] sm:text-[10px]" title={reg.motivo_invalido}>
                                ⚠ {reg.motivo_invalido?.substring(0, 20)}
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

        <div className="flex-shrink-0 border-t bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 rounded-b-lg sticky bottom-0">
          <div className="flex gap-2 sm:gap-3 justify-end flex-wrap">
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
              size="sm"
              className="text-xs sm:text-sm"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              {preview ? 'Voltar' : 'Cancelar'}
            </Button>

            {!preview ? (
              <Button
                onClick={processarArquivo}
                disabled={processando || !temEntrada}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                {processando ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                    <span className="text-xs sm:text-sm">Processando...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Gerar Preview</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={confirmarImportacao}
                disabled={salvando || totalValidos === 0}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                    <span className="text-xs sm:text-sm">Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Confirmar ({totalValidos})</span>
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