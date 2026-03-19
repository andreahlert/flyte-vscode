import type { Node, Tree } from 'web-tree-sitter';
import * as vscode from 'vscode';
import type {
  FlyteEnvironment,
  FlyteTask,
  FlyteApp,
  FlyteCall,
  ParseResult,
  TaskParameter,
} from './types.js';

function nodeRange(node: Node): vscode.Range {
  return new vscode.Range(
    node.startPosition.row,
    node.startPosition.column,
    node.endPosition.row,
    node.endPosition.column,
  );
}

function extractKwargs(callNode: Node): Record<string, string> {
  const kwargs: Record<string, string> = {};
  const argList = callNode.childForFieldName('arguments');
  if (!argList) return kwargs;

  for (const child of argList.namedChildren) {
    if (child.type === 'keyword_argument') {
      const key = child.childForFieldName('name');
      const value = child.childForFieldName('value');
      if (key && value) {
        kwargs[key.text] = value.text;
      }
    }
  }
  return kwargs;
}

function isFlyteFunctionCall(node: Node, qualifiedName: string): boolean {
  if (node.type !== 'call') return false;
  const func = node.childForFieldName('function');
  if (!func) return false;
  return func.text === qualifiedName;
}

function extractTaskEnvironments(tree: Tree): FlyteEnvironment[] {
  const envs: FlyteEnvironment[] = [];
  const root = tree.rootNode;

  for (const child of root.namedChildren) {
    if (child.type !== 'expression_statement') continue;
    const expr = child.namedChildren[0];
    if (!expr || expr.type !== 'assignment') continue;

    const left = expr.childForFieldName('left');
    const right = expr.childForFieldName('right');
    if (!left || !right || right.type !== 'call') continue;

    const func = right.childForFieldName('function');
    if (!func) continue;
    const funcText = func.text;

    if (
      funcText === 'flyte.TaskEnvironment' ||
      funcText === 'TaskEnvironment'
    ) {
      const kwargs = extractKwargs(right);
      envs.push({
        varName: left.text,
        name: kwargs['name']?.replace(/['"]/g, '') ?? left.text,
        type: 'task',
        location: nodeRange(child),
        params: kwargs,
      });
    }
  }

  return envs;
}

function extractAppEnvironments(tree: Tree): FlyteApp[] {
  const apps: FlyteApp[] = [];
  const root = tree.rootNode;

  for (const child of root.namedChildren) {
    if (child.type !== 'expression_statement') continue;
    const expr = child.namedChildren[0];
    if (!expr || expr.type !== 'assignment') continue;

    const left = expr.childForFieldName('left');
    const right = expr.childForFieldName('right');
    if (!left || !right || right.type !== 'call') continue;

    const func = right.childForFieldName('function');
    if (!func) continue;
    const funcText = func.text;

    if (
      funcText === 'flyte.app.AppEnvironment' ||
      funcText === 'AppEnvironment'
    ) {
      const kwargs = extractKwargs(right);
      apps.push({
        varName: left.text,
        name: kwargs['name']?.replace(/['"]/g, '') ?? left.text,
        location: nodeRange(child),
        params: kwargs,
      });
    }
  }

  return apps;
}

function extractFunctionParams(
  paramsNode: Node,
): TaskParameter[] {
  const params: TaskParameter[] = [];
  for (const child of paramsNode.namedChildren) {
    if (child.type === 'typed_parameter' || child.type === 'identifier') {
      let name: string;
      if (child.type === 'typed_parameter') {
        // In tree-sitter-python, typed_parameter children: identifier, type
        const identChild = child.namedChildren.find((c) => c.type === 'identifier');
        name = identChild?.text ?? child.childForFieldName('name')?.text ?? child.text;
      } else {
        name = child.text;
      }
      if (name === 'self' || name === 'cls') continue;

      const typeNode =
        child.type === 'typed_parameter'
          ? child.namedChildren.find((c) => c.type === 'type')
          : null;
      const defaultNode = child.childForFieldName('value');
      params.push({
        name,
        type: typeNode?.text ?? '',
        defaultValue: defaultNode?.text,
      });
    } else if (child.type === 'typed_default_parameter') {
      const name = child.childForFieldName('name')?.text ?? '';
      const typeNode = child.childForFieldName('type');
      const defaultNode = child.childForFieldName('value');
      params.push({
        name,
        type: typeNode?.text ?? '',
        defaultValue: defaultNode?.text,
      });
    } else if (child.type === 'default_parameter') {
      const name = child.childForFieldName('name')?.text ?? '';
      const defaultNode = child.childForFieldName('value');
      params.push({
        name,
        type: '',
        defaultValue: defaultNode?.text,
      });
    }
  }
  return params;
}

function extractTasks(
  tree: Tree,
  environments: FlyteEnvironment[],
): FlyteTask[] {
  const tasks: FlyteTask[] = [];
  const envNames = new Set(environments.map((e) => e.varName));
  const root = tree.rootNode;

  for (const child of root.namedChildren) {
    if (
      child.type !== 'decorated_definition' &&
      child.type !== 'function_definition'
    )
      continue;

    let funcDef: Node | null = null;
    let decoratorNode: Node | null = null;
    let decoratorParams: Record<string, string> = {};
    let envVarName = '';

    if (child.type === 'decorated_definition') {
      const decorators = child.namedChildren.filter(
        (n) => n.type === 'decorator',
      );
      funcDef = child.namedChildren.find(
        (n) => n.type === 'function_definition',
      ) ?? null;

      for (const dec of decorators) {
        const decExpr = dec.namedChildren[0];
        if (!decExpr) continue;

        let callText = '';
        if (decExpr.type === 'call') {
          const func = decExpr.childForFieldName('function');
          callText = func?.text ?? '';
          decoratorParams = extractKwargs(decExpr);
        } else if (
          decExpr.type === 'attribute' ||
          decExpr.type === 'identifier'
        ) {
          callText = decExpr.text;
        }

        const match = callText.match(/^(\w+)\.task$/);
        if (match && envNames.has(match[1])) {
          envVarName = match[1];
          decoratorNode = dec;
          break;
        }
      }
    }

    if (!funcDef || !envVarName) continue;

    const nameNode = funcDef.childForFieldName('name');
    const paramsNode = funcDef.childForFieldName('parameters');
    const returnTypeNode = funcDef.childForFieldName('return_type');
    const isAsync =
      funcDef.children[0]?.text === 'async' ||
      funcDef.type === 'function_definition' &&
        funcDef.text.startsWith('async');

    tasks.push({
      functionName: nameNode?.text ?? '',
      envVarName,
      isAsync: Boolean(isAsync),
      parameters: paramsNode ? extractFunctionParams(paramsNode) : [],
      returnType: returnTypeNode?.text ?? '',
      decoratorParams,
      location: nodeRange(funcDef),
      decoratorLocation: decoratorNode
        ? nodeRange(decoratorNode)
        : nodeRange(funcDef),
    });
  }

  return tasks;
}

function extractCalls(tree: Tree): FlyteCall[] {
  const calls: FlyteCall[] = [];
  const callTypes: Record<string, FlyteCall['type']> = {
    'flyte.run': 'run',
    'flyte.deploy': 'deploy',
    'flyte.map': 'map',
    'flyte.serve': 'serve',
    'flyte.build': 'build',
  };

  function walk(node: Node) {
    if (node.type === 'call') {
      const func = node.childForFieldName('function');
      if (func) {
        const callType = callTypes[func.text];
        if (callType) {
          const argList = node.childForFieldName('arguments');
          const args: string[] = [];
          if (argList) {
            for (const arg of argList.namedChildren) {
              if (arg.type !== 'keyword_argument') {
                args.push(arg.text);
              }
            }
          }
          calls.push({ type: callType, location: nodeRange(node), args });
        }
      }
    }
    for (const child of node.namedChildren) {
      walk(child);
    }
  }

  walk(tree.rootNode);
  return calls;
}

export function extractFlyteInfo(tree: Tree): ParseResult {
  const environments = extractTaskEnvironments(tree);
  const apps = extractAppEnvironments(tree);
  const tasks = extractTasks(tree, environments);
  const calls = extractCalls(tree);

  return { environments, tasks, apps, calls };
}
