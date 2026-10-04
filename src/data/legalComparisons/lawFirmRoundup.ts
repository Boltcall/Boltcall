import type { Cited, Source, TableData } from './types';
import { boltcallPlansTable } from './boltcall';

/**
 * Roundup page: /compare/best-law-firm-answering-services
 * Rendered by src/pages/CompareBestLawFirmAnsweringServices.tsx.
 * Same rules as the head-to-head data files (see types.ts): every competitor
 * fact is c('text', ...sourceIds); Boltcall facts are plain strings from the
 * code-verified safe list; no em dashes.
 */

const c = (text: string, ...src: string[]) => ({ text, src });

export interface RoundupService {
  /** Anchor id on the page */
  id: string;
  name: string;
  ours?: boolean;
  /** Who answers the phone */
  type: string;
  /** Times named across the 24 roundups we counted (Boltcall: none) */
  mentions?: number;
  bestFor: string;
  summary: Cited;
  /** One row of the big comparison table */
  row: { price: Cited; unit: Cited; hours: Cited; spanish: Cited; pms: Cited; setup: Cited };
  pricingTables?: TableData[];
  /** Used when prices are quote-only */
  pricingNote?: Cited;
  features: Cited[];
  watchOuts: Cited[];
  compareHref?: string;
}

export const ROUNDUP = {
  path: '/compare/best-law-firm-answering-services',
  slug: 'best-law-firm-answering-services',
  title: 'Best Law Firm Answering Services in 2026: 11 Compared (Prices Sourced)',
  description:
    'Ruby, Smith.ai, Answering Legal, LEX, Abby, PATLive and 5 more legal answering services compared on published price, billing unit, Clio and Spanish. All sourced.',
  h1: 'Best law firm answering services in 2026: 11 compared, prices sourced',
  publishDate: '2026-10-02',
  modifiedDate: '2026-10-02',
  verifiedLabel: 'October 2, 2026',
  answer: {
    query: 'What is the best answering service for a law firm in 2026',
    definition:
      'There is no single best legal answering service. The right one depends on whether you want live humans, AI or a mix, and how you want to be billed.',
    stat: 'Across 24 law-firm answering service roundups we reviewed, Ruby (named in 21), Smith.ai (20), Answering Legal (17) and LEX Reception (16) came up most. Published entry prices run from $49 a month (PATLive pay as you go) to quote-only (LEX Reception, Nexa).',
    outcome:
      'Pick by need: fully human answering (Ruby, Answering Legal, LEX Reception), AI and humans from one vendor (Smith.ai, Abby Connect, Posh), the lowest published entry price (PATLive, Posh, Moneypenny AI), or an instant callback on new web-form leads in one flat plan (Boltcall, which makes this page). Every price below links to its source.',
  },
  intro: [
    'Looking for the best legal answering service, or a straight law firm answering service comparison? This page puts 11 services side by side using only what each one publishes: price, billing unit, hours, Spanish, Clio and MyCase, setup fees and the terms worth reading before you sign.',
    'We picked the services by counting which ones appeared most often across 24 law-firm roundups, then added Boltcall. Boltcall is our product. It is listed last, it is not ranked first, and its limits are spelled out in the same detail as everyone else\'s. There is no overall winner here, only "best for" picks, because a solo immigration lawyer and a 40-person injury firm need different things.',
  ],
};

export const SERVICES: RoundupService[] = [
  {
    id: 'ruby',
    name: 'Ruby',
    type: 'Live humans',
    mentions: 21,
    bestFor: 'Fully human answering where callers think they reached your firm, with a HIPAA BAA at no extra cost',
    summary: c(
      'Ruby answers with live receptionists only. AI tools support the receptionist behind the scenes but do not answer calls, and Ruby says callers do not know they reached a third-party service.',
      'rbHome',
      'rbAi',
      'rbLegal',
    ),
    row: {
      price: c('$250 per month for 50 minutes', 'rbPricing'),
      unit: c('Per receptionist minute, rounded up to the next minute', 'rbFaq'),
      hours: c('Yes', 'rbPricing'),
      spanish: c('Included. Pricing page says 24/7; the FAQ lists weekday hours', 'rbPricing', 'rbFaq'),
      pms: c('Clio native. MyCase listed, connection type not stated', 'rbIntegrations'),
      setup: c('None', 'rbPricing'),
    },
    pricingTables: [
      {
        title: 'Ruby receptionist plans (billed per minute)',
        note: c(
          'Every plan has the same features; only the minutes differ. Calls round up to the next 60 seconds. Overage is billed at a rate tied to your plan, which Ruby does not publish. Larger plans on request. No setup or onboarding fees.',
          'rbPricing',
          'rbFaq',
        ),
        columns: ['Plan', 'Price per month', 'Per included minute (our math)'],
        rows: [
          ['50 minutes', '$250', '$5.00'],
          ['100 minutes', '$395', '$3.95'],
          ['200 minutes', '$720', '$3.60'],
          ['500 minutes', '$1,725', '$3.45'],
        ],
      },
    ],
    features: [
      c('Books consultations, collects caller details and prioritizes callbacks. Can assist with payment collection when instructed.', 'rbLegal'),
      c('24/7 live answering, including after hours, weekends and holidays. Website chat staffed by people, sold alone or with a plan.', 'rbPricing'),
      c('HIPAA compliant service with a signed BAA at no extra charge, plus optional PCI-compliant service for payment intake.', 'rbFaq'),
      c('Names Clio as a native integration. Also lists MyCase, Filevine, Lawmatics and Rocket Matter, and offers Zapier-powered integrations, without saying which of those are native.', 'rbIntegrations'),
      c('Conflict checks are not mentioned on its legal, FAQ or pricing pages.', 'rbLegal', 'rbFaq', 'rbPricing'),
    ],
    watchOuts: [
      c('Calls are billed in 60-second increments, rounded up. Outbound calls use minutes for talk time and the follow-up email.', 'rbFaq'),
      c('The overage rate is not published.', 'rbFaq'),
      c('Per its Terms, credit card payments carry a 3.0% surcharge, and Ruby may adjust pricing at any time.', 'rbTerms'),
      c('Its FAQ limits bilingual service and outgoing call assists to Monday to Friday, 5am to 6pm Pacific.', 'rbFaq'),
      c('Money-back guarantee of 21 days or 500 minutes, whichever comes first. Per its Terms, it may not be available to all customers.', 'rbFaq', 'rbTerms'),
    ],
    compareHref: '/compare/boltcall-vs-ruby',
  },
  {
    id: 'smith-ai',
    name: 'Smith.ai',
    type: 'AI, live humans or hybrid',
    mentions: 20,
    bestFor: 'One vendor for AI, human or hybrid answering, with native Clio and MyCase and conflict checks on the call',
    summary: c(
      'Smith.ai offers AI-first, hybrid and human-first answering, and lists 500+ North American live agents available 24/7.',
      'smHome',
    ),
    row: {
      price: c('AI: free for 25 calls, paid from $150 per month for 75 calls. Live: $300 per month for 30 calls', 'smAi', 'smHv'),
      unit: c('Per call', 'smAi'),
      hours: c('Yes, no after-hours surcharge', 'smHome'),
      spanish: c('AI and live agents. Dedicated Spanish line $1.00 per call on live plans', 'smAiProduct', 'smHv'),
      pms: c('Clio and MyCase native', 'smClio', 'smMycase'),
      setup: c('None', 'smAiProduct'),
    },
    pricingTables: [
      {
        title: 'Smith.ai AI Receptionist (billed per call)',
        note: c('Month-to-month with 30 days\' notice to cancel. The Free plan needs a card at signup.', 'smAi', 'smAiProduct'),
        columns: ['Plan', 'Price per month', 'Calls included', 'Per extra call'],
        rows: [
          ['Free', '$0', '25', '$3.00'],
          ['Pro', '$150', '75', '$2.50'],
          ['Pro', '$270', '150', '$2.30'],
          ['Pro (Enterprise starts here)', '$500', '300', '$2.17'],
          ['Enterprise', '$800', '500', '$2.10'],
          ['Enterprise', 'Custom', '1,000+', 'Custom'],
        ],
      },
      {
        title: 'Smith.ai Virtual Receptionists (live people, billed per call)',
        note: c(
          'Add-ons are billed per call, including conflict checks ($0.50), booking ($1.50), recording and transcription ($0.25) and a dedicated Spanish line ($1.00). A 5-question intake is free. 10% off for a 12-month commitment.',
          'smHv',
        ),
        columns: ['Plan', 'Price per month', 'Calls included', 'Per extra call'],
        rows: [
          ['Starter', '$300', '30', '$11.50'],
          ['Basic', '$810', '90', '$10.50'],
          ['Pro', '$2,100', '300', '$8.50'],
          ['Enterprise', 'Custom', 'Custom', 'Custom'],
        ],
      },
    ],
    features: [
      c('Practice-specific legal intake. Live plans include a 5-question intake free; extended intake is an add-on.', 'smLegal', 'smHv'),
      c('Live agents check callers against your existing contacts and matters ($0.50 per call on live plans).', 'smHome', 'smHv'),
      c('Native Clio and MyCase integrations, and Zapier for 7,000+ more apps.', 'smClio', 'smMycase', 'smLegal'),
      c('Accepts payments (LawPay and others) and collect calls, both as paid add-ons.', 'smHv'),
      c('States its AI never claims to be human when a caller asks directly.', 'smHome'),
    ],
    watchOuts: [
      c('Many legal features are per-call add-ons on live plans, so the per-call cost rises with each one you turn on.', 'smHv'),
      c('States it is not HIPAA-compliant and cannot handle calls involving protected health information.', 'smLegal'),
      c('Call recordings are deleted after three months.', 'smHome'),
      c('The live-plan money-back guarantee is described as 30 days (capped at $1,000, overage excluded) and, in the same FAQ, as two weeks.', 'smHv'),
    ],
    compareHref: '/compare/boltcall-vs-smith-ai',
  },
  {
    id: 'answering-legal',
    name: 'Answering Legal',
    type: 'Live humans',
    mentions: 17,
    bestFor: 'Legal-only live answering with direct legal integrations and a long free trial',
    summary: c(
      'Answering Legal has worked only with law firms since 2013. Calls are answered live, 24/7, by US-based receptionists. Its listed AI product is a free web intake chatbot.',
      'alVsRuby',
      'alLlms',
      'alChatbot',
    ),
    row: {
      price: c('$360 per month for 100 minutes', 'alPricing'),
      unit: c('Per minute; increment not published', 'alCost'),
      hours: c('Yes, 24/7/365', 'al247'),
      spanish: c('English or Spanish', 'alHome'),
      pms: c('Clio Grow and MyCase direct', 'alIntegrations'),
      setup: c('None on the pricing page; Terms allow $399 to $599 for extensive setup', 'alPricing', 'alTerms'),
    },
    pricingTables: [
      {
        title: 'Answering Legal plans (billed per minute)',
        note: c('Every feature is on every plan. Overage applies, but the rate is not published.', 'alPricing', 'alTerms'),
        columns: ['Plan', 'Price per month', 'Minutes included', 'Per included minute (our math)'],
        rows: [
          ['Solo', '$360', '100', '$3.60'],
          ['Essential', '$676', '200', '$3.38'],
          ['Growing', '$936', '300', '$3.12'],
          ['Custom', 'Quote', 'Quote', 'Quote'],
        ],
      },
    ],
    features: [
      c('Custom legal intake on every new-client call, with practice-area questions (for example personal injury, criminal defense, bankruptcy).', 'alHome', 'alLlms'),
      c('Direct integrations including MyCase, Clio Grow, Lead Docket, Lawmatics, Smokeball and PracticePanther, plus Zapier. Integrations are free.', 'alIntegrations', 'alClioGrow'),
      c('Books consultations onto your calendar and warm-transfers callers, pending availability.', 'alHome'),
      c('Free trial of 400 minutes or 14 days, whichever comes first, with no credit card.', 'alTrial', 'alPricing'),
      c('Live-interpreter video calls in 180+ languages as an add-on.', 'alVideo'),
      c('Conflict checks are not mentioned on its home page or service summary.', 'alHome', 'alLlms'),
    ],
    watchOuts: [
      c('Overage is billed, but the rate is not published.', 'alTerms'),
      c('The pricing page says no setup fees. The Terms reserve $399 to $599 for extensive setup and list a $21.50 carrier recovery fund charge (frequency not stated).', 'alPricing', 'alTerms'),
      c('The Terms are stricter than the trial headline: the trial can end after 100 minutes, holiday trials can cost $175, and there is no trial from December 15 to January 4.', 'alTerms'),
      c('Phone numbers it assigns stay its property, and it may subcontract some functions.', 'alTerms'),
    ],
    compareHref: '/compare/boltcall-vs-answering-legal',
  },
  {
    id: 'lex-reception',
    name: 'LEX Reception',
    type: 'Live humans',
    mentions: 16,
    bestFor: 'Human-only, legal-only intake with 24/7 Spanish and a long list of legal integrations',
    summary: c('LEX Reception answers only for law firms, with live receptionists. It states it does not use AI to answer phones.', 'lexFaqs'),
    row: {
      price: c('Quote only, after a form', 'lexRegister'),
      unit: c('Per minute, rounded up to the next minute', 'lexFaqs'),
      hours: c('Yes, 24/7/365', 'lexHome'),
      spanish: c('Yes, 24/7', 'lexBilingual'),
      pms: c('Clio native. MyCase listed', 'lexClio', 'lexIntegrations'),
      setup: c('Not published', 'lexRegister'),
    },
    pricingNote: c(
      'LEX does not publish prices; plans are quoted after you submit a form or call. Billing is per minute: a call of 2 minutes 28 seconds is recorded as 3 minutes. Overage is per minute at a rate shown only behind the form. 30 calls under 30 seconds are free each month.',
      'lexRegister',
      'lexFaqs',
    ),
    features: [
      c('Client screening, lead qualification against your practice areas, consultation scheduling and follow-up.', 'lexIntake'),
      c('Lists Clio, MyCase, PracticePanther, Filevine, Lawmatics, Smokeball, CosmoLex, CASEpeer and LawPay, at no additional fee. Clio connects by logging in from the LEX account.', 'lexIntegrations', 'lexClio'),
      c('Bilingual teams handle Spanish intake 24/7. Messages are delivered in English.', 'lexBilingual'),
      c('Live transfer to your team at no extra cost, and call recordings you can listen to.', 'lexFaqs'),
      c('Human-staffed web chat, and outbound follow-up on inquiry forms.', 'lexChat', 'lexOutbound'),
      c('Conflict checks are not mentioned on its intake or FAQ pages.', 'lexIntake', 'lexFaqs'),
    ],
    watchOuts: [
      c('No published prices, and the overage rate sits behind the form.', 'lexRegister', 'lexFaqs'),
      c('Per its Terms, billable time includes hold time and time spent patching a call forward.', 'lexTerms'),
      c('Partial months are billed in full, and pricing can change on written notice.', 'lexTerms'),
      c('It does not claim US-based staff. Its FAQ says receptionists "are chosen based on their quality, not location."', 'lexFaqs'),
    ],
    compareHref: '/compare/boltcall-vs-lex-reception',
  },
  {
    id: 'abby-connect',
    name: 'Abby Connect',
    type: 'Humans, AI, or both',
    mentions: 9,
    bestFor: 'Mixing human and AI answering on one per-minute plan, with a deep legal integration list',
    summary: c('Abby Connect sells human answering, AI answering or both on the same plan, and you can change the mix at any time.', 'abbyPricing'),
    row: {
      price: c('$165 per month for 50 Abby Minutes', 'abbyPricing'),
      unit: c('Per Abby Minute: 1 human minute or 2 AI minutes', 'abbyPricing'),
      hours: c('Custom hours, 24/7 option, no weekend upcharge', 'abbyPricing'),
      spanish: c('Included on every plan', 'abbyLegal'),
      pms: c('Clio and MyCase listed as native', 'abbyIntegrations'),
      setup: c('None', 'abbyPricing'),
    },
    pricingTables: [
      {
        title: 'Abby Connect plans (billed per Abby Minute)',
        note: c(
          '1 Abby Minute = 1 minute of human answering or 2 minutes of AI answering. Overage is billed at your plan\'s Abby Minute rate. Free trial on every plan, month to month, no setup fee.',
          'abbyPricing',
        ),
        columns: ['Plan', 'Price per month', 'Abby Minutes included', 'Per human minute (our math)'],
        rows: [
          ['Starter', '$165', '50', '$3.30'],
          ['Essential', '$329', '100', '$3.29'],
          ['Professional', '$599', '200', '$3.00'],
          ['Growth', '$1,380', '500', '$2.76'],
          ['Enterprise', 'Contact', 'Contact', 'Contact'],
        ],
      },
    ],
    features: [
      c('Receptionists follow your intake script on first calls: the matter, contact details and your qualifying questions.', 'abbyLegal'),
      c('Its Clio page says prospective clients are screened per your instructions, including practice area, conflict basics and urgency.', 'abbyClio'),
      c('Lists 157 native integrations. The legal set includes Clio Manage, Clio Grow, MyCase, Lawmatics, Filevine, Smokeball, PracticePanther and CASEpeer, and Abby offers to build a missing one free during onboarding.', 'abbyIntegrations'),
      c('Encrypted call recordings.', 'abbyPricing'),
    ],
    watchOuts: [
      c('The unit changes by mode. AI time uses half an Abby Minute per minute, human time a full one, and a call that uses both bills each portion at its own rate.', 'abbyPricing'),
      c('HIPAA compliance options apply to human answering only.', 'abbyPricing'),
      c('Abby describes its integrations as "built and managed by Abby". Ask how the one you rely on connects and what it syncs.', 'abbyIntegrations'),
    ],
    compareHref: '/compare/boltcall-vs-abby-connect',
  },
  {
    id: 'patlive',
    name: 'PATLive',
    type: 'Live humans',
    mentions: 9,
    bestFor: 'The most transparent per-minute price ladder, starting at $49 pay as you go',
    summary: c('PATLive answers every call with live receptionists. It says its web chat uses no bots or AI either.', 'patPricing'),
    row: {
      price: c('$49 per month pay as you go ($2.99 per minute), or $99 for 50 minutes', 'patPricing'),
      unit: c('Per minute; increment not stated on the pricing page', 'patPricing'),
      hours: c('Yes, 24/7/365', 'patPricing'),
      spanish: c('No extra cost; the legal page says 8am to 10pm ET', 'patPricing', 'patLegal'),
      pms: c('Clio native. MyCase via Zapier', 'patIntegrations'),
      setup: c('None', 'patPricing'),
    },
    pricingTables: [
      {
        title: 'PATLive live call answering (billed per minute)',
        note: c('Prices do not include taxes and fees. 14-day free trial on any plan, no contract term.', 'patPricing'),
        columns: ['Plan', 'Price per month', 'Overage per minute'],
        rows: [
          ['Pay as you go', '$49', '$2.99'],
          ['50 minutes', '$99', '$2.29'],
          ['100 minutes', '$189', '$2.09'],
          ['200 minutes', '$349', '$1.99'],
          ['300 minutes', '$479', '$1.89'],
          ['500 minutes', '$759', '$1.79'],
          ['1,000 minutes', '$1,499', '$1.69'],
          ['2,000 minutes', '$2,899', '$1.64'],
          ['3,000 minutes', '$4,299', '$1.59'],
          ['4,000 minutes', '$5,599', '$1.54'],
          ['5,000 minutes', '$6,899', '$1.49'],
        ],
      },
    ],
    features: [
      c('Receptionists guide new clients through your intake and collect case details. The legal page covers personal injury, family, criminal, immigration and elder law.', 'patLegal'),
      c('Per its own integration tags: Clio, Clio Grow, Lawmatics, Smokeball, PracticePanther and CARET Legal are native; MyCase, CASEpeer, Litify and Rocket Matter go through Zapier.', 'patIntegrations'),
      c('Every call is recorded. Live chat and outbound calling are sold separately.', 'patPricing'),
      c('Conflict checks are not mentioned on its pricing or legal pages.', 'patPricing', 'patLegal'),
    ],
    watchOuts: [
      c('Prices exclude taxes and fees, and the pricing page does not state the rounding increment.', 'patPricing'),
      c('Spanish is free, but its legal page limits bilingual receptionists to 8am to 10pm ET.', 'patLegal'),
      c('Outbound calls are placed only 8am to 6pm ET, Monday to Friday, at $8.95 per outreach on pay as you go.', 'patPricing'),
    ],
  },
  {
    id: 'nexa',
    name: 'Nexa',
    type: 'Live humans, with optional AI',
    mentions: 8,
    bestFor: 'High-volume personal injury firms that run PI case-management tools and are fine with a quoted plan',
    summary: c(
      'Nexa sells live answering and a Voice + AI hybrid, with legal intake specialists, 24/7, in English and Spanish.',
      'nexaAi',
      'nexaLegal',
    ),
    row: {
      price: c('Quote only. Plans list 100, 300 and 500 voice minutes without prices', 'nexaPricing'),
      unit: c('Per minute of receptionist work time, rounded up', 'nexaPricing', 'nexaTerms'),
      hours: c('Yes, 24/7/365', 'nexaLegal'),
      spanish: c('Yes', 'nexaLegal'),
      pms: c('Clio logo shown, MyCase not shown. Connection type not stated', 'nexaIntegrations'),
      setup: c('Yes, amount not published', 'nexaPricing'),
    },
    pricingNote: c(
      'Nexa lists Nexa 100, 300 and 500 voice-minute plans without prices. A setup fee applies; the amount is not published. Minutes over the plan bill at your base rate.',
      'nexaPricing',
    ),
    features: [
      c('Legal intake specialists trained for sensitive matters, plus live chat and text with a live operator, in English and Spanish.', 'nexaLegal'),
      c('Voice + AI options: Human First, AI First, or Human with Some Automation.', 'nexaAi'),
      c('Integration logos include Clio, Lawmatics, Filevine, Litify, CASEpeer, SmartAdvocate and Lead Docket.', 'nexaIntegrations'),
    ],
    watchOuts: [
      c('Billable time includes after-call follow-up, scheduling, hold time while waiting to be transferred and outbound ringing, rounded up to whole minutes.', 'nexaPricing', 'nexaTerms'),
      c('Per its Terms, it may use AI agents to answer calls and bills that time under your plan unless you opt out.', 'nexaTerms'),
      c('Cancelling needs a written request at least 1 month before your next invoice, and subscription fees are non-refundable.', 'nexaTerms'),
      c('Call recordings are kept for no more than 90 days.', 'nexaTerms'),
    ],
  },
  {
    id: 'back-office-betties',
    name: 'Back Office Betties',
    type: 'Live humans',
    mentions: 6,
    bestFor: 'A small, dedicated legal team during business hours, billed without rounding up',
    summary: c(
      'Back Office Betties is a legal-only team of virtual receptionists that positions itself against AI ("Not a call center. Not AI."). Each firm gets a team of 8 to 10 receptionists.',
      'bobHome',
      'bobPricing',
    ),
    row: {
      price: c('$369 per month for 100 minutes billed monthly ($333 billed yearly), plus $399 onboarding', 'bobPricing'),
      unit: c('Per minute, not rounded up (2 min 15 s = 2.25 min)', 'bobPricing'),
      hours: c('No. Monday to Friday, 5am to 5pm PT', 'bobPricing'),
      spanish: c('No extra cost', 'bobPricing'),
      pms: c('Clio Grow. MyCase not named', 'bobPricing'),
      setup: c('$399 one-time onboarding', 'bobPricing'),
    },
    pricingTables: [
      {
        title: 'Back Office Betties receptionist plans (billed per minute)',
        note: c(
          'The $399 Fit-to-Firm Onboarding covers 100 minutes or 30 days, whichever comes first, before a plan is recommended. The overage rate is not stated. Virtual legal assistant plans are also listed, from $984 per month for 20 hours billed monthly.',
          'bobPricing',
        ),
        columns: ['Plan', 'Billed monthly', 'Billed yearly (per month)'],
        rows: [
          ['100 minutes', '$369', '$333'],
          ['200 minutes', '$686', '$618'],
          ['400 minutes', '$1,286', '$1,158'],
          ['500 minutes', '$1,486', '$1,338'],
        ],
      },
    ],
    features: [
      c('Fully custom legal intakes and lead screening against your practice areas.', 'bobPricing'),
      c('Payment processing (such as LawPay) and outbound calling for lead follow-up.', 'bobPricing'),
      c('Sends qualified leads to your Clio Grow inbox. Scheduling runs through an embedded Acuity or Calendly.', 'bobPricing'),
    ],
    watchOuts: [
      c('Not 24/7. After-hours calls go to your voicemail.', 'bobPricing'),
      c('A $399 onboarding fee before a plan starts, and no published overage rate.', 'bobPricing'),
      c('Clio Grow is the only practice-management integration named on the pricing page.', 'bobPricing'),
    ],
  },
  {
    id: 'posh',
    name: 'Posh',
    type: 'Live humans, with optional AI',
    mentions: 5,
    bestFor: 'A low-cost start with US-based receptionists and a free trial that needs no card',
    summary: c(
      'Posh answers with US-based receptionists who work from its Virginia Beach office, and offers optional AI that transfers sensitive legal intake to a person.',
      'poshFaqs',
      'poshAttorney',
    ),
    row: {
      price: c('$65 per month plus $2.30 per minute, or $215 for 100 minutes', 'poshPricing'),
      unit: c('Per receptionist minute, rounded up to the next 60 seconds', 'poshPricing', 'poshTerms'),
      hours: c('Yes, 24/7/365', 'poshAttorney'),
      spanish: c('Guaranteed on weekdays during Eastern business hours', 'poshFaqs'),
      pms: c('Clio listed. MyCase not listed', 'poshIntegrations'),
      setup: c('None', 'poshAttorney'),
    },
    pricingTables: [
      {
        title: 'Posh live receptionist plans (billed per minute)',
        note: c(
          'Prices effective January 1, 2026. AI + live plans cost the same and share one minute pool; AI overage runs $0.95 to $1.15 per minute. Free trial of 7 days or 250 minutes, no card.',
          'poshPricing',
          'poshAi',
        ),
        columns: ['Plan', 'Price per month', 'Minutes included', 'Overage per minute'],
        rows: [
          ['Chïc', '$65', '0', '$2.30'],
          ['Vogue', '$130', '50', '$2.20'],
          ['Elegant', '$215', '100', '$2.15'],
          ['Luxurious', '$420', '200', '$2.10'],
          ['Prestigious', '$700', '350', '$2.00'],
          ['Lavish', '$975', '500', '$1.95'],
          ['Exclusive', '$1,900', '1,000', '$1.90'],
        ],
      },
    ],
    features: [
      c('Customized legal intake, and support for your own conflict-check process by relaying caller details. Posh does not run the check.', 'poshAttorney'),
      c('Its AI transfers sensitive client intake calls to live receptionists.', 'poshAttorney'),
      c('Its integrations page lists Clio (Grow and Manage), Rocket Matter and Zapier.', 'poshIntegrations'),
      c('States it is HIPAA-compliant.', 'poshFaqs'),
      c('Unlimited users; pricing is based on receptionist time.', 'poshPricing'),
    ],
    watchOuts: [
      c('Billing rounds up to the next 60 seconds and includes after-call work.', 'poshTerms'),
      c('Its pricing page says there are no other fees. Its Terms add a 3.0% surcharge on credit card payments (not debit or ACH).', 'poshPricing', 'poshTerms'),
      c('If the AI answers and transfers to a human, both the AI and the live overage fees apply.', 'poshAi'),
      c('Spanish is guaranteed only on weekdays. The FAQ says 9am to 6pm ET; the bilingual page says 8am to 6pm ET.', 'poshFaqs', 'poshBilingual'),
      c('Recording statements differ: the FAQ says calls are not recorded, while the Terms mention keeping recordings up to 90 days. Subscription fees are non-refundable.', 'poshFaqs', 'poshTerms'),
    ],
  },
  {
    id: 'moneypenny',
    name: 'Moneypenny (US)',
    type: 'Live humans or AI (separate plans)',
    mentions: 4,
    bestFor: 'Low-cost AI answering billed per call, with live receptionists available on a separate plan',
    summary: c(
      'Moneypenny sells live receptionist plans and a separate AI Receptionist that can hand calls to a Moneypenny receptionist or your own team. Its US business is VoiceNation, LLC.',
      'mpPricing',
      'mpAiPage',
      'mpTerms',
    ),
    row: {
      price: c('AI: $69 per month for 25 calls. Live: $165 per month for 50 minutes', 'mpPricing'),
      unit: c('Live: per minute, rounded up to 30 seconds. AI: per call', 'mpPricing', 'mpTerms'),
      hours: c('Yes, on US plans', 'mpPricing'),
      spanish: c('No extra cost', 'mpBilingual'),
      pms: c('Clio and MyCase logos shown. Connection type not stated', 'mpLegal'),
      setup: c('Yes, amount not published', 'mpTerms', 'mpAiTerms'),
    },
    pricingTables: [
      {
        title: 'Moneypenny US live receptionists (billed per minute)',
        note: c('No contract; 30 days\' notice to cancel. No annual option is shown.', 'mpPricing'),
        columns: ['Plan', 'Price per month', 'Overage per minute'],
        rows: [
          ['50 minutes', '$165', '$2.28'],
          ['100 minutes', '$265', '$2.12'],
          ['200 minutes', '$422', '$1.91'],
          ['500 minutes', '$985', '$1.67'],
        ],
      },
      {
        title: 'Moneypenny US AI Receptionist (billed per call)',
        note: c('Included calls do not roll over to the next billing period.', 'mpPricing', 'mpAiTerms'),
        columns: ['Plan', 'Price per month', 'Overage per call'],
        rows: [
          ['25 calls', '$69', '$2.49'],
          ['50 calls', '$99', '$2.39'],
          ['100 calls', '$199', '$2.19'],
          ['250 calls', '$435', '$1.89'],
        ],
      },
    ],
    features: [
      c('Qualifies inbound leads, schedules appointments, transfers to any US number and takes payments over the phone.', 'mpLegal'),
      c('Its US legal page says many on its legal team have experience managing legal calls.', 'mpLegal'),
      c('Real-time AI transcripts. Its AI terms say customer data is not used to train public or external AI models.', 'mpAiPage', 'mpAiTerms'),
      c('Conflict checks are not mentioned on its US legal page.', 'mpLegal'),
    ],
    watchOuts: [
      c('Both US terms include a setup fee. The amount is not published, and setup fees are non-refundable.', 'mpTerms', 'mpAiTerms'),
      c('Live minutes round up to the next 30 seconds and include up to 180 seconds of wrap-up time per call, plus transfer dialing time.', 'mpTerms'),
      c('Per its terms, call recordings are for internal quality use and are not accessible to the customer.', 'mpTerms'),
      c('The AI Receptionist is not designed to be HIPAA compliant. Escalated calls may cost extra, and handing off to its human team needs an active live plan as well.', 'mpAiTerms'),
      c('Per the terms, cancelling after the 1st of the month means paying for another full month.', 'mpTerms'),
    ],
  },
  {
    id: 'boltcall',
    name: 'Boltcall',
    ours: true,
    type: 'AI only',
    bestFor: 'An instant AI callback on new web-form leads plus missed-call text-back, in one flat plan',
    summary:
      'Boltcall is our product. It is an AI-only speed-to-lead platform: it answers calls, calls new web-form leads back right away and texts back missed calls. It has no staffed human receptionists, but it can transfer a call to your own number.',
    row: {
      price: '$549 per month (Starter)',
      unit: 'Flat monthly credit pool shared across calls, texts and chat',
      hours: 'Yes for calls. Web-form callbacks run 8am to 9pm in the lead\'s local time',
      spanish: 'One language per agent (English or Spanish)',
      pms: 'No native integration. Zapier, Make or webhooks',
      setup: 'Free',
    },
    pricingTables: [boltcallPlansTable],
    features: [
      'Intake scripts for personal injury, family, criminal defense, immigration and estate planning. Asks for the names a conflict check needs first; it does not run the check against your matters.',
      'Flags urgent matters (custody or arrest, domestic violence, a court date within 48 hours, deportation, an imminent deadline) and alerts your team by email. Optional live transfer to your own number.',
      'Every call opens with an AI disclosure and "this call may be recorded". No legal advice and no case assessment, and the caller is told the call does not make them a client.',
      'Books into Google Calendar or Cal.com. Recording and transcript for every call. Website chat on Pro and up.',
      'No per-call fee, no per-case fee and no share of fees. Free setup, no long-term contract, and a 30-day money-back guarantee (see Terms, section 7).',
    ],
    watchOuts: [
      'No staffed human receptionists. If you want a person on every call, pick one of the services above.',
      'No native Clio, MyCase, Filevine or Lawmatics integration yet.',
      'It starts at $549 per month, more than most entry plans on this page at low volume.',
      'The credit pool caps usage: about 100 AI voice minutes a month on Starter if it is spent only on voice.',
      'Each agent runs in English or Spanish, not both on the same call.',
      'Boltcall is newer and has no public review profile on G2 or Capterra.',
    ],
  },
];

export const HOW_TO_CHOOSE = {
  models: [
    {
      term: 'Live humans',
      body: c(
        'A trained person on every call. This suits crisis callers and clients who expect a human, and some services build their pitch on it. You pay more per minute, and billable time often includes hold, transfer or after-call work.',
        'lexFaqs',
        'lexTerms',
        'poshTerms',
      ),
    },
    {
      term: 'AI',
      body: 'Lower cost per call, and AI can also act on web forms and texts, not just calls. Ask how it tells callers it is an AI, what it does with a caller in crisis, and whether it can hand off to a person.',
    },
    {
      term: 'Hybrid',
      body: c(
        'AI takes routine calls and people take sensitive ones. Ask how a handoff is billed: at Posh, an AI call transferred to a human incurs both overage fees.',
        'poshAi',
      ),
    },
  ],
  units: [
    {
      term: 'Per minute',
      body: c(
        'Ruby, Answering Legal, LEX Reception, PATLive, Posh, Back Office Betties, Abby Connect and Moneypenny live plans. Cost tracks call length, so long intake calls cost more. Rounding matters: LEX records a 2 minute 28 second call as 3 minutes, while Back Office Betties records 2 minutes 15 seconds as 2.25.',
        'lexFaqs',
        'bobPricing',
      ),
    },
    {
      term: 'Per call',
      body: c(
        'Smith.ai and Moneypenny AI. Cost tracks the number of calls, so a 1-minute call costs the same as a 10-minute intake. Check the spam allowance: Smith.ai AI plans let you remove up to 10% of calls as spam each billing cycle.',
        'smAi',
        'mpPricing',
      ),
    },
    {
      term: 'Flat plan',
      body: 'Boltcall. One monthly price for a credit pool shared across calls, texts and chat. The price does not move with each call, but the pool caps how much you can use.',
    },
  ],
  questions: [
    c('How is each call rounded, and what counts as billable time? Hold time, transfer dialing and after-call work are billable at some services.', 'lexTerms', 'mpTerms', 'nexaTerms'),
    c('What is the overage rate, in writing? Ruby, Answering Legal and LEX Reception do not publish theirs.', 'rbFaq', 'alTerms', 'lexFaqs'),
    c('Are there setup, onboarding, carrier or card fees? Back Office Betties charges $399 onboarding, and Ruby and Posh add 3.0% for credit card payments.', 'bobPricing', 'rbTerms', 'poshTerms'),
    c('Can you get call recordings, and for how long are they kept? Moneypenny\'s terms say recordings are not accessible to the customer; Smith.ai deletes them after three months.', 'mpTerms', 'smHome'),
    c('Which integrations are native and which run through Zapier, and does intake land in Clio Grow or Clio Manage? Answering Legal\'s Clio integration sends intake to Clio Grow leads.', 'alClioGrow'),
    c('Will the vendor sign a BAA, or state HIPAA terms in writing? Ruby signs a BAA at no charge; Smith.ai states it is not HIPAA-compliant. Boltcall does not claim HIPAA compliance.', 'rbFaq', 'smLegal'),
    c('Is AI used by default? Nexa\'s terms let it answer calls with AI agents unless you opt out.', 'nexaTerms'),
    c('What does cancelling take? Notice periods range from end of the billing period to 1 month\'s written notice.', 'rbFaq', 'nexaTerms'),
  ] as Cited[],
};

export const FAQ: { q: string; a: Cited }[] = [
  {
    q: 'What is the best answering service for a law firm?',
    a: 'It depends on what you need. For fully human answering, look at Ruby, Answering Legal and LEX Reception. For AI and humans from one vendor, Smith.ai, Abby Connect and Posh. For the lowest published entry price, PATLive, Posh and Moneypenny AI. For an instant callback on web-form leads in one flat plan, Boltcall, which makes this page.',
  },
  {
    q: 'How much does a legal answering service cost?',
    a: c(
      'Published entry prices: PATLive $49 per month pay as you go, Posh $65 per month plus $2.30 per minute, Moneypenny AI $69 for 25 calls, Abby Connect $165 for 50 minutes, Ruby $250 for 50 minutes, Smith.ai $300 for 30 live calls (its AI plan starts free for 25 calls), Answering Legal $360 for 100 minutes, Back Office Betties $369 for 100 minutes plus $399 onboarding, and Boltcall $549. LEX Reception and Nexa quote prices only.',
      'patPricing',
      'poshPricing',
      'mpPricing',
      'abbyPricing',
      'rbPricing',
      'smHv',
      'smAi',
      'alPricing',
      'bobPricing',
      'lexRegister',
      'nexaPricing',
    ),
  },
  {
    q: 'Which legal answering services integrate natively with Clio?',
    a: c(
      'Smith.ai lists Clio and MyCase as native. Ruby and LEX Reception name Clio as native. PATLive tags Clio as native and MyCase as Zapier. Abby Connect lists both as native. Answering Legal connects directly to Clio Grow and MyCase. Boltcall has no native Clio integration; it connects through Zapier, Make or webhooks.',
      'smClio',
      'smMycase',
      'rbIntegrations',
      'lexClio',
      'patIntegrations',
      'abbyIntegrations',
      'alIntegrations',
    ),
  },
  {
    q: 'Which ones answer in Spanish around the clock?',
    a: c(
      'LEX Reception states 24/7 Spanish intake. Smith.ai states Spanish fluency for AI and live agents. Ruby\'s pricing page says 24/7, but its FAQ lists weekday hours. PATLive\'s legal page says 8am to 10pm ET, and Posh guarantees Spanish on weekdays only. Each Boltcall agent runs in English or Spanish, not both on one call.',
      'lexBilingual',
      'smAiProduct',
      'rbPricing',
      'rbFaq',
      'patLegal',
      'poshFaqs',
    ),
  },
  {
    q: 'Which legal answering services are HIPAA compliant?',
    a: c(
      'Ruby offers HIPAA compliant service with a signed BAA at no extra charge. Posh states it is HIPAA-compliant. Abby Connect offers HIPAA options for human answering only. Smith.ai states it is not HIPAA-compliant, and Moneypenny\'s AI Receptionist is not designed to be. Boltcall does not claim HIPAA compliance. If you handle medical records, ask for it in writing.',
      'rbFaq',
      'poshFaqs',
      'abbyPricing',
      'smLegal',
      'mpAiTerms',
    ),
  },
  {
    q: 'Are all of these open 24/7?',
    a: c(
      'All except Back Office Betties, which answers Monday to Friday, 5am to 5pm PT and sends after-hours calls to voicemail. Abby Connect sets custom hours with a 24/7 option.',
      'bobPricing',
      'abbyPricing',
    ),
  },
  {
    q: 'Can a law firm use an AI answering service?',
    a: c(
      'Many do, but check your state bar rules first. This is not legal advice. Smith.ai notes that under ABA Model Rule 5.3 a supervising attorney is expected to confirm an outsourced intake service acts consistently with the firm\'s obligations. Ask any AI vendor how it discloses that it is an AI and whether it records calls. Boltcall discloses both at the start of every call.',
      'smHome',
    ),
  },
  {
    q: 'Why is Boltcall on this list?',
    a: 'We make Boltcall and built this page. It is listed last, it is not counted in the mention data, and its limits are listed in the same detail as every other service. It is AI only and starts at $549 per month, so it is not the right pick for every firm.',
  },
];

/** Times each service was named across the 24 roundups (self-placement excluded). */
export const MENTIONS: TableData = {
  title: 'How often each service was named (24 law-firm roundups)',
  note: 'One count per publisher. A vendor ranking itself did not count for itself. Boltcall is not counted.',
  columns: ['Service', 'Roundups naming it', 'Reviewed on this page'],
  rows: [
    ['Ruby', '21', 'Yes'],
    ['Smith.ai', '20', 'Yes'],
    ['Answering Legal', '17', 'Yes'],
    ['LEX Reception', '16', 'Yes'],
    ['Abby Connect', '9', 'Yes'],
    ['PATLive', '9', 'Yes'],
    ['Nexa', '8', 'Yes'],
    ['Back Office Betties', '6', 'Yes'],
    ['AnswerConnect', '6', 'No'],
    ['Veza Reception', '5', 'No'],
    ['Posh', '5', 'Yes'],
    ['Alert Communications', '5', 'No'],
    ['Moneypenny', '4', 'Yes'],
    ['Gabbyville', '4', 'No'],
    ['VoiceNation', '4', 'No'],
  ],
};

export const METHODOLOGY = [
  'We collected 24 law-firm answering service and AI receptionist roundups from 24 different publishers and counted which services each one named. Each publisher counts once. A vendor that ranked itself got no count from its own article. Most of the 24 were written by vendors; the rest are legal publications, agencies and review sites.',
  'We review the 8 services named most often, Ruby through Back Office Betties. AnswerConnect tied Back Office Betties at 6 and is not reviewed here. We also include Posh and Moneypenny because we had already researched them in depth, even though AnswerConnect, Veza Reception and Alert Communications were named as often or more. Boltcall is ours and is added on top.',
  'Services appear in order of how often they were named, with Boltcall last. We do not rank an overall winner. Competitor facts come from each vendor\'s public pages and terms, read on October 2, 2026, and each one links to its source. We did not test call quality and make no claims about it.',
  'Boltcall facts come from our own plan configuration and Terms. Prices change often; check the vendor\'s page before buying. If something here is out of date, tell us and we will fix it.',
];

/** The 24 roundups we counted (not footnoted facts, listed for transparency). */
export const ROUNDUPS: { publisher: string; url: string }[] = [
  { publisher: 'Lawyer Monthly', url: 'https://www.lawyer-monthly.com/2026/07/best-legal-answering-service/' },
  { publisher: 'Retell AI', url: 'https://www.retellai.com/blog/best-answering-service-for-lawyers' },
  { publisher: 'CaseFox', url: 'https://www.casefox.com/blog/?p=23987' },
  { publisher: 'Perspective AI', url: 'https://getperspective.ai/blog/best-legal-answering-services-2026-8-options-compared-vs-ai-intake' },
  { publisher: 'Neon Ambition', url: 'https://neonambition.com/blog/top-legal-answering-services-for-law-firms-2026/' },
  { publisher: 'NextPhone', url: 'https://www.getnextphone.com/blog/best-answering-service-for-law-firms' },
  { publisher: 'Lawmatics', url: 'https://www.lawmatics.com/blog/best-ai-receptionists-for-law-firms' },
  { publisher: 'CloudTalk', url: 'https://www.cloudtalk.io/blog/best-virtual-receptionist-for-law-firms/' },
  { publisher: 'Hennessey Digital', url: 'https://hennessey.com/blog/best-answering-services-for-law-firms/' },
  { publisher: 'LawFuel (2023)', url: 'https://www.lawfuel.com/which-is-the-best-law-firm-answering-service' },
  { publisher: 'AIRA', url: 'https://www.getaira.io/blog/law-firm-answering-service' },
  { publisher: 'Stork.ai', url: 'https://www.stork.ai/blog/ai-receptionist-for-law-firms-2026' },
  { publisher: 'VIP Marketing', url: 'https://vipmarketing.com/blog/best-answering-services-for-law-firms' },
  { publisher: 'iPlum', url: 'https://www.iplum.com/blog/top-7-virtual-receptionist-reviews-for-law-firms-you-need-to-know' },
  { publisher: 'ServiceAgent', url: 'https://serviceagent.ai/blogs/best-virtual-receptionist-for-law-firms/' },
  { publisher: 'Fit Small Business', url: 'https://fitsmallbusiness.com/best-answering-services-for-law-firms/' },
  { publisher: 'LAW.co', url: 'https://law.co/blog/answering-services' },
  { publisher: 'Dialzara', url: 'https://dialzara.com/blog/best-legal-intake-answering-services' },
  { publisher: 'CaseGen', url: 'https://www.casegen.ai/best-virtual-receptionist-for-law-firms/' },
  { publisher: 'Solvea', url: 'https://solvea.cx/blog/best-ai-receptionist-for-law-firms' },
  { publisher: 'BOSS Magazine', url: 'https://thebossmagazine.com/post/the-new-standard-of-legal-intake-ranking-the-top-4-legal-answering-services-for-2026/' },
  { publisher: 'Ambs Call Center', url: 'https://www.ambscallcenter.com/blog/best-answering-service-for-lawyers' },
  { publisher: 'LawFuel (2026)', url: 'https://www.lawfuel.com/top-8-legal-answering-services-for-law-firms-in-2026/' },
  { publisher: 'Goodcall', url: 'https://www.goodcall.com/answering-services/lawyers' },
];

export const RELATED = [
  { label: 'Boltcall vs Smith.ai', href: '/compare/boltcall-vs-smith-ai' },
  { label: 'Boltcall vs Ruby', href: '/compare/boltcall-vs-ruby' },
  { label: 'Boltcall vs Answering Legal', href: '/compare/boltcall-vs-answering-legal' },
  { label: 'Boltcall vs LEX Reception', href: '/compare/boltcall-vs-lex-reception' },
  { label: 'Boltcall vs Abby Connect', href: '/compare/boltcall-vs-abby-connect' },
  { label: 'Lawyer answering service', href: '/industries/lawyer-answering-service' },
  { label: 'Law firm security', href: '/law-firm-security' },
  { label: 'Boltcall pricing', href: '/pricing' },
];

/** Footnote numbers follow this order. */
export const SOURCES: Record<string, Source> = {
  rbHome: { title: 'Ruby home page', url: 'https://www.ruby.com/' },
  rbAi: { title: 'Ruby AI', url: 'https://www.ruby.com/ai/' },
  rbLegal: { title: 'Ruby for law firms', url: 'https://www.ruby.com/industries/legal/' },
  rbPricing: { title: 'Ruby plans and pricing', url: 'https://www.ruby.com/plans-and-pricing/' },
  rbFaq: { title: 'Ruby FAQs', url: 'https://www.ruby.com/faqs/' },
  rbTerms: { title: 'Ruby Terms', url: 'https://www.ruby.com/terms/' },
  rbIntegrations: { title: 'Ruby integrations', url: 'https://www.ruby.com/solutions/integrations/' },
  smHome: { title: 'Smith.ai home page', url: 'https://smith.ai/' },
  smAi: { title: 'Smith.ai AI Receptionist pricing', url: 'https://smith.ai/pricing/ai-receptionist' },
  smHv: { title: 'Smith.ai Virtual Receptionist pricing', url: 'https://smith.ai/pricing/receptionists' },
  smAiProduct: { title: 'Smith.ai AI Receptionist', url: 'https://smith.ai/ai-receptionist' },
  smLegal: { title: 'Smith.ai legal and law firm answering service', url: 'https://smith.ai/industries/legal-law-firms-answering-service' },
  smClio: { title: 'Smith.ai Clio integration', url: 'https://smith.ai/integrates-with/clio-brand' },
  smMycase: { title: 'Smith.ai 8am MyCase integration', url: 'https://smith.ai/integrates-with/mycase' },
  alVsRuby: { title: 'Answering Legal vs Ruby', url: 'https://www.answeringlegal.com/al-vs-ruby' },
  alLlms: { title: 'Answering Legal service summary (llms.txt)', url: 'https://www.answeringlegal.com/llms.txt' },
  alChatbot: { title: 'Answering Legal intake chatbot pricing', url: 'https://www.answeringlegal.com/intake-chatbot-pricing' },
  alPricing: { title: 'Answering Legal plans and pricing', url: 'https://www.answeringlegal.com/answering-legal-plans-pricing' },
  alCost: { title: 'Answering Legal answering service cost', url: 'https://www.answeringlegal.com/answering-service-cost' },
  al247: { title: 'Answering Legal 24/7 live answering', url: 'https://www.answeringlegal.com/our-services/24-7-live-answering' },
  alHome: { title: 'Answering Legal home page', url: 'https://www.answeringlegal.com/' },
  alIntegrations: { title: 'Answering Legal integrations', url: 'https://www.answeringlegal.com/integrations' },
  alClioGrow: { title: 'Answering Legal Clio Grow integration', url: 'https://www.answeringlegal.com/integrations/clio-grow' },
  alTerms: { title: 'Answering Legal Terms of Service', url: 'https://www.answeringlegal.com/terms-of-service' },
  alTrial: { title: 'Answering Legal setup and customization', url: 'https://www.answeringlegal.com/how-it-works/setup-and-customization' },
  alVideo: { title: 'Answering Legal legal video calls pricing', url: 'https://www.answeringlegal.com/legal-video-calls-pricing' },
  lexFaqs: { title: 'LEX Reception FAQs', url: 'https://www.lexreception.com/faqs' },
  lexRegister: { title: 'LEX Reception plans and pricing form', url: 'https://www.lexreception.com/register' },
  lexHome: { title: 'LEX Reception home page', url: 'https://www.lexreception.com/' },
  lexBilingual: { title: 'LEX Reception bilingual answering service', url: 'https://www.lexreception.com/services/bilingual-answering-service' },
  lexClio: { title: 'LEX Reception Clio integration', url: 'https://www.lexreception.com/integrations/clio' },
  lexIntegrations: { title: 'LEX Reception integrations', url: 'https://www.lexreception.com/integrations' },
  lexIntake: { title: 'LEX Reception legal intake', url: 'https://www.lexreception.com/services/legal-intake' },
  lexChat: { title: 'LEX Reception live chat', url: 'https://www.lexreception.com/tools/live-chatsupport' },
  lexOutbound: { title: 'LEX Reception legal outbound calls', url: 'https://www.lexreception.com/services/legal-outbound-call' },
  lexTerms: { title: 'LEX Reception Terms of Service', url: 'https://www.lexreception.com/termsofservice' },
  abbyPricing: { title: 'Abby Connect pricing', url: 'https://www.abby.com/pricing/' },
  abbyLegal: { title: 'Abby Connect for legal', url: 'https://www.abby.com/industries/legal/' },
  abbyIntegrations: { title: 'Abby Connect integrations', url: 'https://www.abby.com/integrations/' },
  abbyClio: { title: 'Abby Connect Clio Manage integration', url: 'https://www.abby.com/integration/clio-manage/' },
  patPricing: { title: 'PATLive pricing', url: 'https://www.patlive.com/pricing/' },
  patLegal: { title: 'PATLive legal answering service', url: 'https://www.patlive.com/industries/legal/' },
  patIntegrations: { title: 'PATLive integrations (site data feed with native and Zapier tags)', url: 'https://www.patlive.com/wp-json/wp/v2/integrations' },
  nexaPricing: { title: 'Nexa pricing', url: 'https://www.nexa.com/pricing' },
  nexaTerms: { title: 'Nexa terms and conditions', url: 'https://www.nexa.com/legal/terms-conditions/' },
  nexaLegal: { title: 'Nexa legal answering service', url: 'https://www.nexa.com/industries/legal/' },
  nexaAi: { title: 'Nexa Voice + AI', url: 'https://www.nexa.com/services/voice-ai/' },
  nexaIntegrations: { title: 'Nexa integrations', url: 'https://www.nexa.com/integrations' },
  bobHome: { title: 'Back Office Betties home page', url: 'https://backofficebetties.com/' },
  bobPricing: { title: 'Back Office Betties pricing', url: 'https://backofficebetties.com/pricing/' },
  poshFaqs: { title: 'Posh FAQs', url: 'https://posh.com/faqs/' },
  poshAttorney: { title: 'Posh attorney answering service', url: 'https://posh.com/industry/attorney-answering-service/' },
  poshPricing: { title: 'Posh pricing', url: 'https://posh.com/pricing/' },
  poshTerms: { title: 'Posh Terms', url: 'https://posh.com/terms/' },
  poshAi: { title: 'Posh AI receptionist', url: 'https://posh.com/ai/' },
  poshIntegrations: { title: 'Posh integrations', url: 'https://posh.com/integrations/' },
  poshBilingual: { title: 'Posh bilingual answering service', url: 'https://posh.com/services/bilingual-answering-service/' },
  mpPricing: { title: 'Moneypenny US pricing', url: 'https://www.moneypenny.com/us/pricing' },
  mpAiPage: { title: 'Moneypenny US AI Receptionist', url: 'https://www.moneypenny.com/us/ai-receptionist' },
  mpTerms: {
    title: 'Moneypenny US Phone Answering terms and conditions (PDF, updated May 2026)',
    url: 'https://cdn.prod.website-files.com/6a06eb94845f8e1701b7e7f1/6aaa99366734be94e463cc1b_us-terms-and-conditions.pdf',
  },
  mpAiTerms: {
    title: 'Moneypenny US AI Receptionist terms and conditions (PDF, updated April 2026)',
    url: 'https://cdn.prod.website-files.com/6a06eb94845f8e1701b7e7f1/6aaa9936e7318b5aa1048c25_us-ai-terms-and-conditions.pdf',
  },
  mpBilingual: { title: 'Moneypenny US bilingual answering service', url: 'https://www.moneypenny.com/us/bilingual-answering-service' },
  mpLegal: { title: 'Moneypenny US legal answering services', url: 'https://www.moneypenny.com/us/legal-answering-services' },
};
