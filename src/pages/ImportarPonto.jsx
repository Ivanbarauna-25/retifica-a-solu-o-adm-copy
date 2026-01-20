import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, FileText, Clock, AlertCircle, CheckCircle2, Loader2, Search, Calendar, User } from "lucide-react";
import { formatDate } from "@/components/formatters";

export default function ImportarPontoPage() {
  const [arquivo, setArquivo] = useState(null);
  const [conteudoTexto, setConteudoTexto] = useState("");
  const [processando, setProcessando] = useState(false);
  
  const [importacoes, setImportacoes] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroValido, setFiltroValido] = useState("todos");
  const [busca, setBusca] = useState("");
  
  const { toast } = useToast();

  const carregar = async () => {
    setIsLoading(true);
    try {
      const [imps, regs, funcs] = await Promise.all([
        base44.entities.ImportacaoPonto.list("-created_date", 50),
        base44.entities.PontoRegistro.list("-data_hora", 200),
        base44.entities.Funcionario.list()
      ]);
      
      setImportacoes(imps || []);
      setRegistros(regs || []);
      setFuncionarios((funcs || []).sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "❌ Erro",
        description: "Erro ao carregar dados.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleArquivoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      setConteudoTexto("");
    }
  };

  const calcularHash = (texto) => {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
      const char = texto.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  const processarImportacao = async () => {
    if (!conteudoTexto && !arquivo) {
      toast({
        title: "⚠️ Atenção",
        description: "Cole o conteúdo do arquivo ou faça upload de um arquivo TXT.",
        variant: "destructive"
      });
      return;
    }

    setProcessando(true);
    
    try {
      let conteudo = conteudoTexto;
      let nomeArquivo = "Colado Manualmente";

      if (!conteudoTexto && arquivo) {
        const texto = await arquivo.text();
        conteudo = texto;
        nomeArquivo = arquivo.name;
      }

      const hash = calcularHash(conteudo);
      
      // Verificar duplicação
      const existente = importacoes.find(imp => imp.arquivo_hash === hash);
      if (existente) {
        toast({
          title: "⚠️ Arquivo já importado",
          description: `Este conteúdo já foi importado em ${formatDate(existente.data_importacao)}.`,
          variant: "destructive"
        });
        setProcessando(false);
        return;
      }

      // Criar registro de importação
      const importacao = await base44.entities.ImportacaoPonto.create({
        data_importacao: new Date().toISOString(),
        arquivo_nome: nomeArquivo,
        arquivo_hash: hash,
        conteudo_txt: conteudoTexto || null,
        status: "processando",
        total_linhas: 0,
        total_registros_validos: 0,
        total_ignorados: 0
      });

      // Processar linhas
      const linhas = conteudo.split('\n').filter(l => l.trim());
      const registrosParaCriar = [];
      const erros = [];
      let totalLinhas = 0;
      let totalValidos = 0;
      let totalIgnorados = 0;
      let dataMin = null;
      let dataMax = null;

      for (const linha of linhas) {
        totalLinhas++;
        
        // Ignorar linhas de metadados
        if (linha.trim().startsWith('#')) {
          totalIgnorados++;
          continue;
        }

        const campos = linha.split('\t');
        
        if (campos.length < 6) {
          totalIgnorados++;
          erros.push(`Linha ${totalLinhas}: formato inválido (menos de 6 campos)`);
          continue;
        }

        const [no, tmNo, enNo, mode, inOut, dateTime, ...resto] = campos;

        if (!enNo || !dateTime) {
          registrosParaCriar.push({
            user_id_relogio: enNo || "VAZIO",
            data_hora: new Date().toISOString(),
            data: new Date().toISOString().split('T')[0],
            hora: "00:00:00",
            origem: "relogio",
            metodo: mode || "",
            dispositivo_id: tmNo || "",
            importacao_id: importacao.id,
            raw_linha: linha,
            valido: false,
            motivo_invalido: "EnNo ou DateTime ausentes"
          });
          totalIgnorados++;
          erros.push(`Linha ${totalLinhas}: EnNo ou DateTime ausentes`);
          continue;
        }

        // Parsear DateTime (formato esperado: YYYY-MM-DD HH:mm:ss ou similar)
        let dataHora;
        try {
          // Tentar diferentes formatos
          const dt = dateTime.trim();
          if (dt.includes(' ')) {
            // Formato: YYYY-MM-DD HH:mm:ss
            const [dataParte, horaParte] = dt.split(' ');
            dataHora = new Date(`${dataParte}T${horaParte}`);
          } else if (dt.includes('/')) {
            // Formato: DD/MM/YYYY HH:mm:ss
            const partes = dt.split(' ');
            const [dia, mes, ano] = partes[0].split('/');
            const hora = partes[1] || "00:00:00";
            dataHora = new Date(`${ano}-${mes}-${dia}T${hora}`);
          } else {
            dataHora = new Date(dt);
          }

          if (isNaN(dataHora.getTime())) {
            throw new Error("Data inválida");
          }
        } catch (e) {
          registrosParaCriar.push({
            user_id_relogio: enNo,
            data_hora: new Date().toISOString(),
            data: new Date().toISOString().split('T')[0],
            hora: "00:00:00",
            origem: "relogio",
            metodo: mode || "",
            dispositivo_id: tmNo || "",
            importacao_id: importacao.id,
            raw_linha: linha,
            valido: false,
            motivo_invalido: `DateTime inválido: ${dateTime}`
          });
          totalIgnorados++;
          erros.push(`Linha ${totalLinhas}: DateTime inválido (${dateTime})`);
          continue;
        }

        const data = dataHora.toISOString().split('T')[0];
        const hora = dataHora.toTimeString().split(' ')[0];

        // Atualizar período
        if (!dataMin || data < dataMin) dataMin = data;
        if (!dataMax || data > dataMax) dataMax = data;

        registrosParaCriar.push({
          user_id_relogio: enNo.trim(),
          data_hora: dataHora.toISOString(),
          data,
          hora,
          origem: "relogio",
          metodo: mode?.trim() || "",
          dispositivo_id: tmNo?.trim() || "",
          importacao_id: importacao.id,
          raw_linha: linha,
          valido: true,
          motivo_invalido: null
        });

        totalValidos++;
      }

      // Criar registros em lote
      if (registrosParaCriar.length > 0) {
        await base44.entities.PontoRegistro.bulkCreate(registrosParaCriar);
      }

      // Atualizar importação
      await base44.entities.ImportacaoPonto.update(importacao.id, {
        status: "concluida",
        total_linhas: totalLinhas,
        total_registros_validos: totalValidos,
        total_ignorados: totalIgnorados,
        periodo_inicio: dataMin,
        periodo_fim: dataMax,
        log_erros: erros.length > 0 ? erros.join('\n') : null
      });

      toast({
        title: "✅ Importação concluída",
        description: `${totalValidos} registros válidos importados, ${totalIgnorados} ignorados.`
      });

      setArquivo(null);
      setConteudoTexto("");
      await carregar();
      
    } catch (error) {
      console.error("Erro ao processar importação:", error);
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
    const func = funcionarios.find(f => f.id === id);
    return func?.nome || "-";
  };

  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      const byFunc = filtroFuncionario === "todos" || r.funcionario_id === filtroFuncionario;
      const byDataInicio = !filtroDataInicio || r.data >= filtroDataInicio;
      const byDataFim = !filtroDataFim || r.data <= filtroDataFim;
      const byValido = filtroValido === "todos" || (filtroValido === "validos" ? r.valido : !r.valido);
      const byBusca = !busca || 
        r.user_id_relogio?.toLowerCase().includes(busca.toLowerCase()) ||
        getFuncionarioNome(r.funcionario_id).toLowerCase().includes(busca.toLowerCase());
      
      return byFunc && byDataInicio && byDataFim && byValido && byBusca;
    });
  }, [registros, filtroFuncionario, filtroDataInicio, filtroDataFim, filtroValido, busca, funcionarios]);

  const statusColors = {
    'processando': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'concluida': 'bg-green-100 text-green-800 border-green-200',
    'erro': 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-slate-800 text-white px-2 md:px-6 py-3 md:py-5 mb-3 md:mb-4 shadow-lg rounded-lg md:rounded-xl mx-1 md:mx-0">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-slate-700 p-1.5 md:p-2 rounded-lg">
              <Clock className="w-4 h-4 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-sm md:text-xl font-bold">Importar Ponto</h1>
              <p className="text-slate-400 text-[9px] md:text-xs">Importação de registros de relógio de ponto</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-1 md:px-4 space-y-3 md:space-y-6">
        {/* Card de Importação */}
        <Card className="shadow-sm">
          <CardContent className="p-3 md:p-6">
            <div className="space-y-3 md:space-y-4">
              <div>
                <Label className="text-xs md:text-sm font-medium">Upload de Arquivo TXT</Label>
                <div className="mt-1 md:mt-2 flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".txt"
                    onChange={handleArquivoChange}
                    className="text-xs md:text-sm"
                    disabled={!!conteudoTexto}
                  />
                  {arquivo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setArquivo(null)}
                      className="text-xs"
                    >
                      Limpar
                    </Button>
                  )}
                </div>
                {arquivo && (
                  <p className="text-[10px] md:text-xs text-slate-500 mt-1">
                    Arquivo selecionado: {arquivo.name}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500">
                <div className="flex-1 border-t border-slate-300" />
                <span>OU</span>
                <div className="flex-1 border-t border-slate-300" />
              </div>

              <div>
                <Label className="text-xs md:text-sm font-medium">Colar Conteúdo do Arquivo</Label>
                <Textarea
                  placeholder="Cole aqui o conteúdo do arquivo TXT exportado do relógio..."
                  value={conteudoTexto}
                  onChange={(e) => {
                    setConteudoTexto(e.target.value);
                    if (e.target.value) setArquivo(null);
                  }}
                  rows={8}
                  className="mt-1 md:mt-2 font-mono text-[10px] md:text-xs"
                />
              </div>

              <Button
                onClick={processarImportacao}
                disabled={processando || (!arquivo && !conteudoTexto)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-xs md:text-sm h-8 md:h-10"
              >
                {processando ? (
                  <>
                    <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                    Processar Importação
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="importacoes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 p-0.5 md:p-1">
            <TabsTrigger value="importacoes" className="text-xs md:text-sm">
              <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Importações
            </TabsTrigger>
            <TabsTrigger value="registros" className="text-xs md:text-sm">
              <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Registros
            </TabsTrigger>
          </TabsList>

          {/* Tab: Importações */}
          <TabsContent value="importacoes" className="space-y-3 md:space-y-4">
            <Card className="shadow-sm">
              <CardContent className="p-0">
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-700 hover:bg-slate-700">
                        <TableHead className="text-white font-semibold">Data</TableHead>
                        <TableHead className="text-white font-semibold">Arquivo</TableHead>
                        <TableHead className="text-white font-semibold">Período</TableHead>
                        <TableHead className="text-white font-semibold text-right">Válidos</TableHead>
                        <TableHead className="text-white font-semibold text-right">Ignorados</TableHead>
                        <TableHead className="text-white font-semibold text-right">Total</TableHead>
                        <TableHead className="text-white font-semibold">Status</TableHead>
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
                          <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                            Nenhuma importação realizada ainda.
                          </TableCell>
                        </TableRow>
                      ) : (
                        importacoes.map((imp) => (
                          <TableRow key={imp.id} className="hover:bg-slate-50">
                            <TableCell className="text-slate-900">
                              {formatDate(imp.data_importacao)}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">
                              {imp.arquivo_nome}
                            </TableCell>
                            <TableCell className="text-slate-900">
                              {imp.periodo_inicio && imp.periodo_fim
                                ? `${formatDate(imp.periodo_inicio)} - ${formatDate(imp.periodo_fim)}`
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              {imp.total_registros_validos || 0}
                            </TableCell>
                            <TableCell className="text-right text-orange-600 font-semibold">
                              {imp.total_ignorados || 0}
                            </TableCell>
                            <TableCell className="text-right text-slate-900 font-semibold">
                              {imp.total_linhas || 0}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[imp.status]}>
                                {imp.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile */}
                <div className="md:hidden p-2 space-y-2">
                  {isLoading ? (
                    <div className="text-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-600 mx-auto" />
                    </div>
                  ) : importacoes.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      Nenhuma importação realizada ainda.
                    </div>
                  ) : (
                    importacoes.map((imp) => (
                      <div key={imp.id} className="bg-white rounded-lg border border-slate-200 p-2">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-[11px]">{imp.arquivo_nome}</h3>
                            <p className="text-[9px] text-slate-500">{formatDate(imp.data_importacao)}</p>
                          </div>
                          <Badge className={`${statusColors[imp.status]} text-[8px] px-1 py-0.5`}>
                            {imp.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[9px]">
                          <div>
                            <span className="text-slate-500">Válidos:</span>
                            <span className="font-semibold text-green-600 ml-0.5">{imp.total_registros_validos || 0}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Ignor:</span>
                            <span className="font-semibold text-orange-600 ml-0.5">{imp.total_ignorados || 0}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Total:</span>
                            <span className="font-semibold text-slate-900 ml-0.5">{imp.total_linhas || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Registros */}
          <TabsContent value="registros" className="space-y-3 md:space-y-4">
            {/* Filtros */}
            <Card className="shadow-sm">
              <CardContent className="p-2 md:p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
                  <div>
                    <Label className="text-xs md:text-sm">Buscar</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-slate-400" />
                      <Input
                        placeholder="ID ou funcionário..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="pl-7 md:pl-8 text-xs md:text-sm h-7 md:h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Data Início</Label>
                    <Input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="mt-1 text-xs md:text-sm h-7 md:h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Data Fim</Label>
                    <Input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="mt-1 text-xs md:text-sm h-7 md:h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Válidos</Label>
                    <Select value={filtroValido} onValueChange={setFiltroValido}>
                      <SelectTrigger className="mt-1 text-xs md:text-sm h-7 md:h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="validos">Válidos</SelectItem>
                        <SelectItem value="invalidos">Inválidos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Registros */}
            <Card className="shadow-sm">
              <CardContent className="p-0">
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-700 hover:bg-slate-700">
                        <TableHead className="text-white font-semibold">Data</TableHead>
                        <TableHead className="text-white font-semibold">Hora</TableHead>
                        <TableHead className="text-white font-semibold">ID Relógio</TableHead>
                        <TableHead className="text-white font-semibold">Funcionário</TableHead>
                        <TableHead className="text-white font-semibold">Método</TableHead>
                        <TableHead className="text-white font-semibold">Dispositivo</TableHead>
                        <TableHead className="text-white font-semibold">Válido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : registrosFiltrados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                            Nenhum registro encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        registrosFiltrados.map((reg) => (
                          <TableRow key={reg.id} className="hover:bg-slate-50">
                            <TableCell className="text-slate-900">{formatDate(reg.data)}</TableCell>
                            <TableCell className="text-slate-900 font-mono">{reg.hora}</TableCell>
                            <TableCell className="text-slate-900 font-mono">{reg.user_id_relogio}</TableCell>
                            <TableCell className="text-slate-900">
                              {reg.funcionario_id ? getFuncionarioNome(reg.funcionario_id) : "-"}
                            </TableCell>
                            <TableCell className="text-slate-900">{reg.metodo || "-"}</TableCell>
                            <TableCell className="text-slate-900">{reg.dispositivo_id || "-"}</TableCell>
                            <TableCell>
                              {reg.valido ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-600" title={reg.motivo_invalido} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile */}
                <div className="md:hidden p-2 space-y-2">
                  {isLoading ? (
                    <div className="text-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-600 mx-auto" />
                    </div>
                  ) : registrosFiltrados.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      Nenhum registro encontrado.
                    </div>
                  ) : (
                    registrosFiltrados.map((reg) => (
                      <div key={reg.id} className="bg-white rounded-lg border border-slate-200 p-2">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-[11px]">{formatDate(reg.data)} {reg.hora}</h3>
                            <p className="text-[9px] text-slate-500 font-mono">ID: {reg.user_id_relogio}</p>
                          </div>
                          {reg.valido ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          )}
                        </div>
                        <div className="text-[9px] text-slate-600">
                          {reg.funcionario_id ? getFuncionarioNome(reg.funcionario_id) : "Funcionário não vinculado"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="text-xs md:text-sm text-slate-500 px-1">
              <strong className="text-slate-700">{registrosFiltrados.length}</strong> registros
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}