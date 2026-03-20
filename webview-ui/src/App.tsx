import React, { useState, useEffect, useCallback } from 'react';
import { Landing } from './wizard/Landing';
import { Wizard } from './wizard/Wizard';
import { Advanced } from './advanced/Advanced';
import { vscode, post } from './vscode';
import type { AppState } from './types';

const initialState: AppState = vscode.getState() ?? {
  mode: 'landing',
  wizardStep: 0,
  environments: [],
  tasks: [],
  apps: [],
  clusters: [],
};

export function App() {
  const [state, setState] = useState<AppState>(initialState);

  const update = useCallback((partial: Partial<AppState>) => {
    setState(prev => {
      const next = { ...prev, ...partial };
      vscode.setState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'init' || msg.type === 'refresh') {
        update({
          environments: msg.data.environments ?? [],
          tasks: msg.data.tasks ?? [],
          apps: msg.data.apps ?? [],
          clusters: msg.data.clusters ?? [],
        });
      }
    };
    window.addEventListener('message', handler);
    post('ready');
    return () => window.removeEventListener('message', handler);
  }, [update]);

  switch (state.mode) {
    case 'wizard':
      return (
        <Wizard
          state={state}
          onNext={() => update({ wizardStep: Math.min(state.wizardStep + 1, 4) })}
          onPrev={() => update({ wizardStep: Math.max(state.wizardStep - 1, 0) })}
          onFinish={() => update({ mode: 'advanced' })}
          onSkip={() => update({ mode: 'advanced' })}
        />
      );
    case 'advanced':
      return (
        <Advanced
          state={state}
          onBack={() => update({ mode: 'landing' })}
        />
      );
    default:
      return (
        <Landing
          onWizard={() => update({ mode: 'wizard', wizardStep: 0 })}
          onAdvanced={() => update({ mode: 'advanced' })}
        />
      );
  }
}
