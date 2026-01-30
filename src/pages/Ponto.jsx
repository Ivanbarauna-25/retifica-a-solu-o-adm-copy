import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Download, PlusCircle, Printer, RefreshCw } from "lucide-react";

import ImportarPontoModal from "@/components/ponto/ImportarPontoModal";
import VisualizarRegistroDiaModal from "@/components/ponto/VisualizarRegistroDiaModal";
import PontoDashboard from "@/components/ponto/PontoDashboard";
import CalendarioPonto from "@/components/ponto/CalendarioPonto";
import HistoricoAuditoria from "@/components/ponto/HistoricoAuditoria";

export default function PontoPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funcionariosEscalas, setFuncionariosEscalas] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isImportarOpen, setIsImportarOpen] = useState(false);
  const [ocorrenciaModal, setOcorrenciaModal] = useState(null);
  const [isOcorrenciaModalOpen, setIsOcorrenciaModalOpen] = useState(false);
  const [visualizarGrupo, setVisualizarGrupo] = useState(null);
  const [isVisualizarOpen, setIsVisualizarOpen] = useState(false);

  const [filtroFuncionario, setFiltroFuncionario] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [mostrarCalendario, setMostrarCalendario] = useState(true);
  const [search, setSearch] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [funcsData, registrosData, escalasData, funcEscalasData, ocorrenciasData] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.PontoRegistro.list("-data_hora", 2000),
        base44.entities.EscalaTrabalho.list(),
        base44.entities.FuncionarioEscala.list(),
        base44.entities.OcorrenciaPonto.list("-data", 1000)
      ]);

      setFuncionarios((funcsData || []).sort((a, b) => (a?.nome || "").localeCompare(b?.nome || "")));
      setRegistros(registrosData || []);
      setEscalas(escalasData || []);
      setFuncionariosEscalas(funcEscalasData || []);
      setOcorrencias(ocorrenciasData || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredFuncionarios = useMemo(() => {
    if (!search) return funcionarios;
    const q = search.toLowerCase();
    return funcionarios.filter(f => (f.nome || "").toLowerCase().includes(q) || (f.cpf || "").includes(q));
  }, [funcionarios, search]);

  const registrosFiltrados = useMemo(() => {
    let res = registros || [];

    if (filtroFuncionario && filtroFuncionario !== "todos") {
      res = res.filter(r => r.funcionario_id === filtroFuncionario);
    }
    if (filtroStatus && filtroStatus !== "todos") {
      // Exemplo: filtrar por registros inválidos/validos
      if (filtroStatus === "invalidos") res = res.filter(r => !r.valido);
      if (filtroStatus === "validos") res = res.filter(r => r.valido);
    }
    if (filtroDataInicio) {
      res = res.filter(r => r.data >= filtroDataInicio);
    }
    if (filtroDataFim) {
      res = res.filter(r => r.data <= filtroDataFim);
    }

    // filtro de busca simples
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(r => (r.nome_arquivo || "").toLowerCase().includes(q) || (r.raw_linha || "").toLowerCase().includes(q));
    }

    return res;
  }, [registros, filtroFuncionario, filtroDataInicio, filtroDataFim, filtroStatus, search]);

  const handleResetFilters = () => {
    setFiltroFuncionario("todos");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroStatus("todos");
    setSearch("");
  };

  const openVisualizar = (grupo) => {
    setVisualizarGrupo(grupo);
    setIsVisualizarOpen(true);
  };

  return (
    <div className="container mx-auto p-4">
      {/* Cabeçalho com ações */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-extrabold">Ponto</h1>
          <p className="text-sm text-slate-500">Visualize, valide e gere espelhos de ponto</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsImportarOpen(true)} aria-label="Importar registros">
            <PlusCircle className="mr-2 w-4 h-4" /> Importar
          </Button>

          <Button onClick={() => navigate(createPageUrl("/espelho-ponto"))} aria-label="Ir para espelho">
            <Printer className="mr-2 w-4 h-4" /> Espelho
          </Button>

          <Button variant="ghost" onClick={() => { fetchData(); toast({ title: "Atualizando", description: "Recarregando dados..." }); }} aria-label="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filtros + Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Painel de filtros */}
        <div className="lg:col-span-1 bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-3">Filtros</h2>

          <div className="space-y-3">
            <div>
              <Label htmlFor="funcionario">Colaborador</Label>
              <Select value={filtroFuncionario} onValueChange={(v) => setFiltroFuncionario(v)} aria-label="Selecionar colaborador">
                <SelectTrigger id="funcionario" className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {filteredFuncionarios.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="dataInicio">Início</Label>
                <Input id="dataInicio" type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dataFim">Fim</Label>
                <Input id="dataFim" type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v)}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="validos">Válidos</SelectItem>
                  <SelectItem value="invalidos">Inválidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="q">Pesquisar</Label>
              <Input id="q" placeholder="arquivo, linha ou texto..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="flex gap-2 mt-2">
              <Button onClick={() => setMostrarCalendario(!mostrarCalendario)} variant="ghost" className="flex-1" aria-pressed={mostrarCalendario}>
                <CalendarIcon className="mr-2 w-4 h-4" /> {mostrarCalendario ? "Ocultar calendário" : "Mostrar calendário"}
              </Button>
              <Button variant="secondary" onClick={handleResetFilters} className="flex-1" aria-label="Limpar filtros">
                <RefreshCw className="mr-2 w-4 h-4" /> Limpar
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard (ocupa 2 colunas em lg) */}
        <div className="lg:col-span-2">
          <PontoDashboard
            registros={registrosFiltrados}
            funcionarios={funcionarios}
            ocorrencias={ocorrencias}
            dataInicio={filtroDataInicio}
            dataFim={filtroDataFim}
          />
        </div>
      </div>

      {/* Conteúdo principal: Calendário + Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendário */}
        {mostrarCalendario && (
          <div className="lg:col-span-1 bg-white border rounded-lg p-4 shadow-sm">
            <CalendarioPonto
              registros={registrosFiltrados}
              funcionariosEscalas={funcionariosEscalas}
              ocorrencias={ocorrencias}
              funcionarioSelecionado={filtroFuncionario}
              onDiaClicado={(data, grupo) => openVisualizar(grupo)}
            />

            {/* Legenda */}
            <div className="mt-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2"><span className="w-3 h-3 bg-green-300 rounded-full border" /> Com ponto</span>
                <span className="inline-flex items-center gap-2"><span className="w-3 h-3 bg-gray-300 rounded-full border" /> Justificado</span>
                <span className="inline-flex items-center gap-2"><span className="w-3 h-3 bg-yellow-200 rounded-full border" /> Pendência</span>
              </div>
            </div>
          </div>
        )}

        {/* Lista de registros por dia */}
        <div className="lg:col-span-2 bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Registros</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { /* implementar export CSV */ }}><Download className="w-4 h-4 mr-2" />Exportar CSV</Button>
              <Button onClick={() => navigate(createPageUrl("/espelho-ponto"))}><Printer className="w-4 h-4 mr-2" />Gerar Espelho</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse h-14 bg-slate-100 rounded" />
              ))}
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              Nenhum registro encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Agrupar por data */}
              {Object.entries(
                registrosFiltrados.reduce((acc, r) => {
                  acc[r.data] = acc[r.data] || { data: r.data, batidas: [] };
                  acc[r.data].batidas.push(r);
                  return acc;
                }, {})
              ).sort((a,b) => b[0].localeCompare(a[0])).map(([data, grupo]) => (
                <div key={data} className="flex items-center justify-between p-3 border rounded hover:shadow-sm">
                  <div>
                    <div className="text-sm text-slate-500">{data}</div>
                    <div className="font-medium">{grupo.batidas.length} marcação(ões)</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => openVisualizar(grupo)} aria-label={`Visualizar ${data}`}>
                      Visualizar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <ImportarPontoModal isOpen={isImportarOpen} onClose={() => setIsImportarOpen(false)} onImport={() => { fetchData(); setIsImportarOpen(false); }} />
      <VisualizarRegistroDiaModal isOpen={isVisualizarOpen} onClose={() => setIsVisualizarOpen(false)} grupo={visualizarGrupo} onSalvo={() => fetchData()} />
    </div>
  );
}