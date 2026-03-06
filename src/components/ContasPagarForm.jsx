import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StandardModal, { ModalSection, FieldGrid, ModalField } from '@/components/ui/StandardModal';
import { CreditCard, FileText, DollarSign } from 'lucide-react';

export default function ContasPagarForm({ conta, fornecedores, planoContas, onSave, onClose }) {
  const [formData, setFormData] = useState({
    fornecedor_id: '', plano_contas_id: '', descricao: '', numero_documento: '',
    data_vencimento: '', data_pagamento: '', competencia: '',
    valor_original: '', valor_pago: '', juros_multa: '0', desconto: '0',
    status: 'pendente', observacoes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { if (conta) setFormData({ ...conta }); }, [conta]);

  useEffect(() => {
    if (formData.data_vencimento && !formData.competencia) {
      const data = new Date(formData.data_vencimento + 'T00:00:00');
      setFormData(prev => ({
        ...prev,
        competencia: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
      }));
    }
  }, [formData.data_vencimento]);

  const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target?.value ?? e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  const contasDespesa = planoContas.filter(c => c.tipo === 'despesa' && c.ativa);

  const tabs = [
    {
      value: 'geral',
      label: 'Dados Gerais',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <FieldGrid cols={2}>
            <ModalField label="Fornecedor">
              <Select value={formData.fornecedor_id} onValueChange={set('fornecedor_id')}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </ModalField>
            <ModalField label="Categoria">
              <Select value={formData.plano_contas_id} onValueChange={set('plano_contas_id')}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {contasDespesa.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </ModalField>
            <ModalField label="Descrição" required colSpan={2}>
              <Input value={formData.descricao} onChange={set('descricao')} required />
            </ModalField>
          </FieldGrid>

          <FieldGrid cols={3}>
            <ModalField label="Nº Documento">
              <Input value={formData.numero_documento} onChange={set('numero_documento')} />
            </ModalField>
            <ModalField label="Vencimento" required>
              <Input type="date" value={formData.data_vencimento} onChange={set('data_vencimento')} required />
            </ModalField>
            <ModalField label="Competência" required>
              <Input type="month" value={formData.competencia} onChange={set('competencia')} required />
            </ModalField>
          </FieldGrid>
        </div>
      )
    },
    {
      value: 'valores',
      label: 'Valores',
      icon: DollarSign,
      content: (
        <div className="space-y-4">
          <FieldGrid cols={3}>
            <ModalField label="Valor Original" required>
              <Input type="number" step="0.01" value={formData.valor_original} onChange={set('valor_original')} required />
            </ModalField>
            <ModalField label="Juros/Multa">
              <Input type="number" step="0.01" value={formData.juros_multa} onChange={set('juros_multa')} />
            </ModalField>
            <ModalField label="Desconto">
              <Input type="number" step="0.01" value={formData.desconto} onChange={set('desconto')} />
            </ModalField>
          </FieldGrid>

          <FieldGrid cols={3}>
            <ModalField label="Valor Pago">
              <Input type="number" step="0.01" value={formData.valor_pago} onChange={set('valor_pago')} />
            </ModalField>
            <ModalField label="Data Pagamento">
              <Input type="date" value={formData.data_pagamento} onChange={set('data_pagamento')} />
            </ModalField>
            <ModalField label="Status">
              <Select value={formData.status} onValueChange={set('status')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </ModalField>
          </FieldGrid>

          <ModalField label="Observações">
            <Textarea value={formData.observacoes} onChange={set('observacoes')} rows={3} className="resize-none" />
          </ModalField>
        </div>
      )
    }
  ];

  return (
    <StandardModal
      open={true}
      onClose={onClose}
      title={conta ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
      subtitle="Preencha os dados da conta"
      icon={CreditCard}
      size="lg"
      tabs={tabs}
      activeTab="geral"
      onTabChange={() => {}}
      onSave={handleSubmit}
      isSaving={isSaving}
      onSubmit={handleSubmit}
    />
  );
}