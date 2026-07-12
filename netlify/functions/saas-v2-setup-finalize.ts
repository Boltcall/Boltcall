import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * V2 conversational setup wizard — finalize / deploy endpoint.
 *
 * POST { conversation_id, confirm: true } → { agent_id, kb_entries_created,
 *   voice_id, redirect_to: '/v2' }
 *
 * Reads the drafted artifacts from workspaces.v2_setup_state, then:
 *   1. Upserts the business_profile row for this workspace.
 *   2. Calls retell-agents.action=create_full TWICE — inbound + speed_to_lead,
 *      sharing kb_folder_id between them (mirrors V1 Setup.tsx behavior).
 *   3. Calls setup-launch to flip workspace.setup_completed=true and
 *      agents.is_active=true.
 *   4. Marks workspaces.v2_setup_status='completed', clears v2_setup_state.
 *   5. Emits saas_v2_setup_completed.
 *
 * Auth: bearer JWT → workspace_id resolved server-side. NEVER trusts body.
 */

import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
import { ensureWorkspaceForUser } from './_shared/setup-workspace';

interface ExtractedDraft {
  businessName?: string;
  websiteUrl?: string;
  industry?: string;
  country?: string;
  city?: string;
  state?: string;
  addressLine1?: string;
  postalCode?: string;
  businessPhone?: string;
  openingHours?: Record<string, { open?: string; close?: string; closed?: boolean }>;
  languages?: string[];
  serviceAreas?: string[];
  services?: Array<{ name: string; duration: number; price: number }>;
  faqs?: Array<{ question: string; answer: string }>;
  policies?: { cancellation?: string; reschedule?: string; deposit?: string } | null;
  agentConfig?: {
    agentName?: string;
    voiceId?: string;
    tone?: string;
    transferNumber?: string;
  };
  callFlow?: Record<string, unknown>;
}

async function emitEvent(type: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const supa = getServiceSupabase();
    await supa.from('aios_event_log').insert({ event_type: type, payload, source: 'saas-v2-setup' });
  } catch {
    /* swallow */
  }
}

const handler: Handler = async (event) => {
  const cors = getV2CorsHeaders(getRequestOrigin(event.headers as Record<string, string>), { methods: 'POST' });
  const headers = cors.headers;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Defense-in-depth: if Origin header was set but didn't match the allowlist,
  // refuse — finalize creates Retell agents and runs billable provisioning.
  const requestOrigin = getRequestOrigin(event.headers as Record<string, string>);
  if (requestOrigin && !cors.allowed) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing bearer token' }) };
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }
  const userId = userResult.user.id;

  // ── Body ────────────────────────────────────────────────────────────────
  let body: { conversation_id?: string; confirm?: boolean; expected_state_version?: number };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  if (!body.confirm) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'confirm must be true' }) };
  }
  if (!body.conversation_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'conversation_id is required' }) };
  }
  if (typeof body.expected_state_version !== 'number') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'expected_state_version is required' }) };
  }

  // ── Resolve workspace via user_id then owner_id ─────────────────────────
  const ws = await ensureWorkspaceForUser<{
    id: string;
    name?: string | null;
    v2_setup_state?: { extracted?: ExtractedDraft; conversation?: unknown[] } | null;
    v2_setup_state_version?: number | null;
    v2_setup_conversation_id?: string | null;
    v2_setup_started_at?: string | null;
    v2_setup_status?: string | null;
  }>(
    userId,
    'id, name, v2_setup_state, v2_setup_state_version, v2_setup_conversation_id, v2_setup_started_at, v2_setup_status',
  );
  if (!ws) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'No workspace found' }) };
  }

  const workspaceId = ws.id;

  // ── Version pinning — refuse to deploy a stale review ───────────────────
  const currentConvoId = ws.v2_setup_conversation_id || null;
  const currentVersion = ws.v2_setup_state_version ?? 0;
  if (currentConvoId !== body.conversation_id) {
    emitEvent('saas_v2_setup_finalize_version_mismatch', {
      workspace_id: workspaceId,
      reason: 'conversation_drift',
      expected_conversation_id: body.conversation_id,
      actual_conversation_id: currentConvoId,
    }).catch(() => {});
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: 'Conversation drifted — refresh and re-confirm the latest draft.',
        code: 'state_drift',
      }),
    };
  }
  if (currentVersion !== body.expected_state_version) {
    emitEvent('saas_v2_setup_finalize_version_mismatch', {
      workspace_id: workspaceId,
      reason: 'state_drift',
      expected_version: body.expected_state_version,
      actual_version: currentVersion,
    }).catch(() => {});
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: 'Setup state has changed since you reviewed it — refresh and re-confirm.',
        code: 'state_drift',
      }),
    };
  }
  const state = ws.v2_setup_state || null;
  const extracted: ExtractedDraft = state?.extracted || {};

  if (!extracted.businessName) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing businessName in wizard state' }) };
  }
  if (!extracted.industry) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing industry in wizard state' }) };
  }

  // ── Compare-and-set lock — atomically flip status to 'deploying' ────────
  // The version + conversation check above passed, but two concurrent finalize
  // POSTs can both pass it (TOCTOU). Without this CAS, both would call Retell
  // create_full TWICE each (2× billable inbound + 2× speed_to_lead agents per
  // race). This UPDATE only matches the row when v2_setup_state_version still
  // equals what we read AND status is still in the pre-deploy state
  // ('in_progress' from the conversation handler, or 'not_started' for a
  // direct API caller). Exactly one of two concurrent finalize calls will
  // match → the other gets 0 rows and returns 409.
  const currentStatus = ws.v2_setup_status || 'not_started';
  if (currentStatus === 'completed' || currentStatus === 'deploying') {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error:
          currentStatus === 'completed'
            ? 'Setup already completed for this workspace.'
            : 'Another deploy is already in flight for this workspace.',
        code: currentStatus === 'completed' ? 'already_completed' : 'deploy_in_flight',
      }),
    };
  }

  {
    const { data: locked, error: lockErr } = await supa
      .from('workspaces')
      .update({
        v2_setup_status: 'deploying',
        v2_setup_state_version: currentVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)
      .eq('v2_setup_state_version', currentVersion)
      .eq('v2_setup_status', currentStatus)
      .select();
    if (lockErr) {
      console.error('[finalize] CAS lock query failed:', lockErr);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lock acquisition failed' }) };
    }
    if (!locked || locked.length === 0) {
      emitEvent('saas_v2_setup_finalize_concurrent', {
        workspace_id: workspaceId,
        reason: 'cas_miss',
        expected_version: currentVersion,
        expected_status: currentStatus,
      }).catch(() => {});
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'Another deploy is already in flight for this workspace.',
          code: 'deploy_in_flight',
        }),
      };
    }
  }

  // Helper: best-effort revert status → original on Retell failure so the user
  // can retry. Never throws — failure to revert just leaves the row in 'deploying'
  // until the next admin sweep.
  const revertStatusOnFailure = async (): Promise<void> => {
    try {
      await supa
        .from('workspaces')
        .update({
          v2_setup_status: currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspaceId)
        .eq('v2_setup_status', 'deploying');
    } catch (e) {
      console.error('[finalize] status revert (deploying→' + currentStatus + ') failed:', e);
    }
  };

  const businessName = extracted.businessName;
  const industry = extracted.industry.toLowerCase();
  const country = extracted.country || 'us';
  const languages = extracted.languages?.length ? extracted.languages : ['en'];
  const voiceId = extracted.agentConfig?.voiceId || '11labs-Adrian';
  const transferNumber = extracted.agentConfig?.transferNumber || '';
  const agentName = extracted.agentConfig?.agentName || `${businessName} AI Receptionist`;

  // ── Upsert business_profile (idempotent via user_id) ────────────────────
  let businessProfileId: string | null = null;
  try {
    const { data: existingBp } = await supa
      .from('business_profiles')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1)
      .maybeSingle();

    const bpRow = {
      user_id: userId,
      workspace_id: workspaceId,
      business_name: businessName,
      main_category: industry,
      country,
      website_url: extracted.websiteUrl || null,
      service_areas: extracted.serviceAreas || [],
      opening_hours: extracted.openingHours || {},
      languages,
      updated_at: new Date().toISOString(),
    };

    if (existingBp?.id) {
      const { error: updErr } = await supa
        .from('business_profiles')
        .update(bpRow)
        .eq('id', existingBp.id);
      if (updErr) console.error('[finalize] business_profile update failed:', updErr);
      businessProfileId = existingBp.id;
    } else {
      const { data: inserted, error: insErr } = await supa
        .from('business_profiles')
        .insert(bpRow)
        .select('id')
        .single();
      if (insErr) {
        console.error('[finalize] business_profile insert failed:', insErr);
      } else {
        businessProfileId = inserted?.id || null;
      }
    }
  } catch (e) {
    console.error('[finalize] business_profile upsert error:', e);
  }

  // ── Create primary location (best-effort) ───────────────────────────────
  if (businessProfileId && (extracted.addressLine1 || extracted.city || extracted.businessPhone)) {
    try {
      await supa.from('locations').insert({
        business_profile_id: businessProfileId,
        user_id: userId,
        workspace_id: workspaceId,
        name: businessName,
        slug: null,
        phone: extracted.businessPhone || null,
        email: null,
        address_line1: extracted.addressLine1 || null,
        address_line2: null,
        city: extracted.city || null,
        state: extracted.state || null,
        postal_code: extracted.postalCode || null,
        country: country || null,
        timezone: 'America/New_York',
        is_primary: true,
        is_active: true,
      });
    } catch (e) {
      console.error('[finalize] primary location insert failed (non-blocking):', e);
    }
  }

  // ── Helper: call retell-agents create_full via server-to-server ─────────
  const base =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    'http://localhost:8888';

  const buildKbTexts = () => {
    const texts: Array<{ title: string; text: string }> = [
      {
        title: 'Business Information',
        text: `Business: ${businessName}
Category: ${industry}
Country: ${country}
Service Areas: ${(extracted.serviceAreas || []).join(', ') || 'Not specified'}
Languages: ${languages.join(', ')}${extracted.businessPhone ? `\nPhone: ${extracted.businessPhone}` : ''}${extracted.city ? `\nLocation: ${extracted.city}${extracted.state ? `, ${extracted.state}` : ''}` : ''}

Opening Hours:
${extracted.openingHours ? Object.entries(extracted.openingHours).map(([day, h]) => h.closed ? `${day}: Closed` : `${day}: ${h.open || '?'} - ${h.close || '?'}`).join('\n') : 'Not specified'}`,
      },
    ];
    if (extracted.services?.length) {
      texts.push({
        title: 'Services Offered',
        text: extracted.services
          .map((s) => `- ${s.name}: ${s.duration} minutes, $${s.price}`)
          .join('\n'),
      });
    }
    if (extracted.faqs?.length) {
      texts.push({
        title: 'Frequently Asked Questions',
        text: extracted.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n'),
      });
    }
    if (extracted.policies && (extracted.policies.cancellation || extracted.policies.reschedule || extracted.policies.deposit)) {
      texts.push({
        title: 'Business Policies',
        text: `${extracted.policies.cancellation ? `Cancellation: ${extracted.policies.cancellation}\n` : ''}${extracted.policies.reschedule ? `Reschedule: ${extracted.policies.reschedule}\n` : ''}${extracted.policies.deposit ? `Deposit: ${extracted.policies.deposit}` : ''}`,
      });
    }
    return texts;
  };

  const buildPromptConfig = (agentType: 'inbound' | 'speed_to_lead', name: string) => ({
    agentType,
    agentName: name,
    businessProfile: {
      businessName,
      mainCategory: industry,
      country,
      serviceAreas: extracted.serviceAreas || [],
      openingHours: extracted.openingHours || {},
      languages: languages.join(', '),
      websiteUrl: extracted.websiteUrl,
      businessPhone: extracted.businessPhone,
      city: extracted.city,
      state: extracted.state,
    },
    callFlow: extracted.callFlow,
    knowledgeBase: {
      services: extracted.services || [],
      faqs: extracted.faqs || [],
      policies: extracted.policies || undefined,
    },
    transferNumber,
  });

  const callRetellCreateFull = async (
    agentType: 'inbound' | 'speed_to_lead',
    name: string,
    sharedKbFolderId: string | null,
  ): Promise<{ ok: boolean; agent_id?: string; kb_folder_id?: string; error?: string }> => {
    try {
      const res = await fetch(`${base}/.netlify/functions/retell-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'create_full',
          business_name: businessName,
          website_url: extracted.websiteUrl,
          country,
          language: languages.includes('en') ? 'en-US' : languages[0] || 'en-US',
          knowledge_base_texts: buildKbTexts(),
          prompt_config: buildPromptConfig(agentType, name),
          user_id: userId,
          business_profile_id: businessProfileId,
          agent_type: agentType,
          agent_name: name,
          voice_id: voiceId,
          transfer_number: transferNumber,
          kb_folder_id: sharedKbFolderId,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        return { ok: false, error: `retell-agents ${res.status}: ${errBody.slice(0, 200)}` };
      }
      const data = await res.json();
      return {
        ok: true,
        agent_id: data.agent_id,
        kb_folder_id: data.kb_folder_id,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
    }
  };

  // ── Create inbound agent ────────────────────────────────────────────────
  const inboundResult = await callRetellCreateFull('inbound', agentName, null);
  if (!inboundResult.ok) {
    // Retell failed — release the deploy lock so the user can retry.
    await revertStatusOnFailure();
    emitEvent('saas_v2_setup_abandoned', {
      workspace_id: workspaceId,
      last_step: 'deploying',
      turns_completed: (state?.conversation as unknown[] | undefined)?.length || 0,
      reason: 'error',
    }).catch(() => {});
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'Inbound agent creation failed',
        details: inboundResult.error,
        recovery: 'Retry, or use the classic setup at /setup/classic',
      }),
    };
  }

  // ── Create speed-to-lead agent (shared kb folder, best-effort) ─────────
  const speedToLeadName = `${businessName} Follow-Up Agent`;
  const stlResult = await callRetellCreateFull('speed_to_lead', speedToLeadName, inboundResult.kb_folder_id || null);
  if (!stlResult.ok) {
    await revertStatusOnFailure();
    emitEvent('saas_v2_setup_abandoned', {
      workspace_id: workspaceId,
      last_step: 'deploying',
      turns_completed: (state?.conversation as unknown[] | undefined)?.length || 0,
      reason: 'error',
    }).catch(() => {});
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'Speed-to-lead agent creation failed',
        details: stlResult.error,
        recovery: 'Retry, or use the classic setup at /setup/classic',
      }),
    };
  }

  // ── Launch (flip agents.is_active=true + workspace.setup_completed) ────
  try {
    const launchRes = await fetch(`${base}/.netlify/functions/setup-launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workspaceId, isEnabled: true }),
    });
    if (!launchRes.ok) {
      const details = await launchRes.text().catch(() => '');
      await revertStatusOnFailure();
      emitEvent('saas_v2_setup_abandoned', {
        workspace_id: workspaceId,
        last_step: 'deploying',
        turns_completed: (state?.conversation as unknown[] | undefined)?.length || 0,
        reason: 'error',
      }).catch(() => {});
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'Setup activation failed',
          details: details || `setup-launch ${launchRes.status}`,
          recovery: 'Retry, or use the classic setup at /setup/classic',
        }),
      };
    }
  } catch (e) {
    await revertStatusOnFailure();
    emitEvent('saas_v2_setup_abandoned', {
      workspace_id: workspaceId,
      last_step: 'deploying',
      turns_completed: (state?.conversation as unknown[] | undefined)?.length || 0,
      reason: 'error',
    }).catch(() => {});
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'Setup activation failed',
        details: e instanceof Error ? e.message : 'Unknown setup-launch error',
        recovery: 'Retry, or use the classic setup at /setup/classic',
      }),
    };
  }

  // ── Mark workspace as v2-completed ──────────────────────────────────────
  // Filter on status='deploying' so we only flip the lock we acquired — if a
  // human/admin already reverted us, we leave their decision intact.
  const startedAt = ws.v2_setup_started_at ? new Date(ws.v2_setup_started_at) : new Date();
  const durationSec = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  try {
    await supa
      .from('workspaces')
      .update({
        v2_setup_status: 'completed',
        v2_setup_completed_at: new Date().toISOString(),
        v2_setup_state: null,
        v2_setup_state_version: currentVersion + 2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)
      .eq('v2_setup_status', 'deploying');
  } catch (e) {
    console.error('[finalize] workspace status update failed:', e);
  }

  emitEvent('saas_v2_setup_completed', {
    workspace_id: workspaceId,
    business_profile_id: businessProfileId,
    retell_agent_id_inbound: inboundResult.agent_id,
    retell_agent_id_speed_to_lead: stlResult.agent_id,
    total_turns: (state?.conversation as unknown[] | undefined)?.length || 0,
    total_duration_seconds: durationSec,
  }).catch(() => {});

  const kbEntries = buildKbTexts().length;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      agent_id: inboundResult.agent_id,
      kb_folder_id: inboundResult.kb_folder_id,
      speed_to_lead_agent_id: stlResult.agent_id,
      kb_entries_created: kbEntries,
      voice_id: voiceId,
      duration_seconds: durationSec,
      redirect_to: '/v2',
    }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
