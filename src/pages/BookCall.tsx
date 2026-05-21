import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  ArrowRight,
  Sparkles,
  Clock3,
  PhoneCall,
  CheckCircle2,
  Briefcase,
  HardHat,
  Stethoscope,
  Scale,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';

const CAL_BOOKING_URL = 'https://cal.com/boltcall';

const FAQS = [
  {
    q: 'How long is the call?',
    a: 'Fifteen minutes by default. If the fit looks strong on both sides we extend it on the spot. No drawn-out discovery calls and no second-call requirements before you see a plan.',
  },
  {
    q: 'Will I get a sales pitch?',
    a: 'No. The call is a working session. We map your current lead flow, find the gaps where leads are leaking, and hand you a 30-day execution plan. If Boltcall is the right tool for closing those gaps we will say so. If not, we will point you to what is.',
  },
  {
    q: 'Who should be on the call?',
    a: 'Whoever owns the lead-to-booking workflow. That is usually the founder, head of operations, or marketing lead. Bring whoever can answer how new leads arrive today and what happens to them in the first 5 minutes.',
  },
  {
    q: 'What if my business is too small or too early?',
    a: 'If you are getting fewer than 20 leads per month we will tell you, and recommend a lighter setup or no setup at all. Speed-to-lead automation pays back fastest when there is real lead volume to capture.',
  },
  {
    q: 'Do you sign NDAs before the call?',
    a: 'We can. Email noam@boltcall.org with your standard NDA and we will return it signed within a business day.',
  },
];

const WHO_ITS_FOR = [
  {
    icon: Stethoscope,
    label: 'Dental, med spa, and veterinary practices',
    body:
      'Lead volume tied to appointment-slot revenue. A missed call after 5pm is a chair sitting empty tomorrow morning. We target a sub-60-second first response and same-day confirmation rate above 80 percent.',
  },
  {
    icon: HardHat,
    label: 'HVAC, plumbing, roofing, solar, and home services',
    body:
      'High-ticket jobs where the first contractor to call back wins. We focus on after-hours overflow, weekend coverage, and the form-fill-to-text-back sequence that converts paid ad clicks into booked site visits.',
  },
  {
    icon: Scale,
    label: 'Law firms and insurance agencies',
    body:
      'Intake quality matters as much as speed. We design the call flow to qualify leads before they reach a paralegal or licensed agent, and to capture conflict-check data inside the first message. Personal injury, family, immigration, and employment practices benefit most.',
  },
];

const COVER = [
  {
    n: '1',
    title: 'Lead flow audit',
    body:
      'You walk us through every place a new lead enters today: phone, web form, paid ads, Google Business Profile, referrals. We mark the response time and conversion drop at each step.',
  },
  {
    n: '2',
    title: 'Missed-revenue calculation',
    body:
      'Using your monthly lead count and average ticket size, we estimate the dollar value of the leads that went unanswered in the past 30 days. Most local businesses see between 12 and 40 percent revenue leakage here.',
  },
  {
    n: '3',
    title: 'Automation map',
    body:
      'We sketch the exact Boltcall flow for your business: voice agent, text-back, calendar booking, and follow-up cadence. You leave the call with a diagram, not a vague promise.',
  },
  {
    n: '4',
    title: '30-day execution plan',
    body:
      'You get a written punch list of what gets built in week 1, what gets tested in week 2, and what is live by day 30. If you decide not to work with us, the plan is yours to keep and run yourself.',
  },
];

const PREP = [
  'Last 30 days of lead count (calls plus forms plus DMs).',
  'Average revenue per booked customer.',
  'How leads are handled today after-hours and on weekends.',
  'Top 2 lead sources that are growing and top 2 that are flat or declining.',
  'Any tools already in place: CRM, scheduling, missed-call text, voicemail transcription.',
];

const BookCall: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Book a Strategy Call | Boltcall AI Receptionist';
    updateMetaDescription(
      'Book a 15-minute strategy call with Boltcall. We map your lead flow, calculate missed revenue, and hand you a 30-day plan to automate replies, bookings, and follow-ups.'
    );

    let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://boltcall.org/book-a-call/';

    const serviceSchema = document.createElement('script');
    serviceSchema.type = 'application/ld+json';
    serviceSchema.id = 'bookcall-service-schema';
    serviceSchema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Boltcall Speed-to-Lead Strategy Session',
      description:
        '15-minute working session that audits your current lead flow, quantifies missed revenue, and produces a 30-day execution plan for speed-to-lead automation.',
      provider: {
        '@type': 'Organization',
        name: 'Boltcall',
        url: 'https://boltcall.org',
      },
      areaServed: { '@type': 'Country', name: 'United States' },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: CAL_BOOKING_URL,
      },
      audience: {
        '@type': 'BusinessAudience',
        audienceType:
          'Local service businesses: dental, medical, med spa, veterinary, HVAC, plumbing, roofing, solar, law firms, insurance agencies',
      },
    });
    document.head.appendChild(serviceSchema);

    const faqSchema = document.createElement('script');
    faqSchema.type = 'application/ld+json';
    faqSchema.id = 'bookcall-faq-schema';
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
    breadcrumb.id = 'bookcall-breadcrumb';
    breadcrumb.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org/' },
        { '@type': 'ListItem', position: 2, name: 'Book a Call', item: 'https://boltcall.org/book-a-call/' },
      ],
    });
    document.head.appendChild(breadcrumb);

    return () => {
      document.getElementById('bookcall-service-schema')?.remove();
      document.getElementById('bookcall-faq-schema')?.remove();
      document.getElementById('bookcall-breadcrumb')?.remove();
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-500/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-cyan-400/25 blur-3xl" />

      <main className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {/* HERO */}
        <section className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              <Sparkles className="h-4 w-4" />
              Priority strategy session
            </div>

            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Book a Call and Plan Your
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                AI Growth System
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
              In 15 minutes we map your current lead flow, identify exactly where leads are leaking, and hand you a 30-day execution plan to automate replies, bookings, and follow-ups. No pitch, no second discovery call.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={CAL_BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-xl shadow-blue-500/25 transition hover:scale-[1.02]"
              >
                Open Live Calendar
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Back to Pricing
              </Link>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            <h2 className="text-2xl font-bold">What happens on the call</h2>
            <ul className="mt-5 space-y-4 text-sm text-slate-200">
              <li className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-cyan-300" />
                <span>Choose a time that fits your team schedule.</span>
              </li>
              <li className="flex items-start gap-3">
                <PhoneCall className="mt-0.5 h-4 w-4 text-cyan-300" />
                <span>Quick strategy call focused on your current bottlenecks.</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-cyan-300" />
                <span>Get a clear 30-day execution plan before we end the call.</span>
              </li>
            </ul>

            <div className="mt-7 rounded-2xl border border-cyan-200/20 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Instant booking</p>
              <p className="mt-2 text-sm text-slate-200">Click below to lock your slot now.</p>
              <a
                href={CAL_BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-300 px-4 py-3 text-sm font-bold text-slate-900 transition hover:brightness-105"
              >
                Book on Cal.com
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.aside>
        </section>

        {/* WHO THIS IS FOR */}
        <section className="mt-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Who this strategy session is for</h2>
            <p className="mt-4 text-base text-slate-300 sm:text-lg">
              Boltcall is built for local service businesses where the first response to an inbound lead determines whether the job gets booked or lost to a competitor. The call is most useful for the three groups below.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {WHO_ITS_FOR.map((row) => {
              const Icon = row.icon;
              return (
                <article
                  key={row.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
                >
                  <Icon className="h-6 w-6 text-cyan-300" />
                  <h3 className="mt-4 text-lg font-semibold">{row.label}</h3>
                  <p className="mt-3 text-sm text-slate-300">{row.body}</p>
                </article>
              );
            })}
          </div>

          <p className="mt-8 text-center text-sm text-slate-400">
            Not on this list?{' '}
            <Link to="/pricing" className="text-cyan-300 underline-offset-4 hover:underline">
              Check pricing
            </Link>{' '}
            first or email noam@boltcall.org to see if there is a fit.
          </p>
        </section>

        {/* WHAT WE COVER */}
        <section className="mt-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">What we cover in 15 minutes</h2>
            <p className="mt-4 text-base text-slate-300 sm:text-lg">
              The agenda is fixed. Every call follows the same four steps so you leave with something concrete, not a vague promise to follow up.
            </p>
          </div>

          <ol className="mx-auto mt-10 max-w-3xl space-y-5">
            {COVER.map((step) => (
              <li
                key={step.n}
                className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-400 text-base font-bold text-slate-900">
                  {step.n}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* HOW TO PREPARE */}
        <section className="mt-24">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-white/15 bg-white/[0.05] p-8 backdrop-blur">
              <div className="flex items-center gap-3">
                <Briefcase className="h-6 w-6 text-cyan-300" />
                <h2 className="text-2xl font-bold sm:text-3xl">How to prepare</h2>
              </div>
              <p className="mt-4 text-sm text-slate-300 sm:text-base">
                The call is more useful when you bring rough numbers, not perfect numbers. Spend five minutes pulling these together before we meet. If anything is missing, we work with what you have.
              </p>
              <ul className="mt-6 space-y-3">
                {PREP.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-200 sm:text-base">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-24">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-cyan-300" />
              <h2 className="text-3xl font-bold sm:text-4xl">Frequently asked</h2>
            </div>

            <div className="mt-8 space-y-4">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
                >
                  <summary className="cursor-pointer list-none text-base font-semibold text-white">
                    <span className="flex items-center justify-between gap-3">
                      <span>{f.q}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300 transition group-open:rotate-90" />
                    </span>
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mt-24 mb-8">
          <div className="mx-auto max-w-3xl rounded-3xl border border-cyan-200/20 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 p-8 text-center backdrop-blur">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to map it out together?</h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              Pick a 15-minute slot below. You will leave the call with a written 30-day plan, whether or not you decide to work with us.
            </p>
            <a
              href={CAL_BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 to-blue-300 px-7 py-3 text-sm font-bold text-slate-900 shadow-xl shadow-blue-500/25 transition hover:scale-[1.02]"
            >
              Open Live Calendar
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BookCall;
