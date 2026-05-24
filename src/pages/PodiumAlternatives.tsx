// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Zap, Star, Trophy, ExternalLink } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA, { COMPARISON_CTA } from '../components/FinalCTA';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import { SITE_DATE_MODIFIED } from '../lib/seoConstants';

const PUBLISH_DATE = '2026-05-06';
const MODIFIED_DATE = SITE_DATE_MODIFIED;
const TITLE = '5 Best Podium Alternatives for Local Businesses (2026)';
const DESCRIPTION = 'Five Podium alternatives compared honestly. Pricing, response speed, AI features, and best-fit use cases for local service businesses in 2026.';

type Alternative = {
  rank: number;
  name: string;
  url: string;
  bestFor: string;
  responseTime: string;
  pricing: string;
  highlight: string;
  strengths: string[];
  weaknesses: string[];
  cta?: { label: string; href: string; internal: boolean };
  badge?: string;
};

const alternatives: Alternative[] = [
  {
    rank: 1,
    name: 'Boltcall',
    url: 'https://boltcall.org',
    bestFor: 'Local businesses where the #1 problem is missed leads or slow follow-up',
    responseTime: '11 seconds',
    pricing: '$499/mo agency, from $179/mo SaaS',
    highlight: 'The only entry on this list engineered around a single number: how fast a new lead becomes a booked appointment.',
    strengths: [
      '11 Second Response standard, instrumented end-to-end',
      'AI receptionist 24/7 across phone, SMS, web chat, DMs',
      'Done-for-you setup in 24 to 48 hours',
      'Flat published pricing, no per-message fees',
      '30-day cost-recovery guarantee on the agency tier',
    ],
    weaknesses: [
      'Review tooling is included but not as deep as Podium',
      'Built for single-location and small multi-location, not 50+ store chains',
    ],
    cta: { label: 'See Boltcall pricing', href: '/pricing', internal: true },
    badge: 'Editor\'s pick',
  },
  {
    rank: 2,
    name: 'HaloAI CRM',
    url: 'https://haloaicrm.com',
    bestFor: 'Solo contractors and home-service crews who want a fully managed AI Employee',
    responseTime: '90 seconds (average)',
    pricing: 'From $397/mo, no contract',
    highlight: 'A focused AI Employee for contractors with strong review automation. Lighter on phone-call AI than Boltcall.',
    strengths: [
      '24/7 AI Employee across text, web, and Facebook',
      'Five-day setup window',
      'Reports averaging 94 new Google reviews in 60 days',
      'Up to 5 follow-ups for unbooked leads, included',
      'Text-to-pay built in',
    ],
    weaknesses: [
      '90-second average response is meaningfully slower than Boltcall',
      'Phone AI is less mature than text/chat AI',
      'Brand recognition is low outside contractor niche',
    ],
  },
  {
    rank: 3,
    name: 'Local Lead',
    url: 'https://locallead.io',
    bestFor: 'Businesses who want human-quality AI calls plus appointment recovery',
    responseTime: 'Under 30 seconds',
    pricing: 'Quote-based',
    highlight: 'Heavy focus on inbound and outbound AI calls with case studies showing 44 to 61 percent booking rates.',
    strengths: [
      'AI handles inbound and outbound calls, texts, and emails 24/7',
      'Native appointment booking with no-show recovery',
      'Sub-30-second response time',
      'Proven booking rates of 44 to 61 percent in published case studies',
    ],
    weaknesses: [
      'Pricing is not published, requires a sales call',
      'Smaller feature surface than Podium for review and payments',
      'Less brand recognition for trust signals on review requests',
    ],
  },
  {
    rank: 4,
    name: 'Smartflo Systems',
    url: 'https://smartflosystems.com',
    bestFor: 'Small-to-medium businesses replacing HubSpot, Mailchimp, and Calendly with one tool',
    responseTime: 'Near instant via missed-call text-back',
    pricing: '14-day free trial, then quote',
    highlight: 'A consolidation play. CRM plus booking plus reputation plus SMS in one stack. Speed comes from missed-call text-back, not deep AI.',
    strengths: [
      'Texts missed calls automatically and books appointments',
      '48-hour setup window',
      'Combines CRM, online booking, reputation management, and SMS',
      'Replaces HubSpot, Mailchimp, and Calendly subscriptions',
    ],
    weaknesses: [
      'No native AI voice agent comparable to Boltcall or Local Lead',
      'Pricing requires a quote after the 14-day trial',
      'Speed advantage is missed-call text-back only, not full AI conversation',
    ],
  },
  {
    rank: 5,
    name: 'Smith.ai',
    url: 'https://smith.ai',
    bestFor: 'Law firms and professional services that want human receptionists with AI assist',
    responseTime: 'Live human pickup, AI assist',
    pricing: 'From $292/mo, per-call billing',
    highlight: 'Human-staffed virtual receptionists with AI tooling underneath. Different category from Podium, but a legitimate alternative if you specifically want humans answering.',
    strengths: [
      'Real humans handle calls, with AI to route and qualify',
      'Strong fit for law firms and complex intake',
      'Established brand with deep CRM integrations',
    ],
    weaknesses: [
      'Per-call billing means costs scale with volume in unpredictable ways',
      'Not 24/7 AI like Boltcall or Local Lead',
      'No native review or messaging suite like Podium',
    ],
    cta: { label: 'See Boltcall vs Smith.ai', href: '/compare/boltcall-vs-smith-ai', internal: true },
  },
];

const PodiumAlternatives: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = TITLE;
    updateMetaDescription(DESCRIPTION);

    const articleScript = document.createElement('script');
    articleScript.type = 'application/ld+json';
    articleScript.id = 'podium-alts-article';
    articleScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: TITLE,
      description: DESCRIPTION,
      author: { '@type': 'Organization', name: 'Boltcall' },
      publisher: {
        '@type': 'Organization',
        name: 'Boltcall',
        logo: { '@type': 'ImageObject', url: 'https://boltcall.org/boltcall_full_logo.png' },
      },
      datePublished: PUBLISH_DATE,
      dateModified: MODIFIED_DATE,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://boltcall.org/compare/podium-alternatives',
      },
    });
    document.head.appendChild(articleScript);

    const itemListScript = document.createElement('script');
    itemListScript.type = 'application/ld+json';
    itemListScript.id = 'podium-alts-itemlist';
    itemListScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: TITLE,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: alternatives.length,
      itemListElement: alternatives.map((a) => ({
        '@type': 'ListItem',
        position: a.rank,
        name: a.name,
        url: a.url,
        description: a.highlight,
      })),
    });
    document.head.appendChild(itemListScript);

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'podium-alts-faq';
    faqScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the best Podium alternative for a single-location local business?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Boltcall is the strongest fit for single-location businesses focused on lead conversion. It is built around an 11 Second Response standard, includes AI phone, SMS, and web chat, and starts at $499/mo agency or $179/mo SaaS with no annual contract.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which Podium alternative has the fastest response time?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Boltcall publishes the fastest standard at 11 seconds. Local Lead publishes under 30 seconds. HaloAI CRM averages 90 seconds. Podium itself targets under one minute via AI Employee.',
          },
        },
        {
          '@type': 'Question',
          name: 'Are there cheaper alternatives to Podium?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Boltcall SaaS DIY starts at $179 per month and the managed agency tier is a flat $499 per month. HaloAI CRM starts at $397 per month. Both publish their pricing rather than quote-based, so you avoid the per-location and per-message escalations Podium customers often hit.',
          },
        },
        {
          '@type': 'Question',
          name: 'Should I leave Podium?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Leave Podium if your top problem is missed leads, slow response, or unpredictable per-location billing. Stay on Podium if your growth lever is review volume across many locations, you want native payments in the same dashboard, and the broader comms suite is worth the price.',
          },
        },
      ],
    });
    document.head.appendChild(faqScript);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'podium-alts-breadcrumb';
    bcScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org' },
        { '@type': 'ListItem', position: 2, name: 'Comparisons', item: 'https://boltcall.org/comparisons' },
        { '@type': 'ListItem', position: 3, name: 'Podium Alternatives', item: 'https://boltcall.org/compare/podium-alternatives' },
      ],
    });
    document.head.appendChild(bcScript);

    return () => {
      document.getElementById('podium-alts-article')?.remove();
      document.getElementById('podium-alts-itemlist')?.remove();
      document.getElementById('podium-alts-faq')?.remove();
      document.getElementById('podium-alts-breadcrumb')?.remove();
    };
  }, []);

  return (
    <>
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      <main className="pt-24 min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
          <Breadcrumbs
            items={[
              { label: 'Comparisons', href: '/comparisons' },
              { label: 'Podium Alternatives', href: '/compare/podium-alternatives' },
            ]}
          />
          <div className="mt-6 mb-3">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium border border-blue-200">
              Roundup, ranked
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#0B1220] leading-tight mb-5">
            5 best <span className="text-blue-600">Podium alternatives</span> for local businesses in 2026
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl">
            Five real Podium alternatives, ranked by lead-conversion focus, response speed, and pricing transparency. Each entry has honest strengths and weaknesses so you can match the tool to your bottleneck.
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Last updated {MODIFIED_DATE}. Pricing and feature data confirmed from each vendor's website. Boltcall publishes this list and is included as the #1 pick. We disclose the bias and let the criteria speak.
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 mb-10 rounded-r-lg">
            <p className="text-lg text-[#0B1220]">
              <strong>Quick answer:</strong> If your bottleneck is response speed and missed leads, pick Boltcall. If you specifically want a contractor-focused AI Employee, look at HaloAI CRM. If you want human receptionists with AI assist, look at Smith.ai. Stay on Podium only if multi-location review management is your primary growth lever.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-[0.65rem] p-6 mb-10">
            <h2 className="text-xl font-bold text-[#0F172A] mb-4">How we ranked these</h2>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span><strong>Lead-conversion focus.</strong> How tightly is the product engineered around turning a lead into a booked appointment?</span></li>
              <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span><strong>Response speed.</strong> Published response standard or measured average.</span></li>
              <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span><strong>Pricing transparency.</strong> Published flat pricing scores higher than quote-based plus per-location fees.</span></li>
              <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span><strong>Setup speed.</strong> Done-for-you onboarding in days beats DIY in weeks.</span></li>
              <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span><strong>Honest fit.</strong> Each tool's best-case audience is named explicitly. Wrong-fit recommendations are worse than no recommendation.</span></li>
            </ul>
          </div>

          {alternatives.map((alt, idx) => (
            <motion.section
              key={alt.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              viewport={{ once: true }}
              className="mb-10"
              id={alt.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
            >
              <div className="bg-white border border-gray-200 rounded-[0.65rem] shadow-sm p-7">
                <div className="flex flex-wrap items-start gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-xl">
                      {alt.rank}
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A]">{alt.name}</h2>
                      <a
                        href={alt.url}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        {alt.url.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  {alt.badge && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-blue-600 text-white text-xs font-semibold">
                      <Trophy className="w-3.5 h-3.5" /> {alt.badge}
                    </span>
                  )}
                </div>

                <p className="text-lg text-slate-700 mb-5">{alt.highlight}</p>

                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-[0.65rem] p-4 border border-slate-200">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">Best for</p>
                    <p className="text-sm text-[#0F172A]">{alt.bestFor}</p>
                  </div>
                  <div className="bg-slate-50 rounded-[0.65rem] p-4 border border-slate-200">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">Response time</p>
                    <p className="text-sm font-semibold text-[#0F172A]">{alt.responseTime}</p>
                  </div>
                  <div className="bg-slate-50 rounded-[0.65rem] p-4 border border-slate-200">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">Pricing</p>
                    <p className="text-sm font-semibold text-[#0F172A]">{alt.pricing}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" /> Strengths
                    </p>
                    <ul className="space-y-2">
                      {alt.strengths.map((s) => (
                        <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-blue-600 mt-0.5 shrink-0">+</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Weaknesses</p>
                    <ul className="space-y-2">
                      {alt.weaknesses.map((w) => (
                        <li key={w} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-slate-400 mt-0.5 shrink-0">−</span>{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {alt.cta && (
                  <div className="mt-6">
                    {alt.cta.internal ? (
                      <Link
                        to={alt.cta.href}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {alt.cta.label} <ArrowRight className="ml-1.5 w-4 h-4" />
                      </Link>
                    ) : (
                      <a
                        href={alt.cta.href}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {alt.cta.label} <ExternalLink className="ml-1.5 w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.section>
          ))}

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Quick comparison table</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse rounded-[0.65rem] overflow-hidden border border-gray-200 shadow-sm">
                <thead>
                  <tr className="bg-[#0F172A] text-white text-sm">
                    <th className="px-4 py-3 text-left font-semibold">Tool</th>
                    <th className="px-4 py-3 text-left font-semibold">Response time</th>
                    <th className="px-4 py-3 text-left font-semibold">Pricing</th>
                    <th className="px-4 py-3 text-left font-semibold">Best for</th>
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map((alt, idx) => (
                    <tr key={alt.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 font-semibold text-[#0F172A] border-b border-gray-200">
                        {alt.rank}. {alt.name}
                      </td>
                      <td className="px-4 py-3 text-slate-700 border-b border-gray-200 text-sm">{alt.responseTime}</td>
                      <td className="px-4 py-3 text-slate-700 border-b border-gray-200 text-sm">{alt.pricing}</td>
                      <td className="px-4 py-3 text-slate-700 border-b border-gray-200 text-sm">{alt.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-[#0F172A] mb-6">FAQ</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Why is Boltcall ranked #1 on a Boltcall-published list?</h3>
                <p className="text-slate-700">Because we built it for this exact problem. We disclose that bias up top. The criteria are listed publicly: lead-conversion focus, response speed, pricing transparency, setup time, and honest fit. If those criteria do not match your priorities, the ranking flips. HaloAI, Local Lead, and Smith.ai are real options and we link to their sites directly.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Is Podium being unfair to local businesses?</h3>
                <p className="text-slate-700">No. Podium is a strong product that is genuinely best-in-class at multi-location review management and unified messaging. The friction most local businesses report is opaque per-location pricing and slower lead-to-booking conversion than purpose-built speed tools. That is a fit problem, not a quality problem.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Can I run Boltcall alongside Podium?</h3>
                <p className="text-slate-700">Yes. Boltcall integrates with Podium's inbox via standard webhooks. Some larger operators run Podium as the comms hub and Boltcall as the speed-to-lead layer in front of it.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">How do I switch?</h3>
                <p className="text-slate-700">Boltcall onboards in 24 to 48 hours done-for-you. Run it in parallel until your Podium renewal, measure the booking lift, then cut whichever you want. There are no migration fees on our side.</p>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mt-12 mb-16"
          >
            <div className="bg-blue-600 rounded-2xl p-10 text-center text-white">
              <h2 className="text-3xl font-bold mb-3">Stop losing leads to slow follow-up</h2>
              <p className="text-lg text-blue-50 mb-7 max-w-2xl mx-auto">
                Run our free Speed-to-Lead Audit and see exactly how many leads your business is losing. Two minutes, no sales call.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/seo-audit"
                  className="inline-flex items-center justify-center bg-white text-blue-600 font-bold text-lg px-7 py-3.5 rounded-[0.65rem] border-2 border-black shadow-[4px_4px_0px_0px_black] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
                >
                  Run free audit
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/compare/boltcall-vs-podium"
                  className="inline-flex items-center justify-center bg-transparent text-white font-medium text-lg px-7 py-3.5 rounded-[0.65rem] border-2 border-white/60 hover:bg-white/10 transition-colors duration-200"
                >
                  Boltcall vs Podium head-to-head
                </Link>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Related comparisons</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/compare/boltcall-vs-podium" className="block bg-white border border-gray-200 rounded-[0.65rem] p-6 hover:shadow-md transition-shadow">
                <span className="text-sm text-blue-600 font-medium">Head-to-head</span>
                <h3 className="text-lg font-semibold text-[#0F172A] mt-2">Boltcall vs Podium</h3>
                <p className="text-slate-600 mt-2 text-sm">Speed-to-lead specialist vs all-in-one comms hub.</p>
              </Link>
              <Link to="/compare/boltcall-vs-smith-ai" className="block bg-white border border-gray-200 rounded-[0.65rem] p-6 hover:shadow-md transition-shadow">
                <span className="text-sm text-blue-600 font-medium">Comparison</span>
                <h3 className="text-lg font-semibold text-[#0F172A] mt-2">Boltcall vs Smith.ai</h3>
                <p className="text-slate-600 mt-2 text-sm">AI receptionist vs human-staffed virtual receptionist.</p>
              </Link>
              <Link to="/compare/boltcall-vs-gohighlevel" className="block bg-white border border-gray-200 rounded-[0.65rem] p-6 hover:shadow-md transition-shadow">
                <span className="text-sm text-blue-600 font-medium">Comparison</span>
                <h3 className="text-lg font-semibold text-[#0F172A] mt-2">Boltcall vs GoHighLevel</h3>
                <p className="text-slate-600 mt-2 text-sm">Specialist speed-to-lead vs sprawling marketing OS.</p>
              </Link>
            </div>
          </motion.section>
        </div>
      </main>

      <FinalCTA {...COMPARISON_CTA} />
      <Footer />
    </>
  );
};

export default PodiumAlternatives;
