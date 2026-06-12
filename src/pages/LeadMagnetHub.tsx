import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Download,
  FileText,
  Calculator,
  Stethoscope,
  HardHat,
  Scale,
  Wrench,
  Sparkles,
  Search,
  Gauge,
  ClipboardCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { updateMetaDescription } from '../lib/utils';

const FEATURED = [
  {
    title: 'The Claude Code Overnight Kit',
    href: '/lead-magnet/claude-code-overnight-kit',
    icon: Sparkles,
    summary: '5 ready-to-use autoresearch setups — paste and run. Skills, CLAUDE.md config, and a quickstart guide so you can hand-off SEO, lead-gen, or LinkedIn research to Claude Code overnight.',
    tag: 'Template pack',
  },
  {
    title: "AI Receptionist Buyer's Guide 2026",
    href: '/lead-magnet/ai-receptionist-buyers-guide',
    icon: FileText,
    summary: 'Side-by-side comparison of the top 6 AI receptionist platforms — features, real pricing (not the marketing page numbers), and the red flags that cost you money in year two.',
    tag: 'Comparison guide',
  },
  {
    title: 'The Speed-to-Lead Stack',
    href: '/lead-magnet/speed-to-lead-stack',
    icon: Zap,
    summary: 'Free Claude Code plugin that wires up Retell AI voice, SMS auto-reply, and chat widget for any local business. Every lead answered in under 60 seconds, end-to-end install in one evening.',
    tag: 'Free plugin',
  },
];

const SETUP_OFFERS = [
  {
    title: 'After-Hours Lead Rescue Setup',
    href: '/after-hours-lead-rescue',
    summary: 'We install an instant missed-call SMS responder for after-hours leads. First 100 SMS included.',
  },
  {
    title: 'Automatic Reviews Agent Setup',
    href: '/automatic-reviews-agent',
    summary: 'We install a review request SMS agent and prepare the first 100 customer texts after approval.',
  },
  {
    title: 'Reminders Agent Setup',
    href: '/reminders-agent',
    summary: 'We install an SMS reminders agent for overdue or upcoming customers. First 100 contacts included.',
  },
];

const AUDITS = [
  { title: 'Free SEO Audit',                href: '/seo-audit',                  icon: Search,         desc: 'Crawls your site, checks 30+ ranking factors, delivers a plain-English report to your inbox.' },
  { title: 'AI Visibility Check',           href: '/ai-visibility-check',        icon: Sparkles,       desc: 'Are AI assistants like ChatGPT and Perplexity recommending you when prospects ask? Find out in 5 minutes.' },
  { title: 'Free Business Audit',           href: '/business-audit',             icon: ClipboardCheck, desc: 'Phone-first analysis of your online presence: call response rate, missed-call revenue estimate, local competitor benchmarking.' },
  { title: 'AI Revenue Audit',              href: '/ai-revenue-audit',           icon: Calculator,     desc: 'Quantifies the dollar value of leads slipping through cracks in your current workflow.' },
  { title: 'AI Readiness Scorecard',        href: '/ai-readiness-scorecard',     icon: Gauge,          desc: 'A 12-question assessment that tells you exactly which AI automations will pay back fastest for your business.' },
  { title: 'Lead Response Scorecard',       href: '/lead-response-scorecard',    icon: ClipboardCheck, desc: 'Benchmark your current first-response time against the businesses that close 4x more leads.' },
  { title: 'SEO + AEO Audit',               href: '/seo-aeo-audit',              icon: Search,         desc: 'Combined SEO and AI-search audit — covers Google rankings plus citation behavior in ChatGPT, Perplexity, and Google AIO.' },
  { title: 'AI Receptionist ROI Calculator', href: '/ai-receptionist-roi',        icon: Calculator,     desc: 'Plug in your monthly call volume and average ticket — see exactly what an AI receptionist would add to revenue.' },
];

const INDUSTRY_TOOLS = [
  { title: 'Plumber Revenue Calculator',           href: '/tools/plumber-revenue-calculator',         icon: Wrench },
  { title: 'HVAC Overflow Calculator',             href: '/tools/hvac-overflow-calculator',           icon: HardHat },
  { title: 'Roofing Missed-Lead Calculator',       href: '/tools/roofing-missed-lead-calculator',     icon: HardHat },
  { title: 'Solar Profit Calculator',              href: '/tools/solar-profit-calculator',            icon: Calculator },
  { title: 'Solar Quote Generator',                href: '/tools/solar-quote-generator',              icon: FileText },
  { title: 'Solar Sales Closer',                   href: '/tools/solar-sales-closer',                 icon: Sparkles },
  { title: 'Dentist Chair Calculator',             href: '/tools/dentist-chair-calculator',           icon: Stethoscope },
  { title: 'Med Spa Rebooking Calculator',         href: '/tools/medspa-rebooking-calculator',        icon: Stethoscope },
  { title: 'Vet Clinic Revenue Calculator',        href: '/tools/vet-clinic-revenue-calculator',      icon: Stethoscope },
  { title: 'Chiropractor Patient Recovery',        href: '/tools/chiropractor-patient-recovery-calculator', icon: Stethoscope },
  { title: 'Lawyer Intake Calculator',             href: '/tools/lawyer-intake-calculator',           icon: Scale },
  { title: 'Insurance Lead-Response Scorecard',    href: '/tools/insurance-lead-response-scorecard',  icon: ClipboardCheck },
  { title: 'Auto Repair Missed-Call Calculator',   href: '/tools/auto-repair-missed-call-calculator', icon: Wrench },
  { title: 'Cleaning Service Booking Calculator',  href: '/tools/cleaning-service-booking-calculator', icon: Calculator },
  { title: 'Real Estate Speed Scorecard',          href: '/tools/real-estate-speed-scorecard',        icon: Gauge },
  { title: 'Landscaping Seasonal Revenue',         href: '/tools/landscaping-seasonal-revenue-calculator', icon: Calculator },
  { title: '5-Minute Response Playbook',           href: '/tools/5-minute-response-playbook',         icon: Zap },
];

const FAQS = [
  {
    q: 'Are these resources really free?',
    a: 'Yes. Every tool, calculator, audit, and download on this page is genuinely free — no credit card, no trial expiration, no hidden upsell. We publish them because they help business owners diagnose their own lead-flow problems before a sales conversation makes sense.',
  },
  {
    q: 'What do you do with my email after I download something?',
    a: 'You receive the resource you requested plus a short follow-up sequence (one email per week for four weeks) with implementation tips relevant to the download. You can unsubscribe at any time from any email. We never sell or rent your email address to third parties.',
  },
  {
    q: 'Which lead magnet should I start with?',
    a: 'If you run a phone-driven business and want to know how much money you are leaving on the table: start with the Free Business Audit or the AI Revenue Audit. If you are evaluating AI receptionist platforms: grab the AI Receptionist Buyer\'s Guide. If you want to ship something tonight: download the Speed-to-Lead Stack and have AI answering your calls before the weekend.',
  },
  {
    q: 'Do the audits actually look at my real website and listings?',
    a: 'Yes. The audits crawl your live website, pull your Google Business Profile data, check your local directory listings, and compare against three nearest competitors. The report you receive references real data from your real online presence — not a generic checklist.',
  },
  {
    q: 'Will I get sales calls after downloading?',
    a: 'No automated sales calls. If the resource you downloaded points clearly toward an AI receptionist solution and you reply or book a call, we will follow up. Otherwise the only ongoing contact is the email sequence, which you can unsubscribe from in one click.',
  },
  {
    q: 'Can I share these resources with my team or another business?',
    a: 'Yes. The lead magnets, calculators, and audits are free to share. We ask only that you do not re-host them on your own domain or strip out attribution — link back to the original page so the recipient can request their own copy and access updates.',
  },
];

const LeadMagnetHub: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Free Tools, Audits & Lead Magnets for Local Businesses | Boltcall';
    updateMetaDescription(
      'Free tools and templates for local service businesses: SEO audit, business audit, AI revenue calculator, AI receptionist buyer\'s guide, industry-specific revenue calculators, and the Speed-to-Lead Stack plugin.'
    );

    let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://boltcall.org/lead-magnet/';

    const itemList = document.createElement('script');
    itemList.type = 'application/ld+json';
    itemList.id = 'lm-itemlist';
    itemList.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Free tools and lead magnets from Boltcall',
      itemListElement: [
        ...FEATURED.map((f, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: f.title,
          url: `https://boltcall.org${f.href}/`,
        })),
        ...AUDITS.map((a, i) => ({
          '@type': 'ListItem',
          position: FEATURED.length + i + 1,
          name: a.title,
          url: `https://boltcall.org${a.href}/`,
        })),
      ],
    });
    document.head.appendChild(itemList);

    const faqSchema = document.createElement('script');
    faqSchema.type = 'application/ld+json';
    faqSchema.id = 'lm-faq';
    faqSchema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    document.head.appendChild(faqSchema);

    const breadcrumb = document.createElement('script');
    breadcrumb.type = 'application/ld+json';
    breadcrumb.id = 'lm-breadcrumb';
    breadcrumb.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org/' },
        { '@type': 'ListItem', position: 2, name: 'Free Tools & Lead Magnets', item: 'https://boltcall.org/lead-magnet/' },
      ],
    });
    document.head.appendChild(breadcrumb);

    return () => {
      document.getElementById('lm-itemlist')?.remove();
      document.getElementById('lm-faq')?.remove();
      document.getElementById('lm-breadcrumb')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* HERO */}
      <section className="relative bg-gradient-to-b from-blue-50 via-white to-white pt-28 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              <Download className="h-3.5 w-3.5" />
              Free tools and downloads
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Every free tool, audit, and template
              <span className="block text-blue-600">we publish in one place</span>
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-gray-700">
              Boltcall publishes free resources for local service businesses — calculators that quantify your missed-revenue gap, audits that compare you against three local competitors, buyer\'s guides that strip out vendor marketing, and Claude Code plugins you can deploy tonight. Pick the resource that matches your current bottleneck. Everything below is free, no credit card, no demo call required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FEATURED LEAD MAGNETS */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Featured downloads</h2>
              <p className="mt-2 text-base text-gray-600">Three resources we built specifically for local service operators ready to move fast.</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {FEATURED.map((f) => {
              const Icon = f.icon;
              return (
                <Link
                  key={f.href}
                  to={f.href}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold leading-snug text-gray-900">{f.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">{f.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:gap-2.5 transition-all">
                    Get the resource
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* DONE-FOR-YOU SETUP OFFERS */}
      <section className="bg-slate-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Done-for-you setup offers</h2>
            <p className="mt-2 max-w-3xl text-base text-slate-300">
              These are not PDFs. Pick a mini-implementation and Boltcall will create the setup request for fulfillment, then run one test message before the first import.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {SETUP_OFFERS.map((offer) => (
              <Link
                key={offer.href}
                to={offer.href}
                className="group rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-blue-300 hover:bg-white/10"
              >
                <h3 className="text-lg font-bold text-white">{offer.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{offer.summary}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-300 group-hover:gap-2.5 transition-all">
                  Create setup request
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FREE AUDITS */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Free audits and diagnostics</h2>
            <p className="mt-2 max-w-3xl text-base text-gray-600">
              Each audit looks at your real website, your real Google Business Profile, and your real local competition. Reports are delivered to your inbox within minutes, not days.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {AUDITS.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  to={a.href}
                  className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600">{a.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{a.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* INDUSTRY CALCULATORS */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Industry-specific calculators</h2>
            <p className="mt-2 max-w-3xl text-base text-gray-600">
              Tools tailored to the way revenue actually flows in your industry. Each calculator uses defaults from real-world benchmarks for that vertical and surfaces the dollar value of the gap.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRY_TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  to={t.href}
                  className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700">{t.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked</h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="rounded-xl border border-gray-200 bg-white p-5">
                <summary className="cursor-pointer list-none text-base font-semibold text-gray-900" style={{ listStyle: 'none' }}>
                  {f.q}
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-gray-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Want a working setup, not just a download?</h2>
          <p className="mt-4 text-base text-gray-600">
            Book a free 15-minute strategy session. We will map your current lead flow, calculate missed revenue, and hand you a 30-day execution plan. No second discovery call required.
          </p>
          <Link
            to="/book-a-call"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:scale-[1.02] hover:bg-blue-700"
          >
            Book the strategy call
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LeadMagnetHub;
