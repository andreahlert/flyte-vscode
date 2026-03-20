import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Input({ label, hint, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium opacity-70">{label}</label>
      <input
        className={`
          w-full px-2.5 py-1.5 rounded text-sm
          bg-[var(--vscode-input-background)]
          text-[var(--vscode-input-foreground)]
          border border-[var(--vscode-input-border,transparent)]
          outline-none
          focus:border-flyte-purple
          placeholder:opacity-40
          ${className}
        `}
        {...props}
      />
      {hint && <span className="text-[10px] opacity-40">{hint}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium opacity-70">{label}</label>
      <select
        className={`
          w-full px-2.5 py-1.5 rounded text-sm
          bg-[var(--vscode-input-background)]
          text-[var(--vscode-input-foreground)]
          border border-[var(--vscode-input-border,transparent)]
          outline-none
          focus:border-flyte-purple
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
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer py-1">
      <div
        className={`
          w-8 h-4 rounded-full relative transition-colors duration-200 cursor-pointer
          ${checked ? 'bg-flyte-purple' : 'bg-[var(--vscode-input-background)]'}
        `}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`
            w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all duration-200
            ${checked ? 'left-[18px]' : 'left-0.5'}
          `}
        />
      </div>
      <span className="text-xs">{label}</span>
    </label>
  );
}
