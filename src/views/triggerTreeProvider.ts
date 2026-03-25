import * as vscode from 'vscode';
import { queryFlyteCli } from '../cli/cliQuery.js';
import type { ClusterConfig } from './clusterTreeProvider.js';

export class TriggerTreeItem extends vscode.TreeItem {
  constructor(
    public readonly triggerName: string,
    public readonly taskName: string,
    public readonly active: boolean,
    public readonly cluster: ClusterConfig | undefined,
  ) {
    super(triggerName, vscode.TreeItemCollapsibleState.None);
    this.description = `${taskName}${active ? '' : ' (paused)'}`;
    this.tooltip = `Trigger: ${triggerName}\nTask: ${taskName}\nStatus: ${active ? 'active' : 'paused'}`;
    this.iconPath = new vscode.ThemeIcon(
      active ? 'clock' : 'debug-pause',
      active ? new vscode.ThemeColor('charts.green') : undefined,
    );
    this.contextValue = active ? 'flyteTriggerActive' : 'flyteTriggerPaused';
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
    const data = await queryFlyteCli(['trigger', '--limit', '30'], cluster);

    return data.map((t: any) => {
      const name = t.name ?? t.id?.name ?? 'unknown';
      const taskName = t.taskName ?? t.task_name ?? t.id?.taskName ?? '';
      const active = t.active !== false && t.status !== 'INACTIVE';
      return new TriggerTreeItem(name, taskName, active, cluster);
    });
  }
}
