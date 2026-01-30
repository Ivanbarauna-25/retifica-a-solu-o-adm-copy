import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Printer, X } from "lucide-react";
import { formatDate } from "@/components/formatters";

function safeStr(v) {
  return (v ?? "").toString();
}

function minToHHmm(min) {
  if (!min || min === 0) return "00:00";
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  const sinal = min < 0 ? "-" : "";
  return `${sinal}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getDiaSemana(dateStr) {
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const d = new Date(dateStr + "T00:00:00");
  return dias[d.getDay()] || "";
}

export default function EspelhoPontoCompleto({ isOpen, funcionario, mesReferencia, onClose }) {
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [apuracoes, setApuracoes] = useState([]);
  const [configuracoes, setConfiguracoes] = useState(null);
  const [cargo, setCargo] = useState(null);
  const [departamento, setDepartamento] = useState(null);

  const funcionarioNome = funcionario?.nome || "Funcionário";
  const funcionarioCpf = funcionario?.cpf || "";
  const funcionarioId = funcionario?.id;
  const mesKey = mesReferencia ? mesReferencia.slice(0, 7) : "";

  useEffect(() => {
    let mounted = true;

    const carregar = async () => {
      if (!isOpen) return;

      setErro(null);
      setApuracoes([]);

      if (!funcionarioId || !mesKey) {
        setErro("Funcionário ou mês de referência não definidos.");
        return;
      }

      setIsLoading(true);
      try {
        const [apuracoesData, configsData, cargosData, departamentosData] = await Promise.all([
          base44.entities.ApuracaoDiariaPonto.list("-data", 500),
          base44.entities.Configuracoes.list(),
          funcionario?.cargo_id ? base44.entities.Cargo.list() : Promise.resolve([]),
          funcionario?.departamento_id ? base44.entities.Departamento.list() : Promise.resolve([])
        ]);

        const apuracoesFiltradas = (apuracoesData || [])
          .filter((a) => safeStr(a.funcionario_id) === safeStr(funcionarioId))
          .filter((a) => safeStr(a.data || "").startsWith(mesKey))
          .sort((a, b) => (a.data || "").localeCompare(b.data || ""));

        if (mounted) {
          setApuracoes(apuracoesFiltradas);
          setConfiguracoes(configsData?.[0] || null);
          setCargo(cargosData?.find((c) => c.id === funcionario.cargo_id) || null);
          setDepartamento(departamentosData?.find((d) => d.id === funcionario.departamento_id) || null);
        }
      } catch (e) {
        console.error("Erro ao carregar espelho:", e);
        if (mounted) setErro(e?.message || "Erro ao carregar dados do espelho.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    carregar();
    return () => { mounted = false; };
  }, [isOpen, funcionarioId, mesKey]);

  // Totalizadores do mês
  const totais = useMemo(() => {
    return apuracoes.reduce(
      (acc, a) => ({
        trabalhado: acc.trabalhado + (a.total_trabalhado_min || 0),
        atraso: acc.atraso + (a.atraso_min || 0),
        falta: acc.falta + (a.falta_min || 0),
        horaExtra: acc.horaExtra + (a.hora_extra_min || 0),
        diasTrabalhados: a.status !== "falta" ? acc.diasTrabalhados + 1 : acc.diasTrabalhados
      }),
      { trabalhado: 0, atraso: 0, falta: 0, horaExtra: 0, diasTrabalhados: 0 }
    );
  }, [apuracoes]);

  const handlePrint = () => {
    window.print();
  };

  const nomeEmpresa = configuracoes?.nome_empresa || "";
  const cnpjEmpresa = configuracoes?.cnpj || "";
  const enderecoEmpresa = configuracoes?.endereco || "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-6xl w-[98vw] sm:w-full modern-modal overflow-y-auto max-h-[95vh] p-0 gap-0">
        <style>{`
          @media print {
            html, body {
              margin: 0;
              padding: 0;
              width: 210mm;
              height: 297mm;
            }
            .no-print { display: none !important; }
            .print-page {
              box-shadow: none !important;
              border: none !important;
              padding: 15mm !important;
              page-break-after: auto;
            }
            .modern-modal {
              max-width: 100% !important;
              max-height: none !important;
              overflow: visible !important;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        `}</style>

        <div className="print-page px-3 md:px-4 pb-4">
          {/* Header - apenas impresso */}
          <div className="hidden print:block mb-6 text-center border-b-2 border-slate-800 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">{nomeEmpresa || "Empresa"}</h1>
            {cnpjEmpresa && <p className="text-sm text-slate-600">CNPJ: {cnpjEmpresa}</p>}
            {enderecoEmpresa && <p className="text-sm text-slate-600">{enderecoEmpresa}</p>}
            <h2 className="text-xl font-bold text-slate-800 mt-4">ESPELHO DE PONTO</h2>
          </div>

          {/* Header - tela */}
          <div className="no-print sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-3 md:px-4 py-2.5 md:py-3 rounded-t-lg mb-4 flex items-center justify-between shadow-md">
            <div>
              <h2 className="text-xs md:text-base font-bold">Espelho de Ponto - {mesReferencia}</h2>
              <p className="text-slate-300 text-[9px] md:text-xs">{funcionarioNome}</p>
            </div>
            <div className="flex gap-1.5 md:gap-2">
              <Button variant="outline" onClick={handlePrint} className="gap-1.5 bg-white text-slate-800 hover:bg-slate-100 text-[10px] md:text-xs h-7 md:h-9">
                <Printer className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
              <Button variant="outline" onClick={onClose} className="gap-1.5 bg-white text-slate-800 hover:bg-slate-100 text-[10px] md:text-xs h-7 md:h-9">
                <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span className="hidden sm:inline">Fechar</span>
              </Button>
            </div>
          </div>

          {erro ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {erro}
            </div>
          ) : isLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
              <p className="text-xs md:text-sm text-slate-600">Carregando espelho...</p>
            </div>
          ) : (
            <>
              {/* Identificação do Funcionário */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 md:p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                <div><strong>Nome:</strong> {funcionarioNome}</div>
                <div><strong>CPF:</strong> {funcionarioCpf || "N/A"}</div>
                <div><strong>Cargo:</strong> {cargo?.nome || "N/A"}</div>
                <div><strong>Departamento:</strong> {departamento?.nome || "N/A"}</div>
                <div><strong>ID Relógio:</strong> {funcionario?.user_id_relogio || "N/A"}</div>
                <div><strong>Período:</strong> {mesReferencia}</div>
              </div>

              {/* Tabela de Apurações Diárias */}
              <div className="rounded-md border overflow-x-auto mb-4">
                <Table>
                  <TableHeader className="bg-slate-800">
                    <TableRow>
                      <TableHead className="text-white font-semibold text-[10px] md:text-xs">Data</TableHead>
                      <TableHead className="text-white font-semibold text-[10px] md:text-xs">Dia</TableHead>
                      <TableHead className="text-white font-semibold text-[10px] md:text-xs">Entrada 1</TableHead>
                      <TableHead className="text-white font-semibold text-[10px] md:text-xs">Saída 1</TableHead>
                      <TableHead className="text-white font-semibold text-[10px] md:text-xs">Entrada 2</TableHead>
                      <TableHead className="text-white font-semibold text-[10px] md:text-xs">Saída 2</TableHead>
                      <TableHead className="text-white font-semibold text-[10px] md:text-xs text-center">Total</TableHead>
                      <TableHead className="text-white font-semibold text-[10px] md:text-xs text-center">Atraso</TableHead>
                      <TableHead className="text-white font-semibold text-[10px] md:text-xs text-center">H. Extra</TableHead>
                      <TableHead className="text-white font-semibold text-[10px] md:text-xs">Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apuracoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-slate-500 text-xs md:text-sm">
                          Nenhuma apuração encontrada para este funcionário neste mês.
                        </TableCell>
                      </TableRow>
                    ) : (
                      apuracoes.map((apu) => (
                        <TableRow key={apu.id} className="hover:bg-slate-50">
                          <TableCell className="text-[10px] md:text-xs font-medium">
                            {apu.data ? formatDate(apu.data) : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] md:text-xs">
                            {apu.data ? getDiaSemana(apu.data) : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] md:text-xs font-mono">
                            {apu.entrada_1 || "-"}
                          </TableCell>
                          <TableCell className="text-[10px] md:text-xs font-mono">
                            {apu.saida_1 || "-"}
                          </TableCell>
                          <TableCell className="text-[10px] md:text-xs font-mono">
                            {apu.entrada_2 || "-"}
                          </TableCell>
                          <TableCell className="text-[10px] md:text-xs font-mono">
                            {apu.saida_2 || "-"}
                          </TableCell>
                          <TableCell className="text-[10px] md:text-xs text-center font-semibold">
                            {minToHHmm(apu.total_trabalhado_min)}
                          </TableCell>
                          <TableCell className="text-[10px] md:text-xs text-center text-red-600">
                            {apu.atraso_min > 0 ? minToHHmm(apu.atraso_min) : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] md:text-xs text-center text-green-600">
                            {apu.hora_extra_min > 0 ? minToHHmm(apu.hora_extra_min) : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] md:text-xs max-w-[150px] truncate">
                            {apu.observacoes || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Resumo do Mês */}
              <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 md:p-4 mb-6">
                <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-2">Resumo do Mês</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 text-xs md:text-sm">
                  <div>
                    <span className="text-slate-600">Dias Trabalhados:</span>
                    <strong className="ml-1">{totais.diasTrabalhados}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Total Trabalhado:</span>
                    <strong className="ml-1">{minToHHmm(totais.trabalhado)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Atrasos:</span>
                    <strong className="ml-1 text-red-600">{minToHHmm(totais.atraso)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Faltas:</span>
                    <strong className="ml-1 text-red-600">{minToHHmm(totais.falta)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Horas Extras:</span>
                    <strong className="ml-1 text-green-600">{minToHHmm(totais.horaExtra)}</strong>
                  </div>
                </div>
              </div>

              {/* Bloco de Assinaturas */}
              <div className="border-t-2 border-slate-300 pt-6 mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs md:text-sm text-slate-600 mb-2">Assinatura do Funcionário:</p>
                    <div className="border-b-2 border-slate-400 pb-1 mb-2 h-12"></div>
                    <div className="text-xs md:text-sm text-slate-700">
                      <div>Nome: {funcionarioNome}</div>
                      <div>Data: ____/____/______</div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs md:text-sm text-slate-600 mb-2">Assinatura do Gestor/Responsável:</p>
                    <div className="border-b-2 border-slate-400 pb-1 mb-2 h-12"></div>
                    <div className="text-xs md:text-sm text-slate-700">
                      <div>Nome: _________________________________</div>
                      <div>Data: ____/____/______</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações Gerais */}
              <div className="mt-6 text-[10px] md:text-xs text-slate-500">
                <p>Documento gerado automaticamente pelo sistema em {new Date().toLocaleDateString("pt-BR")}.</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}