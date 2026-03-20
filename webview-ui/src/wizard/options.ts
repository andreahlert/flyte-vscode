export const CPU_OPTIONS = ['0.5', '1', '2', '4', '8', '16'];

export const MEMORY_OPTIONS = ['256Mi', '512Mi', '1Gi', '2Gi', '4Gi', '8Gi', '16Gi', '32Gi', '64Gi', '128Gi'];

export const GPU_OPTIONS = [
  '',
  'T4:1', 'T4:2', 'T4:4', 'T4:8',
  'A10:1', 'A10:2', 'A10:4',
  'A100:1', 'A100:2', 'A100:4', 'A100:8',
  'A100 80G:1', 'A100 80G:4', 'A100 80G:8',
  'H100:1', 'H100:2', 'H100:4', 'H100:8',
  'H200:1', 'H200:4', 'H200:8',
  'L4:1', 'L4:2', 'L4:4',
  'L40s:1', 'L40s:4', 'L40s:8',
  'V100:1', 'V100:2', 'V100:4',
  'B200:1', 'B200:4', 'B200:8',
  'MI300X:1', 'MI250:1',
  'Gaudi1:1',
  'Inf2:1', 'Trn2:1',
];

export const CACHE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'disable', label: 'Disabled' },
  { value: 'override', label: 'Override' },
];

export const TYPE_OPTIONS = [
  'str', 'int', 'float', 'bool', 'dict', 'list', 'bytes',
  'list[str]', 'list[int]', 'list[dict]',
  'dict[str, str]', 'dict[str, int]', 'dict[str, any]',
  'Optional[str]', 'Optional[int]',
];

export const RETURN_TYPE_OPTIONS = [
  '', 'str', 'int', 'float', 'bool', 'dict', 'list',
  'list[str]', 'list[dict]', 'dict[str, str]',
  'tuple[str, int]', 'None',
];

export const PORT_OPTIONS = ['3000', '5000', '8000', '8080', '8888', '9000'];

export const INVALID_PORTS = ['8012', '8022', '8112', '9090', '9091'];

export function validateEnvName(name: string): string | undefined {
  if (!name) return 'Name is required';
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name)) {
    return 'Lowercase letters, numbers, hyphens only';
  }
  return undefined;
}

export function validateVarName(name: string): string | undefined {
  if (!name) return 'Required';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return 'Valid Python identifier required';
  }
  return undefined;
}

export function validateFunctionName(name: string): string | undefined {
  if (!name) return 'Required';
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    return 'snake_case name required';
  }
  return undefined;
}

export function validatePort(port: string): string | undefined {
  if (!port) return 'Required';
  const n = parseInt(port);
  if (isNaN(n) || n < 1 || n > 65535) return 'Invalid port (1-65535)';
  if (INVALID_PORTS.includes(port)) return `Port ${port} is reserved by Flyte`;
  return undefined;
}
