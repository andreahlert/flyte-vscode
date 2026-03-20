# Flyte

VS Code extension for [Flyte V2](https://github.com/flyteorg/flyte-sdk) with code intelligence, visualization, CLI integration, and cluster management.

![Sidebar](https://raw.githubusercontent.com/andreahlert/flyte-vscode/main/assets/screenshot-sidebar.png)

## Features

### Autocomplete

Parameter suggestions inside `TaskEnvironment()`, `Resources()`, `AppEnvironment()`, `Trigger()`, `Cache()`, `Secret()` and `@env.task()` decorators. Shows types, defaults, and documentation.

After `gpu=` suggests all valid accelerators (T4, A100, H100, etc). After `cache=` suggests auto, disable, override.

![Autocomplete](https://raw.githubusercontent.com/andreahlert/flyte-vscode/main/assets/screenshot-completion.png)

### Hover Documentation

Hover over any Flyte class or parameter to see inline docs with type info, defaults, and descriptions. Also covers `flyte.run`, `flyte.deploy`, `flyte.map`, `flyte.group`, `flyte.trace`, and more.

![Hover](https://raw.githubusercontent.com/andreahlert/flyte-vscode/main/assets/screenshot-hover.png)

### CodeLens

`Run Task` and `Graph` actions appear above every `@env.task` function. Run Task only shows for tasks where all parameters have defaults. When a cluster is active, asks whether to run locally (with TUI) or on the cluster.

![CodeLens](https://raw.githubusercontent.com/andreahlert/flyte-vscode/main/assets/screenshot-codelens.png)

### Sidebar

Flyte icon in the activity bar with five sections:

- **Environments** - all `TaskEnvironment` definitions in the workspace
- **Tasks** - all `@env.task` decorated functions with signatures
- **Apps** - all `AppEnvironment` definitions
- **Clusters** - Union.ai (gold) and Self-Hosted/Local (purple) with one-click setup
- **Runs** - execution history with TUI access

Click any item to navigate to its source code.

### Snippets

13 snippets for common Flyte V2 patterns:

| Prefix | Description |
|--------|-------------|
| `fenv` | TaskEnvironment |
| `ftask` | @env.task async function |
| `fapp` | AppEnvironment |
| `fres` | Resources(cpu, memory, gpu) |
| `frun` | if \_\_name\_\_ + flyte.run() |
| `fdeploy` | if \_\_name\_\_ + flyte.deploy() |
| `fcache` | Cache with CachePolicy |
| `ftrigger` | Trigger with Cron/FixedRate |
| `fimage` | Image.from_debian_base() |
| `fmap` | flyte.map over inputs |
| `fgroup` | flyte.group context manager |
| `ftrace` | @flyte.trace decorator |
| `fsecret` | Secret reference |

### Cluster Management

Connect to **Union.ai** (managed platform) or set up a **local cluster** (k3d + Flyte Manager) directly from the sidebar. The local setup script installs k3d, creates a Kubernetes cluster with Docker registry, builds and starts the Flyte Manager as a background daemon.

Deploy, build, and serve commands automatically inject the active cluster's endpoint, auth flags, and registry.

### CLI Integration

All Flyte CLI commands accessible from CodeLens and Command Palette:

- `Flyte: Run Task` - local (with TUI) or remote execution
- `Flyte: Deploy` - deploy environments to active cluster
- `Flyte: Build` - build Docker images
- `Flyte: Serve App` - serve an AppEnvironment
- `Flyte: Abort Run` - abort a running execution
- `Flyte: Show Task Graph` - display task dependencies
- `Flyte: Open TUI` - interactive run explorer

## Requirements

- VS Code 1.85+
- Python with `flyte` SDK installed (`pip install flyte`)
- Docker (for local cluster setup)

## Install

```sh
code --install-extension flyteorg.flyte-vscode
```

Or search **Flyte** in the VS Code Extensions view.

## Quick Start

1. Install the Flyte SDK: `pip install flyte`
2. Open a Python project with Flyte V2 code
3. Click the Flyte icon in the activity bar to see your environments, tasks, and apps
4. Use `fenv` + Tab to create a new TaskEnvironment
5. Use `ftask` + Tab to create a new task
6. Click `Run Task` above a task to execute it locally with TUI

## License

MIT
