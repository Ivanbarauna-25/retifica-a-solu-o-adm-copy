import React from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, User, Calendar, DollarSign, FileText, Edit, ArrowRightLeft, X, Calculator } from "lucide-react";
import { formatCurrency, formatDate } from "@/components/formatters";

export default function Folha13Viewer({
  isOpen,
  onClose,
  folha13,
  funcionarios,
  planoContas,
  onEdit,
  onGerarMovimentacao
}) {
  if (!folha13) return null;

  const getFuncionarioNome = (id) => {
    const func = funcionarios?.find(f => f.id === id);
    return func?.nome || 'N/A';
  };

  const getFuncionario = (id) => {
    return funcionarios?.find(f => f.id === id);
  };

  const getPlanoContasNome = (id) => {
    const plano = planoContas?.find(p => p.id === id);
    return plano?.nome || 'N/A';
  };

  const tipoParcelaLabels = {
    "1_parcela": "1ª Parcela",
    "2_parcela": "2ª Parcela",
    "parcela_unica": "Parcela Única"
  };

  const statusLabels = {
    gerado: <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Gerado</Badge>,
    editado: <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Editado</Badge>,
    pago: <Badge className="bg-green-100 text-green-800 border-green-300">Pago</Badge>,
    cancelado: <Badge className="bg-red-100 text-red-800 border-red-300">Cancelado</Badge>
  };

  const avosAtual = folha13.avos_editados ?? folha13.avos_calculados;
  const funcionario = getFuncionario(folha13.funcionario_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[92vh] p-0 modern-modal" 
        onPointerDownOutside={(e) => e.preventDefault()}
        style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
      >
        <style>{`
          .modern-modal::-webkit-scrollbar { width: 8px; }
          .modern-modal::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
          .modern-modal::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; }
          .modern-modal::-webkit-scrollbar-thumb:hover { background: #64748b; }
        `}</style>

        <DialogHeader className="sticky top-0 z-10 px-6 py-5 bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b border-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">13º Salário - {tipoParcelaLabels[folha13.tipo_parcela]}</h2>
                <p className="text-slate-300 text-sm">{getFuncionarioNome(folha13.funcionario_id)} - {folha13.ano_referencia}</p>
              </div>
            </div>
            <Button size="sm" onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Informações do Funcionário */}
          <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-slate-700" />
              <h3 className="text-lg font-bold text-slate-900">Informações do Funcionário</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Nome</p>
                <p className="text-sm font-bold text-slate-900">{getFuncionarioNome(folha13.funcionario_id)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">CPF</p>
                <p className="text-sm font-bold text-slate-900">{funcionario?.cpf || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Ano de Referência</p>
                <p className="text-sm font-bold text-slate-900">{folha13.ano_referencia}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Status</p>
                <div className="mt-1">{statusLabels[folha13.status]}</div>
              </div>
            </div>
          </div>

          {/* Avos e Parcela */}
          <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-blue-700" />
              <h3 className="text-lg font-bold text-blue-900">Proporcionalidade</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Tipo de Parcela</p>
                <p className="text-base font-bold text-blue-800">{tipoParcelaLabels[folha13.tipo_parcela]}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Avos</p>
                <p className="text-base font-bold text-blue-800">{avosAtual}/12</p>
                {folha13.avos_editados && folha13.avos_editados !== folha13.avos_calculados && (
                  <p className="text-xs text-blue-600">(Calculado: {folha13.avos_calculados}/12)</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Data de Pagamento</p>
                <p className="text-base font-bold text-blue-800">{formatDate(folha13.data_pagamento)}</p>
              </div>
            </div>
          </div>

          {/* Base de Cálculo */}
          <div className="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border border-green-200">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-700" />
              <h3 className="text-lg font-bold text-green-900">Base de Cálculo</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Salário Base</p>
                <p className="text-base font-bold text-green-700">{formatCurrency(folha13.salario_base)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Média Horas Extras</p>
                <p className="text-base font-bold text-green-700">{formatCurrency(folha13.media_horas_extras)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Média Comissões</p>
                <p className="text-base font-bold text-green-700">{formatCurrency(folha13.media_comissoes)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Média Outros</p>
                <p className="text-base font-bold text-green-700">{formatCurrency(folha13.media_outros)}</p>
              </div>
            </div>
          </div>

          {/* Descontos */}
          <div className="bg-gradient-to-br from-red-50 to-white p-5 rounded-xl border border-red-200">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-red-700" />
              <h3 className="text-lg font-bold text-red-900">Descontos</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">INSS</p>
                <p className="text-base font-bold text-red-700">{formatCurrency(folha13.inss)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">IRRF</p>
                <p className="text-base font-bold text-red-700">{formatCurrency(folha13.irrf)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Outros Descontos</p>
                <p className="text-base font-bold text-red-700">{formatCurrency(folha13.outros_descontos)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Total Descontos</p>
                <p className="text-lg font-bold text-red-800">
                  {formatCurrency((folha13.inss || 0) + (folha13.irrf || 0) + (folha13.outros_descontos || 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Totais */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-xl text-white">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-1">Valor Bruto ({avosAtual}/12 avos)</p>
                <p className="text-2xl font-bold">{formatCurrency(folha13.valor_bruto)}</p>
              </div>
              {folha13.tipo_parcela !== "parcela_unica" && (
                <div>
                  <p className="text-sm font-semibold text-slate-300 mb-1">1ª Parcela</p>
                  <p className="text-2xl font-bold">{formatCurrency(folha13.valor_primeira_parcela)}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-1">
                  {folha13.tipo_parcela === "1_parcela" ? "Valor a Pagar" : 
                   folha13.tipo_parcela === "2_parcela" ? "2ª Parcela" : "Valor Líquido"}
                </p>
                <p className="text-3xl font-bold">{formatCurrency(folha13.valor_liquido)}</p>
              </div>
            </div>
          </div>

          {/* Observações */}
          {folha13.observacoes && (
            <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-slate-700" />
                <h3 className="text-lg font-bold text-slate-900">Observações</h3>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{folha13.observacoes}</p>
            </div>
          )}

          {/* Plano de Contas */}
          {folha13.plano_contas_id && (
            <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-slate-700" />
                <h3 className="text-lg font-bold text-slate-900">Dados Financeiros</h3>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Plano de Contas</p>
                <p className="text-sm font-bold text-slate-900">{getPlanoContasNome(folha13.plano_contas_id)}</p>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t-2 border-slate-300">
            <Button
              onClick={() => { onClose(); onGerarMovimentacao?.(folha13); }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg py-6"
              disabled={folha13.status === 'pago' || folha13.status === 'cancelado'}
            >
              <ArrowRightLeft className="w-5 h-5 mr-2" /> Gerar Movimentação
            </Button>

            <Button
              onClick={() => { onClose(); onEdit?.(folha13); }}
              disabled={folha13.status === 'pago'}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold shadow-lg py-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit className="w-5 h-5 mr-2" /> Editar
            </Button>
          </div>

          <div className="flex justify-end mt-6 pt-5 border-t-2 border-slate-300">
            <Button onClick={onClose} className="bg-slate-300 hover:bg-slate-400 text-slate-900 px-8 font-bold">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}