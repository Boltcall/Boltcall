import { Handler } from '@netlify/functions';
import { notifyError } from './_shared/notify';
import { getSupabase } from './_shared/token-utils';
import { fireWebhooks } from './_shared/fire-webhooks';
import { verifyRetellSignature } from './_shared/verify-signatures';

/**
 * Retell Post-Call Webhook
 *
 * Receives Retell's post-call webhook events after every call ends.
 *
 * Two pipelines:
 *   A) Missed-call text-back — SMS follow-up for unanswered calls
 *   B) Outcome evaluation — routes all completed calls through conversation-outcome.ts
 *      which records wins in `conversation_wins` or triggers self-heal for failures
 */

const MISSED_CALL_THRESHOLD_MS = 15000;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function isMissedCall(call: any): boolean {
  if (call.call_status === 'not_connected') return true;
  if (call.call_status === 'error') return true;
  if (
    call.call_status === 'ended' &&
    typeof call.duration_ms === 'number' &&
    call.duration_ms < MISSED_CALL_THRESHOLD_MS
  ) {
    return true;
  }
  return false;
}

function substituteTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

// ─── Outcome Evaluation ──────────────────────────────────────────────────────

function buildTranscriptText(call: any): string {
  const transcript = call.transcript_object || call.transcript;
  if (!transcript) return call.call_analysis?.call_summary || '';

  if (Array.isArray(transcript)) {
    return transcript
      .map((t: any) => `${t.role || 'unknown'}: ${t.content || t.words?.map((w: any) => w.word).join(' ') || ''}`)
      .join('\n');
  }

  if (typeof transcript === 'string') return transcript;
  return JSON.stringify(transcript);
}

function internalHeaders(): Record<string, string> {
  const secret = process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET;
  return secret ? { 'x-internal-secret': secret } : {};
}

async function triggerOutcomeEvaluation(call: any, agentId: string, userId: string | null): Promise<void> {
  // Only evaluate calls with enough substance
  if (call.call_status !== 'ended') return;
  if ((call.duration_ms || 0) < 15000) return;

  const transcript = buildTranscriptText(call);
  if (!transcript || transcript.length < 50) return;

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';

  // Fire-and-forget: conversation-outcome handles win recording OR self-heal trigger
  fetch(`${baseUrl}/.netlify/functions/conversation-outcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...internalHeaders() },
    body: JSON.stringify({
      channel: 'voice',
      agentId,
      userId: userId || '',
      conversationId: call.call_id,
      transcript,
      callAnalysis: call.call_analysis || null,
    }),
  }).catch(err => {
    console.error('[retell-webhook] Outcome evaluation trigger failed (non-blocking):', err);
  });
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Verify Retell signature when configured. In dev (no RETELL_API_KEY) or
  // when Retell sends no signature header, log and continue for local testing.
  // If the Retell secret exists, a missing signature is a real webhook failure
  // regardless of NODE_ENV.
  const sigResult = verifyRetellSignature(event.body || '', event.headers as Record<string, string | undefined>);
  if (sigResult === 'invalid') {
    console.warn('[retell-webhook] Invalid signature — rejecting request');
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid webhook signature' }) };
  }
  if (sigResult === 'missing' && (process.env.RETELL_API_KEY || process.env.NODE_ENV === 'production')) {
    console.warn('[retell-webhook] Missing signature while webhook signing is required — rejecting');
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Webhook signature required' }) };
  }

  let payload: any;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  try {
    // Retell sends { event: "call_ended", call: { ... } }
    // Some Retell versions send the call object directly
    const call = payload.call || payload;

    if (!call.call_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No call_id in payload' }),
      };
    }

    // Detect direction — Retell sets call_type to 'outbound_api' for API-initiated calls
    const isOutbound = call.call_type === 'outbound_api' || call.call_type === 'outbound_phone_call';
    // Lead's phone: to_number for outbound (we called them), from_number for inbound (they called us)
    const contactPhone = isOutbound ? (call.to_number || null) : (call.from_number || null);
    // Legacy alias used in the rest of this file
    const callerPhone = contactPhone;
    const callSource = String(call.metadata?.source ?? '');
    const adNoAnswerSources = new Set([
      'facebook_ads',
      'facebook_lead_ad',
      'google_ads',
      'google_lead_form',
    ]);
    // Trigger type for enrollment — null means skip enrollment (follow-up retries, campaigns, etc.)
    const triggerType: 'missed_call' | 'website_no_answer' | 'ad_no_answer' | null = (() => {
      if (!isOutbound) return 'missed_call';
      if (!callSource || callSource === 'followup_sequence' || callSource === 'reactivation') return null;
      if (adNoAnswerSources.has(callSource)) return 'ad_no_answer';
      return 'website_no_answer';
    })();
    const agentId = call.agent_id;

    if (!agentId) {
      console.log('[retell-webhook] No agent_id, skipping');
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true }) };
    }

    // Check if this is a missed call
    if (!isMissedCall(call)) {
      console.log(`[retell-webhook] Call ${call.call_id} is not a missed call (status=${call.call_status}, duration=${call.duration_ms}ms)`);

      // Fire call_completed webhook for non-missed calls
      if (call.call_status === 'ended' && (call.duration_ms || 0) > 0) {
        const supabaseForWebhook = getSupabase();
        // Look up agent owner by direct retell_agent_id column first, then
        // fall back to legacy api_keys.retell_agent_id JSONB path. Newer
        // rows have api_keys = {}, so the JSONB-only filter would miss them.
        const { data: agentOwner } = await supabaseForWebhook
          .from('agents')
          .select('user_id')
          .or(`retell_agent_id.eq.${agentId},api_keys->>retell_agent_id.eq.${agentId}`)
          .limit(1)
          .maybeSingle();
        if (agentOwner?.user_id) {
          // Lead answered — cancel any active no-answer follow-up enrollments for this number
          const answeredPhone = isOutbound ? call.to_number : call.from_number;
          if (answeredPhone && (call.duration_ms || 0) >= MISSED_CALL_THRESHOLD_MS) {
            supabaseForWebhook
              .from('followup_enrollments')
              .update({ status: 'completed', completed_at: new Date().toISOString() })
              .eq('contact_phone', answeredPhone)
              .eq('user_id', agentOwner.user_id)
              .eq('status', 'active')
              .then(({ error }) => {
                if (error) console.error('[retell-webhook] Failed to cancel enrollments on answer:', error);
                else console.log(`[retell-webhook] Cancelled follow-up enrollments for answered call: ${answeredPhone}`);
              });
          }

          fireWebhooks(agentOwner.user_id, 'call_completed', {
            id: call.call_id,
            caller_number: call.from_number || null,
            duration_seconds: Math.round((call.duration_ms || 0) / 1000),
            summary: call.call_analysis?.call_summary || null,
            sentiment: call.call_analysis?.user_sentiment || null,
          });

          // Create a lead and sync to connected CRMs (fire-and-forget)
          if (call.from_number) {
            const supabaseForLead = getSupabase();
            await supabaseForLead
              .from('leads')
              .insert({
                phone: call.from_number,
                source: 'ai_call',
                status: 'new',
                user_id: agentOwner.user_id,
                raw_data: call,
              });

            const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
            fetch(`${baseUrl}/.netlify/functions/integration-sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET
                  ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '' }
                  : {}),
              },
              body: JSON.stringify({
                action: 'sync_lead',
                userId: agentOwner.user_id,
                lead: {
                  name: null,
                  first_name: null,
                  last_name: null,
                  phone: call.from_number,
                  email: null,
                  source: 'ai_call',
                  status: 'new',
                  notes: call.call_analysis?.call_summary || null,
                },
              }),
            }).catch(err => console.error('[retell-webhook] Completed call CRM sync failed:', err));
          }

          // ── Outcome evaluation: record win or trigger self-heal ──────────
          await triggerOutcomeEvaluation(call, agentId, agentOwner.user_id);
        }

        // ── Self-improvement loop: score every completed call ─────────────
        // Fire-and-forget — scorer writes to retell_calls + retell_call_scores
        const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
        fetch(`${baseUrl}/.netlify/functions/retell-call-scorer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET
              ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '' }
              : {}),
          },
          body: JSON.stringify({ call }),
        }).catch(err => {
          console.error('[retell-webhook] Call scorer trigger failed (non-blocking):', err);
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, missed: false, outcomeEvaluationTriggered: true }),
      };
    }

    console.log(`[retell-webhook] Missed call detected: ${call.call_id}, from=${callerPhone}, status=${call.call_status}, duration=${call.duration_ms}ms`);

    if (!callerPhone) {
      console.log('[retell-webhook] No caller phone number, skipping text-back');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, missed: true, textback: false, reason: 'no_caller_phone' }),
      };
    }

    const supabase = getSupabase();

    // Step 1: Look up agent owner — direct column primary, legacy JSONB fallback
    const { data: agentRow, error: agentError } = await supabase
      .from('agents')
      .select('user_id')
      .or(`retell_agent_id.eq.${agentId},api_keys->>retell_agent_id.eq.${agentId}`)
      .limit(1)
      .maybeSingle();

    if (agentError || !agentRow) {
      console.error('[retell-webhook] Could not find agent owner for', agentId, agentError);
      await notifyError('retell-webhook: Agent owner not found (missed call)', agentError || 'No matching agent row', {
        agentId, callerPhone: callerPhone || 'unknown', callId: call.call_id, callStatus: call.call_status,
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, missed: true, textback: false, reason: 'agent_not_found' }),
      };
    }

    const userId = agentRow.user_id;

    // Step 2: Check missed call config
    const { data: featureRow } = await supabase
      .from('business_features')
      .select('missed_call_config')
      .eq('user_id', userId)
      .single();

    const config = (featureRow?.missed_call_config || {}) as Record<string, any>;

    // Step 3: Create a lead for inbound missed calls. Outbound leads already exist from lead-webhook.
    let lead: { id: string } | null = null;
    if (!isOutbound) {
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          first_name: null,
          last_name: null,
          phone: callerPhone,
          source: 'missed_call',
          status: 'pending',
          user_id: userId,
          raw_data: call,
        })
        .select('id')
        .single();
      if (leadError) {
        console.error('[retell-webhook] Failed to create lead:', leadError);
        await notifyError('retell-webhook: Lead creation failed', leadError, {
          callerPhone, userId, callId: call.call_id, callStatus: call.call_status,
        });
      } else {
        lead = newLead;
      }
    } else {
      const metadataLeadId = typeof call.metadata?.lead_id === 'string' ? call.metadata.lead_id : null;
      if (metadataLeadId) {
        lead = { id: metadataLeadId };
      } else {
        // For outbound no-answers, look up the existing lead by phone.
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('phone', callerPhone)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        lead = existingLead ?? null;
      }
    }

    // Fire missed_call webhook
    fireWebhooks(userId, 'missed_call', {
      id: call.call_id,
      caller_number: callerPhone,
      caller_name: null,
      duration_seconds: 0,
      reason: call.call_status === 'ended' ? 'short_call' : 'no_answer',
      called_at: new Date().toISOString(),
      lead_id: lead?.id || null,
    });

    // Sync lead to connected CRMs (fire-and-forget)
    if (lead?.id && userId) {
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
      fetch(`${baseUrl}/.netlify/functions/integration-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET
            ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '' }
            : {}),
        },
        body: JSON.stringify({
          action: 'sync_lead',
          userId,
          lead: {
            name: null,
            first_name: null,
            last_name: null,
            phone: callerPhone,
            email: null,
            source: 'missed_call',
            status: 'pending',
            notes: `Missed call - ${call.call_status} (${call.duration_ms || 0}ms)`,
          },
        }),
      }).catch(err => {
        console.error('[retell-webhook] CRM sync failed (non-blocking):', err);
      });
    }

    // Auto-enroll in the matching follow-up sequence (skip for follow-up retries and campaigns)
    if (lead?.id && triggerType) {
      try {
        const { data: sequences } = await supabase
          .from('followup_sequences')
          .select('id')
          .eq('user_id', userId)
          .eq('trigger_event', triggerType)
          .eq('is_active', true);

        if (sequences && sequences.length > 0) {
          for (const seq of sequences) {
            // Get the first step's delay to calculate next_step_at
            const { data: firstStep } = await supabase
              .from('followup_sequence_steps')
              .select('delay_minutes')
              .eq('sequence_id', seq.id)
              .eq('step_order', 1)
              .eq('is_active', true)
              .single();

            const delayMs = (firstStep?.delay_minutes || 1440) * 60 * 1000;

            await supabase.from('followup_enrollments').insert({
              sequence_id: seq.id,
              user_id: userId,
              lead_id: lead.id,
              contact_name: null,
              contact_phone: callerPhone,
              contact_email: null,
              current_step: 0,
              status: 'active',
              next_step_at: new Date(Date.now() + delayMs).toISOString(),
            });
          }
          console.log(`[retell-webhook] Auto-enrolled ${callerPhone} in ${sequences.length} ${triggerType} sequence(s)`);
        }
      } catch (enrollErr) {
        console.error('[retell-webhook] Auto-enrollment failed (non-blocking):', enrollErr);
      }
    }

    const adLeadTextbackEnabledByDefault = isOutbound && triggerType === 'ad_no_answer';
    const textbackEnabled = config.enabled === true || (adLeadTextbackEnabledByDefault && config.enabled !== false);

    if (!textbackEnabled) {
      console.log('[retell-webhook] Missed call text-back not enabled for user', userId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, missed: true, lead_created: !!lead, textback: false, reason: 'not_enabled' }),
      };
    }

    // Step 4: Get business name + active phone for template substitution.
    // business_profiles has no phone column — the user's callback number
    // lives in phone_numbers (Boltcall-provisioned Twilio/Retell line).
    const [{ data: profileRow }, { data: phoneRow }] = await Promise.all([
      supabase
        .from('business_profiles')
        .select('business_name')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('phone_numbers')
        .select('phone_number')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const businessName = profileRow?.business_name || 'our business';
    const businessPhone = phoneRow?.phone_number || '';

    // Step 5: Build the SMS message
    const defaultTemplate =
      "Hi! We noticed we missed your call at {{business_name}}. How can we help? Reply to this text or call us back. We're here for you!";
    const template = config.template || defaultTemplate;

    const messageBody = substituteTemplate(template, {
      business_name: businessName,
      business_phone: businessPhone,
    });

    // Step 6: Calculate scheduled time based on delay config
    const delayMinutes = config.delay_minutes ?? 0;
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

    // Step 7: Insert scheduled message
    const { error: msgError } = await supabase.from('scheduled_messages').insert({
      type: 'missed_call_textback',
      channel: 'sms',
      recipient_phone: callerPhone,
      message_body: messageBody,
      scheduled_for: scheduledFor,
      status: 'scheduled',
      user_id: userId,
      metadata: {
        call_id: call.call_id,
        call_status: call.call_status,
        duration_ms: call.duration_ms,
        lead_id: lead?.id || null,
      },
    });

    if (msgError) {
      console.error('[retell-webhook] Failed to schedule text-back:', msgError);
      await notifyError('retell-webhook: Text-back scheduling failed', msgError, {
        callerPhone, userId, callId: call.call_id, delayMinutes,
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          missed: true,
          textback: false,
          reason: 'schedule_failed',
          lead_created: !!lead,
        }),
      };
    }

    console.log(`[retell-webhook] Text-back scheduled for ${callerPhone} at ${scheduledFor}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        missed: true,
        textback: true,
        lead_created: !!lead,
        lead_id: lead?.id || null,
        scheduled_for: scheduledFor,
      }),
    };
  } catch (err) {
    console.error('[retell-webhook] Error:', err);
    await notifyError('retell-webhook: Unhandled exception', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Call webhook processing failed. Our team has been notified.',
      }),
    };
  }
};
