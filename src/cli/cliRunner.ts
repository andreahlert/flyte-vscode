import * as vscode from 'vscode';
import { discoverCli } from './cliDiscovery.js';
import type { ClusterConfig } from '../views/clusterTreeProvider.js';

let cachedCliPath: string | null = null;

async function getCliPath(): Promise<string> {
  if (!cachedCliPath) {
    cachedCliPath = await discoverCli();
  }
  if (!cachedCliPath) {
    throw new Error(
      'Flyte CLI not found. Set flyte.cliPath in settings or install Flyte.',
    );
  }
  return cachedCliPath;
}

export function resetCliCache(): void {
  cachedCliPath = null;
}

function shellEscape(arg: string): string {
  if (/^[a-zA-Z0-9._/:-=]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

function clusterArgs(cluster?: ClusterConfig): string[] {
  if (!cluster) return [];
  const args: string[] = [];
  if (cluster.endpoint) {
    args.push('--endpoint', cluster.endpoint);
  }
  if (cluster.insecure) {
    args.push('--insecure');
  }
  return args;
}

function registryArgs(cluster?: ClusterConfig): string[] {
  if (!cluster?.registry) return [];
  return ['--image', `default=${cluster.registry}/flyte:latest`];
}

export async function runInTerminal(
  command: string,
  args: string[],
  name?: string,
  globalArgs: string[] = [],
): Promise<vscode.Terminal> {
  const cliPath = await getCliPath();
  const fullCommand = [cliPath, ...globalArgs, command, ...args].map(shellEscape).join(' ');

  const terminal = vscode.window.createTerminal({
    name: name ?? `Flyte: ${command}`,
  });
  terminal.show();
  terminal.sendText(fullCommand);
  return terminal;
}

export async function runTask(
  filePath: string,
  taskName: string,
  cluster?: ClusterConfig,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  if (cluster) {
    return runInTerminal(
      'run',
      [
        ...registryArgs(cluster),
        '--follow',
        filePath,
        taskName,
        ...extraArgs,
      ],
      `Run: ${taskName} (${cluster.name})`,
      clusterArgs(cluster),
    );
  }
  return runInTerminal(
    'run',
    ['--local', '--tui', filePath, taskName, ...extraArgs],
    `Run: ${taskName} (local)`,
  );
}

export async function deploy(
  filePath: string,
  cluster?: ClusterConfig,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal(
    'deploy',
    [...registryArgs(cluster), filePath, ...extraArgs],
    'Flyte: Deploy',
    clusterArgs(cluster),
  );
}

export async function build(
  filePath: string,
  cluster?: ClusterConfig,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal(
    'build',
    [...registryArgs(cluster), filePath, ...extraArgs],
    'Flyte: Build',
    clusterArgs(cluster),
  );
}

export async function serve(
  filePath: string,
  cluster?: ClusterConfig,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal(
    'serve',
    [filePath, ...extraArgs],
    'Flyte: Serve',
    clusterArgs(cluster),
  );
}

export async function abort(
  runId: string,
  cluster?: ClusterConfig,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal(
    'abort',
    [runId, ...extraArgs],
    'Flyte: Abort',
    clusterArgs(cluster),
  );
}
