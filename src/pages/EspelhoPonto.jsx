import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import EspelhoPontoDoc from "@/components/ponto/EspelhoPontoDoc.jsx";

export default function EspelhoPontoPage() {
  const { toast } = useToast();

  const [funcionarios, setFuncionarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [configuracoes, setConfiguracoes] = useState(null);
  const [escalas, setEscalas] = useState([]);
  const [funcionariosEscalas, setFuncionariosEscalas] = useState([]);

  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [registros, setRegistros] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [mostrarEspelho, setMostrarEspelho] = useState(false);

  /* ==========================
     Carga inicial
  ========================== */
  useEffect(() => {
    const carregar = async () => {
      try {
        const [
          funcs,
          configs,
          esc,
          funcEsc,
          cargos,
          depts
        ] = await Promise.all([
          base44.entities.Funcionario.list(),
          base44.entities.Configuracoes.list(),
          base44.entities.EscalaTrabalho.list(),
          base44.entities.FuncionarioEscala.list(),
          base44.entities.Cargo.list(),
          base44.entities.Departamento.list()
        ]);

        setFuncionarios(
          (funcs || []).sort((a, b) =>
            (a?.nome || "").localeCompare(b?.nome || "")
          )
        );
        setConfiguracoes(configs?.[0] || null);
        setEscalas(esc || []);
        setFuncionariosEscalas(funcEsc || []);
        setDepartamentos(depts || []);

        sessionStorage.setItem(
          "cargosMap",
          JSON.stringify(
            (cargos || []).reduce((acc, c) => {
              acc[c.id] = c;
              return acc;
            }, {})
          )
        );
      } catch (err) {
        console.error(err);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados iniciais",
          variant: "destructive"
        });
      }
    };

    carregar();
  }, []);

  /* ==========================
     Utilidades
  ========================== */
  const gerarDatasPeriodo = (inicio, fim) => {
    const datas = [];
    let d = new Date(inicio + "T12:00:00");
    const end = new Date(fim + "T12:00:00");

    while (d <= end) {
      datas.push(d.toISOString().substring(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return datas;
  };

  /* ==========================
     Gerar Espelho
  ========================== */
  const handleGerarEspelho = async () => {
    if (!funcionarioSelecionado || !dataInicio || !dataFim) {
      toast({
        title: "Atenção",
        description: "Selecione funcionário e período",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const [regsData, ocorrenciasData] = await Promise.all([
        base44.entities.PontoRegistro.filter(
          { funcionario_id: funcionarioSelecionado },
          "-data_hora",
          3000
        ),
        base44.entities.OcorrenciaPonto.filter(
          { funcionario_id: funcionarioSelecionado },
          "-data",
          1000
        )
      ]);

      const registrosPeriodo = (regsData || []).filter(r => {
        if (!r.data_hora) return false;
        const d = r.data_hora.substring(0, 10);
        return d >= dataInicio && d <= dataFim;
      });

      const ocorrenciasPeriodo = (ocorrenciasData || []).filter(o =>
        o.data >= dataInicio && o.data <= dataFim
      );

      const dias = gerarDatasPeriodo(dataInicio, dataFim);

      // 👉 AGRUPAR BATIDAS POR DIA
      const registrosPorDia = {};
      registrosPeriodo.forEach(r => {
        const dia = r.data_hora.substring(0, 10);
        if (!registrosPorDia[dia]) registrosPorDia[dia] = [];
        registrosPorDia[dia].push(r);
      });

      // 👉 GERAR LINHAS COMPLETAS (inclusive dias vazios)
      const registrosFinal = dias.map(dia => ({
        funcionario_id: funcionarioSelecionado,
        data: dia,
        batidas: registrosPorDia[dia] || []
      }));

      setRegistros(registrosFinal);
      setOcorrencias(ocorrenciasPeriodo);
      setMostrarEspelho(true);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro",
        description: "Falha ao gerar espelho",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ==========================
     Derivações
  ========================== */
  const funcionario = funcionarios.find(f => f.id === funcionarioSelecionado);
  const departamento = funcionario
    ? departamentos.find(d => d.id === funcionario.departamento_id)
    : null;

  const departamentoResponsavel =
    departamento?.responsavel_id
      ? funcionarios.find(f => f.id === departamento.responsavel_id)
      : null;

  /* ==========================
     Render
  ========================== */
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50">
        {!mostrarEspelho ? (
          <div className="max-w-4xl mx-auto p-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h1 className="text-2xl font-bold mb-2">Espelho de Ponto</h1>
              <p className="text-slate-600 mb-6">
                Documento individual para conferência e assinatura
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Funcionário *</Label>
                  <Select
                    value={funcionarioSelecionado}
                    onValueChange={setFuncionarioSelecionado}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
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
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Data Fim *</Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6">
                <Button
                  onClick={handleGerarEspelho}
                  disabled={isLoading}
                  className="bg-blue-600 text-white gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  Gerar Espelho
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="no-print bg-slate-800 px-4 py-3 flex gap-2 sticky top-0 z-10">
              <Button
                variant="outline"
                onClick={() => setMostrarEspelho(false)}
                className="bg-white"
              >
                ← Voltar
              </Button>
              <Button
                onClick={() => window.print()}
                className="bg-green-600 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
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
              cargos={JSON.parse(sessionStorage.getItem("cargosMap") || "{}")}
              departamento={departamento}
              departamentoResponsavel={departamentoResponsavel}
            />
          </div>
        )}
      </div>
    </>
  );
}