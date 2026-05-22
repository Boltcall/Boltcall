import React, { useEffect, useState } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Mail, Clock, Zap, Star, CheckCircle, BookOpen, Phone, Calendar, MessageSquare, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import FinalCTA, { BLOG_CTA } from '../components/FinalCTA';

const days = [
  { day: 1, title: "Why AI Is the Best Employee You'll Ever Hire", preview: 'Understand what AI actually does for local businesses — no jargon, no hype.', icon: Star },
  { day: 2, title: "The $10,000 Problem You Don't Know You Have", preview: '78% of customers go with whoever responds first. Are you losing jobs while you sleep?', icon: Zap },
  { day: 3, title: 'How to Never Miss a Lead Again (Even at 2am)', preview: 'The two-part system that catches every lead — 24/7, automatically.', icon: Phone },
  { day: 4, title: "Let AI Fill Your Calendar While You're on the Job", preview: 'Stop playing phone tag. Let AI book appointments while you work.', icon: Calendar },
  { day: 5, title: 'Get More 5-Star Reviews Without Asking Awkwardly', preview: "93% of customers check reviews first. Here's how to double yours in 90 days.", icon: Star },
  { day: 6, title: 'AI That Writes Your Ads, Posts, and Emails for You', preview: "Create a week's worth of content in under 10 minutes using free AI tools.", icon: MessageSquare },
  { day: 7, title: 'Your 30-Day AI Roadmap (Steal This)', preview: 'A prioritized action plan — week by week — so you know exactly what to do next.', icon: BookOpen },
];

const WHO_ITS_FOR = [
  { label: 'Plumbers & HVAC', emoji: '🔧' },
  { label: 'Dentists & Med Spas', emoji: '🦷' },
  { label: 'Lawyers & Consultants', emoji: '⚖️' },
  { label: 'Pest Control', emoji: '🐛' },
  { label: 'Cleaning Services', emoji: '🧹' },
  { label: 'Any local business', emoji: '📍' },
];

const FAQS = [
  {
    q: 'Is the course really free? What is the catch?',
    a: 'The course is 100 percent free with no credit card or trial expiration. The catch — if it counts as one — is that we are Boltcall, an AI receptionist platform, and the course often references how our customers use AI for lead response. You will never receive automated sales calls. You can unsubscribe from any email in one click.',
  },
  {
    q: 'How much time will I actually spend on this each day?',
    a: 'Each email takes about 10 minutes to read and one specific action to implement. Some days the action is 5 minutes (set up a Google review request). Others might be 30 minutes (write your first AI agent prompt). The average across 7 days is around 90 minutes of actual hands-on work.',
  },
  {
    q: 'Do I need any technical skills or existing AI tools?',
    a: 'No. The course is written for owners and operators, not engineers. Every recommended tool has a free tier we walk you through. If a step requires a paid tool, we say so upfront and give you a free alternative.',
  },
  {
    q: 'I run a tiny business — is this still useful for me?',
    a: 'Yes. The course is most valuable for businesses doing 20 or more inbound leads per month. If you are below that, focus on Days 1, 5, and 7 (foundations, reviews, and the 30-day roadmap) and skip the AI receptionist deep-dive on Day 3. The lessons still apply at any size.',
  },
  {
    q: 'What happens after Day 7?',
    a: 'After Day 7 you stay on the Boltcall list for one occasional email per week, no more. Each one is a practical AI tactic for local service businesses. You can unsubscribe at any time from any email.',
  },
];

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

function CourseOptInForm({ id }: { id: string }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'loading' || status === 'success') return;
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/.netlify/functions/brevo-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: firstName.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Something went wrong. Please try again.');
      }
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || 'Something went wrong. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <p className="font-semibold text-gray-900 mb-1">You're in!</p>
        <p className="text-sm text-gray-600">Check your inbox for Day 1 — it's on its way.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        id={`firstName-${id}`}
        type="text"
        autoComplete="given-name"
        placeholder="First name (optional)"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400 bg-white"
        disabled={status === 'loading'}
      />
      <input
        id={`email-${id}`}
        type="email"
        autoComplete="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400 bg-white"
        disabled={status === 'loading'}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending you Day 1...
          </>
        ) : (
          <>Send Me the Course →</>
        )}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-600 text-center">{errorMsg}</p>
      )}
      <p className="text-xs text-gray-400 text-center">No spam. Unsubscribe anytime.</p>
    </form>
  );
}

const AiCoursePage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI in 10 Minutes a Day — Free Email Course for Local Business Owners | Boltcall';
    updateMetaDescription(
      'Free 7-day email course for local business owners. Learn how to use AI to respond faster, book more jobs, and grow — no tech skills needed.'
    );

    // Trailing-slash canonical — matches Netlify's redirect target.
    let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://boltcall.org/ai-course/';

    const courseScript = document.createElement('script');
    courseScript.type = 'application/ld+json';
    courseScript.id = 'aicourse-course-schema';
    courseScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: 'AI in 10 Minutes a Day',
      description:
        'Free 7-day email course for local business owners who want to use AI to respond faster, book more jobs, and grow — no tech skills required.',
      provider: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: 'PT70M',
        instructor: { '@type': 'Organization', name: 'Boltcall' },
      },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      audience: { '@type': 'EducationalAudience', educationalRole: 'Local service business owner' },
      teaches: days.map(d => d.title),
    });
    document.head.appendChild(courseScript);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'aicourse-breadcrumb';
    bcScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org/' },
        { '@type': 'ListItem', position: 2, name: 'Free AI Course', item: 'https://boltcall.org/ai-course/' },
      ],
    });
    document.head.appendChild(bcScript);

    // FAQPage for AEO citation eligibility.
    const faqSchema = document.createElement('script');
    faqSchema.type = 'application/ld+json';
    faqSchema.id = 'aicourse-faq-schema';
    faqSchema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    document.head.appendChild(faqSchema);

    // Speakable flags the hero subhead (.speakable-intro) for voice search.
    const speakableSchema = document.createElement('script');
    speakableSchema.type = 'application/ld+json';
    speakableSchema.id = 'aicourse-speakable';
    speakableSchema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: document.title,
      url: 'https://boltcall.org/ai-course/',
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.speakable-intro'] },
    });
    document.head.appendChild(speakableSchema);

    return () => {
      document.getElementById('aicourse-course-schema')?.remove();
      document.getElementById('aicourse-breadcrumb')?.remove();
      document.getElementById('aicourse-faq-schema')?.remove();
      document.getElementById('aicourse-speakable')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-6 font-semibold">
              <Mail className="w-4 h-4" />
              Free 7-Day Email Course
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              AI in <span className="text-blue-600">10 Minutes</span> a Day
            </h1>

            <p className="speakable-intro text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
              For busy local business owners who want to use AI — but don't have time to figure it out.
            </p>

            <p className="text-gray-500 mb-10">
              One email a day. One win you can implement. Zero tech skills required.
            </p>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-12 text-sm text-gray-600">
              <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-500" /><span>10 min per day</span></div>
              <div className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-blue-500" /><span>7 emails, 7 wins</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-blue-500" /><span>No tech skills needed</span></div>
              <div className="flex items-center gap-1.5"><Star className="w-4 h-4 text-blue-500" /><span>100% free</span></div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md mx-auto shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-1">Get the free course</p>
              <p className="text-xs text-gray-500 mb-5">
                Join local business owners already automating their growth.
              </p>
              <CourseOptInForm id="hero" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Day-by-day breakdown */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What you'll learn — day by day
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Each email covers one practical AI win. By Day 7, you'll have a complete action plan for your business.
            </p>
          </div>

          <div className="space-y-3">
            {days.map(({ day, title, preview, icon: Icon }, i) => (
              <motion.div
                key={day}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex gap-4 p-5 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">{day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm md:text-base">{title}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{preview}</p>
                </div>
                <Icon className="w-4 h-4 text-blue-300 flex-shrink-0 mt-1 hidden sm:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built for busy owners — not tech people
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              If you run a local service business and you're drowning in day-to-day work, this course is for you.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {WHO_ITS_FOR.map(({ label, emoji }) => (
              <div key={label} className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100">
                <span className="text-2xl">{emoji}</span>
                <span className="text-gray-700 font-medium text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Frequently asked</h2>
          <p className="text-gray-600 text-center mb-10">
            Quick answers about the course, what it covers, and what happens after Day 7.
          </p>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <summary className="cursor-pointer list-none text-base font-semibold text-gray-900" style={{ listStyle: 'none' }}>
                  {f.q}
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-gray-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Second opt-in */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Ready to get started?
          </h2>
          <p className="text-gray-600 mb-8">
            Your first email arrives today. It takes 10 minutes to read and one action to implement.
          </p>
          <div className="bg-blue-50 rounded-2xl p-6">
            <CourseOptInForm id="footer" />
          </div>
        </div>
      </section>

      <FinalCTA {...BLOG_CTA} />
      <Footer />
    </div>
  );
};

export default AiCoursePage;
