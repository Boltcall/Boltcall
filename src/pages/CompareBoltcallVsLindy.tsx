// @ts-nocheck
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Zap, Star, Shield, DollarSign } from 'lucide-react';
import { updateMetaDescription } from '../lib/utils';
import { SITE_DATE_MODIFIED } from '../lib/seoConstants';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA, { COMPARISON_CTA } from '../components/FinalCTA';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import AnswerBlock from '../components/seo/AnswerBlock';

const PUBLISH_DATE = '2026-05-24';
const MODIFIED_DATE = SITE_DATE_MODIFIED;
const TITLE = 'Boltcall vs Lindy: Purpose-Built Receptionist vs General AI Agent Platform (2026)';
const DESCRIPTION = 'Boltcall vs Lindy AI compared honestly. Purpose-built speed-to-lead receptionist vs general-purpose AI agent builder. Which fits a local service business in 2026?';

const CompareBoltcallVsLindy: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = TITLE;
    updateMetaDescription(DESCRIPTION);

    const articleScript = document.createElement('script');
    articleScript.type = 'application/ld+json';
    articleScript.id = 'compare-lindy-article';
    articleScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: TITLE,
      description: DESCRIPTION,
      author: { '@type': 'Organization', name: 'Boltcall' },
      publisher: { '@type': 'Organization', name: 'Boltcall', logo: { '@type': 'ImageObject', url: 'https://boltcall.org/logo.png' } },
      datePublished: PUBLISH_DATE,
      dateModified: MODIFIED_DATE,
      mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://boltcall.org/compare/boltcall-vs-lindy' },
    });
    document.head.appendChild(articleScript);

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'compare-lindy-faq';
    faqScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is Lindy a real AI receptionist?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Lindy is a general-purpose AI agent builder — it can be configured to answer calls, manage email, run meetings, automate calendar tasks, and orchestrate workflows across 4,000+ integrations. Voice/phone is one capability among many, billed separately at $0.19/minute on top of the base plan plus $10/month per phone number. A speed-to-lead receptionist is something you build on Lindy; it is not a turnkey product. Boltcall is the opposite — a purpose-built receptionist for local service businesses with the intake script, calendar booking, and follow-up sequences already configured by vertical.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does Lindy pricing compare to Boltcall?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Lindy core plans: Free (400 credits), Plus $49.99/mo (5,000 credits), Pro $99.99/mo (15,000 credits), Max $199.99/mo (30,000 credits), Business $299/mo (30,000 credits + team features). Voice is metered separately at $0.19/minute and each phone number is $10/month. At 300 minutes of voice/month: Lindy Plus = $49.99 + $57 voice + $10 number = ~$117/mo on voice alone, plus credit consumption on every workflow run. Boltcall Starter is $549/month flat with unlimited voice, no per-minute fees, and no per-phone-number charge.',
          },
        },
        {
          '@type': 'Question',
          name: 'When would Lindy be a better fit than Boltcall?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Lindy is better when the receptionist is one of many AI workflows you want to run — for example, a marketing operator running outbound research agents, an inbox triage agent, a meeting-notes agent, and a phone agent all in one platform. Lindy is also a fit for technical operators who want to design the agents themselves. Boltcall is better when you only need the phone + lead-response + booking + reminders stack done well, you want it managed, and you want flat pricing tuned to your vertical.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can Boltcall integrate with the same tools Lindy connects to?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Boltcall ships native integrations with the tools local service businesses actually use: Cal.com, Google Calendar, Outlook, Clio, MyCase, Jobber, ServiceTitan, HouseCallPro, and Zapier/Make for anything else. Lindy connects to 4,000+ apps but most of those (Asana, Notion, Linear, GitHub) are not relevant to a plumber, dentist, or law firm. If your stack is local-service-business standard, Boltcall covers it natively; if your stack is heavy on B2B SaaS tools, Lindy has more native breadth.',
          },
        },
      ],
    });
    document.head.appendChild(faqScript);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'compare-lindy-breadcrumb';
    bcScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org' },
        { '@type': 'ListItem', position: 2, name: 'Comparisons', item: 'https://boltcall.org/comparisons' },
        { '@type': 'ListItem', position: 3, name: 'Boltcall vs Lindy', item: 'https://boltcall.org/compare/boltcall-vs-lindy' },
      ],
    });
    document.head.appendChild(bcScript);
    return () => { articleScript.remove(); faqScript.remove(); bcScript.remove(); };
  }, []);

  const featureRows = [
    { feature: 'Product category', boltcall: 'Purpose-built AI receptionist for local service biz', lindy: 'General-purpose AI agent builder (4,000+ apps)' },
    { feature: 'Starting price', boltcall: '$549/mo flat', lindy: '$49.99/mo Plus (voice billed separately)' },
    { feature: 'Voice/phone pricing', boltcall: 'Unlimited, no per-min fees', lindy: '$0.19/min + $10/mo per phone number' },
    { feature: 'Setup model', boltcall: 'Managed, built in 24 hours', lindy: 'DIY no-code agent builder' },
    { feature: 'Vertical-specific scripts (HVAC, dental, law, etc.)', boltcall: 'Yes, pre-tuned', lindy: 'Build it yourself from templates' },
    { feature: 'Speed-to-lead web-form SMS', boltcall: 'Yes, native', lindy: 'DIY agent workflow' },
    { feature: 'Calendar booking', boltcall: 'Native Cal/Google/Outlook', lindy: 'Yes (Google Calendar integration)' },
    { feature: 'Appointment reminders', boltcall: 'Automated, no-show -40%', lindy: 'DIY workflow' },
    { feature: 'Post-job review automation', boltcall: 'Automated', lindy: 'DIY workflow' },
    { feature: 'Multi-agent orchestration', boltcall: 'Focused on receptionist stack', lindy: 'Yes — inbox, meetings, research, etc.' },
    { feature: 'App integrations', boltcall: 'Local-business native (Clio, ServiceTitan, Jobber, Cal, etc.)', lindy: '4,000+ via the platform' },
    { feature: 'Best fit', boltcall: 'Local service biz wanting turnkey receptionist + speed-to-lead', lindy: 'Technical operator orchestrating many AI agents across a wider stack' },
  ];

  return (
    <>
      <GiveawayBar />
      <Header />
      <ReadingProgress />
      <main className="pt-24 min-h-screen bg-white">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6"><span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">Honest comparison</span></div>
              <Breadcrumbs items={[{ label: 'Comparisons', href: '/comparisons' }, { label: 'Boltcall vs Lindy', href: '/compare/boltcall-vs-lindy' }]} />
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                <span className="text-blue-600">Boltcall vs Lindy</span>: purpose-built receptionist vs general AI agent platform
              </h1>
              <div className="flex items-center text-gray-600 mb-8 space-x-6 text-sm">
                <div className="flex items-center"><Star className="h-4 w-4 mr-2" /><span>Last updated {MODIFIED_DATE}</span></div>
                <div className="flex items-center"><Zap className="h-4 w-4 mr-2" /><span>8 min read</span></div>
                <div className="flex items-center"><Shield className="h-4 w-4 mr-2" /><span>Boltcall Team</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <AnswerBlock
            query="Boltcall vs Lindy — which should I pick"
            definition="Lindy is a general-purpose AI agent builder that can do many things — inbox triage, meeting notes, calendar automation, voice calling — across 4,000+ integrations, with voice priced at $0.19/minute plus $10/month per phone number on top of the base plan. Boltcall is a purpose-built AI receptionist for local service businesses with the voice agent, intake script, calendar booking, and follow-up automation pre-configured by vertical."
            stat="At 300 minutes of voice/month, Lindy Plus runs roughly $117/month on voice alone (base + per-minute + per-number) plus credit consumption on every workflow run. Boltcall Starter is $549/month flat with unlimited voice and no per-minute fees."
            outcome="Pick Lindy if you want one platform orchestrating many AI agents and you are technical enough to build them. Pick Boltcall if you only need the receptionist + lead-response stack done well, managed, and tuned for your industry."
          />

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              Boltcall and Lindy live in different product categories. Lindy is a horizontal AI agent platform — a Swiss-army knife you configure for any workflow. Boltcall is a vertical-specific tool — a receptionist that already knows how plumbers, dentists, and law firms talk to their customers.
            </p>

            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center"><Zap className="h-8 w-8 text-blue-600 mr-3" />Feature-by-feature comparison</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Feature</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Boltcall</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Lindy</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {featureRows.map((row) => (
                      <tr key={row.feature}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.feature}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.boltcall}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.lindy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 italic mt-3">Pricing accurate as of {MODIFIED_DATE} per lindy.ai/pricing and boltcall.org/pricing.</p>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Where each one wins</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-blue-700 mb-3 flex items-center"><CheckCircle className="w-5 h-5 mr-2" />Lindy wins when…</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• You want one platform doing many AI workflows beyond just calls</li>
                    <li>• You're technical enough (or have an ops person) to design agent workflows</li>
                    <li>• Your stack is heavy on B2B SaaS tools (Notion, Linear, HubSpot, etc.)</li>
                    <li>• Voice volume is genuinely low and the per-minute cost stays reasonable</li>
                  </ul>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-blue-700 mb-3 flex items-center"><CheckCircle className="w-5 h-5 mr-2" />Boltcall wins when…</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• You're a local service business and your #1 problem is phone leads slipping through</li>
                    <li>• You want a vertical-specific intake script (HVAC, dental, law, plumbing) ready out of the box</li>
                    <li>• Voice is a primary channel and per-minute fees scare you</li>
                    <li>• You want appointment reminders + review automation included, not built</li>
                    <li>• You want to pay once a month and be done thinking about it</li>
                  </ul>
                </div>
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Verdict</h2>
              <p className="text-lg text-gray-700 mb-4">
                If you're a marketing operator at a B2B company orchestrating five AI agents across email, calendar, research, and phone, Lindy is the right pick — that breadth is what it's built for.
              </p>
              <p className="text-lg text-gray-700">
                If you're a plumber, dentist, lawyer, or HVAC owner who needs a phone that doesn't go to voicemail and a system that books appointments while you're on the job, Boltcall is the right pick. Buying a horizontal AI platform to build your own receptionist when one already exists tuned for your industry is usually the more expensive path — both in dollars and in the weeks you spend configuring it.
              </p>
            </motion.section>

            <FinalCTA {...COMPARISON_CTA} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CompareBoltcallVsLindy;
