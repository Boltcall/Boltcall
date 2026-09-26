import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleInboundLead } from '../_shared/lead-response-service';

// Minimal thenable query builder: every filter returns the builder, awaiting it
// (or maybeSingle/single) resolves to the table's canned result.
function makeSupabase(opts: { recentLeads?: any[]; prefs?: any } = {}) {
  const writes: Record<string, any[]> = { leads: [], scheduled_messages: [] };
  const read = (table: string) => {
    if (table === 'leads') return { data: opts.recentLeads ?? [], error: null };
    if (table === 'agents') return { data: { retell_agent_id: 'agent-1', api_keys: {} }, error: null };
    if (table === 'phone_numbers') return { data: { phone_number: '+15550000000' }, error: null };
    if (table === 'sms_settings') return { data: { business_timezone: 'America/New_York' }, error: null };
    if (table === 'notification_preferences') return { data: opts.prefs ?? null, error: null };
    return { data: null, error: null };
  };
  const supabase = {
    from(table: string) {
      const q: any = {};
      for (const m of ['select', 'eq', 'in', 'or', 'filter', 'gte', 'order', 'limit']) q[m] = () => q;
      q.maybeSingle = async () => (table === 'leads' ? { data: null, error: null } : read(table));
      q.then = (resolve: any) => resolve(read(table));
      q.insert = (row: any) => {
        (writes[table] ||= []).push(row);
        const res = { data: { id: 'lead-new', ...row }, error: null };
        return { select: () => ({ single: async () => res }), then: (resolve: any) => resolve({ error: null }) };
      };
      return q;
    },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'owner@firm.example' } } }) } },
  };
  return { supabase, writes };
}

const NOON_ET = () => new Date('2026-07-11T16:00:00Z');
const ELEVEN_PM_ET = () => new Date('2026-07-12T03:00:00Z');
const lead = { name: 'Jane Client', phone: '(555) 111-2222', email: 'jane@example.com', user_id: 'user-1' };

describe('first touch gates', () => {
  let retell: any;
  beforeEach(() => {
    retell = { call: { createPhoneCall: vi.fn().mockResolvedValue({ call_id: 'c1' }) } };
    process.env.BREVO_API_KEY = 'test-brevo';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
  });
  afterEach(() => {
    delete process.env.BREVO_API_KEY;
    vi.unstubAllGlobals();
  });
  const deps = (supabase: any, now: () => Date) =>
    ({ supabase, retellApiKey: 'k', retellFactory: () => retell, now }) as any;

  it('defers the AI call during quiet hours instead of dialing at 11pm', async () => {
    const h = makeSupabase();
    const out = await handleInboundLead({ body: lead, source: 'website_form' }, deps(h.supabase, ELEVEN_PM_ET));
    expect(retell.call.createPhoneCall).not.toHaveBeenCalled();
    expect(out.first_touch_status).toBe('deferred');
    expect(out.warnings).toContain('quiet_hours_deferred');
    expect(h.writes.scheduled_messages[0]).toMatchObject({
      channel: 'call',
      recipient_phone: '(555) 111-2222',
      scheduled_for: '2026-07-12T12:00:00.000Z', // 08:00 EDT
      metadata: expect.objectContaining({ agent_id: 'agent-1', lead_id: 'lead-new' }),
    });
  });

  it('calls immediately inside allowed hours', async () => {
    const h = makeSupabase();
    const out = await handleInboundLead({ body: lead, source: 'website_form' }, deps(h.supabase, NOON_ET));
    expect(out.first_touch_status).toBe('started');
    expect(retell.call.createPhoneCall).toHaveBeenCalledOnce();
  });

  it('records a second touch from the same phone within 24h but does not call again', async () => {
    const h = makeSupabase({ recentLeads: [{ phone: '+15551112222', email: null }] });
    const out = await handleInboundLead({ body: lead, source: 'callrail' }, deps(h.supabase, NOON_ET));
    expect(out.status).toBe('captured');
    expect(h.writes.leads).toHaveLength(1);
    expect(out.first_touch_status).toBe('skipped');
    expect(out.warnings).toContain('recent_contact_no_second_call');
    expect(retell.call.createPhoneCall).not.toHaveBeenCalled();
  });

  it('emails the owner about every new lead, defaulting to the account email', async () => {
    const h = makeSupabase();
    await handleInboundLead({ body: lead, source: 'website_form' }, deps(h.supabase, NOON_ET));
    const [url, init] = vi.mocked(fetch).mock.calls[0] as any;
    expect(url).toContain('api.brevo.com');
    const body = JSON.parse(init.body);
    expect(body.to).toEqual([{ email: 'owner@firm.example' }]);
    expect(body.subject).toBe('New lead: Jane Client');
    expect(body.textContent).toContain('Boltcall is calling them now.');
  });

  it('respects a new-lead alert that the owner switched off', async () => {
    const h = makeSupabase({ prefs: { new_lead: false, email_notifications: true } });
    const out = await handleInboundLead({ body: lead, source: 'website_form' }, deps(h.supabase, NOON_ET));
    expect(fetch).not.toHaveBeenCalled();
    expect(out.warnings).toContain('owner_alert_not_sent');
  });
});
