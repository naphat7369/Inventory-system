"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export type SearchableSelectOption = {
  value: string;
  label: string;
  searchText?: string;
};

type Props = {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  ariaLabel: string;
  compact?: boolean;
};

export function SearchableSelect({ value, options, onChange, placeholder, disabled = false, required = false, ariaLabel, compact = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) setQuery(selected?.label ?? value);
  }, [open, selected?.label, value]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('th-TH');
    if (!normalized || (!open && value)) return options;
    return options.filter((option) => `${option.label} ${option.searchText ?? ''}`.toLocaleLowerCase('th-TH').includes(normalized));
  }, [open, options, query, value]);

  const choose = (option: SearchableSelectOption) => {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
    setActiveIndex(0);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          required={required && !value}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setQuery(''); setActiveIndex(0); }}
          onChange={(event) => { setQuery(event.target.value); onChange(''); setOpen(true); setActiveIndex(0); }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, filtered.length - 1)); }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
            if (event.key === 'Enter' && open && filtered[activeIndex]) { event.preventDefault(); choose(filtered[activeIndex]); }
            if (event.key === 'Escape') { setOpen(false); setQuery(selected?.label ?? value); }
          }}
          className={`w-full rounded-lg border border-gray-300 bg-white pl-9 pr-9 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 ${compact ? 'py-1.5' : 'py-2'}`}
        />
        <button type="button" disabled={disabled} onClick={() => { setOpen((current) => !current); setQuery(''); inputRef.current?.focus(); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none dark:hover:bg-slate-700" aria-label={`เปิด${ariaLabel}`}>
          <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && !disabled && (
        <div role="listbox" className="absolute z-40 mt-1 max-h-64 w-full min-w-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-500">ไม่พบผู้อนุมัติที่ค้นหา</div>
          ) : filtered.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${index === activeIndex ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Check className={`mt-0.5 h-4 w-4 shrink-0 ${option.value === value ? 'text-blue-600' : 'invisible'}`} />
              <span className="min-w-0 whitespace-normal">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
