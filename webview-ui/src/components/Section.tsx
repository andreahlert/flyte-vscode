import React from 'react';

interface SectionProps {
  title: string;
  count?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function Section({ title, count, actions, children }: SectionProps) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1 px-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider opacity-70">{title}</h4>
        <div className="flex items-center gap-1.5">
          {count !== undefined && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
              {count}
            </span>
          )}
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}
