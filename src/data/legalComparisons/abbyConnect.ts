import type { LegalComparisonData } from './types';
import { boltcallPlansTable } from './boltcall';

const c = (text: string, ...src: string[]) => ({ text, src });

const abbyConnect: LegalComparisonData = {
  competitor: 'Abby Connect',
  path: '/compare/boltcall-vs-abby-connect',
  slug: 'abby-connect',
  title: 'Boltcall vs Abby Connect for Law Firms: Pricing, Intake & Fit (2026)',
  description:
    'Boltcall vs Abby Connect for law firms. Per-minute pricing side by side, human and AI answering, Clio and MyCase, intake, contract terms, and where each one is the better fit. Sources linked.',
  h1: 'Boltcall vs Abby Connect for law firms: pricing, intake and fit',
  publishDate: '2026-10-02',
  modifiedDate: '2026-10-02',
  verifiedLabel: 'October 2, 2026',
  intro: [
    'Abby Connect answers calls for law firms with human receptionists, an AI receptionist, or both on the same call. Boltcall is an AI-only speed-to-lead platform: it answers calls, texts back missed calls, and calls new web-form leads back right away. Of the answering services law firms compare, Abby is the closest match to Boltcall, because it also sells AI. It also sells people, and that matters.',
    'This page uses only what each company publishes. Abby Connect facts link to a numbered source at the bottom. If a figure is not public, we say so instead of guessing.',
  ],
  answer: {
    query: 'Boltcall vs Abby Connect for a law firm, which one fits',
    definition:
      'Abby Connect is an answering service with human, AI and hybrid answering billed per minute, and Boltcall is an AI-only speed-to-lead platform on flat monthly plans.',
    stat: 'Abby Connect costs less to start, has US-based human receptionists as well as AI, and lists native Clio, MyCase, Lawmatics, Filevine and Smokeball integrations. Boltcall calls new web-form leads back immediately and texts back missed calls, with fixed intake guardrails on every call.',
    outcome:
      'Choose Abby Connect if you want people available on the phone or live practice-management sync. Look at Boltcall if slow follow-up on web forms and missed calls is where you lose cases and AI-only is acceptable to you. Abby Connect figures are footnoted below.',
  },
  glance: [
    {
      label: 'Who answers',
      boltcall: 'AI only. Can transfer to your own staff. No staffed human receptionists.',
      competitor: c(
        'Human receptionists, AI, or both. You choose per call type, time of day or your own rules. The AI can warm-transfer to an Abby receptionist or your team on the same call.',
        'pricing',
        'hybrid',
        'aiProduct',
      ),
    },
    {
      label: 'Entry price',
      boltcall: '$549 per month (Starter)',
      competitor: c('$165 per month for 50 Abby Minutes (Starter)', 'pricing'),
    },
    {
      label: 'What you are billed for',
      boltcall: 'A monthly credit pool shared across calls, texts and chat (1 AI voice minute = 10 credits)',
      competitor: c(
        'Abby Minutes. 1 minute of human answering uses 1 Abby Minute, 1 minute of AI answering uses half. Overage is billed at your plan\'s Abby Minute rate.',
        'pricing',
      ),
    },
    {
      label: 'New web-form lead',
      boltcall:
        'Immediate AI callback, 8am to 9pm in the lead\'s local time, and only if the lead gave a phone number',
      competitor: c(
        'Lists outbound calls as a use case. We found no automatic callback to new web-form leads on the pages we reviewed.',
        'aiProduct',
      ),
    },
    {
      label: 'Missed calls',
      boltcall: 'Missed-call text-back',
      competitor: c(
        'Answers calls with people or AI, with a 24/7 option. We found no missed-call text-back feature on the pages we reviewed.',
        'pricing',
      ),
    },
    {
      label: 'Native Clio / MyCase',
      boltcall: 'No. Connect through Zapier, Make or webhooks.',
      competitor: c('Yes. Both are in its legal integrations list, which Abby says it builds and manages.', 'integrations'),
    },
    {
      label: 'Hours',
      boltcall: 'Calls answered 24/7',
      competitor: c(
        'AI answers 24/7/365. Standard human hours are 5am to 9pm PST weekdays and 6am to 6pm PST weekends. A 24/7 human option is available, with no weekend upcharge.',
        'terms',
        'pricing',
      ),
    },
    {
      label: 'Spanish',
      boltcall: 'Each agent runs in English or Spanish, not both on the same call',
      competitor: c('English and Spanish included on every plan. Its AI detects the caller\'s language automatically.', 'legal', 'aiProduct'),
    },
    {
      label: 'Setup and trial',
      boltcall: 'About 5 minutes, self-serve. Free setup. No credit card to start.',
      competitor: c(
        'No setup fee. Onboarding is one short call. Free trial of 14 days or 500 Abby Minutes, whichever comes first, then your payment method is charged automatically.',
        'pricing',
        'aiProduct',
        'terms',
      ),
    },
    {
      label: 'Contract and refunds',
      boltcall: 'Cancel any time (auto-renews, cancellation at period end). See Terms for refund details.',
      competitor: c(
        'Month-to-month. After the first 30 days, cancelling takes 30 days\' advance notice. No refunds, except a 22-day money-back guarantee for new clients on their first purchase.',
        'pricing',
        'terms',
      ),
    },
  ],
  pricing: {
    intro:
      'The two companies bill in different units. Abby Connect bills per minute, and an AI minute costs half a plan minute. Boltcall bills a flat monthly price for a credit pool. All Abby Connect prices below are as published on the dates in the Sources list.',
    competitorTables: [
      {
        title: 'Abby Connect plans (billed in Abby Minutes)',
        note: c(
          'Plan prices and minutes are from the Abby Connect pricing page. The per-minute columns are our arithmetic from the published price and allowance. Overage is billed at your plan\'s Abby Minute rate. Per its Terms, billed time includes ring, talk and transfer time (not hold time), and each call is rounded up to the nearest 30 seconds.',
          'pricing',
          'terms',
        ),
        columns: ['Plan', 'Price per month', 'Abby Minutes', 'Human minutes or AI minutes', 'Per human minute (our math)', 'Per AI minute (our math)'],
        rows: [
          ['Starter', '$165', '50', '50 or 100', '$3.30', '$1.65'],
          ['Essential', '$329', '100', '100 or 200', '$3.29', 'About $1.65'],
          ['Professional', '$599', '200', '200 or 400', 'About $3.00', 'About $1.50'],
          ['Growth', '$1,380', '500', '500 or 1,000', '$2.76', '$1.38'],
          ['Enterprise', 'Custom', 'Custom', 'Custom', 'Custom', 'Custom'],
        ],
      },
    ],
    boltcallTable: boltcallPlansTable,
    illustration: {
      title: 'Illustration: what each plan\'s allowance covers',
      assumptions: [
        'Illustration only, not a quote. Your numbers will differ.',
        'Assumes an average call of 3 billed minutes and that the entire Boltcall credit pool is spent on voice. In practice texts and chat also use credits, and Abby rounds each call up to the nearest 30 seconds.',
        'Abby Connect figures are its published plans, shown once with every call handled by AI and once with every call handled by a person.',
      ],
      table: {
        title: 'Allowance under that assumption',
        columns: ['Option', 'Monthly price', 'Calls covered if all AI', 'Calls covered if all human'],
        rows: [
          ['Boltcall Starter', '$549', 'About 33', 'n/a (AI only)'],
          ['Boltcall Pro', '$897', 'About 100', 'n/a (AI only)'],
          ['Boltcall Ultimate', '$4,997', 'About 333', 'n/a (AI only)'],
          [c('Abby Connect Starter', 'pricing'), '$165', 'About 33', 'About 16'],
          [c('Abby Connect Essential', 'pricing'), '$329', 'About 66', 'About 33'],
          [c('Abby Connect Professional', 'pricing'), '$599', 'About 133', 'About 66'],
          [c('Abby Connect Growth', 'pricing'), '$1,380', 'About 333', 'About 166'],
        ],
      },
      takeaway:
        'If all you need is calls answered, Abby Connect\'s published prices are lower at every tier shown, and its AI minutes go twice as far. Boltcall is not priced to win a pure per-minute comparison. Its plan covers the web-form callback, missed-call text-back, SMS follow-up and booking in one price, so decide whether you need those pieces.',
    },
  },
  competitorWins: [
    c('People on the phone. Abby offers human receptionists, AI, or both, and its AI can warm-transfer a caller to an Abby receptionist on the same call. It says all of its receptionists work in its Las Vegas, Nevada office.', 'pricing', 'aiProduct', 'home'),
    c('Lower entry price: $165 per month for 50 Abby Minutes, and an AI minute uses half an Abby Minute, so Starter covers up to 100 AI minutes.', 'pricing'),
    c('Native legal integrations. Its legal list includes Clio Manage, Clio Grow, MyCase, Lawmatics, Filevine, Smokeball, CASEpeer, PracticePanther, Rocket Matter and Docketwise, and Abby says it will build a missing one during onboarding for free.', 'integrations'),
    c('Intake that lands in your case file. With Clio Manage, prospective clients are screened per your instructions (practice area, conflict basics, urgency) and arrive as contacts with intake details attached.', 'clio'),
    c('Spanish included. English and Spanish are included on every plan, and its AI detects the caller\'s language automatically.', 'legal', 'aiProduct'),
    c('HIPAA compliance options, listed for human answering only. Relevant if your intake touches medical records, as in personal injury.', 'pricing'),
    c('A free trial (14 days or 500 Abby Minutes) and no setup fee.', 'pricing', 'terms'),
    c('A longer track record: 20+ years of call handling, and it says it is trusted by more than 2,000 law firms.', 'home', 'legal'),
  ],
  boltcallWins: [
    'Speed-to-lead is the product. A new web-form lead with a phone number gets an immediate AI callback during 8am to 9pm in their local time, and missed calls get a text-back. Both are in the Starter plan.',
    c('Fixed intake guardrails on every call. Each call opens with an AI disclosure and "this call may be recorded", and this cannot be switched off in the US. The agent asks for conflict-check names first, gives no legal advice, tells the caller the call does not make them a client, never promises confidentiality, and does not collect Social Security or financial details. On the Abby pages we reviewed we found no statement on whether its AI identifies itself as AI. Its Terms say callers hear a recording notice if you opt in to recording.', 'terms'),
    'Urgent matters are flagged on the call (custody or arrest, domestic violence, a court date within 48 hours, deportation, an imminent deadline) and your team is alerted by email, with an optional live transfer to your own number.',
    'SMS follow-up with leads is in the plan, and a website chat widget is included from Pro up.',
  ],
  boltcallLimits: [
    'No staffed humans. Boltcall is AI only. It can transfer a call to your own number if you configure that.',
    'No native Clio, MyCase, Filevine or Lawmatics integration yet. You connect through Zapier, Make or webhooks, and it books into Google Calendar or Cal.com.',
    c('It starts at $549 per month, which is more than Abby Connect\'s Starter ($165) and Essential ($329) plans.', 'pricing'),
    'The credit pool caps usage: about 100 AI voice minutes per month on Starter if spent only on voice.',
    'Each agent runs in English or Spanish, not both on the same call.',
    'Boltcall does not claim HIPAA or other health-information compliance.',
    'Boltcall is newer and has no public review profile on sites like G2 or Capterra to point to.',
  ],
  whoShouldChoose: {
    competitor: [
      'You want a person available on the phone, or AI that hands off to a person on the same call.',
      'You want the lowest monthly price for answering calls at low volume.',
      'You need native Clio, MyCase, Lawmatics, Filevine or Smokeball sync.',
      'You get callers in both English and Spanish on one line, or your intake needs a HIPAA option.',
    ],
    boltcall: [
      'Your biggest leak is how fast you reach new web-form leads and missed calls.',
      'You want the same intake guardrails and AI disclosure on every call, not set per script.',
      'You want one flat monthly price rather than per-minute billing with rounding.',
      'Google Calendar or Cal.com, with Zapier or webhooks for the rest, is enough integration.',
    ],
  },
  legalSpecifics: [
    {
      topic: 'Intake',
      boltcall:
        'Intake scripts for personal injury, family, criminal defense, immigration and estate planning. Does not give legal advice, assess a case, or quote fees unless your firm provides them.',
      competitor: c(
        'Receptionists follow your intake script on every first call: the caller\'s matter, contact details and the qualifying questions you set. Lists personal injury, family, criminal defense, estate planning, immigration and corporate law.',
        'legal',
      ),
    },
    {
      topic: 'Conflict checks',
      boltcall: 'Asks for the names a conflict check needs, first. It does not check them against your client list.',
      competitor: c('With Clio Manage, prospective clients are screened per your instructions, including conflict basics.', 'clio'),
    },
    {
      topic: 'Urgent matters',
      boltcall: 'Flags custody or arrest, domestic violence, a court date within 48 hours, deportation and imminent deadlines, and alerts your team by email. Danger means the caller is told to call 911.',
      competitor: c('Screens for urgency per your instructions. Its AI warm-transfers the calls you flag, such as new legal matters, to a receptionist or your team.', 'clio', 'aiProduct'),
    },
    {
      topic: 'Practice management',
      boltcall: 'No native Clio, MyCase, Filevine or Lawmatics. Zapier, Make and webhooks. Books into Google Calendar or Cal.com.',
      competitor: c(
        'Native legal integrations including Clio Manage, Clio Grow, MyCase, Lawmatics, Filevine and Smokeball. Clio Manage gets caller, time, duration, a call summary and outcome on the matter or contact.',
        'integrations',
        'clio',
      ),
    },
    {
      topic: 'Booking consultations',
      boltcall: 'Books into Google Calendar or Cal.com.',
      competitor: c('Human receptionists schedule through Calendly. The AI books into scheduling platforms including Google Calendar, Calendly and Acuity.', 'legal', 'aiProduct'),
    },
    {
      topic: 'AI and recording disclosure',
      boltcall: 'Every call opens with an AI disclosure and "this call may be recorded". The caller is told the call does not make them a client. Boltcall never promises confidentiality on the call.',
      competitor: c('We found no statement on whether its AI identifies itself as AI. Per its Terms, if you opt in to recording, callers are told at the start that the call is recorded.', 'terms'),
    },
    {
      topic: 'Fee structure (Rule 5.4)',
      boltcall: 'Flat plan. No per-case fees and no share of fees.',
      competitor: c('Plan price plus per-minute overage at the plan rate, as shown in the pricing table above. No per-case fees are listed.', 'pricing'),
    },
    {
      topic: 'After hours',
      boltcall: 'Calls answered 24/7. The web-form callback only runs 8am to 9pm in the lead\'s local time.',
      competitor: c('AI answers 24/7/365. Standard human hours are 5am to 9pm PST weekdays and 6am to 6pm PST weekends, with no standard human answering on seven US holidays, unless you set up 24/7 coverage.', 'terms'),
    },
    {
      topic: 'Recordings',
      boltcall: 'Recording and transcript for every call.',
      competitor: c('Encrypted call recordings, transcripts and an AI summary. Per its Terms, transcripts and summaries are made by third-party providers with no accuracy warranty.', 'pricing', 'aiProduct', 'terms'),
    },
    {
      topic: 'Security statements',
      boltcall: 'Encrypted in transit (TLS 1.2+), sensitive data encrypted at rest (AES-256), role-based access with MFA, a DPA with sub-processor list, no training on calls without consent, data deleted 30 days after termination. Boltcall does not claim SOC 2 or health-information compliance. Details on the law firm security page.',
      competitor: c('States its receptionists are trained in client confidentiality and data security, and lists encrypted call recordings and HIPAA compliance options (human answering only). We found no SOC 2 claim on the pages we reviewed.', 'legal', 'pricing'),
    },
  ],
  faq: [
    {
      q: 'Is Abby Connect cheaper than Boltcall for a law firm?',
      a: c('For answering calls, yes. Abby Connect starts at $165 per month for 50 Abby Minutes, and an AI minute uses half an Abby Minute. Boltcall starts at $549 per month. The units differ, so see the pricing section before comparing.', 'pricing'),
    },
    {
      q: 'Does Boltcall have live human receptionists?',
      a: 'No. Boltcall is AI only. It can transfer a call to your own staff if you set up a number. If you want staffed people answering, or AI that hands off to a person, Abby Connect offers both.',
    },
    {
      q: 'Does Boltcall integrate with Clio or MyCase?',
      a: c('Not natively yet. Boltcall connects through Zapier, Make and webhooks and books into Google Calendar or Cal.com. Abby Connect lists Clio and MyCase as native integrations.', 'integrations'),
    },
    {
      q: 'Does either one follow up on web-form leads?',
      a: c('Boltcall calls a new web-form lead back immediately with AI, between 8am and 9pm in the lead\'s local time, if the lead gave a phone number. Abby Connect lists outbound calls as a use case, billed by the minute, but we found no automatic web-form callback on the pages we reviewed.', 'aiProduct', 'terms'),
    },
    {
      q: 'Is either one HIPAA compliant?',
      a: c('Abby Connect lists HIPAA compliance options for human answering only. Boltcall does not claim health-information compliance. If your practice handles medical records, such as personal injury, ask each vendor what it will sign.', 'pricing'),
    },
    {
      q: 'What should I check in Abby Connect\'s terms before signing?',
      a: c('Per its Terms: billed time includes ring and transfer time and is rounded up to the nearest 30 seconds per call; the free trial converts to a paid plan automatically; after the first 30 days, cancelling takes 30 days\' notice; and refunds are limited to a 22-day money-back guarantee for new clients. Check Boltcall\'s Terms the same way.', 'terms'),
    },
    {
      q: 'Who makes this page?',
      a: 'Boltcall. We are one of the two products compared, so check every figure against the linked sources.',
    },
  ],
  methodology: [
    'Abby Connect facts come from its public website pages and Terms and Conditions, read on October 2, 2026. Each one links to the page in Sources. We did not test either product\'s call quality and make no claims about it.',
    'Boltcall facts come from our own product and plan configuration and Terms. We list our limits in the same detail as theirs.',
    'Prices and features verified October 2, 2026. Pricing changes often; check the vendor\'s page before buying. If a figure here is out of date, tell us and we will fix it.',
  ],
  related: [
    { label: 'Best law firm answering services', href: '/compare/best-law-firm-answering-services' },
    { label: 'Boltcall vs Smith.ai', href: '/compare/boltcall-vs-smith-ai' },
    { label: 'Boltcall vs Ruby', href: '/compare/boltcall-vs-ruby' },
    { label: 'Boltcall vs Answering Legal', href: '/compare/boltcall-vs-answering-legal' },
    { label: 'Boltcall vs LEX Reception', href: '/compare/boltcall-vs-lex-reception' },
    { label: 'Lawyer answering service', href: '/industries/lawyer-answering-service' },
    { label: 'Boltcall pricing', href: '/pricing' },
    { label: 'Law firm security', href: '/law-firm-security' },
  ],
  sources: {
    pricing: { title: 'Abby Connect pricing', url: 'https://www.abby.com/pricing/' },
    legal: { title: 'Abby Connect legal answering service', url: 'https://www.abby.com/industries/legal/' },
    aiProduct: { title: 'Abby Connect AI Receptionist', url: 'https://www.abby.com/products/ai-receptionist/' },
    hybrid: { title: 'Abby Connect Human + AI Receptionist', url: 'https://www.abby.com/human-ai-receptionist/' },
    integrations: { title: 'Abby Connect integrations', url: 'https://www.abby.com/integrations/' },
    clio: { title: 'Abby Connect Clio Manage integration', url: 'https://www.abby.com/integration/clio-manage/' },
    home: { title: 'Abby Connect home page', url: 'https://www.abby.com/' },
    terms: { title: 'Abby Connect Terms and Conditions (last updated August 19, 2026)', url: 'https://www.abby.com/resources/terms-and-conditions/' },
  },
};

export default abbyConnect;
