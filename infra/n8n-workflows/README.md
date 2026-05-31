# Agency OS — n8n Workflow Exports

This directory contains all 11 n8n workflow JSON exports for the Boltcall Agency OS (Layer 2 — Orchestration).

Each file is a self-contained n8n workflow export compatible with the n8n REST API import endpoint and the n8n UI "Import from file" dialog.

---

## Workflow Inventory

| File | Trigger | Phase | Description |
|---|---|---|---|
| `client-onboarded.json` | Stripe webhook (payment success) | 1 | Insert `agency_clients` row, create Cal.com intake event, send intake link email, notify Atlas via Telegram |
| `intake-call-completed.json` | Retell webhook (`call_ended`) | 1 | Validate Retell signature, POST to `agency-intake-officer` with `mode=webhook` to trigger transcript fetch and extraction |
| `artifact-shipped.json` | Poll Supabase every 5 min (`status=approved`) | 1 | Route approved artifacts by type to the correct ship handler; update `status=shipped` |
| `client-live.json` | Poll Supabase every 10 min (`status=live AND live_at IS NULL`) | 1 | Warm welcome video cache, invite client to Slack cohort channel, stamp `live_at` |
| `monday-creative-refresh.json` | Cron Mon 06:00 UTC | 2 | Loop all live Bolt System clients, POST `agency-creative-foundry` per client |
| `friday-auto-report.json` | Cron Fri 06, 07, 08 UTC (hourly pass with timezone filter) | 2 | Filter clients at local 07:00, POST `agency-reporting-scribe` with `auto_ship=true` |
| `monthly-optimization.json` | Cron 1st of month 09:00 UTC | 2 | Filter clients live >= 30 days, POST `agency-optimization-strategist` per client |
| `daily-qa-audit.json` | Cron Daily 02:00 UTC | 2 | Loop live clients, POST `agency-qa-auditor` with 20% sample rate over past 24h |
| `hourly-delivery-monitor.json` | Cron every hour | 3 | Single batched POST to `agency-delivery-monitor`, alerts Telegram if anomalies detected |
| `daily-churn-scan.json` | Cron Daily 06:00 UTC | 3 | POST `agency-churn-sentinel`, Telegram alert if any red-tier clients found |
| `weekly-expansion-scan.json` | Cron Mon 06:30 UTC | 3 | POST `agency-expansion-spotter`, queue upgrade outreach drafts if candidates found |

---

## How to Import into n8n

### Option A — UI (recommended for first import)

1. In your n8n instance, navigate to **Workflows** in the left sidebar.
2. Click **Import from file** (top-right menu or `+` button).
3. Select the JSON file from this directory.
4. The workflow imports in inactive state. Review the credential bindings (see below), then toggle it active.

### Option B — REST API (recommended for CI/CD or bulk import)

```bash
# Replace N8N_BASE_URL and N8N_API_KEY with your values
N8N_BASE_URL=https://your-n8n-instance.com
N8N_API_KEY=your-api-key-here

for f in infra/n8n-workflows/*.json; do
  curl -s -X POST \
    "$N8N_BASE_URL/api/v1/workflows" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$f" | jq '{id: .id, name: .name, active: .active}'
done
```

After bulk import, activate each workflow:

```bash
WORKFLOW_ID=<id-from-import-response>
curl -X PATCH \
  "$N8N_BASE_URL/api/v1/workflows/$WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

---

## Required Credentials

### 1. `boltcallNetlifyServiceJWT` (HTTP Header Auth)

All HTTP Request nodes that call Netlify functions use this credential. Create it in n8n under **Settings > Credentials > HTTP Header Auth**:

- Name: `boltcallNetlifyServiceJWT`
- Header Name: `Authorization`
- Header Value: `Bearer <your-netlify-service-jwt>`

The JWT value is the `NETLIFY_SERVICE_JWT` secret in your Netlify environment. Generate it with:

```bash
openssl rand -base64 48
```

Set the same value as `NETLIFY_SERVICE_JWT` in your Netlify site environment and as the credential value in n8n.

### 2. Environment Variables in n8n

Set these under **Settings > Variables** or via your n8n Docker environment:

| Variable | Description | Where to find it |
|---|---|---|
| `SUPABASE_URL` | Your Supabase project REST URL | Supabase Dashboard > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (full access) | Supabase Dashboard > Project Settings > API |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint signing secret | Stripe Dashboard > Developers > Webhooks |
| `RETELL_API_KEY` | Retell API key (used for signature validation) | Retell Dashboard > API Keys |
| `NETLIFY_FUNCTION_BASE` | Base URL for Netlify functions | e.g. `https://boltcall.org/.netlify/functions` |
| `FOUNDER_UUID` | Your Supabase auth UUID (for `founder_id` on new rows) | Supabase > Auth > Users |

### 3. Stripe Webhook Configuration

In Stripe Dashboard > Developers > Webhooks:

- Endpoint URL: `https://your-n8n-instance.com/webhook/agency-stripe-webhook`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `invoice.payment_succeeded`

### 4. Retell Webhook Configuration

In Retell Dashboard > Webhooks:

- Endpoint URL: `https://your-n8n-instance.com/webhook/agency-retell-webhook`
- Events to send: `call_ended`
- Include `metadata.client_id` in the agent's call metadata (set when creating the Retell agent via `agency-intake-officer`)

---

## Monitoring Tips

### n8n Execution Logs

Each workflow writes structured logs to n8n's execution history. Key patterns to monitor:

- `artifact-shipped.json`: If the poll returns 0 approved artifacts for more than 48h while clients are live, check the approval queue UI at `/dashboard/agency/queue`.
- `friday-auto-report.json`: Runs 3 times on Friday (06, 07, 08 UTC). Each pass processes a different timezone bucket. Check that at least one pass processes each live client per week.
- `hourly-delivery-monitor.json`: If `anomalies_count > 0` in the log, check `agency_events` table for `type=anomaly_detected` rows.

### Supabase Queries for Workflow Health

```sql
-- Artifacts stuck in approved status > 1 hour (ship workflow missed)
select id, client_id, type, status, reviewed_at
from agency_artifacts
where status = 'approved'
  and reviewed_at < now() - interval '1 hour'
order by reviewed_at asc;

-- Recent anomaly events from delivery monitor
select client_id, payload->>'metric' as metric, payload->>'sigma_deviation' as sigma, created_at
from agency_events
where type = 'anomaly_detected'
  and created_at > now() - interval '24 hours'
order by created_at desc;

-- Churn scan tier distribution (today)
select payload->>'new_tier' as tier, count(*) as clients
from agency_events
where type = 'churn_risk_changed'
  and created_at > now() - interval '24 hours'
group by 1;
```

### Atlas Telegram Alerts

The delivery monitor, churn sentinel, and expansion spotter all notify Atlas's Telegram channel for actionable signals. Ensure the Atlas Telegram bot is configured and the `agency-delivery-monitor` function has `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in its Netlify environment.

---

## Failure Mode — Netlify Scheduled Function Fallback

n8n handles orchestration ergonomics but is not load-bearing for time-critical flows. If n8n goes down, the following Netlify scheduled functions serve as backup for critical cron workflows:

| n8n Workflow | Netlify Backup Function | Fallback Schedule |
|---|---|---|
| `friday-auto-report.json` | `agency-reporting-scribe` with `scheduled=true` | Netlify cron: `0 7 * * 5` |
| `daily-qa-audit.json` | `agency-qa-auditor` with `scheduled=true` | Netlify cron: `0 2 * * *` |
| `hourly-delivery-monitor.json` | `agency-delivery-monitor` with `scheduled=true` | Netlify cron: `0 * * * *` |
| `daily-churn-scan.json` | `agency-churn-sentinel` with `scheduled=true` | Netlify cron: `0 6 * * *` |

Configure Netlify scheduled functions in `netlify.toml`:

```toml
[functions."agency-reporting-scribe"]
schedule = "0 7 * * 5"

[functions."agency-qa-auditor"]
schedule = "0 2 * * *"

[functions."agency-delivery-monitor"]
schedule = "0 * * * *"

[functions."agency-churn-sentinel"]
schedule = "0 6 * * *"
```

Each function checks `event.type === 'scheduled'` to detect when it is running as a backup vs. being called by n8n. Duplicate runs are deduplicated by checking `agency_events` for a same-type event within the last 30 minutes before executing.

---

## Version Control Policy

All workflow changes must be:

1. Exported from n8n UI as JSON (Workflow > **Download** button)
2. Saved over the corresponding file in this directory
3. Committed with message: `feat(agency-os): update n8n workflow <name>`

Never modify these JSON files directly without importing them back into n8n to verify the graph renders correctly. n8n's node `position` coordinates, `typeVersion`, and `connections` structure are sensitive to manual edits.

---

## Tags Reference

Workflows are tagged for filtering in the n8n UI:

- `agency-os` — all 11 workflows
- `phase-1` — boot sequence workflows (run first, activate before Phase 2)
- `phase-2` — continuous delivery crons (activate after first client goes live)
- `phase-3` — self-improvement and lifecycle crons (activate after Phase 2 is stable)
- `cron` — schedule-triggered workflows (as opposed to webhook/poll-triggered)
