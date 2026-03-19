export interface RunInfo {
  id: string;
  status: 'running' | 'succeeded' | 'failed' | 'aborted' | 'unknown';
  taskName: string;
  startTime?: string;
  duration?: string;
}

export function parseRunListJson(output: string): RunInfo[] {
  try {
    const data = JSON.parse(output);
    if (!Array.isArray(data)) return [];
    return data.map((item: Record<string, unknown>) => ({
      id: String(item.id ?? ''),
      status: normalizeStatus(String(item.status ?? '')),
      taskName: String(item.task ?? item.name ?? ''),
      startTime: item.start_time ? String(item.start_time) : undefined,
      duration: item.duration ? String(item.duration) : undefined,
    }));
  } catch {
    return [];
  }
}

function normalizeStatus(
  status: string,
): RunInfo['status'] {
  const s = status.toLowerCase();
  if (s.includes('running') || s.includes('active')) return 'running';
  if (s.includes('succeeded') || s.includes('success')) return 'succeeded';
  if (s.includes('failed') || s.includes('fail') || s.includes('error'))
    return 'failed';
  if (s.includes('aborted') || s.includes('abort')) return 'aborted';
  return 'unknown';
}
