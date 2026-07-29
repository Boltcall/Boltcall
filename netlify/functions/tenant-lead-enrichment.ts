import { Handler } from '@netlify/functions';
import { requireAuth } from './_shared/require-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Tenant lead-enrichment — Cody Schneider outbound playbook adapted for
 * Boltcall (video gy9hUWJvYMQ, 2026-04-14). Design:
 *
 *   new-paying-signup → Exa search on tenant business URL → Apollo
 *   phone/decision-maker resolution → MillionVerifier email check →
 *   row into supabase account_manager_queue for the human on the other
 *   side of the checkout event.
 *
 * SHIPPED DISABLED. Two reasons:
 * 1. Noam's global rule: "Never run campaigns. Prep everything, stop at the
 *    trigger — Noam pulls it." (feedback_never_run_campaigns.md). Enrichment
 *    that shovels leads into account_manager_queue is one keystroke from an
 *    active campaign, so it must not auto-fire.
 * 2. The Exa + Apollo integrations haven't been budgeted or key-provisioned.
 *
 * This handler responds 501 with a fully-described plan payload so a
 * follow-up session can wire the integrations behind a single feature flag
 * (LEAD_ENRICHMENT_ENABLED=true + is_founder auth) without redesigning the
 * contract.
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

const ENRICHMENT_STAGES = [
  {
    stage: 'exa_business_research',
    provider: 'exa.ai',
    input: 'tenant.business_url',
    output: 'summary, services_offered, hours, socials, review_summary',
    est_cost_usd: 0.02,
  },
  {
    stage: 'apollo_decisionmaker_lookup',
    provider: 'apollo.io',
    input: 'business_domain + role_seniority=owner|manager',
    output: 'decisionmaker_name, direct_phone, linkedin_url',
    est_cost_usd: 0.05,
  },
  {
    stage: 'millionverifier_email_check',
    provider: 'millionverifier.com',
    input: 'apollo.email',
    output: 'email_status ∈ {ok, catch_all, invalid}',
    est_cost_usd: 0.001,
  },
  {
    stage: 'supabase_account_manager_queue_insert',
    provider: 'supabase',
    input: 'the merged enrichment blob',
    output: 'account_manager_queue.id',
    est_cost_usd: 0,
  },
];

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = await requireAuth(event);
  if (!auth.ok) return auth.response;

  // Flag guard. LEAD_ENRICHMENT_ENABLED must be set to 'true' explicitly
  // AND the caller must be a founder-scoped user before this ever runs.
  const featureEnabled = process.env.LEAD_ENRICHMENT_ENABLED === 'true';
  if (!featureEnabled) {
    return {
      statusCode: 501,
      headers,
      body: JSON.stringify({
        status: 'not_implemented',
        reason: 'Lead enrichment is shipped disabled. Set LEAD_ENRICHMENT_ENABLED=true and provision EXA_API_KEY + APOLLO_API_KEY + MILLIONVERIFIER_API_KEY, then remove this guard.',
        plan: {
          insight_source: 'Marketing/insights/2026-07-29-cody-schneider-ai-agents-for-marketing.md',
          stages: ENRICHMENT_STAGES,
          destination_table: 'account_manager_queue',
          preconditions: [
            'Migration adding account_manager_queue table',
            'Founder-scope RLS on account_manager_queue',
            'Feature flag LEAD_ENRICHMENT_ENABLED',
            'Rate-limit table so a burst of signups does not blow the Exa budget',
          ],
          governance: 'feedback_never_run_campaigns — never auto-fire an outbound sequence off this; enrichment is a research artifact, not a trigger.',
        },
      }),
    };
  }

  // Wire in a follow-up session — see plan above.
  return {
    statusCode: 501,
    headers,
    body: JSON.stringify({ status: 'not_implemented', reason: 'Integrations not yet wired.' }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
export { ENRICHMENT_STAGES };
