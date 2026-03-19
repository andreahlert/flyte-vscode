import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { CONFIG } from '../constants.js';

function fileExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findInPath(name: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('which', [name], (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

export async function discoverCli(): Promise<string | null> {
  // 1. User-configured path
  const configured = vscode.workspace
    .getConfiguration()
    .get<string>(CONFIG.CLI_PATH);
  if (configured && fileExists(configured)) {
    return configured;
  }

  // 2. Check workspace .venv
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      const venvPath = path.join(folder.uri.fsPath, '.venv', 'bin', 'flyte');
      if (fileExists(venvPath)) {
        return venvPath;
      }
    }
  }

  // 3. PATH lookup
  const inPath = await findInPath('flyte');
  if (inPath) return inPath;

  // 4. Try uv
  const uvPath = await findInPath('uv');
  if (uvPath) return 'uv run flyte';

  return null;
}

export async function validateCli(cliPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = cliPath.split(' ');
    const cmd = parts[0];
    const args = [...parts.slice(1), '--help'];

    execFile(cmd, args, { timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve(false);
      } else {
        resolve(stdout.includes('flyte') || stdout.includes('Flyte'));
      }
    });
  });
}
