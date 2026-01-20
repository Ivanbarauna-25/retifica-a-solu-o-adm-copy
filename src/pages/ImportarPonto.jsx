import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Clock, Filter, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { formatDate } from "@/components/formatters";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function ImportarPontoPage() {
  const [arquivo, setArquivo] = useState(null);
  const [conteudoColado, setConteudoColado] = useState("");
  const [processando, setProcessando] = useState(false);
  const [importacoes, setImportacoes] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroValido, setFiltroValido] = useState("todos");
  const [showFilters, setShowFilters] = useState(false);

  const { toast } = useToast();

  const carregar = async () => {
    setIsLoading(true);
    try {
      const [imps, regs, funcs] = await Promise.all([
        base44.entities.ImportacaoPonto.list("-created_date"),
        base44.entities.PontoRegistro.list("-created_date", 500),
        base44.entities.Funcionario.list()
      ]);
      setImportacoes(imps || []);
      setRegistros(regs || []);
      setFuncionarios((funcs || []).sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')));
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArquivo(file);
      setConteudoColado(""); // Limpa o campo de texto se arquivo for selecionado
    }
  };

  const calcularHash = (conteudo) => {
    // Hash MD5 simples (você pode usar uma lib mais robusta se necessário)
    let hash = 0;
    for (let i = 0; i < conteudo.length; i++) {
      const char = conteudo.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  const processarConteudo = (conteudo, nomeArquivo) => {
    const linhas = conteudo.split('\n');
    const registrosProcessados = [];
    const erros = [];
    let totalLinhas = 0;
    let totalValidos = 0;
    let totalIgnorados = 0;
    let dataInicio = null;
    let dataFim = null;

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      
      // Ignorar linhas vazias ou que começam com #
      if (!linha || linha.startsWith('#')) {
        totalIgnorados++;
        continue;
      }

      totalLinhas++;
      const campos = linha.split('\t');

      // Mapear campos (assumindo ordem: No, TMNo, EnNo, Mode, IN/OUT, DateTime, TR)
      const enNo = campos[2]?.trim(); // user_id_relogio
      const dateTime = campos[5]?.trim(); // data_hora
      const mode = campos[3]?.trim(); // metodo
      const tmNo = campos[1]?.trim(); // dispositivo_id

      if (!enNo || !dateTime) {
        registrosProcessados.push({
          user_id_relogio: enNo || 'DESCONHECIDO',
          data_hora: dateTime || new Date().toISOString(),
          data: dateTime ? dateTime.split(' ')[0] : new Date().toISOString().split('T')[0],
          hora: dateTime ? dateTime.split(' ')[1] : '00:00:00',
          origem: 'relogio',
          metodo: mode || '',
          dispositivo_id: tmNo || '',
          raw_linha: linha,
          valido: false,
          motivo_invalido: 'EnNo ou DateTime ausente'
        });
        totalIgnorados++;
        erros.push(`Linha ${i + 1}: EnNo ou DateTime ausente`);
        continue;
      }

      // Parsear data_hora para obter data e hora separadamente
      const [dataParte, horaParte] = dateTime.split(' ');
      const dataISO = dataParte; // Assumindo formato YYYY-MM-DD
      const hora = horaParte || '00:00:00';

      // Atualizar período
      if (!dataInicio || dataISO < dataInicio) dataInicio = dataISO;
      if (!dataFim || dataISO > dataFim) dataFim = dataISO;

      registrosProcessados.push({
        user_id_relogio: enNo,
        data_hora: dateTime,
        data: dataISO,
        hora: hora,
        origem: 'relogio',
        metodo: mode || '',
        dispositivo_id: tmNo || '',
        raw_linha: linha,
        valido: true,
        motivo_invalido: null
      });
      totalValidos++;
    }

    return {
      registros: registrosProcessados,
      totalLinhas,
      totalValidos,
      totalIgnorados,
      dataInicio,
      dataFim,
      erros
    };
  };

  const processarImportacao = async () => {
    if (!arquivo && !conteudoColado) {
      toast({
        title: "⚠️ Atenção",
        description: "Selecione um arquivo ou cole o conteúdo do TXT.",
        variant: "destructive"
      });
      return;
    }

    setProcessando(true);
    try {
      let conteudo = conteudoColado;
      let nomeArquivo = "Conteúdo Colado";

      if (!conteudoColado && arquivo) {
        // Ler arquivo
        const text = await arquivo.text();
        conteudo = text;
        nomeArquivo = arquivo.name;
      }

      const hash = calcularHash(conteudo);

      // Verificar se já foi importado
      const importacoesExistentes = await base44.entities.ImportacaoPonto.filter({ arquivo_hash: hash });
      if (importacoesExistentes && importacoesExistentes.length > 0) {
        toast({
          title: "⚠️ Arquivo duplicado",
          description: "Este arquivo já foi importado anteriormente.",
          variant: "destructive"
        });
        setProcessando(false);
        return;
      }

      // Processar conteúdo
      const resultado = processarConteudo(conteudo, nomeArquivo);

      // Criar registro de importação
      const importacao = await base44.entities.ImportacaoPonto.create({
        data_importacao: new Date().toISOString(),
        arquivo_nome: nomeArquivo,
        arquivo_hash: hash,
        conteudo_txt: conteudoColado ? conteudo : null,
        periodo_inicio: resultado.dataInicio,
        periodo_fim: resultado.dataFim,
        total_linhas: resultado.totalLinhas,
        total_registros_validos: resultado.totalValidos,
        total_ignorados: resultado.totalIgnorados,
        status: 'processando',
        log_erros: resultado.erros.length > 0 ? resultado.erros.join('\n') : null
      });

      // Criar registros de ponto
      const registrosComImportacao = resultado.registros.map(r => ({
        ...r,
        importacao_id: importacao.id
      }));

      await base44.entities.PontoRegistro.bulkCreate(registrosComImportacao);

      // Atualizar status da importação
      await base44.entities.ImportacaoPonto.update(importacao.id, { status: 'concluida' });

      toast({
        title: "✅ Importação concluída",
        description: `${resultado.totalValidos} registros importados com sucesso.`
      });

      // Limpar form
      setArquivo(null);
      setConteudoColado("");
      if (document.getElementById('file-upload')) {
        document.getElementById('file-upload').value = '';
      }

      // Recarregar dados
      await carregar();
    } catch (error) {
      toast({
        title: "❌ Erro na importação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessando(false);
    }
  };

  const getFuncionarioNome = (id) => {
    if (!id) return '-';
    const func = funcionarios.find(f => f.id === id);
    return func?.nome || '-';
  };

  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      const byFunc = filtroFuncionario === "todos" || r.funcionario_id === filtroFuncionario;
      const byDataInicio = !filtroDataInicio || r.data >= filtroDataInicio;
      const byDataFim = !filtroDataFim || r.data <= filtroDataFim;
      const byValido = filtroValido === "todos" || 
        (filtroValido === "validos" && r.valido) || 
        (filtroValido === "invalidos" && !r.valido);
      return byFunc && byDataInicio && byDataFim && byValido;
    });
  }, [registros, filtroFuncionario, filtroDataInicio, filtroDataFim, filtroValido]);

  const statusColors = {
    'processando': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'concluida': 'bg-green-100 text-green-800 border-green-200',
    'erro': 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-full overflow-x-hidden">
      <div className="bg-slate-800 text-white px-2 md:px-6 py-3 md:py-5 mb-3 md:mb-4 shadow-lg rounded-lg md:rounded-xl mx-1 md:mx-0">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-slate-700 p-1.5 md:p-2 rounded-lg">
              <Clock className="w-4 h-4 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-sm md:text-xl font-bold">Importar Registros de Ponto</h1>
              <p className="text-slate-400 text-[9px] md:text-xs">Importação de batidas de relógio de ponto</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-1 md:px-4">
        {/* Card de Importação */}
        <Card className="mb-4 md:mb-6">
          <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {/* Upload de Arquivo */}
              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-semibold text-slate-900">Upload de Arquivo TXT</Label>
                <div className="relative">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    className="text-xs md:text-sm"
                  />
                  {arquivo && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {arquivo.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Campo de Texto */}
              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-semibold text-slate-900">Ou Cole o Conteúdo do TXT</Label>
                <Textarea
                  placeholder="Cole aqui o conteúdo do arquivo de ponto..."
                  value={conteudoColado}
                  onChange={(e) => {
                    setConteudoColado(e.target.value);
                    if (e.target.value) setArquivo(null); // Limpa arquivo se texto for colado
                  }}
                  rows={4}
                  className="text-xs md:text-sm font-mono"
                />
              </div>
            </div>

            <Button
              onClick={processarImportacao}
              disabled={processando || (!arquivo && !conteudoColado)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white gap-2"
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Processar Importação
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Histórico de Importações */}
        <Card className="mb-4 md:mb-6">
          <CardContent className="p-3 md:p-6">
            <h2 className="text-sm md:text-lg font-bold text-slate-900 mb-3 md:mb-4">Histórico de Importações</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-700 hover:bg-slate-700">
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Data</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Arquivo</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Período</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm text-center">Total</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm text-center">Válidos</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm text-center">Ignorados</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : importacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-xs md:text-sm">
                        Nenhuma importação realizada ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    importacoes.map((imp) => (
                      <TableRow key={imp.id} className="hover:bg-slate-50">
                        <TableCell className="text-xs md:text-sm">{formatDate(imp.data_importacao)}</TableCell>
                        <TableCell className="text-xs md:text-sm font-medium">{imp.arquivo_nome}</TableCell>
                        <TableCell className="text-xs md:text-sm">
                          {imp.periodo_inicio && imp.periodo_fim 
                            ? `${formatDate(imp.periodo_inicio)} - ${formatDate(imp.periodo_fim)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center text-xs md:text-sm font-semibold">{imp.total_linhas}</TableCell>
                        <TableCell className="text-center text-xs md:text-sm font-semibold text-green-600">{imp.total_registros_validos}</TableCell>
                        <TableCell className="text-center text-xs md:text-sm font-semibold text-red-600">{imp.total_ignorados}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[imp.status]} text-[8px] md:text-xs`}>
                            {imp.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Registros de Ponto */}
        <Card>
          <CardContent className="p-3 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-3 md:mb-4">
              <h2 className="text-sm md:text-lg font-bold text-slate-900">Registros de Ponto</h2>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2 text-xs md:text-sm h-8 md:h-9"
              >
                <Filter className="w-3 h-3 md:w-4 md:h-4" />
                Filtros
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-xs font-medium">Funcionário</Label>
                  <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
                    <SelectTrigger className="text-xs md:text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {funcionarios.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Data Início</Label>
                  <Input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                    className="text-xs md:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Data Fim</Label>
                  <Input
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                    className="text-xs md:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Validação</Label>
                  <Select value={filtroValido} onValueChange={setFiltroValido}>
                    <SelectTrigger className="text-xs md:text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="validos">Válidos</SelectItem>
                      <SelectItem value="invalidos">Inválidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-700 hover:bg-slate-700">
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Data</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Hora</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">ID Relógio</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Funcionário</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">Método</TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm text-center">Válido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : registrosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-xs md:text-sm">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrosFiltrados.map((reg) => (
                      <TableRow key={reg.id} className="hover:bg-slate-50">
                        <TableCell className="text-xs md:text-sm">{formatDate(reg.data)}</TableCell>
                        <TableCell className="text-xs md:text-sm font-mono">{reg.hora}</TableCell>
                        <TableCell className="text-xs md:text-sm font-semibold">{reg.user_id_relogio}</TableCell>
                        <TableCell className="text-xs md:text-sm">{getFuncionarioNome(reg.funcionario_id)}</TableCell>
                        <TableCell className="text-xs md:text-sm">{reg.metodo || '-'}</TableCell>
                        <TableCell className="text-center">
                          {reg.valido ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 mx-auto" title={reg.motivo_invalido} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              <strong>{registrosFiltrados.length}</strong> registros exibidos
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}