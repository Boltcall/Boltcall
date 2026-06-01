/**
 * V2 Setup wizard CORS — strict allowlist, never wildcard.
 *
 * Why a sibling to `cors.ts`:
 *   The legacy `cors.ts` helper falls open to `*` whenever ALLOWED_ORIGINS is
 *   unset or contains `*`. That's the wrong default for authed setup endpoints
 *   that drive irreversible side effects (Retell agent creation, KB persist).
 *   This module is fail-CLOSED: if no env-derived origin matches the request,
 *   we echo the canonical production origin and the browser will block — and
 *   the handler can additionally choose to 403.
 *
 * Allowlist derivation (at module load):
 *   - process.env.URL                — Netlify canonical prod URL
 *   - process.env.DEPLOY_PRIME_URL   — per-branch deploy preview
 *   - process.env.DEPLOY_URL         — per-deploy unique URL
 *   - process.env.ALLOWED_ORIGINS    — comma-separated extras
 *   - hard-coded prod fallbacks      — boltcall.org + www subdomain
 *   - dev fallbacks (always allowed) — http://localhost:5173, http://localhost:8888
 */

const HARDCODED_PROD = [
  'https://boltcall.org',
  'https://www.boltcall.org',
  'https://boltcall.netlify.app',
];

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8888',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8888',
];

function buildAllowlist(): string[] {
  const extras = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s !== '*'); // never accept wildcard for v2 setup

  const set = new Set<string>([
    ...HARDCODED_PROD,
    ...DEV_ORIGINS,
    ...extras,
  ]);

  if (process.env.URL) set.add(process.env.URL);
  if (process.env.DEPLOY_PRIME_URL) set.add(process.env.DEPLOY_PRIME_URL);
  if (process.env.DEPLOY_URL) set.add(process.env.DEPLOY_URL);

  return Array.from(set);
}

function canonicalProductionOrigin(): string {
  return process.env.URL || 'https://boltcall.org';
}

export interface V2CorsOptions {
  /** Which HTTP methods this endpoint accepts (always appended with `, OPTIONS`). */
  methods?: string;
}

export interface V2CorsResult {
  /** Headers to return on every response (preflight + actual). */
  headers: Record<string, string>;
  /** Whether the request origin matched the allowlist. */
  allowed: boolean;
  /** The origin we ended up echoing (matched origin OR canonical fallback). */
  echoedOrigin: string;
}

/**
 * Build CORS headers for a single request. Call this per-request, not at
 * module load — process.env on Netlify is available at module load but the
 * request origin obviously isn't.
 */
export function getV2CorsHeaders(
  requestOrigin: string | undefined | null,
  options: V2CorsOptions = {},
): V2CorsResult {
  const methods = options.methods || 'GET, POST';
  const allowlist = buildAllowlist();
  const origin = (requestOrigin || '').trim();
  const allowed = !!origin && allowlist.includes(origin);
  const echoedOrigin = allowed ? origin : canonicalProductionOrigin();

  return {
    allowed,
    echoedOrigin,
    headers: {
      'Access-Control-Allow-Origin': echoedOrigin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': `${methods}, OPTIONS`,
      'Vary': 'Origin',
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Pull the request Origin header (case-insensitive). Netlify normalizes
 * headers to lower-case but we check both for defensive consistency.
 */
export function getRequestOrigin(
  headers: Record<string, string | undefined> | undefined,
): string | undefined {
  if (!headers) return undefined;
  return (headers['origin'] || headers['Origin'] || undefined) as string | undefined;
}

/** Test-only: expose the current allowlist for assertions. */
export function __getAllowlistForTesting(): string[] {
  return buildAllowlist();
}
