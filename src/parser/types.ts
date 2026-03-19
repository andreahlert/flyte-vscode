import type { Range } from 'vscode';

export interface FlyteEnvironment {
  varName: string;
  name: string;
  type: 'task' | 'app';
  location: Range;
  params: Record<string, string>;
}

export interface FlyteTask {
  functionName: string;
  envVarName: string;
  isAsync: boolean;
  parameters: TaskParameter[];
  returnType: string;
  decoratorParams: Record<string, string>;
  location: Range;
  decoratorLocation: Range;
}

export interface TaskParameter {
  name: string;
  type: string;
  defaultValue?: string;
}

export interface FlyteApp {
  varName: string;
  name: string;
  location: Range;
  params: Record<string, string>;
}

export interface FlyteCall {
  type: 'run' | 'deploy' | 'map' | 'serve' | 'build';
  location: Range;
  args: string[];
}

export interface ParseResult {
  environments: FlyteEnvironment[];
  tasks: FlyteTask[];
  apps: FlyteApp[];
  calls: FlyteCall[];
}
