import React from 'react';

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="text-xs leading-relaxed bg-[var(--vscode-textCodeBlock-background)] rounded-md p-3 my-2 overflow-x-auto font-[var(--vscode-editor-font-family)]">
      {children}
    </pre>
  );
}
