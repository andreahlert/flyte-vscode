import * as vscode from 'vscode';
import { parseSource } from '../parser/pythonParser.js';
import { extractFlyteInfo } from '../parser/flyteExtractor.js';
import { FLYTE_LANGUAGE_ID } from '../constants.js';

const INVALID_APP_PORTS = ['8012', '8022', '8112', '9090', '9091'];
const APP_NAME_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;

export class FlyteDiagnosticProvider {
  private collection: vscode.DiagnosticCollection;

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('flyte');
  }

  dispose(): void {
    this.collection.dispose();
  }

  update(document: vscode.TextDocument): void {
    if (document.languageId !== FLYTE_LANGUAGE_ID) return;

    const tree = parseSource(document.getText());
    if (!tree) {
      this.collection.delete(document.uri);
      return;
    }

    const info = extractFlyteInfo(tree);
    const diagnostics: vscode.Diagnostic[] = [];

    // Validate environments
    for (const env of info.environments) {
      const name = env.params['name']?.replace(/['"]/g, '');
      if (name && !APP_NAME_REGEX.test(name)) {
        diagnostics.push(new vscode.Diagnostic(
          env.location,
          `Environment name "${name}" must be lowercase alphanumeric with hyphens (e.g., "my-pipeline")`,
          vscode.DiagnosticSeverity.Error,
        ));
      }

      // plugin_config + reusable conflict
      if (env.params['plugin_config'] && env.params['reusable']) {
        diagnostics.push(new vscode.Diagnostic(
          env.location,
          'Cannot set both plugin_config and reusable on the same TaskEnvironment',
          vscode.DiagnosticSeverity.Error,
        ));
      }
    }

    // Validate apps
    for (const app of info.apps) {
      const name = app.params['name']?.replace(/['"]/g, '');
      if (name && !APP_NAME_REGEX.test(name)) {
        diagnostics.push(new vscode.Diagnostic(
          app.location,
          `App name "${name}" must be lowercase alphanumeric with hyphens`,
          vscode.DiagnosticSeverity.Error,
        ));
      }

      const port = app.params['port'];
      if (port && INVALID_APP_PORTS.includes(port)) {
        diagnostics.push(new vscode.Diagnostic(
          app.location,
          `Port ${port} is reserved by Flyte. Use a different port.`,
          vscode.DiagnosticSeverity.Error,
        ));
      }
    }

    // Validate tasks
    for (const task of info.tasks) {
      // Empty trigger name
      if (task.decoratorParams['triggers']) {
        const triggerStr = task.decoratorParams['triggers'];
        if (triggerStr.includes('name=""') || triggerStr.includes("name=''")) {
          diagnostics.push(new vscode.Diagnostic(
            task.decoratorLocation,
            'Trigger name cannot be empty',
            vscode.DiagnosticSeverity.Error,
          ));
        }
      }
    }

    this.collection.set(document.uri, diagnostics);
  }

  clear(uri: vscode.Uri): void {
    this.collection.delete(uri);
  }
}
