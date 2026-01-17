import React from "react";
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

export default function EspelhoPonto({ pontos = [] }) {
  const dadosOrdenados = [...pontos].sort((a, b) =>
    a.data.localeCompare(b.data)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Espelho de Ponto</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {dadosOrdenados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              )}

              {dadosOrdenados.map((ponto) => (
                <TableRow key={ponto.id}>
                  <TableCell>{formatDate(ponto.data)}</TableCell>
                  <TableCell>{ponto.entrada || "-"}</TableCell>
                  <TableCell>{ponto.saida || "-"}</TableCell>
                  <TableCell>{ponto.observacoes || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
