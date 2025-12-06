import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function FichaContratacao({ isOpen, candidato, cargos = [], onClose }) {
  const cargoNome = useMemo(() => {
    if (!candidato?.cargo_id) return "Não informado";
    const c = cargos.find((x) => String(x.id) === String(candidato.cargo_id));
    return c?.nome || "Não informado";
  }, [candidato, cargos]);

  return (
    <>
      <style>{`
        .ficha-contratacao-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .ficha-contratacao-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .ficha-contratacao-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .ficha-contratacao-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .ficha-contratacao-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .ficha-contratacao-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .ficha-contratacao-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .ficha-contratacao-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .ficha-contratacao-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .ficha-contratacao-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-3xl h-[95vh] md:max-h-[90vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-4 md:px-6 py-4 no-print">
            <DialogTitle className="text-white text-base md:text-lg">Ficha de Contratação</DialogTitle>
          </DialogHeader>

          <div className="ficha-contratacao-scroll flex-1 px-4 md:px-6 pb-4 md:pb-6">
            <div className="text-center border-b pb-2 mb-3 mt-4">
              <h2 className="text-lg md:text-xl font-bold text-black">Ficha de Contratação</h2>
              <p className="text-xs text-black">Retífica a Solução • Dados do Candidato</p>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="text-black"><span className="font-semibold">Nome: </span>{candidato?.nome || "-"}</div>
              <div className="text-black"><span className="font-semibold">CPF: </span>{candidato?.cpf || "-"}</div>
              <div className="text-black"><span className="font-semibold">Data de Nascimento: </span>{candidato?.data_nascimento || "-"}</div>
              <div className="text-black"><span className="font-semibold">Telefone: </span>{candidato?.telefone || "-"}</div>
              <div className="text-black"><span className="font-semibold">Email: </span>{candidato?.email || "-"}</div>
              <div className="md:col-span-2 text-black"><span className="font-semibold">Endereço: </span>{candidato?.endereco || "-"}</div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="text-black"><span className="font-semibold">Cargo Pretendido: </span>{cargoNome}</div>
              <div className="text-black">
                <span className="font-semibold">Salário Pretendido: </span>
                {candidato?.salario_pretendido ?
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(candidato.salario_pretendido) : "-"}
              </div>
              <div className="text-black"><span className="font-semibold">Status: </span>{candidato?.status_contratacao || "-"}</div>
              <div className="text-black"><span className="font-semibold">Período de Experiência (dias): </span>{candidato?.periodo_experiencia ?? "-"}</div>
            </section>

            <section className="mt-3">
              <div className="font-semibold text-black">Documentos</div>
              <ul className="list-disc pl-6 space-y-1 text-black">
                <li>RG: {candidato?.doc_rg_url ? <a href={candidato.doc_rg_url} target="_blank" rel="noreferrer" className="text-blue-600">Abrir</a> : "-"}</li>
                <li>CPF: {candidato?.doc_cpf_url ? <a href={candidato.doc_cpf_url} target="_blank" rel="noreferrer" className="text-blue-600">Abrir</a> : "-"}</li>
                <li>Comprovante de Residência: {candidato?.doc_residencia_url ? <a href={candidato.doc_residencia_url} target="_blank" rel="noreferrer" className="text-blue-600">Abrir</a> : "-"}</li>
                <li>Currículo: {candidato?.doc_curriculo_url ? <a href={candidato.doc_curriculo_url} target="_blank" rel="noreferrer" className="text-blue-600">Abrir</a> : "-"}</li>
                <li>Exame Admissional: {candidato?.doc_exame_admissional_url ? <a href={candidato.doc_exame_admissional_url} target="_blank" rel="noreferrer" className="text-blue-600">Abrir</a> : "-"}</li>
                <li>Contrato de Trabalho: {candidato?.doc_contrato_trabalho_url ? <a href={candidato.doc_contrato_trabalho_url} target="_blank" rel="noreferrer" className="text-blue-600">Abrir</a> : "-"}</li>
              </ul>
            </section>

            {candidato?.anotacoes && (
              <section className="mt-3">
                <div className="font-semibold text-black">Anotações</div>
                <div className="whitespace-pre-wrap text-black">{candidato.anotacoes}</div>
              </section>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 no-print flex justify-end gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 border-t bg-white">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 h-10"
            >
              Fechar
            </Button>
            <Button 
              onClick={() => {
                const url = createPageUrl(`FichaCandidato?candidatoId=${candidato?.id}`);
                window.open(url, "_blank");
              }}
              className="bg-slate-600 hover:bg-slate-700 text-white h-10"
            >
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}