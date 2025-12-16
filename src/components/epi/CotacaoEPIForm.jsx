import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingCart, Save, X, Plus, Trash2, Users, Package } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/components/formatters';

export default function CotacaoEPIForm({ isOpen, onClose, cotacao, fornecedores = [], epis = [], funcionarios = [], cargos = [], onSave }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('itens');
  const [formData, setFormData] = useState({
    numero: '',
    data_cotacao: new Date().toISOString().split('T')[0],
    fornecedor_id: '',
    status: 'rascunho',
    itens: [],
    funcionarios_vinculados: [],
    observacoes: ''
  });

  const [epiSelecionado, setEpiSelecionado] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [precoUnitario, setPrecoUnitario] = useState('');

  useEffect(() => {
    if (cotacao) {
      setFormData({
        numero: cotacao.numero || '',
        data_cotacao: cotacao.data_cotacao || new Date().toISOString().split('T')[0],
        fornecedor_id: cotacao.fornecedor_id || '',
        status: cotacao.status || 'rascunho',
        itens: cotacao.itens || [],
        funcionarios_vinculados: cotacao.funcionarios_vinculados || [],
        observacoes: cotacao.observacoes || ''
      });
    } else {
      setFormData({
        numero: '',
        data_cotacao: new Date().toISOString().split('T')[0],
        fornecedor_id: '',
        status: 'rascunho',
        itens: [],
        funcionarios_vinculados: [],
        observacoes: ''
      });
    }
  }, [cotacao, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    if (!epiSelecionado) {
      toast({ title: 'Selecione um EPI', variant: 'destructive' });
      return;
    }

    const epi = epis.find(e => e.id === epiSelecionado);
    if (!epi) return;

    const jaExiste = formData.itens.find(item => item.epi_id === epiSelecionado);
    if (jaExiste) {
      toast({ title: 'Este EPI já foi adicionado', variant: 'destructive' });
      return;
    }

    const preco = precoUnitario ? Number(precoUnitario) : (epi.preco_referencia || 0);

    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, {
        epi_id: epi.id,
        epi_nome: epi.nome,
        quantidade: Number(quantidade),
        preco_unitario: preco,
        total_item: Number(quantidade) * preco
      }]
    }));

    setEpiSelecionado('');
    setQuantidade(1);
    setPrecoUnitario('');
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: Number(value) };
        updated.total_item = updated.quantidade * updated.preco_unitario;
        return updated;
      })
    }));
  };

  const getCargoNome = (cargoId) => {
    const cargo = cargos.find(c => c.id === cargoId);
    return cargo?.nome || '-';
  };

  const handleToggleFuncionario = (func) => {
    const existe = formData.funcionarios_vinculados.find(f => f.funcionario_id === func.id);
    
    if (existe) {
      setFormData(prev => ({
        ...prev,
        funcionarios_vinculados: prev.funcionarios_vinculados.filter(f => f.funcionario_id !== func.id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        funcionarios_vinculados: [...prev.funcionarios_vinculados, {
          funcionario_id: func.id,
          funcionario_nome: func.nome,
          cargo: getCargoNome(func.cargo_id),
          epis: []
        }]
      }));
    }
  };

  const handleUpdateFuncionarioEPIs = (funcId, epiId, checked) => {
    setFormData(prev => ({
      ...prev,
      funcionarios_vinculados: prev.funcionarios_vinculados.map(f => {
        if (f.funcionario_id !== funcId) return f;
        
        const epi = formData.itens.find(item => item.epi_id === epiId);
        if (!epi) return f;

        if (checked) {
          return {
            ...f,
            epis: [...(f.epis || []), { epi_id: epiId, epi_nome: epi.epi_nome, quantidade: 1 }]
          };
        } else {
          return {
            ...f,
            epis: (f.epis || []).filter(e => e.epi_id !== epiId)
          };
        }
      })
    }));
  };

  const calcularTotal = () => {
    return formData.itens.reduce((acc, item) => acc + (item.total_item || 0), 0);
  };

  const handleSubmit = async () => {
    if (formData.itens.length === 0) {
      toast({ title: 'Adicione pelo menos um EPI', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave = {
        ...formData,
        valor_total: calcularTotal(),
        fornecedor_id: formData.fornecedor_id || null
      };

      if (cotacao?.id) {
        await base44.entities.CotacaoEPI.update(cotacao.id, dataToSave);
      } else {
        await base44.entities.CotacaoEPI.create(dataToSave);
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar cotação:', error);
      toast({ title: 'Erro ao salvar cotação', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnviarParaAprovacao = async () => {
    if (formData.itens.length === 0) {
      toast({ title: 'Adicione pelo menos um EPI', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave = {
        ...formData,
        status: 'pendente',
        valor_total: calcularTotal(),
        fornecedor_id: formData.fornecedor_id || null
      };

      if (cotacao?.id) {
        await base44.entities.CotacaoEPI.update(cotacao.id, dataToSave);
      } else {
        await base44.entities.CotacaoEPI.create(dataToSave);
      }

      toast({ title: 'Cotação enviada para aprovação!' });
      onSave();
    } catch (error) {
      console.error('Erro ao enviar cotação:', error);
      toast({ title: 'Erro ao enviar cotação', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
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
            <div>
              <h2 className="text-xl font-bold">{cotacao ? 'Editar Cotação' : 'Nova Cotação de EPI'}</h2>
              <p className="text-sm text-slate-300">Selecione os EPIs e informe os preços</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="itens" className="gap-2">
                <Package className="w-4 h-4" />
                Itens da Cotação
              </TabsTrigger>
              <TabsTrigger value="funcionarios" className="gap-2">
                <Users className="w-4 h-4" />
                Funcionários
              </TabsTrigger>
            </TabsList>

            <TabsContent value="itens" className="space-y-6">
              {/* Dados Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-900">Número</Label>
                  <Input
                    value={formData.numero}
                    onChange={(e) => handleChange('numero', e.target.value)}
                    placeholder="Ex: COT-001"
                  />
                </div>
                <div>
                  <Label className="text-slate-900">Data *</Label>
                  <Input
                    type="date"
                    value={formData.data_cotacao}
                    onChange={(e) => handleChange('data_cotacao', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-slate-900">Fornecedor</Label>
                  <Select value={formData.fornecedor_id} onValueChange={(v) => handleChange('fornecedor_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Nenhum</SelectItem>
                      {fornecedores.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Adicionar EPI */}
              <div className="border rounded-lg p-4 bg-slate-50">
                <h4 className="font-medium text-slate-900 mb-3">Adicionar EPI</h4>
                <div className="flex gap-3 items-end flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-slate-700">EPI</Label>
                    <Select value={epiSelecionado} onValueChange={setEpiSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um EPI" />
                      </SelectTrigger>
                      <SelectContent>
                        {epis.map(epi => (
                          <SelectItem key={epi.id} value={epi.id}>
                            {epi.nome} {epi.preco_referencia ? `(Ref: ${formatCurrency(epi.preco_referencia)})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label className="text-slate-700">Qtd</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Label className="text-slate-700">Preço Unit.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={precoUnitario}
                      onChange={(e) => setPrecoUnitario(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <Button onClick={handleAddItem} className="bg-slate-800 hover:bg-slate-700 text-white">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Tabela de Itens */}
              {formData.itens.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Itens da Cotação</h4>
                  <Table>
                    <TableHeader className="bg-slate-700">
                      <TableRow>
                        <TableHead className="text-white">EPI</TableHead>
                        <TableHead className="text-white w-24">Qtd</TableHead>
                        <TableHead className="text-white w-32">Preço Unit.</TableHead>
                        <TableHead className="text-white w-32 text-right">Total</TableHead>
                        <TableHead className="text-white w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.itens.map((item, index) => (
                        <TableRow key={index} className="bg-white">
                          <TableCell className="font-medium">{item.epi_nome}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) => handleUpdateItem(index, 'quantidade', e.target.value)}
                              className="w-20 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.preco_unitario}
                              onChange={(e) => handleUpdateItem(index, 'preco_unitario', e.target.value)}
                              className="w-28 h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.total_item || 0)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 font-bold">
                        <TableCell colSpan={3} className="text-right">Total da Cotação:</TableCell>
                        <TableCell className="text-right text-lg">{formatCurrency(calcularTotal())}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Observações */}
              <div>
                <Label className="text-slate-900">Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                  placeholder="Observações sobre a cotação..."
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="funcionarios" className="space-y-6">
              <div className="text-sm text-slate-600 mb-4">
                Selecione os funcionários que receberão os EPIs desta cotação:
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>EPIs Selecionados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funcionarios.map((func) => {
                      const vinculado = formData.funcionarios_vinculados.find(f => f.funcionario_id === func.id);
                      return (
                        <TableRow key={func.id}>
                          <TableCell>
                            <Checkbox
                              checked={!!vinculado}
                              onCheckedChange={() => handleToggleFuncionario(func)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{func.nome}</TableCell>
                          <TableCell>{getCargoNome(func.cargo_id)}</TableCell>
                          <TableCell>
                            {vinculado && formData.itens.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {formData.itens.map(item => (
                                  <label key={item.epi_id} className="flex items-center gap-1 text-xs">
                                    <Checkbox
                                      checked={(vinculado.epis || []).some(e => e.epi_id === item.epi_id)}
                                      onCheckedChange={(checked) => handleUpdateFuncionarioEPIs(func.id, item.epi_id, checked)}
                                    />
                                    {item.epi_nome}
                                  </label>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-slate-200 px-6 pb-6">
          <Button variant="outline" onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white gap-2">
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-slate-600 hover:bg-slate-500 text-white gap-2">
            <Save className="w-4 h-4" />
            Salvar Rascunho
          </Button>
          <Button onClick={handleEnviarParaAprovacao} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <Save className="w-4 h-4" />
            Enviar para Aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}