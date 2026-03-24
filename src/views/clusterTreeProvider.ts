import * as vscode from 'vscode';

export interface ClusterConfig {
  name: string;
  endpoint: string;
  insecure: boolean;
  type: 'union' | 'self-hosted';
  project?: string;
  domain?: string;
  registry?: string;
  status?: 'running' | 'paused';
}

function isValidIdentifier(s: string): boolean {
  return /^[a-zA-Z0-9._:/-]+$/.test(s);
}

const STORAGE_KEY = 'flyte.clusters';

export class ClusterTreeItem extends vscode.TreeItem {
  constructor(
    public readonly cluster: ClusterConfig,
    extensionPath: string,
  ) {
    super(cluster.name, vscode.TreeItemCollapsibleState.None);
    const isLocal = cluster.type === 'self-hosted' && cluster.registry;
    const statusLabel = isLocal
      ? (cluster.status === 'paused' ? ' (paused)' : ' (running)')
      : '';
    const projectLabel = cluster.project ? ` / ${cluster.project}` : '';
    this.description = `${cluster.project ?? cluster.endpoint}${statusLabel}`;
    this.tooltip = [
      cluster.name,
      cluster.endpoint,
      cluster.project ? `Project: ${cluster.project}` : '',
      cluster.domain ? `Domain: ${cluster.domain}` : '',
      `Type: ${cluster.type === 'union' ? 'Union.ai' : 'Self-Hosted'}`,
      statusLabel ? `Status:${statusLabel}` : '',
      cluster.insecure ? 'Insecure' : '',
    ].filter(Boolean).join('\n');
    const iconFile = cluster.type === 'union' ? 'union-icon.svg' : 'flyte-icon-purple.svg';
    this.iconPath = {
      light: vscode.Uri.joinPath(vscode.Uri.file(extensionPath), 'resources', iconFile),
      dark: vscode.Uri.joinPath(vscode.Uri.file(extensionPath), 'resources', iconFile),
    };
    const isPaused = cluster.status === 'paused';
    this.contextValue = isLocal
      ? (isPaused ? 'flyteClusterLocalPaused' : 'flyteClusterLocalRunning')
      : 'flyteCluster';
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

  getClusters(): ClusterConfig[] {
    return this.context.globalState.get<ClusterConfig[]>(STORAGE_KEY, []);
  }

  private saveClusters(clusters: ClusterConfig[]): Thenable<void> {
    return this.context.globalState.update(STORAGE_KEY, clusters);
  }


  async connectUnion(): Promise<void> {
    const endpoint = await vscode.window.showInputBox({
      prompt: 'Union.ai endpoint',
      placeHolder: 'tryv2.hosted.unionai.cloud',
      ignoreFocusOut: true,
    });
    if (!endpoint) return;

    // Extract org from endpoint for the name (e.g., tryv2 from tryv2.hosted.unionai.cloud)
    const cleanEndpoint = endpoint.replace('dns:///', '');
    const org = cleanEndpoint.split('.')[0];

    // Ask project with sensible default
    const project = await vscode.window.showInputBox({
      prompt: 'Project name (from your Union dashboard)',
      value: org,
      ignoreFocusOut: true,
    });
    if (!project) return;

    const domain = await vscode.window.showQuickPick(
      ['development', 'staging', 'production'],
      { placeHolder: 'Domain' },
    );
    if (!domain) return;

    const name = org || 'union';
    const fullEndpoint = endpoint.startsWith('dns:///') ? endpoint : `dns:///${endpoint}`;

    await this.saveCluster({
      name, endpoint: fullEndpoint, insecure: false, type: 'union',
      project, domain,
    });

    // Create config and authenticate
    if (!isValidIdentifier(fullEndpoint) || !isValidIdentifier(project) || !isValidIdentifier(domain)) {
      vscode.window.showErrorMessage('Invalid characters in endpoint, project, or domain.');
      return;
    }
    const terminal = vscode.window.createTerminal('Union: Setup');
    terminal.show();
    terminal.sendText(`flyte create config --endpoint ${fullEndpoint} --project ${project} --domain ${domain} --local-persistence --force`);
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

    const terminal = vscode.window.createTerminal({
      name: 'Flyte: Local Cluster',
      env: { FLYTE_SETUP_NONINTERACTIVE: '1' },
    });
    terminal.show();
    terminal.sendText(`bash "${scriptPath}"`);

    // Save cluster config and activate after script completes
    await this.saveCluster({
      name: 'local',
      endpoint: 'dns:///localhost:8090',
      insecure: true,
      type: 'self-hosted',
      project: 'flytesnacks',
      domain: 'development',
      registry: 'localhost:5050',
      status: 'running',
    });
  }

  private async connectExistingCluster(): Promise<void> {
    const endpoint = await vscode.window.showInputBox({
      prompt: 'Flyte cluster endpoint',
      placeHolder: 'dns:///flyte.my-company.com',
      ignoreFocusOut: true,
    });
    if (!endpoint) return;

    const project = await vscode.window.showInputBox({
      prompt: 'Project name',
      placeHolder: 'my-project',
      ignoreFocusOut: true,
    });
    if (!project) return;

    const domain = await vscode.window.showInputBox({
      prompt: 'Domain',
      value: 'development',
      ignoreFocusOut: true,
    });
    if (!domain) return;

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

    const insecure = insecureChoice.startsWith('Yes');

    await this.saveCluster({
      name, endpoint, insecure, type: 'self-hosted',
      project, domain,
    });

    if (!isValidIdentifier(endpoint) || !isValidIdentifier(project) || !isValidIdentifier(domain)) {
      vscode.window.showErrorMessage('Invalid characters in endpoint, project, or domain.');
      return;
    }
    const terminal = vscode.window.createTerminal('Flyte: Setup');
    terminal.show();
    const insecureFlag = insecure ? ' --insecure' : '';
    terminal.sendText(`flyte create config --endpoint ${endpoint} --project ${project} --domain ${domain}${insecureFlag} --local-persistence --force`);
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

    this.refresh();
  }

  async removeCluster(item?: ClusterTreeItem): Promise<void> {
    // Get cluster name from the tree item or ask user
    let name: string | undefined;
    if (item && item.cluster) {
      name = item.cluster.name;
    } else if (item && (item as any).label) {
      name = String((item as any).label);
    } else {
      name = await this.pickCluster('Select cluster to remove');
    }
    if (!name) return;

    const cluster = this.getClusters().find(c => c.name === name);
    const isLocal = cluster?.type === 'self-hosted' && cluster?.registry;

    const confirmMsg = isLocal
      ? 'This will destroy the local Kubernetes cluster and stop all services.'
      : `Remove cluster "${name}"?`;

    const confirm = await vscode.window.showWarningMessage(
      confirmMsg,
      { modal: true },
      isLocal ? 'Destroy Cluster' : 'Remove',
      'Cancel',
    );
    if (!confirm || confirm === 'Cancel') return;

    if (isLocal) {
      const scriptPath = vscode.Uri.joinPath(
        vscode.Uri.file(this.context.extensionPath),
        'scripts',
        'setup-local-cluster.sh',
      ).fsPath;

      const terminal = vscode.window.createTerminal({
        name: 'Flyte: Destroy Cluster',
        env: { FLYTE_SETUP_NONINTERACTIVE: '1' },
      });
      terminal.show();
      terminal.sendText(`bash "${scriptPath}" destroy`);
    }

    const clusters = this.getClusters().filter((c) => c.name !== name);
    await this.saveClusters(clusters);
    this.refresh();
  }

  async renameCluster(item?: ClusterTreeItem): Promise<void> {
    const oldName = item?.cluster.name ??
      (await this.pickCluster('Select cluster to rename'));
    if (!oldName) return;

    const newName = await vscode.window.showInputBox({
      prompt: 'New name for the cluster',
      value: oldName,
      ignoreFocusOut: true,
    });
    if (!newName || newName === oldName) return;

    const clusters = this.getClusters();
    const cluster = clusters.find((c) => c.name === oldName);
    if (!cluster) return;

    cluster.name = newName;
    await this.saveClusters(clusters);
    this.refresh();
  }

  async pauseCluster(item?: ClusterTreeItem): Promise<void> {
    const cluster = item?.cluster;
    if (!cluster || cluster.type !== 'self-hosted' || !cluster.registry) return;

    const scriptPath = vscode.Uri.joinPath(
      vscode.Uri.file(this.context.extensionPath),
      'scripts',
      'setup-local-cluster.sh',
    ).fsPath;

    const terminal = vscode.window.createTerminal({
      name: 'Flyte: Pause Cluster',
      env: { FLYTE_SETUP_NONINTERACTIVE: '1' },
    });
    terminal.show();
    terminal.sendText(`bash "${scriptPath}" stop`);

    const clusters = this.getClusters();
    const c = clusters.find((cl) => cl.name === cluster.name);
    if (c) {
      c.status = 'paused';
      await this.saveClusters(clusters);
    }
    this.refresh();
  }

  async resumeCluster(item?: ClusterTreeItem): Promise<void> {
    const cluster = item?.cluster;
    if (!cluster || cluster.type !== 'self-hosted' || !cluster.registry) return;

    const scriptPath = vscode.Uri.joinPath(
      vscode.Uri.file(this.context.extensionPath),
      'scripts',
      'setup-local-cluster.sh',
    ).fsPath;

    const terminal = vscode.window.createTerminal({
      name: 'Flyte: Resume Cluster',
      env: { FLYTE_SETUP_NONINTERACTIVE: '1' },
    });
    terminal.show();
    terminal.sendText(`bash "${scriptPath}" start`);

    const clusters = this.getClusters();
    const c = clusters.find((cl) => cl.name === cluster.name);
    if (c) {
      c.status = 'running';
      await this.saveClusters(clusters);
    }
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
    if (clusters.length === 0) return [];
    return clusters.map((c) => new ClusterTreeItem(c, this.context.extensionPath));
  }
}
