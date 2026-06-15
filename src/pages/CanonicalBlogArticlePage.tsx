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

type BlogIntent = 'how-to' | 'comparison' | 'buyer' | 'industry' | 'cost' | 'stats' | 'faq' | 'explainer';

interface FaqItem {
  question: string;
  answer: string;
}

interface BlogSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: {
    headers: string[];
    rows: string[][];
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

function buildSections(intent: BlogIntent, topic: string): BlogSection[] {
  const sharedTakeaways: BlogSection = {
    title: 'Key Takeaways',
    bullets: [
      `${topic} only works when the first response is fast, clear, and tied to a booked next step.`,
      'Local service buyers usually contact more than one provider, so response speed changes who wins the job.',
      'The best setup keeps the human team in control while automation handles intake, routing, and follow-up.',
    ],
  };

  const templates: Record<BlogIntent, BlogSection[]> = {
    'how-to': [
      sharedTakeaways,
      {
        title: 'What to set up first',
        paragraphs: [
          `Start ${topic.toLowerCase()} with the lead moments that already create revenue: phone calls, missed calls, contact forms, booking requests, and after-hours messages.`,
          'Do not begin by rebuilding the whole CRM. Begin by making the first reply instant and useful.',
        ],
        bullets: ['Answer every new inquiry immediately.', 'Capture the reason for the call.', 'Qualify urgency and location.', 'Offer a booking path or handoff.'],
      },
      {
        title: 'Build the response flow',
        paragraphs: [
          'A strong flow sounds simple to the customer. It greets them, asks only the questions needed to route the job, confirms the next step, and sends the details to the team.',
          'The goal is not to impress people with automation. The goal is to remove the delay between interest and action.',
        ],
      },
      {
        title: 'Avoid these setup mistakes',
        bullets: [
          'Asking too many intake questions before offering help.',
          'Letting web forms sit until the next business day.',
          'Using different scripts for calls, texts, and forms.',
          'Sending leads into a tool nobody checks.',
        ],
      },
      {
        title: 'Measure the first week',
        paragraphs: [
          'Track missed calls recovered, response time, booked appointments, and leads that needed a human handoff. Those numbers show whether the system is creating revenue or just creating activity.',
        ],
      },
    ],
    comparison: [
      sharedTakeaways,
      {
        title: 'Quick verdict',
        paragraphs: [
          `${topic} comes down to speed, coverage, consistency, setup burden, and total cost. The best choice is the one that captures leads without forcing a small team to manage another heavy system.`,
        ],
      },
      {
        title: 'Side-by-side view',
        table: {
          headers: ['Option', 'Best for', 'Main trade-off'],
          rows: [
            ['Boltcall', 'Local service teams that need instant call, form, text, and follow-up coverage', 'Focused on lead response, not a full enterprise CRM'],
            ['Traditional option', 'Teams with staff already trained to manage every inbound channel', 'Slower response and higher operating overhead'],
            ['DIY stack', 'Technical teams that want full control', 'More setup, more maintenance, and more places for leads to leak'],
          ],
        },
      },
      {
        title: 'Where Boltcall fits',
        paragraphs: [
          'Boltcall fits when the business wants the first response handled immediately, without asking the owner or front desk to watch every channel all day.',
          'It is built around the revenue moment: someone reaches out, gets answered, gets qualified, and moves toward booking.',
        ],
      },
      {
        title: 'When to choose another',
        paragraphs: [
          'Choose a broader platform when you need deep CRM customization, agency white-labeling, or complex internal workflows before lead response. Choose Boltcall when missed leads are the urgent problem.',
        ],
      },
    ],
    buyer: [
      sharedTakeaways,
      {
        title: 'What matters most',
        bullets: [
          'Fast setup without a long implementation project.',
          'Coverage for calls, missed calls, forms, texts, and after-hours leads.',
          'Clear handoff rules when a lead needs a person.',
          'Pricing that makes sense before adding a full operations team.',
        ],
      },
      {
        title: 'The best-fit test',
        paragraphs: [
          `The right ${topic.toLowerCase()} should make the first week easier, not busier. If the tool needs weeks of configuration before it answers a lead, it is solving the wrong problem first.`,
        ],
      },
      {
        title: 'Pricing reality',
        paragraphs: [
          'Do not compare tools only by subscription price. Compare them by missed jobs recovered, staff time saved, and how many leads move from inquiry to booked appointment.',
        ],
      },
      {
        title: 'Final recommendation',
        paragraphs: [
          'Pick the option that protects the first five minutes of every lead. For local service businesses, that window is where the deal is usually won or lost.',
        ],
      },
    ],
    industry: [
      sharedTakeaways,
      {
        title: 'Why speed wins',
        paragraphs: [
          `${topic} is usually urgent, local, and competitive. The customer is not waiting politely for one business to call back. They are looking for the fastest credible answer.`,
        ],
      },
      {
        title: 'Highest-intent moments',
        bullets: [
          'A phone call during a busy job window.',
          'A missed call after hours.',
          'A contact form from a paid search campaign.',
          'A text asking for price, availability, or scheduling.',
        ],
      },
      {
        title: 'The workflow to use',
        paragraphs: [
          'Answer immediately, collect the customer name and job details, determine urgency, confirm service area, and either book directly or send a clean handoff to the team.',
        ],
      },
      {
        title: 'What teams notice',
        paragraphs: [
          'The biggest change is calm. Fewer leads vanish, fewer callbacks pile up, and the team gets cleaner information before deciding what needs a human response.',
        ],
      },
    ],
    cost: [
      sharedTakeaways,
      {
        title: 'The real cost',
        paragraphs: [
          `The real cost of ${topic.toLowerCase()} is not the software bill. It is the difference between leads answered now and leads answered after the buyer has already booked someone else.`,
        ],
      },
      {
        title: 'Simple ROI math',
        bullets: [
          'Estimate how many calls and forms are missed each month.',
          'Multiply by average job value.',
          'Apply a conservative close rate.',
          'Compare recovered revenue against the monthly platform cost.',
        ],
      },
      {
        title: 'Cost drivers',
        paragraphs: [
          'The biggest drivers are channel coverage, call volume, integrations, booking complexity, and whether you need human backup for edge cases.',
        ],
      },
      {
        title: 'When it pays back',
        paragraphs: [
          'For many local service businesses, one or two recovered jobs can cover the cost. The payback gets faster when the business runs paid ads or receives urgent after-hours calls.',
        ],
      },
    ],
    stats: [
      sharedTakeaways,
      {
        title: 'Numbers that matter',
        paragraphs: [
          `${topic} should be read as an operating signal, not trivia. The useful question is which number points to revenue leaking from the business today.`,
        ],
      },
      {
        title: 'What the data means',
        bullets: [
          'Slow response reduces contact rates.',
          'Missed calls turn paid demand into wasted spend.',
          'After-hours inquiries often have high buying intent.',
          'Consistent follow-up raises the chance of booking.',
        ],
      },
      {
        title: 'Where to improve',
        paragraphs: [
          'Start with missed calls, form response time, and after-hours coverage. These are easy to measure and usually have direct revenue impact.',
        ],
      },
      {
        title: 'Turn stats into action',
        paragraphs: [
          'Pick one metric, improve it for seven days, and compare booked appointments before and after. That keeps the work grounded in revenue instead of dashboards.',
        ],
      },
    ],
    faq: [
      sharedTakeaways,
      {
        title: 'Short answer',
        paragraphs: [
          `${topic} helps when the business needs faster, more consistent lead response without hiring another person just to watch the phone and inbox.`,
        ],
      },
      {
        title: 'What it handles',
        bullets: ['Initial call answer.', 'Missed-call recovery.', 'Lead qualification.', 'Booking support.', 'Follow-up reminders.'],
      },
      {
        title: 'Where humans stay',
        paragraphs: [
          'Humans still handle complex judgement, sensitive customer situations, exceptions, and final operational decisions. Automation should make the team sharper, not invisible.',
        ],
      },
      {
        title: 'Best first step',
        paragraphs: [
          'Start with the busiest or leakiest channel, then expand after the team trusts the workflow.',
        ],
      },
    ],
    explainer: [
      sharedTakeaways,
      {
        title: 'Simple definition',
        paragraphs: [
          `${topic} is a practical operating system for responding to customer intent immediately, collecting the right context, and moving the lead toward a booked next step.`,
        ],
      },
      {
        title: 'How it works',
        paragraphs: [
          'The system watches high-intent channels, responds in seconds, asks a few useful questions, and sends the customer or team toward the next action.',
        ],
      },
      {
        title: 'Where it helps most',
        bullets: ['Urgent service calls.', 'Paid ad leads.', 'After-hours inquiries.', 'Missed calls.', 'Booking requests.'],
      },
      {
        title: 'What to measure',
        paragraphs: [
          'Track response time, contact rate, booked appointments, missed-call recovery, and revenue from leads that would otherwise have gone unanswered.',
        ],
      },
    ],
  };

  return templates[intent];
}

function buildFaqs(topic: string): FaqItem[] {
  return [
    {
      question: `What is the main benefit of ${topic}?`,
      answer: `The main benefit of ${topic} is faster response. When a local business answers immediately and moves the lead toward booking, fewer opportunities disappear to competitors.`,
    },
    {
      question: `Does ${topic} replace my team?`,
      answer: 'No. The best setup handles repetitive intake, routing, and follow-up while your team stays responsible for complex calls, service decisions, and customer relationships.',
    },
    {
      question: 'Where should I start?',
      answer: 'Start with the channels closest to revenue: phone calls, missed calls, contact forms, paid search leads, and after-hours inquiries.',
    },
  ];
}

function buildArticle(pathname: string): BlogArticle {
  const path = pathname.replace(/\/$/, '');
  const title = titleFromPath(path);
  const topic = topicFromTitle(title);
  const intent = detectIntent(path, title);
  const description = `${title}: a practical Boltcall guide for local service businesses that want faster lead response, fewer missed opportunities, and more booked jobs.`;
  const intro = `${title} is really about one thing: what happens in the first few minutes after a customer reaches out. For local service businesses, that moment decides whether the lead becomes a booked job or quietly moves to a competitor.`;

  return {
    path,
    title,
    description,
    intro,
    date: 'June 14, 2026',
    readTime: '6 min read',
    intent,
    sections: buildSections(intent, topic),
    faqs: buildFaqs(topic),
    conclusion: [
      `${title} should make the business faster, calmer, and easier to buy from. The strongest systems do not add more work for the team; they protect every high-intent lead from delay.`,
      'Start with the first response, then improve the rest of the funnel. That is where Boltcall is built to help.',
    ],
  };
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
      {section.bullets && (
        <ul className="list-disc pl-6 space-y-3 text-lg leading-8 text-gray-700">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
      {section.table && <BlogTable table={section.table} />}
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

    return injectSchemas([
      createArticleSchema({
        headline: article.title,
        description: article.description,
        datePublished: '2026-06-14',
        dateModified: '2026-06-14',
        url: article.path,
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

          <aside className="hidden xl:block w-64 shrink-0">
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
