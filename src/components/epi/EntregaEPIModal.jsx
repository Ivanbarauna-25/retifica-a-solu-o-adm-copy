import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HardHat, Save, X, Plus, Trash2, Printer } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';

export default function EntregaEPIModal({ isOpen, onClose, funcionario, onSave }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [epis, setEpis] = useState([]);
  const [formData, setFormData] = useState({
    funcionario_id: '',
    data_entrega: new Date().toISOString().split('T')[0],
    itens: [],
    observacoes: ''
  });
  const [epiSelecionado, setEpiSelecionado] = useState('');
  const [quantidade, setQuantidade] = useState(1);

  useEffect(() => {
    if (isOpen) {
      fetchEPIs();
      setFormData({
        funcionario_id: funcionario?.id || '',
        data_entrega: new Date().toISOString().split('T')[0],
        itens: [],
        observacoes: ''
      });
    }
  }, [isOpen, funcionario]);

  const fetchEPIs = async () => {
    try {
      const data = await base44.entities.EPI.filter({ status: 'ativo' });
      setEpis(data || []);
    } catch (error) {
      console.error('Erro ao carregar EPIs:', error);
    }
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

    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, {
        epi_id: epi.id,
        epi_nome: epi.nome,
        numero_ca: epi.numero_ca || '',
        quantidade: quantidade,
        observacoes: ''
      }]
    }));

    setEpiSelecionado('');
    setQuantidade(1);
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateItemQtd = (index, qtd) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => 
        i === index ? { ...item, quantidade: Number(qtd) } : item
      )
    }));
  };

  const handleSubmit = async () => {
    if (formData.itens.length === 0) {
      toast({ title: 'Adicione pelo menos um EPI', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      
      const dataToSave = {
        ...formData,
        entregue_por: user?.full_name || user?.email || 'Sistema'
      };

      const entrega = await base44.entities.EntregaEPI.create(dataToSave);
      
      toast({ title: 'Entrega registrada com sucesso!' });
      onSave(entrega);
    } catch (error) {
      console.error('Erro ao registrar entrega:', error);
      toast({ title: 'Erro ao registrar entrega', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] modern-modal bg-white" style={{ overflowY: 'auto' }}>
        <DialogHeader className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b border-slate-600">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Registrar Entrega de EPI</h2>
              <p className="text-sm text-slate-300">{funcionario?.nome}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Data da Entrega */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-900">Data da Entrega *</Label>
              <Input
                type="date"
                value={formData.data_entrega}
                onChange={(e) => setFormData(prev => ({ ...prev, data_entrega: e.target.value }))}
              />
            </div>
          </div>

          {/* Adicionar EPI */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <h4 className="font-medium text-slate-900 mb-3">Adicionar EPI</h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label className="text-slate-700">EPI</Label>
                <Select value={epiSelecionado} onValueChange={setEpiSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um EPI" />
                  </SelectTrigger>
                  <SelectContent>
                    {epis.map(epi => (
                      <SelectItem key={epi.id} value={epi.id}>
                        {epi.nome} {epi.numero_ca ? `(CA: ${epi.numero_ca})` : ''}
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
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
              </div>
              <Button onClick={handleAddItem} className="bg-slate-800 hover:bg-slate-700 text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Lista de EPIs */}
          {formData.itens.length > 0 && (
            <div>
              <h4 className="font-medium text-slate-900 mb-3">EPIs a Entregar</h4>
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white">EPI</TableHead>
                    <TableHead className="text-white">CA</TableHead>
                    <TableHead className="text-white w-24">Qtd</TableHead>
                    <TableHead className="text-white w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.itens.map((item, index) => (
                    <TableRow key={index} className="bg-white">
                      <TableCell className="font-medium">{item.epi_nome}</TableCell>
                      <TableCell className="font-mono">{item.numero_ca || '-'}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) => handleUpdateItemQtd(index, e.target.value)}
                          className="w-20 h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Observações */}
          <div>
            <Label className="text-slate-900">Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações sobre a entrega..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-slate-200 px-6 pb-6">
          <Button variant="outline" onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white gap-2">
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || formData.itens.length === 0} className="bg-slate-800 hover:bg-slate-700 text-white gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? 'Salvando...' : 'Registrar Entrega'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}