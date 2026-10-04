import type { LegalComparisonData } from './types';
import { boltcallPlansTable } from './boltcall';

const c = (text: string, ...src: string[]) => ({ text, src });

const ruby: LegalComparisonData = {
  competitor: 'Ruby',
  path: '/compare/boltcall-vs-ruby',
  slug: 'ruby',
  title: 'Boltcall vs Ruby for Law Firms: Pricing, Intake & Fit (2026)',
  description:
    'Boltcall vs Ruby Receptionists for law firms. Per-minute vs flat pricing, live humans vs AI, web-form follow-up, Clio, HIPAA and refunds. A fair look at Ruby alternatives, sources linked.',
  h1: 'Boltcall vs Ruby for law firms: pricing, intake and fit',
  publishDate: '2026-10-02',
  modifiedDate: '2026-10-02',
  verifiedLabel: 'October 2, 2026',
  intro: [
    'Ruby is a live answering service: trained human receptionists answer your calls and website chats, billed by the receptionist minute. Boltcall is an AI-only speed-to-lead platform that answers calls, texts back missed calls and calls new web-form leads back right away. If you are weighing Ruby receptionist alternatives, the real question is whether you need a person on every call or a faster reply to every new lead.',
    'This page uses only what each company publishes. Ruby facts link to a numbered source at the bottom. If a figure is not public, we say so instead of guessing.',
  ],
  answer: {
    query: 'Boltcall vs Ruby for a law firm, which one fits',
    definition:
      'Ruby is a live human answering service billed per receptionist minute, and Boltcall is an AI-only speed-to-lead platform on a flat monthly plan.',
    stat: 'Ruby costs less at low volume, puts a person on every call, and signs a HIPAA BAA at no extra charge. Boltcall calls new web-form leads back right away and texts back missed calls, on one flat plan.',
    outcome:
      'Choose Ruby if you want a person, not an AI, answering for your firm. Look at Boltcall if slow follow-up on web forms and missed calls is where you lose cases and AI-only is acceptable to you. Ruby figures are footnoted below.',
  },
  glance: [
    {
      label: 'Who answers',
      boltcall: 'AI only. Can transfer to your own staff. No staffed human receptionists.',
      competitor: c('Live human receptionists only. Ruby says AI tools support its receptionists, but a person leads every conversation.', 'home', 'ai'),
    },
    {
      label: 'Entry price',
      boltcall: '$549 per month (Starter)',
      competitor: c('$250 per month for 50 receptionist minutes', 'pricing'),
    },
    {
      label: 'What you are billed for',
      boltcall: 'A monthly credit pool shared across calls, texts and chat (1 AI voice minute = 10 credits)',
      competitor: c(
        'Receptionist minutes. Each call is rounded up to the next full minute, and outbound calls and follow-up emails also use minutes. The overage rate is not published.',
        'pricing',
        'faqs',
      ),
    },
    {
      label: 'New web-form lead',
      boltcall:
        'Immediate AI callback, 8am to 9pm in the lead\'s local time, and only if the lead gave a phone number',
      competitor: c(
        'Outbound calls when you send Ruby a request. Its FAQ lists outgoing call assists Monday to Friday, 5am to 6pm Pacific.',
        'vr',
        'faqs',
      ),
    },
    {
      label: 'Missed calls',
      boltcall: 'Missed-call text-back',
      competitor: c('Live answering 24/7, including after hours, weekends and holidays', 'pricing'),
    },
    {
      label: 'Native Clio / MyCase',
      boltcall: 'No. Connect through Zapier, Make or webhooks.',
      competitor: c(
        'Clio is named as a native integration. 8am MyCase, Filevine, Lawmatics, Law Ruler and Rocket Matter are listed, without saying which are native or through Zapier.',
        'integrations',
      ),
    },
    {
      label: 'Conflict checks',
      boltcall: 'Collects the names a check needs. Does not run the check against your matters.',
      competitor: 'Not published on its legal, FAQ, pricing or integrations pages.',
    },
    {
      label: 'Website chat',
      boltcall: 'Website chat widget on Pro and up',
      competitor: c(
        'Chat staffed by people, 24/7/365. Sold separately from $143 per month for 10 chats, or $115 when added to a receptionist plan.',
        'pricing',
      ),
    },
    {
      label: 'HIPAA',
      boltcall: 'Boltcall does not claim HIPAA compliance.',
      competitor: c('Ruby states it offers HIPAA compliant service when you sign a Business Associate Agreement, at no extra charge.', 'faqs'),
    },
    {
      label: 'Setup',
      boltcall: 'About 5 minutes, self-serve. Free setup.',
      competitor: c('No fees for activation, onboarding, setup or customization. Setup time is not published.', 'pricing'),
    },
    {
      label: 'Contract and refunds',
      boltcall: 'Cancel any time (auto-renews, cancellation at period end). 30-day money-back guarantee, see Terms section 7.',
      competitor: c(
        'No long-term contract. Renews every 30 days, cancellation at the end of the billing period. Money back if you ask within 21 days or before 500 receptionist minutes, whichever comes first. Its Terms say guarantees may vary and may not be available to all customers.',
        'faqs',
        'terms',
      ),
    },
  ],
  pricing: {
    intro:
      'The two companies bill in different units, so a sticker price comparison is misleading. Ruby bills by the receptionist minute. Boltcall bills a flat monthly price for a credit pool. All Ruby prices below are as published on the dates in the Sources list.',
    competitorTables: [
      {
        title: 'Ruby virtual receptionists (live people, billed per minute)',
        note: c(
          'Plan prices and minutes are from the Ruby pricing page. The per-included-minute column is our arithmetic. Ruby says every plan has the same features and only the minutes differ. Calls are billed in 60-second increments and rounded up to the next minute. Extra minutes are billed at "the overage rate associated with your plan", which Ruby does not publish.',
          'pricing',
          'faqs',
        ),
        columns: ['Plan', 'Price per month', 'Per included minute (our math)', 'Per extra minute'],
        rows: [
          ['50 minutes', '$250', '$5.00', 'Not published'],
          ['100 minutes', '$395', '$3.95', 'Not published'],
          ['200 minutes (marked most popular)', '$720', '$3.60', 'Not published'],
          ['500 minutes', '$1,725', '$3.45', 'Not published'],
          ['Larger plans', 'On request', 'On request', 'Not published'],
        ],
      },
      {
        title: 'Ruby live chat (staffed by people, billed per chat)',
        note: c('From the Ruby pricing page. Chat is sold on its own, or added to a receptionist plan at 20% off.', 'pricing'),
        columns: ['Chats per month', 'Chat on its own', 'Added to a receptionist plan'],
        rows: [
          ['10', '$143', '$115'],
          ['30', '$335', '$268'],
          ['50', '$520', '$416'],
        ],
      },
      {
        title: 'Ruby billing terms to check before you sign',
        note: c('From Ruby\'s Terms of Service and FAQ. These apply on top of the plan price.', 'terms', 'faqs'),
        columns: ['Term', 'What Ruby states'],
        rows: [
          ['Paying by card', c('3.0% surcharge on credit card payments', 'terms')],
          ['Late payment', c('A $10 late fee and interest of 1.5% of the outstanding balance per month may apply', 'terms')],
          ['Price changes', c('Ruby may adjust pricing for its services at any time', 'terms')],
          ['Outbound work', c('Time on outbound calls and time spent sending the follow-up email count as receptionist minutes', 'faqs')],
        ],
      },
    ],
    boltcallTable: boltcallPlansTable,
    illustration: {
      title: 'Illustration: what each plan\'s allowance covers',
      assumptions: [
        'Illustration only, not a quote. Your numbers will differ.',
        'Assumes an average call of 3 minutes, and that the entire Boltcall credit pool is spent on voice. In practice texts and chat also use credits.',
        'Ruby rounds every call up to the next full minute, so short calls use more minutes than their talk time. Outbound calls and follow-up emails would also use Ruby minutes. Neither is counted here.',
      ],
      table: {
        title: 'Allowance under that assumption',
        columns: ['Option', 'Monthly price', 'Calls covered by the allowance'],
        rows: [
          ['Boltcall Starter', '$549', 'About 33'],
          ['Boltcall Pro', '$897', 'About 100'],
          ['Boltcall Ultimate', '$4,997', 'About 333'],
          [c('Ruby 50 minutes', 'pricing'), '$250', 'About 16'],
          [c('Ruby 100 minutes', 'pricing'), '$395', 'About 33'],
          [c('Ruby 200 minutes', 'pricing'), '$720', 'About 66'],
          [c('Ruby 500 minutes', 'pricing'), '$1,725', 'About 166'],
        ],
      },
      takeaway:
        'At low volume Ruby costs less: about the same number of calls costs $395 on Ruby\'s 100-minute plan and $549 on Boltcall Starter. Ruby\'s price buys a live person on every call. Boltcall\'s buys AI answering plus the web-form callback and missed-call text-back. Ruby does not publish its overage rate, so we cannot price a month that runs past a Ruby plan.',
    },
  },
  competitorWins: [
    c('A live person answers every call. Ruby says a trained receptionist, not a bot, answers on your behalf, with AI tools only in the background.', 'home', 'ai'),
    c('Lower entry price at low volume: $250 per month for 50 minutes and $395 for 100 minutes.', 'pricing'),
    c('Callers hear your firm, not a vendor. Ruby\'s legal page says callers will not know they are speaking with a third-party service.', 'legal'),
    c('A long track record: in business since 2003, says 15,000+ businesses trust it and it handles 1.1M+ conversations a month. Its receptionists get 120 hours of training.', 'about', 'home'),
    c('Ruby states an average answer time under 10 seconds.', 'home'),
    c('HIPAA compliant service with a signed BAA at no extra charge, and optional PCI-compliant service for collecting sensitive details or payments during intake. Useful for firms that handle medical records, such as personal injury.', 'faqs'),
    c('Website chat staffed by people, 24/7/365, sold on its own or bundled with a receptionist plan.', 'pricing'),
    c('A native Clio integration, plus Zapier-powered connections to the rest of your stack.', 'integrations'),
  ],
  boltcallWins: [
    c('Speed-to-lead is the product. A new web-form lead with a phone number gets an immediate AI callback during 8am to 9pm in their local time, and missed calls get a text-back. Both are in the Starter plan. Ruby places outbound calls when you request them, and its FAQ lists those on weekdays.', 'vr', 'faqs'),
    c('Billing is a flat monthly plan, not minutes. Ruby rounds each call up to the next minute, counts outbound calls and follow-up emails as minutes, and does not publish its overage rate.', 'faqs'),
    c('SMS conversations and a website chat widget are in the same plan from Pro up. Ruby sells staffed chat separately, from $143 per month for 10 chats.', 'pricing'),
  ],
  boltcallLimits: [
    'No staffed humans. Boltcall is AI only. It can transfer a call to your own number if you configure that. If your firm wants a person on every call, Ruby is built for that.',
    'Every call opens with an AI disclosure and a recording notice, which cannot be switched off in the US. It will not pass as your in-house receptionist.',
    c('No native Clio, MyCase, Filevine or Lawmatics integration yet. You connect through Zapier, Make or webhooks, and it books into Google Calendar or Cal.com. Ruby names Clio as native.', 'integrations'),
    c('It starts at $549 per month, which is more than Ruby\'s 50- and 100-minute plans.', 'pricing'),
    'The credit pool caps usage: about 100 AI voice minutes per month on Starter if spent only on voice.',
    c('Boltcall does not claim HIPAA compliance. Ruby states it will sign a BAA.', 'faqs'),
    'Each agent runs in English or Spanish, not both on the same call.',
    'Boltcall is newer and has no public review profile on sites like G2 or Capterra to point to.',
  ],
  whoShouldChoose: {
    competitor: [
      'You want a person, not an AI, answering for your firm.',
      'You use under about 100 receptionist minutes a month and need answering more than lead follow-up.',
      'You handle medical records and need a vendor that signs a HIPAA BAA.',
      'You want callers to feel they reached your own front desk, or you want staffed website chat.',
    ],
    boltcall: [
      'Your biggest leak is how fast you reach new web-form leads and missed calls.',
      'You want a flat monthly plan instead of per-minute billing with rounding and an unpublished overage rate.',
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
        'Trained support for legal intake, scheduling and client questions. Books consultations, collects caller details and prioritizes callbacks. Ruby publishes no separate legal plan; the standard plans apply.',
        'legal',
        'pricing',
      ),
    },
    {
      topic: 'Conflict checks',
      boltcall: 'Asks for the names a conflict check needs, first. It does not check them against your client list.',
      competitor: 'Not published on its legal, FAQ, pricing or integrations pages. Ask Ruby directly.',
    },
    {
      topic: 'Practice management',
      boltcall: 'No native Clio, MyCase, Filevine or Lawmatics. Zapier, Make and webhooks. Books into Google Calendar or Cal.com.',
      competitor: c(
        'Native Clio. Lists 8am MyCase, Filevine, Law Ruler, Lawmatics and Rocket Matter, and Zapier-powered integrations for the rest.',
        'integrations',
      ),
    },
    {
      topic: 'Who callers think they reached',
      boltcall: 'Every call opens with an AI disclosure and "this call may be recorded". The caller is told the call does not make them a client. Boltcall never promises confidentiality on the call.',
      competitor: c('A live receptionist answers. Ruby\'s legal page says callers will not know they are speaking with a third-party service.', 'legal'),
    },
    {
      topic: 'Billing terms',
      boltcall: 'Flat plan. No per-call fee, no per-case fees and no share of fees.',
      competitor: c(
        'Per receptionist minute, rounded up per call, with an unpublished overage rate. Its Terms add a 3.0% surcharge for card payments. See the billing terms table above.',
        'faqs',
        'terms',
      ),
    },
    {
      topic: 'Spanish',
      boltcall: 'Each agent runs in English or Spanish. It does not switch languages within one call.',
      competitor: c(
        'Spanish and bilingual handling included at no extra cost, described as 24/7. The same FAQ also says bilingual service runs Monday to Friday, 5am to 6pm Pacific.',
        'pricing',
        'faqs',
      ),
    },
    {
      topic: 'After hours',
      boltcall: 'Calls answered 24/7. The web-form callback only runs 8am to 9pm in the lead\'s local time.',
      competitor: c('Live answering 24/7, including after hours, weekends and holidays. Outbound calls on request, on weekdays per its FAQ.', 'pricing', 'faqs'),
    },
    {
      topic: 'Recordings',
      boltcall: 'Recording and transcript for every call.',
      competitor: c(
        'States verbatim AI-generated transcripts of every call it handles, and access to message recordings. Full call recording is not listed on the pages we reviewed.',
        'ai',
        'vr',
      ),
    },
    {
      topic: 'Payments',
      boltcall: 'Does not collect financial details on the call.',
      competitor: c('Can assist with secure payment collection when instructed, with an optional PCI-compliant service.', 'legal', 'faqs'),
    },
    {
      topic: 'Security statements',
      boltcall: 'Encrypted in transit (TLS 1.2+), sensitive data encrypted at rest (AES-256), role-based access with MFA, a DPA with sub-processor list, no training on calls without consent, data deleted 30 days after termination. Boltcall does not claim SOC 2 or HIPAA compliance. Details on the law firm security page.',
      competitor: c(
        'HIPAA compliant service with a signed BAA at no extra charge. Says its receptionists are trained to handle confidential legal inquiries. We found no SOC 2 claim on the pages we reviewed.',
        'faqs',
        'legal',
      ),
    },
  ],
  faq: [
    {
      q: 'Is Ruby cheaper than Boltcall for a law firm?',
      a: c('At low volume, yes. Ruby lists $250 per month for 50 receptionist minutes and $395 for 100. Boltcall starts at $549 per month. Ruby bills per minute, rounds each call up to the next minute and does not publish its overage rate, so see the pricing section before comparing.', 'pricing', 'faqs'),
    },
    {
      q: 'Does Ruby use AI to answer calls?',
      a: c('No. Ruby says live receptionists answer every call, with AI tools supporting them in the background. Boltcall is the opposite: AI answers, and it can transfer to your own staff if you set up a number.', 'home', 'ai'),
    },
    {
      q: 'What is a good Ruby receptionist alternative for a law firm?',
      a: 'It depends on what you want to change. If you want to keep live people on the phone, compare other staffed answering services; our law firm answering service roundup covers several. If your problem is slow follow-up on new web-form leads and missed calls, and AI-only is acceptable to you, Boltcall is built for that.',
    },
    {
      q: 'Does Ruby offer a money-back guarantee?',
      a: c('Ruby\'s FAQ describes a refund if you ask within 21 days or before you use 500 receptionist minutes (or 50 chats), whichever comes first. Its Terms say guarantees may vary and may not be available to all customers, with the duration stated at signup. Boltcall offers a 30-day money-back guarantee with conditions in its Terms, section 7.', 'faqs', 'terms'),
    },
    {
      q: 'Is either one HIPAA compliant?',
      a: c('Ruby states it offers HIPAA compliant service when you sign a Business Associate Agreement, at no extra charge. Boltcall does not claim HIPAA compliance. If your practice handles medical records, such as personal injury, that may decide it for you.', 'faqs'),
    },
    {
      q: 'Does Boltcall integrate with Clio?',
      a: c('Not natively yet. Boltcall connects through Zapier, Make and webhooks and books into Google Calendar or Cal.com. Ruby names Clio as a native integration.', 'integrations'),
    },
    {
      q: 'Will callers know they reached an answering service?',
      a: c('With Ruby, its legal page says no. With Boltcall, yes: every call opens with an AI disclosure and a recording notice, and this cannot be switched off in the US.', 'legal'),
    },
    {
      q: 'Who makes this page?',
      a: 'Boltcall. We are one of the two products compared, so check every figure against the linked sources.',
    },
  ],
  methodology: [
    'Ruby facts come from its public website pages and Terms of Service, read on October 2, 2026. Each one links to the page in Sources. We did not test either product\'s call quality and make no claims about it.',
    'Boltcall facts come from our own product and plan configuration and Terms. We list our limits in the same detail as theirs.',
    'Prices and features verified October 2, 2026. Pricing changes often; check the vendor\'s page before buying. If a figure here is out of date, tell us and we will fix it.',
  ],
  related: [
    { label: 'Best law firm answering services', href: '/compare/best-law-firm-answering-services' },
    { label: 'Boltcall vs Smith.ai', href: '/compare/boltcall-vs-smith-ai' },
    { label: 'Boltcall vs Answering Legal', href: '/compare/boltcall-vs-answering-legal' },
    { label: 'Boltcall vs LEX Reception', href: '/compare/boltcall-vs-lex-reception' },
    { label: 'Boltcall vs Abby Connect', href: '/compare/boltcall-vs-abby-connect' },
    { label: 'Lawyer answering service', href: '/industries/lawyer-answering-service' },
    { label: 'Boltcall pricing', href: '/pricing' },
    { label: 'Law firm security', href: '/law-firm-security' },
    { label: 'All comparisons', href: '/comparisons' },
  ],
  sources: {
    pricing: { title: 'Ruby plans and pricing', url: 'https://www.ruby.com/plans-and-pricing/' },
    faqs: { title: 'Ruby FAQs', url: 'https://www.ruby.com/faqs/' },
    terms: { title: 'Ruby Terms of Service', url: 'https://www.ruby.com/terms/' },
    home: { title: 'Ruby home page', url: 'https://www.ruby.com/' },
    ai: { title: 'Ruby AI', url: 'https://www.ruby.com/ai/' },
    legal: { title: 'Ruby for law firms', url: 'https://www.ruby.com/industries/legal/' },
    vr: { title: 'Ruby live virtual receptionists', url: 'https://www.ruby.com/solutions/live-virtual-receptionists/' },
    about: { title: 'About Ruby', url: 'https://www.ruby.com/about/' },
    integrations: { title: 'Ruby integrations', url: 'https://www.ruby.com/solutions/integrations/' },
  },
};

export default ruby;
