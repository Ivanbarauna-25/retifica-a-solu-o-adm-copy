import React, { useEffect, useMemo, useState } from "react";

/**
 * Campo de seleção de contato (cliente, funcionário ou fornecedor)
 * - Totalmente local (sem fetch)
 * - Abre a lista apenas ao clicar no campo (não abre automaticamente ao focar)
 * - Sempre retorna string "tipo:id" via onChange/onValueChange
 * - Aceita props 'contacts' OU 'allContacts' (compatibilidade)
 * - Não renderiza label por padrão (evita duplicidade). Use showLabel para exibir.
 */
export default function SearchableContactSelect({
  value,                      // pode ser "tipo:id" ou objeto { id, tipo, nome/label }
  onChange,                   // callback(valueString)
  onValueChange,              // callback(valueString)
  contacts = [],              // lista local de contatos
  allContacts = [],           // compatibilidade com chamadas existentes
  placeholder = "Busque por cliente, funcionário ou fornecedor...",
  label = "Contato",
  showLabel = false,          // por padrão não renderiza label interno
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [display, setDisplay] = useState("");

  // Fonte de contatos (compat: contacts tem prioridade, senão allContacts)
  const source = Array.isArray(contacts) && contacts.length ? contacts : (Array.isArray(allContacts) ? allContacts : []);

  // Normaliza contatos em { value: "tipo:id", label, searchValue }
  const options = useMemo(() => {
    return (source || []).map((c) => {
      const id   = c.id ?? c.value ?? "";
      const tipo = (c.tipo ?? c.type ?? "").toString();
      const nome = (c.nome ?? c.label ?? "").toString().trim();
      const valueStr = `${tipo}:${id}`;
      const alreadyTagged = /\(.+\)$/.test(nome);
      const labelStr = alreadyTagged || !tipo ? nome : `${nome} (${capitalize(tipo)})`;
      return { value: valueStr, label: labelStr, searchValue: `${nome} ${tipo}`.toLowerCase() };
    });
  }, [source]);

  // Quando vier um value externo, exibe o label correspondente
  useEffect(() => {
    const str = toValueString(value);
    const opt = options.find((o) => o.value === str);
    setDisplay(opt?.label || "");
  }, [value, options]);

  // Lista filtrada (pelo que o usuário digitou)
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return options;
    return options.filter((o) => o.searchValue.includes(text));
  }, [query, options]);

  // Selecionar um item => fecha lista, mostra label e notifica o pai com "tipo:id"
  const handleSelect = (item) => {
    const valueString = toValueString(item?.value);
    setDisplay(item?.label ?? "");
    setOpen(false);
    setQuery("");
    if (typeof onChange === "function") onChange(valueString);
    if (typeof onValueChange === "function") onValueChange(valueString);
  };

  // Fechar com pequeno atraso para permitir click
  const onBlurSafe = () => setTimeout(() => setOpen(false), 120);

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {showLabel && <label className="text-sm font-medium">{label}</label>}
      <div className="relative">
        <input
          type="text"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder={placeholder}
          value={open ? query : display}
          onClick={() => {
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
                onMouseDown={(e) => e.preventDefault()}   // evita perder o foco antes do click
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