import type { LegalComparisonData } from './types';
import { boltcallPlansTable } from './boltcall';

const c = (text: string, ...src: string[]) => ({ text, src });

const answeringLegal: LegalComparisonData = {
  competitor: 'Answering Legal',
  path: '/compare/boltcall-vs-answering-legal',
  slug: 'answering-legal',
  title: 'Boltcall vs Answering Legal for Law Firms: Pricing, Intake & Fit (2026)',
  description:
    'Boltcall vs Answering Legal for law firms. Per-minute pricing side by side, live receptionists vs AI, legal integrations, the free trial, and what to check in the Terms before you sign. Sources linked.',
  h1: 'Boltcall vs Answering Legal for law firms: pricing, intake and fit',
  publishDate: '2026-10-02',
  modifiedDate: '2026-10-02',
  verifiedLabel: 'October 2, 2026',
  intro: [
    'Answering Legal is a live answering service that works only with law firms. Its U.S.-based receptionists pick up your calls 24/7 and take a legal intake. Boltcall is an AI-only speed-to-lead platform that answers calls and texts and calls new web-form leads back right away. One puts trained people on your phone line. The other automates the first response to every lead.',
    'This page uses only what each company publishes. Answering Legal facts link to a numbered source at the bottom. If a figure is not public, we say so instead of guessing.',
  ],
  answer: {
    query: 'Boltcall vs Answering Legal for a law firm, which one fits',
    definition:
      'Answering Legal is a law-firm-only live answering service with human receptionists, and Boltcall is an AI-only speed-to-lead platform.',
    stat: 'Answering Legal is cheaper at about 100 minutes a month and offers live legal receptionists 24/7 with direct Clio Grow, MyCase and Lawmatics integrations. Boltcall offers an immediate AI callback to new web-form leads, missed-call text-back and chat in one flat plan.',
    outcome:
      'Choose Answering Legal if you want trained people answering and intake flowing into your legal software. Look at Boltcall if slow follow-up on web forms and missed calls is where you lose cases and AI-only is acceptable to you. Answering Legal figures are footnoted below.',
  },
  glance: [
    {
      label: 'Who answers',
      boltcall: 'AI only. Can transfer to your own staff. No staffed human receptionists.',
      competitor: c(
        'Live U.S.-based receptionists trained for law firms, 24/7/365. Its public AI product is a website intake chatbot.',
        'llms',
        'chatbot',
      ),
    },
    {
      label: 'Entry price',
      boltcall: '$549 per month (Starter)',
      competitor: c('Solo plan, $360 per month for 100 minutes', 'plans'),
    },
    {
      label: 'What you are billed for',
      boltcall: 'A monthly credit pool shared across calls, texts and chat (1 AI voice minute = 10 credits)',
      competitor: c(
        'Per minute. Plan minutes plus overage fees. The overage rate is not published.',
        'cost',
        'plans',
        'terms',
      ),
    },
    {
      label: 'New web-form lead',
      boltcall:
        'Immediate AI callback, 8am to 9pm in the lead\'s local time, and only if the lead gave a phone number',
      competitor: c(
        'No staff follow-up service published. You follow up from its app by phone, email or text.',
        'app',
      ),
    },
    {
      label: 'Missed calls',
      boltcall: 'Missed-call text-back',
      competitor: c('Calls answered live on nights, weekends and holidays', 'allDay'),
    },
    {
      label: 'Legal software integrations',
      boltcall: 'No native Clio or MyCase yet. Connect through Zapier, Make or webhooks.',
      competitor: c(
        'Direct integrations with Clio Grow, MyCase, Lawmatics, Lead Docket, Smokeball and PracticePanther, plus Zapier. Free for customers.',
        'integrations',
        'clioGrow',
      ),
    },
    {
      label: 'Website chat',
      boltcall: 'Website chat widget on Pro and up',
      competitor: c('AI intake chatbot, free', 'chatbot'),
    },
    {
      label: 'Spanish',
      boltcall: 'Each agent runs in English or Spanish, not both on one call',
      competitor: c('Receptionists handle calls in English or Spanish. Messages reach you in English.', 'home', 'bilingual'),
    },
    {
      label: 'Setup',
      boltcall: 'About 5 minutes, self-serve. Free setup.',
      competitor: c(
        'Pricing page says no setup fees. Its Terms allow a $399 to $599 charge for extensive setup beyond normal needs.',
        'plans',
        'terms',
      ),
    },
    {
      label: 'Trial and refunds',
      boltcall: 'No credit card to start. Cancel any time (auto-renews, cancellation at period end). See Terms for refund details.',
      competitor: c(
        'Free trial of 400 minutes or 14 days, whichever comes first, no card. Month to month. No money-back guarantee published.',
        'setup',
        'plans',
        'terms',
      ),
    },
  ],
  pricing: {
    intro:
      'Both prices can be read in minutes, but they are not the same minutes. Answering Legal bills for live receptionist time. Boltcall bills a flat monthly price for a credit pool that covers AI calls, texts and chat. All Answering Legal prices below are as published on the dates in the Sources list.',
    competitorTables: [
      {
        title: 'Answering Legal plans (live receptionists, billed per minute)',
        note: c(
          'Prices are from the Answering Legal plans page, which opens after a lead form. The per-included-minute column is our arithmetic from the published price and allowance. Every feature is included on every plan. Overage fees exist in the Terms, but the rate and the billing increment are not published. Answering Legal states your minutes are not used on spam calls.',
          'plans',
          'cost',
          'terms',
          'switch',
        ),
        columns: ['Plan', 'Price per month', 'Minutes included', 'Per included minute (our math)', 'Per extra minute'],
        rows: [
          ['Solo', '$360', '100', '$3.60', 'Not published'],
          ['Essential', '$676', '200', '$3.38', 'Not published'],
          ['Growing', '$936', '300', '$3.12', 'Not published'],
          ['Custom', 'Quote', 'Custom', 'Custom', 'Custom'],
        ],
      },
      {
        title: 'Answering Legal add-ons',
        note: c(
          'The AI intake chatbot is listed as free. Legal Video Calls connect you with live interpreters, sold in prepaid bundles.',
          'chatbot',
          'video',
        ),
        columns: ['Add-on', 'Price'],
        rows: [
          ['AI intake chatbot', 'Free'],
          ['Legal Video Calls, 60 minutes (4 meetings)', '$59.99'],
          ['Legal Video Calls, 120 minutes (8 meetings, +1 free)', '$119.99'],
          ['Legal Video Calls, 210 minutes (14 meetings, +4 free)', '$209.99'],
          ['Legal Video Calls, per 15-minute block', '$14.99'],
        ],
      },
      {
        title: 'What to check before you sign: Answering Legal Terms of Service',
        note: c(
          'These items are in the Terms of Service (last modified April 10, 2026), not on the pricing page. They are not unusual for answering services, but they affect your real cost, so ask about them in writing. Boltcall\'s Terms have conditions too, including auto-renewal (section 8). Read them.',
          'terms',
        ),
        columns: ['Item', 'What the Terms say'],
        rows: [
          [
            'Setup charge',
            c('The pricing page says "No set up fees." The Terms, section 5: Answering Legal "reserves the right to charge between $399 – $599 for extensive setup and/or account configuration above and beyond the normal needs of a customer." Ask whether your setup counts as extensive.', 'plans', 'terms'),
          ],
          [
            'Carrier recovery fund',
            c('Section 4: "Answering Legal will charge Customer\'s credit card for a carrier recovery fund of $21.50." The Terms do not say how often.', 'terms'),
          ],
          [
            'Overage',
            c('You authorize payment of "any overage fees". The rate is not on the public pricing page.', 'terms'),
          ],
          [
            'Your phone number',
            c('Section 4: "Any telephone number assigned to Customer by Answering Legal shall remain the property of Answering Legal." If you plan to advertise that number, ask what happens to it if you leave.', 'terms'),
          ],
          [
            'Free trial limits',
            c('The marketing offer is 400 minutes or 14 days. Section 5 also lets Answering Legal end the trial if "The inquirer has used more than 100 minutes of virtual receptionist time."', 'setup', 'terms'),
          ],
          [
            'Holiday trials',
            c('Section 5: "$175.00 for all trials carried through major holidays", no free trial "between December 15 thru January 4", and the right "to charge a $350 setup fee for firms who enter into a free trial period" from December 5 to January 7.', 'terms'),
          ],
          [
            'Cancelling',
            c('Month to month. Plans "remain active until the next billing cycle, and customers will remain responsible for overages if applicable."', 'terms'),
          ],
          [
            'Late payment',
            c('"a late fee of 1.5% per month"', 'terms'),
          ],
          [
            'Subcontracting',
            c('Section 4: Answering Legal "may, in its sole discretion, outsource and/or subcontract certain functions in providing the services." If where your calls are handled matters to you, ask who performs each function.', 'terms'),
          ],
        ],
      },
    ],
    boltcallTable: boltcallPlansTable,
    illustration: {
      title: 'Illustration: price for the same number of minutes',
      assumptions: [
        'Illustration only, not a quote. Your numbers will differ.',
        'Boltcall minutes assume the entire credit pool is spent on voice. In practice texts and chat also use credits.',
        'Answering Legal minutes are live receptionist minutes. Boltcall minutes are AI minutes. Answering Legal does not publish its overage rate or billing increment.',
      ],
      table: {
        title: 'Monthly price at each plan\'s allowance',
        columns: ['Minutes a month', 'Answering Legal', 'Boltcall'],
        rows: [
          ['About 100', c('$360 (Solo)', 'plans'), '$549 (Starter)'],
          ['About 200', c('$676 (Essential)', 'plans'), '$897 (Pro, covers about 300)'],
          ['About 300', c('$936 (Growing)', 'plans'), '$897 (Pro)'],
        ],
      },
      takeaway:
        'At about 100 or 200 minutes a month, Answering Legal costs less. At about 300 minutes the two are close, and only if every Boltcall credit goes to voice. For that money Answering Legal gives you live people. Boltcall gives you AI plus the web-form callback, missed-call text-back and texting in the same plan. Decide which of those you need.',
    },
  },
  competitorWins: [
    c('Law firms only, since 2013. It states it serves 2,000+ active law firms.', 'alVsRuby', 'home'),
    c('Live U.S.-based receptionists 24/7/365, including nights, weekends and holidays, with warm transfers to you (it notes transfers are pending your availability). It says receptionists train for months before answering for a firm.', 'llms', 'allDay', 'routing', 'home'),
    c('Direct legal integrations: Clio Grow, MyCase, Lawmatics, Lead Docket, Smokeball and PracticePanther, plus Zapier, at no extra cost. Intake lands in your software.', 'integrations', 'clioGrow'),
    c('Practice-area intake questions, for example personal injury, criminal defense and bankruptcy.', 'llms'),
    c('Lower entry price: Solo is $360 per month for 100 minutes. Boltcall starts at $549.', 'plans'),
    c('A free trial of 400 minutes or 14 days with no credit card, subject to the Terms limits listed above.', 'setup', 'plans'),
    c('Spanish-speaking receptionists, plus a live interpreter add-on in over 180 languages.', 'home', 'video'),
    c('A free AI intake chatbot for your website.', 'chatbot'),
    c('Bar member deals, for example a State Bar of Texas member benefit.', 'bilingual'),
    c('A public review record: TrustScore 4.5 from 119 reviews on Trustpilot.', 'trustpilot'),
  ],
  boltcallWins: [
    c('Speed-to-lead is the product. A new web-form lead with a phone number gets an immediate AI callback during 8am to 9pm in their local time. Answering Legal\'s published model is that you follow up from its app.', 'app'),
    c('Missed-call text-back and SMS follow-up are in the plan. Answering Legal lists texting leads after a call through its Zapier integration.', 'zapier'),
    c('A recording and transcript of every call. Answering Legal\'s public pages do not say whether customers get call recordings; its Terms say it "may record and monitor calls".', 'terms'),
    'Self-serve setup in about 5 minutes, with free setup and no credit card to start.',
  ],
  boltcallLimits: [
    'No staffed humans. Boltcall is AI only. It can transfer a call to your own number if you configure that.',
    'No native Clio, MyCase, Lawmatics or other legal practice-management integration yet. You connect through Zapier, Make or webhooks, and it books into Google Calendar or Cal.com.',
    c('It starts at $549 per month, which is more than Answering Legal\'s Solo plan.', 'plans'),
    'The credit pool caps usage: about 100 AI voice minutes per month on Starter if spent only on voice.',
    'Each agent runs in English or Spanish, not both on the same call.',
    'Boltcall is newer and has no public review profile on sites like G2 or Capterra to point to.',
  ],
  whoShouldChoose: {
    competitor: [
      'You want a trained person answering every call, day and night.',
      'You want a provider that works only with law firms.',
      'You need intake to flow into Clio Grow, MyCase, Lawmatics, Lead Docket, Smokeball or PracticePanther.',
      'You use about 100 to 200 minutes a month and want the lowest price for live answering.',
      'You want to test it first with a free trial.',
    ],
    boltcall: [
      'Your biggest leak is how fast you reach new web-form leads and missed calls.',
      'You want calls, texts and chat in one flat monthly price.',
      'AI-only intake with an always-on AI and recording disclosure fits your ethics review.',
      'Google Calendar or Cal.com, with Zapier or webhooks for the rest, is enough integration.',
    ],
  },
  legalSpecifics: [
    {
      topic: 'Intake',
      boltcall:
        'Intake scripts for personal injury, family, criminal defense, immigration and estate planning. Flags urgent matters (custody or arrest, domestic violence, court date within 48 hours, deportation, imminent deadline) and alerts your team by email.',
      competitor: c(
        'A custom legal intake for every new-client caller, with practice-area questions (for example personal injury, criminal defense, bankruptcy).',
        'home',
        'llms',
      ),
    },
    {
      topic: 'Legal advice',
      boltcall: 'Does not give legal advice, assess a case, or quote fees unless your firm provides them. Tells the caller the call does not make them a client.',
      competitor: c('Its Terms state it "will not provide legal, accounting, tax, or financial advice" to callers.', 'terms'),
    },
    {
      topic: 'Conflict checks',
      boltcall: 'Asks for the names a conflict check needs, first. It does not check them against your client list.',
      competitor: 'Not stated on the public pages we reviewed.',
    },
    {
      topic: 'Practice management',
      boltcall: 'No native Clio, MyCase or Lawmatics. Zapier, Make and webhooks. Books into Google Calendar or Cal.com.',
      competitor: c(
        'Direct Clio Grow, MyCase, Lawmatics, Lead Docket, Smokeball, PracticePanther and Zapier. Its Clio integration sends intake to Clio Grow leads. Integrations are free. Can schedule consultations on your calendar.',
        'integrations',
        'clioGrow',
        'home',
      ),
    },
    {
      topic: 'Live transfer',
      boltcall: 'Optional live transfer to your firm\'s own number, if you configure it.',
      competitor: c('Warm transfers with custom call protocols. It says it patches callers to you "pending availability."', 'routing', 'home'),
    },
    {
      topic: 'AI and recording disclosure',
      boltcall: 'Every call opens with an AI disclosure and "this call may be recorded". Boltcall never promises confidentiality on the call.',
      competitor: c('Calls are answered by live receptionists. Its Terms say it "may record and monitor calls" and mention automated attendant and AI voice IVR systems, with no public product page or pricing for those.', 'llms', 'terms'),
    },
    {
      topic: 'Fee structure (Rule 5.4)',
      boltcall: 'Flat plan. No per-case fees and no share of fees.',
      competitor: c('Monthly plan billed by the minute, plus overage, as shown in the pricing table above.', 'plans', 'cost'),
    },
    {
      topic: 'Spanish and other languages',
      boltcall: 'Each agent runs in English or Spanish. It does not switch languages within one call.',
      competitor: c('Calls in English or Spanish, messages written to you in English. Live interpreters in over 180 languages as a paid add-on.', 'home', 'bilingual', 'video'),
    },
    {
      topic: 'After hours',
      boltcall: 'Calls answered 24/7. The web-form callback only runs 8am to 9pm in the lead\'s local time.',
      competitor: c('Live answering 24/7/365, including nights, weekends and holidays.', 'allDay'),
    },
    {
      topic: 'Security statements',
      boltcall: 'Encrypted in transit (TLS 1.2+), sensitive data encrypted at rest (AES-256), role-based access with MFA, a DPA with sub-processor list, no training on calls without consent, data deleted 30 days after termination. Boltcall does not claim SOC 2 or health-information compliance. Details on the law firm security page.',
      competitor: c('Its Terms commit to "appropriate technical and organizational measures" for personal data and keep confidentiality for three years after termination. Its privacy policy says website information is encrypted using SSL. We found no SOC 2 or HIPAA claim on the pages we reviewed.', 'terms', 'privacy'),
    },
  ],
  faq: [
    {
      q: 'Is Answering Legal cheaper than Boltcall?',
      a: c('At low volume, yes. Answering Legal Solo is $360 per month for 100 minutes and Essential is $676 for 200. Boltcall starts at $549. At about 300 minutes, Answering Legal Growing is $936 and Boltcall Pro is $897, but Boltcall\'s 300 minutes assume every credit goes to voice, and Answering Legal\'s are live receptionist minutes. Its overage rate is not published.', 'plans'),
    },
    {
      q: 'Does Boltcall have live human receptionists?',
      a: 'No. Boltcall is AI only. It can transfer a call to your own staff if you set up a number. If you want trained people answering, Answering Legal is built for that.',
    },
    {
      q: 'Does Answering Legal use AI to answer calls?',
      a: c('Its calls are answered live by U.S.-based receptionists. Its public AI product is a free website intake chatbot. Its Terms mention automated attendant and AI voice IVR systems, but we found no public product page or pricing for them.', 'llms', 'chatbot', 'terms'),
    },
    {
      q: 'Which one integrates with Clio or MyCase?',
      a: c('Answering Legal lists direct integrations with Clio Grow, MyCase, Lawmatics, Lead Docket, Smokeball and PracticePanther. Boltcall has no native Clio or MyCase yet; it connects through Zapier, Make and webhooks and books into Google Calendar or Cal.com.', 'integrations'),
    },
    {
      q: 'How do the free trials compare?',
      a: c('Answering Legal offers 400 minutes or 14 days, whichever comes first, with no credit card. Its Terms let it end a trial after 100 minutes and limit trials around the December holidays. Boltcall needs no credit card to start and setup is free.', 'setup', 'plans', 'terms'),
    },
    {
      q: 'Who makes this page?',
      a: 'Boltcall. We are one of the two products compared, so check every figure against the linked sources.',
    },
  ],
  methodology: [
    'Answering Legal facts come from its public website pages and Terms of Service, read on October 2, 2026. Each one links to the page in Sources. Its pricing page sits behind a lead form; the plans page it leads to loads without a login. We did not test either product\'s call quality and make no claims about it.',
    'Boltcall facts come from our own product and plan configuration and Terms. We list our limits in the same detail as theirs.',
    'Prices and features verified October 2, 2026. Pricing changes often; check the vendor\'s page before buying. If a figure here is out of date, tell us and we will fix it.',
  ],
  related: [
    { label: 'Best law firm answering services', href: '/compare/best-law-firm-answering-services' },
    { label: 'Boltcall vs Smith.ai', href: '/compare/boltcall-vs-smith-ai' },
    { label: 'Boltcall vs Ruby', href: '/compare/boltcall-vs-ruby' },
    { label: 'Boltcall vs Lex Reception', href: '/compare/boltcall-vs-lex-reception' },
    { label: 'Boltcall vs Abby Connect', href: '/compare/boltcall-vs-abby-connect' },
    { label: 'Lawyer answering service', href: '/industries/lawyer-answering-service' },
    { label: 'Boltcall pricing', href: '/pricing' },
    { label: 'Law firm security', href: '/law-firm-security' },
  ],
  sources: {
    plans: { title: 'Answering Legal plans and pricing', url: 'https://www.answeringlegal.com/answering-legal-plans-pricing' },
    cost: { title: 'Answering Legal answering service cost', url: 'https://www.answeringlegal.com/answering-service-cost' },
    terms: { title: 'Answering Legal Terms of Service', url: 'https://www.answeringlegal.com/terms-of-service' },
    home: { title: 'Answering Legal home page', url: 'https://www.answeringlegal.com/' },
    llms: { title: 'Answering Legal llms.txt', url: 'https://www.answeringlegal.com/llms.txt' },
    alVsRuby: { title: 'Answering Legal vs Ruby', url: 'https://www.answeringlegal.com/al-vs-ruby' },
    allDay: { title: 'Answering Legal 24/7 live answering', url: 'https://www.answeringlegal.com/our-services/24-7-live-answering' },
    routing: { title: 'Answering Legal call routing and transferring', url: 'https://www.answeringlegal.com/our-services/call-routing-and-transfering' },
    bilingual: { title: 'Answering Legal bilingual receptionists', url: 'https://www.answeringlegal.com/our-services/bilingual-receptionists' },
    integrations: { title: 'Answering Legal integrations', url: 'https://www.answeringlegal.com/integrations' },
    clioGrow: { title: 'Answering Legal Clio Grow integration', url: 'https://www.answeringlegal.com/integrations/clio-grow' },
    zapier: { title: 'Answering Legal Zapier integration', url: 'https://www.answeringlegal.com/integrations/zapier' },
    app: { title: 'Answering Legal app', url: 'https://www.answeringlegal.com/answering-legal-app' },
    setup: { title: 'Answering Legal setup and customization', url: 'https://www.answeringlegal.com/how-it-works/setup-and-customization' },
    chatbot: { title: 'Answering Legal intake chatbot pricing', url: 'https://www.answeringlegal.com/intake-chatbot-pricing' },
    video: { title: 'Answering Legal Legal Video Calls pricing', url: 'https://www.answeringlegal.com/legal-video-calls-pricing' },
    switch: { title: 'Why switch to Answering Legal', url: 'https://www.answeringlegal.com/why-switch-to-answering-legal' },
    privacy: { title: 'Answering Legal privacy policy', url: 'https://www.answeringlegal.com/privacy-policy' },
    trustpilot: { title: 'Answering Legal reviews on Trustpilot', url: 'https://www.trustpilot.com/review/answeringlegal.com' },
  },
};

export default answeringLegal;
