# Law-firm launch runbook (2026-09-24)

Branch: `codex/session-20260923-232506-p17104` (worktree `worktrees/session-20260923-232506-p17104`).
Audit + fix evidence lives in the session scratchpad; the summary is below.

Nothing on this branch has been deployed, and the database migration has **not** been applied. Every step below is yours to run, in this order.

## 1. Before deploying (only you can do these)

1. **Signup email.** DONE 2026-09-25 without SMTP: Supabase Auth "Send Email Hook" → `netlify/functions/auth-send-email.ts` → Brevo API. Hook secret in Supabase is `v1,whsec_` + `hookSecretBase64()` (derived from `INTERNAL_API_SECRET`; rotating that secret means re-setting the hook secret).
   - Still yours: **authenticate `boltcall.org` in Brevo** (Senders & Domains → add domain → put the DKIM/SPF/DMARC records in the Google/Squarespace DNS for boltcall.org). Until then only the single sender `noamj@boltcall.org` works, and Brevo rewrites its From to `@brevosend.com` (spam risk). `noreply@boltcall.org` is rejected outright, which is why every function now defaults to `noamj@boltcall.org`. After the domain is authenticated you can switch back to `noreply@` in code (the env is at the 4KB cap, avoid adding `BREVO_FROM_EMAIL`).
2. **Backups.** The Supabase project is on the Free plan: no backups, no point-in-time recovery. Law-firm data needs the Pro plan ($25/mo) before real clients.
3. **Netlify production env vars.**
   - Leave `RETELL_CUSTOM_LLM_ENABLED` and `V2_DEFAULT_ON` **unset**. New agents then use Retell's own LLM with tools, and new firms land on the classic dashboard.
   - Set `CALCOM_WEBHOOK_SECRET`. Without it every Cal.com booking webhook fails.
   - Set `WHATSAPP_APP_SECRET` (Meta app secret) or don't offer WhatsApp. Without it every inbound WhatsApp message errors.
   - Set `MICROSOFT_CLIENT_ID` / secret, or don't offer "Connect Outlook". It is broken without them.
4. **Twilio.** The Twilio credentials in `.env` are rejected as "not active". Every direct-Twilio SMS path fails until the account is reactivated or the keys are rotated. US SMS to leads also needs A2P 10DLC brand + campaign registration, or carriers filter it.
5. **Decisions only you can make.**
   - Trial or pay-first? Today nothing checks for a subscription. A signup gets agents and one free phone number, and every dashboard feature is unlocked (PlanGate is a no-op). A second number now needs an active subscription.
   - `/personal-injury` sells a per-signed-case cash bonus to Boltcall. That is likely fee-splitting with a non-lawyer (ABA Rule 5.4). Have an attorney look at it, or remove it, before pitching law firms. The same page carries a third, separate pricing model.
   - Remaining unverified social proof: PricingPage testimonials (Marcus T., Priya S., James R.), "4.9/5 average rating" on FreeWebsitePage, "10,000+ businesses" and "25,000+ interactions" claims, FunnelOptimizer stats. Keep only what you can back up.
   - Book-a-call links now point to `cal.com/noam-jacoby/free-consultation`. Confirm that is the event you want.
6. **AIOS playbook capture.** `playbook_captures` gets row-level security. When you set `PLAYBOOK_SUPABASE_KEY` on the VM, use the **service-role** key, or captures will be rejected.

## 2. Publish (in this order)

1. Merge the branch (from the main checkout):
   ```
   git merge codex/session-20260923-232506-p17104 --no-ff
   ```
2. Apply the migration **right before** the deploy. The audit page, token rewards and Cal.com booking code on this branch need it, and it is safe with the code that's live now:
   `supabase/migrations/20260924120000_launch_hardening.sql`. Run it in the Supabase SQL editor, or through the management API. It was tested end to end inside a rolled-back transaction against prod (evidence: `db-rollback-test.md` in the session scratchpad).
   Prod has no migration history table. After applying, run `supabase migration repair` so the next `db push` doesn't replay all 69 files.
3. Deploy:
   ```
   npm run build:prerender
   netlify deploy --prod --dir=dist --no-build
   ```

## 3. Right after deploy

1. **Move existing agents off the dead custom-LLM bridge.** 47 of 83 Retell agents run on `boltcall-retell-llm` (Azure), which timed out on every health check today and has no tools (no booking, transfer or end-call). Do one agent first:
   ```
   curl -X POST https://boltcall.org/.netlify/functions/retell-agents \
     -H "x-internal-secret: $INTERNAL_API_SECRET" -H "Content-Type: application/json" \
     -d '{"action":"migrate_engine","agent_id":"agent_...","dry_run":true}'
   ```
   Check the plan, then repeat with `"dry_run":false`. Add `"transfer_number":"+1..."` if the plan shows no transfer tool. Retell doesn't auto-publish: publish the agent if its number is pinned to a version. Place a real test call and confirm a booking and a transfer fire, then do the rest.
2. **Existing law-firm agents keep their old prompts.** Those prompts have no AI/recording disclosure and invent "free consultation" and "no fee unless we win". Regenerate them: `migrate_engine` adds the disclosure, or re-save the agent from the dashboard.
3. **Homepage demo agents.** The 5 law-firm demo agents in `homepage-demo-call.ts` call prospects without a recording notice. Update their greeting in the Retell dashboard.
4. **Live checks (15 minutes).**
   - Sign up with a fresh Gmail. The email arrives, the link works, and setup completes on a phone. Pick "Law firm" and land on `/dashboard`.
   - Web-test the agent. It says it's an AI and that the call is recorded, and it refuses a "do I have a case?" question.
   - Call the agent's number. It answers, takes intake, and books a consultation once a calendar is connected (Dashboard → Integrations → Google Calendar). Without a calendar, it captures a callback request and you get an email.
   - Say "my son was just arrested". You get an urgent alert.
   - Submit a test lead at 11pm (the firm's time). There's no AI call at night, and you get an email saying to call back in the morning.
5. **Clean up the QA account** `qa.lawfirm.20260924@example.com`: Supabase user `a11dd077-…`, workspace `b7752831-…`, Retell agents `agent_9f9f869e…` and `agent_ae90f0df…`, and a `subscriptions` row set to enterprise.

## 4. What changed on this branch

- **Agents:** new agents use Retell's LLM with booking, transfer, end-call, lookup, knowledge-base and SMS tools. Calls can run 20 minutes (was 8), with no café background noise. Recording URLs are signed. `workspace_id` is set on agents and the knowledge base.
- **Law-firm prompt:** the AI and recording disclosure can no longer be switched off by how the country was typed. The outbound speed-to-lead agent gets the legal guardrails and a recording notice. Invented fees and consult terms are gone, and so are scripted legal-advice lines and the "completely confidential" claim. Intake covers conflict-check names, email, deadlines, existing clients, opposing parties and solicitors. There's urgent-matter handling and a callback fallback when no calendar is connected. "Lawn care" no longer gets the lawyer script.
- **Onboarding:** the setup page scrolls on phones (the Finish button was unreachable). Country is a dropdown and industry must be picked, with Law firm first. The greeting uses the real first name. "Check your email" is no longer a red error, and there's a resend button. Everyone lands on the classic dashboard. Setup is only counted as complete when it actually finished.
- **Speed to lead:** no AI calls during quiet hours (deferred instead). The owner gets an email for every new lead and for urgent matters. The same person reaching you on two channels gets one call. Texts go out from each firm's own number, and STOP opt-outs are enforced on every send. Inbound SMS leads are saved (a bad insert was dropping them).
- **Security:** a fail-open SMS webhook is closed, Cal.com bookings are no longer misattributed across firms, and unauthenticated deploy and intake endpoints are closed. Other fixes cover SSRF on redirects, timing-safe secret checks, rate limits on public forms, email sender spoofing, the Facebook page takeover, lost refresh tokens, the owner check on invites, and role checks on API keys. Workspace deletion now removes calls and leads. Fake "Connected" states for integrations are gone.
- **Database (migration):** adds the missing booking column and lookup/search functions. Users can no longer add themselves to someone else's workspace, grant themselves tokens, or insert rows into another firm's data. Row security is on for founder notes. There's an event log table and cascade deletes. The migration also backfills `workspace_id`, workspace names and country codes.
- **Dashboard:** today's KPIs and Growth analytics show real per-firm numbers. Help buttons and feedback work. The Delete Workspace and API-key controls are shown only to people with the right role. Google Calendar and Cal.com can actually be connected. The Services page uses law-firm wording.
- **Site and legal pages:** "500+ / thousands of businesses" claims are removed site-wide. Privacy, Terms and DPA now name PayPal and list the real subprocessors, with consistent AI-training and retention wording. The Ultimate plan button goes to signup, and `/law-firm-security` has navigation. Prices are corrected. Dead book-a-call links are fixed.

## 5. Known gaps (post-launch)

- The V2 dashboard (`/v2`) is off for new firms. It still has broken queries and is missing phone, billing, members and logout pages.
- No payment path credits `token_balances`. Token checks only log a warning for now.
- Voice minutes aren't metered or enforced per plan.
- Quiet hours assume Eastern time until a firm's timezone is collected at onboarding.
- Night leads can be queued for a morning call only after the migration is applied.
- OAuth tokens are stored in plaintext.
- No automated retention purge. The policy text now matches that.
- One workspace (`640a175a…`) has 6 duplicate inbound and 6 duplicate speed-to-lead agents from an old double-create race.
