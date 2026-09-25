import { Handler, HandlerEvent } from '@netlify/functions';
import * as crypto from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
import { deductTokens, getServiceSupabase, TOKEN_COSTS } from './_shared/token-utils';
import { alertOwner, notifyError, notifyInfo } from './_shared/notify';
import { resolveTwilioFromNumber } from './_shared/twilio-from-number';
import { verifyRetellSignature } from './_shared/verify-signatures';
import { withLegacyHandler } from './_shared/runtime-compat';
import { estimateBookingValueCents } from './_shared/booking-value';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

/**
 * Agent Tools Webhook
 *
 * Called by Retell during live calls when the AI agent invokes a custom tool.
 * Handles: lookup_caller, check_availability, book_appointment, send_sms
 *
 * Retell sends:
 *   { call_id, agent_id, tool_call_id, name, arguments: { ... } }
 *
 * Must respond with:
 *   { tool_call_id, content: "..." }
 */

const CAL_BASE_URL = 'https://api.cal.com/v1';
const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Retell-Signature, X-Agent-Tools-Secret, X-Retell-Tool-Secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function getHeader(event: HandlerEvent, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries((event.headers || {}) as Record<string, string | undefined>)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function isAuthorizedToolRequest(event: HandlerEvent): boolean {
  const retellSig = verifyRetellSignature(event.body || '', event.headers as Record<string, string | undefined>);
  if (retellSig === 'valid') return true;
  if (retellSig === 'invalid') return false;

  const sharedSecret = process.env.AGENT_TOOLS_SHARED_SECRET || process.env.RETELL_TOOL_SECRET || '';
  if (sharedSecret) {
    const provided =
      getHeader(event, 'x-agent-tools-secret') ||
      getHeader(event, 'x-retell-tool-secret') ||
      '';
    return Boolean(provided) && safeEqual(sharedSecret, provided);
  }

  // Fail-closed. The previous `NODE_ENV !== 'production'` / `CONTEXT=dev`
  // bypass was intended for local dev, but Netlify Functions runtime does
  // not reliably expose those env vars — so live prod ended up accepting
  // unauthenticated book_appointment / send_sms / lookup_caller calls
  // (confirmed via a live smoke against boltcall.org after the previous
  // deploy). For local dev, set AGENT_TOOLS_SHARED_SECRET in .env.local
  // and pass the same value in `x-agent-tools-secret` from your dev harness.
  console.warn(
    '[agent-tools] Rejecting request — no valid Retell signature and no shared secret configured.',
  );
  return false;
}

// ── Cal.com helpers ──

// Keyed by calApiKey so different users never share cached event type IDs.
const eventTypeIdCache = new Map<string, number>();

async function getEventTypeId(calApiKey: string): Promise<number | null> {
  const cached = eventTypeIdCache.get(calApiKey);
  if (cached != null) return cached;

  try {
    const response = await fetch(`${CAL_BASE_URL}/event-types?apiKey=${calApiKey}`);

    if (!response.ok) {
      console.error('[agent-tools] Failed to fetch event types:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const eventTypes = data.event_types || data.data || [];
    if (eventTypes.length === 0) return null;

    // Prefer "Free Consultation" event type, fall back to first
    const consultation = eventTypes.find((e: any) =>
      e.title?.toLowerCase().includes('consultation') || e.slug?.includes('consultation')
    );
    const id: number = consultation?.id || eventTypes[0].id;
    eventTypeIdCache.set(calApiKey, id);
    return id;
  } catch (err) {
    console.error('[agent-tools] Error fetching event types:', err);
    return null;
  }
}

const LANG_TO_LOCALE: Record<string, string> = {
  en: 'en-US',
  he: 'he-IL',
  es: 'es-ES',
};

function formatTimeSlot(isoString: string, locale = 'en-US'): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: locale !== 'he-IL' });
}

function formatDateReadable(dateStr: string, locale = 'en-US'): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Twilio helper ──

async function sendTwilioSms(to: string, from: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Twilio API error: ${response.status}`);
  }
  return data;
}

// ── Look up agent owner ──

async function getAgentOwner(agentId: string): Promise<{ userId: string | null; locale: string }> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agents')
    .select('user_id, language')
    .eq('retell_agent_id', agentId)
    .single();

  if (error || !data) {
    console.error('[agent-tools] Could not find agent owner for', agentId, error);
    return { userId: null, locale: 'en-US' };
  }
  const locale = LANG_TO_LOCALE[data.language] || 'en-US';
  return { userId: data.user_id, locale };
}

// ── Get per-user Cal.com API key ──

async function getCalApiKey(userId: string | null): Promise<string> {
  if (userId) {
    try {
      const supabase = getServiceSupabase();
      const { data } = await supabase
        .from('user_integrations')
        .select('api_key')
        .eq('user_id', userId)
        .eq('provider', 'calcom')
        .eq('is_connected', true)
        .maybeSingle();

      if (data?.api_key) return data.api_key;
    } catch (err) {
      console.error('[agent-tools] Failed to fetch user Cal.com API key, falling back to env:', err);
    }
  }
  // Fall back to global env var so existing setups continue to work.
  // Accept both CALCOM_API_KEY (canonical) and CAL_API_KEY (legacy alias).
  return process.env.CALCOM_API_KEY || process.env.CAL_API_KEY || '';
}

// ── Tool: lookup_caller ──

async function handleLookupCaller(
  args: any,
  userId: string | null,
  locale = 'en-US'
): Promise<string> {
  const { phone_number } = args;
  if (!phone_number) return 'NEW CALLER: No phone number provided.\nProceed with standard greeting and qualification.';

  if (!userId) {
    console.error('[agent-tools] lookup_caller: no userId found for agent');
    return 'NEW CALLER: Could not look up caller (no agent owner).\nProceed with standard greeting and qualification.';
  }

  const supabase = getServiceSupabase();

  try {
    // Normalize phone: strip spaces/dashes for flexible matching
    const normalizedPhone = phone_number.replace(/[\s\-()]/g, '');

    // 1. Query leads table for this caller
    const { data: leads, error: leadErr } = await supabase
      .from('leads')
      .select('first_name, last_name, email, source, status, created_at, raw_data')
      .eq('user_id', userId)
      .or(`phone.eq.${normalizedPhone},phone.eq.${phone_number}`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (leadErr) {
      console.error('[agent-tools] lookup_caller leads query error:', leadErr);
    }

    // 2. Query appointments table for this caller
    const { data: appointments, error: apptErr } = await supabase
      .from('appointments')
      .select('service_name, starts_at, status, client_name, client_email, timezone')
      .eq('user_id', userId)
      .or(`client_phone.eq.${normalizedPhone},client_phone.eq.${phone_number}`)
      .order('starts_at', { ascending: false })
      .limit(10);

    if (apptErr) {
      console.error('[agent-tools] lookup_caller appointments query error:', apptErr);
    }

    // 3. Build response
    const hasLeads = leads && leads.length > 0;
    const hasAppointments = appointments && appointments.length > 0;

    if (!hasLeads && !hasAppointments) {
      return 'NEW CALLER: No previous record found for this number.\nProceed with standard greeting and qualification.';
    }

    let result = '';

    if (hasLeads) {
      const lead = leads[0]; // Most recent lead record
      const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown';
      const callCount = leads.length;
      const lastContact = lead.created_at
        ? new Date(lead.created_at).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
        : 'Unknown';

      result += `RETURNING CALLER: ${fullName}`;
      if (lead.email) result += ` (${lead.email})`;
      result += '\n';
      result += `- Previous interactions: ${callCount}\n`;
      result += `- Last contact: ${lastContact}\n`;
      result += `- Status: ${lead.status || 'unknown'}\n`;
      result += `- Source: ${lead.source || 'unknown'}\n`;
    }

    if (hasAppointments) {
      const now = new Date();

      const upcoming = appointments.filter(a =>
        a.starts_at && new Date(a.starts_at) > now && a.status !== 'cancelled'
      );
      const past = appointments.filter(a =>
        a.starts_at && new Date(a.starts_at) <= now
      );

      if (upcoming.length > 0) {
        result += '\nUpcoming appointments:\n';
        for (const appt of upcoming.slice(0, 3)) {
          const apptDate = new Date(appt.starts_at);
          const dateStr = apptDate.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
          const timeStr = apptDate.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: locale !== 'he-IL' });
          result += `  - ${appt.service_name || 'Appointment'} on ${dateStr} at ${timeStr} (${appt.status})\n`;
        }
      }

      if (past.length > 0) {
        result += `\nPast appointments: ${past.length} on record\n`;
        const lastAppt = past[0];
        const lastDate = new Date(lastAppt.starts_at).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
        result += `  - Most recent: ${lastAppt.service_name || 'Appointment'} on ${lastDate} (${lastAppt.status})\n`;
      }
    }

    result += '\nGreet them warmly by name and reference their history.';
    return result;
  } catch (err) {
    console.error('[agent-tools] lookup_caller error:', err);
    return 'NEW CALLER: Lookup failed due to an error.\nProceed with standard greeting and qualification.';
  }
}

// ── Tool: search_knowledge_base ──

async function handleSearchKnowledgeBase(args: any, userId: string | null): Promise<string> {
  const { question } = args;
  if (!question) return 'I\'d be happy to look that up for you. Could you repeat your question so I can find the right information?';
  if (!userId) return 'I cannot search the knowledge base without a user context.';

  // Query the firm's KB directly with the service client (userId comes from the
  // verified agent owner). The old HTTP hop to kb-search carried no user JWT,
  // so it always got 401. Same keyword match kb-search falls back to.
  // ponytail: keyword match only; use the search_kb vector RPC once its migration is applied.
  const keywords = String(question).toLowerCase().split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((w) => w.length > 2)
    .slice(0, 8);
  try {
    const { data, error } = keywords.length
      ? await getServiceSupabase()
          .from('knowledge_base')
          .select('title, content, category')
          .eq('user_id', userId)
          .eq('status', 'active')
          .or(keywords.map((kw) => `title.ilike.%${kw}%,content.ilike.%${kw}%`).join(','))
          .limit(3)
      : { data: [], error: null };
    if (error) throw error;
    const results = data || [];

    if (results.length === 0) {
      return 'I don\'t have specific information about that in our knowledge base. I can take your details and have someone who knows more get back to you. Would you like that?';
    }

    // Format results for the agent
    let response = 'KNOWLEDGE BASE RESULTS:\n';
    for (const r of results) {
      response += `\n[${r.category || 'Info'}] ${r.title}:\n${r.content}\n`;
    }
    response += '\nUse this information to answer the caller\'s question naturally. Do not mention the knowledge base.';
    return response;
  } catch (err) {
    console.error('[agent-tools] KB search error:', err);
    return 'I could not search our records right now. Let me take your details and have someone follow up.';
  }
}

// ── Google Calendar helpers for agent tools ──

async function getGoogleCalendarForUser(userId: string): Promise<{ accessToken: string; config: any } | null> {
  const supabase = getServiceSupabase();
  const { data: gcal } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .eq('is_connected', true)
    .maybeSingle();

  if (!gcal) return null;

  const config = gcal.config || {};
  let accessToken = config.access_token;
  const expiresAt = config.token_expires_at;
  const refreshToken = gcal.api_key;

  // Refresh if expired (5-min buffer)
  if (accessToken && expiresAt && Date.now() >= new Date(expiresAt).getTime() - 5 * 60 * 1000) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (clientId && clientSecret && refreshToken) {
      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }).toString(),
        });
        if (res.ok) {
          const data = await res.json();
          accessToken = data.access_token;
          // Update in DB
          await supabase
            .from('user_integrations')
            .update({ config: { ...config, access_token: accessToken, token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString() } })
            .eq('id', gcal.id);
        }
      } catch { /* fall through */ }
    }
  }

  return accessToken ? { accessToken, config } : null;
}

// ── No-calendar fallback: capture the request as a callback, never a dead end ──

const NO_CALENDAR_AVAILABILITY =
  'No online calendar is connected, so there are no live time slots. Do not offer or promise a specific time. ' +
  'Ask which day and time suit the caller, then call book_appointment with their name, best phone number, that preferred date and time, ' +
  'and a short note about their matter. The office will call them back to confirm.';

async function recordCallbackRequest(args: any, userId: string, callId: string): Promise<string> {
  const { name, email, phone, date, time, timezone, service, notes } = args;
  const requested = [date, time, timezone].filter(Boolean).join(' ');
  const supabase = getServiceSupabase();
  const { error } = await supabase.from('callbacks').insert({
    user_id: userId,
    client_name: name,
    client_phone: phone || 'not provided', // callbacks.client_phone is NOT NULL; caller number stays on the call record
    client_email: email || null,
    status: 'pending',
    timezone: timezone || 'UTC',
    callback_reason: `Consultation request${service ? `: ${service}` : ''}`,
    special_instructions: [requested && `Requested time: ${requested}`, notes].filter(Boolean).join('\n') || null,
    source_details: JSON.stringify({ source: 'ai_call', call_id: callId }),
  });
  if (error) console.error('[agent-tools] Callback request insert failed:', error);

  const alerted = await alertOwner(supabase, userId, `Callback requested: ${name}`, [
    'A caller asked to book a consultation, but no calendar is connected, so nothing was booked.',
    'Please call them back to confirm a time.',
    `Name: ${name}`,
    `Phone: ${phone || 'not given (see the call record)'}`,
    `Email: ${email || 'not given'}`,
    `Requested time: ${requested || 'not given'}`,
    ...(service ? [`About: ${service}`] : []),
    ...(notes ? [`Notes: ${notes}`] : []),
  ]);
  if (error && !alerted) {
    await notifyError('agent-tools: callback request not saved or emailed', error.message || String(error), { userId, callId });
  }

  return `Nothing was booked because no online calendar is connected. Tell the caller their request${requested ? ` for ${requested}` : ''} is noted ` +
    'and someone from the office will call them back to confirm a time. Confirm their name and best callback number, then close politely.';
}

// ── Tool: check_availability (Google Calendar first, Cal.com fallback) ──

async function handleCheckAvailability(args: any, calApiKey: string, userId: string | null, locale = 'en-US'): Promise<string> {
  const { date, timezone } = args;
  if (!date) return 'I can check availability for you. What date did you have in mind?';
  let startTime: string;
  let endTime: string;
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !timezone) throw new Error('missing date or timezone');
    const day = dayjs.tz(`${date}T00:00:00`, timezone);
    if (day.format('YYYY-MM-DD') !== date) throw new Error('invalid date');
    startTime = day.toISOString();
    endTime = dayjs.tz(`${dayjs(date).add(1, 'day').format('YYYY-MM-DD')}T00:00:00`, timezone).toISOString();
  } catch {
    return 'Please confirm a valid date and IANA timezone before checking availability.';
  }

  // Try Google Calendar first
  if (userId) {
    const gcal = await getGoogleCalendarForUser(userId);
    if (gcal) {
      try {
        const calendarId = gcal.config.calendar_id || 'primary';
        const timeMin = startTime;
        const timeMax = endTime;

        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${gcal.accessToken}` } });

        if (res.ok) {
          const data = await res.json();
          const events = (data.items || []).filter((e: any) => e.status !== 'cancelled');

          if (events.length === 0) {
            return `No calendar events were found in the checked window for ${formatDateReadable(date)}. This does not establish business hours or bookable slots; confirm the firm's schedule before offering a time.`;
          }

          // Build busy times list
          const busyTimes = events.map((e: any) => {
            const start = e.start?.dateTime || e.start?.date;
            const end = e.end?.dateTime || e.end?.date;
            return `${start} - ${end}`;
          });

          return `On ${formatDateReadable(date)}, these times are already booked: ${busyTimes.join(', ')}. Other times are not guaranteed available; confirm business hours and the exact timezone before booking.`;
        }
      } catch (err) {
        console.error('[agent-tools] Google Calendar availability error:', err);
      }
    }
  }

  // Fallback to Cal.com
  const eventTypeId = calApiKey ? await getEventTypeId(calApiKey) : null;
  if (!eventTypeId) return NO_CALENDAR_AVAILABILITY;

  try {
    const url = `${CAL_BASE_URL}/slots?apiKey=${calApiKey}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&eventTypeId=${eventTypeId}&timeZone=${encodeURIComponent(timezone)}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[agent-tools] Cal.com slots error:', response.status, errText);
      return 'Sorry, I could not check availability right now. Please try again.';
    }

    const data = await response.json();
    const slots = data.data?.slots || data.slots || {};
    const dateSlots = slots[date] || [];

    if (dateSlots.length === 0) {
      return `There are no available time slots on ${formatDateReadable(date)}. Would you like to check another date?`;
    }

    const formattedSlots = dateSlots
      .slice(0, 8)
      .map((slot: any) => {
        const start = slot.time || slot.start || slot;
        return `${new Date(start).toLocaleTimeString(locale, { timeZone: timezone, hour: 'numeric', minute: '2-digit' })} (${timezone}; exact start: ${start})`;
      })
      .join(', ');

    const moreText = dateSlots.length > 8 ? ` and ${dateSlots.length - 8} more` : '';
    return `Available times on ${formatDateReadable(date)}: ${formattedSlots}${moreText}. Which time works best for you?`;
  } catch (err) {
    console.error('[agent-tools] check_availability error:', err);
    return 'Sorry, I had trouble checking availability. Please try again.';
  }
}

// ── Tool: book_appointment ──

async function handleBookAppointment(
  args: any,
  calApiKey: string,
  userId: string | null,
  callId: string,
  locale = 'en-US'
): Promise<string> {
  const { name, email, phone, date, time, service, notes } = args;

  if (!name || !date || !time) {
    return 'I need at least your name, preferred date, and time to book an appointment.';
  }

  const gcal = userId ? await getGoogleCalendarForUser(userId).catch(() => null) : null;
  if (userId && !gcal && !calApiKey) return recordCallbackRequest(args, userId, callId);

  // Require the exact offset-bearing slot and named zone. Bare local times
  // cannot distinguish the two occurrences of a clock time at the DST fold.
  let startISO: string;
  const timezone = args.timezone;
  try {
    if (typeof args.start !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(args.start) || !timezone) throw new Error('ambiguous slot');
    const instant = new Date(args.start);
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
    const part = (key: string) => parts.find(p => p.type === key)?.value;
    if (`${part('year')}-${part('month')}-${part('day')}` !== date || `${part('hour')}:${part('minute')}` !== time) throw new Error('slot mismatch');
    startISO = instant.toISOString();
  } catch {
    return 'Please confirm an exact calendar slot with its UTC offset, date, time, and IANA timezone before booking. No appointment was made.';
  }

  try {
    const formattedDate = new Date(startISO).toLocaleDateString(locale, { timeZone: timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = new Date(startISO).toLocaleTimeString(locale, { timeZone: timezone, hour: 'numeric', minute: '2-digit' }) + ` (${timezone})`;
    let bookingId = 'N/A';
    let bookedVia = 'cal.com';

    // Try Google Calendar first
    if (userId) {
      if (gcal) {
        const calendarId = gcal.config.calendar_id || 'primary';
        const startDate = new Date(startISO);
        const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30-min appointment

        const busyResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
          method: 'POST',
          headers: { Authorization: `Bearer ${gcal.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeMin: startISO, timeMax: endDate.toISOString(), timeZone: timezone, items: [{ id: calendarId }] }),
        });
        if (!busyResponse.ok) return 'Calendar availability could not be verified. No appointment was made.';
        const busyCalendar = (await busyResponse.json()).calendars?.[calendarId];
        if (!busyCalendar || busyCalendar.errors?.length || !Array.isArray(busyCalendar.busy)) return 'Calendar availability could not be verified. No appointment was made.';
        if (busyCalendar.busy.length) return 'That slot is no longer available. No appointment was made. Please choose another slot.';

        const gcalEvent = {
          summary: `Appointment: ${name}`,
          description: [
            name ? `Name: ${name}` : '',
            email ? `Email: ${email}` : '',
            phone ? `Phone: ${phone}` : '',
            service ? `Service: ${service}` : '',
            notes ? `Notes: ${notes}` : '',
            `Source: Boltcall AI Receptionist`,
            `Call ID: ${callId}`,
          ].filter(Boolean).join('\n'),
          start: { dateTime: startDate.toISOString() },
          end: { dateTime: endDate.toISOString() },
          attendees: email ? [{ email }] : [],
          reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 60 }, { method: 'popup', minutes: 15 }] },
        };

        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${gcal.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(gcalEvent),
        });

        if (res.ok) {
          const eventData = await res.json();
          bookingId = eventData.id;
          bookedVia = 'google_calendar';
        } else {
          console.error('[agent-tools] Google Calendar booking failed:', res.status);
          return 'The calendar did not confirm the booking. Do not book again until the team checks whether an appointment was created.';
        }
      }
    }

    // Fallback to Cal.com if Google Calendar didn't work
    if (bookedVia !== 'google_calendar') {
      const eventTypeId = await getEventTypeId(calApiKey);
      if (!eventTypeId) {
        if (userId) return recordCallbackRequest(args, userId, callId);
        return 'Appointment scheduling is not configured. Nothing was booked. Tell the caller the office will call them back, and confirm their best number.';
      }

      const endDate = new Date(startISO);
      endDate.setMinutes(endDate.getMinutes() + 20);

      const bookingBody: any = {
        eventTypeId,
        start: startISO,
        end: endDate.toISOString(),
        responses: { name, email: email || 'noemail@placeholder.com', location: { value: 'integrations:daily', optionValue: '' } },
        metadata: { source: 'ai_receptionist', call_id: callId, phone: phone || '', service: service || '', notes: notes || '' },
        timeZone: timezone,
        language: 'en',
      };

      const response = await fetch(`${CAL_BASE_URL}/bookings?apiKey=${calApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingBody),
      });

      if (!response.ok) {
        console.error('[agent-tools] Cal.com booking error:', response.status, await response.text());
        if (response.status >= 500 || response.status === 408) return 'The calendar outcome is uncertain. Do not book again until the team checks whether an appointment was created.';
        return `I wasn't able to book that time slot. It may no longer be available. Would you like to try a different time?`;
      }

      const bookingData = await response.json();
      const booking = bookingData.data || bookingData;
      bookingId = booking.id || booking.uid || 'N/A';
    }

    if (!bookingId || bookingId === 'N/A') {
      return 'The calendar response did not include a booking reference. The outcome is uncertain; do not book again. Ask the team to reconcile the calendar.';
    }

    // Insert into Supabase
    if (userId) {
      const supabase = getServiceSupabase();

      try {
        const estimatedValueCents = await estimateBookingValueCents(supabase, userId, service);
        const appointment: Record<string, any> = {
          user_id: userId,
          call_id: callId || null,
          cal_booking_id: String(bookingId),
          cal_event_type: service || 'Appointment',
          client_name: name,
          client_email: email || '',
          client_phone: phone || '',
          service_name: service || 'Appointment',
          starts_at: startISO,
          timezone,
          status: 'confirmed',
          estimated_value_cents: estimatedValueCents,
          raw_webhook: { source: 'agent_tool', call_id: callId, booked_via: bookedVia },
        };
        let { error: appointmentError } = await supabase.from('appointments').insert(appointment);
        // ponytail: prod lacks appointments.call_id until the attribution migration lands;
        // retry without it (call_id is still in raw_webhook). Drop once the column exists.
        if (appointmentError?.code === '42703' || appointmentError?.code === 'PGRST204') {
          const { call_id: _omit, ...withoutCallId } = appointment;
          ({ error: appointmentError } = await supabase.from('appointments').insert(withoutCallId));
        }
        if (appointmentError) throw new Error('Appointment storage failed');
      } catch (dbErr) {
        console.error('[agent-tools] Failed to insert appointment:', dbErr);
        return `The calendar returned reference ${bookingId}, but local records could not be saved. Do not book again. Ask the team to reconcile this reference.`;
      }

      try {
        const { error: leadError } = await supabase.from('leads').insert({
          first_name: name.split(' ')[0] || name,
          last_name: name.split(' ').slice(1).join(' ') || null,
          email: email || null,
          phone: phone || null,
          source: 'ai_receptionist',
          status: 'booked',
          user_id: userId,
          raw_data: { call_id: callId, service, booking_id: bookingId, booked_via: bookedVia },
        });
        if (leadError) throw new Error('Lead storage failed');
      } catch (dbErr) {
        console.error('[agent-tools] Failed to insert lead:', dbErr);
        return `The calendar returned reference ${bookingId}, but intake records could not be saved. Do not book again. Ask the team to reconcile this reference.`;
      }

      try {
        await deductTokens(userId, TOKEN_COSTS.lead_processed, 'lead_processed',
          `Appointment booked via AI call: ${name} on ${date} at ${time}`, { call_id: callId, booking_id: bookingId, service });
      } catch (tokenErr) {
        console.error('[agent-tools] Token deduction failed (non-blocking):', tokenErr);
      }
    }

    const refText = bookingId !== 'N/A' ? ` Your reference number is ${bookingId}.` : '';
    await notifyInfo(`📅 *New Appointment Booked via AI*\n\n👤 ${name}\n📧 ${email || 'N/A'}\n📱 ${phone || 'N/A'}\n📅 ${formattedDate} at ${formattedTime}\n💼 ${service || 'General'}\n📞 Call: ${callId}${refText}`).catch(() => {
      console.error('[agent-tools] Booking notification failed after persistence');
    });

    return `Great! Your appointment is confirmed for ${formattedDate} at ${formattedTime}.${refText} Is there anything else I can help you with?`;
  } catch (err) {
    console.error('[agent-tools] book_appointment error:', err);
    return 'The booking outcome could not be verified. Do not book again until the team checks the calendar. No callback has been arranged by this tool.';
  }
}

// ── Tool: cancel_appointment ──

async function handleCancelAppointment(args: any, userId: string | null, callId: string, locale = 'en-US'): Promise<string> {
  const { name, phone, email, reason } = args;
  if (!name && !phone && !email) return 'I need your name, phone number, or email to find your appointment.';

  if (!userId) return 'Sorry, I cannot access the calendar right now. Please call back and we will help you cancel.';

  const query = name || email || phone;
  const supabase = getServiceSupabase();

  // Try Google Calendar
  const gcal = await getGoogleCalendarForUser(userId);
  if (gcal) {
    try {
      const calendarId = gcal.config.calendar_id || 'primary';
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?q=${encodeURIComponent(query)}&timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(future)}&singleEvents=true&orderBy=startTime&maxResults=5`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${gcal.accessToken}` } });

      if (res.ok) {
        const data = await res.json();
        const events = (data.items || []).filter((e: any) => e.status !== 'cancelled');

        if (events.length === 0) {
          return `I couldn't find any upcoming appointments for ${query}. Could you provide more details like your full name or email?`;
        }

        // Cancel the first matching event
        const event = events[0];
        const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.id)}?sendUpdates=all`;
        const deleteRes = await fetch(deleteUrl, { method: 'DELETE', headers: { Authorization: `Bearer ${gcal.accessToken}` } });

        if (deleteRes.ok || deleteRes.status === 204) {
          const eventDate = formatDateReadable(event.start?.dateTime || event.start?.date, locale);
          const eventTime = formatTimeSlot(event.start?.dateTime || event.start?.date, locale);

          // Update Supabase appointment status
          try {
            await supabase.from('appointments')
              .update({ status: 'cancelled', raw_webhook: { cancelled_via: 'ai_receptionist', call_id: callId, reason } })
              .eq('user_id', userId)
              .eq('cal_booking_id', event.id);
          } catch { /* best effort */ }

          await notifyInfo(`❌ *Appointment Cancelled via AI*\n\n👤 ${query}\n📅 ${eventDate} at ${eventTime}\n💬 Reason: ${reason || 'Not specified'}\n📞 Call: ${callId}`);

          return `Your appointment on ${eventDate} at ${eventTime} has been cancelled. Would you like to reschedule for a different time?`;
        }
      }
    } catch (err) {
      console.error('[agent-tools] Google Calendar cancel error:', err);
    }
  }

  return 'Sorry, I was unable to cancel the appointment right now. Let me note your request and have someone follow up with you shortly.';
}

// ── Tool: reschedule_appointment ──

async function handleRescheduleAppointment(args: any, userId: string | null, callId: string, locale = 'en-US'): Promise<string> {
  const { name, phone, email, new_date, new_time } = args;
  if (!name && !phone && !email) return 'I need your name, phone number, or email to find your appointment.';
  if (!new_date || !new_time) return 'I need the new date and time you would like to reschedule to.';

  if (!userId) return 'Sorry, I cannot access the calendar right now. Please call back.';

  const query = name || email || phone;
  const gcal = await getGoogleCalendarForUser(userId);

  if (gcal) {
    try {
      const calendarId = gcal.config.calendar_id || 'primary';
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?q=${encodeURIComponent(query)}&timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(future)}&singleEvents=true&orderBy=startTime&maxResults=5`;
      const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${gcal.accessToken}` } });

      if (searchRes.ok) {
        const data = await searchRes.json();
        const events = (data.items || []).filter((e: any) => e.status !== 'cancelled');

        if (events.length === 0) {
          return `I couldn't find any upcoming appointments for ${query}. Would you like to book a new appointment instead?`;
        }

        const event = events[0];
        const newStart = new Date(`${new_date}T${new_time}:00Z`);
        const newEnd = new Date(newStart.getTime() + 30 * 60 * 1000);

        const patchUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.id)}?sendUpdates=all`;
        const patchRes = await fetch(patchUrl, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${gcal.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ start: { dateTime: newStart.toISOString() }, end: { dateTime: newEnd.toISOString() } }),
        });

        if (patchRes.ok) {
          const newFormattedDate = formatDateReadable(new_date, locale);
          const newFormattedTime = formatTimeSlot(`${new_date}T${new_time}:00Z`, locale);

          await notifyInfo(`🔄 *Appointment Rescheduled via AI*\n\n👤 ${query}\n📅 New: ${newFormattedDate} at ${newFormattedTime}\n📞 Call: ${callId}`);

          return `Your appointment has been rescheduled to ${newFormattedDate} at ${newFormattedTime}. You'll receive a calendar update. Is there anything else I can help with?`;
        }
      }
    } catch (err) {
      console.error('[agent-tools] Google Calendar reschedule error:', err);
    }
  }

  return 'Sorry, I was unable to reschedule right now. Let me note your preferred time and have someone follow up.';
}

// ── Tool: send_sms ──

async function handleSendSms(
  args: any,
  userId: string | null,
  callId: string
): Promise<string> {
  const { phone_number, message } = args;

  if (!phone_number || !message) {
    return 'I need a phone number and message to send a text.';
  }

  try {
    const fromNumber = await resolveTwilioFromNumber(getServiceSupabase(), userId);

    if (!fromNumber) {
      return 'SMS sending is not configured. Please contact the business directly.';
    }

    const result = await sendTwilioSms(phone_number, fromNumber, message);

    // Deduct tokens (5 for SMS)
    if (userId) {
      try {
        await deductTokens(
          userId,
          TOKEN_COSTS.sms_sent,
          'sms_sent',
          `SMS sent during AI call to ${phone_number}`,
          { call_id: callId, message_sid: result.sid, to: phone_number }
        );
      } catch (tokenErr) {
        console.error('[agent-tools] SMS token deduction failed (non-blocking):', tokenErr);
      }
    }

    return 'Text message sent successfully.';
  } catch (err) {
    console.error('[agent-tools] send_sms error:', err);
    return 'Sorry, I was unable to send the text message right now.';
  }
}

// ── Main handler ──

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!isAuthorizedToolRequest(event)) {
    console.warn('[agent-tools] Rejected unauthenticated Retell tool request');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ tool_call_id: '', content: 'Unauthorized tool request.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { tool_call_id, name } = body;
    const call_id = body.call?.call_id ?? body.call_id;
    const agent_id = body.call?.agent_id ?? body.agent_id;
    const toolArgs = body.args ?? body.arguments;

    console.log(`[agent-tools] Tool call: ${name}, call_id=${call_id}, agent_id=${agent_id}`);

    if (!name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing tool name' }),
      };
    }

    // Look up agent owner and locale for Supabase operations
    const { userId, locale } = agent_id ? await getAgentOwner(agent_id) : { userId: null, locale: 'en-US' };

    if (!userId) {
      return { statusCode: 403, headers, body: JSON.stringify({ tool_call_id: tool_call_id || '', content: 'The agent account could not be verified. No action was taken.' }) };
    }

    // Get Cal.com API key per user, falling back to global env var
    const calApiKey = await getCalApiKey(userId);

    let content: string;

    switch (name) {
      case 'lookup_caller':
        content = await handleLookupCaller(toolArgs || {}, userId, locale);
        break;

      case 'check_availability':
        content = await handleCheckAvailability(toolArgs || {}, calApiKey, userId, locale);
        break;

      case 'book_appointment':
        content = await handleBookAppointment(toolArgs || {}, calApiKey, userId, call_id || '', locale);
        break;

      case 'cancel_appointment':
        content = await handleCancelAppointment(toolArgs || {}, userId, call_id || '', locale);
        break;

      case 'reschedule_appointment':
        content = await handleRescheduleAppointment(toolArgs || {}, userId, call_id || '', locale);
        break;

      case 'send_sms':
        content = await handleSendSms(toolArgs || {}, userId, call_id || '');
        break;

      case 'search_knowledge_base':
        content = await handleSearchKnowledgeBase(toolArgs || {}, userId);
        break;

      default:
        content = `Unknown tool: ${name}`;
        console.error(`[agent-tools] Unknown tool called: ${name}`);
    }

    // Retell expects { tool_call_id, content } in the response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        tool_call_id: tool_call_id || '',
        content,
      }),
    };
  } catch (err) {
    console.error('[agent-tools] Unhandled error:', err);
    await notifyError('agent-tools: Unhandled exception', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        tool_call_id: '',
        content: 'Sorry, an error occurred while processing your request.',
      }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
