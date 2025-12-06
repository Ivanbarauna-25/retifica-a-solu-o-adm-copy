import React from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export default function FuncionarioCombobox({
  value,
  onChange,
  options = [],
  placeholder = "Buscar funcionário...",
  emptyText = "Nenhum funcionário encontrado.",
  disabled = false,
}) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => options.find((o) => String(o.id) === String(value)),
    [options, value]
  );

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selected ? selected.nome : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command 
            filter={(value, search) => {
              if (value.toLowerCase().includes(search.toLowerCase())) return 1;
              return 0;
            }}
          >
            <CommandInput placeholder="Digite para buscar..." />
            <CommandList className="max-h-[200px] overflow-y-auto">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={opt.nome}
                    onSelect={() => {
                      onChange(String(opt.id));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        String(value) === String(opt.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {opt.nome}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange("")}
          title="Limpar seleção"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}