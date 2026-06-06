/**
 * saas-v2-integration-suggest — GET endpoint that recommends the 2-3
 * highest-leverage integrations for a workspace to connect next, based on:
 *   - Workspace vertical (industry preset / business type)
 *   - Usage gaps (e.g. messages flowing in, but no booking integration)
 *
 * Response:
 *   { suggestions: Array<{
 *       integration_id: string,
 *       headline: string,    // short imperative — "Connect Cal.com to auto-book"
 *       why: string,         // 1-2 sentences grounded in the signal
 *       urgency: 'low' | 'medium' | 'high'
 *     }>,
 *     cold_start: boolean
 *   }
 *
 * Two-tier policy (mirrors agency-client-agent-summary.ts):
 *   1. If AZURE_OPENAI_FOUNDRY (or legacy / Anthropic) is configured, ask the
 *      heavy-tier model for JSON suggestions grounded in the signals we
 *      collected. Hard rule in the prompt: choose from the allowed
 *      integration_ids only; never invent new ones.
 *   2. On any failure (no key, API error, JSON parse fail), fall back to a
 *      deterministic heuristic from the same signals so the page never
 *      breaks. The heuristic prioritizes the same gaps in order.
 *
 * Cold-start guard: if the workspace has <30 calls AND is <14 days old,
 * return cold_start=true with an empty suggestions array. The UI shows
 * "Unlock at 30 calls" rather than an empty card.
 *
 * Auth: Bearer JWT only — workspace_id derived from owner_id server-side.
 *
 * Event emission: one `saas_v2_integration_recommended` per suggestion,
 *   batched. Skipped silently if user is not an agency_clients row.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { chatCompletion, isAzureConfigured } from './_shared/azure-ai';


import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
type Urgency = 'low' | 'medium' | 'high';

interface Suggestion {
  integration_id: string;
  headline: string;
  why: string;
  urgency: Urgency;
}

// The id set the model is allowed to recommend. Kept in sync with
// saas-v2-integrations.ts CATALOG by convention — duplicated as a literal
// here so the function file stays self-contained for cold-start latency
// and so a model can't invent a never-implemented id.
const ALLOWED_INTEGRATION_IDS = [
  'calcom',
  'google-calendar',
  'outlook',
  'calendly',
  'twilio',
  'acs',
  'whatsapp',
  'retell',
  'elevenlabs',
  'hubspot',
  'pipedrive',
  'salesforce',
  'gohighlevel',
  'monday',
  'airtable',
  'notion',
  'meta-ads',
  'mailchimp',
  'klaviyo',
  'gmail',
  'slack',
  'zapier',
  'make',
  'stripe',
  'reputation-manager',
] as const;

type AllowedIntegrationId = (typeof ALLOWED_INTEGRATION_IDS)[number];
const ALLOWED_SET = new Set<string>(ALLOWED_INTEGRATION_IDS);

// ─── Signal collector ─────────────────────────────────────────────────────

interface UsageSignals {
  workspace_id: string;
  vertical: string | null;
  industry_preset: string | null;
  total_calls: number;
  recent_calls_14d: number;
  total_messages: number;
  recent_messages_14d: number;
  // Booleans for already-connected providers so we never suggest a connect
  // for something the user already has.
  has_calendar: boolean;
  has_phone: boolean;
  has_crm: boolean;
  has_reputation: boolean;
  has_marketing_ads: boolean;
  has_slack: boolean;
  has_zapier: boolean;
  // Specific connected providers (so the model can name the gap precisely).
  connected_providers: string[];
}

async function collectSignals(
  supa: ReturnType<typeof getServiceSupabase>,
  userId: string,
  workspaceId: string,
): Promise<UsageSignals> {
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const safeCount = async (
    p: Promise<{ count: number | null; error: unknown }>,
  ): Promise<number> => {
    try {
      const { count } = await p;
      return typeof count === 'number' ? count : 0;
    } catch {
      return 0;
    }
  };

  const safeArray = async <T,>(
    p: Promise<{ data: T[] | null; error: unknown }>,
  ): Promise<T[]> => {
    try {
      const { data } = await p;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const [
    workspaceRow,
    bizFeatureRows,
    totalCallsCount,
    recentCallsCount,
    totalMessagesCount,
    recentMessagesCount,
    userIntegrations,
    oauthRows,
    twilioRows,
    acsRows,
    whatsappRows,
    calcomRows,
  ] = await Promise.all([
    // Workspace vertical (optional column on workspaces; defensive)
    (async () => {
      try {
        const { data } = await supa
          .from('workspaces')
          .select('id, vertical, industry_preset')
          .eq('id', workspaceId)
          .maybeSingle();
        return data as {
          id?: string;
          vertical?: string | null;
          industry_preset?: string | null;
        } | null;
      } catch {
        return null;
      }
    })(),
    safeArray<{
      vertical?: string | null;
      industry_preset?: string | null;
      reputation_manager_config?: unknown;
      calcom_webhook_secret?: string | null;
    }>(
      supa
        .from('business_features')
        .select(
          'vertical, industry_preset, reputation_manager_config, calcom_webhook_secret',
        )
        .eq('user_id', userId)
        .limit(1),
    ),
    safeCount(
      supa
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ),
    safeCount(
      supa
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', fourteenDaysAgo),
    ),
    safeCount(
      supa
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ),
    safeCount(
      supa
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', fourteenDaysAgo),
    ),
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
        .from('calcom_integrations')
        .select('id')
        .eq('user_id', userId)
        .limit(1),
    ),
  ]);

  const biz = bizFeatureRows[0] ?? null;
  const vertical = workspaceRow?.vertical ?? biz?.vertical ?? null;
  const industry_preset =
    workspaceRow?.industry_preset ?? biz?.industry_preset ?? null;

  const oauthProviders = new Set(oauthRows.map((r) => r.provider).filter(Boolean));
  const userIntegrationIds = new Set(
    userIntegrations.map((r) => r.provider).filter(Boolean),
  );

  const has_calendar =
    oauthProviders.has('google-calendar') ||
    oauthProviders.has('outlook') ||
    userIntegrationIds.has('calendly') ||
    calcomRows.length > 0 ||
    Boolean(biz?.calcom_webhook_secret);

  const has_phone =
    twilioRows.length > 0 ||
    acsRows.length > 0 ||
    whatsappRows.length > 0;

  const has_crm =
    userIntegrationIds.has('hubspot') ||
    userIntegrationIds.has('pipedrive') ||
    userIntegrationIds.has('salesforce') ||
    userIntegrationIds.has('gohighlevel') ||
    userIntegrationIds.has('monday') ||
    userIntegrationIds.has('airtable') ||
    userIntegrationIds.has('notion');

  const has_reputation = Boolean(
    biz?.reputation_manager_config &&
      typeof biz.reputation_manager_config === 'object',
  );

  const has_marketing_ads = oauthProviders.has('facebook');
  const has_slack = userIntegrationIds.has('slack');
  const has_zapier = userIntegrationIds.has('zapier');

  const connected_providers = [
    ...userIntegrationIds,
    ...Array.from(oauthProviders),
  ];

  return {
    workspace_id: workspaceId,
    vertical,
    industry_preset,
    total_calls: totalCallsCount,
    recent_calls_14d: recentCallsCount,
    total_messages: totalMessagesCount,
    recent_messages_14d: recentMessagesCount,
    has_calendar,
    has_phone,
    has_crm,
    has_reputation,
    has_marketing_ads,
    has_slack,
    has_zapier,
    connected_providers,
  };
}

// ─── Heuristic fallback ───────────────────────────────────────────────────
//
// Deterministic gap-first ordering. Each rule fires at most once. We collect
// rules in priority order and return the top 3. This guarantees the page
// never sees an empty suggestions array on a workspace that has data.

function heuristicSuggestions(signals: UsageSignals): Suggestion[] {
  const out: Suggestion[] = [];

  // (1) Messages flowing in but no calendar → biggest single lever.
  if (signals.recent_messages_14d > 5 && !signals.has_calendar) {
    out.push({
      integration_id: 'calcom',
      headline: 'Connect Cal.com so SMS leads auto-book',
      why: `You've had ${signals.recent_messages_14d} inbound messages in the last 14 days but no calendar is connected — leads are reading replies and dropping out before they can book a slot.`,
      urgency: 'high',
    });
  }

  // (2) Calls happening but no CRM → leads aren't getting into a system.
  if (signals.recent_calls_14d > 10 && !signals.has_crm) {
    out.push({
      integration_id: 'hubspot',
      headline: 'Push leads into a CRM',
      why: `${signals.recent_calls_14d} calls in the last 14 days are staying inside Boltcall only. Connect HubSpot (or your CRM) so your team can pick up from where the AI left off.`,
      urgency: 'high',
    });
  }

  // (3) Booked calls but no reputation manager → leaving 5-stars on the table.
  if (signals.total_calls > 30 && !signals.has_reputation) {
    out.push({
      integration_id: 'reputation-manager',
      headline: 'Turn on review requests',
      why: 'Every booked call is a chance for a 5-star review. Reputation Manager fires a Google review request by SMS automatically — the fastest move for map-pack rank.',
      urgency: 'medium',
    });
  }

  // (4) Active workspace, no Meta Ads conversion → ads are paying for clicks not buyers.
  if (signals.recent_calls_14d > 20 && !signals.has_marketing_ads) {
    out.push({
      integration_id: 'meta-ads',
      headline: 'Send qualified-lead events to Meta Ads',
      why: 'Meta optimizes toward whatever conversion you send back. Without this, your ad budget is bidding on clicks instead of qualified leads.',
      urgency: 'medium',
    });
  }

  // (5) Team-friendly nudge: Slack alerts.
  if (signals.recent_calls_14d > 5 && !signals.has_slack) {
    out.push({
      integration_id: 'slack',
      headline: 'Get qualified-lead pings in Slack',
      why: 'Your team will notice qualified leads faster (and book them faster) if every one shows up as a Slack notification with the verdict + recap.',
      urgency: 'low',
    });
  }

  // (6) No phone yet — meta-rare but a real cold-start nudge for SMS-only workspaces.
  if (signals.total_calls === 0 && signals.recent_messages_14d > 0 && !signals.has_phone) {
    out.push({
      integration_id: 'twilio',
      headline: 'Get a tracked phone number',
      why: 'Inbound SMS is working but you don\'t have a Boltcall number yet — provisioning one unlocks call answering + per-channel attribution.',
      urgency: 'medium',
    });
  }

  return out.slice(0, 3);
}

// ─── Sonnet/Foundry narrative wrapper ─────────────────────────────────────

async function aiSuggestions(
  signals: UsageSignals,
): Promise<Suggestion[] | null> {
  if (!isAzureConfigured() && !process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const system =
    'You are a growth strategist for a speed-to-lead AI platform called Boltcall. ' +
    'You read a workspace\'s usage signals and pick the 2-3 highest-leverage integrations to wire up next. ' +
    'You ALWAYS respond with strict JSON only — no prose, no markdown fences. ' +
    'You NEVER mention model names, token counts, or that you are an AI. ' +
    'You speak directly to the workspace owner ("your customers", "your calendar"). ' +
    'You only recommend integrations from the allowlist provided in the user message; never invent ids. ' +
    'You never recommend an integration that is already connected.';

  const user = JSON.stringify(
    {
      task: 'Suggest 2 or 3 integrations to connect next.',
      response_shape: {
        suggestions: [
          {
            integration_id: 'one_of_allowed_ids',
            headline: 'short imperative — under 70 chars',
            why: '1-2 grounded sentences referencing a real signal (call count, message gap, vertical)',
            urgency: 'low | medium | high',
          },
        ],
      },
      allowed_integration_ids: ALLOWED_INTEGRATION_IDS,
      workspace_signals: signals,
      rules: [
        'Choose 2 or 3 — never more than 3.',
        'integration_id MUST be in allowed_integration_ids.',
        'Do not recommend anything already in connected_providers.',
        'urgency=high only when there is an obvious revenue gap (e.g. messages with no calendar).',
        'Lead the headline with a verb. No emoji.',
        'why must reference a specific number or vertical from workspace_signals.',
      ],
    },
    null,
    2,
  );

  let raw: string;
  try {
    raw = await chatCompletion(system, user, {
      tier: 'heavy',
      maxTokens: 1200,
    });
  } catch (err) {
    console.warn(
      `[saas-v2-integration-suggest] chatCompletion failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }

  const trimmed = raw.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    return null;
  }
  let parsed: { suggestions?: unknown };
  try {
    parsed = JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
  const list = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

  const cleaned: Suggestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const integration_id =
      typeof obj.integration_id === 'string' ? obj.integration_id : '';
    const headline =
      typeof obj.headline === 'string' ? obj.headline.slice(0, 120) : '';
    const why = typeof obj.why === 'string' ? obj.why.slice(0, 280) : '';
    const urgencyRaw = typeof obj.urgency === 'string' ? obj.urgency : 'low';
    const urgency: Urgency =
      urgencyRaw === 'high' || urgencyRaw === 'medium' ? urgencyRaw : 'low';

    if (!ALLOWED_SET.has(integration_id)) continue;
    if (signals.connected_providers.includes(integration_id)) continue;
    if (!headline || !why) continue;

    cleaned.push({ integration_id, headline, why, urgency });
    if (cleaned.length >= 3) break;
  }

  return cleaned.length >= 1 ? cleaned : null;
}

// ─── Handler ──────────────────────────────────────────────────────────────



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

  // ── 1. JWT → user_id ─────────────────────────────────────────────────
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

  // ── 2. Resolve workspace ────────────────────────────────────────────
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
      `[saas-v2-integration-suggest] workspace lookup failed user=${userId} err=${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (!workspaceId) {
    return {
      statusCode: 404,
      headers: cors,
      body: JSON.stringify({
        error: 'No workspace owned by this user. Run the workspace migration.',
      }),
    };
  }

  // ── 3. Collect signals + cold-start check ───────────────────────────
  let signals: UsageSignals;
  try {
    signals = await collectSignals(supa, userId, workspaceId);
  } catch (err) {
    console.warn(
      `[saas-v2-integration-suggest] signal collection failed user=${userId} err=${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return serverError('Failed to collect workspace signals');
  }

  // Cold-start: workspace too young AND too few calls.
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const workspaceTooYoung =
    !workspaceCreatedAt || workspaceCreatedAt > fourteenDaysAgo;
  const cold_start = signals.total_calls < 30 && workspaceTooYoung;

  if (cold_start) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ suggestions: [], cold_start: true }),
    };
  }

  // ── 4. AI suggestions with heuristic fallback ───────────────────────
  let suggestions: Suggestion[] = [];
  let modelUsed: 'sonnet' | 'heuristic' = 'heuristic';

  const aiResult = await aiSuggestions(signals);
  if (aiResult && aiResult.length > 0) {
    suggestions = aiResult;
    modelUsed = 'sonnet';
  } else {
    suggestions = heuristicSuggestions(signals);
  }

  // ── 5. Best-effort batched event emit ───────────────────────────────
  try {
    const { data: clientRow } = await supa
      .from('agency_clients')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (clientRow?.id) {
      // Fire each suggestion as its own event so downstream filters can
      // tally per-integration recommendation rates. Awaited sequentially to
      // keep ordering stable for cron audits.
      for (const s of suggestions) {
        try {
          await emitAgencyEvent({
            client_id: clientRow.id as string,
            agent_name: 'saas-v2-integration-suggest',
            type: 'saas_v2_integration_recommended',
            severity: 'info',
            payload: {
              workspace_id: workspaceId,
              provider: s.integration_id,
              reason: s.why.slice(0, 240),
              model: modelUsed,
            },
            why_explanation:
              modelUsed === 'sonnet'
                ? 'Strategist-recommended next integration based on workspace signals.'
                : 'Heuristic gap-detector recommended next integration.',
          });
        } catch {
          // Already in a best-effort block; per-event failures are silent.
        }
      }
    }
  } catch (emitErr) {
    console.warn(
      `[saas-v2-integration-suggest] batch event emit failed user=${userId} err=${
        emitErr instanceof Error ? emitErr.message : String(emitErr)
      }`,
    );
  }

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ suggestions, cold_start: false }),
  };
};
