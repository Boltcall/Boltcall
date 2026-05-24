import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { notifyError } from './_shared/notify';
import { fireWebhooks } from './_shared/fire-webhooks';
import { verifyCalcomSignature } from './_shared/verify-signatures';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbwogktdajorojljkjwg.supabase.co';

function getServiceClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Delay map: config value -> milliseconds
const DELAY_MAP: Record<string, number> = {
  '1': 1 * 60 * 60 * 1000,
  '3': 3 * 60 * 60 * 1000,
  '24': 24 * 60 * 60 * 1000,
  '48': 48 * 60 * 60 * 1000,
  '72': 72 * 60 * 60 * 1000,
  '168': 7 * 24 * 60 * 60 * 1000,
};

function substituteVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

const LANG_TO_LOCALE: Record<string, string> = {
  en: 'en-US',
  he: 'he-IL',
  es: 'es-ES',
};

async function getUserLocale(supabase: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data } = await supabase
    .from('agents')
    .select('language')
    .eq('user_id', userId)
    .limit(1)
    .single();
  return LANG_TO_LOCALE[data?.language] || 'en-US';
}

function formatDate(isoString: string, locale = 'en-US'): string {
  const d = new Date(isoString);
  return d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(isoString: string, locale = 'en-US'): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: locale !== 'he-IL' });
}

export const handler: Handler = async (event) => {
  // Only accept POST from Cal.com webhooks
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Verify Cal.com signature when configured. In dev (no secret) or when
  // Cal.com sends no signature header, log and continue. In production with
  // CALCOM_WEBHOOK_SECRET set, any missing/invalid signature is rejected.
  const sigResult = verifyCalcomSignature(event.body || '', event.headers as Record<string, string | undefined>);
  if (sigResult === 'invalid') {
    console.warn('[appointment-handler] Invalid Cal.com signature — rejecting');
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid webhook signature' }) };
  }
  if (sigResult === 'missing' && process.env.NODE_ENV === 'production' && process.env.CALCOM_WEBHOOK_SECRET) {
    console.warn('[appointment-handler] Missing Cal.com signature in production — rejecting');
    return { statusCode: 401, body: JSON.stringify({ error: 'Webhook signature required' }) };
  }

  const supabase = getServiceClient();

  try {
    const body = JSON.parse(event.body || '{}');
    const triggerEvent = body.triggerEvent as string;
    const payload = body.payload;

    if (!triggerEvent || !payload) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid webhook payload' }) };
    }

    console.log(`[appointment-handler] Received ${triggerEvent}`, JSON.stringify(payload).slice(0, 500));

    // Look up user by organizer email
    const organizerEmail = payload.organizer?.email;
    if (!organizerEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No organizer email in payload' }) };
    }

    // Find user by organizer email via database function
    let userId: string | null = null;
    const { data: foundUserId } = await supabase.rpc('find_user_by_email', { lookup_email: organizerEmail });
    userId = foundUserId || null;

    // Fallback: check business_features where cal_api_key is stored (the user who connected Cal.com)
    if (!userId) {
      const { data: bfRows } = await supabase
        .from('business_features')
        .select('user_id, reminders_config')
        .not('reminders_config', 'is', null);

      if (bfRows) {
        for (const row of bfRows) {
          const cfg = row.reminders_config as Record<string, any>;
          if (cfg?.cal_connected) {
            userId = row.user_id;
            break;
          }
        }
      }
    }

    if (!userId) {
      console.error('[appointment-handler] Could not resolve user for organizer:', organizerEmail);
      await notifyError('appointment-handler: User lookup failed', 'Could not resolve user for organizer email', { organizerEmail, triggerEvent });
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found for organizer email' }) };
    }

    // Get user's workspace_id
    const { data: bpRow } = await supabase
      .from('business_profiles')
      .select('workspace_id, business_name')
      .eq('user_id', userId)
      .single();

    const workspaceId = bpRow?.workspace_id;
    const businessName = bpRow?.business_name || '';

    if (!workspaceId) {
      console.error('[appointment-handler] No workspace found for user:', userId);
      return { statusCode: 404, body: JSON.stringify({ error: 'No workspace found for user' }) };
    }

    const locale = await getUserLocale(supabase, userId);

    const attendee = payload.attendees?.[0] || {};
    const attendeeName = attendee.name || 'Customer';
    const attendeeEmail = attendee.email || '';
    const attendeePhone = attendee.phone || attendee.phoneNumber || '';
    const startTime = payload.startTime;
    const endTime = payload.endTime;
    const eventTitle = payload.title || '';
    const bookingId = String(payload.bookingId || payload.uid || '');

    // ─── BOOKING_CREATED ──────────────────────────────────────────────
    if (triggerEvent === 'BOOKING_CREATED') {
      // 1. Insert appointment
      const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .insert({
          user_id: userId,
          workspace_id: workspaceId,
          cal_booking_id: bookingId,
          cal_event_type: eventTitle,
          client_name: attendeeName,
          client_email: attendeeEmail,
          client_phone: attendeePhone,
          service_name: eventTitle,
          starts_at: startTime,
          ends_at: endTime,
          timezone: payload.organizer?.timeZone || 'UTC',
          status: 'confirmed',
          raw_webhook: body,
        })
        .select('id')
        .single();

      if (apptError) {
        console.error('[appointment-handler] Failed to insert appointment:', apptError);
        await notifyError('appointment-handler: Appointment creation failed', apptError, {
          userId, organizerEmail, attendeeName, bookingId, triggerEvent,
        });
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create appointment. Please try again or contact support.' }) };
      }

      const appointmentId = appt.id;
      const messagesToInsert: any[] = [];

      // ─── Silent self-serve attribution (Boltcall outbound campaigns) ─────
      // Match by attendee email against any outbound_touch_attribution row
      // for which we have a lead_email but no booking yet. If we get a hit,
      // stamp booking_at and mark as silent self-serve (will be flipped off
      // by instantly-webhook if a reply event subsequently arrives).
      if (attendeeEmail) {
        supabase
          .from('outbound_touch_attribution')
          .update({ booking_at: startTime || new Date().toISOString(), silent_self_serve: true })
          .eq('lead_email', attendeeEmail)
          .is('booking_at', null)
          .then(({ error }) => {
            if (error) console.warn('[appointment-handler] attribution update failed:', error.message);
          });
      }

      // Fire appointment_booked webhook
      fireWebhooks(userId, 'appointment_booked', {
        id: appointmentId,
        customer_name: attendeeName,
        customer_email: attendeeEmail,
        customer_phone: attendeePhone,
        start_time: startTime,
        end_time: endTime,
        service: eventTitle,
        booking_id: bookingId,
      });

      // 2. Check reminders config
      const { data: bf } = await supabase
        .from('business_features')
        .select('reminders_enabled, reminders_config, reputation_manager_config')
        .eq('user_id', userId)
        .single();

      const remindersConfig = (bf?.reminders_config || {}) as Record<string, any>;
      const reputationConfig = (bf?.reputation_manager_config || {}) as Record<string, any>;

      // Schedule reminder SMS
      if (bf?.reminders_enabled && remindersConfig.sms_enabled && attendeePhone) {
        const template = remindersConfig.template || 'Hi {{client_name}}, reminder about your appointment on {{appointment_date}} at {{appointment_time}}.';
        const delayHours = remindersConfig.time || '24';
        const delayMs = DELAY_MAP[delayHours] || DELAY_MAP['24'];

        const scheduledFor = new Date(new Date(startTime).getTime() - delayMs);

        // Only schedule if the reminder time is in the future
        if (scheduledFor.getTime() > Date.now()) {
          const messageBody = substituteVars(template, {
            client_name: attendeeName,
            service: eventTitle,
            appointment_date: formatDate(startTime, locale),
            appointment_time: formatTime(startTime, locale),
          });

          messagesToInsert.push({
            user_id: userId,
            appointment_id: appointmentId,
            type: 'reminder',
            channel: 'sms',
            recipient_phone: attendeePhone,
            recipient_email: attendeeEmail,
            message_body: messageBody,
            scheduled_for: scheduledFor.toISOString(),
            status: 'scheduled',
          });
        }
      }

      // Schedule reminder EMAIL (if enabled)
      if (bf?.reminders_enabled && remindersConfig.email_enabled && attendeeEmail) {
        const template = remindersConfig.email_template || 'Hi {{client_name}}, this is a reminder about your appointment on {{appointment_date}} at {{appointment_time}}.';
        const subject = remindersConfig.email_subject || 'Appointment Reminder - {{appointment_date}}';
        const delayHours = remindersConfig.time || '24';
        const delayMs = DELAY_MAP[delayHours] || DELAY_MAP['24'];

        const scheduledFor = new Date(new Date(startTime).getTime() - delayMs);

        if (scheduledFor.getTime() > Date.now()) {
          const vars = {
            client_name: attendeeName,
            service: eventTitle,
            appointment_date: formatDate(startTime, locale),
            appointment_time: formatTime(startTime, locale),
            business_name: businessName,
          };

          messagesToInsert.push({
            user_id: userId,
            appointment_id: appointmentId,
            type: 'reminder',
            channel: 'email',
            recipient_phone: attendeePhone,
            recipient_email: attendeeEmail,
            message_body: substituteVars(template, vars),
            subject: substituteVars(subject, vars),
            scheduled_for: scheduledFor.toISOString(),
            status: 'scheduled',
          });
        }
      }

      // Schedule review request SMS
      if (reputationConfig.sms_enabled && attendeePhone) {
        const template = reputationConfig.sms_template || 'Hi {{client_name}}, thanks for visiting {{business_name}}! We\'d love your feedback: {{review_url}}';
        const delayHours = reputationConfig.sms_delay || '24';
        const delayMs = DELAY_MAP[delayHours] || DELAY_MAP['24'];

        const scheduledFor = new Date(new Date(endTime || startTime).getTime() + delayMs);

        const messageBody = substituteVars(template, {
          client_name: attendeeName,
          business_name: businessName,
          review_url: reputationConfig.google_review_url || '',
        });

        messagesToInsert.push({
          user_id: userId,
          appointment_id: appointmentId,
          type: 'review_request',
          channel: 'sms',
          recipient_phone: attendeePhone,
          recipient_email: attendeeEmail,
          message_body: messageBody,
          scheduled_for: scheduledFor.toISOString(),
          status: 'scheduled',
        });
      }

      // Auto-enroll in appointment_completed follow-up sequences
      if (attendeePhone || attendeeEmail) {
        try {
          const { data: sequences } = await supabase
            .from('followup_sequences')
            .select('id')
            .eq('user_id', userId)
            .eq('trigger_event', 'appointment_completed')
            .eq('is_active', true);

          if (sequences && sequences.length > 0) {
            for (const seq of sequences) {
              const { data: firstStep } = await supabase
                .from('followup_sequence_steps')
                .select('delay_minutes')
                .eq('sequence_id', seq.id)
                .eq('step_order', 1)
                .eq('is_active', true)
                .single();

              const delayMs = (firstStep?.delay_minutes || 1440) * 60 * 1000;
              // Schedule from appointment end time (not now)
              const nextStepAt = new Date(new Date(endTime || startTime).getTime() + delayMs);

              await supabase.from('followup_enrollments').insert({
                sequence_id: seq.id,
                user_id: userId,
                contact_name: attendeeName,
                contact_phone: attendeePhone || null,
                contact_email: attendeeEmail || null,
                current_step: 0,
                status: 'active',
                next_step_at: nextStepAt.toISOString(),
              });
            }
          }
        } catch (enrollErr) {
          console.error('[appointment-handler] Auto-enrollment failed (non-blocking):', enrollErr);
        }
      }

      // Insert all scheduled messages
      if (messagesToInsert.length > 0) {
        const { error: msgError } = await supabase
          .from('scheduled_messages')
          .insert(messagesToInsert);

        if (msgError) {
          console.error('[appointment-handler] Failed to insert scheduled messages:', msgError);
          await notifyError('appointment-handler: Scheduled messages insert failed', msgError, {
            userId, appointmentId, messagesCount: messagesToInsert.length,
          });
          // Non-fatal — appointment was created successfully
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          appointment_id: appointmentId,
          messages_scheduled: messagesToInsert.length,
        }),
      };
    }

    // ─── BOOKING_CANCELLED ────────────────────────────────────────────
    if (triggerEvent === 'BOOKING_CANCELLED') {
      // Update appointment status
      const { error: apptErr } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('cal_booking_id', bookingId)
        .eq('user_id', userId);

      if (apptErr) {
        console.error('[appointment-handler] Failed to cancel appointment:', apptErr);
      }

      // Find the appointment ID to cancel messages
      const { data: apptRow } = await supabase
        .from('appointments')
        .select('id')
        .eq('cal_booking_id', bookingId)
        .eq('user_id', userId)
        .single();

      if (apptRow) {
        const { error: msgErr } = await supabase
          .from('scheduled_messages')
          .update({ status: 'cancelled' })
          .eq('appointment_id', apptRow.id)
          .eq('status', 'scheduled');

        if (msgErr) {
          console.error('[appointment-handler] Failed to cancel scheduled messages:', msgErr);
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, action: 'cancelled' }),
      };
    }

    // ─── BOOKING_RESCHEDULED ──────────────────────────────────────────
    if (triggerEvent === 'BOOKING_RESCHEDULED') {
      // Update appointment times
      const { error: apptErr } = await supabase
        .from('appointments')
        .update({
          starts_at: startTime,
          ends_at: endTime,
          status: 'confirmed',
          raw_webhook: body,
          updated_at: new Date().toISOString(),
        })
        .eq('cal_booking_id', bookingId)
        .eq('user_id', userId);

      if (apptErr) {
        console.error('[appointment-handler] Failed to update rescheduled appointment:', apptErr);
      }

      // Find appointment to update messages
      const { data: apptRow } = await supabase
        .from('appointments')
        .select('id')
        .eq('cal_booking_id', bookingId)
        .eq('user_id', userId)
        .single();

      if (apptRow) {
        // Get existing scheduled messages to recalculate times
        const { data: existingMsgs } = await supabase
          .from('scheduled_messages')
          .select('id, type')
          .eq('appointment_id', apptRow.id)
          .eq('status', 'scheduled');

        if (existingMsgs) {
          // Get user's config to recalculate delays
          const { data: bf } = await supabase
            .from('business_features')
            .select('reminders_config, reputation_manager_config')
            .eq('user_id', userId)
            .single();

          const remindersConfig = (bf?.reminders_config || {}) as Record<string, any>;
          const reputationConfig = (bf?.reputation_manager_config || {}) as Record<string, any>;

          for (const msg of existingMsgs) {
            let newScheduledFor: string;

            if (msg.type === 'reminder') {
              const delayHours = remindersConfig.time || '24';
              const delayMs = DELAY_MAP[delayHours] || DELAY_MAP['24'];
              newScheduledFor = new Date(new Date(startTime).getTime() - delayMs).toISOString();
            } else {
              // review_request
              const delayHours = reputationConfig.sms_delay || '24';
              const delayMs = DELAY_MAP[delayHours] || DELAY_MAP['24'];
              newScheduledFor = new Date(new Date(endTime || startTime).getTime() + delayMs).toISOString();
            }

            // If the new scheduled time is in the past, cancel the message
            if (new Date(newScheduledFor).getTime() <= Date.now()) {
              await supabase
                .from('scheduled_messages')
                .update({ status: 'cancelled' })
                .eq('id', msg.id);
            } else {
              await supabase
                .from('scheduled_messages')
                .update({ scheduled_for: newScheduledFor })
                .eq('id', msg.id);
            }
          }
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, action: 'rescheduled' }),
      };
    }

    // Unknown event type — acknowledge but do nothing
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, action: 'ignored', event: triggerEvent }),
    };
  } catch (err: any) {
    console.error('[appointment-handler] Error:', err);
    await notifyError('appointment-handler: Unhandled exception', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An unexpected error occurred processing the appointment. Our team has been notified.' }),
    };
  }
};
