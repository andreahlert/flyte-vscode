import * as vscode from 'vscode';
import { parseSource } from '../parser/pythonParser.js';
import { extractFlyteInfo } from '../parser/flyteExtractor.js';
import { buildGraph } from '../parser/graphBuilder.js';

export async function handleShowGraph(uri?: vscode.Uri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const fileUri = uri ?? editor?.document.uri;

  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file open.');
    return;
  }

  const doc = await vscode.workspace.openTextDocument(fileUri);
  const tree = parseSource(doc.getText());
  if (!tree) {
    vscode.window.showErrorMessage('Could not parse Python file.');
    return;
  }

  const info = extractFlyteInfo(tree);
  const graph = buildGraph(info);

  if (graph.nodes.length === 0) {
    vscode.window.showInformationMessage('No Flyte tasks found in this file.');
    return;
  }

  // Phase 3 will render this in a React Flow webview.
  // For now, show a summary in a virtual document.
  const content = graph.nodes
    .map((n) => `${n.isAsync ? 'async ' : ''}${n.label} (env: ${n.envName})`)
    .join('\n');

  const outputChannel = vscode.window.createOutputChannel('Flyte Graph');
  outputChannel.clear();
  outputChannel.appendLine('=== Flyte Task Graph ===');
  outputChannel.appendLine('');
  outputChannel.appendLine('Tasks:');
  for (const node of graph.nodes) {
    outputChannel.appendLine(
      `  ${node.isAsync ? 'async ' : ''}${node.label} (${node.envName})${node.returnType ? ` -> ${node.returnType}` : ''}`,
    );
  }
  if (graph.edges.length > 0) {
    outputChannel.appendLine('');
    outputChannel.appendLine('Edges:');
    for (const edge of graph.edges) {
      outputChannel.appendLine(`  ${edge.source} -> ${edge.target} [${edge.type}]`);
    }
  }
  outputChannel.show();
}
