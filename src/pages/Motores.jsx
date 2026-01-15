import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Fuel } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MotorForm from "@/components/MotorForm";

export default function MotoresPage() {
  const [motores, setMotores] = useState([]);
  const [filteredMotores, setFilteredMotores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMotor, setSelectedMotor] = useState(null);
  const { toast } = useToast();

  const loadMotores = async () => {
    try {
      const data = await base44.entities.Motor.list("-created_date");
      setMotores(data || []);
      setFilteredMotores(data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar motores",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadMotores();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMotores(motores);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = motores.filter(
      (motor) =>
        motor.fabricante?.toLowerCase().includes(term) ||
        motor.modelo?.toLowerCase().includes(term) ||
        motor.codigo?.toLowerCase().includes(term) ||
        motor.potencia?.toLowerCase().includes(term) ||
        motor.cilindradas?.toLowerCase().includes(term)
    );
    setFilteredMotores(filtered);
  }, [searchTerm, motores]);

  const handleNew = () => {
    setSelectedMotor(null);
    setIsFormOpen(true);
  };

  const handleEdit = (motor) => {
    setSelectedMotor(motor);
    setIsFormOpen(true);
  };

  const handleDelete = async (motor) => {
    if (!window.confirm(`Deseja realmente excluir o motor ${motor.modelo}?`)) {
      return;
    }

    try {
      await base44.entities.Motor.delete(motor.id);
      toast({
        title: "Motor excluído com sucesso!",
      });
      loadMotores();
    } catch (error) {
      toast({
        title: "Erro ao excluir motor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async (data) => {
    try {
      if (selectedMotor) {
        await base44.entities.Motor.update(selectedMotor.id, data);
        toast({
          title: "Motor atualizado com sucesso!",
        });
      } else {
        await base44.entities.Motor.create(data);
        toast({
          title: "Motor cadastrado com sucesso!",
        });
      }
      setIsFormOpen(false);
      setSelectedMotor(null);
      loadMotores();
    } catch (error) {
      toast({
        title: "Erro ao salvar motor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const combustivelLabels = {
    flex: "Flex",
    gasolina: "Gasolina",
    etanol: "Etanol",
    diesel: "Diesel",
    gnv: "GNV",
    eletrico: "Elétrico",
    hibrido: "Híbrido",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Cadastro de Motores</h1>
          <p className="text-sm text-gray-600">
            Gerencie os motores cadastrados no sistema
          </p>
        </div>
        <Button
          onClick={handleNew}
          className="bg-slate-800 text-white hover:bg-slate-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Motor
        </Button>
      </div>

      {/* Barra de busca */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por fabricante, modelo, código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredMotores.length} motor(es) encontrado(s)
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-800">
            <TableRow>
              <TableHead className="text-white text-xs md:text-sm">Código</TableHead>
              <TableHead className="text-white text-xs md:text-sm">Fabricante</TableHead>
              <TableHead className="text-white text-xs md:text-sm">Modelo</TableHead>
              <TableHead className="text-white text-xs md:text-sm hidden md:table-cell">Potência</TableHead>
              <TableHead className="text-white text-xs md:text-sm hidden lg:table-cell">Cilindradas</TableHead>
              <TableHead className="text-white text-xs md:text-sm hidden sm:table-cell">Combustível</TableHead>
              <TableHead className="text-white text-xs md:text-sm hidden xl:table-cell">Ano</TableHead>
              <TableHead className="text-white text-xs md:text-sm hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-white text-center text-xs md:text-sm">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMotores.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-gray-500"
                >
                  <Fuel className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum motor cadastrado</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredMotores.map((motor) => (
                <TableRow key={motor.id}>
                  <TableCell className="text-black font-mono text-xs md:text-sm">
                    {motor.codigo || "—"}
                  </TableCell>
                  <TableCell className="text-black font-medium text-xs md:text-sm max-w-[100px] md:max-w-none truncate">
                    {motor.fabricante}
                  </TableCell>
                  <TableCell className="text-black text-xs md:text-sm max-w-[100px] md:max-w-none truncate">
                    {motor.modelo}
                  </TableCell>
                  <TableCell className="text-black text-xs md:text-sm hidden md:table-cell">
                    {motor.potencia || "—"}
                  </TableCell>
                  <TableCell className="text-black text-xs md:text-sm hidden lg:table-cell">
                    {motor.cilindradas || "—"}
                  </TableCell>
                  <TableCell className="text-black hidden sm:table-cell">
                    {motor.combustivel ? (
                      <Badge variant="outline" className="capitalize text-[10px] md:text-xs">
                        {combustivelLabels[motor.combustivel] || motor.combustivel}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-black text-xs md:text-sm hidden xl:table-cell">
                    {motor.ano_fabricacao || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      className={`text-[10px] md:text-xs ${
                        motor.ativo === false
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {motor.ativo === false ? "Inativo" : "Ativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-0.5 md:gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(motor)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 w-7 md:h-8 md:w-8"
                      >
                        <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(motor)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 md:h-8 md:w-8 hidden sm:flex"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Formulário */}
      <MotorForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedMotor(null);
        }}
        onSave={handleSave}
        motor={selectedMotor}
      />
    </div>
  );
}