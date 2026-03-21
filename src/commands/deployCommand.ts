import * as vscode from 'vscode';
import { deploy } from '../cli/cliRunner.js';
import type { ClusterConfig } from '../views/clusterTreeProvider.js';

let getAllClusters: (() => ClusterConfig[]) | undefined;

export function setDeployClusterProvider(fn: () => ClusterConfig[]): void {
  getAllClusters = fn;
}

export async function handleDeploy(uri?: vscode.Uri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  const clusters = getAllClusters?.() ?? [];
  if (clusters.length === 0) {
    vscode.window.showErrorMessage('No clusters configured. Add one in the Flyte sidebar.');
    return;
  }

  const picked = await vscode.window.showQuickPick(
    clusters.map((c) => ({ label: c.name, description: c.endpoint, cluster: c })),
    { placeHolder: 'Deploy to which cluster?' },
  );
  if (!picked) return;

  try {
    await deploy(fileUri.fsPath, picked.cluster);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to deploy: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
