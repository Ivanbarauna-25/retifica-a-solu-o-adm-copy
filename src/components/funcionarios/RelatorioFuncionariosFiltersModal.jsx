import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '@/utils';
import { FileText, Printer, FileSpreadsheet, X, Users, Filter, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 mb-4">
    {Icon && <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</span>
  </div>
);

const formatoOptions = [
  { value: 'visualizar', label: 'Visualizar / Imprimir', icon: Printer },
  { value: 'pdf',        label: 'PDF (gerar)',           icon: FileText },
  { value: 'excel',      label: 'Excel (XLSX)',          icon: FileSpreadsheet },
  { value: 'csv',        label: 'CSV',                   icon: FileText },
];

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
    nome: true, cpf: true, cargo: true, departamento: true, regime: true, status: true,
    telefone: false, email: false, data_inicio: false, salario: false, rg: false,
    data_nascimento: false, cep: false, logradouro: false, numero: false,
    complemento: false, bairro: false, cidade: false, uf: false,
    banco: false, agencia: false, conta: false, tipo_conta: false, pix: false
  });

  const handleCheckbox = (campo) => {
    setCamposSelecionados(prev => ({ ...prev, [campo]: !prev[campo] }));
  };

  const handleGenerate = () => {
    const campos = Object.keys(camposSelecionados).filter(k => camposSelecionados[k]).join(',');
    const params = new URLSearchParams();
    params.set('formato', formato);
    params.set('campos', campos);
    if (statusSelecionado && statusSelecionado !== 'todos') params.set('status', statusSelecionado);
    if (departamentoSelecionado && departamentoSelecionado !== 'todos') params.set('departamento_id', departamentoSelecionado);
    if (cargoSelecionado && cargoSelecionado !== 'todos') params.set('cargo_id', cargoSelecionado);
    params.set('ordenacao', ordenacao);
    const url = `${createPageUrl('RelatorioFuncionarios')}?${params.toString()}`;
    const w = window.open(url, '_blank');
    if (w) setTimeout(() => onClose(), 100);
    else onClose();
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
    { id: 'pix', label: 'PIX', grupo: 'Bancário' },
  ];

  const grupos = ['Básico', 'Profissional', 'Contato', 'Endereço', 'Bancário'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl border-0"
        data-custom-modal="true"
        onPointerDownOutside={e => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 rounded-t-xl flex-shrink-0" style={{ background: "#0B1629" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight" style={{color:'#fff'}}>Relatório de Funcionários</h2>
              <p className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.5)'}}>Selecione os campos e formato desejados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-slate-50">
          {/* Filtros */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <SectionHeader icon={Filter} title="Filtros do Relatório" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Status</Label>
                <Select value={statusSelecionado} onValueChange={setStatusSelecionado}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
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
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Departamento</Label>
                <Select value={departamentoSelecionado} onValueChange={setDepartamentoSelecionado}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {departamentos.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Cargo</Label>
                <Select value={cargoSelecionado} onValueChange={setCargoSelecionado}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {cargos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Ordenação</Label>
                <Select value={ordenacao} onValueChange={setOrdenacao}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
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

          {/* Formato de Exportação */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <SectionHeader icon={Download} title="Formato de Exportação" />
            <div className="space-y-2">
              {formatoOptions.map(opt => {
                const Icon = opt.icon;
                const isSelected = formato === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormato(opt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "border-blue-600" : "border-slate-300"
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                    </div>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campos */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <SectionHeader icon={FileText} title="Campos a Incluir no Relatório" />
            <div className="space-y-3">
              {grupos.map(grupo => {
                const campos = camposDisponiveis.filter(c => c.grupo === grupo);
                return (
                  <div key={grupo} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">{grupo}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {campos.map(campo => (
                        <div key={campo.id} className="flex items-center gap-2">
                          <Checkbox
                            id={campo.id}
                            checked={camposSelecionados[campo.id]}
                            onCheckedChange={() => handleCheckbox(campo.id)}
                            className="w-4 h-4"
                          />
                          <Label htmlFor={campo.id} className="text-sm font-normal cursor-pointer text-slate-700">
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 md:px-5 py-3 border-t border-slate-200 bg-white rounded-b-xl flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="h-9 px-4 text-sm border-slate-300 text-slate-700 gap-1.5">
            <X className="w-3.5 h-3.5" /> Cancelar
          </Button>
          <Button onClick={handleGenerate} className="h-9 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Gerar Relatório
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}