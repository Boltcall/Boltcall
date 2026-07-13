// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Sun, Phone, Clock, Calendar, Shield, ChevronRight, ArrowRight, Users, BarChart3, MapPin, Zap, TrendingUp, MessageSquare } from 'lucide-react';
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
  { id: 'faq-section', text: '20 Questions About AI Receptionists for Solar Companies', level: 2 },
  { id: 'related-resources', text: 'Related Resources', level: 2 },
];

const faqs = [
  {
    question: 'How much does an AI receptionist cost for a solar company?',
    answer: 'AI receptionists for solar companies typically cost between $549 and $4997 per month with flat-rate pricing. Compare that to a full-time appointment setter at $35,000-$50,000 per year or an outsourced call center at $15-$25 per qualified lead. Most solar companies recover the monthly cost by capturing just one additional qualified lead, since the average residential solar installation generates $8,000-$15,000 in gross revenue. The AI pays for itself within the first few days of operation.',
  },
  {
    question: 'How long does it take to set up an AI receptionist for a solar company?',
    answer: 'Basic setup takes under 10 minutes. You provide your company name, service area, hours, and phone number, and the AI starts answering calls immediately. Full customization including lead qualification scripts, service area boundaries, financing program details, and CRM integration typically takes 1-2 hours. You can configure the AI to handle the specific questions solar prospects ask, including panel brands, warranty information, and estimated savings. Most solar companies are fully operational the same afternoon.',
  },
  {
    question: 'How does the AI qualify solar leads on the phone?',
    answer: 'The AI asks a structured series of qualifying questions tailored to solar sales. It confirms whether the caller is a homeowner (renters are politely disqualified and told about community solar options if applicable), asks about roof age and condition, identifies the utility provider and average monthly bill, confirms the property is within your service area, and gauges timeline and motivation. Highly qualified leads (homeowner, suitable roof, high utility bill, ready to schedule) are flagged as priority and can trigger an immediate transfer to a sales rep. This qualification happens in 2-3 minutes and replaces the manual screening that typically takes a sales team member 10-15 minutes per call.',
  },
  {
    question: 'Can the AI schedule site survey appointments for solar companies?',
    answer: 'Yes. The AI connects to your scheduling system and books site survey appointments based on sales rep availability, geographic zones, and time-of-day preferences. It groups appointments by area to minimize drive time between surveys, respects buffer times for travel, and confirms the homeowner will be present at the property. Callers receive an immediate confirmation text with the date, time, and what to expect during the survey. The AI sends an automated reminder 24 hours before the appointment, which reduces no-shows by 30-40% compared to manual confirmation calls.',
  },
  {
    question: 'Can the AI handle technical questions about solar panels and systems?',
    answer: 'The AI answers technical questions based on the knowledge base you configure. It can explain the difference between monocrystalline and polycrystalline panels, describe how net metering works, explain inverter types (string vs. micro vs. optimizers), and answer questions about battery storage options. For highly technical questions beyond its knowledge base, the AI explains that a solar design specialist will cover those details during the site survey and uses the question as a reason to book the appointment. The key is that the AI keeps the conversation moving toward scheduling rather than getting stuck on technical rabbit holes that delay conversion.',
  },
  {
    question: 'How does the AI handle after-hours calls for solar companies?',
    answer: 'After-hours calls are critical for solar companies because many homeowners research solar in the evening after receiving their utility bill or seeing a neighbor\'s installation. The AI answers every after-hours call instantly, qualifies the lead, answers questions about your services, and books a site survey appointment. For urgent service calls from existing customers (inverter errors, panel damage from storms), the AI captures the details and sends a priority alert to your service team. Solar companies using AI receptionists report that 30-35% of their qualified leads come from calls made between 6 PM and 9 AM.',
  },
  {
    question: 'Does the AI integrate with solar CRM platforms like Salesforce or HubSpot?',
    answer: 'Yes. AI receptionists integrate with popular CRM platforms used by solar companies including Salesforce, HubSpot, Zoho, Aurora Solar, and Enerflo via API or webhook connections. New leads are automatically created with full qualification data attached: homeowner status, roof details, utility provider, monthly bill, service area confirmation, and appointment time. Some integrations support direct opportunity creation and pipeline stage assignment. For CRMs not directly supported, data is delivered via webhook, which connects to any system through Zapier, n8n, or native API.',
  },
  {
    question: 'How does the AI handle the long solar sales cycle?',
    answer: 'Solar sales cycles average 30-90 days from first contact to signed contract. The AI supports this timeline through automated follow-up sequences. After the initial call, it can send scheduled text messages with educational content about solar savings, financing options, and customer testimonials at intervals you define. When a lead has not responded to the sales team, the AI can make an outbound follow-up call to re-engage. It tracks where each lead is in the pipeline and adjusts messaging accordingly. This persistent, automated follow-up converts 15-20% of leads that would otherwise go cold during the decision-making period.',
  },
  {
    question: 'Can the AI handle questions about solar financing and incentives?',
    answer: 'Yes. The AI is configured with your specific financing programs (solar loans, leases, PPAs) and can explain monthly payment estimates, interest rates, and the difference between owning and leasing. It provides current information about the federal Investment Tax Credit (ITC), state-level rebates, and utility-specific incentive programs applicable to your service area. The AI does not provide financial advice or guarantee specific savings, but it gives callers enough information to understand their options and feel confident scheduling a site survey. For complex financial questions, it positions the site survey as the place where a solar advisor will provide personalized projections.',
  },
  {
    question: 'How does the AI validate that a caller is in the service area?',
    answer: 'The AI asks for the caller\'s zip code or address during qualification and cross-references it against your configured service area boundaries. Callers within the service area proceed to full qualification and appointment booking. Callers outside the service area receive a polite explanation and, if you configure it, a referral to a partner installer in their region. This automated screening prevents your sales team from wasting time on leads they cannot serve. Service area boundaries can be updated in minutes as you expand into new territories.',
  },
  {
    question: 'Can the AI track and manage referral leads?',
    answer: 'Yes. The AI can ask callers how they heard about your company and capture referral source details. When a caller mentions they were referred by an existing customer, the AI records the referring customer\'s name and flags the lead as a referral in your CRM. If you run a referral bonus program, the AI informs the caller about the program and confirms the referring customer will receive credit. Referral leads convert at 2-3x the rate of cold leads in solar, so properly attributing and prioritizing them has a significant impact on revenue and customer acquisition cost.',
  },
  {
    question: 'What is the ROI of an AI receptionist for a solar company?',
    answer: 'Solar companies that deploy an AI receptionist typically capture 10-25 additional qualified leads per month from previously missed calls, after-hours inquiries, and faster follow-up. With an average residential installation generating $8,000-$15,000 in gross revenue and a close rate of 20-30%, each additional qualified lead is worth $1,600-$4,500 in expected revenue. Capturing just 10 additional leads per month generates $16,000-$45,000 in expected pipeline value against a $549ג€“$4997 monthly investment. Solar companies also report a 25-35% improvement in site survey show rates due to automated reminders and a 15-20% increase in lead-to-close conversion from faster follow-up.',
  },
  {
    question: 'How does an AI receptionist compare to a solar call center?',
    answer: 'Outsourced solar call centers charge $15-$25 per qualified lead or $2,000-$5,000 per month for dedicated agents. Hold times average 30-90 seconds, agents follow generic scripts, and quality varies by shift. An AI receptionist answers in under 2 seconds with zero hold time, qualifies leads using your exact criteria, books appointments directly into your calendar, integrates with your CRM, and costs a flat $549ג€“$4997/month regardless of call volume. The AI also works 24/7 and improves consistently as you refine its knowledge base, while call center quality depends on whichever agent is available at the time.',
  },
  {
    question: 'Can the AI receptionist communicate in multiple languages?',
    answer: 'Yes. Modern AI receptionists support multilingual call handling, which is valuable for solar companies operating in diverse markets. The AI can detect the caller\'s preferred language within the first few seconds and switch automatically, or offer a language selection at the start of the call. Spanish is the most commonly configured second language for U.S. solar companies, particularly in California, Texas, Florida, and Arizona markets. Multilingual capability means you never lose a qualified homeowner because of a language barrier during the initial call.',
  },
  {
    question: 'How does the AI handle seasonal demand fluctuations?',
    answer: 'Solar companies experience significant seasonal variation, with call volumes peaking in spring and summer when utility bills spike and homeowners think about solar. The AI scales effortlessly from 20 calls per day in winter to 100+ calls per day in peak season with no additional cost, no hiring, and no training. During peak periods, the AI prevents the queue backlog and hold times that cause traditional offices to lose 20-30% of inbound leads. During slower months, the AI maintains consistent lead capture and follow-up without the overhead of idle staff. This elasticity is one of the most underestimated benefits for seasonal businesses like solar.',
  },
  {
    question: 'Can the AI transfer qualified leads to sales reps in real time?',
    answer: 'Yes. The AI can warm-transfer highly qualified leads directly to a sales representative based on territory, specialization, or round-robin assignment. Before the transfer, the AI provides a whisper briefing to the rep with the caller\'s name, qualification details (homeowner, roof age, utility bill, timeline), and any specific questions raised during the call. If no rep is available, the AI books a callback appointment and sends the lead details via SMS and email. This combination of instant qualification plus live transfer dramatically shortens the time from first call to first conversation with a salesperson.',
  },
  {
    question: 'Can the AI provide information about utility rebates and incentive programs?',
    answer: 'Yes. The AI is configured with current utility rebate programs, state incentive details, and federal tax credit information specific to your service area. When a caller asks about incentives, the AI provides accurate, up-to-date information including the 30% federal ITC, any state-level solar rebates or SRECs, and utility-specific programs like net metering policies. Information is updated as programs change. The AI frames incentives as a reason to act now, particularly when programs have expiration dates or budget caps, which helps drive urgency and improve conversion from inquiry to booked site survey.',
  },
  {
    question: 'What reporting and analytics does an AI receptionist provide for solar companies?',
    answer: 'AI receptionist platforms provide detailed dashboards covering total calls received, qualified vs. unqualified leads, disqualification reasons (renter, out of area, roof condition), calls by time of day and day of week, conversion rate from call to booked site survey, after-hours call volume, lead source attribution, and average call duration. These analytics help solar company owners and marketing managers identify which advertising channels drive the most calls, what times to run ads for maximum ROI, and where the sales process is losing qualified leads. Reports export as PDF or CSV for team meetings and investor updates.',
  },
  {
    question: 'How secure is the data handled by the AI receptionist?',
    answer: 'AI receptionists use enterprise-grade security including AES-256 encryption for data at rest, TLS 1.3 for data in transit, and SOC 2 Type II certified hosting infrastructure. Lead data, call recordings, and CRM integrations operate within isolated, encrypted environments with role-based access controls. Configurable retention policies allow automatic data purging after defined periods. No caller information is used for AI model training or shared with third parties. For solar companies handling customer financial information during financing discussions, this level of security protects both the business and customer privacy.',
  },
];

const FAQAIReceptionistSolar: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for Solar Companies: 20 Questions Answered | Boltcall';
    updateMetaDescription(
      'Everything solar installers need to know about AI receptionists — lead qualification, appointment setting, after-hours handling, and ROI.'
    );

    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "AI Receptionist for Solar Companies: 20 Questions Answered",
        "description": "Everything solar installers need to know about AI receptionists — lead qualification, appointment setting, after-hours handling, and ROI.",
        "author": { "@type": "Organization", "name": "Boltcall" },
        "datePublished": "2026-03-31",
        "dateModified": "2026-03-31",
        "publisher": {
          "@type": "Organization",
          "name": "Boltcall",
          "logo": { "@type": "ImageObject", "url": "https://boltcall.org/logo.png" }
        },
        "url": "https://boltcall.org/blog/ai-receptionist-solar-faq",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://boltcall.org/blog/ai-receptionist-solar-faq"
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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Receptionist FAQ: Solar", "item": "https://boltcall.org/blog/ai-receptionist-solar-faq"}]});
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
              <span className="text-gray-900 font-medium">AI Receptionist for Solar Companies: 20 Questions Answered</span>
            </nav>

            {/* Badge */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mb-6"
            >
              <Sun className="h-4 w-4 mr-2" />
              FAQ for Solar Companies
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
            >
              AI Receptionist for Solar Companies: 20 Questions Answered
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.1 } } }}
              className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed"
            >
              Everything solar installers need to know about AI receptionists: lead qualification, site survey scheduling, after-hours capture, CRM integration, and measurable ROI.
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
              An AI receptionist for solar companies qualifies homeowner leads on the first ring, schedules site surveys based on rep availability and geography, answers questions about financing and incentives, and captures the 30-35% of qualified leads that call after hours. It costs $549ג€“$4997/month versus $35,000-$50,000/year for a dedicated appointment setter.
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
                Solar companies live and die by lead conversion speed. A homeowner who calls after seeing a door knock, a Google ad, or a neighbor's rooftop installation is at peak motivation. If your office does not answer, that motivation fades fast. Research shows solar prospects who are contacted within 5 minutes are 9 times more likely to convert than those contacted after 30 minutes. Yet most solar companies take over 24 hours to follow up on inbound calls.
              </p>
              <p className="text-gray-700 text-base leading-relaxed">
                An AI receptionist eliminates this gap by answering every call instantly, qualifying the homeowner, and booking the site survey before the prospect has a chance to call your competitor. Below are the 20 most common questions solar companies ask before deploying an AI receptionist.
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
                20 Questions About AI Receptionists for Solar Companies
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of Using an AI Receptionist for Solar Companies</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-xl p-6">
                  <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>Answers every call instantly — captures leads at peak motivation before they call a competitor</li>
                    <li>Qualifies homeowners automatically (ownership, roof age, utility bill, service area) in 2–3 minutes</li>
                    <li>Books site survey appointments 24/7, including evenings when most solar inquiries come in</li>
                    <li>Handles seasonal call spikes without additional hiring or training costs</li>
                    <li>Provides accurate, up-to-date information on financing, federal ITC, and state incentives</li>
                    <li>Integrates with solar CRMs (Salesforce, Aurora Solar, Enerflo) to create qualified leads automatically</li>
                    <li>Reduces site survey no-shows by 30–40% through automated reminders</li>
                    <li>Costs $549-4997/month vs. $35,000–$50,000/year for a dedicated appointment setter</li>
                  </ul>
                </div>
                <div className="bg-red-50 rounded-xl p-6">
                  <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>Requires initial setup time (1–2 hours) to configure service area, financing programs, and lead scripts</li>
                    <li>Knowledge base must be kept current when incentive programs or panel offerings change</li>
                    <li>Cannot provide personalised solar savings projections — complex financial questions are deferred to the site survey</li>
                    <li>Highly technical design questions (shading analysis, system sizing) require a human solar advisor</li>
                    <li>Callers who strongly prefer speaking with a person may ask to be transferred immediately</li>
                    <li>CRM integration may require technical setup for non-standard platforms</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

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
                  to="/tools/solar-profit-calculator"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Sun className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Solar Profit Calculator
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">Calculate how much revenue your solar company loses to missed calls and slow follow-up each month.</p>
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
                  <p className="text-sm text-gray-600 leading-relaxed">A detailed look at the technology powering AI-powered phone answering for solar companies.</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                    Learn more <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
                <Link
                  to="/blog/ai-receptionist-hvac-faq"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Zap className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      AI Receptionist FAQ for HVAC Companies
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">See how HVAC companies use AI receptionists for peak season call handling and emergency dispatch.</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                    Read FAQ <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
                <Link
                  to="/blog/ai-receptionist-plumber-faq"
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      AI Receptionist FAQ for Plumbers
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">How plumbing companies use AI receptionists for emergency dispatch and after-hours call handling.</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                    Read FAQ <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}

        {/* What Boltcall Includes for Solar Companies */}
        <section className="py-10 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Boltcall Includes for Solar Companies</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Every plan includes these features — no add-ons, no hidden fees</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: '24/7 Lead Answering', desc: 'Captures new solar inquiries the moment they call or submit a form' },
                { label: 'Site Assessment Scheduling', desc: 'Books roof assessments and consultations into rep calendars' },
                { label: 'Lead Qualification', desc: 'Collects home ownership, utility bill amount, and roof type automatically' },
                { label: 'Speed-to-Lead Follow-Up', desc: 'Responds to web leads within 60 seconds before competitors call back' },
                { label: 'No-Show Reminders', desc: 'Automated appointment reminders to reduce cancelled site visits' },
                { label: 'Monthly Revenue Report', desc: 'See leads captured, assessments booked, and pipeline value recovered' },
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
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Phone Answering Impact for Solar Companies: Before and After</h2>
            <p className="text-gray-500 text-sm text-center mb-6">What solar businesses typically experience after switching to AI lead response</p>
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
                  ['Lead response time (web forms)', '47 minutes average', 'Under 60 seconds'],
                  ['After-hours lead capture rate', '0%', '100%'],
                  ['Lead-to-assessment conversion rate', '22%', '38%+ (speed + follow-up)'],
                  ['Monthly revenue from slow response recovered', '$0', '$20,000 – $100,000+'],
                  ['Assessment no-show rate', '22–30%', '10–15%'],
                  ['Google reviews per month', '1–2', '4–8'],
                  ['Setup time for instant lead response', '2–3 weeks (hire)', '30 minutes'],
                  ['Monthly cost vs. inside sales hire', '$3,000 – $4,500/mo', '$549-897'],
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


      <Footer />
    </>
  );
};

export default FAQAIReceptionistSolar;
