import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ControlePontoForm from '@/components/ControlePontoForm';
import EspelhoPonto from '@/components/EspelhoPonto';

export default function PontoPage() {
  const [pontos, setPontos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEspelhoOpen, setIsEspelhoOpen] = useState(false);
  const [selectedPonto, setSelectedPonto] = useState(null);
  const [pontoParaEspelho, setPontoParaEspelho] = useState(null);
  const [filtroFuncionario, setFiltroFuncionario] = useState('todos');
  const [filtroMes, setFiltroMes] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [pontosData, funcionariosData] = await Promise.all([
        base44.entities.ControlePonto.list('-created_date'),
        base44.entities.Funcionario.list()
      ]);
      setPontos(pontosData.filter(Boolean));
      setFuncionarios(funcionariosData.filter(Boolean));
    } catch (err) {
      setError('Erro ao carregar dados do controle de ponto: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data) => {
    setIsFormOpen(false);
    setSelectedPonto(null);
    
    try {
      // Garantir conversão de campos numéricos
      const payload = {
        ...data,
        dias_trabalhados: Number(data.dias_trabalhados) || 0,
        faltas_dias: Number(data.faltas_dias) || 0,
        faltas_horas: Number(data.faltas_horas) || 0,
        horas_extras_semana: Number(data.horas_extras_semana) || 0,
        horas_extras_fds: Number(data.horas_extras_fds) || 0
      };

      if (selectedPonto) {
        await base44.entities.ControlePonto.update(selectedPonto.id, payload);
      } else {
        await base44.entities.ControlePonto.create(payload);
      }
      await fetchData();
    } catch (err) {
      setError('Erro ao salvar registro de ponto: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      try {
        await base44.entities.ControlePonto.delete(id);
        await fetchData();
      } catch (err) {
        setError('Erro ao excluir registro: ' + err.message);
      }
    }
  };

  const openForm = (ponto = null) => {
    setSelectedPonto(ponto);
    setIsFormOpen(true);
  };
  
  const openEspelho = (ponto) => {
    setPontoParaEspelho(ponto);
    setIsEspelhoOpen(true);
  };

  // Memoização do funcionário encontrado
  const getFuncionario = (funcionarioId) => {
    return funcionarios.find(f => f?.id === funcionarioId) || null;
  };

  const formatMes = (mesReferencia) => {
    if (!mesReferencia) return '-';
    const [ano, mes] = mesReferencia.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes) - 1]}/${ano}`;
  };

  // Memoização dos pontos filtrados com validação rigorosa
  const pontosFiltrados = useMemo(() => {
    return pontos.filter(ponto => {
      if (!ponto) return false;
      
      const passaFuncionario = filtroFuncionario === 'todos' || 
        String(ponto.funcionario_id) === String(filtroFuncionario);
      const passaMes = filtroMes === '' || ponto.mes_referencia === filtroMes;
      
      return passaFuncionario && passaMes;
    });
  }, [pontos, filtroFuncionario, filtroMes]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => {
                setError(null);
                fetchData();
              }}>
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 md:p-6">
        <div className="container mx-auto max-w-[1800px]">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-6">
              <CardTitle className="text-base md:text-2xl">Controle de Ponto</CardTitle>
              <Button onClick={() => openForm()} className="w-full sm:w-auto text-xs md:text-sm h-8 md:h-10 gap-1 md:gap-2">
                <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" /> Novo
              </Button>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
                <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
                  <SelectTrigger className="w-full md:w-48 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {funcionarios.map(funcionario => (
                      <SelectItem key={funcionario.id} value={String(funcionario.id)}>
                        {funcionario.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="month"
                  placeholder="Filtrar por mês..."
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className="w-full md:w-48 h-9 text-sm"
                />
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-700">
                    <TableRow>
                      <TableHead className="text-white text-xs md:text-sm">Funcionário</TableHead>
                      <TableHead className="text-white text-xs md:text-sm">Mês</TableHead>
                      <TableHead className="text-white text-xs md:text-sm hidden sm:table-cell">Dias</TableHead>
                      <TableHead className="text-white text-xs md:text-sm hidden md:table-cell">Faltas</TableHead>
                      <TableHead className="text-white text-xs md:text-sm hidden lg:table-cell">H. Extras</TableHead>
                      <TableHead className="text-white text-xs md:text-sm hidden xl:table-cell">Obs</TableHead>
                      <TableHead className="text-white w-[80px] md:w-[140px] text-xs md:text-sm">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-xs md:text-sm">Carregando...</TableCell></TableRow>
                    ) : pontosFiltrados.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-xs md:text-sm">Nenhum registro encontrado.</TableCell></TableRow>
                    ) : (
                      pontosFiltrados.map((ponto) => {
                        const funcionario = getFuncionario(ponto?.funcionario_id);
                        return (
                          <TableRow key={ponto?.id}>
                            <TableCell className="font-medium text-xs md:text-sm max-w-[100px] md:max-w-none truncate">
                              {funcionario?.nome || 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">{formatMes(ponto?.mes_referencia)}</TableCell>
                            <TableCell className="text-xs md:text-sm hidden sm:table-cell">{ponto?.dias_trabalhados || 0}</TableCell>
                            <TableCell className="text-xs md:text-sm hidden md:table-cell">
                              {(ponto?.faltas_dias || 0)}d / {(ponto?.faltas_horas || 0)}h
                            </TableCell>
                            <TableCell className="text-xs md:text-sm hidden lg:table-cell">
                              {(ponto?.horas_extras_semana || 0)}h / {(ponto?.horas_extras_fds || 0)}h
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs md:text-sm hidden xl:table-cell">
                              {ponto?.observacoes || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-0.5 md:gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEspelho(ponto)} title="Espelho" className="h-7 w-7 md:h-8 md:w-8 p-0">
                                  <Printer className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openForm(ponto)} title="Editar" className="h-7 w-7 md:h-8 md:w-8 p-0 hidden sm:flex">
                                  <Edit className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(ponto?.id)} className="text-red-600 h-7 w-7 md:h-8 md:w-8 p-0 hidden md:flex" title="Excluir">
                                  <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ControlePontoForm: tornar controle explícito via isOpen */}
      <ControlePontoForm
        isOpen={isFormOpen}
        ponto={selectedPonto}
        funcionarios={funcionarios}
        onSave={handleSave}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedPonto(null);
        }}
      />

      {/* EspelhoPonto: tornar controle explícito via isOpen */}
      <EspelhoPonto
        isOpen={isEspelhoOpen}
        ponto={pontoParaEspelho}
        funcionario={getFuncionario(pontoParaEspelho?.funcionario_id)}
        onClose={() => {
          setIsEspelhoOpen(false);
          setPontoParaEspelho(null);
        }}
      />
    </>
  );
}