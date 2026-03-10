import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { parseZKTecoFile, calcularApuracaoDiaria, formatMinutes } from "@/components/ponto/parseZKTeco";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { format, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import PontoAcaoModal from "@/components/ponto/PontoAcaoModal";

const STATUS_META = {
  ok:         { label: 'OK',         cls: 'bg-green-100 text-green-700' },
  incompleto: { label: 'Falta',      cls: 'bg-red-100 text-red-600' },
  divergente: { label: 'Divergente', cls: 'bg-orange-100 text-orange-700' },
  falta:      { label: 'Falta',      cls: 'bg-red-100 text-red-600' },
  ajustado:   { label: 'Ajustado',   cls: 'bg-blue-100 text-blue-700' },
  abonado:    { label: 'Abonado',    cls: 'bg-purple-100 text-purple-700' },
  folga:      { label: 'Folga',      cls: 'bg-indigo-100 text-indigo-700' },
  desconto:   { label: 'Desconto',   cls: 'bg-rose-100 text-rose-700' },
};

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
  const [selectedFunc, setSelectedFunc] = useState('todos');
  const [searchName, setSearchName] = useState('');
  const [apuracoes, setApuracoes] = useState([]);
  const [registrosPonto, setRegistrosPonto] = useState([]);
  const [loadingReg, setLoadingReg] = useState(false);

  // Modal
  const [acaoModal, setAcaoModal] = useState(null);

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

  // ─── Importação ──────────────────────────────────────
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

  // ─── Montar linhas da tabela flat ────────────────────
  const rows = useMemo(() => {
    const result = [];
    const funcMap = {};
    funcionarios.forEach(f => { funcMap[f.id] = f; });

    // Agrupar apurações por funcionário/data
    const apMap = {};
    apuracoes.forEach(a => { apMap[`${a.funcionario_id}_${a.data}`] = a; });

    // Agrupar registros por funcionário/data → batidas
    const regMap = {};
    registrosPonto.forEach(r => {
      const k = `${r.funcionario_id}_${r.data}`;
      if (!regMap[k]) regMap[k] = [];
      regMap[k].push(r);
    });

    // Gerar linhas: para cada funcionário, cada dia com apuração ou batida
    const keys = new Set([
      ...apuracoes.map(a => `${a.funcionario_id}_${a.data}`),
      ...registrosPonto.filter(r => r.funcionario_id).map(r => `${r.funcionario_id}_${r.data}`),
    ]);

    keys.forEach(k => {
      const [funcId, data] = k.split('_');
      const func = funcMap[funcId];
      if (!func) return;
      // Filtro por funcionário
      if (selectedFunc !== 'todos' && funcId !== selectedFunc) return;
      // Filtro por nome
      if (searchName && !func.nome.toLowerCase().includes(searchName.toLowerCase())) return;

      const apuracao = apMap[k];
      const batidas = (regMap[k] || []).sort((a, b) => (a.hora || '').localeCompare(b.hora || '')).slice(0, 4);

      const saldo = (apuracao?.hora_extra_min || 0) - (apuracao?.falta_min || 0);

      result.push({ funcId, funcNome: func.nome, data, apuracao, batidas, saldo });
    });

    // Ordenar: data desc, depois nome
    result.sort((a, b) => {
      if (b.data !== a.data) return b.data.localeCompare(a.data);
      return a.funcNome.localeCompare(b.funcNome);
    });

    return result;
  }, [apuracoes, registrosPonto, funcionarios, selectedFunc, searchName]);

  const months = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    return format(d, 'yyyy-MM');
  });

  const formatData = (dateStr) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Controle de Ponto</h1>
          <p className="text-slate-500 text-sm mt-0.5">Registro de batidas e ocorrências por funcionário</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('EspelhoPonto'))}
          >
            Espelho de Ponto
          </Button>
          <Button
            className="bg-slate-800 hover:bg-slate-900"
            onClick={() => setTab(tab === 'importar' ? 'registros' : 'importar')}
          >
            <Upload className="w-4 h-4 mr-2" />
            {tab === 'importar' ? 'Ver Registros' : 'Importar Arquivo'}
          </Button>
        </div>
      </div>

      {/* ─── Importar ─────────────────────────────────── */}
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
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Mapeamento de funcionários</h3>
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
              <div className="flex gap-3">
                <Button onClick={handleConfirm} disabled={isSaving} className="bg-slate-800 hover:bg-slate-900 flex-1 sm:flex-none">
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><CheckCircle className="w-4 h-4 mr-2" />Confirmar Importação</>}
                </Button>
                <Button variant="outline" onClick={cancelar} disabled={isSaving}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Registros: tabela flat ───────────────────── */}
      {tab === 'registros' && (
        <div className="space-y-3">
          {/* Filtros */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-col sm:flex-row gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="sm:w-48">
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
            <Select value={selectedFunc} onValueChange={setSelectedFunc}>
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Todos os funcionários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os funcionários</SelectItem>
                {funcionarios.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar por nome..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="sm:w-56"
            />
            {loadingReg && <span className="flex items-center gap-1.5 text-sm text-slate-500 px-1"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</span>}
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs font-semibold">
                    <th className="px-4 py-3 text-left">Funcionário</th>
                    <th className="px-4 py-3 text-center">Data</th>
                    <th className="px-4 py-3 text-center">1ª Ent.</th>
                    <th className="px-4 py-3 text-center">1ª Saí.</th>
                    <th className="px-4 py-3 text-center">2ª Ent.</th>
                    <th className="px-4 py-3 text-center">2ª Saí.</th>
                    <th className="px-4 py-3 text-center">Situação</th>
                    <th className="px-4 py-3 text-center">Saldo</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400 text-sm">
                        {loadingReg ? 'Carregando registros...' : 'Nenhum registro encontrado para o período selecionado.'}
                      </td>
                    </tr>
                  ) : (
                    rows.map(({ funcId, funcNome, data, apuracao, batidas, saldo }, idx) => {
                      const b1 = batidas[0]?.hora?.substring(0, 5);
                      const b2 = batidas[1]?.hora?.substring(0, 5);
                      const b3 = batidas[2]?.hora?.substring(0, 5);
                      const b4 = batidas[3]?.hora?.substring(0, 5);
                      const status = apuracao?.status;
                      const meta = STATUS_META[status];
                      const func = funcionarios.find(f => f.id === funcId);

                      return (
                        <tr
                          key={`${funcId}_${data}`}
                          className={`border-b border-slate-100 last:border-0 text-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition-colors`}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                            {funcNome}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-slate-600 whitespace-nowrap">
                            {formatData(data)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-slate-800">
                            {b1 || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-slate-800">
                            {b2 || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-slate-800">
                            {b3 || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-slate-800">
                            {b4 || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {meta ? (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${meta.cls}`}>
                                {meta.label}
                              </span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className={`px-4 py-3 text-center font-mono font-bold text-sm ${saldo > 0 ? 'text-green-600' : saldo < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            {apuracao ? `${saldo >= 0 ? '' : ''}${formatMinutes(saldo)}` : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setAcaoModal({ apuracao, func, batidas, dateStr: data })}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Ver / Tratar"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {rows.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400 bg-slate-50">
                {rows.length} registro{rows.length !== 1 ? 's' : ''} exibido{rows.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Histórico de importações */}
          {importacoes.length > 0 && (
            <details className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <summary className="px-4 py-3 font-semibold text-slate-700 cursor-pointer flex items-center gap-2 text-sm select-none">
                <Clock className="w-4 h-4 text-slate-400" /> Histórico de Importações ({importacoes.length})
              </summary>
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="px-4 py-2.5 text-left">Arquivo</th>
                      <th className="px-4 py-2.5 text-left">Período</th>
                      <th className="px-4 py-2.5 text-center">Registros</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importacoes.map((imp, i) => (
                      <tr key={imp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-2">{imp.arquivo_nome || '-'}</td>
                        <td className="px-4 py-2 font-mono text-slate-600">{imp.periodo_inicio} → {imp.periodo_fim}</td>
                        <td className="px-4 py-2 text-center">{imp.total_registros_validos}</td>
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
        </div>
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