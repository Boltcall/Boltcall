# Boltcall operational checklist (2026-10-01)

State after the 2026-10-01 session (deploy `6abe874be5d384ed6bf467da`, main `3cec04a39`).
Everything Claude could do is shipped. What is left needs Noam: accounts, money, DNS, decisions, a phone.

## Shipped and verified live

- **Self-improving call loop (V1).** Call ends, gets scored (law-firm checks: AI + recording disclosure, no legal advice, full intake, urgent escalation, consult or callback), per-call report in Call History, weekly pattern analysis for every workspace, suggestions in Dashboard > Agent improvements with Approve / Reject / Revert. Self-heal is approve-first (no live prompt change without the owner). Self-heal runs as a background function. Migrations applied to prod.
- **Law-firm product.** Homepage, nav, lawyer page (5 practice areas), pricing (case-value ROI), `/personal-injury` (per-case bonus removed, Rule 5.4). Dashboard wording for law firms (potential clients, consultations, matters, practice areas). Unverifiable testimonials/stats removed site-wide (list in the merge `85d902e08` message / session notes).
- **Payments.** Prod PayPal secret fixed. Plan IDs live in code (`netlify/functions/_shared/paypal-ids.json`). Live checkout returns a PayPal approval link (verified with a throwaway user). Upgrade double-billing, lost first invoice, workspace-delete order fixed.
- **Ops.** Function crashes and `notifyError` now email Noam (Brevo, rate limited). Quiet hours use the firm's timezone. Setup can no longer create duplicate agents (unique index). 13 non-secret env vars moved into code (~670 bytes of Lambda env freed). Homepage demo agents now say "AI assistant, this call is recorded".

## Noam: blockers (product does not work for a client until done)

1. **Pay Retell.** API still returns "Payment overdue, service stopped" (checked 2026-10-01). No calls, no web calls, no number purchases until paid.
2. **Supabase Pro ($25/mo).** Free plan has no backups or point-in-time recovery. Law-firm data needs it.
3. **Signup email volume.** Brevo > SMTP & API > create an **SMTP key** (not the API key). Supabase > Auth > SMTP: host `smtp-relay.brevo.com`, port 587, user = Brevo login, password = SMTP key, sender `noamj@boltcall.org`. Without it Supabase caps auth email at about 2 per hour.
4. **Authenticate boltcall.org in Brevo.** Brevo > Senders & Domains > add `boltcall.org`, then add the DKIM/SPF/DMARC records in Google/Squarespace Domains DNS. Until then only `noamj@boltcall.org` sends and lands in spam more often.

## Noam: should do soon

5. **Telegram alerts.** Bot token returns 401. BotFather > new token > update `TELEGRAM_BOT_TOKEN` in Netlify prod and local `.env`. (Errors also go to email now, so this is not blocking.)
6. **Netlify env for optional integrations** (room was freed): `CALCOM_WEBHOOK_SECRET`, `WHATSAPP_APP_SECRET`, `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET`. Skip any integration you won't offer. Tell Claude to redeploy after adding.
7. **Twilio.** Credentials are "not active": reactivate or rotate keys. US SMS to leads also needs A2P 10DLC brand + campaign registration.
8. **Netlify auto-deploy** (optional): Site settings > Build & deploy > reconnect GitHub App. Today every deploy is manual.

## Noam: decisions

9. Trial or pay-first? Today a signup gets agents and one number free, and PlanGate unlocks everything.
10. Still offering the 30-day money-back guarantee? (Kept on pricing because Terms section 7 has it.)
11. Confirm policy: flat subscription, no per-case fees or bonuses.
12. Yearly plans: create at canonical prices or keep yearly off (live yearly PayPal plans have stale prices, so yearly checkout is disabled).
13. Enterprise $997 shows below Ultimate $4997. Intended?
14. Copy says "no native Clio/MyCase yet, use Zapier/Make/webhooks". OK to say?
15. Restore any removed testimonial or stat you can actually back up.

## Noam: checks that need a phone or a real inbox (after Retell is paid)

16. Call a Boltcall number for 30+ seconds as a fake potential client. Within a minute: report shows in Dashboard > Call History. If it went badly, a suggestion appears in Agent improvements; approve it and call again.
17. Three fresh signups in a row (new Gmail each), pick "Law firm", reach the dashboard with no help.
18. Spot-check home dashboard KPIs against your own numbers.
19. Native read of the Hebrew homepage strings.
