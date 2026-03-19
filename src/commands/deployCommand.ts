import * as vscode from 'vscode';
import { deploy } from '../cli/cliRunner.js';

export async function handleDeploy(uri?: vscode.Uri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  try {
    await deploy(fileUri.fsPath);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to deploy: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
