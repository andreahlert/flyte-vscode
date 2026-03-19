import * as vscode from 'vscode';

export interface ClusterConfig {
  name: string;
  endpoint: string;
  insecure: boolean;
  type: 'union' | 'self-hosted';
}

const STORAGE_KEY = 'flyte.clusters';
const ACTIVE_KEY = 'flyte.activeCluster';

export class ClusterTreeItem extends vscode.TreeItem {
  constructor(
    public readonly cluster: ClusterConfig,
    public readonly isActive: boolean,
    extensionPath: string,
  ) {
    super(cluster.name, vscode.TreeItemCollapsibleState.None);
    this.description = isActive ? `${cluster.endpoint} (active)` : cluster.endpoint;
    this.tooltip = `${cluster.name}\n${cluster.endpoint}\nType: ${cluster.type === 'union' ? 'Union.ai' : 'Self-Hosted'}${cluster.insecure ? '\nInsecure' : ''}`;
    const iconFile = cluster.type === 'union' ? 'union-icon.svg' : 'flyte-icon.svg';
    this.iconPath = {
      light: vscode.Uri.joinPath(vscode.Uri.file(extensionPath), 'resources', iconFile),
      dark: vscode.Uri.joinPath(vscode.Uri.file(extensionPath), 'resources', iconFile),
    };
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

  async connectUnion(): Promise<void> {
    const endpoint = await vscode.window.showInputBox({
      prompt: 'Union.ai endpoint (from your Union dashboard)',
      placeHolder: 'dns:///your-org.unionai.cloud',
      ignoreFocusOut: true,
    });
    if (!endpoint) return;

    const name = await vscode.window.showInputBox({
      prompt: 'Name for this connection',
      value: 'union',
      ignoreFocusOut: true,
    });
    if (!name) return;

    await this.saveCluster({ name, endpoint, insecure: false, type: 'union' });

    const terminal = vscode.window.createTerminal('Union: Login');
    terminal.show();
    terminal.sendText(`flyte init --endpoint ${endpoint}`);
  }

  async connectSelfHosted(): Promise<void> {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: '$(rocket) Create Local Cluster',
          description: 'Set up a Flyte cluster on your machine',
          value: 'local' as const,
        },
        {
          label: '$(plug) Connect to Existing Cluster',
          description: 'I already have Flyte running on Kubernetes',
          value: 'existing' as const,
        },
      ],
      { placeHolder: 'How would you like to set up your cluster?' },
    );
    if (!choice) return;

    if (choice.value === 'local') {
      return this.createLocalCluster();
    }
    return this.connectExistingCluster();
  }

  private async createLocalCluster(): Promise<void> {
    const confirm = await vscode.window.showInformationMessage(
      'This will create a local Flyte V2 cluster on your machine.\n\n' +
      'What gets installed:\n' +
      '- k3d (lightweight Kubernetes in Docker)\n' +
      '- A single-node Kubernetes cluster\n' +
      '- Flyte Manager (Runs, Queue, and Executor services)\n\n' +
      'Requirements: Docker running, ~2GB free disk.\n' +
      'The cluster runs entirely on your machine.',
      { modal: true },
      'Create Cluster',
      'Cancel',
    );
    if (confirm !== 'Create Cluster') return;

    const scriptPath = vscode.Uri.joinPath(
      vscode.Uri.file(this.context.extensionPath),
      'scripts',
      'setup-local-cluster.sh',
    ).fsPath;

    const fs = await import('fs');
    if (!fs.existsSync(scriptPath)) {
      vscode.window.showErrorMessage(
        'Setup script not found. Make sure the extension was installed correctly.',
      );
      return;
    }

    const terminal = vscode.window.createTerminal('Flyte: Local Cluster');
    terminal.show();
    terminal.sendText(`bash "${scriptPath}"`);

    await this.saveCluster({
      name: 'local',
      endpoint: 'dns:///localhost:8090',
      insecure: true,
      type: 'self-hosted',
    });
  }

  private async connectExistingCluster(): Promise<void> {
    const endpoint = await vscode.window.showInputBox({
      prompt: 'Flyte cluster endpoint',
      placeHolder: 'dns:///flyte.my-company.com',
      ignoreFocusOut: true,
    });
    if (!endpoint) return;

    const name = await vscode.window.showInputBox({
      prompt: 'Name for this cluster',
      value: 'self-hosted',
      ignoreFocusOut: true,
    });
    if (!name) return;

    const insecureChoice = await vscode.window.showQuickPick(
      ['No (TLS)', 'Yes (insecure)'],
      { placeHolder: 'Use insecure connection?' },
    );
    if (!insecureChoice) return;

    await this.saveCluster({
      name,
      endpoint,
      insecure: insecureChoice.startsWith('Yes'),
      type: 'self-hosted',
    });

    const terminal = vscode.window.createTerminal('Flyte: Init');
    terminal.show();
    const insecureFlag = insecureChoice.startsWith('Yes') ? ' --insecure' : '';
    terminal.sendText(`flyte init --endpoint ${endpoint}${insecureFlag}`);
  }

  async addCluster(): Promise<void> {
    const typeChoice = await vscode.window.showQuickPick(
      [
        { label: 'Union.ai', description: 'Managed platform', value: 'union' as const },
        { label: 'Self-Hosted', description: 'Your own Flyte on Kubernetes', value: 'self-hosted' as const },
      ],
      { placeHolder: 'Cluster type' },
    );
    if (!typeChoice) return;

    if (typeChoice.value === 'union') {
      return this.connectUnion();
    }
    return this.connectSelfHosted();
  }

  private async saveCluster(cluster: ClusterConfig): Promise<void> {
    const clusters = this.getClusters();
    const existing = clusters.findIndex((c) => c.name === cluster.name);
    if (existing >= 0) {
      clusters[existing] = cluster;
    } else {
      clusters.push(cluster);
    }

    await this.saveClusters(clusters);

    if (clusters.length === 1) {
      await this.setActive(cluster.name);
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
      (c) => new ClusterTreeItem(c, c.name === activeName, this.context.extensionPath),
    );
  }
}
