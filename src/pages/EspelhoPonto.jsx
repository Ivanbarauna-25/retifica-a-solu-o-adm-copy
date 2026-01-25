import { useEffect, useState } from "react";
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
import EspelhoPontoDoc from "@/components/ponto/EspelhoPontoDoc";

export default function EspelhoPonto() {
  const { toast } = useToast();

  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioId, setFuncionarioId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [registros, setRegistros] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [escala, setEscala] = useState(null);

  const [loading, setLoading] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    base44.entities.Funcionario.list().then(setFuncionarios);
  }, []);

  const gerarEspelho = async () => {
    if (!funcionarioId || !dataInicio || !dataFim) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione funcionário e período",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const [regs, ocors, vinculo] = await Promise.all([
        base44.entities.PontoRegistro.filter(
          { funcionario_id: funcionarioId },
          "-data_hora",
          5000
        ),
        base44.entities.OcorrenciaPonto.filter(
          { funcionario_id: funcionarioId },
          "-data",
          2000
        ),
        base44.entities.FuncionarioEscala.filter(
          { funcionario_id: funcionarioId },
          "-created_at",
          1
        )
      ]);

      const registrosFiltrados = regs.filter(r => {
        const d = r.data || r.data_hora?.substring(0, 10);
        return d >= dataInicio && d <= dataFim;
      });

      const ocorrenciasFiltradas = ocors.filter(
        o => o.data >= dataInicio && o.data <= dataFim
      );

      setRegistros(registrosFiltrados);
      setOcorrencias(ocorrenciasFiltradas);

      if (vinculo?.length) {
        const esc = await base44.entities.EscalaTrabalho.get(
          vinculo[0].escala_id
        );
        setEscala(esc);
      } else {
        setEscala(null);
      }

      setMostrar(true);
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro",
        description: "Falha ao gerar espelho",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const funcionario = funcionarios.find(f => f.id === funcionarioId);

  if (mostrar) {
    return (
      <>
        <div className="no-print bg-slate-900 p-3 flex gap-2">
          <Button variant="outline" onClick={() => setMostrar(false)}>
            Voltar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>

        <EspelhoPontoDoc
          funcionario={funcionario}
          registros={registros}
          ocorrencias={ocorrencias}
          escala={escala}
          dataInicio={dataInicio}
          dataFim={dataFim}
        />
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Espelho de Ponto</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Funcionário</Label>
          <Select value={funcionarioId} onValueChange={setFuncionarioId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar" />
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
          <Label>Data início</Label>
          <Input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
          />
        </div>

        <div>
          <Label>Data fim</Label>
          <Input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={gerarEspelho} disabled={loading} className="mt-6">
        {loading ? (
          <Loader2 className="animate-spin w-4 h-4" />
        ) : (
          "Gerar Espelho"
        )}
      </Button>
    </div>
  );
}