import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildEmails, verifyStandardWebhook } from '../auth-send-email';

const secret = Buffer.from('test-secret-32-bytes-long-000000').toString('base64');
const sign = (id: string, ts: string, body: string) =>
  createHmac('sha256', Buffer.from(secret, 'base64')).update(`${id}.${ts}.${body}`).digest('base64');

describe('auth-send-email', () => {
  it('verifies Standard Webhooks signatures and rejects tampering/stale', () => {
    const body = '{"a":1}';
    const now = 1_800_000_000;
    const h = (sig: string, ts = String(now)) =>
      new Headers({ 'webhook-id': 'msg_1', 'webhook-timestamp': ts, 'webhook-signature': `v1,${sig}` });
    expect(verifyStandardWebhook(body, h(sign('msg_1', String(now), body)), secret, now)).toBe(true);
    expect(verifyStandardWebhook('{"a":2}', h(sign('msg_1', String(now), body)), secret, now)).toBe(false);
    const old = String(now - 3600);
    expect(verifyStandardWebhook(body, h(sign('msg_1', old, body), old), secret, now)).toBe(false);
    expect(verifyStandardWebhook(body, h(sign('msg_1', String(now), body)), '', now)).toBe(false);
  });

  it('builds a signup verify link with redirect', () => {
    const [e] = buildEmails({ email: 'a@x.com' }, { email_action_type: 'signup', token_hash: 'h1', redirect_to: 'https://boltcall.org/auth/callback' }, 'https://p.supabase.co');
    expect(e.to).toBe('a@x.com');
    expect(e.link).toBe('https://p.supabase.co/auth/v1/verify?token=h1&type=signup&redirect_to=https%3A%2F%2Fboltcall.org%2Fauth%2Fcallback');
  });

  it('maps reversed email_change hashes: token_hash_new -> current, token_hash -> new', () => {
    const out = buildEmails({ email: 'old@x.com', new_email: 'new@x.com' }, { email_action_type: 'email_change', token_hash: 'hNew', token_hash_new: 'hCur' }, 'https://p');
    expect(out.map((e) => [e.to, e.link?.match(/token=(\w+)/)?.[1]])).toEqual([['old@x.com', 'hCur'], ['new@x.com', 'hNew']]);
  });
});
