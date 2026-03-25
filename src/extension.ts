import * as vscode from 'vscode';
import { initParser } from './parser/pythonParser.js';
import { FlyteCodeLensProvider } from './providers/codeLensProvider.js';
import { FlyteCompletionProvider } from './providers/completionProvider.js';
import { FlyteHoverProvider } from './providers/hoverProvider.js';
import { FlyteDiagnosticProvider } from './providers/diagnosticProvider.js';
import { EnvironmentTreeProvider } from './views/environmentTreeProvider.js';
import { TaskTreeProvider } from './views/taskTreeProvider.js';
import { RunTreeProvider } from './views/runTreeProvider.js';
import { AppTreeProvider } from './views/appTreeProvider.js';
import { ClusterTreeProvider } from './views/clusterTreeProvider.js';
import { SecretTreeProvider } from './views/secretTreeProvider.js';
import { TriggerTreeProvider } from './views/triggerTreeProvider.js';
import { handleRunTask, setRunClusterProvider } from './commands/runCommand.js';
import { handleDeploy, setDeployClusterProvider } from './commands/deployCommand.js';
import { handleBuild, setBuildClusterProvider } from './commands/buildCommand.js';
import { handleServe, setServeClusterProvider } from './commands/serveCommand.js';
import { handleAbort } from './commands/abortCommand.js';
import { handleShowGraph } from './commands/graphCommand.js';
import { resetCliCache } from './cli/cliRunner.js';
import { COMMANDS, VIEWS, FLYTE_LANGUAGE_ID } from './constants.js';

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('Flyte');
  outputChannel.appendLine('Flyte extension activating...');

  try {
    await initParser(context.extensionPath);
    outputChannel.appendLine('tree-sitter parser initialized');
  } catch (err) {
    outputChannel.appendLine(
      `Failed to initialize parser: ${err instanceof Error ? err.message : String(err)}`,
    );
    vscode.window.showWarningMessage(
      'Flyte: Could not initialize Python parser. Some features may be unavailable.',
    );
  }

  const clusterTreeProvider = new ClusterTreeProvider(context);

  // Wire cluster list to all commands
  const getClusters = () => clusterTreeProvider.getClusters();
  setRunClusterProvider(getClusters);
  setDeployClusterProvider(getClusters);
  setBuildClusterProvider(getClusters);
  setServeClusterProvider(getClusters);

  // Diagnostics
  const diagnosticProvider = new FlyteDiagnosticProvider();
  context.subscriptions.push(diagnosticProvider);

  // Providers
  const codeLensProvider = new FlyteCodeLensProvider(clusterTreeProvider);
  const pythonSelector = { language: FLYTE_LANGUAGE_ID, scheme: 'file' };

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(pythonSelector, codeLensProvider),
    vscode.languages.registerCompletionItemProvider(pythonSelector, new FlyteCompletionProvider(), '(', ',', ' ', '='),
    vscode.languages.registerHoverProvider(pythonSelector, new FlyteHoverProvider()),
  );

  // Tree view providers
  const envTreeProvider = new EnvironmentTreeProvider();
  const taskTreeProvider = new TaskTreeProvider();
  const runTreeProvider = new RunTreeProvider(getClusters, context.extensionPath);
  const appTreeProvider = new AppTreeProvider();
  const secretTreeProvider = new SecretTreeProvider(getClusters);
  const triggerTreeProvider = new TriggerTreeProvider(getClusters);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(VIEWS.CLUSTERS, clusterTreeProvider),
    vscode.window.registerTreeDataProvider(VIEWS.ENVIRONMENTS, envTreeProvider),
    vscode.window.registerTreeDataProvider(VIEWS.TASKS, taskTreeProvider),
    vscode.window.registerTreeDataProvider(VIEWS.RUNS, runTreeProvider),
    vscode.window.registerTreeDataProvider(VIEWS.APPS, appTreeProvider),
    vscode.window.registerTreeDataProvider(VIEWS.SECRETS, secretTreeProvider),
    vscode.window.registerTreeDataProvider(VIEWS.TRIGGERS, triggerTreeProvider),
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.RUN_TASK, handleRunTask),
    vscode.commands.registerCommand(COMMANDS.DEPLOY, handleDeploy),
    vscode.commands.registerCommand(COMMANDS.BUILD, handleBuild),
    vscode.commands.registerCommand(COMMANDS.SERVE, handleServe),
    vscode.commands.registerCommand(COMMANDS.ABORT, handleAbort),
    vscode.commands.registerCommand(COMMANDS.SHOW_GRAPH, handleShowGraph),
    vscode.commands.registerCommand(COMMANDS.REFRESH_RUNS, () => {
      runTreeProvider.refresh();
    }),
    vscode.commands.registerCommand(COMMANDS.REFRESH_EXPLORER, () => {
      clusterTreeProvider.refresh();
      envTreeProvider.refresh();
      taskTreeProvider.refresh();
      runTreeProvider.refresh();
      appTreeProvider.refresh();
      secretTreeProvider.refresh();
      triggerTreeProvider.refresh();
      codeLensProvider.refresh();
    }),
    vscode.commands.registerCommand(COMMANDS.CONNECT_UNION, () => {
      clusterTreeProvider.connectUnion().then(() => codeLensProvider.refresh());
    }),
    vscode.commands.registerCommand(COMMANDS.CONNECT_SELF_HOSTED, () => {
      clusterTreeProvider.connectSelfHosted().then(() => codeLensProvider.refresh());
    }),
    vscode.commands.registerCommand(COMMANDS.ADD_CLUSTER, () => {
      clusterTreeProvider.addCluster().then(() => codeLensProvider.refresh());
    }),
    vscode.commands.registerCommand(COMMANDS.REMOVE_CLUSTER, (item) => {
      clusterTreeProvider.removeCluster(item).then(() => codeLensProvider.refresh());
    }),
    vscode.commands.registerCommand(COMMANDS.RENAME_CLUSTER, (item) => {
      clusterTreeProvider.renameCluster(item);
    }),
    vscode.commands.registerCommand(COMMANDS.PAUSE_CLUSTER, (item) => {
      clusterTreeProvider.pauseCluster(item);
    }),
    vscode.commands.registerCommand(COMMANDS.RESUME_CLUSTER, (item) => {
      clusterTreeProvider.resumeCluster(item);
    }),
    vscode.commands.registerCommand(COMMANDS.FILTER_RUNS, async () => {
      const choice = await vscode.window.showQuickPick(
        [
          { label: 'All', description: 'Local and remote runs', value: 'all' as const },
          { label: 'Local', description: 'Only local runs', value: 'local' as const },
          { label: 'Remote', description: 'Only cluster runs', value: 'remote' as const },
        ],
        { placeHolder: 'Filter runs' },
      );
      if (choice) {
        runTreeProvider.setFilter(choice.value);
      }
    }),
    vscode.commands.registerCommand(COMMANDS.CREATE_SECRET, async () => {
      const clusters = getClusters();
      if (clusters.length === 0) {
        vscode.window.showErrorMessage('No clusters configured.');
        return;
      }
      let cluster = clusters[0];
      if (clusters.length > 1) {
        const picked = await vscode.window.showQuickPick(
          clusters.map(c => ({
            label: c.name,
            description: `${c.project ?? c.endpoint}`,
            cluster: c,
          })),
          { placeHolder: 'Create secret on which cluster?' },
        );
        if (!picked) return;
        cluster = picked.cluster;
      }
      const name = await vscode.window.showInputBox({ prompt: 'Secret name', ignoreFocusOut: true });
      if (!name) return;
      const value = await vscode.window.showInputBox({ prompt: 'Secret value', password: true, ignoreFocusOut: true });
      if (!value) return;

      const terminal = vscode.window.createTerminal('Flyte: Create Secret');
      terminal.show();
      const globalArgs: string[] = ['flyte'];
      if (cluster.endpoint) globalArgs.push('--endpoint', cluster.endpoint);
      if (cluster.insecure) globalArgs.push('--insecure');
      const cmdArgs = ['create', 'secret', `"${name}"`, '--value', `"${value}"`];
      if (cluster.project) cmdArgs.push('--project', cluster.project);
      if (cluster.domain) cmdArgs.push('--domain', cluster.domain);
      terminal.sendText([...globalArgs, ...cmdArgs].join(' '));
      setTimeout(() => secretTreeProvider.refresh(), 3000);
    }),
    vscode.commands.registerCommand(COMMANDS.DELETE_SECRET, async (item: any) => {
      const name = item?.name ?? item?.label;
      if (!name) return;

      const confirm = await vscode.window.showWarningMessage(
        `Delete secret "${name}"?`, { modal: true }, 'Delete', 'Cancel',
      );
      if (confirm !== 'Delete') return;

      const clusters = getClusters();
      const cluster = clusters.find(c => c.project) ?? clusters[0];
      if (!cluster) return;

      const terminal = vscode.window.createTerminal('Flyte: Delete Secret');
      terminal.show();
      const globalArgs: string[] = ['flyte'];
      if (cluster.endpoint) globalArgs.push('--endpoint', cluster.endpoint);
      if (cluster.insecure) globalArgs.push('--insecure');
      const cmdArgs = ['delete', 'secret', `"${name}"`];
      if (cluster.project) cmdArgs.push('--project', cluster.project);
      if (cluster.domain) cmdArgs.push('--domain', cluster.domain);
      terminal.sendText([...globalArgs, ...cmdArgs].join(' '));
      setTimeout(() => secretTreeProvider.refresh(), 3000);
    }),
    vscode.commands.registerCommand(COMMANDS.REFRESH_SECRETS, () => {
      secretTreeProvider.refresh();
    }),
    vscode.commands.registerCommand(COMMANDS.REFRESH_TRIGGERS, () => {
      triggerTreeProvider.refresh();
    }),
    vscode.commands.registerCommand(COMMANDS.OPEN_TUI, () => {
      const terminal = vscode.window.createTerminal('Flyte TUI');
      terminal.show();
      terminal.sendText('python3 -m pip install -q "flyte[tui]" && flyte start tui');
    }),
  );

  // Diagnostics on open and change
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => diagnosticProvider.update(doc)),
    vscode.workspace.onDidChangeTextDocument((e) => diagnosticProvider.update(e.document)),
    vscode.workspace.onDidCloseTextDocument((doc) => diagnosticProvider.clear(doc.uri)),
  );

  // Run diagnostics on already open documents
  vscode.workspace.textDocuments.forEach((doc) => diagnosticProvider.update(doc));

  // Reset CLI cache when flyte settings change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('flyte')) {
        resetCliCache();
      }
    }),
  );

  // Refresh on file save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId === FLYTE_LANGUAGE_ID) {
        envTreeProvider.refresh();
        taskTreeProvider.refresh();
        appTreeProvider.refresh();
        codeLensProvider.refresh();
      }
    }),
  );

  outputChannel.appendLine('Flyte extension activated');
}

export function deactivate(): void {
  // Cleanup handled by disposables
}
