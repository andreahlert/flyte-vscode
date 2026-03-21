import * as vscode from 'vscode';
import { serve } from '../cli/cliRunner.js';
import type { ClusterConfig } from '../views/clusterTreeProvider.js';

let getAllClusters: (() => ClusterConfig[]) | undefined;

export function setServeClusterProvider(fn: () => ClusterConfig[]): void {
  getAllClusters = fn;
}

export async function handleServe(uri?: vscode.Uri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  const clusters = getAllClusters?.() ?? [];
  const cluster = clusters.length === 1
    ? clusters[0]
    : clusters.length > 1
      ? (await vscode.window.showQuickPick(
          clusters.map((c) => ({ label: c.name, description: c.endpoint, cluster: c })),
          { placeHolder: 'Serve on which cluster?' },
        ))?.cluster
      : undefined;

  try {
    await serve(fileUri.fsPath, cluster);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to serve: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
