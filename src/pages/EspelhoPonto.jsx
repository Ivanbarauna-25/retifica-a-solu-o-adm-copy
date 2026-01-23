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
  const { toast } = useToast();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [funcs, configs, esc, funcEsc, cargos] = await Promise.all([
          base44.entities.Funcionario.list(),
          base44.entities.Configuracoes.list(),
          base44.entities.EscalaTrabalho.list(),
          base44.entities.FuncionarioEscala.list(),
          base44.entities.Cargo.list()
        ]);
        setFuncionarios((funcs || []).sort((a, b) => (a?.nome || "").localeCompare(b?.nome || "")));
        setConfiguracoes(configs?.[0] || null);
        setEscalas(esc || []);
        setFuncionariosEscalas(funcEsc || []);
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
          funcionario_id: funcionarioSelecionado,
          data: { $gte: dataInicio, $lte: dataFim }
        }, "-data_hora", 2000),
        base44.entities.OcorrenciaPonto.filter({
          funcionario_id: funcionarioSelecionado,
          data: { $gte: dataInicio, $lte: dataFim }
        }, "-data", 1000)
      ]);

      setRegistros(regsData || []);
      setOcorrencias(ocorrenciasData || []);
      setMostrarEspelho(true);
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: "Erro", description: "Falha ao carregar registros", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const funcionario = funcionarios.find(f => f.id === funcionarioSelecionado);

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
                <Select value={funcionarioSelecionado || ""} onValueChange={setFuncionarioSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
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
            <div className="flex gap-3">
              <Button
                onClick={() => setMostrarEspelho(false)}
                variant="outline"
                className="gap-2"
              >
                ← Voltar
              </Button>
              <Button
                onClick={() => window.print()}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
            </div>

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
            />
          </div>
        )}
      </div>
    </div>
  );
}