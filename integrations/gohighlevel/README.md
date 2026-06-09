# Boltcall + GoHighLevel Same-Day Setup

This is the API key + Location ID path for same-day use. A later public HighLevel Marketplace app should use OAuth.

## What works today

- Boltcall stores a GoHighLevel API key plus `location_id` in `user_integrations`.
- New Boltcall leads sync into the selected HighLevel location as contacts.
- Existing contacts are found by email or phone before update.
- Boltcall tags contacts with `boltcall` and `ai-lead`.

## Customer setup

1. In HighLevel, open the sub-account/location you want Boltcall to update.
2. Copy the Location ID from Settings > Business Profile.
3. Create or copy an API key with Contacts read/write access.
4. In Boltcall, open Dashboard > Integrations > GoHighLevel.
5. Paste the API key and Location ID.
6. Click Test, then Save.

## Acceptance test

1. Submit a lead through `POST /.netlify/functions/lead-webhook` with a Boltcall `bc_` API key.
2. Confirm Boltcall captures the lead.
3. Confirm a tagged contact appears in the configured HighLevel location.

## Public marketplace runway

- Register a HighLevel Marketplace app.
- Implement OAuth install/callback storage.
- Request contact, location, and conversation scopes.
- Add uninstall cleanup and token refresh handling.
