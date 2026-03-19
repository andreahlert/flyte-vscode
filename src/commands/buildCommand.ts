import * as vscode from 'vscode';
import { build } from '../cli/cliRunner.js';
import type { ClusterConfig } from '../views/clusterTreeProvider.js';

let getActiveCluster: (() => ClusterConfig | undefined) | undefined;

export function setBuildClusterProvider(fn: () => ClusterConfig | undefined): void {
  getActiveCluster = fn;
}

export async function handleBuild(uri?: vscode.Uri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  try {
    const cluster = getActiveCluster?.();
    await build(fileUri.fsPath, cluster);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to build: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
