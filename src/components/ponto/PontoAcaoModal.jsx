import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { X, AlertTriangle } from "lucide-react";
import { formatMinutes } from "@/components/ponto/parseZKTeco";

const STATUS_META = {
  ok:         { label: 'OK',         cls: 'bg-green-100 text-green-700' },
  incompleto: { label: 'Falta',      cls: 'bg-red-100 text-red-600' },
  divergente: { label: 'Divergente', cls: 'bg-orange-100 text-orange-700' },
  falta:      { label: 'Falta',      cls: 'bg-red-100 text-red-600' },
  ajustado:   { label: 'Ajustado',   cls: 'bg-slate-100 text-slate-600' },
  abonado:    { label: 'Abonado',    cls: 'bg-purple-100 text-purple-700' },
  folga:      { label: 'Folga',      cls: 'bg-indigo-100 text-indigo-700' },
  ferias:     { label: 'Férias',     cls: 'bg-sky-100 text-sky-700' },
  desconto:   { label: 'Desconto',   cls: 'bg-rose-100 text-rose-700' },
};

const ACOES = [
  {
    status: 'abonado',
    label: 'Abonar',
    desc: 'Falta justificada, saldo zerado sem desconto',
    icon: '✅',
    cls: 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700',
  },
  {
    status: 'folga',
    label: 'Folga',
    desc: 'Folga programada ou compensada',
    icon: '🏖️',
    cls: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700',
  },
  {
    status: 'ferias',
    label: 'Férias',
    desc: 'Dia de férias do funcionário',
    icon: '🌴',
    cls: 'border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700',
  },
  {
    status: 'desconto',
    label: 'Descontar',
    desc: 'Falta lançada para desconto em folha',
    icon: '➖',
    cls: 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700',
  },
];

export default function PontoAcaoModal({ apuracao, func, batidas, dateStr, onClose, onSaved }) {
  const [justificativa, setJustificativa] = useState(apuracao?.observacoes || '');
  const [saving, setSaving] = useState(false);

  const batidasSorted = [...(batidas || [])].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  const [y, m, d] = dateStr.split('-');
  const dataFormatada = `${d}/${m}/${y}`;
  const saldo = (apuracao?.hora_extra_min || 0) - (apuracao?.falta_min || 0);

  const aplicarTratativa = async (novoStatus) => {
    if (!justificativa.trim()) {
      alert('Informe a justificativa antes de continuar.');
      return;
    }
    setSaving(true);

    let falta_min = apuracao?.falta_min || 0;
    let hora_extra_min = apuracao?.hora_extra_min || 0;
    let banco_horas_min = apuracao?.banco_horas_min || 0;

    if (novoStatus === 'abonado' || novoStatus === 'folga' || novoStatus === 'ferias') {
      falta_min = 0;
      hora_extra_min = 0;
      banco_horas_min = 0;
    } else if (novoStatus === 'desconto') {
      falta_min = apuracao?.falta_min || 0;
      banco_horas_min = -falta_min;
    }

    const payload = {
      status: novoStatus,
      observacoes: justificativa,
      falta_min,
      hora_extra_min,
      banco_horas_min,
      gerado_em: new Date().toISOString(),
    };

    if (apuracao?.id) {
      await base44.entities.ApuracaoDiariaPonto.update(apuracao.id, payload);
    } else {
      await base44.entities.ApuracaoDiariaPonto.create({
        funcionario_id: func.id,
        data: dateStr,
        entrada_1: batidasSorted[0]?.hora?.substring(0, 5) || null,
        saida_1:   batidasSorted[1]?.hora?.substring(0, 5) || null,
        entrada_2: batidasSorted[2]?.hora?.substring(0, 5) || null,
        saida_2:   batidasSorted[3]?.hora?.substring(0, 5) || null,
        total_trabalhado_min: apuracao?.total_trabalhado_min || 0,
        ...payload,
      });
    }

    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-base">{func?.nome}</p>
            <p className="text-slate-300 text-sm">{dataFormatada} — Tratativa de Ponto</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Resumo do dia */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Situação atual</span>
              <Badge className={STATUS_META[apuracao?.status]?.cls || 'bg-slate-100 text-slate-500'}>
                {STATUS_META[apuracao?.status]?.label || 'Sem apuração'}
              </Badge>
            </div>

            {/* Batidas — somente leitura */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Batidas registradas</p>
              <div className="grid grid-cols-4 gap-2">
                {['1ª Ent.', '1ª Saí.', '2ª Ent.', '2ª Saí.'].map((label, i) => (
                  <div key={i} className="flex flex-col items-center bg-white border border-slate-200 rounded-lg py-2 px-1">
                    <span className="text-[10px] text-slate-400 mb-1">{label}</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {batidasSorted[i]?.hora?.substring(0, 5) || <span className="text-slate-300">—</span>}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                Batidas são importadas do relógio e não podem ser editadas. Utilize justificativas abaixo.
              </p>
            </div>

            {/* Saldo */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-sm text-slate-500">Saldo do dia</span>
              <span className={`font-mono font-bold text-base ${saldo > 0 ? 'text-blue-600' : saldo < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                {apuracao ? formatMinutes(saldo) : '—'}
              </span>
            </div>

            {/* Justificativa anterior */}
            {apuracao?.observacoes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                <span className="font-semibold">Justificativa anterior:</span> {apuracao.observacoes}
              </div>
            )}
          </div>

          {/* Aviso batida faltando */}
          {!batidasSorted[1] && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Batida de saída não registrada. Aplique uma tratativa com justificativa abaixo.</span>
            </div>
          )}

          {/* Justificativa */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              Justificativa <span className="text-red-500">*</span>
            </label>
            <textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              rows={3}
              placeholder="Ex: funcionário apresentou atestado médico, folga compensatória do dia XX/XX, férias programadas, etc."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              A justificativa fica registrada no histórico. O saldo é corrigido conforme a ação escolhida, mas as batidas permanecem inalteradas.
            </p>
          </div>

          {/* Ações */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Escolha a tratativa</p>
            <div className="grid grid-cols-2 gap-2">
              {ACOES.map(acao => (
                <button
                  key={acao.status}
                  onClick={() => aplicarTratativa(acao.status)}
                  disabled={saving}
                  className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-colors disabled:opacity-50 ${acao.cls}`}
                >
                  <span className="text-xl">{acao.icon}</span>
                  <span className="text-sm font-bold">{acao.label}</span>
                  <span className="text-[10px] text-center leading-snug opacity-75">{acao.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {saving && (
            <div className="text-center text-sm text-slate-500 py-2 animate-pulse">Salvando tratativa...</div>
          )}
        </div>
      </div>
    </div>
  );
}