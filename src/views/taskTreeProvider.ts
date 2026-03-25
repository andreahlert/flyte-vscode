import * as vscode from 'vscode';
import { parseSource } from '../parser/pythonParser.js';
import { extractFlyteInfo } from '../parser/flyteExtractor.js';
import type { FlyteTask } from '../parser/types.js';

export class TaskTreeItem extends vscode.TreeItem {
  constructor(public readonly task: FlyteTask, public readonly fileUri: vscode.Uri) {
    super(task.functionName, vscode.TreeItemCollapsibleState.None);
    this.description = `${task.isAsync ? 'async ' : ''}${task.envVarName}.task`;
    this.tooltip = buildTooltip(task);
    this.iconPath = new vscode.ThemeIcon(
      task.isAsync ? 'symbol-event' : 'symbol-function',
    );
    const allParamsHaveDefaults = task.parameters.length === 0 ||
      task.parameters.every((p) => p.defaultValue !== undefined);
    this.contextValue = allParamsHaveDefaults ? 'flyteTaskRunnable' : 'flyteTask';
    this.command = {
      command: 'vscode.open',
      title: 'Go to Task',
      arguments: [fileUri, { selection: task.location }],
    };
  }
}

function buildTooltip(task: FlyteTask): string {
  const params = task.parameters.map((p) => `${p.name}: ${p.type || 'Any'}`).join(', ');
  const sig = `${task.isAsync ? 'async ' : ''}def ${task.functionName}(${params})`;
  const ret = task.returnType ? ` -> ${task.returnType}` : '';
  return `@${task.envVarName}.task\n${sig}${ret}`;
}

export class TaskTreeProvider
  implements vscode.TreeDataProvider<TaskTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<TaskTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<TaskTreeItem[]> {
    const items: TaskTreeItem[] = [];
    const files = await vscode.workspace.findFiles('**/*.py', '{**/node_modules/**,**/.venv/**,**/venv/**,**/__pycache__/**}');

    for (const file of files) {
      try {
        const doc = await vscode.workspace.openTextDocument(file);
        const tree = parseSource(doc.getText());
        if (!tree) continue;

        const info = extractFlyteInfo(tree);
        for (const task of info.tasks) {
          items.push(new TaskTreeItem(task, file));
        }
      } catch {
        // Skip files that can't be parsed
      }
    }

    return items;
  }
}
