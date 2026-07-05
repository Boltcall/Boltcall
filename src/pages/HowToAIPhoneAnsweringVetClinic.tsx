// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Phone, Clock, Calendar, MessageSquare, Star, Shield, Zap, CheckCircle, ChevronRight, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import FinalCTA, { HOW_TO_CTA } from '../components/FinalCTA';
import TableOfContents from '../components/TableOfContents';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const headings = [
  { id: 'step-1', text: 'Step 1: Audit Your Current Call Volume', level: 2 },
  { id: 'step-2', text: 'Step 2: Choose an AI Phone Answering Provider', level: 2 },
  { id: 'step-3', text: "Step 3: Set Up Your Clinic's Knowledge Base", level: 2 },
  { id: 'step-4', text: 'Step 4: Configure Appointment Booking Rules', level: 2 },
  { id: 'step-5', text: 'Step 5: Set Up Automated Appointment Reminders', level: 2 },
  { id: 'step-6', text: 'Step 6: Activate After-Hours and Emergency Call Routing', level: 2 },
  { id: 'step-7', text: 'Step 7: Go Live and Monitor Performance', level: 2 },
  { id: 'results', text: 'What Results to Expect', level: 2 },
  { id: 'related-resources', text: 'Related Resources', level: 2 },
  { id: 'faq', text: 'Frequently Asked Questions', level: 2 },
];

const HowToAIPhoneAnsweringVetClinic: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'How to Set Up AI Phone Answering for Your Vet Clinic | Boltcall';
    updateMetaDescription(
      "Step-by-step guide to setting up AI phone answering for veterinary clinics. Reduce missed calls, cut no-shows, and book more appointments automatically."
    );

    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "How to Set Up AI Phone Answering for Your Vet Clinic",
        "description": "Step-by-step guide to setting up AI phone answering for veterinary clinics. Reduce missed calls, cut no-shows, and book more appointments automatically.",
        "author": { "@type": "Organization", "name": "Boltcall" },
        "datePublished": "2026-03-31",
        "dateModified": "2026-03-31",
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.png",
        "width": 1200,
        "height": 630
      },
        "publisher": {
          "@type": "Organization",
          "name": "Boltcall",
          "logo": { "@type": "ImageObject", "url": "https://boltcall.org/logo.png" }
        },
        "url": "https://boltcall.org/blog/how-to-set-up-ai-phone-answering-vet-clinic",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://boltcall.org/blog/how-to-set-up-ai-phone-answering-vet-clinic"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
          { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog" },
          { "@type": "ListItem", "position": 3, "name": "How to Set Up AI Phone Answering for Vet Clinics", "item": "https://boltcall.org/blog/how-to-set-up-ai-phone-answering-vet-clinic" }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How to Set Up AI Phone Answering for Your Vet Clinic",
        "description": "A complete 7-step guide to setting up AI-powered phone answering at your veterinary practice.",
        "totalTime": "PT10M",
        "step": [
          {
            "@type": "HowToStep",
            "position": 1,
            "name": "Audit Your Current Call Volume and Missed Call Rate",
            "text": "Review your phone system's call logs for the past 30 days to identify exactly how many calls your clinic misses, when they happen, and how much revenue you're losing."
          },
          {
            "@type": "HowToStep",
            "position": 2,
            "name": "Choose an AI Phone Answering Provider Built for Local Businesses",
            "text": "Select an AI receptionist platform designed specifically for local service businesses rather than generic call center software. Look for 24/7 availability, appointment booking, and customizable greetings."
          },
          {
            "@type": "HowToStep",
            "position": 3,
            "name": "Set Up Your Clinic's Knowledge Base",
            "text": "Configure the AI with your clinic's specific information including services, hours, pricing ranges, vaccination schedules, emergency procedures, and common caller questions."
          },
          {
            "@type": "HowToStep",
            "position": 4,
            "name": "Configure Appointment Booking Rules",
            "text": "Connect your AI receptionist to your scheduling system and define the appointment types callers can book, including wellness exams, sick visits, surgery consults, and species-specific time slots."
          },
          {
            "@type": "HowToStep",
            "position": 5,
            "name": "Set Up Automated Appointment Reminders",
            "text": "Enable automated text message reminders sent 48 hours and 2 hours before appointments to dramatically reduce your no-show rate by 30-50%."
          },
          {
            "@type": "HowToStep",
            "position": 6,
            "name": "Activate After-Hours and Emergency Call Routing",
            "text": "Configure your AI to handle calls outside business hours by triaging emergencies from routine inquiries, routing true emergencies to the on-call vet, and capturing routine messages for next-day follow-up."
          },
          {
            "@type": "HowToStep",
            "position": 7,
            "name": "Go Live and Monitor Performance",
            "text": "Launch your AI receptionist alongside your existing staff for one week to validate accuracy, then monitor call logs, booking accuracy, and adjust the knowledge base based on real calls."
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How much does AI phone answering cost for a vet clinic?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "AI phone answering for veterinary clinics typically costs between $549 and $4997 per month depending on features and call volume. Most clinics find it pays for itself within the first month — recovering just 1-2 missed new client appointments covers the entire monthly cost, since the average new veterinary client is worth $1,500-2,500 in lifetime value."
            }
          },
          {
            "@type": "Question",
            "name": "Can AI handle emergency calls from pet owners?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Modern AI phone systems can triage emergency calls by asking key questions about the pet's symptoms and urgency level. True emergencies are immediately routed to the on-call veterinarian, while routine inquiries are captured as messages for next-day follow-up. The AI never attempts to provide medical advice — it focuses on fast, accurate routing."
            }
          },
          {
            "@type": "Question",
            "name": "Will pet owners know they're talking to AI?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Most callers cannot tell they are speaking with AI. Modern AI receptionists use natural-sounding voices, understand conversational speech, and handle interruptions gracefully. If a caller requests a human or the AI detects a complex situation, it can seamlessly transfer to a staff member. Many clinics find callers prefer the instant pickup over waiting on hold."
            }
          },
          {
            "@type": "Question",
            "name": "Does AI phone answering work with veterinary practice management software?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Most AI phone answering platforms integrate with popular veterinary practice management systems including Cornerstone, AVImark, eVetPractice, and cloud-based platforms like Shepherd and Digitail. Integration allows the AI to check availability, book appointments directly into your calendar, and access patient records for context during calls."
            }
          },
          {
            "@type": "Question",
            "name": "How long does it take to set up AI phone answering?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Basic setup takes under 10 minutes — you provide your clinic name, hours, and phone number, and the AI can start answering calls immediately. Full customization including knowledge base configuration, appointment types, emergency routing rules, and staff preferences typically takes 1-2 hours. Most clinics are fully operational within a single afternoon."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI book appointments directly into my calendar?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. AI phone answering systems connect to your practice management software or calendar system to book appointments in real time. The AI checks available slots, respects buffer times between appointments, handles species-specific scheduling rules, and sends confirmation texts to pet owners — all without any staff involvement."
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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Phone Answering for Vet Clinics", "item": "https://boltcall.org/blog/how-to-set-up-ai-phone-answering-vet-clinic"}]});
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

  const steps = [
    {
      number: 1,
      title: 'Audit Your Current Call Volume and Missed Call Rate',
      icon: Phone,
      content: (
        <p className="text-gray-700 text-base leading-relaxed">
          The first step is to review your phone system's call logs for the past 30 days to identify exactly how many calls your clinic misses. Log into your phone provider's dashboard or request a call report and look for three things: total inbound calls, calls that went to voicemail or were abandoned, and the specific times those missed calls occurred. Most veterinary clinics discover they miss 20-30% of incoming calls, with the highest concentration during lunch breaks (12-1pm), early mornings when staff are prepping for surgery, and after 5pm when concerned pet owners call after noticing symptoms. Calculate the revenue impact by multiplying missed calls by your new-client conversion rate (typically 60-70%) and your average new client lifetime value of $1,500-2,500. This number becomes your baseline for measuring the AI's ROI after deployment.
        </p>
      ),
    },
    {
      number: 2,
      title: 'Choose an AI Phone Answering Provider Built for Local Businesses',
      icon: Shield,
      content: (
        <p className="text-gray-700 text-base leading-relaxed">
          Select an AI receptionist platform designed specifically for local service businesses rather than generic call center software. The right provider should offer 24/7 call answering with no per-minute charges, real-time appointment booking integrated with your calendar, and customizable greetings that match your clinic's tone. Prioritize platforms that support veterinary-specific terminology — the AI needs to understand words like "spay," "neuter," "vaccination booster," and breed names without confusion. Check for HIPAA-adjacent privacy features since you will be handling pet owner contact information and medical context. Avoid providers that charge per call or per minute, as veterinary clinics can receive 40-80 calls per day and per-call pricing becomes expensive fast. Request a free trial or demo call so you can hear the AI in action before committing to any platform.
        </p>
      ),
    },
    {
      number: 3,
      title: "Set Up Your Clinic's Knowledge Base",
      icon: MessageSquare,
      content: (
        <p className="text-gray-700 text-base leading-relaxed">
          Configure the AI with your clinic's specific information so it can answer caller questions accurately. Start with the essentials: your full address and parking instructions, business hours for each day of the week, services offered (wellness exams, dental cleanings, surgery, boarding, grooming), and the species you treat (dogs, cats, exotics, equine). Add pricing ranges for your most-requested services — callers frequently ask "how much does a puppy vaccination cost?" and the AI should give a confident ballpark rather than deflecting. Upload your common Q&A list including vaccination schedules, pre-surgery fasting instructions, flea and tick prevention recommendations, and emergency after-hours procedures. The more specific your knowledge base, the fewer calls the AI needs to transfer to staff. Most clinics find that 80% of incoming calls ask the same 15-20 questions, making this step the highest-leverage part of the setup.
        </p>
      ),
    },
    {
      number: 4,
      title: 'Configure Appointment Booking Rules',
      icon: Calendar,
      content: (
        <p className="text-gray-700 text-base leading-relaxed">
          Connect your AI receptionist to your scheduling system and define the appointment types callers can book. Set up distinct appointment categories with appropriate durations: wellness exams (30 minutes), sick visits (20 minutes), vaccination-only appointments (15 minutes), surgery consults (45 minutes), and dental cleanings (60 minutes). Configure species-specific slots if your clinic separates cat and dog appointment blocks to reduce stress in the waiting room. Set buffer times between appointments — most vets need 5-10 minutes for notes and room turnover. Define booking rules such as "no new patient appointments in the last slot of the day" or "surgery consults only on Tuesdays and Thursdays." The AI will enforce these rules automatically, preventing the double-bookings and scheduling conflicts that plague clinics relying on front-desk staff juggling phones while checking in patients.
        </p>
      ),
    },
    {
      number: 5,
      title: 'Set Up Automated Appointment Reminders',
      icon: Clock,
      content: (
        <p className="text-gray-700 text-base leading-relaxed">
          Enable automated text message reminders to dramatically reduce your no-show rate. Configure two reminder touchpoints: a confirmation text 48 hours before the appointment that includes the date, time, vet name, and a one-tap reschedule link, and a final reminder 2 hours before with directions to your clinic and any prep instructions (like fasting for bloodwork). Studies show veterinary clinics that implement automated reminders see a 30-50% reduction in no-shows, which translates directly to recovered revenue since every empty appointment slot costs the average clinic $150-300 in lost production. Include a simple reply option — pet owners should be able to text "C" to confirm or "R" to reschedule without calling. If someone reschedules, the freed slot automatically opens up for other callers, keeping your schedule full. This single feature often pays for the entire AI phone system within the first two weeks.
        </p>
      ),
    },
    {
      number: 6,
      title: 'Activate After-Hours and Emergency Call Routing',
      icon: Zap,
      content: (
        <p className="text-gray-700 text-base leading-relaxed">
          Configure your AI to handle calls outside business hours by triaging emergencies and capturing routine inquiries for next-day follow-up. Set up a decision tree where the AI asks callers to describe their situation, then classifies calls into three categories: true emergencies (difficulty breathing, seizures, poisoning, trauma), urgent but non-emergency (vomiting, limping, eye discharge), and routine inquiries (scheduling, prescription refills, pricing questions). True emergencies should trigger an immediate transfer to your on-call veterinarian's cell phone with a text alert containing the caller's name, pet details, and symptoms. Urgent calls receive guidance on monitoring the pet overnight plus a priority morning callback. Routine inquiries are captured as detailed messages with caller information and the AI schedules a next-day callback automatically. This after-hours coverage is where many clinics see the largest impact — 35% of calls to veterinary practices come outside business hours, and without AI, every one of those goes to voicemail.
        </p>
      ),
    },
    {
      number: 7,
      title: 'Go Live and Monitor Performance',
      icon: Star,
      content: (
        <p className="text-gray-700 text-base leading-relaxed">
          Launch your AI receptionist alongside your existing staff for one week to validate accuracy before fully deploying. During this parallel-run period, have your front desk listen to how the AI handles calls and flag any responses that need correction — common early adjustments include pronunciation of specific breed names, handling of multi-pet households, and responses to pricing questions that need tighter ranges. Review the AI's call logs daily during the first week, checking booking accuracy, caller satisfaction signals, and any calls that were escalated to staff. Adjust your knowledge base based on real call patterns — you will discover questions you did not anticipate. After the validation week, most clinics report 95%+ accuracy on routine calls. In the first full month, expect to see 85% of calls answered on the first ring, a measurable drop in no-shows, and 15-25 new client appointments that would have previously been missed calls.
        </p>
      ),
    },
  ];

  const faqs = [
    {
      question: 'How much does AI phone answering cost for a vet clinic?',
      answer:
        'AI phone answering for veterinary clinics typically costs between $549 and $4997 per month depending on features and call volume. Most clinics find it pays for itself within the first month — recovering just 1-2 missed new client appointments covers the entire monthly cost, since the average new veterinary client is worth $1,500-2,500 in lifetime value.',
    },
    {
      question: 'Can AI handle emergency calls from pet owners?',
      answer:
        'Yes. Modern AI phone systems triage emergency calls by asking key questions about symptoms and urgency. True emergencies are immediately routed to the on-call veterinarian, while routine inquiries are captured as messages for next-day follow-up. The AI never provides medical advice — it focuses on fast, accurate routing to the right person.',
    },
    {
      question: "Will pet owners know they're talking to AI?",
      answer:
        'Most callers cannot tell they are speaking with AI. Modern AI receptionists use natural-sounding voices, understand conversational speech, and handle interruptions gracefully. If a caller requests a human or the situation is complex, the AI seamlessly transfers to staff. Many clinics find callers prefer the instant answer over waiting on hold.',
    },
    {
      question: 'Does AI phone answering work with veterinary practice management software?',
      answer:
        'Most AI platforms integrate with popular veterinary systems including Cornerstone, AVImark, eVetPractice, and cloud-based tools like Shepherd and Digitail. Integration enables real-time appointment booking, availability checking, and access to patient context during calls — no manual data entry required.',
    },
    {
      question: 'How long does it take to set up AI phone answering?',
      answer:
        'Basic setup takes under 10 minutes — provide your clinic name, hours, and phone number, and the AI starts answering immediately. Full customization with knowledge base, appointment types, emergency routing, and staff preferences typically takes 1-2 hours. Most clinics are fully operational within a single afternoon.',
    },
    {
      question: 'Can the AI book appointments directly into my calendar?',
      answer:
        'Yes. AI phone systems connect to your practice management software or calendar to book appointments in real time. The AI checks available slots, respects buffer times, handles species-specific scheduling rules, and sends confirmation texts to pet owners — all without staff involvement.',
    },
  ];

  const metrics = [
    { value: '85%', label: 'of calls answered on first ring' },
    { value: '30-50%', label: 'reduction in no-shows' },
    { value: '15-25', label: 'more new clients per month' },
    { value: '$3,000-8,000', label: 'monthly revenue recovered' },
  ];

  const relatedResources = [
    {
      href: '/tools/vet-clinic-revenue-calculator',
      title: "Calculate Your Clinic's Revenue Leak",
      description: 'See exactly how much revenue your vet clinic loses to missed calls each month.',
      icon: Phone,
    },
    {
      href: '/features/ai-receptionist',
      title: 'How Our AI Receptionist Works',
      description: 'A detailed look at the technology behind AI-powered phone answering.',
      icon: Zap,
    },
    {
      href: '/features/automated-reminders',
      title: 'Automated Appointment Reminders',
      description: 'Reduce no-shows by 30-50% with smart text message reminders.',
      icon: Clock,
    },
    {
      href: '/pricing',
      title: 'See Pricing Plans',
      description: 'Transparent pricing for every clinic size — no per-call fees, no surprises.',
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
              <span className="text-gray-900 font-medium">How to Set Up AI Phone Answering for Your Vet Clinic</span>
            </nav>

            {/* Badge */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mb-6"
            >
              <Phone className="h-4 w-4 mr-2" />
              Guide for Veterinary Clinics
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
            >
              How to Set Up AI Phone Answering for Your Vet Clinic
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.1 } } }}
              className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed"
            >
              A step-by-step guide to never missing a pet owner's call again — reduce no-shows by up to 40% and capture every new client inquiry automatically.
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
              <span>8 min read</span>
            </motion.div>

            {/* Info box */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.3 } } }}
              className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-blue-800 text-sm leading-relaxed"
            >
              This guide covers the complete setup process for AI-powered phone answering at veterinary practices, from choosing a provider to going live in under 10 minutes.
            </motion.div>
            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;Phone systems in veterinary medicine are often the weakest link in the client experience chain. A missed call during an emergency can end a client relationship permanently.&rdquo;</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Dr. Ernie Ward, Veterinary Futurist &amp; Founder, Association for Pet Obesity Prevention</footer>
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
              <p className="text-gray-700 text-base leading-relaxed">
                Veterinary clinics face a unique phone problem that most businesses do not: pet owners call during emergencies. A dog that swallowed a sock, a cat that stopped eating, a puppy having its first seizure — these callers are anxious, emotional, and will not leave a voicemail. If your front desk does not pick up within a few rings, that pet owner hangs up and calls the next clinic on Google. The problem compounds because your receptionist is simultaneously checking in patients, processing payments, and calming nervous animals in the lobby. Industry data shows the average veterinary clinic misses 20-30% of incoming calls, with each new client representing $1,500-2,500 in lifetime value across annual wellness exams, vaccinations, dental work, and emergency visits. That means a clinic missing just 5 new client calls per week is leaking $7,500-12,500 in potential lifetime revenue every single week. AI phone answering solves this by picking up every call instantly, 24 hours a day, and either booking the appointment or routing the emergency — before the caller ever considers another clinic.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-12">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.number}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-50px' }}
                    variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: index * 0.05 } } }}
                    className="relative"
                  >
                    <div className="border-l-4 border-blue-500 pl-6 md:pl-8">
                      {/* Step number + title */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold">
                          {step.number}
                        </div>
                        <div className="flex-1">
                          <h2 id={`step-${step.number}`} className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                            Step {step.number}: {step.title}
                          </h2>
                        </div>
                      </div>
                      {/* Content */}
                      <div className="ml-14">{step.content}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* What Results to Expect */}
        <section className="py-16 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <h2 id="results" className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
                What Results to Expect
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.map((metric, index) => (
                  <motion.div
                    key={index}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.4, delay: index * 0.1 } } }}
                    className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 text-center"
                  >
                    <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-2">{metric.value}</div>
                    <div className="text-sm text-gray-600 leading-snug">{metric.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pros & Cons */}
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 id="pros-cons" className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of AI Phone Answering for Vet Clinics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Captures 35% of calls that come after hours — when anxious pet owners won't leave voicemail</li>
                  <li>• Triages emergencies (seizures, poisoning, trauma) and routes directly to the on-call vet</li>
                  <li>• Automated reminders cut no-shows by 30–50%, recovering $150–300 per empty slot</li>
                  <li>• Handles unlimited simultaneous calls during high-demand periods like post-holiday rush</li>
                  <li>• Integrates with Cornerstone, AVImark, eVetPractice, Shepherd, and Digitail</li>
                  <li>• Pays for itself within the first month — one recovered new client covers months of cost</li>
                </ul>
              </div>
              <div className="bg-red-50 rounded-xl p-6">
                <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Emergency triage rules must be thoroughly tested — misconfigured routing during a true emergency carries real risk</li>
                  <li>• Breed names, exotic species, and uncommon conditions may need manual knowledge-base additions</li>
                  <li>• Distraught pet owners in a crisis may become frustrated before reaching a human vet</li>
                  <li>• Multi-pet household scheduling (different species, different rules) requires careful configuration</li>
                  <li>• AI cannot assess clinical urgency with the nuance an experienced vet tech can</li>
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
        
          <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
            <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;Practices that implement AI-assisted call management report a 20&ndash;35% reduction in front-desk workload within 90 days &mdash; freeing staff to focus on in-clinic patient care.&rdquo;</p>
            <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Wendy Myers, CVJ, Founder, Communication Solutions for Veterinarians</footer>
          </blockquote></section>

        {/* FAQ Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <h2 id="faq" className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
                Frequently Asked Questions
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

        {/* CTA */}
        <FinalCTA {...HOW_TO_CTA} />
        </main>
        <div className="hidden lg:block w-64 flex-shrink-0 pt-32">
          <TableOfContents headings={headings} />
        </div>
      </div>


      {/* Use Cases */}
      <section className="py-14 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Real-World Use Cases</h2>
          <div className="space-y-6">
            {[
              { title: "Veterinary Clinic — After-Hours Triage", story: "A 2-vet clinic deployed an AI receptionist to handle after-hours calls. The AI screens for emergencies (routes to on-call vet), schedules next-day appointments, and captures callback details for non-urgent calls. Front desk time freed: 2 hours per day." },
              { title: "Boarding Inquiries During Peak Season", story: "During summer boarding season, a veterinary practice received 5x normal call volume. AI answered 100% of calls, provided pricing and availability, and captured $28,000 in boarding reservations — while the staff focused on in-clinic care." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{item.story}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What This Includes */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What AI Phone Answering Includes for Vet Clinics</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Complete system for veterinary practices — every Boltcall plan includes:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: '24/7 Emergency Call Answering', desc: 'Captures every after-hours urgent call for sick or injured pets' },
            { label: 'Appointment Booking', desc: 'Books wellness exams, vaccines, and procedures into your calendar' },
            { label: 'New Client Intake', desc: 'Collects pet name, species, breed, and reason for visit automatically' },
            { label: 'Recall Reminders', desc: 'Automated reminders for annual exams and vaccine boosters' },
            { label: 'Triage Script', desc: 'Guides callers through basic emergency triage before connecting on-call staff' },
            { label: 'Monthly Revenue Report', desc: 'See calls answered, appointments booked, and revenue recovered' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vet Clinic AI Phone Answering Benchmark Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Vet Clinic AI Phone Answering: Before and After</h2>
          <p className="text-gray-500 text-sm text-center mb-6">What veterinary clinics typically experience after implementing AI phone answering</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Before AI Answering</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">After Boltcall</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Call answer rate', '63–73%', '99%+'],
                  ['After-hours emergency calls answered', '0%', '100%'],
                  ['Annual wellness recall compliance', '48%', '65%+ (automated)'],
                  ['Appointment no-show rate', '15–20%', '7–10%'],
                  ['Staff time on routine call handling', '2–3 hours/day', 'Under 45 min/day'],
                  ['Monthly revenue from missed calls recovered', '$0', '$3,000 – $8,500+'],
                  ['Monthly Google review growth', '1–2 reviews/mo', '5–9 reviews/mo'],
                  ['Monthly cost vs. front desk hire', '$3,200 – $4,200/mo', '$79 – $897/mo'],
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

export default HowToAIPhoneAnsweringVetClinic;
