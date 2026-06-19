import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Clock, Sparkles, Phone } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';
import Breadcrumbs from '../components/Breadcrumbs';

const BlogAIReceptionistMedSpa: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for Med Spas: Never Miss a Booking Again';
    updateMetaDescription('Discover how med spas use AI receptionists to capture every call, book appointments automatically, and stop losing high-value clients to missed calls and slow responses.');

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "AI Receptionist for Med Spas: Never Miss a Booking Again",
      "description": "Discover how med spas use AI receptionists to capture every call, book appointments automatically, and stop losing high-value clients to missed calls and slow responses.",
      "author": {
        "@type": "Organization",
        "name": "Boltcall"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Boltcall",
        "logo": {
          "@type": "ImageObject",
          "url": "https://boltcall.org/boltcall_full_logo.png"
        }
      },
      "datePublished": "2026-04-29",
      "dateModified": "2026-04-29",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/ai-receptionist-med-spas"
      },
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg"
      }
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
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog" },
        { "@type": "ListItem", "position": 3, "name": "AI Receptionist for Med Spas", "item": "https://boltcall.org/blog/ai-receptionist-med-spas" }
      ]
    });
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Boltcall Team",
      "url": "https://boltcall.org/about",
      "worksFor": { "@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org" }
    });
    document.head.appendChild(personScript);

    return () => {
      document.getElementById('person-schema')?.remove();
      document.getElementById('breadcrumb-jsonld')?.remove();
      const scriptToRemove = document.getElementById('article-schema');
      if (scriptToRemove) scriptToRemove.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      {/* Hero Section */}
      <section className="relative pt-32 pb-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl px-4 sm:px-6 lg:px-8" style={{ marginLeft: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left mb-4"
          >
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: 'AI Receptionist for Med Spas', href: '/blog/ai-receptionist-med-spas' }
            ]} />

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              AI Receptionist for <span className="text-blue-600">Med Spas</span>: Never Miss a Booking Again
            </h1>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>April 29, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>8 min read</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">

            {/* Introduction */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="prose prose-lg max-w-none mb-12"
            >
              <p className="text-xl text-gray-700 leading-relaxed font-medium">
                A client calls to book a Botox appointment during your busiest treatment hour. Your
                front desk is occupied. The call rings five times and goes to voicemail. The client
                hangs up and calls the med spa two miles away. They book. You never know it happened.
                An AI receptionist is how med spas make sure every call like that turns into a
                confirmed appointment — not a lost client.
              </p>
            </motion.div>

            {/* Table of Contents */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-12">
              <h2 className="text-base font-bold text-gray-900 mb-4">In This Article</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li><a href="#why-med-spas-lose-bookings" className="text-blue-600 hover:underline text-sm">Why Med Spas Lose Bookings to Missed Calls</a></li>
                <li><a href="#what-an-ai-receptionist-does-for-med-spas" className="text-blue-600 hover:underline text-sm">What an AI Receptionist Does for Med Spas</a></li>
                <li><a href="#high-value-scenarios" className="text-blue-600 hover:underline text-sm">The High-Value Scenarios Where AI Response Wins</a></li>
                <li><a href="#how-to-set-up" className="text-blue-600 hover:underline text-sm">How to Set Up AI Call Handling for Your Med Spa</a></li>
                <li><a href="#revenue-impact" className="text-blue-600 hover:underline text-sm">The Revenue Impact on Med Spa Bookings</a></li>
              </ol>
            </div>

            {/* Section 1 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-16"
            >
              <h2 id="why-med-spas-lose-bookings" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                Why Med Spas Lose Bookings to Missed Calls
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Med spas operate in a specific environment where missed calls are especially
                  costly. Treatments take 30 to 90 minutes. Staff are with clients in treatment
                  rooms and cannot break away to answer the phone. The front desk, if fully staffed,
                  handles check-ins, checkouts, product sales, and scheduling simultaneously. During
                  peak hours — late mornings, lunch hour, and late afternoons — the volume exceeds
                  what any single person can manage.
                </p>

                <p>
                  The result is predictable. Calls ring and go to voicemail. Voicemails sit for
                  hours before anyone listens to them. By the time a callback happens, the client
                  has already booked somewhere else — or has mentally decided to try a different
                  practice altogether.
                </p>

                <p>
                  This problem is compounded by the nature of med spa clientele. These are
                  typically returning clients with disposable income who expect a premium experience.
                  A missed call from a repeat Botox client is not just one lost appointment. It is
                  the loss of a quarterly recurring revenue stream worth $600 to $1,200 per year.
                  A missed call from a new client inquiring about a signature treatment package is
                  the loss of an initial booking plus all future visits and referrals.
                </p>

                <p>
                  The average med spa appointment is worth $200 to $500. The average returning
                  client visits three to four times per year. Every missed call that results in a
                  lost client represents $600 to $2,000 in annual recurring revenue walking out
                  the door — silently, without the business ever knowing.
                </p>
              </div>
            </motion.section>

            {/* Section 2 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-16"
            >
              <h2 id="what-an-ai-receptionist-does-for-med-spas" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                What an AI Receptionist Does for Med Spas
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  An AI receptionist for a med spa answers every call within one ring, handles the
                  conversation naturally, and books the appointment directly into the practice's
                  scheduling system — all without interrupting the treatment in progress or pulling
                  staff away from clients.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Appointment booking</h3>
                <p>
                  When a client calls to book a treatment, the AI asks what service they are
                  interested in, checks real-time availability in the practice's calendar, and
                  offers the specific time slots that are open. The client picks their preferred
                  time, provides their name and contact details, and receives a confirmation.
                  The entire conversation takes two to three minutes. The appointment appears
                  on the provider's schedule immediately.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">New client inquiries</h3>
                <p>
                  When someone calls for the first time to ask about services, pricing, or
                  specific treatments, the AI can be trained to answer the most common questions
                  accurately. Which treatments does the practice offer? What is the price range
                  for Botox or filler? How long does a HydraFacial take? The AI answers these
                  questions conversationally and guides the caller toward booking a consultation
                  or first treatment.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Cancellation and rescheduling</h3>
                <p>
                  Clients who need to cancel or reschedule can do so through the AI without
                  waiting for a callback. The AI updates the calendar, offers an alternative
                  slot, and sends a confirmation. This not only provides a better client
                  experience but also frees up front desk time that would otherwise go toward
                  managing rescheduling calls one at a time.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">After-hours inquiries</h3>
                <p>
                  Med spa leads arrive outside business hours. A client researching treatments
                  at 9pm is ready to commit. An AI that answers that 9pm call, has a real
                  conversation about the service, and books a consultation for Thursday morning
                  has just converted a lead that a voicemail would have lost entirely.
                </p>
              </div>
            </motion.section>

            {/* Section 3 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-16"
            >
              <h2 id="high-value-scenarios" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                The High-Value Scenarios Where AI Response Wins
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  There are specific moments in the med spa client journey where instant response
                  determines whether the practice keeps the revenue or loses it to a competitor.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">The first-time caller</h3>
                <p>
                  A new client calling for the first time is at their highest motivation point.
                  They have done some research, they are ready to book, and they are dialing your
                  number. If that call goes to voicemail, they call the next practice on their
                  list. If the AI answers and has a natural conversation about their interest,
                  explains the service, and books a consultation — that client is yours. They
                  will not call a competitor after a successful conversation with your practice.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">The returning client on a tight schedule</h3>
                <p>
                  Returning clients often call to book their next appointment during a five-minute
                  break at work or during their commute. They cannot sit on hold. They do not
                  want to play phone tag. An AI that answers instantly, recognizes the service
                  they are likely coming in for, and books the appointment in 90 seconds delivers
                  exactly the frictionless experience that keeps premium clients loyal.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">The seasonal package inquiry</h3>
                <p>
                  Around key aesthetic seasons — winter holiday, summer, pre-wedding season — med
                  spas see spikes in inquiries about packages, memberships, and gift cards. These
                  are high-value purchases. A caller who cannot reach anyone to ask questions about
                  a $500 package simply does not buy it. An AI that answers, explains the package
                  clearly, and offers to book a consultation closes deals that would otherwise be
                  lost to friction.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">The urgent skincare concern</h3>
                <p>
                  Clients who develop a sudden skin concern — a reaction, a bruise after treatment,
                  an unexpected result — call immediately. These calls are high priority. The AI
                  can be configured to escalate any post-treatment concern call directly to a
                  provider by text, while keeping the client on the line with reassurance and
                  a clear next step. No client with a post-treatment concern should ever reach a
                  voicemail.
                </p>
              </div>
            </motion.section>

            {/* Section 4 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-16"
            >
              <h2 id="how-to-set-up" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                How to Set Up AI Call Handling for Your Med Spa
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Most med spas are fully set up with an AI receptionist within 24 to 48 hours.
                  The process is straightforward and requires no technical background.
                </p>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 1: Connect your phone number</h3>
                  <p>
                    Forward your main practice number to the AI system, or use an AI-enabled number
                    as your main line. All inbound calls route through the AI. If you want human
                    staff to answer first and the AI to handle overflow only, call forwarding with
                    a two-ring delay accomplishes this.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 2: Connect your booking system</h3>
                  <p>
                    Integrate the AI with your scheduling software — Jane App, Mindbody, Vagaro,
                    or any calendar system you use. The AI needs real-time visibility into available
                    slots to book without double-booking. This integration typically takes less than
                    ten minutes.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 3: Train the AI on your services</h3>
                  <p>
                    Provide the AI with your service menu, pricing ranges, treatment durations,
                    consultation process, and the most common questions your team fields. The AI
                    learns your practice's voice and answers questions the way your best front
                    desk person would.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 4: Set escalation rules</h3>
                  <p>
                    Define which calls need a human immediately: post-treatment concerns, medical
                    questions beyond the AI's knowledge, and any caller who specifically requests
                    to speak with someone. Everything else — booking, rescheduling, general
                    inquiries — the AI handles end-to-end.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Section 5 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-16"
            >
              <h2 id="revenue-impact" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                The Revenue Impact on Med Spa Bookings
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  The math on AI reception for med spas is direct. Consider a practice that receives
                  60 inbound calls per month and currently answers 70% of them in real time. That
                  means 18 calls per month go to voicemail. If half of those callers do not leave a
                  message — which is typical — 9 leads per month disappear completely.
                </p>

                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Example: Med spa with 60 inbound calls/month</h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Before AI: 18 calls go to voicemail. 9 leave no message and are lost permanently.
                    Of the 9 who leave a message, 4 rebook before callback — 5 are lost to delayed
                    response. Total lost: approximately 14 bookings per month at an average value
                    of $280. Monthly revenue loss: $3,920.
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    After AI: every call is answered within one ring. All 18 overflow calls get a
                    real conversation and a booking offer. Conversion from overflow calls: 70%.
                    Additional bookings captured: 12-13 per month. Additional monthly revenue: $3,360-$3,640.
                  </p>
                  <p className="text-gray-700 leading-relaxed font-medium">
                    Annual impact: $40,000 to $44,000 in recovered revenue from calls that were
                    previously being lost to voicemail — from the same client volume, with no
                    additional marketing spend.
                  </p>
                </div>

                <p>
                  Beyond raw booking recovery, med spas that implement AI reception consistently
                  report two secondary benefits: staff morale improves because the front desk is
                  no longer constantly overwhelmed during peak hours, and client satisfaction scores
                  increase because no one ever reaches a voicemail during business hours.
                </p>

                <p>
                  For a practice positioning itself as a premium experience, that consistency
                  matters. Clients who can always reach someone — whether at 10am or 9pm — stay
                  loyal longer and refer more.
                </p>
              </div>
            </motion.section>

            {/* Editor's Note */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-12">
              <p className="text-sm font-bold text-blue-800 mb-1">Note — April 2026</p>
              <p className="text-blue-900 text-sm leading-relaxed">
                The med spa market has seen rapid growth in 2025 and 2026, with new practices
                opening in most major markets. Competition for clients has intensified
                significantly. Practices that implemented instant response systems report retaining
                a measurably higher percentage of first-time callers compared to practices still
                relying on voicemail and manual callbacks.
              </p>
            </div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="my-16"
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 w-full max-w-[800px] group hover:bg-gray-50 transition duration-500 hover:duration-200">
                  <div className="flex justify-center isolate">
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Sparkles className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Phone className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <h2 className="text-gray-900 font-medium mt-4 text-4xl">See How Many Bookings Your Med Spa Is Losing</h2>
                  <p className="text-base text-gray-600 mt-2 whitespace-pre-line">
                    Get a free AI Revenue Audit and find out exactly how much revenue your practice
                    is leaving behind with every missed call, slow response, and after-hours inquiry.
                  </p>
                  <a
                    href="https://boltcall.org/ai-revenue-audit"
                    className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
                  >
                    Get my free AI Revenue Audit
                  </a>
                </div>
              </div>
            </motion.div>

          </article>

          {/* Sidebar TOC */}
          <aside className="hidden xl:block w-64 shrink-0">
            <div>
              <TableOfContents headings={headings} />
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogAIReceptionistMedSpa;
