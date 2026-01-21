import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Clock, Filter, Loader2, CheckCircle2, XCircle, Link as LinkIcon } from "lucide-react";
import { formatDate } from "@/components/formatters";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import MapearFuncionariosModal from "@/components/ponto/MapearFuncionariosModal";

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
  const [showMapearModal, setShowMapearModal] = useState(false);

  const { toast } = useToast();
  const fileInputRef = useRef(null);

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
      setFuncionarios((funcs || []).sort((a, b) => (a?.nome || "").localeCompare(b?.nome || "")));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
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
    const file = e.target.files?.[0] || null;
    if (file) {
      setArquivo(file);
      setConteudoColado("");
    }
  };

  // =========================
  // Helpers robustos
  // =========================

  const normalizeLine = (s) => (s || "").replace(/\r/g, "").trim();

  const parseDateTimeToISO = (raw) => {
    // Aceita:
    // - "YYYY-MM-DD HH:mm:ss"
    // - "YYYY/MM/DD HH:mm:ss"
    // - "YYYY-MM-DDTHH:mm:ss"
    // Retorna ISO "YYYY-MM-DDTHH:mm:ss" (sem timezone) ou null
    const v = (raw || "").trim();
    if (!v) return null;

    // Já está em ISO (sem timezone)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(v)) {
      const [datePart, timePart] = v.split("T");
      const time = (timePart || "").length === 5 ? `${timePart}:00` : timePart;
      return `${datePart}T${time}`;
    }

    const parts = v.split(/\s+/);
    if (parts.length < 2) return null;

    let datePart = parts[0].replace(/\//g, "-");
    let timePart = parts[1];

    // Normaliza hora
    if (/^\d{2}:\d{2}$/.test(timePart)) timePart = `${timePart}:00`;
    if (!/^\d{2}:\d{2}:\d{2}$/.test(timePart)) return null;

    // Normaliza data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;

    return `${datePart}T${timePart}`;
  };

  const getDateFromISO = (isoNoTz) => {
    // isoNoTz "YYYY-MM-DDTHH:mm:ss"
    if (!isoNoTz) return null;
    const d = isoNoTz.split("T")[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  };

  const getTimeFromISO = (isoNoTz) => {
    if (!isoNoTz) return null;
    const t = isoNoTz.split("T")[1] || "";
    return /^\d{2}:\d{2}:\d{2}$/.test(t) ? t : null;
  };

  const safeTextFromFile = async (file) => {
    // Alguns TXT vêm com encoding estranho; aqui fica simples.
    // Se precisar, dá pra evoluir depois.
    return await file.text();
  };

  const sha256Hex = async (text) => {
    try {
      if (window?.crypto?.subtle) {
        const enc = new TextEncoder();
        const data = enc.encode(text);
        const digest = await window.crypto.subtle.digest("SHA-256", data);
        const bytes = Array.from(new Uint8Array(digest));
        return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {
      // fallback abaixo
    }

    // Fallback determinístico (não criptográfico, mas estável)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `fallback_${Math.abs(hash).toString(16)}`;
  };

  const findFuncionarioIdByRelogio = (enNoRaw) => {
    const enNo = (enNoRaw || "").trim();
    if (!enNo) return null;

    // Estratégia sem depender de schema:
    // tenta achar um campo “provável” no funcionário que guarde o EnNo/código do relógio.
    const candidateKeys = [
      "user_id_relogio",
      "codigo_relogio",
      "codigo_ponto",
      "enno",
      "id_relogio",
      "ponto_id",
      "matricula",
      "registro",
      "codigo"
    ];

    // Primeiro: match exato por campos prováveis
    for (const f of funcionarios || []) {
      for (const key of candidateKeys) {
        if (f && f[key] != null && String(f[key]).trim() === enNo) return f.id;
      }
    }

    // Segundo: se alguém usa EnNo como “id interno” (raro, mas acontece)
    for (const f of funcionarios || []) {
      if (f?.id && String(f.id).trim() === enNo) return f.id;
    }

    return null;
  };

  // =========================
  // Parser do AttendLog
  // =========================
  const processarConteudo = (conteudo) => {
    const linhas = (conteudo || "").split("\n");

    const registrosProcessados = [];
    const erros = [];

    let totalIgnorados = 0;          // linhas vazias / metadados (#)
    let totalProcessadas = 0;        // linhas que eram “dados” (não #, não vazia)
    let totalValidos = 0;
    let totalInvalidos = 0;

    let dataInicio = null;
    let dataFim = null;

    for (let i = 0; i < linhas.length; i++) {
      const linhaOriginal = linhas[i];
      const linha = normalizeLine(linhaOriginal);

      // Ignorar linhas vazias, comentários (#) e cabeçalhos comuns
      if (!linha || 
          linha.startsWith("#") || 
          linha.toLowerCase().includes("enno") || 
          linha.toLowerCase().includes("name") ||
          linha.toLowerCase().includes("tmno") ||
          linha.toLowerCase().includes("datetime")) {
        totalIgnorados++;
        continue;
      }

      totalProcessadas++;

      // Separador esperado: TAB. Se vier com múltiplos espaços, ainda tentamos.
      let campos = linha.split("\t").map((c) => (c ?? "").trim());
      if (campos.length < 6) {
        // fallback por múltiplos espaços
        campos = linha.split(/\s+/).map((c) => (c ?? "").trim());
      }

      // Formato esperado (comumente):
      // 0 No | 1 TMNo | 2 EnNo | 3 Mode | 4 IN/OUT | 5 DateTime | 6 TR
      const tmNo = (campos[1] || "").trim();
      const enNo = (campos[2] || "").trim();
      const mode = (campos[3] || "").trim();
      const dtRaw = (campos[5] || "").trim();

      const iso = parseDateTimeToISO(dtRaw);
      const data = getDateFromISO(iso);
      const hora = getTimeFromISO(iso);

      const funcionarioId = findFuncionarioIdByRelogio(enNo);

      // Validação mínima
      if (!enNo || !iso || !data || !hora) {
        totalInvalidos++;
        const motivo = !enNo
          ? "EnNo ausente"
          : !iso ? "DateTime inválido/ausente"
          : "Data/Hora inválida";

        registrosProcessados.push({
          funcionario_id: funcionarioId || null,
          user_id_relogio: enNo || "DESCONHECIDO",
          data: data || null,
          hora: hora || null,
          data_hora: iso || new Date().toISOString(), // fallback para satisfazer required
          origem: "relogio",
          metodo: mode || "",
          dispositivo_id: tmNo || "",
          raw_linha: linha,
          valido: false,
          motivo_invalido: motivo
        });

        erros.push(`Linha ${i + 1}: ${motivo} | "${linha.substring(0, 160)}"`);
        continue;
      }

      // Atualizar período
      if (!dataInicio || data < dataInicio) dataInicio = data;
      if (!dataFim || data > dataFim) dataFim = data;

      // Marcar como inválido se não houver funcionário vinculado
      const valido = !!funcionarioId;
      const motivoInvalido = !funcionarioId ? "Funcionário não vinculado ao ID do relógio" : null;

      registrosProcessados.push({
        funcionario_id: funcionarioId || null,
        user_id_relogio: enNo,
        data,
        hora,
        data_hora: iso,
        origem: "relogio",
        metodo: mode || "",
        dispositivo_id: tmNo || "",
        raw_linha: linha,
        valido: valido,
        motivo_invalido: motivoInvalido
      });

      if (valido) {
        totalValidos++;
      } else {
        totalInvalidos++;
        erros.push(`Linha ${i + 1}: Funcionário não vinculado (ID Relógio: ${enNo})`);
      }
    }

    return {
      registros: registrosProcessados,
      total_ignorados: totalIgnorados,
      total_processadas: totalProcessadas,
      total_validos: totalValidos,
      total_invalidos: totalInvalidos,
      periodo_inicio: dataInicio,
      periodo_fim: dataFim,
      erros
    };
  };

  const bulkCreateSafe = async (rows) => {
    if (!rows || rows.length === 0) return;

    // Tenta bulkCreate (se existir), com fallback em lotes
    const entity = base44.entities.PontoRegistro;
    const hasBulk = entity && typeof entity.bulkCreate === "function";

    const BATCH = 250;

    if (hasBulk) {
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        await entity.bulkCreate(chunk);
      }
      return;
    }

    // Fallback: create sequencial (mais lento, mas robusto)
    for (let i = 0; i < rows.length; i++) {
      await entity.create(rows[i]);
    }
  };

  const processarImportacao = async () => {
    if (!arquivo && !conteudoColado) {
      toast({
        title: "Atenção",
        description: "Selecione um arquivo ou cole o conteúdo do TXT.",
        variant: "destructive"
      });
      return;
    }

    setProcessando(true);

    let importacaoId = null;

    try {
      let conteudo = (conteudoColado || "").trim();
      let nomeArquivo = "Conteúdo Colado";

      if (!conteudo) {
        // Ler arquivo
        const text = await safeTextFromFile(arquivo);
        conteudo = (text || "").trim();
        nomeArquivo = arquivo?.name || "Arquivo TXT";
      }

      if (!conteudo) {
        toast({
          title: "Atenção",
          description: "O conteúdo do arquivo está vazio.",
          variant: "destructive"
        });
        return;
      }

      const hash = await sha256Hex(conteudo);

      // Verificar duplicidade
      let importacoesExistentes = [];
      try {
        importacoesExistentes = await base44.entities.ImportacaoPonto.filter({ arquivo_hash: hash });
      } catch (e) {
        // Alguns ambientes não suportam filter do jeito esperado; fallback via list
        const all = await base44.entities.ImportacaoPonto.list("-created_date", 50);
        importacoesExistentes = (all || []).filter((x) => x?.arquivo_hash === hash);
      }

      if (importacoesExistentes && importacoesExistentes.length > 0) {
        toast({
          title: "Arquivo duplicado",
          description: "Este conteúdo já foi importado anteriormente.",
          variant: "destructive"
        });
        return;
      }

      const resultado = processarConteudo(conteudo);

      // Criar importação (status processando)
      const importacao = await base44.entities.ImportacaoPonto.create({
        data_importacao: new Date().toISOString(),
        arquivo_nome: nomeArquivo,
        arquivo_hash: hash,
        conteudo_txt: conteudoColado ? conteudo : null,
        periodo_inicio: resultado.periodo_inicio,
        periodo_fim: resultado.periodo_fim,
        total_linhas: resultado.total_processadas,               // apenas linhas de “dados”
        total_registros_validos: resultado.total_validos,
        total_ignorados: resultado.total_ignorados + resultado.total_invalidos, // ignorados + inválidos (para bater com sua entidade)
        status: "processando",
        log_erros: resultado.erros.length > 0 ? resultado.erros.join("\n") : null
      });

      importacaoId = importacao?.id;

      // Vincular importacao_id nos registros
      const rows = (resultado.registros || []).map((r) => ({
        ...r,
        importacao_id: importacaoId
      }));

      await bulkCreateSafe(rows);

      // Finalizar importação
      await base44.entities.ImportacaoPonto.update(importacaoId, { status: "concluida" });

      toast({
        title: "Importação concluída",
        description: `${resultado.total_validos} registros válidos importados. ${resultado.total_invalidos} inválidos.`
      });

      // Limpar form
      setArquivo(null);
      setConteudoColado("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      await carregar();
    } catch (error) {
      console.error("Erro na importação:", error);

      // Tentar marcar importação como erro (se já criou)
      if (importacaoId) {
        try {
          await base44.entities.ImportacaoPonto.update(importacaoId, {
            status: "erro",
            log_erros: (error?.message || String(error)).slice(0, 5000)
          });
        } catch (e) {
          // ignora
        }
      }

      toast({
        title: "Erro na importação",
        description: error?.message || "Falha ao importar.",
        variant: "destructive"
      });
    } finally {
      setProcessando(false);
    }
  };

  const getFuncionarioNome = (id, userIdRelogio) => {
    // 1) Se veio funcionario_id gravado, usa ele
    if (id) {
      const func = (funcionarios || []).find((f) => f.id === id);
      if (func?.nome) return func.nome;
    }

    // 2) Se não veio, tenta resolver pelo EnNo dinamicamente (sem gravar)
    const enNo = (userIdRelogio || "").trim();
    if (enNo) {
      const candidateKeys = [
        "user_id_relogio",
        "codigo_relogio",
        "codigo_ponto",
        "enno",
        "id_relogio",
        "ponto_id",
        "matricula",
        "registro",
        "codigo"
      ];

      for (const f of funcionarios || []) {
        for (const key of candidateKeys) {
          if (f && f[key] != null && String(f[key]).trim() === enNo) {
            return f?.nome || "-";
          }
        }
      }
    }

    return "-";
  };

  const registrosFiltrados = useMemo(() => {
    return (registros || []).filter((r) => {
      const byFunc =
        filtroFuncionario === "todos" ||
        r.funcionario_id === filtroFuncionario;

      const byDataInicio = !filtroDataInicio || (r.data && r.data >= filtroDataInicio);
      const byDataFim = !filtroDataFim || (r.data && r.data <= filtroDataFim);

      const byValido =
        filtroValido === "todos" ||
        (filtroValido === "validos" && !!r.valido) ||
        (filtroValido === "invalidos" && !r.valido);

      return byFunc && byDataInicio && byDataFim && byValido;
    });
  }, [registros, filtroFuncionario, filtroDataInicio, filtroDataFim, filtroValido]);

  const statusColors = {
    processando: "bg-yellow-100 text-yellow-800 border-yellow-200",
    concluida: "bg-green-100 text-green-800 border-green-200",
    erro: "bg-red-100 text-red-800 border-red-200"
  };

  // Contar IDs não vinculados
  const idsNaoVinculados = useMemo(() => {
    const set = new Set();
    for (const r of registros) {
      if (!r.funcionario_id && r.user_id_relogio) {
        set.add(r.user_id_relogio);
      }
    }
    return set.size;
  }, [registros]);

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-full overflow-x-hidden">
      <div className="bg-slate-800 text-white px-2 md:px-6 py-3 md:py-5 mb-3 md:mb-4 shadow-lg rounded-lg md:rounded-xl mx-1 md:mx-0">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-slate-700 p-1.5 md:p-2 rounded-lg">
                <Clock className="w-4 h-4 md:w-6 md:h-6" />
              </div>
              <div>
                <h1 className="text-sm md:text-xl font-bold">Importar Registros de Ponto</h1>
                <p className="text-slate-400 text-[9px] md:text-xs">Importação de batidas do relógio de ponto (TXT AttendLog)</p>
              </div>
            </div>
            {idsNaoVinculados > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowMapearModal(true)}
                className="gap-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300 text-xs md:text-sm h-8 md:h-10"
              >
                <LinkIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Mapear IDs ({idsNaoVinculados})
              </Button>
            )}
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
                    ref={fileInputRef}
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
                    const v = e.target.value;
                    setConteudoColado(v);
                    if (v && v.trim()) setArquivo(null);
                  }}
                  rows={4}
                  className="text-xs md:text-sm font-mono"
                />
                <p className="text-[10px] md:text-xs text-slate-500">
                  Dica: se o relógio exportar com linhas iniciadas por “#”, elas serão ignoradas automaticamente.
                </p>
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
                    <TableHead className="text-white font-semibold text-xs md:text-sm text-center">Processadas</TableHead>
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
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center text-xs md:text-sm font-semibold">{imp.total_linhas}</TableCell>
                        <TableCell className="text-center text-xs md:text-sm font-semibold text-green-600">{imp.total_registros_validos}</TableCell>
                        <TableCell className="text-center text-xs md:text-sm font-semibold text-red-600">{imp.total_ignorados}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[imp.status] || "bg-slate-100 text-slate-800"} text-[8px] md:text-xs`}>
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
                      {funcionarios.map((f) => (
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
                        <TableCell className="text-xs md:text-sm">{reg.data ? formatDate(reg.data) : "-"}</TableCell>
                        <TableCell className="text-xs md:text-sm font-mono">{reg.hora || "-"}</TableCell>
                        <TableCell className="text-xs md:text-sm font-semibold">{reg.user_id_relogio || "-"}</TableCell>
                        <TableCell className="text-xs md:text-sm">
                          {getFuncionarioNome(reg.funcionario_id, reg.user_id_relogio)}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">{reg.metodo || "-"}</TableCell>
                        <TableCell className="text-center">
                          {reg.valido ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 mx-auto" title={reg.motivo_invalido || "Inválido"} />
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

      {/* Modal: Mapear Funcionários */}
      <MapearFuncionariosModal
        isOpen={showMapearModal}
        onClose={() => setShowMapearModal(false)}
        onMapeamentoFeito={carregar}
      />
    </div>
  );
}