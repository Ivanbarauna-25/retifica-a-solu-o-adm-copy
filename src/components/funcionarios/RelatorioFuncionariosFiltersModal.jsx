import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '@/utils';
import { FileText, Printer, FileSpreadsheet, X, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RelatorioFuncionariosFiltersModal({ 
  isOpen, 
  onClose, 
  funcionarios = [],
  cargos = [],
  departamentos = [],
  filtroStatus = '',
  filtroDepartamento = '',
  filtroCargo = ''
}) {
  const [formato, setFormato] = useState('visualizar');
  const [statusSelecionado, setStatusSelecionado] = useState(filtroStatus || '');
  const [departamentoSelecionado, setDepartamentoSelecionado] = useState(filtroDepartamento || '');
  const [cargoSelecionado, setCargoSelecionado] = useState(filtroCargo || '');
  const [ordenacao, setOrdenacao] = useState('nome');
  const [camposSelecionados, setCamposSelecionados] = useState({
    nome: true,
    cpf: true,
    cargo: true,
    departamento: true,
    regime: true,
    status: true,
    telefone: false,
    email: false,
    data_inicio: false,
    salario: false,
    rg: false,
    data_nascimento: false,
    cep: false,
    logradouro: false,
    numero: false,
    complemento: false,
    bairro: false,
    cidade: false,
    uf: false,
    banco: false,
    agencia: false,
    conta: false,
    tipo_conta: false,
    pix: false
  });

  const handleCheckboxChange = (campo) => {
    setCamposSelecionados(prev => ({
      ...prev,
      [campo]: !prev[campo]
    }));
  };

  const handleGenerateRelatorio = () => {
    const campos = Object.keys(camposSelecionados)
      .filter(key => camposSelecionados[key])
      .join(',');
    
    const params = new URLSearchParams();
    params.set('formato', formato);
    params.set('campos', campos);
    if (statusSelecionado && statusSelecionado !== 'todos') params.set('status', statusSelecionado);
    if (departamentoSelecionado && departamentoSelecionado !== 'todos') params.set('departamento_id', departamentoSelecionado);
    if (cargoSelecionado && cargoSelecionado !== 'todos') params.set('cargo_id', cargoSelecionado);
    params.set('ordenacao', ordenacao);
    
    const url = `${createPageUrl('RelatorioFuncionarios')}?${params.toString()}`;
    const newWindow = window.open(url, '_blank');
    
    if (newWindow) {
      setTimeout(() => onClose(), 100);
    } else {
      console.warn('Pop-up bloqueado pelo navegador');
      onClose();
    }
  };

  const camposDisponiveis = [
    { id: 'nome', label: 'Nome', grupo: 'Básico' },
    { id: 'cpf', label: 'CPF', grupo: 'Básico' },
    { id: 'rg', label: 'RG', grupo: 'Básico' },
    { id: 'data_nascimento', label: 'Data de Nascimento', grupo: 'Básico' },
    { id: 'cargo', label: 'Cargo', grupo: 'Profissional' },
    { id: 'departamento', label: 'Departamento', grupo: 'Profissional' },
    { id: 'regime', label: 'Regime', grupo: 'Profissional' },
    { id: 'status', label: 'Status', grupo: 'Profissional' },
    { id: 'data_inicio', label: 'Data de Início', grupo: 'Profissional' },
    { id: 'salario', label: 'Salário', grupo: 'Profissional' },
    { id: 'telefone', label: 'Telefone', grupo: 'Contato' },
    { id: 'email', label: 'Email', grupo: 'Contato' },
    { id: 'cep', label: 'CEP', grupo: 'Endereço' },
    { id: 'logradouro', label: 'Logradouro', grupo: 'Endereço' },
    { id: 'numero', label: 'Número', grupo: 'Endereço' },
    { id: 'complemento', label: 'Complemento', grupo: 'Endereço' },
    { id: 'bairro', label: 'Bairro', grupo: 'Endereço' },
    { id: 'cidade', label: 'Cidade', grupo: 'Endereço' },
    { id: 'uf', label: 'UF', grupo: 'Endereço' },
    { id: 'banco', label: 'Banco', grupo: 'Bancário' },
    { id: 'agencia', label: 'Agência', grupo: 'Bancário' },
    { id: 'conta', label: 'Conta', grupo: 'Bancário' },
    { id: 'tipo_conta', label: 'Tipo de Conta', grupo: 'Bancário' },
    { id: 'pix', label: 'PIX', grupo: 'Bancário' }
  ];

  const grupos = ['Básico', 'Profissional', 'Contato', 'Endereço', 'Bancário'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] modern-modal bg-white"
        onPointerDownOutside={(e) => e.preventDefault()}
        style={{
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#94a3b8 #f1f5f9'
        }}
      >
        <style>{`
          .modern-modal::-webkit-scrollbar {
            width: 8px;
          }
          .modern-modal::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .modern-modal::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 4px;
          }
          .modern-modal::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}</style>

        <DialogHeader className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white no-print border-b border-slate-600">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Gerar Relatório de Funcionários</h2>
              <p className="text-sm text-slate-300">Selecione os campos e formato desejados</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Filtros */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-slate-900">Filtros do Relatório</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-slate-700 mb-1 block">Status</Label>
                <Select value={statusSelecionado} onValueChange={setStatusSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="experiencia">Experiência</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                    <SelectItem value="demitido">Demitido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-slate-700 mb-1 block">Departamento</Label>
                <Select value={departamentoSelecionado} onValueChange={setDepartamentoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {departamentos.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-slate-700 mb-1 block">Cargo</Label>
                <Select value={cargoSelecionado} onValueChange={setCargoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {cargos.map(cargo => (
                      <SelectItem key={cargo.id} value={cargo.id}>{cargo.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-slate-700 mb-1 block">Ordenação</Label>
                <Select value={ordenacao} onValueChange={setOrdenacao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nome">Nome</SelectItem>
                    <SelectItem value="salario">Salário</SelectItem>
                    <SelectItem value="data_inicio">Data de Início</SelectItem>
                    <SelectItem value="departamento">Departamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold text-slate-900">Formato de Exportação</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="visualizar"
                  name="formato"
                  value="visualizar"
                  checked={formato === 'visualizar'}
                  onChange={(e) => setFormato(e.target.value)}
                  className="w-4 h-4"
                />
                <Label htmlFor="visualizar" className="flex items-center gap-2 cursor-pointer text-slate-900">
                  <Printer className="w-4 h-4" />
                  Visualizar/Imprimir
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="pdf"
                  name="formato"
                  value="pdf"
                  checked={formato === 'pdf'}
                  onChange={(e) => setFormato(e.target.value)}
                  className="w-4 h-4"
                />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer text-slate-900">
                  <FileText className="w-4 h-4" />
                  PDF (gerar)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="excel"
                  name="formato"
                  value="excel"
                  checked={formato === 'excel'}
                  onChange={(e) => setFormato(e.target.value)}
                  className="w-4 h-4"
                />
                <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer text-slate-900">
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel (XLSX)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="csv"
                  name="formato"
                  value="csv"
                  checked={formato === 'csv'}
                  onChange={(e) => setFormato(e.target.value)}
                  className="w-4 h-4"
                />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer text-slate-900">
                  <FileText className="w-4 h-4" />
                  CSV
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold text-slate-900">Campos a Incluir no Relatório</Label>
            
            {grupos.map(grupo => {
              const camposDoGrupo = camposDisponiveis.filter(c => c.grupo === grupo);
              return (
                <div key={grupo} className="border rounded-lg p-4 space-y-2 bg-slate-50">
                  <h4 className="font-medium text-sm text-slate-900 mb-3">{grupo}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {camposDoGrupo.map(campo => (
                      <div key={campo.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={campo.id}
                          checked={camposSelecionados[campo.id]}
                          onCheckedChange={() => handleCheckboxChange(campo.id)}
                        />
                        <Label
                          htmlFor={campo.id}
                          className="text-sm font-normal cursor-pointer text-slate-900"
                        >
                          {campo.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-slate-200 px-6 pb-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerateRelatorio}
            className="bg-slate-800 hover:bg-slate-700 text-white gap-2"
          >
            <Printer className="w-4 h-4" />
            Gerar Relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}