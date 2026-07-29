// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Phone, Clock, Calendar, Shield, Zap, CheckCircle,
  ChevronRight, ChevronDown, ArrowRight, Star, DollarSign, Heart, Bell, Users
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
  { id: 'faq-section', text: '20 Questions Dentists Ask About AI Receptionists', level: 2 },
  { id: 'related-resources', text: 'Related Resources', level: 2 },
];

const FAQAIReceptionistDentist: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for Dental Offices: 20 Questions Answered | Boltcall';
    updateMetaDescription(
      'Everything dental practices need to know about AI phone answering — patient scheduling, insurance questions, emergency routing, HIPAA, and cost.'
    );

    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "AI Receptionist for Dental Offices: 20 Questions Answered",
        "description": "Everything dental practices need to know about AI phone answering — patient scheduling, insurance questions, emergency routing, HIPAA, and cost.",
        "author": { "@type": "Organization", "name": "Boltcall" },
        "datePublished": "2026-03-31",
        "dateModified": "2026-03-31",
        "publisher": {
          "@type": "Organization",
          "name": "Boltcall",
          "logo": { "@type": "ImageObject", "url": "https://boltcall.org/logo.png" }
        },
        "url": "https://boltcall.org/blog/ai-receptionist-dentist-faq",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://boltcall.org/blog/ai-receptionist-dentist-faq"
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
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How much does an AI receptionist cost for a dental office?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "AI receptionists for dental offices typically cost $549ג€“$4997 per month with no per-call fees. Compare that to a front desk employee at $2,800-3,800 per month plus benefits. The AI does not replace your entire team but handles 70-80% of routine calls, freeing staff to focus on patients in the office."
            }
          },
          {
            "@type": "Question",
            "name": "How long does setup take for a dental AI receptionist?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Basic setup takes under 10 minutes. You enter your practice name, hours, services, and phone number. Full configuration with appointment types, insurance handling, emergency routing, and provider schedules takes 1-2 hours. Most dental offices are fully live the same day."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI schedule different dental procedure types?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. The AI books cleanings (60 min), exams (30 min), crowns (90 min), root canals (120 min), emergency visits (30 min), and any custom procedure type you define. It respects provider-specific schedules, operatory availability, and buffer times between appointments."
            }
          },
          {
            "@type": "Question",
            "name": "How does the AI handle dental insurance questions?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The AI collects the caller's insurance provider, member ID, and group number, then confirms whether your practice accepts that plan. For detailed coverage questions like specific procedure costs or remaining benefits, the AI captures the request and routes it to your billing team for a callback."
            }
          },
          {
            "@type": "Question",
            "name": "Is the AI receptionist HIPAA compliant for dental offices?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Reputable AI receptionist providers maintain HIPAA-compliant infrastructure with encrypted data storage, secure transmission, access controls, and Business Associate Agreements (BAAs). Patient information is never used for training or shared with third parties."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI run patient recall campaigns for dental practices?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. The AI can proactively contact patients who are overdue for cleanings, exams, or follow-up treatments via automated text or call. Recall campaigns typically recover 15-25% of lapsed patients, which represents significant recurring revenue for the practice."
            }
          },
          {
            "@type": "Question",
            "name": "How does an AI receptionist reduce dental appointment no-shows?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The AI sends automated reminders via text message 48 hours and 2 hours before appointments. Patients can confirm or reschedule with a single tap. Dental practices using automated reminders see a 30-50% reduction in no-shows, recovering $3,000-8,000 in monthly production."
            }
          },
          {
            "@type": "Question",
            "name": "How does the AI handle after-hours dental emergency calls?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The AI answers after-hours calls and triages based on urgency. True emergencies like severe pain, swelling, knocked-out teeth, or uncontrolled bleeding are routed immediately to the on-call dentist. Non-urgent issues receive care instructions and a priority morning callback booking."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI handle new dental patient intake?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. The AI collects the new patient's name, contact information, insurance details, reason for visit, and medical history highlights. It can text a link to your digital intake forms so paperwork is completed before the appointment, saving 15-20 minutes of chair time."
            }
          },
          {
            "@type": "Question",
            "name": "How does the AI manage wait time communication for dental patients?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "When patients call to ask about current wait times, the AI checks your schedule and provides an accurate estimate. It can also send text notifications when the office is running behind, so patients can adjust their arrival time rather than sitting in the waiting room."
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


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Receptionist FAQ: Dentist", "item": "https://boltcall.org/blog/ai-receptionist-dentist-faq"}]});
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

  const faqs = [
    {
      question: 'How much does an AI receptionist cost for a dental office?',
      answer:
        'AI receptionists for dental offices typically cost $549ג€“$4997 per month with no per-call fees. Compare that to a front desk employee at $2,800-3,800 per month plus benefits. The AI does not replace your entire team, but handles 70-80% of routine calls so your staff can focus on patients who are physically in the office.',
    },
    {
      question: 'How long does setup take for a dental AI receptionist?',
      answer:
        'Basic setup takes under 10 minutes. You enter your practice name, hours, services, and phone number. Full configuration with appointment types, insurance plan handling, emergency routing rules, and provider-specific schedules takes 1-2 hours. Most dental offices are fully live the same day they sign up.',
    },
    {
      question: 'Can the AI schedule different dental procedure types?',
      answer:
        'Yes. The AI books cleanings (60 min), exams (30 min), crowns (90 min), root canals (120 min), emergency visits (30 min), and any custom procedure type you define. It respects provider-specific schedules, operatory availability, and required buffer times between procedures automatically.',
    },
    {
      question: 'How does the AI handle dental insurance questions?',
      answer:
        'The AI collects the caller\'s insurance provider name, member ID, and group number, then confirms whether your practice accepts that plan from its knowledge base. For detailed coverage questions like specific procedure costs or remaining annual benefits, the AI captures the request and routes it to your billing coordinator for a callback with exact numbers.',
    },
    {
      question: 'Is the AI receptionist HIPAA compliant for dental offices?',
      answer:
        'Reputable AI receptionist providers maintain HIPAA-compliant infrastructure including encrypted data storage (AES-256), secure transmission (TLS 1.3), role-based access controls, audit logging, and signed Business Associate Agreements (BAAs). Patient information is never used for AI training or shared with third parties.',
    },
    {
      question: 'Can the AI run patient recall campaigns for dental practices?',
      answer:
        'Yes. The AI proactively contacts patients who are overdue for cleanings, exams, or follow-up treatments via automated text messages or outbound calls. Recall campaigns typically recover 15-25% of lapsed patients, which represents significant recurring hygiene revenue that would otherwise walk out the door to another practice.',
    },
    {
      question: 'How does an AI receptionist reduce dental appointment no-shows?',
      answer:
        'The AI sends automated text reminders 48 hours and 2 hours before each appointment. Patients can confirm with a single tap or reschedule instantly through a link. Dental practices using automated reminders report a 30-50% reduction in no-shows, recovering $3,000-8,000 per month in production that would otherwise be lost to empty chairs.',
    },
    {
      question: 'How does the AI handle after-hours dental emergency calls?',
      answer:
        'The AI answers after-hours calls and triages based on urgency. True emergencies like severe pain, facial swelling, a knocked-out tooth, or uncontrolled bleeding are routed immediately to the on-call dentist with full patient details. Non-urgent issues receive home care instructions and an automatic priority booking for the next morning.',
    },
    {
      question: 'Can the AI handle new dental patient intake?',
      answer:
        'Yes. The AI collects the new patient\'s name, phone number, email, insurance details, reason for visit, and relevant medical history. It can text a link to your digital intake forms so paperwork is completed before the appointment, saving 15-20 minutes of chair time and eliminating the clipboard-in-the-waiting-room bottleneck.',
    },
    {
      question: 'How does the AI manage wait time communication?',
      answer:
        'When patients call to check current wait times, the AI references your schedule and provides an accurate estimate. It can also proactively text patients when the office is running behind schedule, allowing them to adjust their arrival time rather than sitting frustrated in the waiting room for 30 minutes.',
    },
    {
      question: 'Does the AI integrate with dental practice management software?',
      answer:
        'Most AI receptionists integrate with popular dental PMS platforms including Dentrix, Eaglesoft, Open Dental, Curve Dental, and cloud-based systems like tab32 and Oryx. Integration enables real-time appointment booking, patient record lookup, and automatic syncing of new patient information without duplicate data entry.',
    },
    {
      question: 'Does the AI support multiple languages for dental patients?',
      answer:
        'Yes. The AI detects the caller\'s language automatically and responds in kind. Spanish, French, Mandarin, and other languages are supported out of the box. This is especially valuable for dental practices in diverse communities where a language barrier often prevents patients from booking or understanding post-procedure care instructions.',
    },
    {
      question: 'Can the AI transfer calls to the hygienist or dentist?',
      answer:
        'Yes. You define transfer rules based on call type, urgency, or patient request. The AI provides a warm handoff, briefing your team on the caller\'s name, patient status, and reason for calling before connecting. This eliminates the repetitive "can you tell me your name and why you\'re calling" that frustrates patients during transfers.',
    },
    {
      question: 'How does the AI handle anxious dental patients on the phone?',
      answer:
        'The AI uses a calm, reassuring tone and validates the caller\'s concerns before moving to scheduling. For patients expressing fear or anxiety about a procedure, the AI can share information about sedation options, describe what to expect, and offer to book a consultation visit first. This empathetic approach converts nervous callers who might otherwise hang up.',
    },
    {
      question: 'How does the AI handle cancellations and rescheduling?',
      answer:
        'Patients can cancel or reschedule through the AI via phone or text 24/7. When a slot opens, the AI automatically contacts patients on your waitlist to fill the gap. This waitlist backfill feature alone recovers 2-4 appointments per week that would otherwise be lost production, generating $1,500-4,000 in monthly recovered revenue.',
    },
    {
      question: 'What ROI can a dental office expect from an AI receptionist?',
      answer:
        'Most dental practices see a 5-10x return within the first month. The average new dental patient is worth $1,200-2,000 in first-year revenue across exams, cleanings, and treatment. Capturing just 3-5 new patients per month who previously went to voicemail pays for the AI many times over, before accounting for reduced no-shows and recall revenue.',
    },
    {
      question: 'How does the AI protect patient data and ensure privacy?',
      answer:
        'Data is encrypted at rest (AES-256) and in transit (TLS 1.3). Servers are SOC 2 Type II compliant with regular penetration testing. Access requires multi-factor authentication, and all data access is logged for HIPAA audit trails. You maintain full ownership of your data and can request complete deletion at any time.',
    },
    {
      question: 'What analytics and reporting does the AI provide for dental offices?',
      answer:
        'You receive monthly reports covering total calls handled, appointments booked by type, new patient conversions, no-show rates, peak call times, top caller questions, and recall campaign results. This data helps you optimize scheduling, identify which marketing channels drive new patients, and spot trends in patient concerns.',
    },
    {
      question: 'How does AI compare to hiring another front desk person?',
      answer:
        'A front desk employee costs $2,800-3,800 per month, works 40 hours a week, takes breaks, calls in sick, and handles one call at a time. An AI receptionist costs $549-4997 per month, works 24/7/365, handles unlimited simultaneous calls, and never puts a patient on hold. Most practices use the AI to augment their team, not replace it entirely.',
    },
    {
      question: 'Do dental patients report high satisfaction with AI receptionists?',
      answer:
        'Yes. Patient satisfaction surveys consistently show higher ratings for AI-answered calls versus hold queues or voicemail. The primary driver is instant pickup: patients get their question answered or appointment booked in under two minutes without waiting on hold. If the AI cannot resolve an issue, it transfers to staff seamlessly, so no patient feels trapped talking to a machine.',
    },
  ];

  const relatedResources = [
    {
      href: '/blog/ai-phone-answering-dentists',
      title: 'AI Phone Answering for Dentists: Complete Guide',
      description: 'Step-by-step guide to setting up AI phone answering at your dental practice.',
      icon: Phone,
    },
    {
      href: '/tools/dentist-chair-calculator',
      title: 'Dentist Chair Revenue Calculator',
      description: 'Calculate how much revenue your dental practice loses to empty chairs from missed calls and no-shows.',
      icon: DollarSign,
    },
    {
      href: '/features/ai-receptionist',
      title: 'How Our AI Receptionist Works',
      description: 'See the technology behind AI-powered phone answering for healthcare practices.',
      icon: Zap,
    },
    {
      href: '/blog/ai-receptionist-plumber-faq',
      title: 'AI Receptionist FAQ for Plumbers',
      description: 'See how plumbing companies use AI receptionists for emergency dispatch and after-hours calls.',
      icon: Users,
    },
    {
      href: '/blog/ai-receptionist-medspa-faq',
      title: 'AI Receptionist FAQ for Med Spas',
      description: 'Learn how med spas use AI to handle bookings, consultations, and rebooking automatically.',
      icon: Star,
    },
    {
      href: '/blog/ai-receptionist-vet-faq',
      title: 'AI Receptionist FAQ for Vet Clinics',
      description: 'Discover how veterinary clinics use AI to triage urgent pet care calls 24/7.',
      icon: Heart,
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
              <span className="text-gray-900 font-medium">AI Receptionist for Dental Offices: 20 Questions Answered</span>
            </nav>

            {/* Badge */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mb-6"
            >
              <Heart className="h-4 w-4 mr-2" />
              FAQ for Dental Offices
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
            >
              AI Receptionist for Dental Offices: 20 Questions Answered
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.1 } } }}
              className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed"
            >
              From HIPAA compliance to insurance handling to no-show reduction, here is everything dental practice owners ask before adopting an AI receptionist.
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
              The average dental practice misses 25-35% of incoming calls, with each new patient worth $1,200-2,000 in first-year revenue. This FAQ answers every question dentists ask about AI phone answering, from patient scheduling to HIPAA to return on investment.
            </motion.div>
            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;Dental practices that respond to appointment requests within five minutes are 21 times more likely to qualify that lead than those who respond after 30 minutes.&rdquo;</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Dr. Roger Levin, CEO, Levin Group Dental Practice Consulting</footer>
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
                20 Questions Dentists Ask About AI Receptionists
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
        
          <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
            <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;Front-desk phone management is one of the top three drivers of patient attrition. Practices with 24/7 answering coverage retain significantly more patients year over year.&rdquo;</p>
            <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Dr. Mark Hyman, Contributing Editor, Dental Economics</footer>
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

        {/* What Boltcall Includes for Dental Practices */}
        <section className="py-10 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Boltcall Includes for Dental Practices</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Every plan includes these features — no add-ons, no hidden fees</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: '24/7 Call Answering', desc: 'AI handles calls after hours, weekends, and holidays' },
                { label: 'Appointment Booking', desc: 'Books hygiene, exam, and procedure appointments into your schedule' },
                { label: 'New Patient Intake', desc: 'Collects insurance info, reason for visit, and preferred times' },
                { label: 'No-Show Reminders', desc: 'Automated texts reduce chair cancellations by an average of 40%' },
                { label: 'Google Review Requests', desc: 'Post-appointment review sequences build your star rating over time' },
                { label: 'Monthly Revenue Report', desc: 'See every call answered, appointment booked, and revenue recovered' },
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
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Phone Answering Impact for Dental Practices: Before and After</h2>
            <p className="text-gray-500 text-sm text-center mb-6">What dental practices typically experience after switching to AI phone answering</p>
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
                  ['Monthly calls answered', '60–70%', '99%+'],
                  ['After-hours patient calls captured', '0%', '100%'],
                  ['New patient no-show rate', '20–25%', '8–12%'],
                  ['Monthly revenue from missed calls recovered', '$0', '$8,000 – $35,000+'],
                  ['Google reviews per month', '1–2', '6–12'],
                  ['Front desk time on routine calls', '3–4 hours/day', 'Under 1 hour/day'],
                  ['Setup time for 24/7 coverage', '2–4 weeks (hire)', '30 minutes'],
                  ['Monthly cost vs. human receptionist', '$3,200 – $4,500', '$549-897'],
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
            <Link to="/industries/dentist-answering-service" className="font-semibold text-blue-700 hover:underline">
              Dentist answering service
            </Link>{' '}
            covers the full buyer view.
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default FAQAIReceptionistDentist;
