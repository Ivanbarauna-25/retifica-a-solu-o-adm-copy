import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Eye, Trash2, X, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ImportarOSModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [result, setResult] = useState(null);
  const { toast } = useToast();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo CSV ou Excel',
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
    const csvContent = 'numero_os,data_abertura,contato_nome,veiculo_placa,responsavel_nome,valor_produtos,valor_servicos,desconto,outras_despesas,observacoes\n' +
                      'OS-001,2024-01-15,João Silva,ABC-1234,Carlos Santos,500.00,350.00,50.00,100.00,Troca de óleo e filtros\n' +
                      'OS-002,2024-01-16,Maria Santos,XYZ-5678,Pedro Oliveira,800.00,400.00,0.00,150.00,Revisão completa';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_ordens_servico.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Modelo baixado!',
      description: 'O arquivo modelo_ordens_servico.csv foi baixado com sucesso.'
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

    setIsLoading(true);

    try {
      console.log('📤 Iniciando upload do arquivo:', file.name);
      
      // Upload do arquivo
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      const file_url = uploadResponse?.file_url;

      if (!file_url) {
        throw new Error('Falha ao fazer upload do arquivo - URL não retornada');
      }

      console.log('✅ Upload concluído. URL:', file_url);
      console.log('🔍 Iniciando extração de dados...');

      // Tentar com schema simplificado (array direto)
      let extractResult;
      try {
        extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                numero_os: { type: "string", description: "Número da OS" },
                data_abertura: { type: "string", description: "Data de abertura" },
                contato_nome: { type: "string", description: "Nome do contato/cliente" },
                veiculo_placa: { type: "string", description: "Placa do veículo" },
                responsavel_nome: { type: "string", description: "Nome do responsável técnico" },
                valor_produtos: { type: "string", description: "Valor dos produtos (aceita formato R$ X.XXX,XX)" },
                valor_servicos: { type: "string", description: "Valor dos serviços (aceita formato R$ X.XXX,XX)" },
                desconto: { type: "string", description: "Valor do desconto (aceita formato R$ X.XXX,XX)" },
                outras_despesas: { type: "string", description: "Outras despesas (aceita formato R$ X.XXX,XX)" },
                status: { type: "string", description: "Status da OS" },
                observacoes: { type: "string", description: "Observações" }
              }
            }
          }
        });
      } catch (schemaError) {
        console.warn('⚠️ Erro com schema array, tentando schema com objeto:', schemaError);
        
        // Fallback: tentar com schema de objeto contendo array
        extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              ordens: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    numero_os: { type: "string" },
                    data_abertura: { type: "string" },
                    contato_nome: { type: "string" },
                    veiculo_placa: { type: "string" },
                    responsavel_nome: { type: "string" },
                    valor_produtos: { type: "string" },
                    valor_servicos: { type: "string" },
                    desconto: { type: "string" },
                    outras_despesas: { type: "string" },
                    status: { type: "string" },
                    observacoes: { type: "string" }
                  }
                }
              }
            }
          }
        });
      }

      console.log('📊 Resultado da extração:', extractResult);

      if (extractResult.status === 'error') {
        console.error('❌ Erro na extração:', extractResult.details);
        throw new Error(extractResult.details || 'Erro ao extrair dados do arquivo');
      }

      // Processar dados extraídos - aceitar múltiplos formatos
      let dados = null;
      
      // Tentar diferentes caminhos para encontrar os dados
      if (Array.isArray(extractResult.output)) {
        dados = extractResult.output;
        console.log('✅ Dados encontrados como array direto');
      } else if (extractResult.output?.ordens && Array.isArray(extractResult.output.ordens)) {
        dados = extractResult.output.ordens;
        console.log('✅ Dados encontrados em output.ordens');
      } else if (extractResult.output?.data && Array.isArray(extractResult.output.data)) {
        dados = extractResult.output.data;
        console.log('✅ Dados encontrados em output.data');
      }

      if (!dados || !Array.isArray(dados) || dados.length === 0) {
        console.error('❌ Nenhum dado válido encontrado. Output completo:', extractResult.output);
        throw new Error(
          'Nenhum dado válido encontrado no arquivo.\n\n' +
          'Certifique-se de que o arquivo Excel/CSV contém as colunas:\n' +
          '- numero_os (Nº da OS)\n' +
          '- data_abertura (Data de Abertura)\n' +
          '- contato_nome (Nome do Contato/Cliente)\n' +
          '- veiculo_placa (Placa - opcional)\n' +
          '- responsavel_nome (Responsável - opcional)\n' +
          '- valor_produtos (Valor de Produtos)\n' +
          '- valor_servicos (Valor de Serviços)\n' +
          '- desconto (Desconto)\n' +
          '- outras_despesas (Outras Despesas)\n' +
          '- observacoes (Observações - opcional)'
        );
      }

      console.log(`✅ ${dados.length} registro(s) encontrado(s)`);

      // Normalizar e validar dados
      const dadosNormalizados = dados
        .filter(d => d && typeof d === 'object') // Filtrar linhas inválidas
        .map((d, idx) => {
          // Função auxiliar para extrair número de string
          const extrairNumero = (valor) => {
            if (valor === null || valor === undefined || valor === '') return 0;
            if (typeof valor === 'number') return valor;
            if (typeof valor === 'string') {
              // Tratar casos especiais: "R$-", "-", "R$ -", etc.
              const valorTrimmed = valor.trim();
              if (valorTrimmed === '-' || valorTrimmed === 'R$-' || valorTrimmed === 'R$ -' || valorTrimmed === 'RS-' || valorTrimmed === 'RS -') {
                return 0;
              }
              // Remover "R$", "RS", espaços, e trocar vírgula por ponto
              const limpo = valor
                .replace(/R\$\s*/gi, '')
                .replace(/RS\s*/gi, '')
                .replace(/\./g, '') // Remove pontos (separador de milhar)
                .replace(',', '.') // Troca vírgula por ponto (decimal)
                .replace(/-/g, '') // Remove hífens restantes
                .trim();
              
              if (limpo === '' || limpo === '.') return 0;
              
              const num = parseFloat(limpo);
              return isNaN(num) ? 0 : num;
            }
            return 0;
          };

          // Função para normalizar data
          const normalizarData = (data) => {
            if (!data) return new Date().toISOString().split('T')[0];
            
            // Se já está no formato YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
            
            // Se está no formato DD/MM/YYYY
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
              const [dia, mes, ano] = data.split('/');
              return `${ano}-${mes}-${dia}`; // Correção: Mês e Dia estavam invertidos
            }
            
            return new Date().toISOString().split('T')[0];
          };

          return {
            id: idx,
            numero_os: String(
              d.numero_os || d.os || d.numero || d['Nº OS'] || d['N° OS'] || `OS-${Date.now().toString().slice(-6)}`
            ).trim(),
            data_abertura: normalizarData(
              d.data_abertura || d.data || d['Data Abertura'] || d['Data']
            ),
            contato_nome: String(
              d.contato_nome || d.contato || d.cliente || d.cliente_nome || d['Contato'] || ''
            ).trim(),
            veiculo_placa: String(
              d.veiculo_placa || d.placa || d.veiculo || d['Veículo'] || d['Veiculo'] || ''
            ).trim(),
            responsavel_nome: String(
              d.responsavel_nome || d.responsavel || d.tecnico || d['Responsável'] || d['Responsavel'] || ''
            ).trim(),
            valor_produtos: extrairNumero(d.valor_produtos || d.produtos || d['Produtos'] || 0),
            valor_servicos: extrairNumero(d.valor_servicos || d.servicos || d['Serviços'] || d['Servicos'] || 0),
            desconto: extrairNumero(d.desconto || d['Desconto'] || 0),
            outras_despesas: extrairNumero(d.outras_despesas || d.despesas || d['Despesas'] || d['Outras Despesas'] || 0),
            valor_total: extrairNumero(d.valor_total || d.total || d['Total'] || 0),
            status: (d.status || d['Status'] || 'em_andamento')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, '_'),
            observacoes: String(d.observacoes || d.obs || d['Observações'] || d['Observacoes'] || '').trim()
          };
        });

      if (dadosNormalizados.length === 0) {
        throw new Error('Nenhum dado válido após normalização. Verifique o conteúdo do arquivo.');
      }

      console.log('✅ Dados normalizados:', dadosNormalizados);
      setPreviewData(dadosNormalizados);

      toast({
        title: 'Dados extraídos com sucesso!',
        description: `${dadosNormalizados.length} OS encontrada(s). Revise antes de importar.`
      });

    } catch (error) {
      console.error('❌ Erro ao extrair dados:', error);
      toast({
        title: 'Erro na extração',
        description: error.message || 'Não foi possível extrair dados do arquivo. Verifique o formato e tente novamente.',
        variant: 'destructive'
      });
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
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
      // Carregar clientes, funcionários e veículos
      const [clientesData, funcionariosData, veiculosData] = await Promise.all([
        base44.entities.Cliente.list(),
        base44.entities.Funcionario.list(),
        base44.entities.Veiculo.list()
      ]);

      // Função auxiliar para normalizar strings (remove acentos, espaços extras, lowercase)
      const normalizeString = (str) => {
        if (!str) return '';
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
          .trim();
      };

      let sucessos = 0;
      let erros = 0;
      const mensagensErro = [];

      // Importar em lotes
      const BATCH_SIZE = 5;
      const DELAY_BETWEEN_BATCHES = 1000;

      for (let i = 0; i < previewData.length; i += BATCH_SIZE) {
        if (!mountedRef.current) break;

        const batch = previewData.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (linha) => {
          try {
            // Validar campos obrigatórios
            if (!linha.numero_os || linha.numero_os.trim() === '') {
              throw new Error('Número da OS é obrigatório');
            }

            if (!linha.data_abertura || linha.data_abertura.trim() === '') {
              throw new Error('Data de abertura é obrigatória');
            }

            // Buscar cliente pelo nome (busca robusta com normalização)
            let cliente = null;
            if (linha.contato_nome && linha.contato_nome.trim() !== '') {
              const nomeNormalizado = normalizeString(linha.contato_nome);
              console.log(`🔍 Buscando cliente: "${linha.contato_nome}" (normalizado: "${nomeNormalizado}")`);
              
              cliente = clientesData.find(c => {
                const nomeClienteNormalizado = normalizeString(c.nome);
                const match = nomeClienteNormalizado === nomeNormalizado;
                if (match) {
                  console.log(`✅ Cliente encontrado: ${c.nome} (ID: ${c.id})`);
                }
                return match;
              });

              if (!cliente) {
                console.warn(`⚠️ Cliente não encontrado: "${linha.contato_nome}"`);
                console.log('Clientes disponíveis:', clientesData.map(c => c.nome).join(', '));
              }
            }

            // Buscar veículo pela placa
            let veiculo = null;
            if (linha.veiculo_placa && linha.veiculo_placa.trim() !== '') {
              const placaNormalizada = normalizeString(linha.veiculo_placa);
              veiculo = veiculosData.find(v => 
                normalizeString(v.placa) === placaNormalizada
              );
              
              if (veiculo) {
                console.log(`✅ Veículo encontrado: ${veiculo.placa} (ID: ${veiculo.id})`);
              }
            }

            // Buscar responsável pelo nome
            let responsavel = null;
            if (linha.responsavel_nome && linha.responsavel_nome.trim() !== '') {
              const responsavelNormalizado = normalizeString(linha.responsavel_nome);
              responsavel = funcionariosData.find(f => 
                normalizeString(f.nome) === responsavelNormalizado
              );
              
              if (responsavel) {
                console.log(`✅ Responsável encontrado: ${responsavel.nome} (ID: ${responsavel.id})`);
              }
            }

            // Criar itens baseados nos valores
            const itens = [];
            
            const valorProdutos = Number(linha.valor_produtos) || 0;
            const valorServicos = Number(linha.valor_servicos) || 0;
            const valorDesconto = Number(linha.desconto) || 0;
            const valorDespesas = Number(linha.outras_despesas) || 0;
            
            if (valorProdutos > 0) {
              itens.push({
                id: crypto.randomUUID(),
                tipo: 'produto',
                descricao: 'Produtos importados',
                quantidade: 1,
                valor_unitario: valorProdutos,
                desconto_tipo: 'valor',
                desconto_valor: 0,
                valor_total: valorProdutos
              });
            }

            if (valorServicos > 0) {
              itens.push({
                id: crypto.randomUUID(),
                tipo: 'servico',
                descricao: 'Serviços importados',
                quantidade: 1,
                valor_unitario: valorServicos,
                desconto_tipo: 'valor',
                desconto_valor: 0,
                valor_total: valorServicos
              });
            }

            // Calcular valor total: (produtos + serviços + despesas - desconto)
            const valorTotalCalculado = valorProdutos + valorServicos + valorDespesas - valorDesconto;

            // Validar status
            const statusValidos = ['em_andamento', 'finalizado', 'cancelado'];
            const status = statusValidos.includes(linha.status) ? linha.status : 'em_andamento';

            const osData = {
              numero_os: linha.numero_os.trim(),
              data_abertura: linha.data_abertura.trim(),
              contato_id: cliente?.id || '',
              contato_tipo: 'cliente',
              veiculo_id: veiculo?.id || '',
              funcionario_id: responsavel?.id || '',
              status: status,
              desconto_tipo: 'valor',
              desconto_valor: valorDesconto,
              outras_despesas: valorDespesas,
              valor_total: valorTotalCalculado,
              itens: itens,
              observacoes: linha.observacoes || ''
            };

            console.log(`💰 Valores da OS ${linha.numero_os}:`, {
              produtos: valorProdutos,
              servicos: valorServicos,
              despesas: valorDespesas,
              desconto: valorDesconto,
              total: valorTotalCalculado,
              cliente: cliente?.nome || 'Não encontrado',
              itens: itens.length
            });

            console.log(`📝 Criando OS ${linha.numero_os}:`, osData);

            await base44.entities.OrdemServico.create(osData);

            console.log(`✅ OS ${linha.numero_os} criada com sucesso!`);
            return { success: true };
          } catch (err) {
            console.error(`❌ Erro ao importar OS ${linha.numero_os || 'N/A'}:`, err);
            return {
              success: false,
              error: `OS ${linha.numero_os || 'N/A'}: ${err.message}`
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

      if (!mountedRef.current) return;

      setResult({
        total: previewData.length,
        sucessos,
        erros,
        mensagensErro: mensagensErro.slice(0, 5)
      });

      if (sucessos > 0) {
        toast({
          title: 'Importação concluída',
          description: `${sucessos} OS importadas${erros > 0 ? `, ${erros} com erro` : ''}`,
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
    if (!isLoading) {
      setFile(null);
      setPreviewData(null);
      setResult(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border-0 rounded-2xl shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-white">
                  Importar Ordens de Serviço
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Importe múltiplas OS a partir de um arquivo CSV ou Excel
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
          {!previewData && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Formato esperado</p>
                  <p className="text-xs text-blue-700">Nº OS, Data Abertura, Contato, Veículo, Responsável, Produtos, Serviços, Desconto, Despesas, Observações</p>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="gap-2 border-slate-300 hover:bg-slate-100 text-slate-700"
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
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-slate-300 transition-colors">
                  <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    className="max-w-xs mx-auto"
                  />
                  {file && (
                    <p className="text-sm text-slate-600 mt-3">
                      Arquivo: <span className="font-medium text-slate-900">{file.name}</span>
                    </p>
                  )}
                </div>
                </div>
              </div>
            </>
          )}

          {previewData && !result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Prévia dos Dados ({previewData.length} registro(s))
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewData(null);
                    setFile(null);
                  }}
                >
                  Cancelar e Selecionar Outro Arquivo
                </Button>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Revise os dados extraídos abaixo. Você pode editar os valores clicando nas células ou excluir linhas indesejadas.
                </AlertDescription>
              </Alert>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
                  <h3 className="font-bold text-slate-800 text-sm">Dados Extraídos</h3>
                </div>
                <div className="overflow-auto max-h-96">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow>
                      <TableHead className="text-slate-700 font-semibold text-xs">Nº OS</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Data</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Contato</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Veículo</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Responsável</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Produtos</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Serviços</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Desconto</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Despesas</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Observações</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs w-14">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Input
                            value={row.numero_os}
                            onChange={(e) => handleEditRow(row.id, 'numero_os', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={row.data_abertura}
                            onChange={(e) => handleEditRow(row.id, 'data_abertura', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.contato_nome}
                            onChange={(e) => handleEditRow(row.id, 'contato_nome', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.veiculo_placa}
                            onChange={(e) => handleEditRow(row.id, 'veiculo_placa', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.responsavel_nome}
                            onChange={(e) => handleEditRow(row.id, 'responsavel_nome', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.valor_produtos}
                            onChange={(e) => handleEditRow(row.id, 'valor_produtos', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.valor_servicos}
                            onChange={(e) => handleEditRow(row.id, 'valor_servicos', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.desconto}
                            onChange={(e) => handleEditRow(row.id, 'desconto', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.outras_despesas}
                            onChange={(e) => handleEditRow(row.id, 'outras_despesas', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.observacoes || ''}
                            onChange={(e) => handleEditRow(row.id, 'observacoes', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRow(row.id)}
                            className="text-red-600 hover:text-red-700"
                          >
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
              <Alert className={result.erros === 0 ? 'border-green-500' : 'border-yellow-500'}>
                {result.erros === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>Total de linhas:</strong> {result.total}</p>
                    <p className="text-green-600"><strong>Importadas com sucesso:</strong> {result.sucessos}</p>
                    {result.erros > 0 && (
                      <>
                        <p className="text-red-600"><strong>Com erro:</strong> {result.erros}</p>
                        {result.mensagensErro.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium">Primeiros erros:</p>
                            <ul className="list-disc list-inside text-sm space-y-1">
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

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="bg-slate-800 text-white hover:bg-slate-700 font-semibold flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            {result?.sucessos > 0 && result?.erros === 0 ? 'Fechar' : 'Cancelar'}
          </Button>
          
          {!previewData && !result && (
            <Button
              onClick={handleExtract}
              disabled={!file || isLoading}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-5 font-semibold flex items-center gap-2"
            >
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
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-5 font-semibold flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Importação
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}