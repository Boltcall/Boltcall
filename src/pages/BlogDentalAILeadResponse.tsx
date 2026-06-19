import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Clock, Phone } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';
import Breadcrumbs from '../components/Breadcrumbs';

const BlogDentalAILeadResponse: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'How Dental Practices Can Book More New Patients with AI Lead Response';
    updateMetaDescription('Learn how dental offices use AI lead response to book more patients automatically. Speed-to-lead strategies that turn every inquiry into a scheduled appointment.');

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How Dental Practices Can Book More New Patients with AI Lead Response",
      "description": "Learn how dental offices use AI lead response to book more patients automatically. Speed-to-lead strategies that turn every inquiry into a scheduled appointment.",
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
        "@id": "https://boltcall.org/blog/dental-ai-lead-response"
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
        { "@type": "ListItem", "position": 3, "name": "Dental AI Lead Response", "item": "https://boltcall.org/blog/dental-ai-lead-response" }
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
              { label: 'Dental AI Lead Response', href: '/blog/dental-ai-lead-response' }
            ]} />

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              How <span className="text-blue-600">Dental Practices</span> Can Book More New Patients with AI Lead Response
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
                A new patient searches for a dentist near them, finds three options on Google, and
                submits a contact form on each one. She is not a loyal customer yet — she is shopping.
                The dental practice that responds first, with a real conversation and an available
                appointment, earns her business. The other two get ghosted before they even check
                their inbox. AI lead response is how modern dental practices make sure they are
                always first.
              </p>
            </motion.div>

            {/* Table of Contents */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-12">
              <h2 className="text-base font-bold text-gray-900 mb-4">In This Article</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li><a href="#why-dental-practices-lose-new-patients" className="text-blue-600 hover:underline text-sm">Why Dental Practices Lose New Patients Before They Even Walk In</a></li>
                <li><a href="#the-5-minute-rule-for-dental-inquiries" className="text-blue-600 hover:underline text-sm">The 5-Minute Rule for Patient Inquiries</a></li>
                <li><a href="#what-ai-lead-response-looks-like-for-dental" className="text-blue-600 hover:underline text-sm">What AI Lead Response Looks Like in a Dental Practice</a></li>
                <li><a href="#dental-scenarios-where-ai-wins" className="text-blue-600 hover:underline text-sm">Key Dental Scenarios Where AI Response Wins Every Time</a></li>
                <li><a href="#how-to-set-up-ai-lead-response-for-dental" className="text-blue-600 hover:underline text-sm">How to Set Up AI Lead Response for Your Dental Practice</a></li>
                <li><a href="#the-numbers-dental" className="text-blue-600 hover:underline text-sm">The Numbers: What Dental Practices See After Implementing AI</a></li>
              </ol>
            </div>

            {/* Section 1 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-16"
            >
              <h2 id="why-dental-practices-lose-new-patients" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                Why Dental Practices Lose New Patients Before They Even Walk In
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  The average dental office responds to a new patient inquiry in over two hours. By
                  that time, that potential patient has already booked a consultation somewhere else,
                  called three other offices, or simply given up and decided to wait until their
                  current dentist has availability. That is not a hypothetical scenario — it is what
                  happens to the majority of unresponded inquiries every single day.
                </p>

                <p>
                  Dental practices invest thousands of dollars in Google Ads, SEO, and social media
                  to get new patients to reach out. Then a slow follow-up process quietly destroys
                  the return on that investment. The problem is not the marketing. The problem is
                  the gap between inquiry and response.
                </p>

                <p>
                  Research consistently shows that 78% of leads go to the first business to respond.
                  In dentistry, the stakes are compounded by the fact that most patients are not in
                  an emergency situation — they are making a considered choice about which practice
                  feels responsive, professional, and easy to work with. The practice that calls
                  back within five minutes signals all three of those qualities before the patient
                  has even seen the office.
                </p>

                <p>
                  The irony is that most dental front desks are perfectly capable of having that
                  booking conversation — they just cannot have it at the exact moment the patient
                  reaches out, because they are handling check-ins, insurance calls, and patient
                  questions. AI bridges that gap by holding the conversation the moment an inquiry
                  lands, then handing off a booked appointment to the front desk.
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
              <h2 id="the-5-minute-rule-for-dental-inquiries" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                The 5-Minute Rule for Patient Inquiries
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Speed-to-lead research from MIT Sloan found that contacting a lead within the
                  first minute makes you nearly 400% more likely to convert them compared to waiting
                  five minutes. After five minutes, that likelihood drops by more than 80%. After
                  ten minutes, you are ten times less likely to even reach the person.
                </p>

                <p>
                  For dental practices, this translates directly into patient acquisition numbers.
                  A new patient who submits a form at 11am and receives a text response at 11:01am
                  is already in a booking conversation before lunch. A new patient who submits the
                  same form and receives a call at 2pm has already called two other offices, found
                  one with Saturday availability, and confirmed her first appointment.
                </p>

                <div className="my-8">
                  <p className="text-gray-800 font-medium mb-3">Lead decay by response time in a dental context:</p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">Under 1 minute:</span>
                      <span>391% higher conversion — patient is still at their phone, ready to book</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">5 minutes:</span>
                      <span>Conversion drops 80% — patient has opened a competitor's website</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">30 minutes:</span>
                      <span>Patient has likely booked elsewhere or decided to wait</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">2+ hours (dental industry average):</span>
                      <span>The patient is already scheduled somewhere else — your call goes ignored</span>
                    </li>
                  </ul>
                </div>

                <p>
                  The five-minute rule is not about being pushy. It is about being present when the
                  patient's intent is highest. The window of genuine interest and willingness to book
                  is narrow. AI keeps your practice inside that window 24 hours a day, every day of
                  the week.
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
              <h2 id="what-ai-lead-response-looks-like-for-dental" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                What AI Lead Response Looks Like in a Dental Practice
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  AI lead response for dental practices is not a generic chatbot that says "thanks
                  for contacting us, someone will be in touch soon." It is a live, conversational
                  system that engages every new patient inquiry the moment it arrives — through your
                  website form, a missed phone call, or an SMS — and actually books the appointment.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">New patient form submissions</h3>
                <p>
                  When a potential patient fills out a new patient request form on your website, the
                  AI sends a text message response within seconds. Not an automated confirmation email
                  that gets buried in spam — a real text conversation. Something like: "Hi, this is
                  [Practice Name]. We received your request and would love to get you scheduled. Are
                  you looking for a routine cleaning or something specific?" The patient replies,
                  the AI checks your calendar, and the appointment is confirmed in under three
                  minutes.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Missed calls and after-hours inquiries</h3>
                <p>
                  When a patient calls and the front desk is busy or the office is closed, the AI
                  picks up or immediately follows up via text. It greets the caller by your practice
                  name, asks about the reason for their visit, confirms which services you offer,
                  and books a time directly from your scheduling system. The patient never has to
                  call back. Your team walks in the next morning to a filled schedule.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Appointment confirmations and reminders</h3>
                <p>
                  Beyond initial bookings, AI handles the follow-up sequence that reduces no-shows.
                  Automated appointment reminders via text, easy rescheduling links, and pre-visit
                  instructions all flow through the same system. Patients who booked through AI
                  show up at a higher rate because the communication channel they used to book is
                  also the one reminding them to come in.
                </p>

                <div className="bg-gray-900 text-white p-8 rounded-2xl my-8">
                  <h3 className="text-2xl font-bold mb-4">The core promise of AI lead response for dental</h3>
                  <p className="text-lg leading-relaxed text-gray-200">
                    Every new patient inquiry gets a real response within seconds, a real conversation
                    about their dental needs, and a real appointment on your calendar — automatically,
                    around the clock, without adding a single person to your front desk payroll.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Section 4 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-16"
            >
              <h2 id="dental-scenarios-where-ai-wins" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                Key Dental Scenarios Where AI Response Wins Every Time
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  There are specific moments in the new patient journey where response speed
                  determines everything. These are the scenarios where AI lead response has the
                  biggest measurable impact for dental practices.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">1. The new patient comparison search</h3>
                <p>
                  A patient new to the area opens Google and searches for dentists accepting new
                  patients. She finds four options with similar ratings and submits contact forms
                  on all four. She does not have a strong preference — she is running a parallel
                  process. The practice that texts back first owns the conversation. The other three
                  are playing catch-up in a race they do not know has already been decided.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">2. Dental anxiety and urgent requests</h3>
                <p>
                  A patient experiencing tooth pain or anxiety about a procedure is not browsing
                  casually. They are in a heightened emotional state and need reassurance fast.
                  When AI responds immediately, acknowledges their concern, and offers a same-day
                  or next-day appointment, that patient is not just booked — they are relieved.
                  That emotional connection starts before the first office visit.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">3. After-hours inquiries from working patients</h3>
                <p>
                  Many adults can only research and book appointments in the evening after work
                  hours. They search at 8pm, find your practice, and submit a request. Most dental
                  offices have no coverage at that time. AI responds instantly, has the booking
                  conversation, and confirms an appointment — all before the patient goes to sleep.
                  Without AI, that inquiry sits until 9am the next morning when the front desk opens,
                  and by then the patient has already booked somewhere else.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">4. Cosmetic and elective treatment inquiries</h3>
                <p>
                  Patients researching teeth whitening, veneers, or Invisalign are making a
                  discretionary spending decision. They are comparing practices on value, ease, and
                  professionalism. An instant, friendly AI response that immediately offers a
                  consultation time signals that your practice is organized, modern, and easy to
                  work with. That perception is formed in the first exchange, not the first visit.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">5. Pediatric patient bookings from busy parents</h3>
                <p>
                  Parents searching for a dentist for their child have limited time and even less
                  patience for slow follow-ups. They often search during short breaks in their day
                  and need to complete the booking in that same window. An AI that responds in 30
                  seconds, confirms you accept their insurance type, and offers two available time
                  slots earns the booking before the parent returns to their next meeting.
                </p>
              </div>
            </motion.section>

            {/* Section 5 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-16"
            >
              <h2 id="how-to-set-up-ai-lead-response-for-dental" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                How to Set Up AI Lead Response for Your Dental Practice
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Setting up AI lead response does not require a technology background or a large
                  budget. Most dental practices are fully live within 24 to 48 hours. Here is the
                  step-by-step process.
                </p>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 1: Map your inbound channels</h3>
                  <p>
                    List every place where new patients currently reach out: your website contact
                    form, new patient request form, Google Business Profile calls, social media
                    messages, and your main phone line. All of these become inputs to the AI response
                    system. Most integrations connect via webhook or direct API in under 15 minutes.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 2: Connect your scheduling system</h3>
                  <p>
                    The AI needs access to your real-time calendar to offer actual available
                    appointment slots without double-booking. Whether you use Dentrix, Eaglesoft,
                    Open Dental, or a general scheduling tool, connect it to the AI system and define
                    which appointment types can be booked automatically — typically new patient
                    cleanings, consultations, and emergency slots.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 3: Configure your practice knowledge</h3>
                  <p>
                    Give the AI the information it needs to have real conversations with patients:
                    your accepted insurance plans, the services you offer, your service area, hours,
                    and any qualifying questions you want to ask before booking (new patient vs.
                    existing patient, age range for pediatric services, type of treatment needed).
                    This configuration takes 20 to 30 minutes and can be updated at any time.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 4: Define your handoff rules</h3>
                  <p>
                    Set the conditions under which the AI escalates to a human team member. Most
                    dental practices escalate for patients with complex treatment histories, specific
                    insurance questions that require verification, or callers who explicitly ask to
                    speak with someone. Everything else — the majority of new patient inquiries —
                    the AI handles completely from inquiry to booked appointment.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 5: Go live and review the first week</h3>
                  <p>
                    Once live, every AI conversation is logged and visible in your dashboard. You
                    can review how the AI handled each inquiry, see which appointments it booked,
                    and adjust its responses based on what you observe. Most dental practices see
                    their first AI-booked new patient appointment within hours of going live.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Section 6 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mb-16"
            >
              <h2 id="the-numbers-dental" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                The Numbers: What Dental Practices See After Implementing AI
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  The impact of AI lead response on dental practices shows up in measurable metrics
                  from the first week. Here is what the typical pattern looks like:
                </p>

                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Example: General dental practice, 60 new patient inquiries/month</h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Before AI: average 2-hour response time during business hours, no after-hours
                    coverage, manual callbacks from the front desk. Conversion rate of approximately
                    15% — 9 new patients per month at an average first-year patient value of $800.
                    Monthly new patient revenue: $7,200.
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    After AI: instant response to every inquiry 24/7, automated booking, structured
                    follow-up sequence. Conversion rate increases to 35% — 21 new patients per month
                    at the same average value. Monthly new patient revenue: $16,800.
                  </p>
                  <p className="text-gray-700 leading-relaxed font-medium">
                    That is $9,600 in additional monthly revenue — $115,200 per year — from the
                    same inquiry volume, with no additional marketing spend and no added headcount.
                  </p>
                </div>

                <p>
                  Beyond the headline conversion rate improvement, dental practices consistently
                  report three additional benefits after implementing AI lead response:
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">After-hours patient capture</h3>
                <p>
                  Research shows that 30 to 40 percent of dental inquiries arrive outside normal
                  business hours — evenings and weekends when patients have time to research and
                  book. Before AI, those inquiries were invisible to the practice. After AI, they
                  are captured and converted at the same rate as daytime inquiries. For a practice
                  with 60 monthly inquiries, that is 18 to 24 leads per month that were previously
                  going to competitors simply because no one was available to respond.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Front desk capacity freed up</h3>
                <p>
                  When AI handles new patient intake conversations, the front desk can focus on
                  the patients already in the office, insurance verification for complex cases,
                  and treatment plan follow-ups. Patient experience improves because the staff is
                  less overwhelmed, and the quality of in-person interactions goes up while the
                  volume of routine administrative tasks goes down.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Reduced no-shows from AI-booked patients</h3>
                <p>
                  Patients booked through AI tend to show up at higher rates because the booking
                  was confirmed through a real-time text conversation and immediately followed by
                  automated reminders. The channel that booked them is the same channel reminding
                  them, which means response rates on reminder texts are significantly higher than
                  generic email reminders. Most practices implementing AI-powered booking with
                  automated follow-up see no-show rates drop by 20 to 30 percent within the first
                  three months.
                </p>
              </div>
            </motion.section>

            {/* Editor's Note */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-12">
              <p className="text-sm font-bold text-blue-800 mb-1">Note — April 2026</p>
              <p className="text-blue-900 text-sm leading-relaxed">
                Dental practices that have implemented AI lead response in 2025 and 2026 are
                capturing new patient market share from competitors still relying on manual
                callbacks. The expectation from patients has shifted: instant response is no longer
                a differentiator — it is a baseline requirement. Practices that respond in two-plus
                hours are not seen as slow. They are simply not seen.
              </p>
            </div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="my-16"
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 w-full max-w-[800px] group hover:bg-gray-50 transition duration-500 hover:duration-200">
                  <div className="flex justify-center isolate">
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Phone className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <h2 className="text-gray-900 font-medium mt-4 text-4xl">See How Many New Patients You Are Currently Losing</h2>
                  <p className="text-base text-gray-600 mt-2 whitespace-pre-line">
                    Get a free AI Revenue Audit and find out exactly how much revenue your dental
                    practice is leaving behind with every missed inquiry, slow response, and
                    after-hours lead that goes unanswered.
                  </p>
                  <a
                    href="https://boltcall.org"
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

export default BlogDentalAILeadResponse;
