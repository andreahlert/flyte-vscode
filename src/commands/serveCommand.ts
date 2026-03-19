import * as vscode from 'vscode';
import { serve } from '../cli/cliRunner.js';
import type { ClusterConfig } from '../views/clusterTreeProvider.js';

let getActiveCluster: (() => ClusterConfig | undefined) | undefined;

export function setServeClusterProvider(fn: () => ClusterConfig | undefined): void {
  getActiveCluster = fn;
}

export async function handleServe(uri?: vscode.Uri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  try {
    const cluster = getActiveCluster?.();
    await serve(fileUri.fsPath, cluster);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to serve: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
