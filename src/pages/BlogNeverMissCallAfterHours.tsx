import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Phone, Zap, CheckCircle, XCircle, Users } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const BlogNeverMissCallAfterHours: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Never Miss a Call After Business Hours | Boltcall';
    updateMetaDescription('Stop losing leads after hours. Learn how smart local businesses handle after-hours calls with AI — no staff, no voicemail, no missed revenue.');

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Never Miss a Call After Business Hours (Here's How Smart Businesses Do It)",
      "description": "Stop losing leads after hours. Learn how smart local businesses handle after-hours calls with AI — no staff, no voicemail, no missed revenue.",
      "author": { "@type": "Organization", "name": "Boltcall" },
      "publisher": {
        "@type": "Organization",
        "name": "Boltcall",
        "logo": { "@type": "ImageObject", "url": "https://boltcall.org/boltcall_full_logo.png" }
      },
      "datePublished": "2026-04-12",
      "dateModified": "2026-04-12",
      "mainEntityOfPage": { "@type": "WebPage", "@id": "https://boltcall.org/blog/never-miss-a-call-after-business-hours" },
      "image": { "@type": "ImageObject", "url": "https://boltcall.org/og-image.jpg" }
    };

    const existingScript = document.getElementById('article-schema');
    if (existingScript) existingScript.remove();
    const script = document.createElement('script');
    script.id = 'article-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(articleSchema);
    document.head.appendChild(script);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog" },
        { "@type": "ListItem", "position": 3, "name": "Never Miss a Call After Business Hours", "item": "https://boltcall.org/blog/never-miss-a-call-after-business-hours" }
      ]
    });
    document.head.appendChild(bcScript);

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'faq-schema';
    faqScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How much does an after-hours answering service cost?",
          "acceptedAnswer": { "@type": "Answer", "text": "Traditional live answering services cost $200–$500/month for basic after-hours coverage. AI-based solutions like Boltcall start at $99–$179/month and include instant SMS follow-up, appointment booking, and lead qualification — capabilities live services don't offer." }
        },
        {
          "@type": "Question",
          "name": "Is an after-hours answering service better than voicemail?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes — significantly. 80% of callers don't leave voicemails and most don't call back. An AI answering service captures callers in real time, sends immediate acknowledgment, and routes urgent calls appropriately. Voicemail is passive; a proper answering system is active." }
        },
        {
          "@type": "Question",
          "name": "Will callers know they're speaking to an AI after hours?",
          "acceptedAnswer": { "@type": "Answer", "text": "With modern AI voice technology, most callers cannot tell the difference in a standard after-hours interaction. The AI speaks naturally and responds in context — not from a rigid script. The AI should always identify itself as automated if directly asked." }
        },
        {
          "@type": "Question",
          "name": "How quickly can I set up after-hours AI call handling?",
          "acceptedAnswer": { "@type": "Answer", "text": "With Boltcall, setup takes less than 24 hours. You provide your business details, services, and routing rules, and the AI goes live on your phone number the same day. No hardware required — it runs in the cloud on your existing business number." }
        }
      ]
    });
    document.head.appendChild(faqScript);

    return () => {
      document.getElementById('article-schema')?.remove();
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('faq-schema')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      <section className="relative pt-32 pb-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl px-4 sm:px-6 lg:px-8" style={{ marginLeft: 0 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-left mb-4">
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: 'Never Miss a Call After Hours', href: '/blog/never-miss-a-call-after-business-hours' }
            ]} />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              Never Miss a <span className="text-blue-600">Call After Business Hours</span> (Here's How Smart Businesses Do It)
            </h1>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>April 12, 2026</span></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>11 min read</span></div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="prose prose-lg max-w-none mb-12">
              <p className="text-xl text-gray-700 leading-relaxed font-medium">
                Every call you miss after business hours is a potential customer who just called your competitor next. If you want to never miss a call after business hours, the answer isn't hiring a night-shift receptionist or sleeping with your phone — it's building a system that answers, qualifies, and responds for you automatically.
              </p>
            </motion.div>

            {/* Section 1 */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16" id="why-after-hours-calls-cost-you">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Why After-Hours Calls Are Costing You More Than You Think</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">Most business owners assume missed after-hours calls are no big deal — the customer will just call back in the morning. The data says otherwise.</p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
                  <div className="text-3xl font-bold text-blue-600 mb-2">80%</div>
                  <p className="text-gray-700">of callers who reach voicemail will not leave a message — and the majority will not call back. They move on to the next result.</p>
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">That alone should change how you think about after-hours coverage. But the problem compounds when you factor in speed. Leads called back within 5 minutes are <strong>21x more likely to convert</strong> than those called back after 30 minutes. Wait until the next morning and you're not in the running at all.</p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
                  <div className="text-3xl font-bold text-blue-600 mb-2">62%</div>
                  <p className="text-gray-700">of customers expect a response from a business within 10 minutes of reaching out — regardless of what time they called.</p>
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">For local service businesses — plumbers, dentists, law firms, contractors — this is especially painful. A homeowner with a burst pipe at 9pm is not going to wait until 9am. They're going to call whoever answers first. If that's not you, you've lost the job before the day even started.</p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
                  <div className="text-3xl font-bold text-blue-600 mb-2">40%</div>
                  <p className="text-gray-700">of calls to the average small business go unanswered — with after-hours being the single largest source of missed calls.</p>
                </div>
              </div>
              <img src="/images/blog/after-hours-01.jpg" alt="Missed call on a business owner's phone late at night — the cost of not having after-hours coverage" width={1200} height={675} loading="lazy" decoding="async" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px" className="rounded-xl my-6 mx-auto block max-w-2xl" />
            </motion.section>

            {/* Section 2 */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16" id="what-customers-expect-after-hours">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">What Customers Actually Expect When They Call After Hours</h2>
              <div className="prose prose-lg max-w-none">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                  <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">Direct Answer</p>
                  <p className="text-gray-800 leading-relaxed">When customers call after hours, they expect to either speak with someone or receive an immediate acknowledgment — a text, a callback time, or a confirmation that their message was received. A generic voicemail with no follow-up is no longer acceptable to most callers, especially for urgent service inquiries.</p>
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">Customer expectations have shifted significantly. A decade ago, leaving a voicemail was fine. Today, with live chat, instant text replies, and same-day service as the norm, callers expect near-instant acknowledgment even outside of business hours.</p>
                <p className="text-gray-700 leading-relaxed mb-3">What they actually want, in order of preference:</p>
                <ol className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</span>
                    <span className="text-gray-700"><strong>To speak with someone</strong> — a live person or a capable AI that can answer their question or take a booking</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</span>
                    <span className="text-gray-700"><strong>An immediate text reply</strong> — something that acknowledges their call and tells them exactly when to expect a callback</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</span>
                    <span className="text-gray-700"><strong>Self-service booking</strong> — for non-urgent inquiries, the ability to schedule an appointment without waiting</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">4</span>
                    <span className="text-gray-700"><strong>A voicemail with a clear callback time</strong> — the bare minimum that still keeps the caller engaged</span>
                  </li>
                </ol>
                <p className="text-gray-700 leading-relaxed">Notice that a blank voicemail with no follow-up isn't on the list. That's the version most businesses offer — and it's why they keep losing after-hours leads.</p>
              </div>
            </motion.section>

            {/* Section 3 */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16" id="3-ways-businesses-handle-it-wrong">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">The 3 Ways Most Businesses Handle After-Hours Calls Wrong</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-8">Before you can fix the problem, it helps to recognize which broken approach you're currently using.</p>
                <div className="space-y-6 mb-8">
                  <div className="flex items-start gap-4 p-6 rounded-xl border border-red-100 bg-red-50">
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">Just letting it ring</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">No voicemail, no text, no callback. The caller hears a dead line and moves on. This is the worst option — it signals the business is either closed for good or doesn't care. You lose the lead instantly with zero chance of recovery.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-6 rounded-xl border border-red-100 bg-red-50">
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">Answering every call yourself, no matter the time</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">This is unsustainable and costs you sleep, focus, and personal time. Worse, it sets a precedent with customers that you're available 24/7 — and when you eventually can't answer at 11pm on a Saturday, they feel ignored. It's not a system, it's a trap.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-6 rounded-xl border border-red-100 bg-red-50">
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">A generic voicemail with no follow-up</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">"You've reached [Business Name], leave a message." Most callers hang up before the beep. Those who do leave a message often never hear back in a reasonable time. No auto-text, no callback trigger, no urgency — just hope. Hope is not a system.</p>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">All three of these approaches have one thing in common: they rely on the customer to be patient. In 2026, patience is not a feature most leads have — especially when they can find a competitor who answers immediately.</p>
              </div>
            </motion.section>

            {/* Section 4 */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16" id="what-a-good-after-hours-system-looks-like">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">What a Proper After-Hours Call System Looks Like</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-8">A good after-hours call system does four things automatically, without you lifting a finger:</p>
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-start gap-3 p-5 rounded-xl bg-blue-50 border border-blue-100">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div><p className="font-semibold text-gray-900 mb-1">Answers or acknowledges every call</p><p className="text-sm text-gray-600">No caller hits a dead line or an impersonal generic message</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-5 rounded-xl bg-blue-50 border border-blue-100">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div><p className="font-semibold text-gray-900 mb-1">Sends an immediate text reply</p><p className="text-sm text-gray-600">Confirms the call was received and sets a callback expectation</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-5 rounded-xl bg-blue-50 border border-blue-100">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div><p className="font-semibold text-gray-900 mb-1">Qualifies the caller</p><p className="text-sm text-gray-600">Captures name, service need, and urgency so you can prioritize callbacks</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-5 rounded-xl bg-blue-50 border border-blue-100">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div><p className="font-semibold text-gray-900 mb-1">Books or escalates when appropriate</p><p className="text-sm text-gray-600">Schedules appointments for non-urgent calls, alerts you for emergencies</p></div>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">This doesn't require a 24/7 live receptionist — those cost $1,500–$3,000/month and still have gaps. What it requires is a system that runs on its own: intelligent enough to handle routine after-hours calls, and smart enough to know when to alert you for something genuinely urgent.</p>
                <p className="text-gray-700 leading-relaxed">The key distinction is automation with intelligence — not a voicemail box, not a call center that reads a script, but a system that understands the context of why someone is calling and responds accordingly.</p>
              </div>
              <img src="/images/blog/after-hours-02.jpg" alt="AI phone receptionist dashboard automatically handling after-hours calls and booking appointments" width={1200} height={675} loading="lazy" decoding="async" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px" className="rounded-xl my-6 mx-auto block max-w-2xl" />
            </motion.section>

            {/* Section 5 */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16" id="how-ai-receptionists-handle-after-hours-calls">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">How AI Receptionists Handle After-Hours Calls Differently</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">Traditional answering services assign a human agent to pick up your after-hours calls. That agent follows a script, takes a message, and emails it to you. It works — but it costs $200–$500/month just for basic coverage, the agent doesn't know your business, and there's no intelligence behind the interaction.</p>
                <p className="text-gray-700 leading-relaxed mb-6">AI receptionists — like <Link to="/ai-receptionist" className="text-blue-600 hover:underline">Boltcall's AI phone receptionist</Link> — work differently. Instead of reading from a script, the AI is trained specifically on your business: your services, your pricing, your booking process, your FAQs. When someone calls at 10pm, it doesn't just take a message — it can:</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3"><Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Answer the call naturally in under 2 seconds, with no hold music</span></li>
                  <li className="flex items-start gap-3"><Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Understand the urgency of the situation and ask relevant follow-up questions</span></li>
                  <li className="flex items-start gap-3"><Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Collect name, address, and nature of the problem — fully qualifying the lead</span></li>
                  <li className="flex items-start gap-3"><Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Book directly into your calendar for non-emergency appointments</span></li>
                  <li className="flex items-start gap-3"><Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Send an SMS follow-up to both you and the caller with a summary</span></li>
                </ul>
                <p className="text-gray-700 leading-relaxed mb-6">The caller never knows they're speaking with AI. The conversation feels natural, the response is immediate, and you wake up in the morning with a full briefing of every after-hours interaction — who called, why, what was discussed, and what action was taken.</p>
                <p className="text-gray-700 leading-relaxed">This is what makes AI the category winner for after-hours call handling. It's not just cheaper than a live answering service — it's more capable, available every night of the year, and gets smarter the more it learns about your business.</p>
              </div>
            </motion.section>

            {/* Section 6 */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16" id="after-hours-call-setup-by-industry">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">After-Hours Call Setup by Industry (Real Examples)</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-8">The right after-hours setup depends on your industry. Here's how it looks in practice for three common local service businesses:</p>
                <div className="space-y-6 mb-8">
                  <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-3"><Phone className="w-5 h-5 text-blue-600" /><h3 className="font-bold text-gray-900">Plumbers and HVAC contractors</h3></div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">After-hours calls are often genuine emergencies — burst pipes, no heat in winter, broken AC in summer. The AI answers immediately, confirms the emergency, collects the address, and sends an urgent alert to the on-call technician. Non-emergency calls get booked into next-day slots automatically. Not a single lead falls through the cracks.</p>
                    <p className="text-sm text-blue-600 font-medium">Key feature: Emergency escalation + automatic booking</p>
                  </div>
                  <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-3"><Phone className="w-5 h-5 text-blue-600" /><h3 className="font-bold text-gray-900">Dental offices</h3></div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">Dental emergencies (severe pain, broken tooth) need a different response than appointment requests. The AI differentiates between the two in real time. Emergencies are routed to the on-call dentist. New patient appointment requests are booked directly, eliminating the phone tag that loses new patients before they ever come in.</p>
                    <p className="text-sm text-blue-600 font-medium">Key feature: Intent detection + new patient booking</p>
                  </div>
                  <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-3"><Phone className="w-5 h-5 text-blue-600" /><h3 className="font-bold text-gray-900">Law firms</h3></div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">Potential clients often call law firms after hours in moments of stress — an arrest, an accident, a received legal notice. The AI answers professionally, takes the intake details, and schedules a free consultation. High-urgency cases trigger an immediate alert to the on-call attorney. Every lead is captured, every intake is documented.</p>
                    <p className="text-sm text-blue-600 font-medium">Key feature: Intake capture + consultation scheduling</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">The pattern is consistent across industries: the AI handles the routine, escalates the urgent, and makes sure you never start a business day wondering how many leads you lost the night before. See how <Link to="/blog/ai-receptionist-how-it-works" className="text-blue-600 hover:underline">AI receptionists work in detail</Link> for a deeper look.</p>
              </div>
            </motion.section>

            {/* Section 7 — FAQ */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16" id="frequently-asked-questions">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3">How much does an after-hours answering service cost?</h3>
                  <p className="text-gray-700 leading-relaxed">Traditional live answering services typically cost $200–$500/month for basic after-hours coverage. AI-based solutions like Boltcall start significantly lower — around $99–$179/month — and include capabilities that live services don't offer, like instant SMS follow-up, appointment booking, and lead qualification. For most small businesses, AI is both cheaper and more effective.</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Is an after-hours answering service better than voicemail?</h3>
                  <p className="text-gray-700 leading-relaxed">Yes — significantly. Voicemail has a check-rate problem: 80% of callers don't leave messages, and those who do often wait hours for a callback. An answering service (especially AI-powered) captures the caller in real time, sends an immediate acknowledgment, and routes urgent calls appropriately. Voicemail is passive; a proper answering system is active.</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Will callers know they're speaking to an AI?</h3>
                  <p className="text-gray-700 leading-relaxed">With modern AI voice technology, most callers cannot tell the difference in a standard after-hours interaction. The AI speaks naturally, handles common questions, and responds in context — not from a rigid script. That said, the AI should always identify itself as an automated assistant if directly asked. Transparency matters and is increasingly regulated.</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3">How quickly can I set up after-hours AI call handling?</h3>
                  <p className="text-gray-700 leading-relaxed">With Boltcall, setup takes less than 24 hours. You provide your business details, services, and routing rules, and the AI is trained and live on your phone number the same day. There's no hardware to install and no staff to train — it runs entirely in the cloud on your existing business number.</p>
                </div>
              </div>
            </motion.section>

            {/* CTA */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 w-full max-w-[800px] group hover:bg-gray-50 transition duration-500 hover:duration-200">
                  <div className="flex justify-center isolate">
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Phone className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <h2 className="text-gray-900 font-medium mt-4 text-4xl">Fast. Simple. Scalable.</h2>
                  <p className="text-base text-gray-600 mt-2 whitespace-pre-line">Get your helper ready in 5 minutes. It is free. Connect it to your phone, website, and messages.</p>
                  <Link
                    to="/setup"
                    className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
                  >
                    Start the free setup
                  </Link>
                </div>
              </div>
            </motion.section>

            {/* Related Posts */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Link to="/blog/ai-receptionist-how-it-works" className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <span className="text-sm text-blue-600 font-medium">AI Receptionist</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">How AI Receptionists Work: A Plain-English Explainer</h3>
                  <p className="text-gray-600 mt-2 text-sm">Understand exactly what happens when an AI answers your calls — and why modern AI sounds nothing like the robots of five years ago.</p>
                </Link>
                <Link to="/blog/why-speed-matters" className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <span className="text-sm text-blue-600 font-medium">Speed to Lead</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">The 391% Advantage: Why Responding to Leads in 60 Seconds Matters</h3>
                  <p className="text-gray-600 mt-2 text-sm">The data behind speed-to-lead — and what it means for every call you miss after hours.</p>
                </Link>
                <Link to="/blog/does-response-time-affect-local-business-job-conversion" className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <span className="text-sm text-blue-600 font-medium">Lead Conversion</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">Does Response Time Affect Whether a Local Business Gets the Job?</h3>
                  <p className="text-gray-600 mt-2 text-sm">The MIT Sloan data on response windows and what it means for every minute you delay.</p>
                </Link>
                <Link to="/blog/why-local-businesses-lose-customers-not-answering-calls" className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <span className="text-sm text-blue-600 font-medium">Lead Response</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">Why Local Businesses Lose Customers by Not Answering Quickly Enough</h3>
                  <p className="text-gray-600 mt-2 text-sm">The urgency dynamic behind customer decisions and the real cost of slow response.</p>
                </Link>
              </div>
            </motion.section>

          </article>

          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-32"><TableOfContents headings={headings} /></div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogNeverMissCallAfterHours;
