import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HardHat, Edit, Trash2, X, Calendar, Package, DollarSign, Building2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

const categoriaLabels = {
  cabeca: 'Proteção da Cabeça',
  olhos_face: 'Proteção dos Olhos e Face',
  auditivo: 'Proteção Auditiva',
  respiratorio: 'Proteção Respiratória',
  tronco: 'Proteção do Tronco',
  membros_superiores: 'Proteção dos Membros Superiores',
  membros_inferiores: 'Proteção dos Membros Inferiores',
  corpo_inteiro: 'Proteção do Corpo Inteiro',
  quedas: 'Proteção Contra Quedas'
};

export default function EPIViewer({ isOpen, onClose, epi, fornecedores = [], onEdit, onDelete }) {
  if (!epi) return null;

  const getFornecedorNome = (id) => {
    if (!id) return '-';
    const fornecedor = fornecedores.find(f => f.id === id);
    return fornecedor?.nome || '-';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] md:max-w-3xl p-0 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="sticky top-0 z-10 px-3 md:px-6 py-3 md:py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 md:gap-3 text-white">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-white/20 flex items-center justify-center">
              <HardHat className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm md:text-xl font-bold">{epi.nome}</h2>
              <p className="text-xs md:text-sm text-slate-300">Detalhes do EPI</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
          {/* Foto e Status */}
          <div className="flex flex-col md:flex-row items-start gap-3 md:gap-6">
            {epi.foto_url && (
              <img src={epi.foto_url} alt={epi.nome} className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg border shadow-sm" />
            )}
            <div className="flex-1 space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={epi.status === 'inativo' ? 'bg-red-100 text-red-800 text-xs' : 'bg-green-100 text-green-800 text-xs'}>
                  {epi.status === 'inativo' ? 'Inativo' : 'Ativo'}
                </Badge>
                {epi.numero_ca && (
                  <Badge variant="outline" className="font-mono text-xs">CA: {epi.numero_ca}</Badge>
                )}
              </div>
              {epi.descricao && (
                <p className="text-xs md:text-sm text-slate-600">{epi.descricao}</p>
              )}
            </div>
          </div>

          {/* Informações Detalhadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
            <div className="bg-slate-50 rounded-lg p-2 md:p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-[10px] md:text-xs font-medium">Categoria</span>
              </div>
              <p className="text-slate-900 font-medium text-xs md:text-sm">{categoriaLabels[epi.categoria] || epi.categoria || '-'}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-2 md:p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-[10px] md:text-xs font-medium">Unidade</span>
              </div>
              <p className="text-slate-900 font-medium text-xs md:text-sm">{epi.unidade || 'UN'}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-2 md:p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-[10px] md:text-xs font-medium">Vida Útil</span>
              </div>
              <p className="text-slate-900 font-medium text-xs md:text-sm">{epi.vida_util_meses ? `${epi.vida_util_meses} meses` : '-'}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-2 md:p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-[10px] md:text-xs font-medium">Validade CA</span>
              </div>
              <p className="text-slate-900 font-medium text-xs md:text-sm">{epi.validade_ca ? formatDate(epi.validade_ca) : '-'}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-2 md:p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-[10px] md:text-xs font-medium">Preço Referência</span>
              </div>
              <p className="text-slate-900 font-medium text-xs md:text-sm">{epi.preco_referencia ? formatCurrency(epi.preco_referencia) : '-'}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-2 md:p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Building2 className="w-4 h-4" />
                <span className="text-[10px] md:text-xs font-medium">Fornecedor</span>
              </div>
              <p className="text-slate-900 font-medium text-xs md:text-sm truncate">{getFornecedorNome(epi.fornecedor_padrao_id)}</p>
            </div>
          </div>

          {/* Observações */}
          {epi.observacoes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 md:p-4">
              <h4 className="text-xs md:text-sm font-medium text-yellow-800 mb-1">Observações</h4>
              <p className="text-xs md:text-sm text-yellow-700">{epi.observacoes}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 md:px-6 py-3 md:py-4 flex justify-end gap-2 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4 gap-2">
            <X className="w-4 h-4" />
            Fechar
          </Button>
          {onEdit && (
            <Button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700 text-white h-8 md:h-9 text-xs md:text-sm px-3 md:px-4 gap-2">
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          )}
          {onDelete && (
            <Button onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white h-8 md:h-9 text-xs md:text-sm px-3 md:px-4 gap-2">
              <Trash2 className="w-4 h-4" />
              Excluir
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}