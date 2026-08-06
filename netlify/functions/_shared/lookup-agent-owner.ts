// PostgREST .or() filter builder for looking up an agents row by Retell
// agent id.
//
// Direct retell_agent_id column is the primary field. api_keys->>retell_agent_id
// is a legacy JSONB fallback — older rows stored the id inside a JSONB blob
// before the dedicated column existed. Both indexed paths coexist until
// backfill lands, so every caller has to check both.
//
// The Retell agent_id arrives from webhook payloads and untrusted callers.
// Interpolating it raw into a PostgREST or-expression lets a crafted id
// (containing `,` or `)`) escape the current expression and match arbitrary
// rows. Sanitize to the character set Retell actually uses: [A-Za-z0-9_-].
// Anything else can't be a real Retell id anyway, so returning null tells
// the caller to skip the lookup instead of running a malformed query.

export function sanitizeRetellAgentId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
}

export function buildAgentOwnerOrFilter(retellAgentId: string): string {
  const safe = sanitizeRetellAgentId(retellAgentId);
  if (!safe) throw new Error('Invalid retell agent id');
  return `retell_agent_id.eq.${safe},api_keys->>retell_agent_id.eq.${safe}`;
}
