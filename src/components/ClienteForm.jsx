import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { UF_LIST } from "@/components/constants/ufs";

export default function ClienteForm({ isOpen, cliente, onSave, onClose }) {
  const [saving, setSaving] = React.useState(false);
  const [cepLoading, setCepLoading] = React.useState(false);
  const [cepError, setCepError] = React.useState("");

  const [data, setData] = React.useState({
    nome: "",
    cpf_cnpj: "",
    telefone: "",
    email: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: ""
  });

  React.useEffect(() => {
    if (cliente) {
      const ufSource = cliente.uf || cliente.uf_legado || "";
      const ufValid = UF_LIST.includes(ufSource) ? ufSource : "";
      setData({
        nome: cliente.nome || "",
        cpf_cnpj: cliente.cpf_cnpj || "",
        telefone: cliente.telefone || "",
        email: cliente.email || "",
        cep: cliente.cep || "",
        logradouro: cliente.logradouro || "",
        numero: cliente.numero || "",
        complemento: cliente.complemento || "",
        bairro: cliente.bairro || "",
        cidade: cliente.cidade || cliente.cidade_legado || "",
        uf: ufValid
      });
    } else {
      setData((prev) => ({ ...prev, 
        nome: "",
        cpf_cnpj: "",
        telefone: "",
        email: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: ""
      }));
    }
    setCepError("");
  }, [cliente]);

  const handleChange = (field, value) => {
    setData((d) => ({ ...d, [field]: value }));
  };

  const sanitizeCEP = (v) => v.replace(/\D/g, "").slice(0, 8);

  const buscarCEP = async () => {
    setCepError("");
    const raw = sanitizeCEP(data.cep || "");
    if (raw.length !== 8) {
      setCepError("Informe um CEP válido (8 dígitos).");
      return;
    }
    try {
      setCepLoading(true);
      const resp = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const json = await resp.json();
      if (!resp.ok || json.erro) {
        setCepError("CEP não encontrado.");
        return;
      }
      setData((d) => {
        const ufFromApi = json.uf || d.uf || "";
        return {
          ...d,
          logradouro: json.logradouro || d.logradouro,
          bairro: json.bairro || d.bairro,
          cidade: json.localidade || d.cidade,
          uf: UF_LIST.includes(ufFromApi) ? ufFromApi : d.uf // só aceita UF válida
        };
      });
    } catch (e) {
      setCepError("Falha ao consultar CEP. Tente novamente.");
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...data,
        cep: sanitizeCEP(data.cep),
        uf: UF_LIST.includes(data.uf) ? data.uf : "" // garante UF válida
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <DialogHeader className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{cliente ? "Editar Cliente" : "Novo Cliente"}</h2>
              <p className="text-xs text-slate-300 mt-0.5">Preencha os dados do cliente</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 bg-slate-100/50 space-y-4">
          {/* Dados básicos */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-800 text-sm">Dados Básicos</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome" className="text-sm font-semibold text-slate-700">Nome</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={data.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input id="cpf_cnpj" value={data.cpf_cnpj} onChange={(e) => handleChange("cpf_cnpj", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={data.telefone} onChange={(e) => handleChange("telefone", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</Label>
              <Input id="email" type="email" value={data.email} onChange={(e) => handleChange("email", e.target.value)} className="mt-1.5" />
            </div>
          </div>
          </div>

          {/* Endereço */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-800 text-sm">Endereço</h3>
            </div>
            <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <Label htmlFor="cep" className="text-sm font-semibold text-slate-700">CEP</Label>
                <div className="flex gap-2">
                  <Input
                    id="cep"
                    placeholder="Somente números"
                    value={data.cep}
                    onChange={(e) => handleChange("cep", sanitizeCEP(e.target.value))}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={buscarCEP}
                    disabled={cepLoading || !data.cep}
                    className="whitespace-nowrap"
                  >
                    <Search className="w-4 h-4 mr-1" />
                    {cepLoading ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
                {cepError && <p className="text-sm text-red-600 mt-1">{cepError}</p>}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input id="logradouro" value={data.logradouro} onChange={(e) => handleChange("logradouro", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" value={data.numero} onChange={(e) => handleChange("numero", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input id="complemento" value={data.complemento} onChange={(e) => handleChange("complemento", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" value={data.bairro} onChange={(e) => handleChange("bairro", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={data.cidade}
                  onChange={(e) => handleChange("cidade", e.target.value)}
                />
              </div>
              <div>
                <Label>Estado (UF)</Label>
                <Select
                  value={data.uf || undefined}
                  onValueChange={(v) => handleChange("uf", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_LIST.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-300 text-slate-700 hover:bg-slate-50">Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-800 hover:bg-slate-900 text-white">{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}