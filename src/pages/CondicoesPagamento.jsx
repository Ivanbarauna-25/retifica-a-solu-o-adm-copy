import React, { useState, useEffect } from 'react';
import { CondicaoPagamento } from '@/entities/CondicaoPagamento';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import CondicaoPagamentoForm from '@/components/CondicaoPagamentoForm';

export default function CondicoesPagamentoPage() {
  const [condicoes, setCondicoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCondicao, setSelectedCondicao] = useState(null);
  const [busca, setBusca] = useState('');

  const tipoColors = {
    'a_vista': 'bg-green-100 text-green-800',
    'parcelado': 'bg-blue-100 text-blue-800',
    'prazo': 'bg-orange-100 text-orange-800'
  };

  const tipoLabels = {
    'a_vista': 'À Vista',
    'parcelado': 'Parcelado',
    'prazo': 'A Prazo'
  };

  const fetchCondicoes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await CondicaoPagamento.list('-created_date');
      setCondicoes(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch (err) {
      console.error("Erro ao carregar condições:", err);
      setError("Não foi possível carregar as condições de pagamento. Tente recarregar a página.");
    } finally {
      setIsLoading(false);
    }
  };

  const criarCondicoesPadraoSeNecessario = async () => {
    try {
      const condicoesExistentes = await CondicaoPagamento.list();
      
      if (!Array.isArray(condicoesExistentes) || condicoesExistentes.length === 0) {
        const condicoesPadrao = [
          { nome: 'À Vista', tipo: 'a_vista', desconto_percentual: 5, ativa: true },
          { nome: '30 dias', tipo: 'prazo', intervalo_dias: 30, ativa: true },
          { nome: '2x sem juros', tipo: 'parcelado', num_parcelas: 2, intervalo_dias: 30, ativa: true },
          { nome: '3x sem juros', tipo: 'parcelado', num_parcelas: 3, intervalo_dias: 30, ativa: true }
        ];

        for (const condicao of condicoesPadrao) {
          await CondicaoPagamento.create(condicao);
        }
      }
    } catch (err) {
      console.error("Erro ao criar condições padrão:", err);
      // Não definir erro aqui para não bloquear a tela se só der erro na criação padrão
    }
  };

  useEffect(() => {
    const initData = async () => {
      await fetchCondicoes();
      await criarCondicoesPadraoSeNecessario();
      // Recarregar após criar condições padrão
      await fetchCondicoes();
    };
    initData();
  }, []);

  const handleSave = async (data) => {
    try {
      setError(null);
      if (selectedCondicao) {
        await CondicaoPagamento.update(selectedCondicao.id, data);
      } else {
        await CondicaoPagamento.create(data);
      }
      setIsFormOpen(false);
      setSelectedCondicao(null);
      await fetchCondicoes();
    } catch (err) {
      console.error("Erro ao salvar condição:", err);
      setError("Erro ao salvar condição de pagamento. Tente novamente.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta condição?')) {
      try {
        setError(null);
        await CondicaoPagamento.delete(id);
        await fetchCondicoes();
      } catch (err) {
        console.error("Erro ao excluir condição:", err);
        setError("Erro ao excluir condição de pagamento. Tente novamente.");
      }
    }
  };

  const openForm = (condicao = null) => {
    setError(null);
    setSelectedCondicao(condicao);
    setIsFormOpen(true);
  };

  const formatPercentual = (value) => {
    return `${value || 0}%`;
  };

  const condicoesFiltradas = condicoes.filter(condicao =>
    condicao && condicao.ativa && (busca === '' ||
    condicao.nome?.toLowerCase().includes(busca.toLowerCase()))
  );

  if (error) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">Ocorreu um Erro</h2>
        <p className="text-gray-600 mb-4 text-center">{error}</p>
        <Button onClick={fetchCondicoes}>Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-slate-800 text-white px-3 md:px-6 py-4 md:py-6 mb-3 md:mb-6 shadow-lg sticky top-0 z-10">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 md:p-3 rounded-lg">
                  <CreditCard className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl lg:text-3xl font-bold">Condições de Pagamento</h1>
                  <p className="text-slate-300 text-xs md:text-sm">Formas de parcelamento e prazos</p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => openForm()}
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white gap-2 h-8 md:h-9 text-xs md:text-sm px-3 md:px-4"
              >
                <Plus className="w-4 h-4" />
                Nova Condição
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-2 md:px-6">
          <div className="bg-white rounded-lg shadow-sm p-2 md:p-4 mb-3 md:mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9 md:h-10"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white text-xs md:text-sm">Nome</TableHead>
                    <TableHead className="text-white text-xs md:text-sm">Tipo</TableHead>
                    <TableHead className="text-white text-xs md:text-sm hidden md:table-cell">Parcelas</TableHead>
                    <TableHead className="text-white text-xs md:text-sm hidden lg:table-cell">Intervalo</TableHead>
                    <TableHead className="text-white text-xs md:text-sm hidden xl:table-cell">Desconto</TableHead>
                    <TableHead className="text-white text-xs md:text-sm hidden xl:table-cell">Juros</TableHead>
                    <TableHead className="text-white w-[80px] md:w-[120px] text-xs md:text-sm">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="7" className="text-center">Carregando...</TableCell></TableRow>
                  ) : condicoesFiltradas.length === 0 ? (
                    <TableRow><TableCell colSpan="7" className="text-center">Nenhuma condição encontrada.</TableCell></TableRow>
                  ) : (
                    condicoesFiltradas.map((condicao) => (
                      <TableRow key={condicao.id}>
                        <TableCell className="font-medium text-xs md:text-sm max-w-[120px] md:max-w-none truncate">{condicao.nome}</TableCell>
                        <TableCell>
                          <Badge className={`${tipoColors[condicao.tipo] || 'bg-gray-100 text-gray-800'} text-[10px] md:text-xs`}>
                            {tipoLabels[condicao.tipo] || condicao.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs md:text-sm hidden md:table-cell">{condicao.num_parcelas || 1}</TableCell>
                        <TableCell className="text-xs md:text-sm hidden lg:table-cell">{condicao.intervalo_dias || 0}d</TableCell>
                        <TableCell className="text-xs md:text-sm hidden xl:table-cell">{formatPercentual(condicao.desconto_percentual)}</TableCell>
                        <TableCell className="text-xs md:text-sm hidden xl:table-cell">{formatPercentual(condicao.juros_percentual)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="icon" onClick={() => openForm(condicao)} title="Editar" className="h-8 w-8 md:h-9 md:w-9 hover:bg-amber-50 text-amber-600">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(condicao.id)} title="Excluir" className="text-red-600 h-8 w-8 md:h-9 md:w-9 hover:bg-red-50 hidden md:flex">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <CondicaoPagamentoForm
          condicao={selectedCondicao}
          onSave={handleSave}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedCondicao(null);
          }}
        />
      )}
    </>
  );
}