import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  getServiceSupabase: vi.fn(),
  consumePublicRateLimit: vi.fn(),
  notifyInfo: vi.fn(),
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));

vi.mock('../_shared/public-rate-limit', () => ({
  consumePublicRateLimit: mocks.consumePublicRateLimit,
  getClientIp: () => '1.2.3.4',
  hashRateLimitKey: (parts: string[]) => parts.join(':'),
}));

vi.mock('../_shared/notify', () => ({
  notifyInfo: mocks.notifyInfo,
}));

import { testHandler as handler } from '../website-audit-lead';

const VALID = {
  companyName: 'Riverside Family Dental',
  email: 'owner@riversidefamilydental.com',
  url: 'riversidefamilydental.com',
  phone: '(555) 123-4567',
  industry: 'dental',
  monthlyLeads: '10-50',
  avgJobValue: '$2K-$5K',
};

const makeEvent = (body: Record<string, unknown>) =>
  ({ httpMethod: 'POST', headers: {}, queryStringParameters: null, body: JSON.stringify(body) }) as any;

describe('website-audit-lead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insert.mockResolvedValue({ error: null });
    mocks.getServiceSupabase.mockReturnValue({ from: () => ({ insert: mocks.insert }) });
    mocks.consumePublicRateLimit.mockResolvedValue({ allowed: true });
    mocks.notifyInfo.mockResolvedValue(undefined);
  });

  it('persists both qualifier answers on a valid submission', async () => {
    const res = await handler(makeEvent(VALID), {} as any, () => {});

    expect(res.statusCode).toBe(200);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ monthly_leads: '10-50', avg_job_value: '$2K-$5K' }),
    );
  });

  it.each([
    ['monthlyLeads', { ...VALID, monthlyLeads: '900-billion' }],
    ['avgJobValue', { ...VALID, avgJobValue: 'lots' }],
    ['monthlyLeads missing', { ...VALID, monthlyLeads: '' }],
    ['avgJobValue missing', { ...VALID, avgJobValue: '' }],
  ])('rejects %s outside the allowed buckets without writing a row', async (_label, body) => {
    const res = await handler(makeEvent(body), {} as any, () => {});

    expect(res.statusCode).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
