import React, { useState, useEffect } from 'react';

import { updateMetaDescription } from '../lib/utils';

import { motion } from 'framer-motion';

import {

  Clock, Zap, PhoneOff, DollarSign, TrendingUp,

  CheckCircle2, Loader2, AlertTriangle, BookOpen,

  BarChart3, Users, ArrowRight,

} from 'lucide-react';

import Header from '../components/Header';

import Footer from '../components/Footer';

import GiveawayBar from '../components/GiveawayBar';



const WEBHOOK_URL = 'https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/lead-magnet-5min-playbook';



const fadeUp = {

  hidden: { opacity: 0, y: 30 },

  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },

};



const stagger = {

  visible: { transition: { staggerChildren: 0.15 } },

};



const businessTypes = [

  'Plumbing / HVAC',

  'Dental / Medical',

  'Legal / Law Firm',

  'Real Estate',

  'Home Services',

  'Automotive / Auto Repair',

  'Beauty / Wellness',

  'Roofing / Solar',

  'Accounting / Financial',

  'Other',

];



const FiveMinuteResponsePlaybook: React.FC = () => {

  const [name, setName] = useState('');

  const [email, setEmail] = useState('');

  const [businessType, setBusinessType] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);

  const [error, setError] = useState('');



  useEffect(() => {

    document.title = 'The 5-Minute Response Playbook | Boltcall';

    updateMetaDescription(

      'Free playbook: How local businesses convert 391% more leads with sub-1-minute response. Get the data-backed strategy to stop losing leads today.'

    );


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://boltcall.org/tools"}, {"@type": "ListItem", "position": 3, "name": "5-Minute Response Playbook", "item": "https://boltcall.org/tools/5-minute-response-playbook"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);



  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    setError('');



    if (!name.trim()) { setError('Please enter your name.'); return; }

    if (!email.trim() || !validateEmail(email.trim())) { setError('Please enter a valid email address.'); return; }

    if (!businessType) { setError('Please select your business type.'); return; }



    setIsSubmitting(true);

    try {

      const res = await fetch(WEBHOOK_URL, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          name: name.trim(),

          email: email.trim(),

          business_type: businessType,

          lead_magnet: '5-minute-response-playbook',

        }),

      });

      if (!res.ok) throw new Error('Submission failed');

      setIsSuccess(true);

    } catch {

      setError('Something went wrong. Please try again.');

      setIsSubmitting(false);

    }

  };



  // ── Shared form component ──

  const LeadForm = ({ id, dark = false }: { id: string; dark?: boolean }) => {

    if (isSuccess) {

      return (

        <motion.div

          initial={{ opacity: 0, scale: 0.95 }}

          animate={{ opacity: 1, scale: 1 }}

          className={`rounded-lg p-8 text-center ${dark ? 'bg-blue-900/50 border border-blue-700' : 'bg-green-50 border border-green-200'}`}

        >

          <CheckCircle2 className={`w-12 h-12 mx-auto mb-4 ${dark ? 'text-green-400' : 'text-green-600'}`} />

          <h3 className={`text-xl font-bold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>

            Check your inbox!

          </h3>

          <p className={dark ? 'text-blue-200' : 'text-gray-600'}>

            Your 5-Minute Response Playbook is on its way. Check your email in the next few minutes.

          </p>

        </motion.div>

      );

    }



    const inputBase = dark

      ? 'w-full px-4 py-3 rounded-lg bg-blue-900/50 border border-blue-600 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent'

      : 'w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';



    const selectBase = dark

      ? 'w-full px-4 py-3 rounded-lg bg-blue-900/50 border border-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent'

      : 'w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';



    return (

      <form onSubmit={handleSubmit} id={id} className="space-y-4">

        <input

          type="text"

          placeholder="Your name"

          value={name}

          onChange={(e) => setName(e.target.value)}

          className={inputBase}

        />

        <input

          type="email"

          placeholder="Work email"

          value={email}

          onChange={(e) => setEmail(e.target.value)}

          className={inputBase}

        />

        <select

          value={businessType}

          onChange={(e) => setBusinessType(e.target.value)}

          className={`${selectBase} ${!businessType ? (dark ? 'text-blue-300' : 'text-gray-400') : ''}`}

        >

          <option value="" disabled>Select your business type</option>

          {businessTypes.map((t) => (

            <option key={t} value={t} className={dark ? 'bg-blue-950 text-white' : ''}>

              {t}

            </option>

          ))}

        </select>

        {error && (

          <div className="flex items-center gap-2 text-red-500 text-sm">

            <AlertTriangle className="w-4 h-4 flex-shrink-0" />

            <span>{error}</span>

          </div>

        )}

        <button

          type="submit"

          disabled={isSubmitting}

          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"

        >

          {isSubmitting ? (

            <>

              <Loader2 className="w-5 h-5 animate-spin" />

              Sending...

            </>

          ) : (

            <>

              Get the Free Playbook

              <ArrowRight className="w-5 h-5" />

            </>

          )}

        </button>

        <p className={`text-xs text-center ${dark ? 'text-blue-300' : 'text-gray-400'}`}>

          No spam. Unsubscribe anytime.

        </p>

      </form>

    );

  };



  // ── Stats data ──

  const stats = [

    {

      icon: TrendingUp,

      value: '391%',

      label: 'Higher conversion rate',

      detail: 'for sub-1-minute response',

    },

    {

      icon: DollarSign,

      value: '$312K',

      label: 'Additional annual revenue',

      detail: 'per rep from fast response',

    },

    {

      icon: PhoneOff,

      value: '85%',

      label: 'Of voicemail callers',

      detail: 'never call back',

    },

    {

      icon: Clock,

      value: '62%',

      label: 'Of unanswered callers',

      detail: 'contact a competitor instead',

    },

    {

      icon: Users,

      value: '37.8%',

      label: 'Of calls answered',

      detail: 'by a live person (industry avg)',

    },

    {

      icon: BarChart3,

      value: '$42,612',

      label: 'Annual savings',

      detail: 'AI receptionist vs human',

    },

  ];



  // ── What you'll learn ──

  const learnings = [

    {

      icon: Zap,

      title: 'Convert 391% More Leads',

      description: 'Respond in under 60 seconds and watch your lead conversion skyrocket. Get the exact workflow to make sub-1-minute response fully automatic — without adding headcount.',

    },

    {

      icon: PhoneOff,

      title: 'Stop Losing 85% of Voicemail Callers',

      description: 'When callers hit voicemail, 85% never call back. Recover that lost revenue by answering every call instantly — even after hours and on weekends.',

    },

    {

      icon: DollarSign,

      title: 'Save $42,612/Year vs. Human Staff',

      description: 'See the exact dollar-for-dollar comparison: AI handles every call at a fraction of the cost, while delivering faster responses than any human receptionist.',

    },

    {

      icon: BookOpen,

      title: 'Start Converting More Leads This Week',

      description: 'A step-by-step checklist to capture every lead and outpace your competition — set up in under 5 minutes, no coding or tech skills required.',

    },

  ];



  return (

    <div className="min-h-screen bg-white">

      <GiveawayBar />

      <Header />



      {/* ── HERO ── */}

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 pt-28 pb-16 lg:pt-36 lg:pb-24">

        {/* Background pattern */}

        <div className="absolute inset-0 opacity-10">

          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />

          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />

        </div>



        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: Copy */}

            <motion.div

              initial="hidden"

              animate="visible"

              variants={stagger}

            >

              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-800/60 border border-blue-600/40 text-blue-200 text-sm font-medium mb-6">

                <Clock className="w-4 h-4" />

                Free Playbook — No Credit Card Required

              </motion.div>



              <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 font-['Poppins']">

                The 5-Minute Response Playbook

              </motion.h1>



              <motion.p variants={fadeUp} className="text-lg sm:text-xl text-blue-200 mb-6 leading-relaxed">

                How local businesses are converting{' '}

                <span className="text-white font-bold">391% more leads</span>{' '}

                with sub-1-minute response

              </motion.p>



              {/* Hero stat callout */}

              <motion.div variants={fadeUp} className="flex items-center gap-4 p-4 rounded-lg bg-blue-800/50 border border-blue-600/30 mb-8">

                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">

                  <DollarSign className="w-7 h-7 text-white" />

                </div>

                <div>

                  <p className="text-2xl font-bold text-white">$312K</p>

                  <p className="text-blue-300 text-sm">additional annual revenue per rep from sub-1-minute response</p>

                </div>

              </motion.div>



              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 text-sm text-blue-300">

                <span className="flex items-center gap-1.5">

                  <CheckCircle2 className="w-4 h-4 text-blue-400" />

                  Increase lead conversion by 391%

                </span>

                <span className="flex items-center gap-1.5">

                  <CheckCircle2 className="w-4 h-4 text-blue-400" />

                  Recover $312K in lost revenue/year

                </span>

                <span className="flex items-center gap-1.5">

                  <CheckCircle2 className="w-4 h-4 text-blue-400" />

                  Stop losing leads to competitors today

                </span>

              </motion.div>

            </motion.div>



            {/* Right: Form */}

            <motion.div

              initial={{ opacity: 0, y: 20 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ duration: 0.6, delay: 0.3 }}

              className="bg-blue-900/40 backdrop-blur-sm border border-blue-700/50 rounded-xl p-6 sm:p-8"

            >

              <h2 className="text-xl font-bold text-white mb-1 font-['Poppins']">

                Get your free copy

              </h2>

              <p className="text-blue-300 text-sm mb-6">

                Instant delivery to your inbox

              </p>

              <LeadForm id="hero-form" dark />

            </motion.div>

          </div>

        </div>

      </section>



      {/* ── WHAT YOU'LL LEARN ── */}

      <section className="py-16 lg:py-24 bg-white">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div

            initial="hidden"

            whileInView="visible"

            viewport={{ once: true, margin: '-80px' }}

            variants={stagger}

            className="text-center mb-12"

          >

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 font-['Poppins']">

              What's Inside the Playbook

            </motion.h2>

            <motion.p variants={fadeUp} className="text-gray-600 text-lg max-w-2xl mx-auto">

              Everything you need to stop losing leads to slow response — backed by real data from 10,000+ businesses.

            </motion.p>

          </motion.div>



          <motion.div

            initial="hidden"

            whileInView="visible"

            viewport={{ once: true, margin: '-80px' }}

            variants={stagger}

            className="grid sm:grid-cols-2 gap-6"

          >

            {learnings.map((item, i) => (

              <motion.div

                key={i}

                variants={fadeUp}

                className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 hover:shadow-md transition-shadow"

              >

                <div className="flex items-start gap-4">

                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">

                    <item.icon className="w-6 h-6 text-blue-600" />

                  </div>

                  <div>

                    <h3 className="text-lg font-bold text-gray-900 mb-1 font-['Poppins']">

                      {item.title}

                    </h3>

                    <p className="text-gray-600 text-sm leading-relaxed">

                      {item.description}

                    </p>

                  </div>

                </div>

              </motion.div>

            ))}

          </motion.div>

        </div>

      </section>



      {/* ── STATS SECTION ── */}

      <section className="py-16 lg:py-24 bg-gray-50">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div

            initial="hidden"

            whileInView="visible"

            viewport={{ once: true, margin: '-80px' }}

            variants={stagger}

            className="text-center mb-12"

          >

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 font-['Poppins']">

              The Numbers Don't Lie

            </motion.h2>

            <motion.p variants={fadeUp} className="text-gray-600 text-lg max-w-2xl mx-auto">

              Every minute you wait to respond, you're losing money. Here's the data.

            </motion.p>

          </motion.div>



          <motion.div

            initial="hidden"

            whileInView="visible"

            viewport={{ once: true, margin: '-80px' }}

            variants={stagger}

            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"

          >

            {stats.map((stat, i) => (

              <motion.div

                key={i}

                variants={fadeUp}

                className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 text-center hover:shadow-md transition-shadow"

              >

                <div className="flex justify-center mb-3">

                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">

                    <stat.icon className="w-6 h-6 text-blue-600" />

                  </div>

                </div>

                <p className="text-3xl sm:text-4xl font-bold text-blue-600 mb-1 font-['Poppins']">

                  {stat.value}

                </p>

                <p className="text-gray-900 font-semibold text-sm">{stat.label}</p>

                <p className="text-gray-500 text-xs mt-1">{stat.detail}</p>

              </motion.div>

            ))}

          </motion.div>



          {/* 75% misallocating callout */}

          <motion.div

            initial="hidden"

            whileInView="visible"

            viewport={{ once: true, margin: '-80px' }}

            variants={fadeUp}

            className="mt-10 max-w-2xl mx-auto rounded-lg border-2 border-blue-200 bg-blue-50 p-6 text-center"

          >

            <p className="text-lg text-gray-900">

              <span className="font-bold text-blue-700 text-2xl">75%</span>{' '}

              of SMBs are investing in AI the wrong way.

            </p>

            <p className="text-gray-600 text-sm mt-2">

              They buy chatbots and tools before fixing the #1 problem: response time. This playbook shows you the right order.

            </p>

          </motion.div>

        </div>

      </section>




      {/* ── COMMON QUESTIONS ── */}
      <section id="common-questions" className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-10"
          >
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 font-['Poppins']">
              Common Questions
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-600">
              Straight answers to what business owners ask before downloading the playbook.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="space-y-3"
          >
            {[
              {
                q: "Isn't 5-minute response already good enough?",
                a: "It feels fast — but the data says otherwise. MIT research shows lead conversion rates drop 80% when response time goes from 1 minute to 5 minutes. The businesses winning today are responding in under 60 seconds, automatically.",
              },
              {
                q: "Do I need to hire more staff to respond this fast?",
                a: "No. The entire playbook is built around automation — specifically AI that answers every call and text the moment it comes in, day or night, without adding headcount. You set it up once and it runs.",
              },
              {
                q: "Will customers think they're talking to a robot?",
                a: "Modern AI voice technology sounds natural and professional. Most callers don't notice — and more importantly, they get an immediate, helpful response instead of voicemail. That's what drives bookings.",
              },
              {
                q: "What if I only get a few calls a week?",
                a: "Every missed call is a percentage of your revenue. If even one call per week converts to a $500 job, you're looking at $26,000 a year. The playbook helps you capture every one of those calls reliably.",
              },
              {
                q: "Is this playbook actually free — what's the catch?",
                a: "Yes, completely free. We built it because businesses that solve their speed-to-lead problem first get far more value from every other marketing tool they use. That's good for them, and good for us.",
              },
            ].map(({ q, a }, i) => (
              <motion.details
                key={i}
                variants={fadeUp}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <summary
                  className="font-semibold text-gray-900 px-5 py-4 cursor-pointer"
                  style={{ listStyle: 'none' }}
                >
                  {q}
                </summary>
                <p className="text-gray-600 px-5 pb-4 text-sm leading-relaxed">{a}</p>
              </motion.details>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── BOTTOM CTA FORM ── */}

      <section className="py-16 lg:py-24 bg-white">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="max-w-lg mx-auto">

            <motion.div

              initial="hidden"

              whileInView="visible"

              viewport={{ once: true, margin: '-80px' }}

              variants={stagger}

              className="text-center mb-8"

            >

              <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 font-['Poppins']">

                Stop Losing Leads to Slow Response

              </motion.h2>

              <motion.p variants={fadeUp} className="text-gray-600">

                Get the free playbook and start converting more leads this week.

              </motion.p>

            </motion.div>



            <motion.div

              initial={{ opacity: 0, y: 20 }}

              whileInView={{ opacity: 1, y: 0 }}

              viewport={{ once: true, margin: '-80px' }}

              transition={{ duration: 0.6 }}

            >

              <LeadForm id="bottom-form" />

            </motion.div>

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

      {/* What This Tool Covers */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What This Playbook Covers</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Six strategies to respond to every lead within 5 minutes and dramatically increase close rates</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: 'The 391% Conversion Rule', desc: 'Why responding within 60 seconds multiplies your close rate by 4x' },
            { label: 'Instant SMS Templates', desc: 'Word-for-word text scripts to send the moment a lead submits a form' },
            { label: 'After-Hours Automation', desc: 'How to capture and respond to evening and weekend leads automatically' },
            { label: 'Voicemail Recovery Sequences', desc: 'Follow-up cadence to re-engage leads who miss your first callback' },
            { label: 'CRM Speed-to-Lead Setup', desc: 'Workflow configuration to alert your team the instant a lead arrives' },
            { label: '30-Day Implementation Plan', desc: 'Step-by-step checklist to deploy all five strategies in one month' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5-Minute Response: Impact Data Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">5-Minute Response Impact: Before and After Data</h2>
          <p className="text-gray-500 text-sm text-center mb-6">What businesses typically see when they reduce response time to under 5 minutes</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Before (47-min avg response)</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">After (5-min response)</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Improvement</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Lead qualification rate', '22%', '56%', '+155%'],
                  ['Appointment booking rate', '18%', '45%', '+150%'],
                  ['After-hours lead capture', '0%', '100%', 'Infinite uplift'],
                  ['No-show rate', '22%', '10%', '-55%'],
                  ['Monthly revenue from leads', 'Baseline', '+3.9x baseline', '+290%'],
                  ['Google review requests sent/month', '0–2', '12–18', '+900%'],
                ].map(([metric, before, after, improvement]) => (
                  <tr key={metric} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{metric}</td>
                    <td className="px-4 py-3 text-red-600">{before}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{after}</td>
                    <td className="px-4 py-3 text-green-700 font-semibold">{improvement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">Based on Boltcall customer data and Lead Response Management study benchmarks.</p>
        </div>
      </section>
      <Footer />

    </div>

  );

};



export default FiveMinuteResponsePlaybook;

