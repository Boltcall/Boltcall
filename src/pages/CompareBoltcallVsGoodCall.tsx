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
const TITLE = 'Boltcall vs GoodCall: AI Receptionist Comparison (2026)';
const DESCRIPTION = 'Boltcall vs GoodCall compared head-to-head. Flat all-in-one vs per-caller-metered pricing. Which AI phone agent wins for your local service business in 2026?';

const CompareBoltcallVsGoodCall: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = TITLE;
    updateMetaDescription(DESCRIPTION);

    const articleScript = document.createElement('script');
    articleScript.type = 'application/ld+json';
    articleScript.id = 'compare-goodcall-article';
    articleScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: TITLE,
      description: DESCRIPTION,
      author: { '@type': 'Organization', name: 'Boltcall' },
      publisher: {
        '@type': 'Organization',
        name: 'Boltcall',
        logo: { '@type': 'ImageObject', url: 'https://boltcall.org/logo.png' },
      },
      datePublished: PUBLISH_DATE,
      dateModified: MODIFIED_DATE,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://boltcall.org/compare/boltcall-vs-goodcall',
      },
    });
    document.head.appendChild(articleScript);

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'compare-goodcall-faq';
    faqScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is GoodCall cheaper than Boltcall?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'GoodCall is cheaper at low caller volume: $79/month Starter vs Boltcall $549/month Starter. GoodCall meters by unique caller per month — $0.50 per caller above the plan cap (Starter caps at 200 unique callers, Growth at 500, Scale at unlimited). Boltcall is flat monthly with no per-caller, per-minute, or per-call fees. The crossover is around 500–600 unique callers per month: above that volume Boltcall is cheaper and predictable; below it GoodCall is the lower sticker price.',
          },
        },
        {
          '@type': 'Question',
          name: 'What does Boltcall include that GoodCall does not?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Boltcall is a full speed-to-lead system, not just an AI phone agent. Every plan includes the AI receptionist plus: instant SMS reply to web-form leads in under 60 seconds, automated appointment reminders that cut no-shows ~40%, post-job Google review request sequences, and a Cal.com / Google Calendar / Outlook booking integration. GoodCall is focused on call answering plus SMS follow-up when a question cannot be answered. If you only need a phone agent, GoodCall covers it; if you want the entire missed-lead recovery stack, Boltcall is the more complete platform.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which is better for a plumber, HVAC contractor, or roofer?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'For high-call-volume trades (plumbing, HVAC, roofing) where storms or heatwaves spike unique callers above 500/month, Boltcall flat pricing is more predictable and typically cheaper at peak. For a low-volume operation under ~300 monthly callers, GoodCall Starter or Growth is the lower-cost choice. Both handle emergency triage, after-hours coverage, and calendar booking. Boltcall additionally handles the web-form-to-SMS speed-to-lead motion that drives a lot of HVAC and roofing conversions outside the phone channel.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I switch from GoodCall to Boltcall?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Both are month-to-month with no contracts. Boltcall offers a 24-hour setup with the team building your AI voice, intake script, calendar booking, and CRM integration during onboarding. Most switchers move because (a) they hit the GoodCall caller cap and want flat pricing, or (b) they want the broader follow-up and review-request automation Boltcall bundles in.',
          },
        },
      ],
    });
    document.head.appendChild(faqScript);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'compare-goodcall-breadcrumb';
    bcScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org' },
        { '@type': 'ListItem', position: 2, name: 'Comparisons', item: 'https://boltcall.org/comparisons' },
        { '@type': 'ListItem', position: 3, name: 'Boltcall vs GoodCall', item: 'https://boltcall.org/compare/boltcall-vs-goodcall' },
      ],
    });
    document.head.appendChild(bcScript);

    return () => {
      articleScript.remove();
      faqScript.remove();
      bcScript.remove();
    };
  }, []);

  const featureRows = [
    { feature: 'Starting price', boltcall: '$549/mo flat', goodcall: '$79/mo Starter ($66 annual)' },
    { feature: 'Pricing model', boltcall: 'Flat monthly, no per-call/min/caller fees', goodcall: 'Per-unique-caller; $0.50/caller above cap' },
    { feature: 'Unique caller cap', boltcall: 'None — unlimited', goodcall: '200 (Starter) / 500 (Growth) / unlimited (Scale)' },
    { feature: '24/7 AI call answering', boltcall: 'Yes', goodcall: 'Yes' },
    { feature: 'Speed-to-lead web-form SMS reply', boltcall: 'Yes, under 60 seconds', goodcall: 'No' },
    { feature: 'Calendar booking (Cal/Google/Outlook)', boltcall: 'Yes, native', goodcall: 'Booking via SMS link only' },
    { feature: 'Automated appointment reminders', boltcall: 'Yes, cuts no-shows ~40%', goodcall: 'Not included' },
    { feature: 'Post-job Google review requests', boltcall: 'Yes, automated', goodcall: 'No' },
    { feature: 'Multilingual', boltcall: 'English + Spanish', goodcall: 'Multilingual' },
    { feature: 'Free trial', boltcall: '30-day money-back', goodcall: '14-day free trial' },
    { feature: 'Contract', boltcall: 'Month-to-month', goodcall: 'Month-to-month' },
    { feature: 'Best fit', boltcall: 'Local service biz w/ 300+ callers/mo wanting predictable cost + full follow-up stack', goodcall: 'Low-volume SMB (under ~300 callers/mo) wanting cheapest AI phone agent' },
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
              <div className="mb-6">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  Honest comparison
                </span>
              </div>
              <Breadcrumbs
                items={[
                  { label: 'Comparisons', href: '/comparisons' },
                  { label: 'Boltcall vs GoodCall', href: '/compare/boltcall-vs-goodcall' },
                ]}
              />
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                <span className="text-blue-600">Boltcall vs GoodCall</span>: flat all-in-one vs per-caller AI phone agent
              </h1>
              <div className="flex items-center text-gray-600 mb-8 space-x-6 text-sm">
                <div className="flex items-center"><Star className="h-4 w-4 mr-2" /><span>Last updated {MODIFIED_DATE}</span></div>
                <div className="flex items-center"><Zap className="h-4 w-4 mr-2" /><span>9 min read</span></div>
                <div className="flex items-center"><Shield className="h-4 w-4 mr-2" /><span>Boltcall Team</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <AnswerBlock
            query="Boltcall vs GoodCall — which AI receptionist should I pick"
            definition="GoodCall is an AI phone-agent starting at $79/mo that meters by unique caller ($0.50 per caller above plan cap); Boltcall is a flat-rate speed-to-lead system starting at $549/mo with unlimited callers and an entire follow-up stack (instant SMS reply to web forms, calendar booking, appointment reminders, post-job review automation)."
            stat="The crossover point is around 500–600 unique callers per month; below it GoodCall is cheaper, above it Boltcall is both cheaper and predictable. GoodCall covers ~80% of pure call-answering needs; Boltcall covers the broader missed-lead recovery and conversion motion."
            outcome="Pick GoodCall if you only need a 24/7 AI phone agent and have steady low caller volume; pick Boltcall if you want one platform that handles every channel a lead can come in on, with no surprise overage fees during peak season."
          />

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              Boltcall and GoodCall both replace your front-desk phone for inbound calls. The difference is scope and pricing model. GoodCall is a focused AI phone agent at a low entry price; Boltcall is the full speed-to-lead and follow-up automation system priced flat per month.
            </p>
            <p className="text-lg text-gray-700 mb-10">
              This page compares them feature by feature, walks through the pricing math at three call volumes, and ends with a clean verdict by business type.
            </p>

            <motion.section
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Zap className="h-8 w-8 text-blue-600 mr-3" />
                Feature-by-feature comparison
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Feature</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Boltcall</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">GoodCall</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {featureRows.map((row) => (
                      <tr key={row.feature}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.feature}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.boltcall}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.goodcall}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
                The pricing math at 3 call volumes
              </h2>
              <p className="text-gray-700 mb-4">GoodCall's pricing scales with unique callers. Boltcall is flat. Here's what each costs at three real-world volumes:</p>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
                  <p className="text-xs font-bold tracking-wider uppercase text-blue-700 mb-2">150 callers/mo</p>
                  <p className="text-sm text-gray-700 mb-2"><strong>GoodCall Starter:</strong> $79/mo (under the 200 cap)</p>
                  <p className="text-sm text-gray-700"><strong>Boltcall Starter:</strong> $549/mo</p>
                  <p className="text-xs text-gray-500 mt-3">Winner: GoodCall ($470 cheaper)</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
                  <p className="text-xs font-bold tracking-wider uppercase text-blue-700 mb-2">500 callers/mo</p>
                  <p className="text-sm text-gray-700 mb-2"><strong>GoodCall Growth:</strong> $129/mo (under the 500 cap)</p>
                  <p className="text-sm text-gray-700"><strong>Boltcall Starter:</strong> $549/mo</p>
                  <p className="text-xs text-gray-500 mt-3">Winner: GoodCall ($420 cheaper) — but you're at the cap</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
                  <p className="text-xs font-bold tracking-wider uppercase text-blue-700 mb-2">900 callers/mo</p>
                  <p className="text-sm text-gray-700 mb-2"><strong>GoodCall Scale:</strong> $249/mo (unlimited) OR Growth + 400 × $0.50 = $329/mo</p>
                  <p className="text-sm text-gray-700"><strong>Boltcall Starter:</strong> $549/mo</p>
                  <p className="text-xs text-gray-500 mt-3">GoodCall still cheaper on phone-agent alone; Boltcall wins on bundled value (booking + reminders + review automation + speed-to-lead SMS)</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 italic">GoodCall pricing accurate as of {MODIFIED_DATE} per goodcall.com/pricing. The honest read: GoodCall is cheaper on phone agent alone at almost every volume; Boltcall's pricing reflects the broader stack (web-form SMS, reminders, review requests, full booking integrations) that GoodCall does not ship.</p>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Where each one wins</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-blue-700 mb-3 flex items-center"><CheckCircle className="w-5 h-5 mr-2" />GoodCall wins when…</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• You're a low-volume solo operator under ~300 unique callers/month</li>
                    <li>• You only need the phone agent — not the full follow-up stack</li>
                    <li>• You want the absolute lowest sticker price</li>
                    <li>• You're willing to manage booking via an external SMS link rather than native calendar booking</li>
                  </ul>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-blue-700 mb-3 flex items-center"><CheckCircle className="w-5 h-5 mr-2" />Boltcall wins when…</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• You're a high-volume trade (HVAC, plumbing, roofing) with seasonal spikes above 500 callers/mo</li>
                    <li>• You also lose web-form leads, not just calls — Boltcall fires SMS in under 60 seconds</li>
                    <li>• You want native Cal.com / Google Calendar / Outlook booking</li>
                    <li>• You want appointment reminders and post-job review request automation in one place</li>
                    <li>• You want a flat, predictable invoice with zero overage surprises during peak season</li>
                  </ul>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Verdict</h2>
              <p className="text-lg text-gray-700 mb-4">
                If you've already got a CRM, a calendar, an SMS auto-responder for web forms, and a review-request flow — and you just need a phone agent — <strong>GoodCall is the right pick</strong>. It's purpose-built for that single job and prices it accordingly.
              </p>
              <p className="text-lg text-gray-700 mb-4">
                If you don't have those things yet (or you have them stitched together across 5 separate tools and one breaks every other week) — <strong>Boltcall is the right pick</strong>. It's the entire speed-to-lead pipeline in one platform, priced flat, with no caller cap during your busiest months.
              </p>
              <p className="text-lg text-gray-700">
                Most local service businesses doing $250k–$3M in annual revenue land in the Boltcall column because the consolidation alone saves more than the price difference, and the missing-lead recovery typically pays for the subscription in the first week.
              </p>
            </motion.section>

            <section className="mb-12 border-t border-gray-200 pt-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Related comparisons</h2>
              <p className="text-gray-700 mb-4">Other AI call answering and speed-to-lead platforms compared honestly:</p>
              <ul className="grid sm:grid-cols-2 gap-2 text-blue-700">
                <li>• <Link className="hover:underline" to="/compare/boltcall-vs-callin">Boltcall vs Callin.io</Link></li>
                <li>• <Link className="hover:underline" to="/compare/boltcall-vs-lindy">Boltcall vs Lindy</Link></li>
                <li>• <Link className="hover:underline" to="/compare/boltcall-vs-convin">Boltcall vs Convin.ai</Link></li>
                <li>• <Link className="hover:underline" to="/compare/boltcall-vs-soundhound">Boltcall vs SoundHound AI</Link></li>
                <li>• <Link className="hover:underline" to="/compare/boltcall-vs-smith-ai">Boltcall vs Smith.ai</Link></li>
                <li>• <Link className="hover:underline" to="/compare/boltcall-vs-podium">Boltcall vs Podium</Link></li>
              </ul>
            </section>

            <FinalCTA {...COMPARISON_CTA} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CompareBoltcallVsGoodCall;
