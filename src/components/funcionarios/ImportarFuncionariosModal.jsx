import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ImportarFuncionariosModal({ isOpen, onClose, onSuccess }) {
  const [etapa, setEtapa] = useState('upload'); // upload, preview, processando, concluido
  const [arquivo, setArquivo] = useState(null);
  const [dadosExtraidos, setDadosExtraidos] = useState([]);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    const extensao = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extensao)) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV',
        variant: 'destructive'
      });
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 5MB',
        variant: 'destructive'
      });
      return;
    }

    setArquivo(file);
    await processarArquivo(file);
  };

  const processarArquivo = async (file) => {
    setProcessando(true);
    setEtapa('processando');

    try {
      toast({
        title: 'Processando arquivo...',
        description: 'Extraindo dados, aguarde...'
      });

      // Upload do arquivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Schema dos campos de Funcionario
      const schema = {
        type: "object",
        properties: {
          nome: { type: "string" },
          cpf: { type: "string" },
          email: { type: "string" },
          telefone: { type: "string" },
          data_nascimento: { type: "string" },
          data_inicio: { type: "string" },
          cargo: { type: "string" },
          departamento: { type: "string" },
          salario: { type: "number" },
          regime: { type: "string" },
          cep: { type: "string" },
          logradouro: { type: "string" },
          numero: { type: "string" },
          bairro: { type: "string" },
          cidade: { type: "string" },
          uf: { type: "string" }
        }
      };

      // Extrair dados estruturados
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: schema
      });

      if (extractResult.status === 'error') {
        throw new Error(extractResult.details || 'Erro ao extrair dados do arquivo');
      }

      const dados = Array.isArray(extractResult.output) ? extractResult.output : [extractResult.output];

      if (dados.length === 0) {
        throw new Error('Nenhum dado foi encontrado no arquivo');
      }

      // Buscar cargos e departamentos para validação
      const [cargos, departamentos] = await Promise.all([
        base44.entities.Cargo.list(),
        base44.entities.Departamento.list()
      ]);

      // Enriquecer dados com validação
      const dadosEnriquecidos = dados.map((func, index) => {
        const erros = [];
        const avisos = [];

        // Validações obrigatórias
        if (!func.nome || func.nome.trim().length < 3) {
          erros.push('Nome inválido ou muito curto');
        }
        if (!func.cpf || func.cpf.replace(/\D/g, '').length !== 11) {
          erros.push('CPF inválido');
        }
        if (!func.data_inicio) {
          erros.push('Data de início obrigatória');
        }

        // Validar cargo (tentar encontrar por nome)
        let cargo_id = null;
        if (func.cargo) {
          const cargoEncontrado = cargos.find(c => 
            c.nome.toLowerCase() === func.cargo.toLowerCase()
          );
          if (cargoEncontrado) {
            cargo_id = cargoEncontrado.id;
          } else {
            avisos.push(`Cargo "${func.cargo}" não encontrado`);
          }
        } else {
          erros.push('Cargo obrigatório');
        }

        // Validar departamento
        let departamento_id = null;
        if (func.departamento) {
          const deptEncontrado = departamentos.find(d => 
            d.nome.toLowerCase() === func.departamento.toLowerCase()
          );
          if (deptEncontrado) {
            departamento_id = deptEncontrado.id;
          } else {
            avisos.push(`Departamento "${func.departamento}" não encontrado`);
          }
        } else {
          erros.push('Departamento obrigatório');
        }

        // Validar salário
        if (!func.salario || func.salario <= 0) {
          erros.push('Salário inválido');
        }

        // Validar email
        if (func.email && !func.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          avisos.push('Email em formato inválido');
        }

        return {
          ...func,
          _id: `temp_${index}`,
          _cargo_id: cargo_id,
          _departamento_id: departamento_id,
          _erros: erros,
          _avisos: avisos,
          _valido: erros.length === 0,
          _selecionado: erros.length === 0 // Marca apenas válidos
        };
      });

      setDadosExtraidos(dadosEnriquecidos);
      setEtapa('preview');

      const validos = dadosEnriquecidos.filter(d => d._valido).length;
      const invalidos = dadosEnriquecidos.length - validos;

      toast({
        title: '✅ Arquivo processado',
        description: `${validos} registro(s) válido(s), ${invalidos} com erro(s)`
      });

    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: 'Erro ao processar',
        description: error.message,
        variant: 'destructive'
      });
      setEtapa('upload');
    } finally {
      setProcessando(false);
    }
  };

  const toggleSelecao = (id) => {
    setDadosExtraidos(dados =>
      dados.map(d => d._id === id ? { ...d, _selecionado: !d._selecionado } : d)
    );
  };

  const toggleTodos = () => {
    const todosValidos = dadosExtraidos.filter(d => d._valido);
    const todosValidosSelecionados = todosValidos.every(d => d._selecionado);
    
    setDadosExtraidos(dados =>
      dados.map(d => ({
        ...d,
        _selecionado: d._valido ? !todosValidosSelecionados : false
      }))
    );
  };

  const handleImportar = async () => {
    const selecionados = dadosExtraidos.filter(d => d._selecionado);

    if (selecionados.length === 0) {
      toast({
        title: 'Nenhum registro selecionado',
        description: 'Selecione ao menos um funcionário para importar',
        variant: 'destructive'
      });
      return;
    }

    setProcessando(true);
    setEtapa('processando');

    const resultados = {
      total: selecionados.length,
      sucesso: 0,
      erro: 0,
      detalhes: []
    };

    try {
      for (const func of selecionados) {
        try {
          // Preparar dados para cadastro
          const dadosCadastro = {
            nome: func.nome,
            cpf: func.cpf.replace(/\D/g, ''),
            email: func.email || '',
            telefone: func.telefone || '',
            data_nascimento: func.data_nascimento || '',
            data_inicio: func.data_inicio,
            cargo_id: func._cargo_id,
            departamento_id: func._departamento_id,
            salario: func.salario,
            regime: func.regime || 'clt',
            status: 'ativo',
            cep: func.cep || '',
            logradouro: func.logradouro || '',
            numero: func.numero || '',
            bairro: func.bairro || '',
            cidade: func.cidade || '',
            uf: func.uf || ''
          };

          await base44.entities.Funcionario.create(dadosCadastro);
          
          resultados.sucesso++;
          resultados.detalhes.push({
            nome: func.nome,
            status: 'sucesso',
            mensagem: 'Cadastrado com sucesso'
          });

        } catch (error) {
          console.error('Erro ao cadastrar:', func.nome, error);
          resultados.erro++;
          resultados.detalhes.push({
            nome: func.nome,
            status: 'erro',
            mensagem: error.message || 'Erro desconhecido'
          });
        }
      }

      setResultado(resultados);
      setEtapa('concluido');

      toast({
        title: '✅ Importação concluída',
        description: `${resultados.sucesso} cadastrado(s), ${resultados.erro} erro(s)`
      });

      if (resultados.sucesso > 0 && onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Erro geral na importação:', error);
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive'
      });
      setEtapa('preview');
    } finally {
      setProcessando(false);
    }
  };

  const handleFechar = () => {
    setEtapa('upload');
    setArquivo(null);
    setDadosExtraidos([]);
    setResultado(null);
    onClose();
  };

  const baixarModelo = () => {
    const modelo = `nome,cpf,email,telefone,data_nascimento,data_inicio,cargo,departamento,salario,regime,cep,logradouro,numero,bairro,cidade,uf
João Silva,12345678901,joao@email.com,11999999999,1990-01-15,2025-01-01,Mecânico,Oficina,3000,clt,01310-100,Av Paulista,1000,Bela Vista,São Paulo,SP
Maria Santos,98765432100,maria@email.com,11988888888,1985-05-20,2025-01-01,Gerente,Administração,5000,clt,04551-060,Av Brigadeiro Faria Lima,2000,Itaim Bibi,São Paulo,SP`;

    const blob = new Blob([modelo], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_importacao_funcionarios.csv';
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleFechar}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            Importar Funcionários
          </DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha Excel ou CSV com os dados dos funcionários
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* ETAPA 1: Upload */}
          {etapa === 'upload' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold mb-2">
                  Selecione um arquivo
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Formatos aceitos: Excel (.xlsx, .xls) ou CSV
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  Selecionar Arquivo
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Formato do Arquivo
                </h4>
                <p className="text-sm text-blue-800 mb-3">
                  O arquivo deve conter as seguintes colunas:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-blue-900">
                  <div>• <strong>nome</strong> (obrigatório)</div>
                  <div>• <strong>cpf</strong> (obrigatório)</div>
                  <div>• <strong>data_inicio</strong> (obrigatório)</div>
                  <div>• <strong>cargo</strong> (obrigatório)</div>
                  <div>• <strong>departamento</strong> (obrigatório)</div>
                  <div>• <strong>salario</strong> (obrigatório)</div>
                  <div>• email</div>
                  <div>• telefone</div>
                  <div>• data_nascimento</div>
                  <div>• regime (clt, pj, etc)</div>
                  <div>• cep, logradouro, numero</div>
                  <div>• bairro, cidade, uf</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={baixarModelo}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Modelo de Exemplo
                </Button>
              </div>
            </div>
          )}

          {/* ETAPA 2: Preview */}
          {etapa === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
                <div>
                  <h3 className="font-semibold">
                    {dadosExtraidos.length} registro(s) encontrado(s)
                  </h3>
                  <p className="text-sm text-slate-600">
                    {dadosExtraidos.filter(d => d._selecionado).length} selecionado(s) para importação
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTodos}
                >
                  {dadosExtraidos.filter(d => d._valido).every(d => d._selecionado) ? 'Desmarcar' : 'Marcar'} Todos Válidos
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Salário</TableHead>
                        <TableHead>Mensagens</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosExtraidos.map((func) => (
                        <TableRow key={func._id} className={!func._valido ? 'bg-red-50' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={func._selecionado}
                              onCheckedChange={() => toggleSelecao(func._id)}
                              disabled={!func._valido}
                            />
                          </TableCell>
                          <TableCell>
                            {func._valido ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{func.nome}</TableCell>
                          <TableCell className="font-mono text-sm">{func.cpf}</TableCell>
                          <TableCell>{func.cargo}</TableCell>
                          <TableCell>{func.departamento}</TableCell>
                          <TableCell>
                            {func.salario ? `R$ ${func.salario.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {func._erros.map((erro, idx) => (
                                <Badge key={idx} variant="destructive" className="text-xs">
                                  {erro}
                                </Badge>
                              ))}
                              {func._avisos.map((aviso, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs text-yellow-700 border-yellow-300">
                                  {aviso}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: Processando */}
          {etapa === 'processando' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Processando...</h3>
              <p className="text-slate-600">Aguarde enquanto importamos os funcionários</p>
            </div>
          )}

          {/* ETAPA 4: Concluído */}
          {etapa === 'concluido' && resultado && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-green-900 mb-2">
                  Importação Concluída!
                </h3>
                <div className="flex items-center justify-center gap-6 text-lg">
                  <div>
                    <span className="font-bold text-green-600">{resultado.sucesso}</span>
                    <span className="text-slate-600"> cadastrado(s)</span>
                  </div>
                  {resultado.erro > 0 && (
                    <div>
                      <span className="font-bold text-red-600">{resultado.erro}</span>
                      <span className="text-slate-600"> erro(s)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultado.detalhes.map((det, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {det.status === 'sucesso' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{det.nome}</TableCell>
                        <TableCell className="text-sm text-slate-600">{det.mensagem}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-between">
          <div>
            {etapa === 'preview' && (
              <Button variant="outline" onClick={() => setEtapa('upload')}>
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleFechar}>
              {etapa === 'concluido' ? 'Fechar' : 'Cancelar'}
            </Button>
            {etapa === 'preview' && (
              <Button
                onClick={handleImportar}
                disabled={processando || dadosExtraidos.filter(d => d._selecionado).length === 0}
              >
                Importar Selecionados
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}