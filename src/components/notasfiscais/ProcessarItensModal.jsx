import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, Package, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/components/formatters';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

export default function ProcessarItensModal({ isOpen, onClose, nota, itens, onProcessed }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [margemLucro, setMargemLucro] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedItems, setProcessedItems] = useState([]);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const unprocessedItems = itens
        .filter(item => !item.processado)
        .map(item => item.id);
      setSelectedItems(unprocessedItems);
      setProcessedItems([]);
      setCurrentProcessingIndex(-1);
    }
  }, [isOpen, itens]);

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    const unprocessedItems = itens
      .filter(item => !item.processado)
      .map(item => item.id);
    
    if (selectedItems.length === unprocessedItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(unprocessedItems);
    }
  };

  const handleProcessar = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: 'Nenhum item selecionado',
        description: 'Selecione ao menos um item para processar.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    setProcessedItems([]);
    
    const itemsToProcess = itens.filter(item => selectedItems.includes(item.id));
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      setCurrentProcessingIndex(i);

      try {
        const precoVenda = item.valor_unitario * (1 + margemLucro / 100);

        const produtosExistentes = await base44.entities.Peca.filter({
          codigo: item.codigo_produto
        });

        if (produtosExistentes && produtosExistentes.length > 0) {
          const produtoExistente = produtosExistentes[0];
          await base44.entities.Peca.update(produtoExistente.id, {
            quantidade_estoque: (produtoExistente.quantidade_estoque || 0) + item.quantidade,
            preco_custo: item.valor_unitario,
            preco_venda: precoVenda
          });

          await base44.entities.ItemNotaFiscal.update(item.id, {
            processado: true,
            produto_id: produtoExistente.id
          });
        } else {
          const novoProduto = await base44.entities.Peca.create({
            codigo: item.codigo_produto,
            descricao: item.descricao,
            ncm: item.ncm,
            unidade: item.unidade || 'UN',
            quantidade_estoque: item.quantidade,
            preco_custo: item.valor_unitario,
            preco_venda: precoVenda,
            categoria: 'importado_nfe',
            tipo_entrada: nota.tipo_entrada || 'revenda',
            ativo: true
          });

          await base44.entities.ItemNotaFiscal.update(item.id, {
            processado: true,
            produto_id: novoProduto.id
          });
        }

        setProcessedItems(prev => [...prev, { id: item.id, status: 'success' }]);
        successCount++;

        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`Erro ao processar item ${item.codigo_produto}:`, error);
        
        setProcessedItems(prev => [...prev, { id: item.id, status: 'error', error: error.message }]);
        errorCount++;

        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setIsProcessing(false);
    setCurrentProcessingIndex(-1);

    const todosProcessados = itens.every(item => 
      item.processado || selectedItems.includes(item.id)
    );

    if (todosProcessados) {
      try {
        await base44.entities.NotaFiscalEntrada.update(nota.id, {
          status: 'processada'
        });
      } catch (error) {
        console.error('Erro ao atualizar status da nota:', error);
      }
    }

    if (errorCount === 0) {
      toast({
        title: '✅ Processamento concluído!',
        description: `${successCount} ${successCount === 1 ? 'item processado' : 'itens processados'} com sucesso.`
      });
    } else {
      toast({
        title: '⚠️ Processamento concluído com erros',
        description: `${successCount} processados, ${errorCount} com erro.`,
        variant: 'destructive'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (typeof onProcessed === 'function') {
      await onProcessed();
    }
  };

  const getItemStatus = (itemId, index) => {
    const processed = processedItems.find(p => p.id === itemId);
    
    if (processed) {
      return processed.status === 'success' ? 'success' : 'error';
    }
    
    if (currentProcessingIndex === index) {
      return 'processing';
    }
    
    return 'pending';
  };

  const itensPendentes = itens.filter(item => !item.processado);

  return (
    <>
      <style>{`
        .processar-itens-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .processar-itens-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .processar-itens-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .processar-itens-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .processar-itens-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .processar-itens-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .processar-itens-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .processar-itens-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .processar-itens-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .processar-itens-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-6xl h-[95vh] md:max-h-[90vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-3 md:px-6 py-3 md:py-4 sticky top-0 z-10">
            <DialogTitle className="flex items-center gap-3 text-white">
              <Package className="w-5 h-5 md:w-6 md:h-6 text-white" />
              <span className="text-base md:text-lg">Processar Itens e Cadastrar Produtos</span>
            </DialogTitle>
          </DialogHeader>

          <div className="processar-itens-scroll flex-1 px-3 md:px-6 pb-3 md:pb-6 space-y-3 md:space-y-6 mt-3 md:mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
              <p className="text-xs md:text-sm text-black">
                Os itens selecionados serão cadastrados como produtos no estoque. Produtos existentes terão seu estoque atualizado.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 md:p-4">
              <Label className="text-sm font-bold text-black">Margem de Lucro Padrão (%)</Label>
              <Input
                type="number"
                value={margemLucro}
                onChange={(e) => setMargemLucro(Number(e.target.value))}
                className="mt-2 border-2 bg-white text-black"
                disabled={isProcessing}
              />
              <p className="text-xs text-black mt-1">
                Será aplicada para calcular o preço de venda dos produtos
              </p>
            </div>

            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs md:text-sm font-semibold text-black">
                    Processando item {currentProcessingIndex + 1} de {selectedItems.length}
                  </span>
                  <span className="text-xs md:text-sm text-black">
                    {Math.round(((currentProcessingIndex + 1) / selectedItems.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentProcessingIndex + 1) / selectedItems.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800">
                      <TableHead className="text-white text-center w-[50px]">
                        <Checkbox
                          checked={selectedItems.length === itensPendentes.length && itensPendentes.length > 0}
                          onCheckedChange={handleSelectAll}
                          disabled={isProcessing}
                        />
                      </TableHead>
                      <TableHead className="text-white text-xs md:text-sm">Código</TableHead>
                      <TableHead className="text-white text-xs md:text-sm">Descrição</TableHead>
                      <TableHead className="text-white text-center text-xs md:text-sm">Qtd</TableHead>
                      <TableHead className="text-white text-right text-xs md:text-sm">Custo</TableHead>
                      <TableHead className="text-white text-right text-xs md:text-sm">Venda</TableHead>
                      <TableHead className="text-white text-center text-xs md:text-sm">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item, index) => {
                      const precoVenda = item.valor_unitario * (1 + margemLucro / 100);
                      const status = getItemStatus(item.id, selectedItems.findIndex(id => id === item.id));
                      const isSelected = selectedItems.includes(item.id);

                      return (
                        <TableRow
                          key={item.id}
                          className={`
                            ${item.processado ? 'bg-gray-50 opacity-60' : 'bg-white hover:bg-slate-50'}
                            ${status === 'processing' ? 'bg-blue-50' : ''}
                            ${status === 'success' ? 'bg-green-50' : ''}
                            ${status === 'error' ? 'bg-red-50' : ''}
                          `}
                        >
                          <TableCell className="text-center">
                            {!item.processado && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSelectItem(item.id)}
                                disabled={isProcessing}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-black">
                            {item.codigo_produto}
                          </TableCell>
                          <TableCell className="text-black text-xs md:text-sm">{item.descricao}</TableCell>
                          <TableCell className="text-center text-black text-xs md:text-sm">{item.quantidade}</TableCell>
                          <TableCell className="text-right text-black text-xs md:text-sm">
                            {formatCurrency(item.valor_unitario)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-black text-xs md:text-sm">
                            {formatCurrency(precoVenda)}
                          </TableCell>
                          <TableCell className="text-center">
                            {status === 'processing' && (
                              <Badge className="bg-blue-100 text-blue-800 gap-1 text-xs">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="hidden md:inline">Processando</span>
                              </Badge>
                            )}
                            {status === 'success' && (
                              <Badge className="bg-green-100 text-green-800 gap-1 text-xs">
                                <CheckCircle className="w-3 h-3" />
                                <span className="hidden md:inline">Processado</span>
                              </Badge>
                            )}
                            {status === 'error' && (
                              <Badge className="bg-red-100 text-red-800 gap-1 text-xs">
                                <AlertCircle className="w-3 h-3" />
                                <span className="hidden md:inline">Erro</span>
                              </Badge>
                            )}
                            {status === 'pending' && item.processado && (
                              <Badge className="bg-gray-100 text-gray-800 gap-1 text-xs">
                                <CheckCircle className="w-3 h-3" />
                                <span className="hidden md:inline">Já Processado</span>
                              </Badge>
                            )}
                            {status === 'pending' && !item.processado && isSelected && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 bg-white p-3 md:p-4 border-t flex flex-col-reverse sm:flex-row justify-end gap-2 md:gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 h-10 w-full sm:w-auto text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleProcessar}
              disabled={isProcessing || selectedItems.length === 0}
              className="bg-slate-600 hover:bg-slate-700 text-white gap-2 h-10"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Processando... ({currentProcessingIndex + 1}/{selectedItems.length})</span>
                  <span className="sm:hidden">({currentProcessingIndex + 1}/{selectedItems.length})</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Processar {selectedItems.length}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}