import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFileSync } from 'child_process';

interface LocalRun {
  runName: string;
  taskName: string;
  status: string;
  startTime: number | null;
  endTime: number | null;
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
    case 'running':
      return 'sync~spin';
    case 'succeeded':
      return 'check';
    case 'failed':
      return 'error';
    case 'aborted':
      return 'stop';
    default:
      return 'question';
  }
}

function findCacheDb(): string | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return null;

  // Search workspace and parent dirs
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

  // Global fallback
  const homeDb = path.join(process.env.HOME ?? '', '.flyte', 'local-cache', 'cache.db');
  if (fs.existsSync(homeDb)) return homeDb;

  return null;
}

function queryRuns(dbPath: string): LocalRun[] {
  try {
    const output = execFileSync('sqlite3', [
      dbPath,
      '-json',
      'SELECT DISTINCT run_name, task_name, status, start_time, end_time FROM runs WHERE action_name = "a0" ORDER BY start_time DESC LIMIT 50;',
    ], { timeout: 5000 }).toString();

    if (!output.trim()) return [];

    const rows = JSON.parse(output);
    return rows.map((r: any) => ({
      runName: r.run_name ?? '',
      taskName: r.task_name ?? '',
      status: r.status ?? 'unknown',
      startTime: r.start_time ?? null,
      endTime: r.end_time ?? null,
    }));
  } catch {
    return [];
  }
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

    const runs = queryRuns(dbPath);
    console.log(`[Flyte Runs] Found ${runs.length} runs`);
    return runs.map((r) => new RunTreeItem(r));
  }
}
