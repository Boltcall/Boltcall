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
  if (
    response &&
    typeof response === 'object' &&
    Array.isArray((response as { items?: unknown }).items)
  ) {
    return (response as { items: T[] }).items;
  }
  return [];
}

export async function listRetellVoiceAgents<T = unknown>(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<T[]> {
  const agents: T[] = [];
  let pagination_key: string | undefined;

  do {
    const body: Record<string, unknown> = {
      limit: 100,
      filter_criteria: { channel: { type: 'string', op: 'eq', value: 'voice' } },
    };
    if (pagination_key) body.pagination_key = pagination_key;

    const response = await fetchImpl('https://api.retellai.com/v2/list-agents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload?.error_message || payload?.message || `HTTP ${response.status}`;
      throw new Error(`Retell list agents failed: ${detail}`);
    }

    const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
    agents.push(...items);
    pagination_key = payload?.has_more ? payload?.pagination_key : undefined;
  } while (pagination_key);

  return agents;
}
