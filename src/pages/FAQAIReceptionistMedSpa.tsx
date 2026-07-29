// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Sparkles, Phone, Clock, Calendar, Shield, ChevronRight, ArrowRight, Star, Users, Heart, MessageSquare, BarChart3, Bell } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import FinalCTA, { BLOG_CTA } from '../components/FinalCTA';
import TableOfContents from '../components/TableOfContents';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const headings = [
  { id: 'faq-section', text: '20 Questions About AI Receptionists for Med Spas', level: 2 },
  { id: 'related-resources', text: 'Related Resources', level: 2 },
];

const faqs = [
  {
    question: 'How much does an AI receptionist cost for a med spa?',
    answer: 'AI receptionists for med spas typically cost between $549 and $4997 per month with flat-rate pricing and no per-call fees. Compare that to a full-time front desk receptionist at $32,000-$42,000 per year or an answering service at $200-$500 per month with limited capabilities. Most med spas recover the cost within the first week by capturing 2-3 new Botox or filler appointments that would have otherwise gone to voicemail. The average new med spa client spends $1,200-$3,000 in the first year across multiple treatments.',
  },
  {
    question: 'How long does it take to set up an AI receptionist for a med spa?',
    answer: 'Basic setup takes under 10 minutes. You provide your spa name, services offered, hours, and phone number, and the AI begins answering calls immediately. Full customization including treatment-specific booking rules, pricing responses, pre-treatment instructions, and CRM integration typically takes 1-2 hours. You can configure the AI to match the luxury, professional tone your brand requires. Most med spas are fully operational the same afternoon with zero disruption to existing appointments.',
  },
  {
    question: 'Can the AI book appointments for different treatments like Botox, filler, and laser?',
    answer: 'Yes. The AI is configured with your full treatment menu and books each service with the correct duration, provider, and room assignment. Botox appointments might be 30 minutes, dermal fillers 45 minutes, laser hair removal 60 minutes, and facials 75 minutes. The AI knows which providers are certified for which treatments, respects room-specific equipment requirements (laser rooms vs. injection suites), and prevents double-booking of shared resources. Callers describe what they want in natural language and the AI maps it to the correct appointment type automatically.',
  },
  {
    question: 'How does the AI handle treatment pricing questions from callers?',
    answer: 'The AI provides the pricing ranges and packages you configure. For treatments with variable pricing like dermal fillers (which depend on the number of syringes), the AI gives a starting price and explains that exact cost is determined during the consultation. For fixed-price services like Botox per unit or specific facials, it quotes the exact price. The AI can also describe current promotions, membership pricing, and package deals. It never invents prices or gives medical advice. If a caller asks about a treatment or price not in the system, the AI offers to have a team member follow up with details.',
  },
  {
    question: 'Can the AI provide pre-treatment and post-treatment care instructions?',
    answer: 'Yes. The AI delivers your specific care instructions based on the treatment booked. For Botox, it tells callers to avoid blood thinners and alcohol 24 hours before the appointment. For laser treatments, it advises avoiding sun exposure and self-tanning for two weeks prior. For chemical peels, it explains the expected recovery timeline. Post-treatment, the AI can send automated text messages at scheduled intervals with aftercare reminders. These instructions reduce complications, improve results, and make your practice appear more professional and organized than competitors who rely on clients remembering verbal instructions.',
  },
  {
    question: 'How does the AI handle rebooking and treatment schedule management?',
    answer: 'The AI automates rebooking by tracking treatment intervals and proactively reaching out when a client is due for their next session. For Botox clients, it sends a rebooking reminder at the 10-12 week mark. For facial clients on a monthly schedule, it reaches out 3-4 days before the suggested date. For laser hair removal series, it tracks which session the client is on and schedules the next one at the appropriate interval. This automation is where med spas see the biggest revenue impact because rebooking rates typically increase 25-40% when the follow-up is automatic rather than reliant on front desk staff remembering to call.',
  },
  {
    question: 'Can the AI manage memberships and treatment packages?',
    answer: 'Yes. The AI can explain your membership tiers and package options to callers, including what is included, pricing, and the savings compared to individual treatments. When existing members call, the AI can reference their membership level and inform them of available benefits. For package holders, it tracks remaining sessions (e.g., "You have 3 of 6 laser sessions remaining") and books the next one. The AI does not process payments, but it handles all the informational and scheduling aspects that drive membership enrollment and retention.',
  },
  {
    question: 'How does the AI distinguish between consultations and treatment appointments?',
    answer: 'The AI is trained on your specific booking rules. New clients or those inquiring about treatments they have not had before are booked for a consultation with the appropriate provider. Returning clients requesting a treatment they have received previously are booked directly for the treatment appointment. The AI asks the right qualifying questions: "Have you had Botox at our spa before?" or "Is this your first time considering lip filler?" Based on the answers, it routes to the correct appointment type with the correct duration, ensuring new clients get proper assessment time and returning clients are not forced into unnecessary consultations.',
  },
  {
    question: 'Can the AI answer calls and book appointments after hours?',
    answer: 'Yes, and this is one of the highest-value capabilities for med spas. Industry data shows that 40-45% of med spa inquiries come outside business hours, particularly from professionals browsing Instagram in the evening and deciding to book a treatment. Without an AI receptionist, those callers hit voicemail and 80% never call back. The AI answers instantly at 9 PM the same way it answers at 9 AM, provides treatment information, answers pricing questions, and books the appointment directly into your calendar. Many med spas report that after-hours bookings account for 30-35% of their total new appointments after deploying AI.',
  },
  {
    question: 'Does the AI integrate with med spa CRM and EHR systems?',
    answer: 'Yes. AI receptionists integrate with popular med spa platforms including Aesthetic Record, Vagaro, Zenoti, Boulevard, Meevo, and Mangomint via API or webhook connections. New client information is automatically created as a contact record with all details from the call. Appointment bookings sync in real time with your scheduling system. If your platform is not directly supported, the AI delivers intake data via email, SMS, or webhook, which can connect to any system through Zapier or n8n. This eliminates the double-entry problem where front desk staff must manually input information collected over the phone.',
  },
  {
    question: 'Is the AI receptionist HIPAA compliant for a med spa?',
    answer: 'Yes. AI receptionists built for healthcare and aesthetic practices implement HIPAA-compliant data handling practices. Protected health information (PHI) is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. The system maintains audit logs of all data access, enforces role-based access controls, and supports Business Associate Agreements (BAAs). Call recordings are stored in HIPAA-compliant environments with configurable retention periods. The AI does not discuss specific medical conditions or treatment histories with unverified callers. You maintain full control over data retention and deletion policies.',
  },
  {
    question: 'Can the AI receptionist communicate in multiple languages?',
    answer: 'Yes. Modern AI receptionists support multilingual call handling, which is particularly valuable for med spas in diverse metropolitan areas. The AI can detect the caller\'s preferred language within the first few seconds and switch automatically, or offer a language menu at the start of the call. Spanish is the most commonly configured second language for U.S. med spas, but the technology supports dozens of languages. Multilingual capability means you never lose a client because they could not communicate their appointment needs to your front desk.',
  },
  {
    question: 'How does the AI handle cancellations and rescheduling?',
    answer: 'The AI manages cancellations and rescheduling according to your policies. When a client calls to cancel, the AI first attempts to reschedule to a more convenient time. If the client insists on canceling, the AI explains your cancellation policy (e.g., 24-hour notice required, cancellation fee for late cancellations) and processes the change. The freed appointment slot is immediately opened for other callers to book. The AI can also send a text to clients on your waitlist notifying them of the newly available slot. This automated waitlist backfill means fewer empty chairs and more revenue from every cancellation.',
  },
  {
    question: 'Can the AI upsell complementary treatments to callers?',
    answer: 'Yes, when configured appropriately. The AI can suggest relevant add-ons based on what the caller is booking. A client booking Botox might be informed about the lip flip add-on. A facial client might hear about the LED light therapy upgrade. A laser hair removal client might learn about the post-treatment hydrating mask. These suggestions are delivered naturally in conversation, not as a hard sell. The AI frames them as "Many of our clients who get [treatment A] also add [treatment B] for enhanced results." Med spas report a 10-15% increase in average ticket value when the AI consistently presents relevant add-ons that front desk staff often forget to mention.',
  },
  {
    question: 'Can the AI manage a waitlist for popular appointment slots?',
    answer: 'Yes. When a caller requests a time slot that is fully booked, the AI offers to add them to the waitlist and books the next best available time. If a cancellation opens up the preferred slot, the AI automatically texts the waitlisted client with a one-tap confirmation link. First-come, first-served priority is maintained automatically. This is especially valuable for med spas with high-demand providers or popular Saturday morning slots where the waitlist can be 5-10 people deep. Automated waitlist management recovers revenue from cancellations that would otherwise become empty appointment slots.',
  },
  {
    question: 'How does the AI handle seasonal promotions and limited-time offers?',
    answer: 'The AI is updated with your current promotions and mentions them to relevant callers. During a summer laser hair removal promotion, every caller asking about hair removal hears about the special pricing. During a holiday Botox event, the AI mentions the limited-time package to callers booking injectables. You update promotions in the AI\'s knowledge base in minutes, and the change takes effect immediately across all calls. The AI can also create urgency by mentioning limited availability ("We have 3 spots remaining for the holiday filler event") when configured with inventory data. This consistent promotion delivery is something even the best front desk staff cannot match across every single call.',
  },
  {
    question: 'What is the ROI of an AI receptionist for a med spa?',
    answer: 'Med spas that deploy an AI receptionist typically capture 20-40 additional appointments per month from previously missed calls and after-hours inquiries. With an average treatment value of $300-$500, that represents $6,000-$20,000 in additional monthly revenue against a $549ג€“$4997 monthly cost. The ROI is amplified by rebooking automation (25-40% higher rebooking rates), reduced no-shows from automated reminders (30-50% fewer no-shows), and increased average ticket from consistent upselling (10-15% higher). Most med spas see a 20:1 to 50:1 return on their AI receptionist investment within the first 90 days.',
  },
  {
    question: 'Can the AI send Google review requests automatically?',
    answer: 'Yes. The AI can trigger an automated text message to clients after their appointment with a direct link to leave a Google review. The timing is configurable, with most med spas sending the request 2-4 hours after the treatment when the client is still feeling positive about the experience. The message is personalized with the client name and treatment received. Med spas that automate review requests see a 3-5x increase in monthly review volume compared to relying on staff to ask in person. Since Google reviews are the single largest driver of local search ranking for med spas, this feature directly impacts new client acquisition.',
  },
  {
    question: 'Can the AI transfer calls to specific practitioners?',
    answer: 'Yes. The AI can warm-transfer calls to any practitioner or staff member based on the nature of the inquiry. A caller with a post-treatment concern is transferred to the treating provider. A caller asking about a specific practitioner\'s availability is transferred directly. Before the transfer, the AI provides a whisper briefing to the practitioner with the caller\'s name, reason for calling, and any relevant details. If the practitioner is unavailable or with a client, the AI takes a detailed message and schedules a callback. This ensures practitioners are never interrupted during treatments for calls that can be handled later.',
  },
  {
    question: 'How secure is the data handled by the AI receptionist?',
    answer: 'AI receptionists use enterprise-grade security including AES-256 encryption at rest, TLS 1.3 encryption in transit, SOC 2 Type II certified hosting infrastructure, and role-based access controls. Call recordings, client information, and appointment data are stored in isolated, encrypted environments. Configurable data retention policies allow you to automatically purge records after 30, 60, 90, or 365 days. No client data is used for AI model training or shared with third parties. For med spas handling sensitive aesthetic procedure information, this level of security protects both the business and client privacy while maintaining HIPAA compliance.',
  },
];

const FAQAIReceptionistMedSpa: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for Med Spas: 20 Questions Answered | Boltcall';
    updateMetaDescription(
      'Everything med spa owners need to know about AI receptionists — appointment booking, treatment inquiries, rebooking, and ROI.'
    );

    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "AI Receptionist for Med Spas: 20 Questions Answered",
        "description": "Everything med spa owners need to know about AI receptionists — appointment booking, treatment inquiries, rebooking, and ROI.",
        "author": { "@type": "Organization", "name": "Boltcall" },
        "datePublished": "2026-03-31",
        "dateModified": "2026-03-31",
        "publisher": {
          "@type": "Organization",
          "name": "Boltcall",
          "logo": { "@type": "ImageObject", "url": "https://boltcall.org/logo.png" }
        },
        "url": "https://boltcall.org/blog/ai-receptionist-medspa-faq",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://boltcall.org/blog/ai-receptionist-medspa-faq"
        },
        "image": {
          "@type": "ImageObject",
          "url": "https://boltcall.org/og-image.jpg",
          "width": 1200,
          "height": 630
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer,
          },
        })),
      },
    ];

    const scripts = schemas.map(schema => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
      return script;
    });

    return () => scripts.forEach(s => s.remove());
    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Receptionist FAQ: Med Spa", "item": "https://boltcall.org/blog/ai-receptionist-medspa-faq"}]});
    document.head.appendChild(bcScript);
    return () => { document.getElementById('person-schema')?.remove(); };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 h-1 bg-blue-600 z-50" style={{ width: `${progress}%` }} />

      <GiveawayBar />
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8 items-start">
        <main className="flex-grow bg-white min-w-0">
        {/* Hero Section */}
        <section className="bg-white py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center text-sm text-gray-500 mb-8" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
              <Link to="/blog" className="hover:text-blue-600 transition-colors">Blog</Link>
              <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
              <span className="text-gray-900 font-medium">AI Receptionist for Med Spas: 20 Questions Answered</span>
            </nav>

            {/* Badge */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mb-6"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              FAQ for Med Spas
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
            >
              AI Receptionist for Med Spas: 20 Questions Answered
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.1 } } }}
              className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed"
            >
              Everything med spa owners need to know about AI receptionists: appointment booking, treatment inquiries, rebooking automation, HIPAA compliance, and measurable ROI.
            </motion.p>

            {/* Author line */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.2 } } }}
              className="flex items-center text-sm text-gray-500 mb-8"
            >
              <span>By Boltcall Team</span>
              <span className="mx-2">·</span>
              <Calendar className="h-4 w-4 mr-1" />
              <span>March 31, 2026</span>
              <span className="mx-2">·</span>
              <Clock className="h-4 w-4 mr-1" />
              <span>12 min read</span>
            </motion.div>

            {/* Direct Answer Block */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.3 } } }}
              className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-blue-800 text-sm leading-relaxed"
            >
              An AI receptionist for med spas answers every call instantly, books treatment-specific appointments, handles pricing questions, automates rebooking reminders, and captures after-hours inquiries. It costs $549ג€“$4997/month versus $32,000-$42,000/year for a front desk hire and typically captures 20-40 additional appointments per month from previously missed calls.
            </motion.div>
          </div>
        </section>

        {/* Introduction */}
        <section className="bg-gray-50 py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <p className="text-gray-700 text-base leading-relaxed mb-4">
                Med spas operate in one of the most competitive local service categories. Clients research treatments on Instagram in the evening, decide to book at 10 PM, and call the first spa that appears on Google. If your phone goes to voicemail, that client books with your competitor before your front desk opens the next morning. Industry data shows med spas miss 25-35% of incoming calls, with the highest concentration during treatment blocks when staff are assisting providers.
              </p>
              <p className="text-gray-700 text-base leading-relaxed">
                An AI receptionist eliminates this revenue leak by answering every call in under 2 seconds, providing treatment information, quoting prices, and booking appointments directly into your calendar. Below are the 20 most common questions med spa owners ask before deploying an AI receptionist.
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <h2 id="faq-section" className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
                20 Questions About AI Receptionists for Med Spas
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                      <ChevronRight
                        className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                          openFaq === index ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    {openFaq === index && (
                      <div className="px-6 pb-5">
                        <p className="text-gray-700 text-base leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pros & Cons */}
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 id="pros-cons" className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of AI Receptionists for Med Spas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Captures 40–45% of inquiries that arrive after hours — the highest-value window for med spa bookings</li>
                  <li>• Books treatment-specific appointments (Botox, filler, laser) with correct durations and provider assignments</li>
                  <li>• Automates rebooking reminders, increasing return rates by 25–40%</li>
                  <li>• Consistently presents relevant add-ons, lifting average ticket by 10–15%</li>
                  <li>• HIPAA-compliant data handling with AES-256 encryption and BAA support</li>
                  <li>• Costs $549-4997/mo vs. $32,000–42,000/yr for a full-time front-desk hire</li>
                </ul>
              </div>
              <div className="bg-red-50 rounded-xl p-6">
                <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Luxury clientele may expect a high-touch human experience that AI cannot fully replicate</li>
                  <li>• Pricing for variable treatments (dermal fillers, multi-syringe sessions) is harder to quote accurately</li>
                  <li>• AI cannot provide medical advice, meaning clinical questions must still route to a practitioner</li>
                  <li>• Direct integration with niche platforms like Aesthetic Record or Mangomint may require API setup</li>
                  <li>• Automated upsells can feel impersonal if not carefully scripted to match your brand voice</li>
                </ul>
              </div>
            </div>
          </div>
        </section>


        <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
          <p className="text-lg text-gray-700 italic leading-relaxed">"Med spa clients book on impulse — typically late at night after scrolling social media. If your booking system is not available at 11pm when the intent is highest, you have already lost the appointment to the competitor who is."</p>
          <footer className="mt-3 text-sm font-semibold text-gray-600">— Alex Thiersch, Founder & CEO, American Med Spa Association (AmSpa)</footer>
        </blockquote>
        <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
          <p className="text-lg text-gray-700 italic leading-relaxed">"Rebooking is where the real money is in aesthetics. A client who returns for Botox every three months is worth ten times a one-time visitor. Automating that rebooking reminder is the single highest-ROI action most med spas are not taking."</p>
          <footer className="mt-3 text-sm font-semibold text-gray-600">— Bryan Durocher, Founder, Durocher Enterprises & Med Spa Business Coach</footer>
        </blockquote>
        {/* Related Resources */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <h2 id="related-resources" className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Related Resources</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  to="/tools/medspa-rebooking-calculator"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Med Spa Rebooking Calculator
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">Calculate how much revenue you lose from clients who do not rebook and see the impact of automated rebooking.</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                    Calculate now <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
                <Link
                  to="/features/ai-receptionist"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      How Our AI Receptionist Works
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">A detailed look at the technology powering AI-powered phone answering for med spas.</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                    Learn more <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
                <Link
                  to="/features/automated-reminders"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Bell className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Automated Appointment Reminders
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">Reduce no-shows by 30-50% with automated text reminders and rebooking prompts.</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                    Learn more <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
                <Link
                  to="/blog/ai-receptionist-dentist-faq"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      AI Receptionist FAQ for Dentists
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">How dental offices use AI to handle patient scheduling, insurance questions, and HIPAA compliance.</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                    Read FAQ <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
                <Link
                  to="/blog/ai-receptionist-vet-faq"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Heart className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      AI Receptionist FAQ for Vet Clinics
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">Discover how veterinary clinics use AI to triage urgent pet care calls and manage appointments 24/7.</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                    Read FAQ <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}

        {/* What Boltcall Includes for Med Spas */}
        <section className="py-10 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Boltcall Includes for Med Spas</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Every plan includes these features — no add-ons, no hidden fees</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: '24/7 Booking Answering', desc: 'Captures treatment inquiries after hours and between appointments' },
                { label: 'Treatment Appointment Booking', desc: 'Books Botox, filler, laser, and package appointments automatically' },
                { label: 'Rebooking Sequences', desc: 'Automated SMS to clients due for follow-up treatments' },
                { label: 'New Client Intake', desc: 'Collects service interest, contraindications, and preferred provider' },
                { label: 'Google Review Requests', desc: 'Post-treatment review requests to build your online reputation' },
                { label: 'Monthly Revenue Report', desc: 'See bookings, rebookings, and recovered revenue in one dashboard' },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl p-4 border border-gray-100 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Before/After Table */}
        <section className="py-10 bg-white border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Phone Answering Impact for Med Spas: Before and After</h2>
            <p className="text-gray-500 text-sm text-center mb-6">What med spa owners typically experience after switching to AI phone answering</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Without AI Answering</th>
                    <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">With Boltcall</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                  ['Monthly calls answered', '62–72%', '99%+'],
                  ['After-hours treatment inquiries captured', '0%', '100%'],
                  ['Client rebooking rate', '40–55%', '65–75% (with follow-up)'],
                  ['Monthly revenue from missed calls recovered', '$0', '$1,500 – $5,000+'],
                  ['No-show rate', '18–25%', '8–12%'],
                  ['Google reviews per month', '1–2', '5–10'],
                  ['Setup time for 24/7 coverage', '2–4 weeks (hire)', '30 minutes'],
                  ['Monthly cost vs. front desk hire', '$3,000 – $4,200/mo', '$549-897'],
                  ].map(([metric, before, after]) => (
                    <tr key={metric} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium">{metric}</td>
                      <td className="px-4 py-3 text-gray-600">{before}</td>
                      <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <FinalCTA {...BLOG_CTA} />
        </main>
        <div className="hidden lg:block w-64 flex-shrink-0 pt-32">
          <TableOfContents headings={headings} />
        </div>
      </div>


      {/* Trust + Social Proof */}
      <section className="py-10 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-gray-500 mb-5">
            Trusted by 1,000+ local businesses &middot; No credit card required &middot; Cancel anytime
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {[
              { quote: '"Paid for itself within the first week."', author: 'HVAC contractor, Texas' },
              { quote: '"Set up in 30 minutes. Never missed a lead since."', author: 'Dental practice, Florida' },
            ].map((t) => (
              <div key={t.author} className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 text-left max-w-xs">
                <div className="text-yellow-400 text-sm mb-2">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                <p className="text-gray-700 text-sm leading-relaxed italic">{t.quote}</p>
                <p className="text-gray-400 text-xs mt-2">&mdash; {t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm text-gray-600">
            Ready to see the category page?{' '}
            <Link to="/industries/medspa-answering-service" className="font-semibold text-blue-700 hover:underline">
              Med spa answering service
            </Link>{' '}
            covers the full buyer view.
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default FAQAIReceptionistMedSpa;
