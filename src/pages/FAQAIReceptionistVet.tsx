// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Heart, Phone, Clock, Calendar, Shield, ChevronRight, ArrowRight, Star, Users, AlertTriangle, MessageSquare, BarChart3, Bell, Stethoscope } from 'lucide-react';
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
  { id: 'faq-section', text: '20 Questions About AI Receptionists for Veterinary Clinics', level: 2 },
  { id: 'related-resources', text: 'Related Resources', level: 2 },
];

const faqs = [
  {
    question: 'How much does an AI receptionist cost for a veterinary clinic?',
    answer: 'AI receptionists for veterinary clinics typically cost between $549 and $4997 per month with flat-rate pricing and no per-call fees. Compare that to a full-time veterinary receptionist at $30,000-$40,000 per year or a veterinary answering service at $200-$600 per month with limited hours and capabilities. Most clinics recover the cost within the first week by capturing just 1-2 new client appointments that would have gone to voicemail. The average new veterinary client is worth $1,500-$2,500 in lifetime value across annual wellness exams, vaccinations, dental work, and emergency visits.',
  },
  {
    question: 'How long does it take to set up an AI receptionist for a vet clinic?',
    answer: 'Basic setup takes under 10 minutes. You provide your clinic name, services, hours, and phone number, and the AI starts answering calls immediately. Full customization including species-specific appointment types, emergency triage logic, pre-visit instructions, and practice management software integration typically takes 1-2 hours. You can configure the AI to handle the specific questions pet owners ask, from vaccination schedules to boarding policies. Most clinics are fully operational within a single afternoon with zero disruption to patient care.',
  },
  {
    question: 'How does the AI triage emergency calls versus routine inquiries?',
    answer: 'The AI uses a structured triage decision tree to classify calls into three categories. True emergencies (difficulty breathing, seizures, poisoning, bleeding, hit by car, inability to urinate) trigger an immediate transfer to the on-call veterinarian with a text alert containing the pet\'s symptoms and owner contact information. Urgent but non-emergency situations (vomiting, limping, eye discharge, not eating for 24+ hours) receive guidance on monitoring the pet overnight plus a priority morning callback. Routine inquiries (scheduling, prescription refills, pricing questions) are handled normally. The AI never provides medical advice or diagnoses. Its role is to quickly identify the severity and route the call to the right response level.',
  },
  {
    question: 'Can the AI book appointments by type, such as wellness exams, sick visits, and surgeries?',
    answer: 'Yes. The AI is configured with your full list of appointment types and books each one with the correct duration, provider, and scheduling rules. Wellness exams might be 30 minutes, sick visits 20 minutes, vaccination-only appointments 15 minutes, surgery consults 45 minutes, and dental cleanings 60 minutes. You can separate appointment types by species (cat-only blocks, exotic animal hours), restrict surgery consults to specific days, and prevent new patient appointments in the last slot of the day. The AI enforces all of these rules automatically, preventing the double-bookings and scheduling conflicts that plague busy front desks.',
  },
  {
    question: 'How does the AI handle anxious pet owners calling about sick pets?',
    answer: 'The AI is trained to respond with empathy and calm professionalism. When a caller is distressed about a sick or injured pet, the AI acknowledges their concern, asks clear and focused triage questions to assess urgency, and takes immediate action. For emergencies, it transfers to the on-call vet within seconds. For non-emergencies, it provides reassurance, explains what to monitor, and books the earliest available appointment. The AI\'s consistent, calm tone is often more effective than a stressed front desk receptionist who is simultaneously checking in patients, answering other lines, and calming animals in the lobby. Pet owners frequently comment that the AI made them feel heard and acted on immediately.',
  },
  {
    question: 'Can the AI handle after-hours calls and route emergencies to the on-call vet?',
    answer: 'Yes, and this is one of the highest-impact features for veterinary clinics. After-hours calls account for 30-35% of all calls to vet clinics, and pet emergencies do not wait for business hours. The AI answers every after-hours call instantly, runs the triage protocol, and routes true emergencies directly to the on-call veterinarian\'s phone. Non-emergency after-hours callers are offered the earliest morning appointment or directed to your preferred emergency hospital if the situation is beyond routine care. All after-hours calls are logged with complete details for morning review. Without AI, these calls go to voicemail, and panicked pet owners either drive to an emergency hospital or call every clinic until someone picks up.',
  },
  {
    question: 'Does the AI integrate with veterinary practice management software?',
    answer: 'Yes. AI receptionists integrate with popular veterinary practice management systems including Cornerstone, AVImark, eVetPractice, Shepherd, Digitail, and cloud-based platforms like Covetrus Pulse. Integration enables real-time appointment booking into your calendar, availability checking before confirming slots, and access to basic patient context during calls. For systems not directly supported, the AI delivers appointment and intake data via email, SMS, or webhook, which connects to any platform through Zapier or n8n. This eliminates the manual data entry that consumes hours of front desk time every day.',
  },
  {
    question: 'How does the AI reduce no-shows for veterinary appointments?',
    answer: 'The AI sends automated text message reminders at two intervals: 48 hours before the appointment (with a one-tap confirm or reschedule option) and 2 hours before (with directions and any prep instructions like fasting for bloodwork). Clinics that implement automated reminders see a 30-50% reduction in no-shows. When a client reschedules, the freed slot immediately opens for other callers to book. The AI can also send a post-appointment reminder for follow-up visits and vaccination boosters. Each no-show costs the average veterinary clinic $150-$300 in lost production, so reducing no-shows by even 30% recovers thousands of dollars per month.',
  },
  {
    question: 'Can the AI handle prescription refill requests?',
    answer: 'Yes. The AI can capture prescription refill requests including the pet name, owner name, medication name, dosage, and pharmacy preference. This information is packaged into a structured message and delivered to the veterinarian for approval. The AI does not authorize refills itself. Once approved by the vet, the AI can send a text notification to the pet owner confirming the refill is ready for pickup or has been sent to their pharmacy. This process removes one of the highest-volume call types from the front desk, freeing staff to focus on in-clinic patients.',
  },
  {
    question: 'How does the AI handle new client registration?',
    answer: 'The AI collects all new client information during the first call: owner name, address, phone number, email, pet name, species, breed, age, weight, vaccination history (if known), and reason for the visit. This data is compiled into a structured new client form and delivered to the clinic before the appointment. Some integrations allow direct creation of the client record in the practice management system. New clients receive a confirmation text with their appointment details, directions, and a request to arrive 10 minutes early. This pre-registration saves 10-15 minutes of front desk time per new client and eliminates the paper clipboard process that slows down check-in.',
  },
  {
    question: 'Can the AI schedule boarding and grooming appointments?',
    answer: 'Yes. The AI handles boarding and grooming scheduling with the same precision as medical appointments. For boarding, it collects drop-off and pickup dates, confirms vaccination requirements are met (or schedules a vaccination appointment before the boarding date), asks about special dietary needs and medications, and checks availability. For grooming, it captures the breed, desired services (bath, haircut, nail trim, de-shed), and preferred groomer. Each service type has its own duration rules and capacity limits. The AI prevents overbooking of kennel space and grooming slots automatically.',
  },
  {
    question: 'Can the AI receptionist communicate in multiple languages?',
    answer: 'Yes. Modern AI receptionists support multilingual call handling. The AI can detect the caller\'s preferred language within the first few seconds and switch automatically, or offer a language selection at the start. Spanish is the most commonly configured second language for U.S. veterinary clinics, but the technology supports dozens of languages. This is especially valuable in diverse metropolitan areas where language barriers can prevent pet owners from accessing veterinary care for their animals.',
  },
  {
    question: 'Can the AI transfer calls to a specific veterinarian?',
    answer: 'Yes. The AI can warm-transfer calls to any veterinarian or staff member based on the nature of the inquiry. A pet owner calling about a post-surgical concern is transferred to the surgeon who performed the procedure. A caller requesting a specific vet by name is transferred directly. Before the transfer, the AI provides a whisper briefing with the caller\'s name, pet details, and reason for calling. If the target veterinarian is unavailable or in surgery, the AI takes a detailed message and schedules a callback at the next available time. This ensures vets are not interrupted during procedures for calls that can wait.',
  },
  {
    question: 'Can the AI manage multiple clinic locations?',
    answer: 'Yes. The AI can be configured for multi-location veterinary practices with separate knowledge bases, schedules, and routing rules for each location. A caller is asked which location they prefer or the AI routes based on the caller\'s zip code to the nearest clinic. Each location maintains its own appointment calendar, service offerings, and after-hours protocols. Calls can be transferred between locations when a specific service or specialist is only available at one site. Multi-location practices get consolidated reporting across all clinics plus location-specific analytics.',
  },
  {
    question: 'What is the ROI of an AI receptionist for a veterinary clinic?',
    answer: 'Veterinary clinics that deploy an AI receptionist typically recover 15-25 new client appointments per month from previously missed calls and after-hours inquiries. With each new client worth $1,500-$2,500 in lifetime value and 60-70% converting from call to appointment, the AI generates $13,500-$43,750 in lifetime patient value per month against a $549ג€“$4997 monthly investment. Additional ROI comes from 30-50% fewer no-shows (recovering $1,500-$4,500/month in lost production), reduced front desk overtime, and higher Google review ratings from consistent, professional phone handling. Most clinics see a 30:1 to 100:1 return on their AI receptionist investment.',
  },
  {
    question: 'How does an AI receptionist compare to hiring additional front desk staff?',
    answer: 'A full-time veterinary receptionist costs $30,000-$40,000 per year in salary plus benefits, training, and turnover costs. They cover one shift (typically 8-10 hours), take lunch breaks, call in sick, and can only handle one caller at a time. An AI receptionist costs $549ג€“$4997/month, works 24/7/365, handles unlimited simultaneous calls, never calls in sick, and performs consistently on every call. It also does not need to be trained when protocols change. The AI does not replace your front desk team. It handles overflow calls, after-hours coverage, and routine inquiries, freeing your staff to focus on in-clinic patient care where their expertise matters most.',
  },
  {
    question: 'Can the AI send automated vaccination and wellness reminders?',
    answer: 'Yes. The AI can send automated text and email reminders when pets are due for vaccinations, annual wellness exams, dental cleanings, heartworm tests, or other recurring services. Reminders are triggered based on the intervals you configure: rabies vaccination reminders at 11 months, DHPP boosters at 11 months, annual wellness reminders 30 days before the due date, and dental cleaning reminders at the veterinarian\'s recommended interval. Each reminder includes a direct link to book the appointment. Clinics that automate these reminders see a 20-35% increase in compliance rates, which directly translates to healthier patients and more consistent revenue.',
  },
  {
    question: 'Is the AI compliant with data security and privacy requirements for veterinary practices?',
    answer: 'Yes. AI receptionists use enterprise-grade security including AES-256 encryption at rest, TLS 1.3 encryption in transit, and SOC 2 Type II certified infrastructure. While veterinary practices are not subject to HIPAA (which applies to human healthcare), responsible data handling protects client trust and business reputation. Pet owner contact information, pet medical details, and call recordings are stored in isolated, encrypted environments with role-based access controls and configurable retention policies. No data is shared with third parties or used for AI model training. You maintain full control over what information is stored and for how long.',
  },
  {
    question: 'What analytics and reporting does an AI receptionist provide?',
    answer: 'AI receptionist platforms provide real-time and monthly dashboards covering total calls received, calls by appointment type (wellness, sick, surgery, boarding, grooming), peak call times by hour and day of week, after-hours call volume, new vs. returning client calls, emergency triage outcomes, no-show rates before and after AI deployment, and average call duration. These analytics help practice managers identify staffing gaps, optimize scheduling templates, and measure the impact of marketing campaigns on call volume. Reports export as PDF or CSV for team meetings and financial reviews.',
  },
  {
    question: 'What is the cancellation policy handling for the AI?',
    answer: 'The AI enforces your cancellation policy consistently on every call. When a client calls to cancel, the AI first attempts to reschedule to a more convenient time. If the client insists on canceling, the AI explains your policy (e.g., 24-hour notice required to avoid a cancellation fee) and processes the change. The freed appointment slot is immediately opened for other callers. If you maintain a waitlist for popular time slots, the AI automatically texts the next person on the waitlist about the opening. This automated backfill process means fewer empty slots on your schedule and more revenue recovered from every cancellation. The AI logs all cancellations with reasons, giving you data to identify patterns (e.g., Monday mornings have the highest cancellation rate).',
  },
];

const FAQAIReceptionistVet: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for Veterinary Clinics: 20 Questions Answered | Boltcall';
    updateMetaDescription(
      'Everything vet clinic owners need to know about AI receptionists — emergency triage, appointment booking, no-show reduction, and ROI.'
    );

    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "AI Receptionist for Veterinary Clinics: 20 Questions Answered",
        "description": "Everything vet clinic owners need to know about AI receptionists — emergency triage, appointment booking, no-show reduction, and ROI.",
        "author": { "@type": "Organization", "name": "Boltcall" },
        "datePublished": "2026-03-31",
        "dateModified": "2026-03-31",
        "publisher": {
          "@type": "Organization",
          "name": "Boltcall",
          "logo": { "@type": "ImageObject", "url": "https://boltcall.org/logo.png" }
        },
        "url": "https://boltcall.org/blog/ai-receptionist-vet-faq",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://boltcall.org/blog/ai-receptionist-vet-faq"
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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Receptionist FAQ: Vet Clinic", "item": "https://boltcall.org/blog/ai-receptionist-vet-faq"}]});
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
              <span className="text-gray-900 font-medium">AI Receptionist for Veterinary Clinics: 20 Questions Answered</span>
            </nav>

            {/* Badge */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mb-6"
            >
              <Heart className="h-4 w-4 mr-2" />
              FAQ for Veterinary Clinics
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
            >
              AI Receptionist for Veterinary Clinics: 20 Questions Answered
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.1 } } }}
              className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed"
            >
              Everything vet clinic owners need to know about AI receptionists: emergency triage, appointment booking, no-show reduction, practice management integration, and measurable ROI.
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
              An AI receptionist for veterinary clinics answers every call on the first ring, triages emergencies to the on-call vet, books species-specific appointments, sends automated reminders to reduce no-shows by 30-50%, and captures the 30-35% of calls that come after hours. It costs $549ג€“$4997/month versus $30,000-$40,000/year for a front desk hire.
            </motion.div>
            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;Veterinary practices that miss emergency calls after hours risk both patient outcomes and client loyalty. Reliable 24/7 phone answering is now a standard of care expectation.&rdquo;</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Dr. Gary Glassman, Veterinary Practice Consultant &amp; Speaker, Vet Metrics</footer>
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
                Veterinary clinics face a phone problem unlike any other business. Pet owners call during emergencies. A dog that ate chocolate, a cat that stopped eating, a puppy having its first seizure. These callers are anxious, emotional, and will not leave a voicemail. If your front desk does not answer within a few rings, that pet owner hangs up and calls the next clinic on Google.
              </p>
              <p className="text-gray-700 text-base leading-relaxed">
                The problem compounds because your receptionist is simultaneously checking in patients, processing payments, and calming nervous animals in the lobby. Industry data shows the average veterinary clinic misses 20-30% of incoming calls, with each new client representing $1,500-$2,500 in lifetime value. An AI receptionist solves this by picking up every call instantly, 24 hours a day, and either booking the appointment or routing the emergency before the caller considers another clinic. Below are the 20 most common questions vet clinic owners ask before deploying one.
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
                20 Questions About AI Receptionists for Veterinary Clinics
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
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of Using an AI Receptionist for Veterinary Clinics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-xl p-6">
                  <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>Answers every call instantly — no missed calls during busy lobby check-ins or multi-line rushes</li>
                    <li>Triages emergency calls 24/7 and routes life-threatening situations directly to the on-call vet</li>
                    <li>Books species-specific appointments with correct durations and scheduling rules automatically</li>
                    <li>Reduces no-shows by 30–50% through automated 48-hour and 2-hour SMS reminders</li>
                    <li>Handles prescription refill requests without interrupting front desk or clinical staff</li>
                    <li>Sends automated vaccination and wellness reminders, increasing compliance by 20–35%</li>
                    <li>Integrates with Cornerstone, AVImark, eVetPractice, and other practice management systems</li>
                    <li>Costs $549-4997/month vs. $30,000–$40,000/year for a full-time receptionist hire</li>
                  </ul>
                </div>
                <div className="bg-red-50 rounded-xl p-6">
                  <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>Requires initial setup (1–2 hours) to configure appointment types, triage logic, and species-specific rules</li>
                    <li>Cannot provide medical advice or diagnoses — complex clinical questions must go to a veterinarian</li>
                    <li>Triage decision tree must be carefully configured to avoid under- or over-escalating calls</li>
                    <li>Very distressed or emotional callers may still prefer to speak with a human team member</li>
                    <li>Practice management integrations may need technical configuration for older or niche systems</li>
                    <li>AI cannot assess pet behaviour or symptoms that require clinical judgement beyond structured triage questions</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        
          <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
            <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;Client communication is the number one area where veterinary practices lose revenue. When a pet owner cannot get through, they do not wait &mdash; they switch to a practice that answers.&rdquo;</p>
            <footer className="mt-3 text-sm font-semibold text-gray-600">&mdash; Wendy Myers, CVJ, Founder, Communication Solutions for Veterinarians</footer>
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
                  to="/tools/vet-clinic-revenue-calculator"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Heart className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Vet Clinic Revenue Calculator
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">See exactly how much revenue your clinic loses to missed calls each month and calculate the impact of AI.</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                    Calculate now <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
                <Link
                  to="/blog/how-to-set-up-ai-phone-answering-vet-clinic"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      How to Set Up AI Phone Answering for Your Vet Clinic
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">Step-by-step guide to getting AI phone answering running at your veterinary practice.</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                    Read the guide <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
                <Link
                  to="/features/ai-receptionist"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      How Our AI Receptionist Works
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">A detailed look at the technology powering AI-powered phone answering for veterinary clinics.</p>
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
                      <Star className="h-5 w-5" />
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

        {/* What Boltcall Includes for Veterinary Clinics */}
        <section className="py-10 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Boltcall Includes for Veterinary Clinics</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Every plan includes these features — no add-ons, no hidden fees</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: '24/7 Emergency Call Answering', desc: 'Captures urgent after-hours calls for sick or injured pets' },
                { label: 'Appointment Booking', desc: 'Books wellness exams, vaccinations, and procedures automatically' },
                { label: 'New Client Intake', desc: 'Collects pet name, species, breed, and reason for visit upfront' },
                { label: 'Recall Reminders', desc: 'Automated reminders for annual exams and vaccine boosters' },
                { label: 'Post-Visit Review Requests', desc: 'SMS review sequences build your clinic online reputation' },
                { label: 'Monthly Revenue Report', desc: 'See calls answered, appointments booked, and revenue recovered' },
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
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Phone Answering Impact for Veterinary Clinics: Before and After</h2>
            <p className="text-gray-500 text-sm text-center mb-6">What vet clinic owners typically experience after switching to AI phone answering</p>
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
                  ['Monthly calls answered', '63–73%', '99%+'],
                  ['After-hours emergency calls captured', '0%', '100%'],
                  ['Annual wellness recall compliance rate', '48%', '65%+ (automated)'],
                  ['Monthly revenue from missed calls recovered', '$0', '$3,000 – $8,000+'],
                  ['Appointment no-show rate', '15–20%', '7–10%'],
                  ['Google reviews per month', '1–2', '5–9'],
                  ['Setup time for 24/7 coverage', '2–4 weeks (hire)', '30 minutes'],
                  ['Monthly cost vs. receptionist hire', '$3,200 – $4,200/mo', '$549-897'],
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

export default FAQAIReceptionistVet;
