import type { ParseResult } from './types.js';

export interface GraphNode {
  id: string;
  label: string;
  envName: string;
  isAsync: boolean;
  returnType: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'await' | 'gather' | 'map';
}

export interface TaskGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildGraph(result: ParseResult): TaskGraph {
  const nodes: GraphNode[] = result.tasks.map((task) => ({
    id: task.functionName,
    label: task.functionName,
    envName: task.envVarName,
    isAsync: task.isAsync,
    returnType: task.returnType,
  }));

  // Edges will be populated by Phase 3 (body analysis for await/gather/map calls)
  const edges: GraphEdge[] = [];

  return { nodes, edges };
}
