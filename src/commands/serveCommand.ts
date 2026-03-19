import * as vscode from 'vscode';
import { serve } from '../cli/cliRunner.js';

export async function handleServe(uri?: vscode.Uri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  try {
    await serve(fileUri.fsPath);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to serve: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
