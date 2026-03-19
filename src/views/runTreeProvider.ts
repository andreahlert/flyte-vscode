import * as vscode from 'vscode';

export class RunTreeItem extends vscode.TreeItem {
  constructor(
    public readonly runId: string,
    public readonly status: string,
    public readonly taskName: string,
  ) {
    super(taskName || runId, vscode.TreeItemCollapsibleState.None);
    this.description = status;
    this.tooltip = `Run: ${runId}\nStatus: ${status}\nTask: ${taskName}`;
    this.contextValue = 'flyteRun';
    this.iconPath = new vscode.ThemeIcon(statusIcon(status));
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case 'running':
      return 'sync~spin';
    case 'succeeded':
      return 'check';
    case 'failed':
      return 'error';
    case 'aborted':
      return 'stop';
    default:
      return 'question';
  }
}

export class RunTreeProvider
  implements vscode.TreeDataProvider<RunTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<RunTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: RunTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<RunTreeItem[]> {
    // Phase 4: Populate via `flyte get run --output-format json`
    return [];
  }
}
