import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, CheckCircle } from "lucide-react";

export default function FiltrosPontoModal({ 
  isOpen, 
  onClose, 
  filtros, 
  onFiltrosChange,
  funcionarios 
}) {
  const [tempFiltros, setTempFiltros] = React.useState(filtros);

  React.useEffect(() => {
    setTempFiltros(filtros);
  }, [filtros, isOpen]);

  const handleAplicar = () => {
    onFiltrosChange(tempFiltros);
    onClose();
  };

  const handleLimpar = () => {
    const filtrosLimpos = {
      funcionario: "todos",
      dataInicio: "",
      dataFim: "",
      status: "todos"
    };
    setTempFiltros(filtrosLimpos);
    onFiltrosChange(filtrosLimpos);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="modern-modal max-w-[95vw] md:max-w-lg">
        <DialogHeader className="modern-modal-header">
          <DialogTitle className="text-base md:text-lg flex items-center gap-2">
            <Filter className="w-4 h-4 md:w-5 md:h-5" />
            Filtros de Busca
          </DialogTitle>
        </DialogHeader>

        <div className="modern-modal-content space-y-4">
          <div className="space-y-2">
            <Label className="text-xs md:text-sm font-semibold">Funcionário</Label>
            <Select 
              value={tempFiltros.funcionario} 
              onValueChange={(value) => setTempFiltros({...tempFiltros, funcionario: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {funcionarios.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs md:text-sm font-semibold">Data Início</Label>
            <Input
              type="date"
              value={tempFiltros.dataInicio}
              onChange={(e) => setTempFiltros({...tempFiltros, dataInicio: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs md:text-sm font-semibold">Data Fim</Label>
            <Input
              type="date"
              value={tempFiltros.dataFim}
              onChange={(e) => setTempFiltros({...tempFiltros, dataFim: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs md:text-sm font-semibold">Status</Label>
            <Select 
              value={tempFiltros.status} 
              onValueChange={(value) => setTempFiltros({...tempFiltros, status: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="abonado">Abonado</SelectItem>
                <SelectItem value="com_justificativa">Com Justificativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t mt-4">
          <Button
            variant="outline"
            onClick={handleLimpar}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
          <Button
            onClick={handleAplicar}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Aplicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}