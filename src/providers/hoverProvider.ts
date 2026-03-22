import * as vscode from 'vscode';
import { FLYTE_CLASSES, FLYTE_DECORATOR_PARAMS } from './flyteApi.js';
import type { ParamInfo } from './flyteApi.js';

export class FlyteHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const range = document.getWordRangeAtPosition(position, /[\w.]+/);
    if (!range) return undefined;

    const word = document.getText(range);

    // Check for class names
    const classInfo = FLYTE_CLASSES[word];
    if (classInfo) {
      const md = new vscode.MarkdownString();
      md.appendMarkdown(`**${classInfo.module}.${classInfo.name}**\n\n`);
      md.appendMarkdown(`${classInfo.doc}\n\n`);
      md.appendMarkdown('**Parameters:**\n\n');

      for (const p of classInfo.params) {
        const req = p.required ? '*(required)*' : '';
        const def = p.default ? ` = ${p.default}` : '';
        md.appendMarkdown(`- \`${p.name}\`: \`${p.type}\`${def} ${req}\n`);
        md.appendMarkdown(`  ${p.doc}\n\n`);
      }

      return new vscode.Hover(md, range);
    }

    // Check for param names inside a call
    const lineText = document.lineAt(position.line).text;
    const paramMatch = lineText.match(new RegExp(`\\b(${word})\\s*=`));
    if (paramMatch) {
      const paramInfo = this.findParamInfo(word, document, position);
      if (paramInfo) {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${paramInfo.name}**: \`${paramInfo.type}\`\n\n`);
        md.appendMarkdown(`${paramInfo.doc}\n\n`);
        if (paramInfo.default) {
          md.appendMarkdown(`**Default:** \`${paramInfo.default}\`\n`);
        } else {
          md.appendMarkdown('*Required*\n');
        }
        return new vscode.Hover(md, range);
      }
    }

    // Check for flyte.run, flyte.deploy, etc.
    const topLevelDocs: Record<string, string> = {
      'flyte.run': '**flyte.run(task_call)**\n\nExecute a task. Use `--local` for local execution or configure a cluster for remote.',
      'flyte.deploy': '**flyte.deploy(task_call)**\n\nDeploy environments and tasks to a Flyte cluster.',
      'flyte.build': '**flyte.build(env)**\n\nBuild Docker images for an environment.',
      'flyte.serve': '**flyte.serve(app)**\n\nServe an AppEnvironment locally.',
      'flyte.map': '**flyte.map(task, iterable)**\n\nMap a task over an iterable. Use `.aio()` for async.',
      'flyte.group': '**flyte.group(name)**\n\nContext manager to group tasks visually in the execution graph.',
      'flyte.trace': '**@flyte.trace**\n\nDecorator that traces function execution with timing info.',
      'flyte.init': '**flyte.init()**\n\nInitialize Flyte SDK. Required before using `flyte.run()` in scripts.',
      'flyte.TriggerTime': '**flyte.TriggerTime**\n\nSpecial constant to bind trigger timestamp to a task input.',
    };

    if (topLevelDocs[word]) {
      return new vscode.Hover(new vscode.MarkdownString(topLevelDocs[word]), range);
    }

    return undefined;
  }

  private findParamInfo(
    paramName: string,
    document: vscode.TextDocument,
    position: vscode.Position,
  ) {
    // Scan backwards to find enclosing call
    let parenDepth = 0;
    for (let line = position.line; line >= Math.max(0, position.line - 20); line--) {
      const text = line === position.line
        ? document.lineAt(line).text.substring(0, position.character)
        : document.lineAt(line).text;

      for (let i = text.length - 1; i >= 0; i--) {
        if (text[i] === ')') parenDepth++;
        if (text[i] === '(') {
          parenDepth--;
          if (parenDepth < 0) {
            const before = text.substring(0, i).trimEnd();
            for (const [className, classInfo] of Object.entries(FLYTE_CLASSES)) {
              if (before.endsWith(className)) {
                return classInfo.params.find(p => p.name === paramName);
              }
            }
            // Check decorator
            if (/\.task$/.test(before)) {
              return FLYTE_DECORATOR_PARAMS.find((p: ParamInfo) => p.name === paramName);
            }
            return null;
          }
        }
      }
    }
    return null;
  }
}
