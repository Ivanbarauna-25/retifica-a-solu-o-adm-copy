import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Eye, Trash2, 
  Loader2, FileText, Table as TableIcon, Sparkles, Check, X, AlertTriangle,
  RefreshCw, Edit3, ArrowRight, FileUp, Wand2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

// Componente de etapa de progresso
const ProgressStep = ({ step, currentStep, label, icon: Icon, isCompleted }) => {
  const isActive = currentStep === step;
  const isPast = currentStep > step || isCompleted;
  
  return (
    <div className="flex items-center gap-2">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
        ${isPast ? 'bg-green-500 text-white' : 
          isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 
          'bg-slate-200 text-slate-500'}
      `}>
        {isPast ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
      </div>
      <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-blue-600' : isPast ? 'text-green-600' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
};

// Indicador de status de validação
const ValidationBadge = ({ status, count }) => {
  if (status === 'valid') {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        {count} válidos
      </Badge>
    );
  }
  if (status === 'warning') {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
        <AlertTriangle className="w-3 h-3" />
        {count} avisos
      </Badge>
    );
  }
  if (status === 'error') {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
        <X className="w-3 h-3" />
        {count} erros
      </Badge>
    );
  }
  return null;
};

export default function ImportarOrcamentosModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Upload, 2: Processando, 3: Validação, 4: Resultado
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingSubStage, setLoadingSubStage] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset quando modal abre
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setFile(null);
      setPreviewData(null);
      setValidationResults(null);
      setResult(null);
      setLoadingProgress(0);
    }
  }, [isOpen]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  };

  const handleFileSelection = (selectedFile) => {
    const validExtensions = ['.csv', '.xlsx', '.xls', '.pdf'];
    const fileExt = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExt)) {
      toast({
        title: 'Formato não suportado',
        description: 'Selecione um arquivo CSV, Excel (.xlsx) ou PDF',
        variant: 'destructive'
      });
      return;
    }
    
    setFile(selectedFile);
    setPreviewData(null);
    setValidationResults(null);
    setResult(null);
  };

  const getFileIcon = () => {
    if (!file) return FileUp;
    const ext = file.name.toLowerCase();
    if (ext.endsWith('.pdf')) return FileText;
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) return TableIcon;
    return FileSpreadsheet;
  };

  const downloadTemplate = () => {
    const csvContent = 'numero_orcamento,data_orcamento,cliente_nome,vendedor_nome,valor_produtos,valor_servicos,desconto,outras_despesas,observacoes\n' +
                      'ORC-001,2024-01-15,João Silva,Maria Vendedora,1000.00,500.00,50.00,100.00,Orçamento exemplo\n' +
                      'ORC-002,2024-01-16,José Santos,Pedro Vendedor,1500.00,800.00,100.00,150.00,Outro exemplo';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_orcamentos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Modelo baixado!',
      description: 'Use este modelo como referência para seus dados.'
    });
  };

  // Função de validação dos dados
  const validateData = (data) => {
    const results = {
      valid: [],
      warnings: [],
      errors: []
    };

    data.forEach((row, idx) => {
      const issues = [];
      let hasError = false;

      // Validar campos obrigatórios
      if (!row.numero_orcamento || row.numero_orcamento.trim() === '') {
        issues.push({ field: 'numero_orcamento', message: 'Número obrigatório', type: 'error' });
        hasError = true;
      }

      if (!row.data_orcamento || row.data_orcamento.trim() === '') {
        issues.push({ field: 'data_orcamento', message: 'Data obrigatória', type: 'error' });
        hasError = true;
      } else {
        // Validar formato da data
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row.data_orcamento)) {
          issues.push({ field: 'data_orcamento', message: 'Formato inválido', type: 'warning' });
        }
      }

      // Avisos
      if (!row.cliente_nome || row.cliente_nome.trim() === '') {
        issues.push({ field: 'cliente_nome', message: 'Cliente não informado', type: 'warning' });
      }

      if ((Number(row.valor_produtos) || 0) === 0 && (Number(row.valor_servicos) || 0) === 0) {
        issues.push({ field: 'valores', message: 'Sem valores', type: 'warning' });
      }

      // Classificar
      if (hasError) {
        results.errors.push({ index: idx, row, issues });
      } else if (issues.length > 0) {
        results.warnings.push({ index: idx, row, issues });
      } else {
        results.valid.push({ index: idx, row });
      }
    });

    return results;
  };

  const updateProgress = (progress, stage, subStage = '') => {
    if (mountedRef.current) {
      setLoadingProgress(progress);
      setLoadingStage(stage);
      setLoadingSubStage(subStage);
    }
  };

  const handleExtract = async () => {
    if (!file) {
      toast({
        title: 'Nenhum arquivo selecionado',
        variant: 'destructive'
      });
      return;
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setCurrentStep(2);

    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv');
      const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
      const isPDF = file.name.toLowerCase().endsWith('.pdf');

      let dados = [];

      if (isCSV) {
        updateProgress(10, 'Lendo arquivo', 'Carregando CSV...');
        await new Promise(r => setTimeout(r, 300));
        
        const text = await file.text();
        updateProgress(25, 'Analisando estrutura', 'Identificando colunas...');
        await new Promise(r => setTimeout(r, 300));

        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('Arquivo vazio ou sem dados após o cabeçalho.');
        }

        const primeiraLinha = lines[0];
        const separador = primeiraLinha.includes(';') ? ';' : ',';
        const headers = primeiraLinha.split(separador).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

        updateProgress(40, 'Mapeando colunas', `${headers.length} colunas encontradas`);
        await new Promise(r => setTimeout(r, 300));

        const colunaMap = {};
        headers.forEach((h, idx) => {
          const campo = mapearColuna(h);
          if (campo) colunaMap[idx] = campo;
        });

        if (Object.keys(colunaMap).length === 0) {
          throw new Error('Não foi possível identificar as colunas. Verifique o cabeçalho do arquivo.');
        }

        updateProgress(60, 'Extraindo dados', `Processando ${lines.length - 1} linhas...`);
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const valores = parseCSVLine(line, separador);
          const orcamento = extrairOrcamento(valores, colunaMap);
          
          if (orcamento.numero_orcamento && orcamento.data_orcamento) {
            dados.push(orcamento);
          }

          if (i % 10 === 0) {
            updateProgress(60 + Math.floor((i / lines.length) * 25), 'Extraindo dados', `Linha ${i} de ${lines.length - 1}`);
          }
        }

      } else if (isExcel || isPDF) {
        updateProgress(10, 'Enviando arquivo', 'Fazendo upload...');
        
        const uploadResponse = await base44.integrations.Core.UploadFile({ file });
        const file_url = uploadResponse.file_url;

        if (!file_url) throw new Error('Falha no upload do arquivo');

        updateProgress(30, 'Analisando com IA', isPDF ? 'Extraindo texto do PDF...' : 'Lendo planilha...');
        await new Promise(r => setTimeout(r, 500));

        updateProgress(50, 'Analisando com IA', 'Identificando orçamentos...');

        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              orcamentos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    numero_orcamento: { type: "string", description: "Número do orçamento" },
                    cliente_nome: { type: "string", description: "Nome do cliente" },
                    vendedor_nome: { type: "string", description: "Nome do vendedor" },
                    data_orcamento: { type: "string", description: "Data do orçamento (YYYY-MM-DD)" },
                    valor_produtos: { type: "number", description: "Valor de produtos" },
                    valor_servicos: { type: "number", description: "Valor de serviços" },
                    desconto: { type: "number", description: "Desconto" },
                    outras_despesas: { type: "number", description: "Outras despesas" },
                    observacoes: { type: "string", description: "Observações" }
                  },
                  required: ["numero_orcamento", "data_orcamento"]
                }
              }
            }
          }
        });

        updateProgress(75, 'Processando resultados', 'Organizando dados...');

        if (extractResult.status === 'error') {
          throw new Error(extractResult.details || 'Erro ao extrair dados do arquivo');
        }

        dados = (extractResult.output?.orcamentos || []).map(d => ({
          numero_orcamento: String(d.numero_orcamento || ''),
          cliente_nome: d.cliente_nome || '',
          vendedor_nome: d.vendedor_nome || '',
          data_orcamento: d.data_orcamento || '',
          data_validade: d.data_validade || '',
          status: 'pendente',
          valor_produtos: Number(d.valor_produtos) || 0,
          valor_servicos: Number(d.valor_servicos) || 0,
          desconto: Number(d.desconto) || 0,
          valor_total: Number(d.valor_total) || 0,
          outras_despesas: Number(d.outras_despesas) || 0,
          observacoes: d.observacoes || ''
        }));
      }

      if (dados.length === 0) {
        throw new Error('Nenhum orçamento válido encontrado. Verifique se os campos Número e Data estão preenchidos.');
      }

      updateProgress(90, 'Validando dados', 'Verificando integridade...');
      await new Promise(r => setTimeout(r, 300));

      // Adicionar IDs temporários
      const dadosComId = dados.map((d, idx) => ({
        id: `temp_${idx}_${Date.now()}`,
        ...d,
        valor_total: d.valor_total || Math.max(0, (d.valor_produtos || 0) + (d.valor_servicos || 0) - (d.desconto || 0) + (d.outras_despesas || 0))
      }));

      // Validar dados
      const validation = validateData(dadosComId);

      updateProgress(100, 'Concluído!', `${dados.length} orçamento(s) encontrado(s)`);
      await new Promise(r => setTimeout(r, 300));

      setPreviewData(dadosComId);
      setValidationResults(validation);
      setCurrentStep(3);

      toast({
        title: 'Extração concluída!',
        description: `${dados.length} orçamento(s) encontrado(s). Revise antes de importar.`
      });

    } catch (error) {
      if (error.message === 'Operação cancelada') return;

      console.error('Erro na extração:', error);

      // Registrar erro
      try {
        await base44.functions.invoke('registerAndAnalyzeError', {
          message: `Falha na importação: ${error.message}`,
          source: 'ImportarOrcamentosModal',
          component: 'ImportarOrcamentosModal',
          severity: 'error',
          extra: { fileName: file?.name, fileType: file?.type }
        });
      } catch (e) {}

      toast({
        title: 'Erro na extração',
        description: error.message,
        variant: 'destructive'
      });

      setCurrentStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const mapearColuna = (header) => {
    const h = header.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Ignorar colunas calculadas
    if (h.includes('margem') || h.includes('status') || h.includes('acao') || h.includes('resultado')) return null;
    
    if (h === 'nº' || h === 'no' || h === 'n°' || h === 'n' || h === 'numero' || h.includes('numero') || h.includes('nro')) return 'numero_orcamento';
    if (h === 'data' || h.includes('dt') || h.includes('data orcamento') || h.includes('data orc')) return 'data_orcamento';
    if (h.includes('validade')) return 'data_validade';
    if (h === 'cliente' || h.includes('cliente')) return 'cliente_nome';
    if (h === 'vendedor' || h.includes('vendedor')) return 'vendedor_nome';
    if (h === 'produtos' || h === 'produto' || h.includes('vl. produto') || h.includes('valor produto') || h.includes('prod')) return 'valor_produtos';
    if (h === 'servicos' || h === 'serviços' || h.includes('vl. servic') || h.includes('valor servic') || h.includes('serv')) return 'valor_servicos';
    if (h === 'desconto' || h.includes('desconto') || h.includes('desc')) return 'desconto';
    if (h.includes('total') && h.includes('cliente')) return 'valor_total';
    if (h === 'despesas' || h === 'despesa' || h.includes('outras despesas') || h.includes('desp')) return 'outras_despesas';
    if (h === 'total' && !h.includes('cliente')) return 'valor_total';
    if (h.includes('observ')) return 'observacoes';
    
    return null;
  };

  const parseCSVLine = (line, separador) => {
    const valores = [];
    let atual = '';
    let dentroAspas = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' || char === "'") {
        dentroAspas = !dentroAspas;
      } else if (char === separador && !dentroAspas) {
        valores.push(atual.trim());
        atual = '';
      } else {
        atual += char;
      }
    }
    valores.push(atual.trim());
    return valores;
  };

  const extrairOrcamento = (valores, colunaMap) => {
    const orcamento = {
      numero_orcamento: '',
      cliente_nome: '',
      vendedor_nome: '',
      data_orcamento: '',
      data_validade: '',
      status: 'pendente',
      valor_produtos: 0,
      valor_servicos: 0,
      desconto: 0,
      valor_total: 0,
      outras_despesas: 0,
      observacoes: ''
    };

    valores.forEach((valor, idx) => {
      const campo = colunaMap[idx];
      if (!campo) return;

      const valorLimpo = valor.replace(/^["']|["']$/g, '').trim();
      if (!valorLimpo || valorLimpo === '-') return;

      if (['valor_produtos', 'valor_servicos', 'desconto', 'valor_total', 'outras_despesas'].includes(campo)) {
        const numeroLimpo = valorLimpo.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
        orcamento[campo] = Number(numeroLimpo) || 0;
      } else {
        orcamento[campo] = valorLimpo;
      }
    });

    // Converter data DD/MM/YYYY para YYYY-MM-DD
    if (orcamento.data_orcamento && orcamento.data_orcamento.includes('/')) {
      const partes = orcamento.data_orcamento.split('/');
      if (partes.length === 3) {
        const [dia, mes, ano] = partes;
        orcamento.data_orcamento = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
    }

    return orcamento;
  };

  const handleEditRow = (id, field, value) => {
    setPreviewData(prev => {
      const updated = prev.map(row => row.id === id ? { ...row, [field]: value } : row);
      setValidationResults(validateData(updated));
      return updated;
    });
  };

  const handleDeleteRow = (id) => {
    setPreviewData(prev => {
      const updated = prev.filter(row => row.id !== id);
      setValidationResults(validateData(updated));
      return updated;
    });
  };

  const handleConfirmImport = async () => {
    if (!previewData || previewData.length === 0) {
      toast({ title: 'Nenhum dado para importar', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setCurrentStep(2);
    updateProgress(0, 'Iniciando importação', 'Carregando dados auxiliares...');

    try {
      const [clientesData, funcionariosData] = await Promise.all([
        base44.entities.Cliente.list(),
        base44.entities.Funcionario.list()
      ]);

      let sucessos = 0;
      let erros = 0;
      const mensagensErro = [];
      const clientesCriados = [];

      updateProgress(20, 'Importando', `0 de ${previewData.length}`);

      for (let i = 0; i < previewData.length; i++) {
        const linha = previewData[i];
        
        try {
          if (!linha.numero_orcamento?.trim() || !linha.data_orcamento?.trim()) {
            throw new Error('Número e data são obrigatórios');
          }

          // Buscar ou criar cliente
          let cliente = clientesData.find(c => 
            c.nome.toLowerCase().trim() === (linha.cliente_nome || '').toLowerCase().trim()
          );

          if (!cliente && linha.cliente_nome?.trim()) {
            try {
              cliente = await base44.entities.Cliente.create({
                nome: linha.cliente_nome.trim(),
                telefone: 'A completar'
              });
              clientesData.push(cliente);
              clientesCriados.push(linha.cliente_nome.trim());
            } catch (e) {}
          }

          const vendedor = funcionariosData.find(f => 
            f.nome.toLowerCase().trim() === (linha.vendedor_nome || '').toLowerCase().trim()
          );

          const subtotal = (Number(linha.valor_produtos) || 0) + (Number(linha.valor_servicos) || 0);
          const valorTotal = Math.max(0, subtotal - (Number(linha.desconto) || 0) + (Number(linha.outras_despesas) || 0));

          const itens = [];
          if (linha.valor_produtos > 0) {
            itens.push({
              tipo: 'produto',
              descricao: 'Produtos importados',
              quantidade: 1,
              valor_unitario: Number(linha.valor_produtos),
              desconto: 0,
              valor_total: Number(linha.valor_produtos)
            });
          }
          if (linha.valor_servicos > 0) {
            itens.push({
              tipo: 'servico',
              descricao: 'Serviços importados',
              quantidade: 1,
              valor_unitario: Number(linha.valor_servicos),
              desconto: 0,
              valor_total: Number(linha.valor_servicos)
            });
          }

          await base44.entities.Orcamento.create({
            numero_orcamento: linha.numero_orcamento.trim(),
            data_orcamento: linha.data_orcamento.trim(),
            contato_id: cliente?.id || '',
            contato_tipo: 'cliente',
            cliente_id: cliente?.id || '',
            vendedor_id: vendedor?.id || '',
            status: 'pendente',
            desconto_tipo: 'valor',
            desconto_valor: Number(linha.desconto) || 0,
            valor_total: valorTotal,
            itens,
            outras_despesas: Number(linha.outras_despesas) || 0,
            observacoes: linha.observacoes || ''
          });

          sucessos++;
        } catch (err) {
          erros++;
          mensagensErro.push(`${linha.numero_orcamento || 'N/A'}: ${err.message}`);
        }

        updateProgress(20 + Math.floor((i / previewData.length) * 70), 'Importando', `${i + 1} de ${previewData.length}`);
      }

      updateProgress(100, 'Concluído!', '');

      setResult({
        total: previewData.length,
        sucessos,
        erros,
        mensagensErro: mensagensErro.slice(0, 5),
        clientesCriados: clientesCriados.length
      });
      setCurrentStep(4);

      if (sucessos > 0) {
        toast({
          title: 'Importação concluída',
          description: `${sucessos} orçamento(s) importado(s)${erros > 0 ? `, ${erros} com erro` : ''}`
        });

        if (erros === 0) {
          setTimeout(() => onSuccess(), 2000);
        }
      }

    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive'
      });
      setCurrentStep(3);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (!isLoading) {
      setFile(null);
      setPreviewData(null);
      setValidationResults(null);
      setResult(null);
      setCurrentStep(1);
      onClose();
    }
  };

  const FileIcon = getFileIcon();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] md:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-0 rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 text-white px-4 md:px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Upload className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <span className="text-base md:text-lg font-semibold">Importar Orçamentos</span>
                <p className="text-xs text-slate-300 mt-0.5">PDF, CSV ou Excel (.xlsx)</p>
              </div>
            </DialogTitle>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 md:gap-4 mt-4 pt-4 border-t border-white/10">
            <ProgressStep step={1} currentStep={currentStep} label="Arquivo" icon={FileUp} isCompleted={currentStep > 1} />
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <ProgressStep step={2} currentStep={currentStep} label="Processando" icon={Wand2} isCompleted={currentStep > 2} />
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <ProgressStep step={3} currentStep={currentStep} label="Validar" icon={Edit3} isCompleted={currentStep > 3} />
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <ProgressStep step={4} currentStep={currentStep} label="Resultado" icon={CheckCircle2} isCompleted={result?.sucessos > 0} />
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {currentStep === 1 && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-5"
              >
                {/* Área de upload */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`
                    relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all duration-300 cursor-pointer
                    ${dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : file ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
                  `}
                >
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <div className={`
                      w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all
                      ${file ? 'bg-green-100' : dragActive ? 'bg-blue-100' : 'bg-slate-100'}
                    `}>
                      <FileIcon className={`w-8 h-8 md:w-10 md:h-10 ${file ? 'text-green-600' : dragActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>

                    {file ? (
                      <div className="space-y-2">
                        <p className="text-base md:text-lg font-semibold text-green-700">{file.name}</p>
                        <p className="text-sm text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Pronto para processar
                        </Badge>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-base md:text-lg font-medium text-slate-700">
                          <span className="text-blue-600">Clique para selecionar</span> ou arraste o arquivo
                        </p>
                        <p className="text-sm text-slate-500">PDF, CSV, Excel (.xlsx)</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Dicas e modelo */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Alert className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-sm text-slate-700">
                      <strong className="text-blue-700">IA Inteligente:</strong> Identificamos automaticamente as colunas e corrigimos dados inconsistentes.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Button
                      variant="outline"
                      onClick={downloadTemplate}
                      className="gap-2 bg-white hover:bg-slate-100"
                    >
                      <Download className="w-4 h-4" />
                      Baixar Modelo CSV
                    </Button>
                  </div>
                </div>

                {/* Colunas aceitas */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-2">COLUNAS RECONHECIDAS:</p>
                  <div className="flex flex-wrap gap-2">
                    {['Nº/Número', 'Data', 'Cliente', 'Vendedor', 'Produtos', 'Serviços', 'Desconto', 'Despesas', 'Observações'].map(col => (
                      <Badge key={col} variant="outline" className="bg-white text-slate-600 text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Processing */}
            {currentStep === 2 && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-12 space-y-6"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Wand2 className="w-4 h-4 text-blue-600" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">{loadingStage}</h3>
                  <p className="text-sm text-slate-500">{loadingSubStage}</p>
                </div>

                <div className="w-full max-w-md space-y-2">
                  <Progress value={loadingProgress} className="h-3" />
                  <p className="text-center text-sm font-medium text-blue-600">{loadingProgress}%</p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Validation & Preview */}
            {currentStep === 3 && previewData && (
              <motion.div
                key="validation"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Resumo de validação */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{previewData.length} orçamento(s)</h3>
                      <p className="text-xs text-slate-500">Revise e edite antes de importar</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {validationResults && (
                      <>
                        <ValidationBadge status="valid" count={validationResults.valid.length} />
                        {validationResults.warnings.length > 0 && (
                          <ValidationBadge status="warning" count={validationResults.warnings.length} />
                        )}
                        {validationResults.errors.length > 0 && (
                          <ValidationBadge status="error" count={validationResults.errors.length} />
                        )}
                      </>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewData(null);
                      setFile(null);
                      setCurrentStep(1);
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Outro arquivo
                  </Button>
                </div>

                {/* Alertas de validação */}
                {validationResults?.errors.length > 0 && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-sm text-red-700">
                      <strong>{validationResults.errors.length} registro(s) com erro</strong> - Corrija os campos obrigatórios antes de importar.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Tabela de preview */}
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-auto max-h-[350px]">
                    <Table>
                      <TableHeader className="bg-slate-800 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="text-white font-semibold text-xs px-3 w-32">Nº *</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-3 w-32">Data *</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-3 w-40">Cliente</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-3 w-36 hidden md:table-cell">Vendedor</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-3 w-28">Produtos</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-3 w-28 hidden lg:table-cell">Serviços</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-3 w-24 hidden lg:table-cell">Desconto</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-3 w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row) => {
                          const hasError = validationResults?.errors.some(e => e.row.id === row.id);
                          const hasWarning = validationResults?.warnings.some(w => w.row.id === row.id);
                          
                          return (
                            <TableRow 
                              key={row.id} 
                              className={`
                                transition-colors
                                ${hasError ? 'bg-red-50 hover:bg-red-100' : hasWarning ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-slate-50'}
                              `}
                            >
                              <TableCell className="px-3">
                                <Input
                                  value={row.numero_orcamento}
                                  onChange={(e) => handleEditRow(row.id, 'numero_orcamento', e.target.value)}
                                  className={`h-8 text-xs ${!row.numero_orcamento ? 'border-red-300 bg-red-50' : 'bg-white'}`}
                                />
                              </TableCell>
                              <TableCell className="px-3">
                                <Input
                                  type="date"
                                  value={row.data_orcamento}
                                  onChange={(e) => handleEditRow(row.id, 'data_orcamento', e.target.value)}
                                  className={`h-8 text-xs ${!row.data_orcamento ? 'border-red-300 bg-red-50' : 'bg-white'}`}
                                />
                              </TableCell>
                              <TableCell className="px-3">
                                <Input
                                  value={row.cliente_nome}
                                  onChange={(e) => handleEditRow(row.id, 'cliente_nome', e.target.value)}
                                  className="h-8 text-xs bg-white"
                                  placeholder="Cliente"
                                />
                              </TableCell>
                              <TableCell className="px-3 hidden md:table-cell">
                                <Input
                                  value={row.vendedor_nome}
                                  onChange={(e) => handleEditRow(row.id, 'vendedor_nome', e.target.value)}
                                  className="h-8 text-xs bg-white"
                                  placeholder="Vendedor"
                                />
                              </TableCell>
                              <TableCell className="px-3">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.valor_produtos}
                                  onChange={(e) => handleEditRow(row.id, 'valor_produtos', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs bg-white"
                                />
                              </TableCell>
                              <TableCell className="px-3 hidden lg:table-cell">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.valor_servicos}
                                  onChange={(e) => handleEditRow(row.id, 'valor_servicos', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs bg-white"
                                />
                              </TableCell>
                              <TableCell className="px-3 hidden lg:table-cell">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.desconto}
                                  onChange={(e) => handleEditRow(row.id, 'desconto', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs bg-white"
                                />
                              </TableCell>
                              <TableCell className="px-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteRow(row.id)}
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Result */}
            {currentStep === 4 && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-8 space-y-6"
              >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${result.erros === 0 ? 'bg-green-100' : 'bg-amber-100'}`}>
                  {result.erros === 0 ? (
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-10 h-10 text-amber-600" />
                  )}
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-slate-800">
                    {result.erros === 0 ? 'Importação Concluída!' : 'Importação Parcial'}
                  </h3>
                  <p className="text-slate-500">
                    {result.sucessos} de {result.total} orçamento(s) importado(s)
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-lg">
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-bold text-slate-800">{result.total}</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <p className="text-2xl font-bold text-green-600">{result.sucessos}</p>
                    <p className="text-xs text-green-600">Sucesso</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <p className="text-2xl font-bold text-red-600">{result.erros}</p>
                    <p className="text-xs text-red-600">Erros</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-bold text-blue-600">{result.clientesCriados}</p>
                    <p className="text-xs text-blue-600">Clientes Criados</p>
                  </div>
                </div>

                {result.mensagensErro.length > 0 && (
                  <Alert className="bg-red-50 border-red-200 w-full max-w-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-sm">
                      <ul className="list-disc list-inside space-y-1">
                        {result.mensagensErro.map((msg, idx) => (
                          <li key={idx} className="text-red-700 text-xs">{msg}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-4 md:px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-600 hover:text-slate-900"
          >
            {result?.sucessos > 0 && result?.erros === 0 ? 'Fechar' : 'Cancelar'}
          </Button>

          {currentStep === 1 && (
            <Button
              onClick={handleExtract}
              disabled={!file || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Processar Arquivo
            </Button>
          )}

          {currentStep === 3 && previewData && (
            <Button
              onClick={handleConfirmImport}
              disabled={isLoading || validationResults?.errors.length > 0}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Importar {previewData.length} Orçamento(s)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}