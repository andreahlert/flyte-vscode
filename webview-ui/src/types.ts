export interface Environment {
  varName: string;
  name: string;
  type: string;
  params: Record<string, string>;
  file: string;
  location: { line: number };
}

export interface Task {
  functionName: string;
  envVarName: string;
  isAsync: boolean;
  parameters: { name: string; type: string; defaultValue?: string }[];
  returnType: string;
  decoratorParams: Record<string, string>;
  file: string;
  location: { line: number };
}

export interface App {
  varName: string;
  name: string;
  params: Record<string, string>;
  file: string;
  location: { line: number };
}

export interface Cluster {
  name: string;
  endpoint: string;
  insecure: boolean;
  type: 'union' | 'self-hosted';
  registry?: string;
  isActive: boolean;
}

export interface AppState {
  mode: 'landing' | 'wizard' | 'advanced';
  wizardStep: number;
  environments: Environment[];
  tasks: Task[];
  apps: App[];
  clusters: Cluster[];
}
