import * as vscode from 'vscode';
import { parseSource } from '../parser/pythonParser.js';
import { extractFlyteInfo } from '../parser/flyteExtractor.js';
import type { FlyteApp } from '../parser/types.js';

export class AppTreeItem extends vscode.TreeItem {
  constructor(public readonly app: FlyteApp, public readonly fileUri: vscode.Uri) {
    super(app.name, vscode.TreeItemCollapsibleState.None);
    this.description = app.varName;
    this.tooltip = `${app.varName} = AppEnvironment(name="${app.name}")`;
    this.iconPath = new vscode.ThemeIcon('server');
    this.contextValue = 'flyteApp';
    this.command = {
      command: 'vscode.open',
      title: 'Go to App',
      arguments: [fileUri, { selection: app.location }],
    };
  }
}

export class AppTreeProvider
  implements vscode.TreeDataProvider<AppTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<AppTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AppTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<AppTreeItem[]> {
    const items: AppTreeItem[] = [];
    const files = await vscode.workspace.findFiles('**/*.py', '{**/node_modules/**,**/.venv/**,**/venv/**,**/__pycache__/**}');

    for (const file of files) {
      try {
        const doc = await vscode.workspace.openTextDocument(file);
        const tree = parseSource(doc.getText());
        if (!tree) continue;

        const info = extractFlyteInfo(tree);
        for (const app of info.apps) {
          items.push(new AppTreeItem(app, file));
        }
      } catch {
        // Skip files that can't be parsed
      }
    }

    return items;
  }
}
