import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart, Edit, Printer, X, CheckCircle, XCircle, Calendar, Building2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

const statusLabels = {
  rascunho: 'Rascunho',
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada'
};

const statusColors = {
  rascunho: 'bg-gray-100 text-gray-800',
  pendente: 'bg-yellow-100 text-yellow-800',
  aprovada: 'bg-green-100 text-green-800',
  rejeitada: 'bg-red-100 text-red-800'
};

export default function CotacaoEPIViewer({ isOpen, onClose, cotacao, fornecedores = [], onEdit, onPrint, onAprovar, onRejeitar }) {
  if (!cotacao) return null;

  const getFornecedorNome = (id) => {
    if (!id) return '-';
    const fornecedor = fornecedores.find(f => f.id === id);
    return fornecedor?.nome || '-';
  };

  const handleRejeitar = () => {
    const motivo = prompt('Motivo da rejeição:');
    if (motivo && onRejeitar) {
      onRejeitar(motivo);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] modern-modal bg-white" style={{ overflowY: 'auto' }}>
        <DialogHeader className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b border-slate-600">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {cotacao.numero || `COT-${cotacao.id.substring(0, 6).toUpperCase()}`}
              </h2>
              <p className="text-sm text-slate-300">Detalhes da Cotação</p>
            </div>
            <Badge className={`${statusColors[cotacao.status]} text-sm`}>
              {statusLabels[cotacao.status] || 'Rascunho'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Informações Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Data da Cotação</span>
              </div>
              <p className="text-slate-900 font-medium">{formatDate(cotacao.data_cotacao)}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-medium">Fornecedor</span>
              </div>
              <p className="text-slate-900 font-medium">{getFornecedorNome(cotacao.fornecedor_id)}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-xs font-medium text-blue-600 mb-1">Valor Total</div>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(cotacao.valor_total || 0)}</p>
            </div>
          </div>

          {/* Itens */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Itens da Cotação</h4>
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead>EPI</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-right">Preço Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cotacao.itens?.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.epi_nome}</TableCell>
                    <TableCell className="text-center">{item.quantidade}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.preco_unitario || 0)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.total_item || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Funcionários Vinculados */}
          {cotacao.funcionarios_vinculados?.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Funcionários Vinculados</h4>
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>EPIs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cotacao.funcionarios_vinculados.map((func, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{func.funcionario_nome}</TableCell>
                      <TableCell>{func.cargo || '-'}</TableCell>
                      <TableCell>
                        {func.epis?.map(e => e.epi_nome).join(', ') || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Observações */}
          {cotacao.observacoes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Observações</h4>
              <p className="text-yellow-700">{cotacao.observacoes}</p>
            </div>
          )}

          {/* Motivo Rejeição */}
          {cotacao.status === 'rejeitada' && cotacao.motivo_rejeicao && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-1">Motivo da Rejeição</h4>
              <p className="text-red-700">{cotacao.motivo_rejeicao}</p>
            </div>
          )}

          {/* Info Aprovação */}
          {cotacao.status === 'aprovada' && cotacao.aprovado_por && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-800 mb-1">Aprovação</h4>
              <p className="text-green-700">
                Aprovado por {cotacao.aprovado_por} em {formatDate(cotacao.data_aprovacao)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-slate-200 px-6 pb-6">
          <Button variant="outline" onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white gap-2">
            <X className="w-4 h-4" />
            Fechar
          </Button>
          {onPrint && (
            <Button onClick={onPrint} variant="outline" className="gap-2">
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
          )}
          {onEdit && (
            <Button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          )}
          {onAprovar && (
            <Button onClick={onAprovar} className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <CheckCircle className="w-4 h-4" />
              Aprovar
            </Button>
          )}
          {onRejeitar && (
            <Button onClick={handleRejeitar} className="bg-red-600 hover:bg-red-700 text-white gap-2">
              <XCircle className="w-4 h-4" />
              Rejeitar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}