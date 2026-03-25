import * as vscode from 'vscode';
import { deploy } from '../cli/cliRunner.js';
import { parseSource } from '../parser/pythonParser.js';
import { extractFlyteInfo } from '../parser/flyteExtractor.js';
import type { ClusterConfig } from '../views/clusterTreeProvider.js';

let getAllClusters: (() => ClusterConfig[]) | undefined;

export function setDeployClusterProvider(fn: () => ClusterConfig[]): void {
  getAllClusters = fn;
}

export async function handleDeploy(uriOrItem?: vscode.Uri | any): Promise<void> {
  let fileUri: vscode.Uri | undefined;
  let envVarName: string | undefined;

  if (uriOrItem instanceof vscode.Uri) {
    fileUri = uriOrItem;
  } else if (uriOrItem?.fileUri) {
    fileUri = uriOrItem.fileUri;
    // If from a task item, get the env var name
    envVarName = uriOrItem.task?.envVarName;
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

  // Pick cluster
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

  // Find environments in the file
  if (!envVarName) {
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const tree = parseSource(doc.getText());
    if (tree) {
      const info = extractFlyteInfo(tree);
      if (info.environments.length === 1) {
        envVarName = info.environments[0].varName;
      } else if (info.environments.length > 1) {
        const envPicked = await vscode.window.showQuickPick(
          info.environments.map((e) => ({
            label: e.varName,
            description: e.name,
          })),
          { placeHolder: 'Deploy which environment?' },
        );
        if (!envPicked) return;
        envVarName = envPicked.label;
      }
    }
  }

  try {
    await deploy(fileUri.fsPath, picked.cluster, envVarName);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to deploy: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
