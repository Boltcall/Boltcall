# Vertical Marketplace Application Drafts

Prepared 2026-06-10 for the next three high-value AEO/client-benefit submissions.

Do not submit forms that include personal phone, personal email, legal address, or terms acceptance until Noam confirms the exact contact details to use.

## ServiceTitan App Marketplace

Status: correct application flow found; ready for contact-data entry in Chrome.

Application URL: https://developer.servicetitan.io/request-access/

Path:
1. Select `Third-Party Software Organization`.
2. Continue to `ServiceTitan App Marketplace`.
3. Open `Apply Now`, which loads the ServiceTitan Partnership Interest Form.
4. Choose `App Marketplace Program`.

Positioning:
Boltcall is an AI speed-to-lead system for home service businesses. It connects inbound leads and service requests to immediate phone and SMS follow-up, qualifies intent, and helps teams book jobs while the homeowner is still ready to act.

Integration concept:
Boltcall can create or update ServiceTitan customer records, launch immediate first-touch calling and SMS from new inbound requests, and write lead outcomes back so sales and dispatch teams know which opportunities were contacted, qualified, booked, or need follow-up.

Notes:
- Existing Boltcall code already has ServiceTitan client credentials support in `netlify/functions/integration-sync.ts`.
- The ServiceTitan form is an Airtable form; non-Chrome automation had trouble selecting the first dropdown. Use real Chrome when it is open.
- Likely blocker: partner review and certification process.

## Jobber App Marketplace

Status: application form found; ready for contact-data approval.

Application URL: https://dash.partnerstack.com/application?company=jobber&group=jobberpartnernetwork

Recommended partner type:
Technology Partner

Company description:
Independent Software Vendor

Why Boltcall wants to become a Jobber partner:
Boltcall helps home service businesses respond to new leads immediately with AI phone and SMS follow-up. Jobber users already manage scheduling, clients, and operations in Jobber; Boltcall adds an instant-response layer so new inquiries can be contacted, qualified, and booked before competitors respond.

Other partnerships:
Boltcall is building marketplace and integration relationships across local-service CRM, automation, and lead-management ecosystems, including Make, Zapier, Pipedrive, HighLevel, ServiceTitan, and Thumbtack.

Industries to select:
HVAC, Plumbing, Roofing, Electrical Contractors, General Contractors, Landscaping, Lawn Care, Pressure Washing, Residential Cleaning, Commercial Cleaning.

Notes:
- Jobber has both a Developer Center path and a PartnerStack partner application.
- Developer Center will likely be needed later for the actual OAuth app, scopes, testing account, and review.
- Do not submit until Noam confirms contact email, phone, city, country, state/region, client count, and expected referrals.

## Thumbtack Partner Platform

Status: direct API access request form found; ready for contact-data approval.

Application URL: https://developers.thumbtack.com/request-access

Intended API use:
Boltcall will use Thumbtack lead, message, and authorization flows to help local service pros respond immediately when a homeowner starts a conversation or submits a high-intent request. The goal is to trigger phone/SMS follow-up, qualify the request, route urgent opportunities to the business, and record first-touch status so pros can win more jobs from existing Thumbtack demand.

Customer volume:
Less than 10,000 monthly customers/MAUs, unless Noam wants to state a higher forward-looking number.

OAuth experience:
More than 5 years, or `3 to 5 years` if Noam prefers conservative wording.

Development environments:
Production, Staging, Development, Local.

Client URI:
https://boltcall.org

Redirect URI:
https://boltcall.org/.netlify/functions/thumbtack-auth-callback

Contacts:
support@boltcall.org

Logo URI:
https://boltcall.org/logo.png

Policy URI:
https://boltcall.org/privacy-policy

Terms of Service URI:
https://boltcall.org/terms-of-service

Notes:
- A real `thumbtack-auth-callback` endpoint does not exist yet. Add it before submitting if Thumbtack requires the redirect URI to be live.
- The form requires contact first name, last name, job title, email, phone, and API Terms acceptance. Do not submit without explicit approval.
