import React, { useMemo, useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PlanoContasSelect({ 
  value, 
  onValueChange, 
  planoContas = [], 
  tipoFiltro = null, 
  placeholder = "Selecione o plano de contas...",
  className = ""
}) {
  const [open, setOpen] = useState(false);

  const planosFiltrados = useMemo(() => {
    if (!Array.isArray(planoContas)) return [];
    
    let filtrados = planoContas.filter(p => p && p.ativa);
    
    if (tipoFiltro) {
      filtrados = filtrados.filter(p => p.tipo === tipoFiltro);
    }
    
    return filtrados.sort((a, b) => {
      const codigoA = a.codigo || '';
      const codigoB = b.codigo || '';
      return codigoA.localeCompare(codigoB);
    });
  }, [planoContas, tipoFiltro]);

  const selectedPlano = useMemo(() => {
    return planosFiltrados.find(p => p.id === value);
  }, [planosFiltrados, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedPlano ? (
            <span className="truncate">
              {selectedPlano.codigo ? `${selectedPlano.codigo} - ` : ''}{selectedPlano.nome}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar plano de contas..." />
          <CommandList>
            <CommandEmpty>Nenhum plano de contas encontrado.</CommandEmpty>
            <CommandGroup>
              {planosFiltrados.map((plano) => (
                <CommandItem
                  key={plano.id}
                  value={`${plano.codigo || ''} ${plano.nome}`}
                  onSelect={() => {
                    onValueChange(plano.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === plano.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {plano.codigo ? `${plano.codigo} - ` : ''}{plano.nome}
                    </span>
                    {plano.descricao && (
                      <span className="text-xs text-muted-foreground truncate">
                        {plano.descricao}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}