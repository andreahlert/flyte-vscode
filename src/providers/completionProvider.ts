import * as vscode from 'vscode';
import { FLYTE_CLASSES, FLYTE_DECORATOR_PARAMS, GPU_ACCELERATORS } from './flyteApi.js';
import type { ParamInfo } from './flyteApi.js';

export class FlyteCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] | undefined {
    const lineText = document.lineAt(position).text;
    const textBefore = lineText.substring(0, position.character);

    // Inside a constructor call: TaskEnvironment(, Resources(, etc.
    const callMatch = this.findEnclosingCall(document, position);
    if (callMatch) {
      const classInfo = FLYTE_CLASSES[callMatch];
      if (classInfo) {
        return this.paramCompletions(classInfo.params, document, position);
      }
    }

    // Inside @env.task( decorator
    if (this.isInTaskDecorator(document, position)) {
      return this.paramCompletions(FLYTE_DECORATOR_PARAMS, document, position);
    }

    // After gpu= suggest accelerators
    if (/gpu\s*=\s*["']?[^"']*$/.test(textBefore)) {
      return this.gpuCompletions();
    }

    // After cache= suggest literals
    if (/cache\s*=\s*["']?[^"']*$/.test(textBefore)) {
      return this.cacheCompletions();
    }

    return undefined;
  }

  private findEnclosingCall(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): string | null {
    // Scan backwards to find the enclosing constructor call
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
            // Found the opening paren, check what's before it
            const before = text.substring(0, i).trimEnd();
            for (const className of Object.keys(FLYTE_CLASSES)) {
              if (before.endsWith(className)) {
                return className;
              }
            }
            return null;
          }
        }
      }
    }
    return null;
  }

  private isInTaskDecorator(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): boolean {
    let parenDepth = 0;
    for (let line = position.line; line >= Math.max(0, position.line - 5); line--) {
      const text = line === position.line
        ? document.lineAt(line).text.substring(0, position.character)
        : document.lineAt(line).text;

      for (let i = text.length - 1; i >= 0; i--) {
        if (text[i] === ')') parenDepth++;
        if (text[i] === '(') {
          parenDepth--;
          if (parenDepth < 0) {
            const before = text.substring(0, i).trimEnd();
            return /\.task$/.test(before);
          }
        }
      }
    }
    return false;
  }

  private paramCompletions(
    params: ParamInfo[],
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    // Find which params are already used
    const usedParams = this.findUsedParams(document, position);

    return params
      .filter(p => !usedParams.has(p.name))
      .map((p, i) => {
        const item = new vscode.CompletionItem(
          p.name,
          vscode.CompletionItemKind.Property,
        );
        item.detail = `${p.type}${p.default ? ` = ${p.default}` : ''}`;
        item.documentation = new vscode.MarkdownString(
          `${p.doc}\n\n**Type:** \`${p.type}\`${p.default ? `\n\n**Default:** \`${p.default}\`` : ' *(required)*'}`,
        );
        item.insertText = new vscode.SnippetString(`${p.name}=\${1:${p.default ?? ''}}`);
        item.sortText = `${i.toString().padStart(2, '0')}`;
        if (p.required) {
          item.preselect = true;
        }
        return item;
      });
  }

  private findUsedParams(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Set<string> {
    const used = new Set<string>();
    for (let line = Math.max(0, position.line - 30); line <= position.line; line++) {
      const text = document.lineAt(line).text;
      const matches = text.matchAll(/(\w+)\s*=/g);
      for (const m of matches) {
        used.add(m[1]);
      }
    }
    return used;
  }

  private gpuCompletions(): vscode.CompletionItem[] {
    return GPU_ACCELERATORS.map(acc => {
      const item = new vscode.CompletionItem(
        acc,
        vscode.CompletionItemKind.Value,
      );
      const [device, count] = acc.split(':');
      item.detail = `${device} x${count}`;
      item.insertText = `"${acc}"`;
      item.filterText = acc;
      return item;
    });
  }

  private cacheCompletions(): vscode.CompletionItem[] {
    const options = [
      { label: 'auto', doc: 'Automatically cache task outputs' },
      { label: 'disable', doc: 'Do not cache (default)' },
      { label: 'override', doc: 'Overwrite existing cached values' },
    ];
    return options.map(o => {
      const item = new vscode.CompletionItem(o.label, vscode.CompletionItemKind.Value);
      item.documentation = o.doc;
      item.insertText = `"${o.label}"`;
      return item;
    });
  }
}
