import * as vscode from 'vscode';
import { discoverCli } from './cliDiscovery.js';

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

export async function runInTerminal(
  command: string,
  args: string[],
  name?: string,
): Promise<vscode.Terminal> {
  const cliPath = await getCliPath();
  const parts = cliPath.split(' ');
  const shellPath = parts[0];
  const shellArgs = [...parts.slice(1), command, ...args];

  const terminal = vscode.window.createTerminal({
    name: name ?? `Flyte: ${command}`,
    shellPath,
    shellArgs,
  });
  terminal.show();
  return terminal;
}

export async function runTask(
  filePath: string,
  taskName: string,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal('run', [filePath, taskName, ...extraArgs], `Run: ${taskName}`);
}

export async function deploy(
  filePath: string,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal('deploy', [filePath, ...extraArgs], 'Flyte: Deploy');
}

export async function build(
  filePath: string,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal('build', [filePath, ...extraArgs], 'Flyte: Build');
}

export async function serve(
  filePath: string,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal('serve', [filePath, ...extraArgs], 'Flyte: Serve');
}

export async function abort(
  runId: string,
  extraArgs: string[] = [],
): Promise<vscode.Terminal> {
  return runInTerminal('abort', [runId, ...extraArgs], 'Flyte: Abort');
}
