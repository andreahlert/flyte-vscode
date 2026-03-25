import * as vscode from 'vscode';
import { queryFlyteCli } from '../cli/cliQuery.js';
import type { ClusterConfig } from './clusterTreeProvider.js';

export class TriggerTreeItem extends vscode.TreeItem {
  constructor(
    public readonly triggerName: string,
    public readonly taskName: string,
    public readonly status: string,
  ) {
    super(triggerName, vscode.TreeItemCollapsibleState.None);
    this.description = `${taskName} (${status})`;
    this.iconPath = new vscode.ThemeIcon(
      status === 'active' ? 'clock' : 'debug-pause',
    );
    this.contextValue = 'flyteTrigger';
  }
}

export class TriggerTreeProvider
  implements vscode.TreeDataProvider<TriggerTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<TriggerTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private clusterGetter: () => ClusterConfig[];

  constructor(clusterGetter: () => ClusterConfig[]) {
    this.clusterGetter = clusterGetter;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TriggerTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<TriggerTreeItem[]> {
    const clusters = this.clusterGetter();
    if (clusters.length === 0) return [];

    const cluster = clusters.find(c => c.project && c.domain) ?? clusters[0];
    const data = await queryFlyteCli(['trigger', '--limit', '20'], cluster);

    return data.map((t: any) => {
      const name = t.name ?? t.id?.name ?? 'unknown';
      const taskName = t.taskName ?? t.task?.name ?? t.id?.taskName ?? '';
      const status = t.active === false ? 'paused' : 'active';
      return new TriggerTreeItem(name, taskName, status);
    });
  }
}
