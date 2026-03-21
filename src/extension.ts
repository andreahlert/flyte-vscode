import * as vscode from 'vscode';
import { initParser } from './parser/pythonParser.js';
import { FlyteCodeLensProvider } from './providers/codeLensProvider.js';
import { FlyteCompletionProvider } from './providers/completionProvider.js';
import { FlyteHoverProvider } from './providers/hoverProvider.js';
import { EnvironmentTreeProvider } from './views/environmentTreeProvider.js';
import { TaskTreeProvider } from './views/taskTreeProvider.js';
import { RunTreeProvider } from './views/runTreeProvider.js';
import { AppTreeProvider } from './views/appTreeProvider.js';
import { ClusterTreeProvider } from './views/clusterTreeProvider.js';
import { handleRunTask, setRunClusterProvider } from './commands/runCommand.js';
import { handleDeploy, setClusterProvider } from './commands/deployCommand.js';
import { handleBuild, setBuildClusterProvider } from './commands/buildCommand.js';
import { handleServe, setServeClusterProvider } from './commands/serveCommand.js';
import { handleAbort } from './commands/abortCommand.js';
import { handleShowGraph } from './commands/graphCommand.js';
import { COMMANDS, VIEWS, FLYTE_LANGUAGE_ID } from './constants.js';

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('Flyte');
  outputChannel.appendLine('Flyte extension activating...');

  // Initialize tree-sitter parser
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

  // Cluster tree provider (must be created before CodeLens)
  const clusterTreeProvider = new ClusterTreeProvider(context);

  // Wire cluster provider to commands
  const getActive = () => clusterTreeProvider.getActive();
  setRunClusterProvider(() => clusterTreeProvider.getClusters());
  setClusterProvider(getActive);
  setBuildClusterProvider(getActive);
  setServeClusterProvider(getActive);

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
  const runTreeProvider = new RunTreeProvider();
  const appTreeProvider = new AppTreeProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(VIEWS.CLUSTERS, clusterTreeProvider),
    vscode.window.registerTreeDataProvider(VIEWS.ENVIRONMENTS, envTreeProvider),
    vscode.window.registerTreeDataProvider(VIEWS.TASKS, taskTreeProvider),
    vscode.window.registerTreeDataProvider(VIEWS.RUNS, runTreeProvider),
    vscode.window.registerTreeDataProvider(VIEWS.APPS, appTreeProvider),
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
    vscode.commands.registerCommand(COMMANDS.SET_ACTIVE_CLUSTER, (item) => {
      clusterTreeProvider.setActive(item).then(() => codeLensProvider.refresh());
    }),
    vscode.commands.registerCommand(COMMANDS.OPEN_TUI, () => {
      const terminal = vscode.window.createTerminal('Flyte TUI');
      terminal.show();
      terminal.sendText('pip install -q "flyte[tui]" 2>/dev/null; flyte start tui');
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
