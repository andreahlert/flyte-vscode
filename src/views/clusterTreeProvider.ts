import * as vscode from 'vscode';

export interface ClusterConfig {
  name: string;
  endpoint: string;
  insecure: boolean;
}

const STORAGE_KEY = 'flyte.clusters';
const ACTIVE_KEY = 'flyte.activeCluster';

export class ClusterTreeItem extends vscode.TreeItem {
  constructor(
    public readonly cluster: ClusterConfig,
    public readonly isActive: boolean,
  ) {
    super(cluster.name, vscode.TreeItemCollapsibleState.None);
    this.description = cluster.endpoint;
    this.tooltip = `${cluster.name}\n${cluster.endpoint}${cluster.insecure ? ' (insecure)' : ''}`;
    this.iconPath = new vscode.ThemeIcon(
      isActive ? 'plug' : 'debug-disconnect',
      isActive
        ? new vscode.ThemeColor('charts.green')
        : undefined,
    );
    this.contextValue = 'flyteCluster';
  }
}

export class ClusterTreeProvider
  implements vscode.TreeDataProvider<ClusterTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<ClusterTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  private getClusters(): ClusterConfig[] {
    return this.context.globalState.get<ClusterConfig[]>(STORAGE_KEY, []);
  }

  private saveClusters(clusters: ClusterConfig[]): Thenable<void> {
    return this.context.globalState.update(STORAGE_KEY, clusters);
  }

  getActiveName(): string | undefined {
    return this.context.globalState.get<string>(ACTIVE_KEY);
  }

  getActive(): ClusterConfig | undefined {
    const name = this.getActiveName();
    if (!name) return undefined;
    return this.getClusters().find((c) => c.name === name);
  }

  async addCluster(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Cluster name',
      placeHolder: 'production',
    });
    if (!name) return;

    const endpoint = await vscode.window.showInputBox({
      prompt: 'Flyte endpoint',
      placeHolder: 'dns:///flyte.example.com',
    });
    if (!endpoint) return;

    const insecureChoice = await vscode.window.showQuickPick(
      ['No (TLS)', 'Yes (insecure)'],
      { placeHolder: 'Use insecure connection?' },
    );
    if (!insecureChoice) return;

    const cluster: ClusterConfig = {
      name,
      endpoint,
      insecure: insecureChoice.startsWith('Yes'),
    };

    const clusters = this.getClusters();
    const existing = clusters.findIndex((c) => c.name === name);
    if (existing >= 0) {
      clusters[existing] = cluster;
    } else {
      clusters.push(cluster);
    }

    await this.saveClusters(clusters);

    if (clusters.length === 1) {
      await this.setActive(name);
    }

    this.refresh();
  }

  async removeCluster(item?: ClusterTreeItem): Promise<void> {
    const name =
      item?.cluster.name ??
      (await this.pickCluster('Select cluster to remove'));
    if (!name) return;

    const clusters = this.getClusters().filter((c) => c.name !== name);
    await this.saveClusters(clusters);

    if (this.getActiveName() === name) {
      await this.context.globalState.update(
        ACTIVE_KEY,
        clusters[0]?.name,
      );
    }

    this.refresh();
  }

  async setActive(nameOrItem?: string | ClusterTreeItem): Promise<void> {
    let name: string | undefined;
    if (typeof nameOrItem === 'string') {
      name = nameOrItem;
    } else if (nameOrItem instanceof ClusterTreeItem) {
      name = nameOrItem.cluster.name;
    } else {
      name = await this.pickCluster('Select active cluster');
    }
    if (!name) return;

    await this.context.globalState.update(ACTIVE_KEY, name);
    this.refresh();
  }

  private async pickCluster(
    placeHolder: string,
  ): Promise<string | undefined> {
    const clusters = this.getClusters();
    if (clusters.length === 0) {
      vscode.window.showInformationMessage(
        'No clusters configured. Use the + button to add one.',
      );
      return undefined;
    }
    const picked = await vscode.window.showQuickPick(
      clusters.map((c) => ({
        label: c.name,
        description: c.endpoint,
      })),
      { placeHolder },
    );
    return picked?.label;
  }

  getTreeItem(element: ClusterTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<ClusterTreeItem[]> {
    const clusters = this.getClusters();
    const activeName = this.getActiveName();

    if (clusters.length === 0) {
      return [];
    }

    return clusters.map(
      (c) => new ClusterTreeItem(c, c.name === activeName),
    );
  }
}
