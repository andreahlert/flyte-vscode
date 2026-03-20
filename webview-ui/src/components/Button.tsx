import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'union';

const variants: Record<Variant, string> = {
  primary: 'bg-flyte-purple hover:bg-flyte-purple-hover text-white',
  secondary: 'border border-flyte-purple text-flyte-purple hover:bg-flyte-purple-light bg-transparent',
  ghost: 'text-[var(--vscode-foreground)] hover:bg-[var(--vscode-list-hoverBackground)]',
  union: 'bg-union-gold hover:bg-union-gold-hover text-[#1e1e1e] font-medium',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
}

export function Button({ variant = 'primary', full, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`
        px-4 py-2 rounded-md text-sm font-medium cursor-pointer
        transition-colors duration-150 outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${full ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
