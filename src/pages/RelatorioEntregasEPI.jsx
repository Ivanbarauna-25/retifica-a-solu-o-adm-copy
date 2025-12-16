import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, X, Filter, HardHat, Calendar, User, Package } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function RelatorioEntregasEPI() {
  const [entregas, setEntregas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [epis, setEpis] = useState([]);
  const [configuracoes, setConfiguracoes] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState('todos');
  const [filtroEPI, setFiltroEPI] = useState('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [entregasData, funcionariosData, episData, configData] = await Promise.all([
        base44.entities.EntregaEPI.list('-data_entrega'),
        base44.entities.Funcionario.list(),
        base44.entities.EPI.list(),
        base44.entities.Configuracoes.list()
      ]);
      setEntregas(entregasData || []);
      setFuncionarios(funcionariosData || []);
      setEpis(episData || []);
      setConfiguracoes(configData?.[0] || null);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFuncionarioNome = (id) => {
    const func = funcionarios.find(f => f.id === id);
    return func?.nome || '-';
  };

  const getEPINome = (id) => {
    const epi = epis.find(e => e.id === id);
    return epi?.nome || '-';
  };

  const getEPIPreco = (id) => {
    const epi = epis.find(e => e.id === id);
    return epi?.preco_referencia || 0;
  };

  // Filtrar entregas
  const entregasFiltradas = entregas.filter(entrega => {
    if (filtroFuncionario !== 'todos' && entrega.funcionario_id !== filtroFuncionario) return false;
    
    if (filtroEPI !== 'todos') {
      const temEPI = entrega.itens?.some(item => item.epi_id === filtroEPI);
      if (!temEPI) return false;
    }

    if (filtroDataInicio && entrega.data_entrega < filtroDataInicio) return false;
    if (filtroDataFim && entrega.data_entrega > filtroDataFim) return false;

    return true;
  });

  // Expandir itens para a tabela detalhada
  const itensExpandidos = entregasFiltradas.flatMap(entrega => 
    (entrega.itens || []).map(item => ({
      ...item,
      entrega_id: entrega.id,
      funcionario_id: entrega.funcionario_id,
      data_entrega: entrega.data_entrega,
      entregue_por: entrega.entregue_por,
      termo_assinado: entrega.termo_assinado
    }))
  ).filter(item => filtroEPI === 'todos' || item.epi_id === filtroEPI);

  // Calcular totais
  const totalItens = itensExpandidos.reduce((acc, item) => acc + (item.quantidade || 1), 0);
  const totalValor = itensExpandidos.reduce((acc, item) => {
    const preco = getEPIPreco(item.epi_id);
    return acc + (preco * (item.quantidade || 1));
  }, 0);

  const limparFiltros = () => {
    setFiltroFuncionario('todos');
    setFiltroEPI('todos');
    setFiltroDataInicio('');
    setFiltroDataFim('');
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HardHat className="w-6 h-6" />
            Relatório de Entregas de EPI
          </h1>
          <p className="text-slate-500 mt-1">Histórico completo de entregas de equipamentos de proteção</p>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir
        </Button>
      </div>

      {/* Filtros */}
      <Card className="no-print">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs">Funcionário</Label>
              <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {funcionarios.filter(f => f.status !== 'demitido').map(func => (
                    <SelectItem key={func.id} value={func.id}>{func.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">EPI</Label>
              <Select value={filtroEPI} onValueChange={setFiltroEPI}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {epis.map(epi => (
                    <SelectItem key={epi.id} value={epi.id}>{epi.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Data Início</Label>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={limparFiltros} className="w-full gap-2">
                <X className="w-4 h-4" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total de Entregas</p>
                <p className="text-2xl font-bold text-slate-800">{entregasFiltradas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <HardHat className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total de Itens</p>
                <p className="text-2xl font-bold text-slate-800">{totalItens}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Valor Total Estimado</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalValor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cabeçalho para impressão */}
      <div className="hidden print:block mb-6">
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-bold">{configuracoes?.nome_empresa || 'Empresa'}</h1>
          <p className="text-sm text-gray-600">Relatório de Entregas de EPI</p>
          <p className="text-xs text-gray-500">Gerado em: {formatDate(new Date().toISOString().split('T')[0])}</p>
        </div>
        <div className="flex justify-between text-sm mb-4">
          <span>Total de Entregas: {entregasFiltradas.length}</span>
          <span>Total de Itens: {totalItens}</span>
          <span>Valor Total: {formatCurrency(totalValor)}</span>
        </div>
      </div>

      {/* Tabela de Entregas */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-800">
                <TableHead className="text-white">Data</TableHead>
                <TableHead className="text-white">Funcionário</TableHead>
                <TableHead className="text-white">EPI</TableHead>
                <TableHead className="text-white">CA</TableHead>
                <TableHead className="text-white text-center">Qtd</TableHead>
                <TableHead className="text-white text-right">Valor Unit.</TableHead>
                <TableHead className="text-white text-right">Subtotal</TableHead>
                <TableHead className="text-white text-center no-print">Termo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensExpandidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Nenhuma entrega encontrada com os filtros selecionados
                  </TableCell>
                </TableRow>
              ) : (
                itensExpandidos.map((item, idx) => {
                  const preco = getEPIPreco(item.epi_id);
                  const subtotal = preco * (item.quantidade || 1);
                  return (
                    <TableRow key={`${item.entrega_id}-${idx}`}>
                      <TableCell>{formatDate(item.data_entrega)}</TableCell>
                      <TableCell className="font-medium">{getFuncionarioNome(item.funcionario_id)}</TableCell>
                      <TableCell>{item.epi_nome || getEPINome(item.epi_id)}</TableCell>
                      <TableCell>{item.numero_ca || '-'}</TableCell>
                      <TableCell className="text-center">{item.quantidade || 1}</TableCell>
                      <TableCell className="text-right">{formatCurrency(preco)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(subtotal)}</TableCell>
                      <TableCell className="text-center no-print">
                        {item.termo_assinado ? (
                          <Badge className="bg-green-100 text-green-700">Assinado</Badge>
                        ) : (
                          <Badge variant="outline">Pendente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rodapé para impressão */}
      <div className="hidden print:block mt-8 pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span>Total Geral: {formatCurrency(totalValor)}</span>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}