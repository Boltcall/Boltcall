import { Handler } from '@netlify/functions';
import { getSupabase, deductTokens, TOKEN_COSTS } from './_shared/token-utils';
import { notifyError, notifyInfo } from './_shared/notify';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { requireMatchingUser } from './_shared/user-auth';

/**
 * SMS Sequence Processor — Executes follow-up drip sequences via SMS.
 *
 * Runs on a schedule (e.g., every 5 minutes via Netlify scheduled function)
 * or triggered manually from the dashboard.
 *
 * Pipeline:
 *   1. Find all active enrollments where next_step_at <= NOW
 *   2. For each enrollment, load the next step template
 *   3. Replace template variables with contact/business data
 *   4. Send SMS via Twilio
 *   5. Advance enrollment to next step or mark complete
 *   6. Deduct tokens
 *
 * GET /.netlify/functions/sms-sequence-processor  (scheduled trigger)
 * POST /.netlify/functions/sms-sequence-processor  (manual trigger)
 * { action: 'process' | 'enroll', sequenceId?, contactPhone?, contactName?, contactEmail?, userId? }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  const supabase = getSupabase();

  try {
    // Parse body for POST requests
    let body: any = {};
    if (event.httpMethod === 'POST' && event.body) {
      try { body = JSON.parse(event.body); } catch { /* ignore */ }
    }

    // ─── Handle enrollment action ───────────────────────────────────
    if (body.action === 'enroll') {
      const auth = await requireMatchingUser(event, body.userId, CORS_HEADERS);
      if (!auth.ok) return auth.response;
      body.userId = auth.userId;
      return await handleEnroll(supabase, body);
    }

    // ─── Process pending sequence steps ─────────────────────────────
    const authz = await authorizeRunner(event);
    if (!authz.ok) {
      return {
        statusCode: authz.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: authz.message }),
      };
    }

    const now = new Date().toISOString();

    // Find all active enrollments that are due
    const { data: dueEnrollments, error: fetchErr } = await supabase
      .from('followup_enrollments')
      .select(`
        id, sequence_id, user_id, lead_id, contact_name, contact_phone, contact_email,
        current_step, status, next_step_at,
        followup_sequences!inner(name, trigger_event, is_active, user_id)
      `)
      .eq('status', 'active')
      .lte('next_step_at', now)
      .limit(50);

    if (fetchErr) {
      console.error('[sms-sequence-processor] Fetch error:', fetchErr);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: fetchErr.message }) };
    }

    if (!dueEnrollments || dueEnrollments.length === 0) {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ processed: 0, message: 'No pending steps' }) };
    }

    let processed = 0;
    let failed = 0;

    for (const enrollment of dueEnrollments) {
      try {
        const sequence = (enrollment as any).followup_sequences;
        if (!sequence?.is_active) {
          // Sequence was deactivated — skip
          continue;
        }

        const nextStepOrder = enrollment.current_step + 1;

        // Get the next step in the sequence
        const { data: step } = await supabase
          .from('followup_sequence_steps')
          .select('*')
          .eq('sequence_id', enrollment.sequence_id)
          .eq('step_order', nextStepOrder)
          .eq('is_active', true)
          .single();

        if (!step) {
          // No more steps — mark enrollment as completed
          await supabase
            .from('followup_enrollments')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              last_processed_at: new Date().toISOString(),
            })
            .eq('id', enrollment.id);
          continue;
        }

        // Only process SMS channel steps here (email would be a separate processor)
        if (step.channel !== 'sms') {
          // Skip to next step timing for email steps
          await advanceToNextStep(supabase, enrollment, nextStepOrder);
          continue;
        }

        if (!enrollment.contact_phone) {
          console.warn(`[sms-sequence-processor] No phone for enrollment ${enrollment.id}`);
          continue;
        }

        // Get the user's phone number to send from
        const ownerId = sequence.user_id || enrollment.user_id;
        const { data: phoneRow } = await supabase
          .from('phone_numbers')
          .select('phone_number')
          .eq('user_id', ownerId)
          .limit(1)
          .single();

        if (!phoneRow?.phone_number) {
          console.warn(`[sms-sequence-processor] No sending number for user ${ownerId}`);
          continue;
        }

        // Replace template variables
        const messageText = replaceTemplateVars(step.template, {
          name: enrollment.contact_name || 'there',
          phone: enrollment.contact_phone,
          email: enrollment.contact_email || '',
        });

        // Send via Twilio
        const sendResult = await sendTwilioSms(phoneRow.phone_number, enrollment.contact_phone, messageText);

        if (sendResult.success) {
          // Record outbound message in sms_conversations
          await supabase.from('sms_conversations').insert({
            user_id: ownerId,
            direction: 'outbound',
            from_number: phoneRow.phone_number,
            to_number: enrollment.contact_phone,
            body: messageText,
            twilio_sid: sendResult.sid,
            status: 'sent',
            thread_id: buildThreadId(phoneRow.phone_number, enrollment.contact_phone),
            lead_id: enrollment.lead_id,
          });

          // Deduct tokens
          await deductTokens(ownerId, TOKEN_COSTS.sms_sent, 'sms_sent',
            `Sequence "${sequence.name}" step ${nextStepOrder} to ${enrollment.contact_phone}`,
            { enrollment_id: enrollment.id, step_order: nextStepOrder }
          );

          // Advance enrollment
          await advanceToNextStep(supabase, enrollment, nextStepOrder);
          processed++;
        } else {
          console.error(`[sms-sequence-processor] Send failed for enrollment ${enrollment.id}:`, sendResult.error);

          // Push the next attempt 15 minutes out so a transient Twilio
          // failure doesn't cause the enrollment to be re-processed on
          // every cron tick (which would burn credits + log volume).
          const retryAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          await supabase
            .from('followup_enrollments')
            .update({
              next_step_at: retryAt,
              last_processed_at: new Date().toISOString(),
            })
            .eq('id', enrollment.id);

          failed++;
        }
      } catch (stepErr) {
        console.error(`[sms-sequence-processor] Error processing enrollment ${enrollment.id}:`, stepErr);
        failed++;
      }
    }

    if (processed > 0) {
      await notifyInfo(`📬 *SMS Sequences Processed*\n✅ Sent: ${processed}\n❌ Failed: ${failed}`);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ processed, failed, total: dueEnrollments.length }),
    };
  } catch (error) {
    console.error('[sms-sequence-processor] Error:', error);
    await notifyError('sms-sequence-processor', error as Error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// ─── Enroll a contact in a sequence ───────────────────────────────────

async function handleEnroll(supabase: any, body: any) {
  const { sequenceId, contactPhone, contactName, contactEmail, userId, leadId } = body;

  if (!sequenceId || !contactPhone || !userId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'sequenceId, contactPhone, and userId required' }),
    };
  }

  // Verify the sequence exists and belongs to the user before doing anything
  // else. Returning a clean 404 is friendlier (and safer) than letting the
  // FK violation surface as a raw Postgres error.
  const { data: sequence } = await supabase
    .from('followup_sequences')
    .select('id, user_id')
    .eq('id', sequenceId)
    .maybeSingle();

  if (!sequence) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Sequence not found' }),
    };
  }
  if (sequence.user_id !== userId) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Sequence does not belong to this user' }),
    };
  }

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('followup_enrollments')
    .select('id, status')
    .eq('sequence_id', sequenceId)
    .eq('contact_phone', contactPhone)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Already enrolled', enrollmentId: existing.id }),
    };
  }

  // Get first step delay to calculate next_step_at
  const { data: firstStep } = await supabase
    .from('followup_sequence_steps')
    .select('delay_minutes')
    .eq('sequence_id', sequenceId)
    .eq('step_order', 1)
    .eq('is_active', true)
    .single();

  const delayMs = (firstStep?.delay_minutes || 1440) * 60 * 1000;
  const nextStepAt = new Date(Date.now() + delayMs).toISOString();

  const { data: enrollment, error } = await supabase
    .from('followup_enrollments')
    .insert({
      sequence_id: sequenceId,
      user_id: userId,
      lead_id: leadId || null,
      contact_name: contactName || null,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      current_step: 0,
      status: 'active',
      next_step_at: nextStepAt,
    })
    .select('id')
    .single();

  if (error) {
    // Don't leak Postgres internals to the client. Log details server-side
    // and return a generic 500.
    console.error('[sms-sequence-processor] enroll insert failed:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to enroll contact in sequence' }),
    };
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, enrollmentId: enrollment.id, nextStepAt }),
  };
}

// ─── Advance enrollment to next step ──────────────────────────────────

async function advanceToNextStep(supabase: any, enrollment: any, completedStep: number) {
  const nextStepOrder = completedStep + 1;

  // Check if there's a next step
  const { data: nextStep } = await supabase
    .from('followup_sequence_steps')
    .select('delay_minutes')
    .eq('sequence_id', enrollment.sequence_id)
    .eq('step_order', nextStepOrder)
    .eq('is_active', true)
    .maybeSingle();

  if (nextStep) {
    const delayMs = (nextStep.delay_minutes || 1440) * 60 * 1000;
    const nextStepAt = new Date(Date.now() + delayMs).toISOString();

    await supabase
      .from('followup_enrollments')
      .update({
        current_step: completedStep,
        next_step_at: nextStepAt,
        last_processed_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id);
  } else {
    // No more steps — mark complete
    await supabase
      .from('followup_enrollments')
      .update({
        current_step: completedStep,
        status: 'completed',
        completed_at: new Date().toISOString(),
        last_processed_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id);
  }
}

// ─── Template variable replacement ────────────────────────────────────

function replaceTemplateVars(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{\{name\}\}/gi, vars.name || 'there')
    .replace(/\{\{phone\}\}/gi, vars.phone || '')
    .replace(/\{\{email\}\}/gi, vars.email || '')
    .replace(/\{\{date\}\}/gi, new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
}

// ─── Send SMS via Twilio ──────────────────────────────────────────────

async function sendTwilioSms(from: string, to: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: from, To: to, Body: message }).toString(),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.message || `Twilio error: ${res.status}` };
    }

    return { success: true, sid: data.sid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Helper: Build thread ID ──────────────────────────────────────────

function buildThreadId(phone1: string, phone2: string): string {
  const sorted = [phone1, phone2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}
