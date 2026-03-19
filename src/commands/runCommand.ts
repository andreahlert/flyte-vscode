import * as vscode from 'vscode';
import { runTask } from '../cli/cliRunner.js';
import { parseSource } from '../parser/pythonParser.js';
import { extractFlyteInfo } from '../parser/flyteExtractor.js';

export async function handleRunTask(
  uri?: vscode.Uri,
  taskName?: string,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  const filePath = fileUri.fsPath;

  if (!taskName) {
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const tree = parseSource(doc.getText());
    if (!tree) {
      vscode.window.showErrorMessage('Could not parse Python file.');
      return;
    }

    const info = extractFlyteInfo(tree);
    if (info.tasks.length === 0) {
      vscode.window.showErrorMessage('No Flyte tasks found in this file.');
      return;
    }

    if (info.tasks.length === 1) {
      taskName = info.tasks[0].functionName;
    } else {
      const picked = await vscode.window.showQuickPick(
        info.tasks.map((t) => ({
          label: t.functionName,
          description: `${t.isAsync ? 'async ' : ''}${t.envVarName}.task`,
          detail: t.returnType ? `-> ${t.returnType}` : undefined,
        })),
        { placeHolder: 'Select a task to run' },
      );
      if (!picked) return;
      taskName = picked.label;
    }
  }

  try {
    await runTask(filePath, taskName);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to run task: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
