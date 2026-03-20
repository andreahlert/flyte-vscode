import React, { useState } from 'react';
import { Button } from '../components/Button';
import { CodeBlock } from '../components/CodeBlock';
import { Input, ComboBox, Select, Toggle } from '../components/Input';
import { post } from '../vscode';
import type { AppState } from '../types';
import {
  generateEnvironment,
  generateTask,
  generateApp,
  generateRun,
  generateFullFile,
  type EnvConfig,
  type TaskConfig,
  type AppConfig,
} from './codegen';
import {
  CPU_OPTIONS, MEMORY_OPTIONS, GPU_OPTIONS, CACHE_OPTIONS,
  TYPE_OPTIONS, RETURN_TYPE_OPTIONS, PORT_OPTIONS,
  validateEnvName, validateVarName, validateFunctionName, validatePort,
} from './options';

const STEPS = [
  { id: 'environment', title: 'Environment', desc: 'Define your execution resources' },
  { id: 'tasks', title: 'Tasks', desc: 'Write your pipeline logic' },
  { id: 'apps', title: 'Apps', desc: 'HTTP servers (optional)' },
  { id: 'cluster', title: 'Cluster', desc: 'Where to run' },
  { id: 'run', title: 'First Run', desc: 'Execute your pipeline' },
];

interface WizardProps {
  state: AppState;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  onSkip: () => void;
}

export function Wizard({ state, onNext, onPrev, onFinish, onSkip }: WizardProps) {
  const [env, setEnv] = useState<EnvConfig>({
    varName: 'env', name: 'my-pipeline', cpu: '2', memory: '4Gi',
    gpu: '', cache: true, interruptible: false,
  });
  const [tasks, setTasks] = useState<TaskConfig[]>([{
    functionName: 'my_task', envVarName: 'env', isAsync: true,
    params: [{ name: 'input', type: 'str' }], returnType: 'str', retries: '0',
  }]);
  const [app, setApp] = useState<AppConfig>({
    varName: 'app', name: 'my-api', port: '8080', cpu: '1', memory: '2Gi',
  });
  const [skipApp, setSkipApp] = useState(false);

  const step = STEPS[state.wizardStep];
  const progress = ((state.wizardStep + 1) / STEPS.length) * 100;
  const isLast = state.wizardStep === STEPS.length - 1;

  function handleInsertCode() {
    const code = generateFullFile(
      env,
      tasks.map(t => ({ ...t, envVarName: env.varName })),
      skipApp ? null : app,
      tasks[0]?.functionName ?? null,
    );
    post('insertCode', { code });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="h-0.5 rounded-full bg-[var(--vscode-widget-border)] overflow-hidden">
          <div
            className="h-full bg-flyte-purple rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-3 py-3">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-col items-center gap-1">
            <div
              className={`
                w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                transition-all duration-300
                ${i === state.wizardStep ? 'bg-flyte-purple text-white ring-2 ring-flyte-purple/30' : ''}
                ${i < state.wizardStep ? 'bg-emerald-500 text-white' : ''}
                ${i > state.wizardStep ? 'bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] opacity-30' : ''}
              `}
            >
              {i < state.wizardStep ? '✓' : i + 1}
            </div>
            <span className={`text-[9px] ${i === state.wizardStep ? 'opacity-80' : 'opacity-30'}`}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

      {/* Step header */}
      <div className="text-center px-4 mb-3">
        <h3 className="text-sm font-semibold">{step.title}</h3>
        <p className="text-[11px] opacity-40">{step.desc}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-3">
        {step.id === 'environment' && (
          <EnvironmentStep env={env} setEnv={setEnv} />
        )}
        {step.id === 'tasks' && (
          <TasksStep tasks={tasks} setTasks={setTasks} envVarName={env.varName} />
        )}
        {step.id === 'apps' && (
          <AppsStep app={app} setApp={setApp} skip={skipApp} setSkip={setSkipApp} />
        )}
        {step.id === 'cluster' && (
          <ClusterStep clusters={state.clusters} />
        )}
        {step.id === 'run' && (
          <RunStep
            tasks={tasks}
            envVarName={env.varName}
            onInsertCode={handleInsertCode}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="px-4 py-3 border-t border-[var(--vscode-widget-border)]">
        <div className="flex justify-between items-center">
          {state.wizardStep > 0 ? (
            <Button variant="ghost" onClick={onPrev}>Back</Button>
          ) : <span />}
          <Button onClick={isLast ? onFinish : onNext}>
            {isLast ? 'Finish' : 'Next'}
          </Button>
        </div>
        <div className="text-center mt-2">
          <button
            className="text-[10px] opacity-30 hover:opacity-60 cursor-pointer bg-transparent border-none text-[var(--vscode-textLink-foreground)]"
            onClick={onSkip}
          >
            Skip to advanced view
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Step: Environment
// ============================================================

function EnvironmentStep({
  env, setEnv,
}: {
  env: EnvConfig;
  setEnv: React.Dispatch<React.SetStateAction<EnvConfig>>;
}) {
  const update = (field: Partial<EnvConfig>) => setEnv(prev => ({ ...prev, ...field }));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Variable name"
          value={env.varName}
          onChange={e => update({ varName: e.target.value })}
          placeholder="env"
          error={validateVarName(env.varName)}
        />
        <Input
          label="Environment name"
          value={env.name}
          onChange={e => update({ name: e.target.value })}
          placeholder="my-pipeline"
          error={validateEnvName(env.name)}
        />
      </div>

      <p className="text-[10px] font-medium opacity-50 uppercase tracking-wider mt-1">Resources</p>

      <div className="grid grid-cols-3 gap-2">
        <ComboBox
          label="CPU"
          value={env.cpu}
          onChange={v => update({ cpu: v })}
          options={CPU_OPTIONS}
          placeholder="2"
        />
        <ComboBox
          label="Memory"
          value={env.memory}
          onChange={v => update({ memory: v })}
          options={MEMORY_OPTIONS}
          placeholder="4Gi"
        />
        <ComboBox
          label="GPU"
          value={env.gpu}
          onChange={v => update({ gpu: v })}
          options={GPU_OPTIONS}
          placeholder="None"
          hint="optional"
        />
      </div>

      <div className="flex gap-4 mt-1">
        <Toggle label="Cache" checked={env.cache} onChange={v => update({ cache: v })} hint="Cache task outputs" />
        <Toggle label="Interruptible" checked={env.interruptible} onChange={v => update({ interruptible: v })} hint="Can be preempted" />
      </div>

      <p className="text-[10px] font-medium opacity-50 uppercase tracking-wider mt-1">Preview</p>
      <CodeBlock>{generateEnvironment(env)}</CodeBlock>
    </div>
  );
}

// ============================================================
// Step: Tasks
// ============================================================

function TasksStep({
  tasks, setTasks, envVarName,
}: {
  tasks: TaskConfig[];
  setTasks: React.Dispatch<React.SetStateAction<TaskConfig[]>>;
  envVarName: string;
}) {
  function updateTask(index: number, field: Partial<TaskConfig>) {
    setTasks(prev => prev.map((t, i) => i === index ? { ...t, ...field } : t));
  }

  function addTask() {
    setTasks(prev => [...prev, {
      functionName: `task_${prev.length + 1}`,
      envVarName,
      isAsync: true,
      params: [{ name: '', type: '' }],
      returnType: '',
      retries: '0',
    }]);
  }

  function removeTask(index: number) {
    setTasks(prev => prev.filter((_, i) => i !== index));
  }

  function addParam(taskIndex: number) {
    setTasks(prev => prev.map((t, i) =>
      i === taskIndex ? { ...t, params: [...t.params, { name: '', type: '' }] } : t
    ));
  }

  function updateParam(taskIndex: number, paramIndex: number, field: { name?: string; type?: string }) {
    setTasks(prev => prev.map((t, i) =>
      i === taskIndex ? {
        ...t,
        params: t.params.map((p, j) => j === paramIndex ? { ...p, ...field } : p),
      } : t
    ));
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task, i) => (
        <div key={i} className="rounded-md border border-[var(--vscode-widget-border)] p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-medium opacity-50 uppercase">Task {i + 1}</span>
            {tasks.length > 1 && (
              <button
                className="text-[10px] opacity-40 hover:opacity-80 cursor-pointer bg-transparent border-none text-red-400"
                onClick={() => removeTask(i)}
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <Input
              label="Function name"
              value={task.functionName}
              onChange={e => updateTask(i, { functionName: e.target.value })}
              placeholder="my_task"
              error={validateFunctionName(task.functionName)}
            />
            <ComboBox
              label="Return type"
              value={task.returnType}
              onChange={v => updateTask(i, { returnType: v })}
              options={RETURN_TYPE_OPTIONS}
              placeholder="str"
            />
          </div>

          <div className="flex gap-4 mb-2">
            <Toggle label="Async" checked={task.isAsync} onChange={v => updateTask(i, { isAsync: v })} hint="Recommended" />
            <ComboBox
              label="Retries"
              value={task.retries}
              onChange={v => updateTask(i, { retries: v })}
              options={['0', '1', '2', '3', '5']}
              placeholder="0"
            />
          </div>

          <p className="text-[10px] font-medium opacity-50 uppercase tracking-wider mb-1">Parameters</p>
          {task.params.map((p, j) => (
            <div key={j} className="grid grid-cols-2 gap-2 mb-1">
              <Input
                label=""
                value={p.name}
                onChange={e => updateParam(i, j, { name: e.target.value })}
                placeholder="param name"
                error={p.name ? validateVarName(p.name) : undefined}
              />
              <ComboBox
                label=""
                value={p.type}
                onChange={v => updateParam(i, j, { type: v })}
                options={TYPE_OPTIONS}
                placeholder="type"
              />
            </div>
          ))}
          <button
            className="text-[10px] opacity-40 hover:opacity-70 cursor-pointer bg-transparent border-none text-[var(--vscode-textLink-foreground)] mt-1"
            onClick={() => addParam(i)}
          >
            + Add parameter
          </button>

          <div className="mt-2">
            <CodeBlock>{generateTask({ ...task, envVarName })}</CodeBlock>
          </div>
        </div>
      ))}

      <Button variant="ghost" onClick={addTask} className="text-xs">
        + Add another task
      </Button>
    </div>
  );
}

// ============================================================
// Step: Apps
// ============================================================

function AppsStep({
  app, setApp, skip, setSkip,
}: {
  app: AppConfig;
  setApp: React.Dispatch<React.SetStateAction<AppConfig>>;
  skip: boolean;
  setSkip: (v: boolean) => void;
}) {
  const update = (field: Partial<AppConfig>) => setApp(prev => ({ ...prev, ...field }));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-relaxed opacity-70">
        Apps are long-running HTTP servers. They're optional for task-only pipelines.
      </p>

      <Toggle label="Skip this step" checked={skip} onChange={setSkip} />

      {!skip && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Variable name" value={app.varName} onChange={e => update({ varName: e.target.value })} placeholder="app" error={validateVarName(app.varName)} />
            <Input label="App name" value={app.name} onChange={e => update({ name: e.target.value })} placeholder="my-api" error={validateEnvName(app.name)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ComboBox label="Port" value={app.port} onChange={v => update({ port: v })} options={PORT_OPTIONS} placeholder="8080" error={validatePort(app.port)} />
            <ComboBox label="CPU" value={app.cpu} onChange={v => update({ cpu: v })} options={CPU_OPTIONS} placeholder="1" />
            <ComboBox label="Memory" value={app.memory} onChange={v => update({ memory: v })} options={MEMORY_OPTIONS} placeholder="2Gi" />
          </div>
          <p className="text-[10px] font-medium opacity-50 uppercase tracking-wider mt-1">Preview</p>
          <CodeBlock>{generateApp(app)}</CodeBlock>
        </>
      )}
    </div>
  );
}

// ============================================================
// Step: Cluster
// ============================================================

function ClusterStep({ clusters }: { clusters: AppState['clusters'] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-relaxed opacity-70">
        A cluster is the infrastructure where tasks execute with real resources. You can also run locally without a cluster.
      </p>

      {clusters.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {clusters.map(c => (
            <div
              key={c.name}
              className={`
                flex items-center gap-2 px-3 py-2 rounded text-sm
                ${c.isActive ? 'bg-flyte-purple/10 border border-flyte-purple/30' : 'bg-[var(--vscode-input-background)]'}
              `}
            >
              <span
                className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center text-white"
                style={{ background: c.type === 'union' ? '#D4A843' : '#6C3FC5' }}
              >
                {c.type === 'union' ? 'U' : 'F'}
              </span>
              <span className="font-medium">{c.name}</span>
              <span className="text-[11px] opacity-40 ml-auto">
                {c.isActive ? 'active' : c.endpoint}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="union" onClick={() => post('connectUnion')} className="flex-1 text-xs">
          Union.ai
        </Button>
        <Button variant="secondary" onClick={() => post('connectSelfHosted')} className="flex-1 text-xs">
          Self-Hosted
        </Button>
      </div>

      <p className="text-[10px] opacity-40 text-center">Or skip to run locally</p>
    </div>
  );
}

// ============================================================
// Step: Run
// ============================================================

function RunStep({
  tasks, envVarName, onInsertCode,
}: {
  tasks: TaskConfig[];
  envVarName: string;
  onInsertCode: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-relaxed opacity-70">
        Your pipeline is ready. Insert the generated code into a file and run your first task.
      </p>

      <Button onClick={onInsertCode} className="w-full">
        Insert code into editor
      </Button>

      {tasks.length > 0 && (
        <>
          <p className="text-[10px] font-medium opacity-50 uppercase tracking-wider mt-2">Or run directly</p>
          <div className="flex flex-col gap-1">
            {tasks.map(t => (
              <button
                key={t.functionName}
                className="flex items-center gap-2 px-3 py-2 rounded border-l-2 border-flyte-purple bg-transparent hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer text-left w-full"
                onClick={() => post('runTask', { taskName: t.functionName })}
              >
                <span className="text-sm font-medium text-[var(--vscode-foreground)]">{t.functionName}</span>
                <span className="text-[10px] opacity-40 ml-auto">Run</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 p-3 rounded-md bg-[var(--vscode-textCodeBlock-background)]">
        <p className="text-[11px] opacity-60">
          Click <strong>Finish</strong> to switch to the advanced workspace view.
        </p>
      </div>
    </div>
  );
}
