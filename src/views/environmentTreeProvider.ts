import * as vscode from 'vscode';
import { parseSource } from '../parser/pythonParser.js';
import { extractFlyteInfo } from '../parser/flyteExtractor.js';
import type { FlyteEnvironment } from '../parser/types.js';

export class EnvironmentTreeItem extends vscode.TreeItem {
  constructor(public readonly env: FlyteEnvironment, public readonly fileUri: vscode.Uri) {
    super(env.name, vscode.TreeItemCollapsibleState.None);
    this.description = env.varName;
    this.tooltip = `${env.varName} = TaskEnvironment(name="${env.name}")`;
    this.iconPath = new vscode.ThemeIcon('symbol-namespace');
    this.contextValue = 'flyteEnvironment';
    this.command = {
      command: 'vscode.open',
      title: 'Go to Environment',
      arguments: [fileUri, { selection: env.location }],
    };
  }
}

export class EnvironmentTreeProvider
  implements vscode.TreeDataProvider<EnvironmentTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<EnvironmentTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: EnvironmentTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<EnvironmentTreeItem[]> {
    const items: EnvironmentTreeItem[] = [];
    const files = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**');

    for (const file of files) {
      try {
        const doc = await vscode.workspace.openTextDocument(file);
        const tree = parseSource(doc.getText());
        if (!tree) continue;

        const info = extractFlyteInfo(tree);
        for (const env of info.environments) {
          items.push(new EnvironmentTreeItem(env, file));
        }
      } catch {
        // Skip files that can't be parsed
      }
    }

    return items;
  }
}
