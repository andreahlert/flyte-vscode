import * as vscode from 'vscode';
import { deploy } from '../cli/cliRunner.js';
import type { ClusterConfig } from '../views/clusterTreeProvider.js';

let getAllClusters: (() => ClusterConfig[]) | undefined;

export function setDeployClusterProvider(fn: () => ClusterConfig[]): void {
  getAllClusters = fn;
}

export async function handleDeploy(uriOrItem?: vscode.Uri | any): Promise<void> {
  let fileUri: vscode.Uri | undefined;

  if (uriOrItem instanceof vscode.Uri) {
    fileUri = uriOrItem;
  } else if (uriOrItem?.fileUri) {
    // From sidebar tree item (TaskTreeItem, AppTreeItem)
    fileUri = uriOrItem.fileUri;
  } else {
    fileUri = vscode.window.activeTextEditor?.document.uri;
  }

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  const clusters = getAllClusters?.() ?? [];
  if (clusters.length === 0) {
    vscode.window.showErrorMessage('No clusters configured. Add one in the Flyte sidebar.');
    return;
  }

  const picked = clusters.length === 1
    ? { cluster: clusters[0] }
    : await vscode.window.showQuickPick(
        clusters.map((c) => ({
          label: c.name,
          description: `${c.project ?? c.endpoint}`,
          cluster: c,
        })),
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
