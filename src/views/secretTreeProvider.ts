import * as vscode from 'vscode';
import { queryFlyteCli } from '../cli/cliQuery.js';
import type { ClusterConfig } from './clusterTreeProvider.js';

export class SecretTreeItem extends vscode.TreeItem {
  constructor(public readonly name: string) {
    super(name, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('key');
    this.contextValue = 'flyteSecret';
  }
}

export class SecretTreeProvider
  implements vscode.TreeDataProvider<SecretTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<SecretTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private clusterGetter: () => ClusterConfig[];

  constructor(clusterGetter: () => ClusterConfig[]) {
    this.clusterGetter = clusterGetter;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SecretTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<SecretTreeItem[]> {
    const clusters = this.clusterGetter();
    if (clusters.length === 0) return [];

    // Use first cluster with project/domain
    const cluster = clusters.find(c => c.project && c.domain) ?? clusters[0];
    const data = await queryFlyteCli(['secret'], cluster);

    return data.map((s: any) => {
      const name = typeof s === 'string' ? s : (s.name ?? s.id?.name ?? 'unknown');
      return new SecretTreeItem(name);
    });
  }
}
