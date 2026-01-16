import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Eye, Trash2, 
  Loader2, FileText, Table as TableIcon, Sparkles, Check, X, AlertTriangle,
  RefreshCw, Edit3, ArrowRight, FileUp, Wand2, Settings2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';

// Campos disponíveis para importação
const CAMPOS_IMPORTACAO = [
  { key: 'numero_orcamento', label: 'Nº Orçamento', defaultRequired: true },
  { key: 'data_orcamento', label: 'Data', defaultRequired: true },
  { key: 'cliente_nome', label: 'Cliente', defaultRequired: false },
  { key: 'vendedor_nome', label: 'Vendedor', defaultRequired: false },
  { key: 'valor_produtos', label: 'Valor Produtos', defaultRequired: false },
  { key: 'valor_servicos', label: 'Valor Serviços', defaultRequired: false },
  { key: 'desconto', label: 'Desconto', defaultRequired: false },
  { key: 'outras_despesas', label: 'Outras Despesas', defaultRequired: false },
  { key: 'observacoes', label: 'Observações', defaultRequired: false },
  { key: 'data_validade', label: 'Data Validade', defaultRequired: false },
];

// Componente de etapa de progresso
const ProgressStep = ({ step, currentStep, label, icon: Icon, isCompleted }) => {
  const isActive = currentStep === step;
  const isPast = currentStep > step || isCompleted;
  
  return (
    <div className="flex items-center gap-1.5">
      <div className={`
        w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-300
        ${isPast ? 'bg-green-500 text-white' : 
          isActive ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 
          'bg-slate-200 text-slate-500'}
      `}>
        {isPast ? <Check className="w-3 h-3 md:w-4 md:h-4" /> : <Icon className="w-3 h-3 md:w-4 md:h-4" />}
      </div>
      <span className={`text-[10px] md:text-xs font-medium hidden sm:block ${isActive ? 'text-blue-600' : isPast ? 'text-green-600' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
};

// Indicador de status de validação
const ValidationBadge = ({ status, count }) => {
  if (status === 'valid') {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-[10px] md:text-xs px-1.5 md:px-2">
        <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
        {count}
      </Badge>
    );
  }
  if (status === 'warning') {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 text-[10px] md:text-xs px-1.5 md:px-2">
        <AlertTriangle className="w-2.5 h-2.5 md:w-3 md:h-3" />
        {count}
      </Badge>
    );
  }
  if (status === 'error') {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 text-[10px] md:text-xs px-1.5 md:px-2">
        <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
        {count}
      </Badge>
    );
  }
  return null;
};

export default function ImportarOrcamentosModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingSubStage, setLoadingSubStage] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [requiredFields, setRequiredFields] = useState(
    CAMPOS_IMPORTACAO.filter(c => c.defaultRequired).map(c => c.key)
  );
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

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setFile(null);
      setPreviewData(null);
      setValidationResults(null);
      setResult(null);
      setLoadingProgress(0);
      setShowConfig(false);
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

  const downloadTemplate = async () => {
    // Criar CSV com todos os campos
    const headers = CAMPOS_IMPORTACAO.map(c => c.key).join(',');
    const exampleRow = [
      'ORC-001',           // numero_orcamento
      '2024-01-15',        // data_orcamento
      'João Silva',        // cliente_nome
      'Maria Vendedora',   // vendedor_nome
      '1500.00',           // valor_produtos
      '800.00',            // valor_servicos
      '100.00',            // desconto
      '50.00',             // outras_despesas
      'Orçamento de exemplo', // observacoes
      '2024-02-15',        // data_validade
    ].join(',');
    
    const exampleRow2 = [
      'ORC-002',
      '2024-01-16',
      'José Santos',
      'Pedro Vendedor',
      '2000.00',
      '500.00',
      '150.00',
      '0.00',
      'Outro exemplo',
      '2024-02-16',
    ].join(',');

    const csvContent = `${headers}\n${exampleRow}\n${exampleRow2}`;

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_orcamentos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Modelo baixado!',
      description: 'Abra no Excel, preencha e salve como .xlsx ou .csv'
    });
  };

  const toggleRequiredField = (fieldKey) => {
    setRequiredFields(prev => {
      if (prev.includes(fieldKey)) {
        return prev.filter(k => k !== fieldKey);
      }
      return [...prev, fieldKey];
    });
  };

  const validateData = (data) => {
    const results = { valid: [], warnings: [], errors: [] };

    data.forEach((row, idx) => {
      const issues = [];
      let hasError = false;

      // Validar campos obrigatórios configurados
      requiredFields.forEach(fieldKey => {
        const campo = CAMPOS_IMPORTACAO.find(c => c.key === fieldKey);
        const value = row[fieldKey];
        
        if (!value || String(value).trim() === '') {
          issues.push({ field: fieldKey, message: `${campo?.label || fieldKey} obrigatório`, type: 'error' });
          hasError = true;
        }
      });

      // Validação de formato de data
      if (row.data_orcamento && row.data_orcamento.trim() !== '') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row.data_orcamento)) {
          issues.push({ field: 'data_orcamento', message: 'Formato inválido (use AAAA-MM-DD)', type: 'warning' });
        }
      }

      // Avisos opcionais
      if (!row.cliente_nome || row.cliente_nome.trim() === '') {
        if (!requiredFields.includes('cliente_nome')) {
          issues.push({ field: 'cliente_nome', message: 'Sem cliente', type: 'warning' });
        }
      }

      if ((Number(row.valor_produtos) || 0) === 0 && (Number(row.valor_servicos) || 0) === 0) {
        issues.push({ field: 'valores', message: 'Sem valores', type: 'warning' });
      }

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
      toast({ title: 'Nenhum arquivo selecionado', variant: 'destructive' });
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
        await new Promise(r => setTimeout(r, 200));
        
        const text = await file.text();
        updateProgress(25, 'Analisando estrutura', 'Identificando colunas...');
        await new Promise(r => setTimeout(r, 200));

        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('Arquivo vazio ou sem dados após o cabeçalho.');
        }

        const primeiraLinha = lines[0];
        const separador = primeiraLinha.includes(';') ? ';' : ',';
        const headers = primeiraLinha.split(separador).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

        updateProgress(40, 'Mapeando colunas', `${headers.length} colunas encontradas`);
        await new Promise(r => setTimeout(r, 200));

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
          dados.push(orcamento);

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
                    numero_orcamento: { type: "string", description: "Número do orçamento (coluna Nº, N°, Numero)" },
                    cliente_nome: { type: "string", description: "Nome do cliente (coluna Cliente)" },
                    vendedor_nome: { type: "string", description: "Nome do vendedor (coluna Vendedor)" },
                    data_orcamento: { type: "string", description: "Data do orçamento no formato YYYY-MM-DD (coluna Data)" },
                    data_validade: { type: "string", description: "Data de validade no formato YYYY-MM-DD" },
                    valor_produtos: { type: "number", description: "Valor total de produtos" },
                    valor_servicos: { type: "number", description: "Valor total de serviços" },
                    desconto: { type: "number", description: "Valor do desconto" },
                    outras_despesas: { type: "number", description: "Outras despesas" },
                    observacoes: { type: "string", description: "Observações" }
                  },
                  required: ["numero_orcamento"]
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
        throw new Error('Nenhum orçamento encontrado no arquivo.');
      }

      updateProgress(90, 'Validando dados', 'Verificando integridade...');
      await new Promise(r => setTimeout(r, 200));

      const dadosComId = dados.map((d, idx) => ({
        id: `temp_${idx}_${Date.now()}`,
        ...d,
        valor_total: d.valor_total || Math.max(0, (d.valor_produtos || 0) + (d.valor_servicos || 0) - (d.desconto || 0) + (d.outras_despesas || 0))
      }));

      const validation = validateData(dadosComId);

      updateProgress(100, 'Concluído!', `${dados.length} orçamento(s) encontrado(s)`);
      await new Promise(r => setTimeout(r, 200));

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
    
    if (h.includes('margem') || h.includes('status') || h.includes('acao') || h.includes('resultado')) return null;
    
    if (h === 'nº' || h === 'no' || h === 'n°' || h === 'n' || h === 'numero' || h.includes('numero') || h.includes('nro') || h === 'numero_orcamento') return 'numero_orcamento';
    if (h === 'data' || h.includes('dt') || h.includes('data orcamento') || h.includes('data orc') || h === 'data_orcamento') return 'data_orcamento';
    if (h.includes('validade') || h === 'data_validade') return 'data_validade';
    if (h === 'cliente' || h.includes('cliente') || h === 'cliente_nome') return 'cliente_nome';
    if (h === 'vendedor' || h.includes('vendedor') || h === 'vendedor_nome') return 'vendedor_nome';
    if (h === 'produtos' || h === 'produto' || h.includes('vl. produto') || h.includes('valor produto') || h.includes('prod') || h === 'valor_produtos') return 'valor_produtos';
    if (h === 'servicos' || h === 'serviços' || h.includes('vl. servic') || h.includes('valor servic') || h.includes('serv') || h === 'valor_servicos') return 'valor_servicos';
    if (h === 'desconto' || h.includes('desconto') || h.includes('desc')) return 'desconto';
    if (h.includes('total') && h.includes('cliente')) return 'valor_total';
    if (h === 'despesas' || h === 'despesa' || h.includes('outras despesas') || h.includes('desp') || h === 'outras_despesas') return 'outras_despesas';
    if (h === 'total' && !h.includes('cliente')) return 'valor_total';
    if (h.includes('observ') || h === 'observacoes') return 'observacoes';
    
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
    updateProgress(0, 'Iniciando importação', 'Carregando dados...');

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
          // Validar campos obrigatórios
          for (const fieldKey of requiredFields) {
            const value = linha[fieldKey];
            if (!value || String(value).trim() === '') {
              const campo = CAMPOS_IMPORTACAO.find(c => c.key === fieldKey);
              throw new Error(`${campo?.label || fieldKey} é obrigatório`);
            }
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

          // Buscar vendedor
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
            data_orcamento: linha.data_orcamento?.trim() || new Date().toISOString().split('T')[0],
            data_validade: linha.data_validade?.trim() || '',
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
      setShowConfig(false);
      onClose();
    }
  };

  const FileIcon = getFileIcon();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[98vw] md:max-w-5xl max-h-[95vh] md:max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-0 rounded-xl md:rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 text-white px-3 md:px-6 py-3 md:py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 md:gap-3 text-white">
              <div className="h-8 w-8 md:h-12 md:w-12 rounded-lg md:rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Upload className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <span className="text-sm md:text-lg font-semibold">Importar Orçamentos</span>
                <p className="text-[10px] md:text-xs text-slate-300 mt-0.5">PDF, CSV ou Excel</p>
              </div>
            </DialogTitle>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-1 md:gap-4 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/10">
            <ProgressStep step={1} currentStep={currentStep} label="Arquivo" icon={FileUp} isCompleted={currentStep > 1} />
            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-slate-500" />
            <ProgressStep step={2} currentStep={currentStep} label="Processando" icon={Wand2} isCompleted={currentStep > 2} />
            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-slate-500" />
            <ProgressStep step={3} currentStep={currentStep} label="Validar" icon={Edit3} isCompleted={currentStep > 3} />
            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-slate-500" />
            <ProgressStep step={4} currentStep={currentStep} label="Resultado" icon={CheckCircle2} isCompleted={result?.sucessos > 0} />
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {currentStep === 1 && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Área de upload */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`
                    relative border-2 border-dashed rounded-xl md:rounded-2xl p-6 md:p-10 text-center transition-all duration-300 cursor-pointer
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
                      w-14 h-14 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 rounded-xl md:rounded-2xl flex items-center justify-center transition-all
                      ${file ? 'bg-green-100' : dragActive ? 'bg-blue-100' : 'bg-slate-100'}
                    `}>
                      <FileIcon className={`w-7 h-7 md:w-10 md:h-10 ${file ? 'text-green-600' : dragActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>

                    {file ? (
                      <div className="space-y-1.5 md:space-y-2">
                        <p className="text-sm md:text-lg font-semibold text-green-700 truncate max-w-[250px] mx-auto">{file.name}</p>
                        <p className="text-xs md:text-sm text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] md:text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Pronto
                        </Badge>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-sm md:text-lg font-medium text-slate-700">
                          <span className="text-blue-600">Toque para selecionar</span>
                          <span className="hidden md:inline"> ou arraste o arquivo</span>
                        </p>
                        <p className="text-xs md:text-sm text-slate-500">PDF, CSV, Excel (.xlsx)</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Botões de ação */}
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="flex-1 gap-2 bg-white hover:bg-slate-100 text-xs md:text-sm h-9 md:h-10"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Modelo
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowConfig(!showConfig)}
                    className={`flex-1 gap-2 text-xs md:text-sm h-9 md:h-10 ${showConfig ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white hover:bg-slate-100'}`}
                  >
                    <Settings2 className="w-4 h-4" />
                    Campos Obrigatórios
                  </Button>
                </div>

                {/* Configuração de campos obrigatórios */}
                {showConfig && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-50 rounded-xl p-3 md:p-4 border border-slate-200"
                  >
                    <p className="text-xs md:text-sm font-semibold text-slate-700 mb-3">Selecione os campos obrigatórios:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                      {CAMPOS_IMPORTACAO.map(campo => (
                        <label key={campo.key} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={requiredFields.includes(campo.key)}
                            onCheckedChange={() => toggleRequiredField(campo.key)}
                            className="w-4 h-4"
                          />
                          <span className="text-xs md:text-sm text-slate-700">{campo.label}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Info */}
                <Alert className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-xs md:text-sm text-slate-700">
                    <strong className="text-blue-700">IA Inteligente:</strong> Identificamos automaticamente colunas e corrigimos dados.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Step 2: Processing */}
            {currentStep === 2 && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-8 md:py-12 space-y-5 md:space-y-6"
              >
                <div className="relative">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-white animate-spin" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Wand2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
                  </div>
                </div>

                <div className="text-center space-y-1.5 md:space-y-2">
                  <h3 className="text-lg md:text-xl font-bold text-slate-800">{loadingStage}</h3>
                  <p className="text-xs md:text-sm text-slate-500">{loadingSubStage}</p>
                </div>

                <div className="w-full max-w-md space-y-2">
                  <Progress value={loadingProgress} className="h-2.5 md:h-3" />
                  <p className="text-center text-xs md:text-sm font-medium text-blue-600">{loadingProgress}%</p>
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
                className="space-y-3 md:space-y-4"
              >
                {/* Resumo de validação */}
                <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 p-3 md:p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Eye className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm md:text-base">{previewData.length} orçamento(s)</h3>
                      <p className="text-[10px] md:text-xs text-slate-500">Revise antes de importar</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 md:gap-2">
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
                    className="gap-1.5 text-[10px] md:text-xs h-7 md:h-8"
                  >
                    <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Outro arquivo</span>
                  </Button>
                </div>

                {/* Alertas de validação */}
                {validationResults?.errors.length > 0 && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-xs md:text-sm text-red-700">
                      <strong>{validationResults.errors.length} registro(s) com erro</strong> - Corrija antes de importar.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Tabela de preview - Versão Mobile */}
                <div className="md:hidden space-y-2">
                  {previewData.slice(0, 10).map((row) => {
                    const hasError = validationResults?.errors.some(e => e.row.id === row.id);
                    const hasWarning = validationResults?.warnings.some(w => w.row.id === row.id);
                    
                    return (
                      <div 
                        key={row.id} 
                        className={`p-3 rounded-lg border ${hasError ? 'bg-red-50 border-red-200' : hasWarning ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 mr-2">
                            <Input
                              value={row.numero_orcamento}
                              onChange={(e) => handleEditRow(row.id, 'numero_orcamento', e.target.value)}
                              placeholder="Nº *"
                              className={`h-7 text-xs mb-1.5 ${!row.numero_orcamento ? 'border-red-300' : ''}`}
                            />
                            <Input
                              type="date"
                              value={row.data_orcamento}
                              onChange={(e) => handleEditRow(row.id, 'data_orcamento', e.target.value)}
                              className={`h-7 text-xs ${!row.data_orcamento && requiredFields.includes('data_orcamento') ? 'border-red-300' : ''}`}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRow(row.id)}
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input
                            value={row.cliente_nome}
                            onChange={(e) => handleEditRow(row.id, 'cliente_nome', e.target.value)}
                            placeholder="Cliente"
                            className="h-7 text-xs"
                          />
                          <Input
                            value={row.vendedor_nome}
                            onChange={(e) => handleEditRow(row.id, 'vendedor_nome', e.target.value)}
                            placeholder="Vendedor"
                            className="h-7 text-xs"
                          />
                          <Input
                            type="number"
                            value={row.valor_produtos || ''}
                            onChange={(e) => handleEditRow(row.id, 'valor_produtos', parseFloat(e.target.value) || 0)}
                            placeholder="Produtos"
                            className="h-7 text-xs"
                          />
                          <Input
                            type="number"
                            value={row.valor_servicos || ''}
                            onChange={(e) => handleEditRow(row.id, 'valor_servicos', parseFloat(e.target.value) || 0)}
                            placeholder="Serviços"
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {previewData.length > 10 && (
                    <p className="text-center text-xs text-slate-500 py-2">
                      + {previewData.length - 10} registro(s) não exibido(s)
                    </p>
                  )}
                </div>

                {/* Tabela de preview - Versão Desktop */}
                <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-auto max-h-[300px]">
                    <Table>
                      <TableHeader className="bg-slate-800 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="text-white font-semibold text-xs px-2 w-28">Nº *</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-2 w-28">Data *</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-2 w-36">Cliente</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-2 w-32">Vendedor</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-2 w-24">Produtos</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-2 w-24">Serviços</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-2 w-20">Desc.</TableHead>
                          <TableHead className="text-white font-semibold text-xs px-2 w-14"></TableHead>
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
                              <TableCell className="px-2">
                                <Input
                                  value={row.numero_orcamento}
                                  onChange={(e) => handleEditRow(row.id, 'numero_orcamento', e.target.value)}
                                  className={`h-7 text-xs ${!row.numero_orcamento ? 'border-red-300 bg-red-50' : 'bg-white'}`}
                                />
                              </TableCell>
                              <TableCell className="px-2">
                                <Input
                                  type="date"
                                  value={row.data_orcamento}
                                  onChange={(e) => handleEditRow(row.id, 'data_orcamento', e.target.value)}
                                  className={`h-7 text-xs ${!row.data_orcamento && requiredFields.includes('data_orcamento') ? 'border-red-300 bg-red-50' : 'bg-white'}`}
                                />
                              </TableCell>
                              <TableCell className="px-2">
                                <Input
                                  value={row.cliente_nome}
                                  onChange={(e) => handleEditRow(row.id, 'cliente_nome', e.target.value)}
                                  className="h-7 text-xs bg-white"
                                  placeholder="Cliente"
                                />
                              </TableCell>
                              <TableCell className="px-2">
                                <Input
                                  value={row.vendedor_nome}
                                  onChange={(e) => handleEditRow(row.id, 'vendedor_nome', e.target.value)}
                                  className="h-7 text-xs bg-white"
                                  placeholder="Vendedor"
                                />
                              </TableCell>
                              <TableCell className="px-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.valor_produtos || ''}
                                  onChange={(e) => handleEditRow(row.id, 'valor_produtos', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs bg-white"
                                />
                              </TableCell>
                              <TableCell className="px-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.valor_servicos || ''}
                                  onChange={(e) => handleEditRow(row.id, 'valor_servicos', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs bg-white"
                                />
                              </TableCell>
                              <TableCell className="px-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.desconto || ''}
                                  onChange={(e) => handleEditRow(row.id, 'desconto', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs bg-white"
                                />
                              </TableCell>
                              <TableCell className="px-1">
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
                className="flex flex-col items-center justify-center py-6 md:py-8 space-y-4 md:space-y-6"
              >
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center ${result.erros === 0 ? 'bg-green-100' : 'bg-amber-100'}`}>
                  {result.erros === 0 ? (
                    <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 md:w-10 md:h-10 text-amber-600" />
                  )}
                </div>

                <div className="text-center space-y-1.5 md:space-y-2">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-800">
                    {result.erros === 0 ? 'Importação Concluída!' : 'Importação Parcial'}
                  </h3>
                  <p className="text-sm md:text-base text-slate-500">
                    {result.sucessos} de {result.total} orçamento(s) importado(s)
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 w-full max-w-lg">
                  <div className="text-center p-3 md:p-4 bg-slate-50 rounded-xl">
                    <p className="text-xl md:text-2xl font-bold text-slate-800">{result.total}</p>
                    <p className="text-[10px] md:text-xs text-slate-500">Total</p>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-green-50 rounded-xl">
                    <p className="text-xl md:text-2xl font-bold text-green-600">{result.sucessos}</p>
                    <p className="text-[10px] md:text-xs text-green-600">Sucesso</p>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-red-50 rounded-xl">
                    <p className="text-xl md:text-2xl font-bold text-red-600">{result.erros}</p>
                    <p className="text-[10px] md:text-xs text-red-600">Erros</p>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-blue-50 rounded-xl">
                    <p className="text-xl md:text-2xl font-bold text-blue-600">{result.clientesCriados}</p>
                    <p className="text-[10px] md:text-xs text-blue-600">Clientes</p>
                  </div>
                </div>

                {result.mensagensErro.length > 0 && (
                  <Alert className="bg-red-50 border-red-200 w-full max-w-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-xs md:text-sm">
                      <ul className="list-disc list-inside space-y-1">
                        {result.mensagensErro.map((msg, idx) => (
                          <li key={idx} className="text-red-700 text-[10px] md:text-xs truncate">{msg}</li>
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
        <div className="flex justify-end gap-2 md:gap-3 px-3 md:px-6 py-3 md:py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-600 hover:text-slate-900 text-xs md:text-sm h-8 md:h-9"
          >
            {result?.sucessos > 0 && result?.erros === 0 ? 'Fechar' : 'Cancelar'}
          </Button>

          {currentStep === 1 && (
            <Button
              onClick={handleExtract}
              disabled={!file || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-9"
            >
              <Wand2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Processar
            </Button>
          )}

          {currentStep === 3 && previewData && (
            <Button
              onClick={handleConfirmImport}
              disabled={isLoading || validationResults?.errors.length > 0}
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-9"
            >
              <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Importar ({previewData.length})
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}