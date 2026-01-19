import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingCart, Save, X, Users, Package, HardHat } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/components/formatters';

export default function CotacaoEPIForm({ isOpen, onClose, cotacao, fornecedores = [], epis = [], funcionarios = [], cargos = [], onSave }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    numero: '',
    data_cotacao: new Date().toISOString().split('T')[0],
    fornecedor_id: '',
    status: 'rascunho',
    itens: [],
    funcionarios_vinculados: [],
    observacoes: ''
  });

  // Estado para controle de seleção de funcionários e quantidades
  const [funcionariosSelecionados, setFuncionariosSelecionados] = useState({});

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

      // Reconstruir estado de funcionários selecionados
      const selecionados = {};
      (cotacao.funcionarios_vinculados || []).forEach(fv => {
        selecionados[fv.funcionario_id] = {
          selecionado: true,
          epis: {}
        };
        (fv.epis || []).forEach(epi => {
          selecionados[fv.funcionario_id].epis[epi.epi_id] = {
            selecionado: true,
            quantidade: epi.quantidade || 1
          };
        });
      });
      setFuncionariosSelecionados(selecionados);
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
      setFuncionariosSelecionados({});
    }
  }, [cotacao, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Obter EPIs permitidos para um cargo
  const getEPIsDoCargo = (cargoId) => {
    return epis.filter(epi => epi.cargos_ids?.includes(cargoId));
  };

  // Obter nome do cargo
  const getCargoNome = (cargoId) => {
    const cargo = cargos.find(c => c.id === cargoId);
    return cargo?.nome || '-';
  };

  // Toggle seleção de funcionário
  const handleToggleFuncionario = (funcId) => {
    setFuncionariosSelecionados(prev => {
      const novoEstado = { ...prev };
      if (novoEstado[funcId]?.selecionado) {
        delete novoEstado[funcId];
      } else {
        const func = funcionarios.find(f => f.id === funcId);
        const episDoCargo = getEPIsDoCargo(func?.cargo_id);
        novoEstado[funcId] = {
          selecionado: true,
          epis: {}
        };
        // Pré-selecionar todos os EPIs do cargo
        episDoCargo.forEach(epi => {
          novoEstado[funcId].epis[epi.id] = { selecionado: true, quantidade: 1 };
        });
      }
      return novoEstado;
    });
  };

  // Toggle seleção de EPI para funcionário
  const handleToggleEPI = (funcId, epiId) => {
    setFuncionariosSelecionados(prev => {
      const novoEstado = { ...prev };
      if (!novoEstado[funcId]) return prev;

      if (novoEstado[funcId].epis[epiId]?.selecionado) {
        delete novoEstado[funcId].epis[epiId];
      } else {
        novoEstado[funcId].epis[epiId] = { selecionado: true, quantidade: 1 };
      }
      return novoEstado;
    });
  };

  // Atualizar quantidade de EPI para funcionário
  const handleUpdateQuantidade = (funcId, epiId, quantidade) => {
    setFuncionariosSelecionados(prev => {
      const novoEstado = { ...prev };
      if (!novoEstado[funcId]?.epis[epiId]) return prev;
      novoEstado[funcId].epis[epiId].quantidade = Math.max(1, Number(quantidade) || 1);
      return novoEstado;
    });
  };

  // Calcular itens consolidados e total
  const { itensConsolidados, valorTotal, funcionariosVinculados } = useMemo(() => {
    const itensMap = {};
    const funcVinculados = [];

    Object.entries(funcionariosSelecionados).forEach(([funcId, dados]) => {
      if (!dados.selecionado) return;

      const func = funcionarios.find(f => f.id === funcId);
      if (!func) return;

      const episDoFunc = [];

      Object.entries(dados.epis).forEach(([epiId, epiDados]) => {
        if (!epiDados.selecionado) return;

        const epi = epis.find(e => e.id === epiId);
        if (!epi) return;

        const qtd = epiDados.quantidade || 1;

        episDoFunc.push({
          epi_id: epiId,
          epi_nome: epi.nome,
          quantidade: qtd
        });

        if (!itensMap[epiId]) {
          itensMap[epiId] = {
            epi_id: epiId,
            epi_nome: epi.nome,
            quantidade: 0,
            preco_unitario: epi.preco_referencia || 0,
            total_item: 0
          };
        }
        itensMap[epiId].quantidade += qtd;
        itensMap[epiId].total_item = itensMap[epiId].quantidade * itensMap[epiId].preco_unitario;
      });

      if (episDoFunc.length > 0) {
        funcVinculados.push({
          funcionario_id: funcId,
          funcionario_nome: func.nome,
          cargo: getCargoNome(func.cargo_id),
          epis: episDoFunc
        });
      }
    });

    const itensArray = Object.values(itensMap);
    const total = itensArray.reduce((acc, item) => acc + item.total_item, 0);

    return { itensConsolidados: itensArray, valorTotal: total, funcionariosVinculados: funcVinculados };
  }, [funcionariosSelecionados, funcionarios, epis, cargos]);

  const handleSubmit = async (status = 'rascunho') => {
    if (itensConsolidados.length === 0) {
      toast({ title: 'Selecione pelo menos um EPI para um funcionário', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave = {
        ...formData,
        status,
        itens: itensConsolidados,
        funcionarios_vinculados: funcionariosVinculados,
        valor_total: valorTotal,
        fornecedor_id: formData.fornecedor_id || null
      };

      if (cotacao?.id) {
        await base44.entities.CotacaoEPI.update(cotacao.id, dataToSave);
      } else {
        await base44.entities.CotacaoEPI.create(dataToSave);
      }

      if (status === 'pendente') {
        toast({ title: 'Cotação enviada para aprovação!' });
      }
      onSave();
    } catch (error) {
      console.error('Erro ao salvar cotação:', error);
      toast({ title: 'Erro ao salvar cotação', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Agrupar funcionários por cargo
  const funcionariosPorCargo = useMemo(() => {
    const grupos = {};
    funcionarios.forEach(func => {
      const cargoNome = getCargoNome(func.cargo_id);
      if (!grupos[cargoNome]) {
        grupos[cargoNome] = { cargo_id: func.cargo_id, funcionarios: [] };
      }
      grupos[cargoNome].funcionarios.push(func);
    });
    return grupos;
  }, [funcionarios, cargos]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] md:max-w-6xl p-0 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[95vh] flex flex-col">
        <DialogHeader className="sticky top-0 z-10 px-3 md:px-6 py-3 md:py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 md:gap-3 text-white">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-white/20 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm md:text-xl font-bold">{cotacao ? 'Editar Cotação' : 'Nova Cotação'}</h2>
              <p className="text-xs md:text-sm text-slate-300">Selecione funcionários e EPIs</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 md:p-6 space-y-3 md:space-y-6 text-black overflow-y-auto flex-1">
          {/* Dados Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
            <div>
              <Label className="text-slate-900 text-xs md:text-sm">Número</Label>
              <Input
                value={formData.numero}
                onChange={(e) => handleChange('numero', e.target.value)}
                placeholder="Ex: COT-001"
                className="h-9 md:h-10 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-900 text-xs md:text-sm">Data *</Label>
              <Input
                type="date"
                value={formData.data_cotacao}
                onChange={(e) => handleChange('data_cotacao', e.target.value)}
                className="h-9 md:h-10 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-900 text-xs md:text-sm">Fornecedor</Label>
              <Select value={formData.fornecedor_id} onValueChange={(v) => handleChange('fornecedor_id', v)}>
                <SelectTrigger className="h-9 md:h-10 mt-1">
                  <SelectValue placeholder="Nenhum" />
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

          {/* Seleção de Funcionários por Cargo */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
              Selecionar Funcionários e EPIs
            </h3>
            <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">
              Selecione os funcionários e marque os EPIs necessários
            </p>

            <div className="space-y-3 md:space-y-4 max-h-[300px] md:max-h-[400px] overflow-y-auto border rounded-lg p-2 md:p-4 bg-slate-50">
              {Object.entries(funcionariosPorCargo).map(([cargoNome, grupo]) => {
                const episDoCargo = getEPIsDoCargo(grupo.cargo_id);
                
                if (episDoCargo.length === 0) return null;

                return (
                  <div key={cargoNome} className="border rounded-lg bg-white p-2 md:p-4">
                    <h4 className="font-medium text-slate-800 mb-2 md:mb-3 flex items-center gap-2 text-xs md:text-sm">
                      <HardHat className="w-4 h-4" />
                      {cargoNome}
                      <span className="text-[10px] md:text-xs text-slate-500 font-normal">
                        ({episDoCargo.length} EPIs)
                      </span>
                    </h4>

                    <div className="overflow-x-auto">
                      <Table>
                      <TableHeader className="bg-slate-100">
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Funcionário</TableHead>
                          {episDoCargo.map(epi => (
                            <TableHead key={epi.id} className="text-center text-xs">
                              {epi.nome}
                              <div className="text-slate-400 font-normal">
                                {formatCurrency(epi.preco_referencia || 0)}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grupo.funcionarios.map(func => {
                          const funcSelecionado = funcionariosSelecionados[func.id]?.selecionado;
                          
                          return (
                            <TableRow key={func.id} className={funcSelecionado ? 'bg-blue-50' : ''}>
                              <TableCell>
                                <Checkbox
                                  checked={funcSelecionado}
                                  onCheckedChange={() => handleToggleFuncionario(func.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{func.nome}</TableCell>
                              {episDoCargo.map(epi => {
                                const epiSelecionado = funcionariosSelecionados[func.id]?.epis[epi.id]?.selecionado;
                                const quantidade = funcionariosSelecionados[func.id]?.epis[epi.id]?.quantidade || 1;

                                return (
                                  <TableCell key={epi.id} className="text-center">
                                    {funcSelecionado ? (
                                      <div className="flex flex-col items-center gap-1">
                                        <Checkbox
                                          checked={epiSelecionado}
                                          onCheckedChange={() => handleToggleEPI(func.id, epi.id)}
                                        />
                                        {epiSelecionado && (
                                          <Input
                                            type="number"
                                            min="1"
                                            value={quantidade}
                                            onChange={(e) => handleUpdateQuantidade(func.id, epi.id, e.target.value)}
                                            className="w-16 h-7 text-center text-xs"
                                          />
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}

              {Object.keys(funcionariosPorCargo).length === 0 && (
                <p className="text-center text-slate-500 py-6 md:py-8 text-xs md:text-sm">
                  Nenhum funcionário encontrado
                </p>
              )}
            </div>
          </div>

          {/* Resumo da Cotação */}
          {itensConsolidados.length > 0 && (
            <div className="border rounded-lg p-2 md:p-4 bg-slate-50">
              <h4 className="font-semibold text-slate-900 mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                <Package className="w-4 h-4 md:w-5 md:h-5" />
                Resumo da Cotação
              </h4>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white">EPI</TableHead>
                    <TableHead className="text-white text-center">Qtd Total</TableHead>
                    <TableHead className="text-white text-right">Preço Unit.</TableHead>
                    <TableHead className="text-white text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensConsolidados.map((item, idx) => (
                    <TableRow key={idx} className="bg-white">
                      <TableCell className="font-medium">{item.epi_nome}</TableCell>
                      <TableCell className="text-center">{item.quantidade}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.preco_unitario)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.total_item)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-100 font-bold">
                    <TableCell colSpan={3} className="text-right">Total da Cotação:</TableCell>
                    <TableCell className="text-right text-lg">{formatCurrency(valorTotal)}</TableCell>
                  </TableRow>
                </TableBody>
                </Table>
              </div>

              <div className="mt-3 md:mt-4 text-xs md:text-sm text-slate-600">
                <strong>Funcionários:</strong> {funcionariosVinculados.length} selecionados
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <Label className="text-slate-900 text-xs md:text-sm">Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Observações..."
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row justify-end gap-2 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4 gap-2 order-3 sm:order-1">
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button onClick={() => handleSubmit('rascunho')} disabled={isLoading} className="bg-slate-600 hover:bg-slate-500 text-white h-8 md:h-9 text-xs md:text-sm px-3 md:px-4 gap-2 order-2">
            <Save className="w-4 h-4" />
            Rascunho
          </Button>
          <Button onClick={() => handleSubmit('pendente')} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white h-8 md:h-9 text-xs md:text-sm px-3 md:px-4 gap-2 order-1 sm:order-3">
            <Save className="w-4 h-4" />
            Enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}