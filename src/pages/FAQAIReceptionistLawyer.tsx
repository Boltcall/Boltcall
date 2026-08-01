// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Scale, Phone, Clock, Calendar, Shield, ChevronRight, ArrowRight, Lock, Globe, BarChart3, FileText, Users, Gavel, MessageSquare } from 'lucide-react';
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
  { id: 'faq-section', text: '20 Questions About AI Receptionists for Law Firms', level: 2 },
  { id: 'related-resources', text: 'Related Resources', level: 2 },
];

const faqs = [
  {
    question: 'How much does an AI receptionist cost for a law firm?',
    answer: 'AI receptionists for law firms typically cost between $549 and $4997 per month depending on call volume and features. Compare that to a full-time legal receptionist at $35,000-$50,000 per year, or a legal answering service charging $1.50-$3.00 per call. Most firms recover the cost within the first week by capturing just one or two new client consultations that would have otherwise gone to voicemail. Boltcall offers flat-rate pricing with no per-minute or per-call surcharges.',
  },
  {
    question: 'How long does it take to set up an AI receptionist for a law firm?',
    answer: 'Basic setup takes under 10 minutes. You provide your firm name, practice areas, office hours, and phone number, and the AI begins answering calls immediately. Full customization including intake questions, conflict screening logic, practice-area routing, and CRM integration typically takes 1-2 hours. Most firms are fully operational within a single afternoon with no downtime or disruption to existing phone lines.',
  },
  {
    question: 'How does the AI handle client intake for law firms?',
    answer: 'The AI asks structured intake questions tailored to each practice area. For personal injury, it captures the accident date, injury type, and insurance information. For family law, it gathers details about the case type (divorce, custody, support) and urgency. For criminal defense, it determines the charge, court date, and whether the person is in custody. All intake information is compiled into a structured summary and delivered to the assigned attorney via email, SMS, or directly into your case management system within seconds of the call ending.',
  },
  {
    question: 'Does an AI receptionist protect attorney-client privilege and confidentiality?',
    answer: 'Yes. AI receptionists designed for law firms are built with confidentiality as a core requirement. Call data is encrypted in transit and at rest using AES-256 encryption. The AI does not store conversation content beyond what is needed for the intake summary, and all data is handled in compliance with legal ethics rules. The system does not share information between callers, and each call is treated as an isolated interaction. You control data retention policies and can purge records on demand.',
  },
  {
    question: 'Can the AI receptionist handle after-hours calls for a law firm?',
    answer: 'Yes, and this is one of the highest-value features for law firms. Studies show that 35-40% of potential legal clients call outside business hours, and 80% of those callers will not leave a voicemail. The AI answers every after-hours call instantly, captures the full intake, qualifies the lead, and sends an alert to the relevant attorney. For urgent matters like arrests, protective orders, or time-sensitive filing deadlines, the AI can immediately transfer the call to an on-call attorney or send a priority notification.',
  },
  {
    question: 'Can the AI schedule consultations and manage the firm calendar?',
    answer: 'Yes. The AI connects to your calendar system (Google Calendar, Outlook, Calendly, or Cal.com) and books consultations in real time based on attorney availability. It respects buffer times between appointments, enforces rules like "no new consultations after 4pm on Fridays," and handles different appointment durations for different practice areas. Callers receive an immediate confirmation via text message, and the AI sends a reminder 24 hours before the consultation to reduce no-shows.',
  },
  {
    question: 'How does the AI handle different practice areas within one firm?',
    answer: 'The AI is configured with your full list of practice areas and uses the caller\'s situation to route them to the correct attorney or department. A caller describing a car accident is routed to personal injury. A caller asking about a custody dispute is routed to family law. A business owner asking about contract review goes to corporate. Each practice area can have its own intake questions, scheduling rules, and attorney assignments. The AI handles multi-practice firms with the same efficiency as single-practice boutiques.',
  },
  {
    question: 'Can the AI screen for conflicts of interest?',
    answer: 'Yes. The AI can be configured to collect identifying information from callers, including full legal names, opposing party names, and case details, and cross-reference this against a conflicts database or list you provide. If a potential conflict is detected, the AI flags the intake for attorney review before any substantive information is exchanged. This does not replace a formal conflicts check, but it provides an automated first layer of screening that catches obvious conflicts before they become ethics violations.',
  },
  {
    question: 'How does the AI handle emergency legal matters?',
    answer: 'The AI uses a triage system to identify emergencies. Callers describing an arrest, a protective order hearing within 24 hours, an imminent filing deadline, or a child custody emergency are flagged as urgent. The AI immediately attempts to transfer the call to the designated on-call attorney. If the attorney is unavailable, the AI sends a priority SMS and email with the caller\'s information and situation summary, and tells the caller to expect a callback within a specific timeframe. Non-emergency matters are captured normally for next-business-day follow-up.',
  },
  {
    question: 'Does the AI integrate with legal CRM and case management software?',
    answer: 'Yes. AI receptionists integrate with popular legal software including Clio, MyCase, PracticePanther, Lawmatics, and Smokeball via API or webhook connections. New leads are automatically created as contacts with full intake details attached. Some integrations support direct matter creation, task assignment, and conflict check triggers. If your system is not directly supported, intake data can be delivered via email, SMS, or webhook to connect with any tool through automation platforms like Zapier or n8n.',
  },
  {
    question: 'Is call recording by the AI compliant with state laws?',
    answer: 'AI receptionist platforms are configurable for both one-party and two-party (all-party) consent states. In two-party consent states like California, Florida, and Illinois, the AI provides a disclosure at the start of every call informing the caller that the conversation may be recorded. You control whether calls are recorded at all, how long recordings are retained, and who has access. Most firms in one-party consent states enable recording for quality assurance, while firms in all-party states configure the disclosure or disable recording entirely.',
  },
  {
    question: 'Can the AI receptionist communicate in multiple languages?',
    answer: 'Yes. Modern AI receptionists support multilingual call handling. The AI can detect the caller\'s preferred language in the first few seconds of the conversation and switch automatically, or callers can select a language option at the start. Spanish is the most commonly configured second language for U.S. law firms, but the technology supports dozens of languages. This is critical for immigration law firms and practices serving diverse communities where a language barrier would otherwise result in a lost client.',
  },
  {
    question: 'Can the AI transfer calls to specific attorneys in real time?',
    answer: 'Yes. The AI can warm-transfer calls to any attorney or staff member based on practice area, client status, or urgency level. Before transferring, the AI briefs the attorney via a whisper message with the caller\'s name, reason for calling, and any intake information already gathered. If the target attorney is unavailable, the AI offers to take a detailed message, schedule a callback, or transfer to an alternate. This eliminates the "hold and pray" experience that frustrates callers and loses clients.',
  },
  {
    question: 'Can the AI complete intake forms during the call?',
    answer: 'Yes. The AI asks intake questions conversationally and populates a structured intake form in real time. For personal injury, this includes accident details, medical treatment history, insurance information, and liability factors. For family law, it covers marriage duration, children, assets, and relief sought. The completed form is delivered to the attorney immediately after the call, formatted for direct import into Clio, MyCase, or your preferred system. This saves 10-15 minutes of manual data entry per lead and ensures no critical details are missed.',
  },
  {
    question: 'What is the ROI of an AI receptionist for a law firm?',
    answer: 'The average law firm that deploys an AI receptionist recovers 15-30 leads per month that were previously lost to missed calls, voicemail, and slow follow-up. With an average personal injury case worth $5,000-$15,000 in fees and an average family law case worth $3,000-$8,000, capturing even 2-3 additional cases per month generates $10,000-$45,000 in new revenue against a monthly cost of $549ג€“$4997. Firms also report a 40-60% reduction in receptionist overtime costs and a measurable improvement in Google review ratings due to faster, more consistent client communication.',
  },
  {
    question: 'How does an AI receptionist compare to a legal answering service?',
    answer: 'Legal answering services charge $1.50-$3.00 per call or $200-$500 per month for limited minutes. Agents follow basic scripts but cannot perform real intake, screen for conflicts, or book consultations in your calendar. Hold times average 30-60 seconds. An AI receptionist answers in under 2 seconds, performs full practice-area-specific intake, books appointments in real time, integrates with your CRM, works 24/7 with zero wait time, and costs a flat monthly rate with no per-call fees. The AI also improves over time as you refine its knowledge base, while answering service quality depends on whichever agent happens to pick up.',
  },
  {
    question: 'How does the AI qualify leads for a law firm?',
    answer: 'The AI qualifies leads by asking a series of practice-area-specific screening questions. For personal injury, it determines whether there was a liable third party, the severity of injuries, and whether the statute of limitations has passed. For family law, it confirms jurisdiction, identifies the type of relief sought, and assesses urgency. For criminal defense, it captures the charge, court date, and whether the caller is currently detained. Qualified leads are prioritized and delivered to attorneys immediately, while unqualified inquiries receive a polite explanation and, if configured, a referral to a more appropriate resource.',
  },
  {
    question: 'What analytics and reporting does an AI receptionist provide for law firms?',
    answer: 'AI receptionist platforms provide monthly and real-time dashboards covering total calls received, calls by practice area, peak call times, average call duration, conversion rate from call to booked consultation, after-hours call volume, missed call recovery rate, and lead qualification outcomes. These analytics help managing partners identify which practice areas generate the most inbound interest, which marketing channels drive calls, and where the firm is losing potential clients. Reports can be exported as PDF or CSV for partner meetings and marketing reviews.',
  },
  {
    question: 'How secure is the data handled by an AI receptionist?',
    answer: 'Enterprise-grade AI receptionists use AES-256 encryption for data at rest and TLS 1.3 for data in transit. Servers are hosted in SOC 2 Type II certified data centers with role-based access controls. Call recordings and intake data are stored in isolated, encrypted environments with configurable retention periods. You can set automatic data purging after 30, 60, 90, or 365 days. No caller information is used to train AI models or shared with third parties. For firms handling particularly sensitive matters, some providers offer dedicated infrastructure and on-premise deployment options.',
  },
  {
    question: 'Is an AI receptionist compliant with Bar association rules and legal ethics requirements?',
    answer: 'AI receptionists are designed to comply with ABA Model Rules and state-specific ethics requirements. The AI does not provide legal advice, make representations about case outcomes, or establish attorney-client relationships. It clearly identifies itself as an automated assistant for the firm. All marketing-related disclosures required by your state bar can be incorporated into the greeting. The AI\'s role is limited to administrative functions: answering calls, collecting information, scheduling appointments, and routing inquiries. Firms should review their state\'s specific rules on virtual receptionist use and technology competence requirements (ABA Model Rule 1.1, Comment 8) when configuring the system.',
  },
];

const FAQAIReceptionistLawyer: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for Law Firms: 20 Questions Answered | Boltcall';
    updateMetaDescription(
      'Everything law firms need to know about AI receptionists — client intake, confidentiality, after-hours calls, billing integration, and ROI.'
    );

    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "AI Receptionist for Law Firms: 20 Questions Answered",
        "description": "Everything law firms need to know about AI receptionists — client intake, confidentiality, after-hours calls, billing integration, and ROI.",
        "author": { "@type": "Organization", "name": "Boltcall" },
        "datePublished": "2026-03-31",
        "dateModified": "2026-03-31",
        "publisher": {
          "@type": "Organization",
          "name": "Boltcall",
          "logo": { "@type": "ImageObject", "url": "https://boltcall.org/logo.png" }
        },
        "url": "https://boltcall.org/blog/ai-receptionist-lawyer-faq",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://boltcall.org/blog/ai-receptionist-lawyer-faq"
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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Receptionist FAQ: Lawyer", "item": "https://boltcall.org/blog/ai-receptionist-lawyer-faq"}]});
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
              <span className="text-gray-900 font-medium">AI Receptionist for Law Firms: 20 Questions Answered</span>
            </nav>

            {/* Badge */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mb-6"
            >
              <Scale className="h-4 w-4 mr-2" />
              FAQ for Law Firms
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
            >
              AI Receptionist for Law Firms: 20 Questions Answered
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.1 } } }}
              className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed"
            >
              Everything law firms need to know about AI receptionists: cost, client intake, confidentiality, after-hours coverage, CRM integration, and measurable ROI.
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
              An AI receptionist for law firms answers every call instantly, performs practice-area-specific client intake, screens for conflicts, books consultations, and routes emergencies to the on-call attorney. It costs $549ג€“$4997/month versus $35,000-$50,000/year for a human receptionist and captures the 35-40% of potential clients who call after hours.
            </motion.div>
            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;Law firms lose more potential clients to slow intake than to any other cause. A prospect who cannot reach you within the first hour will call your competitor.&rdquo;</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Gyi Tsakalakis, Co-Founder, AttorneySync &amp; Legal Marketing Expert</footer>
            </blockquote>
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
                Law firms lose more potential clients to missed calls and slow follow-up than to any competitor. Research shows that the first firm to respond to a legal inquiry wins the case 78% of the time, yet the average law firm takes over 8 hours to return a call. Every hour of delay reduces conversion probability by 10 times.
              </p>
              <p className="text-gray-700 text-base leading-relaxed">
                An AI receptionist solves this by answering every call on the first ring, 24 hours a day, 7 days a week. It performs structured intake, qualifies the lead, books the consultation, and delivers a complete summary to the right attorney before the potential client has time to call another firm. Below are the 20 most common questions law firms ask before deploying an AI receptionist.
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
                20 Questions About AI Receptionists for Law Firms
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
        
          <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
            <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;Legal consumers expect immediate response &mdash; not because they are impatient, but because they are stressed. An AI that answers at 2 a.m. can be the difference between signing and losing a case.&rdquo;</p>
            <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Carolyn Elefant, Attorney &amp; Founder, MyShingle.com</footer>
          </blockquote></section>

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
                  to="/tools/lawyer-intake-calculator"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Scale className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Lawyer Intake Calculator
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">See how many leads your firm loses to missed calls each month and calculate the revenue impact.</p>
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
                  <p className="text-sm text-gray-600 leading-relaxed">A detailed look at the technology powering AI-powered phone answering for law firms.</p>
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
                  to="/blog/ai-receptionist-medspa-faq"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Globe className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      AI Receptionist FAQ for Med Spas
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">Learn how med spas use AI to handle bookings, consultations, and rebooking automatically.</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                    Read FAQ <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}

        {/* What Boltcall Includes for Law Firms */}
        <section className="py-10 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Boltcall Includes for Law Firms</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Every plan includes these features — no add-ons, no hidden fees</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: '24/7 Intake Answering', desc: 'Captures prospective client calls after hours and on weekends' },
                { label: 'Matter Intake Collection', desc: 'Gathers practice area, case description, and urgency before intake' },
                { label: 'Appointment Scheduling', desc: 'Books consultations directly into your attorney calendar' },
                { label: 'Conflict Screening', desc: 'Asks intake questions to flag potential conflict issues early' },
                { label: 'SMS Follow-Up', desc: 'Automated follow-up for prospects who need more information' },
                { label: 'Monthly Revenue Report', desc: 'See intake calls answered, consultations booked, and fees recovered' },
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
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Phone Answering Impact for Law Firms: Before and After</h2>
            <p className="text-gray-500 text-sm text-center mb-6">What law firms typically experience after switching to AI phone answering for intake</p>
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
                  ['Monthly intake calls answered', '50–65%', '99%+'],
                  ['After-hours intake calls captured', '0%', '100%'],
                  ['Intake-to-consultation conversion rate', '28%', '45%+'],
                  ['Monthly revenue from missed intakes recovered', '$0', '$15,000 – $75,000+'],
                  ['Consultation no-show rate', '20–28%', '10–14%'],
                  ['Google reviews per month', '0–1', '3–6'],
                  ['Setup time for 24/7 intake coverage', '2–4 weeks (hire)', '30 minutes'],
                  ['Monthly cost vs. intake coordinator', '$2,800 – $3,800/mo', '$549-897'],
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
            <Link to="/industries/lawyer-answering-service" className="font-semibold text-blue-700 hover:underline">
              Lawyer answering service
            </Link>{' '}
            covers the full buyer view.
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default FAQAIReceptionistLawyer;
