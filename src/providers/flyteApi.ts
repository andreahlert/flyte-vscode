interface ParamInfo {
  name: string;
  type: string;
  default: string | null;
  doc: string;
  required: boolean;
}

interface ClassInfo {
  name: string;
  module: string;
  doc: string;
  params: ParamInfo[];
}

const TASK_ENVIRONMENT: ClassInfo = {
  name: 'TaskEnvironment',
  module: 'flyte',
  doc: 'Defines the execution environment for tasks: image, resources, caching, and scheduling.',
  params: [
    { name: 'name', type: 'str', default: null, doc: 'Name of the environment', required: true },
    { name: 'image', type: "str | Image | 'auto'", default: '"auto"', doc: 'Docker image to use', required: false },
    { name: 'resources', type: 'Resources', default: 'None', doc: 'CPU, memory, GPU allocation', required: false },
    { name: 'cache', type: "'auto' | 'disable' | 'override' | Cache", default: '"disable"', doc: 'Cache policy for task outputs', required: false },
    { name: 'secrets', type: 'str | Secret | list[str | Secret]', default: 'None', doc: 'Secrets to inject', required: false },
    { name: 'env_vars', type: 'dict[str, str]', default: 'None', doc: 'Environment variables', required: false },
    { name: 'interruptible', type: 'bool', default: 'False', doc: 'Allow scheduling on spot/preemptible instances', required: false },
    { name: 'queue', type: 'str', default: 'None', doc: 'Queue name for tasks', required: false },
    { name: 'reusable', type: 'ReusePolicy', default: 'None', doc: 'Reuse Python process across tasks', required: false },
    { name: 'plugin_config', type: 'Any', default: 'None', doc: 'Custom task type plugin config', required: false },
    { name: 'pod_template', type: 'str | PodTemplate', default: 'None', doc: 'Kubernetes pod template', required: false },
    { name: 'depends_on', type: 'list[Environment]', default: '[]', doc: 'Environment dependencies for deploy order', required: false },
    { name: 'description', type: 'str', default: 'None', doc: 'Description of the environment', required: false },
  ],
};

const TASK_DECORATOR: ClassInfo = {
  name: '@env.task',
  module: 'flyte',
  doc: 'Decorator to define a Flyte task within a TaskEnvironment.',
  params: [
    { name: 'retries', type: 'int | RetryStrategy', default: '0', doc: 'Number of retries on failure', required: false },
    { name: 'timeout', type: 'timedelta | int', default: '0', doc: 'Task timeout (seconds or timedelta)', required: false },
    { name: 'cache', type: "'auto' | 'disable' | 'override' | Cache", default: 'None', doc: 'Override environment cache policy', required: false },
    { name: 'triggers', type: 'Trigger | tuple[Trigger, ...]', default: '()', doc: 'Cron or fixed-rate triggers', required: false },
    { name: 'links', type: 'Link | tuple[Link, ...]', default: '()', doc: 'Links to associate with the task', required: false },
    { name: 'short_name', type: 'str', default: 'None', doc: 'Friendly name (defaults to function name)', required: false },
    { name: 'docs', type: 'Documentation', default: 'None', doc: 'Documentation for the task', required: false },
    { name: 'report', type: 'bool', default: 'False', doc: 'Generate HTML report', required: false },
    { name: 'interruptible', type: 'bool', default: 'None', doc: 'Override environment interruptible setting', required: false },
    { name: 'queue', type: 'str', default: 'None', doc: 'Override environment queue', required: false },
    { name: 'pod_template', type: 'str | PodTemplate', default: 'None', doc: 'Override environment pod template', required: false },
  ],
};

const RESOURCES: ClassInfo = {
  name: 'Resources',
  module: 'flyte',
  doc: 'Define CPU, memory, GPU, disk, and shared memory for a task.',
  params: [
    { name: 'cpu', type: 'int | float | str | tuple', default: 'None', doc: 'CPU cores (e.g., 2) or range (1, 4)', required: false },
    { name: 'memory', type: 'str | tuple', default: 'None', doc: 'Memory (e.g., "4Gi") or range ("2Gi", "8Gi")', required: false },
    { name: 'gpu', type: 'str | int | Device', default: 'None', doc: 'GPU accelerator (e.g., "A100:1", "T4:4")', required: false },
    { name: 'disk', type: 'str', default: 'None', doc: 'Disk space (e.g., "20Gi")', required: false },
    { name: 'shm', type: "str | 'auto'", default: 'None', doc: 'Shared memory (e.g., "10Gi" or "auto")', required: false },
  ],
};

const APP_ENVIRONMENT: ClassInfo = {
  name: 'AppEnvironment',
  module: 'flyte.app',
  doc: 'Defines a long-running HTTP server (API, inference endpoint).',
  params: [
    { name: 'name', type: 'str', default: null, doc: 'Name of the app (lowercase, hyphens)', required: true },
    { name: 'port', type: 'int', default: '8080', doc: 'Port for the app server (not 8012, 8022, 8112, 9090, 9091)', required: false },
    { name: 'image', type: "str | Image | 'auto'", default: '"auto"', doc: 'Docker image', required: false },
    { name: 'resources', type: 'Resources', default: 'None', doc: 'CPU, memory, GPU allocation', required: false },
    { name: 'requires_auth', type: 'bool', default: 'True', doc: 'Require authentication', required: false },
    { name: 'command', type: 'list[str] | str', default: 'None', doc: 'Command to run', required: false },
    { name: 'args', type: 'list[str] | str', default: 'None', doc: 'Arguments to the command', required: false },
    { name: 'secrets', type: 'str | Secret | list[str | Secret]', default: 'None', doc: 'Secrets to inject', required: false },
    { name: 'env_vars', type: 'dict[str, str]', default: 'None', doc: 'Environment variables', required: false },
    { name: 'scaling', type: 'Scaling', default: 'Scaling()', doc: 'Scaling configuration', required: false },
    { name: 'domain', type: 'Domain', default: 'Domain()', doc: 'Domain configuration', required: false },
    { name: 'cluster_pool', type: 'str', default: '"default"', doc: 'Cluster pool name', required: false },
    { name: 'include', type: 'list[str]', default: '[]', doc: 'Files to include', required: false },
    { name: 'parameters', type: 'list[Parameter]', default: '[]', doc: 'App parameters', required: false },
    { name: 'timeouts', type: 'Timeouts', default: 'Timeouts()', doc: 'Timeout configuration', required: false },
    { name: 'pod_template', type: 'str | PodTemplate', default: 'None', doc: 'Kubernetes pod template', required: false },
    { name: 'description', type: 'str', default: 'None', doc: 'Description', required: false },
    { name: 'interruptible', type: 'bool', default: 'False', doc: 'Allow spot instances', required: false },
  ],
};

const TRIGGER: ClassInfo = {
  name: 'Trigger',
  module: 'flyte',
  doc: 'Schedule automated task execution with Cron or FixedRate.',
  params: [
    { name: 'name', type: 'str', default: null, doc: 'Name of the trigger', required: true },
    { name: 'automation', type: 'Cron | FixedRate', default: null, doc: 'Cron expression or fixed interval', required: true },
    { name: 'description', type: 'str', default: '""', doc: 'Description of the trigger', required: false },
    { name: 'auto_activate', type: 'bool', default: 'True', doc: 'Activate on deploy', required: false },
    { name: 'inputs', type: 'dict[str, Any]', default: 'None', doc: 'Fixed inputs for triggered runs', required: false },
    { name: 'env_vars', type: 'dict[str, str]', default: 'None', doc: 'Environment variables', required: false },
    { name: 'overwrite_cache', type: 'bool', default: 'False', doc: 'Ignore cached results', required: false },
    { name: 'queue', type: 'str', default: 'None', doc: 'Queue name', required: false },
    { name: 'labels', type: 'Mapping[str, str]', default: 'None', doc: 'Labels to attach to triggered runs', required: false },
    { name: 'annotations', type: 'Mapping[str, str]', default: 'None', doc: 'Annotations to attach to triggered runs', required: false },
    { name: 'interruptible', type: 'bool', default: 'None', doc: 'Allow scheduling on spot/preemptible instances', required: false },
  ],
};

const CRON: ClassInfo = {
  name: 'Cron',
  module: 'flyte',
  doc: 'Cron-based schedule for triggers.',
  params: [
    { name: 'expression', type: 'str', default: null, doc: 'Cron expression (e.g., "0 * * * *")', required: true },
    { name: 'timezone', type: 'str', default: '"UTC"', doc: 'IANA timezone (e.g., "America/Sao_Paulo")', required: false },
  ],
};

const FIXED_RATE: ClassInfo = {
  name: 'FixedRate',
  module: 'flyte',
  doc: 'Fixed interval schedule for triggers.',
  params: [
    { name: 'interval_minutes', type: 'int', default: null, doc: 'Interval in minutes', required: true },
    { name: 'start_time', type: 'datetime', default: 'None', doc: 'Start time of the schedule', required: false },
  ],
};

const CACHE: ClassInfo = {
  name: 'Cache',
  module: 'flyte',
  doc: 'Configure caching behavior for task outputs.',
  params: [
    { name: 'behavior', type: "'auto' | 'override' | 'disable'", default: null, doc: 'Cache behavior', required: true },
    { name: 'ignored_inputs', type: 'tuple[str, ...] | str', default: '()', doc: 'Inputs to exclude from cache key', required: false },
    { name: 'serialize', type: 'bool', default: 'False', doc: 'Run identical tasks serially', required: false },
    { name: 'version_override', type: 'str', default: 'None', doc: 'Manual cache version', required: false },
    { name: 'salt', type: 'str', default: '""', doc: 'Salt for hash generation', required: false },
  ],
};

const SECRET: ClassInfo = {
  name: 'Secret',
  module: 'flyte',
  doc: 'Reference a secret from the secret store.',
  params: [
    { name: 'key', type: 'str', default: null, doc: 'Secret name in the store', required: true },
    { name: 'group', type: 'str', default: 'None', doc: 'Secret group', required: false },
    { name: 'as_env_var', type: 'str', default: 'None', doc: 'Expose as environment variable', required: false },
    { name: 'mount', type: 'Path', default: 'None', doc: 'Mount path for the secret file', required: false },
  ],
};

const GPU_ACCELERATORS = [
  'T4:1', 'T4:2', 'T4:4', 'T4:8',
  'A10:1', 'A10:2', 'A10:4', 'A10:8',
  'A10G:1', 'A10G:2', 'A10G:4',
  'A100:1', 'A100:2', 'A100:4', 'A100:8',
  'A100 80G:1', 'A100 80G:4', 'A100 80G:8',
  'H100:1', 'H100:2', 'H100:4', 'H100:8',
  'H200:1', 'H200:4', 'H200:8',
  'L4:1', 'L4:2', 'L4:4', 'L4:8',
  'L40s:1', 'L40s:4', 'L40s:8',
  'V100:1', 'V100:2', 'V100:4', 'V100:8',
  'B200:1', 'B200:4', 'B200:8',
  'MI300X:1', 'MI250:1', 'MI100:1',
  'Gaudi1:1',
  'Inf2:1', 'Inf2:4', 'Inf2:12',
  'Trn2:1', 'Trn2:4', 'Trn2:8',
];

export const FLYTE_CLASSES: Record<string, ClassInfo> = {
  'flyte.TaskEnvironment': TASK_ENVIRONMENT,
  'TaskEnvironment': TASK_ENVIRONMENT,
  'flyte.Resources': RESOURCES,
  'Resources': RESOURCES,
  'flyte.app.AppEnvironment': APP_ENVIRONMENT,
  'AppEnvironment': APP_ENVIRONMENT,
  'flyte.Trigger': TRIGGER,
  'Trigger': TRIGGER,
  'flyte.Cron': CRON,
  'Cron': CRON,
  'flyte.FixedRate': FIXED_RATE,
  'FixedRate': FIXED_RATE,
  'flyte.Cache': CACHE,
  'Cache': CACHE,
  'flyte.Secret': SECRET,
  'Secret': SECRET,
};

export const FLYTE_DECORATOR_PARAMS = TASK_DECORATOR.params;

export { GPU_ACCELERATORS };
export type { ParamInfo, ClassInfo };
