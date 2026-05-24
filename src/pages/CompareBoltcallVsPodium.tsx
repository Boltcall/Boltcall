// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, DollarSign, Zap, Shield, Clock, Target } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA, { COMPARISON_CTA } from '../components/FinalCTA';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import { SITE_DATE_MODIFIED } from '../lib/seoConstants';

const PUBLISH_DATE = '2026-05-06';
const MODIFIED_DATE = SITE_DATE_MODIFIED;
const TITLE = 'Boltcall vs Podium: Speed-to-Lead vs Comms Hub (2026)';
const DESCRIPTION = 'Boltcall vs Podium compared honestly. Speed-to-lead specialist vs all-in-one communication hub. See which fits your local business in 2026.';

const CompareBoltcallVsPodium: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = TITLE;
    updateMetaDescription(DESCRIPTION);

    const articleScript = document.createElement('script');
    articleScript.type = 'application/ld+json';
    articleScript.id = 'compare-podium-article';
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
        '@id': 'https://boltcall.org/compare/boltcall-vs-podium',
      },
    });
    document.head.appendChild(articleScript);

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'compare-podium-faq';
    faqScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the main difference between Boltcall and Podium?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Boltcall is a speed-to-lead specialist focused on turning a lead into a booked appointment in 11 seconds or less. Podium is an all-in-one communication hub covering messaging, reviews, payments, and AI Employee. Boltcall is narrower and faster on lead conversion. Podium is broader across customer communication.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is Boltcall cheaper than Podium?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Boltcall agency starts at $499 per month with the $2,500 setup waived on a 12-month commit. Podium publishes a $399 Essentials starter price, but most local businesses end up on quote-based plans that start higher than Boltcall once AI Employee, payments, and per-location fees are added.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does Podium have AI call answering?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Podium AI Employee handles inbound text, web chat, and voice calls. Podium reports response times under one minute. Boltcall is built around an 11 Second Response standard, with the entire stack engineered around lead-to-booking speed rather than general communication.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I switch from Podium to Boltcall?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Boltcall ships in 24 to 48 hours, with no annual contract required. Boltcall sets up the AI receptionist, lead routing, and booking automation. You can run Boltcall alongside Podium during the transition and cut Podium when your numbers move.',
          },
        },
      ],
    });
    document.head.appendChild(faqScript);

    const speakableScript = document.createElement('script');
    speakableScript.type = 'application/ld+json';
    speakableScript.id = 'compare-podium-speakable';
    speakableScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: TITLE,
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['.speakable-intro'],
      },
    });
    document.head.appendChild(speakableScript);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'compare-podium-breadcrumb';
    bcScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org' },
        { '@type': 'ListItem', position: 2, name: 'Comparisons', item: 'https://boltcall.org/comparisons' },
        { '@type': 'ListItem', position: 3, name: 'Boltcall vs Podium', item: 'https://boltcall.org/compare/boltcall-vs-podium' },
      ],
    });
    document.head.appendChild(bcScript);

    return () => {
      document.getElementById('compare-podium-article')?.remove();
      document.getElementById('compare-podium-faq')?.remove();
      document.getElementById('compare-podium-speakable')?.remove();
      document.getElementById('compare-podium-breadcrumb')?.remove();
    };
  }, []);

  const comparisonData = [
    { feature: 'Core focus', boltcall: 'Speed-to-lead → booking', podium: 'All-in-one comms hub', boltcallYes: true, podiumYes: true },
    { feature: 'Response time standard', boltcall: '11 seconds', podium: 'Under 1 minute (claimed)', boltcallYes: true, podiumYes: true },
    { feature: 'AI voice answering 24/7', boltcall: 'Included on every plan', podium: 'AI Employee add-on', boltcallYes: true, podiumYes: true },
    { feature: 'Text + web chat AI', boltcall: 'Included', podium: 'Core feature', boltcallYes: true, podiumYes: true },
    { feature: 'Auto-booking to calendar', boltcall: 'Native (Cal.com / Google)', podium: 'Via Scheduling add-on', boltcallYes: true, podiumYes: true },
    { feature: 'Review automation', boltcall: 'Included', podium: 'Best-in-class', boltcallYes: true, podiumYes: true },
    { feature: 'Payments', boltcall: 'External (Stripe / PayPal)', podium: 'Native Podium Payments', boltcallYes: false, podiumYes: true },
    { feature: 'Pricing model', boltcall: 'Flat $499/mo agency', podium: 'Quote-based, scales fast', boltcallYes: true, podiumYes: false },
    { feature: 'Setup time', boltcall: '24–48 hours, done-for-you', podium: 'Days to weeks', boltcallYes: true, podiumYes: false },
    { feature: 'Annual contract', boltcall: 'Optional (setup waived)', podium: 'Typical', boltcallYes: true, podiumYes: false },
    { feature: 'Best for', boltcall: 'Lead conversion focused', podium: 'Multi-location, review-led', boltcallYes: true, podiumYes: true },
  ];

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
              { label: 'Boltcall vs Podium', href: '/compare/boltcall-vs-podium' },
            ]}
          />
          <div className="mt-6 mb-3">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium border border-blue-200">
              Honest comparison
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#0B1220] leading-tight mb-5">
            Boltcall vs <span className="text-blue-600">Podium</span>: speed-to-lead specialist vs all-in-one comms hub
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl">
            One is engineered around an 11-second response standard. The other is a 15-year-old communication suite that recently bolted on AI. This is a clean read of where each one wins.
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="speakable-intro bg-blue-50 border-l-4 border-blue-600 p-6 mb-10 rounded-r-lg">
            <p className="text-lg text-[#0B1220]">
              <strong>Boltcall vs Podium quick answer:</strong> Boltcall is a speed-to-lead AI receptionist purpose-built to turn an inbound call or web lead into a booked appointment in under 11 seconds; Podium is a 15-year-old multi-channel communication suite (messaging, reviews, payments) that bolted on AI calling more recently. Boltcall starts at $549/month with no per-call or per-message fees; Podium's AI-included tier typically lands between $500 and $900/month in real-world quotes once you add the AI Employee voice add-on, plus per-message and per-location fees. Choose Boltcall if your top problem is missed-lead recovery and response speed; choose Podium if you want a single dashboard for messaging, reviews, payments, and multi-location AI calls.
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-slate-700 leading-relaxed mb-6">
              Boltcall and Podium often show up on the same shortlist, but they answer different questions. Boltcall answers <em>"how do I stop missing leads?"</em>. Podium answers <em>"how do I run all customer communication from one place?"</em>.
            </p>
            <p className="text-lg text-slate-700 mb-10">
              This page compares them feature by feature, pricing model by pricing model, and ends with a clear pick by use case. We acknowledge what Podium does better than us, and we are direct about where Boltcall wins.
            </p>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-[#0F172A] mb-6 flex items-center">
                <Target className="h-8 w-8 text-blue-600 mr-3" />
                Side-by-side: feature comparison
              </h2>
              <p className="text-lg text-slate-700 mb-6">
                Both platforms have AI now. The difference is what the AI is engineered around. Boltcall's AI is tuned for one path: capture, qualify, book. Podium AI Employee is a generalist customer-conversation layer that touches messaging, reviews, calls, and webchat.
              </p>

              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse rounded-[0.65rem] overflow-hidden border border-gray-200 shadow-sm">
                  <thead>
                    <tr className="bg-[#0F172A] text-white">
                      <th className="px-6 py-4 text-left font-semibold">Feature</th>
                      <th className="px-6 py-4 text-center font-semibold text-blue-300">Boltcall</th>
                      <th className="px-6 py-4 text-center font-semibold">Podium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, index) => (
                      <tr key={row.feature} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-6 py-4 font-medium text-[#0F172A] border-b border-gray-200">{row.feature}</td>
                        <td className="px-6 py-4 text-center border-b border-gray-200">
                          <div className="flex items-center justify-center space-x-2">
                            {row.boltcallYes ? (
                              <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            )}
                            <span className="text-sm text-slate-700">{row.boltcall}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center border-b border-gray-200">
                          <div className="flex items-center justify-center space-x-2">
                            {row.podiumYes ? (
                              <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            )}
                            <span className="text-sm text-slate-700">{row.podium}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-slate-500">
                Feature data sourced from go.podium.com and Boltcall product pages, current as of {MODIFIED_DATE}. Podium pricing varies by location count and negotiation.
              </p>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-[#0F172A] mb-6 flex items-center">
                <Clock className="h-8 w-8 text-blue-600 mr-3" />
                The speed gap that actually matters
              </h2>
              <p className="text-lg text-slate-700 mb-4">
                Podium publishes a "under one minute" response standard for AI Employee. Boltcall is built around an <strong>11 Second Response</strong>. That is not marketing language for us, it is the design constraint we engineered the entire stack around.
              </p>
              <p className="text-lg text-slate-700 mb-4">
                The reason: a Harvard Business Review study found responding to a web lead within five minutes makes you 100x more likely to qualify them than ten minutes. Inside that five-minute window, every additional 30 seconds costs measurable conversion. The difference between 11 seconds and 60 seconds is not cosmetic. On a busy week with 200 inbound leads, that gap is dozens of bookings.
              </p>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="bg-blue-50 border border-blue-200 rounded-[0.65rem] p-6">
                  <h3 className="text-lg font-bold text-blue-700 mb-2 flex items-center gap-2"><Zap className="w-5 h-5" /> Boltcall, 11 seconds</h3>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    Lead hits any channel (form, missed call, chat, DM), AI engages within 11 seconds, qualifies, books on Cal.com or Google Calendar, owner gets SMS alert. One job, instrumented end-to-end.
                  </p>
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-[0.65rem] p-6">
                  <h3 className="text-lg font-bold text-slate-700 mb-2 flex items-center gap-2"><Clock className="w-5 h-5" /> Podium, under 1 minute</h3>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    Lead enters the unified inbox, AI Employee or human team responds, conversation continues across SMS, webchat, or call, optional booking via Scheduling add-on. Broader surface, more handoffs.
                  </p>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-[#0F172A] mb-6 flex items-center">
                <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
                Pricing: flat vs quote-based
              </h2>
              <p className="text-lg text-slate-700 mb-6">
                The biggest economic difference is the pricing model itself, not the entry-level number. Boltcall publishes a flat agency price. Podium publishes a starter price, then customizes from there based on location count, AI Employee usage, and Podium Payments volume.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-[0.65rem] p-6">
                  <h3 className="text-xl font-bold text-blue-700 mb-4">Boltcall, flat and published</h3>
                  <ul className="space-y-3 text-slate-700">
                    <li className="flex justify-between"><span>Agency core (managed)</span><span className="font-bold">$499/mo</span></li>
                    <li className="flex justify-between"><span>Setup fee</span><span className="font-bold">$2,500 (waived on 12-mo)</span></li>
                    <li className="flex justify-between"><span>SaaS DIY tier</span><span className="font-bold">From $179/mo</span></li>
                    <li className="border-t border-blue-200 pt-3 text-sm text-slate-600">
                      <CheckCircle className="h-4 w-4 text-emerald-500 inline mr-1" /> Month-to-month available. 30-day cost-recovery guarantee on agency.
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-100 border-2 border-slate-200 rounded-[0.65rem] p-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">Podium, quote-based</h3>
                  <ul className="space-y-3 text-slate-700">
                    <li className="flex justify-between"><span>Essentials (published)</span><span className="font-bold">From $399/mo</span></li>
                    <li className="flex justify-between"><span>AI Employee</span><span className="font-bold">Add-on, quote</span></li>
                    <li className="flex justify-between"><span>Per-location pricing</span><span className="font-bold">Yes</span></li>
                    <li className="border-t border-slate-200 pt-3 text-sm text-slate-600">
                      <XCircle className="h-4 w-4 text-red-500 inline mr-1" /> Annual contracts standard. Most quotes land above $500/mo with AI on.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900">
                  <strong>Note on Podium pricing:</strong> $399 Essentials is publicly listed but does not include AI Employee voice. Real-world Podium quotes for local businesses with AI typically land in the $500 to $900/mo range, plus per-message and per-location fees. Confirm directly with Podium for your scenario. Pricing accurate as of {MODIFIED_DATE}.
                </p>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-[#0F172A] mb-6 flex items-center">
                <Shield className="h-8 w-8 text-blue-600 mr-3" />
                Where Podium genuinely wins
              </h2>
              <p className="text-lg text-slate-700 mb-4">
                Podium is a serious platform with a 15-year head start on us in some categories. Honest list of where they are better:
              </p>
              <ul className="space-y-3 mb-4">
                <li className="flex items-start gap-3 text-slate-700"><CheckCircle className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" /><span><strong>Review management at scale.</strong> Podium's review request engine is best-in-class. If you run 5+ locations and your growth lever is review volume, Podium wins.</span></li>
                <li className="flex items-start gap-3 text-slate-700"><CheckCircle className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" /><span><strong>Native payments.</strong> Podium Payments is integrated. Boltcall hands payments off to Stripe or PayPal. If you want a single bill and a single dashboard, Podium is cleaner.</span></li>
                <li className="flex items-start gap-3 text-slate-700"><CheckCircle className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" /><span><strong>Multi-location reporting.</strong> Centralized dashboards across many locations are a Podium strength. Boltcall is excellent at one location at a time.</span></li>
                <li className="flex items-start gap-3 text-slate-700"><CheckCircle className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" /><span><strong>Brand recognition.</strong> Customers recognize Podium-branded review requests. That trust signal is real.</span></li>
              </ul>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-[#0F172A] mb-6 flex items-center">
                <Zap className="h-8 w-8 text-blue-600 mr-3" />
                Where Boltcall wins
              </h2>
              <ul className="space-y-3 mb-4">
                <li className="flex items-start gap-3 text-slate-700"><CheckCircle className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" /><span><strong>Lead-to-booking speed.</strong> 11-second standard, instrumented and reported. The whole stack is engineered around it.</span></li>
                <li className="flex items-start gap-3 text-slate-700"><CheckCircle className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" /><span><strong>Done-for-you setup in 24 to 48 hours.</strong> We build the AI receptionist, lead routing, and booking flow. Podium typical onboarding is days to weeks.</span></li>
                <li className="flex items-start gap-3 text-slate-700"><CheckCircle className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" /><span><strong>Flat, published pricing.</strong> $499/mo agency, no per-message bloat, no surprise per-location fee.</span></li>
                <li className="flex items-start gap-3 text-slate-700"><CheckCircle className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" /><span><strong>30-day cost-recovery guarantee.</strong> If Boltcall does not cover its cost in 30 days on the agency tier, we cover the gap.</span></li>
                <li className="flex items-start gap-3 text-slate-700"><CheckCircle className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" /><span><strong>Specialist depth, not generalist breadth.</strong> Every feature serves the speed-to-lead path. No bloat from products you do not use.</span></li>
              </ul>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-[#0F172A] mb-6">The verdict by use case</h2>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-[0.65rem] p-6">
                  <p className="text-lg text-[#0B1220]"><strong>Choose Boltcall if</strong> your #1 problem is missed leads or slow follow-up. Single location, 1 to 20 employees, lead-conversion focused. You want a specialist tool that does one job at world-class level.</p>
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-[0.65rem] p-6">
                  <p className="text-lg text-[#0B1220]"><strong>Choose Podium if</strong> you run 5+ locations, your growth lever is review volume, and you want messaging plus reviews plus payments plus AI in one bill. You are willing to pay quote-based pricing for that breadth.</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-[0.65rem] p-6">
                  <p className="text-lg text-[#0B1220]"><strong>Run both if</strong> you are big enough to justify it. Podium for the comms hub and review engine, Boltcall as the speed-to-lead layer in front of it. We integrate cleanly with Podium's inbox.</p>
                </div>
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
                  <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Is Boltcall a Podium alternative or a Podium add-on?</h3>
                  <p className="text-slate-700">Either. Most local businesses replace Podium with Boltcall when their main pain is missed leads. Larger multi-location operators run Boltcall in front of Podium as the speed layer.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Does Boltcall do reviews?</h3>
                  <p className="text-slate-700">Yes, post-appointment review requests are included on every plan. We do not match Podium's review depth across multi-location reporting, and we are honest about that.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Can Boltcall handle my phone calls?</h3>
                  <p className="text-slate-700">Yes. The AI receptionist answers 24/7, qualifies the caller, books to your calendar, and texts you a summary. It also catches missed calls and follows up via SMS within 11 seconds.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#0F172A] mb-2">What if I am already on a Podium contract?</h3>
                  <p className="text-slate-700">Run Boltcall in parallel until the renewal date. We onboard in 24 to 48 hours, so you do not lose any speed during the transition. Many businesses keep Podium for reviews and switch the speed-to-lead layer to Boltcall.</p>
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
                <h2 className="text-3xl font-bold mb-3">See if Boltcall fits</h2>
                <p className="text-lg text-blue-50 mb-7 max-w-2xl mx-auto">
                  Run our free Speed-to-Lead Audit and see exactly how many leads your business is losing to slow follow-up. No sales call required.
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
                    to="/compare/podium-alternatives"
                    className="inline-flex items-center justify-center bg-transparent text-white font-medium text-lg px-7 py-3.5 rounded-[0.65rem] border-2 border-white/60 hover:bg-white/10 transition-colors duration-200"
                  >
                    See all Podium alternatives
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
                <Link to="/compare/podium-alternatives" className="block bg-white border border-gray-200 rounded-[0.65rem] p-6 hover:shadow-md transition-shadow">
                  <span className="text-sm text-blue-600 font-medium">Roundup</span>
                  <h3 className="text-lg font-semibold text-[#0F172A] mt-2">Best Podium alternatives for local businesses (2026)</h3>
                  <p className="text-slate-600 mt-2 text-sm">Five Podium alternatives compared on speed, pricing, and lead-conversion focus.</p>
                </Link>
                <Link to="/compare/boltcall-vs-smith-ai" className="block bg-white border border-gray-200 rounded-[0.65rem] p-6 hover:shadow-md transition-shadow">
                  <span className="text-sm text-blue-600 font-medium">Comparison</span>
                  <h3 className="text-lg font-semibold text-[#0F172A] mt-2">Boltcall vs Smith.ai</h3>
                  <p className="text-slate-600 mt-2 text-sm">Speed-to-lead AI vs human-staffed virtual receptionist.</p>
                </Link>
                <Link to="/compare/boltcall-vs-gohighlevel" className="block bg-white border border-gray-200 rounded-[0.65rem] p-6 hover:shadow-md transition-shadow">
                  <span className="text-sm text-blue-600 font-medium">Comparison</span>
                  <h3 className="text-lg font-semibold text-[#0F172A] mt-2">Boltcall vs GoHighLevel</h3>
                  <p className="text-slate-600 mt-2 text-sm">Specialist speed-to-lead vs sprawling marketing OS.</p>
                </Link>
              </div>
            </motion.section>
          </div>
        </div>
      </main>

      <FinalCTA {...COMPARISON_CTA} />
      <Footer />
    </>
  );
};

export default CompareBoltcallVsPodium;
