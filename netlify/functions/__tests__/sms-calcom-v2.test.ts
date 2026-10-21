import { expect, it, vi } from 'vitest';
vi.mock('../_shared/token-utils', () => ({ getServiceSupabase: () => ({ from: () => { const q: any = { select: ()=>q, eq: ()=>q, maybeSingle: async ()=>({data:{api_key:'cal_tenant_test'}}) }; return q; } }) }));
import { getCalcomAvailability } from '../sms-ai-responder';
it('SMS uses the tenant credential, exact event slug and local timezone for v2 slots', async () => {
  vi.stubGlobal('fetch',vi.fn(async (url:any)=>new Response(JSON.stringify({status:'success',data:String(url).includes('/event-types')
    ? [{id:10,slug:'free-consultation'},{id:20,slug:'other'}]
    : {'2026-10-22':[{start:'2026-10-22T06:00:00Z'}]}}))));
  const content=await getCalcomAvailability('free-consultation','test-owner','Asia/Jerusalem');
  expect(content).toContain('9:00 AM');
  expect(content).toContain('Asia/Jerusalem');
  const [url,init]=vi.mocked(fetch).mock.calls[1];
  expect(new URL(String(url)).searchParams.get('eventTypeId')).toBe('10');
  expect(init?.headers).toMatchObject({Authorization:'Bearer cal_tenant_test','cal-api-version':'2024-09-04'});
});
