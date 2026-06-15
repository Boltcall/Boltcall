export function buildRetellAgentFilter(agentIds: string | string[]) {
  const ids = (Array.isArray(agentIds) ? agentIds : [agentIds]).filter(Boolean);
  return ids.map((agent_id) => ({ agent_id }));
}

export function buildRetellNumberFilter(value: number) {
  return { op: 'ge', type: 'number', value };
}

export function buildRetellRangeFilter(lower: number, upper: number) {
  return { op: 'bt', type: 'range', value: [lower, upper] };
}

export function buildRetellStartTimestampFilter(args: {
  lower?: number;
  upper?: number;
}) {
  const hasLower = Number.isFinite(args.lower);
  const hasUpper = Number.isFinite(args.upper);
  if (hasLower && hasUpper) return buildRetellRangeFilter(args.lower as number, args.upper as number);
  if (hasLower) return buildRetellNumberFilter(args.lower as number);
  if (hasUpper) return { op: 'le', type: 'number', value: args.upper as number };
  return undefined;
}

export function buildRetellEnumInFilter(values: unknown) {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  return { op: 'in', type: 'enum', value: values };
}

export function normalizeRetellCallList<T = unknown>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (
    response &&
    typeof response === 'object' &&
    Array.isArray((response as { calls?: unknown }).calls)
  ) {
    return (response as { calls: T[] }).calls;
  }
  return [];
}
