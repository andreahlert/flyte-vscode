import * as vscode from 'vscode';
import { parseSource } from '../parser/pythonParser.js';
import { extractFlyteInfo } from '../parser/flyteExtractor.js';
import { COMMANDS, FLYTE_LANGUAGE_ID } from '../constants.js';

export class FlyteCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
  ): vscode.CodeLens[] {
    if (document.languageId !== FLYTE_LANGUAGE_ID) return [];

    const tree = parseSource(document.getText());
    if (!tree) return [];

    const info = extractFlyteInfo(tree);
    const lenses: vscode.CodeLens[] = [];

    for (const task of info.tasks) {
      const range = task.decoratorLocation;
      const allParamsHaveDefaults =
        task.parameters.length === 0 ||
        task.parameters.every((p) => p.defaultValue !== undefined);

      if (allParamsHaveDefaults) {
        lenses.push(
          new vscode.CodeLens(range, {
            title: '$(play) Run Task',
            command: COMMANDS.RUN_TASK,
            arguments: [document.uri, task.functionName],
            tooltip: `Run ${task.functionName} via Flyte CLI`,
          }),
        );
      }

      lenses.push(
        new vscode.CodeLens(range, {
          title: '$(type-hierarchy) Graph',
          command: COMMANDS.SHOW_GRAPH,
          arguments: [document.uri],
          tooltip: 'Show task dependency graph',
        }),
      );
    }

    return lenses;
  }
}
