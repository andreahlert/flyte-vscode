import React, { useState, useRef, useEffect } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && <label className="text-[11px] font-medium opacity-70">{label}</label>}
      <input
        className={`
          w-full px-2.5 py-1.5 rounded text-sm
          bg-[var(--vscode-input-background)]
          text-[var(--vscode-input-foreground)]
          border
          ${error ? 'border-red-500' : 'border-[var(--vscode-input-border,transparent)]'}
          outline-none focus:border-flyte-purple
          placeholder:opacity-40
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-[10px] text-red-400">{error}</span>}
      {hint && !error && <span className="text-[10px] opacity-40">{hint}</span>}
    </div>
  );
}

interface ComboBoxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  hint?: string;
  error?: string;
  allowCustom?: boolean;
}

export function ComboBox({
  label, value, onChange, options, placeholder, hint, error, allowCustom = true,
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter(o =>
    o.toLowerCase().includes((filter || value).toLowerCase())
  ).slice(0, 12);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex flex-col gap-0.5 relative" ref={ref}>
      {label && <label className="text-[11px] font-medium opacity-70">{label}</label>}
      <input
        className={`
          w-full px-2.5 py-1.5 rounded text-sm
          bg-[var(--vscode-input-background)]
          text-[var(--vscode-input-foreground)]
          border
          ${error ? 'border-red-500' : 'border-[var(--vscode-input-border,transparent)]'}
          outline-none focus:border-flyte-purple
          placeholder:opacity-40
        `}
        value={value}
        placeholder={placeholder}
        onChange={e => {
          onChange(e.target.value);
          setFilter(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-0.5 rounded border border-[var(--vscode-widget-border)] bg-[var(--vscode-dropdown-background)] shadow-lg max-h-36 overflow-y-auto">
          {filtered.map(o => (
            <div
              key={o}
              className={`
                px-2.5 py-1.5 text-sm cursor-pointer
                hover:bg-[var(--vscode-list-hoverBackground)]
                ${o === value ? 'bg-flyte-purple/15 text-flyte-purple font-medium' : ''}
              `}
              onMouseDown={() => {
                onChange(o);
                setOpen(false);
                setFilter('');
              }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
      {error && <span className="text-[10px] text-red-400">{error}</span>}
      {hint && !error && <span className="text-[10px] opacity-40">{hint}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && <label className="text-[11px] font-medium opacity-70">{label}</label>}
      <select
        className={`
          w-full px-2.5 py-1.5 rounded text-sm
          bg-[var(--vscode-input-background)]
          text-[var(--vscode-input-foreground)]
          border border-[var(--vscode-input-border,transparent)]
          outline-none focus:border-flyte-purple
          ${className}
        `}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

export function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  return (
    <div className="flex flex-col">
      <label className="flex items-center gap-2 cursor-pointer py-0.5" onClick={() => onChange(!checked)}>
        <div
          className={`
            w-7 h-3.5 rounded-full relative transition-colors duration-200 shrink-0
            ${checked ? 'bg-flyte-purple' : 'bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border,transparent)]'}
          `}
        >
          <div
            className={`
              w-2.5 h-2.5 rounded-full bg-white absolute top-[1px] transition-all duration-200 shadow-sm
              ${checked ? 'left-[15px]' : 'left-[1px]'}
            `}
          />
        </div>
        <span className="text-xs">{label}</span>
      </label>
      {hint && <span className="text-[10px] opacity-40 ml-9">{hint}</span>}
    </div>
  );
}
