
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export default function SmartInput({
  options = [],
  value,
  onChange,
  placeholder = "Digite para buscar...", // Kept original default
  id,
  className = "",
  allowClear = true,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Encontrar o label do valor selecionado
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  // inputValue is now computed based on isOpen and displayValue/searchTerm
  const inputValue = isOpen ? searchTerm : displayValue;

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
    setHighlightedIndex(-1);
  }, [searchTerm, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setIsOpen(true);

    // Se o campo estiver vazio, limpar a seleção
    if (term === '' && allowClear) {
      onChange('');
    }
  };

  const handleOptionSelect = (option) => {
    onChange(option.value);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        inputRef.current?.blur();
        break;
    }
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  // Original handleInputFocus is now inlined in Input component's onFocus prop
  // const handleInputFocus = () => {
  //   setIsOpen(true);
  // };

  return (
    <div className="relative" ref={dropdownRef}> {/* className prop moved from here */}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text" // Added from outline
          value={inputValue} // Changed to inputValue from outline
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)} // Changed to inline function from outline
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-8 bg-white text-black h-10 text-sm w-full ${className}`} // Updated className from outline
          style={{ minWidth: '100%' }} // Added from outline
          autoComplete="off"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && allowClear && !disabled &&
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-100"
              onClick={handleClear}>
              <X className="h-3 w-3" />
            </Button>
          }
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-100"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}>
            <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {isOpen && !disabled &&
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length === 0 ?
            <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Nenhum resultado encontrado
            </div> :
            filteredOptions.map((option, index) =>
              <div
                key={option.value}
                className={`bg-blue-50 text-slate-950 px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-50 ${highlightedIndex === index ? 'bg-gray-100' : ''}`}
                onClick={() => handleOptionSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}>
                <span>{option.label}</span>
                {option.value === value &&
                  <Check className="h-4 w-4 text-blue-600" />
                }
              </div>
            )
          }
        </div>
      }
    </div>
  );
}
