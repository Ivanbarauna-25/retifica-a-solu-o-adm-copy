import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Download, PlusCircle, Printer, RefreshCw, Edit2, AlertCircle, Eye } from "lucide-react";

import ImportarPontoModal from "@/components/ponto/ImportarPontoModal";
import VisualizarRegistroDiaModal from "@/components/ponto/VisualizarRegistroDiaModal";
import PontoDashboard from "@/components/ponto/PontoDashboard";
import CalendarioPonto from "@/components/ponto/CalendarioPonto";

export default function PontoPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funcionariosEscalas, setFuncionariosEscalas] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isImportarOpen, setIsImportarOpen] = useState(false);
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
        base44.entities.PontoRegistro.list("-data_hora", 5000),
        base44.entities.EscalaTrabalho.list(),
        base44.entities.FuncionarioEscala.list(),
        base44.entities.OcorrenciaPonto.list("-data", 2000)
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

  const funcionariosMap = useMemo(() => {
    return (funcionarios || []).reduce((acc, f) => {
      acc[f.id] = f;
      return acc;
    }, {});
  }, [funcionarios]);

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
      if (filtroStatus === "invalidos") res = res.filter(r => !r.valido);
      if (filtroStatus === "validos") res = res.filter(r => r.valido);
    }
    if (filtroDataInicio) {
      res = res.filter(r => r.data >= filtroDataInicio);
    }
    if (filtroDataFim) {
      res = res.filter(r => r.data <= filtroDataFim);
    }

    if (search) {
      const q = search.toLowerCase();
      res = res.filter(r => (r.nome_arquivo || "").toLowerCase().includes(q) || (r.raw_linha || "").toLowerCase().includes(q));
    }

    return res;
  }, [registros, filtroFuncionario, filtroDataInicio, filtroDataFim, filtroStatus, search]);

  // Agrupa por funcionário -> data, para tabela com linhas por (nome, data)
  const tableRows = useMemo(() => {
    const map = {};
    registrosFiltrados.forEach(r => {
      const key = `${r.funcionario_id}__${r.data}`;
      if (!map[key]) map[key] = { funcionario_id: r.funcionario_id, data: r.data, batidas: [] };
      map[key].batidas.push(r);
    });

    const arr = Object.values(map);
    arr.forEach(item => {
      item.batidas.sort((a, b) => {
        // tenta ordenar por data_hora, se inexistente usa hora
        const aKey = (a.data_hora || a.hora || "").toString();
        const bKey = (b.data_hora || b.hora || "").toString();
        return aKey.localeCompare(bKey);
      });
    });

    arr.sort((a, b) => {
      const nomeA = (funcionariosMap[a.funcionario_id]?.nome || "").toLowerCase();
      const nomeB = (funcionariosMap[b.funcionario_id]?.nome || "").toLowerCase();
      if (nomeA !== nomeB) return nomeA.localeCompare(nomeB);
      return b.data.localeCompare(a.data); // datas mais recentes primeiro
    });

    return arr;
  }, [registrosFiltrados, funcionariosMap]);

  const formatTime = (h) => {
    if (!h) return "";
    const s = h.toString();
    // aceita "HH:mm:ss" ou "HH:mm" ou "HH:mm:ss.sss"
    return s.length >= 5 ? s.slice(0,5) : s;
  };

  const batidasToSlots = (batidas) => {
    // Retorna array de 4 slots: [1ª Ent, 1ª Saí, 2ª Ent, 2ª Saí]
    const slots = ["", "", "", ""];
    for (let i = 0; i < batidas.length && i < 4; i++) {
      const b = batidas[i];
      // preferir hora, depois data_hora
      const hora = b.hora || (b.data_hora ? b.data_hora.split("T")[1] : "");
      slots[i] = formatTime(hora);
    }
    return slots;
  };

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

  const handleJustificar = (row) => {
    // abre modal de visualização/edição focado em ocorrências
    openVisualizar(row);
  };

  const exportCsv = () => {
    // Gera CSV simples com colunas: nome,cpf,data,1ent,1sai,2ent,2sai
    if (!tableRows || tableRows.length === 0) {
      toast({ title: "Nada para exportar", variant: "destructive" });
      return;
    }
    const lines = [["Nome", "CPF", "Data", "1ª Ent.", "1ª Saí.", "2ª Ent.", "2ª Saí."]];
    tableRows.forEach(r => {
      const f = funcionariosMap[r.funcionario_id] || {};
      const slots = batidasToSlots(r.batidas);
      lines.push([f.nome || "", f.cpf || "", r.data, slots[0], slots[1], slots[2], slots[3]]);
    });
    const csv = lines.map(l => l.map(c => `"${(c||"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registros-ponto-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-extrabold">Ponto</h1>
          <p className="text-sm text-slate-500">Visualize, valide e trate registros de ponto</p>
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

      {/* Conteúdo principal: Calendário + Tabela */}
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

        {/* Tabela detalhada */}
        <div className="lg:col-span-2 bg-white border rounded-lg p-4 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Registros Detalhados</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-2" />Exportar CSV</Button>
              <Button onClick={() => navigate(createPageUrl("/espelho-ponto"))}><Printer className="w-4 h-4 mr-2" />Gerar Espelho</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-12 rounded bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : tableRows.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              Nenhum registro encontrado para os filtros selecionados.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Colaborador</th>
                  <th className="text-left px-3 py-2 border-b">CPF</th>
                  <th className="text-left px-3 py-2 border-b">Data</th>
                  <th className="text-center px-3 py-2 border-b">1ª Ent.</th>
                  <th className="text-center px-3 py-2 border-b">1ª Saí.</th>
                  <th className="text-center px-3 py-2 border-b">2ª Ent.</th>
                  <th className="text-center px-3 py-2 border-b">2ª Saí.</th>
                  <th className="text-right px-3 py-2 border-b">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => {
                  const funcionario = funcionariosMap[row.funcionario_id] || {};
                  const slots = batidasToSlots(row.batidas);
                  const ocorr = ocorrencias.find(o => o.funcionario_id === row.funcionario_id && o.data === row.data);
                  return (
                    <tr key={`${row.funcionario_id}_${row.data}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2 align-top">{funcionario.nome || "—"}</td>
                      <td className="px-3 py-2 align-top font-mono text-xs">{funcionario.cpf || "—"}</td>
                      <td className="px-3 py-2 align-top">{row.data}</td>
                      <td className="text-center px-3 py-2 align-top">{slots[0] || "—"}</td>
                      <td className="text-center px-3 py-2 align-top">{slots[1] || "—"}</td>
                      <td className="text-center px-3 py-2 align-top">{slots[2] || "—"}</td>
                      <td className="text-center px-3 py-2 align-top">{slots[3] || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openVisualizar(row)} aria-label={`Visualizar ${funcionario.nome} ${row.data}`}>
                            <Eye className="w-4 h-4 mr-1" /> Visualizar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openVisualizar(row)} aria-label={`Editar ${funcionario.nome} ${row.data}`}>
                            <Edit2 className="w-4 h-4 mr-1" /> Editar
                          </Button>
                          <Button size="sm" variant={ocorr ? "secondary" : "destructive"} onClick={() => handleJustificar(row)} aria-label={`Justificar ${funcionario.nome} ${row.data}`}>
                            <AlertCircle className="w-4 h-4 mr-1" /> {ocorr ? "Ocorrência" : "Justificar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modais */}
      <ImportarPontoModal isOpen={isImportarOpen} onClose={() => setIsImportarOpen(false)} onImport={() => { fetchData(); setIsImportarOpen(false); }} />
      <VisualizarRegistroDiaModal isOpen={isVisualizarOpen} onClose={() => setIsVisualizarOpen(false)} grupo={visualizarGrupo} onSalvo={() => fetchData()} />
    </div>
  );
}