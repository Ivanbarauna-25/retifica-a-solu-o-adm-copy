import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";

/**
 * ComboBox
 * Props:
 * - value: string | null
 * - onChange: (value: string | null) => void
 * - options: Array<{ value: string, label: string }>
 * - placeholder?: string
 * - searchPlaceholder?: string
 * - emptyText?: string
 * - className?: string
 * - disabled?: boolean
 * - clearable?: boolean
 */
export default function ComboBox({
  value,
  onChange,
  options = [],
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyText = "Sem resultados.",
  className = "",
  disabled = false,
  clearable = true
}) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => {
    if (value == null || value === "") return null;
    return options.find((opt) => String(opt.value) === String(value)) || null;
  }, [value, options]);

  const handleSelect = (val) => {
    if (String(val) === String(value)) {
      // Selecting the same value toggles (optional). Keep selected to avoid accidental clear.
      setOpen(false);
      return;
    }
    onChange?.(val);
    setOpen(false);
  };

  const handleClear = () => {
    onChange?.("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`w-full justify-between ${className}`}
        >
          <span className={`truncate ${selected ? "text-slate-900" : "text-slate-400"}`}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty className="py-3 text-sm text-slate-500">{emptyText}</CommandEmpty>
          <CommandGroup>
            <CommandList>
              {options.map((opt) => (
                <CommandItem
                  key={String(opt.value)}
                  value={String(opt.label)}
                  onSelect={() => handleSelect(opt.value)}
                  className="cursor-pointer"
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      String(opt.value) === String(value) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
              {clearable && (
                <CommandItem onSelect={handleClear} className="text-red-600 cursor-pointer">
                  Limpar seleção
                </CommandItem>
              )}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}