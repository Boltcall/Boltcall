/**
 * saas-v2-integrations — GET endpoint returning the V2 Integrations catalog
 * for the currently-authenticated workspace owner.
 *
 * Response:
 *   { integrations: Array<{
 *       id, name, category: 'calendar'|'phone'|'crm'|'marketing'|'reviews',
 *       connected: boolean, description, manage_href?, connect_href?
 *     }>,
 *     cold_start: boolean
 *   }
 *
 * Catalog source:
 *   The V2 catalog is the union of:
 *     1. User-facing integrations from V1's IntegrationHubTab (CRM, calendar,
 *        marketing-automation). We mirror that list here so V2 stays in sync
 *        WITHOUT importing client code into a Netlify function.
 *     2. Communication-channel surfaces wired through their own pages
 *        (Twilio numbers/SMS, Cal.com webhook, Google Calendar, Facebook,
 *        Outlook, Gmail) — these are "connected" when their respective
 *        config row exists.
 *     3. Per the build brief: every adapter in
 *        netlify/functions/_shared/agency-adapters/ is also listed as a
 *        possible workspace-level integration (Cal.com, ElevenLabs, Slack,
 *        Stripe, Meta Ads, Retell, Cekura). These are connected when an
 *        equivalent workspace-scoped credential/setting exists.
 *
 * Connection detection:
 *   - user_integrations rows where is_connected = true        → V1 hub
 *   - twilio_numbers / acs_numbers / whatsapp_settings rows   → channels
 *   - user_oauth_tokens rows by provider                      → google/fb/gmail/outlook
 *   - retell_agents / business_features for retell+cal        → server adapters
 *
 *   We do single, light queries (no joins, .select('id') only) so a
 *   newly-signed-up user with zero rows returns the catalog with all-false
 *   connected flags in <100ms.
 *
 * Auth: Bearer JWT only — workspace_id is derived from user_id, never
 *   accepted from the request. Mirrors saas-v2-toggle's pattern exactly.
 *
 * Event emission: best-effort `saas_v2_integrations_list_rendered`. Skipped
 *   silently if user is not an agency_clients row (self-serve case).
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';


import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
type IntegrationCategory =
  | 'calendar'
  | 'phone'
  | 'crm'
  | 'marketing'
  | 'reviews';

interface CatalogEntry {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  /** When this entry is considered "connected" — function takes a context
   * object of pre-fetched sets/booleans. Stays pure so it's trivially testable. */
  isConnected: (ctx: ConnectionContext) => boolean;
}

interface ConnectionContext {
  userIntegrationIds: Set<string>;         // provider strings from user_integrations
  oauthProviders: Set<string>;             // provider strings from user_oauth_tokens
  hasTwilioNumber: boolean;
  hasAcsNumber: boolean;
  hasWhatsappSettings: boolean;
  hasRetellAgent: boolean;
  hasReputationManagerConfig: boolean;
  hasCalcomWebhookConfigured: boolean;
}

// ─── Catalog ────────────────────────────────────────────────────────────────
//
// Mirrors V1's IntegrationHubTab catalog (12 providers) plus the adapters
// in netlify/functions/_shared/agency-adapters/. Per the build brief, we
// surface adapters as workspace-level integrations too — the user-facing
// row signals the existence of the capability even if the actual server
// adapter runs in agency-fleet mode.

const CATALOG: CatalogEntry[] = [
  // ── Calendar ──────────────────────────────────────────────────────────
  {
    id: 'calcom',
    name: 'Cal.com',
    category: 'calendar',
    description:
      'Auto-book qualified leads straight into your Cal.com availability. Cancellations bounce back into the dispatcher.',
    isConnected: (c) => c.hasCalcomWebhookConfigured,
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    description:
      'Two-way sync with Google Calendar — block off busy hours, post bookings, watch for double-books.',
    isConnected: (c) => c.oauthProviders.has('google-calendar'),
  },
  {
    id: 'outlook',
    name: 'Outlook Calendar',
    category: 'calendar',
    description:
      'Microsoft 365 calendar sync — booking confirmations land on your Outlook calendar in real time.',
    isConnected: (c) => c.oauthProviders.has('outlook'),
  },
  {
    id: 'calendly',
    name: 'Calendly',
    category: 'calendar',
    description:
      'Forward Boltcall-qualified leads into a Calendly event type with the right round-robin assignee.',
    isConnected: (c) => c.userIntegrationIds.has('calendly'),
  },

  // ── Phone ─────────────────────────────────────────────────────────────
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'phone',
    description:
      'Provision tracked numbers, route SMS replies through the AI dispatcher, and own the messaging layer.',
    isConnected: (c) => c.hasTwilioNumber,
  },
  {
    id: 'acs',
    name: 'Azure Communication',
    category: 'phone',
    description:
      'Native Azure Communication Services number provisioning + SMS routing for EU + APAC compliance.',
    isConnected: (c) => c.hasAcsNumber,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'phone',
    description:
      'Reply to WhatsApp inquiries in seconds with templates that pass Meta&apos;s 24-hour window rules.',
    isConnected: (c) => c.hasWhatsappSettings,
  },
  {
    id: 'retell',
    name: 'Retell AI',
    category: 'phone',
    description:
      'Voice agent runtime — the engine the AI receptionist speaks through. Connected when an agent is deployed.',
    isConnected: (c) => c.hasRetellAgent,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'phone',
    description:
      'Clone the founder&apos;s voice (or pick a stock one) so every outbound callback sounds in-brand.',
    isConnected: () => false,
  },

  // ── CRM ───────────────────────────────────────────────────────────────
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    description:
      'Push every lead, call, and SMS into HubSpot CRM. Pipeline stage updates auto-trigger on outcome.',
    isConnected: (c) => c.userIntegrationIds.has('hubspot'),
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    category: 'crm',
    description:
      'Sync qualified leads as deals into the right pipeline + stage based on the AI&apos;s qualification verdict.',
    isConnected: (c) => c.userIntegrationIds.has('pipedrive'),
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    description:
      'Enterprise-grade lead + opportunity sync. Mirror call transcripts onto the Contact timeline.',
    isConnected: (c) => c.userIntegrationIds.has('salesforce'),
  },
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    category: 'crm',
    description:
      'Wire Boltcall into GHL pipelines, trigger automations on outcome, and unify everything per sub-account.',
    isConnected: (c) => c.userIntegrationIds.has('gohighlevel'),
  },
  {
    id: 'monday',
    name: 'monday.com',
    category: 'crm',
    description:
      'Drop new leads onto a monday board with custom columns mapped from Boltcall&apos;s extracted fields.',
    isConnected: (c) => c.userIntegrationIds.has('monday'),
  },
  {
    id: 'airtable',
    name: 'Airtable',
    category: 'crm',
    description:
      'Stream leads + call summaries into Airtable bases — keep your spreadsheet workflow, gain the speed.',
    isConnected: (c) => c.userIntegrationIds.has('airtable'),
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'crm',
    description:
      'Append every conversation into a Notion database so the team can riff on themes without leaving Notion.',
    isConnected: (c) => c.userIntegrationIds.has('notion'),
  },

  // ── Marketing ─────────────────────────────────────────────────────────
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    category: 'marketing',
    description:
      'Send qualified-lead conversion events back to Facebook so the Meta algorithm bids for buyers, not clickers.',
    isConnected: (c) => c.oauthProviders.has('facebook'),
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'marketing',
    description:
      'Drop new contacts into Mailchimp lists and trigger drip campaigns based on call outcome.',
    isConnected: (c) => c.userIntegrationIds.has('mailchimp'),
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    category: 'marketing',
    description:
      'High-deliverability email + SMS flows triggered by qualification verdict, no-shows, and follow-ups.',
    isConnected: (c) => c.userIntegrationIds.has('klaviyo'),
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'marketing',
    description:
      'Send + reply to lead emails through Gmail so threads stay inside the inbox your team already lives in.',
    isConnected: (c) => c.oauthProviders.has('gmail'),
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'marketing',
    description:
      'Push qualified-lead alerts, no-show pings, and weekly digests into the channels your team watches.',
    isConnected: (c) => c.userIntegrationIds.has('slack'),
  },
  {
    id: 'zapier',
    name: 'Zapier',
    category: 'marketing',
    description:
      'Trigger 7,000+ apps from any Boltcall event. The escape hatch when there&apos;s no native integration yet.',
    isConnected: (c) => c.userIntegrationIds.has('zapier'),
  },
  {
    id: 'make',
    name: 'Make',
    category: 'marketing',
    description:
      'Build visual speed-to-lead scenarios that move Boltcall leads into ads, CRM, sheets, and team workflows.',
    isConnected: (c) => c.userIntegrationIds.has('make'),
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'marketing',
    description:
      'Tie booked appointments to billing — auto-charge deposits, schedule invoices on appointment confirmed.',
    isConnected: () => false,
  },

  // ── Reviews ───────────────────────────────────────────────────────────
  {
    id: 'reputation-manager',
    name: 'Reputation Manager',
    category: 'reviews',
    description:
      'Trigger Google review requests by SMS after every booked call. The single fastest way to lift map-pack rank.',
    isConnected: (c) => c.hasReputationManagerConfig,
  },
];

// ─── Connection-context loader ──────────────────────────────────────────────

async function loadConnectionContext(
  supa: ReturnType<typeof getServiceSupabase>,
  userId: string,
): Promise<ConnectionContext> {
  // Each query is fire-and-forget with a try/catch wrapper so a missing
  // table (e.g. fresh project where a migration hasn't run) just yields an
  // empty set — never a 500. The connected-flag is a best-effort UX hint.
  const safeArray = async <T,>(p: Promise<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
    try {
      const { data } = await p;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const [
    userIntegrationsRows,
    oauthRows,
    twilioRows,
    acsRows,
    whatsappRows,
    retellRows,
    bizFeatureRows,
    calcomConfigRows,
  ] = await Promise.all([
    safeArray<{ provider: string }>(
      supa
        .from('user_integrations')
        .select('provider')
        .eq('user_id', userId)
        .eq('is_connected', true),
    ),
    safeArray<{ provider: string }>(
      supa
        .from('user_oauth_tokens')
        .select('provider')
        .eq('user_id', userId),
    ),
    safeArray<{ id: string }>(
      supa
        .from('twilio_numbers')
        .select('id')
        .eq('user_id', userId)
        .limit(1),
    ),
    safeArray<{ id: string }>(
      supa
        .from('acs_numbers')
        .select('id')
        .eq('user_id', userId)
        .limit(1),
    ),
    safeArray<{ id: string }>(
      supa
        .from('whatsapp_settings')
        .select('id')
        .eq('user_id', userId)
        .limit(1),
    ),
    safeArray<{ id: string }>(
      supa
        .from('retell_agents')
        .select('id')
        .eq('user_id', userId)
        .limit(1),
    ),
    safeArray<{
      reputation_manager_config: unknown;
      calcom_webhook_secret?: string | null;
    }>(
      supa
        .from('business_features')
        .select('reputation_manager_config, calcom_webhook_secret')
        .eq('user_id', userId)
        .limit(1),
    ),
    // Defensive — older schemas store cal.com config in calcom_integrations
    safeArray<{ id: string }>(
      supa
        .from('calcom_integrations')
        .select('id')
        .eq('user_id', userId)
        .limit(1),
    ),
  ]);

  const userIntegrationIds = new Set<string>();
  for (const row of userIntegrationsRows) {
    if (row?.provider) userIntegrationIds.add(row.provider);
  }

  const oauthProviders = new Set<string>();
  for (const row of oauthRows) {
    if (row?.provider) oauthProviders.add(row.provider);
  }

  const bizRow = bizFeatureRows[0];
  const hasReputationManagerConfig = Boolean(
    bizRow?.reputation_manager_config &&
      typeof bizRow.reputation_manager_config === 'object',
  );
  const hasCalcomFromBizFeatures = Boolean(bizRow?.calcom_webhook_secret);

  return {
    userIntegrationIds,
    oauthProviders,
    hasTwilioNumber: twilioRows.length > 0,
    hasAcsNumber: acsRows.length > 0,
    hasWhatsappSettings: whatsappRows.length > 0,
    hasRetellAgent: retellRows.length > 0,
    hasReputationManagerConfig,
    hasCalcomWebhookConfigured: hasCalcomFromBizFeatures || calcomConfigRows.length > 0,
  };
}

// ─── Cold-start helper ──────────────────────────────────────────────────────

async function isColdStart(
  supa: ReturnType<typeof getServiceSupabase>,
  userId: string,
  workspaceCreatedAt: string | null,
): Promise<boolean> {
  // Cold-start = <30 calls AND <14 days of activity. Both must hold —
  // a workspace that's 60 days old with only 3 calls is still meaningful.
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  let workspaceAgeOk = true;
  if (workspaceCreatedAt) {
    workspaceAgeOk = workspaceCreatedAt > fourteenDaysAgo;
  }

  try {
    const { count } = await supa
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    const callCount = typeof count === 'number' ? count : 0;
    return callCount < 30 && workspaceAgeOk;
  } catch {
    // No `calls` table or query failed — treat as cold start so the UI
    // shows the friendly placeholder rather than empty suggestions.
    return workspaceAgeOk;
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────



export const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'GET' },
  );
  const cors = v2cors.headers;

  function unauthorized(message: string) {

    return {

      statusCode: 401,

      headers: cors,

      body: JSON.stringify({ error: message }),

    };

  }

  function serverError(message: string) {

    return {

      statusCode: 500,

      headers: cors,

      body: JSON.stringify({ error: message }),

    };

  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── 1. JWT → user_id ───────────────────────────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return unauthorized('Missing bearer token');

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return unauthorized('Invalid or expired token');
  }
  const userId = userResult.user.id;

  // ── 2. Resolve workspace user_id == userId ────────────────────────────
  let workspaceId: string | null = null;
  let workspaceCreatedAt: string | null = null;
  try {
    const { data: wsRow } = await supa
      .from('workspaces')
      .select('id, created_at')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    workspaceId = (wsRow as { id?: string } | null)?.id ?? null;
    workspaceCreatedAt =
      (wsRow as { created_at?: string } | null)?.created_at ?? null;
  } catch (err) {
    console.warn(
      `[saas-v2-integrations] workspace lookup failed user=${userId} err=${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  // ── 3. Build catalog with connection context ──────────────────────────
  let ctx: ConnectionContext;
  try {
    ctx = await loadConnectionContext(supa, userId);
  } catch (err) {
    console.warn(
      `[saas-v2-integrations] context load failed user=${userId} err=${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return serverError('Failed to load integration state');
  }

  const integrations = CATALOG.map((entry) => {
    const connected = (() => {
      try {
        return entry.isConnected(ctx);
      } catch {
        return false;
      }
    })();
    return {
      id: entry.id,
      name: entry.name,
      category: entry.category,
      connected,
      description: entry.description,
      // Stable hash-anchors so V2 can deep-link into V1's hub if/when needed.
      manage_href: connected ? `/dashboard/integrations#${entry.id}` : undefined,
      connect_href: connected
        ? undefined
        : `/dashboard/integrations#${entry.id}`,
    };
  });

  const cold_start = await isColdStart(supa, userId, workspaceCreatedAt);

  const connectedCount = integrations.filter((i) => i.connected).length;
  const availableCount = integrations.length - connectedCount;

  // ── 4. Best-effort event emit ─────────────────────────────────────────
  try {
    const { data: clientRow } = await supa
      .from('agency_clients')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (clientRow?.id && workspaceId) {
      await emitAgencyEvent({
        client_id: clientRow.id as string,
        agent_name: 'saas-v2-integrations',
        type: 'saas_v2_integrations_list_rendered',
        severity: 'debug',
        payload: {
          workspace_id: workspaceId,
          connected_count: connectedCount,
          available_count: availableCount,
          op: 'list',
        },
        why_explanation:
          'User opened V2 Integrations page; catalog rendered with connection state.',
      });
    }
  } catch (emitErr) {
    console.warn(
      `[saas-v2-integrations] event emit failed user=${userId} err=${
        emitErr instanceof Error ? emitErr.message : String(emitErr)
      }`,
    );
  }

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ integrations, cold_start }),
  };
};
