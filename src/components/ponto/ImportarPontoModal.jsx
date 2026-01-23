import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, CheckCircle2, X, Loader2, Save, Eye, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";
import { validarLote, validarRegistro, recomendarAjustes } from "./ValidadorPonto";

export default function ImportarPontoModal({ isOpen, onClose, onImportado }) {
  const [arquivo, setArquivo] = useState(null);
   const [conteudoColado, setConteudoColado] = useState("");
   const [processando, setProcessando] = useState(false);
   const [salvando, setSalvando] = useState(false);
   const [progresso, setProgresso] = useState(0);
   const [preview, setPreview] = useState(null);
   const [registrosEditaveis, setRegistrosEditaveis] = useState([]);
   const [funcionarios, setFuncionarios] = useState([]);
   const [validacoes, setValidacoes] = useState(null);
   const [mostrarErros, setMostrarErros] = useState(false);

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
        
        let normalizado = dt.replace(/\//g, '-').replace(/T/, ' ').split('.')[0];
        
        // Validar formato hora (rejeitar valores inválidos)
        const partes = normalizado.split(' ');
        if (partes.length === 2) {
          const [data, hora] = partes;
          const [h, m, s] = hora.split(':').map(n => parseInt(n) || 0);
          
          // Validar ranges (hora 0-23, minuto/segundo 0-59)
          if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) {
            throw new Error(`Horário inválido: ${hora}`);
          }
        }
        
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
      
      // Manter formato exato do TXT (24h)
      const ano = dataHora.getFullYear();
      const mes = String(dataHora.getMonth() + 1).padStart(2, '0');
      const dia = String(dataHora.getDate()).padStart(2, '0');
      const horas = String(dataHora.getHours()).padStart(2, '0');
      const minutos = String(dataHora.getMinutes()).padStart(2, '0');
      const segundos = String(dataHora.getSeconds()).padStart(2, '0');
      
      const data = `${ano}-${mes}-${dia}`;
      const hora = `${horas}:${minutos}:${segundos}`;
      
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

      // Validar registros
      const validacao = validarLote(normalizados);
      setValidacoes(validacao);

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

  const [confirmDialog, setConfirmDialog] = useState(null);

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

    try {
      // Verificar duplicatas
      const registrosExistentes = await base44.entities.PontoRegistro.list();
      const duplicatas = [];
      const novos = [];

      for (const registro of validos) {
        const isDuplicado = registrosExistentes.some(
          r => r.funcionario_id === registro.funcionario_id && 
               r.data_hora === registro.data_hora
        );
        
        if (isDuplicado) {
          duplicatas.push(registro);
        } else {
          novos.push(registro);
        }
      }

      // Mostrar dialog de confirmação personalizado
      if (duplicatas.length > 0) {
        setConfirmDialog({
          tipo: 'duplicadas',
          duplicatas: duplicatas.length,
          novos: novos.length,
          callback: async (confirmado) => {
            if (confirmado) {
              await executarImportacao(novos);
            }
            setConfirmDialog(null);
          }
        });
      } else {
        setConfirmDialog({
          tipo: 'simples',
          total: novos.length,
          callback: async (confirmado) => {
            if (confirmado) {
              await executarImportacao(novos);
            }
            setConfirmDialog(null);
          }
        });
      }
    } catch (error) {
      console.error("Erro ao verificar duplicatas:", error);
      toast({
        title: "Erro",
        description: error?.message || "Falha ao verificar duplicatas",
        variant: "destructive"
      });
    }
  };

  const executarImportacao = async (novos) => {
    setSalvando(true);
    try {

      const erros = [];
      let salvos = 0;

      for (const registro of novos) {
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
        registros_validos: registrosEditaveis.filter(r => r.valido).length,
        registros_salvos: salvos,
        registros_duplicados: 0,
        registros_erro: erros.length,
        erros_detalhes: erros.length > 0 ? JSON.stringify(erros) : null
      });

      toast({
        title: "✅ Importação concluída",
        description: `${salvos} registros salvos com sucesso`
      });

      resetTudo();
      if (onImportado) onImportado();
      onClose();

    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "❌ Erro ao salvar",
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
      <DialogContent className="max-w-[100vw] w-[100vw] max-h-[100vh] h-[100vh] md:max-w-7xl md:max-h-[90vh] md:h-auto flex flex-col p-0 gap-0 rounded-none md:rounded-xl overflow-hidden">
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white px-3 md:px-6 py-3 md:py-4 sticky top-0 z-20 shadow-xl border-b-2 border-slate-600">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 md:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Upload className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <DialogTitle className="text-sm md:text-xl font-bold text-white truncate">
                  {preview ? 'Revisar Importação' : 'Importar Batidas'}
                </DialogTitle>
                <span className="text-[10px] md:text-xs font-medium text-slate-300 truncate">
                  {preview ? 'Revise e ajuste antes de confirmar' : 'Faça upload ou cole o conteúdo'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {!preview ? (
                <Button
                  onClick={processarArquivo}
                  disabled={processando || !temEntrada}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-8 md:h-10 px-3 md:px-5 rounded-xl shadow-lg font-semibold text-xs md:text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {processando ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                      <span className="hidden md:inline">Processando</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                      <span className="hidden md:inline">Preview</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={confirmarImportacao}
                  disabled={salvando || totalValidos === 0}
                  size="sm"
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white h-8 md:h-10 px-3 md:px-5 rounded-xl shadow-lg font-semibold text-xs md:text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                      <span className="hidden md:inline">Salvando</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                      Confirmar
                      <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-md text-[10px] md:text-xs font-bold">
                        {totalValidos}
                      </span>
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
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
                className="text-white hover:bg-white/10 h-8 md:h-10 w-8 md:w-10 p-0 rounded-xl flex-shrink-0 transition-all hover:scale-105 disabled:hover:scale-100"
                title={preview ? 'Voltar' : 'Fechar'}
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2 md:px-5 py-2 md:py-4 space-y-2 md:space-y-4 bg-slate-50">
          {!preview ? (
            <>
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-2 md:p-3">
                <div className="flex items-start gap-1.5 md:gap-2">
                  <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-sm text-blue-900 font-semibold mb-0.5 md:mb-1">
                      Formatos suportados
                    </p>
                    <p className="text-[9px] md:text-xs text-blue-800">
                      <strong>TXT:</strong> AttendLog | <strong>Excel:</strong> Relatórios do relógio
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
            <div className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                <div className="bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-3 md:p-5 rounded-xl md:rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] md:text-xs text-slate-600 font-bold uppercase tracking-wide">Total</div>
                    <FileText className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                  </div>
                  <div className="text-2xl md:text-4xl font-black text-slate-900">{totalRegistros}</div>
                  <div className="text-[9px] md:text-xs text-slate-500 mt-1 font-medium">registros</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 via-green-100 to-green-50 p-3 md:p-5 rounded-xl md:rounded-2xl border-2 border-green-300 shadow-md hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] md:text-xs text-green-700 font-bold uppercase tracking-wide">Válidos</div>
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                  </div>
                  <div className="text-2xl md:text-4xl font-black text-green-700">{totalValidos}</div>
                  <div className="text-[9px] md:text-xs text-green-600 mt-1 font-medium">prontos</div>
                </div>
                <button 
                  onClick={() => setMostrarErros(!mostrarErros)}
                  className="bg-gradient-to-br from-red-50 via-red-100 to-red-50 p-3 md:p-5 rounded-xl md:rounded-2xl border-2 border-red-300 shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-105">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] md:text-xs text-red-700 font-bold uppercase tracking-wide">Avisos</div>
                    <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                  </div>
                  <div className="text-2xl md:text-4xl font-black text-red-700">{validacoes?.detalhes.filter(d => d.avisos.length > 0).length || 0}</div>
                  <div className="text-[9px] md:text-xs text-red-600 mt-1 font-medium">verificar</div>
                </button>
              </div>

              {/* Alertas de Validação */}
              {mostrarErros && validacoes && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-3 md:p-4">
                  <p className="text-xs md:text-sm font-semibold text-yellow-900 mb-2">⚠️ Avisos de Validação</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {validacoes.detalhes.filter(d => d.avisos.length > 0).map((detalhe, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-yellow-200 text-[9px] md:text-xs">
                        <p className="font-medium text-slate-700">Linha {detalhe.index + 1}</p>
                        <ul className="text-yellow-800 ml-3 mt-1 list-disc">
                          {detalhe.avisos.map((av, i) => <li key={i}>{av}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-2 border-slate-200 rounded-xl overflow-hidden shadow-lg bg-white">
                <div className="overflow-x-auto">
                  <div className="max-h-[calc(100vh-350px)] md:max-h-[50vh] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 sticky top-0 z-10 shadow-md">
                        <tr>
                          <th className="text-white text-[10px] md:text-xs font-bold px-2 md:px-4 py-2.5 md:py-3 text-left whitespace-nowrap border-r border-slate-600">ID</th>
                          <th className="text-white text-[10px] md:text-xs font-bold px-2 md:px-4 py-2.5 md:py-3 text-left whitespace-nowrap border-r border-slate-600">Data/Hora</th>
                          <th className="text-white text-[10px] md:text-xs font-bold px-2 md:px-4 py-2.5 md:py-3 text-left whitespace-nowrap border-r border-slate-600 hidden md:table-cell">Modo</th>
                          <th className="text-white text-[10px] md:text-xs font-bold px-2 md:px-4 py-2.5 md:py-3 text-left whitespace-nowrap border-r border-slate-600">Funcionário</th>
                          <th className="text-white text-[10px] md:text-xs font-bold px-2 md:px-4 py-2.5 md:py-3 text-center whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrosEditaveis.map((reg, idx) => (
                          <tr 
                            key={idx} 
                            className={`border-b-2 border-slate-100 transition-colors hover:bg-slate-50 ${
                              reg.valido ? "bg-green-50/40" : "bg-red-50/40"
                            }`}
                          >
                            <td className="font-mono text-[10px] md:text-xs px-2 md:px-4 py-2.5 md:py-3 text-slate-900 font-bold">
                              {reg.user_id_relogio || '-'}
                            </td>
                            <td className="font-mono text-[10px] md:text-xs px-2 md:px-4 py-2.5 md:py-3 text-slate-900 whitespace-nowrap font-semibold">
                              {reg.data && reg.hora ? `${reg.data} ${reg.hora.substring(0, 5)}` : '-'}
                            </td>
                            <td className="font-mono text-[10px] md:text-xs px-2 md:px-4 py-2.5 md:py-3 text-slate-600 hidden md:table-cell">
                              {reg.metodo || '-'}
                            </td>
                            <td className="px-2 md:px-4 py-2.5 md:py-3">
                              <Select
                                value={reg.funcionario_id || ''}
                                onValueChange={(value) => handleEditRegistro(idx, 'funcionario_id', value)}
                              >
                                <SelectTrigger className="h-8 md:h-9 text-[10px] md:text-xs border-2 border-slate-300 bg-white rounded-lg font-medium hover:border-blue-500 transition-colors">
                                  <SelectValue placeholder={reg.nome_arquivo ? `📋 ${reg.nome_arquivo}` : "Selecionar funcionário..."} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  {funcionarios.map((f) => (
                                    <SelectItem key={f.id} value={f.id} className="text-[10px] md:text-xs font-medium">
                                      {f.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="text-[10px] md:text-xs px-2 md:px-4 py-2.5 md:py-3 text-center">
                              {reg.valido ? (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-green-100 to-green-200 text-green-700 rounded-lg font-bold shadow-sm">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline text-[10px]">OK</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-red-100 to-red-200 text-red-700 rounded-lg font-bold shadow-sm" title={reg.motivo_invalido}>
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline text-[10px]">Erro</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>


      </DialogContent>
    </Dialog>
  );
}