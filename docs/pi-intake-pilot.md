# PI SMS intake pilot

## Implemented, not deployed

Public offer: `/tools/pi-sms-intake-agent`. Private free-product workspace: `/pi-intake`.
Website import uses existing authenticated scraping and Azure completion helpers. The resulting draft is editable and downloadable. Intake conversations use an intentionally guided question flow, not an unconstrained legal chatbot. Browser demos never send SMS.

Server endpoints:

- `pi-intake`: authenticated owner-only setup, demo, inbox, approval, pause, takeover, erasure.
- `pi-intake-lead`: server-to-server form POST, Bearer integration key, explicit recorded SMS consent, source ID deduplication.
- `pi-intake-inbound`: ACS Event Grid replies, custom `x-pi-webhook-secret`, authenticated subscription validation.

## Deployment prerequisites (do not skip)

1. Apply `supabase/migrations/20261003120000_pi_intake.sql` through the normal migration process. It assumes the existing `sms_optouts` table.
2. Confirm existing Supabase, Azure AI, scraper, ACS and Brevo configuration without exposing values. The shared completion helper can fall back to other configured providers; Azure credits do not imply every provider or SMS cost is covered.
3. Deploy only with explicit authorization. Keep `PI_INTAKE_LIVE_ENABLED` unset/false for preview and initial QA.
4. Set `PI_INTAKE_EVENTGRID_SECRET` and configure the custom header in the ACS Event Grid subscription. Filter events to dedicated PI pilot sending numbers; do not deliver the same events to the legacy AI responder.
5. Verify firm ownership, approved facts and intake questions, provider/carrier registration, consent language, permitted sending hours, data handling/retention, and the dedicated sending number. Website facts are not qualification rules.
6. Map the existing form through its server/plugin/Zapier/Make backend. Generate a high-entropy per-firm integration key server-side and persist only its SHA-256 hash in `pi_intake_firms.integration_key_hash`. Never put the key in browser HTML, JavaScript, a screenshot, or logs.
7. Confirm the authenticated account's notification email/preferences match the approved handoff email. The shared `alertOwner` helper uses account notification settings, NOT the draft email directly. Verify delivery with a synthetic inquiry and set `handoff_verified_at` only after successful verification.
8. Use operator/service-role setup to assign `sending_number`, `sms_verified_at` and the integration hash. Activation is not exposed to the firm. Set `paused=false` and the live deployment switch only after real end-to-end checks with approved test numbers.

## Form payload

POST `/.netlify/functions/pi-intake-lead` from a trusted backend with its Bearer integration key:

```json
{
  "sourceId": "unique-form-submission-id",
  "name": "Synthetic Test",
  "phone": "+12025550101",
  "consent": {
    "accepted": true,
    "text": "The exact consent language accepted by the prospective client.",
    "timestamp": "2026-10-03T09:00:00.000Z",
    "sourceUrl": "https://the-approved-firm.example/contact"
  }
}
```

Keep original form notifications enabled: network/provider errors return retryable errors, and responses explicitly identify staff routing. Retry with the SAME sourceId. The pilot requires fresh consent within 24 hours; old-lead reactivation is not supported.

## Allowance and controls

10 reserved real intake threads per UTC calendar month; demos limited separately to 10/hour. Up to 24 transcript messages and 72 hours per thread. A firm row lock serializes quota reservations. Overflow is retained as `needs_attention` without consuming additional reservations. Erasure removes contact/content while retaining quota metadata. STOP is blocked globally through the existing opt-out table. There is no automatic opt-in restart.

All table access is service-role only. The customer API resolves the owner from Supabase JWT and scopes every conversation by firm. Concurrent turns use compare-and-swap and inbound event receipts. Human takeover stops future automated turns. A message already submitted to the provider cannot be recalled.

## Pilot limitations and required live QA

- Not an autonomous legal agent: no case evaluation, legal advice, appointment booking, or representation confirmation.
- No browser visual QA performed: the Chrome extension reported `Codex auth token is unavailable`; the internal browser is prohibited due to the known crash.
- No production migration, SMS send, Azure resource provisioning, or deployment performed.
- Form integrations and sending numbers are manually connected by the operator. Account creation is the existing Supabase flow.
- Inbox has manual refresh and shows the newest 100 threads. No analytics or self-service paid billing is added.
- Retention is manual content erasure for the pilot; agree and implement scheduled retention before scaling real sensitive data.
- Notifications use existing Brevo/account preferences and must be verified. The form's original staff notifications are the fallback.
- A provider timeout can leave delivery uncertain. Do not automatically resend; investigate the provider receipt and route to staff. Event receipts prevent duplicate automated responses but are not a durable retry outbox.
- Pilot sends only 9am–8pm in the approved firm IANA timezone; outside this window inquiries are routed to staff rather than queued. The timezone defaults to US Eastern and MUST be confirmed, not inferred from the website. Review stricter applicable hours policies at activation.
- Existing scraper and completion helpers retain their existing network safety and provider fallback behavior. Review those integrations before public launch.

Before live activation verify website extraction, account redirects, tenant isolation, no-consent rejection, first SMS, inbound reply, STOP, HUMAN takeover, completed summary, handoff email, over-limit routing, paused-agent behavior, and provider-failure handling in regular Chrome plus approved synthetic phone tests.

## Local validation

Verified locally: 37 tests passed (feature and sitemap regression tests), `npm run build:fast` passed including app/backend TypeScript validation, and the isolated PostgreSQL-compatible migration proof passed. Full-suite regression and real browser/SMS QA have not been performed.

`npx vitest run netlify/functions/__tests__/pi-intake.test.ts netlify/functions/__tests__/pi-intake-api.test.ts netlify/functions/__tests__/pi-intake-gates.test.ts netlify/functions/__tests__/pi-intake-webhooks.test.ts src/pages/pi-intake/__tests__/PiIntake.test.tsx --maxWorkers=2`

`npm run typecheck` and `npm run build:fast` include backend types.

Optional isolated DB verification: install `@electric-sql/pglite` into a temporary external folder (not this application's dependencies), set `PI_PROOF_PGLITE` to its `dist/index.js`, and run `node scripts/verify-pi-intake-db.mjs`. No live credentials are used. It verifies the actual migration, quota, overflow retention, deduplication, firm isolation, takeover compare-and-swap, opt-out, erasure receipts, and browser-role permissions.
