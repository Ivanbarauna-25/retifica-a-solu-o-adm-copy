import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer } from "lucide-react";
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

        setFuncionarios((funcs || []).sort((a, b) =>
          (a?.nome || "").localeCompare(b?.nome || "")
        ));
        setConfiguracoes(configs?.[0] || null);
        setEscalas(esc || []);
        setFuncionariosEscalas(funcEsc || []);
        setDepartamentos(depts || []);

        sessionStorage.setItem(
          "cargosMap",
          JSON.stringify(
            (cargos || []).reduce((acc, c) => ({ ...acc, [c.id]: c }), {})
          )
        );
      } catch (error) {
        console.error(error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados iniciais",
          variant: "destructive"
        });
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
      const [regsData, ocorrData] = await Promise.all([
        base44.entities.PontoRegistro.filter(
          { funcionario_id: funcionarioSelecionado },
          "-data_hora",
          2000
        ),
        base44.entities.OcorrenciaPonto.filter(
          { funcionario_id: funcionarioSelecionado },
          "-data",
          1000
        )
      ]);

      const registrosFiltrados = (regsData || []).filter(r => {
        if (!r.data_hora) return false;
        const d = r.data_hora.substring(0, 10);
        return d >= dataInicio && d <= dataFim;
      });

      const ocorrenciasFiltradas = (ocorrData || []).filter(o =>
        o.data >= dataInicio && o.data <= dataFim
      );

      setRegistros(registrosFiltrados);
      setOcorrencias(ocorrenciasFiltradas);
      setMostrarEspelho(true);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Falha ao carregar registros",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const funcionario = funcionarios.find(f => f.id === funcionarioSelecionado);
  const departamento = funcionario
    ? departamentos.find(d => d.id === funcionario.departamento_id)
    : null;

  const departamentoResponsavel = departamento?.responsavel_id
    ? funcionarios.find(f => f.id === departamento.responsavel_id)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {!mostrarEspelho ? (
          <div className="bg-white rounded-xl shadow-lg p-6 no-print">
            <h1 className="text-2xl font-bold mb-1">Espelho de Ponto</h1>
            <p className="text-slate-600 mb-6">
              Gere o documento individual para impressão e assinatura
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>Funcionário</Label>
                <Select value={funcionarioSelecionado || ""} onValueChange={setFuncionarioSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionarios.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data Início</Label>
                <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              </div>

              <div>
                <Label>Data Fim</Label>
                <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={handleGerarEspelho}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Gerar Espelho
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* AÇÕES – NÃO IMPRIME */}
            <div className="flex gap-3 mb-4 no-print">
              <Button variant="outline" onClick={() => setMostrarEspelho(false)}>
                ← Voltar
              </Button>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
            </div>

            {/* DOCUMENTO */}
            <EspelhoPontoDoc
              funcionario={funcionario}
              registros={registros}
              ocorrencias={ocorrencias}
              dataInicio={dataInicio}
              dataFim={dataFim}
              configuracoes={configuracoes}
              escalas={escalas}
              funcionariosEscalas={funcionariosEscalas}
              cargos={JSON.parse(sessionStorage.getItem("cargosMap") || "{}")}
              departamento={departamento}
              departamentoResponsavel={departamentoResponsavel}
            />
          </>
        )}
      </div>
    </div>
  );
}