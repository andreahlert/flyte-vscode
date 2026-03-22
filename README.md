# Flyte

VS Code extension for [Flyte V2](https://github.com/flyteorg/flyte-sdk). Code intelligence, CLI integration, cluster management, and task visualization for ML workflow development.

## Features

### Code Intelligence

- **Autocomplete** inside `TaskEnvironment()`, `Resources()`, `AppEnvironment()`, `Trigger()`, `Cache()`, `Secret()`, and `@env.task()` with parameter names, types, and defaults
- **Hover documentation** on all Flyte classes, parameters, and functions (`flyte.run`, `flyte.deploy`, `flyte.map`, `flyte.group`, `flyte.trace`)
- **Diagnostics** with real-time validation: invalid environment/app names, reserved ports, plugin_config + reusable conflicts, unknown GPU accelerators, empty trigger names
- **GPU completions** after `gpu=` with all valid accelerators (T4, A100, H100, L4, V100, etc.)

### CodeLens

- **Run Task** above every `@env.task` function (only when all params have defaults)
- **Deploy** when clusters are configured
- **Graph** renders an ASCII DAG in the terminal showing tasks grouped by environment with colors, parameter signatures, and badges

### Task Execution

- **Local execution** with interactive TUI (`flyte run --local --tui`)
- **Remote execution** on any configured cluster with auto-injected endpoint, auth, and registry flags
- **Cluster picker** on every Run/Deploy/Build/Serve command

### Cluster Management

- **Union.ai** connection with endpoint configuration
- **Self-Hosted** cluster connection or local cluster creation
- **Local cluster** setup via k3d (Kubernetes in Docker) with Docker registry, Flyte Manager as daemon
- **Pause/Resume** local clusters (stops both Flyte Manager and k3d)
- **Rename/Delete** clusters from the sidebar

### Sidebar

Five sections following the project workflow:

1. **Environments** - `TaskEnvironment` definitions with names and variables
2. **Tasks** - `@env.task` functions with async status and environment association
3. **Apps** - `AppEnvironment` definitions
4. **Clusters** - configured clusters with Union (gold) and Flyte (purple) logos
5. **Runs** - execution history from local SQLite persistence

### Snippets

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
| `fimage` | `Image.from_debian_base().with_pip_packages()` |
| `fmap` | `flyte.map()` over inputs |
| `fgroup` | `flyte.group()` context manager |
| `ftrace` | `@flyte.trace` decorator |
| `fsecret` | `Secret` with env var |

## Requirements

- VS Code 1.85+
- Python with Flyte SDK (`pip install flyte`)
- Docker (optional, for local cluster)

## Install

```sh
code --install-extension flyteorg.flyte-vscode
```

## Quick Start

1. `pip install flyte`
2. Open a Python project
3. Type `fenv` + Tab to create a TaskEnvironment
4. Type `ftask` + Tab to create a task
5. Click **Run Task** above the task to execute locally with TUI
6. Check the **Runs** section in the sidebar for execution history

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `flyte.cliPath` | `""` | Path to Flyte CLI. Empty for auto-discovery |
| `flyte.pythonPath` | `""` | Path to Python interpreter |
| `flyte.autoRefreshRuns` | `true` | Auto-refresh runs view |
| `flyte.refreshInterval` | `10000` | Refresh interval in ms |

## CLI Auto-Discovery

The extension finds the Flyte CLI in this order:

1. `flyte.cliPath` setting
2. `.venv/bin/flyte` in workspace
3. `flyte` in system PATH
4. `uv run flyte` if uv is available

## Links

- [Flyte V2 Docs](https://www.union.ai/docs/v2/flyte/user-guide/running-locally/)
- [Flyte SDK](https://github.com/flyteorg/flyte-sdk)
- [SDK Reference](https://www.union.ai/docs/v2/byoc/api-reference/flyte-sdk/)
- [CLI Reference](https://www.union.ai/docs/v2/byoc/api-reference/flyte-cli/)

## License

MIT
