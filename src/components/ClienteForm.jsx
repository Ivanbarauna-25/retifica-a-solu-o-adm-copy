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
      <DialogContent className="w-[95vw] md:max-w-3xl p-0 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[80vh] flex flex-col">
        <DialogHeader className="sticky top-0 z-10 px-2.5 md:px-6 py-2 md:py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Search className="w-4 h-4 md:w-5 md:h-5 text-white" />
            <span className="text-xs md:text-lg font-semibold">{cliente ? "Editar Cliente" : "Novo Cliente"}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-2.5 md:p-6 bg-slate-100/50 space-y-2 md:space-y-4 overflow-y-auto flex-1">
          {/* Dados básicos */}
          <div className="bg-white rounded-lg md:rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-2.5 md:px-4 py-1.5 md:py-3">
              <h3 className="font-bold text-slate-800 text-[11px] md:text-sm">Dados Básicos</h3>
            </div>
            <div className="p-2.5 md:p-4 grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
            <div className="col-span-2 md:col-span-1">
              <Label htmlFor="nome" className="text-[11px] md:text-sm font-semibold text-slate-700">Nome</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={data.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                required
                className="h-8 md:h-10 text-[11px] md:text-sm mt-0.5 md:mt-1"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label htmlFor="cpf_cnpj" className="text-[11px] md:text-sm">CPF/CNPJ</Label>
              <Input id="cpf_cnpj" value={data.cpf_cnpj} onChange={(e) => handleChange("cpf_cnpj", e.target.value)} className="h-8 md:h-10 text-[11px] md:text-sm mt-0.5 md:mt-1" />
            </div>
            <div>
              <Label htmlFor="telefone" className="text-[11px] md:text-sm">Telefone</Label>
              <Input id="telefone" value={data.telefone} onChange={(e) => handleChange("telefone", e.target.value)} required className="h-8 md:h-10 text-[11px] md:text-sm mt-0.5 md:mt-1" />
            </div>
            <div>
              <Label htmlFor="email" className="text-[11px] md:text-sm">Email</Label>
              <Input id="email" type="email" value={data.email} onChange={(e) => handleChange("email", e.target.value)} className="h-8 md:h-10 text-[11px] md:text-sm mt-0.5 md:mt-1" />
            </div>
          </div>
          </div>

          {/* Endereço */}
          <div className="bg-white rounded-lg md:rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-2.5 md:px-4 py-1.5 md:py-3">
              <h3 className="font-bold text-slate-800 text-[11px] md:text-sm">Endereço</h3>
            </div>
            <div className="p-2.5 md:p-4 space-y-2 md:space-y-3">
            <div className="grid grid-cols-3 md:grid-cols-3 gap-1.5 md:gap-3">
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="cep" className="text-[11px] md:text-sm">CEP</Label>
                <div className="flex gap-1 md:gap-2 mt-0.5 md:mt-1">
                  <Input
                    id="cep"
                    placeholder="Números"
                    value={data.cep}
                    onChange={(e) => handleChange("cep", sanitizeCEP(e.target.value))}
                    className="h-8 md:h-10 text-[11px] md:text-sm"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={buscarCEP}
                    disabled={cepLoading || !data.cep}
                    className="h-8 md:h-10 text-[11px] md:text-sm px-2 md:px-4"
                  >
                    <Search className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </div>
                {cepError && <p className="text-[10px] text-red-600 mt-0.5">{cepError}</p>}
              </div>
              <div className="col-span-3 md:col-span-2">
                <Label htmlFor="logradouro" className="text-[11px] md:text-sm">Logradouro</Label>
                <Input id="logradouro" value={data.logradouro} onChange={(e) => handleChange("logradouro", e.target.value)} className="h-8 md:h-10 text-[11px] md:text-sm mt-0.5 md:mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-4 gap-1.5 md:gap-3">
              <div>
                <Label htmlFor="numero" className="text-[11px] md:text-sm">Nº</Label>
                <Input id="numero" value={data.numero} onChange={(e) => handleChange("numero", e.target.value)} className="h-8 md:h-10 text-[11px] md:text-sm mt-0.5 md:mt-1" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="complemento" className="text-[11px] md:text-sm">Complemento</Label>
                <Input id="complemento" value={data.complemento} onChange={(e) => handleChange("complemento", e.target.value)} className="h-8 md:h-10 text-[11px] md:text-sm mt-0.5 md:mt-1" />
              </div>
              <div>
                <Label htmlFor="bairro" className="text-[11px] md:text-sm">Bairro</Label>
                <Input id="bairro" value={data.bairro} onChange={(e) => handleChange("bairro", e.target.value)} className="h-8 md:h-10 text-[11px] md:text-sm mt-0.5 md:mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-3 gap-1.5 md:gap-3">
              <div className="col-span-2">
                <Label htmlFor="cidade" className="text-[11px] md:text-sm">Cidade</Label>
                <Input
                  id="cidade"
                  value={data.cidade}
                  onChange={(e) => handleChange("cidade", e.target.value)}
                  className="h-8 md:h-10 text-[11px] md:text-sm mt-0.5 md:mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] md:text-sm">UF</Label>
                <Select
                  value={data.uf || undefined}
                  onValueChange={(v) => handleChange("uf", v)}
                >
                  <SelectTrigger className="w-full h-8 md:h-10 text-[11px] md:text-sm mt-0.5 md:mt-1">
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

          <div className="flex items-center justify-end gap-2 pt-2 pb-1 md:pt-4 border-t border-slate-200 flex-shrink-0 bg-white sticky bottom-0">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-300 text-slate-700 hover:bg-slate-50 h-8 md:h-10 text-[11px] md:text-sm px-3 md:px-4">Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-800 hover:bg-slate-900 text-white h-8 md:h-10 text-[11px] md:text-sm px-3 md:px-4">{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}