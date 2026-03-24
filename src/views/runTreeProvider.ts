import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execFile } from 'child_process';

interface LocalRun {
  runName: string;
  taskName: string;
  status: string;
}

export class RunTreeItem extends vscode.TreeItem {
  constructor(public readonly run: LocalRun) {
    const shortTask = run.taskName.split('.').pop() ?? run.taskName;
    super(shortTask, vscode.TreeItemCollapsibleState.None);
    this.description = run.status;
    this.tooltip = `Run: ${run.runName}\nTask: ${run.taskName}\nStatus: ${run.status}`;
    this.contextValue = 'flyteRun';
    this.iconPath = new vscode.ThemeIcon(statusIcon(run.status));
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

function queryRuns(dbPath: string): Promise<LocalRun[]> {
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

export class RunTreeProvider
  implements vscode.TreeDataProvider<RunTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<RunTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: RunTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<RunTreeItem[]> {
    const dbPath = findCacheDb();
    if (!dbPath) {
      console.log('[Flyte Runs] No cache.db found');
      return [];
    }
    console.log(`[Flyte Runs] Reading from ${dbPath}`);

    const runs = await queryRuns(dbPath);
    console.log(`[Flyte Runs] Found ${runs.length} runs`);
    return runs.map((r) => new RunTreeItem(r));
  }
}
