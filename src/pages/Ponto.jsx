import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { parseZKTecoFile, calcularApuracaoDiaria, formatMinutes } from "@/components/ponto/parseZKTeco";
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2,
  Eye, Clock, AlertTriangle, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from "react-router-dom";
import { format, getDaysInMonth, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import PontoAcaoModal from "@/components/ponto/PontoAcaoModal";

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_META = {
  ok:         { label: 'OK',        cls: 'bg-green-100 text-green-700' },
  incompleto: { label: 'Incompleto',cls: 'bg-yellow-100 text-yellow-700' },
  divergente: { label: 'Divergente',cls: 'bg-orange-100 text-orange-700' },
  falta:      { label: 'Falta',     cls: 'bg-red-100 text-red-700' },
  ajustado:   { label: 'Ajustado', cls: 'bg-blue-100 text-blue-700' },
  abonado:    { label: 'Abonado',   cls: 'bg-purple-100 text-purple-700' },
  folga:      { label: 'Folga',     cls: 'bg-indigo-100 text-indigo-700' },
  desconto:   { label: 'Desconto',  cls: 'bg-rose-100 text-rose-700' },
};

// Detecta qual batida está faltando para exibir no campo vazio
function detectarBatidaFaltante(batidas, isWeekend) {
  if (isWeekend) return null;
  if (batidas.length === 0) return 'Sem registro';
  if (batidas.length === 1) return 'Saída 1 ausente';
  if (batidas.length === 2) return null; // ok - entrada/saída básica
  if (batidas.length === 3) return 'Saída 2 ausente';
  return null;
}

export default function Ponto() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('registros');

  // Importação
  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [parsed, setParsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef();

  // Dados base
  const [funcionarios, setFuncionarios] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funEscalas, setFunEscalas] = useState([]);
  const [importacoes, setImportacoes] = useState([]);

  // Visualização
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [apuracoes, setApuracoes] = useState([]);
  const [registrosPonto, setRegistrosPonto] = useState([]);
  const [loadingReg, setLoadingReg] = useState(false);

  // Expansão por funcionário
  const [expandidos, setExpandidos] = useState({});

  // Modal de ação
  const [acaoModal, setAcaoModal] = useState(null); // { apuracao, func, batidas, dateStr }

  const loadBase = useCallback(async () => {
    const [funcs, esc, funEsc, imps] = await Promise.all([
      base44.entities.Funcionario.list(),
      base44.entities.EscalaTrabalho.list(),
      base44.entities.FuncionarioEscala.list(),
      base44.entities.ImportacaoPonto.list('-data_importacao', 30),
    ]);
    setFuncionarios(funcs.filter(f => f.status !== 'demitido'));
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
    setApuracoes(apurs.filter(a => a.data >= start && a.data <= end));
    setRegistrosPonto(regs.filter(r => r.data >= start && r.data <= end));
    setLoadingReg(false);
  }, [selectedMonth]);

  useEffect(() => { loadRegistros(); }, [loadRegistros]);

  // ─── Importação ─────────────────────────────────────
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
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); };

  const getEscala = (funcId, data) => {
    const fe = funEscalas.find(fe =>
      fe.funcionario_id === funcId && fe.vigencia_inicio <= data &&
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
    await base44.entities.PontoRegistro.bulkCreate(records.map(r => ({
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
    })));
    const byEmpDay = {};
    for (const r of records) {
      const func = enNoToFunc[r.enNo];
      if (!func) continue;
      const key = `${func.id}_${r.data}`;
      if (!byEmpDay[key]) byEmpDay[key] = { funcionario_id: func.id, data: r.data, batidas: [] };
      byEmpDay[key].batidas.push(r);
    }
    const apuracoesList = Object.values(byEmpDay).map(({ funcionario_id, data, batidas }) => {
      const escala = getEscala(funcionario_id, data);
      const carga = escala?.carga_diaria_minutos || 480;
      const tolerancia = escala?.tolerancia_minutos || 5;
      const ap = calcularApuracaoDiaria(batidas, carga, tolerancia);
      return { funcionario_id, data, ...ap, gerado_em: new Date().toISOString() };
    });
    if (apuracoesList.length > 0) await base44.entities.ApuracaoDiariaPonto.bulkCreate(apuracoesList);
    await base44.entities.ImportacaoPonto.update(importacao.id, { status: 'concluida' });
    await Promise.all([loadBase(), loadRegistros()]);
    setParsed(false); setRecords([]); setStats(null); setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setIsSaving(false);
    setTab('registros');
  };

  const cancelar = () => {
    setParsed(false); setRecords([]); setStats(null); setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ─── Dados da tabela ────────────────────────────────
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysCount = getDaysInMonth(new Date(year, month - 1));

  const getBatidasDoDia = (funcId, dateStr) =>
    registrosPonto
      .filter(r => r.funcionario_id === funcId && r.data === dateStr)
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
      .slice(0, 4);

  const getApuracao = (funcId, dateStr) =>
    apuracoes.find(a => a.funcionario_id === funcId && a.data === dateStr);

  const calcResumoFunc = (funcId) => {
    const apuracoesFuncionario = apuracoes.filter(a => a.funcionario_id === funcId);
    const totalTrab = apuracoesFuncionario.reduce((s, a) => s + (a.total_trabalhado_min || 0), 0);
    const totalFalt = apuracoesFuncionario.reduce((s, a) => s + (a.falta_min || 0), 0);
    const totalExtra = apuracoesFuncionario.reduce((s, a) => s + (a.hora_extra_min || 0), 0);
    const saldo = totalExtra - totalFalt;
    const ocorrencias = apuracoesFuncionario.filter(a => !['ok', 'ajustado', 'abonado', 'folga'].includes(a.status)).length;
    return { totalTrab, totalFalt, totalExtra, saldo, ocorrencias };
  };

  const months = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    return format(d, 'yyyy-MM');
  });

  const toggleExpandir = (funcId) =>
    setExpandidos(prev => ({ ...prev, [funcId]: !prev[funcId] }));

  const irParaEspelho = (funcId) => {
    navigate(`${createPageUrl('EspelhoPonto')}?func=${funcId}&mes=${selectedMonth}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Controle de Ponto</h1>
          <p className="text-slate-500 text-sm mt-1">Acompanhe saldos, ocorrências e trate ausências de todos os funcionários</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setTab(tab === 'importar' ? 'registros' : 'importar')}
            variant={tab === 'importar' ? 'default' : 'outline'}
            className={tab === 'importar' ? 'bg-slate-800 hover:bg-slate-900' : ''}>
            <Upload className="w-4 h-4 mr-2" />
            {tab === 'importar' ? 'Ver Registros' : 'Importar Arquivo'}
          </Button>
        </div>
      </div>

      {/* ─── Tab Importar ────────────────────────────── */}
      {tab === 'importar' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          {!parsed ? (
            <label
              className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-slate-500 hover:bg-slate-50 transition-colors block"
              onDragOver={e => e.preventDefault()} onDrop={handleDrop}
            >
              <FileText className="w-14 h-14 text-slate-400" />
              <div className="text-center">
                <p className="font-semibold text-slate-700 text-base">Arraste o arquivo ou clique para selecionar</p>
                <p className="text-sm text-slate-500 mt-1">Arquivo TXT exportado do relógio ZKTeco (AttendLog)</p>
              </div>
              <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="space-y-4">
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
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Mapeamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {Object.entries(stats?.empMap || {}).map(([enNo, name]) => {
                    const mapped = funcionarios.find(f => f.user_id_relogio === enNo);
                    return (
                      <div key={enNo} className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${mapped ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        {mapped ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                        <span className="font-mono font-semibold">{enNo}</span>
                        <span className="truncate">{mapped?.nome || name || 'Sem nome'}</span>
                        {!mapped && <Badge variant="outline" className="ml-auto text-xs border-yellow-400 text-yellow-700">Não mapeado</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button onClick={handleConfirm} disabled={isSaving} className="bg-slate-800 hover:bg-slate-900 flex-1 sm:flex-none">
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><CheckCircle className="w-4 h-4 mr-2" />Confirmar Importação</>}
                </Button>
                <Button variant="outline" onClick={cancelar} disabled={isSaving}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab Registros ───────────────────────────── */}
      {tab === 'registros' && (
        <div className="space-y-4">
          {/* Filtro de mês */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="sm:w-56">
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
            {loadingReg && <span className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</span>}
          </div>

          {/* Tabela principal — um card por funcionário */}
          {funcionarios.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-slate-500">Nenhum funcionário ativo encontrado.</div>
          ) : (
            funcionarios.map(func => {
              const resumo = calcResumoFunc(func.id);
              const expanded = !!expandidos[func.id];

              // Linhas do mês
              const dias = Array.from({ length: daysCount }, (_, i) => {
                const d = String(i + 1).padStart(2, '0');
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${d}`;
                const dow = getDay(new Date(year, month - 1, i + 1));
                const batidas = getBatidasDoDia(func.id, dateStr);
                const apuracao = getApuracao(func.id, dateStr);
                const faltante = detectarBatidaFaltante(batidas, dow === 0 || dow === 6);
                return { dateStr, day: i + 1, dow, batidas, apuracao, faltante };
              });

              return (
                <div key={func.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Header do funcionário */}
                  <div
                    className="bg-slate-800 text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
                    onClick={() => toggleExpandir(func.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-bold text-base truncate">{func.nome}</span>
                      {resumo.ocorrencias > 0 && (
                        <Badge className="bg-orange-400 text-white text-xs flex-shrink-0">
                          <AlertTriangle className="w-3 h-3 mr-1" />{resumo.ocorrencias}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex gap-3 text-slate-300">
                        <span>Trabalhado: <strong className="text-white font-mono">{formatMinutes(resumo.totalTrab)}</strong></span>
                        <span>Faltas: <strong className="text-red-300 font-mono">{formatMinutes(resumo.totalFalt)}</strong></span>
                        <span>Extras: <strong className="text-blue-300 font-mono">{formatMinutes(resumo.totalExtra)}</strong></span>
                        <span className={`font-bold font-mono ${resumo.saldo >= 0 ? 'text-green-300' : 'text-red-400'}`}>
                          Saldo: {resumo.saldo >= 0 ? '+' : ''}{formatMinutes(resumo.saldo)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); irParaEspelho(func.id); }}
                          className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
                          title="Ver espelho de ponto"
                        >
                          <Eye className="w-3 h-3" /> Espelho
                        </button>
                        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Tabela detalhada (expansível) */}
                  {expanded && (
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
                            <th className="px-3 py-2.5 text-center">Saldo</th>
                            <th className="px-3 py-2.5 text-center">Status</th>
                            <th className="px-3 py-2.5 text-center">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dias.map(({ dateStr, day, dow, batidas, apuracao, faltante }) => {
                            const isWeekend = dow === 0 || dow === 6;
                            const hasProblema = apuracao && !['ok', 'ajustado', 'abonado', 'folga'].includes(apuracao.status);
                            const saldoDia = (apuracao?.hora_extra_min || 0) - (apuracao?.falta_min || 0);
                            return (
                              <tr key={dateStr} className={`border-b border-slate-100 last:border-0 ${hasProblema ? 'bg-orange-50' : isWeekend ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
                                <td className="px-3 py-2 font-mono text-slate-600">
                                  {String(day).padStart(2, '0')}/{String(month).padStart(2, '0')}
                                </td>
                                <td className={`px-3 py-2 font-medium ${isWeekend ? 'text-blue-600' : 'text-slate-500'}`}>
                                  {DIAS_SEMANA[dow]}
                                </td>

                                {/* Batidas 1-4 com indicação de faltante */}
                                {[0, 1, 2, 3].map(i => {
                                  const b = batidas[i];
                                  const nomesBatidas = ['Entrada 1', 'Saída 1', 'Entrada 2', 'Saída 2'];
                                  // Mostrar aviso de batida faltante na próxima célula vazia esperada
                                  const showFaltante = !b && !isWeekend && i === batidas.length && faltante;
                                  return (
                                    <td key={i} className="px-2 py-2 text-center">
                                      {b ? (
                                        <span className="font-mono font-semibold text-slate-800">{b.hora?.substring(0, 5)}</span>
                                      ) : showFaltante ? (
                                        <span className="text-[10px] text-orange-600 bg-orange-100 px-1 py-0.5 rounded font-medium whitespace-nowrap">
                                          {nomesBatidas[i]} ausente
                                        </span>
                                      ) : (
                                        <span className="text-slate-200">{isWeekend ? '—' : ''}</span>
                                      )}
                                    </td>
                                  );
                                })}

                                <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">
                                  {apuracao ? formatMinutes(apuracao.total_trabalhado_min) : ''}
                                </td>
                                <td className={`px-3 py-2 text-center font-mono font-bold ${saldoDia > 0 ? 'text-green-600' : saldoDia < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                  {apuracao ? `${saldoDia >= 0 ? '+' : ''}${formatMinutes(saldoDia)}` : ''}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {apuracao ? (
                                    <Badge className={`text-xs ${STATUS_META[apuracao.status]?.cls || 'bg-slate-100 text-slate-600'}`}>
                                      {STATUS_META[apuracao.status]?.label || apuracao.status}
                                    </Badge>
                                  ) : isWeekend ? (
                                    <span className="text-slate-300 text-xs">—</span>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {(apuracao || (!isWeekend && batidas.length > 0)) && (
                                    <button
                                      onClick={() => setAcaoModal({ apuracao, func, batidas, dateStr })}
                                      className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
                                    >
                                      Tratar
                                    </button>
                                  )}
                                  {!apuracao && !isWeekend && batidas.length === 0 && (
                                    <button
                                      onClick={() => setAcaoModal({ apuracao: null, func, batidas: [], dateStr })}
                                      className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md font-medium transition-colors"
                                    >
                                      Tratar
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Totais */}
                        <tfoot>
                          <tr className="bg-slate-800 text-white font-bold text-xs">
                            <td colSpan={6} className="px-3 py-2.5 text-slate-300">
                              Totais — {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono">{formatMinutes(resumo.totalTrab)}</td>
                            <td className={`px-3 py-2.5 text-center font-mono ${resumo.saldo >= 0 ? 'text-green-300' : 'text-red-400'}`}>
                              {resumo.saldo >= 0 ? '+' : ''}{formatMinutes(resumo.saldo)}
                            </td>
                            <td colSpan={2} className="px-3 py-2.5" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Histórico de importações (accordion simples no rodapé) */}
      {tab === 'registros' && importacoes.length > 0 && (
        <details className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <summary className="px-4 py-3 font-semibold text-slate-700 cursor-pointer flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-500" /> Histórico de Importações ({importacoes.length})
          </summary>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-4 py-2.5 text-left">Arquivo</th>
                  <th className="px-4 py-2.5 text-left">Período</th>
                  <th className="px-4 py-2.5 text-center">Registros</th>
                  <th className="px-4 py-2.5 text-left">Data Importação</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {importacoes.map((imp, i) => (
                  <tr key={imp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-2">{imp.arquivo_nome || '-'}</td>
                    <td className="px-4 py-2 font-mono">{imp.periodo_inicio} → {imp.periodo_fim}</td>
                    <td className="px-4 py-2 text-center">{imp.total_registros_validos}</td>
                    <td className="px-4 py-2">{imp.data_importacao ? format(new Date(imp.data_importacao), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}</td>
                    <td className="px-4 py-2 text-center">
                      <Badge className={imp.status === 'concluida' ? 'bg-green-100 text-green-700' : imp.status === 'erro' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                        {imp.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Modal de ação */}
      {acaoModal && (
        <PontoAcaoModal
          apuracao={acaoModal.apuracao}
          func={acaoModal.func}
          batidas={acaoModal.batidas}
          dateStr={acaoModal.dateStr}
          onClose={() => setAcaoModal(null)}
          onSaved={() => { loadRegistros(); setAcaoModal(null); }}
        />
      )}
    </div>
  );
}