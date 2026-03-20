import * as vscode from 'vscode';
import { initParser } from './parser/pythonParser.js';
import { FlyteCodeLensProvider } from './providers/codeLensProvider.js';
import { ClusterTreeProvider } from './views/clusterTreeProvider.js';
import { FlyteSidebarProvider } from './webview/sidebarProvider.js';
import { handleRunTask, setRunClusterProvider } from './commands/runCommand.js';
import { handleDeploy, setClusterProvider } from './commands/deployCommand.js';
import { handleBuild, setBuildClusterProvider } from './commands/buildCommand.js';
import { handleServe, setServeClusterProvider } from './commands/serveCommand.js';
import { handleAbort } from './commands/abortCommand.js';
import { handleShowGraph } from './commands/graphCommand.js';
import { COMMANDS, FLYTE_LANGUAGE_ID } from './constants.js';

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

  // Cluster provider (persists cluster configs)
  const clusterTreeProvider = new ClusterTreeProvider(context);

  // Wire cluster provider to commands
  const getActive = () => clusterTreeProvider.getActive();
  setRunClusterProvider(getActive);
  setClusterProvider(getActive);
  setBuildClusterProvider(getActive);
  setServeClusterProvider(getActive);

  // CodeLens provider
  const codeLensProvider = new FlyteCodeLensProvider(clusterTreeProvider);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: FLYTE_LANGUAGE_ID, scheme: 'file' },
      codeLensProvider,
    ),
  );

  // Sidebar webview
  const sidebarProvider = new FlyteSidebarProvider(context.extensionUri, clusterTreeProvider);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FlyteSidebarProvider.viewType,
      sidebarProvider,
    ),
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
      sidebarProvider.refresh();
    }),
    vscode.commands.registerCommand(COMMANDS.REFRESH_EXPLORER, () => {
      sidebarProvider.refresh();
      codeLensProvider.refresh();
    }),
    vscode.commands.registerCommand(COMMANDS.CONNECT_UNION, () => {
      clusterTreeProvider.connectUnion().then(() => {
        codeLensProvider.refresh();
        sidebarProvider.refresh();
      });
    }),
    vscode.commands.registerCommand(COMMANDS.CONNECT_SELF_HOSTED, () => {
      clusterTreeProvider.connectSelfHosted().then(() => {
        codeLensProvider.refresh();
        sidebarProvider.refresh();
      });
    }),
    vscode.commands.registerCommand(COMMANDS.ADD_CLUSTER, () => {
      clusterTreeProvider.addCluster().then(() => {
        codeLensProvider.refresh();
        sidebarProvider.refresh();
      });
    }),
    vscode.commands.registerCommand(COMMANDS.REMOVE_CLUSTER, (item) => {
      clusterTreeProvider.removeCluster(item).then(() => {
        codeLensProvider.refresh();
        sidebarProvider.refresh();
      });
    }),
    vscode.commands.registerCommand(COMMANDS.SET_ACTIVE_CLUSTER, (item) => {
      clusterTreeProvider.setActive(item).then(() => {
        codeLensProvider.refresh();
        sidebarProvider.refresh();
      });
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
        sidebarProvider.refresh();
        codeLensProvider.refresh();
      }
    }),
  );

  outputChannel.appendLine('Flyte extension activated');
}

export function deactivate(): void {
  // Cleanup handled by disposables
}
