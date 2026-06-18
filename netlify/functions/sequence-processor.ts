import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { notifyError } from './_shared/notify';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbwogktdajorojljkjwg.supabase.co';

function getServiceClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Sequence Processor — runs every 5 minutes via Netlify scheduled functions.
 * Finds active enrollments where the next step is due, inserts the step's message
 * into scheduled_messages (which the message-dispatcher will then send), and
 * advances the enrollment to the next step.
 */
const handler: Handler = async (event) => {
  if (event.httpMethod && !['GET', 'POST'].includes(event.httpMethod)) {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return { statusCode: authz.status, body: JSON.stringify({ error: authz.message }) };
  }

  const supabase = getServiceClient();

  try {
    const now = new Date().toISOString();

    // Find active enrollments where next_step_at is due
    const { data: dueEnrollments, error: fetchError } = await supabase
      .from('followup_enrollments')
      .select(`
        id,
        sequence_id,
        user_id,
        contact_name,
        contact_phone,
        contact_email,
        current_step,
        followup_sequences!inner (
          id,
          name,
          is_active
        )
      `)
      .eq('status', 'active')
      .lte('next_step_at', now)
      .limit(100);

    if (fetchError) {
      console.error('[sequence-processor] Failed to fetch due enrollments:', fetchError);
      await notifyError('sequence-processor: Fetch failed', fetchError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch enrollments' }) };
    }

    if (!dueEnrollments || dueEnrollments.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ processed: 0 }) };
    }

    let processed = 0;
    let completed = 0;

    for (const enrollment of dueEnrollments) {
      const seq = (enrollment as any).followup_sequences;

      // Skip if sequence is deactivated
      if (!seq?.is_active) {
        await supabase
          .from('followup_enrollments')
          .update({ status: 'cancelled' })
          .eq('id', enrollment.id);
        continue;
      }

      // Get the next step for this enrollment
      const nextStepOrder = enrollment.current_step + 1;
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
            completed_at: now,
            next_step_at: null,
          })
          .eq('id', enrollment.id);
        completed++;
        continue;
      }

      // Substitute variables in template
      let messageBody = step.template
        .replace(/\{\{client_name\}\}/g, enrollment.contact_name || 'there')
        .replace(/\{\{name\}\}/g, enrollment.contact_name || 'there');

      let subject = (step.subject || '')
        .replace(/\{\{client_name\}\}/g, enrollment.contact_name || 'there')
        .replace(/\{\{name\}\}/g, enrollment.contact_name || 'there');

      // Insert into scheduled_messages for immediate dispatch
      const messageInsert: any = {
        user_id: enrollment.user_id,
        type: 'followup',
        channel: step.channel,
        message_body: messageBody,
        scheduled_for: now, // Send immediately (dispatcher picks up on next run)
        status: 'scheduled',
      };

      if (step.channel === 'sms' && enrollment.contact_phone) {
        messageInsert.recipient_phone = enrollment.contact_phone;
      } else if (step.channel === 'email' && enrollment.contact_email) {
        messageInsert.recipient_email = enrollment.contact_email;
        messageInsert.subject = subject || 'Follow up';
      } else if (step.channel === 'call' && enrollment.contact_phone) {
        // Look up user's Retell agent + active phone number for call retry
        const [{ data: agentRow }, { data: phoneRow }] = await Promise.all([
          supabase
            .from('agents')
            .select('api_keys')
            .eq('user_id', enrollment.user_id)
            .limit(1)
            .single(),
          supabase
            .from('phone_numbers')
            .select('phone_number')
            .eq('user_id', enrollment.user_id)
            .eq('status', 'active')
            .limit(1)
            .single(),
        ]);
        const agentId = (agentRow?.api_keys as any)?.retell_agent_id;
        const fromNumber = phoneRow?.phone_number;
        if (agentId && fromNumber) {
          messageInsert.recipient_phone = enrollment.contact_phone;
          messageInsert.metadata = {
            agent_id: agentId,
            from_number: fromNumber,
          };
        } else {
          console.warn(`[sequence-processor] No agent/phone for call retry, user=${enrollment.user_id}`);
        }
      } else {
        // No valid recipient for this channel — skip step but advance
        console.warn(`[sequence-processor] No ${step.channel} recipient for enrollment ${enrollment.id}`);
      }

      if (messageInsert.recipient_phone || messageInsert.recipient_email) {
        const { error: insertError } = await supabase
          .from('scheduled_messages')
          .insert(messageInsert);

        if (insertError) {
          console.error('[sequence-processor] Failed to insert message:', insertError);
          continue; // Don't advance step if message insert failed
        }
      }

      // Check if there's a step after this one
      const { data: nextNextStep } = await supabase
        .from('followup_sequence_steps')
        .select('delay_minutes')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_order', nextStepOrder + 1)
        .eq('is_active', true)
        .single();

      if (nextNextStep) {
        // Calculate when the next step should fire
        const nextStepAt = new Date(Date.now() + nextNextStep.delay_minutes * 60 * 1000);
        await supabase
          .from('followup_enrollments')
          .update({
            current_step: nextStepOrder,
            next_step_at: nextStepAt.toISOString(),
          })
          .eq('id', enrollment.id);
      } else {
        // This was the last step
        await supabase
          .from('followup_enrollments')
          .update({
            current_step: nextStepOrder,
            status: 'completed',
            completed_at: now,
            next_step_at: null,
          })
          .eq('id', enrollment.id);
        completed++;
      }

      processed++;
    }

    console.log(`[sequence-processor] Processed: ${processed}, Completed: ${completed}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ processed, completed }),
    };
  } catch (err: any) {
    console.error('[sequence-processor] Error:', err);
    await notifyError('sequence-processor: Unhandled exception', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Sequence processing failed' }) };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
