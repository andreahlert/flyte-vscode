import { execFile } from 'child_process';
import * as vscode from 'vscode';
import type { ClusterConfig } from '../views/clusterTreeProvider.js';

/**
 * Run a Flyte CLI query command and return parsed JSON.
 * Strips ANSI codes and converts Python-style single quotes to double.
 */
export function queryFlyteCli(
  subcommand: string[],
  cluster?: ClusterConfig,
): Promise<any[]> {
  return new Promise((resolve) => {
    const cliPath = vscode.workspace.getConfiguration().get<string>('flyte.cliPath') || 'flyte';
    const globalArgs: string[] = ['-of', 'json'];

    if (cluster?.endpoint) {
      globalArgs.push('--endpoint', cluster.endpoint);
    }
    if (cluster?.insecure) {
      globalArgs.push('--insecure');
    }

    const projectArgs: string[] = [];
    if (cluster?.project) {
      projectArgs.push('--project', cluster.project);
    }
    if (cluster?.domain) {
      projectArgs.push('--domain', cluster.domain);
    }

    const args = [...globalArgs, 'get', ...subcommand, ...projectArgs];

    execFile(cliPath, args, {
      timeout: 15000,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    }, (err, stdout) => {
      if (err) {
        console.error(`[Flyte CLI] get ${subcommand.join(' ')} failed:`, err.message);
        resolve([]);
        return;
      }

      try {
        // Strip ANSI codes, convert Python single quotes to double
        const clean = stdout
          .replace(/\x1b\[[0-9;]*m/g, '')
          .replace(/'/g, '"')
          .replace(/\bNone\b/g, 'null')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false');
        const parsed = JSON.parse(clean);
        resolve(Array.isArray(parsed) ? parsed : [parsed]);
      } catch {
        console.error('[Flyte CLI] Failed to parse JSON output');
        resolve([]);
      }
    });
  });
}
