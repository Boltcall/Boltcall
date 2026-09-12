# Clio Integration

Boltcall connects to both Clio products. They are separate APIs with separate
credentials, exposed as two providers in **Dashboard → Integrations → CRM Sync**.

| Provider key | Product | Auth | Setup time | What it writes |
|---|---|---|---|---|
| `clio_grow` | Clio Grow Lead Inbox | Per-firm token | ~2 minutes | A lead in the Grow Lead Inbox |
| `clio` | Clio Manage API v4 | OAuth 2.0 | One approval | A Person contact + a note carrying the call summary |

A firm can connect one or both. Grow is the fast path and needs no developer
application at all.

---

## Clio Grow (`clio_grow`)

### For the firm

1. In Clio Grow, open **Settings → Integrations → Lead Inbox**.
2. Copy the lead inbox token.
3. In Boltcall, open **Dashboard → Integrations → CRM Sync → Clio Grow**.
4. Pick the data region the firm's Clio account runs in, paste the token, hit **Connect**.
5. Hit **Test**. A green result means the token is live.

### How it works

One `POST` per lead:

```
POST https://grow.clio.com/inbox_leads
Content-Type: application/json
Accepts: application/json

{
  "inbox_lead_token": "<firm token>",
  "inbox_lead": {
    "from_first":    "Maria",
    "from_last":     "De La Cruz",
    "from_email":    "maria@example.com",
    "from_phone":    "+14155550100",
    "from_message":  "<call summary>",
    "referring_url": "<page the lead came from>",
    "from_source":   "Boltcall"
  }
}
```

`from_first`, `from_last`, `from_message`, `referring_url` and `from_source` are
required by Clio. Boltcall defaults every one of them, because a blank field is a
422 and a dropped lead.

`from_source` is always the literal `"Boltcall"`. Keep it that way — it is what
makes Boltcall show up as a named lead source in the firm's own Grow reporting,
which is the number a managing partner actually looks at.

Responses: `201` created, `401` bad token, `422` missing required fields.

### The connection test

The test action posts `{"inbox_lead": {}}` with the token. Clio answers `401` for
a bad token and `422` for a good token with an empty body, so the credential is
verified **without creating a junk lead in the firm's inbox**.

---

## Clio Manage (`clio`)

### Developer application

Register at <https://developers.clio.com/apps/new>, one per region.

- **Redirect URI:** `https://boltcall.org/.netlify/functions/clio-auth-callback`
- **Deauthorization callback URL:** set it — otherwise a firm revoking access is
  only discovered via a 401 on the next lead.
- **Permissions:** read/write on Contacts and Notes.

Environment variables:

```
CLIO_CLIENT_ID          # US app (default and fallback)
CLIO_CLIENT_SECRET
CLIO_CLIENT_ID_EU       # optional, per extra region
CLIO_CLIENT_SECRET_EU
CLIO_CLIENT_ID_CA / CLIO_CLIENT_SECRET_CA
CLIO_CLIENT_ID_AU / CLIO_CLIENT_SECRET_AU
```

Clio issues application IDs per region and a region also needs its own Clio
account to register in. Until an EU/CA/AU application exists, `clio-auth-start`
returns a 500 naming the region rather than sending the firm to a dead consent
screen. Clio Grow has no such constraint — all four regions work today.

### Flow

`clio-auth-start` → Clio consent → `clio-auth-callback` → tokens in
`user_integrations`.

- Authorization code TTL: **10 minutes**.
- Access token: **30 days**, stored in `config.access_token`.
- Refresh token: **never expires**, stored in `api_key` (matches the Pipedrive
  and Google pattern in this repo).
- The region is signed into the OAuth `state` so the callback hits the right
  token endpoint, and is then persisted in `config.region`.

### What a lead write does

1. `GET /api/v4/contacts?query=<email or phone>&type=Person&limit=1&fields=id,name`
2. If no match, `POST /api/v4/contacts?fields=id,name` with a `Person`.
3. `POST /api/v4/notes?fields=id` carrying the call summary, attached to the contact.

A failed note does not fail the sync — the contact is already the valuable part.

**No matter is created.** Opening a matter needs a practice area and matter type
that belong to the firm's intake decision, not to an inbound call log.

---

## Regions

A Clio credential only works against the region its account lives in. A token
from one region returns 401 against another.

| Region | Manage v4 | Grow Lead Inbox |
|---|---|---|
| US | `app.clio.com/api/v4` | `grow.clio.com/inbox_leads` |
| EU | `eu.app.clio.com/api/v4` | `eu.grow.clio.com/inbox_leads` |
| Canada | `ca.app.clio.com/api/v4` | `ca.grow.clio.com/inbox_leads` |
| Australia | `au.app.clio.com/api/v4` | `au.grow.clio.com/inbox_leads` |

Host selection lives in `netlify/functions/_shared/clio.ts`.

## Rate limits

Clio Manage allows **50 requests per minute** during business hours (US/CA
04:00–19:00 PT, EU 07:00–22:00 GMT, AU 06:00–21:00 AET, Mon–Fri), returns
`X-RateLimit-*` headers on every response, and `429` with `Retry-After` when
exceeded. Clio does not grant custom increases.

A single lead costs 2–3 calls, which is comfortable for real-time speed-to-lead.
Any bulk backfill must run off-peak and honour `Retry-After` — do not add one
without that.

## Files

| File | Role |
|---|---|
| `netlify/functions/_shared/clio.ts` | Region hosts + per-region OAuth credentials |
| `netlify/functions/clio-auth-start.ts` | Builds the authorize URL, signs region into state |
| `netlify/functions/clio-auth-callback.ts` | Code exchange, token storage |
| `netlify/functions/integration-sync.ts` | `syncToClioGrow`, `syncToClioManage`, refresh, test branches |
| `src/pages/dashboard/integrations/CrmSyncTab.tsx` | Both provider cards |
| `src/pages/IntegrationPages.tsx` | Public `/integrations/clio` page |

## Not built

- **Webhooks** (`POST /api/v4/webhooks` + `PUT /api/v4/webhooks/:id/activate`
  with an `X-Hook-Secret` echo). Nothing in Boltcall consumes matter-status
  changes yet, so a subscription would only generate traffic nobody reads.
- **Clio Platform / Grow OAuth API** (`api.clio.com/grow`, registered separately
  at `developers.api.clio.com`). Only needed to read matters and lead sources
  back out of Grow; the Lead Inbox covers every write.

## Docs

- Lead Inbox: <https://docs.developers.clio.com/guides/clio-grow/lead-inbox-api/>
- Authorization: <https://docs.developers.clio.com/api-docs/clio-manage/authorization/>
- Rate limits: <https://docs.developers.clio.com/api-docs/clio-manage/rate-limits/>
- App Directory listing: <https://docs.developers.clio.com/handbook/launch-your-app/app-directory-listing-guidelines/>
