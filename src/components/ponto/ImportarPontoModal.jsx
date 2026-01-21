import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, CheckCircle2, X, Loader2, AlertCircle } from "lucide-react";
import * as XLSX from 'xlsx';

export default function ImportarPontoModal({ isOpen, onClose, onImportado }) {
  const [arquivos, setArquivos] = useState([]);
  const [processando, setProcessando] = useState(false);
  const [preview, setPreview] = useState(null);
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setArquivos(files);
    setPreview(null);

    // Gerar preview automático
    try {
      const principalFile = files.find(f => 
        f.name.toLowerCase().includes('registropresença') || 
        f.name.toLowerCase().includes('registropresenca') ||
        f.name.toLowerCase().includes('attendlog')
      ) || files[0];

      const data = await readExcelFile(principalFile);
      if (data && data.length > 0) {
        const resultado = await processarDadosExcel(data, principalFile.name);
        setPreview(resultado);
      }
    } catch (error) {
      console.error("Erro ao gerar preview:", error);
    }
  };

  const readExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const processarDadosExcel = async (rows, nomeArquivo) => {
    const funcionarios = await base44.entities.Funcionario.list();
    
    // Encontrar linha de cabeçalho
    let headerRow = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      const rowStr = row.join('|').toLowerCase();
      if (rowStr.includes('enno') || rowStr.includes('datetime') || rowStr.includes('name')) {
        headerRow = i;
        break;
      }
    }

    const dataRows = rows.slice(headerRow + 1).filter(row => 
      row && row.length > 0 && row.some(cell => cell !== null && cell !== '')
    );

    const registrosProcessados = [];
    let totalValidos = 0;
    let totalInvalidos = 0;
    let dataInicio = null;
    let dataFim = null;

    for (const row of dataRows) {
      if (row.length < 3) continue;

      // Detectar colunas dinamicamente (formato comum do relógio)
      // Colunas: No | TMNo | EnNo | Name | GMNo | Mode | IN/OUT | Antipass | DaiGong | DateTime | TR
      const enNo = String(row[2] || '').trim();
      const dateTimeRaw = row[9] || row[5] || '';
      const mode = String(row[5] || row[3] || '').trim();
      const tmNo = String(row[1] || '').trim();

      if (!enNo || !dateTimeRaw) continue;

      // Parse datetime (Excel pode vir como serial date number)
      let dataHora;
      if (typeof dateTimeRaw === 'number') {
        // Excel serial date
        const excelEpoch = new Date(1900, 0, 1);
        const days = Math.floor(dateTimeRaw);
        const time = dateTimeRaw - days;
        dataHora = new Date(excelEpoch.getTime() + (days - 2) * 86400000 + time * 86400000);
      } else {
        dataHora = new Date(dateTimeRaw);
      }

      if (isNaN(dataHora.getTime())) continue;

      const data = dataHora.toISOString().split('T')[0];
      const hora = dataHora.toISOString().split('T')[1].split('.')[0];

      if (!dataInicio || data < dataInicio) dataInicio = data;
      if (!dataFim || data > dataFim) dataFim = data;

      const funcionario = funcionarios.find(f => f.user_id_relogio === enNo);
      const valido = !!funcionario;

      registrosProcessados.push({
        funcionario_id: funcionario?.id || null,
        user_id_relogio: enNo,
        data,
        hora,
        data_hora: dataHora.toISOString(),
        origem: 'relogio',
        metodo: mode,
        dispositivo_id: tmNo,
        valido,
        motivo_invalido: valido ? null : 'Funcionário não vinculado ao ID do relógio'
      });

      if (valido) totalValidos++;
      else totalInvalidos++;
    }

    return {
      registros: registrosProcessados,
      total_validos: totalValidos,
      total_invalidos: totalInvalidos,
      total_processados: registrosProcessados.length,
      periodo_inicio: dataInicio,
      periodo_fim: dataFim,
      arquivo_nome: nomeArquivo
    };
  };

  const processarImportacao = async () => {
    if (arquivos.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um arquivo Excel.",
        variant: "destructive"
      });
      return;
    }

    setProcessando(true);

    try {
      // Processar arquivo principal
      const principalFile = arquivos.find(f => 
        f.name.toLowerCase().includes('registropresença') || 
        f.name.toLowerCase().includes('registropresenca') ||
        f.name.toLowerCase().includes('attendlog')
      ) || arquivos[0];

      const data = await readExcelFile(principalFile);
      const resultado = await processarDadosExcel(data, principalFile.name);

      if (resultado.registros.length === 0) {
        toast({
          title: "Arquivo vazio",
          description: "Nenhum registro válido encontrado no arquivo.",
          variant: "destructive"
        });
        setProcessando(false);
        return;
      }

      // Gerar hash do conteúdo
      const conteudoStr = JSON.stringify(data);
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(conteudoStr));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Verificar duplicidade
      const importacoesExistentes = await base44.entities.ImportacaoPonto.filter({ arquivo_hash: hash });
      if (importacoesExistentes && importacoesExistentes.length > 0) {
        toast({
          title: "Arquivo duplicado",
          description: "Este arquivo já foi importado anteriormente.",
          variant: "destructive"
        });
        setProcessando(false);
        return;
      }

      // Criar registro de importação
      const importacao = await base44.entities.ImportacaoPonto.create({
        data_importacao: new Date().toISOString(),
        arquivo_nome: resultado.arquivo_nome,
        arquivo_hash: hash,
        periodo_inicio: resultado.periodo_inicio,
        periodo_fim: resultado.periodo_fim,
        total_linhas: resultado.total_processados,
        total_registros_validos: resultado.total_validos,
        total_ignorados: resultado.total_invalidos,
        status: 'processando'
      });

      // Criar registros em lote
      const registrosComImportacao = resultado.registros.map(r => ({
        ...r,
        importacao_id: importacao.id
      }));

      // Bulk create em chunks de 100
      const CHUNK_SIZE = 100;
      for (let i = 0; i < registrosComImportacao.length; i += CHUNK_SIZE) {
        const chunk = registrosComImportacao.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(reg => base44.entities.PontoRegistro.create(reg)));
      }

      // Atualizar status da importação
      await base44.entities.ImportacaoPonto.update(importacao.id, { status: 'concluida' });

      toast({
        title: "Importação concluída",
        description: `${resultado.total_validos} registros válidos importados. ${resultado.total_invalidos} inválidos.`
      });

      setArquivos([]);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      if (onImportado) onImportado();
      onClose();
    } catch (error) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro na importação",
        description: error.message || "Falha ao processar o arquivo.",
        variant: "destructive"
      });
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl w-[96vw] sm:w-[90vw] md:w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header fixo */}
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

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4 space-y-4">
          {/* Info box */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm text-blue-900 font-semibold mb-1">
                  Formato esperado
                </p>
                <p className="text-[10px] sm:text-xs text-blue-800">
                  Arquivo Excel (.xls ou .xlsx) exportado do relógio de ponto. Arquivos suportados: RegistroPresença.xls, AttendLog.xls ou similar.
                </p>
              </div>
            </div>
          </div>

          {/* Upload de arquivo */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-semibold text-slate-700">
              Selecione Arquivo(s) Excel
            </Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-slate-400 transition-colors bg-slate-50">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx"
                multiple
                onChange={handleFileChange}
                className="text-xs sm:text-sm cursor-pointer file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
              />
              {arquivos.length > 0 && (
                <div className="mt-3 space-y-2">
                  {arquivos.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-green-700 font-medium truncate">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview dos dados */}
          {preview && (
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                Preview da Importação
              </Label>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4 space-y-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2 rounded border">
                    <div className="text-slate-500 text-[10px] mb-1">Total Processados</div>
                    <div className="text-lg font-bold text-slate-900">{preview.total_processados}</div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <div className="text-slate-500 text-[10px] mb-1">Válidos</div>
                    <div className="text-lg font-bold text-green-600">{preview.total_validos}</div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <div className="text-slate-500 text-[10px] mb-1">Inválidos</div>
                    <div className="text-lg font-bold text-red-600">{preview.total_invalidos}</div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <div className="text-slate-500 text-[10px] mb-1">Período</div>
                    <div className="text-xs font-semibold text-slate-900">
                      {preview.periodo_inicio} a {preview.periodo_fim}
                    </div>
                  </div>
                </div>
                
                {preview.total_invalidos > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] sm:text-xs text-yellow-800">
                      {preview.total_invalidos} registros sem funcionário vinculado. Use "Mapear IDs" após importar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer fixo com botões */}
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
            <Button
              onClick={processarImportacao}
              disabled={processando || arquivos.length === 0}
              className="w-full sm:w-auto gap-2 bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm h-9 sm:h-10 font-semibold"
            >
              {processando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Confirmar Importação
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}