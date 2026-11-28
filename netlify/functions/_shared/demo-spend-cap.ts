/**
 * Global daily cap on demo calls.
 *
 * Per-IP and per-phone limits bound one caller. They do nothing about the
 * aggregate: a botnet, or one determined person behind a few proxies, could
 * keep both public demo endpoints dialling all day. Each demo call is a real
 * Retell call plus Azure OpenAI tokens plus Twilio minutes, so the worst case
 * before this existed was an estimated $10-15k in a single day.
 *
 * One counter, shared by BOTH demo endpoints, so 50 is 50 in total rather
 * than 50 each. Reuses the existing `public_rate_limits` table — the cap is
 * just a bucket with a fixed key and a 24-hour window.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { consumePublicRateLimit, hashRateLimitKey } from './public-rate-limit';

const DAY_SECONDS = 24 * 60 * 60;
const DEFAULT_DAILY_CAP = 50;

/** Raise or lower without a deploy via DEMO_CALLS_DAILY_CAP. */
function dailyCap(): number {
  const raw = Number(process.env.DEMO_CALLS_DAILY_CAP);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_DAILY_CAP;
}

export interface DemoSpendCapResult {
  allowed: boolean;
  statusCode: number;
  retryAfterSeconds?: number;
}

export async function consumeDemoSpendCap(supabase: SupabaseClient): Promise<DemoSpendCapResult> {
  return consumePublicRateLimit(supabase, {
    bucket: 'demo_calls_global_daily',
    // Fixed key on purpose: every caller shares this one counter.
    key: hashRateLimitKey(['global']),
    maxAttempts: dailyCap(),
    windowSeconds: DAY_SECONDS,
  });
}
