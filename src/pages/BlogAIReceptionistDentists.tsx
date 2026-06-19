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
import KeyTakeaways from '../components/blog/KeyTakeaways';

const BlogAIReceptionistDentists: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for Dentists: Stop Losing Patients to Missed Calls | Boltcall';
    updateMetaDescription('How dental practices use AI receptionists to answer every call, book appointments 24/7, and stop losing new patients to missed calls. Practical guide for dentists.');

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "AI Receptionist for Dentists: Stop Losing Patients to Missed Calls",
      "description": "How dental practices use AI receptionists to answer every call, book appointments 24/7, and stop losing new patients to missed calls.",
      "author": {
        "@type": "Person",
        "name": "Boltcall Team",
        "url": "https://boltcall.org/about"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Boltcall",
        "logo": {
          "@type": "ImageObject",
          "url": "https://boltcall.org/boltcall_full_logo.png"
        }
      },
      "datePublished": "2026-05-01",
      "dateModified": "2026-05-01",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/ai-receptionist-for-dentists"
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
        { "@type": "ListItem", "position": 3, "name": "AI Receptionist for Dentists", "item": "https://boltcall.org/blog/ai-receptionist-for-dentists" }
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
      document.getElementById('article-schema')?.remove();
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
              { label: 'AI Receptionist for Dentists', href: '/blog/ai-receptionist-for-dentists' }
            ]} />

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              AI Receptionist for <span className="text-blue-600">Dentists</span>: Stop Losing Patients to Missed Calls
            </h1>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>May 1, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>9 min read</span>
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
                One in three calls to the average dental practice goes unanswered. The patient on
                the other end — often a new patient who found you on Google — does not wait. They
                hang up, call the next practice on the list, and book there. An AI receptionist
                answers every call instantly, handles appointment booking around the clock, and
                makes sure your practice never loses a patient to a missed call again.
              </p>
            </motion.div>

            <KeyTakeaways items={[
              '1 in 3 dental calls goes unanswered — every missed call is a patient choosing the practice next door.',
              'AI receptionists answer instantly 24/7, book appointments in real time, and send automated reminders to cut no-shows.',
              'New patient acquisition costs $200–$400; answering that first call with AI pays for itself in one booking.',
              'AI handles routine calls (scheduling, hours, insurance FAQs) while flagging dental emergencies for immediate human follow-up.',
              'Dental practices using AI answering typically see a 25–40% increase in booked appointments within 60 days.',
            ]} />

            {/* Table of Contents */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-12">
              <h2 className="text-base font-bold text-gray-900 mb-4">In This Article</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li><a href="#the-missed-call-problem" className="text-blue-600 hover:underline text-sm">The Missed Call Problem in Dental Practices</a></li>
                <li><a href="#what-an-ai-receptionist-does" className="text-blue-600 hover:underline text-sm">What an AI Receptionist Does for a Dental Office</a></li>
                <li><a href="#three-scenarios-where-ai-wins" className="text-blue-600 hover:underline text-sm">The 3 Scenarios Where AI Wins Every Time for Dentists</a></li>
                <li><a href="#what-to-look-for" className="text-blue-600 hover:underline text-sm">What to Look for in a Dental AI Receptionist</a></li>
                <li><a href="#how-to-set-up" className="text-blue-600 hover:underline text-sm">How to Set Up AI Response for Your Dental Practice</a></li>
                <li><a href="#the-results" className="text-blue-600 hover:underline text-sm">What Dental Practices See After Implementing AI</a></li>
              </ol>
            </div>

            {/* Section 1 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-16"
            >
              <h2 id="the-missed-call-problem" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                The Missed Call Problem in Dental Practices
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Dental front desks are among the busiest in any service industry. Staff are juggling
                  check-ins, insurance verifications, treatment plan questions, and checkout
                  simultaneously — and the phone keeps ringing. When the front desk cannot answer,
                  calls go to voicemail. Most patients do not leave one.
                </p>

                <p>
                  Industry data confirms the scale of the problem: 35% of dental calls go unanswered
                  during peak hours. Of the patients who reach voicemail, 75% never call back — they
                  simply call another practice. And 40% of appointment requests arrive outside of
                  standard business hours, when no one is available to answer at all.
                </p>

                <p>
                  The revenue impact is significant. Each missed new patient call represents an
                  estimated $800 to $1,200 in lifetime value. A practice missing 30 to 50 new patient
                  calls per month is losing $24,000 to $60,000 in annual revenue — not from bad
                  clinical outcomes, but from a phone that rang without being answered.
                </p>

                <p>
                  The problem is structural, not staffing. Even well-run practices with excellent
                  front desk teams cannot answer every call simultaneously. The solution is not hiring
                  more people — it is automating the first layer of response so every call gets an
                  immediate answer regardless of what else is happening in the office.
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
              <h2 id="what-an-ai-receptionist-does" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                What an AI Receptionist Does for a Dental Office
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  An AI receptionist for dentists is a voice and messaging system that handles
                  inbound patient contact automatically. When a patient calls — during a busy morning,
                  at lunch, after hours, or on weekends — the AI picks up instantly, greets the patient
                  naturally, and handles their request end to end without transferring to voicemail.
                </p>

                <p>
                  The core functions an AI dental receptionist handles:
                </p>

                <ul className="space-y-3 ml-4">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span><strong>Appointment booking:</strong> Checks real-time availability in your practice management system and books new appointments, cleanings, consultations, and follow-ups directly — no staff intervention required.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span><strong>Rescheduling and cancellations:</strong> Handles patient-initiated changes, fills open slots from a waitlist, and sends confirmation messages automatically.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span><strong>New patient intake:</strong> Captures name, contact info, insurance details, and reason for visit — so when the patient arrives, your team already has the information they need.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span><strong>Common questions:</strong> Answers questions about office hours, accepted insurance plans, directions, parking, and procedures — handling the calls that consume significant front desk time each day.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span><strong>Emergency routing:</strong> Identifies urgent situations and immediately escalates to the appropriate team member — dental emergencies are never handled by an automated loop.</span>
                  </li>
                </ul>

                <p>
                  The AI integrates with major dental practice management systems including Dentrix,
                  Open Dental, Eaglesoft, Denticon, and Curve, so appointments booked through the AI
                  appear in your schedule in real time with no double-booking risk.
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
              <h2 id="three-scenarios-where-ai-wins" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                The 3 Scenarios Where AI Wins Every Time for Dentists
              </h2>

              <div className="space-y-8 text-gray-700 leading-relaxed">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Scenario 1: After-hours new patient calls</h3>
                  <p>
                    A prospective patient has a toothache and finally decides to call a dentist at
                    8:30 PM on a Tuesday. Your office is closed. Without an AI receptionist, they reach
                    voicemail, leave no message, and call the practice down the street that does have
                    AI answering. With an AI receptionist, they are greeted immediately, booked into
                    your first available slot the next morning, and sent a confirmation text — all
                    while you are not in the building. The patient wakes up as your confirmed
                    appointment, not your competitor's.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Scenario 2: Peak morning overflow</h3>
                  <p>
                    Monday mornings in a dental practice are notoriously busy. The phone rings 4 times
                    before 9 AM, the front desk is checking in two patients simultaneously, and the
                    insurance line has someone on hold. Two calls get missed. Without AI, those two
                    patients go to voicemail and likely never call back. With AI handling overflow,
                    both calls are answered instantly in parallel — the AI is not limited to one line —
                    and both patients are booked before they have a chance to try a different practice.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Scenario 3: Recall and reactivation outreach</h3>
                  <p>
                    Patients who are overdue for cleanings or have unscheduled treatment plans
                    represent significant untapped revenue. An AI system can proactively reach out to
                    these patients via SMS — "Hi Sarah, it has been 8 months since your last cleaning
                    — here are two available slots this week if you would like to get back on schedule"
                    — and book them directly without front desk involvement. Most practices see 15 to
                    25% of reactivation outreach convert into booked appointments.
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
              <h2 id="what-to-look-for" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                What to Look for in a Dental AI Receptionist
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Not every AI receptionist tool is built for dental workflows. When evaluating
                  options, these are the capabilities that actually determine ROI for a dental practice:
                </p>

                <ul className="space-y-4 ml-4">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span><strong>Direct PMS integration:</strong> The AI must write appointments into your practice management system in real time, not just collect information that staff later needs to manually enter. Real-time sync eliminates double-booking and data entry errors.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span><strong>Natural voice quality:</strong> Patients call a dentist in a moment of trust. The AI voice needs to sound calm, professional, and human — not robotic. Poor voice quality creates a negative first impression that affects whether the patient follows through.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span><strong>24/7 availability:</strong> The value of AI is primarily in the hours your staff is not available. A system that only works during business hours misses the highest-value call window — after hours, weekends, and holidays.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span><strong>HIPAA compliance:</strong> Patient data collected during AI calls must be handled in compliance with HIPAA. Confirm any vendor you consider has documented HIPAA compliance and appropriate data handling agreements.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span><strong>Emergency escalation logic:</strong> The system must reliably recognize dental emergencies — severe pain, swelling, post-op complications — and route those calls to a real person immediately. This is non-negotiable.</span>
                  </li>
                </ul>
              </div>
            </motion.section>

            {/* Section 5 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-16"
            >
              <h2 id="how-to-set-up" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                How to Set Up AI Response for Your Dental Practice
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Getting an AI receptionist live for a dental practice typically takes 24 to 48 hours.
                  The setup process does not require technical expertise from your team.
                </p>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 1: Connect your phone line</h3>
                  <p>
                    Most AI receptionist platforms work by forwarding calls to your existing number
                    — either all calls, or only calls that go unanswered after a set number of rings.
                    You keep your existing phone number. Patients call the same number they always have.
                    The AI intercepts calls that would otherwise go to voicemail.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 2: Integrate your practice management system</h3>
                  <p>
                    Provide the AI platform with access to your PMS (Dentrix, Open Dental, etc.) so it
                    can read your live schedule and book appointments in real time. Most integrations
                    are set up by the vendor's onboarding team — you typically provide API credentials
                    and the vendor handles the rest.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 3: Train the AI on your practice</h3>
                  <p>
                    Give the AI the information it needs to handle calls accurately: your office hours,
                    accepted insurance plans, the types of procedures you offer, your address and
                    parking information, and your policy on emergencies and after-hours escalations.
                    This takes 30 to 60 minutes and can be updated anytime.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 4: Define your escalation rules</h3>
                  <p>
                    Set the conditions under which the AI should transfer a call to a human: dental
                    emergencies, complex insurance questions, patient complaints, or any caller who
                    specifically requests to speak with a person. Everything else the AI handles
                    end to end.
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
              <h2 id="the-results" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                What Dental Practices See After Implementing AI
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Dental practices that implement AI receptionist systems consistently report three
                  measurable outcomes in the first 30 to 60 days:
                </p>

                <div className="my-8">
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">80% fewer missed calls:</span>
                      <span>The AI answers calls the front desk cannot — overflow during peak hours, all after-hours volume, and weekend inquiries.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">25% more appointments booked:</span>
                      <span>Capturing after-hours and peak-time calls that previously went to voicemail fills schedule gaps that would have gone empty.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">Front desk freed for in-office care:</span>
                      <span>When the AI handles routine calls, front desk staff can focus entirely on the patients physically present in the practice — improving the in-office experience and reducing staff burnout.</span>
                    </li>
                  </ul>
                </div>

                <p>
                  The ROI calculation is straightforward. If your average new patient value is $2,500
                  over their first year and you capture 10 additional new patients per month from calls
                  that would have gone unanswered, that is $25,000 per month in incremental revenue —
                  from calls your practice was already receiving but failing to convert.
                </p>

                <p>
                  For dental practices in competitive markets where multiple practices are within
                  a few miles of each other, AI response is rapidly becoming a table-stakes advantage.
                  The practice that answers first — at 7 AM, at 10 PM, and on Sunday afternoon —
                  is the practice that fills its schedule.
                </p>
              </div>
            </motion.section>

            {/* Editor's Note */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-12">
              <p className="text-sm font-bold text-blue-800 mb-1">Note — May 2026</p>
              <p className="text-blue-900 text-sm leading-relaxed">
                AI receptionists for dental practices have moved from early adopter technology to
                mainstream practice management infrastructure in 2025 and 2026. Practices that
                implemented automated answering in this period report consistent gains in new patient
                acquisition versus competitors still relying on voicemail. The barrier to entry is
                lower than ever — most practices are live within 48 hours at a cost that pays for
                itself within the first booked patient.
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
                      <Phone className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <h2 className="text-gray-900 font-medium mt-4 text-4xl">See How Many Patients You Are Currently Losing</h2>
                  <p className="text-base text-gray-600 mt-2 whitespace-pre-line">
                    Get a free AI Revenue Audit and find out exactly how many patients your dental practice
                    is losing to missed calls, voicemail, and after-hours gaps — and what it is costing you.
                  </p>
                  <a
                    href="https://boltcall.org/ai-revenue-calculator"
                    className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
                  >
                    Calculate my missed patient revenue
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

export default BlogAIReceptionistDentists;
