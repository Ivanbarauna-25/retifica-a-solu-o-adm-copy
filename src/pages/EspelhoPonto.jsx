import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import EspelhoPontoDoc from "@/components/ponto/EspelhoPontoDoc";

export default function EspelhoPontoPage() {
  const { toast } = useToast();

  const [funcionarios, setFuncionarios] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [funcEscalas, setFuncEscalas] = useState([]);

  const [funcionarioId, setFuncionarioId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [registros, setRegistros] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);

  const [loading, setLoading] = useState(false);
  const [mostrarDoc, setMostrarDoc] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Funcionario.list(),
      base44.entities.EscalaTrabalho.list(),
      base44.entities.FuncionarioEscala.list()
    ]).then(([f, e, fe]) => {
      setFuncionarios(f || []);
      setEscalas(e || []);
      setFuncEscalas(fe || []);
    });
  }, []);

  const gerarEspelho = async () => {
    if (!funcionarioId || !dataInicio || !dataFim) {
      toast({ title: "Preencha funcionário e período", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const [regs, ocors] = await Promise.all([
        base44.entities.PontoRegistro.filter(
          { funcionario_id: funcionarioId },
          "-data_hora",
          5000
        ),
        base44.entities.OcorrenciaPonto.filter(
          { funcionario_id: funcionarioId },
          "-data",
          2000
        )
      ]);

      const registrosFiltrados = regs.filter(r => {
        const d = r.data || r.data_hora?.substring(0, 10);
        return d >= dataInicio && d <= dataFim;
      });

      const ocorrenciasFiltradas = ocors.filter(o =>
        o.data >= dataInicio && o.data <= dataFim
      );

      setRegistros(registrosFiltrados);
      setOcorrencias(ocorrenciasFiltradas);
      setMostrarDoc(true);
    } catch {
      toast({ title: "Erro ao gerar espelho", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const funcionario = funcionarios.find(f => f.id === funcionarioId);
  const vinculoEscala = funcEscalas.find(f => f.funcionario_id === funcionarioId);
  const escala = vinculoEscala
    ? escalas.find(e => e.id === vinculoEscala.escala_id)
    : null;

  if (mostrarDoc) {
    return (
      <>
        <div className="no-print bg-slate-800 p-3 flex gap-2">
          <Button variant="outline" onClick={() => setMostrarDoc(false)}>
            Voltar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir
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
    <div className="max-w-5xl mx-auto p-6 bg-white rounded shadow">
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
          <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </div>

        <div>
          <Label>Data fim</Label>
          <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
      </div>

      <Button onClick={gerarEspelho} disabled={loading} className="mt-6">
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Gerar Espelho"}
      </Button>
    </div>
  );
}import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import EspelhoPontoDoc from "@/components/ponto/EspelhoPontoDoc";

export default function EspelhoPontoPage() {
  const { toast } = useToast();

  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioId, setFuncionarioId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [registros, setRegistros] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    base44.entities.Funcionario.list().then(setFuncionarios);
  }, []);

  const gerar = async () => {
    if (!funcionarioId || !dataInicio || !dataFim) {
      toast({ title: "Informe funcionário e período", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const [regs, ocors] = await Promise.all([
        base44.entities.PontoRegistro.filter({ funcionario_id: funcionarioId }, "-data_hora", 5000),
        base44.entities.OcorrenciaPonto.filter({ funcionario_id: funcionarioId }, "-data", 2000)
      ]);

      const filtrados = regs.filter(r => {
        const d = r.data || r.data_hora?.substring(0,10);
        return d >= dataInicio && d <= dataFim;
      });

      const ocFiltradas = ocors.filter(o => o.data >= dataInicio && o.data <= dataFim);

      setRegistros(filtrados);
      setOcorrencias(ocFiltradas);
      setMostrar(true);
    } catch {
      toast({ title: "Erro ao gerar espelho", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const funcionario = funcionarios.find(f => f.id === funcionarioId);

  if (mostrar) {
    return (
      <>
        <div className="no-print bg-slate-800 p-3 flex gap-2">
          <Button variant="outline" onClick={() => setMostrar(false)}>Voltar</Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        </div>

        <EspelhoPontoDoc
          funcionario={funcionario}
          registros={registros}
          ocorrencias={ocorrencias}
          dataInicio={dataInicio}
          dataFim={dataFim}
        />
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Espelho de Ponto</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Funcionário</Label>
          <Select value={funcionarioId} onValueChange={setFuncionarioId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              {funcionarios.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Data início</Label>
          <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </div>

        <div>
          <Label>Data fim</Label>
          <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
      </div>

      <Button onClick={gerar} disabled={isLoading} className="mt-6">
        {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Gerar Espelho"}
      </Button>
    </div>
  );
}