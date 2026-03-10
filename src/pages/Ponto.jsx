import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { parseZKTecoFile, calcularApuracaoDiaria } from "@/components/ponto/parseZKTeco";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Eye, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TR_LABELS = { S: 'Entrada', O: 'Saída', A: 'Ret. Intervalo', E: 'Saída Final' };

export default function Ponto() {
  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funEscalas, setFunEscalas] = useState([]);
  const [importacoes, setImportacoes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [stats, setStats] = useState(null);
  const fileRef = useRef();

  const loadData = async () => {
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
  };

  useEffect(() => { loadData(); }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
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

    // Calcular apurações por funcionário/dia
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

    if (apuracoes.length > 0) {
      await base44.entities.ApuracaoDiariaPonto.bulkCreate(apuracoes);
    }

    await base44.entities.ImportacaoPonto.update(importacao.id, { status: 'concluida' });

    await loadData();
    cancelar();
    setIsSaving(false);
  };

  const cancelar = () => {
    setParsed(false);
    setRecords([]);
    setStats(null);
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      if (fileRef.current) {
        // Trigger change manually
        const dt = new DataTransfer();
        dt.items.add(f);
        fileRef.current.files = dt.files;
      }
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
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Controle de Ponto</h1>
          <p className="text-slate-500 text-sm mt-1">Importe o arquivo TXT do relógio ZKTeco para registrar as batidas</p>
        </div>
        <Link to={createPageUrl('EspelhoPonto')}>
          <Button variant="outline" className="w-full md:w-auto">
            <Eye className="w-4 h-4 mr-2" />
            Ver Espelho de Ponto
          </Button>
        </Link>
      </div>

      {/* Import zone */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-base">
          <Upload className="w-5 h-5" /> Importar Arquivo do Relógio
        </h2>

        {!parsed ? (
          <label
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-slate-500 hover:bg-slate-50 transition-colors block"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            <FileText className="w-12 h-12 text-slate-400" />
            <div className="text-center">
              <p className="font-semibold text-slate-700 text-base">Arraste o arquivo ou clique para selecionar</p>
              <p className="text-sm text-slate-500 mt-1">Arquivo TXT exportado do relógio ZKTeco (AttendLog)</p>
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
                { label: 'Funcionários', value: `${stats?.employees} identificados` },
              ].map(c => (
                <div key={c.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className={`font-semibold text-slate-800 ${c.truncate ? 'truncate' : ''} ${c.small ? 'text-xs mt-1' : 'text-sm mt-0.5'}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Employee mapping */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Mapeamento de Funcionários</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {Object.entries(stats?.empMap || {}).map(([enNo, name]) => {
                  const mapped = funcionarios.find(f => f.user_id_relogio === enNo);
                  return (
                    <div key={enNo} className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${mapped ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                      {mapped
                        ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        : <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                      }
                      <span className="font-mono font-semibold text-slate-700">{enNo}</span>
                      <span className="text-slate-600 truncate">{mapped?.nome || name || 'Sem nome'}</span>
                      {!mapped && <Badge variant="outline" className="text-xs ml-auto flex-shrink-0 border-yellow-400 text-yellow-700">Não mapeado</Badge>}
                    </div>
                  );
                })}
              </div>
              {Object.keys(stats?.empMap || {}).some(enNo => !funcionarios.find(f => f.user_id_relogio === enNo)) && (
                <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
                  ⚠️ Funcionários não mapeados não terão apuração calculada. Configure o campo <strong>"ID do Relógio"</strong> no cadastro de cada funcionário.
                </p>
              )}
            </div>

            {/* Preview */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Prévia — {records.length} registros</h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-52">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-3 py-2 text-left">ID Relógio</th>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Hora</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 60).map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-3 py-1.5 font-mono font-semibold">{r.enNo}</td>
                        <td className="px-3 py-1.5">{r.name || '-'}</td>
                        <td className="px-3 py-1.5 font-mono">{r.data}</td>
                        <td className="px-3 py-1.5 font-mono">{r.hora}</td>
                        <td className="px-3 py-1.5">
                          <Badge className={`text-xs ${r.inOut === 'S' || r.inOut === 'A' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {TR_LABELS[r.inOut] || r.inOut}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {records.length > 60 && (
                      <tr><td colSpan={5} className="px-3 py-2 text-center text-slate-500 italic">... e mais {records.length - 60} registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleConfirm} disabled={isSaving} className="bg-slate-800 hover:bg-slate-900 flex-1 sm:flex-none">
                {isSaving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                  : <><CheckCircle className="w-4 h-4 mr-2" />Confirmar Importação</>
                }
              </Button>
              <Button variant="outline" onClick={cancelar} disabled={isSaving}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Importações recentes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600" />
          <h2 className="font-semibold text-slate-800">Importações Realizadas</h2>
        </div>
        {importacoes.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Nenhuma importação realizada ainda</div>
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
                      <Badge className={
                        imp.status === 'concluida' ? 'bg-green-100 text-green-700' :
                        imp.status === 'erro' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }>
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
    </div>
  );
}