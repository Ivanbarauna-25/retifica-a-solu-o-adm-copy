/**
 * StatusBadge — Badge com bolinha colorida e fundo pastel por status.
 * Use em qualquer tabela, modal ou card do sistema.
 *
 * Uso:
 *   <StatusBadge status="em_andamento" />
 *   <StatusBadge status="finalizado" label="Concluído" />
 *   <StatusBadge status="cancelado" />
 */
import React from 'react';

const STATUS_MAP = {
  // ── Verde ────────────────────
  ativo:             { variant: 'success', label: 'Ativo' },
  ativa:             { variant: 'success', label: 'Ativa' },
  finalizado:        { variant: 'success', label: 'Finalizado' },
  finalizada:        { variant: 'success', label: 'Finalizada' },
  pago:              { variant: 'success', label: 'Pago' },
  paga:              { variant: 'success', label: 'Paga' },
  recebido:          { variant: 'success', label: 'Recebido' },
  recebida:          { variant: 'success', label: 'Recebida' },
  aprovado:          { variant: 'success', label: 'Aprovado' },
  aprovada:          { variant: 'success', label: 'Aprovada' },
  concluido:         { variant: 'success', label: 'Concluído' },
  concluida:         { variant: 'success', label: 'Concluída' },
  aceito:            { variant: 'success', label: 'Aceito' },
  // ── Amarelo ──────────────────
  em_andamento:      { variant: 'warning', label: 'Em Andamento' },
  pendente:          { variant: 'warning', label: 'Pendente' },
  em_aberto:         { variant: 'warning', label: 'Em Aberto' },
  experiencia:       { variant: 'warning', label: 'Em Experiência' },
  calculada:         { variant: 'warning', label: 'Calculada' },
  aguardando:        { variant: 'warning', label: 'Aguardando' },
  em_analise:        { variant: 'warning', label: 'Em Análise' },
  processando:       { variant: 'warning', label: 'Processando' },
  pago_parcial:      { variant: 'warning', label: 'Pago Parcial' },
  em_rascunho:       { variant: 'warning', label: 'Rascunho' },
  // ── Vermelho ─────────────────
  cancelado:         { variant: 'error', label: 'Cancelado' },
  cancelada:         { variant: 'error', label: 'Cancelada' },
  demitido:          { variant: 'error', label: 'Demitido' },
  vencido:           { variant: 'error', label: 'Vencido' },
  rejeitado:         { variant: 'error', label: 'Rejeitado' },
  rejeitada:         { variant: 'error', label: 'Rejeitada' },
  inativo:           { variant: 'error', label: 'Inativo' },
  reprovado:         { variant: 'error', label: 'Reprovado' },
  erro:              { variant: 'error', label: 'Erro' },
  // ── Neutro ───────────────────
  convertido:        { variant: 'neutral', label: 'Convertido' },
  expirado:          { variant: 'neutral', label: 'Expirado' },
  // ── Azul ─────────────────────
  ferias:            { variant: 'info', label: 'Férias' },
  afastado:          { variant: 'info', label: 'Afastado' },
  // ── Roxo ─────────────────────
  abonado:           { variant: 'purple', label: 'Abonado' },
  folga:             { variant: 'purple', label: 'Folga' },
};

export default function StatusBadge({ status, label, className = '' }) {
  const key = status?.toLowerCase()?.replace(/\s+/g, '_') || '';
  const config = STATUS_MAP[key] || { variant: 'neutral', label: label || status || '—' };
  const displayLabel = label || config.label;

  return (
    <span className={`badge-status badge-${config.variant} ${className}`}>
      {displayLabel}
    </span>
  );
}