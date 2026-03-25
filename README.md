# Flyte

VS Code extension for [Flyte V2](https://github.com/flyteorg/flyte-sdk). Code intelligence, CLI integration, cluster management, and workflow monitoring for ML pipeline development.

![Sidebar](https://raw.githubusercontent.com/andreahlert/flyte-vscode/main/assets/demo-sidebar.gif)

## Features

### Code Intelligence

![Autocomplete](https://raw.githubusercontent.com/andreahlert/flyte-vscode/main/assets/demo-completion.gif)

- **Autocomplete** inside `TaskEnvironment()`, `Resources()`, `AppEnvironment()`, `Trigger()`, `Cache()`, `Secret()`, and `@env.task()` with parameter names, types, and defaults
- **GPU completions** after `gpu=` with all valid accelerators (T4, A100, H100, L4, V100, etc.)

![Hover](https://raw.githubusercontent.com/andreahlert/flyte-vscode/main/assets/demo-hover.gif)

- **Hover documentation** on all Flyte classes, parameters, and functions (`flyte.run`, `flyte.deploy`, `flyte.map`, `flyte.group`, `flyte.trace`)
- **Diagnostics** with real-time validation: invalid names, reserved ports, config conflicts, empty trigger names

### CodeLens

![CodeLens](https://raw.githubusercontent.com/andreahlert/flyte-vscode/main/assets/demo-codelens.gif)

- **Run Task** above tasks with all params having defaults
- **Deploy** when clusters are configured (asks which environment)
- **Graph** renders an ASCII DAG in the terminal with colors and badges

### Snippets

![Snippets](https://raw.githubusercontent.com/andreahlert/flyte-vscode/main/assets/demo-snippets.gif)

| Prefix | Output |
|--------|--------|
| `fenv` | `TaskEnvironment` with resources |
| `ftask` | `@env.task` async function |
| `fapp` | `AppEnvironment` with port |
| `fres` | `Resources(cpu, memory, gpu)` |
| `frun` | `flyte.run()` entry point |
| `fdeploy` | `flyte.deploy()` entry point |
| `fcache` | `Cache` with behavior and ignored_inputs |
| `ftrigger` | `Trigger` with Cron or FixedRate |
| `ftrigger-daily` | `Trigger.daily()` shortcut |
| `ftrigger-hourly` | `Trigger.hourly()` shortcut |
| `fimage` | `Image.from_debian_base().with_pip_packages()` |
| `fmap` | `flyte.map()` over inputs |
| `fgroup` | `flyte.group()` context manager |
| `ftrace` | `@flyte.trace` decorator |
| `fsecret` | `Secret` with env var |

### Cluster Management

![Clusters](https://raw.githubusercontent.com/andreahlert/flyte-vscode/main/assets/demo-clusters.gif)

- **Union.ai**: connect with endpoint, project, domain (3 steps)
- **Self-Hosted**: connect to existing or create local cluster (k3d + Flyte Manager)
- **Pause/Resume** local clusters (stops k3d + Flyte Manager)
- **Rename/Delete** clusters from sidebar

### Task Execution

- **Local**: runs with interactive TUI (`flyte run --local --tui`)
- **Remote**: runs on any configured cluster with auto-injected flags
- **Cluster picker**: every Run/Deploy/Build/Serve command asks which cluster
- Runs show **Union logo** (gold) for remote or **Flyte logo** (purple) for local, with colored status dots (green=succeeded, red=failed, orange=running, gray=unknown)
- **Filter** runs by All, Local, or Remote

### Runs

- **Local runs** from SQLite persistence (auto-enabled)
- **Remote runs** from cluster via `flyte get run`
- Status icons with source indicators
- **TUI** access for interactive run exploration

### Secrets

- **List** secrets from cluster
- **Create** new secrets (password-masked input)
- **Delete** secrets with confirmation
- Cluster picker when multiple clusters configured

### Triggers

- **List** triggers from cluster with status (active/paused)
- **Activate/Deactivate** triggers via `flyte update trigger`
- **Delete** triggers from cluster with confirmation
- Triggers are defined in code (`@env.task(triggers=...)`) and deployed to the cluster

### Deploy

- Deploy environments to a cluster via `flyte deploy`
- Asks which environment when file has multiple
- Auto-selects environment when deploying from task sidebar item
- Builds Docker images, bundles code, registers tasks

## Requirements

- VS Code 1.85+
- Python with Flyte SDK (`pip install flyte`)
- Docker (optional, for local cluster)

## Install

```sh
code --install-extension atoolz.flyte-vscode
```

## Quick Start

1. `pip install flyte`
2. Open a Python project with Flyte V2 code
3. Type `fenv` + Tab to create a TaskEnvironment
4. Type `ftask` + Tab to create a task
5. Click **Run Task** above the task to execute locally with TUI
6. Add a cluster via the sidebar to deploy and run remotely

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `flyte.cliPath` | `""` | Path to Flyte CLI. Empty for auto-discovery |
| `flyte.pythonPath` | `""` | Path to Python interpreter |
| `flyte.autoRefreshRuns` | `true` | Auto-refresh runs view |
| `flyte.refreshInterval` | `10000` | Refresh interval in ms |

## Sidebar Sections

| Section | Source | Description |
|---------|--------|-------------|
| Environments | Local code | `TaskEnvironment` definitions |
| Tasks | Local code | `@env.task` functions with signatures |
| Apps | Local code | `AppEnvironment` definitions |
| Clusters | Extension config | Union.ai and self-hosted connections |
| Runs | Local SQLite + Cluster | Execution history with status icons |
| Secrets | Cluster | Secret management (create/delete) |
| Triggers | Cluster | Scheduled triggers (activate/deactivate/delete) |

## Links

- [Flyte V2 Docs](https://www.union.ai/docs/v2/flyte/user-guide/running-locally/)
- [Flyte SDK](https://github.com/flyteorg/flyte-sdk)
- [SDK Reference](https://www.union.ai/docs/v2/byoc/api-reference/flyte-sdk/)
- [CLI Reference](https://www.union.ai/docs/v2/byoc/api-reference/flyte-cli/)

## License

MIT
