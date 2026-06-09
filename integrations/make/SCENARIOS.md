# Make Scenario Templates

## Facebook Lead Ads to Boltcall

Trigger: Facebook Lead Ads new lead.

Action: Boltcall `Create Lead`.

Map:

- `full_name` -> `name`
- `email` -> `email`
- `phone_number` -> `phone`
- `leadgen_id` -> `external_id`
- `facebook_lead_ad` -> `source`

## Google Ads Lead Form to Boltcall

Trigger: Google Ads / webhook payload.

Action: Boltcall `Create Lead`.

Map:

- `lead_id` -> `external_id`
- `FULL_NAME` -> `name`
- `EMAIL` -> `email`
- `PHONE_NUMBER` -> `phone`
- `google_lead_form` -> `source`

## Boltcall New Lead to HubSpot

Trigger: Boltcall `Watch Leads`.

Action: HubSpot create/update contact.

Map:

- `email`, `phone`, `first_name`, `last_name`
- `source` -> lead source
- `first_touch_status` -> custom contact property

## Boltcall New Lead to Google Sheets

Trigger: Boltcall `Watch Leads`.

Action: Google Sheets add row.

Columns:

- Created At
- Name
- Email
- Phone
- Source
- Status
- First Touch Status
