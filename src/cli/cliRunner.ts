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
): Promise<vscode.Terminal> {
  const cliPath = await getCliPath();
  const fullCommand = [cliPath, command, ...args].map(shellEscape).join(' ');

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
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal(
    'run',
    ['--local', filePath, taskName, ...extraArgs],
    `Run: ${taskName}`,
  );
}

export async function deploy(
  filePath: string,
  cluster?: ClusterConfig,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal(
    'deploy',
    [...clusterArgs(cluster), ...registryArgs(cluster), filePath, ...extraArgs],
    'Flyte: Deploy',
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
  );
}

export async function serve(
  filePath: string,
  cluster?: ClusterConfig,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal(
    'serve',
    [...clusterArgs(cluster), filePath, ...extraArgs],
    'Flyte: Serve',
  );
}

export async function abort(
  runId: string,
  cluster?: ClusterConfig,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal(
    'abort',
    [...clusterArgs(cluster), runId, ...extraArgs],
    'Flyte: Abort',
  );
}
