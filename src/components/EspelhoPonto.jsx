import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatDate } from "@/components/formatters";

function calcularHoras(entrada, saida) {
  if (!entrada || !saida) return "-";

  const [h1, m1] = entrada.split(":").map(Number);
  const [h2, m2] = saida.split(":").map(Number);

  const totalMinutos = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (totalMinutos <= 0) return "-";

  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  return `${horas}h ${minutos}m`;
}

export default function EspelhoPonto({ registros = [] }) {
  const dadosOrdenados = useMemo(() => {
    return [...registros].sort((a, b) => a.data.localeCompare(b.data));
  }, [registros]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Espelho de Ponto</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto border rounded-md">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Horas Trabalhadas</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {dadosOrdenados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Nenhum registro de ponto encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                dadosOrdenados.map((ponto, index) => (
                  <TableRow key={ponto.id ?? `${ponto.data}-${index}`}>
                    <TableCell>{formatDate(ponto.data)}</TableCell>
                    <TableCell>{ponto.entrada || "-"}</TableCell>
                    <TableCell>{ponto.saida || "-"}</TableCell>
                    <TableCell>
                      {calcularHoras(ponto.entrada, ponto.saida)}
                    </TableCell>
                    <TableCell>{ponto.observacoes || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
