
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Eye, Trash2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

export default function ImportarClientesModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [result, setResult] = useState(null);
  const { toast } = useToast();
  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  // Cleanup ao desmontar
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Log quando preview data muda
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
    const csvContent = 'nome,cpf_cnpj,telefone,email,cep,logradouro,numero,complemento,bairro,cidade,uf,data_nascimento\n' +
                      'João Silva,123.456.789-00,(11) 98765-4321,joao@email.com,01234-567,Rua das Flores,100,Apto 10,Centro,São Paulo,SP,15/05/1980\n' +
                      'Maria Santos,987.654.321-00,(11) 91234-5678,maria@email.com,98765-432,Av. Paulista,2000,,Bela Vista,São Paulo,SP,2001-01-20';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_clientes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Modelo baixado!',
      description: 'O arquivo modelo_clientes.csv foi baixado com sucesso.'
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

    // Criar novo abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setLoadingProgress(10);
    setLoadingMessage('Iniciando processamento...');

    const normalizarData = (data) => {
      if (!data) return null; // Retornar null se a data for vazia ou inválida para evitar data atual como default

      // Tenta reconhecer formatos comuns (YYYY-MM-DD ou DD/MM/YYYY)
      if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;

      if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
        const [dia, mes, ano] = data.split('/');
        return `${ano}-${mes}-${dia}`;
      }

      // Se não for um formato reconhecido, retorna null ou a data original se preferir
      return null;
    };

    const mescarCpfCnpj = (d) => {
      const cnpj = String(d.cnpj || d.CNPJ || d['CNPJ'] || '').trim();
      const cpf = String(d.cpf || d.CPF || d['CPF'] || '').trim();
      const cpfCnpjDireto = String(d.cpf_cnpj || d['CPF/CNPJ'] || d['cpf_cnpj'] || '').trim();

      if (cpfCnpjDireto !== '') {
        return cpfCnpjDireto;
      }
      return cnpj !== '' ? cnpj : cpf;
    };

    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv') ||
                    file.name.toLowerCase().endsWith('.xlsx') || // Note: .xlsx is often treated as CSV for simple parsing if it's not a true excel lib.
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

        const colunaMap = {}; // Maps index to target field name
        headers.forEach((h, idx) => {
          if (h.includes('nome')) colunaMap[idx] = 'nome';
          else if (h.includes('cpf_cnpj') || h.includes('cpf/cnpj')) colunaMap[idx] = 'cpf_cnpj';
          else if (h.includes('cpf')) colunaMap[idx] = 'cpf';
          else if (h.includes('cnpj')) colunaMap[idx] = 'cnpj';
          else if (h.includes('telefone') || h.includes('fone') || h.includes('celular')) colunaMap[idx] = 'telefone';
          else if (h.includes('email') || h.includes('e-mail')) colunaMap[idx] = 'email';
          else if (h.includes('cep')) colunaMap[idx] = 'cep';
          else if (h.includes('logradouro') || h.includes('rua') || h.includes('endereco') || h.includes('endereço')) colunaMap[idx] = 'logradouro';
          else if (h.includes('numero') || h.includes('número') || h.includes('num')) colunaMap[idx] = 'numero';
          else if (h.includes('complemento') || h.includes('compl')) colunaMap[idx] = 'complemento';
          else if (h.includes('bairro')) colunaMap[idx] = 'bairro';
          else if (h.includes('cidade') || h.includes('municipio') || h.includes('município')) colunaMap[idx] = 'cidade';
          else if (h.includes('uf') || h.includes('estado')) colunaMap[idx] = 'uf';
          else if (h.includes('nascimento') || h.includes('data_nascimento') || h.includes('data de nascimento')) colunaMap[idx] = 'data_nascimento';
        });

        if (Object.keys(colunaMap).length === 0) {
          throw new Error('Não foi possível identificar as colunas do CSV. Verifique se o cabeçalho contém: nome, telefone, email, etc.');
        }

        setLoadingProgress(60);
        setLoadingMessage('Extraindo dados das linhas...');

        const rawDados = []; // Store raw parsed data from CSV
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

          const clienteRaw = {}; // Object to hold raw values from CSV for this row
          valores.forEach((valor, idx) => {
            const campo = colunaMap[idx];
            if (campo) {
              const valorLimpo = valor.replace(/^["']|["']$/g, '').trim();
              clienteRaw[campo] = valorLimpo;
            }
          });

          if (clienteRaw.nome || clienteRaw.telefone) { // Only push if basic info exists
            rawDados.push(clienteRaw);
          }
        }

        console.log(`✅ ${rawDados.length} clientes brutos extraídos do CSV`);

        if (rawDados.length === 0) {
          throw new Error('Nenhum cliente válido encontrado no arquivo. Verifique se há dados nas linhas após o cabeçalho.');
        }

        setLoadingProgress(90);
        setLoadingMessage('Preparando prévia...');

        // Apply comprehensive mapping to CSV data
        const finalDados = rawDados.map((d, idx) => ({
          id: `temp_${idx}_${Date.now()}`,
          nome: String(
            d.nome || d.Nome || d['Nome'] || d.cliente || d.Cliente || ''
          ).trim(),
          cpf_cnpj: mescarCpfCnpj(d),
          telefone: String(
            d.telefone || d.Telefone || d['Telefone'] || d.tel || d.Tel || d.celular || d.Celular || ''
          ).trim(),
          email: String(
            d.email || d.Email || d['Email'] || d['E-mail'] || ''
          ).trim(),
          cep: String(
            d.cep || d.CEP || d['CEP'] || ''
          ).trim().replace(/\D/g, ''),
          logradouro: String(
            d.logradouro || d.Logradouro || d['Logradouro'] || d.endereco || d.Endereco || d['Endereço'] || d.rua || d.Rua || ''
          ).trim(),
          numero: String(
            d.numero || d.Numero || d['Número'] || d['Numero'] || d.num || d.Num || ''
          ).trim(),
          complemento: String(
            d.complemento || d.Complemento || d['Complemento'] || d.compl || d.Compl || ''
          ).trim(),
          bairro: String(
            d.bairro || d.Bairro || d['Bairro'] || ''
          ).trim(),
          cidade: String(
            d.cidade || d.Cidade || d['Cidade'] || ''
          ).trim(),
          uf: String(
            d.uf || d.UF || d['UF'] || d.estado || d.Estado || ''
          ).trim().toUpperCase(),
          data_nascimento: d.data_nascimento || d['Data Nascimento'] || d['Data de Nascimento'] || d.nascimento
            ? normalizarData(d.data_nascimento || d['Data Nascimento'] || d['Data de Nascimento'] || d.nascimento)
            : null
        }));

        console.log(`✅ ${finalDados.length} clientes extraídos e mapeados`);

        // Verificar se componente ainda está montado
        if (!mountedRef.current) {
          console.warn('⚠️ Componente desmontado, abortando');
          return;
        }

        // Atualizar estado
        setPreviewData(finalDados);
        setLoadingProgress(100);
        setLoadingMessage('Concluído!');

        console.log('✅ [PREVIEW] Preview configurado com sucesso');

        toast({
          title: 'Dados extraídos com sucesso!',
          description: `${finalDados.length} cliente(s) encontrado(s). Revise antes de importar.`
        });

      } else {
        // Processar PDF
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
            "type": "object",
            "properties": {
              "clientes": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "nome": { "type": "string" },
                    "cpf": { "type": "string" }, // Add cpf and cnpj for separate extraction
                    "cnpj": { "type": "string" },
                    "cpf_cnpj": { "type": "string" },
                    "telefone": { "type": "string" },
                    "email": { "type": "string" },
                    "cep": { "type": "string" },
                    "logradouro": { "type": "string" },
                    "numero": { "type": "string" },
                    "complemento": { "type": "string" },
                    "bairro": { "type": "string" },
                    "cidade": { "type": "string" },
                    "uf": { "type": "string" },
                    "data_nascimento": { "type": "string" } // Add data_nascimento
                  }
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

        const dados = extractResult.output?.clientes || [];

        console.log('📋 Dados brutos extraídos (PDF):', dados);

        if (!Array.isArray(dados) || dados.length === 0) {
          throw new Error('Nenhum cliente encontrado no arquivo. Verifique se o PDF contém uma tabela com os dados esperados.');
        }

        setLoadingProgress(90);
        setLoadingMessage('Preparando prévia...');

        const dadosComId = dados.map((d, idx) => ({
          id: `temp_${idx}_${Date.now()}`,
          nome: String(
            d.nome || d.Nome || d['Nome'] || d.cliente || d.Cliente || ''
          ).trim(),
          cpf_cnpj: mescarCpfCnpj(d),
          telefone: String(
            d.telefone || d.Telefone || d['Telefone'] || d.tel || d.Tel || d.celular || d.Celular || ''
          ).trim(),
          email: String(
            d.email || d.Email || d['Email'] || d['E-mail'] || ''
          ).trim(),
          cep: String(
            d.cep || d.CEP || d['CEP'] || ''
          ).trim().replace(/\D/g, ''),
          logradouro: String(
            d.logradouro || d.Logradouro || d['Logradouro'] || d.endereco || d.Endereco || d['Endereço'] || d.rua || d.Rua || ''
          ).trim(),
          numero: String(
            d.numero || d.Numero || d['Número'] || d['Numero'] || d.num || d.Num || ''
          ).trim(),
          complemento: String(
            d.complemento || d.Complemento || d['Complemento'] || d.compl || d.Compl || ''
          ).trim(),
          bairro: String(
            d.bairro || d.Bairro || d['Bairro'] || ''
          ).trim(),
          cidade: String(
            d.cidade || d.Cidade || d['Cidade'] || ''
          ).trim(),
          uf: String(
            d.uf || d.UF || d['UF'] || d.estado || d.Estado || ''
          ).trim().toUpperCase(),
          data_nascimento: d.data_nascimento || d['Data Nascimento'] || d['Data de Nascimento'] || d.nascimento
            ? normalizarData(d.data_nascimento || d['Data Nascimento'] || d['Data de Nascimento'] || d.nascimento)
            : null
        }));

        console.log('📊 [PREVIEW] Definindo preview data:', dadosComId.length, 'registros');

        if (!mountedRef.current) return;

        setPreviewData(dadosComId);
        setLoadingProgress(100);
        setLoadingMessage('Concluído!');

        toast({
          title: 'Dados extraídos com sucesso!',
          description: `${dadosComId.length} cliente(s) encontrado(s). Revise antes de importar.`
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
      let sucessos = 0;
      let erros = 0;
      const mensagensErro = [];

      // Importar em lotes de 10 para evitar rate limiting
      const BATCH_SIZE = 10;
      const DELAY_BETWEEN_BATCHES = 1000; // 1 segundo

      for (let i = 0; i < previewData.length; i += BATCH_SIZE) {
        if (!mountedRef.current) break;

        const batch = previewData.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (linha) => {
          try {
            if (!linha.nome || !linha.telefone) {
              throw new Error('Nome e telefone são obrigatórios');
            }

            await base44.entities.Cliente.create({
              nome: linha.nome,
              cpf_cnpj: linha.cpf_cnpj || '',
              telefone: linha.telefone,
              email: linha.email || '',
              cep: linha.cep || '',
              logradouro: linha.logradouro || '',
              numero: linha.numero || '',
              complemento: linha.complemento || '',
              bairro: linha.bairro || '',
              cidade: linha.cidade || '',
              uf: linha.uf || '',
              data_nascimento: linha.data_nascimento || null // Added data_nascimento
            });

            return { success: true };
          } catch (err) {
            return {
              success: false,
              error: `Linha ${previewData.indexOf(linha) + 1}: ${err.message}`
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

        // Aguardar entre lotes para evitar rate limiting
        if (i + BATCH_SIZE < previewData.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      if (!mountedRef.current) return;

      setResult({
        total: previewData.length,
        sucessos,
        erros,
        mensagensErro: mensagensErro.slice(0, 5) // Limit error messages
      });

      if (sucessos > 0) {
        toast({
          title: 'Importação concluída',
          description: `${sucessos} cliente(s) importado(s)${erros > 0 ? `, ${erros} com erro` : ''}`,
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
    // Cancelar operações pendentes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Só permitir fechar se não estiver carregando
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
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Clientes
          </DialogTitle>
          <DialogDescription>
            Importe múltiplos clientes a partir de um arquivo CSV, Excel ou PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!previewData && !result && (
            <>
              <Alert>
                <FileSpreadsheet className="w-4 h-4" />
                <AlertDescription>
                  <strong>Formato esperado:</strong> O arquivo deve conter as colunas: nome, cpf_cnpj, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf, data_nascimento. Para CSV/Excel, nomes de coluna similares também serão reconhecidos.
                </AlertDescription>
              </Alert>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="gap-2"
                  type="button">
                  <Download className="w-4 h-4" />
                  Baixar Modelo CSV
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload">Selecione o arquivo</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.pdf"
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
                {file && (
                  <p className="text-sm text-gray-600">
                    Arquivo selecionado: <strong>{file.name}</strong>
                  </p>
                )}
              </div>

              {isLoading && (
                <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">{loadingMessage}</p>
                  </div>
                  <Progress value={loadingProgress} className="h-2" />
                  <p className="text-xs text-blue-700">
                    {file && file.name.toLowerCase().endsWith('.pdf') ? 'Processamento de PDF pode levar até 2 minutos...' : 'Processamento pode levar alguns segundos...'}
                  </p>
                </div>
              )}
            </>
          )}

          {previewData && !result && (
            <div className="space-y-3 preview-section">
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

              <div className="border rounded-md overflow-auto max-h-96">
                <Table>
                  <TableHeader className="bg-slate-800">
                    <TableRow>
                      <TableHead className="text-white">Nome</TableHead>
                      <TableHead className="text-white">CPF/CNPJ</TableHead>
                      <TableHead className="text-white">Telefone</TableHead>
                      <TableHead className="text-white">Email</TableHead>
                      <TableHead className="text-white">CEP</TableHead>
                      <TableHead className="text-white">Logradouro</TableHead>
                      <TableHead className="text-white">Número</TableHead>
                      <TableHead className="text-white">Cidade</TableHead>
                      <TableHead className="text-white">UF</TableHead>
                      <TableHead className="text-white">Nascimento</TableHead> {/* Added data_nascimento column */}
                      <TableHead className="text-white w-16">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Input
                            value={row.nome}
                            onChange={(e) => handleEditRow(row.id, 'nome', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.cpf_cnpj}
                            onChange={(e) => handleEditRow(row.id, 'cpf_cnpj', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.telefone}
                            onChange={(e) => handleEditRow(row.id, 'telefone', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.email}
                            onChange={(e) => handleEditRow(row.id, 'email', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.cep}
                            onChange={(e) => handleEditRow(row.id, 'cep', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.logradouro}
                            onChange={(e) => handleEditRow(row.id, 'logradouro', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.numero}
                            onChange={(e) => handleEditRow(row.id, 'numero', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.cidade}
                            onChange={(e) => handleEditRow(row.id, 'cidade', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.uf}
                            onChange={(e) => handleEditRow(row.id, 'uf', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.data_nascimento || ''} // Added data_nascimento
                            onChange={(e) => handleEditRow(row.id, 'data_nascimento', e.target.value)}
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
                    <p className="text-green-600"><strong>Importados com sucesso:</strong> {result.sucessos}</p>
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

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}>
            {result?.sucessos > 0 && result?.erros === 0 ? 'Fechar' : 'Cancelar'}
          </Button>

          {!previewData && !result && (
            <Button
              onClick={handleExtract}
              disabled={!file || isLoading}
              className="bg-slate-800 hover:bg-slate-700">
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
              className="bg-green-600 hover:bg-green-700">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Importação ({previewData.length} registros)
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
