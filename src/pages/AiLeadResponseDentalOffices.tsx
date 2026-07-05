// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, Phone, Bot, Zap, CheckCircle, HelpCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const AiLeadResponseDentalOffices: React.FC = () => {
  const { activeSection, sectionsRef } = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'How Dental Offices Book More Patients with AI Lead Response | Boltcall';
    updateMetaDescription('Discover how dental offices use AI lead response to stop losing new patients to slow follow-up. Instant SMS response, auto-booking, and speed-to-lead strategies that fill your chair.');

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How Dental Offices Book More Patients with AI Lead Response",
      "description": "Discover how dental offices use AI lead response to stop losing new patients to slow follow-up. Instant SMS response, auto-booking, and speed-to-lead strategies that fill your chair.",
      "author": {
        "@type": "Organization",
        "name": "Boltcall"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Boltcall",
        "logo": {
          "@type": "ImageObject",
          "url": "https://boltcall.org/logo.png"
        }
      },
      "datePublished": "2026-05-01",
      "dateModified": "2026-05-01",
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg",
        "width": 1200,
        "height": 630
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/ai-lead-response-for-dental-offices"
      }
    });
    document.head.appendChild(script);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema-dental-ai';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld-dental-ai';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Lead Response for Dental Offices", "item": "https://boltcall.org/blog/ai-lead-response-for-dental-offices"}]});
    document.head.appendChild(bcScript);

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'faq-schema-dental-ai';
    faqScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How fast should a dental office respond to a new patient inquiry?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Within 5 minutes. Research shows leads contacted within 5 minutes are 21x more likely to convert than those contacted after 30 minutes. Every minute of delay dramatically reduces your chance of booking that patient."
          }
        },
        {
          "@type": "Question",
          "name": "Can AI really book dental appointments without staff involvement?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Modern AI lead response systems can qualify a new patient inquiry via SMS or phone, check available appointment slots in real time, and confirm a booking — all without any manual intervention from your front desk team."
          }
        },
        {
          "@type": "Question",
          "name": "What is the average no-show rate for dental offices?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The average dental no-show rate is 15-20%. AI-powered appointment reminders sent via SMS 24 hours and 2 hours before an appointment can reduce no-shows by up to 40%, protecting chair time and revenue."
          }
        },
        {
          "@type": "Question",
          "name": "Does AI lead response work for after-hours dental inquiries?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Absolutely. AI responds instantly 24/7, including evenings and weekends when your front desk is closed. These are some of your highest-intent leads — people actively searching for a dentist right now."
          }
        },
        {
          "@type": "Question",
          "name": "How much does it cost to set up AI lead response for a dental office?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Solutions like Boltcall start from $897/month with no setup fee on annual plans. Compared to the average value of a new dental patient ($1,200-$2,500 lifetime), capturing even one additional patient per month covers the cost many times over."
          }
        }
      ]
    });
    document.head.appendChild(faqScript);

    return () => {
      document.getElementById('breadcrumb-jsonld-dental-ai')?.remove();
      document.getElementById('person-schema-dental-ai')?.remove();
      document.getElementById('faq-schema-dental-ai')?.remove();
      document.head.removeChild(script);
    };
  }, []);

  const sections = [
    { id: 'dental-lead-loss', title: 'Why Dental Offices Lose New Patients Every Day' },
    { id: 'speed-to-lead-dental', title: 'The 5-Minute Rule in Dentistry' },
    { id: 'how-ai-works', title: 'How AI Lead Response Works for Dental Offices' },
    { id: 'setup-steps', title: 'Setting Up AI Lead Response: Step-by-Step' },
    { id: 'results', title: 'What Dental Offices See After Switching' },
    { id: 'faq', title: 'Frequently Asked Questions' },
  ];

  return (
    <>
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      <main className="pt-24 min-h-screen bg-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  Dental Practice
                </span>
              </div>

              <Breadcrumbs
                items={[
                  { label: 'Blog', href: '/blog' },
                  { label: 'AI Lead Response for Dental Offices', href: '/blog/ai-lead-response-for-dental-offices' },
                ]}
              />

              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                How Dental Offices Book More Patients with{' '}
                <span className="text-blue-600">AI Lead Response</span>
              </h1>

              <div className="flex items-center text-gray-600 mb-8 space-x-6">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>May 1, 2026</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  <span>9 min read</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Direct Answer Block */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8">
                <p className="text-lg font-medium text-gray-900">
                  <strong>Quick Answer:</strong> Most dental offices lose 30-50% of new patient inquiries because nobody follows up within the first 5 minutes. AI lead response fixes this by sending an instant SMS reply, qualifying the patient, and booking the appointment automatically while your front desk handles the patients already in the chair.
                </p>
              </div>

              <div className="prose prose-lg max-w-none" ref={sectionsRef}>
                <p className="text-xl text-gray-700 leading-relaxed mb-8">
                  A new patient submits a contact form on your website at 7 PM on a Tuesday. Your front desk team left at 5 PM. By Wednesday morning, that patient has already booked with the practice down the street — the one that texted back in 90 seconds.
                </p>

                <p className="text-lg text-gray-700 mb-8">
                  This scenario plays out dozens of times each month in every dental office. The opportunity is not lost because you lack patients — it is lost because speed-to-lead is broken. AI lead response exists to fix exactly that.
                </p>

                {/* Section 1: Why Dental Offices Lose New Patients */}
                <motion.section
                  id="dental-lead-loss"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-12"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                    <Phone className="h-8 w-8 text-blue-600 mr-3" />
                    Why Dental Offices Lose New Patients Every Day
                  </h2>

                  <p className="text-lg text-gray-700 mb-6">
                    Dental practices are busy. Your front desk team juggles check-ins, insurance verification, appointment reminders, and rescheduling — all while the phone rings. It is not a staffing failure. It is a structural problem: the front desk was never designed to respond to new leads instantly.
                  </p>

                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">The Hidden Lead Leak in Every Dental Practice</h3>
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start">
                        <span className="text-red-500 font-bold mr-2 mt-1">•</span>
                        <span><strong>Missed calls go to voicemail.</strong> 62% of callers who reach voicemail do not leave a message — they hang up and call the next practice.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 font-bold mr-2 mt-1">•</span>
                        <span><strong>Web form inquiries wait hours.</strong> The average small business responds to a web lead in 47 hours. By then, the patient is long gone.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 font-bold mr-2 mt-1">•</span>
                        <span><strong>After-hours leads go cold overnight.</strong> Up to 40% of dental inquiries come in outside business hours — evenings and weekends when intent is highest.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 font-bold mr-2 mt-1">•</span>
                        <span><strong>No-shows drain the schedule.</strong> The average dental no-show rate is 15-20%, representing thousands of dollars in lost chair time every month.</span>
                      </li>
                    </ul>
                  </div>

                  <p className="text-lg text-gray-700 mb-6">
                    The practices filling their chairs fastest are not necessarily better at dentistry. They are simply faster at responding. In a world where a patient can Google three dental offices and submit inquiries to all three in under two minutes, the first response wins.
                  </p>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
                    <p className="text-gray-700">
                      <strong>Industry Data:</strong> A study published in the Harvard Business Review found that companies responding to leads within one hour were seven times more likely to qualify that lead than those responding an hour later — and 60 times more likely than companies that waited 24 hours.
                    </p>
                  </div>
                </motion.section>

                {/* Section 2: The 5-Minute Rule in Dentistry */}
                <motion.section
                  id="speed-to-lead-dental"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-12"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                    <Zap className="h-8 w-8 text-blue-600 mr-3" />
                    The 5-Minute Rule in Dentistry
                  </h2>

                  <p className="text-lg text-gray-700 mb-6">
                    The 5-Minute Rule is simple: contact a new lead within 5 minutes and your chances of booking them jump by 21x compared to contacting them after 30 minutes. This is not a dental-specific statistic — it applies across every service industry. But in dentistry, where patient lifetime value averages $1,200-$2,500, missing this window is a significant revenue loss.
                  </p>

                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center bg-red-50 border border-red-100 rounded-lg p-6">
                      <div className="text-4xl font-bold text-red-600 mb-2">47h</div>
                      <p className="text-gray-700 text-sm">Average small business lead response time</p>
                    </div>
                    <div className="text-center bg-yellow-50 border border-yellow-100 rounded-lg p-6">
                      <div className="text-4xl font-bold text-yellow-600 mb-2">21x</div>
                      <p className="text-gray-700 text-sm">More likely to book when contacted within 5 minutes</p>
                    </div>
                    <div className="text-center bg-green-50 border border-green-100 rounded-lg p-6">
                      <div className="text-4xl font-bold text-green-600 mb-2">&lt;90s</div>
                      <p className="text-gray-700 text-sm">AI lead response time — 24 hours a day, 7 days a week</p>
                    </div>
                  </div>

                  <p className="text-lg text-gray-700 mb-6">
                    Here is what happens inside those first 5 minutes in a patient's mind: they submitted an inquiry, their problem is still active, and they are actively comparing options. The first practice to acknowledge them earns their attention. Every minute after that, their attention drifts to a competitor.
                  </p>

                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">What Patients Expect in 2026</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />An immediate acknowledgment — even just "We got your message, we'll be in touch shortly"</li>
                      <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />A response via the channel they used — text if they texted, email if they emailed</li>
                      <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />The ability to book without having to call during business hours</li>
                      <li className="flex items-center"><CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />A confirmation that their appointment is locked in</li>
                    </ul>
                  </div>

                  <p className="text-lg text-gray-700">
                    Human front desk teams cannot consistently deliver on all four of these expectations — especially after hours. AI lead response can.
                  </p>
                </motion.section>

                {/* Section 3: How AI Lead Response Works */}
                <motion.section
                  id="how-ai-works"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-12"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                    <Bot className="h-8 w-8 text-blue-600 mr-3" />
                    How AI Lead Response Works for Dental Offices
                  </h2>

                  <p className="text-lg text-gray-700 mb-6">
                    AI lead response is not a chatbot that answers FAQ questions. It is an active lead-conversion system that engages new inquiries the moment they arrive, qualifies them, and books them directly into your schedule. Here is the full flow:
                  </p>

                  <div className="space-y-6 mb-8">
                    <div className="flex items-start border rounded-lg p-5">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">1</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Lead Arrives (Any Channel)</h3>
                        <p className="text-gray-600">A new patient submits a web form, texts your number, calls after hours, or clicks your Google ad. The AI captures the inquiry instantly regardless of the time or channel.</p>
                      </div>
                    </div>

                    <div className="flex items-start border rounded-lg p-5">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">2</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Instant SMS or Voice Response</h3>
                        <p className="text-gray-600">Within seconds, the patient receives a personalized message: their name, what they inquired about, and a direct path to book. No hold music. No voicemail. No waiting until tomorrow morning.</p>
                      </div>
                    </div>

                    <div className="flex items-start border rounded-lg p-5">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">3</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">AI Qualifies the Patient</h3>
                        <p className="text-gray-600">The system asks relevant questions via SMS conversation: Are you a new patient? What service are you looking for? Do you have dental insurance? This ensures the right patient lands in the right appointment slot.</p>
                      </div>
                    </div>

                    <div className="flex items-start border rounded-lg p-5">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">4</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Real-Time Appointment Booking</h3>
                        <p className="text-gray-600">The AI checks your live calendar, offers available slots, and confirms the booking — all within the SMS conversation. The appointment lands directly on your schedule with full patient details.</p>
                      </div>
                    </div>

                    <div className="flex items-start border rounded-lg p-5">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">5</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Automated Reminders Reduce No-Shows</h3>
                        <p className="text-gray-600">The system sends confirmation and reminder messages at 24 hours and 2 hours before the appointment. Patients can confirm or reschedule via text — no phone tag required.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
                    <p className="text-gray-700">
                      <strong>What Your Front Desk Actually Does:</strong> Instead of chasing cold leads and playing phone tag, your team focuses on patients in the practice. The AI handles the top of the funnel. Your staff handles the in-person experience. Both jobs get done better.
                    </p>
                  </div>
                </motion.section>

                {/* Section 4: Setup Steps */}
                <motion.section
                  id="setup-steps"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-12"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                    <CheckCircle className="h-8 w-8 text-blue-600 mr-3" />
                    Setting Up AI Lead Response: Step-by-Step
                  </h2>

                  <p className="text-lg text-gray-700 mb-6">
                    Getting AI lead response running in your dental office does not require technical expertise or a lengthy IT project. Here is the practical setup process:
                  </p>

                  <div className="space-y-5 mb-8">
                    <div className="bg-gray-50 rounded-lg p-5">
                      <h3 className="font-semibold text-gray-900 mb-2">Step 1: Audit Your Lead Sources</h3>
                      <p className="text-gray-600 mb-3">List every place a new patient can reach you: your website contact form, Google Business Profile, Google Ads, Facebook ads, direct calls, and any referral platforms. Your AI needs to be connected to all of them to work.</p>
                      <p className="text-sm text-blue-700 font-medium">Time required: 30 minutes</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-5">
                      <h3 className="font-semibold text-gray-900 mb-2">Step 2: Connect Your Calendar</h3>
                      <p className="text-gray-600 mb-3">Integrate your practice management system or scheduling calendar (Google Calendar, Jane, Dentrix, etc.) so the AI can check real-time availability. Without this, the AI can qualify but cannot book — which cuts your conversion rate in half.</p>
                      <p className="text-sm text-blue-700 font-medium">Time required: 1-2 hours with your software provider</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-5">
                      <h3 className="font-semibold text-gray-900 mb-2">Step 3: Set Up Your SMS Response Number</h3>
                      <p className="text-gray-600 mb-3">Your AI needs a dedicated phone number for outbound SMS. This can be your existing business number with an SMS layer added, or a new number that forwards to your main line. Most platforms handle this in 10 minutes.</p>
                      <p className="text-sm text-blue-700 font-medium">Time required: 10-20 minutes</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-5">
                      <h3 className="font-semibold text-gray-900 mb-2">Step 4: Build Your Qualification Script</h3>
                      <p className="text-gray-600 mb-3">Define the 3-4 questions the AI asks every new patient: new vs. returning, service type (cleaning, emergency, cosmetic), insurance status, preferred appointment time. Keep it short — 3 questions is the sweet spot before drop-off increases.</p>
                      <p className="text-sm text-blue-700 font-medium">Time required: 20 minutes</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-5">
                      <h3 className="font-semibold text-gray-900 mb-2">Step 5: Set Reminder Sequences</h3>
                      <p className="text-gray-600 mb-3">Configure automated SMS reminders at 48 hours, 24 hours, and 2 hours before each appointment. Include a one-tap confirm or reschedule option. This single step typically reduces no-shows by 30-40%.</p>
                      <p className="text-sm text-blue-700 font-medium">Time required: 15 minutes</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-5">
                      <h3 className="font-semibold text-gray-900 mb-2">Step 6: Test and Go Live</h3>
                      <p className="text-gray-600 mb-3">Submit a test inquiry from each lead source and walk through the full patient journey. Confirm the SMS fires in under 90 seconds, the booking lands on the calendar, and the reminder sequence activates. Then go live.</p>
                      <p className="text-sm text-blue-700 font-medium">Time required: 30 minutes</p>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                    <p className="text-green-800 font-semibold">Total Setup Time: 3-5 hours</p>
                    <p className="text-green-700 mt-1">Most dental offices are fully live within one business day. With Boltcall's guided setup, the process is typically complete in an afternoon.</p>
                  </div>
                </motion.section>

                {/* Section 5: Results */}
                <motion.section
                  id="results"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-12"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">
                    What Dental Offices See After Switching
                  </h2>

                  <p className="text-lg text-gray-700 mb-6">
                    The results from implementing AI lead response in dental practices are consistent across practice sizes and markets. The improvements are not marginal — they are structural shifts in how many new patients actually make it onto your schedule.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="border rounded-lg p-6">
                      <div className="text-3xl font-bold text-blue-600 mb-2">30-50%</div>
                      <h3 className="font-semibold text-gray-900 mb-2">More New Patient Bookings</h3>
                      <p className="text-gray-600">Practices recovering previously lost after-hours and slow-response leads see 30-50% increases in new patient bookings within the first 60 days.</p>
                    </div>

                    <div className="border rounded-lg p-6">
                      <div className="text-3xl font-bold text-blue-600 mb-2">40%</div>
                      <h3 className="font-semibold text-gray-900 mb-2">Reduction in No-Shows</h3>
                      <p className="text-gray-600">Automated SMS reminders with one-tap confirm or reschedule options cut the average 15-20% no-show rate by 35-40%, protecting significant chair time revenue.</p>
                    </div>

                    <div className="border rounded-lg p-6">
                      <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
                      <h3 className="font-semibold text-gray-900 mb-2">Lead Capture Coverage</h3>
                      <p className="text-gray-600">Every inquiry — evenings, weekends, holidays — gets a response in under 90 seconds. No inquiry falls through the cracks while your team is unavailable.</p>
                    </div>

                    <div className="border rounded-lg p-6">
                      <div className="text-3xl font-bold text-blue-600 mb-2">2 hrs</div>
                      <h3 className="font-semibold text-gray-900 mb-2">Front Desk Time Saved Per Day</h3>
                      <p className="text-gray-600">Eliminating manual follow-up calls, phone tag, and voicemail checking frees your front desk team for higher-value tasks — improving both morale and patient experience.</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">What One Extra New Patient Per Day Is Worth</h3>
                    <p className="text-gray-600 mb-4">Average dental patient lifetime value: $1,500. Average new patient booking increase with AI: 5-10 additional bookings per month.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">$7,500 - $15,000</div>
                        <div className="text-sm text-gray-500">Additional monthly revenue potential</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">$897/mo</div>
                        <div className="text-sm text-gray-500">Boltcall Pro plan — the AI that makes it happen</div>
                      </div>
                    </div>
                  </div>
                </motion.section>

                {/* Section 6: FAQ */}
                <motion.section
                  id="faq"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-12"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                    <HelpCircle className="h-8 w-8 text-blue-600 mr-3" />
                    Frequently Asked Questions
                  </h2>

                  <div className="space-y-5">
                    <div className="border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">How fast should a dental office respond to a new patient inquiry?</h3>
                      <p className="text-gray-600">Within 5 minutes. Research shows leads contacted within 5 minutes are 21x more likely to convert than those contacted after 30 minutes. Every minute of delay dramatically reduces your chance of booking that patient. AI lead response delivers a reply in under 90 seconds — consistently, every time.</p>
                    </div>

                    <div className="border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Can AI really book dental appointments without staff involvement?</h3>
                      <p className="text-gray-600">Yes. Modern AI lead response systems like Boltcall can qualify a new patient inquiry via SMS or phone, check available appointment slots in real time, and confirm a booking — all without any manual intervention from your front desk team. Your staff sees the confirmed appointment on the schedule and picks up from there.</p>
                    </div>

                    <div className="border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">What is the average no-show rate for dental offices?</h3>
                      <p className="text-gray-600">The average dental no-show rate is 15-20%. AI-powered appointment reminders sent via SMS 24 hours and 2 hours before an appointment can reduce no-shows by up to 40%, protecting chair time and revenue. At an average appointment value of $200-$400, reducing even 5 no-shows per month saves $1,000-$2,000.</p>
                    </div>

                    <div className="border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Does AI lead response work for after-hours dental inquiries?</h3>
                      <p className="text-gray-600">Absolutely. AI responds instantly 24/7, including evenings and weekends when your front desk is closed. These are some of your highest-intent leads — people actively searching for a dentist right now, often with a dental concern they want resolved quickly. Reaching them within minutes of their inquiry is a significant competitive advantage.</p>
                    </div>

                    <div className="border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">How much does it cost to set up AI lead response for a dental office?</h3>
                      <p className="text-gray-600">Solutions like <Link to="/pricing" className="text-blue-600 hover:underline">Boltcall</Link> start from $897/month with no setup fee on annual plans. Compared to the average value of a new dental patient ($1,200-$2,500 lifetime), capturing even one additional patient per month covers the cost many times over. Most practices see positive ROI within the first week.</p>
                    </div>
                  </div>
                </motion.section>
              </div>
            </div>

            {/* Sidebar: Table of Contents */}
            <div className="lg:col-span-1">
              <TableOfContents sections={sections} activeSection={activeSection} />
            </div>
          </div>
        </div>

        {/* Bottom CTA Section */}
        <motion.div
          className="py-20 bg-blue-600"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Find Out How Many Patients Your Practice Is Losing Right Now
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Take the free AI Revenue Audit. In 2 minutes, see exactly how much revenue is leaking through slow lead response and what AI can recover for your practice.
            </p>
            <Link
              to="/ai-revenue-audit"
              className="inline-flex items-center justify-center bg-white text-blue-600 font-semibold px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors text-lg"
            >
              Get My Free Revenue Audit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <p className="text-blue-200 text-sm mt-4">Free. No credit card. Takes 2 minutes.</p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
};

export default AiLeadResponseDentalOffices;
