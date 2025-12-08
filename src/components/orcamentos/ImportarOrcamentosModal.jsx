import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Eye, Trash2, Loader2, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

export default function ImportarOrcamentosModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [result, setResult] = useState(null);
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
    if (previewData) {
      console.log('✅ [PREVIEW] Preview data atualizado:', previewData.length, 'registros');
    }
  }, [previewData]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type) &&
          !selectedFile.name.endsWith('.csv') &&
          !selectedFile.name.endsWith('.xlsx') &&
          !selectedFile.name.endsWith('.pdf')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo CSV, Excel ou PDF',
          variant: 'destructive'
        });
        return;
      }
      setFile(selectedFile);
      setPreviewData(null);
      setResult(null);
    }
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
      description: 'O arquivo modelo_orcamentos.csv foi baixado com sucesso.'
    });
  };

  const handleExtract = async () => {
    if (!file) {
      toast({
        title: 'Nenhum arquivo selecionado',
        description: 'Por favor, selecione um arquivo para extrair',
        variant: 'destructive'
      });
      return;
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setLoadingProgress(10);
    setLoadingMessage('Iniciando processamento...');

    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv') ||
                    file.name.toLowerCase().endsWith('.xlsx') ||
                    file.type.includes('csv') ||
                    file.type.includes('spreadsheet');

      if (isCSV) {
        console.log('📊 Processando CSV...');
        setLoadingProgress(30);
        setLoadingMessage('Lendo arquivo CSV...');

        const text = await file.text();
        console.log('📄 Arquivo lido, tamanho:', text.length);

        const lines = text.split('\n').filter(line => line.trim());
        console.log('📋 Total de linhas:', lines.length);

        if (lines.length < 2) {
          throw new Error('Arquivo CSV vazio ou inválido. É necessário pelo menos um cabeçalho e uma linha de dados.');
        }

        const primeiraLinha = lines[0];
        const separador = primeiraLinha.includes(';') ? ';' : ',';
        console.log('🔧 Separador detectado:', separador);

        const headers = primeiraLinha.split(separador).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        console.log('📌 Colunas encontradas:', headers);

        const mapearColuna = (header) => {
          const h = header.toLowerCase().trim().replace(/\s+/g, ' ');
          console.log('🔍 Tentando mapear coluna:', `"${header}"`, '→ normalizado:', `"${h}"`);
          
          if (h.includes('margem') || h.includes('status') || h.includes('acao') || h.includes('açao') || h.includes('acoes') || h.includes('ações')) {
            console.log('   ⏭️ Coluna ignorada (calculada/controle)');
            return null;
          }
          
          if (h.includes('resultado') && h.includes('empresa')) {
            console.log('   ⏭️ Coluna ignorada (calculada)');
            return null;
          }
          
          if (h === 'nº' || h === 'no' || h === 'n°' || h === 'n' || h === 'numero' || h.includes('numero') || h.includes('nro')) {
            console.log('   ✅ Mapeado para: numero_orcamento');
            return 'numero_orcamento';
          }
          
          if (h === 'data' || h === 'dados' || h.includes('dt') || h.includes('data orcamento') || h.includes('data orc')) {
            console.log('   ✅ Mapeado para: data_orcamento');
            return 'data_orcamento';
          }
          if (h.includes('validade')) {
            console.log('   ✅ Mapeado para: data_validade');
            return 'data_validade';
          }
          
          if (h === 'cliente' || h.includes('cliente')) {
            console.log('   ✅ Mapeado para: cliente_nome');
            return 'cliente_nome';
          }
          
          if (h === 'vendedor' || h.includes('vendedor')) {
            console.log('   ✅ Mapeado para: vendedor_nome');
            return 'vendedor_nome';
          }
          
          if (h === 'produtos' || h === 'produto' || h.includes('vl. produto') || h.includes('valor produto') || h.includes('prod')) {
            console.log('   ✅ Mapeado para: valor_produtos');
            return 'valor_produtos';
          }
          if (h === 'servicos' || h === 'serviços' || h === 'servico' || h === 'serviço' || h.includes('vl. servic') || h.includes('valor servic') || h.includes('serv')) {
            console.log('   ✅ Mapeado para: valor_servicos');
            return 'valor_servicos';
          }
          if (h === 'desconto' || h.includes('desconto') || h.includes('desc')) {
            console.log('   ✅ Mapeado para: desconto');
            return 'desconto';
          }
          
          if (h.includes('total') && h.includes('cliente')) {
            console.log('   ✅ Mapeado para: valor_total');
            return 'valor_total';
          }
          
          if (h === 'despesas' || h === 'despesa' || h.includes('outras despesas') || h.includes('outras desp') || h.includes('desp')) {
            console.log('   ✅ Mapeado para: outras_despesas');
            return 'outras_despesas';
          }
          
          if (h === 'total' && !h.includes('cliente')) {
            console.log('   ✅ Mapeado para: valor_total');
            return 'valor_total';
          }
          
          if (h.includes('observ')) {
            console.log('   ✅ Mapeado para: observacoes');
            return 'observacoes';
          }
          
          console.log('   ⚠️ Coluna não mapeada');
          return null;
        };

        const colunaMap = {};
        headers.forEach((h, idx) => {
          const campo = mapearColuna(h);
          if (campo) {
            colunaMap[idx] = campo;
            console.log(`✅ Coluna ${idx} (${h}) mapeada para: ${campo}`);
          }
        });

        console.log('📊 Mapeamento final:', colunaMap);
        console.log('📊 Total de colunas mapeadas:', Object.keys(colunaMap).length);

        if (Object.keys(colunaMap).length === 0) {
          throw new Error('Não foi possível identificar as colunas do CSV. Verifique se o cabeçalho contém: numero_orcamento, cliente_nome, data_orcamento, etc.');
        }

        setLoadingProgress(60);
        setLoadingMessage('Extraindo dados das linhas...');

        const dados = [];
        for (let i = 1; i < lines.length; i++) {
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Operação cancelada');
          }

          const line = lines[i].trim();
          if (!line) continue;

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
            if (campo) {
              const valorLimpo = valor.replace(/^["']|["']$/g, '').trim();

              if (!valorLimpo || valorLimpo === '' || valorLimpo === '-') {
                return;
              }
              
              if (['valor_produtos', 'valor_servicos', 'desconto', 'valor_total', 'outras_despesas'].includes(campo)) {
                try {
                  const numeroLimpo = valorLimpo
                    .replace(/[R$\s]/g, '')
                    .replace(/\./g, '')
                    .replace(',', '.');

                  const numero = Number(numeroLimpo);
                  orcamento[campo] = isNaN(numero) ? 0 : numero;
                } catch (e) {
                  console.warn(`Erro ao converter ${campo}:`, valorLimpo, e);
                  orcamento[campo] = 0;
                }
              } else {
                orcamento[campo] = valorLimpo;
              }
            }
          });

          if (!orcamento.numero_orcamento || orcamento.numero_orcamento === '') {
            console.warn(`⚠️ Linha ${i + 1} sem número de orçamento - será rejeitada`);
            continue;
          }

          if (!orcamento.data_orcamento || orcamento.data_orcamento === '') {
            console.warn(`⚠️ Linha ${i + 1} sem data de orçamento - será rejeitada`);
            continue;
          }

          if (orcamento.data_orcamento && orcamento.data_orcamento.includes('/')) {
            try {
              const partes = orcamento.data_orcamento.split('/');
              if (partes.length === 3) {
                const [dia, mes, ano] = partes;
                orcamento.data_orcamento = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
              }
            } catch (e) {
              console.warn('⚠️ Erro ao converter data:', orcamento.data_orcamento, e);
              continue;
            }
          }

          if (orcamento.valor_total === 0 || !orcamento.valor_total) {
            const subtotal = (orcamento.valor_produtos || 0) + (orcamento.valor_servicos || 0);
            orcamento.valor_total = Math.max(0, subtotal - (orcamento.desconto || 0) + (orcamento.outras_despesas || 0));
          }

          if (orcamento.numero_orcamento && orcamento.data_orcamento) {
            dados.push(orcamento);
          } else {
            console.warn(`⚠️ Linha ${i + 1} rejeitada - faltam dados obrigatórios (número ou data do orçamento)`);
          }
        }

        console.log(`✅ ${dados.length} orçamentos extraídos`);

        if (dados.length === 0) {
          throw new Error('Nenhum orçamento válido encontrado no arquivo. Verifique se há dados nas linhas após o cabeçalho, e se os campos obrigatórios (Número e Data do Orçamento) estão preenchidos.');
        }

        setLoadingProgress(90);
        setLoadingMessage('Preparando prévia...');

        const dadosComId = dados.map((d, idx) => ({
          id: `temp_${idx}_${Date.now()}`,
          ...d,
        }));

        console.log('📊 [PREVIEW] Definindo preview data:', dadosComId.length, 'registros');

        if (!mountedRef.current) {
          console.warn('⚠️ Componente desmontado, abortando');
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        setPreviewData(dadosComId);

        await new Promise(resolve => setTimeout(resolve, 100));

        setLoadingProgress(100);
        setLoadingMessage('Concluído!');

        toast({
          title: 'Dados extraídos com sucesso!',
          description: `${dados.length} orçamento(s) encontrado(s). Revise antes de importar.`
        });

      } else {
        console.log('📤 Fazendo upload do arquivo...');
        setLoadingProgress(20);
        setLoadingMessage('Enviando arquivo para servidor...');

        const uploadResponse = await base44.integrations.Core.UploadFile({ file });
        console.log('✅ Upload concluído:', uploadResponse);

        const file_url = uploadResponse.file_url;

        if (!file_url) {
          throw new Error('URL do arquivo não retornada pelo upload');
        }

        if (!mountedRef.current) return;

        setLoadingProgress(40);
        setLoadingMessage('Analisando conteúdo com IA... Isso pode levar alguns minutos...');
        console.log('🔍 Extraindo dados do arquivo...', file_url);

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
                    numero_orcamento: { type: "string" },
                    cliente_nome: { type: "string" },
                    vendedor_nome: { type: "string" },
                    data_orcamento: { type: "string" },
                    data_validade: { type: "string" },
                    status: { type: "string" },
                    valor_produtos: { type: "number" },
                    valor_servicos: { type: "number" },
                    desconto: { type: "number" },
                    valor_total: { type: "number" },
                    outras_despesas: { type: "number" },
                    observacoes: { type: "string" }
                  },
                  required: ["numero_orcamento", "data_orcamento"]
                }
              }
            }
          }
        });

        console.log('📊 Resultado da extração:', extractResult);

        if (!mountedRef.current) return;

        setLoadingProgress(70);
        setLoadingMessage('Processando dados extraídos...');

        if (extractResult.status === 'error') {
          throw new Error(extractResult.details || 'Erro ao extrair dados do arquivo');
        }

        const dados = extractResult.output?.orcamentos || [];

        console.log('📋 Dados extraídos:', dados);

        if (!Array.isArray(dados) || dados.length === 0) {
          throw new Error('Nenhum orçamento encontrado no arquivo. Verifique se o PDF contém uma tabela com os dados esperados.');
        }

        setLoadingProgress(90);
        setLoadingMessage('Preparando prévia...');

        const dadosComId = dados.map((d, idx) => ({
          id: `temp_${idx}_${Date.now()}`,
          numero_orcamento: d.numero_orcamento,
          cliente_nome: d.cliente_nome || '',
          vendedor_nome: d.vendedor_nome || '',
          data_orcamento: d.data_orcamento,
          data_validade: d.data_validade || '',
          status: d.status || 'pendente',
          valor_produtos: Number(d.valor_produtos) || 0,
          valor_servicos: Number(d.valor_servicos) || 0,
          desconto: Number(d.desconto) || 0,
          valor_total: Number(d.valor_total) || 0,
          outras_despesas: Number(d.outras_despesas) || 0,
          observacoes: d.observacoes || ''
        }));

        console.log('📊 [PREVIEW] Definindo preview data:', dadosComId.length, 'registros');

        if (!mountedRef.current) return;

        await new Promise(resolve => setTimeout(resolve, 100));

        setPreviewData(dadosComId);

        await new Promise(resolve => setTimeout(resolve, 100));

        setLoadingProgress(100);
        setLoadingMessage('Concluído!');

        toast({
          title: 'Dados extraídos com sucesso!',
          description: `${dados.length} orçamento(s) encontrado(s). Revise antes de importar.`
        });
      }

    } catch (error) {
      if (error.message === 'Operação cancelada') {
        console.log('⚠️ Operação cancelada pelo usuário');
        return;
      }

      console.error('❌ Erro ao extrair:', error);

      if (mountedRef.current) {
        toast({
          title: 'Erro na extração',
          description: error.message || 'Não foi possível extrair dados do arquivo',
          variant: 'destructive'
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setLoadingProgress(0);
        setLoadingMessage('');
      }
    }
  };

  const handleEditRow = (id, field, value) => {
    setPreviewData(prev => prev.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleDeleteRow = (id) => {
    setPreviewData(prev => prev.filter(row => row.id !== id));
  };

  const handleConfirmImport = async () => {
    if (!previewData || previewData.length === 0) {
      toast({
        title: 'Nenhum dado para importar',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const [clientesData, funcionariosData] = await Promise.all([
        base44.entities.Cliente.list(),
        base44.entities.Funcionario.list()
      ]);

      let sucessos = 0;
      let erros = 0;
      const mensagensErro = [];
      const clientesCriadosAutomaticamente = [];

      const BATCH_SIZE = 10;
      const DELAY_BETWEEN_BATCHES = 1000;

      for (let i = 0; i < previewData.length; i += BATCH_SIZE) {
        if (!mountedRef.current) break;

        const batch = previewData.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (linha) => {
          try {
            if (!linha.numero_orcamento || linha.numero_orcamento.trim() === '') {
              throw new Error('Número do orçamento é obrigatório');
            }

            if (!linha.data_orcamento || linha.data_orcamento.trim() === '') {
              throw new Error('Data do orçamento é obrigatória');
            }

            let cliente = clientesData.find(c => 
              c.nome.toLowerCase().trim() === (linha.cliente_nome || '').toLowerCase().trim()
            );

            if (!cliente && linha.cliente_nome && linha.cliente_nome.trim() !== '') {
              try {
                const novoCliente = await base44.entities.Cliente.create({
                  nome: linha.cliente_nome.trim(),
                  telefone: 'A completar'
                });
                cliente = novoCliente;
                clientesData.push(novoCliente);
                clientesCriadosAutomaticamente.push({
                  nome: linha.cliente_nome.trim(),
                  id: novoCliente.id
                });
              } catch (errCliente) {
                console.warn('Erro ao criar cliente automaticamente:', errCliente);
              }
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
              itens: itens,
              outras_despesas: Number(linha.outras_despesas) || 0,
              observacoes: linha.observacoes || ''
            });

            return { success: true };
          } catch (err) {
            return {
              success: false,
              error: `Orçamento ${linha.numero_orcamento || 'N/A'}: ${err.message}`
            };
          }
        });

        const results = await Promise.all(batchPromises);

        results.forEach(result => {
          if (result.success) {
            sucessos++;
          } else {
            erros++;
            mensagensErro.push(result.error);
          }
        });

        if (i + BATCH_SIZE < previewData.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      if (clientesCriadosAutomaticamente.length > 0) {
        try {
          await base44.functions.invoke('notificarClientesIncompletos', {
            clientes: clientesCriadosAutomaticamente
          });
        } catch (alertError) {
          console.warn('Erro ao enviar alerta de clientes incompletos:', alertError);
        }
      }

      if (!mountedRef.current) return;

      setResult({
        total: previewData.length,
        sucessos,
        erros,
        mensagensErro: mensagensErro.slice(0, 5),
        clientesCriados: clientesCriadosAutomaticamente.length
      });

      if (sucessos > 0) {
        const alertaClientes = clientesCriadosAutomaticamente.length > 0 
          ? ` • ${clientesCriadosAutomaticamente.length} cliente(s) cadastrado(s) automaticamente com dados incompletos.`
          : '';
        
        toast({
          title: 'Importação concluída',
          description: `${sucessos} orçamento(s) importado(s)${erros > 0 ? `, ${erros} com erro` : ''}${alertaClientes}`,
        });

        if (erros === 0) {
          setTimeout(() => {
            if (mountedRef.current) {
              onSuccess();
            }
          }, 2000);
        }
      }

    } catch (error) {
      console.error('Erro ao importar:', error);
      if (mountedRef.current) {
        toast({
          title: 'Erro na importação',
          description: error.message || 'Não foi possível importar os dados',
          variant: 'destructive'
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!isLoading) {
      setFile(null);
      setPreviewData(null);
      setResult(null);
      setLoadingProgress(0);
      setLoadingMessage('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border-0 rounded-2xl shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-base font-semibold">Importar Orçamentos</span>
                <p className="text-xs text-slate-300 mt-0.5">Importe múltiplos orçamentos a partir de um arquivo CSV, Excel ou PDF</p>
              </div>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {!previewData && !result && (
            <>
              <Alert className="bg-blue-50 border-blue-200">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm text-neutral-700">
                  <strong>Formato esperado:</strong> O arquivo deve conter as colunas: Nº, Data, Cliente, Vendedor, Produtos, Serviços, Desconto, Despesas, Observações.
                </AlertDescription>
              </Alert>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="gap-2 bg-white border-neutral-300 hover:bg-slate-50 transition-colors"
                  type="button">
                  <Download className="w-4 h-4" />
                  Baixar Modelo CSV
                </Button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 border-b border-slate-200 px-5 py-3">
                  <h3 className="text-sm font-bold text-slate-700">Selecione o arquivo</h3>
                </div>
                <div className="p-5">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 cursor-pointer">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.pdf"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FileSpreadsheet className="w-20 h-20 mx-auto mb-4 text-slate-400" />
                    <p className="text-sm font-medium text-slate-700">
                      {file ? (
                        <span className="text-blue-600 flex items-center justify-center gap-2 text-base">
                          <Upload className="w-4 h-4" />
                          {file.name}
                        </span>
                      ) : (
                        <>
                          <span className="text-blue-600 text-base">Escolher arquivo</span>
                          <span className="text-slate-500 ml-2">ou arraste e solte aqui</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">CSV, Excel ou PDF (máx. 10MB)</p>
                  </label>
                </div>
                </div>
              </div>

              {isLoading && (
                <div className="space-y-3 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <p className="text-sm font-semibold text-blue-900">{loadingMessage}</p>
                  </div>
                  <Progress value={loadingProgress} className="h-3" />
                </div>
              )}
            </>
          )}

          {previewData && !result && (
            <div className="space-y-4 preview-section">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2 text-neutral-900">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Prévia dos Dados ({previewData.length} registro(s))
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewData(null);
                    setFile(null);
                  }}
                  className="bg-white hover:bg-slate-50 transition-colors">
                  Cancelar e Selecionar Outro Arquivo
                </Button>
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-neutral-700">
                  Revise os dados extraídos abaixo. Você pode editar os valores clicando nas células ou excluir linhas indesejadas. Os campos <strong className="font-semibold">Nº</strong> e <strong className="font-semibold">Data</strong> são obrigatórios.
                </AlertDescription>
              </Alert>

              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
                  <h3 className="font-bold text-slate-800 text-sm">Dados Extraídos</h3>
                </div>
                <div className="overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader className="bg-slate-700 sticky top-0">
                    <TableRow>
                      <TableHead className="text-white font-semibold w-36">Nº</TableHead>
                      <TableHead className="text-white font-semibold w-36">Data</TableHead>
                      <TableHead className="text-white font-semibold w-56">Cliente</TableHead>
                      <TableHead className="text-white font-semibold w-48">Vendedor</TableHead>
                      <TableHead className="text-white font-semibold w-32">Produtos</TableHead>
                      <TableHead className="text-white font-semibold w-32">Serviços</TableHead>
                      <TableHead className="text-white font-semibold w-32">Desconto</TableHead>
                      <TableHead className="text-white font-semibold w-32">Despesas</TableHead>
                      <TableHead className="text-white font-semibold w-56">Observações</TableHead>
                      <TableHead className="text-white w-20 font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row) => (
                      <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <Input
                            value={row.numero_orcamento}
                            onChange={(e) => handleEditRow(row.id, 'numero_orcamento', e.target.value)}
                            className="h-9 bg-white text-neutral-900 border-neutral-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={row.data_orcamento}
                            onChange={(e) => handleEditRow(row.id, 'data_orcamento', e.target.value)}
                            className="h-9 bg-white text-neutral-900 border-neutral-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.cliente_nome}
                            onChange={(e) => handleEditRow(row.id, 'cliente_nome', e.target.value)}
                            className="h-9 bg-white text-neutral-900 border-neutral-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.vendedor_nome}
                            onChange={(e) => handleEditRow(row.id, 'vendedor_nome', e.target.value)}
                            className="h-9 bg-white text-neutral-900 border-neutral-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.valor_produtos}
                            onChange={(e) => handleEditRow(row.id, 'valor_produtos', e.target.value)}
                            className="h-9 bg-white text-neutral-900 border-neutral-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.valor_servicos}
                            onChange={(e) => handleEditRow(row.id, 'valor_servicos', e.target.value)}
                            className="h-9 bg-white text-neutral-900 border-neutral-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.desconto}
                            onChange={(e) => handleEditRow(row.id, 'desconto', e.target.value)}
                            className="h-9 bg-white text-neutral-900 border-neutral-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.outras_despesas}
                            onChange={(e) => handleEditRow(row.id, 'outras_despesas', e.target.value)}
                            className="h-9 bg-white text-neutral-900 border-neutral-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.observacoes || ''}
                            onChange={(e) => handleEditRow(row.id, 'observacoes', e.target.value)}
                            className="h-9 bg-white text-neutral-900 border-neutral-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRow(row.id)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <Alert className={`${result.erros === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} rounded-xl shadow-sm`}>
                {result.erros === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <AlertDescription className="text-neutral-700">
                  <div className="space-y-2">
                    <p className="font-semibold"><strong>Total de linhas:</strong> {result.total}</p>
                    <p className="text-green-600 font-semibold"><strong>Importados com sucesso:</strong> {result.sucessos}</p>
                    {result.erros > 0 && (
                      <>
                        <p className="text-red-600 font-semibold"><strong>Com erro:</strong> {result.erros}</p>
                        {result.mensagensErro.length > 0 && (
                          <div className="mt-3">
                            <p className="font-semibold">Primeiros erros:</p>
                            <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                              {result.mensagensErro.map((msg, idx) => (
                                <li key={idx} className="text-red-600">{msg}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
            {result?.sucessos > 0 && result?.erros === 0 ? 'Fechar' : 'Cancelar'}
          </Button>

          {!previewData && !result && (
            <Button
              onClick={handleExtract}
              disabled={!file || isLoading}
              className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-5">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extraindo...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Extrair e Visualizar
                </>
              )}
            </Button>
          )}

          {previewData && !result && (
            <Button
              onClick={handleConfirmImport}
              disabled={isLoading}
              className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-5">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Importação ({previewData.length})
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}