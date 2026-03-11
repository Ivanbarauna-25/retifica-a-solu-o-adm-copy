import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import {
  User, Briefcase, MapPin, Phone, Mail, Calendar, CreditCard,
  FileText, Edit, Building2, Users, Banknote, AlertCircle,
  Printer, HardHat, History, Clock, Fingerprint, X, UserMinus, Settings
} from "lucide-react";
import EntregaEPIModal from "@/components/epi/EntregaEPIModal";
import HistoricoEPIModal from "@/components/epi/HistoricoEPIModal";
import VincularEscalaFuncionarioModal from "@/components/ponto/VincularEscalaFuncionarioModal";
import { formatCurrency, formatDate } from "@/components/formatters";

const statusMap = {
  ativo:       { label: "Ativo",          dot: "bg-emerald-500" },
  experiencia: { label: "Em Experiência", dot: "bg-amber-500"   },
  ferias:      { label: "Em Férias",      dot: "bg-blue-500"    },
  afastado:    { label: "Afastado",       dot: "bg-orange-500"  },
  demitido:    { label: "Demitido",       dot: "bg-red-500"     },
};

const regimeMap = {
  clt: "CLT", pj: "PJ", estagio: "Estágio",
  aprendiz: "Aprendiz", temporario: "Temporário", terceirizado: "Terceirizado",
};

const StatusBadge = ({ label, dot }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700">
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
    {label}
  </span>
);

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 mb-4">
    {Icon && <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</span>
  </div>
);

const InfoItem = ({ label, value, highlight }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
    <p className={`text-sm font-medium break-words ${highlight ? "text-emerald-600 font-bold" : "text-slate-800"}`}>
      {value || "—"}
    </p>
  </div>
);

export default function FuncionarioViewer({ isOpen, funcionario, onClose, onEdit, onUpdated, onDemitir }) {
  const [cargo, setCargo] = useState(null);
  const [departamento, setDepartamento] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEntregaEPI, setShowEntregaEPI] = useState(false);
  const [showHistoricoEPI, setShowHistoricoEPI] = useState(false);
  const [showVincularEscala, setShowVincularEscala] = useState(false);

  useEffect(() => {
    if (!isOpen || !funcionario) return;
    setIsLoading(true);
    Promise.all([
      funcionario.cargo_id
        ? base44.entities.Cargo.filter({ id: funcionario.cargo_id }).then(d => d?.[0] || null)
        : Promise.resolve(null),
      funcionario.departamento_id
        ? base44.entities.Departamento.filter({ id: funcionario.departamento_id }).then(d => d?.[0] || null)
        : Promise.resolve(null),
    ]).then(([c, d]) => { setCargo(c); setDepartamento(d); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isOpen, funcionario]);

  if (!funcionario) return null;

  const handlePrint = () => {
    if (funcionario?.id) window.open(`/FichaFuncionario?id=${funcionario.id}`, "_blank");
  };

  const st = statusMap[funcionario.status] || statusMap.ativo;
  const enNo = funcionario?.user_id_relogio ? String(funcionario.user_id_relogio).trim() : "";

  const tabTriggerClass =
    "flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent whitespace-nowrap";

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose?.(); }}>
      <DialogContent
        className="max-w-2xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl border-0"
        data-custom-modal="true"
      >
        {/* Header */}
        <div className="flex-shrink-0 rounded-t-xl" style={{ background: "#0B1629" }}>
          {/* Top row: icon + name + X */}
          <div className="flex items-start justify-between gap-3 px-4 md:px-5 pt-4 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-bold leading-tight truncate" style={{color:'#fff'}}>
                  {funcionario.nome}
                </h2>
                <p className="text-[11px] mt-0.5 truncate" style={{color:'rgba(255,255,255,0.5)'}}>
                  {funcionario.user_id_relogio ? `ID Relógio: ${funcionario.user_id_relogio}` : "Sem ID relógio"}
                  {cargo?.nome ? ` · ${cargo.nome}` : ""}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5 px-4 md:px-5 pb-3">
            <Button
              onClick={() => setShowVincularEscala(true)}
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 gap-1.5 text-xs h-8 px-3"
            >
              <Clock className="w-3.5 h-3.5" /> Escalas
            </Button>
            <Button
              onClick={() => setShowEntregaEPI(true)}
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 gap-1.5 text-xs h-8 px-3"
            >
              <HardHat className="w-3.5 h-3.5" /> Entregar EPI
            </Button>
            <Button
              onClick={() => setShowHistoricoEPI(true)}
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 gap-1.5 text-xs h-8 px-3"
            >
              <History className="w-3.5 h-3.5" /> Histórico
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 gap-1.5 text-xs h-8 px-3"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </Button>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-1.5 px-4 md:px-5 pb-3">
            <StatusBadge label={st.label} dot={st.dot} />
            {funcionario.regime && (
              <StatusBadge label={regimeMap[funcionario.regime] || funcionario.regime} dot="bg-slate-400" />
            )}
            {cargo?.nome && (
              <StatusBadge label={cargo.nome} dot="bg-blue-400" />
            )}
          </div>
        </div>

        {/* Tabs */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Carregando...</div>
        ) : (
          <Tabs defaultValue="dados" className="flex-1 flex flex-col min-h-0">
            <div className="border-b border-slate-200 bg-white flex-shrink-0 overflow-x-auto">
              <TabsList className="flex bg-transparent p-0 h-auto gap-0 w-max min-w-full">
                <TabsTrigger value="dados" className={tabTriggerClass}>
                  <User className="w-3.5 h-3.5" /> Dados
                </TabsTrigger>
                <TabsTrigger value="profissional" className={tabTriggerClass}>
                  <Briefcase className="w-3.5 h-3.5" /> Profissional
                </TabsTrigger>
                <TabsTrigger value="endereco" className={tabTriggerClass}>
                  <MapPin className="w-3.5 h-3.5" /> Endereço
                </TabsTrigger>
                <TabsTrigger value="banco" className={tabTriggerClass}>
                  <CreditCard className="w-3.5 h-3.5" /> Banco
                </TabsTrigger>
                <TabsTrigger value="acesso" className={tabTriggerClass}>
                  <Settings className="w-3.5 h-3.5" /> Acesso
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50">
              {/* TAB: DADOS */}
              <TabsContent value="dados" className="m-0 p-4 md:p-5 space-y-4">
                {/* Ponto / Relógio */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHeader icon={Fingerprint} title="Ponto / Relógio" />
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="ID do Relógio (Equipamento)" value="1" />
                    <InfoItem label="EnNo (ID do Funcionário no Relógio)" value={enNo || "Não informado"} />
                  </div>
                  {!enNo && (
                    <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 flex gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        Atenção: este funcionário está sem <strong>EnNo</strong>. Sem isso, o mapeamento/importação do ponto fica inconsistente.
                      </p>
                    </div>
                  )}
                </div>

                {/* Informações Pessoais */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHeader icon={User} title="Informações Pessoais" />
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="CPF" value={funcionario.cpf} />
                    <InfoItem label="RG" value={funcionario.rg} />
                    <InfoItem label="Data de Nascimento" value={formatDate(funcionario.data_nascimento)} />
                    <InfoItem label="Email" value={funcionario.email} />
                    <InfoItem label="Telefone" value={funcionario.telefone} />
                    <InfoItem label="Telefone 2" value={funcionario.telefone2} />
                  </div>
                </div>

                {/* Contato Emergência */}
                {(funcionario.contato_emergencia || funcionario.telefone_emergencia) && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <SectionHeader icon={AlertCircle} title="Contato de Emergência" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <InfoItem label="Nome" value={funcionario.contato_emergencia} />
                      <InfoItem label="Telefone" value={funcionario.telefone_emergencia} />
                      <InfoItem label="Parentesco" value={funcionario.parente_emergencia} />
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB: PROFISSIONAL */}
              <TabsContent value="profissional" className="m-0 p-4 md:p-5 space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHeader icon={Briefcase} title="Informações Profissionais" />
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Cargo" value={cargo?.nome || "Não especificado"} />
                    <InfoItem label="Departamento" value={departamento?.nome || "Não especificado"} />
                    <InfoItem label="Data de Início" value={formatDate(funcionario.data_inicio)} />
                    <InfoItem label="Salário" value={formatCurrency(funcionario.salario)} highlight />
                    <InfoItem label="Regime" value={regimeMap[funcionario.regime] || funcionario.regime} />
                    <InfoItem label="Status" value={st.label} />
                    {funcionario.data_fim_experiencia && (
                      <InfoItem label="Fim da Experiência" value={formatDate(funcionario.data_fim_experiencia)} />
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHeader icon={Banknote} title="Parâmetros de Ponto" />
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Desconto por Falta" value={funcionario.regra_desconto_falta === "dia_cheio" ? "Dia cheio" : "Por horas"} />
                    <InfoItem label="Fator H.E. Semana" value={funcionario.fator_hora_extra_semana ? `${funcionario.fator_hora_extra_semana}x` : null} />
                    <InfoItem label="Fator H.E. FDS/Feriado" value={funcionario.fator_hora_extra_fds ? `${funcionario.fator_hora_extra_fds}x` : null} />
                  </div>
                </div>

                {funcionario.observacoes && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <SectionHeader icon={FileText} title="Observações" />
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{funcionario.observacoes}</p>
                  </div>
                )}
              </TabsContent>

              {/* TAB: ENDEREÇO */}
              <TabsContent value="endereco" className="m-0 p-4 md:p-5">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHeader icon={MapPin} title="Endereço Residencial" />
                  {(funcionario.logradouro || funcionario.cidade) ? (
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="CEP" value={funcionario.cep} />
                      <InfoItem label="UF" value={funcionario.uf} />
                      <InfoItem label="Cidade" value={funcionario.cidade} />
                      <InfoItem label="Bairro" value={funcionario.bairro} />
                      <InfoItem label="Logradouro" value={funcionario.logradouro} />
                      <InfoItem label="Número" value={funcionario.numero} />
                      {funcionario.complemento && <InfoItem label="Complemento" value={funcionario.complemento} />}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">Endereço não cadastrado</p>
                  )}
                </div>
              </TabsContent>

              {/* TAB: BANCO */}
              <TabsContent value="banco" className="m-0 p-4 md:p-5">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHeader icon={CreditCard} title="Dados Bancários" />
                  {(funcionario.banco || funcionario.conta || funcionario.pix) ? (
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Banco" value={funcionario.banco} />
                      <InfoItem label="Tipo de Conta" value={funcionario.tipo_conta} />
                      <InfoItem label="Agência" value={funcionario.agencia} />
                      <InfoItem label="Conta" value={funcionario.conta} />
                      {funcionario.pix && <InfoItem label="Chave PIX" value={funcionario.pix} />}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">Dados bancários não cadastrados</p>
                  )}
                </div>
              </TabsContent>

              {/* TAB: ACESSO */}
              <TabsContent value="acesso" className="m-0 p-4 md:p-5">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <SectionHeader icon={Settings} title="Acesso ao Sistema" />
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Tem Acesso" value={funcionario.tem_acesso_sistema ? "Sim" : "Não"} />
                    {funcionario.email_acesso && <InfoItem label="Email de Acesso" value={funcionario.email_acesso} />}
                    {funcionario.convite_status && (
                      <InfoItem label="Status do Convite" value={
                        funcionario.convite_status === "aceito" ? "✅ Aceito" :
                        funcionario.convite_status === "pendente" ? "⏳ Pendente" : "❌ Expirado"
                      } />
                    )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 md:px-5 py-3 border-t border-slate-200 bg-white rounded-b-xl flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="h-9 px-4 text-sm border-slate-300 text-slate-700">
            Fechar
          </Button>
          <Button
            onClick={() => onEdit?.(funcionario)}
            variant="outline"
            className="h-9 px-4 text-sm border-slate-300 text-slate-700 gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" /> Editar
          </Button>
          {funcionario.status !== "demitido" && onDemitir && (
            <Button
              onClick={() => onDemitir?.(funcionario)}
              className="h-9 px-4 text-sm bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              <UserMinus className="w-3.5 h-3.5" /> Demitir
            </Button>
          )}
        </div>

        {/* Sub-modals */}
        <EntregaEPIModal
          isOpen={showEntregaEPI}
          onClose={() => setShowEntregaEPI(false)}
          funcionario={funcionario}
          onSave={() => setShowEntregaEPI(false)}
        />
        <HistoricoEPIModal
          isOpen={showHistoricoEPI}
          onClose={() => setShowHistoricoEPI(false)}
          funcionario={funcionario}
        />
        <VincularEscalaFuncionarioModal
          isOpen={showVincularEscala}
          onClose={() => setShowVincularEscala(false)}
          funcionario={funcionario}
          onVinculoFeito={() => { setShowVincularEscala(false); onUpdated?.(); }}
        />
      </DialogContent>
    </Dialog>
  );
}