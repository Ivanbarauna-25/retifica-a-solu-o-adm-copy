import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, X, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { formatMinutes } from "@/components/ponto/parseZKTeco";

const STATUS_STYLE = {
  ok: 'bg-green-100 text-green-700',
  incompleto: 'bg-yellow-100 text-yellow-700',
  divergente: 'bg-orange-100 text-orange-700',
  falta: 'bg-red-100 text-red-700',
  ajustado: 'bg-blue-100 text-blue-700',
};

export default function PontoOcorrenciaModal({ apuracao, registros, funcionarioNome, onClose, onSaved }) {
  const [batidas, setBatidas] = useState([]);
  const [obs, setObs] = useState(apuracao?.observacoes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Inicializa com os registros existentes do dia
    const sorted = [...(registros || [])].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    setBatidas(sorted.map(r => ({ id: r.id, hora: r.hora?.substring(0, 5) || '', origem: r.origem || 'relogio', novo: false })));
  }, [registros]);

  const addBatida = () => setBatidas(prev => [...prev, { id: null, hora: '', origem: 'ajuste', novo: true }]);
  const removeBatida = (i) => setBatidas(prev => prev.filter((_, idx) => idx !== i));
  const updateHora = (i, val) => setBatidas(prev => prev.map((b, idx) => idx === i ? { ...b, hora: val } : b));

  const toMin = (hhmm) => {
    if (!hhmm || !hhmm.includes(':')) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  const calcTotal = () => {
    const sorted = [...batidas].filter(b => b.hora).sort((a, b) => a.hora.localeCompare(b.hora));
    let total = 0;
    if (sorted.length >= 2) total += (toMin(sorted[1]?.hora) - toMin(sorted[0]?.hora)) || 0;
    if (sorted.length >= 4) total += (toMin(sorted[3]?.hora) - toMin(sorted[2]?.hora)) || 0;
    return total;
  };

  const handleSave = async () => {
    setSaving(true);

    // Criar novos registros de ajuste
    const novos = batidas.filter(b => b.novo && b.hora);
    for (const b of novos) {
      await base44.entities.PontoRegistro.create({
        funcionario_id: apuracao.funcionario_id,
        user_id_relogio: '',
        data: apuracao.data,
        hora: b.hora + ':00',
        data_hora: `${apuracao.data}T${b.hora}:00`,
        origem: 'ajuste',
        valido: true,
      });
    }

    // Atualizar apuração
    const sorted = [...batidas].filter(b => b.hora).sort((a, b) => a.hora.localeCompare(b.hora));
    const totalMin = calcTotal();
    await base44.entities.ApuracaoDiariaPonto.update(apuracao.id, {
      entrada_1: sorted[0]?.hora || null,
      saida_1: sorted[1]?.hora || null,
      entrada_2: sorted[2]?.hora || null,
      saida_2: sorted[3]?.hora || null,
      total_trabalhado_min: totalMin,
      status: 'ajustado',
      observacoes: obs,
      gerado_em: new Date().toISOString(),
    });

    setSaving(false);
    onSaved?.();
    onClose();
  };

  const totalMin = calcTotal();

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-slate-800 text-white rounded-t-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-base">{funcionarioNome}</p>
            <p className="text-slate-300 text-sm">{apuracao?.data} — Tratamento de Ocorrência</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status atual */}
          {apuracao && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Status atual:</span>
              <Badge className={STATUS_STYLE[apuracao.status] || 'bg-slate-100 text-slate-600'}>
                {apuracao.status}
              </Badge>
            </div>
          )}

          {/* Batidas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Batidas do dia</p>
              <Button size="sm" variant="outline" onClick={addBatida} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {batidas.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-16">Batida {i + 1}</span>
                  <Input
                    type="time"
                    value={b.hora}
                    onChange={e => updateHora(i, e.target.value)}
                    className="flex-1 h-9 text-sm font-mono"
                  />
                  {b.novo && (
                    <Badge className="text-xs bg-blue-100 text-blue-700 flex-shrink-0">Ajuste</Badge>
                  )}
                  <button onClick={() => removeBatida(i)} className="p-1 hover:bg-red-50 rounded text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {batidas.length === 0 && (
                <p className="text-sm text-slate-500 italic">Nenhuma batida registrada. Adicione manualmente.</p>
              )}
            </div>
          </div>

          {/* Total calculado */}
          {batidas.filter(b => b.hora).length >= 2 && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between">
              <span className="text-slate-600">Total calculado:</span>
              <span className="font-bold font-mono text-slate-800">{formatMinutes(totalMin)}</span>
            </div>
          )}

          {/* Observação */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Observação / Motivo do ajuste</label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              placeholder="Ex: Esqueceu de bater na saída, atestado médico..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-slate-800 hover:bg-slate-900">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Ajuste'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}