/**
 * Slack adapter — Agency OS Layer 4 (Drivers).
 *
 * One adapter, one external system. Agents call this; the adapter handles
 * auth, retries, schema, errors, and event emission.
 *
 * Surfaces:
 *   1. sendDirectNotification — per-client notification via the client's own
 *      Slack webhook URL (stored in agency_clients.secrets jsonb). Falls back
 *      to email if no Slack secret is configured.
 *   2. inviteToCohortChannel — looks up or provisions a cohort channel keyed
 *      by (vertical, region, revenue_tier) and invites the client's primary
 *      email via the Slack Admin API. Feeds /client/circle.
 *   3. postCohortWin — posts an anonymized win to a cohort channel.
 *   4. listCohortMembers — returns anonymized cohort roster for the client
 *      portal's <CohortRoster /> component.
 *
 * Adapter rules (per plan §6 / §13):
 *   • Every external call retries exactly once on transient failures
 *     (5xx, network, rate-limit). 4xx fails fast.
 *   • Every action emits an agency_events row (mirrored to aios_event_log
 *     via the shared emit helper when present).
 *   • Service-role Supabase only — never accept anon-key writes from here.
 *   • Never throw on Telegram/event-log side effects.
 */

import { getServiceSupabase } from '../token-utils';
import { notifyError } from '../notify';
import {
  emitAgencyEvent,
  type AgencyEventType,
  type AgencyEventSeverity,
} from '../emit-agency-event';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DirectNotificationChannel = 'critical' | 'digest' | 'weekly_report';

export interface SendDirectNotificationOpts {
  client_id: string;
  channel: DirectNotificationChannel;
  message: string;
  blocks?: unknown[];
  file_url?: string;
}

export interface SendDirectNotificationResult {
  ts: string;
}

export interface InviteToCohortChannelOpts {
  client_id: string;
  vertical: string;
  region?: string;
  revenue_tier?: string;
}

export interface InviteToCohortChannelResult {
  channel_id: string;
  invited_at: string;
}

export interface PostCohortWinOpts {
  cohort_channel_id: string;
  client_anonymized_label: string;
  metric: string;
  evidence_url?: string;
}

export interface PostCohortWinResult {
  ts: string;
}

export interface ListCohortMembersOpts {
  cohort_channel_id: string;
}

export interface CohortMember {
  user_id: string;
  business_label_anonymized: string;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

const SLACK_API = 'https://slack.com/api';

/** Slack workspace admin token (Bolt-OS workspace). Required for Admin API. */
function slackAdminToken(): string {
  const t = process.env.SLACK_ADMIN_TOKEN || process.env.SLACK_BOT_TOKEN || '';
  if (!t) {
    throw new Error(
      '[slack-adapter] SLACK_ADMIN_TOKEN (or SLACK_BOT_TOKEN) is required for cohort/admin operations',
    );
  }
  return t;
}

/**
 * Emit a kernel agency_events row via the shared helper. Never throws.
 *
 * Spec §7 (slack-adapter rules): all Slack event types are already in the
 * allowed AgencyEventType union (notification_sent / notification_failed /
 * notification_fallback_email / cohort_invited / cohort_win_posted /
 * cohort_members_listed). The kernel emitter handles the aios_event_log
 * mirror automatically — we do NOT double-write.
 *
 * Exception: cohort_win_failed maps to adapter_error with payload.op = 'cohort_win'.
 */
async function emitEvent(row: {
  client_id?: string | null;
  agent_name: string;
  type: AgencyEventType;
  severity?: AgencyEventSeverity;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await emitAgencyEvent({
      client_id: row.client_id ?? '',
      agent_name: row.agent_name,
      type: row.type,
      severity: row.severity ?? 'info',
      payload: row.payload ?? {},
    });
  } catch (err) {
    // Event-log failures must never break the adapter's primary action.
    console.error('[slack-adapter] emitEvent failed:', err);
  }
}

/** Sleep helper for retry-once backoff. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Retry-once policy: one retry on transient failure (network throw, HTTP
 * 5xx, or Slack `ok=false` with retryable error code). 4xx and explicit
 * Slack rejections (e.g. `channel_not_found`) fail fast.
 */
const RETRYABLE_SLACK_ERRORS = new Set([
  'ratelimited',
  'service_unavailable',
  'fatal_error',
  'request_timeout',
  'internal_error',
]);

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  context: string,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status >= 500) {
        lastErr = new Error(`[${context}] HTTP ${res.status}`);
        if (attempt === 0) {
          await sleep(400);
          continue;
        }
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt === 0) {
        await sleep(400);
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error(`[${context}] unknown failure`);
}

/** Call a Slack Web API method with bot token, JSON body, retry-once. */
async function slackApi<T = Record<string, unknown>>(
  method: string,
  body: Record<string, unknown>,
  context: string,
): Promise<T & { ok: boolean; error?: string }> {
  const token = slackAdminToken();
  let lastJson: (T & { ok: boolean; error?: string }) | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchWithRetry(
      `${SLACK_API}/${method}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
      `slack:${method}`,
    );

    const json = (await res.json().catch(() => ({}))) as T & { ok: boolean; error?: string };
    lastJson = json;

    if (json.ok) return json;

    const err = (json.error || '').toLowerCase();
    if (attempt === 0 && RETRYABLE_SLACK_ERRORS.has(err)) {
      await sleep(500);
      continue;
    }
    throw new Error(`[${context}] slack ${method} failed: ${json.error || 'unknown'}`);
  }

  throw new Error(`[${context}] slack ${method} failed after retry: ${lastJson?.error || 'unknown'}`);
}

/** Post a message to a Slack incoming webhook URL with retry-once. */
async function postToWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
  context: string,
): Promise<{ ts: string }> {
  const res = await fetchWithRetry(
    webhookUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    `webhook:${context}`,
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[${context}] webhook HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  // Incoming webhooks don't return a real Slack `ts`. Use a synthetic ts so
  // the caller has a stable ID it can store in agency_artifacts.ship_result.
  return { ts: `webhook-${Date.now()}` };
}

/** Stable, anonymized label generator for cohort UX. */
function deriveAnonymizedLabel(client: {
  vertical?: string | null;
  region?: string | null;
  business_name?: string | null;
}): string {
  const vertical = (client.vertical || 'business').replace(/_/g, ' ');
  const region = client.region || 'undisclosed metro';
  // Stable hash-suffix so the same client always renders the same label
  // without leaking their business_name.
  let hash = 0;
  const seed = (client.business_name || vertical) + region;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const suffix = Math.abs(hash).toString(36).slice(0, 4).toUpperCase();
  return `${capitalize(vertical)} operator (${region}) · ${suffix}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cohortChannelName(vertical: string, region?: string, tier?: string): string {
  const parts = ['cohort', vertical, region, tier].filter(Boolean) as string[];
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// ─── Email fallback (degrade gracefully when no Slack secret) ───────────────

/**
 * Minimal email fallback used when a client has no Slack webhook configured.
 * Writes a queued email row Supabase-side; the actual send is handled by the
 * existing email pipeline (Brevo). Returns the row id as the synthetic `ts`.
 */
async function emailFallback(opts: {
  client_id: string;
  channel: DirectNotificationChannel;
  message: string;
}): Promise<{ ts: string }> {
  const supabase = getServiceSupabase();

  const { data: client, error } = await supabase
    .from('agency_clients')
    .select('id, user_id, business_name')
    .eq('id', opts.client_id)
    .maybeSingle();

  if (error || !client) {
    throw new Error(`[slack-adapter.emailFallback] client ${opts.client_id} not found`);
  }

  // Resolve the client's primary email from auth.users via user_id.
  let to: string | null = null;
  if (client.user_id) {
    const { data: userRes } = await supabase.auth.admin.getUserById(client.user_id);
    to = userRes?.user?.email ?? null;
  }
  if (!to) {
    throw new Error(`[slack-adapter.emailFallback] no email resolvable for client ${opts.client_id}`);
  }

  const subject =
    opts.channel === 'critical'
      ? `[Boltcall] Action needed for ${client.business_name || 'your account'}`
      : opts.channel === 'weekly_report'
      ? `[Boltcall] Weekly report ready`
      : `[Boltcall] Daily digest`;

  const { data: queued, error: insertErr } = await supabase
    .from('email_outbox')
    .insert({
      to_email: to,
      subject,
      body_text: opts.message,
      source: 'agency.slack-adapter.fallback',
      meta: { client_id: opts.client_id, channel: opts.channel },
    })
    .select('id')
    .single();

  if (insertErr) {
    throw new Error(`[slack-adapter.emailFallback] failed to queue email: ${insertErr.message}`);
  }

  return { ts: `email-${queued.id}` };
}

// ─── Public API: 1. sendDirectNotification ──────────────────────────────────

/**
 * Send a per-client notification via the client's Slack webhook. Falls back
 * to queued email if no webhook secret is configured.
 *
 * Channel semantics:
 *   • critical      → red banner, @here ping, never batched.
 *   • digest        → daily roll-up, no ping.
 *   • weekly_report → Friday narrative report, may include file_url.
 */
export async function sendDirectNotification(
  opts: SendDirectNotificationOpts,
): Promise<SendDirectNotificationResult> {
  if (!opts.client_id || !opts.message || !opts.channel) {
    throw new Error('[sendDirectNotification] client_id, channel, and message are required');
  }

  const supabase = getServiceSupabase();

  const { data: client, error } = await supabase
    .from('agency_clients')
    .select('id, business_name, secrets')
    .eq('id', opts.client_id)
    .maybeSingle();

  if (error || !client) {
    throw new Error(`[sendDirectNotification] client ${opts.client_id} not found`);
  }

  // Per the plan: per-client Slack webhook URL lives in agency_clients.secrets
  // jsonb. Shape: { slack_webhook_url: string, slack_channel_overrides?: {...} }.
  const secrets = (client.secrets ?? {}) as {
    slack_webhook_url?: string;
    slack_channel_overrides?: Partial<Record<DirectNotificationChannel, string>>;
  };
  const webhookUrl = secrets.slack_webhook_url || '';

  // Fallback: no Slack → queue email and tag the event so the OS knows the
  // client is on degraded notification.
  if (!webhookUrl) {
    try {
      const result = await emailFallback({
        client_id: opts.client_id,
        channel: opts.channel,
        message: opts.message,
      });
      await emitEvent({
        client_id: opts.client_id,
        agent_name: 'slack-adapter',
        type: 'notification_fallback_email',
        severity: 'warn',
        payload: {
          channel: opts.channel,
          reason: 'no_slack_webhook',
          fallback_ts: result.ts,
        },
      });
      return result;
    } catch (fallbackErr) {
      await notifyError('slack-adapter.sendDirectNotification fallback failed', fallbackErr, {
        client_id: opts.client_id,
        channel: opts.channel,
      });
      await emitEvent({
        client_id: opts.client_id,
        agent_name: 'slack-adapter',
        type: 'notification_failed',
        severity: 'error',
        payload: { channel: opts.channel, reason: 'fallback_failed' },
      });
      throw fallbackErr;
    }
  }

  // Build the Slack payload. Prefer blocks when supplied (richer); otherwise
  // wrap the message in a single section block + colored attachment for the
  // critical channel.
  const text = opts.message.slice(0, 3000);
  const payload: Record<string, unknown> = { text };
  if (opts.blocks && opts.blocks.length > 0) {
    payload.blocks = opts.blocks;
  }
  if (opts.channel === 'critical') {
    payload.attachments = [
      {
        color: '#d23f3f',
        text: 'Critical — action needed',
        fallback: 'Critical alert from Boltcall',
      },
    ];
  }
  if (opts.file_url) {
    const blocks = (payload.blocks as unknown[] | undefined) ?? [];
    payload.blocks = [
      ...blocks,
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Attached file: <${opts.file_url}|open>`,
          },
        ],
      },
    ];
  }
  if (secrets.slack_channel_overrides?.[opts.channel]) {
    payload.channel = secrets.slack_channel_overrides[opts.channel];
  }

  try {
    const result = await postToWebhook(
      webhookUrl,
      payload,
      `notification:${opts.channel}`,
    );
    await emitEvent({
      client_id: opts.client_id,
      agent_name: 'slack-adapter',
      type: 'notification_sent',
      severity: opts.channel === 'critical' ? 'warn' : 'info',
      payload: { channel: opts.channel, ts: result.ts, has_file: !!opts.file_url },
    });
    return result;
  } catch (err) {
    await notifyError('slack-adapter.sendDirectNotification failed', err, {
      client_id: opts.client_id,
      channel: opts.channel,
    });
    await emitEvent({
      client_id: opts.client_id,
      agent_name: 'slack-adapter',
      type: 'notification_failed',
      severity: 'error',
      payload: { channel: opts.channel, reason: 'slack_webhook_failed' },
    });
    throw err;
  }
}

// ─── Public API: 2. inviteToCohortChannel ───────────────────────────────────

/**
 * Look up or create a cohort channel keyed by (vertical, region, tier) and
 * invite the client's primary email via Slack Admin API.
 *
 * Cohort registry lives in `agency_cohorts` (channel_id, name, vertical,
 * region, revenue_tier). If the row doesn't exist, the adapter provisions
 * the channel with `conversations.create` (private), then upserts the row.
 */
export async function inviteToCohortChannel(
  opts: InviteToCohortChannelOpts,
): Promise<InviteToCohortChannelResult> {
  if (!opts.client_id || !opts.vertical) {
    throw new Error('[inviteToCohortChannel] client_id and vertical are required');
  }

  const supabase = getServiceSupabase();

  // 1. Resolve client + primary email.
  const { data: client, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, user_id, business_name, vertical, region')
    .eq('id', opts.client_id)
    .maybeSingle();

  if (clientErr || !client) {
    throw new Error(`[inviteToCohortChannel] client ${opts.client_id} not found`);
  }

  let primaryEmail: string | null = null;
  if (client.user_id) {
    const { data: userRes } = await supabase.auth.admin.getUserById(client.user_id);
    primaryEmail = userRes?.user?.email ?? null;
  }
  if (!primaryEmail) {
    throw new Error(`[inviteToCohortChannel] no email for client ${opts.client_id}`);
  }

  // 2. Look up the cohort row.
  const cohortKey = {
    vertical: opts.vertical,
    region: opts.region ?? null,
    revenue_tier: opts.revenue_tier ?? null,
  };
  const channelName = cohortChannelName(opts.vertical, opts.region, opts.revenue_tier);

  const cohortQuery = supabase
    .from('agency_cohorts')
    .select('id, channel_id, name')
    .eq('vertical', cohortKey.vertical);

  // Use `is` for null-safe equality on region/tier.
  if (cohortKey.region === null) cohortQuery.is('region', null);
  else cohortQuery.eq('region', cohortKey.region);
  if (cohortKey.revenue_tier === null) cohortQuery.is('revenue_tier', null);
  else cohortQuery.eq('revenue_tier', cohortKey.revenue_tier);

  const { data: existing, error: lookupErr } = await cohortQuery.maybeSingle();
  if (lookupErr) {
    throw new Error(`[inviteToCohortChannel] cohort lookup failed: ${lookupErr.message}`);
  }

  let channelId: string;

  if (existing?.channel_id) {
    channelId = existing.channel_id;
  } else {
    // 3a. Provision a new private channel.
    const created = await slackApi<{ channel: { id: string; name: string } }>(
      'conversations.create',
      { name: channelName, is_private: true },
      'cohort.create',
    );
    channelId = created.channel.id;

    // Set a topic so members understand the group.
    await slackApi(
      'conversations.setTopic',
      {
        channel: channelId,
        topic: `Cohort: ${opts.vertical}${opts.region ? ' · ' + opts.region : ''}${opts.revenue_tier ? ' · ' + opts.revenue_tier : ''}`,
      },
      'cohort.setTopic',
    ).catch((e) => {
      // Non-fatal — keep going.
      console.warn('[inviteToCohortChannel] setTopic failed:', e);
    });

    // 3b. Persist the cohort row.
    const { error: upsertErr } = await supabase.from('agency_cohorts').upsert(
      {
        channel_id: channelId,
        name: channelName,
        vertical: cohortKey.vertical,
        region: cohortKey.region,
        revenue_tier: cohortKey.revenue_tier,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'channel_id' },
    );
    if (upsertErr) {
      // The channel exists in Slack; surface a warn but don't fail the invite.
      console.warn('[inviteToCohortChannel] cohort upsert failed:', upsertErr.message);
    }
  }

  // 4. Resolve Slack user_id for the client's email (Slack invites need user_ids).
  let slackUserId: string | null = null;
  try {
    const lookup = await slackApi<{ user: { id: string } }>(
      'users.lookupByEmail',
      { email: primaryEmail },
      'cohort.lookupByEmail',
    );
    slackUserId = lookup.user.id;
  } catch (lookupErr) {
    // Email may not yet be a Slack member of the workspace — send a workspace
    // invite via Admin API. Requires admin.users:write scope on the token.
    try {
      await slackApi(
        'admin.users.invite',
        {
          email: primaryEmail,
          team_id: process.env.SLACK_TEAM_ID || '',
          channel_ids: channelId,
          real_name: client.business_name || '',
          resend: true,
        },
        'cohort.adminInvite',
      );
      // The pending invite is enough — `invited_at` is now; no slack_user_id
      // yet. The cohort matcher cron will reconcile membership once the user
      // accepts the workspace invite.
    } catch (adminErr) {
      await notifyError('slack-adapter.inviteToCohortChannel admin invite failed', adminErr, {
        client_id: opts.client_id,
        email: primaryEmail,
        channel_id: channelId,
      });
      throw adminErr;
    }
  }

  // 5. If we resolved a user_id, invite them to the channel.
  if (slackUserId) {
    try {
      await slackApi(
        'conversations.invite',
        { channel: channelId, users: slackUserId },
        'cohort.invite',
      );
    } catch (inviteErr) {
      const msg = inviteErr instanceof Error ? inviteErr.message : String(inviteErr);
      // already_in_channel is a no-op success.
      if (!msg.includes('already_in_channel')) {
        await notifyError('slack-adapter.inviteToCohortChannel invite failed', inviteErr, {
          client_id: opts.client_id,
          channel_id: channelId,
          slack_user_id: slackUserId,
        });
        throw inviteErr;
      }
    }
  }

  const invited_at = new Date().toISOString();

  // 6. Record membership in agency_cohort_members so /client/circle can read it.
  try {
    await supabase.from('agency_cohort_members').upsert(
      {
        cohort_channel_id: channelId,
        client_id: opts.client_id,
        slack_user_id: slackUserId,
        business_label_anonymized: deriveAnonymizedLabel({
          vertical: client.vertical ?? opts.vertical,
          region: client.region ?? opts.region ?? null,
          business_name: client.business_name,
        }),
        invited_at,
      },
      { onConflict: 'cohort_channel_id,client_id' },
    );
  } catch (memberErr) {
    console.warn('[inviteToCohortChannel] member upsert failed:', memberErr);
  }

  await emitEvent({
    client_id: opts.client_id,
    agent_name: 'slack-adapter',
    type: 'cohort_invited',
    severity: 'info',
    payload: {
      channel_id: channelId,
      vertical: opts.vertical,
      region: opts.region ?? null,
      revenue_tier: opts.revenue_tier ?? null,
      slack_user_id: slackUserId,
      method: slackUserId ? 'conversations.invite' : 'admin.users.invite',
    },
  });

  return { channel_id: channelId, invited_at };
}

// ─── Public API: 3. postCohortWin ───────────────────────────────────────────

/**
 * Post an anonymized win to a cohort channel. Called by the weekly
 * "Cohort Pulse" job + ad-hoc by the optimization-strategist when a peer's
 * experiment ships a confirmed lift.
 *
 * The caller is responsible for anonymization — this adapter just refuses
 * to post anything that looks like a raw business name (basic guard).
 */
export async function postCohortWin(opts: PostCohortWinOpts): Promise<PostCohortWinResult> {
  if (!opts.cohort_channel_id || !opts.client_anonymized_label || !opts.metric) {
    throw new Error(
      '[postCohortWin] cohort_channel_id, client_anonymized_label, and metric are required',
    );
  }

  // Guard: anonymized label must not contain raw business words that suggest
  // PII leak. This is a cheap belt-and-suspenders check, not a substitute for
  // proper anonymization upstream.
  if (/llc|inc\.|@/i.test(opts.client_anonymized_label)) {
    throw new Error(
      '[postCohortWin] anonymized_label appears to contain raw business identifiers',
    );
  }

  const blocks: unknown[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Cohort win* — _${opts.client_anonymized_label}_\n${opts.metric}`,
      },
    },
  ];
  if (opts.evidence_url) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Evidence: <${opts.evidence_url}|open>`,
        },
      ],
    });
  }

  try {
    const result = await slackApi<{ ts: string }>(
      'chat.postMessage',
      {
        channel: opts.cohort_channel_id,
        text: `Cohort win: ${opts.metric}`,
        blocks,
        unfurl_links: false,
      },
      'cohort.postWin',
    );

    await emitEvent({
      agent_name: 'slack-adapter',
      type: 'cohort_win_posted',
      severity: 'info',
      payload: {
        cohort_channel_id: opts.cohort_channel_id,
        ts: result.ts,
        has_evidence: !!opts.evidence_url,
      },
    });

    return { ts: result.ts };
  } catch (err) {
    await notifyError('slack-adapter.postCohortWin failed', err, {
      cohort_channel_id: opts.cohort_channel_id,
    });
    await emitEvent({
      agent_name: 'slack-adapter',
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: 'slack-adapter',
        operation: 'cohort_win',
        op: 'cohort_win',
        cohort_channel_id: opts.cohort_channel_id,
        error_message: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

// ─── Public API: 4. listCohortMembers ───────────────────────────────────────

/**
 * Return the anonymized member roster for a cohort channel. Drives the
 * <CohortRoster /> component on /client/circle.
 *
 * Source of truth is agency_cohort_members (kept in sync by
 * inviteToCohortChannel + the cohort matcher cron). We avoid the Slack
 * `conversations.members` API on the read path because:
 *   • It's rate-limited and slow.
 *   • It only returns Slack user_ids; mapping those back to anonymized
 *     business labels requires our own table anyway.
 */
export async function listCohortMembers(
  opts: ListCohortMembersOpts,
): Promise<CohortMember[]> {
  if (!opts.cohort_channel_id) {
    throw new Error('[listCohortMembers] cohort_channel_id is required');
  }

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('agency_cohort_members')
    .select('slack_user_id, client_id, business_label_anonymized')
    .eq('cohort_channel_id', opts.cohort_channel_id);

  if (error) {
    throw new Error(`[listCohortMembers] query failed: ${error.message}`);
  }

  const members: CohortMember[] = (data ?? []).map((row) => ({
    // Stable, non-PII external id. Prefer the Slack user_id when present
    // (it's already opaque to other tenants); fall back to client_id which
    // is a uuid (not user-recognizable, RLS-protected at the row level).
    user_id: row.slack_user_id || row.client_id,
    business_label_anonymized:
      row.business_label_anonymized || 'Cohort member',
  }));

  await emitEvent({
    agent_name: 'slack-adapter',
    type: 'cohort_members_listed',
    severity: 'debug',
    payload: {
      cohort_channel_id: opts.cohort_channel_id,
      count: members.length,
    },
  });

  return members;
}
