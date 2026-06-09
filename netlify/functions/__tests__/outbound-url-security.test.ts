import { describe, expect, it } from 'vitest';
import { validateOutboundHttpsUrl, validatePublicHttpUrl } from '../_shared/outbound-url';

describe('outbound URL validation', () => {
  it('keeps webhook targets HTTPS-only', async () => {
    await expect(validateOutboundHttpsUrl('http://example.com/webhook')).resolves.toEqual({
      ok: false,
      error: 'Webhook URL must use https',
    });
  });

  it('blocks private network targets for public scrape URLs', async () => {
    await expect(validatePublicHttpUrl('http://127.0.0.1:54321', { allowHttp: true, label: 'Scrape URL' })).resolves.toEqual({
      ok: false,
      error: 'Scrape URL cannot target private network addresses',
    });
  });

  it('blocks IPv6 loopback targets for public scrape URLs', async () => {
    await expect(validatePublicHttpUrl('http://[::1]:54321', { allowHttp: true, label: 'Scrape URL' })).resolves.toEqual({
      ok: false,
      error: 'Scrape URL cannot target private network addresses',
    });
  });

  it('blocks carrier-grade NAT targets for public scrape URLs', async () => {
    await expect(validatePublicHttpUrl('http://100.64.0.1', { allowHttp: true, label: 'Scrape URL' })).resolves.toEqual({
      ok: false,
      error: 'Scrape URL cannot target private network addresses',
    });
  });

  it('blocks credentialed outbound URLs', async () => {
    await expect(validatePublicHttpUrl('https://user:pass@example.com', { label: 'Scrape URL' })).resolves.toEqual({
      ok: false,
      error: 'Scrape URL cannot include credentials',
    });
  });
});
