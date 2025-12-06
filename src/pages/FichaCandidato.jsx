import React, { useEffect, useMemo, useState } from "react";
import { Candidato } from "@/entities/Candidato";
import { Cargo } from "@/entities/Cargo";
import { Button } from "@/components/ui/button";

export default function FichaCandidato() {
  const [candidato, setCandidato] = useState(null);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const candidatoId = urlParams.get("candidatoId");
    const load = async () => {
      try {
        const [cand, cargosList] = await Promise.all([
          Candidato.get(candidatoId),
          Cargo.list()
        ]);
        setCandidato(cand);
        setCargos(cargosList || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cargoNome = useMemo(() => {
    if (!candidato?.cargo_id) return "Não informado";
    const c = cargos.find((x) => String(x.id) === String(candidato.cargo_id));
    return c?.nome || "Não informado";
  }, [candidato, cargos]);

  const formatCurrency = (v) =>
    typeof v === "number" ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "-";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="max-w-[800px] mx-auto p-6">
        <div className="no-print flex justify-end gap-2 mb-4">
          <Button variant="outline" onClick={() => window.history.back()}>Voltar</Button>
          <Button onClick={() => window.print()}>Imprimir</Button>
        </div>

        <div className="text-center border-b pb-3 mb-4">
          <h1 className="text-2xl font-bold">Ficha de Contratação</h1>
          <p className="text-sm text-slate-600">Retífica a Solução • Dados do Candidato</p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-4">
          <div><span className="font-semibold">Nome: </span>{candidato?.nome || "-"}</div>
          <div><span className="font-semibold">CPF: </span>{candidato?.cpf || "-"}</div>
          <div><span className="font-semibold">Data de Nascimento: </span>{candidato?.data_nascimento || "-"}</div>
          <div><span className="font-semibold">Telefone: </span>{candidato?.telefone || "-"}</div>
          <div><span className="font-semibold">Email: </span>{candidato?.email || "-"}</div>
          <div className="md:col-span-2"><span className="font-semibold">Endereço: </span>{candidato?.endereco || "-"}</div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-4">
          <div><span className="font-semibold">Cargo Pretendido: </span>{cargoNome}</div>
          <div><span className="font-semibold">Salário Pretendido: </span>{formatCurrency(candidato?.salario_pretendido)}</div>
          <div><span className="font-semibold">Status: </span>{candidato?.status_contratacao || "-"}</div>
          <div><span className="font-semibold">Período de Experiência (dias): </span>{candidato?.periodo_experiencia ?? "-"}</div>
        </section>

        <section className="mb-4">
          <div className="font-semibold mb-1">Documentos</div>
          <ul className="list-disc pl-6 space-y-1">
            <li>RG: {candidato?.doc_rg_url ? <a href={candidato.doc_rg_url} target="_blank" rel="noreferrer" className="text-slate-800 underline">Abrir</a> : "-"}</li>
            <li>CPF: {candidato?.doc_cpf_url ? <a href={candidato.doc_cpf_url} target="_blank" rel="noreferrer" className="text-slate-800 underline">Abrir</a> : "-"}</li>
            <li>Comprovante de Residência: {candidato?.doc_residencia_url ? <a href={candidato.doc_residencia_url} target="_blank" rel="noreferrer" className="text-slate-800 underline">Abrir</a> : "-"}</li>
            <li>Currículo: {candidato?.doc_curriculo_url ? <a href={candidato.doc_curriculo_url} target="_blank" rel="noreferrer" className="text-slate-800 underline">Abrir</a> : "-"}</li>
            <li>Exame Admissional: {candidato?.doc_exame_admissional_url ? <a href={candidato.doc_exame_admissional_url} target="_blank" rel="noreferrer" className="text-slate-800 underline">Abrir</a> : "-"}</li>
            <li>Contrato de Trabalho: {candidato?.doc_contrato_trabalho_url ? <a href={candidato.doc_contrato_trabalho_url} target="_blank" rel="noreferrer" className="text-slate-800 underline">Abrir</a> : "-"}</li>
          </ul>
        </section>

        {candidato?.anotacoes && (
          <section className="mb-2">
            <div className="font-semibold mb-1">Anotações</div>
            <div className="whitespace-pre-wrap">{candidato.anotacoes}</div>
          </section>
        )}
      </div>
    </div>
  );
}