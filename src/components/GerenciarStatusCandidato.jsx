import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function GerenciarStatusCandidato({ candidato, onSave, onClose }) {
  const [formData, setFormData] = useState({
    status_contratacao: "pendente",
    anotacoes: "",
  });

  useEffect(() => {
    if (candidato) {
      setFormData({
        status_contratacao: candidato.status_contratacao || "pendente",
        anotacoes: candidato.anotacoes || "",
      });
    }
  }, [candidato]);

  const handleSelectChange = (value) => {
    setFormData((prev) => ({ ...prev, status_contratacao: value }));
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...candidato, ...formData });
  };

  return (
    <>
      <style>{`
        .gerenciar-status-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .gerenciar-status-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .gerenciar-status-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .gerenciar-status-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .gerenciar-status-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .gerenciar-status-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .gerenciar-status-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .gerenciar-status-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .gerenciar-status-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .gerenciar-status-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-sm h-[95vh] md:max-h-[90vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-4 md:px-6 py-4">
            <DialogTitle className="text-white text-base md:text-lg">
              Gerenciar Status {candidato?.nome ? `- ${candidato.nome}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="gerenciar-status-scroll flex-1 px-4 md:px-6 pb-4 md:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="status_contratacao" className="text-sm font-medium text-black">Status da Contratação</Label>
                <Select value={formData.status_contratacao} onValueChange={handleSelectChange}>
                  <SelectTrigger className="mt-1.5 bg-white text-black">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                    <SelectItem value="contratado">Contratado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="anotacoes" className="text-sm font-medium text-black">Anotações</Label>
                <Textarea 
                  id="anotacoes" 
                  value={formData.anotacoes} 
                  onChange={handleChange} 
                  rows={4}
                  className="mt-1.5 bg-white text-black"
                />
              </div>
            </form>
          </div>

          <DialogFooter className="flex-shrink-0 flex justify-end gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 border-t bg-white">
            <Button 
              variant="outline" 
              type="button" 
              onClick={onClose}
              className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 h-10"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit}
              className="bg-slate-600 hover:bg-slate-700 text-white h-10"
            >
              Salvar Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}