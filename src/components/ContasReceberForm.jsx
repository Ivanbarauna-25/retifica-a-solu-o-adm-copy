import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ContasReceberForm({ conta, clientes, ordensServico, planoContas, onSave, onClose }) {
  const [formData, setFormData] = useState({
    cliente_id: '',
    plano_contas_id: '',
    ordem_servico_id: '',
    descricao: '',
    numero_documento: '',
    data_vencimento: '',
    data_recebimento: '',
    competencia: '',
    valor_original: '',
    valor_recebido: '',
    juros_multa: '0',
    desconto: '0',
    status: 'pendente',
    observacoes: ''
  });

  useEffect(() => {
    if (conta) {
      setFormData({ ...conta });
    }
  }, [conta]);

  useEffect(() => {
    if (formData.data_vencimento && !formData.competencia) {
      const data = new Date(formData.data_vencimento + 'T00:00:00');
      const competencia = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, competencia }));
    }
  }, [formData.data_vencimento]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const contasReceita = planoContas.filter(conta => conta.tipo === 'receita' && conta.ativa);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto text-black">
        <DialogHeader>
          <DialogTitle className="text-black">{conta ? 'Editar' : 'Nova'} Conta a Receber</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_id" className="text-black">Cliente *</Label>
              <Select value={formData.cliente_id} onValueChange={(value) => handleSelectChange('cliente_id', value)}>
                <SelectTrigger className="text-black">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(cliente => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="plano_contas_id" className="text-black">Categoria *</Label>
              <Select value={formData.plano_contas_id} onValueChange={(value) => handleSelectChange('plano_contas_id', value)}>
                <SelectTrigger className="text-black">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {contasReceita.map(conta => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.codigo} - {conta.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ordem_servico_id" className="text-black">Ordem de Serviço (opcional)</Label>
            <Select value={formData.ordem_servico_id} onValueChange={(value) => handleSelectChange('ordem_servico_id', value)}>
              <SelectTrigger className="text-black">
                <SelectValue placeholder="Selecione a OS (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhuma OS</SelectItem>
                {ordensServico.map(os => (
                  <SelectItem key={os.id} value={os.id}>
                    {os.numero_os} - {os.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-black">Descrição *</Label>
            <Input id="descricao" value={formData.descricao} onChange={handleChange} required className="text-black" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_documento" className="text-black">Número do Documento</Label>
              <Input id="numero_documento" value={formData.numero_documento} onChange={handleChange} className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_vencimento" className="text-black">Data de Vencimento *</Label>
              <Input id="data_vencimento" type="date" value={formData.data_vencimento} onChange={handleChange} required className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competencia" className="text-black">Competência *</Label>
              <Input 
                id="competencia" 
                type="month" 
                value={formData.competencia} 
                onChange={handleChange} 
                required 
                placeholder="AAAA-MM"
                className="text-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_original" className="text-black">Valor Original *</Label>
              <Input id="valor_original" type="number" step="0.01" value={formData.valor_original} onChange={handleChange} required className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="juros_multa" className="text-black">Juros/Multa</Label>
              <Input id="juros_multa" type="number" step="0.01" value={formData.juros_multa} onChange={handleChange} className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desconto" className="text-black">Desconto</Label>
              <Input id="desconto" type="number" step="0.01" value={formData.desconto} onChange={handleChange} className="text-black" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_recebido" className="text-black">Valor Recebido</Label>
              <Input id="valor_recebido" type="number" step="0.01" value={formData.valor_recebido} onChange={handleChange} className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_recebimento" className="text-black">Data do Recebimento</Label>
              <Input id="data_recebimento" type="date" value={formData.data_recebimento} onChange={handleChange} className="text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-black">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger className="text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes" className="text-black">Observações</Label>
            <Textarea id="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} className="text-black" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}