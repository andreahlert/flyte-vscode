import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execFile } from 'child_process';

interface RunData {
  runName: string;
  taskName: string;
  status: string;
  source: 'local' | 'remote';
}

export class RunTreeItem extends vscode.TreeItem {
  constructor(public readonly run: RunData, extensionPath?: string) {
    const shortTask = run.taskName.split('.').pop() ?? run.taskName;
    super(shortTask, vscode.TreeItemCollapsibleState.None);
    const sourceLabel = run.source === 'remote' ? 'remote' : 'local';
    this.description = `${run.status} (${sourceLabel})`;
    this.tooltip = `Run: ${run.runName}\nTask: ${run.taskName}\nStatus: ${run.status}\nSource: ${sourceLabel}`;
    this.contextValue = 'flyteRun';

    const prefix = run.source === 'remote' ? 'union' : 'flyte';
    const statusName = ['succeeded', 'failed', 'running'].includes(run.status) ? run.status : 'unknown';
    const iconFile = `${prefix}-${statusName}.svg`;
    if (extensionPath) {
      this.iconPath = {
        light: vscode.Uri.joinPath(vscode.Uri.file(extensionPath), 'resources', iconFile),
        dark: vscode.Uri.joinPath(vscode.Uri.file(extensionPath), 'resources', iconFile),
      };
    } else {
      this.iconPath = new vscode.ThemeIcon(statusIcon(run.status));
    }
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case 'running': return 'sync~spin';
    case 'succeeded': return 'check';
    case 'failed': return 'error';
    case 'aborted': return 'stop';
    default: return 'question';
  }
}

function findCacheDb(): string | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return null;

  for (const folder of workspaceFolders) {
    let dir = folder.uri.fsPath;
    for (let i = 0; i < 5; i++) {
      const dbPath = path.join(dir, '.flyte', 'local-cache', 'cache.db');
      if (fs.existsSync(dbPath)) return dbPath;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  const homeDb = path.join(os.homedir(), '.flyte', 'local-cache', 'cache.db');
  if (fs.existsSync(homeDb)) return homeDb;

  return null;
}

function queryRuns(dbPath: string): Promise<Omit<RunData, 'source'>[]> {
  // Use python3 to read SQLite (always available in Flyte environments)
  const script = `
import sqlite3, json, sys
conn = sqlite3.connect(sys.argv[1])
rows = conn.execute(
    "SELECT DISTINCT run_name, task_name, status FROM runs WHERE action_name = 'a0' ORDER BY start_time DESC LIMIT 50"
).fetchall()
conn.close()
print(json.dumps([{"run_name": r[0], "task_name": r[1], "status": r[2]} for r in rows]))
`;

  const pythonPath = vscode.workspace.getConfiguration().get<string>('flyte.pythonPath')
    || (process.platform === 'win32' ? 'python' : 'python3');

  return new Promise((resolve) => {
    execFile(pythonPath, ['-c', script, dbPath], {
      timeout: 5000,
      encoding: 'utf-8',
    }, (err, stdout) => {
      if (err) {
        console.error('[Flyte Runs] Query failed:', err);
        resolve([]);
        return;
      }

      if (!stdout.trim()) {
        resolve([]);
        return;
      }

      try {
        const rows = JSON.parse(stdout.trim());
        resolve(rows.map((r: any) => ({
          runName: r.run_name ?? '',
          taskName: r.task_name ?? '',
          status: r.status ?? 'unknown',
        })));
      } catch (parseErr) {
        console.error('[Flyte Runs] Parse failed:', parseErr);
        resolve([]);
      }
    });
  });
}

export type RunFilter = 'all' | 'local' | 'remote';

export class RunTreeProvider
  implements vscode.TreeDataProvider<RunTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<RunTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private clusterGetter: () => import('./clusterTreeProvider.js').ClusterConfig[];
  private extensionPath: string;
  private filter: RunFilter = 'all';

  constructor(
    clusterGetter?: () => import('./clusterTreeProvider.js').ClusterConfig[],
    extensionPath?: string,
  ) {
    this.clusterGetter = clusterGetter ?? (() => []);
    this.extensionPath = extensionPath ?? '';
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setFilter(filter: RunFilter): void {
    this.filter = filter;
    this.refresh();
  }

  getTreeItem(element: RunTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<RunTreeItem[]> {
    const items: RunTreeItem[] = [];

    // Remote runs from clusters
    if (this.filter !== 'local') {
      const { queryFlyteCli } = await import('../cli/cliQuery.js');
      const clusters = this.clusterGetter();
      if (clusters.length > 0) {
        const cluster = clusters.find(c => c.project && c.domain) ?? clusters[0];
        try {
          const data = await queryFlyteCli(['run', '--limit', '20'], cluster);
          for (const r of data) {
            const runName = r.action?.id?.run?.name ?? r.name ?? '';
            const taskName = r.action?.metadata?.task?.shortName ?? r.action?.metadata?.funtionName ?? '';
            const phase = r.action?.state?.phase ?? '';
            const status = phase.replace('PHASE_', '').toLowerCase() || 'unknown';
            if (runName) {
              items.push(new RunTreeItem(
                { runName, taskName, status, source: 'remote' },
                this.extensionPath,
              ));
            }
          }
        } catch {
          // Remote query failed, continue with local
        }
      }
    }

    // Local runs from SQLite
    if (this.filter !== 'remote') {
      const dbPath = findCacheDb();
      if (dbPath) {
        const localRuns = await queryRuns(dbPath);
        for (const r of localRuns) {
          if (!items.some(i => i.run.runName === r.runName)) {
            items.push(new RunTreeItem(
              { ...r, source: 'local' },
              this.extensionPath,
            ));
          }
        }
      }
    }

    return items;
  }
}
