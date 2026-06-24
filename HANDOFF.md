# Boltcall Session Handoff — for Codex / Next Agent

**Last Claude session:** 2026-06-01 → 2026-06-03
**Handoff written:** 2026-06-03
**Reason:** User's Claude subscription ending — Codex needs to continue.

This document is the single source of truth for picking up where Claude left off. Skip the ship report at `Marketing/output/2026-06-01/qa/feature-tests-report.md` unless you want the long version — read this first.

---

## TL;DR — what just happened

Across this multi-day session: **16 production bugs fixed + deployed**, **2 new features built and shipped** (WhatsApp E2E hardening + Google Ads Lead Form webhook integration), **2 Supabase migrations applied**, **11 dead env vars dropped**, **Azure container redeployed v6→v7**, **multi-agent code review run on Google Ads with 51 confirmed findings, all HIGH severity addressed**.

User wants: production-ready Boltcall that real customers can use today.

---

## Immediate next steps (do these in order)

### 1. Finish the in-flight deploy (if not already done)

The dedup pre-SELECT fix is the last commit. Check git log:
```bash
git log --oneline -5
# Expect: top commit ~ "merge: pre-SELECT dedup for Google leads webhook"
```

If `dist/` is newer than that commit, deploy already ran. If not:
```bash
npm run build:prerender && netlify deploy --prod --dir=dist --no-build
```

Verify by re-running the dedup test:
```bash
KEY="650b38429e932896026a5f170323be7d"  # user noamyakoby6+features2026 google_lead_form_key
# Same lead_id twice — second should return {"ok":true,"deduped":true}
curl -sS -X POST "https://boltcall.org/.netlify/functions/google-leads-webhook" \
  -H "Content-Type: application/json" \
  -d "{\"google_key\":\"$KEY\",\"lead_id\":\"handoff_dedup_test\",\"is_test\":false,\"user_column_data\":[{\"column_id\":\"EMAIL\",\"string_value\":\"x@y.com\"},{\"column_id\":\"PHONE_NUMBER\",\"string_value\":\"+15125558888\"}]}"
curl -sS -X POST "https://boltcall.org/.netlify/functions/google-leads-webhook" \
  -H "Content-Type: application/json" \
  -d "{\"google_key\":\"$KEY\",\"lead_id\":\"handoff_dedup_test\",\"is_test\":false,\"user_column_data\":[{\"column_id\":\"EMAIL\",\"string_value\":\"x@y.com\"}]}"
```

### 2. Two pending user-side tasks

Both block on Noam doing something interactive. They are NOT code tasks — don't try to solve them with code.

| # | Task | What Noam does | What you verify |
|---|---|---|---|
| **U1** | Facebook OAuth | Flip the Meta app `3287663841371693` to **Development** mode in `developers.facebook.com/apps`. Open `https://boltcall.org/dashboard/ad-instant-response`. Click "Connect Facebook". Approve scopes (`leads_retrieval` critical). Pick a Page. | A row exists in `facebook_page_connections` for user `78a5f97e-8d11-4287-beeb-f26f3cebf57a` (Noam's main account). Then fire a real Lead via `developers.facebook.com/tools/lead-ads-testing/` and watch a row land in `leads` with `source='facebook_lead_ad'`. |
| **U2** | Phase E re-test call | Dial **+1 (361) 304-4585** from any phone. Have a 30-60s plumbing conversation with the agent. | After hangup, fetch the call via Retell API + check the transcript greeting. Expected: greeting starts with "Hi, thanks for calling Rapid Rooter QA" (NOT the old generic "Hi, thanks for calling"). Container v7 should now load `system_prompt` from Supabase. |

When Noam comes back having done either, run the verification.

### 3. Cleanup

ONLY run cleanup after U1, U2, and Noam's notes are all collected. Cleanup script at the bottom of this doc.

---

## What was fixed in this session (16 bugs)

All shipped to prod, verified live unless noted.

| # | ID | Bug | Commit |
|---|---|---|---|
| 1 | WA1 | `whatsapp-webhook` fire-and-forget never landed (Netlify Lambda freeze) | `28726a7a` |
| 2 | WA2-mask | "AI generation failed" hid the real error | `28726a7a` |
| 3 | WA2-real | `chatCompletion` legacy fallback used Foundry deployment names | `531d4997` |
| 4 | AD1 | `AdInstantResponsePage.tsx:61` called FB OAuth start without `user_id` query param | `6b04f682` |
| 5 | F1 | `scheduled_messages` had no `metadata` column → silent insert failure | migration `add_metadata_to_scheduled_messages` |
| 6 | F1.5 | `scheduled_messages.type` CHECK rejected `missed_call_textback` + `followup` | migration `expand_scheduled_messages_type_check` |
| 7 | F2 | `retell-webhook` queried `business_profiles.phone` (no such column) | `9f07c15f` |
| 8 | F3 | `TWILIO_FROM_NUMBER` env unset → all SMS dispatcher errored | env set to `+447413288851` |
| 9 | E1+E2 | Azure container v6 had stale code → fallback prompts | container redeployed to v7, `SUPABASE_SERVICE_KEY` refreshed |
| 10 | WA3-v1 | WhatsApp AI replied in Hebrew to English customers | commit `08781c62` |
| 11 | WA3-v2 | WA3-v1 lost precedence to outbound agent's Hebrew prompt | commit `b7fe2eb0` — script detection + agent_type filter |
| 12 | TECH1 | Retell SDK `POST /v2/list-calls` deprecated 2026-06-15 | upgraded to `retell-sdk@^5.33.0` |
| 13 | UI-label-1 | `/dashboard/ai-receptionist` hardcoded "AI Receptionist" subtitle | `getAgentTypeLabel()` map |
| 14 | UI-label-2 | Header showed "Inactive" even with active agents | derive `isEnabled` from active agent count |
| 15 | Schema | `business_features.missed_call_textback_enabled` dead column | migration `drop_dead_missed_call_textback_enabled` |
| 16 | ENV-bloat | Lambda 4KB env limit blocked new function deploys | dropped 11 redundant vars (9 Azure deployment-name vars + 2 dead) |

---

## What was BUILT in this session (2 new features)

### Feature A — WhatsApp E2E hardening (deployed + verified)

Real Meta → Boltcall webhook works end-to-end now. Noam sent real WhatsApp message from `+972545744482` → message landed in `whatsapp_conversations` → AI auto-replied in English (WA3 fix) → reply delivered via Meta API.

Test workspace creds (stored in user's memory + DB):
- Phone Number ID: `1086930084505663`
- Business Account ID: `1865878334329900`
- Access Token: temp (24h) — regenerate from `developers.facebook.com/apps` → WhatsApp → API Setup when needed
- Webhook URL configured Meta-side: `https://boltcall.org/.netlify/functions/whatsapp-webhook`
- Verify token: `9a7201f0-1153-489c-ad9e-8e539454a6a4`
- Subscribed field: `messages`

### Feature B — Google Ads Lead Form webhook (deployed)

NEW files:
- `netlify/functions/google-leads-webhook.ts` — receiver
- `netlify/functions/google-leads-rotate-key.ts` — server-side key rotation
- `src/pages/dashboard/AdInstantResponsePage.tsx` — added Google card with webhook URL + key + mask/reveal/copy/rotate UI
- Migration `add_google_lead_form_key` — added `business_features.google_lead_form_key` text column with random default + unique index
- Migration `google_lead_form_dedup_index` — partial unique index `leads (user_id, raw_data->>google_lead_id) WHERE source='google_lead_form'`

Why customer-self-serve (no OAuth): Facebook Lead Ads requires App Review for `leads_retrieval` (2-6 weeks). Google's webhook path needs zero approval — customer pastes URL + key into Google Ads → leads flow. Ship today.

Customer flow (4 steps): copy webhook URL + key from `/dashboard/ad-instant-response`, paste into Google Ads → Lead form → "Lead delivery options", click "Send test data" in Google Ads to verify, save.

Live test commands at the top of this doc (section 1).

**Multi-agent review status:** 51 findings confirmed. ALL HIGH severity fixed in commit `1c049850` + dedup pre-SELECT in `c83de3f4`. ~38 lower-severity findings deferred — listed in `Outstanding findings` section below.

---

## Outstanding findings from the Google Ads review (not yet fixed)

If you have time, here's what's left. Severity descending. Stop when you run out of token budget — these are non-blocking.

### Medium

- **No rate limit / per-key submission cap.** A leaked key = unbounded Retell spend. Add a simple per-key throttle (e.g. last 60s count > 60 → 429). File: `netlify/functions/google-leads-webhook.ts` — wrap the lookup with a `business_features.google_lead_form_throttle_until` check or use Supabase RPC.
- **Retell outbound dial blocks the 200 response.** `handleInboundLead` awaits the Retell call.createPhoneCall. If Retell is slow, Google's webhook may time out. Make the first-touch fire-and-forget: modify `lead-response-service.startFirstTouch` to NOT await the Retell promise (or add `awaitFirstTouch: false` option).
- **is_test ping has no dashboard signal.** When Noam clicks "Send test data" in Google Ads, the dashboard doesn't show "yes, your verification arrived." Add a `business_features.last_google_test_ping_at` timestamp + show on the dashboard card.
- **Webhook key shown plaintext when revealed.** Acceptable for now (mask/reveal toggle exists), but worth audit-logging the reveal action.

### Low

- **Lookup error path can be probed to distinguish DB-up vs DB-down.** Constant-time response would help but is overkill given the rest of the stack.
- **All `google_*` bookkeeping fields drop from columns → live in raw_data only.** Documented in code; intentional. If you want to surface campaign/adgroup attribution in `/leads`, add columns + extract in the receiver.
- **`fireWebhooks` payload for `new_lead` omits `google_*` attribution fields.** File: `netlify/functions/_shared/lead-response-service.ts:232`. Easy add.
- **Source label `google_lead_form`** renders as "google lead form" (underscores → spaces). Add a friendly mapping if you care: `SpeedToLeadPage.tsx`.

### Nit / polish (skip if short on time)

- Webhook step #2 says "Webhook integration" — Google Ads UI actually labels it "Webhook URL". Update `AdInstantResponsePage.tsx:325`.
- CORS `Access-Control-Allow-Origin: '*'` unnecessary on a server-to-server webhook. Drop in `google-leads-webhook.ts:47`.
- Mobile layout: URL + key + 3 buttons in one flex row may overflow on small screens. Add `flex-wrap`. ← already applied in latest commit.

---

## Other Boltcall pre-existing findings I documented but did NOT fix

These are larger-than-bugfix items. Listed for awareness; don't auto-fix without Noam's input.

1. **`src/lib/auth.ts:40` hardcodes every user to `role: 'user'`.** The admin bypass in `PlanGate` is dead code. Either wire `user_metadata.role` / `app_metadata.role` from Supabase or remove the dead branch.
2. **Retell account: IL outbound is blocked at carrier level.** Boltcall sends `400 Call country not supported: IL` for any +972 destination. US customers unaffected. Toggle in Retell account settings.
3. **Twilio account: US Geo Permissions not enabled.** SMS to US recipients gets blocked. Toggle in Twilio Console → Programmable Messaging → Geo Permissions.
4. **`TWILIO_FROM_NUMBER=+447413288851`** is a UK number sending SMS to US recipients shows +44 sender — bad deliverability. Long-term: provision a US Twilio number.
5. **`findRetellConfig` no longer picks "any agent" for outbound** — I fixed it to prefer `speed_to_lead`. But the fallback still picks the inbound receptionist if no `speed_to_lead` agent exists. Verify with `git log -p netlify/functions/_shared/lead-response-service.ts | head -50`.

---

## Key reference data (DON'T LOSE)

### Test workspace (created today, ready for QA)
- Email: `noamyakoby6+features2026@gmail.com`
- User ID: `a97b5fb8-9017-4c7b-97fb-30fd48c52251`
- Workspace name: "Rapid Rooter QA"
- Industry: Plumbing, US
- Phone provisioned (Retell-pool): **`+1 (361) 304-4585`**
- Inbound agent ID (Retell): `agent_35968112e79b86e897ef99bccc`
- Outbound (Follow-Up) agent ID (Retell): `agent_70911060d06cf150054b5b1b0f`
- Google webhook key: `650b38429e932896026a5f170323be7d`
- WhatsApp connected: yes
- Subscription seeded: Ultimate, monthly, expires 2026-07-03

### Noam's main account (Ultimate plan seeded for plan-gate bypass)
- Email: `noamyakoby6@gmail.com`
- User ID: `78a5f97e-8d11-4287-beeb-f26f3cebf57a`
- Subscription seeded: Ultimate, monthly, expires **2027-06-03** (1 year — he owns this)

### Noam's phone (for QA inbound/outbound tests)
- `+972 54 574 4482`
- Same number stored in memory: `~/.claude/projects/c--Users-Asus-Desktop-Boltcall-website-Boltcall/memory/reference_noam_phone.md`

### Facebook app (Boltcall Connect Facebook Ads)
- App ID: `3287663841371693`
- Currently in: **LIVE mode** (Noam needs to flip to Dev before OAuth will work without Business Verification)
- Required OAuth Redirect URI added (Settings → Facebook Login): `https://boltcall.org/.netlify/functions/facebook-auth-callback`
- App Domains: `boltcall.org`

### Webhook URLs Noam may need
- WhatsApp: `https://boltcall.org/.netlify/functions/whatsapp-webhook` (verify token: `9a7201f0-1153-489c-ad9e-8e539454a6a4`)
- Google Ads: `https://boltcall.org/.netlify/functions/google-leads-webhook` (key per workspace from dashboard)
- Facebook Lead Ads: managed by OAuth, no manual webhook URL setup

---

## Cleanup script (run AFTER U1 + U2 + notes done)

⚠️ **Do NOT run before Noam confirms everything's verified.** Cleanup destroys the test workspace.

```sql
-- Drop test workspace + cascade
-- User: a97b5fb8-9017-4c7b-97fb-30fd48c52251
-- (Keep the auth.users row; Noam may want to re-test.)

DELETE FROM whatsapp_conversations WHERE user_id = 'a97b5fb8-9017-4c7b-97fb-30fd48c52251';
DELETE FROM whatsapp_settings WHERE user_id = 'a97b5fb8-9017-4c7b-97fb-30fd48c52251';
DELETE FROM scheduled_messages WHERE user_id = 'a97b5fb8-9017-4c7b-97fb-30fd48c52251';
DELETE FROM leads WHERE user_id = 'a97b5fb8-9017-4c7b-97fb-30fd48c52251';
DELETE FROM phone_numbers WHERE user_id = 'a97b5fb8-9017-4c7b-97fb-30fd48c52251';
DELETE FROM agents WHERE user_id = 'a97b5fb8-9017-4c7b-97fb-30fd48c52251';
DELETE FROM business_features WHERE user_id = 'a97b5fb8-9017-4c7b-97fb-30fd48c52251';
DELETE FROM business_profiles WHERE user_id = 'a97b5fb8-9017-4c7b-97fb-30fd48c52251';
DELETE FROM workspaces WHERE user_id = 'a97b5fb8-9017-4c7b-97fb-30fd48c52251';
DELETE FROM subscriptions WHERE user_id = 'a97b5fb8-9017-4c7b-97fb-30fd48c52251';
```

Then release the Retell number:
```bash
RETELL_KEY=$(netlify env:get RETELL_API_KEY --context production | tail -1)
curl -X DELETE "https://api.retellai.com/delete-phone-number/+13613044585" \
  -H "Authorization: Bearer $RETELL_KEY"
```

Then delete the QA test website:
```bash
netlify sites:delete --site-id 0329b208-cea2-4205-8e34-13cf7c1da39b --force
```

**DO NOT delete Noam's main subscription row** (`subscriptions` row for user `78a5f97e-8d11-4287-beeb-f26f3cebf57a`). That stays — Noam has Ultimate plan for the year.

---

## Working tree state

- All changes committed to `main`.
- No outstanding worktrees (all merged + cleaned up).
- `npm install` works clean on `main` — Retell SDK v5.33 + all deps reproduce.
- `npm run typecheck` passes clean.
- Last successful prod deploy: `https://6a2009970f469b2af0e78e11--boltcall.netlify.app` (Google Ads feature live).
- An in-flight build for the dedup pre-SELECT fix may still be running (see section 1).

---

## How to verify things without breaking them

- **Probe Supabase directly:** use Claude Code's Supabase MCP if available, or use the project URL `https://hbwogktdajorojljkjwg.supabase.co` with the service key from `netlify env:get SUPABASE_SERVICE_KEY --context production`.
- **Probe Retell API:** `curl -H "Authorization: Bearer $(netlify env:get RETELL_API_KEY --context production | tail -1)" https://api.retellai.com/list-agents`
- **Tail Netlify function logs:** Netlify dashboard → boltcall project → Logs → Functions.

---

## Closing note from Claude

If Codex disagrees with anything in this doc, trust the git log + the actual code over my words. I tried to be precise but I'm one session deep — the real ground truth is in `git log`, the Supabase schema, and `boltcall.org` live behavior. The `Marketing/output/2026-06-01/qa/feature-tests-report.md` has the full per-phase test evidence if you want the long-form story.

Good luck. The product is real, the customers are coming, ship the next bug.

— Claude Opus 4.7 (1M ctx), 2026-06-03
