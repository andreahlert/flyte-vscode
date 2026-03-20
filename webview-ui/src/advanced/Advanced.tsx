import React from 'react';
import { Section } from '../components/Section';
import { ItemList } from '../components/ItemList';
import { post } from '../vscode';
import type { AppState } from '../types';

interface AdvancedProps {
  state: AppState;
  onBack: () => void;
}

export function Advanced({ state, onBack }: AdvancedProps) {
  return (
    <div className="px-2 py-1">
      <Section title="Environments" count={state.environments.length}>
        <ItemList
          items={state.environments.map(e => ({
            name: e.name,
            description: e.varName,
            icon: '{}',
            file: e.file,
            line: e.location.line,
          }))}
          emptyText="No environments found"
        />
      </Section>

      <div className="h-px bg-[var(--vscode-widget-border)]" />

      <Section title="Tasks" count={state.tasks.length}>
        <ItemList
          items={state.tasks.map(t => ({
            name: t.functionName,
            description: `${t.isAsync ? 'async ' : ''}${t.envVarName}.task`,
            icon: 'fn',
            file: t.file,
            line: t.location.line,
            accentColor: '#6C3FC5',
          }))}
          emptyText="No tasks found"
        />
      </Section>

      <div className="h-px bg-[var(--vscode-widget-border)]" />

      <Section title="Apps" count={state.apps.length}>
        <ItemList
          items={state.apps.map(a => ({
            name: a.name,
            description: a.varName,
            icon: '[]',
            file: a.file,
            line: a.location.line,
          }))}
          emptyText="No apps found"
        />
      </Section>

      <div className="h-px bg-[var(--vscode-widget-border)]" />

      <Section
        title="Clusters"
        count={state.clusters.length}
        actions={
          <div className="flex gap-1">
            <button
              className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center cursor-pointer bg-union-gold text-[#1e1e1e] hover:bg-union-gold-hover border-none"
              onClick={() => post('connectUnion')}
              title="Connect Union.ai"
            >
              U
            </button>
            <button
              className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center cursor-pointer bg-flyte-purple text-white hover:bg-flyte-purple-hover border-none"
              onClick={() => post('connectSelfHosted')}
              title="Self-Hosted"
            >
              F
            </button>
          </div>
        }
      >
        <ItemList
          items={state.clusters.map(c => ({
            name: c.name,
            description: `${c.endpoint}${c.isActive ? ' (active)' : ''}`,
            icon: c.type === 'union' ? 'U' : 'F',
            accentColor: c.type === 'union' ? '#D4A843' : '#6C3FC5',
          }))}
          emptyText="No clusters configured"
        />
      </Section>

      <div className="h-px bg-[var(--vscode-widget-border)]" />

      <Section
        title="Runs"
        actions={
          <button
            className="text-[10px] font-medium opacity-60 hover:opacity-100 cursor-pointer bg-transparent border-none text-[var(--vscode-foreground)]"
            onClick={() => post('openTui')}
          >
            TUI
          </button>
        }
      >
        <p className="text-xs italic opacity-50 px-2 py-1">Use Run Task or open TUI</p>
      </Section>

      <div className="h-px bg-[var(--vscode-widget-border)] mt-2" />

      <div className="text-center py-3">
        <button
          className="text-[11px] opacity-50 hover:opacity-80 cursor-pointer bg-transparent border-none text-[var(--vscode-textLink-foreground)]"
          onClick={onBack}
        >
          Back to start
        </button>
      </div>
    </div>
  );
}
