import type { LegalComparisonData } from './types';
import { boltcallPlansTable } from './boltcall';

const c = (text: string, ...src: string[]) => ({ text, src });

const smithAi: LegalComparisonData = {
  competitor: 'Smith.ai',
  path: '/compare/boltcall-vs-smith-ai',
  slug: 'smith-ai',
  title: 'Boltcall vs Smith.ai for Law Firms: Pricing, Intake & Fit (2026)',
  description:
    'Boltcall vs Smith.ai for law firms. Published pricing side by side, intake, conflict checks, Clio and MyCase, AI disclosure, and where each one is the better fit. Sources linked.',
  h1: 'Boltcall vs Smith.ai for law firms: pricing, intake and fit',
  publishDate: '2026-03-23',
  modifiedDate: '2026-10-02',
  verifiedLabel: 'October 2, 2026',
  intro: [
    'Smith.ai answers calls for law firms with AI, live human receptionists, or a mix of both. Boltcall is an AI-only speed-to-lead platform that answers calls and texts and calls new web-form leads back right away. They solve overlapping problems in different ways.',
    'This page uses only what each company publishes. Smith.ai facts link to a numbered source at the bottom. If a figure is not public, we say so instead of guessing.',
  ],
  answer: {
    query: 'Boltcall vs Smith.ai for a law firm, which one fits',
    definition:
      'Smith.ai is an answering service with AI, hybrid and live-human options, and Boltcall is an AI-only speed-to-lead platform.',
    stat: 'Smith.ai is cheaper at low call volume and offers staffed humans and native Clio and MyCase. Boltcall offers an immediate AI callback to new web-form leads and one flat plan with no per-call or per-add-on line items.',
    outcome:
      'Choose Smith.ai if you want people on the phone or live practice-management sync. Look at Boltcall if slow follow-up on web forms and missed calls is where you lose cases and AI-only is acceptable to you. Smith.ai figures are footnoted below.',
  },
  glance: [
    {
      label: 'Who answers',
      boltcall: 'AI only. Can transfer to your own staff. No staffed human receptionists.',
      competitor: c('AI, live human agents, or hybrid. 500+ North American agents, available 24/7.', 'home', 'hybrid'),
    },
    {
      label: 'Entry price',
      boltcall: '$549 per month (Starter)',
      competitor: c(
        'AI Free plan $0 for 25 calls. AI Pro from $150 per month for 75 calls. Live-receptionist plans from $300 per month for 30 calls.',
        'aiPricing',
        'hvPricing',
      ),
    },
    {
      label: 'What you are billed for',
      boltcall: 'A monthly credit pool shared across calls, texts and chat (1 AI voice minute = 10 credits)',
      competitor: c('Per call, not per minute. Plan call allowance plus a per-call rate above it.', 'aiPricing'),
    },
    {
      label: 'New web-form lead',
      boltcall:
        'Immediate AI callback, 8am to 9pm in the lead\'s local time, and only if the lead gave a phone number',
      competitor: c(
        'Outreach Campaigns for warm lead follow-up, from $600 per month, with a multi-month commitment',
        'outreach',
      ),
    },
    {
      label: 'Missed calls',
      boltcall: 'Missed-call text-back',
      competitor: c(
        'Calls answered 24/7 with no voicemail. Text and email follow-up after a call is $0.50 per call on live-receptionist plans.',
        'home',
        'hvPricing',
      ),
    },
    {
      label: 'Native Clio / MyCase',
      boltcall: 'No. Connect through Zapier, Make or webhooks.',
      competitor: c('Yes, both are listed as native integrations', 'clio', 'mycase'),
    },
    {
      label: 'Conflict checks',
      boltcall: 'Collects the names a check needs. Does not run the check against your matters.',
      competitor: c('Live agents check callers against your contacts and matters', 'home'),
    },
    {
      label: 'Website chat',
      boltcall: 'Website chat widget on Pro and up',
      competitor: c('Chat staffed by live agents, 24/7, from $140 per month', 'chat'),
    },
    {
      label: 'Setup',
      boltcall: 'About 5 minutes, self-serve. Free setup.',
      competitor: c(
        'Says AI setup takes about 15 minutes and most law firms are running in a few days',
        'aiProduct',
        'home',
      ),
    },
    {
      label: 'Contract and refunds',
      boltcall: 'Cancel any time (auto-renews, cancellation at period end). 30-day money-back guarantee, see Terms section 7.',
      competitor: c(
        'Month-to-month. Live-receptionist plans: 30-day money-back guarantee, capped at $1,000, overage excluded (the same FAQ also mentions a two-week window). No guarantee published for AI plans, which have a free tier instead.',
        'hvPricing',
        'aiPricing',
      ),
    },
  ],
  pricing: {
    intro:
      'The two companies bill in different units, so a sticker price comparison is misleading. Smith.ai bills per call. Boltcall bills a flat monthly price for a credit pool. All Smith.ai prices below are as published on the dates in the Sources list.',
    competitorTables: [
      {
        title: 'Smith.ai AI Receptionist (billed per call)',
        note: c(
          'All figures in this table are from the Smith.ai AI Receptionist pricing page. Extra calls above the allowance are billed at the per-call rate shown. Month-to-month, 30 days\' notice to cancel. The Free plan requires a card at signup.',
          'aiPricing',
          'aiProduct',
        ),
        columns: ['Plan', 'Price per month', 'Calls included', 'Per included call', 'Per extra call'],
        rows: [
          ['Free', '$0', '25', 'n/a', '$3.00'],
          ['Pro', '$150', '75', '$2.00', '$2.50'],
          ['Pro', '$270', '150', '$1.80', '$2.30'],
          ['Pro (Enterprise starts here)', '$500', '300', '$1.67', '$2.17'],
          ['Enterprise', '$800', '500', '$1.60', '$2.10'],
          ['Enterprise', 'Custom', '1,000+', 'Custom', 'Custom'],
        ],
      },
      {
        title: 'Smith.ai Virtual Receptionists (live people, billed per call)',
        note: c(
          'All figures in this table are from the Smith.ai Virtual Receptionist pricing page, except the per-included-call column, which is our arithmetic from the published price and allowance. Calls over the allowance are billed at the overage rate. Smith.ai lists a 10% discount for a 12-month commitment.',
          'hvPricing',
        ),
        columns: ['Plan', 'Price per month', 'Calls included', 'Per included call (our math)', 'Per extra call'],
        rows: [
          ['Starter', '$300', '30', '$10.00', '$11.50'],
          ['Basic', '$810', '90', '$9.00', '$10.50'],
          ['Pro', '$2,100', '300', '$7.00', '$8.50'],
          ['Enterprise', 'Custom', 'Custom', 'Custom', 'Custom'],
        ],
      },
      {
        title: 'Smith.ai add-ons on live-receptionist plans (per call)',
        note: c(
          'Smith.ai lists these as add-ons on the Virtual Receptionist pricing page. A basic 5-question intake is listed as free. Hybrid is listed from $2.50 per call on the home page, with no plan prices on the hybrid product page.',
          'hvPricing',
          'home',
          'hybrid',
        ),
        columns: ['Add-on', 'Price'],
        rows: [
          ['Conflict checks', '$0.50 per call'],
          ['Book appointments', '$1.50 per call'],
          ['Call recording and transcription', '$0.25 per call'],
          ['Dedicated Spanish line', '$1.00 per call'],
          ['Text and email follow-up', '$0.50 per call'],
          ['Accept payments', '$1.00 per call'],
          ['Each additional CRM', '$0.50 per call'],
          ['Extended intake (6 more questions)', '$1.50 per call'],
        ],
      },
    ],
    boltcallTable: boltcallPlansTable,
    illustration: {
      title: 'Illustration: what each plan\'s allowance covers',
      assumptions: [
        'Illustration only, not a quote. Your numbers will differ.',
        'Assumes an average AI call of 3 minutes and that the entire Boltcall credit pool is spent on voice. In practice texts and chat also use credits.',
        'Smith.ai figures are the AI Receptionist plans above, with no add-ons.',
      ],
      table: {
        title: 'Allowance under that assumption',
        columns: ['Option', 'Monthly price', 'Calls covered by the allowance'],
        rows: [
          ['Boltcall Starter', '$549', 'About 33'],
          ['Boltcall Pro', '$897', 'About 100'],
          ['Boltcall Ultimate', '$4,997', 'About 333'],
          [c('Smith.ai AI Pro', 'aiPricing'), '$150', '75'],
          [c('Smith.ai AI Pro', 'aiPricing'), '$270', '150'],
          [c('Smith.ai AI Pro', 'aiPricing'), '$500', '300'],
        ],
      },
      takeaway:
        'If all you need is calls answered, Smith.ai\'s published AI prices are lower at every tier shown. Boltcall is not priced to win a pure per-call comparison. Its plan covers the web-form callback, missed-call text-back, booking, Spanish and recording in one price, so decide whether you need those pieces.',
    },
  },
  competitorWins: [
    c('Live human receptionists: 500+ North American agents, available 24/7, with a hybrid mode where AI handles some calls and people handle the rest.', 'home', 'hybrid'),
    c('Lower entry price at low volume: an AI Free plan with 25 calls, and AI Pro from $150 per month for 75 calls.', 'aiPricing'),
    c('Native integrations with Clio, MyCase, Lawmatics, PracticePanther, Filevine and Smokeball, plus Zapier for 7,000+ more apps.', 'clio', 'mycase', 'lawmatics', 'practicepanther', 'filevine', 'smokeball', 'legal'),
    c('Conflict checks by live agents against your existing contacts and matters.', 'home'),
    c('Accepting payments (LawPay and others) and accepting collect calls, both as paid add-ons. Smith.ai notes attorneys who work with inmates often need collect calls.', 'hvPricing'),
    c('Staffed 24/7 website chat and an outbound Outreach Campaigns product.', 'chat', 'outreach'),
    c('A money-back guarantee on live-receptionist plans (30 days, capped at $1,000; the same FAQ also mentions two weeks). Boltcall also offers a 30-day guarantee under its Terms, with its own conditions.', 'hvPricing'),
    c('A longer track record: founded in 2015, and says it is trusted by 5,000+ businesses.', 'home', 'hvPricing'),
  ],
  boltcallWins: [
    'Speed-to-lead is the product. A new web-form lead with a phone number gets an immediate AI callback during 8am to 9pm in their local time, and missed calls get a text-back. Both are in the Starter plan.',
    c('One flat plan. Booking, Spanish, recording and collecting conflict-check names are part of the intake, not per-call add-ons. On its live-receptionist plans Smith.ai lists booking ($1.50), a dedicated Spanish line ($1.00), recording ($0.25) and conflict checks ($0.50) as per-call add-ons. Collecting names is not the same as running a conflict check.', 'hvPricing'),
    c('SMS conversations and a website chat widget are in the same plan from Pro up. Smith.ai sells staffed chat as a separate product, priced per chat, from $140 per month.', 'chat'),
  ],
  boltcallLimits: [
    'No staffed humans. Boltcall is AI only. It can transfer a call to your own number if you configure that.',
    'No native Clio, MyCase, Filevine or Lawmatics integration yet. You connect through Zapier, Make or webhooks, and it books into Google Calendar or Cal.com.',
    c('It starts at $549 per month, which is more than Smith.ai\'s entry plans at low volume.', 'aiPricing', 'hvPricing'),
    'The credit pool caps usage: about 100 AI voice minutes per month on Starter if spent only on voice.',
    'Each agent runs in English or Spanish, not both on the same call.',
    'Boltcall is newer and has no public review profile on sites like G2 or Capterra to point to.',
  ],
  whoShouldChoose: {
    competitor: [
      'You want a person on the phone, or a hybrid of AI and people.',
      'You get a low number of calls a month and need answering more than lead follow-up.',
      'You need native Clio, MyCase, Lawmatics, PracticePanther, Filevine or Smokeball sync.',
      'You want conflict checks done on the call, or payment collection.',
    ],
    boltcall: [
      'Your biggest leak is how fast you reach new web-form leads and missed calls.',
      'You want one flat monthly price with no per-call or per-add-on line items.',
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
        'Practice-specific legal intake, with scripts per practice area. Live-receptionist plans list a 5-question intake as free and extended intake as an add-on.',
        'legal',
        'home',
        'hvPricing',
      ),
    },
    {
      topic: 'Conflict checks',
      boltcall: 'Asks for the names a conflict check needs, first. It does not check them against your client list.',
      competitor: c('Live agents check callers against your contacts and matters during qualification. $0.50 per call on live-receptionist plans.', 'home', 'hvPricing'),
    },
    {
      topic: 'Practice management',
      boltcall: 'No native Clio, MyCase, Filevine or Lawmatics. Zapier, Make and webhooks. Books into Google Calendar or Cal.com.',
      competitor: c('Native Clio, MyCase, Lawmatics, PracticePanther, Filevine, Smokeball. Zapier for 7,000+ more.',
        'clio',
        'mycase',
        'lawmatics',
        'practicepanther',
        'filevine',
        'smokeball',
        'legal',
      ),
    },
    {
      topic: 'AI and recording disclosure',
      boltcall: 'Every call opens with an AI disclosure and "this call may be recorded". The caller is told the call does not make them a client. Boltcall never promises confidentiality on the call.',
      competitor: c('States its AI never claims to be human when asked directly, and that callers know they are speaking with an AI. Notes that under ABA Rule 5.3 a supervising attorney is expected to confirm an outsourced intake service acts consistently with the firm\'s obligations.', 'home', 'hybrid'),
    },
    {
      topic: 'Fee structure (Rule 5.4)',
      boltcall: 'Flat plan. No per-case fees and no share of fees.',
      competitor: c('Plan price plus per-call rates and add-ons, as shown in the pricing tables above.', 'aiPricing', 'hvPricing'),
    },
    {
      topic: 'Spanish',
      boltcall: 'Each agent runs in English or Spanish. It does not switch languages within one call.',
      competitor: c('AI and live agents state conversational fluency in English and Spanish. A dedicated Spanish line is $1.00 per call on live-receptionist plans.', 'aiProduct', 'hvPricing'),
    },
    {
      topic: 'After hours',
      boltcall: 'Calls answered 24/7. The web-form callback only runs 8am to 9pm in the lead\'s local time.',
      competitor: c('24/7/365, with no after-hours surcharge and no voicemail.', 'home'),
    },
    {
      topic: 'Recordings',
      boltcall: 'Recording and transcript for every call.',
      competitor: c('Included on AI plans. $0.25 per call on live-receptionist plans. Recordings are deleted after three months.', 'aiPricing', 'hvPricing', 'home'),
    },
    {
      topic: 'Security statements',
      boltcall: 'Encrypted in transit (TLS 1.2+), sensitive data encrypted at rest (AES-256), role-based access with MFA, a DPA with sub-processor list, no training on calls without consent, data deleted 30 days after termination. Boltcall does not claim SOC 2 or health-information compliance. Details on the law firm security page.',
      competitor: c('States call data is encrypted and stored in its dashboard, and that it is not HIPAA-compliant so it cannot handle calls involving protected health information. We found no SOC 2 claim on the pages we reviewed.', 'home', 'aiProduct', 'legal'),
    },
  ],
  faq: [
    {
      q: 'Is Smith.ai cheaper than Boltcall for a law firm?',
      a: c('At low call volume, yes. Smith.ai lists an AI Free plan with 25 calls and AI Pro from $150 per month for 75 calls. Boltcall starts at $549 per month. Smith.ai\'s live-receptionist plans start at $300 per month for 30 calls. The units differ, so see the pricing section before comparing.', 'aiPricing', 'hvPricing'),
    },
    {
      q: 'Does Boltcall have live human receptionists?',
      a: 'No. Boltcall is AI only. It can transfer a call to your own staff if you set up a number. If you want staffed people answering, Smith.ai is built for that.',
    },
    {
      q: 'Does Boltcall integrate with Clio or MyCase?',
      a: c('Not natively yet. Boltcall connects through Zapier, Make and webhooks and books into Google Calendar or Cal.com. Smith.ai lists Clio and MyCase as native integrations.', 'clio', 'mycase'),
    },
    {
      q: 'Do both tell callers they are talking to an AI?',
      a: c('Boltcall opens every call with an AI disclosure and a recording notice, and this cannot be switched off in the US. Smith.ai states its AI never claims to be human when asked directly and that callers know they are speaking with an AI.', 'home', 'hybrid'),
    },
    {
      q: 'Is either one HIPAA compliant?',
      a: c('Smith.ai states it is not HIPAA-compliant and cannot handle calls involving protected health information. Boltcall does not claim health-information compliance either. If your practice handles medical records, such as personal injury, ask each vendor what it will sign.', 'legal'),
    },
    {
      q: 'Can either one run conflict checks?',
      a: c('Smith.ai\'s live agents can check callers against your contacts and matters, at $0.50 per call on live-receptionist plans. Boltcall collects the names a conflict check needs and passes them to your team. It does not run the check.', 'home', 'hvPricing'),
    },
    {
      q: 'Who makes this page?',
      a: 'Boltcall. We are one of the two products compared, so check every figure against the linked sources.',
    },
  ],
  methodology: [
    'Smith.ai facts come from its public website pages, read on October 2, 2026. Each one links to the page in Sources. We did not test either product\'s call quality and make no claims about it.',
    'Boltcall facts come from our own product and plan configuration and Terms. We list our limits in the same detail as theirs.',
    'Prices and features verified October 2, 2026. Pricing changes often; check the vendor\'s page before buying. If a figure here is out of date, tell us and we will fix it.',
  ],
  related: [
    { label: 'Boltcall pricing', href: '/pricing' },
    { label: 'Law firm security', href: '/law-firm-security' },
    { label: 'Boltcall vs GoodCall', href: '/compare/boltcall-vs-goodcall' },
    { label: 'All comparisons', href: '/comparisons' },
  ],
  sources: {
    aiPricing: { title: 'Smith.ai AI Receptionist pricing', url: 'https://smith.ai/pricing/ai-receptionist' },
    hvPricing: { title: 'Smith.ai Virtual Receptionist pricing', url: 'https://smith.ai/pricing/receptionists' },
    aiProduct: { title: 'Smith.ai AI Receptionist', url: 'https://smith.ai/ai-receptionist' },
    home: { title: 'Smith.ai home page', url: 'https://smith.ai/' },
    hybrid: { title: 'Smith.ai hybrid AI and human receptionists', url: 'https://smith.ai/hybrid-ai-human-receptionists' },
    legal: { title: 'Smith.ai legal and law firm answering service', url: 'https://smith.ai/industries/legal-law-firms-answering-service' },
    outreach: { title: 'Smith.ai Outreach Campaigns', url: 'https://smith.ai/outreach-campaigns' },
    chat: { title: 'Smith.ai 24/7 website chat', url: 'https://smith.ai/features/24-7-website-chat' },
    clio: { title: 'Smith.ai Clio integration', url: 'https://smith.ai/integrates-with/clio-brand' },
    mycase: { title: 'Smith.ai 8am MyCase integration', url: 'https://smith.ai/integrates-with/mycase' },
    lawmatics: { title: 'Smith.ai Lawmatics integration', url: 'https://smith.ai/integrates-with/lawmatics' },
    practicepanther: { title: 'Smith.ai PracticePanther integration', url: 'https://smith.ai/integrates-with/practicepanther' },
    filevine: { title: 'Smith.ai Filevine integration', url: 'https://smith.ai/integrates-with/filevine' },
    smokeball: { title: 'Smith.ai Smokeball integration', url: 'https://smith.ai/integrates-with/smokeball' },
  },
};

export default smithAi;
