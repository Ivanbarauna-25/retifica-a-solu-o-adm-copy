import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Loader2, Link as LinkIcon, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function MapearFuncionariosModal({
  isOpen,
  onClose,
  onMapeamentoFeito
}) {
  const [registros, setRegistros] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mapeamentos, setMapeamentos] = useState({});
  const [salvando, setSalvando] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const carregar = async () => {
      if (!isOpen) return;

      setIsLoading(true);
      try {
        const [regs, funcs] = await Promise.all([
          base44.entities.PontoRegistro.list("-created_date", 1000),
          base44.entities.Funcionario.list()
        ]);

        const semVinculo = (regs || []).filter((r) => {
          const enno = String(r?.user_id_relogio || "").trim();
          return !r?.funcionario_id && enno;
        });

        if (mounted) {
          setRegistros(semVinculo);
          setFuncionarios(
            (funcs || []).sort((a, b) =>
              (a?.nome || "").localeCompare(b?.nome || "")
            )
          );
        }
      } catch (e) {
        console.error("Erro ao carregar mapeamento:", e);
        toast({
          title: "Erro",
          description: "Não foi possível carregar registros pendentes.",
          variant: "destructive"
        });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    carregar();
    return () => {
      mounted = false;
    };
  }, [isOpen, toast]);

  // Agrupar pendências por EnNo, mantendo apenas IDs numéricos
  const idsPendentes = useMemo(() => {
    const map = new Map();

    for (const r of registros) {
      const id = String(r?.user_id_relogio || "").trim();
      if (!id) continue;

      // CORREÇÃO: garante que mapeamento só pegue EnNo numérico (e não "Dep.", "SERVICOS" etc)
      if (!/^\d+$/.test(id)) continue;

      if (!map.has(id)) {
        map.set(id, { user_id_relogio: id, count: 0 });
      }
      map.get(id).count++;
    }

    return Array.from(map.values()).sort(
      (a, b) => parseInt(a.user_id_relogio, 10) - parseInt(b.user_id_relogio, 10)
    );
  }, [registros]);

  const handleVincular = (userIdRelogio, funcionarioId) => {
    setMapeamentos((prev) => ({ ...prev, [userIdRelogio]: funcionarioId }));
  };

  const handleSalvar = async () => {
    const vinculos = Object.entries(mapeamentos).filter(
      ([, funcId]) => Boolean(funcId)
    );

    if (vinculos.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um vínculo antes de salvar.",
        variant: "destructive"
      });
      return;
    }

    setSalvando(true);
    try {
      // Atualiza registros + funcionário
      for (const [userIdRelogio, funcionarioId] of vinculos) {
        // CORREÇÃO: comparação robusta string vs number
        const regsParaAtualizar = registros.filter(
          (r) =>
            String(r?.user_id_relogio || "").trim() ===
            String(userIdRelogio || "").trim()
        );

        for (const r of regsParaAtualizar) {
          await base44.entities.PontoRegistro.update(r.id, {
            funcionario_id: funcionarioId,
            valido: true,
            motivo_invalido: null
          });
        }

        // Atualiza também o funcionário com o EnNo (ID do relógio)
        await base44.entities.Funcionario.update(funcionarioId, {
          user_id_relogio: String(userIdRelogio).trim()
        });
      }

      toast({
        title: "Mapeamento concluído",
        description: `${vinculos.length} ID(s) de relógio vinculado(s) com sucesso.`
      });

      setMapeamentos({});
      if (onMapeamentoFeito) onMapeamentoFeito();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar mapeamento:", error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível salvar o mapeamento.",
        variant: "destructive"
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full">
        <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-3 rounded-t-lg -mx-6 -mt-6 mb-4">
          <DialogTitle className="text-sm md:text-lg flex items-center gap-2">
            <LinkIcon className="w-4 h-4 md:w-5 md:h-5" />
            Mapear Funcionários aos IDs do Relógio
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto mb-2" />
            <p className="text-xs md:text-sm text-slate-600">
              Carregando registros pendentes...
            </p>
          </div>
        ) : idsPendentes.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-sm md:text-base font-semibold text-slate-900 mb-1">
              Nenhum ID pendente de mapeamento
            </p>
            <p className="text-xs md:text-sm text-slate-600">
              Todos os IDs de relógio já estão vinculados a funcionários.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-xs md:text-sm text-blue-900">
                <strong>{idsPendentes.length}</strong> ID(s) de relógio sem vínculo
                encontrados. Vincule cada ID (EnNo) a um funcionário para validar
                as batidas importadas.
              </p>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">
                      EnNo (ID Relógio)
                    </TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm text-center">
                      Batidas
                    </TableHead>
                    <TableHead className="text-white font-semibold text-xs md:text-sm">
                      Vincular a Funcionário
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {idsPendentes.map((item) => (
                    <TableRow key={item.user_id_relogio} className="hover:bg-slate-50">
                      <TableCell className="font-mono font-semibold text-xs md:text-sm">
                        {item.user_id_relogio}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px] md:text-xs">
                          {item.count} batida(s)
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Select
                          value={mapeamentos[item.user_id_relogio] || ""}
                          onValueChange={(value) =>
                            handleVincular(item.user_id_relogio, value)
                          }
                        >
                          <SelectTrigger className="text-xs md:text-sm">
                            <SelectValue placeholder="Selecione o funcionário..." />
                          </SelectTrigger>
                          <SelectContent>
                            {funcionarios.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="gap-2 text-xs md:text-sm">
            <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Fechar
          </Button>

          {idsPendentes.length > 0 && (
            <Button
              onClick={handleSalvar}
              disabled={salvando || Object.keys(mapeamentos).length === 0}
              className="gap-2 bg-slate-800 hover:bg-slate-700 text-xs md:text-sm"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Salvar Mapeamento
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}