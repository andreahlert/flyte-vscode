import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseSource } from '../parser/pythonParser.js';
import { extractFlyteInfo } from '../parser/flyteExtractor.js';
import type { ClusterTreeProvider } from '../views/clusterTreeProvider.js';

export class FlyteSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'flyte.sidebarWebview';

  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly clusterProvider: ClusterTreeProvider,
  ) {}

  refresh(): void {
    if (this._view) {
      this._view.webview.postMessage({ type: 'refresh', data: this.gatherState() });
    }
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'ready':
          webviewView.webview.postMessage({ type: 'init', data: this.gatherState() });
          break;
        case 'runTask':
          vscode.commands.executeCommand('flyte.runTask', undefined, msg.taskName);
          break;
        case 'deploy':
          vscode.commands.executeCommand('flyte.deploy');
          break;
        case 'build':
          vscode.commands.executeCommand('flyte.build');
          break;
        case 'serve':
          vscode.commands.executeCommand('flyte.serve');
          break;
        case 'showGraph':
          vscode.commands.executeCommand('flyte.showGraph');
          break;
        case 'openTui':
          vscode.commands.executeCommand('flyte.openTui');
          break;
        case 'connectUnion':
          vscode.commands.executeCommand('flyte.connectUnion');
          break;
        case 'connectSelfHosted':
          vscode.commands.executeCommand('flyte.connectSelfHosted');
          break;
        case 'addCluster':
          vscode.commands.executeCommand('flyte.addCluster');
          break;
        case 'removeCluster':
          vscode.commands.executeCommand('flyte.removeCluster');
          break;
        case 'setActiveCluster':
          vscode.commands.executeCommand('flyte.setActiveCluster');
          break;
        case 'setMode':
          // Store user preference
          break;
        case 'openFile':
          if (msg.uri) {
            const uri = vscode.Uri.file(msg.uri);
            vscode.window.showTextDocument(uri);
          }
          break;
        case 'createSnippet':
          this.insertSnippet(msg.snippet);
          break;
      }
    });
  }

  private async insertSnippet(snippetId: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Open a Python file first.');
      return;
    }
    await vscode.commands.executeCommand('editor.action.insertSnippet', {
      name: snippetId,
    });
  }

  private gatherState() {
    const environments: any[] = [];
    const tasks: any[] = [];
    const apps: any[] = [];

    // Scan workspace files
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      for (const folder of workspaceFolders) {
        this.scanFolder(folder.uri.fsPath, environments, tasks, apps);
      }
    }

    const clusters = (this.clusterProvider as any).getClusters?.() ?? [];
    const activeName = this.clusterProvider.getActiveName?.();

    return {
      environments,
      tasks,
      apps,
      clusters: clusters.map((c: any) => ({
        ...c,
        isActive: c.name === activeName,
      })),
      activeCluster: this.clusterProvider.getActive(),
    };
  }

  private scanFolder(folderPath: string, environments: any[], tasks: any[], apps: any[]): void {
    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__pycache__') continue;
        const fullPath = path.join(folderPath, entry.name);
        if (entry.isDirectory()) {
          this.scanFolder(fullPath, environments, tasks, apps);
        } else if (entry.name.endsWith('.py')) {
          try {
            const source = fs.readFileSync(fullPath, 'utf-8');
            const tree = parseSource(source);
            if (!tree) continue;
            const info = extractFlyteInfo(tree);
            for (const env of info.environments) {
              environments.push({ ...env, file: fullPath, location: { line: env.location.start.line } });
            }
            for (const task of info.tasks) {
              tasks.push({
                ...task,
                file: fullPath,
                location: { line: task.location.start.line },
                decoratorLocation: { line: task.decoratorLocation.start.line },
              });
            }
            for (const app of info.apps) {
              apps.push({ ...app, file: fullPath, location: { line: app.location.start.line } });
            }
          } catch {
            // Skip unparseable files
          }
        }
      }
    } catch {
      // Skip unreadable dirs
    }
  }

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.css'),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet">
  <title>Flyte</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
