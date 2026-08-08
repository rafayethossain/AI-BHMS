import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string | number;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  required = false,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || '';
  const [inputValue, setInputValue] = useState(selectedLabel);

  useEffect(() => {
    setInputValue(selectedLabel);
  }, [selectedLabel]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputValue(selectedLabel);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedLabel]);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.description && o.description.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSelect(option: Option) {
    onChange(option.value);
    setInputValue(option.label);
    setSearch('');
    setIsOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setInputValue('');
    setSearch('');
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    setSearch(e.target.value);
    if (!isOpen) setIsOpen(true);
  }

  function handleFocus() {
    setSearch('');
    setIsOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="relative cursor-pointer"
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={!isOpen && !!selectedLabel}
          className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm
            placeholder-faint focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500
            disabled:opacity-50 disabled:cursor-not-allowed pr-8"
        />
        {(value || inputValue) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-heading text-xs"
          >
            ✕
          </button>
        )}
        {!value && !inputValue && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-faint text-xs pointer-events-none">▾</div>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-input-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filtered.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-alt transition-colors
                ${option.value === value ? 'bg-emerald-500/10 text-emerald-400' : 'text-body'}`}
            >
              <span>{option.label}</span>
              {option.description && (
                <span className="block text-xs text-faint mt-0.5">{option.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {isOpen && search && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-input-border rounded-lg shadow-xl px-3 py-2 text-sm text-muted">
          No results found
        </div>
      )}
    </div>
  );
}
