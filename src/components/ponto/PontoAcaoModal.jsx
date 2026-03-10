import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Check, Umbrella, Minus, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { formatMinutes } from "@/components/ponto/parseZKTeco";

const STATUS_META = {
  ok:         { label: 'OK',         cls: 'bg-green-100 text-green-700' },
  incompleto: { label: 'Incompleto', cls: 'bg-yellow-100 text-yellow-700' },
  divergente: { label: 'Divergente', cls: 'bg-orange-100 text-orange-700' },
  falta:      { label: 'Falta',      cls: 'bg-red-100 text-red-700' },
  ajustado:   { label: 'Ajustado',   cls: 'bg-blue-100 text-blue-700' },
  abonado:    { label: 'Abonado',    cls: 'bg-purple-100 text-purple-700' },
  folga:      { label: 'Folga',      cls: 'bg-indigo-100 text-indigo-700' },
  desconto:   { label: 'Desconto',   cls: 'bg-rose-100 text-rose-700' },
};

export default function PontoAcaoModal({ apuracao, func, batidas, dateStr, onClose, onSaved }) {
  const [batidasEdit, setBatidasEdit] = useState(
    [...(batidas || [])].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
      .map(r => ({ id: r.id, hora: r.hora?.substring(0, 5) || '', novo: false }))
  );
  const [obs, setObs] = useState(apuracao?.observacoes || '');
  const [saving, setSaving] = useState(false);

  const toMin = (hhmm) => {
    if (!hhmm || !hhmm.includes(':')) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  const calcTotal = () => {
    const sorted = [...batidasEdit].filter(b => b.hora).sort((a, b) => a.hora.localeCompare(b.hora));
    let total = 0;
    if (sorted.length >= 2) total += Math.max(0, toMin(sorted[1]?.hora) - toMin(sorted[0]?.hora));
    if (sorted.length >= 4) total += Math.max(0, toMin(sorted[3]?.hora) - toMin(sorted[2]?.hora));
    return total;
  };

  const addBatida = () => setBatidasEdit(prev => [...prev, { id: null, hora: '', novo: true }]);
  const removeBatida = (i) => setBatidasEdit(prev => prev.filter((_, idx) => idx !== i));
  const updateHora = (i, val) => setBatidasEdit(prev => prev.map((b, idx) => idx === i ? { ...b, hora: val } : b));

  const salvarComStatus = async (novoStatus) => {
    setSaving(true);
    // Criar novas batidas de ajuste
    for (const b of batidasEdit.filter(b => b.novo && b.hora)) {
      await base44.entities.PontoRegistro.create({
        funcionario_id: func.id,
        user_id_relogio: '',
        data: dateStr,
        hora: b.hora + ':00',
        data_hora: `${dateStr}T${b.hora}:00`,
        origem: 'ajuste',
        valido: true,
      });
    }
    const sorted = [...batidasEdit].filter(b => b.hora).sort((a, b) => a.hora.localeCompare(b.hora));
    const totalMin = calcTotal();
    const carga = 480; // padrão
    const saldo = totalMin - carga;

    const payload = {
      funcionario_id: func.id,
      data: dateStr,
      entrada_1: sorted[0]?.hora || null,
      saida_1:   sorted[1]?.hora || null,
      entrada_2: sorted[2]?.hora || null,
      saida_2:   sorted[3]?.hora || null,
      total_trabalhado_min: totalMin,
      falta_min:      novoStatus === 'abonado' ? 0 : (saldo < 0 ? Math.abs(saldo) : 0),
      hora_extra_min: saldo > 0 ? saldo : 0,
      status: novoStatus,
      observacoes: obs,
      gerado_em: new Date().toISOString(),
    };

    if (apuracao?.id) {
      await base44.entities.ApuracaoDiariaPonto.update(apuracao.id, payload);
    } else {
      await base44.entities.ApuracaoDiariaPonto.create(payload);
    }
    setSaving(false);
    onSaved?.();
  };

  const totalMin = calcTotal();
  const [y, m, d] = dateStr.split('-');
  const dataFormatada = `${d}/${m}/${y}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-base">{func?.nome}</p>
            <p className="text-slate-300 text-sm">{dataFormatada} — Tratamento de Ponto</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status atual */}
          {apuracao && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Status atual:</span>
              <Badge className={STATUS_META[apuracao.status]?.cls || 'bg-slate-100 text-slate-600'}>
                {STATUS_META[apuracao.status]?.label || apuracao.status}
              </Badge>
              {apuracao.falta_min > 0 && (
                <span className="text-red-600 text-xs font-medium ml-auto">
                  Falta: {formatMinutes(apuracao.falta_min)}
                </span>
              )}
            </div>
          )}

          {/* Batidas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Batidas do dia</p>
              <Button size="sm" variant="outline" onClick={addBatida} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {batidasEdit.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Nenhuma batida registrada. Adicione manualmente ou escolha uma ação abaixo.
                </div>
              )}
              {batidasEdit.map((b, i) => {
                const nomes = ['Entrada 1', 'Saída 1', 'Entrada 2', 'Saída 2'];
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-20 flex-shrink-0">{nomes[i] || `Batida ${i + 1}`}</span>
                    <input
                      type="time"
                      value={b.hora}
                      onChange={e => updateHora(i, e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-slate-500"
                    />
                    {b.novo && <Badge className="text-xs bg-blue-100 text-blue-700 flex-shrink-0">Novo</Badge>}
                    <button onClick={() => removeBatida(i)} className="p-1 hover:bg-red-50 rounded text-red-400 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total calculado */}
          {batidasEdit.filter(b => b.hora).length >= 2 && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between items-center">
              <span className="text-slate-500">Total calculado:</span>
              <span className="font-bold font-mono text-slate-800">{formatMinutes(totalMin)}</span>
            </div>
          )}

          {/* Observação */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Observação / Motivo</label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              placeholder="Descreva o motivo do ajuste ou ausência..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Ações */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Escolha uma ação</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => salvarComStatus('abonado')}
                disabled={saving}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors disabled:opacity-50"
              >
                <Check className="w-5 h-5" />
                <span className="text-xs font-semibold">Abonar</span>
                <span className="text-[10px] text-purple-500 text-center">Falta justificada, sem desconto</span>
              </button>
              <button
                onClick={() => salvarComStatus('folga')}
                disabled={saving}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors disabled:opacity-50"
              >
                <Umbrella className="w-5 h-5" />
                <span className="text-xs font-semibold">Marcar como Folga</span>
                <span className="text-[10px] text-indigo-500 text-center">Folga programada ou compensada</span>
              </button>
              <button
                onClick={() => salvarComStatus('desconto')}
                disabled={saving}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors disabled:opacity-50"
              >
                <Minus className="w-5 h-5" />
                <span className="text-xs font-semibold">Descontar</span>
                <span className="text-[10px] text-rose-500 text-center">Lançar para desconto em folha</span>
              </button>
            </div>
          </div>

          {/* Salvar ajuste manual */}
          <div className="border-t border-slate-100 pt-3">
            <Button
              onClick={() => salvarComStatus('ajustado')}
              disabled={saving}
              className="w-full bg-slate-800 hover:bg-slate-900"
            >
              {saving ? 'Salvando...' : 'Salvar Ajuste de Horário'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}