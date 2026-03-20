import React from 'react';
import { post } from '../vscode';

interface Item {
  name: string;
  description?: string;
  icon?: string;
  file?: string;
  line?: number;
  accentColor?: string;
}

export function ItemList({ items, emptyText }: { items: Item[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-xs italic opacity-50 px-2 py-1">{emptyText}</p>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--vscode-list-hoverBackground)] group"
          onClick={() => item.file && post('openFile', { uri: item.file, line: item.line })}
        >
          {item.icon && (
            <span
              className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0"
              style={{
                background: item.accentColor ?? 'var(--vscode-badge-background)',
                color: item.accentColor ? '#fff' : 'var(--vscode-badge-foreground)',
              }}
            >
              {item.icon}
            </span>
          )}
          <span className="text-sm font-medium truncate">{item.name}</span>
          {item.description && (
            <span className="text-xs opacity-50 truncate ml-auto">{item.description}</span>
          )}
        </div>
      ))}
    </div>
  );
}
