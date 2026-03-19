import { describe, it, expect, beforeAll } from 'vitest';
import { vi } from 'vitest';

// Mock vscode module
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

let parserInstance: Parser;

beforeAll(async () => {
  await Parser.init();
  parserInstance = new Parser();

  const wasmPath = path.resolve(
    __dirname,
    '../../../node_modules/tree-sitter-python/tree-sitter-python.wasm',
  );
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`WASM not found at ${wasmPath}`);
  }

  const lang = await Language.load(wasmPath);
  parserInstance.setLanguage(lang);
});

function parse(source: string) {
  return parserInstance.parse(source);
}

describe('flyteExtractor', () => {
  describe('extractTaskEnvironments', () => {
    it('extracts a simple TaskEnvironment', () => {
      const tree = parse(`
import flyte

env = flyte.TaskEnvironment(
    name="my-pipeline",
    image="auto",
)
`);
      const info = extractFlyteInfo(tree);
      expect(info.environments).toHaveLength(1);
      expect(info.environments[0].varName).toBe('env');
      expect(info.environments[0].name).toBe('my-pipeline');
      expect(info.environments[0].type).toBe('task');
      expect(info.environments[0].params['name']).toBe('"my-pipeline"');
      expect(info.environments[0].params['image']).toBe('"auto"');
    });

    it('extracts multiple environments', () => {
      const tree = parse(`
import flyte

cpu_env = flyte.TaskEnvironment(name="cpu-pipeline")
gpu_env = flyte.TaskEnvironment(name="gpu-pipeline", resources=flyte.Resources(gpu="A100:1"))
`);
      const info = extractFlyteInfo(tree);
      expect(info.environments).toHaveLength(2);
      expect(info.environments[0].varName).toBe('cpu_env');
      expect(info.environments[1].varName).toBe('gpu_env');
    });
  });

  describe('extractTasks', () => {
    it('extracts async task decorated with @env.task', () => {
      const tree = parse(`
import flyte

env = flyte.TaskEnvironment(name="test")

@env.task
async def my_task(input: str) -> str:
    return input
`);
      const info = extractFlyteInfo(tree);
      expect(info.tasks).toHaveLength(1);
      expect(info.tasks[0].functionName).toBe('my_task');
      expect(info.tasks[0].envVarName).toBe('env');
      expect(info.tasks[0].isAsync).toBe(true);
      expect(info.tasks[0].parameters).toHaveLength(1);
      expect(info.tasks[0].parameters[0].name).toBe('input');
      expect(info.tasks[0].parameters[0].type).toBe('str');
      expect(info.tasks[0].returnType).toBe('str');
    });

    it('extracts task with decorator kwargs', () => {
      const tree = parse(`
import flyte

env = flyte.TaskEnvironment(name="test")

@env.task(retries=3, timeout=300)
async def retryable(x: int) -> int:
    return x
`);
      const info = extractFlyteInfo(tree);
      expect(info.tasks).toHaveLength(1);
      expect(info.tasks[0].decoratorParams['retries']).toBe('3');
      expect(info.tasks[0].decoratorParams['timeout']).toBe('300');
    });

    it('links tasks to correct environments', () => {
      const tree = parse(`
import flyte

env1 = flyte.TaskEnvironment(name="env1")
env2 = flyte.TaskEnvironment(name="env2")

@env1.task
async def task_a(x: str) -> str:
    return x

@env2.task
async def task_b(y: int) -> int:
    return y
`);
      const info = extractFlyteInfo(tree);
      expect(info.tasks).toHaveLength(2);
      expect(info.tasks[0].envVarName).toBe('env1');
      expect(info.tasks[1].envVarName).toBe('env2');
    });
  });

  describe('extractAppEnvironments', () => {
    it('extracts AppEnvironment', () => {
      const tree = parse(`
import flyte

app = flyte.app.AppEnvironment(
    name="my-api",
    port=8080,
)
`);
      const info = extractFlyteInfo(tree);
      expect(info.apps).toHaveLength(1);
      expect(info.apps[0].varName).toBe('app');
      expect(info.apps[0].name).toBe('my-api');
      expect(info.apps[0].params['port']).toBe('8080');
    });
  });

  describe('extractCalls', () => {
    it('extracts flyte.run calls', () => {
      const tree = parse(`
import flyte

if __name__ == "__main__":
    flyte.run(my_task("hello"))
`);
      const info = extractFlyteInfo(tree);
      expect(info.calls).toHaveLength(1);
      expect(info.calls[0].type).toBe('run');
    });

    it('extracts flyte.deploy calls', () => {
      const tree = parse(`
import flyte

flyte.deploy(my_task("hello"))
`);
      const info = extractFlyteInfo(tree);
      expect(info.calls).toHaveLength(1);
      expect(info.calls[0].type).toBe('deploy');
    });
  });

  describe('sample_pipeline fixture', () => {
    it('parses the full sample pipeline', () => {
      const source = fs.readFileSync(
        path.join(__dirname, '../../fixtures/sample_pipeline.py'),
        'utf-8',
      );
      const tree = parse(source);
      const info = extractFlyteInfo(tree);

      expect(info.environments).toHaveLength(2);
      expect(info.environments[0].name).toBe('my-pipeline');
      expect(info.environments[1].name).toBe('gpu-training');

      expect(info.tasks).toHaveLength(5);
      const taskNames = info.tasks.map((t) => t.functionName);
      expect(taskNames).toContain('extract_data');
      expect(taskNames).toContain('transform_data');
      expect(taskNames).toContain('load_data');
      expect(taskNames).toContain('run_pipeline');
      expect(taskNames).toContain('train_model');

      expect(info.apps).toHaveLength(1);
      expect(info.apps[0].name).toBe('my-api');

      expect(info.calls).toHaveLength(1);
      expect(info.calls[0].type).toBe('run');
    });
  });
});
