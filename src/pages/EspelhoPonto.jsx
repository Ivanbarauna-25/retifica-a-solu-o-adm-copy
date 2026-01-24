import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import EspelhoPontoDoc from "@/components/ponto/EspelhoPontoDoc.jsx";

export default function EspelhoPontoPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);
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
  const { toast } = useToast();

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
      const [regsData, ocorrenciasData] = await Promise.all([
        base44.entities.PontoRegistro.filter({
          funcionario_id: funcionarioSelecionado
        }, "-data_hora", 2000),
        base44.entities.OcorrenciaPonto.filter({
          funcionario_id: funcionarioSelecionado
        }, "-data", 1000)
      ]);

      // Filtrar localmente por data para evitar problemas de timezone
      const registrosFiltrados = (regsData || []).filter(reg => {
        if (!reg.data_hora) return false;
        const data = reg.data_hora.substring(0, 10);
        return data >= dataInicio && data <= dataFim;
      });
      
      const ocorrenciasFiltradas = (ocorrenciasData || []).filter(ocor => {
        return ocor.data >= dataInicio && ocor.data <= dataFim;
      });

      setRegistros(registrosFiltrados);
      setOcorrencias(ocorrenciasFiltradas);
      setMostrarEspelho(true);
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: "Erro", description: "Falha ao carregar registros", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const funcionario = funcionarios.find(f => f.id === funcionarioSelecionado);
  const departamento = funcionario ? departamentos.find(d => d.id === funcionario.departamento_id) : null;
  const departamentoResponsavel = departamento?.responsavel_id 
    ? funcionarios.find(f => f.id === departamento.responsavel_id) 
    : null;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50">
        {!mostrarEspelho ? (
          <div className="max-w-4xl mx-auto p-3 md:p-6">
            <div className="bg-white rounded-lg md:rounded-xl shadow-lg p-4 md:p-8">
              <h1 className="text-xl md:text-3xl font-bold text-slate-900 mb-2">Espelho de Ponto</h1>
              <p className="text-slate-600 text-xs md:text-base mb-6 md:mb-8">Gere o documento individual para assinatura</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                <div className="space-y-1.5 md:space-y-2">
                  <Label className="text-xs md:text-sm font-semibold">Funcionário *</Label>
                  <Select value={funcionarioSelecionado || ""} onValueChange={setFuncionarioSelecionado}>
                    <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                      <SelectValue placeholder="Selecionar...">
                        {funcionarioSelecionado ? funcionarios.find(f => f.id === funcionarioSelecionado)?.nome : "Selecionar..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {funcionarios.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label className="text-xs md:text-sm font-semibold">Data Início *</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="h-9 md:h-10 text-xs md:text-sm"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label className="text-xs md:text-sm font-semibold">Data Fim *</Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="h-9 md:h-10 text-xs md:text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 md:gap-3 mt-6 md:mt-8">
                <Button
                  onClick={handleGerarEspelho}
                  disabled={isLoading}
                  className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 md:h-10 text-xs md:text-sm"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Printer className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                  Gerar Espelho
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-screen">
            {/* Barra de ações - oculta na impressão */}
            <div className="no-print bg-slate-800 px-3 md:px-4 py-2 md:py-3 flex items-center gap-2 md:gap-3 shadow-lg sticky top-0 z-10">
              <Button
                onClick={() => setMostrarEspelho(false)}
                variant="outline"
                className="gap-1.5 md:gap-2 bg-white h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
              >
                ← Voltar
              </Button>
              <Button
                onClick={() => window.print()}
                className="gap-1.5 md:gap-2 bg-green-600 hover:bg-green-700 text-white h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
              >
                <Printer className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Imprimir
              </Button>
            </div>

            {/* Documento para impressão */}
            <div className="bg-white">
              <EspelhoPontoDoc
                funcionario={funcionario}
                registros={registros}
                ocorrencias={ocorrencias}
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
          </div>
        )}
      </div>
    </>
  );
}