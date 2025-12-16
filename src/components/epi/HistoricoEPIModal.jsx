import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HardHat, X, Printer, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '@/components/formatters';
import { createPageUrl } from '@/utils';

export default function HistoricoEPIModal({ isOpen, onClose, funcionario }) {
  const [entregas, setEntregas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (isOpen && funcionario?.id) {
      fetchEntregas();
    }
  }, [isOpen, funcionario]);

  const fetchEntregas = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.EntregaEPI.filter({ funcionario_id: funcionario.id }, '-data_entrega');
      setEntregas(data || []);
    } catch (error) {
      console.error('Erro ao carregar entregas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintTermo = (entrega) => {
    const url = `${createPageUrl('TermoRecebimentoEPI')}?entrega_id=${entrega.id}`;
    window.open(url, '_blank');
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] modern-modal bg-white" style={{ overflowY: 'auto' }}>
        <DialogHeader className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b border-slate-600">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Histórico de EPIs</h2>
              <p className="text-sm text-slate-300">{funcionario?.nome}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Carregando...</div>
          ) : entregas.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nenhuma entrega de EPI registrada para este funcionário.
            </div>
          ) : (
            <div className="space-y-4">
              {entregas.map((entrega) => (
                <div key={entrega.id} className="border rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100"
                    onClick={() => toggleExpand(entrega.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          Entrega em {formatDate(entrega.data_entrega)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {entrega.itens?.length || 0} item(ns) • Por: {entrega.entregue_por || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={entrega.termo_assinado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {entrega.termo_assinado ? 'Assinado' : 'Pendente'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.stopPropagation(); handlePrintTermo(entrega); }}
                        title="Imprimir Termo"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {expandedId === entrega.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                  
                  {expandedId === entrega.id && (
                    <div className="p-4 border-t">
                      <Table>
                        <TableHeader className="bg-slate-100">
                          <TableRow>
                            <TableHead>EPI</TableHead>
                            <TableHead>CA</TableHead>
                            <TableHead className="text-center">Qtd</TableHead>
                            <TableHead>Observações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entrega.itens?.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.epi_nome}</TableCell>
                              <TableCell className="font-mono">{item.numero_ca || '-'}</TableCell>
                              <TableCell className="text-center">{item.quantidade}</TableCell>
                              <TableCell className="text-slate-500">{item.observacoes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {entrega.observacoes && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-yellow-800"><strong>Obs:</strong> {entrega.observacoes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-slate-200 px-6 pb-6">
          <Button variant="outline" onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white gap-2">
            <X className="w-4 h-4" />
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}