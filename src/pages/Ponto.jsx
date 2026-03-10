import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { parseZKTecoFile, calcularApuracaoDiaria, formatMinutes } from "@/components/ponto/parseZKTeco";
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2,
  Eye, Clock, ChevronDown, ChevronUp, AlertTriangle, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { format, getDaysInMonth, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import PontoOcorrenciaModal from "@/components/ponto/PontoOcorrenciaModal";

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_STYLE = {
  ok: 'bg-green-100 text-green-700',
  incompleto: 'bg-yellow-100 text-yellow-700',
  divergente: 'bg-orange-100 text-orange-700',
  falta: 'bg-red-100 text-red-700',
  ajustado: 'bg-blue-100 text-blue-700',
};

export default function Ponto() {
  const [tab, setTab] = useState('registros');

  // Importação
  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [parsed, setParsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef();

  // Dados
  const [funcionarios, setFuncionarios] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funEscalas, setFunEscalas] = useState([]);
  const [importacoes, setImportacoes] = useState([]);

  // Visualização
  const [selectedFunc, setSelectedFunc] = useState('todos');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [apuracoes, setApuracoes] = useState([]);
  const [registrosPonto, setRegistrosPonto] = useState([]);
  const [loadingReg, setLoadingReg] = useState(false);

  // Ocorrência modal
  const [ocorrenciaModal, setOcorrenciaModal] = useState(null);

  const loadBase = useCallback(async () => {
    const [funcs, esc, funEsc, imps] = await Promise.all([
      base44.entities.Funcionario.list(),
      base44.entities.EscalaTrabalho.list(),
      base44.entities.FuncionarioEscala.list(),
      base44.entities.ImportacaoPonto.list('-data_importacao', 30),
    ]);
    setFuncionarios(funcs);
    setEscalas(esc);
    setFunEscalas(funEsc);
    setImportacoes(imps);
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  const loadRegistros = useCallback(async () => {
    setLoadingReg(true);
    const [y, m] = selectedMonth.split('-');
    const start = `${y}-${m}-01`;
    const daysCount = getDaysInMonth(new Date(+y, +m - 1));
    const end = `${y}-${m}-${String(daysCount).padStart(2, '0')}`;

    const [apurs, regs] = await Promise.all([
      base44.entities.ApuracaoDiariaPonto.list(),
      base44.entities.PontoRegistro.list(),
    ]);

    const apursFiltradas = apurs.filter(a => a.data >= start && a.data <= end);
    const regsFiltrados = regs.filter(r => r.data >= start && r.data <= end);

    setApuracoes(apursFiltradas);
    setRegistrosPonto(regsFiltrados);
    setLoadingReg(false);
  }, [selectedMonth]);

  useEffect(() => { loadRegistros(); }, [loadRegistros]);

  // ─── Parser de arquivo ───────────────────────────────
  const processFile = (f) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const recs = parseZKTecoFile(ev.target.result);
      setRecords(recs);
      setParsed(true);
      const empMap = {};
      let minDate = null, maxDate = null;
      for (const r of recs) {
        if (!empMap[r.enNo]) empMap[r.enNo] = r.name;
        if (!minDate || r.data < minDate) minDate = r.data;
        if (!maxDate || r.data > maxDate) maxDate = r.data;
      }
      setStats({ total: recs.length, employees: Object.keys(empMap).length, minDate, maxDate, empMap });
    };
    reader.readAsArrayBuffer(f);
  };

  const handleFileChange = (e) => { const f = e.target.files?.[0]; if (f) processFile(f); };
  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const getEscala = (funcId, data) => {
    const fe = funEscalas.find(fe =>
      fe.funcionario_id === funcId &&
      fe.vigencia_inicio <= data &&
      (!fe.vigencia_fim || fe.vigencia_fim >= data)
    );
    if (fe) return escalas.find(e => e.id === fe.escala_id);
    return escalas.find(e => e.escala_padrao);
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    const importacao = await base44.entities.ImportacaoPonto.create({
      data_importacao: new Date().toISOString(),
      arquivo_nome: file.name,
      periodo_inicio: stats.minDate,
      periodo_fim: stats.maxDate,
      total_linhas: records.length,
      total_registros_validos: records.length,
      status: 'processando',
    });

    const enNoToFunc = {};
    for (const func of funcionarios) {
      if (func.user_id_relogio) enNoToFunc[func.user_id_relogio] = func;
    }

    const registros = records.map(r => ({
      funcionario_id: enNoToFunc[r.enNo]?.id || null,
      user_id_relogio: r.enNo,
      nome_arquivo: r.name,
      data: r.data,
      hora: r.hora,
      data_hora: `${r.data}T${r.hora}`,
      origem: 'relogio',
      metodo: r.inOut,
      importacao_id: importacao.id,
      raw_linha: r.rawLine,
      valido: true,
    }));

    await base44.entities.PontoRegistro.bulkCreate(registros);

    const byEmpDay = {};
    for (const r of records) {
      const func = enNoToFunc[r.enNo];
      if (!func) continue;
      const key = `${func.id}_${r.data}`;
      if (!byEmpDay[key]) byEmpDay[key] = { funcionario_id: func.id, data: r.data, batidas: [] };
      byEmpDay[key].batidas.push(r);
    }

    const apuracoes = Object.values(byEmpDay).map(({ funcionario_id, data, batidas }) => {
      const escala = getEscala(funcionario_id, data);
      const carga = escala?.carga_diaria_minutos || 480;
      const tolerancia = escala?.tolerancia_minutos || 5;
      const apuracao = calcularApuracaoDiaria(batidas, carga, tolerancia);
      return { funcionario_id, data, ...apuracao, gerado_em: new Date().toISOString() };
    });

    if (apuracoes.length > 0) await base44.entities.ApuracaoDiariaPonto.bulkCreate(apuracoes);
    await base44.entities.ImportacaoPonto.update(importacao.id, { status: 'concluida' });

    await Promise.all([loadBase(), loadRegistros()]);
    cancelar();
    setIsSaving(false);
    setTab('registros');
  };

  const cancelar = () => {
    setParsed(false); setRecords([]); setStats(null); setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ─── Montar linhas da tabela ─────────────────────────
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysCount = getDaysInMonth(new Date(year, month - 1));

  const funcsFiltradas = selectedFunc === 'todos'
    ? funcionarios.filter(f => f.status !== 'demitido')
    : funcionarios.filter(f => f.id === selectedFunc);

  const getBatidasDoDia = (funcId, dateStr) =>
    registrosPonto
      .filter(r => r.funcionario_id === funcId && r.data === dateStr)
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
      .slice(0, 4);

  const getApuracao = (funcId, dateStr) =>
    apuracoes.find(a => a.funcionario_id === funcId && a.data === dateStr);

  // Resumo de ocorrências do mês/func selecionado
  const totalOcorrencias = apuracoes.filter(a =>
    (selectedFunc === 'todos' || a.funcionario_id === selectedFunc) &&
    a.status !== 'ok'
  ).length;

  const months = Array.from({ length: 13 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return format(d, 'yyyy-MM');
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Controle de Ponto</h1>
          <p className="text-slate-500 text-sm mt-1">Visualize registros, trate ocorrências e importe arquivos do relógio</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={createPageUrl('EspelhoPonto')}>
            <Button variant="outline" className="w-full md:w-auto">
              <Eye className="w-4 h-4 mr-2" /> Espelho de Ponto
            </Button>
          </Link>
          <Button onClick={() => setTab('importar')} className="bg-slate-800 hover:bg-slate-900 w-full md:w-auto">
            <Upload className="w-4 h-4 mr-2" /> Importar Arquivo
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        {[
          { key: 'registros', label: 'Registros & Ocorrências' },
          { key: 'importar', label: 'Importar Arquivo' },
          { key: 'historico', label: 'Histórico de Importações' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {t.key === 'registros' && totalOcorrencias > 0 && (
              <span className="ml-2 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {totalOcorrencias}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab: Registros ───────────────────────────────── */}
      {tab === 'registros' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedFunc} onValueChange={setSelectedFunc}>
                <SelectTrigger className="sm:w-72">
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os funcionários</SelectItem>
                  {funcionarios.filter(f => f.status !== 'demitido').map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m} value={m}>
                      {format(new Date(m + '-01'), 'MMMM yyyy', { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingReg && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</div>}
            </div>
          </div>

          {/* Tabela de registros */}
          {funcsFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
              Nenhum funcionário encontrado
            </div>
          ) : (
            funcsFiltradas.map(func => {
              const dias = Array.from({ length: daysCount }, (_, i) => {
                const d = String(i + 1).padStart(2, '0');
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${d}`;
                const dow = getDay(new Date(year, month - 1, i + 1));
                const batidas = getBatidasDoDia(func.id, dateStr);
                const apuracao = getApuracao(func.id, dateStr);
                return { dateStr, day: i + 1, dow, batidas, apuracao };
              });

              const totalTrab = dias.reduce((s, d) => s + (d.apuracao?.total_trabalhado_min || 0), 0);
              const totalFalt = dias.reduce((s, d) => s + (d.apuracao?.falta_min || 0), 0);
              const totalExtra = dias.reduce((s, d) => s + (d.apuracao?.hora_extra_min || 0), 0);
              const qtdOcorr = dias.filter(d => d.apuracao && d.apuracao.status !== 'ok').length;

              return (
                <div key={func.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Cabeçalho do funcionário */}
                  <div className="bg-slate-800 text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-base">{func.nome}</span>
                      {qtdOcorr > 0 && (
                        <Badge className="bg-orange-400 text-white text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />{qtdOcorr} ocorrência{qtdOcorr > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs text-slate-300">
                      <span>Trabalhado: <strong className="text-white font-mono">{formatMinutes(totalTrab)}</strong></span>
                      <span>Faltas: <strong className="text-red-300 font-mono">{formatMinutes(totalFalt)}</strong></span>
                      <span>Extras: <strong className="text-blue-300 font-mono">{formatMinutes(totalExtra)}</strong></span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                          <th className="px-3 py-2.5 text-left w-20">Data</th>
                          <th className="px-3 py-2.5 text-left w-10">Dia</th>
                          <th className="px-3 py-2.5 text-center">Batida 1</th>
                          <th className="px-3 py-2.5 text-center">Batida 2</th>
                          <th className="px-3 py-2.5 text-center">Batida 3</th>
                          <th className="px-3 py-2.5 text-center">Batida 4</th>
                          <th className="px-3 py-2.5 text-center">Total</th>
                          <th className="px-3 py-2.5 text-center">Status</th>
                          <th className="px-3 py-2.5 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dias.map(({ dateStr, day, dow, batidas, apuracao }) => {
                          const isWeekend = dow === 0 || dow === 6;
                          const hasOcorrencia = apuracao && apuracao.status !== 'ok';
                          return (
                            <tr
                              key={dateStr}
                              className={`border-b border-slate-100 last:border-0 ${
                                hasOcorrencia ? 'bg-orange-50' :
                                isWeekend ? 'bg-blue-50/30' : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <td className="px-3 py-2 font-mono text-slate-600">
                                {String(day).padStart(2, '0')}/{String(month).padStart(2, '0')}
                              </td>
                              <td className={`px-3 py-2 font-medium ${isWeekend ? 'text-blue-600' : 'text-slate-500'}`}>
                                {DIAS_SEMANA[dow]}
                              </td>
                              {[0, 1, 2, 3].map(i => (
                                <td key={i} className={`px-3 py-2 text-center font-mono font-semibold ${batidas[i] ? 'text-slate-800' : 'text-slate-300'}`}>
                                  {batidas[i] ? batidas[i].hora?.substring(0, 5) : (isWeekend ? '—' : '')}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">
                                {apuracao ? formatMinutes(apuracao.total_trabalhado_min) : ''}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {apuracao ? (
                                  <Badge className={`text-xs ${STATUS_STYLE[apuracao.status] || 'bg-slate-100 text-slate-600'}`}>
                                    {apuracao.status}
                                  </Badge>
                                ) : isWeekend ? (
                                  <span className="text-slate-300 text-xs">—</span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {(apuracao || batidas.length > 0) && (
                                  <button
                                    onClick={() => setOcorrenciaModal({ apuracao, batidas, func, dateStr })}
                                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Tratar ocorrência"
                                  >
                                    <Settings2 className={`w-4 h-4 ${hasOcorrencia ? 'text-orange-500' : 'text-slate-400'}`} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Tab: Importar ────────────────────────────────── */}
      {tab === 'importar' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          {!parsed ? (
            <label
              className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-slate-500 hover:bg-slate-50 transition-colors block"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <FileText className="w-14 h-14 text-slate-400" />
              <div className="text-center">
                <p className="font-semibold text-slate-700 text-base">Arraste o arquivo ou clique para selecionar</p>
                <p className="text-sm text-slate-500 mt-1">Arquivo TXT exportado do relógio ZKTeco (AttendLog, UTF-16)</p>
              </div>
              <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Arquivo', value: file?.name, truncate: true },
                  { label: 'Total de batidas', value: stats?.total },
                  { label: 'Período', value: `${stats?.minDate} → ${stats?.maxDate}`, small: true },
                  { label: 'Funcionários', value: `${stats?.employees} no arquivo` },
                ].map(c => (
                  <div key={c.label} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">{c.label}</p>
                    <p className={`font-semibold text-slate-800 ${c.truncate ? 'truncate' : ''} ${c.small ? 'text-xs mt-1' : 'text-sm mt-0.5'}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Mapeamento */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Mapeamento de Funcionários</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {Object.entries(stats?.empMap || {}).map(([enNo, name]) => {
                    const mapped = funcionarios.find(f => f.user_id_relogio === enNo);
                    return (
                      <div key={enNo} className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${mapped ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        {mapped ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                        <span className="font-mono font-semibold text-slate-700">{enNo}</span>
                        <span className="text-slate-600 truncate">{mapped?.nome || name || 'Sem nome'}</span>
                        {!mapped && <Badge variant="outline" className="text-xs ml-auto flex-shrink-0 border-yellow-400 text-yellow-700">Não mapeado</Badge>}
                      </div>
                    );
                  })}
                </div>
                {Object.keys(stats?.empMap || {}).some(enNo => !funcionarios.find(f => f.user_id_relogio === enNo)) && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
                    ⚠️ Funcionários não mapeados não terão apuração calculada. Configure o campo <strong>"ID do Relógio"</strong> no cadastro do funcionário.
                  </p>
                )}
              </div>

              {/* Prévia */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Prévia — {records.length} registros</h3>
                <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-56">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white sticky top-0">
                        <th className="px-3 py-2 text-left">ID Relógio</th>
                        <th className="px-3 py-2 text-left">Nome</th>
                        <th className="px-3 py-2 text-left">Data</th>
                        <th className="px-3 py-2 text-left">Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.slice(0, 80).map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-1.5 font-mono font-semibold">{r.enNo}</td>
                          <td className="px-3 py-1.5">{r.name || '-'}</td>
                          <td className="px-3 py-1.5 font-mono">{r.data}</td>
                          <td className="px-3 py-1.5 font-mono">{r.hora}</td>
                        </tr>
                      ))}
                      {records.length > 80 && (
                        <tr><td colSpan={4} className="px-3 py-2 text-center text-slate-500 italic">... e mais {records.length - 80} registros</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button onClick={handleConfirm} disabled={isSaving} className="bg-slate-800 hover:bg-slate-900 flex-1 sm:flex-none">
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><CheckCircle className="w-4 h-4 mr-2" />Confirmar Importação</>}
                </Button>
                <Button variant="outline" onClick={cancelar} disabled={isSaving}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Histórico ───────────────────────────────── */}
      {tab === 'historico' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {importacoes.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Nenhuma importação realizada ainda</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs">
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Período</th>
                    <th className="px-4 py-3 text-center">Registros</th>
                    <th className="px-4 py-3 text-left">Data Importação</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importacoes.map((imp, i) => (
                    <tr key={imp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 font-medium">{imp.arquivo_nome || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{imp.periodo_inicio} → {imp.periodo_fim}</td>
                      <td className="px-4 py-3 text-center">{imp.total_registros_validos}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {imp.data_importacao ? format(new Date(imp.data_importacao), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={imp.status === 'concluida' ? 'bg-green-100 text-green-700' : imp.status === 'erro' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                          {imp.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal ocorrência */}
      {ocorrenciaModal && (
        <PontoOcorrenciaModal
          apuracao={ocorrenciaModal.apuracao}
          registros={ocorrenciaModal.batidas}
          funcionarioNome={ocorrenciaModal.func?.nome}
          onClose={() => setOcorrenciaModal(null)}
          onSaved={() => { loadRegistros(); setOcorrenciaModal(null); }}
        />
      )}
    </div>
  );
}