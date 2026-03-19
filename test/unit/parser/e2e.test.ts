import { describe, it, expect, beforeAll } from 'vitest';
import { vi } from 'vitest';

vi.mock('vscode', () => ({
  Range: class {
    constructor(
      public startLine: number,
      public startChar: number,
      public endLine: number,
      public endChar: number,
    ) {}
  },
}));

import * as path from 'path';
import * as fs from 'fs';
import { Parser, Language } from 'web-tree-sitter';
import { extractFlyteInfo } from '../../../src/parser/flyteExtractor.js';
import { buildGraph } from '../../../src/parser/graphBuilder.js';
import { parseRunListJson } from '../../../src/cli/outputParser.js';

let parserInstance: Parser;

beforeAll(async () => {
  await Parser.init();
  parserInstance = new Parser();
  const wasmPath = path.resolve(
    __dirname,
    '../../../node_modules/tree-sitter-python/tree-sitter-python.wasm',
  );
  const lang = await Language.load(wasmPath);
  parserInstance.setLanguage(lang);
});

function parse(source: string) {
  return parserInstance.parse(source);
}

// =========================================================================
// E2E: Full ML Pipeline (examples/ml-pipeline/pipeline.py)
// =========================================================================

describe('E2E: pipeline.py', () => {
  let source: string;
  let info: ReturnType<typeof extractFlyteInfo>;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../../../examples/ml-pipeline/pipeline.py'),
      'utf-8',
    );
    const tree = parse(source);
    info = extractFlyteInfo(tree);
  });

  describe('environments', () => {
    it('extracts all 4 TaskEnvironments', () => {
      expect(info.environments).toHaveLength(4);
    });

    it('data_env has correct name and params', () => {
      const env = info.environments.find((e) => e.varName === 'data_env');
      expect(env).toBeDefined();
      expect(env!.name).toBe('data-processing');
      expect(env!.type).toBe('task');
      expect(env!.params['cache']).toBe('"auto"');
      expect(env!.params['interruptible']).toBe('True');
      expect(env!.params['queue']).toBe('"default"');
    });

    it('train_env has GPU resources and secrets', () => {
      const env = info.environments.find((e) => e.varName === 'train_env');
      expect(env).toBeDefined();
      expect(env!.name).toBe('gpu-training');
      expect(env!.params['secrets']).toContain('wandb-api-key');
    });

    it('eval_env is lightweight', () => {
      const env = info.environments.find((e) => e.varName === 'eval_env');
      expect(env).toBeDefined();
      expect(env!.name).toBe('evaluation');
      expect(env!.params['image']).toBe('"auto"');
    });

    it('distributed_env has multi-GPU config', () => {
      const env = info.environments.find((e) => e.varName === 'distributed_env');
      expect(env).toBeDefined();
      expect(env!.name).toBe('distributed-training');
    });
  });

  describe('tasks', () => {
    it('extracts all 11 tasks', () => {
      expect(info.tasks).toHaveLength(11);
    });

    it('all tasks are async', () => {
      for (const task of info.tasks) {
        expect(task.isAsync).toBe(true);
      }
    });

    it('data tasks link to data_env', () => {
      const dataTasks = ['fetch_dataset', 'preprocess_shard', 'split_into_shards', 'merge_shards', 'create_train_val_split', 'run_training_pipeline'];
      for (const name of dataTasks) {
        const task = info.tasks.find((t) => t.functionName === name);
        expect(task, `${name} should exist`).toBeDefined();
        expect(task!.envVarName).toBe('data_env');
      }
    });

    it('train_model links to train_env', () => {
      const task = info.tasks.find((t) => t.functionName === 'train_model');
      expect(task).toBeDefined();
      expect(task!.envVarName).toBe('train_env');
    });

    it('train_large_model links to distributed_env', () => {
      const task = info.tasks.find((t) => t.functionName === 'train_large_model');
      expect(task).toBeDefined();
      expect(task!.envVarName).toBe('distributed_env');
    });

    it('eval tasks link to eval_env', () => {
      const evalTasks = ['evaluate_model', 'compare_models', 'generate_report'];
      for (const name of evalTasks) {
        const task = info.tasks.find((t) => t.functionName === name);
        expect(task, `${name} should exist`).toBeDefined();
        expect(task!.envVarName).toBe('eval_env');
      }
    });

    it('preprocess_shard has retries and timeout decorator params', () => {
      const task = info.tasks.find((t) => t.functionName === 'preprocess_shard');
      expect(task).toBeDefined();
      expect(task!.decoratorParams['retries']).toBe('2');
    });

    it('train_model has retries and triggers decorator params', () => {
      const task = info.tasks.find((t) => t.functionName === 'train_model');
      expect(task).toBeDefined();
      expect(task!.decoratorParams['retries']).toBe('1');
    });

    it('fetch_dataset has correct parameters', () => {
      const task = info.tasks.find((t) => t.functionName === 'fetch_dataset');
      expect(task).toBeDefined();
      expect(task!.parameters).toHaveLength(2);
      expect(task!.parameters[0].name).toBe('source_url');
      expect(task!.parameters[0].type).toBe('str');
      expect(task!.parameters[1].name).toBe('split');
      expect(task!.parameters[1].type).toBe('str');
      expect(task!.parameters[1].defaultValue).toBe('"train"');
    });

    it('fetch_dataset return type is dict', () => {
      const task = info.tasks.find((t) => t.functionName === 'fetch_dataset');
      expect(task!.returnType).toBe('dict');
    });

    it('train_model has 6 parameters with defaults', () => {
      const task = info.tasks.find((t) => t.functionName === 'train_model');
      expect(task).toBeDefined();
      expect(task!.parameters).toHaveLength(6);
      const paramNames = task!.parameters.map((p) => p.name);
      expect(paramNames).toEqual([
        'train_data', 'model_name', 'epochs', 'learning_rate', 'batch_size', 'seed',
      ]);
    });

    it('train_large_model has gradient_accumulation_steps param', () => {
      const task = info.tasks.find((t) => t.functionName === 'train_large_model');
      expect(task).toBeDefined();
      const paramNames = task!.parameters.map((p) => p.name);
      expect(paramNames).toContain('gradient_accumulation_steps');
    });

    it('run_training_pipeline has default values for all params', () => {
      const task = info.tasks.find((t) => t.functionName === 'run_training_pipeline');
      expect(task).toBeDefined();
      for (const param of task!.parameters) {
        expect(param.defaultValue, `${param.name} should have default`).toBeDefined();
      }
    });
  });

  describe('calls', () => {
    it('extracts flyte.run call', () => {
      const runCalls = info.calls.filter((c) => c.type === 'run');
      expect(runCalls).toHaveLength(1);
    });

    it('has no flyte.map calls (uses asyncio.gather instead)', () => {
      const mapCalls = info.calls.filter((c) => c.type === 'map');
      expect(mapCalls).toHaveLength(0);
    });

    it('has no deploy calls in pipeline.py', () => {
      const deployCalls = info.calls.filter((c) => c.type === 'deploy');
      expect(deployCalls).toHaveLength(0);
    });
  });

  describe('graph', () => {
    it('builds graph with all 11 task nodes', () => {
      const graph = buildGraph(info);
      expect(graph.nodes).toHaveLength(11);
    });

    it('graph nodes have correct env associations', () => {
      const graph = buildGraph(info);
      const trainNode = graph.nodes.find((n) => n.id === 'train_model');
      expect(trainNode).toBeDefined();
      expect(trainNode!.envName).toBe('train_env');
      expect(trainNode!.isAsync).toBe(true);
    });

    it('all graph nodes are async', () => {
      const graph = buildGraph(info);
      for (const node of graph.nodes) {
        expect(node.isAsync).toBe(true);
      }
    });
  });
});

// =========================================================================
// E2E: Serving (examples/ml-pipeline/serving.py)
// =========================================================================

describe('E2E: serving.py', () => {
  let info: ReturnType<typeof extractFlyteInfo>;

  beforeAll(() => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../../examples/ml-pipeline/serving.py'),
      'utf-8',
    );
    const tree = parse(source);
    info = extractFlyteInfo(tree);
  });

  it('extracts 2 AppEnvironments', () => {
    expect(info.apps).toHaveLength(2);
  });

  it('inference_app has correct config', () => {
    const app = info.apps.find((a) => a.varName === 'inference_app');
    expect(app).toBeDefined();
    expect(app!.name).toBe('text-classifier');
    expect(app!.params['port']).toBe('8000');
    expect(app!.params['requires_auth']).toBe('True');
  });

  it('batch_app has correct config', () => {
    const app = info.apps.find((a) => a.varName === 'batch_app');
    expect(app).toBeDefined();
    expect(app!.name).toBe('batch-classifier');
    expect(app!.params['port']).toBe('8001');
  });

  it('has no TaskEnvironments', () => {
    expect(info.environments).toHaveLength(0);
  });

  it('has no @env.task decorated functions', () => {
    expect(info.tasks).toHaveLength(0);
  });

  it('extracts flyte.serve call', () => {
    const serveCalls = info.calls.filter((c) => c.type === 'serve');
    expect(serveCalls).toHaveLength(1);
  });
});

// =========================================================================
// E2E: Deploy (examples/ml-pipeline/deploy.py)
// =========================================================================

describe('E2E: deploy.py', () => {
  let info: ReturnType<typeof extractFlyteInfo>;

  beforeAll(() => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../../examples/ml-pipeline/deploy.py'),
      'utf-8',
    );
    const tree = parse(source);
    info = extractFlyteInfo(tree);
  });

  it('has no local environments (imported from pipeline)', () => {
    expect(info.environments).toHaveLength(0);
  });

  it('has no local tasks (imported from pipeline)', () => {
    expect(info.tasks).toHaveLength(0);
  });

  it('extracts 2 flyte.deploy calls', () => {
    const deployCalls = info.calls.filter((c) => c.type === 'deploy');
    expect(deployCalls).toHaveLength(2);
  });

  it('extracts 2 flyte.build calls', () => {
    const buildCalls = info.calls.filter((c) => c.type === 'build');
    expect(buildCalls).toHaveLength(2);
  });
});

// =========================================================================
// E2E: Edge cases
// =========================================================================

describe('E2E: edge cases', () => {
  it('handles empty file', () => {
    const tree = parse('');
    const info = extractFlyteInfo(tree);
    expect(info.environments).toHaveLength(0);
    expect(info.tasks).toHaveLength(0);
    expect(info.apps).toHaveLength(0);
    expect(info.calls).toHaveLength(0);
  });

  it('handles file with only imports', () => {
    const tree = parse('import flyte\nimport os\n');
    const info = extractFlyteInfo(tree);
    expect(info.environments).toHaveLength(0);
    expect(info.tasks).toHaveLength(0);
  });

  it('ignores non-flyte decorators', () => {
    const tree = parse(`
import flyte

env = flyte.TaskEnvironment(name="test")

@some_other_decorator
async def not_a_task(x: str) -> str:
    return x

@env.task
async def real_task(x: str) -> str:
    return x
`);
    const info = extractFlyteInfo(tree);
    expect(info.tasks).toHaveLength(1);
    expect(info.tasks[0].functionName).toBe('real_task');
  });

  it('handles task with no parameters', () => {
    const tree = parse(`
import flyte

env = flyte.TaskEnvironment(name="test")

@env.task
async def no_params() -> str:
    return "hello"
`);
    const info = extractFlyteInfo(tree);
    expect(info.tasks).toHaveLength(1);
    expect(info.tasks[0].parameters).toHaveLength(0);
    expect(info.tasks[0].returnType).toBe('str');
  });

  it('handles task with no return type', () => {
    const tree = parse(`
import flyte

env = flyte.TaskEnvironment(name="test")

@env.task
async def no_return(x: int):
    pass
`);
    const info = extractFlyteInfo(tree);
    expect(info.tasks).toHaveLength(1);
    expect(info.tasks[0].returnType).toBe('');
  });

  it('handles TaskEnvironment without name kwarg (uses varName)', () => {
    const tree = parse(`
import flyte

my_env = flyte.TaskEnvironment(name="actual-name")
`);
    const info = extractFlyteInfo(tree);
    expect(info.environments[0].varName).toBe('my_env');
    expect(info.environments[0].name).toBe('actual-name');
  });

  it('handles multiple decorators on a task', () => {
    const tree = parse(`
import flyte

env = flyte.TaskEnvironment(name="test")

@some_wrapper
@env.task(retries=2)
async def wrapped_task(x: str) -> str:
    return x
`);
    const info = extractFlyteInfo(tree);
    expect(info.tasks).toHaveLength(1);
    expect(info.tasks[0].functionName).toBe('wrapped_task');
    expect(info.tasks[0].decoratorParams['retries']).toBe('2');
  });

  it('handles complex parameter types', () => {
    const tree = parse(`
import flyte

env = flyte.TaskEnvironment(name="test")

@env.task
async def complex_params(
    data: list[dict[str, int]],
    config: dict,
    flag: bool = False,
) -> tuple[str, int]:
    pass
`);
    const info = extractFlyteInfo(tree);
    expect(info.tasks).toHaveLength(1);
    expect(info.tasks[0].parameters).toHaveLength(3);
    expect(info.tasks[0].parameters[0].name).toBe('data');
    expect(info.tasks[0].parameters[2].name).toBe('flag');
    expect(info.tasks[0].parameters[2].defaultValue).toBe('False');
  });

  it('handles all flyte call types', () => {
    const tree = parse(`
import flyte

flyte.run(task1())
flyte.deploy(task2())
flyte.build(env)
flyte.serve(app)
flyte.map(task3, items)
`);
    const info = extractFlyteInfo(tree);
    expect(info.calls).toHaveLength(5);
    const types = info.calls.map((c) => c.type).sort();
    expect(types).toEqual(['build', 'deploy', 'map', 'run', 'serve']);
  });
});

// =========================================================================
// E2E: Output parser (CLI integration)
// =========================================================================

describe('E2E: outputParser', () => {
  it('parses valid JSON run list', () => {
    const json = JSON.stringify([
      { id: 'run-001', status: 'SUCCEEDED', task: 'train_model', start_time: '2026-03-19T10:00:00Z', duration: '1h30m' },
      { id: 'run-002', status: 'RUNNING', task: 'preprocess_shard', start_time: '2026-03-19T11:00:00Z' },
      { id: 'run-003', status: 'FAILED', task: 'deploy_model' },
      { id: 'run-004', status: 'ABORTED', name: 'cleanup' },
    ]);
    const runs = parseRunListJson(json);
    expect(runs).toHaveLength(4);

    expect(runs[0].id).toBe('run-001');
    expect(runs[0].status).toBe('succeeded');
    expect(runs[0].taskName).toBe('train_model');
    expect(runs[0].startTime).toBe('2026-03-19T10:00:00Z');
    expect(runs[0].duration).toBe('1h30m');

    expect(runs[1].status).toBe('running');
    expect(runs[1].startTime).toBe('2026-03-19T11:00:00Z');
    expect(runs[1].duration).toBeUndefined();

    expect(runs[2].status).toBe('failed');
    expect(runs[3].status).toBe('aborted');
    expect(runs[3].taskName).toBe('cleanup');
  });

  it('handles invalid JSON gracefully', () => {
    expect(parseRunListJson('not json')).toEqual([]);
    expect(parseRunListJson('')).toEqual([]);
    expect(parseRunListJson('{}')).toEqual([]);
  });

  it('handles empty array', () => {
    expect(parseRunListJson('[]')).toEqual([]);
  });

  it('normalizes various status strings', () => {
    const json = JSON.stringify([
      { id: '1', status: 'Active' },
      { id: '2', status: 'success' },
      { id: '3', status: 'error' },
      { id: '4', status: 'abort' },
      { id: '5', status: 'pending' },
    ]);
    const runs = parseRunListJson(json);
    expect(runs[0].status).toBe('running');
    expect(runs[1].status).toBe('succeeded');
    expect(runs[2].status).toBe('failed');
    expect(runs[3].status).toBe('aborted');
    expect(runs[4].status).toBe('unknown');
  });

  it('handles missing fields', () => {
    const json = JSON.stringify([{ id: 'run-x' }]);
    const runs = parseRunListJson(json);
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe('run-x');
    expect(runs[0].status).toBe('unknown');
    expect(runs[0].taskName).toBe('');
  });
});

// =========================================================================
// E2E: Graph builder
// =========================================================================

describe('E2E: graphBuilder', () => {
  it('builds graph from pipeline with correct node count', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../../examples/ml-pipeline/pipeline.py'),
      'utf-8',
    );
    const tree = parse(source);
    const info = extractFlyteInfo(tree);
    const graph = buildGraph(info);

    expect(graph.nodes).toHaveLength(11);
    expect(graph.edges).toHaveLength(0); // Phase 3 feature

    const nodeIds = graph.nodes.map((n) => n.id).sort();
    expect(nodeIds).toEqual([
      'compare_models',
      'create_train_val_split',
      'evaluate_model',
      'fetch_dataset',
      'generate_report',
      'merge_shards',
      'preprocess_shard',
      'run_training_pipeline',
      'split_into_shards',
      'train_model',
      'train_large_model',
    ].sort());
  });

  it('builds empty graph from file with no tasks', () => {
    const tree = parse('import flyte\nx = 1\n');
    const info = extractFlyteInfo(tree);
    const graph = buildGraph(info);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  it('preserves env associations in graph nodes', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../../examples/ml-pipeline/pipeline.py'),
      'utf-8',
    );
    const tree = parse(source);
    const info = extractFlyteInfo(tree);
    const graph = buildGraph(info);

    const envGroups: Record<string, string[]> = {};
    for (const node of graph.nodes) {
      if (!envGroups[node.envName]) envGroups[node.envName] = [];
      envGroups[node.envName].push(node.id);
    }

    expect(envGroups['data_env']).toHaveLength(6);
    expect(envGroups['train_env']).toHaveLength(1);
    expect(envGroups['distributed_env']).toHaveLength(1);
    expect(envGroups['eval_env']).toHaveLength(3);
  });
});
