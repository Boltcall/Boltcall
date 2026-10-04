import type { LegalComparisonData } from './types';
import { boltcallPlansTable } from './boltcall';

const c = (text: string, ...src: string[]) => ({ text, src });

const lexReception: LegalComparisonData = {
  competitor: 'LEX Reception',
  path: '/compare/boltcall-vs-lex-reception',
  slug: 'lex-reception',
  title: 'Boltcall vs LEX Reception for Law Firms: Pricing, Intake & Fit (2026)',
  description:
    'Boltcall vs LEX Reception for law firms. How each one bills, live humans vs AI, intake, Spanish, Clio and MyCase, and where each one is the better fit. Sources linked.',
  h1: 'Boltcall vs LEX Reception for law firms: pricing, intake and fit',
  publishDate: '2026-10-02',
  modifiedDate: '2026-10-02',
  verifiedLabel: 'October 2, 2026',
  intro: [
    'LEX Reception is a legal-only answering service staffed by live receptionists. It states it does not use AI to answer phones. Boltcall is an AI-only speed-to-lead platform that answers calls and texts and calls new web-form leads back right away. If you want a person on every call, that question is settled before price comes up.',
    'This page uses only what each company publishes. LEX facts link to a numbered source at the bottom. LEX does not publish its prices, so we explain how it bills and what to ask for a quote instead of guessing a number.',
  ],
  answer: {
    query: 'Boltcall vs LEX Reception for a law firm, which one fits',
    definition:
      'LEX Reception is a human-only legal answering service, and Boltcall is an AI-only speed-to-lead platform.',
    stat: 'LEX offers live receptionists 24/7, Spanish 24/7, staffed web chat and a long list of legal software integrations, including native Clio, at no extra fee. It quotes prices through a form. Boltcall publishes a flat monthly price and calls new web-form leads back with AI right away.',
    outcome:
      'Choose LEX if you want a person answering and deep practice-management sync. Look at Boltcall if slow follow-up on web forms and missed calls is where you lose cases and AI-only is acceptable to you. LEX figures are footnoted below.',
  },
  glance: [
    {
      label: 'Who answers',
      boltcall: 'AI only. Can transfer to your own staff. No staffed human receptionists.',
      competitor: c('Live receptionists only. LEX states it does not use AI in answering phones.', 'faqs'),
    },
    {
      label: 'Entry price',
      boltcall: '$549 per month (Starter)',
      competitor: c('Not published. LEX quotes through a form or by phone.', 'register'),
    },
    {
      label: 'What you are billed for',
      boltcall: 'A monthly credit pool shared across calls, texts and chat (1 AI voice minute = 10 credits)',
      competitor: c(
        'Per minute, not per call. Calls round up to the next whole minute, and hold and transfer time are billable.',
        'faqs',
        'tos',
      ),
    },
    {
      label: 'New web-form lead',
      boltcall:
        'Immediate AI callback, 8am to 9pm in the lead\'s local time, and only if the lead gave a phone number',
      competitor: c('States its agents can follow up on inquiry forms "in minutes"', 'outbound'),
    },
    {
      label: 'Missed calls',
      boltcall: 'Missed-call text-back',
      competitor: c('Live receptionists 24/7/365. After-hours-only coverage is also offered.', 'home', 'faqs'),
    },
    {
      label: 'Native Clio / MyCase',
      boltcall: 'No. Connect through Zapier, Make or webhooks.',
      competitor: c(
        'Clio connects natively and syncs in real time. MyCase is on its integrations list. No additional fee.',
        'clio',
        'integrations',
      ),
    },
    {
      label: 'Spanish',
      boltcall: 'Each agent runs in English or Spanish, not both on the same call',
      competitor: c('24/7 Spanish-speaking answering by bilingual teams', 'bilingual', 'faqs'),
    },
    {
      label: 'Website chat',
      boltcall: 'Website chat widget on Pro and up',
      competitor: c('Chat answered by people, including weekends and after hours', 'chat'),
    },
    {
      label: 'Setup',
      boltcall: 'About 5 minutes, self-serve. Free setup.',
      competitor: c('States it sets up your customized service in under 24 hours. Setup fee not published.', 'intake'),
    },
    {
      label: 'Contract and refunds',
      boltcall: 'Cancel any time (auto-renews, cancellation at period end). 30-day money-back guarantee, see Terms section 7.',
      competitor: c(
        'Month-to-month, either side can end it on written notice. Partial months are billed in full. No free trial or money-back guarantee published.',
        'tos',
      ),
    },
  ],
  pricing: {
    intro:
      'LEX does not publish plan prices, so there is no honest side-by-side number to show. What LEX does publish is how it bills, and that matters as much as the sticker price: it charges per minute, and your intake call length drives the bill. Below is what LEX states, the questions to ask before you get a quote, and Boltcall\'s published plans.',
    competitorTables: [
      {
        title: 'How LEX Reception bills (prices not published)',
        note: c(
          'Everything in this table is from LEX\'s FAQ, Terms of Service and Plans & Pricing form. We did not use third-party price listings, because LEX has not confirmed them.',
          'faqs',
          'tos',
          'register',
        ),
        columns: ['Item', 'What LEX publishes'],
        rows: [
          ['Plan prices', c('Not published. The Plans & Pricing link opens a form, or you can call 1-800-800-9995.', 'register')],
          ['Billing unit', c('Per minute, not per call', 'faqs')],
          ['Rounding', c('Up to the next whole minute. LEX\'s example: a 2 minute 28 second call is billed as 3 minutes.', 'faqs')],
          ['What counts as billable time', c('Per its Terms, all agent time on your behalf, including hold time and time spent transferring a call', 'tos')],
          ['Overage', c('Charged per minute. The rates are shown through the form.', 'faqs')],
          ['Spam calls', c('30 calls a month under 30 seconds are free', 'faqs')],
          ['Usage alerts', c('Email at 80% and again at 100% of your usage', 'faqs')],
          ['Plan changes', c('No charge to change your plan', 'faqs')],
          ['Live transfer', c('No additional cost', 'faqs')],
          ['Integrations', c('No additional fee', 'integrations')],
          ['Contract', c('Month-to-month. Partial months are billed in full. LEX may change pricing going forward on written notice.', 'tos')],
          ['Setup fee, free trial, refunds', 'Not published'],
        ],
      },
      {
        title: 'Questions to ask LEX before you sign',
        note: 'Use these to turn a quote into a number you can compare. They apply to any per-minute answering service.',
        columns: ['Ask', 'Why it matters'],
        rows: [
          ['What is the monthly price, and how many minutes does it include?', 'Plan prices are not public, so this is the starting point.'],
          ['What is the per-minute overage rate on that plan?', c('LEX bills overage per minute, and the rate is behind the form.', 'faqs')],
          [
            'How long is a typical intake call for my practice area, including hold and transfer time?',
            c('Calls round up to the next minute and hold and transfer time are billable, so long intakes cost more.', 'faqs', 'tos'),
          ],
          ['Are outbound form follow-up and web chat in my plan, or billed separately?', 'Plan details are not published.'],
          ['Is there a setup fee, a trial, or a refund window?', 'None of these is published.'],
          [
            'Which of my tools connect natively, and which go through Zapier?',
            c('LEX\'s Clio page describes a direct login connection. We did not confirm the method for the other tools on its list.', 'clio', 'integrations'),
          ],
          ['Where are the receptionists who will take my calls located?', c('LEX says receptionists are chosen based on quality, not location.', 'faqs')],
        ],
      },
    ],
    boltcallTable: boltcallPlansTable,
  },
  competitorWins: [
    c('People on every call. LEX states every call is answered by a live receptionist and pledges to use real people in customer-facing interactions. Some callers would rather talk to a person.', 'faqs', 'home'),
    c('Legal only. Intake covers screening, qualifying callers against your practice areas, consultation booking, document gathering and follow-up. LEX says every receptionist gets two weeks of training before taking legal calls.', 'intake', 'faqs'),
    c('A long legal integration list: Clio (native, real-time sync), MyCase, LawPay, PracticePanther, Filevine, Lawmatics, Smokeball, CosmoLex, CASEpeer and more, at no additional fee.', 'integrations', 'clio'),
    c('Spanish 24/7 from bilingual teams who handle legal intake in Spanish and English. Messages are delivered in English.', 'bilingual', 'faqs'),
    c('Web chat answered by people, including weekends and after hours, plus outbound follow-up on inquiry forms by its agents.', 'chat', 'outbound'),
    c('Live transfer to the team members you choose at no additional cost, call recordings, and a mobile app for texting and calling from your business number.', 'faqs', 'app'),
    c('Scheduling included: Setmore legal calendar with appointment reminders, and a LawPay link can be added to consultation booking.', 'setmore', 'intake'),
    c('Track record: LEX says it has over 10 years of experience with law firms, and it shows a 4.9 TrustScore from 1,343 reviews on Trustpilot.', 'home', 'trustpilot'),
    c('Billing guardrails: 30 free short spam calls a month, email alerts at 80% and 100% of usage, and free plan changes.', 'faqs'),
  ],
  boltcallWins: [
    'Speed-to-lead is the product. A new web-form lead with a phone number gets an immediate AI callback during 8am to 9pm in their local time, and missed calls get a text-back. Both are in the Starter plan with no extra line item.',
    c('A published price. Boltcall\'s plans and credit pools are on the pricing page, so you can estimate the cost before you talk to anyone. LEX quotes through a form.', 'register'),
    'Self-serve start: free setup in about 5 minutes, no credit card to start, and a 30-day money-back guarantee (see Terms, section 7). LEX does not publish a trial or a guarantee.',
  ],
  boltcallLimits: [
    'No staffed humans. Boltcall is AI only. It can transfer a call to your own number if you configure that. If your callers need a person, LEX is built for that.',
    'No native Clio, MyCase, Filevine or Lawmatics integration yet. You connect through Zapier, Make or webhooks, and it books into Google Calendar or Cal.com.',
    'Each agent runs in English or Spanish, not both on the same call.',
    'It starts at $549 per month. We cannot tell you whether that is more or less than LEX for your volume, because LEX does not publish its prices.',
    'The credit pool caps usage: about 100 AI voice minutes per month on Starter if spent only on voice.',
    'Boltcall is newer and has no public review profile on sites like G2 or Capterra to point to.',
  ],
  whoShouldChoose: {
    competitor: [
      'You want a live person on every call, and no AI anywhere in the caller experience.',
      'You need native Clio sync or one of the many legal tools on LEX\'s list.',
      'You want 24/7 Spanish intake or web chat answered by people.',
      'You want a legal-only service with years of reviews behind it.',
    ],
    boltcall: [
      'Your biggest leak is how fast you reach new web-form leads and missed calls.',
      'You want to see the price before a sales call, and one flat monthly plan.',
      'AI-only intake with an always-on AI and recording disclosure fits your ethics review.',
      'Google Calendar or Cal.com, with Zapier or webhooks for the rest, is enough integration.',
    ],
  },
  legalSpecifics: [
    {
      topic: 'Intake',
      boltcall:
        'Intake scripts for personal injury, family, criminal defense, immigration and estate planning. Flags urgent matters (custody or arrest, domestic violence, court date within 48 hours, deportation, imminent deadline) and alerts your team by email. Does not give legal advice, assess a case, or quote fees unless your firm provides them.',
      competitor: c(
        'Client screening, lead qualification against your practice areas, consultation scheduling, document gathering and follow-up. Receptionists train for two weeks before taking legal calls.',
        'intake',
        'faqs',
      ),
    },
    {
      topic: 'Conflict checks',
      boltcall: 'Asks for the names a conflict check needs, first. It does not check them against your client list.',
      competitor: 'Not mentioned on the LEX pages we reviewed. Ask how names are captured and passed to you.',
    },
    {
      topic: 'Practice management',
      boltcall: 'No native Clio, MyCase, Filevine or Lawmatics. Zapier, Make and webhooks. Books into Google Calendar or Cal.com.',
      competitor: c(
        'Clio, MyCase, LawPay, PracticePanther, Filevine, Lawmatics, Smokeball, CosmoLex, CASEpeer and more, plus Zapier. Clio connects by logging in, and call details typically arrive within seconds. No additional fee.',
        'integrations',
        'clio',
      ),
    },
    {
      topic: 'Scheduling and payments',
      boltcall: 'Books consultations into Google Calendar or Cal.com.',
      competitor: c(
        'Books consultations synced to your calendar, with appointment reminders. Setmore scheduling is included, and a LawPay link can be added to booking.',
        'intake',
        'setmore',
      ),
    },
    {
      topic: 'AI and recording disclosure',
      boltcall: 'Every call opens with an AI disclosure and "this call may be recorded". The caller is told the call does not make them a client. Boltcall never promises confidentiality on the call.',
      competitor: c('No AI on calls, per LEX. Every call is answered by a live receptionist, and the firm can listen to recordings for quality assurance.', 'faqs'),
    },
    {
      topic: 'Fee structure (Rule 5.4)',
      boltcall: 'Flat plan. No per-case fees and no share of fees.',
      competitor: c('Monthly plan plus per-minute overage, quoted through a form.', 'faqs', 'register'),
    },
    {
      topic: 'Spanish',
      boltcall: 'Each agent runs in English or Spanish. It does not switch languages within one call.',
      competitor: c('24/7 Spanish-speaking answering by bilingual teams. Messages are submitted in English and flag Spanish-speaking callers.', 'bilingual', 'faqs'),
    },
    {
      topic: 'After hours',
      boltcall: 'Calls answered 24/7. The web-form callback only runs 8am to 9pm in the lead\'s local time.',
      competitor: c('Live receptionists 24/7/365, or after-hours coverage only.', 'home', 'faqs'),
    },
    {
      topic: 'Recordings',
      boltcall: 'Recording and transcript for every call.',
      competitor: c('Firms can listen to call recordings, including in the LEX mobile app.', 'faqs', 'app'),
    },
    {
      topic: 'Security statements',
      boltcall: 'Encrypted in transit (TLS 1.2+), sensitive data encrypted at rest (AES-256), role-based access with MFA, a DPA with sub-processor list, no training on calls without consent, data deleted 30 days after termination. Boltcall does not claim SOC 2 or health-information compliance. Details on the law firm security page.',
      competitor: c('States it uses strict protocols and modern technology to manage client data, and its privacy policy mentions encryption and authentication tools. Receptionists are chosen on quality, not location. We found no SOC 2 or HIPAA claim on the pages we reviewed.', 'intake', 'privacy', 'faqs'),
    },
  ],
  faq: [
    {
      q: 'How much does LEX Reception cost?',
      a: c('LEX does not publish prices. Its Plans & Pricing link opens a form, or you can call 1-800-800-9995. It bills per minute, rounds each call up to the next minute, and counts hold and transfer time. Boltcall starts at $549 per month, published on its pricing page.', 'register', 'faqs', 'tos'),
    },
    {
      q: 'Does LEX Reception use AI to answer calls?',
      a: c('No. LEX states it does not use AI in answering phones and that every call is answered by a live receptionist. Boltcall is the opposite: AI only, with an option to transfer to your own staff.', 'faqs'),
    },
    {
      q: 'Do callers prefer a human over AI?',
      a: c('Some do, and that is a fair point. LEX cites a survey it commissioned with OnePoll in which 89% of people want to speak to a real person and 1 in 3 callers would hang up on AI. Those are LEX\'s figures; we have not verified them. If many of your callers are in crisis, weigh that. Boltcall tells every caller up front that they are talking to an AI.', 'aiReport'),
    },
    {
      q: 'Does Boltcall integrate with Clio or MyCase?',
      a: c('Not natively yet. Boltcall connects through Zapier, Make and webhooks and books into Google Calendar or Cal.com. LEX lists Clio as a native, real-time integration and MyCase among many others, at no additional fee.', 'clio', 'integrations'),
    },
    {
      q: 'Which one handles Spanish-speaking callers?',
      a: c('LEX offers 24/7 Spanish-speaking answering by bilingual teams. A Boltcall agent runs in English or Spanish, so you choose one language per agent; it does not switch mid-call.', 'bilingual'),
    },
    {
      q: 'Can I leave either one month to month?',
      a: c('Yes. LEX is month-to-month and either side can end it on written notice; partial months are billed in full. Boltcall has no long-term contract and cancellation takes effect at the end of the billing period.', 'tos'),
    },
    {
      q: 'Who makes this page?',
      a: 'Boltcall. We are one of the two products compared, so check every figure against the linked sources.',
    },
  ],
  methodology: [
    'LEX Reception facts come from its public website pages and Terms of Service, read on October 2, 2026. Each one links to the page in Sources. LEX does not publish prices, and we did not use third-party price listings in their place. We did not test either product\'s call quality and make no claims about it.',
    'Boltcall facts come from our own product and plan configuration and Terms. We list our limits in the same detail as theirs.',
    'Prices and features verified October 2, 2026. Pricing changes often; check the vendor\'s page before buying. If a figure here is out of date, tell us and we will fix it.',
  ],
  related: [
    { label: 'Boltcall vs Smith.ai', href: '/compare/boltcall-vs-smith-ai' },
    { label: 'Boltcall vs Ruby', href: '/compare/boltcall-vs-ruby' },
    { label: 'Boltcall vs Answering Legal', href: '/compare/boltcall-vs-answering-legal' },
    { label: 'Boltcall vs Abby Connect', href: '/compare/boltcall-vs-abby-connect' },
    { label: 'Best law firm answering services', href: '/compare/best-law-firm-answering-services' },
    { label: 'Lawyer answering service', href: '/industries/lawyer-answering-service' },
    { label: 'Boltcall pricing', href: '/pricing' },
    { label: 'Law firm security', href: '/law-firm-security' },
  ],
  sources: {
    faqs: { title: 'LEX Reception FAQs', url: 'https://www.lexreception.com/faqs' },
    tos: { title: 'LEX Reception Terms of Service', url: 'https://www.lexreception.com/termsofservice' },
    register: { title: 'LEX Reception Plans & Pricing form', url: 'https://www.lexreception.com/register' },
    home: { title: 'LEX Reception home page', url: 'https://www.lexreception.com/' },
    intake: { title: 'LEX Reception legal intake', url: 'https://www.lexreception.com/services/legal-intake' },
    outbound: { title: 'LEX Reception legal outbound calls', url: 'https://www.lexreception.com/services/legal-outbound-call' },
    bilingual: { title: 'LEX Reception bilingual answering service', url: 'https://www.lexreception.com/services/bilingual-answering-service' },
    chat: { title: 'LEX Reception live chat', url: 'https://www.lexreception.com/tools/live-chatsupport' },
    app: { title: 'LEX Reception mobile app', url: 'https://www.lexreception.com/tools/mobile-app' },
    setmore: { title: 'LEX Reception Setmore legal calendar', url: 'https://www.lexreception.com/tools/setmore-legal-calendar-service' },
    integrations: { title: 'LEX Reception integrations', url: 'https://www.lexreception.com/integrations' },
    clio: { title: 'LEX Reception Clio integration', url: 'https://www.lexreception.com/integrations/clio' },
    privacy: { title: 'LEX Reception privacy policy', url: 'https://www.lexreception.com/privacy-policy' },
    aiReport: { title: 'LEX Reception AI report: keep law human', url: 'https://www.lexreception.com/ai-report-keep-law-human' },
    trustpilot: { title: 'LEX Reception reviews on Trustpilot', url: 'https://www.trustpilot.com/review/lexreception.com' },
  },
};

export default lexReception;
