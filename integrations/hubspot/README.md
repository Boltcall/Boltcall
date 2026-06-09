# Boltcall + HubSpot Same-Day Setup

This is the private-app path for same-day use. A later public HubSpot app can add OAuth, marketplace listing, workflow actions, and timeline-style app events.

## What works today

- Boltcall stores a HubSpot private app token in `user_integrations`.
- New Boltcall leads sync into HubSpot as contacts.
- Existing contacts are updated by email before creating a new contact.
- Boltcall sends first name, last name, email, phone, lead source, lifecycle stage, and lead status.

## Customer setup

1. In HubSpot, open Settings > Integrations > Private Apps.
2. Create a private app named `Boltcall`.
3. Grant CRM contact read/write permissions.
4. Copy the private app token.
5. In Boltcall, open Dashboard > Integrations > HubSpot.
6. Paste the token and click Test.
7. Save the integration.

## Acceptance test

1. Submit a lead through `POST /.netlify/functions/lead-webhook` with a Boltcall `bc_` API key.
2. Confirm Boltcall captures the lead.
3. Confirm the same contact appears in HubSpot with `leadsource` set to the original source.

## Public app runway

- Move auth to HubSpot OAuth.
- Add app settings page and workflow action definitions.
- Do not use HubSpot private apps for custom timeline events; private apps do not support that marketplace path.
