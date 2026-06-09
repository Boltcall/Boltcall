# Boltcall Make Custom App Kit

Private/developer kit for Make scenarios.

## Capabilities

- Connection test: `GET /api-me`
- Trigger: `Watch Leads` via `GET /api-leads`
- Action: `Create Lead` via `POST /lead-webhook`
- Search: `Find Lead` via `GET /api-lead-search`
- Advanced: `Make an API Call`

## Install path

1. Create a Make custom app named `Boltcall`.
2. Add the API-key connection from `connections/boltcall-api-key.json`.
3. Add modules from `modules/*.json`.
4. Test with a Boltcall `bc_` API key from Dashboard > Settings > API Keys.
5. Keep the app private for same-day use; submit to Make review later.

## Recommended scenarios

- Facebook Lead Ads -> Boltcall Create Lead.
- Google Ads Lead Form -> Boltcall Create Lead.
- Boltcall Watch Leads -> HubSpot Create/Update Contact.
- Boltcall Watch Leads -> Google Sheets Add Row.
