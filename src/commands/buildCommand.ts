import * as vscode from 'vscode';
import { build } from '../cli/cliRunner.js';

export async function handleBuild(uri?: vscode.Uri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  try {
    await build(fileUri.fsPath);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to build: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
