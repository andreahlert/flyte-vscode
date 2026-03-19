import * as vscode from 'vscode';
import { deploy } from '../cli/cliRunner.js';
import type { ClusterConfig } from '../views/clusterTreeProvider.js';

let getActiveCluster: (() => ClusterConfig | undefined) | undefined;

export function setClusterProvider(fn: () => ClusterConfig | undefined): void {
  getActiveCluster = fn;
}

export async function handleDeploy(uri?: vscode.Uri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  const cluster = getActiveCluster?.();
  if (!cluster) {
    vscode.window.showErrorMessage(
      'No active cluster. Configure one in the Flyte sidebar.',
    );
    return;
  }

  try {
    await deploy(fileUri.fsPath, cluster);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to deploy: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
