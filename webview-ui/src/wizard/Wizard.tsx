import React from 'react';
import { Button } from '../components/Button';
import { CodeBlock } from '../components/CodeBlock';
import { ItemList } from '../components/ItemList';
import { post } from '../vscode';
import type { AppState } from '../types';

const STEPS = [
  { id: 'environment', title: 'Environment' },
  { id: 'tasks', title: 'Tasks' },
  { id: 'apps', title: 'Apps' },
  { id: 'cluster', title: 'Cluster' },
  { id: 'run', title: 'First Run' },
];

interface WizardProps {
  state: AppState;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  onSkip: () => void;
}

export function Wizard({ state, onNext, onPrev, onFinish, onSkip }: WizardProps) {
  const step = STEPS[state.wizardStep];
  const progress = ((state.wizardStep + 1) / STEPS.length) * 100;
  const isLast = state.wizardStep === STEPS.length - 1;

  return (
    <div className="px-3 py-2">
      {/* Progress */}
      <div className="h-1 rounded-full bg-[var(--vscode-widget-border)] mb-3 overflow-hidden">
        <div
          className="h-full bg-flyte-purple rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-2 mb-3">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`
              w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold
              transition-all duration-200
              ${i === state.wizardStep ? 'bg-flyte-purple text-white scale-110' : ''}
              ${i < state.wizardStep ? 'bg-green-600 text-white opacity-80' : ''}
              ${i > state.wizardStep ? 'bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] opacity-40' : ''}
            `}
            title={s.title}
          >
            {i < state.wizardStep ? '✓' : i + 1}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="text-center mb-3">
        <h3 className="text-sm font-semibold">{step.title}</h3>
        <span className="text-[10px] opacity-50">Step {state.wizardStep + 1} of {STEPS.length}</span>
      </div>

      <div className="h-px bg-[var(--vscode-widget-border)] mb-3" />

      {/* Content */}
      <div className="min-h-[180px]">
        <StepContent stepId={step.id} state={state} />
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-[var(--vscode-widget-border)]">
        {state.wizardStep > 0 ? (
          <Button variant="ghost" onClick={onPrev}>Back</Button>
        ) : <span />}
        <Button onClick={isLast ? onFinish : onNext}>
          {isLast ? 'Finish' : 'Next'}
        </Button>
      </div>

      <div className="text-center mt-3">
        <button
          className="text-[11px] opacity-50 hover:opacity-80 cursor-pointer bg-transparent border-none text-[var(--vscode-textLink-foreground)]"
          onClick={onSkip}
        >
          Skip to advanced view
        </button>
      </div>
    </div>
  );
}

function StepContent({ stepId, state }: { stepId: string; state: AppState }) {
  switch (stepId) {
    case 'environment':
      return (
        <>
          <p className="text-xs leading-relaxed mb-2">
            An <strong>Environment</strong> defines the resources your tasks need: CPU, memory, GPU, Docker image, secrets.
          </p>
          <CodeBlock>{`env = flyte.TaskEnvironment(
    name="my-pipeline",
    resources=flyte.Resources(
        cpu=2, memory="4Gi"
    ),
)`}</CodeBlock>
          {state.environments.length > 0 ? (
            <div className="mt-3">
              <span className="text-[10px] font-medium opacity-60 uppercase tracking-wider">
                {state.environments.length} found in workspace
              </span>
              <ItemList
                items={state.environments.map(e => ({
                  name: e.name,
                  description: e.varName,
                  icon: '{}',
                  file: e.file,
                  line: e.location.line,
                }))}
                emptyText=""
              />
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-xs opacity-50 mb-2">No environments found yet. Use the <code className="text-[11px] bg-[var(--vscode-textCodeBlock-background)] px-1 rounded">fenv</code> snippet in a .py file.</p>
              <Button variant="ghost" onClick={() => post('createSnippet', { snippet: 'Flyte TaskEnvironment' })}>
                Insert snippet
              </Button>
            </div>
          )}
        </>
      );

    case 'tasks':
      return (
        <>
          <p className="text-xs leading-relaxed mb-2">
            A <strong>Task</strong> is a function decorated with <code className="text-[11px] bg-[var(--vscode-textCodeBlock-background)] px-1 rounded">@env.task</code> that runs inside an environment.
          </p>
          <CodeBlock>{`@env.task
async def train(data: dict) -> dict:
    return {"model": "trained"}`}</CodeBlock>
          {state.tasks.length > 0 ? (
            <div className="mt-3">
              <span className="text-[10px] font-medium opacity-60 uppercase tracking-wider">
                {state.tasks.length} found
              </span>
              <ItemList
                items={state.tasks.map(t => ({
                  name: t.functionName,
                  description: `${t.isAsync ? 'async ' : ''}${t.envVarName}.task`,
                  icon: 'fn',
                  file: t.file,
                  line: t.location.line,
                  accentColor: '#6C3FC5',
                }))}
                emptyText=""
              />
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-xs opacity-50 mb-2">No tasks found. Use the <code className="text-[11px] bg-[var(--vscode-textCodeBlock-background)] px-1 rounded">ftask</code> snippet.</p>
              <Button variant="ghost" onClick={() => post('createSnippet', { snippet: 'Flyte Task' })}>
                Insert snippet
              </Button>
            </div>
          )}
        </>
      );

    case 'apps':
      return (
        <>
          <p className="text-xs leading-relaxed mb-2">
            An <strong>App</strong> is a long-running HTTP server (API, inference endpoint) deployed on a cluster.
          </p>
          <CodeBlock>{`app = flyte.app.AppEnvironment(
    name="my-api",
    port=8080,
)`}</CodeBlock>
          {state.apps.length > 0 ? (
            <div className="mt-3">
              <span className="text-[10px] font-medium opacity-60 uppercase tracking-wider">
                {state.apps.length} found
              </span>
              <ItemList
                items={state.apps.map(a => ({
                  name: a.name,
                  description: a.varName,
                  icon: '[]',
                  file: a.file,
                  line: a.location.line,
                }))}
                emptyText=""
              />
            </div>
          ) : (
            <p className="text-xs opacity-50 mt-3">Apps are optional. Skip this step if you only need tasks.</p>
          )}
        </>
      );

    case 'cluster':
      return (
        <>
          <p className="text-xs leading-relaxed mb-3">
            A <strong>Cluster</strong> is the infrastructure where tasks execute with real resources (GPU, containers).
          </p>
          {state.clusters.length > 0 && (
            <div className="mb-3">
              <ItemList
                items={state.clusters.map(c => ({
                  name: c.name,
                  description: `${c.endpoint}${c.isActive ? ' (active)' : ''}`,
                  icon: c.type === 'union' ? 'U' : 'F',
                  accentColor: c.type === 'union' ? '#D4A843' : '#6C3FC5',
                }))}
                emptyText=""
              />
            </div>
          )}
          <div className="flex gap-2 mb-3">
            <Button variant="union" onClick={() => post('connectUnion')} className="flex-1">
              Union.ai
            </Button>
            <Button variant="secondary" onClick={() => post('connectSelfHosted')} className="flex-1">
              Self-Hosted
            </Button>
          </div>
          <p className="text-[11px] opacity-50">Or skip this step to run locally.</p>
        </>
      );

    case 'run':
      const runnableTasks = state.tasks.filter(t =>
        t.parameters.length === 0 || t.parameters.every(p => p.defaultValue !== undefined)
      );
      return (
        <>
          <p className="text-xs leading-relaxed mb-3">
            Run your first task! Click a task below to execute it.
          </p>
          {runnableTasks.length > 0 ? (
            <div className="flex flex-col gap-1">
              {runnableTasks.map(t => (
                <button
                  key={t.functionName}
                  className="flex items-center gap-2 px-3 py-2 rounded border-l-2 border-flyte-purple bg-transparent hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer text-left w-full"
                  onClick={() => post('runTask', { taskName: t.functionName })}
                >
                  <span className="text-sm font-medium text-[var(--vscode-foreground)]">{t.functionName}</span>
                  <span className="text-[11px] opacity-50 ml-auto">Click to run</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs opacity-50">No runnable tasks found. Go back and create a task with default parameters.</p>
          )}
          <div className="mt-4 p-3 rounded bg-[var(--vscode-textCodeBlock-background)]">
            <p className="text-[11px] opacity-70">After running, click <strong>Finish</strong> to switch to the advanced view.</p>
          </div>
        </>
      );

    default:
      return null;
  }
}
