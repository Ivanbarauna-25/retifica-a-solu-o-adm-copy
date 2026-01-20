import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Printer, X } from "lucide-react";
import { formatDate } from "@/components/formatters";

function monthPrefix(mesReferencia) {
  // espera "YYYY-MM"
  if (!mesReferencia || typeof mesReferencia !== "string") return "";
  return mesReferencia.slice(0, 7);
}

function safeStr(v) {
  return (v ?? "").toString();
}

function sortByHora(a, b) {
  return safeStr(a).localeCompare(safeStr(b));
}

export default function EspelhoPonto({ isOpen, ponto, funcionario, onClose }) {
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [batidas, setBatidas] = useState([]);

  const funcionarioNome = funcionario?.nome || "Funcionário";
  const mesRef = ponto?.mes_referencia || "";
  const mesKey = monthPrefix(mesRef);
  const funcionarioId = ponto?.funcionario_id;

  useEffect(() => {
    let mounted = true;

    const carregar = async () => {
      if (!isOpen) return;

      setErro(null);
      setBatidas([]);
      if (!funcionarioId || !mesKey) {
        setErro("Registro de Controle de Ponto sem funcionário ou mês de referência.");
        return;
      }

      setIsLoading(true);
      try {
        // Base44 normalmente não tem filtro por intervalo avançado.
        // Estratégia segura: buscar um lote grande e filtrar no cliente.
        const regs = await base44.entities.PontoRegistro.list("-data_hora", 5000);

        const filtrados = (regs || [])
          .filter(Boolean)
          .filter((r) => safeStr(r.funcionario_id) === safeStr(funcionarioId))
          .filter((r) => safeStr(r.data || "").startsWith(mesKey))
          .filter((r) => r.valido !== false);

        if (mounted) setBatidas(filtrados);
      } catch (e) {
        if (mounted) setErro(e?.message || "Erro ao carregar batidas do ponto.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    carregar();
    return () => {
      mounted = false;
    };
  }, [isOpen, funcionarioId, mesKey]);

  const espelhoPorDia = useMemo(() => {
    // Agrupa por data: { 'YYYY-MM-DD': ['08:00:00','12:00:00',...] }
    const map = new Map();

    for (const r of batidas) {
      const data = safeStr(r.data);
      const hora = safeStr(r.hora) || safeStr(r.data_hora).split(" ")[1] || "";
      if (!data) continue;

      if (!map.has(data)) map.set(data, []);
      if (hora) map.get(data).push(hora);
    }

    const dias = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    return dias.map((data) => {
      const horas = map.get(data).sort(sortByHora);
      const entrada = horas[0] || "-";
      const saida = horas.length > 1 ? horas[horas.length - 1] : "-";
      return { data, horas, entrada, saida };
    });
  }, [batidas]);

  const totalBatidas = batidas.length;

  const handlePrint = () => {
    // imprime a tela inteira; o CSS de print abaixo esconde botões e mantém conteúdo
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl w-[95vw] sm:w-full">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-wrap { box-shadow: none !important; border: none !important; }
            body { background: white !important; }
          }
        `}</style>

        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Espelho de Ponto</span>
            <Badge variant="outline" className="no-print">
              {mesRef ? mesRef : "Mês não definido"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="print-wrap">
          <Card className="border-slate-200">
            <CardContent className="p-3 md:p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="text-sm md:text-base font-semibold text-slate-900">
                    {funcionarioNome}
                  </div>
                  <div className="text-xs text-slate-500">
                    Total de batidas válidas no mês: <strong>{totalBatidas}</strong>
                  </div>
                </div>

                <div className="flex gap-2 no-print">
                  <Button variant="outline" onClick={handlePrint} className="gap-2">
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </Button>
                </div>
              </div>

              {erro ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {erro}
                </div>
              ) : isLoading ? (
                <div className="py-10 text-center text-slate-600">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Carregando batidas...
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-700">
                      <TableRow>
                        <TableHead className="text-white text-xs md:text-sm">Data</TableHead>
                        <TableHead className="text-white text-xs md:text-sm">Entrada</TableHead>
                        <TableHead className="text-white text-xs md:text-sm">Saída</TableHead>
                        <TableHead className="text-white text-xs md:text-sm">Batidas do dia</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {espelhoPorDia.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                            Nenhuma batida encontrada para este funcionário neste mês.
                          </TableCell>
                        </TableRow>
                      ) : (
                        espelhoPorDia.map((dia) => (
                          <TableRow key={dia.data} className="hover:bg-slate-50">
                            <TableCell className="text-xs md:text-sm font-medium">
                              {formatDate(dia.data)}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm font-mono">
                              {dia.entrada}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm font-mono">
                              {dia.saida}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              <div className="flex flex-wrap gap-1">
                                {dia.horas.map((h, idx) => (
                                  <Badge key={`${dia.data}-${idx}`} variant="secondary" className="font-mono">
                                    {h}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="w-4 h-4" />
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
