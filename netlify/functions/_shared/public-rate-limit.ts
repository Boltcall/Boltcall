import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export function getClientIp(headers: Record<string, string | undefined>): string {
  const trustedIp =
    headers['x-nf-client-connection-ip']
    || headers['X-Nf-Client-Connection-Ip']
    || headers['client-ip']
    || headers['Client-Ip'];

  return trustedIp?.trim() || 'unknown';
}

export function hashRateLimitKey(parts: Array<string | undefined | null>): string {
  return createHash('sha256')
    .update(parts.map((part) => (part || '').trim().toLowerCase()).join('|'))
    .digest('hex');
}

interface ConsumePublicRateLimitOptions {
  bucket: string;
  key: string;
  maxAttempts: number;
  windowSeconds: number;
  deniedStatusCode?: number;
  countBlockedAttempts?: boolean;
}

export interface PublicRateLimitResult {
  allowed: boolean;
  statusCode: number;
  retryAfterSeconds?: number;
}

export async function consumePublicRateLimit(
  supabase: SupabaseClient,
  options: ConsumePublicRateLimitOptions,
): Promise<PublicRateLimitResult> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - options.windowSeconds * 1000);

  const { data: existing, error: fetchError } = await supabase
    .from('public_rate_limits')
    .select('id, attempts, window_start')
    .eq('bucket', options.bucket)
    .eq('key', options.key)
    .maybeSingle();

  if (fetchError) {
    console.error('[public-rate-limit] fetch failed:', fetchError.message);
    return { allowed: false, statusCode: 503 };
  }

  if (!existing || new Date(existing.window_start) < cutoff) {
    const { error } = await supabase.from('public_rate_limits').upsert({
      bucket: options.bucket,
      key: options.key,
      attempts: 1,
      window_start: now.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'bucket,key' });

    if (error) {
      console.error('[public-rate-limit] reset failed:', error.message);
      return { allowed: false, statusCode: 503 };
    }
    return { allowed: true, statusCode: 200 };
  }

  if ((existing.attempts || 0) >= options.maxAttempts) {
    if (options.countBlockedAttempts) {
      const { error } = await supabase
        .from('public_rate_limits')
        .update({
          attempts: (existing.attempts || 0) + 1,
          updated_at: now.toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('[public-rate-limit] blocked increment failed:', error.message);
        return { allowed: false, statusCode: 503 };
      }
    }

    const resetAt = new Date(new Date(existing.window_start).getTime() + options.windowSeconds * 1000);
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
    const statusCode = options.deniedStatusCode || 429;
    return {
      allowed: false,
      statusCode,
      ...(statusCode === 429 ? { retryAfterSeconds } : {}),
    };
  }

  const { error } = await supabase
    .from('public_rate_limits')
    .update({
      attempts: (existing.attempts || 0) + 1,
      updated_at: now.toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    console.error('[public-rate-limit] increment failed:', error.message);
    return { allowed: false, statusCode: 503 };
  }

  return { allowed: true, statusCode: 200 };
}
