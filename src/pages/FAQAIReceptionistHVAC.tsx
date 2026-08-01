// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Phone, Clock, Calendar, Flame, Shield, Zap, CheckCircle,
  ChevronRight, ChevronDown, ArrowRight, Star, Thermometer, DollarSign, Users, Sun
} from 'lucide-react';
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
  { id: 'faq-section', text: '20 Questions HVAC Owners Ask About AI Receptionists', level: 2 },
  { id: 'related-resources', text: 'Related Resources', level: 2 },
];

const FAQAIReceptionistHVAC: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for HVAC Companies: 20 Questions Answered | Boltcall';
    updateMetaDescription(
      'Everything HVAC business owners need to know about AI receptionists — cost, setup, peak season handling, after-hours calls, and ROI.'
    );

    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "AI Receptionist for HVAC Companies: 20 Questions Answered",
        "description": "Everything HVAC business owners need to know about AI receptionists — cost, setup, peak season handling, after-hours calls, and ROI.",
        "author": { "@type": "Organization", "name": "Boltcall" },
        "datePublished": "2026-03-31",
        "dateModified": "2026-03-31",
        "publisher": {
          "@type": "Organization",
          "name": "Boltcall",
          "logo": { "@type": "ImageObject", "url": "https://boltcall.org/logo.png" }
        },
        "url": "https://boltcall.org/blog/ai-receptionist-hvac-faq",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://boltcall.org/blog/ai-receptionist-hvac-faq"
        },
        "image": {
          "@type": "ImageObject",
          "url": "https://boltcall.org/og-image.png",
          "width": 1200,
          "height": 630
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
          { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog" },
          { "@type": "ListItem", "position": 3, "name": "AI Receptionist for HVAC: FAQ", "item": "https://boltcall.org/blog/ai-receptionist-hvac-faq" }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How much does an AI receptionist cost for an HVAC company?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Most AI receptionists for HVAC companies cost between $549 and $4997 per month with no per-call fees. Compared to hiring a full-time receptionist at $2,800-3,500 per month, this represents a 90%+ cost reduction while providing 24/7 coverage including weekends and holidays."
            }
          },
          {
            "@type": "Question",
            "name": "How long does it take to set up an AI receptionist for HVAC?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Basic setup takes under 10 minutes. You provide your company name, hours, service area, and phone number. Full customization including service types, emergency routing, and technician dispatch rules typically takes 1-2 hours. Most HVAC companies are fully live within a single afternoon."
            }
          },
          {
            "@type": "Question",
            "name": "Can an AI receptionist handle peak season call volume for HVAC?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Unlike human staff, an AI receptionist handles unlimited simultaneous calls with zero hold times. During summer and winter peaks when call volume can triple, every caller gets an immediate answer. No busy signals, no voicemail, no lost leads during your highest-revenue months."
            }
          },
          {
            "@type": "Question",
            "name": "How does the AI handle after-hours HVAC calls?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The AI answers every call 24/7 and triages based on urgency. True emergencies like no heat in winter or gas smell are immediately routed to your on-call technician with full caller details. Routine requests like maintenance scheduling are captured and queued for next-day follow-up."
            }
          },
          {
            "@type": "Question",
            "name": "Does the AI integrate with HVAC scheduling software?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Most AI receptionists integrate with popular field service platforms including ServiceTitan, Housecall Pro, Jobber, and FieldEdge. The AI checks technician availability in real time, books appointments directly into your calendar, and sends confirmation texts to homeowners."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI triage emergency HVAC calls?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. The AI asks targeted questions about the situation — no heat with elderly or infants, gas smell, carbon monoxide alarm, or flooding from a burst unit. True emergencies are escalated immediately to your on-call tech with a text and call containing all details. Non-urgent issues are scheduled for the next available slot."
            }
          },
          {
            "@type": "Question",
            "name": "Does the AI receptionist support multiple languages for HVAC calls?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Most AI receptionists support Spanish, French, and other languages automatically. The AI detects the caller's language and responds accordingly, which is critical for HVAC companies serving diverse communities where language barriers often cause lost bookings."
            }
          },
          {
            "@type": "Question",
            "name": "What ROI can an HVAC company expect from an AI receptionist?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Most HVAC companies see a 3-5x return within the first month. The average HVAC service call is worth $300-500, so capturing just 2-3 calls per week that previously went to voicemail covers the monthly cost several times over. During peak season, the ROI multiplies as call volume and missed-call rates both increase."
            }
          },
          {
            "@type": "Question",
            "name": "Does the AI record HVAC service calls?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Every call is recorded and transcribed automatically. You can review call logs, search transcripts, and identify patterns like common complaints or frequently requested services. Recordings are stored securely and accessible through your dashboard at any time."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI connect to my HVAC company's CRM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. AI receptionists integrate with popular CRMs and field service tools including ServiceTitan, Housecall Pro, Jobber, Salesforce, and HubSpot. New caller details are automatically logged, existing customer records are updated, and follow-up tasks are created without any manual data entry."
            }
          }
        ]
      }
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

  const faqs = [
    {
      question: 'How much does an AI receptionist cost for an HVAC company?',
      answer:
        'Most AI receptionists for HVAC companies cost between $549 and $4997 per month with no per-call fees. Compared to hiring a full-time receptionist at $2,800-3,500 per month, this represents a 90%+ cost reduction while providing 24/7 coverage including weekends and holidays when emergency calls are most common.',
    },
    {
      question: 'How long does it take to set up an AI receptionist for HVAC?',
      answer:
        'Basic setup takes under 10 minutes. You provide your company name, hours, service area, and phone number. Full customization including service types, emergency routing, and technician dispatch rules typically takes 1-2 hours. Most HVAC companies are fully live within a single afternoon.',
    },
    {
      question: 'Can an AI receptionist handle peak season call volume for HVAC?',
      answer:
        'Yes. Unlike human staff, an AI receptionist handles unlimited simultaneous calls with zero hold times. During summer and winter peaks when call volume can triple, every caller gets an immediate answer. No busy signals, no voicemail, no lost leads during your highest-revenue months.',
    },
    {
      question: 'How does the AI handle after-hours HVAC calls?',
      answer:
        'The AI answers every call 24/7 and triages based on urgency. True emergencies like no heat in winter or a gas smell are immediately routed to your on-call technician with full caller details via text and call. Routine requests like maintenance scheduling or quote inquiries are captured and queued for next-day follow-up.',
    },
    {
      question: 'Does the AI integrate with HVAC scheduling software?',
      answer:
        'Most AI receptionists integrate with popular field service platforms including ServiceTitan, Housecall Pro, Jobber, and FieldEdge. The AI checks technician availability in real time, books appointments directly into your calendar, and sends confirmation texts to homeowners automatically.',
    },
    {
      question: 'Can the AI triage emergency HVAC calls?',
      answer:
        'Yes. The AI asks targeted questions about the situation: no heat with elderly or infants present, gas smell, carbon monoxide alarm, or flooding from a burst unit. True emergencies are escalated immediately to your on-call tech with a detailed text. Non-urgent issues are scheduled for the next available slot.',
    },
    {
      question: 'Does the AI receptionist support multiple languages for HVAC calls?',
      answer:
        'Yes. Most AI receptionists support Spanish, French, and other languages automatically. The AI detects the caller\'s language and responds accordingly, which is critical for HVAC companies serving diverse communities where language barriers often cause lost bookings.',
    },
    {
      question: 'What ROI can an HVAC company expect from an AI receptionist?',
      answer:
        'Most HVAC companies see a 3-5x return within the first month. The average HVAC service call is worth $300-500, so capturing just 2-3 calls per week that previously went to voicemail covers the monthly cost several times over. During peak season, the ROI multiplies as both call volume and missed-call rates increase.',
    },
    {
      question: 'Does the AI record HVAC service calls?',
      answer:
        'Yes. Every call is recorded and transcribed automatically. You can review call logs, search transcripts by keyword, and identify patterns like common complaints or frequently requested services. Recordings are stored securely and accessible through your dashboard at any time.',
    },
    {
      question: 'Can the AI connect to my HVAC company\'s CRM?',
      answer:
        'Yes. AI receptionists integrate with popular CRMs and field service tools including ServiceTitan, Housecall Pro, Jobber, Salesforce, and HubSpot. New caller details are automatically logged, existing customer records are updated, and follow-up tasks are created without any manual data entry.',
    },
    {
      question: 'How does the AI handle HVAC-specific terminology?',
      answer:
        'The AI is trained on industry terminology including system types (split, packaged, mini-split, heat pump), common issues (compressor failure, refrigerant leak, blower motor), brand names (Carrier, Trane, Lennox, Goodman), and SEER ratings. It understands callers describing symptoms in plain language and maps them to the correct service categories.',
    },
    {
      question: 'Can the AI dispatch technicians directly?',
      answer:
        'Yes, when integrated with your field service software. The AI checks which technicians are available, considers their current location and skill set, and assigns the job. For emergencies, it can notify the nearest on-call tech via text and phone simultaneously, reducing response times from hours to minutes.',
    },
    {
      question: 'Can the AI upsell maintenance agreements?',
      answer:
        'Yes. When a caller books a repair, the AI can mention your maintenance plan as a cost-saving option. For example, after scheduling an AC repair, it might say: "We also offer a maintenance plan that includes two annual tune-ups and priority scheduling. Would you like details?" This passive upsell approach consistently converts 8-15% of repair callers.',
    },
    {
      question: 'How does an AI receptionist compare to voicemail for HVAC?',
      answer:
        'Voicemail loses 60-80% of HVAC callers because homeowners with a broken AC or furnace will not wait for a callback. They call the next company. An AI receptionist answers instantly, gathers the issue details, and either books the appointment or dispatches a tech on the spot. The result is dramatically higher lead capture and faster response times.',
    },
    {
      question: 'Do homeowners actually like talking to an AI receptionist?',
      answer:
        'Most callers cannot tell they are speaking with AI. Modern AI receptionists use natural-sounding voices and handle conversational flow including interruptions. Homeowners consistently report higher satisfaction because they get an immediate answer instead of hold music or voicemail. If a caller requests a human, the AI transfers to your staff seamlessly.',
    },
    {
      question: 'How does the AI handle seasonal volume scaling?',
      answer:
        'The AI scales automatically with no configuration changes needed. Whether you receive 10 calls a day in spring or 80 calls a day during a summer heat wave, every call is answered on the first ring. There are no per-call charges, so your cost stays flat even when volume spikes. This eliminates the need to hire and train temporary seasonal staff.',
    },
    {
      question: 'Can the AI transfer calls to live HVAC staff?',
      answer:
        'Yes. You define the transfer rules: specific question types, VIP customers, or any caller who requests a human. The AI provides a warm handoff, briefing your staff on the caller\'s name, issue, and system details before connecting. This saves your team from repeating intake questions and speeds up resolution.',
    },
    {
      question: 'What kind of monthly reporting does the AI provide?',
      answer:
        'You receive detailed analytics including total calls handled, calls by time of day and day of week, appointments booked, emergency dispatches, average call duration, and top caller questions. This data reveals staffing gaps, peak demand windows, and which marketing channels drive the most calls.',
    },
    {
      question: 'What is the cancellation policy for an AI receptionist?',
      answer:
        'Most providers, including Boltcall, offer month-to-month plans with no long-term contracts. You can cancel anytime without penalties or termination fees. Your call data and recordings remain accessible for download after cancellation, so you never lose historical information.',
    },
    {
      question: 'How does the AI protect my HVAC customer data?',
      answer:
        'Reputable AI receptionist providers use bank-level encryption (AES-256) for data at rest and TLS 1.3 for data in transit. Call recordings and customer information are stored on SOC 2 compliant servers. Access is restricted to authorized users only, and you can delete customer data at any time to comply with privacy regulations.',
    },
  ];

  const relatedResources = [
    {
      href: '/tools/hvac-overflow-calculator',
      title: 'HVAC Overflow Calculator',
      description: 'See how many calls your HVAC company loses during peak season and the revenue impact.',
      icon: Thermometer,
    },
    {
      href: '/features/ai-receptionist',
      title: 'How Our AI Receptionist Works',
      description: 'A detailed look at the technology behind AI-powered phone answering for service businesses.',
      icon: Zap,
    },
    {
      href: '/blog/ai-receptionist-plumber-faq',
      title: 'AI Receptionist FAQ for Plumbers',
      description: 'See how plumbing companies use AI receptionists for emergency dispatch and after-hours calls.',
      icon: Users,
    },
    {
      href: '/blog/ai-receptionist-solar-faq',
      title: 'AI Receptionist FAQ for Solar Companies',
      description: 'Learn how solar installers use AI to qualify leads and book consultations automatically.',
      icon: Sun,
    },
    {
      href: '/blog/ai-receptionist-dentist-faq',
      title: 'AI Receptionist FAQ for Dentists',
      description: 'How dental offices use AI to handle patient scheduling, insurance, and emergency routing.',
      icon: Star,
    },
  ];

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
              <span className="text-gray-900 font-medium">AI Receptionist for HVAC Companies: 20 Questions Answered</span>
            </nav>

            {/* Badge */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mb-6"
            >
              <Flame className="h-4 w-4 mr-2" />
              FAQ for HVAC Companies
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
            >
              AI Receptionist for HVAC Companies: 20 Questions Answered
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.1 } } }}
              className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed"
            >
              Every question HVAC business owners ask before switching to an AI receptionist, answered with real numbers and no fluff.
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
              <span>10 min read</span>
            </motion.div>

            {/* Info box */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.3 } } }}
              className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-blue-800 text-sm leading-relaxed"
            >
              HVAC companies lose an average of $4,000-8,000 per month to missed calls during peak season. This FAQ covers everything you need to know about using an AI receptionist to capture every lead, dispatch emergency calls, and scale without hiring.
            </motion.div>
            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;HVAC contractors who answer the phone within 60 seconds convert prospects at nearly twice the rate of those who call back later \u2014 and most missed calls never return.&rdquo;</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Bob Bauer, President, Air Conditioning Contractors of America (ACCA)</footer>
            </blockquote>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <h2 id="faq-section" className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
                20 Questions HVAC Owners Ask About AI Receptionists
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-20px' }}
                    variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.4, delay: index * 0.03 } } }}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                          openFaq === index ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openFaq === index && (
                      <div className="px-6 pb-5">
                        <p className="text-gray-600 text-base leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
          <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
            <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;Automation in the HVAC industry is no longer optional \u2014 companies that fail to adopt AI-assisted communication tools are ceding revenue to faster-moving competitors.&rdquo;</p>
            <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Mike Weil, Editor-in-Chief, ACHR News (Air Conditioning, Heating &amp; Refrigeration News)</footer>
          </blockquote>

        {/* Pros & Cons */}
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 id="pros-cons" className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of AI Receptionists for HVAC Companies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Answers every call instantly during summer and winter peak seasons — no busy signals</li>
                  <li>• Triages emergency calls (gas leaks, no heat in winter) and dispatches on-call techs immediately</li>
                  <li>• Costs $549-4997/mo vs. $2,800–3,500/mo for a full-time receptionist — 90%+ savings</li>
                  <li>• Integrates with ServiceTitan, Housecall Pro, and Jobber for real-time booking</li>
                  <li>• Passively upsells maintenance agreements during repair calls</li>
                  <li>• Handles unlimited simultaneous calls with flat-rate pricing regardless of volume spikes</li>
                </ul>
              </div>
              <div className="bg-red-50 rounded-xl p-6">
                <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Emergency triage logic must be carefully configured — errors in routing have real consequences</li>
                  <li>• HVAC-specific terminology (refrigerant types, SEER ratings, brand quirks) needs a thorough knowledge-base setup</li>
                  <li>• Callers in distress during emergencies may become frustrated before reaching a human tech</li>
                  <li>• Integration with niche field-service platforms may require custom webhook work</li>
                  <li>• AI cannot physically assess equipment condition or provide repair estimates on-site</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Related Resources */}
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <h2 id="related-resources" className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Related Resources</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedResources.map((resource, index) => {
                  const Icon = resource.icon;
                  return (
                    <Link
                      key={index}
                      to={resource.href}
                      className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {resource.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{resource.description}</p>
                      <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                        Learn more <ArrowRight className="h-4 w-4 ml-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}

        {/* What Boltcall Includes for HVAC Companies */}
        <section className="py-10 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Boltcall Includes for HVAC Companies</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Every plan includes these features — no add-ons, no hidden fees</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: '24/7 Call Answering', desc: 'Captures every emergency call after hours and on weekends' },
                { label: 'Service Appointment Booking', desc: 'Books installs, tune-ups, and emergency repairs into your calendar' },
                { label: 'Lead Qualification', desc: 'Collects equipment type, issue description, and urgency automatically' },
                { label: 'SMS Follow-Up', desc: 'Instant text to missed callers so no lead goes cold' },
                { label: 'Seasonal Rush Coverage', desc: 'Handles peak volume in summer and winter without added headcount' },
                { label: 'Monthly Revenue Report', desc: 'See calls answered, jobs booked, and overflow revenue recovered' },
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
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Phone Answering Impact for HVAC Companies: Before and After</h2>
            <p className="text-gray-500 text-sm text-center mb-6">What HVAC businesses typically experience after switching to AI phone answering</p>
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
                  ['Monthly calls answered', '65–75%', '99%+'],
                  ['After-hours and emergency calls captured', '0%', '100%'],
                  ['Peak-season call overflow rate', '30–45%', 'Near zero'],
                  ['Monthly revenue from missed calls recovered', '$0', '$4,000 – $12,000+'],
                  ['No-show rate for service appointments', '18–22%', '8–12%'],
                  ['Google reviews per month', '1–2', '5–10'],
                  ['Setup time for 24/7 coverage', '2–4 weeks (hire)', '30 minutes'],
                  ['Monthly cost vs. answering service', '$400 – $1,500/mo', '$549-897'],
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
      <Footer />
    </>
  );
};

export default FAQAIReceptionistHVAC;
