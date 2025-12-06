import React, { useEffect, useMemo, useState } from "react";

/**
 * Campo de busca/seleção de contatos (cliente/funcionário/fornecedor).
 * - NÃO renderiza label (a página já mostra).
 * - Só abre a lista quando o input está focado.
 * - Sempre devolve string no formato "tipo:id" via onChange/onValueChange.
 * - Compatível com value sendo string "tipo:id" OU objeto do contato.
 */
export default function SearchableContactSelect({
  value,                // pode ser "tipo:id" ou objeto { id, tipo, nome/label }
  onChange,             // callback(valueString)
  onValueChange,        // callback(valueString)
  contacts = [],        // lista local de contatos
  placeholder = "Busque por cliente, funcionário ou fornecedor...",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [display, setDisplay] = useState("");

  // Normaliza contatos em { value: "tipo:id", label, searchValue }
  const options = useMemo(() => {
    if (!Array.isArray(contacts)) return [];
    return contacts.map((c) => {
      const id   = c.id ?? c.value ?? "";
      const tipo = (c.tipo ?? c.type ?? "").toString();
      const nome = (c.nome ?? c.label ?? "").toString().trim();

      const value = `${tipo}:${id}`;

      // Evita duplicar "(Cliente)" se já vier no label original
      const alreadyTagged = /\(.+\)$/.test(nome);
      const label = alreadyTagged || !tipo
        ? nome
        : `${nome} (${capitalize(tipo)})`;

      return { value, label, searchValue: `${nome} ${tipo}`.toLowerCase() };
    });
  }, [contacts]);

  // Quando vier um value externo, tentamos exibir o label correspondente
  useEffect(() => {
    const str = toValueString(value);
    const opt = options.find((o) => o.value === str);
    if (opt) setDisplay(opt.label);
  }, [value, options]);

  // Lista filtrada (pelo que o usuário digitou)
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return options;
    return options.filter((o) => o.searchValue.includes(text));
  }, [query, options]);

  // Selecionar um item => fecha lista, mostra label e notifica o pai
  const handleSelect = (item) => {
    const valueString = toValueString(item?.value);
    setDisplay(item?.label ?? "");
    setOpen(false);
    // Garante que quem escutar receba SEMPRE string "tipo:id"
    if (typeof onChange === "function") onChange(valueString);
    if (typeof onValueChange === "function") onValueChange(valueString);
  };

  // Abrir/fechar conforme foco. Fechamento com pequeno atraso para permitir o click no item.
  const onBlurSafe = () => setTimeout(() => setOpen(false), 120);

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <div className="relative">
        <input
          type="text"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder={placeholder}
          value={open ? query : display}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={onBlurSafe}
          autoComplete="off"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto">
            {filtered.map((item) => (
              <div
                key={item.value}
                className="px-3 py-2 cursor-pointer hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()} // evita perder o foco antes do click
                onClick={() => handleSelect(item)}
              >
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Converte várias formas de entrada em "tipo:id" */
function toValueString(input) {
  if (!input) return "";
  if (typeof input === "string") return input; // já está no formato
  if (typeof input === "object") {
    // pode ser o próprio contato ou um option
    const id   = input.id ?? input.value?.split?.(":")?.[1] ?? input.value ?? "";
    const tipo = input.tipo ?? input.type ?? input.value?.split?.(":")?.[0] ?? "";
    return `${tipo}:${id}`;
  }
  return "";
}

function capitalize(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}