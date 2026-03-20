import * as vscode from 'vscode';
import { runTask } from '../cli/cliRunner.js';
import { parseSource } from '../parser/pythonParser.js';
import { extractFlyteInfo } from '../parser/flyteExtractor.js';
import type { ClusterConfig } from '../views/clusterTreeProvider.js';

let getActiveCluster: (() => ClusterConfig | undefined) | undefined;

export function setRunClusterProvider(fn: () => ClusterConfig | undefined): void {
  getActiveCluster = fn;
}

export async function handleRunTask(
  uri?: vscode.Uri,
  taskName?: string,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  const filePath = fileUri.fsPath;

  if (!taskName) {
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const tree = parseSource(doc.getText());
    if (!tree) {
      vscode.window.showErrorMessage('Could not parse Python file.');
      return;
    }

    const info = extractFlyteInfo(tree);
    if (info.tasks.length === 0) {
      vscode.window.showErrorMessage('No Flyte tasks found in this file.');
      return;
    }

    if (info.tasks.length === 1) {
      taskName = info.tasks[0].functionName;
    } else {
      const picked = await vscode.window.showQuickPick(
        info.tasks.map((t) => ({
          label: t.functionName,
          description: `${t.isAsync ? 'async ' : ''}${t.envVarName}.task`,
          detail: t.returnType ? `-> ${t.returnType}` : undefined,
        })),
        { placeHolder: 'Select a task to run' },
      );
      if (!picked) return;
      taskName = picked.label;
    }
  }

  // Ask where to run if cluster is available
  const activeCluster = getActiveCluster?.();
  let selectedCluster: ClusterConfig | undefined;

  if (activeCluster) {
    const target = await vscode.window.showQuickPick(
      [
        {
          label: 'Local',
          description: 'Run on your machine',
          value: 'local' as const,
        },
        {
          label: activeCluster.name,
          description: activeCluster.endpoint,
          value: 'cluster' as const,
        },
      ],
      { placeHolder: `Where to run ${taskName}?` },
    );
    if (!target) return;

    if (target.value === 'cluster') {
      selectedCluster = activeCluster;
    }
  }

  try {
    await runTask(filePath, taskName, selectedCluster);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to run task: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
