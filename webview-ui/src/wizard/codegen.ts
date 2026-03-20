export interface EnvConfig {
  varName: string;
  name: string;
  cpu: string;
  memory: string;
  gpu: string;
  cache: boolean;
  interruptible: boolean;
}

export interface TaskConfig {
  functionName: string;
  envVarName: string;
  isAsync: boolean;
  params: { name: string; type: string }[];
  returnType: string;
  retries: string;
}

export interface AppConfig {
  varName: string;
  name: string;
  port: string;
  cpu: string;
  memory: string;
}

export function generateImports(): string {
  return 'import flyte\n';
}

export function generateEnvironment(config: EnvConfig): string {
  const lines = [
    `${config.varName} = flyte.TaskEnvironment(`,
    `    name="${config.name}",`,
  ];

  const resources: string[] = [];
  if (config.cpu) resources.push(`cpu=${config.cpu}`);
  if (config.memory) resources.push(`memory="${config.memory}"`);
  if (config.gpu) resources.push(`gpu="${config.gpu}"`);

  if (resources.length > 0) {
    lines.push(`    resources=flyte.Resources(${resources.join(', ')}),`);
  }

  if (config.cache) lines.push(`    cache="auto",`);
  if (config.interruptible) lines.push(`    interruptible=True,`);

  lines.push(')');
  return lines.join('\n');
}

export function generateTask(config: TaskConfig): string {
  const decorator = config.retries && config.retries !== '0'
    ? `@${config.envVarName}.task(retries=${config.retries})`
    : `@${config.envVarName}.task`;

  const params = config.params
    .filter(p => p.name)
    .map(p => p.type ? `${p.name}: ${p.type}` : p.name)
    .join(', ');

  const returnAnnotation = config.returnType ? ` -> ${config.returnType}` : '';
  const prefix = config.isAsync ? 'async ' : '';

  return [
    '',
    decorator,
    `${prefix}def ${config.functionName}(${params})${returnAnnotation}:`,
    '    pass',
  ].join('\n');
}

export function generateApp(config: AppConfig): string {
  const lines = [
    '',
    `${config.varName} = flyte.app.AppEnvironment(`,
    `    name="${config.name}",`,
    `    port=${config.port},`,
  ];

  const resources: string[] = [];
  if (config.cpu) resources.push(`cpu=${config.cpu}`);
  if (config.memory) resources.push(`memory="${config.memory}"`);

  if (resources.length > 0) {
    lines.push(`    resources=flyte.Resources(${resources.join(', ')}),`);
  }

  lines.push(')');
  return lines.join('\n');
}

export function generateRun(taskName: string): string {
  return [
    '',
    '',
    'if __name__ == "__main__":',
    `    flyte.run(${taskName}())`,
  ].join('\n');
}

export function generateFullFile(
  env: EnvConfig,
  tasks: TaskConfig[],
  app: AppConfig | null,
  runTaskName: string | null,
): string {
  const parts = [generateImports(), '', generateEnvironment(env)];

  for (const task of tasks) {
    parts.push(generateTask(task));
  }

  if (app && app.name) {
    parts.push(generateApp(app));
  }

  if (runTaskName) {
    parts.push(generateRun(runTaskName));
  }

  return parts.join('\n') + '\n';
}
