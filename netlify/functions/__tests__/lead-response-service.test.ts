import { describe, expect, it, vi } from 'vitest';
import { handleInboundLead } from '../_shared/lead-response-service';

function makeSupabase(overrides: Record<string, any> = {}) {
  const inserted: any[] = [];
  const events: any[] = [];
  const calls: any[] = [];

  const supabase = {
    from(table: string) {
      if (table === 'leads') {
        return {
          select() {
            const chain: any = {
              eq: () => chain,
              or: () => chain,
              filter: () => chain,
              limit: () => chain,
              maybeSingle: async () => ({ data: overrides.existingLead ?? null, error: null }),
            };
            return chain;
          },
          insert(row: any) {
            inserted.push(row);
            return {
              select() {
                return {
                  single: async () => overrides.insertError
                    ? { data: null, error: overrides.insertError }
                    : { data: { id: 'lead-1', created_at: '2026-05-30T10:00:00.000Z', ...row }, error: null },
                };
              },
            };
          },
        };
      }
      if (table === 'agents') {
        // Chainable mock — production code does
        //   .select(...).eq('user_id',...).eq('status','active').in('agent_type',...).order(...).limit(1).maybeSingle()
        // so we return a single object whose chain methods all return itself
        // and only the terminals (maybeSingle / single) resolve.
        const agentData = overrides.agent ?? { retell_agent_id: 'agent-1', api_keys: {} };
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          in: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: async () => ({ data: agentData, error: null }),
          single: async () => ({ data: agentData, error: null }),
        };
        return chain;
      }
      if (table === 'phone_numbers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: overrides.phone ?? { phone_number: '+15550000000' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'aios_event_log') {
        return {
          insert: async (row: any) => {
            events.push(row);
            return { error: overrides.eventError ?? null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  return { supabase, inserted, events, calls };
}

describe('handleInboundLead', () => {
  it('captures a valid web lead and starts first touch', async () => {
    const h = makeSupabase();
    const fireWebhooks = vi.fn();
    const syncCrm = vi.fn().mockResolvedValue(undefined);
    const retell = { call: { createPhoneCall: vi.fn().mockResolvedValue({ call_id: 'call-1' }) } };

    const result = await handleInboundLead({
      body: { name: 'Jane Doe', email: 'jane@example.com', phone: '+15551112222', source: 'website_form', user_id: 'user-1' },
      source: 'website_form',
    }, {
      supabase: h.supabase as any,
      retellFactory: () => retell as any,
      retellApiKey: 'retell-key',
      fireWebhooks,
      syncCrm,
      now: () => new Date('2026-05-30T10:00:00.000Z'),
    });

    expect(result.status).toBe('captured');
    expect(result.lead_id).toBe('lead-1');
    expect(result.first_touch_status).toBe('started');
    expect(result.retell_call_started).toBe(true);
    expect(fireWebhooks).toHaveBeenCalledWith('user-1', 'new_lead', expect.objectContaining({ id: 'lead-1' }));
    expect(syncCrm).toHaveBeenCalledOnce();
    expect(h.events.map(e => Array.isArray(e) ? e[0].event_type : e.event_type)).toContain('lead_captured');
    expect(retell.call.createPhoneCall).toHaveBeenCalledWith(expect.objectContaining({
      from_number: '+15550000000',
      to_number: '+15551112222',
      agent_id: 'agent-1',
    }));
  });

  it('can return capture immediately while first touch continues in the background', async () => {
    const h = makeSupabase();
    let resolveRetell: (() => void) | undefined;
    const retellStarted = new Promise<void>((resolve) => {
      resolveRetell = resolve;
    });
    const retell = { call: { createPhoneCall: vi.fn(() => retellStarted) } };

    const result = await Promise.race([
      handleInboundLead({
        body: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+15551112222',
          source: 'google_lead_form',
          user_id: 'user-1',
        },
        source: 'google_lead_form',
      }, {
        supabase: h.supabase as any,
        retellFactory: () => retell as any,
        retellApiKey: 'retell-key',
        awaitFirstTouch: false,
      }),
      new Promise((resolve) => setTimeout(() => resolve('timed-out'), 20)),
    ]);

    expect(result).not.toBe('timed-out');
    expect((result as any).status).toBe('captured');
    expect((result as any).first_touch_status).toBe('started');
    expect((result as any).retell_call_started).toBe(true);
    expect(retell.call.createPhoneCall).toHaveBeenCalledOnce();

    resolveRetell?.();
    await retellStarted;
  });

  it('returns the existing lead for a repeated external id without starting first touch again', async () => {
    const h = makeSupabase({
      existingLead: {
        id: 'lead-existing',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '+15551112222',
        source: 'zapier',
        status: 'pending',
        user_id: 'user-1',
        raw_data: { external_id: 'zap-123' },
        created_at: '2026-06-06T10:00:00.000Z',
      },
    });
    const fireWebhooks = vi.fn();
    const syncCrm = vi.fn();
    const retell = { call: { createPhoneCall: vi.fn() } };

    const result = await handleInboundLead({
      body: {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '+15551112222',
        source: 'zapier',
        user_id: 'user-1',
        external_id: 'zap-123',
      },
      source: 'zapier',
    }, {
      supabase: h.supabase as any,
      retellFactory: () => retell as any,
      retellApiKey: 'retell-key',
      fireWebhooks,
      syncCrm,
    });

    expect(result.status).toBe('captured');
    expect(result.lead_id).toBe('lead-existing');
    expect(result.first_touch_status).toBe('skipped');
    expect(result.retell_call_started).toBe(false);
    expect(result.deduped).toBe(true);
    expect(result.warnings).toContain('duplicate_lead');
    expect(h.inserted).toHaveLength(0);
    expect(fireWebhooks).not.toHaveBeenCalled();
    expect(syncCrm).not.toHaveBeenCalled();
    expect(retell.call.createPhoneCall).not.toHaveBeenCalled();
  });

  it('normalizes camelCase idempotency fields into raw_data', async () => {
    const h = makeSupabase();

    const result = await handleInboundLead({
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        user_id: 'user-1',
        externalId: 12345,
        idempotencyKey: 'retry-key-1',
      },
      source: 'make',
    }, { supabase: h.supabase as any });

    expect(result.status).toBe('captured');
    expect(h.inserted[0].raw_data.external_id).toBe(12345);
    expect(h.inserted[0].raw_data.idempotency_key).toBe('retry-key-1');
  });

  it('rejects leads without email or phone', async () => {
    const h = makeSupabase();
    const result = await handleInboundLead({
      body: { name: 'No Contact', user_id: 'user-1' },
      source: 'website_form',
    }, { supabase: h.supabase as any });

    expect(result.status).toBe('rejected');
    expect(result.warnings).toContain('missing_contact');
    expect(h.inserted).toHaveLength(0);
  });

  it('captures lead when Retell is not configured and records a warning', async () => {
    const h = makeSupabase({ agent: null });
    const result = await handleInboundLead({
      body: { name: 'Jane Doe', phone: '+15551112222', user_id: 'user-1' },
      source: 'website_form',
    }, {
      supabase: h.supabase as any,
      retellApiKey: 'retell-key',
    });

    expect(result.status).toBe('captured');
    expect(result.first_touch_status).toBe('skipped');
    expect(result.retell_call_started).toBe(false);
    expect(result.warnings).toContain('missing_agent_or_phone');
  });

  it('does not fail lead capture when Retell call fails', async () => {
    const h = makeSupabase();
    const retell = { call: { createPhoneCall: vi.fn().mockRejectedValue(new Error('retell down')) } };
    const result = await handleInboundLead({
      body: { name: 'Jane Doe', phone: '+15551112222', user_id: 'user-1' },
      source: 'website_form',
    }, {
      supabase: h.supabase as any,
      retellApiKey: 'retell-key',
      retellFactory: () => retell as any,
    });

    expect(result.status).toBe('captured');
    expect(result.first_touch_status).toBe('failed');
    expect(result.warnings).toContain('first_touch_failed');
  });

  it('returns failed when the lead insert fails', async () => {
    const h = makeSupabase({ insertError: { message: 'duplicate key' } });
    const result = await handleInboundLead({
      body: { name: 'Jane Doe', email: 'jane@example.com', user_id: 'user-1' },
      source: 'website_form',
    }, { supabase: h.supabase as any });

    expect(result.status).toBe('failed');
    expect(result.warnings).toContain('insert_failed');
  });
});
