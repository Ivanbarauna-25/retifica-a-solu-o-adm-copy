import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/components/formatters";

export default function EspelhoPonto({ pontos }) {
  const [dados, setDados] = useState([]);

  useEffect(() => {
    if (pontos && Array.isArray(pontos)) {
      // Ordena pontos por data para exibição
      const ordenados = [...pontos].sort((a, b) => a.data.localeCompare(b.data));
      setDados(ordenados);
    }
  }, [pontos]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Espelho de Ponto</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Nenhum registro de ponto disponível.
                  </TableCell>
                </TableRow>
              ) : (
                dados.map((ponto) => (
                  <TableRow key={ponto.id}>
                    <TableCell>{formatDate(ponto.data)}</TableCell>
                    <TableCell>{ponto.entrada || "-"}</TableCell>
                    <TableCell>{ponto.saida || "-"}</TableCell>
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
