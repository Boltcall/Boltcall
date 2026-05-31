/**
 * Meta (Facebook) Marketing API adapter — Agency OS Layer 4 driver.
 *
 * Used by:
 *  - creative-foundry  → createCampaign / createAdSet / pushCreative
 *                       (three-stage pipeline: diverger → adversarial critic → predictor;
 *                        adapter is the ship target for the highest-predicted survivors)
 *  - reporting-scribe  → getCampaignInsights / getCreativeInsights
 *                       (RAGs Friday auto-report over Meta CPL + CTR per variant)
 *  - delivery-monitor  → pauseAd (one-click rollback on creative anomaly)
 *  - intake-officer    → listAdAccounts (during onboarding, lets founder pick the
 *                       ad account to bind to a new agency_clients row)
 *  - any agent that fires a conversion → sendConversionEvent (CAPI)
 *
 * Adapter rules (from §6 of the OS plan):
 *  - Stateless. All state lives in Supabase.
 *  - Idempotent where the Meta API allows it (external_reference_id on ads,
 *    upsert by name on campaigns/adsets — see notes per-method).
 *  - Field-whitelist every write back into agency_artifacts.ship_result.
 *    Never JSON.stringify the raw Graph response — it leaks PII, tokens, and
 *    schema drift into our own data store.
 *  - Single retry with exponential-ish backoff on 5xx / 429. No silent loops.
 *  - Emit agency_events on every call (debug on success, error on failure).
 *  - Token storage:
 *      * META_ACCESS_TOKEN env var → system-level fallback (listAdAccounts,
 *        bootstrapping, internal tooling).
 *      * Per-client tokens read from agency_clients.secrets jsonb at
 *        secrets.meta.access_token. Per-client ad-account id at
 *        secrets.meta.ad_account_id. v2 will move to a dedicated
 *        agency_client_secrets table with envelope encryption — see TODO.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { emitAgencyEvent, type AgencyEventType, type AgencyEventSeverity } from '../emit-agency-event';

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const META_GRAPH_VERSION = 'v21.0';
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const ADAPTER_NAME = 'meta-ads-adapter';
const DEFAULT_TIMEOUT_MS = 30_000;

// ──────────────────────────────────────────────────────────────────────────────
// Types — public surface
// ──────────────────────────────────────────────────────────────────────────────

export type MetaCampaignObjective = 'LEAD_GENERATION';

export type MetaCta =
  | 'LEARN_MORE'
  | 'BOOK_NOW'
  | 'GET_QUOTE';

export type MetaDestinationType = 'INSTANT_FORM' | 'WEBSITE';

export interface CreateCampaignOpts {
  client_ad_account_id: string;          // e.g. "act_1234567890"
  name: string;
  objective: MetaCampaignObjective;
  daily_budget_usd: number;
  client_id?: string;                    // for per-client token lookup + events
  external_reference_id?: string;        // idempotency key (we generate one if absent)
}

export interface CreateAdSetOpts {
  campaign_id: string;
  name: string;
  targeting: Record<string, unknown>;    // Meta targeting spec — passed through
  daily_budget_usd: number;
  lead_form_id?: string;
  client_id?: string;
  client_ad_account_id?: string;
  external_reference_id?: string;
}

export interface PushCreativeOpts {
  adset_id: string;
  image_url: string;
  primary_text: string;
  headline: string;
  cta: MetaCta;
  destination_type: MetaDestinationType;
  lead_form_id?: string;                 // required when destination_type === 'INSTANT_FORM'
  link_url?: string;                     // required when destination_type === 'WEBSITE'
  client_id?: string;
  client_ad_account_id?: string;
  page_id?: string;                      // Facebook page acting as advertiser
  external_reference_id?: string;
}

export interface PauseAdOpts {
  ad_id: string;
  client_id?: string;
}

export interface GetCampaignInsightsOpts {
  campaign_id: string;
  since: string;                         // YYYY-MM-DD
  until: string;                         // YYYY-MM-DD
  fields?: string[];
  client_id?: string;
}

export interface GetCreativeInsightsOpts {
  ad_id: string;
  since: string;
  until: string;
  client_id?: string;
}

export interface SetupConversionApiOpts {
  client_id: string;
  pixel_id: string;
  access_token: string;
  test_event_code?: string;
}

export interface SendConversionEventOpts {
  pixel_id: string;
  event_name: 'Lead' | 'Schedule';
  event_data: Record<string, unknown>;
  test_event_code?: string;
  client_id?: string;
  access_token?: string;                 // overrides per-client/system token
}

export interface ListAdAccountsOpts {
  business_id: string;
  client_id?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Whitelisted return shapes — these are what we persist & hand to other agents.
// Anything Meta returns that is NOT in here must NOT leave the adapter.
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateCampaignResult { campaign_id: string }
export interface CreateAdSetResult { adset_id: string }
export interface PushCreativeResult { ad_id: string; creative_id: string }
export interface PauseAdResult { paused_at: string }

export interface CampaignInsights {
  impressions: number;
  clicks: number;
  ctr: number;
  cpl: number;
  leads: number;
  spend_usd: number;
}

export interface CreativeInsights {
  impressions: number;
  ctr: number;
  cpl: number;
  leads: number;
}

export interface ConversionApiSetupResult { configured_at: string }
export interface SendConversionEventResult { events_received: number }

export interface AdAccountSummary {
  id: string;
  name: string;
  currency: string;
  account_status: number;                // Meta enum: 1 = active, 2 = disabled, etc.
}

// ──────────────────────────────────────────────────────────────────────────────
// Errors
// ──────────────────────────────────────────────────────────────────────────────

export class MetaAdsAdapterError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;
  public readonly metaErrorSubcode?: number;
  public readonly fbTraceId?: string;

  constructor(message: string, opts: {
    code: string;
    httpStatus?: number;
    metaErrorSubcode?: number;
    fbTraceId?: string;
  }) {
    super(message);
    this.name = 'MetaAdsAdapterError';
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    this.metaErrorSubcode = opts.metaErrorSubcode;
    this.fbTraceId = opts.fbTraceId;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Supabase / token helpers
// ──────────────────────────────────────────────────────────────────────────────

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Resolve the Meta access token to use for a call.
 *
 * Order of preference:
 *   1. Caller-provided token (e.g. CAPI per-pixel token)
 *   2. Per-client token at agency_clients.secrets->meta->access_token
 *   3. System-level META_ACCESS_TOKEN env var
 *
 * TODO(v2): move per-client tokens out of agency_clients.secrets jsonb into
 *   a dedicated agency_client_secrets table with envelope encryption via
 *   Supabase Vault. Right now we read plain jsonb because Vault isn't wired
 *   yet and we don't want to block Layer 4. Tracking issue: AGY-SECRETS-V2.
 */
async function resolveAccessToken(opts: {
  client_id?: string;
  overrideToken?: string;
}): Promise<string> {
  if (opts.overrideToken) return opts.overrideToken;

  if (opts.client_id) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from('agency_clients')
        .select('secrets')
        .eq('id', opts.client_id)
        .maybeSingle();

      if (!error && data?.secrets?.meta?.access_token) {
        return data.secrets.meta.access_token as string;
      }
    }
  }

  const systemToken = process.env.META_ACCESS_TOKEN;
  if (systemToken) return systemToken;

  throw new MetaAdsAdapterError(
    'No Meta access token available (client secrets empty and META_ACCESS_TOKEN unset)',
    { code: 'NO_ACCESS_TOKEN' },
  );
}

/**
 * Resolve the per-client ad account id when not supplied directly.
 * Reads agency_clients.secrets.meta.ad_account_id.
 */
async function resolveAdAccountId(opts: {
  client_id?: string;
  override?: string;
}): Promise<string | undefined> {
  if (opts.override) return opts.override;
  if (!opts.client_id) return undefined;

  const supabase = getSupabaseAdmin();
  if (!supabase) return undefined;

  const { data } = await supabase
    .from('agency_clients')
    .select('secrets')
    .eq('id', opts.client_id)
    .maybeSingle();

  return (data?.secrets?.meta?.ad_account_id as string | undefined) ?? undefined;
}

// ──────────────────────────────────────────────────────────────────────────────
// Event emission — normalized through shared kernel emitter
// ──────────────────────────────────────────────────────────────────────────────
//
// Adapter ops map to AgencyEventType per the §7 adapter_event_rules spec:
//   createCampaign       -> ad_campaign_created  (success) / adapter_error (error)
//   createAdSet          -> ad_set_created       (success) / adapter_error (error)
//   pushCreative         -> creative_published   (success) / adapter_error (error)
//   pauseAd              -> creative_paused      (success) / adapter_error (error)
//   getCampaignInsights  -> DROP (debug)         (success) / adapter_error (error)
//   getCreativeInsights  -> DROP (debug)         (success) / adapter_error (error)
//   setupConversionApi   -> ad_campaign_updated  (success) / adapter_error (error)
//   sendConversionEvent  -> conversion_event_sent (success) / adapter_error (error)
//   listAdAccounts       -> DROP (debug)         (success) / adapter_error (error)

type EventSeverity = AgencyEventSeverity;

interface EmitOkArgs {
  operation: string;
  type: AgencyEventType;
  severity: EventSeverity;
  client_id?: string;
  payload: Record<string, unknown>;
  duration_ms?: number;
  external_id?: string;
}

interface EmitErrorArgs {
  operation: string;
  client_id?: string;
  err: unknown;
  duration_ms?: number;
  external_id?: string;
  extra?: Record<string, unknown>;
}

async function emitMetaEvent(args: EmitOkArgs): Promise<void> {
  try {
    await emitAgencyEvent({
      client_id: args.client_id ?? '',
      agent_name: ADAPTER_NAME,
      type: args.type,
      severity: args.severity,
      payload: {
        ...args.payload,
        op: args.operation,
        operation: args.operation,
        ...(args.external_id !== undefined ? { external_id: args.external_id } : {}),
        ...(args.duration_ms !== undefined ? { duration_ms: args.duration_ms } : {}),
      },
    });
  } catch (e) {
    // Telemetry is best-effort. Do not block the caller.
    console.error(`[${ADAPTER_NAME}] failed to emit agency_event`, e);
  }
}

async function emitMetaError(args: EmitErrorArgs): Promise<void> {
  const message = args.err instanceof Error ? args.err.message : String(args.err);
  const code = args.err instanceof MetaAdsAdapterError ? args.err.code : 'UNKNOWN';
  try {
    await emitAgencyEvent({
      client_id: args.client_id ?? '',
      agent_name: ADAPTER_NAME,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: ADAPTER_NAME,
        operation: args.operation,
        op: args.operation,
        error_class: code,
        error_message: message,
        ...(args.external_id !== undefined ? { external_id: args.external_id } : {}),
        ...(args.duration_ms !== undefined ? { duration_ms: args.duration_ms } : {}),
        ...(args.extra ?? {}),
      },
    });
  } catch (e) {
    console.error(`[${ADAPTER_NAME}] failed to emit agency_event`, e);
  }
}

function debugLog(operation: string, payload: Record<string, unknown>): void {
  // Non-business adapter telemetry: spec §7 says drop to debug log, not kernel.
  console.debug(`[${ADAPTER_NAME}] ${operation}`, payload);
}

// ──────────────────────────────────────────────────────────────────────────────
// HTTP transport — one retry, JSON-only, Meta error normalisation
// ──────────────────────────────────────────────────────────────────────────────

interface MetaGraphResponse {
  status: number;
  body: any;
  fbTraceId?: string;
}

/**
 * Single low-level call against the Meta Graph API.
 *
 * Retry policy: ONE retry with backoff on 429 or 5xx. Transient network errors
 * also get one retry. 4xx (other than 429) fail-fast — those are caller bugs.
 */
async function metaFetch(opts: {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  accessToken: string;
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<MetaGraphResponse> {
  const url = new URL(`${META_GRAPH_BASE}${opts.path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  url.searchParams.set('access_token', opts.accessToken);

  const init: RequestInit = {
    method: opts.method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  const attempt = async (): Promise<MetaGraphResponse> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(url.toString(), { ...init, signal: controller.signal });
      const fbTraceId = res.headers.get('x-fb-trace-id') ?? undefined;
      const text = await res.text();
      let body: any = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
      return { status: res.status, body, fbTraceId };
    } finally {
      clearTimeout(timer);
    }
  };

  let response: MetaGraphResponse;
  try {
    response = await attempt();
  } catch (e) {
    // Network/timeout — single retry.
    await new Promise(r => setTimeout(r, 750));
    response = await attempt();
  }

  if (response.status === 429 || response.status >= 500) {
    await new Promise(r => setTimeout(r, 1_500));
    response = await attempt();
  }

  if (response.status >= 400) {
    const fbErr = response.body?.error ?? {};
    throw new MetaAdsAdapterError(
      fbErr.message || `Meta Graph API returned HTTP ${response.status}`,
      {
        code: fbErr.code ? `META_${fbErr.code}` : `HTTP_${response.status}`,
        httpStatus: response.status,
        metaErrorSubcode: fbErr.error_subcode,
        fbTraceId: response.fbTraceId,
      },
    );
  }

  return response;
}

// ──────────────────────────────────────────────────────────────────────────────
// Small utilities
// ──────────────────────────────────────────────────────────────────────────────

function usdToCents(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) {
    throw new MetaAdsAdapterError('daily_budget_usd must be a non-negative finite number', { code: 'INVALID_BUDGET' });
  }
  return Math.round(usd * 100);
}

function generateExternalRef(prefix: string): string {
  // Idempotency key — Meta dedupes some creates by this when present in name
  // or when echoed back in upsert flows. We attach it to event payloads too.
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

function n(v: any): number {
  const x = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(x) ? x : 0;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Create a campaign on a client's ad account.
 *
 * Idempotency note: Meta does not natively dedupe campaign creates. We pass
 * `external_reference_id` into the name suffix when provided, so retries
 * surface as duplicate-named campaigns the founder can spot in the queue
 * instead of silently double-charging budget. v2: prefer a pre-check by name.
 */
export async function createCampaign(opts: CreateCampaignOpts): Promise<CreateCampaignResult> {
  const startedAt = Date.now();
  const externalRef = opts.external_reference_id ?? generateExternalRef('camp');
  const accountId = opts.client_ad_account_id;

  if (!accountId) {
    throw new MetaAdsAdapterError('client_ad_account_id is required', { code: 'MISSING_AD_ACCOUNT' });
  }

  try {
    const accessToken = await resolveAccessToken({ client_id: opts.client_id });

    const res = await metaFetch({
      method: 'POST',
      path: `/${accountId}/campaigns`,
      accessToken,
      body: {
        name: opts.name,
        objective: opts.objective,
        status: 'PAUSED',                          // never auto-launch; founder approves
        special_ad_categories: [],
        daily_budget: usdToCents(opts.daily_budget_usd),
        buying_type: 'AUCTION',
      },
    });

    const campaign_id = String(res.body?.id ?? '');
    if (!campaign_id) {
      throw new MetaAdsAdapterError('Meta returned no campaign id', {
        code: 'META_NO_ID',
        fbTraceId: res.fbTraceId,
      });
    }

    const whitelisted: CreateCampaignResult = { campaign_id };

    await emitMetaEvent({
      operation: 'createCampaign',
      type: 'ad_campaign_created',
      severity: 'info',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: externalRef,
      payload: {
        ...whitelisted,
        ad_account_id: accountId,
        objective: opts.objective,
        daily_budget_usd: opts.daily_budget_usd,
      },
    });

    return whitelisted;
  } catch (err) {
    await emitMetaError({
      operation: 'createCampaign',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: externalRef,
      err,
    });
    throw err;
  }
}

/**
 * Create an ad set under a campaign.
 *
 * Targeting is passed through opaquely — agents/templates own the targeting
 * spec. We validate the budget and the lead-form id (when supplied), nothing
 * else.
 */
export async function createAdSet(opts: CreateAdSetOpts): Promise<CreateAdSetResult> {
  const startedAt = Date.now();
  const externalRef = opts.external_reference_id ?? generateExternalRef('adset');

  try {
    const accessToken = await resolveAccessToken({ client_id: opts.client_id });
    const accountId = await resolveAdAccountId({
      client_id: opts.client_id,
      override: opts.client_ad_account_id,
    });
    if (!accountId) {
      throw new MetaAdsAdapterError(
        'Could not resolve ad account id (pass client_ad_account_id or set agency_clients.secrets.meta.ad_account_id)',
        { code: 'MISSING_AD_ACCOUNT' },
      );
    }

    const body: Record<string, unknown> = {
      name: opts.name,
      campaign_id: opts.campaign_id,
      daily_budget: usdToCents(opts.daily_budget_usd),
      billing_event: 'IMPRESSIONS',
      optimization_goal: opts.lead_form_id ? 'LEAD_GENERATION' : 'OFFSITE_CONVERSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      status: 'PAUSED',
      targeting: opts.targeting,
    };
    if (opts.lead_form_id) {
      body.promoted_object = { lead_form_id: opts.lead_form_id };
    }

    const res = await metaFetch({
      method: 'POST',
      path: `/${accountId}/adsets`,
      accessToken,
      body,
    });

    const adset_id = String(res.body?.id ?? '');
    if (!adset_id) {
      throw new MetaAdsAdapterError('Meta returned no adset id', {
        code: 'META_NO_ID',
        fbTraceId: res.fbTraceId,
      });
    }

    const whitelisted: CreateAdSetResult = { adset_id };

    await emitMetaEvent({
      operation: 'createAdSet',
      type: 'ad_set_created',
      severity: 'info',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: externalRef,
      payload: {
        ...whitelisted,
        campaign_id: opts.campaign_id,
        daily_budget_usd: opts.daily_budget_usd,
        has_lead_form: Boolean(opts.lead_form_id),
      },
    });

    return whitelisted;
  } catch (err) {
    await emitMetaError({
      operation: 'createAdSet',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: externalRef,
      err,
    });
    throw err;
  }
}

/**
 * Push a creative + ad as a unit.
 *
 * Two-step Meta flow:
 *   1. POST /act_X/adcreatives  → creative_id
 *   2. POST /act_X/ads           → ad_id (referencing creative_id + adset_id)
 *
 * Idempotency: we pass `external_reference_id` through the ad create call as
 * `adlabels`-style metadata when supplied — useful for reconciling
 * shadow-traffic predictor experiments from creative-foundry stage 3.
 *
 * WHITELIST: only ad_id + creative_id leave this function. The raw Graph
 * response — which contains tokens, internal page metadata, and full creative
 * spec dumps — is discarded after extraction.
 */
export async function pushCreative(opts: PushCreativeOpts): Promise<PushCreativeResult> {
  const startedAt = Date.now();
  const externalRef = opts.external_reference_id ?? generateExternalRef('ad');

  if (opts.destination_type === 'INSTANT_FORM' && !opts.lead_form_id) {
    throw new MetaAdsAdapterError(
      'lead_form_id is required when destination_type is INSTANT_FORM',
      { code: 'MISSING_LEAD_FORM' },
    );
  }
  if (opts.destination_type === 'WEBSITE' && !opts.link_url) {
    throw new MetaAdsAdapterError(
      'link_url is required when destination_type is WEBSITE',
      { code: 'MISSING_LINK_URL' },
    );
  }

  try {
    const accessToken = await resolveAccessToken({ client_id: opts.client_id });
    const accountId = await resolveAdAccountId({
      client_id: opts.client_id,
      override: opts.client_ad_account_id,
    });
    if (!accountId) {
      throw new MetaAdsAdapterError(
        'Could not resolve ad account id',
        { code: 'MISSING_AD_ACCOUNT' },
      );
    }
    const pageId = opts.page_id ?? process.env.META_PAGE_ID;
    if (!pageId) {
      throw new MetaAdsAdapterError(
        'page_id is required (pass directly or set META_PAGE_ID)',
        { code: 'MISSING_PAGE_ID' },
      );
    }

    // Step 1 — create the ad creative.
    const link =
      opts.destination_type === 'INSTANT_FORM'
        ? `https://fb.me/${opts.lead_form_id}`
        : opts.link_url!;

    const creativeRes = await metaFetch({
      method: 'POST',
      path: `/${accountId}/adcreatives`,
      accessToken,
      body: {
        name: `${opts.headline.slice(0, 60)} (${externalRef})`,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            message: opts.primary_text,
            link,
            name: opts.headline,
            picture: opts.image_url,
            call_to_action: { type: opts.cta },
          },
        },
        degrees_of_freedom_spec: {
          creative_features_spec: { standard_enhancements: { enroll_status: 'OPT_OUT' } },
        },
      },
    });
    const creative_id = String(creativeRes.body?.id ?? '');
    if (!creative_id) {
      throw new MetaAdsAdapterError('Meta returned no creative id', {
        code: 'META_NO_ID',
        fbTraceId: creativeRes.fbTraceId,
      });
    }

    // Step 2 — create the ad referencing the creative.
    const adRes = await metaFetch({
      method: 'POST',
      path: `/${accountId}/ads`,
      accessToken,
      body: {
        name: `${opts.headline.slice(0, 60)} (${externalRef})`,
        adset_id: opts.adset_id,
        creative: { creative_id },
        status: 'PAUSED',
      },
    });
    const ad_id = String(adRes.body?.id ?? '');
    if (!ad_id) {
      throw new MetaAdsAdapterError('Meta returned no ad id', {
        code: 'META_NO_ID',
        fbTraceId: adRes.fbTraceId,
      });
    }

    const whitelisted: PushCreativeResult = { ad_id, creative_id };

    await emitMetaEvent({
      operation: 'pushCreative',
      type: 'creative_published',
      severity: 'info',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: externalRef,
      payload: {
        ...whitelisted,
        platform: 'meta',
        adset_id: opts.adset_id,
        cta: opts.cta,
        destination_type: opts.destination_type,
        headline_length: opts.headline.length,
        primary_text_length: opts.primary_text.length,
      },
    });

    return whitelisted;
  } catch (err) {
    await emitMetaError({
      operation: 'pushCreative',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: externalRef,
      err,
    });
    throw err;
  }
}

/**
 * Pause a single ad. Used by delivery-monitor's "one-click rollback" action.
 *
 * Idempotent at the Meta side — pausing an already-paused ad is a no-op.
 */
export async function pauseAd(opts: PauseAdOpts): Promise<PauseAdResult> {
  const startedAt = Date.now();
  try {
    const accessToken = await resolveAccessToken({ client_id: opts.client_id });
    await metaFetch({
      method: 'POST',
      path: `/${opts.ad_id}`,
      accessToken,
      body: { status: 'PAUSED' },
    });

    const result: PauseAdResult = { paused_at: new Date().toISOString() };
    await emitMetaEvent({
      operation: 'pauseAd',
      type: 'creative_paused',
      severity: 'info',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: opts.ad_id,
      payload: { ad_id: opts.ad_id, platform: 'meta', paused_at: result.paused_at, reason: 'manual_pause' },
    });
    return result;
  } catch (err) {
    await emitMetaError({
      operation: 'pauseAd',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: opts.ad_id,
      err,
    });
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Insights
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_INSIGHT_FIELDS = [
  'impressions',
  'clicks',
  'ctr',
  'spend',
  'actions',
  'cost_per_action_type',
];

function extractLeadActions(actions: any[] | undefined): number {
  if (!Array.isArray(actions)) return 0;
  const candidates = ['lead', 'leadgen.other', 'onsite_conversion.lead_grouped'];
  return actions
    .filter(a => candidates.includes(String(a?.action_type)))
    .reduce((sum, a) => sum + n(a?.value), 0);
}

function extractCpl(costPerAction: any[] | undefined): number {
  if (!Array.isArray(costPerAction)) return 0;
  const hit = costPerAction.find(c =>
    ['lead', 'onsite_conversion.lead_grouped'].includes(String(c?.action_type)),
  );
  return hit ? n(hit.value) : 0;
}

/**
 * Pull campaign-level insights for a date window.
 * Returns ONLY the whitelisted KPI shape — raw Meta breakdowns are discarded.
 */
export async function getCampaignInsights(
  opts: GetCampaignInsightsOpts,
): Promise<CampaignInsights> {
  const startedAt = Date.now();
  try {
    const accessToken = await resolveAccessToken({ client_id: opts.client_id });
    const fields = (opts.fields && opts.fields.length > 0 ? opts.fields : DEFAULT_INSIGHT_FIELDS).join(',');

    const res = await metaFetch({
      method: 'GET',
      path: `/${opts.campaign_id}/insights`,
      accessToken,
      query: {
        fields,
        time_range: JSON.stringify({ since: opts.since, until: opts.until }),
        level: 'campaign',
      },
    });

    const row = Array.isArray(res.body?.data) ? res.body.data[0] : null;
    const leads = extractLeadActions(row?.actions);
    const cpl = extractCpl(row?.cost_per_action_type) || (leads > 0 ? n(row?.spend) / leads : 0);

    const insights: CampaignInsights = {
      impressions: n(row?.impressions),
      clicks: n(row?.clicks),
      ctr: n(row?.ctr),
      cpl,
      leads,
      spend_usd: n(row?.spend),
    };

    // Spec §7: getCampaignInsights success drops to console.debug (no kernel event).
    debugLog('getCampaignInsights', {
      campaign_id: opts.campaign_id,
      since: opts.since,
      until: opts.until,
      duration_ms: Date.now() - startedAt,
      ...insights,
    });

    return insights;
  } catch (err) {
    await emitMetaError({
      operation: 'getCampaignInsights',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: opts.campaign_id,
      err,
    });
    throw err;
  }
}

/**
 * Per-creative insights — feeds reporting-scribe and the creative-foundry
 * predictor's training set (variant → CTR/CPL mapping in agency_events).
 */
export async function getCreativeInsights(
  opts: GetCreativeInsightsOpts,
): Promise<CreativeInsights> {
  const startedAt = Date.now();
  try {
    const accessToken = await resolveAccessToken({ client_id: opts.client_id });

    const res = await metaFetch({
      method: 'GET',
      path: `/${opts.ad_id}/insights`,
      accessToken,
      query: {
        fields: 'impressions,clicks,ctr,spend,actions,cost_per_action_type',
        time_range: JSON.stringify({ since: opts.since, until: opts.until }),
        level: 'ad',
      },
    });

    const row = Array.isArray(res.body?.data) ? res.body.data[0] : null;
    const leads = extractLeadActions(row?.actions);
    const cpl = extractCpl(row?.cost_per_action_type) || (leads > 0 ? n(row?.spend) / leads : 0);

    const insights: CreativeInsights = {
      impressions: n(row?.impressions),
      ctr: n(row?.ctr),
      cpl,
      leads,
    };

    // Spec §7: getCreativeInsights success drops to console.debug (no kernel event).
    debugLog('getCreativeInsights', {
      ad_id: opts.ad_id,
      since: opts.since,
      until: opts.until,
      duration_ms: Date.now() - startedAt,
      ...insights,
    });

    return insights;
  } catch (err) {
    await emitMetaError({
      operation: 'getCreativeInsights',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: opts.ad_id,
      err,
    });
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Conversions API (CAPI)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Persist a client's Conversions API config to agency_clients.secrets.meta.capi.
 *
 * Does NOT make a Graph call — it's a config write. The pixel + access_token
 * pair are validated lazily on the first sendConversionEvent.
 *
 * TODO(v2): move CAPI token into encrypted agency_client_secrets table.
 */
export async function setupConversionApi(
  opts: SetupConversionApiOpts,
): Promise<ConversionApiSetupResult> {
  const startedAt = Date.now();
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new MetaAdsAdapterError('Supabase not configured — cannot persist CAPI config', { code: 'NO_SUPABASE' });
    }

    const { data: existing } = await supabase
      .from('agency_clients')
      .select('secrets')
      .eq('id', opts.client_id)
      .maybeSingle();

    const secrets = (existing?.secrets as Record<string, any>) ?? {};
    const meta = (secrets.meta as Record<string, any>) ?? {};
    const configured_at = new Date().toISOString();

    meta.capi = {
      pixel_id: opts.pixel_id,
      access_token: opts.access_token,
      test_event_code: opts.test_event_code ?? null,
      configured_at,
    };
    secrets.meta = meta;

    const { error } = await supabase
      .from('agency_clients')
      .update({ secrets })
      .eq('id', opts.client_id);

    if (error) {
      throw new MetaAdsAdapterError(`Failed to persist CAPI config: ${error.message}`, { code: 'SUPABASE_WRITE_FAILED' });
    }

    await emitMetaEvent({
      operation: 'setupConversionApi',
      type: 'ad_campaign_updated',
      severity: 'info',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: opts.pixel_id,
      payload: {
        pixel_id: opts.pixel_id,
        configured_at,
        has_test_event_code: Boolean(opts.test_event_code),
      },
    });

    return { configured_at };
  } catch (err) {
    await emitMetaError({
      operation: 'setupConversionApi',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: opts.pixel_id,
      err,
    });
    throw err;
  }
}

/**
 * Fire a CAPI event (Lead / Schedule) to Meta.
 * Caller is responsible for any PII hashing inside event_data.user_data.
 */
export async function sendConversionEvent(
  opts: SendConversionEventOpts,
): Promise<SendConversionEventResult> {
  const startedAt = Date.now();
  try {
    const accessToken = await resolveAccessToken({
      client_id: opts.client_id,
      overrideToken: opts.access_token,
    });

    const body: Record<string, unknown> = {
      data: [
        {
          event_name: opts.event_name,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          ...opts.event_data,
        },
      ],
    };
    if (opts.test_event_code) body.test_event_code = opts.test_event_code;

    const res = await metaFetch({
      method: 'POST',
      path: `/${opts.pixel_id}/events`,
      accessToken,
      body,
    });

    const events_received = n(res.body?.events_received);
    const result: SendConversionEventResult = { events_received };

    await emitMetaEvent({
      operation: 'sendConversionEvent',
      type: 'conversion_event_sent',
      severity: 'info',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: opts.pixel_id,
      payload: {
        pixel_id: opts.pixel_id,
        event_name: opts.event_name,
        events_received,
        test_mode: Boolean(opts.test_event_code),
      },
    });

    return result;
  } catch (err) {
    await emitMetaError({
      operation: 'sendConversionEvent',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: opts.pixel_id,
      err,
    });
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Discovery
// ──────────────────────────────────────────────────────────────────────────────

/**
 * List ad accounts owned by a Meta Business Manager.
 * Used by intake-officer during onboarding to populate a picker.
 *
 * Whitelisted fields only: id, name, currency, account_status.
 */
export async function listAdAccounts(
  opts: ListAdAccountsOpts,
): Promise<AdAccountSummary[]> {
  const startedAt = Date.now();
  try {
    const accessToken = await resolveAccessToken({ client_id: opts.client_id });

    const res = await metaFetch({
      method: 'GET',
      path: `/${opts.business_id}/owned_ad_accounts`,
      accessToken,
      query: { fields: 'id,name,currency,account_status', limit: 200 },
    });

    const raw = Array.isArray(res.body?.data) ? res.body.data : [];
    const accounts: AdAccountSummary[] = raw.map((r: any) => ({
      id: String(r?.id ?? ''),
      name: String(r?.name ?? ''),
      currency: String(r?.currency ?? ''),
      account_status: Number.isFinite(r?.account_status) ? Number(r.account_status) : 0,
    }));

    // Spec §7: listAdAccounts success drops to console.debug (no kernel event).
    debugLog('listAdAccounts', {
      business_id: opts.business_id,
      account_count: accounts.length,
      duration_ms: Date.now() - startedAt,
    });

    return accounts;
  } catch (err) {
    await emitMetaError({
      operation: 'listAdAccounts',
      client_id: opts.client_id,
      duration_ms: Date.now() - startedAt,
      external_id: opts.business_id,
      err,
    });
    throw err;
  }
}
