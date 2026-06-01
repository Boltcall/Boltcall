/**
 * Secret redaction — strip API-key-shaped tokens out of strings before they
 * land in persisted state, LLM prompts, or event payloads.
 *
 * Used by the V2 conversational setup wizard to keep user-typed (and LLM-
 * echoed) secrets out of `workspaces.v2_setup_state.conversation[]` and
 * `extracted.*` jsonb columns. Defense-in-depth backstop is the DB trigger
 * `workspaces_v2_setup_state_reject_secrets` (migration
 * 20260603000001_v2_setup_state_secret_guard.sql).
 *
 * Patterns intentionally err on the side of false positives — losing a stray
 * "secret_foo" mention in a conversation is fine; persisting a real Stripe
 * key is not.
 */

export interface SecretPattern {
  name: string;
  re: RegExp;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  { name: 'stripe_live_secret',   re: /\bsk_live_[A-Za-z0-9]{16,}\b/g },
  { name: 'stripe_test_secret',   re: /\bsk_test_[A-Za-z0-9]{16,}\b/g },
  { name: 'stripe_live_pub',      re: /\bpk_live_[A-Za-z0-9]{16,}\b/g },
  { name: 'meta_access_token',    re: /\bEAA[A-Za-z0-9]{20,}\b/g },
  { name: 'openai_key',           re: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: 'anthropic_key',        re: /\bsk-ant-[A-Za-z0-9_\-]{20,}\b/g },
  { name: 'generic_secret_prefix',re: /\bsecret_[A-Za-z0-9_\-]{12,}\b/gi },
  { name: 'aws_access_key',       re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'github_token',         re: /\bghp_[A-Za-z0-9]{30,}\b/g },
  { name: 'jwt_like',             re: /\beyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\b/g },
  { name: 'authorization_header', re: /\b[Aa]uthorization\s*:\s*Bearer\s+[A-Za-z0-9_\-\.]{20,}/g },
  { name: 'bearer_token',         re: /\bBearer\s+[A-Za-z0-9_\-\.]{20,}\b/g },
  { name: 'retell_key',           re: /\bkey_[A-Za-z0-9]{20,}\b/g },
  { name: 'twilio_account_sid',   re: /\bAC[a-f0-9]{32}\b/g },
  // Generic "looks like an API key": 40+ hex characters in a row
  { name: 'long_hex_token',       re: /\b[a-fA-F0-9]{40,}\b/g },
  // Generic "looks like a base64-ish API key": 40+ chars [A-Za-z0-9_-] with both letters and digits
  { name: 'long_b64_token',       re: /\b(?=[A-Za-z0-9_\-]{40,}\b)(?=[A-Za-z0-9_\-]*[A-Za-z])(?=[A-Za-z0-9_\-]*[0-9])[A-Za-z0-9_\-]+\b/g },
];

export interface RedactResult {
  redacted: string;
  hits: string[];
}

/**
 * Replace any matched secret patterns with `[REDACTED]`. Returns the redacted
 * string AND a deduped list of pattern names that matched (NEVER the original
 * value — callers must not log or persist the original).
 */
export function redactSecrets(input: string): RedactResult {
  if (!input || typeof input !== 'string') return { redacted: input, hits: [] };
  let out = input;
  const hits: string[] = [];
  for (const { name, re } of SECRET_PATTERNS) {
    // RegExp with /g is stateful — re-compile per call to avoid lastIndex
    // bugs across invocations
    const fresh = new RegExp(re.source, re.flags);
    if (fresh.test(out)) {
      hits.push(name);
      out = out.replace(new RegExp(re.source, re.flags), '[REDACTED]');
    }
  }
  // dedupe in case the same pattern fires more than once
  return { redacted: out, hits: Array.from(new Set(hits)) };
}

/**
 * Recursively redact every string-valued field in an object. Arrays + nested
 * objects walked depth-first. Non-string primitives passed through untouched.
 * Returns the cleaned object and the union of pattern names that fired.
 */
export function redactSecretsDeep<T>(input: T): { value: T; hits: string[] } {
  const allHits = new Set<string>();
  function walk(v: unknown): unknown {
    if (typeof v === 'string') {
      const { redacted, hits } = redactSecrets(v);
      hits.forEach((h) => allHits.add(h));
      return redacted;
    }
    if (Array.isArray(v)) {
      return v.map(walk);
    }
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) {
        out[k] = walk(val);
      }
      return out;
    }
    return v;
  }
  return { value: walk(input) as T, hits: Array.from(allHits) };
}
