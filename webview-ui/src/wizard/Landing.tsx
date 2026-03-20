import React from 'react';
import { FlyteLogo } from '../components/FlyteLogo';
import { Button } from '../components/Button';

interface LandingProps {
  onWizard: () => void;
  onAdvanced: () => void;
}

export function Landing({ onWizard, onAdvanced }: LandingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <FlyteLogo className="w-14 h-14 text-flyte-purple mb-4" />
      <h2 className="text-lg font-semibold mb-1">Welcome to Flyte</h2>
      <p className="text-xs opacity-60 mb-8">Build, deploy and monitor ML workflows</p>

      <div className="w-full max-w-[200px] flex flex-col items-center gap-2">
        <Button onClick={onWizard} className="w-full">
          Starting with Flyte
        </Button>
        <p className="text-[11px] opacity-50 mb-3">Step-by-step guide to create your first pipeline</p>

        <Button variant="secondary" onClick={onAdvanced} className="w-full">
          Advanced
        </Button>
        <p className="text-[11px] opacity-50">Jump straight to the full workspace view</p>
      </div>
    </div>
  );
}
