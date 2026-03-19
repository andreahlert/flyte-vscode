export const EXTENSION_ID = 'flyte-vscode';
export const EXTENSION_NAME = 'Flyte';

export const COMMANDS = {
  RUN_TASK: 'flyte.runTask',
  DEPLOY: 'flyte.deploy',
  BUILD: 'flyte.build',
  SERVE: 'flyte.serve',
  ABORT: 'flyte.abort',
  SHOW_GRAPH: 'flyte.showGraph',
  REFRESH_RUNS: 'flyte.refreshRuns',
  REFRESH_EXPLORER: 'flyte.refreshExplorer',
  CONNECT_UNION: 'flyte.connectUnion',
  CONNECT_SELF_HOSTED: 'flyte.connectSelfHosted',
  ADD_CLUSTER: 'flyte.addCluster',
  REMOVE_CLUSTER: 'flyte.removeCluster',
  SET_ACTIVE_CLUSTER: 'flyte.setActiveCluster',
} as const;

export const VIEWS = {
  ENVIRONMENTS: 'flyte.environments',
  TASKS: 'flyte.tasks',
  RUNS: 'flyte.runs',
  APPS: 'flyte.apps',
  CLUSTERS: 'flyte.clusters',
} as const;

export const CONFIG = {
  CLI_PATH: 'flyte.cliPath',
  PYTHON_PATH: 'flyte.pythonPath',
  AUTO_REFRESH_RUNS: 'flyte.autoRefreshRuns',
  REFRESH_INTERVAL: 'flyte.refreshInterval',
} as const;

export const FLYTE_LANGUAGE_ID = 'python';
