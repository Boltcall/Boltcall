import React, { useEffect } from 'react';
import { updateMetaDescription } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Phone, Users, Calendar, CheckCircle } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import GiveawayBar from '../../components/GiveawayBar';
import Breadcrumbs from '../../components/Breadcrumbs';
import { Link } from 'react-router-dom';
import { WavePath } from '../../components/ui/wave-path';

const AIReceptionistPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for Calls & Messages | Boltcall';
    updateMetaDescription('AI receptionist handles calls and messages 24/7. Never miss a call, book appointments automatically, capture leads. Start free today.');

    const speakableScript = document.createElement('script');
    speakableScript.type = 'application/ld+json';
    speakableScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": document.title,
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".speakable-intro"]
      }
    });
    document.head.appendChild(speakableScript);


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Features", "item": "https://boltcall.org/features"}, {"@type": "ListItem", "position": 3, "name": "AI Receptionist", "item": "https://boltcall.org/features/ai-receptionist"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'faq-jsonld-ai-receptionist-feature';
    faqScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is an AI receptionist?",
          acceptedAnswer: { "@type": "Answer", text: "An AI receptionist is a voice AI system that answers your business phone calls 24/7, handles caller inquiries using natural conversation, books appointments directly into your calendar, captures lead information, and routes urgent calls to a human — all without any staff involvement. Boltcall's AI receptionist responds in under 1 second and handles unlimited simultaneous calls." }
        },
        {
          "@type": "Question",
          name: "How does Boltcall's AI receptionist handle calls?",
          acceptedAnswer: { "@type": "Answer", text: "Boltcall answers every call instantly using a natural-sounding AI voice. It greets callers with your business name, identifies what they need, answers common questions from your knowledge base, checks your calendar for availability, books confirmed appointments, and sends the caller a text confirmation. Complex or urgent calls are transferred to you immediately with a call summary." }
        },
        {
          "@type": "Question",
          name: "Does the AI receptionist work after hours?",
          acceptedAnswer: { "@type": "Answer", text: "Yes. Boltcall's AI receptionist operates 24/7 — nights, weekends, and holidays. After-hours calls are handled the same way as business-hours calls: the AI answers, books appointments for the next available slot, and sends a confirmation. Emergency calls can be configured to immediately alert your on-call staff via phone or text." }
        },
        {
          "@type": "Question",
          name: "Can the AI receptionist handle multiple calls at once?",
          acceptedAnswer: { "@type": "Answer", text: "Yes. Unlike a human receptionist who can only handle one call at a time, Boltcall handles unlimited simultaneous calls. During busy periods — Monday morning rush, post-holiday surge, after a marketing campaign — every caller is answered instantly with no hold time and no missed calls." }
        },
        {
          "@type": "Question",
          name: "How much does Boltcall's AI receptionist cost?",
          acceptedAnswer: { "@type": "Answer", text: "Boltcall starts at $389/month with full call answering, appointment booking, CRM integration, and SMS follow-ups included. There are no per-call fees, no setup charges, and no long-term contracts required. Compare this to $35,000–$55,000/year for a full-time human receptionist." }
        }
      ]
    });
    document.head.appendChild(faqScript);

    return () => {
      speakableScript.remove();
      document.getElementById('faq-jsonld-ai-receptionist-feature')?.remove();
    };
  }, []);
  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={[
            { label: 'Home', href: '/' },
            { label: 'Features', href: '/features' },
            { label: 'AI Receptionist', href: '/features/ai-receptionist' }
          ]} />
          <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-6">
              <Phone className="w-4 h-4" />
              <span className="font-semibold">AI Receptionist</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Never Miss a Call with <span className="text-blue-600">AI Receptionist</span>
            </h1>
            
            <p className="speakable-intro text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Your AI receptionist answers calls 24/7, schedules appointments, and provides instant support—so you never miss an opportunity.
            </p>
          </motion.div>
          </div>
        </div>
      </section>

      {/* What It Is Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>What is AI Receptionist?</span>
            </h2>
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p className="text-lg">
                AI Receptionist is an intelligent virtual assistant that handles all your incoming calls automatically. 
                It understands callers like a real person, gets smarter over time, and handles customer inquiries,
                answers questions, schedules appointments, and routes calls—all without human intervention.
              </p>
              <p className="text-lg">
                Unlike traditional voicemail or call centers, your AI receptionist engages in natural conversations, 
                figures out who's serious, and provides instant responses 24 hours a day, 7 days a week. It learns from
                every interaction, getting smarter over time so it can handle more complex requests and give more
                accurate answers.
              </p>
              <p className="text-lg">
                It works with your existing business tools, including your calendar, contacts, and
                customer list. When a call comes in, the AI receptionist can pull up information about the caller,
                check your availability, and decide how to best help the customer—all in real-time.
              </p>
              <p className="text-lg">
                Whether it's answering common questions, scheduling appointments, figuring out who's a real buyer, or routing
                urgent calls to the right person, your AI receptionist handles it all with the professionalism and consistency
                that builds customer trust and loyalty.
              </p>
            </div>
          </motion.div>

          {/* Wave Path Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="my-16"
          >
            <div className="flex w-[70vw] max-w-2xl flex-col">
              <WavePath className="mb-8 text-blue-600" />
              <div className="flex w-full flex-col">
                <div className="flex">
                  <p className="text-gray-500 text-sm mt-2">Smooth customer experience</p>
                  <p className="text-gray-800 ml-8 w-3/4 text-lg md:text-xl">
                    From the moment a call comes in, your AI receptionist provides a smooth, 
                    professional experience that turns callers into customers.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why It's Important Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Why AI Receptionist is Critical</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  The Cost of Missed Calls
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Studies show that <strong>75% of customers won't call back</strong> if their first call goes unanswered. 
                  For a business receiving 100 calls per month, that's potentially 75 lost opportunities. 
                  At an average customer value of $500, that's $37,500 in lost revenue monthly—$450,000 annually.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Beyond the immediate financial impact, missed calls damage your reputation. Customers who can't reach you 
                  assume you're unprofessional, too busy, or don't care about their business. This negative perception spreads 
                  through word-of-mouth and online reviews, creating a ripple effect that can take months or years to repair.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  24/7 Availability Matters
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Your customers don't only call during business hours. <strong>40% of inquiries happen after hours</strong>, 
                  on weekends, or during holidays. An AI receptionist ensures every call is answered immediately, 
                  regardless of when it comes in, capturing leads that would otherwise be lost.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Modern consumers expect instant responses, regardless of the time or day. When someone is ready to make 
                  a purchase decision, they want to act immediately. If they can't reach you, they'll move on to a competitor 
                  who is available. An AI receptionist eliminates this barrier, ensuring you never miss an opportunity because 
                  of timing.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Competitive Advantage
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  While competitors rely on voicemail or limited hours, you provide instant, professional service. 
                  This creates a <strong>significant competitive advantage</strong> and positions your business as modern, 
                  responsive, and customer-focused.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  In today's market, standing out matters. An AI receptionist shows that you're
                  serious about customer service. This modern approach
                  attracts customers who value speed and reliability, setting you apart from businesses that still rely
                  on voicemail and missed calls.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Helps Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>How AI Receptionist Helps Your Business</span>
            </h2>
            
            <div className="space-y-6 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Capture Every Lead
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Never lose a potential customer again. Every call is answered, every inquiry is handled, 
                  and every caller's details are saved automatically. The AI receptionist doesn't just answer
                  calls—it actively talks with callers, asks the right questions, gathers important information,
                  and helps move each conversation toward a booking or sale.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Every call is automatically saved to your customer list, creating a complete record of every conversation.
                  This helps you understand your customers better, spot patterns in what they need,
                  and focus your follow-ups where they matter most.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Instant Response
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Respond to customers in seconds, not hours. Research shows that responding within 60 seconds 
                  increases your chances of winning the job by 391%. The AI receptionist picks up every time,
                  so every caller gets immediate attention and professional service.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Speed matters because customer attention spans are short. When someone calls your business, they're 
                  actively engaged and ready to make a decision. The longer they wait, the more likely they are to 
                  reconsider, get distracted, or choose a competitor. Instant response keeps the momentum going and
                  makes it much more likely they'll book with you.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Automatic Scheduling
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Book appointments directly into your calendar without any manual work. The AI handles 
                  availability checks and confirms appointments instantly. It can view your calendar in real-time, 
                  identify available time slots, and offer options that work for both you and the customer.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The system also sends automatic confirmation messages via SMS or email, reducing no-shows and ensuring 
                  customers have all the information they need. If a customer needs to reschedule, the AI can handle that 
                  too, finding alternative times and updating the calendar automatically.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Cost Savings
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Replace expensive call center staff or receptionists. An AI receptionist costs a fraction 
                  while providing better coverage and consistency. Unlike human staff, the AI never gets tired, 
                  never takes breaks, and never has an off day. It provides the same high-quality service 
                  consistently, 24/7/365.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The cost savings are substantial. A full-time receptionist can cost $30,000-$50,000 annually, 
                  plus benefits, training, and management overhead. An AI receptionist provides better coverage 
                  (24/7 vs. 40 hours per week) at a fraction of the cost, while eliminating the challenges of 
                  staff turnover, scheduling conflicts, and performance variability.
                </p>
              </div>
            </div>

          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Real-World Use Cases</span>
            </h2>
            
            <div className="space-y-8">
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Dental Practice</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A dental practice receives 200 calls per month. Before setting up an AI receptionist, 
                  they missed 30% of calls during peak hours and after hours. The AI now answers every call, 
                  schedules appointments, sends reminders, and handles insurance questions. Result: 100% call 
                  answer rate, 25% increase in new patient bookings, and $15,000 saved annually on receptionist costs.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The AI handles common questions about services, insurance acceptance, office hours, and 
                  appointment availability. It can also provide directions to the office, explain preparation 
                  requirements for procedures, and send post-appointment follow-up messages. This comprehensive 
                  coverage ensures patients always get the information they need, when they need it.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Legal Firm</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A small law firm was losing potential clients because calls went to voicemail after hours. 
                  The AI receptionist now answers calls 24/7, asks about case type and
                  urgency to figure out who needs help most, and schedules consultations. The firm saw a 40% increase in consultation bookings
                  and turned 15% more callers into paying clients.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The AI can ask the first round of questions, explain how consultations work, share
                  info about what the firm handles, and even collect basic case details before passing the call
                  to an attorney. For urgent matters, it can immediately connect callers to the on-call 
                  attorney or schedule same-day consultations when available.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Home Services Business</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A home services company was missing calls during service appointments when staff were 
                  on-site. The AI receptionist now handles all incoming calls, schedules service appointments, 
                  provides quotes, and even handles emergency calls. This resulted in 50% more bookings and 
                  eliminated the need for a dedicated call center.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The system can provide service area information, explain different service packages, 
                  schedule appointments based on technician availability, and send confirmation messages 
                  with service details. For emergency calls, it can immediately route to the appropriate 
                  technician or schedule urgent appointments.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>How AI Receptionist Works</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 1: Call Reception
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  When a call comes in, the AI receptionist answers immediately with a professional greeting. 
                  It identifies itself and your business name, creating a welcoming first impression. The system 
                  understands what callers are saying — whether they're looking to
                  schedule an appointment, ask a question, or speak with someone specific.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The AI can recognize different types of calls: new customer inquiries, existing customer 
                  questions, appointment requests, billing inquiries, and more. It adapts its approach based 
                  on the call type, ensuring each caller receives appropriate and relevant assistance.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 2: Intelligent Conversation
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The AI engages in natural conversation, asking relevant questions to understand the caller's 
                  needs. It can answer frequently asked questions, provide information about your services, 
                  explain pricing, and handle common inquiries without human intervention. The conversation feels 
                  natural and human-like, not robotic.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The AI understands what callers are saying, even when questions are complicated. It remembers
                  what was said earlier in the conversation, follows up on previous points, and adjusts its
                  responses based on what the caller says and how they say it.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 3: Finding Serious Buyers
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  For potential customers, the AI asks smart questions to figure out if they're ready to buy, what their
                  budget looks like, when they need the work done, and what exactly they need. All this gets saved
                  to your customer list automatically, so you know who to call back first. It feels like a normal
                  conversation — not an interrogation.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The system can rank callers based on their answers, flagging the best opportunities that
                  need your attention right away. It can also spot time-wasters or spam calls, saving you
                  hours every week. All the details are saved so you can review them whenever you want.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 4: Appointment Scheduling
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  When a caller wants to schedule an appointment, the AI checks your calendar in real-time, 
                  identifies available time slots, and offers options that work for both you and the customer. 
                  It can handle rescheduling requests, cancellations, and even suggest alternative times if 
                  the preferred slot isn't available.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The scheduling process is quick and easy. The AI confirms appointment details, sends 
                  automatic confirmation messages via SMS or email, and adds the appointment to your calendar. 
                  It can also send reminder messages before appointments to reduce no-shows and ensure customers 
                  are prepared.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 5: Call Routing & Escalation
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  For calls that require human attention, the AI can intelligently route to the right person 
                  or department. It can also take detailed messages, schedule callbacks, or flag urgent
                  matters for immediate attention. The system learns from your preferences, getting better at
                  sending calls to the right person over time.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The AI can determine when a call should be transferred based on complexity, customer request, 
                  or rules you set up. It fills in the person you're transferring to on what the caller needs, so
                  the customer doesn't have to repeat themselves. This keeps things smooth and combines the speed of AI
                  with the personal touch of a real person when it's needed.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features & Capabilities Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Key Features & Capabilities</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Understands What Callers Are Saying</h3>
                <p className="text-gray-600 text-sm">
                  Picks up on what callers mean, not just what they say. Handles tricky questions and
                  keeps the conversation flowing naturally.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Language Support</h3>
                <p className="text-gray-600 text-sm">
                  Communicate with customers in multiple languages, expanding your reach and serving 
                  diverse customer bases.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Connects to Your Calendar and Contacts</h3>
                <p className="text-gray-600 text-sm">
                  Automatically saves call details, caller information, and appointment details to your
                  existing tools.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Call Transcription</h3>
                <p className="text-gray-600 text-sm">
                  Every call is written out word-for-word and saved, so you can look back at any
                  conversation whenever you need to.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports & Numbers</h3>
                <p className="text-gray-600 text-sm">
                  See how many calls you're getting, how long they last, how many turn into bookings, and
                  how happy customers are — so you know what's working.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Customizable Voice & Tone</h3>
                <p className="text-gray-600 text-sm">
                  Choose from different voice options and customize the tone to match your brand 
                  personality and industry standards.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>What You'll Get Back</span>
            </h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-100">
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Let's do the math for a typical business. Say you receive 150 calls per month, 
                with an average customer value of $400. Before setting up an AI receptionist, you were 
                missing 25% of calls (37.5 calls per month), resulting in $15,000 in lost revenue monthly 
                ($180,000 annually).
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                With an AI receptionist answering 100% of calls, you capture all those leads. Even if only 
                30% convert (11.25 customers), that's $4,500 in additional monthly revenue ($54,000 annually). 
                Additionally, you save $35,000 annually on receptionist costs. Total benefit: $89,000 per year.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                The AI receptionist pays for itself many times over, while providing better service coverage 
                than a human receptionist could ever provide. The investment is minimal compared to the returns, 
                making it one of the smartest investments you can make for your business.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Frequently Asked Questions</span>
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can the AI handle complex questions?</h3>
                <p className="text-gray-600">
                  Yes. The AI understands callers like a real person and can handle tough questions.
                  For anything it can't answer, it takes a detailed message, schedules a callback,
                  or transfers the call to you with all the details.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What if a customer wants to speak to a real person?</h3>
                <p className="text-gray-600">
                  The AI can transfer calls to human agents at any time. You can set rules for when transfers 
                  should happen (e.g., during business hours, for urgent matters, or when requested). The AI 
                  provides context to the human agent, ensuring smooth handoffs.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Does it work with my existing tools?</h3>
                <p className="text-gray-600">
                  Yes. The AI receptionist works with popular calendars (Google Calendar, Outlook),
                  contact management tools (Salesforce, HubSpot), and phone systems. It also connects to
                  your other business tools, so everything stays in sync.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Is it difficult to set up?</h3>
                <p className="text-gray-600">
                  Not at all. Setup takes about 5 minutes. You provide basic information about your business, 
                  connect your calendar, and customize the AI's responses. No technical expertise required. 
                  The system is ready to start answering calls immediately after setup.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Related Resources Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Continue Reading */}
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Continue reading</span>
            </h2>
            <p className="text-gray-600 mb-6">
              Want to go deeper? Learn{' '}
              <Link to="/blog/how-ai-receptionist-works" className="text-blue-600 underline hover:text-blue-700">
                how an AI receptionist works
              </Link>
              , compare the{' '}
              <Link to="/blog/best-ai-receptionist-tools" className="text-blue-600 underline hover:text-blue-700">
                best AI receptionist tools
              </Link>
              , and weigh{' '}
              <Link to="/blog/ai-vs-human-receptionist" className="text-blue-600 underline hover:text-blue-700">
                AI vs human receptionist
              </Link>
              .
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-12">
              <Link
                to="/blog/is-ai-receptionist-worth-it"
                className="block bg-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Is an AI receptionist worth it?
                </h3>
                <p className="text-sm text-gray-600">The honest cost vs. value breakdown.</p>
              </Link>
              <Link
                to="/blog/ai-receptionist-cost-pricing"
                className="block bg-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  AI receptionist cost and pricing
                </h3>
                <p className="text-sm text-gray-600">What you'll actually pay each month.</p>
              </Link>
              <Link
                to="/blog/5-signs-you-need-ai-receptionist"
                className="block bg-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  5 signs you need an AI receptionist
                </h3>
                <p className="text-sm text-gray-600">Quick diagnostic for busy owners.</p>
              </Link>
              <Link
                to="/blog/best-ai-receptionist-home-services"
                className="block bg-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Best AI receptionist for home services
                </h3>
                <p className="text-sm text-gray-600">HVAC, plumbing, roofing, electrical.</p>
              </Link>
              <Link
                to="/blog/best-ai-answering-service-dental-medical-practice"
                className="block bg-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition md:col-span-2"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Best AI answering service for dental and medical practices
                </h3>
                <p className="text-sm text-gray-600">HIPAA-aware patterns and intake flows.</p>
              </Link>
            </div>

            {/* Related Features */}
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Pairs well with</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-12">
              <Link
                to="/features/lead-reactivation"
                className="block bg-blue-50/40 rounded-lg p-5 border border-blue-100 hover:border-blue-300 transition"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-1">Lead Reactivation</h3>
                <p className="text-sm text-gray-600">Win back the leads that ghosted.</p>
              </Link>
              <Link
                to="/features/website-widget"
                className="block bg-blue-50/40 rounded-lg p-5 border border-blue-100 hover:border-blue-300 transition"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-1">Website Chat & Voice Widget</h3>
                <p className="text-sm text-gray-600">Convert site visitors into booked calls.</p>
              </Link>
              <Link
                to="/features/instant-form-reply"
                className="block bg-blue-50/40 rounded-lg p-5 border border-blue-100 hover:border-blue-300 transition"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-1">Instant Form Reply</h3>
                <p className="text-sm text-gray-600">Reach new leads in under 60 seconds.</p>
              </Link>
              <Link
                to="/features/sms-booking-assistant"
                className="block bg-blue-50/40 rounded-lg p-5 border border-blue-100 hover:border-blue-300 transition"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-1">SMS Booking Assistant</h3>
                <p className="text-sm text-gray-600">Text-first booking that closes the loop.</p>
              </Link>
            </div>

            {/* Comparisons + Resources */}
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Shopping around?</span>
            </h2>
            <p className="text-gray-600 mb-6">
              <Link to="/comparisons" className="text-blue-600 underline hover:text-blue-700">
                Compare AI receptionists
              </Link>{' '}
              side-by-side, or jump straight to{' '}
              <Link to="/compare/boltcall-vs-smith-ai" className="text-blue-600 underline hover:text-blue-700">
                Boltcall vs Smith.ai
              </Link>{' '}
              and{' '}
              <Link to="/compare/boltcall-vs-gohighlevel" className="text-blue-600 underline hover:text-blue-700">
                Boltcall vs GoHighLevel
              </Link>
              . Not ready to commit? Grab the{' '}
              <Link to="/lead-magnet/ai-receptionist-buyers-guide" className="text-blue-600 underline hover:text-blue-700">
                AI Receptionist Buyer's Guide
              </Link>{' '}
              or run a{' '}
              <Link to="/seo-audit" className="text-blue-600 underline hover:text-blue-700">
                Free SEO Audit
              </Link>{' '}
              first. When you're ready, see{' '}
              <Link to="/pricing" className="text-blue-600 underline hover:text-blue-700">
                Pricing
              </Link>{' '}
              or{' '}
              <Link to="/book-a-call" className="text-blue-600 underline hover:text-blue-700">
                Book a Call
              </Link>
              .
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="my-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 w-full max-w-[800px] group hover:bg-gray-50 transition duration-500 hover:duration-200">
            <div className="flex justify-center isolate">
              <div className="bg-white size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                <Phone className="w-6 h-6 text-blue-500" />
              </div>
              <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <h2 className="text-gray-900 font-medium mt-4 text-4xl">Fast. Simple. Grows with you.</h2>
            <p className="text-base text-gray-600 mt-2 whitespace-pre-line">Get your AI receptionist running in 5 minutes — free. Connect it to your phone, website, and more.</p>
            <Link
              to="/setup"
              className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start the free setup
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Social Proof */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Trusted by Local Business Owners</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Join 500+ businesses using Boltcall to capture more leads and grow revenue.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: "Boltcall paid for itself in the first week. We stopped losing calls after hours and our bookings jumped 40%.", name: "Marcus T.", role: "HVAC Owner, Texas" },
            { quote: "I was skeptical about AI, but it just works. Our front desk handles 30% fewer interruptions now.", name: "Priya S.", role: "Dental Practice Manager, California" },
            { quote: "We were losing 15-20 calls a week to voicemail. Boltcall captures every single one now.", name: "James R.", role: "Plumbing Business Owner, Florida" },
          ].map((item) => (
            <div key={item.name} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-gray-700 text-sm leading-relaxed mb-4">"{item.quote}"</p>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Signals */}
      <section className="bg-gray-50 border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>100% Free — no credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Used by 500+ local businesses</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Results in 30 days or your money back</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Your data is never sold or shared</span>
            </div>
          </div>
        </div>
      </section>


      {/* Why Boltcall */}
      <section className="py-14 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">Why Businesses Choose Boltcall</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { title: 'Setup in 30 minutes', desc: 'No developers, no tech team. Answer 5 questions about your business and your AI receptionist is live — configured to your services, hours, and voice.' },
              { title: 'Flat monthly pricing', desc: 'Unlike per-call services that penalize you for growth, Boltcall charges a flat monthly fee. Handle 500 calls or 5,000 — your cost stays predictable.' },
              { title: 'Trained on your business', desc: 'Not a generic bot. Boltcall learns your specific services, pricing, FAQs, and booking rules — so every interaction sounds like your best team member.' },
              { title: 'ROI from day one', desc: 'One recovered call per month covers the entire subscription cost. Most customers see 5–10x ROI within the first 30 days from calls they would have otherwise missed.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-5 shadow-sm border border-white">
                <h3 className="font-bold text-gray-900 mb-2">✓ {item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Receptionist vs. Traditional Phone Handling</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How Boltcall AI receptionist compares to other ways businesses handle inbound calls</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Feature</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">AI Receptionist</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Human Receptionist</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Voicemail</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Call answer rate', '99%+', '55–75%', 'Recording only'],
                  ['After-hours coverage', 'Always on', 'No', 'Recording only'],
                  ['Live appointment booking', 'Yes — real-time', 'Yes (during hours)', 'No'],
                  ['SMS follow-up', 'Automated', 'Manual', 'No'],
                  ['No-show reminders', 'Automated', 'Manual', 'No'],
                  ['Monthly cost', '$79–$179', '$3,200+', '$0'],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{row[0]}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{row[1]}</td>
                    <td className="px-4 py-3 text-gray-600">{row[2]}</td>
                    <td className="px-4 py-3 text-gray-600">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default AIReceptionistPage;

