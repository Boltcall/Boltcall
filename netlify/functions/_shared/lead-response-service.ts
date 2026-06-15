type SupabaseLike = {
  from(table: string): any;
};

export type InboundLeadInput = {
  body: Record<string, any>;
  source?: string;
};

export type LeadResponseOutcome = {
  status: 'captured' | 'rejected' | 'failed';
  lead_id: string | null;
  first_touch_status: 'not_applicable' | 'started' | 'skipped' | 'failed';
  retell_call_started: boolean;
  events_emitted: string[];
  warnings: string[];
  lead?: Record<string, any> | null;
  deduped?: boolean;
};

export type LeadResponseDeps = {
  supabase: SupabaseLike;
  retellApiKey?: string;
  retellFactory?: () => any;
  fireWebhooks?: (userId: string, event: string, payload: Record<string, any>) => void | Promise<void>;
  syncCrm?: (lead: Record<string, any>, userId: string, originalBody: Record<string, any>) => void | Promise<void>;
  awaitFirstTouch?: boolean;
  now?: () => Date;
};

export function normalizeInboundLead(body: Record<string, any> = {}, source?: string): Record<string, any> {
  let firstName = body.first_name || '';
  let lastName = body.last_name || '';
  if (!firstName && !lastName) {
    const fullName = body.name || body.full_name || '';
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  const rawData = { ...body };
  if (rawData.external_id == null && body.externalId != null) rawData.external_id = body.externalId;
  if (rawData.idempotency_key == null && body.idempotencyKey != null) rawData.idempotency_key = body.idempotencyKey;

  const lead: Record<string, any> = {
    first_name: firstName || null,
    last_name: lastName || null,
    email: body.email || null,
    phone: body.phone || body.phone_number || null,
    source: source || body.source || body.source_type || body.acquisition_source || 'website_form',
    status: body.status || 'pending',
    raw_data: rawData,
  };
  if (body.user_id) lead.user_id = body.user_id;
  return lead;
}

function idempotencyValues(body: Record<string, any> = {}): Array<{ field: string; value: string }> {
  const pairs = [
    ['external_id', body.external_id || body.externalId],
    ['idempotency_key', body.idempotency_key || body.idempotencyKey],
  ];

  return pairs
    .filter(([, value]) => value != null && String(value).trim().length > 0)
    .map(([field, value]) => ({ field: String(field), value: String(value).trim() }));
}

async function findExistingIdempotentLead(
  deps: LeadResponseDeps,
  lead: Record<string, any>,
  originalBody: Record<string, any>,
): Promise<Record<string, any> | null> {
  if (!lead.user_id) return null;

  for (const { field, value } of idempotencyValues(originalBody)) {
    try {
      const { data } = await deps.supabase
        .from('leads')
        .select('*')
        .eq('user_id', lead.user_id)
        .filter(`raw_data->>${field}`, 'eq', value)
        .limit(1)
        .maybeSingle();
      if (data?.id) return data;
    } catch {
      // Idempotency lookup should never block lead capture.
    }
  }

  return null;
}

async function emitLifecycleEvent(
  deps: LeadResponseDeps,
  eventType: string,
  lead: Record<string, any> | null,
  payload: Record<string, any>,
  eventsEmitted: string[],
) {
  try {
    await deps.supabase.from('aios_event_log').insert({
      loop_name: 'lead-response',
      event_type: eventType,
      actor: 'lead-response-service',
      subject_id: lead?.id || null,
      channel: payload.source || lead?.source || 'unknown',
      outcome: payload.outcome || 'success',
      payload: {
        lead_id: lead?.id || null,
        user_id: lead?.user_id || payload.user_id || null,
        source: payload.source || lead?.source || null,
        ...payload,
      },
    });
    eventsEmitted.push(eventType);
  } catch {
    // Telemetry must never block lead capture.
  }
}

async function findRetellConfig(deps: LeadResponseDeps, userId: string) {
  // Prefer the dedicated outbound speed-to-lead agent. The inbound receptionist
  // exists for a different purpose (answering calls, not initiating them); its
  // prompt assumes the lead called us, not the other way around. Fall back to
  // any active agent for users who haven't provisioned a speed_to_lead agent yet.
  const SPEED_TO_LEAD_TYPES = ['speed_to_lead', 'outbound_speed_to_lead'];
  const [{ data: preferredAgent }, { data: fallbackAgent }, { data: phoneRow }] = await Promise.all([
    deps.supabase
      .from('agents')
      .select('retell_agent_id, api_keys')
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('agent_type', SPEED_TO_LEAD_TYPES)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    deps.supabase
      .from('agents')
      .select('retell_agent_id, api_keys')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    deps.supabase
      .from('phone_numbers')
      .select('phone_number')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  ]);

  const agentRow = preferredAgent || fallbackAgent;
  return {
    agentId: agentRow?.retell_agent_id || agentRow?.api_keys?.retell_agent_id || null,
    fromNumber: phoneRow?.phone_number || null,
  };
}

async function startFirstTouch(
  deps: LeadResponseDeps,
  lead: Record<string, any>,
  eventsEmitted: string[],
  warnings: string[],
): Promise<LeadResponseOutcome['first_touch_status']> {
  if (!lead.user_id || !lead.phone) return 'not_applicable';
  if (!deps.retellApiKey || !deps.retellFactory) {
    warnings.push('missing_agent_or_phone');
    return 'skipped';
  }

  const { agentId, fromNumber } = await findRetellConfig(deps, lead.user_id);
  if (!agentId || !fromNumber) {
    warnings.push('missing_agent_or_phone');
    return 'skipped';
  }

  const emitStarted = (emitted: string[] = eventsEmitted) =>
    emitLifecycleEvent(deps, 'first_touch_started', lead, { source: lead.source }, emitted);
  const emitFailed = (error: any, emitted: string[] = eventsEmitted) =>
    emitLifecycleEvent(deps, 'first_touch_failed', lead, {
      source: lead.source,
      outcome: 'failure',
      error: error?.message || String(error),
    }, emitted);

  try {
    const retell = deps.retellFactory();
    const callPromise = retell.call.createPhoneCall({
      from_number: fromNumber,
      to_number: lead.phone,
      agent_id: agentId,
      metadata: { source: lead.source, user_id: lead.user_id, lead_id: lead.id },
    });

    if (deps.awaitFirstTouch === false) {
      Promise.resolve(callPromise)
        .then(() => emitStarted([]))
        .catch((error: any) => emitFailed(error, []));
      return 'started';
    }

    await callPromise;
    await emitStarted();
    return 'started';
  } catch (error: any) {
    warnings.push('first_touch_failed');
    await emitFailed(error);
    return 'failed';
  }
}

export async function handleInboundLead(
  input: InboundLeadInput,
  deps: LeadResponseDeps,
): Promise<LeadResponseOutcome> {
  const warnings: string[] = [];
  const eventsEmitted: string[] = [];
  const lead = normalizeInboundLead(input.body || {}, input.source);

  if (!lead.email && !lead.phone) {
    warnings.push('missing_contact');
    return {
      status: 'rejected',
      lead_id: null,
      first_touch_status: 'not_applicable',
      retell_call_started: false,
      events_emitted: eventsEmitted,
      warnings,
      lead: null,
    };
  }

  let insertedLead: Record<string, any> | null = null;
  try {
    const existingLead = await findExistingIdempotentLead(deps, lead, input.body || {});
    if (existingLead) {
      warnings.push('duplicate_lead');
      return {
        status: 'captured',
        lead_id: existingLead.id || null,
        first_touch_status: 'skipped',
        retell_call_started: false,
        events_emitted: eventsEmitted,
        warnings,
        lead: existingLead,
        deduped: true,
      };
    }

    const { data, error } = await deps.supabase
      .from('leads')
      .insert(lead)
      .select()
      .single();
    if (error) {
      warnings.push('insert_failed');
      return {
        status: 'failed',
        lead_id: null,
        first_touch_status: 'not_applicable',
        retell_call_started: false,
        events_emitted: eventsEmitted,
        warnings,
        lead: null,
      };
    }
    insertedLead = data;
  } catch (error) {
    warnings.push('insert_failed');
    return {
      status: 'failed',
      lead_id: null,
      first_touch_status: 'not_applicable',
      retell_call_started: false,
      events_emitted: eventsEmitted,
      warnings,
      lead: null,
    };
  }
  if (!insertedLead) {
    warnings.push('insert_failed');
    return {
      status: 'failed',
      lead_id: null,
      first_touch_status: 'not_applicable',
      retell_call_started: false,
      events_emitted: eventsEmitted,
      warnings,
      lead: null,
    };
  }

  await emitLifecycleEvent(deps, 'lead_captured', insertedLead, {
    source: insertedLead?.source || lead.source,
    user_id: insertedLead?.user_id || lead.user_id || null,
  }, eventsEmitted);

  if (insertedLead?.user_id && deps.fireWebhooks) {
    try {
      await deps.fireWebhooks(insertedLead.user_id, 'new_lead', {
        id: insertedLead.id,
        first_name: insertedLead.first_name,
        last_name: insertedLead.last_name,
        email: insertedLead.email,
        phone: insertedLead.phone,
        source: insertedLead.source,
        status: insertedLead.status,
        created_at: insertedLead.created_at,
        google: insertedLead.source === 'google_lead_form'
          ? {
              lead_id: insertedLead.raw_data?.google_lead_id ?? null,
              form_id: insertedLead.raw_data?.google_form_id ?? null,
              campaign_id: insertedLead.raw_data?.google_campaign_id ?? null,
              adgroup_id: insertedLead.raw_data?.google_adgroup_id ?? null,
              creative_id: insertedLead.raw_data?.google_creative_id ?? null,
              asset_group_id: insertedLead.raw_data?.google_asset_group_id ?? null,
              gcl_id: insertedLead.raw_data?.google_gcl_id ?? null,
              lead_stage: insertedLead.raw_data?.google_lead_stage ?? null,
              lead_submit_time: insertedLead.raw_data?.google_lead_submit_time ?? null,
            }
          : undefined,
      });
    } catch {
      warnings.push('webhook_failed');
    }
  }

  const firstTouchStatus = await startFirstTouch(deps, insertedLead, eventsEmitted, warnings);

  if (insertedLead?.user_id && deps.syncCrm) {
    try {
      await deps.syncCrm(insertedLead, insertedLead.user_id, input.body || {});
    } catch {
      warnings.push('crm_sync_failed');
    }
  }

  return {
    status: 'captured',
    lead_id: insertedLead?.id || null,
    first_touch_status: firstTouchStatus,
    retell_call_started: firstTouchStatus === 'started',
    events_emitted: eventsEmitted,
    warnings,
    lead: insertedLead,
  };
}
