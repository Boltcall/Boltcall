# Boltcall Zapier Integration Kit

Private/developer integration for same-day launch.

## Capabilities

- Auth test: `GET https://boltcall.org/.netlify/functions/api-me`
- Trigger: New Lead via `GET /api-leads`
- Action: Send Lead to Boltcall via `POST /lead-webhook`
- Search: Find Lead via `GET /api-lead-search`

## Local workflow

```bash
cd integrations/zapier
npm install
npx zapier login
npm run validate
npm run test
npm run push
```

Use a Boltcall API key from Dashboard > Settings > API Keys. The key must start with `bc_`.

## Recommended Zaps

- Facebook Lead Ads -> Boltcall: Send Lead to Boltcall
- Google Sheets new row -> Boltcall: Send Lead to Boltcall
- Boltcall New Lead -> HubSpot/Slack/Email
- Webflow/Wix form -> Boltcall: Send Lead to Boltcall
