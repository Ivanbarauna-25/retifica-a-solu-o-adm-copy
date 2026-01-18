import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Save, X, DollarSign } from 'lucide-react';
import SmartInput from '@/components/SmartInput';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';

export default function NotaFiscalForm({ isOpen, onClose, nota, fornecedores, onSaved }) {
  const [formData, setFormData] = useState({
    numero_nota: '',
    serie: '',
    fornecedor_id: '',
    data_emissao: '',
    data_entrada: '',
    chave_acesso: '',
    valor_total: 0,
    valor_produtos: 0,
    valor_icms: 0,
    valor_ipi: 0,
    valor_frete: 0,
    valor_seguro: 0,
    valor_desconto: 0,
    valor_outras_despesas: 0,
    status: 'pendente',
    observacoes: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if (nota) {
      setFormData(nota);
    } else {
      const hoje = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        data_emissao: hoje,
        data_entrada: hoje
      }));
    }
  }, [nota]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.numero_nota || !formData.fornecedor_id || !formData.data_emissao) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha número da nota, fornecedor e data de emissão.',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (nota) {
        await base44.entities.NotaFiscalEntrada.update(nota.id, formData);
        toast({ title: '✅ Nota atualizada com sucesso!' });
      } else {
        await base44.entities.NotaFiscalEntrada.create(formData);
        toast({ title: '✅ Nota criada com sucesso!' });
      }
      onSaved();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <style>{`
        .nota-form-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .nota-form-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .nota-form-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .nota-form-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .nota-form-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .nota-form-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .nota-form-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .nota-form-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .nota-form-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .nota-form-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-4xl h-[95vh] md:max-h-[90vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-3 md:px-6 py-3 md:py-4 sticky top-0 z-10">
            <DialogTitle className="flex items-center gap-3 text-white">
              <FileText className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-base md:text-lg">{nota ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="nota-form-scroll flex-1 px-3 md:px-6 pb-3 md:pb-6">
            <Tabs defaultValue="dados" className="mt-4">
              <TabsList className="grid grid-cols-3 bg-slate-100 p-1 rounded-lg sticky top-0 z-10">
                <TabsTrigger value="dados" className="TabsTrigger data-[state=active]:bg-slate-800 data-[state=active]:text-white text-black text-xs md:text-sm">Dados da Nota</TabsTrigger>
                <TabsTrigger value="valores" className="TabsTrigger data-[state=active]:bg-slate-800 data-[state=active]:text-white text-black text-xs md:text-sm">Valores</TabsTrigger>
                <TabsTrigger value="obs" className="TabsTrigger data-[state=active]:bg-slate-800 data-[state=active]:text-white text-black text-xs md:text-sm">Observações</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4 md:mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label className="text-sm font-medium text-black">Número da Nota *</Label>
                    <Input
                      value={formData.numero_nota}
                      onChange={(e) => handleChange('numero_nota', e.target.value)}
                      placeholder="123456"
                      className="mt-1.5 bg-white text-black"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black">Série</Label>
                    <Input
                      value={formData.serie}
                      onChange={(e) => handleChange('serie', e.target.value)}
                      placeholder="1"
                      className="mt-1.5 bg-white text-black"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium text-black">Fornecedor *</Label>
                    <SmartInput
                      options={fornecedores.map(f => ({ value: f.id, label: f.nome }))}
                      value={formData.fornecedor_id}
                      onChange={(v) => handleChange('fornecedor_id', v)}
                      placeholder="Selecione o fornecedor..."
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black">Data de Emissão *</Label>
                    <Input
                      type="date"
                      value={formData.data_emissao}
                      onChange={(e) => handleChange('data_emissao', e.target.value)}
                      className="mt-1.5 bg-white text-black"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black">Data de Entrada</Label>
                    <Input
                      type="date"
                      value={formData.data_entrada}
                      onChange={(e) => handleChange('data_entrada', e.target.value)}
                      className="mt-1.5 bg-white text-black"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium text-black">Chave de Acesso (44 dígitos)</Label>
                    <Input
                      value={formData.chave_acesso}
                      onChange={(e) => handleChange('chave_acesso', e.target.value)}
                      placeholder="00000000000000000000000000000000000000000000"
                      maxLength={44}
                      className="mt-1.5 font-mono text-xs bg-white text-black"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                      <SelectTrigger className="mt-1.5 bg-white text-black">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="processada">Processada</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="valores" className="space-y-4 mt-4 md:mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label className="text-sm font-medium text-black">Valor Produtos</Label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_produtos}
                        onChange={(e) => handleChange('valor_produtos', Number(e.target.value))}
                        className="pl-9 bg-white text-black"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black">Valor Total *</Label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_total}
                        onChange={(e) => handleChange('valor_total', Number(e.target.value))}
                        className="pl-9 bg-white text-black"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black">ICMS</Label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_icms}
                        onChange={(e) => handleChange('valor_icms', Number(e.target.value))}
                        className="pl-9 bg-white text-black"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black">IPI</Label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_ipi}
                        onChange={(e) => handleChange('valor_ipi', Number(e.target.value))}
                        className="pl-9 bg-white text-black"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black">Frete</Label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_frete}
                        onChange={(e) => handleChange('valor_frete', Number(e.target.value))}
                        className="pl-9 bg-white text-black"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black">Seguro</Label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_seguro}
                        onChange={(e) => handleChange('valor_seguro', Number(e.target.value))}
                        className="pl-9 bg-white text-black"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black">Desconto</Label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_desconto}
                        onChange={(e) => handleChange('valor_desconto', Number(e.target.value))}
                        className="pl-9 bg-white text-black"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-black">Outras Despesas</Label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_outras_despesas}
                        onChange={(e) => handleChange('valor_outras_despesas', Number(e.target.value))}
                        className="pl-9 bg-white text-black"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="obs" className="mt-4 md:mt-6">
                <Label className="text-sm font-medium text-black">Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                  rows={12}
                  className="mt-1.5 bg-white text-black"
                  placeholder="Digite observações sobre esta nota fiscal..."
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 md:gap-3 px-3 md:px-6 py-3 md:py-4 border-t bg-white">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="bg-slate-600 hover:bg-slate-700 text-white gap-2 h-10 w-full sm:w-auto text-sm"
            >
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              className="gap-2 bg-slate-600 hover:bg-slate-700 text-white h-10"
            >
              <Save className="w-4 h-4" /> {nota ? 'Salvar' : 'Criar Nota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}