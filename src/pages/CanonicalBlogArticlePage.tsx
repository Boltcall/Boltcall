import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import BlogClosingCta from '../components/blog/BlogClosingCta';
import BlogRelatedArticles from '../components/blog/BlogRelatedArticles';
import { useTableOfContents } from '../hooks/useTableOfContents';
import { updateMetaDescription } from '../lib/utils';
import { createArticleSchema, createBreadcrumbSchema, createFAQSchema, injectSchemas } from '../lib/schema';
import { getAbsoluteBlogPreviewImage, updateBlogPreviewMeta } from '../lib/blogPreviewImages';
import seoAutopilotOverrides from '../content/seo-autopilot-overrides.json';
import { applySeoAutopilotOverride, type SeoAutopilotOverride } from '../lib/seoAutopilotOverride';

type BlogIntent = 'how-to' | 'comparison' | 'buyer' | 'industry' | 'cost' | 'stats' | 'faq' | 'explainer';

interface FaqItem {
  question: string;
  answer: string;
}

interface BlogSection {
  title: string;
  paragraphs?: string[];
  links?: Array<{ label: string; href: string }>;
  bullets?: string[];
  ordered?: Array<{
    title: string;
    body: string;
  }>;
  table?: {
    headers: string[];
    rows: string[][];
  };
  quote?: {
    text: string;
    byline: string;
  };
}

interface BlogArticle {
  path: string;
  title: string;
  description: string;
  intro: string;
  date: string;
  readTime: string;
  intent: BlogIntent;
  sections: BlogSection[];
  faqs: FaqItem[];
  conclusion: string[];
}

interface BusinessProfile {
  audience: string;
  buyer: string;
  serviceMoment: string;
  bookedOutcome: string;
  channels: string[];
  urgency: string;
  team: string;
  proofMetric: string;
}

const titleOverrides: Record<string, string> = {
  '/blog/the-new-reality-for-local-businesses': 'The New Reality for Local Businesses',
  '/blog/why-speed-matters': 'Why Speed Matters for Local Businesses',
  '/blog/complete-guide-to-seo': 'The Complete Guide to SEO for Local Businesses',
  '/blog/best-ai-receptionist-tools': 'Best AI Receptionist Tools for Small Businesses',
  '/blog/how-ai-receptionist-works': 'How an AI Receptionist Works',
  '/blog/ai-answering-service-small-business': 'AI Answering Service for Small Business',
  '/blog/is-ai-receptionist-worth-it': 'Is an AI Receptionist Worth It?',
  '/blog/how-to-make-ai-receptionist': 'How to Make an AI Receptionist',
  '/blog/instant-lead-reply-guide': 'What Instant Lead Reply Means',
  '/blog/hvac-ai-lead-response': 'How HVAC Companies Book More Calls with AI Lead Response',
  '/blog/dental-ai-lead-response': 'AI Lead Response for Dental Offices',
  '/blog/ai-receptionist-real-estate-agents': 'AI Receptionist for Real Estate Agents',
  '/blog/ai-appointment-scheduling-hvac': 'AI Appointment Scheduling for HVAC',
  '/blog/setup-instant-lead-reply': 'How to Set Up Instant Lead Reply',
  '/blog/how-instant-lead-reply-works': 'How Instant Lead Reply Works',
  '/blog/how-to-schedule-text': 'How to Schedule Appointments by Text',
  '/blog/automatic-google-reviews': 'Automatic Google Reviews for Local Businesses',
  '/blog/benefits-of-outsourced-reception-services': 'Benefits of Outsourced Reception Services',
  '/blog/phone-call-scripts': 'Phone Call Scripts for Local Businesses',
  '/blog/understanding-live-answering-service-costs': 'Live Answering Service Costs Explained',
  '/blog/tips-for-professional-telephone-etiquette': 'Professional Telephone Etiquette Tips',
  '/blog/answering-service-scheduling': 'Answering Service Appointment Scheduling',
  '/blog/top-10-ai-receptionist-agencies': 'Top AI Receptionist Agencies',
  '/blog/create-gemini-gem-business-assistant': 'Create a Gemini Gem Business Assistant',
  '/blog/5-signs-you-need-ai-receptionist': '5 Signs You Need an AI Receptionist',
  '/blog/speed-to-lead-local-business': 'Speed to Lead for Local Businesses',
  '/blog/ai-receptionist-cost-pricing': 'AI Receptionist Cost and Pricing',
  '/blog/ai-vs-human-receptionist': 'AI vs Human Receptionist',
  '/blog/ai-chatbot-vs-live-chat-phone-answering': 'AI Chatbot vs Live Chat vs Phone Answering',
  '/blog/best-ai-receptionist-small-business': 'Best AI Receptionist for Small Business',
  '/blog/ai-phone-answering-plumbers': 'AI Phone Answering for Plumbers',
  '/blog/what-is-ai-receptionist-guide': 'What Is an AI Receptionist?',
  '/blog/ai-phone-answering-dentists': 'AI Phone Answering for Dentists',
  '/blog/best-after-hours-answering-service': 'Best After-Hours Answering Service',
  '/blog/ai-chatbot-vs-live-chat-phone-comparison': 'AI Chatbot vs Live Chat vs Phone Answering',
  '/blog/ai-receptionist-for-plumbers': 'AI Receptionist for Plumbers',
  '/blog/ai-receptionist-worth-it-roi': 'AI Receptionist ROI Guide',
  '/blog/missed-calls-statistics-local-business-2026': 'Missed Call Statistics for Local Businesses',
  '/blog/best-ai-receptionist-home-services': 'Best AI Receptionist for Home Services',
  '/blog/ai-agent-for-small-business-24-7-call-answering': 'AI Agent for 24/7 Call Answering',
  '/blog/roofing-company-stop-losing-leads-missed-calls': 'How Roofing Companies Stop Losing Missed-Call Leads',
  '/blog/home-service-google-ads-lead-follow-up': 'Home Service Google Ads Lead Follow-Up',
  '/blog/best-ai-answering-service-dental-medical-practice': 'Best AI Answering Service for Dental and Medical Practices',
  '/blog/after-hours-lead-response-home-services': 'After-Hours Lead Response for Home Services',
  '/blog/ai-receptionist-med-spas': 'AI Receptionist for Med Spas',
  '/blog/solar-ai-lead-response': 'Solar AI Lead Response',
  '/blog/ai-receptionist-hvac-faq': 'AI Receptionist for HVAC FAQ',
  '/blog/ai-receptionist-dentist-faq': 'AI Receptionist for Dentists FAQ',
  '/blog/ai-receptionist-plumber-faq': 'AI Receptionist for Plumbers FAQ',
  '/blog/ai-receptionist-lawyer-faq': 'AI Receptionist for Lawyers FAQ',
  '/blog/ai-receptionist-medspa-faq': 'AI Receptionist for Med Spas FAQ',
  '/blog/ai-receptionist-solar-faq': 'AI Receptionist for Solar FAQ',
  '/blog/ai-receptionist-vet-faq': 'AI Receptionist for Vets FAQ',
  '/blog/how-to-set-up-ai-phone-answering-vet-clinic': 'How to Set Up AI Phone Answering for a Vet Clinic',
  '/blog/never-miss-a-call-after-business-hours': 'Never Miss a Call After Business Hours',
  '/blog/whatsapp-appointment-booking-plumbers': 'WhatsApp Appointment Booking for Plumbers',
  '/blog/ai-receptionist-for-dentists': 'AI Receptionist for Dentists',
  '/blog/ai-receptionist-for-law-firms': 'AI Receptionist for Law Firms',
  '/blog/speed-to-lead-for-law-firms': 'Speed to Lead for Law Firms',
};

function titleFromPath(path: string) {
  if (titleOverrides[path]) return titleOverrides[path];
  return path
    .split('/')
    .filter(Boolean)
    .at(-1)!
    .split('-')
    .map((word) => {
      if (['ai', 'seo', 'roi', 'hvac', 'sms', 'faq'].includes(word)) return word.toUpperCase();
      if (word === 'vs') return 'vs';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function topicFromTitle(title: string) {
  return title
    .replace(/\?/g, '')
    .replace(/\b(Guide|Explained|Tips|FAQ|FAQs)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectIntent(path: string, title: string): BlogIntent {
  const haystack = `${path} ${title}`.toLowerCase();
  if (haystack.includes(' vs ') || haystack.includes('-vs-') || haystack.includes('comparison')) return 'comparison';
  if (haystack.includes('how-to') || haystack.includes('how ') || haystack.includes('setup') || haystack.includes('set-up') || haystack.includes('create')) return 'how-to';
  if (haystack.includes('best') || haystack.includes('top-10') || haystack.includes('tools') || haystack.includes('agencies')) return 'buyer';
  if (haystack.includes('cost') || haystack.includes('pricing') || haystack.includes('worth') || haystack.includes('roi')) return 'cost';
  if (haystack.includes('statistics') || haystack.includes('stats')) return 'stats';
  if (haystack.includes('faq')) return 'faq';
  if (haystack.includes('plumber') || haystack.includes('hvac') || haystack.includes('dental') || haystack.includes('law') || haystack.includes('roofing') || haystack.includes('med spa') || haystack.includes('solar') || haystack.includes('vet') || haystack.includes('real estate')) return 'industry';
  return 'explainer';
}

function profileFor(path: string, title: string): BusinessProfile {
  const haystack = `${path} ${title}`.toLowerCase();
  const base: BusinessProfile = {
    audience: 'local service businesses',
    buyer: 'a nearby customer with an active problem',
    serviceMoment: 'a call, form, text, or missed call that shows buying intent',
    bookedOutcome: 'a qualified appointment on the calendar',
    channels: ['phone calls', 'missed calls', 'web forms', 'texts', 'after-hours messages'],
    urgency: 'same-day response',
    team: 'owner, dispatcher, front desk, or office manager',
    proofMetric: 'booked jobs from first-touch leads',
  };

  if (haystack.includes('hvac')) {
    return {
      audience: 'HVAC companies',
      buyer: 'a homeowner dealing with heat, air, comfort, or system failure',
      serviceMoment: 'an emergency repair call, tune-up request, replacement quote, or after-hours message',
      bookedOutcome: 'a confirmed service call or estimate visit',
      channels: ['inbound calls', 'missed calls', 'Google Ads forms', 'texts', 'after-hours messages'],
      urgency: 'same-day booking',
      team: 'dispatcher or owner',
      proofMetric: 'service calls booked from urgent inquiries',
    };
  }

  if (haystack.includes('dentist') || haystack.includes('dental')) {
    return {
      audience: 'dental offices',
      buyer: 'a patient looking for an appointment, emergency help, or insurance clarity',
      serviceMoment: 'a missed call, new-patient form, whitening inquiry, or emergency appointment request',
      bookedOutcome: 'a scheduled appointment with the right patient context',
      channels: ['front desk calls', 'missed calls', 'website forms', 'texts', 'after-hours voicemail'],
      urgency: 'first available appointment',
      team: 'front desk team',
      proofMetric: 'new-patient appointments booked',
    };
  }

  if (haystack.includes('plumber')) {
    return {
      audience: 'plumbing companies',
      buyer: 'a homeowner with a leak, clog, water heater issue, or urgent repair',
      serviceMoment: 'a call during a job, an after-hours emergency, or a quote request from search',
      bookedOutcome: 'a dispatched job or scheduled estimate',
      channels: ['phone calls', 'missed calls', 'Google Local Services leads', 'texts', 'WhatsApp messages'],
      urgency: 'immediate triage',
      team: 'owner, dispatcher, or technician',
      proofMetric: 'urgent jobs recovered from missed calls',
    };
  }

  if (haystack.includes('law')) {
    return {
      audience: 'law firms',
      buyer: 'a prospective client comparing firms while the issue feels urgent',
      serviceMoment: 'an intake call, consultation request, form fill, or missed after-hours inquiry',
      bookedOutcome: 'a qualified consultation with conflict and practice-area details captured',
      channels: ['intake calls', 'missed calls', 'contact forms', 'texts', 'after-hours inquiries'],
      urgency: 'same-hour intake',
      team: 'intake coordinator or managing attorney',
      proofMetric: 'consultations booked from qualified leads',
    };
  }

  if (haystack.includes('med spa') || haystack.includes('medspa')) {
    return {
      audience: 'med spas',
      buyer: 'a client comparing treatments, availability, trust, and price',
      serviceMoment: 'a treatment inquiry, consultation request, Instagram DM, or missed call',
      bookedOutcome: 'a booked consultation or treatment visit',
      channels: ['calls', 'forms', 'texts', 'social messages', 'after-hours inquiries'],
      urgency: 'quick consult booking',
      team: 'front desk or clinic manager',
      proofMetric: 'consultations booked from treatment inquiries',
    };
  }

  if (haystack.includes('roofing')) {
    return {
      audience: 'roofing companies',
      buyer: 'a homeowner worried about leaks, storm damage, insurance, or replacement cost',
      serviceMoment: 'a storm-season call, inspection request, quote form, or missed call',
      bookedOutcome: 'a scheduled inspection or estimate',
      channels: ['phone calls', 'missed calls', 'Google Ads forms', 'texts', 'after-hours messages'],
      urgency: 'fast inspection scheduling',
      team: 'owner, estimator, or office manager',
      proofMetric: 'inspections booked from inbound leads',
    };
  }

  if (haystack.includes('solar')) {
    return {
      audience: 'solar companies',
      buyer: 'a homeowner comparing savings, financing, availability, and trust',
      serviceMoment: 'a quote request, callback request, missed call, or paid-search lead',
      bookedOutcome: 'a qualified consultation or site assessment',
      channels: ['calls', 'forms', 'texts', 'paid leads', 'after-hours inquiries'],
      urgency: 'same-day qualification',
      team: 'sales coordinator or owner',
      proofMetric: 'qualified consultations booked',
    };
  }

  if (haystack.includes('vet')) {
    return {
      audience: 'veterinary clinics',
      buyer: 'a pet owner trying to book care, get triage, or understand availability',
      serviceMoment: 'a missed call, urgent care request, new-client form, or after-hours question',
      bookedOutcome: 'the right appointment type or escalation path',
      channels: ['front desk calls', 'missed calls', 'web forms', 'texts', 'after-hours messages'],
      urgency: 'clear triage and booking',
      team: 'front desk or practice manager',
      proofMetric: 'appointments recovered from missed inquiries',
    };
  }

  if (haystack.includes('real estate')) {
    return {
      audience: 'real estate agents',
      buyer: 'a buyer, seller, or renter who expects a fast callback',
      serviceMoment: 'a property inquiry, valuation request, missed call, or showing request',
      bookedOutcome: 'a booked consultation, showing, or seller conversation',
      channels: ['calls', 'forms', 'texts', 'portal leads', 'after-hours inquiries'],
      urgency: 'same-hour follow-up',
      team: 'agent or assistant',
      proofMetric: 'appointments booked from portal and listing leads',
    };
  }

  if (haystack.includes('google ads')) {
    return {
      ...base,
      serviceMoment: 'a paid lead that costs money before it ever reaches the team',
      bookedOutcome: 'a paid lead answered, qualified, and moved toward booking',
      channels: ['Google Ads forms', 'call extensions', 'landing-page forms', 'missed calls', 'texts'],
      proofMetric: 'ad leads contacted before they go cold',
    };
  }

  if (haystack.includes('seo') || haystack.includes('ranking') || haystack.includes('ai answers') || haystack.includes('mentions')) {
    return {
      ...base,
      buyer: 'a searcher who found the business and is deciding who to contact',
      serviceMoment: 'the moment visibility becomes a call, form, or message',
      bookedOutcome: 'search demand converted into a real sales conversation',
      channels: ['organic calls', 'map-pack calls', 'website forms', 'AI answer referrals', 'texts'],
      proofMetric: 'search visitors who become booked leads',
    };
  }

  return base;
}

function listSentence(items: string[]) {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function buildSections(intent: BlogIntent, topic: string, profile: BusinessProfile): BlogSection[] {
  const sharedTakeaways: BlogSection = {
    title: 'Key Takeaways',
    bullets: [
      `The real goal is to turn ${profile.serviceMoment} into ${profile.bookedOutcome}.`,
      `Your buyer is usually ${profile.buyer}, so slow response feels like uncertainty, not professionalism.`,
      `The strongest setup protects ${listSentence(profile.channels)} without forcing the ${profile.team} to watch every channel all day.`,
      `Measure it by ${profile.proofMetric}, not by how many automations exist in the account.`,
    ],
  };

  const templates: Record<BlogIntent, BlogSection[]> = {
    'how-to': [
      sharedTakeaways,
      {
        title: 'Start With Leakage',
        paragraphs: [
          `Start with the places where demand already exists: ${listSentence(profile.channels)}. Those channels are not admin noise. They are the front door to revenue.`,
          `For ${profile.audience}, the first fix is not a bigger CRM project. It is making sure ${profile.serviceMoment} gets answered before the buyer has a reason to keep searching.`,
        ],
        bullets: [
          'Answer immediately with a clear, human-sounding first response.',
          'Capture the customer name, reason for reaching out, location, and preferred next step.',
          `Route urgent cases toward ${profile.urgency} instead of a generic callback queue.`,
          `Send the ${profile.team} a clean summary so the human handoff starts informed.`,
        ],
      },
      {
        title: 'Map The First Minute',
        paragraphs: [
          'The first minute should feel boringly clear to the customer. They reached out, got acknowledged, answered a few useful questions, and understood what happens next.',
          `That is especially important when the buyer is ${profile.buyer}. They are judging speed, confidence, and whether the business feels easy to work with.`,
        ],
        ordered: [
          { title: 'Acknowledge the lead', body: 'Reply instantly and name the reason for the response so the buyer knows they are in the right place.' },
          { title: 'Collect only essentials', body: 'Ask for the information needed to route, price, schedule, or escalate. Save the long intake for later.' },
          { title: 'Confirm the next step', body: `Move toward ${profile.bookedOutcome}, a team callback, or a clear escalation path.` },
          { title: 'Notify the team', body: `Give the ${profile.team} the context needed to act without rereading a messy transcript.` },
        ],
      },
      {
        title: 'Avoid Revenue Traps',
        bullets: [
          'Asking too many intake questions before offering help.',
          `Letting ${profile.serviceMoment} sit until the next business day.`,
          'Using different scripts for calls, texts, and forms.',
          'Sending leads into a tool nobody checks.',
          'Optimizing the dashboard while the first response is still slow.',
        ],
      },
      {
        title: 'Measure Week One',
        paragraphs: [
          `Track response time, contact rate, ${profile.proofMetric}, human handoffs, and no-shows. That tells you whether the system is creating booked work or just producing tidy activity.`,
          'The best first week is not perfect. It is measurable. You should know which leads were saved, which still leaked, and which script needs tightening.',
        ],
      },
    ],
    comparison: [
      sharedTakeaways,
      {
        title: 'Quick Verdict',
        paragraphs: [
          `${topic} comes down to speed, coverage, consistency, setup burden, and total cost. The best choice is the one that captures demand from ${listSentence(profile.channels)} without creating another tool the team quietly avoids.`,
          `For ${profile.audience}, a broader platform can be useful later. The urgent question is whether today's lead gets answered, qualified, and moved toward ${profile.bookedOutcome}.`,
        ],
      },
      {
        title: 'Side-by-Side Tradeoffs',
        table: {
          headers: ['Option', 'Best fit', 'Main trade-off'],
          rows: [
            ['Boltcall', `${profile.audience} that need instant lead response and booking support`, 'Focused on speed-to-lead, not a full enterprise CRM suite'],
            ['Human-only coverage', 'Teams with staffed desks, low call spikes, and predictable hours', 'Availability breaks during nights, lunch, jobs, weekends, and busy seasons'],
            ['DIY automation stack', 'Technical operators who want full control over every workflow', 'More setup, more maintenance, and more places for leads to leak'],
            ['All-in-one CRM', 'Teams that need deep pipeline, marketing, and sales operations', 'Can be heavy when the immediate problem is simply answering and booking leads'],
          ],
        },
      },
      {
        title: 'Where Boltcall Fits',
        paragraphs: [
          `Boltcall fits when ${profile.audience} want the first response handled immediately, without asking the ${profile.team} to watch every channel all day.`,
          `It is built around the revenue moment: ${profile.buyer} reaches out, gets answered, gets qualified, and moves toward ${profile.bookedOutcome}.`,
        ],
      },
      {
        title: 'When Others Fit',
        paragraphs: [
          'Choose a broader platform when you need deep CRM customization, white-label agency features, or complex internal workflows before lead response.',
          `Choose a human-only model when call volume is low, hours are short, and someone reliable already owns ${listSentence(profile.channels)}. Choose Boltcall when missed leads are the urgent problem.`,
        ],
      },
      {
        title: 'Decision Rules',
        bullets: [
          `If speed is the bottleneck, prioritize instant response before more pipeline reporting.`,
          `If the team is overwhelmed, automate intake and routing before adding another inbox.`,
          `If paid demand is involved, judge tools by ${profile.proofMetric}, not setup screenshots.`,
          'If the customer experience feels inconsistent, standardize the first response across every channel.',
        ],
      },
    ],
    buyer: [
      sharedTakeaways,
      {
        title: 'What Matters Most',
        bullets: [
          'Fast setup without a long implementation project.',
          `Coverage for ${listSentence(profile.channels)}.`,
          'Clear handoff rules when a lead needs a person.',
          `Pricing that makes sense compared with one recovered ${profile.bookedOutcome}.`,
          'A simple operating model the team will actually use after week one.',
        ],
      },
      {
        title: 'The Best-Fit Test',
        paragraphs: [
          `The right ${topic.toLowerCase()} should make the first week easier, not busier. If the tool needs weeks of configuration before it answers ${profile.serviceMoment}, it is solving the wrong problem first.`,
          `A good fit should help the ${profile.team} feel more in control, not more buried under alerts.`,
        ],
      },
      {
        title: 'Pricing Reality',
        paragraphs: [
          `Do not compare tools only by subscription price. Compare them by missed jobs recovered, staff time saved, and how many leads move from inquiry to ${profile.bookedOutcome}.`,
          'The cheaper tool is not cheaper if it still lets high-intent leads wait. The expensive tool is not expensive if it reliably saves jobs you were already paying to attract.',
        ],
      },
      {
        title: 'Recommendation Matrix',
        table: {
          headers: ['Need', 'Best choice', 'Why'],
          rows: [
            ['Stop missing leads now', 'Boltcall', 'Fastest path to instant answer, qualification, and booking support'],
            ['Run a full marketing agency stack', 'All-in-one CRM', 'Better for many clients, funnels, and white-label workflows'],
            ['Handle rare low-volume calls', 'Simple answering service', 'Can work when lead value and urgency are low'],
            ['Build custom operations', 'DIY stack', 'Works only when someone owns maintenance'],
          ],
        },
      },
      {
        title: 'Final Pick Criteria',
        paragraphs: [
          `Pick the option that protects the first few minutes of every lead. For ${profile.audience}, that is where trust, availability, and booking momentum are usually won or lost.`,
        ],
      },
    ],
    industry: [
      sharedTakeaways,
      {
        title: 'Why Speed Wins',
        paragraphs: [
          `${topic} is usually urgent, local, and competitive. The customer is not waiting politely for one business to call back. They are looking for the fastest credible answer.`,
          `That matters because the buyer is ${profile.buyer}. They want confidence quickly, and the business that creates that confidence first has the advantage.`,
        ],
      },
      {
        title: 'Highest-Intent Moments',
        bullets: [
          `${profile.serviceMoment}.`,
          `A message asking about ${profile.urgency}, price, availability, or next steps.`,
          'A paid-search lead that expects a callback quickly.',
          'An after-hours inquiry that would normally wait until morning.',
          'A repeat customer who needs help but reaches the team during a busy window.',
        ],
      },
      {
        title: 'Workflow That Wins',
        paragraphs: [
          `Answer immediately, collect the customer name and situation, determine urgency, confirm fit, and move toward ${profile.bookedOutcome}.`,
          `When a human is needed, send the ${profile.team} a short summary with the exact next action. That keeps automation from becoming another pile of notes.`,
        ],
        ordered: [
          { title: 'Catch the lead', body: `Cover ${listSentence(profile.channels)} so the buyer gets a response in seconds.` },
          { title: 'Qualify the need', body: 'Ask enough to understand urgency, fit, location, and preferred timing.' },
          { title: 'Book or route', body: `Push qualified demand toward ${profile.bookedOutcome} or a clean team handoff.` },
          { title: 'Follow up', body: 'Confirm details and keep the lead warm until the next step happens.' },
        ],
      },
      {
        title: 'What Teams Notice',
        paragraphs: [
          'The biggest change is calm. Fewer leads vanish, fewer callbacks pile up, and the team gets cleaner information before deciding what needs a human response.',
          `Over time, ${profile.audience} see which channels create the best opportunities because every first-touch lead is captured in the same operating rhythm.`,
        ],
      },
      {
        title: 'Metrics To Watch',
        table: {
          headers: ['Metric', 'Why it matters', 'Healthy direction'],
          rows: [
            ['First response time', 'Shows whether buyers wait or get helped immediately', 'Down'],
            ['Contact rate', 'Shows whether leads are reached while intent is still fresh', 'Up'],
            [profile.proofMetric, 'Connects speed-to-lead with revenue', 'Up'],
            ['Human handoff rate', 'Shows which situations still need the team', 'Clear and intentional'],
          ],
        },
      },
    ],
    cost: [
      sharedTakeaways,
      {
        title: 'The Real Cost',
        paragraphs: [
          `The real cost of ${topic.toLowerCase()} is not the software bill. It is the difference between leads answered now and leads answered after the buyer has already booked someone else.`,
          `For ${profile.audience}, that cost hides inside missed calls, slow form follow-up, after-hours voicemail, and paid leads that never become ${profile.bookedOutcome}.`,
        ],
      },
      {
        title: 'Simple ROI Math',
        bullets: [
          `Estimate how many ${listSentence(profile.channels)} are missed or delayed each month.`,
          'Multiply by average job, case, appointment, or customer value.',
          'Apply a conservative close rate.',
          'Compare recovered revenue against the monthly platform cost.',
          `Review ${profile.proofMetric} monthly so the math stays tied to reality.`,
        ],
      },
      {
        title: 'Cost Drivers',
        paragraphs: [
          'The biggest drivers are channel coverage, call volume, booking complexity, integrations, and whether edge cases need human backup.',
          `A business with urgent demand from ${listSentence(profile.channels)} should price the system against protected revenue, not against a generic phone bill.`,
        ],
      },
      {
        title: 'Payback Signals',
        paragraphs: [
          `Payback gets faster when ${profile.audience} already have demand but lose it to slow follow-up. One recovered high-value job, case, appointment, or consultation can change the monthly math.`,
          'If the team already answers every lead instantly, the upside is smaller. If the team regularly calls back late, the upside is usually sitting in plain sight.',
        ],
      },
    ],
    stats: [
      sharedTakeaways,
      {
        title: 'Numbers That Matter',
        paragraphs: [
          `${topic} should be read as an operating signal, not trivia. The useful question is which number points to revenue leaking from the business today.`,
          `For ${profile.audience}, the numbers worth watching are the ones that connect ${profile.serviceMoment} to ${profile.bookedOutcome}.`,
        ],
      },
      {
        title: 'What The Data Means',
        bullets: [
          'Slow response reduces contact rates.',
          'Missed calls turn paid demand into wasted spend.',
          'After-hours inquiries often have high buying intent.',
          'Consistent follow-up raises the chance of booking.',
          `Cleaner intake helps the ${profile.team} prioritize real opportunities instead of guessing from partial notes.`,
        ],
      },
      {
        title: 'Where To Improve',
        paragraphs: [
          `Start with missed calls, form response time, and after-hours coverage. These are easy to measure and usually have direct revenue impact for ${profile.audience}.`,
          'Then separate speed from quality. A fast response that fails to qualify, route, or book is only faster noise.',
        ],
      },
      {
        title: 'Turn Data Into Action',
        paragraphs: [
          `Pick one metric, improve it for seven days, and compare ${profile.proofMetric} before and after. That keeps the work grounded in revenue instead of dashboards.`,
        ],
      },
      {
        title: 'Operating Scorecard',
        table: {
          headers: ['Metric', 'Question it answers', 'Action if weak'],
          rows: [
            ['Response time', 'How long does intent wait?', 'Automate first reply and routing'],
            ['Contact rate', 'Are leads reached while still active?', 'Add instant callback or text follow-up'],
            ['Booking rate', 'Does response become revenue?', 'Improve qualification and scheduling paths'],
            ['Leakage reason', 'Where do leads still drop?', 'Fix the channel, script, or handoff'],
          ],
        },
      },
    ],
    faq: [
      sharedTakeaways,
      {
        title: 'Short Answer',
        paragraphs: [
          `${topic} helps when the business needs faster, more consistent lead response without hiring another person just to watch the phone and inbox.`,
          `The practical goal is simple: protect ${profile.serviceMoment} and move qualified demand toward ${profile.bookedOutcome}.`,
        ],
      },
      {
        title: 'What It Handles',
        bullets: [
          'Initial call answer.',
          'Missed-call recovery.',
          'Lead qualification.',
          `Booking support for ${profile.bookedOutcome}.`,
          'Follow-up reminders.',
          `Clean handoff notes for the ${profile.team}.`,
        ],
      },
      {
        title: 'Where Humans Stay',
        paragraphs: [
          'Humans still handle complex judgement, sensitive customer situations, exceptions, and final operational decisions. Automation should make the team sharper, not invisible.',
          `For ${profile.audience}, that means the system handles repetitive intake while the team keeps ownership of service quality and relationship decisions.`,
        ],
      },
      {
        title: 'Best First Step',
        paragraphs: [
          `Start with the busiest or leakiest channel from ${listSentence(profile.channels)}, then expand after the team trusts the workflow.`,
        ],
      },
    ],
    explainer: [
      sharedTakeaways,
      {
        title: 'Simple Definition',
        paragraphs: [
          `${topic} is a practical operating system for responding to customer intent immediately, collecting the right context, and moving the lead toward a booked next step.`,
          `In plain language, it helps ${profile.audience} answer the moment when ${profile.buyer} decides whether to trust the business.`,
        ],
      },
      {
        title: 'How It Works',
        paragraphs: [
          `The system watches ${listSentence(profile.channels)}, responds in seconds, asks a few useful questions, and sends the customer or team toward the next action.`,
          'The customer should not feel like they are being processed. They should feel like the business is available, organized, and ready to help.',
        ],
        ordered: [
          { title: 'Detect intent', body: `Identify ${profile.serviceMoment} as soon as it arrives.` },
          { title: 'Reply instantly', body: 'Give the buyer a clear answer or acknowledgment before momentum fades.' },
          { title: 'Collect context', body: 'Ask the few questions needed for fit, urgency, and next step.' },
          { title: 'Move to action', body: `Book, route, or escalate toward ${profile.bookedOutcome}.` },
        ],
      },
      {
        title: 'Where It Helps',
        bullets: [
          'Urgent service calls.',
          'Paid ad leads.',
          'After-hours inquiries.',
          'Missed calls.',
          'Booking requests.',
          `Any situation where ${profile.urgency} changes trust.`,
        ],
      },
      {
        title: 'What To Measure',
        paragraphs: [
          `Track response time, contact rate, ${profile.proofMetric}, missed-call recovery, and revenue from leads that would otherwise have gone unanswered.`,
          'If those numbers improve, the system is doing its job. If they do not, simplify the script and tighten the handoff.',
        ],
      },
    ],
  };

  const closingSection: BlogSection = {
    title: 'The Practical Standard',
    quote: {
      text: `The standard is not "did we eventually respond?" The standard is "did the buyer get a useful next step while intent was still hot?"`,
      byline: 'Boltcall speed-to-lead principle',
    },
    paragraphs: [
      `${topic} should make the business easier to buy from. That means faster answers, cleaner intake, fewer mystery callbacks, and less manual chasing for the team.`,
    ],
  };

  return [...templates[intent], closingSection];
}

function buildFaqs(topic: string, profile: BusinessProfile): FaqItem[] {
  return [
    {
      question: `What is the main benefit of ${topic}?`,
      answer: `The main benefit of ${topic} is faster response that turns ${profile.serviceMoment} into ${profile.bookedOutcome}. When a local business answers immediately and gives a clear next step, fewer opportunities disappear to competitors.`,
    },
    {
      question: `Does ${topic} replace my team?`,
      answer: `No. The best setup handles repetitive intake, routing, and follow-up while your ${profile.team} stays responsible for complex judgement, service decisions, and customer relationships.`,
    },
    {
      question: 'Where should I start?',
      answer: `Start with the channels closest to revenue: ${listSentence(profile.channels)}. Fix the first response there before expanding into broader automation.`,
    },
    {
      question: 'How do I know it is working?',
      answer: `Watch response time, contact rate, handoff quality, and ${profile.proofMetric}. If those improve, the system is helping the business capture demand that used to leak.`,
    },
  ];
}

function buildArticle(pathname: string): BlogArticle {
  const path = pathname.replace(/\/$/, '');
  const title = titleFromPath(path);
  const topic = topicFromTitle(title);
  const intent = detectIntent(path, title);
  const profile = profileFor(path, title);
  const description = `${title}: a practical Boltcall guide for ${profile.audience} that want faster lead response, fewer missed opportunities, and more booked jobs.`;
  const intro = `For ${profile.audience}, this comes down to one moment: what happens immediately after ${profile.buyer} reaches out. That moment decides whether the lead becomes ${profile.bookedOutcome} or quietly moves to a competitor.`;

  const article = {
    path,
    title,
    description,
    intro,
    date: 'June 14, 2026',
    readTime: '9 min read',
    intent,
    sections: buildSections(intent, topic, profile),
    faqs: buildFaqs(topic, profile),
    conclusion: [
      `${title} should make the business faster, calmer, and easier to buy from. The strongest systems do not add more work for the team; they protect every high-intent lead from delay.`,
      `Start with the first response, then improve the rest of the funnel. Once ${profile.serviceMoment} is answered quickly and routed cleanly, the team can spend more energy on the leads that are ready to become revenue.`,
      'That is where Boltcall is built to help: instant response, clean qualification, and a direct path from new inquiry to booked next step.',
    ],
  };
  return applySeoAutopilotOverride(article, (seoAutopilotOverrides as Record<string, SeoAutopilotOverride>)[path]);
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function NumberedHeading({ index, children }: { index: number; children: string }) {
  return (
    <h2 id={slugify(children)} className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 mt-14 flex items-start gap-3">
      <span aria-hidden="true" className="toc-index text-blue-600 font-mono text-sm mr-1 pt-2">
        {String(index).padStart(2, '0')}
      </span>
      <span>{children}</span>
    </h2>
  );
}

function BlogTable({ table }: { table: NonNullable<BlogSection['table']> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {table.headers.map((header) => (
              <th key={header} className="border-b border-gray-200 py-3 pr-4 font-semibold text-gray-900">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.join('-')}>
              {row.map((cell) => (
                <td key={cell} className="border-b border-gray-100 py-4 pr-4 text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionBody({ section }: { section: BlogSection }) {
  return (
    <div className="space-y-5">
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="text-lg leading-8 text-gray-700">
          {paragraph}
        </p>
      ))}
      {section.links && (
        <p className="flex flex-wrap gap-x-5 gap-y-2 text-base font-semibold">
          {section.links.map((link) => (
            <a key={link.href} href={link.href} className="text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-900">
              {link.label}
            </a>
          ))}
        </p>
      )}
      {section.ordered && (
        <ol className="list-decimal pl-6 space-y-4 text-lg leading-8 text-gray-700">
          {section.ordered.map((item) => (
            <li key={item.title}>
              <strong className="text-gray-900">{item.title}:</strong> {item.body}
            </li>
          ))}
        </ol>
      )}
      {section.bullets && (
        <ul className="list-disc pl-6 space-y-3 text-lg leading-8 text-gray-700">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
      {section.table && <BlogTable table={section.table} />}
      {section.quote && (
        <blockquote className="border-l-2 border-gray-200 pl-5 text-lg leading-8 text-gray-700">
          <p className="italic">"{section.quote.text}"</p>
          <footer className="mt-2 text-sm font-semibold not-italic text-gray-900">{section.quote.byline}</footer>
        </blockquote>
      )}
    </div>
  );
}

export default function CanonicalBlogArticlePage() {
  const { pathname } = useLocation();
  const headings = useTableOfContents();
  const article = useMemo(() => buildArticle(pathname), [pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${article.title} | Boltcall`;
    updateMetaDescription(article.description.slice(0, 155));
    const cleanupMeta = updateBlogPreviewMeta(article.path, article.title, article.description);
    const cleanupSchemas = injectSchemas([

      createArticleSchema({
        headline: article.title,
        description: article.description,
        datePublished: '2026-06-14',
        dateModified: '2026-06-14',
        url: article.path,
        image: getAbsoluteBlogPreviewImage(article.path),
      }),
      createFAQSchema(article.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: article.title, url: article.path },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: article.title,
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['.speakable-intro'],
        },
      },
    ]);

    return () => {
      cleanupMeta();
      cleanupSchemas();
    };
  }, [article]);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      <section className="relative pt-32 pb-8 bg-white">
        <div className="max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: article.title, href: article.path },
            ]}
          />
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{article.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{article.readTime}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">
            <div className="mb-12">
              <p className="speakable-intro text-xl text-gray-700 leading-relaxed font-medium">
                {article.intro}
              </p>
            </div>

            {article.sections.map((section, index) => (
              <section key={section.title} className="mb-12">
                <NumberedHeading index={index + 1}>{section.title}</NumberedHeading>
                <SectionBody section={section} />
              </section>
            ))}

            <section className="mb-12">
              <NumberedHeading index={article.sections.length + 1}>FAQs</NumberedHeading>
              <div className="space-y-7">
                {article.faqs.map((faq) => (
                  <div key={faq.question}>
                    <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">{faq.question}</h3>
                    <p className="text-lg leading-8 text-gray-700">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-12">
              <NumberedHeading index={article.sections.length + 2}>Conclusion</NumberedHeading>
              <div className="space-y-5">
                {article.conclusion.map((paragraph) => (
                  <p key={paragraph} className="text-lg leading-8 text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <BlogClosingCta />
            <BlogRelatedArticles />
          </article>

          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-32">
              <TableOfContents
                headings={headings}
                socialLinks={[
                  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61582307818752' },
                  { label: 'X', href: 'https://x.com/boltcallteam' },
                  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/boltcall' },
                ]}
                cta={{
                  title: 'Missed jobs?',
                  href: '/signup',
                  label: 'Start for free',
                }}
              />
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
