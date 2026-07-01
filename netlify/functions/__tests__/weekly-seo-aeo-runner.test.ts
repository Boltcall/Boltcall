import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __dailySeoAeoTest } from '../_shared/daily-seo-aeo';

const runWeeklySeoAeo = vi.hoisted(() => vi.fn(async () => ({
  status: 'completed',
  run_week_start: '2026-06-24',
  run_week_end: '2026-06-30',
  warnings: [],
  weekly_seo_run_id: 'weekly-run-row',
  summary: '# Weekly SEO + AEO queue',
})));

vi.mock('../_shared/daily-seo-aeo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_shared/daily-seo-aeo')>()),
  runWeeklySeoAeo,
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: vi.fn(() => ({ from: vi.fn() })),
}));

describe('weekly-seo-aeo-runner', () => {
  beforeEach(() => {
    runWeeklySeoAeo.mockClear();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('rejects unauthenticated public requests', async () => {
    const { testHandler } = await import('../weekly-seo-aeo-runner');
    const response = await testHandler({ httpMethod: 'POST', headers: {} } as any, {} as any, {} as any);

    expect(response.statusCode).toBe(401);
    expect(runWeeklySeoAeo).not.toHaveBeenCalled();
  });

  it('accepts the shared cron secret', async () => {
    const { testHandler } = await import('../weekly-seo-aeo-runner');
    const response = await testHandler({
      httpMethod: 'POST',
      headers: { 'x-cron-secret': 'test-cron-secret' },
      body: JSON.stringify({ date: '2026-06-30' }),
    } as any, {} as any, {} as any);

    expect(response.statusCode).toBe(200);
    expect(runWeeklySeoAeo).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-06-30' }));
  });
});

describe('weekly SEO source windows', () => {
  it('uses a 7-day complete window ending on the requested date', () => {
    expect(__dailySeoAeoTest.weeklyWindow('2026-07-01')).toEqual({
      label: '2026-06-25 to 2026-07-01',
      startDate: '2026-06-25',
      endDate: '2026-07-01',
    });
  });
});
