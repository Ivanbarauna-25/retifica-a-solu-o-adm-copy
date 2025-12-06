import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Candidato } from '@/entities/Candidato';
import { Cargo } from '@/entities/Cargo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Settings, Printer, UserCheck, UserX, Trash2, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CandidatoForm from '@/components/CandidatoForm';
import GerenciarStatusCandidato from '@/components/GerenciarStatusCandidato';
import FichaContratacao from '@/components/FichaContratacao';
import { createPageUrl } from '@/utils';

export default function ContratacaoPage() {
  const [candidatos, setCandidatos] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGerenciarOpen, setIsGerenciarOpen] = useState(false);
  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [selectedCandidato, setSelectedCandidato] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCargo, setFiltroCargo] = useState('todos');
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  const statusConfig = {
    'pendente': { label: 'Pendente', color: 'bg-gray-400' },
    'em_analise': { label: 'Em Análise', color: 'bg-yellow-500' },
    'aprovado': { label: 'Aprovado', color: 'bg-blue-500' },
    'reprovado': { label: 'Reprovado', color: 'bg-red-500' },
    'contratado': { label: 'Contratado', color: 'bg-green-500' }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, cargosData] = await Promise.all([
        Candidato.list('-created_date'),
        Cargo.list()
      ]);
      setCandidatos(data.filter(Boolean));
      setCargos(cargosData.filter(Boolean));
    } catch (err) {
      setError('Erro ao carregar dados de contratação: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const closeAllModals = () => {
    setIsFormOpen(false);
    setIsGerenciarOpen(false);
    setIsFichaOpen(false);
    setSelectedCandidato(null);
  };

  const handleSave = async (data) => {
    try {
      // 1) Primeiro: preparar payload sem sobrescrever salário quando não enviado
      const payload = { ...data };
      if (Object.prototype.hasOwnProperty.call(data, 'salario_pretendido') && data.salario_pretendido !== '') {
        payload.salario_pretendido = Number(data.salario_pretendido) || 0;
      }

      // 2) Segundo: operação de dados (update/create)
      if (selectedCandidato) {
        await Candidato.update(selectedCandidato.id, payload);
      } else {
        await Candidato.create(payload);
      }

      // 3) Terceiro: atualizar a lista
      await fetchData();

      // 4) Por último: fechar modais
      closeAllModals();
    } catch (err) {
      setError('Erro ao salvar candidato: ' + err.message);
    }
  };

  const handleContratar = (candidato) => {
    navigate(createPageUrl(`Funcionarios?candidatoId=${candidato.id}`));
  };

  const handleReprovar = async (candidatoId) => {
    if (window.confirm('Tem certeza que deseja reprovar/cancelar esta ficha? Esta ação não pode ser desfeita.')) {
      try {
        await Candidato.update(candidatoId, { status_contratacao: 'reprovado' });
        await fetchData();
      } catch (err) {
        setError('Erro ao reprovar candidato: ' + err.message);
      }
    }
  };

  const handleDelete = async (candidatoId) => {
    if (window.confirm('TEM CERTEZA? Esta ação excluirá a ficha permanentemente e não poderá ser desfeita.')) {
      try {
        await Candidato.delete(candidatoId);
        await fetchData();
      } catch (err) {
        setError('Erro ao excluir candidato: ' + err.message);
      }
    }
  };

  const openForm = (candidato = null) => {
    setSelectedCandidato(candidato);
    setIsFormOpen(true);
  };

  const openGerenciar = (candidato) => {
    setSelectedCandidato(candidato);
    setIsGerenciarOpen(true);
  };

  const openFicha = (candidato) => {
    setSelectedCandidato(candidato);
    setIsFichaOpen(true);
  };

  const getCargoNome = (cargoId) => {
    const cargo = cargos.find((c) => c?.id === cargoId);
    return cargo ? cargo.nome : 'Não informado';
  };

  // Memoização dos candidatos filtrados
  const candidatosFiltrados = useMemo(() => {
    return candidatos.filter((c) => {
      if (!c) return false;
      
      const passaStatus = filtroStatus === 'todos' || c.status_contratacao === filtroStatus;
      const passaCargo = filtroCargo === 'todos' || String(c.cargo_id) === String(filtroCargo);
      const passaBusca = busca === '' || 
        c.nome?.toLowerCase().includes(busca.toLowerCase()) || 
        c.cpf?.includes(busca);
      
      return passaStatus && passaBusca && passaCargo;
    });
  }, [candidatos, filtroStatus, filtroCargo, busca]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="container mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">Processo de Contratação</CardTitle>
              <Button onClick={() => openForm()}>
                <UserPlus className="mr-2 h-4 w-4" /> Nova Contratação
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="flex-1" />

                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filtroCargo} onValueChange={setFiltroCargo}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por Cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Cargos</SelectItem>
                    {cargos.map((cargo) => (
                      <SelectItem key={cargo.id} value={String(cargo.id)}>{cargo.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-slate-700">
                    <TableRow>
                      <TableHead className="text-white">Nome</TableHead>
                      <TableHead className="text-white">CPF</TableHead>
                      <TableHead className="text-white">Contato</TableHead>
                      <TableHead className="text-white">Cargo Pretendido</TableHead>
                      <TableHead className="text-white">Salário Pretendido</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center">Carregando...</TableCell></TableRow>
                    ) : candidatosFiltrados.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center">Nenhuma ficha de contratação encontrada.</TableCell></TableRow>
                    ) : (
                      candidatosFiltrados.map((c) => (
                        <TableRow key={c?.id}>
                          <TableCell className="font-medium">{c?.nome || 'Nome não informado'}</TableCell>
                          <TableCell>{c?.cpf || '-'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span>{c?.email || '-'}</span>
                              <span className="text-gray-500 text-xs">{c?.telefone}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getCargoNome(c?.cargo_id)}</TableCell>
                          <TableCell>
                            {c?.salario_pretendido ? formatCurrency(c.salario_pretendido) : 'Não informado'}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[c?.status_contratacao]?.color || 'bg-gray-400'}>
                              {statusConfig[c?.status_contratacao]?.label || 'Desconhecido'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openForm(c)}>
                                  <Edit className="mr-2 h-4 w-4" /> Editar Ficha
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openGerenciar(c)}>
                                  <Settings className="mr-2 h-4 w-4" /> Gerenciar Status
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openFicha(c)}>
                                  <Printer className="mr-2 h-4 w-4" /> Imprimir Ficha
                                </DropdownMenuItem>

                                {c?.status_contratacao === 'aprovado' && (
                                  <DropdownMenuItem onClick={() => handleContratar(c)} className="bg-green-100 text-green-800 focus:bg-green-200">
                                    <UserCheck className="mr-2 h-4 w-4" /> Contratar
                                  </DropdownMenuItem>
                                )}

                                {!['reprovado', 'contratado'].includes(c?.status_contratacao) && (
                                  <DropdownMenuItem onClick={() => handleReprovar(c?.id)} className="text-red-600 focus:text-red-600">
                                    <UserX className="mr-2 h-4 w-4" /> Reprovar / Cancelar
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem onClick={() => handleDelete(c?.id)} className="text-red-600 focus:text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir Ficha
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CandidatoForm
        isOpen={isFormOpen}
        candidato={selectedCandidato}
        cargos={cargos}
        onSave={handleSave}
        onClose={closeAllModals}
      />
      {isGerenciarOpen && <GerenciarStatusCandidato candidato={selectedCandidato} onSave={handleSave} onClose={closeAllModals} />}
      {isFichaOpen && (
        <FichaContratacao
          isOpen={isFichaOpen}
          candidato={selectedCandidato}
          cargos={cargos}
          onClose={closeAllModals}
        />
      )}
    </>
  );
}