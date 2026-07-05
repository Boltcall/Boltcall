// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Phone, Clock, Calendar, Shield, Zap, CheckCircle,
  ChevronRight, ChevronDown, ArrowRight, Star, DollarSign, Droplets, Wrench, AlertTriangle
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
  { id: 'faq-section', text: '20 Questions Plumbing Owners Ask About AI Receptionists', level: 2 },
  { id: 'pros-cons', text: 'Pros & Cons of AI Receptionists for Plumbers', level: 2 },
  { id: 'related-resources', text: 'Related Resources', level: 2 },
];

const FAQAIReceptionistPlumber: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for Plumbing Companies: 20 Questions Answered | Boltcall';
    updateMetaDescription(
      'Everything plumbing business owners need to know about AI receptionists — emergency dispatch, after-hours calls, booking, and ROI.'
    );

    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "AI Receptionist for Plumbing Companies: 20 Questions Answered",
        "description": "Everything plumbing business owners need to know about AI receptionists — emergency dispatch, after-hours calls, booking, and ROI.",
        "author": { "@type": "Organization", "name": "Boltcall" },
        "datePublished": "2026-03-31",
        "dateModified": "2026-03-31",
        "publisher": {
          "@type": "Organization",
          "name": "Boltcall",
          "logo": { "@type": "ImageObject", "url": "https://boltcall.org/logo.png" }
        },
        "url": "https://boltcall.org/blog/ai-receptionist-plumber-faq",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://boltcall.org/blog/ai-receptionist-plumber-faq"
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
          { "@type": "ListItem", "position": 3, "name": "AI Receptionist for Plumbers: FAQ", "item": "https://boltcall.org/blog/ai-receptionist-plumber-faq" }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How much does an AI receptionist cost for a plumbing company?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "AI receptionists for plumbing companies cost $549ג€“$4997 per month with no per-call or per-minute fees. Traditional answering services charge $1-2 per call, which adds up to $800-1,500 per month for a busy plumbing company. The AI provides 24/7 coverage at a flat rate regardless of call volume."
            }
          },
          {
            "@type": "Question",
            "name": "How long does it take to set up an AI receptionist for a plumbing business?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Basic setup takes under 10 minutes. You provide your company name, hours, service area, and phone number. Full customization with emergency triage rules, service types, dispatch protocols, and pricing ranges takes 1-2 hours. Most plumbing companies are live the same day."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI triage emergency plumbing calls like burst pipes?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. The AI asks targeted questions to classify urgency: burst pipe or active flooding triggers immediate dispatch to your on-call plumber with caller details. A dripping faucet or running toilet is booked for the next available slot. This triage prevents false emergencies from waking your team at 2 AM while ensuring real emergencies get instant response."
            }
          },
          {
            "@type": "Question",
            "name": "How does the AI handle after-hours plumbing calls?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The AI answers every call 24/7 and triages by urgency. True emergencies like burst pipes, sewage backups, or gas line issues are routed immediately to your on-call plumber with a text and phone call. Non-urgent requests like faucet replacements are scheduled for the next business day with a confirmation text to the homeowner."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI validate whether a caller is in our plumbing service area?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. The AI asks for the caller's zip code or address and checks it against your defined service area. If the caller is outside your coverage zone, the AI politely explains and can suggest they search for a provider closer to them. This prevents wasted dispatch trips and disappointed customers."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI provide plumbing quotes or estimates over the phone?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The AI provides price ranges based on your configured rates. For example, it can say a drain cleaning typically costs $150-$250 depending on severity and location. For complex jobs requiring an on-site assessment, the AI books a diagnostic visit and sets expectations about the assessment fee. This transparency reduces sticker shock and increases booking rates."
            }
          },
          {
            "@type": "Question",
            "name": "Does the AI schedule around plumber availability and route optimization?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. When integrated with your field service software, the AI checks which plumbers are available, their current locations, and their skill sets. It books jobs into open slots that minimize drive time between appointments, improving daily job capacity by 15-20% compared to manual scheduling."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI handle calls for multiple plumbing service types?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. The AI distinguishes between drain cleaning, water heater repair, leak detection, pipe repair, sewer line work, fixture installation, water treatment, and any other service you offer. It asks the right qualifying questions for each type and books the appropriate appointment duration and technician."
            }
          },
          {
            "@type": "Question",
            "name": "Does the AI integrate with plumbing CRM and field service software?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Most AI receptionists integrate with ServiceTitan, Housecall Pro, Jobber, FieldEdge, and other popular platforms. New leads are automatically created in your system, existing customer records are updated, and jobs are dispatched without anyone touching a keyboard."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI handle customer callbacks and follow-ups for plumbing jobs?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. The AI can make outbound calls and texts for appointment confirmations, post-job follow-ups, and satisfaction surveys. It can also trigger automated review requests after completed jobs, helping your plumbing company build a stronger online reputation on Google and Yelp."
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
      question: 'How much does an AI receptionist cost for a plumbing company?',
      answer:
        'AI receptionists for plumbing companies cost $549ג€“$4997 per month with no per-call or per-minute fees. Traditional answering services charge $1-2 per call, which adds up to $800-1,500 per month for a busy plumbing company. The AI provides 24/7 coverage at a flat monthly rate regardless of how many calls you receive.',
    },
    {
      question: 'How long does it take to set up an AI receptionist for a plumbing business?',
      answer:
        'Basic setup takes under 10 minutes. You provide your company name, business hours, service area zip codes, and phone number. Full customization with emergency triage rules, service type definitions, dispatch protocols, and pricing ranges takes 1-2 hours. Most plumbing companies are answering calls with AI the same day they sign up.',
    },
    {
      question: 'Can the AI triage emergency plumbing calls like burst pipes?',
      answer:
        'Yes. The AI asks targeted questions to classify urgency. A burst pipe with active flooding triggers immediate dispatch to your on-call plumber with the caller\'s name, address, and situation details sent via text and phone. A dripping faucet or slow drain is booked for the next available routine slot. This triage prevents false emergencies from disrupting your team while ensuring real emergencies get an instant response.',
    },
    {
      question: 'How does the AI handle after-hours plumbing calls?',
      answer:
        'The AI answers every call 24/7 and classifies urgency automatically. True emergencies like burst pipes, sewage backups, gas line issues, or water heater failures with flooding are routed immediately to your on-call plumber with full caller details. Non-urgent requests like faucet replacements or toilet upgrades are scheduled for the next business day with a confirmation text sent to the homeowner.',
    },
    {
      question: 'Can the AI validate whether a caller is in our service area?',
      answer:
        'Yes. The AI asks for the caller\'s zip code or street address and checks it against your defined service area boundaries. Callers inside your zone get booked immediately. Callers outside your coverage receive a polite explanation. This prevents wasted dispatch trips to locations 45 minutes away and keeps your plumbers productive in high-density areas.',
    },
    {
      question: 'Can the AI provide plumbing quotes or estimates over the phone?',
      answer:
        'The AI provides price ranges based on your configured service rates. For example, it can tell a caller that drain cleaning typically costs $150-$250 depending on severity and access. For complex jobs requiring an on-site assessment, the AI books a diagnostic visit and explains the assessment fee upfront. This transparency reduces sticker shock and increases booking rates by 20-30%.',
    },
    {
      question: 'Does the AI schedule around plumber availability and location?',
      answer:
        'Yes. When integrated with your field service software, the AI checks which plumbers are available, their current job locations, and their specializations. It books appointments into open slots that minimize drive time between jobs, improving daily job capacity by 15-20% compared to a dispatcher manually juggling a paper calendar.',
    },
    {
      question: 'Can the AI handle calls for multiple plumbing service types?',
      answer:
        'Yes. The AI distinguishes between drain cleaning, water heater repair and installation, leak detection, pipe repair and repiping, sewer line work, fixture installation, water treatment systems, and any other service you offer. It asks the right qualifying questions for each type and books the appropriate appointment duration with the correct technician.',
    },
    {
      question: 'Does the AI integrate with plumbing CRM and field service software?',
      answer:
        'Most AI receptionists integrate with ServiceTitan, Housecall Pro, Jobber, FieldEdge, ServiceFusion, and other popular platforms. New leads are automatically created in your system, existing customer records are pulled up and updated, and jobs are dispatched to technicians without anyone touching a keyboard.',
    },
    {
      question: 'Can the AI handle customer callbacks and follow-ups?',
      answer:
        'Yes. The AI makes outbound calls and sends texts for appointment confirmations, "on the way" notifications, post-job follow-ups, and satisfaction surveys. It can also trigger automated review requests after completed jobs, helping your plumbing company build a stronger online reputation on Google, Yelp, and Angi.',
    },
    {
      question: 'Can the AI automate review collection for my plumbing business?',
      answer:
        'Yes. After a job is marked complete, the AI sends an automated text with a direct link to your Google Business Profile review page. Satisfied customers can leave a review in two taps. Plumbing companies using automated review requests see a 3-5x increase in monthly reviews, which directly improves local search rankings and booking volume.',
    },
    {
      question: 'How does the AI handle seasonal demand spikes for plumbing?',
      answer:
        'The AI scales to unlimited simultaneous calls with no degradation. During winter freeze season when burst pipe calls spike 300-400%, every caller still gets an immediate answer. During summer water heater season, no one hits voicemail while your team is on the truck. Your cost stays flat regardless of volume, unlike answering services that charge per call.',
    },
    {
      question: 'How does an AI receptionist compare to a traditional answering service for plumbers?',
      answer:
        'Traditional answering services cost $1-2 per call with human operators who read from scripts, frequently misspell names, and cannot book appointments in your system. An AI receptionist costs a flat $549-4997 per month, handles unlimited calls, books directly into your calendar, triages emergencies with consistent accuracy, and sends confirmation texts automatically.',
    },
    {
      question: 'What ROI can a plumbing company expect from an AI receptionist?',
      answer:
        'Most plumbing companies see a 4-8x return in the first month. The average plumbing service call is worth $250-450, and emergency jobs run $500-1,500. Capturing just 3-4 calls per week that previously went to voicemail or a competitor pays for the entire year of AI service. After-hours emergency capture alone often covers the monthly cost twice over.',
    },
    {
      question: 'Does the AI receptionist support multiple languages for plumbing calls?',
      answer:
        'Yes. The AI detects the caller\'s language and responds automatically in Spanish, French, Portuguese, and other supported languages. For plumbing companies serving diverse communities, this eliminates the language barrier that causes homeowners to hang up and call a competitor who speaks their language.',
    },
    {
      question: 'Does the AI record plumbing service calls?',
      answer:
        'Yes. Every call is recorded and transcribed automatically. You can search transcripts by keyword to find specific conversations, review how the AI handled a disputed call, or analyze patterns in customer complaints. Recordings are stored securely on encrypted servers and accessible through your dashboard anytime.',
    },
    {
      question: 'Can the AI transfer calls to an on-call plumber?',
      answer:
        'Yes. For confirmed emergencies, the AI immediately calls your on-call plumber and connects both parties with a warm handoff. The plumber receives a text with the caller\'s name, address, phone number, and a summary of the issue before the call connects. This gives your tech full context so they can prepare equipment and provide an accurate ETA.',
    },
    {
      question: 'How does the AI protect my plumbing company\'s customer data?',
      answer:
        'Customer data is encrypted at rest using AES-256 and in transit using TLS 1.3. Infrastructure is hosted on SOC 2 Type II compliant servers with regular security audits. Access is restricted to authorized users with multi-factor authentication. You own all your data and can export or delete it at any time.',
    },
    {
      question: 'What monthly reporting does the AI provide for plumbing companies?',
      answer:
        'You receive detailed analytics including total calls handled, calls by hour and day of week, jobs booked by service type, emergency dispatch count, average call duration, conversion rate from call to booking, and top caller questions. This data reveals your peak call windows, most-requested services, and marketing channel performance.',
    },
    {
      question: 'What is the cancellation policy for a plumbing AI receptionist?',
      answer:
        'Most providers, including Boltcall, offer month-to-month plans with no long-term contracts or cancellation fees. You can cancel anytime with no penalties. Your call recordings, transcripts, and customer data remain available for download after cancellation so you never lose historical information.',
    },
  ];

  const relatedResources = [
    {
      href: '/blog/ai-phone-answering-plumbers',
      title: 'AI Phone Answering for Plumbers: Complete Guide',
      description: 'Step-by-step guide to setting up AI phone answering for your plumbing business.',
      icon: Phone,
    },
    {
      href: '/tools/plumber-revenue-calculator',
      title: 'Plumber Revenue Calculator',
      description: 'Calculate how much revenue your plumbing company loses to missed calls and slow response times.',
      icon: Droplets,
    },
    {
      href: '/features/ai-receptionist',
      title: 'How Our AI Receptionist Works',
      description: 'See the technology behind AI-powered phone answering for service businesses.',
      icon: Zap,
    },
    {
      href: '/blog/ai-receptionist-hvac-faq',
      title: 'AI Receptionist FAQ for HVAC Companies',
      description: 'See how HVAC companies use AI receptionists for peak season call handling.',
      icon: AlertTriangle,
    },
    {
      href: '/blog/ai-receptionist-dentist-faq',
      title: 'AI Receptionist FAQ for Dentists',
      description: 'How dental offices use AI to handle patient scheduling, insurance questions, and emergency routing.',
      icon: Star,
    },
    {
      href: '/blog/ai-receptionist-lawyer-faq',
      title: 'AI Receptionist FAQ for Law Firms',
      description: 'Learn how law firms use AI to qualify leads, route urgent calls, and capture new clients 24/7.',
      icon: DollarSign,
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
              <span className="text-gray-900 font-medium">AI Receptionist for Plumbing Companies: 20 Questions Answered</span>
            </nav>

            {/* Badge */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mb-6"
            >
              <Wrench className="h-4 w-4 mr-2" />
              FAQ for Plumbing Companies
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
            >
              AI Receptionist for Plumbing Companies: 20 Questions Answered
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.1 } } }}
              className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed"
            >
              Emergency dispatch, after-hours coverage, quote handling, and every other question plumbing business owners ask before switching to AI phone answering.
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
              Plumbing companies miss 30-40% of incoming calls because technicians are on the job and cannot answer. Each missed call represents $250-1,500 in lost revenue. This FAQ covers everything you need to know about using AI to capture every call, triage emergencies, and book more jobs.
            </motion.div>
            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;In the service trades, the phone is your most valuable sales tool. A call unanswered is a job lost &mdash; and in plumbing that job is often worth $400 or more.&rdquo;</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Ellen Rohr, Business Turnaround Expert &amp; Author, Plumbing &amp; HVAC Industry Consultant</footer>
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
                20 Questions Plumbing Owners Ask About AI Receptionists
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

        {/* Pros & Cons */}
        <section id="pros-cons" className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <h2 id="pros-cons" className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Pros &amp; Cons of AI Receptionists for Plumbers
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                An honest breakdown of what AI phone answering does well — and where it still has limits — for plumbing companies.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Pros */}
                <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
                  <h3 className="text-base font-bold text-green-800 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">✓</span>
                    Advantages
                  </h3>
                  <ul className="space-y-3">
                    {[
                      'Never misses an emergency call — even at 2am',
                      'Books appointments automatically while you\'re on a job',
                      'Captures lead info before you call back',
                      'Handles multiple calls simultaneously during busy periods',
                      'Consistent, professional tone on every call',
                      'Fraction of the cost of a human dispatcher',
                    ].map((pro, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-green-900">
                        <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Cons */}
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
                  <h3 className="text-base font-bold text-red-800 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">✗</span>
                    Limitations
                  </h3>
                  <ul className="space-y-3">
                    {[
                      'Cannot diagnose complex plumbing issues over the phone',
                      'Requires initial setup and customization',
                      'Monthly subscription cost ($297–$497/month)',
                      'Customers who insist on human contact may be frustrated',
                      'Needs internet connectivity to function',
                      'Doesn\'t replace the need for skilled plumbers',
                    ].map((con, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-900">
                        <span className="text-red-500 font-bold flex-shrink-0 mt-0.5">✗</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        
          <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
            <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;Speed of response is the single biggest differentiator for plumbing businesses. AI-assisted call handling closes the gap between a lead calling and a technician arriving.&rdquo;</p>
            <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Al Levi, Founder, Appleseed Business Inc. &amp; Author of The 7-Power Contractor</footer>
          </blockquote></section>

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

        {/* What Boltcall Includes for Plumbing Businesses */}
        <section className="py-10 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Boltcall Includes for Plumbing Businesses</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Every plan includes these features — no add-ons, no hidden fees</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: '24/7 Emergency Call Answering', desc: 'Captures urgent calls for burst pipes and flooding after hours' },
                { label: 'Service Appointment Booking', desc: 'Books repairs, installations, and maintenance visits automatically' },
                { label: 'Lead Qualification', desc: 'Collects issue type, location, and urgency before dispatch' },
                { label: 'SMS Follow-Up', desc: 'Instant text to missed callers so no emergency job goes to a competitor' },
                { label: 'Seasonal Demand Coverage', desc: 'Handles winter freeze and spring volume without added staff' },
                { label: 'Monthly Revenue Report', desc: 'See calls answered, jobs dispatched, and revenue recovered each month' },
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
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Phone Answering Impact for Plumbing Businesses: Before and After</h2>
            <p className="text-gray-500 text-sm text-center mb-6">What plumbing companies typically experience after switching to AI phone answering</p>
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
                  ['Monthly calls answered', '60–72%', '99%+'],
                  ['Emergency after-hours calls captured', '0%', '100%'],
                  ['Calls lost to competitor while team is on job', '28–40%', 'Near zero'],
                  ['Monthly revenue from missed calls recovered', '$0', '$2,500 – $7,000+'],
                  ['Dispatch appointment no-show rate', '15–20%', '7–10%'],
                  ['Google reviews per month', '1–2', '5–9'],
                  ['Setup time for 24/7 coverage', '2–4 weeks (hire)', '30 minutes'],
                  ['Monthly cost vs. answering service', '$300 – $800/mo', '$549-897'],
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

export default FAQAIReceptionistPlumber;
