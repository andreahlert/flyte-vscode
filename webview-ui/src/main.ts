import './style.css';
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeDivider,
  vsCodePanels,
  vsCodePanelTab,
  vsCodePanelView,
  vsCodeBadge,
  vsCodeProgressRing,
  vsCodeTag,
} from '@vscode/webview-ui-toolkit';

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeDivider(),
  vsCodePanels(),
  vsCodePanelTab(),
  vsCodePanelView(),
  vsCodeBadge(),
  vsCodeProgressRing(),
  vsCodeTag(),
);

declare function acquireVsCodeApi(): {
  postMessage(msg: any): void;
  getState(): any;
  setState(state: any): void;
};

const vscode = acquireVsCodeApi();

interface AppState {
  mode: 'wizard' | 'advanced';
  wizardStep: number;
  environments: any[];
  tasks: any[];
  apps: any[];
  clusters: any[];
  activeCluster: any;
}

let state: AppState = vscode.getState() ?? {
  mode: 'landing',
  wizardStep: 0,
  environments: [],
  tasks: [],
  apps: [],
  clusters: [],
  activeCluster: null,
};

function saveState() {
  vscode.setState(state);
}

function post(type: string, data?: any) {
  vscode.postMessage({ type, ...data });
}

// === Rendering ===

function render() {
  const root = document.getElementById('root')!;

  if (state.mode === 'wizard') {
    root.innerHTML = renderWizard();
  } else if (state.mode === 'advanced') {
    root.innerHTML = renderAdvanced();
  } else {
    root.innerHTML = renderLanding();
  }

  bindEvents();
}

function renderLanding(): string {
  return `
    <div class="landing">
      <div class="logo-container">
        <svg class="logo" viewBox="0 0 44 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10.7325 20.4388C11.6982 18.1438 12.1898 15.7827 12.6324 13.4131C13.387 9.37307 13.8972 5.30623 13.7258 1.18364C13.6932 0.40028 13.9138 0.109059 14.7575 0.188746C17.0421 0.404513 19.3074 0.665615 21.3612 1.79067C21.9048 2.0885 22.382 1.9286 22.9017 1.78205C26.8327 0.67369 30.8187 -0.0779745 34.9253 0.00645783C37.6237 0.0619366 40.2407 0.49755 42.7297 1.6147C43.5435 1.97993 43.845 2.49922 43.77 3.36313C43.5683 5.68772 42.639 7.77122 41.6739 9.84286C41.4101 10.4092 41.0266 10.0835 40.7011 9.87791C37.4258 7.80932 33.9086 6.24425 30.286 4.90798C27.7148 3.95952 25.1144 3.09629 22.3025 2.66542C23.1702 3.52404 24.0071 4.41672 24.911 5.23541C28.913 8.86013 33.0836 12.2613 37.9038 14.771C38.4356 15.048 38.5646 15.3318 38.1997 15.85C36.8598 17.7528 35.489 19.6321 33.4785 20.8918C32.8806 21.2665 32.7376 21.7994 32.5894 22.3911C31.4367 26.9944 29.762 31.3745 27.0155 35.2878C25.8812 36.9384 24.4777 38.3869 22.8637 39.5728C22.1292 40.1043 21.4749 40.1669 20.7303 39.6072C18.9337 38.2569 17.5829 36.5179 16.3305 34.6852C15.9864 34.1815 16.2307 33.9058 16.6734 33.678C20.2832 31.8213 23.4905 29.3836 26.5822 26.7839C28.484 25.2109 30.2824 23.5168 31.966 21.7121C31.611 21.3738 31.3066 21.6228 31.0411 21.6936C25.0841 23.2818 19.3462 25.4144 14.0708 28.6582C13.3497 29.1016 12.9663 29.0464 12.6148 28.2355C11.7169 26.1637 10.8845 24.0742 10.7443 21.7951C10.6984 21.0484 10.2419 20.6461 9.78687 20.2039C6.53928 17.048 3.71473 13.5729 1.74933 9.46218C0.789341 7.45433 0.08806 5.37105 0.00218354 3.10907C-0.0318759 2.21194 0.331824 1.71144 1.14182 1.41953C3.02246 0.738513 4.98966 0.32577 6.98543 0.193467C7.7856 0.140088 7.98221 0.421906 7.96127 1.14386C7.81334 6.24361 8.59293 11.2413 9.68012 16.2002C9.99177 17.6216 10.3796 19.0264 10.7325 20.4388ZM21.9306 3.81479C20.6244 10.5823 16.5199 15.6393 11.8931 20.4027C18.2097 17.8236 24.5067 18.9802 30.8619 20.2355C25.9858 15.7476 23.776 9.9179 21.9306 3.81479Z" fill="#6C3FC5"/>
        </svg>
      </div>
      <h2>Welcome to Flyte</h2>
      <p class="subtitle">Build, deploy and monitor ML workflows</p>
      <vscode-divider></vscode-divider>
      <div class="landing-buttons">
        <vscode-button class="landing-btn" data-action="wizard">
          Starting with Flyte
        </vscode-button>
        <p class="btn-desc">Step-by-step guide to create your first pipeline</p>
        <vscode-button class="landing-btn" appearance="secondary" data-action="advanced">
          Advanced
        </vscode-button>
        <p class="btn-desc">Jump straight to the full workspace view</p>
      </div>
    </div>
  `;
}

const WIZARD_STEPS = [
  { id: 'environment', title: 'Environment', icon: '{}' },
  { id: 'tasks', title: 'Tasks', icon: 'fn' },
  { id: 'apps', title: 'Apps', icon: '[]' },
  { id: 'cluster', title: 'Cluster', icon: '::' },
  { id: 'run', title: 'First Run', icon: '>' },
];

function renderWizard(): string {
  const step = WIZARD_STEPS[state.wizardStep];
  const progress = ((state.wizardStep + 1) / WIZARD_STEPS.length) * 100;

  return `
    <div class="wizard">
      <div class="wizard-header">
        <div class="wizard-progress">
          <div class="wizard-progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="wizard-steps">
          ${WIZARD_STEPS.map((s, i) => `
            <span class="wizard-step-dot ${i === state.wizardStep ? 'active' : ''} ${i < state.wizardStep ? 'done' : ''}"
                  title="${s.title}">${s.icon}</span>
          `).join('')}
        </div>
        <h3>${step.title}</h3>
        <span class="step-count">Step ${state.wizardStep + 1} of ${WIZARD_STEPS.length}</span>
      </div>
      <vscode-divider></vscode-divider>
      <div class="wizard-content">
        ${renderWizardStep(step.id)}
      </div>
      <div class="wizard-nav">
        ${state.wizardStep > 0 ? '<vscode-button appearance="secondary" data-action="wizard-prev">Back</vscode-button>' : '<span></span>'}
        ${state.wizardStep < WIZARD_STEPS.length - 1
          ? '<vscode-button data-action="wizard-next">Next</vscode-button>'
          : '<vscode-button data-action="advanced">Finish</vscode-button>'}
      </div>
      <vscode-divider></vscode-divider>
      <a href="#" class="skip-link" data-action="advanced">Skip to advanced view</a>
    </div>
  `;
}

function renderWizardStep(stepId: string): string {
  switch (stepId) {
    case 'environment':
      return `
        <p>An <strong>Environment</strong> defines the resources your tasks need: CPU, memory, GPU, Docker image, secrets.</p>
        <div class="code-example">
          <code>env = flyte.TaskEnvironment(
    name="my-pipeline",
    resources=flyte.Resources(
        cpu=2, memory="4Gi"
    ),
)</code>
        </div>
        ${state.environments.length > 0
          ? `<div class="found-items">
              <vscode-badge>${state.environments.length}</vscode-badge> environments found in workspace:
              ${state.environments.map((e: any) => `
                <div class="item" data-action="openFile" data-file="${e.file}" data-line="${e.location.line}">
                  <span class="item-name">${e.name}</span>
                  <span class="item-desc">${e.varName}</span>
                </div>
              `).join('')}
            </div>`
          : `<p class="hint">No environments found yet. Create one using the <code>fenv</code> snippet in a .py file.</p>
             <vscode-button appearance="secondary" data-action="snippet" data-snippet="Flyte TaskEnvironment">Insert snippet</vscode-button>`
        }
      `;
    case 'tasks':
      return `
        <p>A <strong>Task</strong> is a function decorated with <code>@env.task</code> that runs inside an environment.</p>
        <div class="code-example">
          <code>@env.task
async def train(data: dict) -> dict:
    return {"model": "trained"}</code>
        </div>
        ${state.tasks.length > 0
          ? `<div class="found-items">
              <vscode-badge>${state.tasks.length}</vscode-badge> tasks found:
              ${state.tasks.map((t: any) => `
                <div class="item" data-action="openFile" data-file="${t.file}" data-line="${t.location.line}">
                  <span class="item-name">${t.functionName}</span>
                  <span class="item-desc">${t.isAsync ? 'async ' : ''}${t.envVarName}.task</span>
                </div>
              `).join('')}
            </div>`
          : `<p class="hint">No tasks found yet. Create one using the <code>ftask</code> snippet.</p>
             <vscode-button appearance="secondary" data-action="snippet" data-snippet="Flyte Task">Insert snippet</vscode-button>`
        }
      `;
    case 'apps':
      return `
        <p>An <strong>App</strong> is a long-running HTTP server (API, inference endpoint) deployed on a cluster.</p>
        <div class="code-example">
          <code>app = flyte.app.AppEnvironment(
    name="my-api",
    port=8080,
)</code>
        </div>
        ${state.apps.length > 0
          ? `<div class="found-items">
              <vscode-badge>${state.apps.length}</vscode-badge> apps found:
              ${state.apps.map((a: any) => `
                <div class="item" data-action="openFile" data-file="${a.file}" data-line="${a.location.line}">
                  <span class="item-name">${a.name}</span>
                  <span class="item-desc">${a.varName}</span>
                </div>
              `).join('')}
            </div>`
          : `<p class="hint">Apps are optional. Skip this step if you only need tasks.</p>
             <vscode-button appearance="secondary" data-action="snippet" data-snippet="Flyte AppEnvironment">Insert snippet</vscode-button>`
        }
      `;
    case 'cluster':
      return `
        <p>A <strong>Cluster</strong> is the infrastructure where tasks execute with real resources (GPU, containers).</p>
        ${state.clusters.length > 0
          ? `<div class="found-items">
              ${state.clusters.map((c: any) => `
                <div class="item cluster-item ${c.isActive ? 'active' : ''}">
                  <span class="item-name">${c.name}</span>
                  <span class="item-desc">${c.endpoint}${c.isActive ? ' (active)' : ''}</span>
                </div>
              `).join('')}
            </div>`
          : `<p class="hint">No cluster configured. You can run tasks locally without one, or set up a cluster for remote execution.</p>`
        }
        <div class="cluster-buttons">
          <vscode-button data-action="connectUnion" class="cluster-btn union">
            Union.ai
          </vscode-button>
          <vscode-button data-action="connectSelfHosted" appearance="secondary" class="cluster-btn flyte">
            Self-Hosted
          </vscode-button>
        </div>
        <p class="hint">Or skip this step to run locally.</p>
      `;
    case 'run':
      return `
        <p>Run your first task! Choose a task below and click to execute it.</p>
        ${state.tasks.length > 0
          ? `<div class="found-items">
              ${state.tasks.filter((t: any) => {
                return t.parameters.length === 0 || t.parameters.every((p: any) => p.defaultValue !== undefined);
              }).map((t: any) => `
                <div class="item runnable-task" data-action="runTask" data-task="${t.functionName}">
                  <span class="item-name">${t.functionName}</span>
                  <span class="item-desc">Click to run</span>
                </div>
              `).join('')}
            </div>`
          : `<p class="hint">No runnable tasks found. Go back and create a task with default parameters.</p>`
        }
        <vscode-divider></vscode-divider>
        <p class="hint">After running, click <strong>Finish</strong> to switch to the advanced view.</p>
      `;
    default:
      return '';
  }
}

function renderAdvanced(): string {
  return `
    <div class="advanced">
      <div class="section">
        <div class="section-header">
          <h4>Environments</h4>
          <span class="count">${state.environments.length}</span>
        </div>
        ${state.environments.length > 0
          ? state.environments.map((e: any) => `
            <div class="item" data-action="openFile" data-file="${e.file}" data-line="${e.location.line}">
              <span class="item-icon">{}</span>
              <span class="item-name">${e.name}</span>
              <span class="item-desc">${e.varName}</span>
            </div>
          `).join('')
          : '<p class="empty">No environments found</p>'
        }
      </div>

      <vscode-divider></vscode-divider>

      <div class="section">
        <div class="section-header">
          <h4>Tasks</h4>
          <span class="count">${state.tasks.length}</span>
        </div>
        ${state.tasks.length > 0
          ? state.tasks.map((t: any) => `
            <div class="item" data-action="openFile" data-file="${t.file}" data-line="${t.location.line}">
              <span class="item-icon">fn</span>
              <span class="item-name">${t.functionName}</span>
              <span class="item-desc">${t.isAsync ? 'async ' : ''}${t.envVarName}.task</span>
            </div>
          `).join('')
          : '<p class="empty">No tasks found</p>'
        }
      </div>

      <vscode-divider></vscode-divider>

      <div class="section">
        <div class="section-header">
          <h4>Apps</h4>
          <span class="count">${state.apps.length}</span>
        </div>
        ${state.apps.length > 0
          ? state.apps.map((a: any) => `
            <div class="item" data-action="openFile" data-file="${a.file}" data-line="${a.location.line}">
              <span class="item-icon">[]</span>
              <span class="item-name">${a.name}</span>
              <span class="item-desc">${a.varName}</span>
            </div>
          `).join('')
          : '<p class="empty">No apps found</p>'
        }
      </div>

      <vscode-divider></vscode-divider>

      <div class="section">
        <div class="section-header">
          <h4>Clusters</h4>
          <div class="section-actions">
            <span class="action-icon" data-action="connectUnion" title="Connect Union.ai">U</span>
            <span class="action-icon flyte-icon" data-action="connectSelfHosted" title="Self-Hosted">F</span>
          </div>
        </div>
        ${state.clusters.length > 0
          ? state.clusters.map((c: any) => `
            <div class="item cluster-item ${c.isActive ? 'active' : ''}">
              <span class="item-icon">${c.type === 'union' ? 'U' : 'F'}</span>
              <span class="item-name">${c.name}</span>
              <span class="item-desc">${c.endpoint}${c.isActive ? ' (active)' : ''}</span>
            </div>
          `).join('')
          : '<p class="empty">No clusters configured</p>'
        }
      </div>

      <vscode-divider></vscode-divider>

      <div class="section">
        <div class="section-header">
          <h4>Runs</h4>
          <span class="action-icon" data-action="openTui" title="Open TUI">TUI</span>
        </div>
        <p class="empty">Use Run Task or open TUI to view runs</p>
      </div>

      <vscode-divider></vscode-divider>
      <a href="#" class="skip-link" data-action="landing">Back to start</a>
    </div>
  `;
}

// === Event Binding ===

function bindEvents() {
  document.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const action = (el as HTMLElement).dataset.action!;
      const file = (el as HTMLElement).dataset.file;
      const line = (el as HTMLElement).dataset.line;
      const task = (el as HTMLElement).dataset.task;
      const snippet = (el as HTMLElement).dataset.snippet;

      switch (action) {
        case 'wizard':
          state.mode = 'wizard';
          state.wizardStep = 0;
          saveState();
          render();
          break;
        case 'advanced':
          state.mode = 'advanced';
          saveState();
          render();
          break;
        case 'landing':
          state.mode = 'landing' as any;
          saveState();
          render();
          break;
        case 'wizard-next':
          if (state.wizardStep < WIZARD_STEPS.length - 1) {
            state.wizardStep++;
            saveState();
            render();
          }
          break;
        case 'wizard-prev':
          if (state.wizardStep > 0) {
            state.wizardStep--;
            saveState();
            render();
          }
          break;
        case 'openFile':
          if (file) post('openFile', { uri: file, line: parseInt(line ?? '0') });
          break;
        case 'runTask':
          if (task) post('runTask', { taskName: task });
          break;
        case 'snippet':
          if (snippet) post('createSnippet', { snippet });
          break;
        case 'connectUnion':
          post('connectUnion');
          break;
        case 'connectSelfHosted':
          post('connectSelfHosted');
          break;
        case 'openTui':
          post('openTui');
          break;
      }
    });
  });
}

// === Message Handling ===

window.addEventListener('message', (event) => {
  const msg = event.data;
  switch (msg.type) {
    case 'init':
    case 'refresh':
      state.environments = msg.data.environments ?? [];
      state.tasks = msg.data.tasks ?? [];
      state.apps = msg.data.apps ?? [];
      state.clusters = msg.data.clusters ?? [];
      state.activeCluster = msg.data.activeCluster ?? null;
      saveState();
      render();
      break;
  }
});

// === Init ===

render();
post('ready');
