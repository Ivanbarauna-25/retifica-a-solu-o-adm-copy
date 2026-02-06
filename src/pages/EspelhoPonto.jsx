import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import EspelhoPontoDoc from "@/components/ponto/EspelhoPontoDoc.jsx";

export default function EspelhoPontoPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [registros, setRegistros] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mostrarEspelho, setMostrarEspelho] = useState(false);
  const [configuracoes, setConfiguracoes] = useState(null);
  const [escalas, setEscalas] = useState([]);
  const [funcionariosEscalas, setFuncionariosEscalas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [funcionariosSelecionados, setFuncionariosSelecionados] = useState([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [funcs, configs, esc, funcEsc, cargos, depts] = await Promise.all([
          base44.entities.Funcionario.list(),
          base44.entities.Configuracoes.list(),
          base44.entities.EscalaTrabalho.list(),
          base44.entities.FuncionarioEscala.list(),
          base44.entities.Cargo.list(),
          base44.entities.Departamento.list()
        ]);
        setFuncionarios((funcs || []).sort((a, b) => (a?.nome || "").localeCompare(b?.nome || "")));
        setConfiguracoes(configs?.[0] || null);
        setEscalas(esc || []);
        setFuncionariosEscalas(funcEsc || []);
        setDepartamentos(depts || []);
        // Armazenar cargos no localStorage para referência
        sessionStorage.setItem('cargosMap', JSON.stringify((cargos || []).reduce((acc, c) => ({ ...acc, [c.id]: c }), {})));
      } catch (error) {
        console.error("Erro ao carregar:", error);
        toast({ title: "Erro", description: "Falha ao carregar dados", variant: "destructive" });
      }
    };
    fetchInitialData();
  }, []);

  const handleGerarEspelho = async () => {
    if (!funcionarioSelecionado || !dataInicio || !dataFim) {
      toast({
        title: "Atenção",
        description: "Selecione um funcionário e o período",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Se for "todos", buscar todos os funcionários ativos
      let funcionariosParaGerar = [];
      if (funcionarioSelecionado === "todos") {
        funcionariosParaGerar = funcionarios.filter(f => 
          f.status === 'ativo' || f.status === 'experiencia'
        );
      } else {
        const func = funcionarios.find(f => f.id === funcionarioSelecionado);
        if (func) funcionariosParaGerar = [func];
      }

      if (funcionariosParaGerar.length === 0) {
        toast({
          title: "Atenção",
          description: "Nenhum funcionário ativo encontrado",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Buscar todos os registros e ocorrências de uma vez
      const [todosRegs, todasOcorrencias] = await Promise.all([
        base44.entities.PontoRegistro.list("-data_hora", 5000),
        base44.entities.OcorrenciaPonto.list("-data", 2000)
      ]);

      setRegistros(todosRegs || []);
      setOcorrencias(todasOcorrencias || []);
      setFuncionariosSelecionados(funcionariosParaGerar);
      setMostrarEspelho(true);
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: "Erro", description: "Falha ao carregar registros", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImprimir = (funcionarioId) => {
    const cargosMap = JSON.parse(sessionStorage.getItem('cargosMap') || '{}');
    const funcionario = funcionarios.find(f => f.id === funcionarioId);
    const departamento = funcionario ? departamentos.find(d => d.id === funcionario.departamento_id) : null;
    const departamentoResponsavel = departamento?.responsavel_id 
      ? funcionarios.find(f => f.id === departamento.responsavel_id) 
      : null;

    // Filtrar registros e ocorrências para o funcionário específico
    const registrosFuncionario = registros.filter(r => r.funcionario_id === funcionarioId);
    const ocorrenciasFuncionario = ocorrencias.filter(o => o.funcionario_id === funcionarioId);

    const dados = {
      funcionario,
      dataInicio,
      dataFim,
      registros: registrosFuncionario,
      ocorrencias: ocorrenciasFuncionario,
      configuracoes,
      escalas,
      funcionariosEscalas,
      cargos: cargosMap,
      departamentoResponsavel
    };
    
    // Salvar no sessionStorage como fallback
    sessionStorage.setItem('espelhoPontoPrint', JSON.stringify(dados));
    
    // Abrir nova aba
    window.open(createPageUrl('EspelhoPontoPrint'), '_blank');
  };

  const handleImprimirTodos = () => {
    funcionariosSelecionados.forEach((func, index) => {
      setTimeout(() => {
        handleImprimir(func.id);
      }, index * 500); // Delay para evitar conflitos
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-6">
      <div className="max-w-7xl mx-auto">
        {!mostrarEspelho ? (
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Espelho de Ponto</h1>
            <p className="text-slate-600 text-sm md:text-base mb-8">Gere o documento individual para assinatura</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Funcionário</Label>
                <Select value={funcionarioSelecionado || "todos"} onValueChange={setFuncionarioSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar...">
                      {funcionarioSelecionado === "todos" 
                        ? "📋 Todos os Funcionários" 
                        : funcionarios.find(f => f.id === funcionarioSelecionado)?.nome || "Selecionar..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">📋 Todos os Funcionários</SelectItem>
                    {funcionarios.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button
                onClick={handleGerarEspelho}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Gerar Espelho
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setMostrarEspelho(false)}
                variant="outline"
                className="gap-2"
              >
                ← Voltar
              </Button>
              {funcionariosSelecionados.length > 1 ? (
                <Button
                  onClick={handleImprimirTodos}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Todos ({funcionariosSelecionados.length})
                </Button>
              ) : null}
            </div>

            <div className="space-y-8">
              {funcionariosSelecionados.map((func) => {
                const registrosFuncionario = registros.filter(r => r.funcionario_id === func.id);
                const ocorrenciasFuncionario = ocorrencias.filter(o => o.funcionario_id === func.id);
                const departamento = departamentos.find(d => d.id === func.departamento_id);
                const departamentoResponsavel = departamento?.responsavel_id 
                  ? funcionarios.find(f => f.id === departamento.responsavel_id) 
                  : null;

                return (
                  <div key={func.id} className="bg-white rounded-xl shadow-lg p-4 relative">
                    {funcionariosSelecionados.length > 1 && (
                      <div className="flex justify-end mb-2">
                        <Button
                          onClick={() => handleImprimir(func.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        >
                          <Printer className="w-3 h-3" />
                          Imprimir
                        </Button>
                      </div>
                    )}
                    <EspelhoPontoDoc
                      funcionario={func}
                      registros={registrosFuncionario}
                      ocorrencias={ocorrenciasFuncionario}
                      dataInicio={dataInicio}
                      dataFim={dataFim}
                      configuracoes={configuracoes}
                      escalas={escalas}
                      funcionariosEscalas={funcionariosEscalas}
                      cargos={JSON.parse(sessionStorage.getItem('cargosMap') || '{}')}
                      departamento={departamento}
                      departamentoResponsavel={departamentoResponsavel}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}