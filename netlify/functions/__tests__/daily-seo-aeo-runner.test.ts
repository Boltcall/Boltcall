import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __dailySeoAeoTest } from '../_shared/daily-seo-aeo';

const runDailySeoAeo = vi.hoisted(() => vi.fn(async () => ({
  status: 'completed',
  run_date: '2026-06-30',
  warnings: [],
  atp_entry_id: 'atp-row',
  daily_seo_run_id: 'run-row',
})));

vi.mock('../_shared/daily-seo-aeo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_shared/daily-seo-aeo')>()),
  runDailySeoAeo,
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: vi.fn(() => ({ from: vi.fn() })),
}));

describe('daily-seo-aeo-runner', () => {
  beforeEach(() => {
    runDailySeoAeo.mockClear();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('rejects unauthenticated public requests', async () => {
    const { testHandler } = await import('../daily-seo-aeo-runner');
    const response = await testHandler({ httpMethod: 'POST', headers: {} } as any, {} as any, {} as any);

    expect(response.statusCode).toBe(401);
    expect(runDailySeoAeo).not.toHaveBeenCalled();
  });

  it('accepts the shared cron secret', async () => {
    const { testHandler } = await import('../daily-seo-aeo-runner');
    const response = await testHandler({
      httpMethod: 'POST',
      headers: { 'x-cron-secret': 'test-cron-secret' },
      body: JSON.stringify({ date: '2026-06-30' }),
    } as any, {} as any, {} as any);

    expect(response.statusCode).toBe(200);
    expect(runDailySeoAeo).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-06-30' }));
  });

  it('accepts Netlify scheduled invocations', async () => {
    const { testHandler } = await import('../daily-seo-aeo-runner');
    const response = await testHandler({
      httpMethod: 'POST',
      headers: { 'x-netlify-event-source': 'schedule' },
      body: '{}',
    } as any, {} as any, {} as any);

    expect(response.statusCode).toBe(200);
  });

  it('rejects malformed JSON without running the job', async () => {
    const { testHandler } = await import('../daily-seo-aeo-runner');
    const response = await testHandler({
      httpMethod: 'POST',
      headers: { 'x-cron-secret': 'test-cron-secret' },
      body: '{bad json',
    } as any, {} as any, {} as any);

    expect(response.statusCode).toBe(400);
    expect(runDailySeoAeo).not.toHaveBeenCalled();
  });
});

describe('AnswerThePublic extraction fallback', () => {
  it('extracts question clusters from unknown response shapes', () => {
    const clusters = __dailySeoAeoTest.clustersFromReport({
      nested: [
        { phrase: 'how fast should plumbers respond to leads?' },
        { phrase: 'why do HVAC businesses miss calls after hours?' },
        { phrase: 'what is the best way to book dental leads automatically?' },
      ],
    });

    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toContain('how fast should plumbers respond to leads?');
  });
});

describe('daily SEO source windows', () => {
  it('uses the last complete 28-day window when daily analytics are empty', () => {
    expect(__dailySeoAeoTest.fallbackWindow('2026-07-01')).toEqual({
      label: 'fallback 2026-06-03 to 2026-06-28',
      startDate: '2026-06-03',
      endDate: '2026-06-28',
    });
  });
});
