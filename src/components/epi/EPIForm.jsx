import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HardHat, Save, X, Upload, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

const categoriaOptions = [
  { value: 'cabeca', label: 'Proteção da Cabeça' },
  { value: 'olhos_face', label: 'Proteção dos Olhos e Face' },
  { value: 'auditivo', label: 'Proteção Auditiva' },
  { value: 'respiratorio', label: 'Proteção Respiratória' },
  { value: 'tronco', label: 'Proteção do Tronco' },
  { value: 'membros_superiores', label: 'Proteção dos Membros Superiores' },
  { value: 'membros_inferiores', label: 'Proteção dos Membros Inferiores' },
  { value: 'corpo_inteiro', label: 'Proteção do Corpo Inteiro' },
  { value: 'quedas', label: 'Proteção Contra Quedas' }
];

const unidadeOptions = ['UN', 'PAR', 'KIT', 'CX', 'PCT'];

export default function EPIForm({ isOpen, onClose, epi, fornecedores = [], cargos = [], onSave }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    numero_ca: '',
    validade_ca: '',
    vida_util_meses: '',
    categoria: '',
    unidade: 'UN',
    preco_referencia: '',
    fornecedor_padrao_id: '',
    cargos_ids: [],
    foto_url: '',
    status: 'ativo',
    observacoes: ''
  });

  useEffect(() => {
    if (epi) {
      setFormData({
        nome: epi.nome || '',
        descricao: epi.descricao || '',
        numero_ca: epi.numero_ca || '',
        validade_ca: epi.validade_ca || '',
        vida_util_meses: epi.vida_util_meses || '',
        categoria: epi.categoria || '',
        unidade: epi.unidade || 'UN',
        preco_referencia: epi.preco_referencia || '',
        fornecedor_padrao_id: epi.fornecedor_padrao_id || '',
        cargos_ids: epi.cargos_ids || [],
        foto_url: epi.foto_url || '',
        status: epi.status || 'ativo',
        observacoes: epi.observacoes || ''
      });
    } else {
      setFormData({
        nome: '',
        descricao: '',
        numero_ca: '',
        validade_ca: '',
        vida_util_meses: '',
        categoria: '',
        unidade: 'UN',
        preco_referencia: '',
        fornecedor_padrao_id: '',
        cargos_ids: [],
        foto_url: '',
        status: 'ativo',
        observacoes: ''
      });
    }
  }, [epi, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUploadFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, foto_url: file_url }));
      toast({ title: 'Foto enviada com sucesso!' });
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      toast({ title: 'Erro ao enviar foto', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.categoria) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave = {
        ...formData,
        vida_util_meses: formData.vida_util_meses ? Number(formData.vida_util_meses) : null,
        preco_referencia: formData.preco_referencia ? Number(formData.preco_referencia) : null,
        fornecedor_padrao_id: formData.fornecedor_padrao_id || null,
        cargos_ids: formData.cargos_ids || []
      };

      if (epi?.id) {
        await base44.entities.EPI.update(epi.id, dataToSave);
      } else {
        await base44.entities.EPI.create(dataToSave);
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar EPI:', error);
      toast({ title: 'Erro ao salvar EPI', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] modern-modal bg-white" style={{ overflowY: 'auto' }}>
        <DialogHeader className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b border-slate-600">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{epi ? 'Editar EPI' : 'Novo EPI'}</h2>
              <p className="text-sm text-slate-300">Preencha as informações do equipamento</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-slate-900">Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Ex: Capacete de Segurança"
                required
              />
            </div>

            <div>
              <Label className="text-slate-900">Categoria *</Label>
              <Select value={formData.categoria} onValueChange={(v) => handleChange('categoria', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categoriaOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-900">Número do CA</Label>
              <Input
                value={formData.numero_ca}
                onChange={(e) => handleChange('numero_ca', e.target.value)}
                placeholder="Ex: 12345"
              />
            </div>

            <div>
              <Label className="text-slate-900">Validade do CA</Label>
              <Input
                type="date"
                value={formData.validade_ca}
                onChange={(e) => handleChange('validade_ca', e.target.value)}
              />
            </div>

            <div>
              <Label className="text-slate-900">Vida Útil (meses)</Label>
              <Input
                type="number"
                value={formData.vida_util_meses}
                onChange={(e) => handleChange('vida_util_meses', e.target.value)}
                placeholder="Ex: 12"
              />
            </div>

            <div>
              <Label className="text-slate-900">Unidade</Label>
              <Select value={formData.unidade} onValueChange={(v) => handleChange('unidade', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="UN" />
                </SelectTrigger>
                <SelectContent>
                  {unidadeOptions.map(un => (
                    <SelectItem key={un} value={un}>{un}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-900">Preço de Referência</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.preco_referencia}
                onChange={(e) => handleChange('preco_referencia', e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label className="text-slate-900">Fornecedor Padrão</Label>
              <Select value={formData.fornecedor_padrao_id} onValueChange={(v) => handleChange('fornecedor_padrao_id', v)}>
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

            <div>
              <Label className="text-slate-900">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label className="text-slate-900">Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                placeholder="Descrição detalhada do EPI..."
                rows={3}
              />
            </div>

            {/* Cargos que utilizam este EPI */}
            <div className="md:col-span-2">
              <Label className="text-slate-900 flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" />
                Cargos que utilizam este EPI
              </Label>
              <div className="border rounded-lg p-4 bg-slate-50 max-h-40 overflow-y-auto">
                {cargos.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum cargo cadastrado</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {cargos.map(cargo => (
                      <label key={cargo.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded">
                        <Checkbox
                          checked={formData.cargos_ids?.includes(cargo.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleChange('cargos_ids', [...(formData.cargos_ids || []), cargo.id]);
                            } else {
                              handleChange('cargos_ids', (formData.cargos_ids || []).filter(id => id !== cargo.id));
                            }
                          }}
                        />
                        {cargo.nome}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <Label className="text-slate-900">Foto do EPI</Label>
              <div className="flex items-center gap-4">
                {formData.foto_url && (
                  <img src={formData.foto_url} alt="EPI" className="w-20 h-20 object-cover rounded-lg border" />
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFoto}
                    className="hidden"
                    id="foto-epi"
                  />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('foto-epi').click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.foto_url ? 'Trocar Foto' : 'Enviar Foto'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label className="text-slate-900">Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>
          </div>
        </form>

        <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-slate-200 px-6 pb-6">
          <Button variant="outline" onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white gap-2">
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-slate-800 hover:bg-slate-700 text-white gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}