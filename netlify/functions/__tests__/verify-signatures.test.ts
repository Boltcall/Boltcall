import { createHmac } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyRetellSignature } from '../_shared/verify-signatures';

function retellSignature(rawBody: string, apiKey: string, timestamp: number): string {
  const digest = createHmac('sha256', apiKey).update(`${rawBody}${timestamp}`).digest('hex');
  return `v=${timestamp},d=${digest}`;
}

describe('Retell signature verification', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('accepts Retell signed timestamp headers over the raw body plus timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T20:00:00.000Z'));
    vi.stubEnv('RETELL_API_KEY', 'retell-secret');

    const rawBody = JSON.stringify({ event: 'call_ended', call: { call_id: 'call_123' } });
    const signature = retellSignature(rawBody, 'retell-secret', Date.now());

    expect(verifyRetellSignature(rawBody, { 'x-retell-signature': signature })).toBe('valid');
  });

  it('rejects Retell signatures outside the five-minute replay window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T20:00:00.000Z'));
    vi.stubEnv('RETELL_API_KEY', 'retell-secret');

    const rawBody = JSON.stringify({ event: 'call_ended', call: { call_id: 'call_123' } });
    const staleTimestamp = Date.now() - 5 * 60 * 1000 - 1;
    const signature = retellSignature(rawBody, 'retell-secret', staleTimestamp);

    expect(verifyRetellSignature(rawBody, { 'X-Retell-Signature': signature })).toBe('invalid');
  });
});
