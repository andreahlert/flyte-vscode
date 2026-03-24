import * as vscode from 'vscode';
import * as path from 'path';
import { parseSource } from '../parser/pythonParser.js';
import { extractFlyteInfo } from '../parser/flyteExtractor.js';
import type { ParseResult } from '../parser/types.js';

const ENV_COLORS: Record<string, string> = {
  '0': '\x1b[36m',  // cyan
  '1': '\x1b[33m',  // yellow
  '2': '\x1b[32m',  // green
  '3': '\x1b[35m',  // magenta
  '4': '\x1b[34m',  // blue
  '5': '\x1b[31m',  // red
};
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const PURPLE = '\x1b[38;5;134m';

function renderAsciiGraph(info: ParseResult, fileName: string): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(`${BOLD}${PURPLE}  Flyte Task Graph${RESET}  ${DIM}${fileName}${RESET}`);
  lines.push(`${DIM}  ${'─'.repeat(50)}${RESET}`);
  lines.push('');

  // Group tasks by environment
  const envGroups = new Map<string, typeof info.tasks>();
  for (const task of info.tasks) {
    const group = envGroups.get(task.envVarName) ?? [];
    group.push(task);
    envGroups.set(task.envVarName, group);
  }

  // Find environment details
  const envMap = new Map(info.environments.map(e => [e.varName, e]));

  const envKeys = [...envGroups.keys()];
  const lastEnvIdx = envKeys.length - 1;

  envKeys.forEach((envName, envIdx) => {
    const color = ENV_COLORS[String(envIdx % 6)] ?? ENV_COLORS['0'];
    const env = envMap.get(envName);
    const displayName = env?.name ?? envName;
    const tasks = envGroups.get(envName)!;

    // Environment header box
    lines.push(`${color}  ┌─ ${BOLD}${displayName}${RESET}${color} (${envName})${RESET}`);

    // Resources info if available
    if (env?.params) {
      const resources = env.params['resources'];
      if (resources) {
        const short = resources
          .replace(/flyte\.Resources\(/, '')
          .replace(/\)$/, '')
          .replace(/"/g, '');
        lines.push(`${color}  │  ${DIM}resources: ${short}${RESET}`);
      }
    }

    lines.push(`${color}  │${RESET}`);

    // Tasks
    tasks.forEach((task, taskIdx) => {
      const isLastTask = taskIdx === tasks.length - 1;
      const connector = isLastTask ? '└' : '├';
      const prefix = task.isAsync ? 'async ' : '';
      const params = task.parameters.map(p => {
        const def = p.defaultValue ? `=${p.defaultValue}` : '';
        return `${p.name}: ${p.type || 'Any'}${def}`;
      }).join(', ');
      const ret = task.returnType ? ` -> ${task.returnType}` : '';
      const retries = task.decoratorParams['retries'];
      const badges: string[] = [];
      if (retries && retries !== '0') badges.push(`retries:${retries}`);
      if (task.decoratorParams['timeout']) badges.push('timeout');
      if (task.decoratorParams['triggers']) badges.push('trigger');
      const badgeStr = badges.length > 0 ? ` ${DIM}[${badges.join(', ')}]${RESET}` : '';

      lines.push(`${color}  │  ${connector}── ${BOLD}${prefix}${task.functionName}${RESET}(${DIM}${params}${RESET})${DIM}${ret}${RESET}${badgeStr}`);
    });

    // Connector between environments
    if (envIdx < lastEnvIdx) {
      lines.push(`${color}  │${RESET}`);
      lines.push(`${DIM}  │${RESET}`);
      lines.push(`${DIM}  ▼${RESET}`);
    }
  });

  // Apps
  if (info.apps.length > 0) {
    lines.push('');
    lines.push(`${DIM}  ▼${RESET}`);
    lines.push(`${BOLD}\x1b[38;5;208m  ┌─ Apps${RESET}`);
    info.apps.forEach((app, i) => {
      const connector = i === info.apps.length - 1 ? '└' : '├';
      const port = app.params['port'] ?? '8080';
      lines.push(`\x1b[38;5;208m  │  ${connector}── ${BOLD}${app.name}${RESET} ${DIM}(${app.varName}, port:${port})${RESET}`);
    });
  }

  // Summary
  lines.push('');
  lines.push(`${DIM}  ${'─'.repeat(50)}${RESET}`);
  lines.push(`${DIM}  ${info.environments.length} environments, ${info.tasks.length} tasks, ${info.apps.length} apps${RESET}`);

  // Calls
  const calls = info.calls;
  if (calls.length > 0) {
    const callSummary = calls.map(c => c.type).join(', ');
    lines.push(`${DIM}  calls: ${callSummary}${RESET}`);
  }

  lines.push('');
  return lines.join('\n');
}

export async function handleShowGraph(uri?: vscode.Uri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  const doc = await vscode.workspace.openTextDocument(fileUri);
  const tree = parseSource(doc.getText());
  if (!tree) {
    vscode.window.showErrorMessage('Could not parse Python file.');
    return;
  }

  const info = extractFlyteInfo(tree);

  if (info.tasks.length === 0 && info.apps.length === 0) {
    vscode.window.showInformationMessage('No Flyte tasks or apps found in this file.');
    return;
  }

  const fileName = path.basename(fileUri.fsPath);
  const output = renderAsciiGraph(info, fileName);

  // Write to temp file and cat it (preserves ANSI colors)
  const fs = await import('fs');
  const os = await import('os');
  const tmpFile = path.join(os.tmpdir(), `flyte-graph-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, output);

  const terminal = vscode.window.createTerminal({
    name: `Graph: ${fileName}`,
  });
  terminal.show();
  terminal.sendText(`cat "${tmpFile}" && rm "${tmpFile}"`);
}
