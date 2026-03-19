import * as vscode from 'vscode';
import { abort } from '../cli/cliRunner.js';

export async function handleAbort(runId?: string): Promise<void> {
  if (!runId) {
    runId = await vscode.window.showInputBox({
      prompt: 'Enter the run ID to abort',
      placeHolder: 'run-id',
    });
  }

  if (!runId) return;

  try {
    await abort(runId);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to abort run: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
