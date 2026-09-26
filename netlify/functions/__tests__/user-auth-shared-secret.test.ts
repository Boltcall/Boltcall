import { beforeEach, describe, expect, it } from 'vitest';
import { hasSharedSecret, internalSecretValue } from '../_shared/user-auth';

function eventWithHeader(name: string, value: string) {
  return { headers: { [name]: value } } as any;
}

describe('_shared/user-auth shared-secret checks', () => {
  beforeEach(() => {
    delete process.env.INTERNAL_API_SECRET;
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    delete process.env.CRON_SECRET;
  });

  // F78: hasSharedSecret must reject a mismatched secret and never throw on
  // a length mismatch (crypto.timingSafeEqual throws on unequal buffer
  // lengths if not guarded).
  it('rejects a wrong-length or mismatched x-internal-secret without throwing', () => {
    process.env.INTERNAL_API_SECRET = 'correct-secret-value';
    expect(hasSharedSecret(eventWithHeader('x-internal-secret', 'short'))).toBe(false);
    expect(hasSharedSecret(eventWithHeader('x-internal-secret', 'wrong-secret-value!!'))).toBe(false);
  });

  it('accepts an exact x-internal-secret match', () => {
    process.env.INTERNAL_API_SECRET = 'correct-secret-value';
    expect(hasSharedSecret(eventWithHeader('x-internal-secret', 'correct-secret-value'))).toBe(true);
  });

  // F116: outgoing callers (e.g. whatsapp-webhook.ts) must prefer
  // INTERNAL_API_SECRET but fall back to the legacy INTERNAL_WEBHOOK_SECRET
  // so a prod env with only one of the two names set still works.
  it('internalSecretValue() prefers INTERNAL_API_SECRET and falls back to INTERNAL_WEBHOOK_SECRET', () => {
    process.env.INTERNAL_WEBHOOK_SECRET = 'legacy-secret';
    expect(internalSecretValue()).toBe('legacy-secret');

    process.env.INTERNAL_API_SECRET = 'new-secret';
    expect(internalSecretValue()).toBe('new-secret');
  });
});
