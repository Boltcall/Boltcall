import React, { useState, useEffect } from 'react';

import { updateMetaDescription } from '../lib/utils';

import { createServiceSchema, injectSchemas } from '../lib/schema';

import { motion } from 'framer-motion';

import {

  Search, Globe, BarChart3, AlertCircle, Loader, Mail,

  FileText, Bot, Shield, Sparkles, CheckCircle2, Loader2,

} from 'lucide-react';

import Header from '../components/Header';

import Footer from '../components/Footer';

import GiveawayBar from '../components/GiveawayBar';

import FAQ from '../components/FAQ';

import Breadcrumbs from '../components/Breadcrumbs';

import { useNavigate } from 'react-router-dom';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { getStoredAttributionUid } from '../hooks/useAttributionCapture';



// ── Loading step messages ──

const loadingSteps = [

  { icon: Globe, text: 'Crawling your website...' },

  { icon: Search, text: 'Analyzing on-page SEO...' },

  { icon: Shield, text: 'Checking technical SEO...' },

  { icon: Bot, text: 'Evaluating AEO readiness...' },

  { icon: Sparkles, text: 'AI writing your report...' },

  { icon: FileText, text: 'Generating branded PDF...' },

];

const aeoLaunchPhases = [
  {
    phase: 'Foundation',
    date: 'Before launch',
    items: [
      'Canonical llms.txt, robots.txt, sitemap, schema, and pricing facts stay aligned.',
      'Directory copy uses one category: AI speed-to-lead platform for local service businesses.',
      'Screenshots, demo script, logo files, founder bio, and review request copy are ready.',
    ],
  },
  {
    phase: 'Launch day',
    date: 'June 1',
    items: [
      'Launch Product Hunt first, then submit startup and AI-tool directories.',
      'Publish LinkedIn, X, YouTube, Indie Hackers, and value-first Reddit posts.',
      'Submit G2, Capterra, SourceForge, AlternativeTo, and SaaSHub profiles.',
    ],
  },
  {
    phase: 'Follow-up',
    date: 'Days 2-7',
    items: [
      'Track approvals, live URLs, blockers, reviews, and AI-search visibility queries.',
      'Start Azure Marketplace, AWS, Google Cloud, HubSpot, Zapier, Make, and vertical partner flows.',
      'Turn launch objections into FAQs, comparison pages, and AEO answer blocks.',
    ],
  },
];

const aeoLaunchChannels = [
  {
    group: 'P0 launch surfaces',
    targets: ['Product Hunt', 'Uneed', 'BetaList', 'Launching Next', 'LinkedIn', 'YouTube'],
  },
  {
    group: 'Review and comparison',
    targets: ['G2', 'Capterra', 'GetApp', 'SourceForge', 'AlternativeTo', 'SaaSHub'],
  },
  {
    group: 'AI directories',
    targets: ['There Is An AI For That', 'Futurepedia', 'Toolify', 'FutureTools', 'TopAI.tools'],
  },
  {
    group: 'Marketplaces',
    targets: ['Microsoft/Azure', 'AWS', 'Google Cloud', 'HubSpot', 'Zapier', 'Make', 'Pipedrive'],
  },
  {
    group: 'Communities',
    targets: ['Reddit smallbusiness', 'sweatystartup', 'SaaS', 'sales', 'HVAC', 'Plumbing', 'legaltech'],
  },
];

const aeoWorkSplit = [
  {
    owner: 'Codex can do',
    items: [
      'Keep technical AEO files, schema, sitemap, and copy consistent.',
      'Prepare submission copy, launch posts, screenshots checklist, and tracking rows.',
      'Fill forms when a logged-in session is available and no 2FA, KYC, billing, or legal approval is required.',
      'Monitor listings and search visibility, then turn questions into new FAQ or blog content.',
    ],
  },
  {
    owner: 'Founder must do',
    items: [
      'Log in, handle 2FA, identity checks, billing, marketplace KYC, and final submit approvals.',
      'Post from personal LinkedIn, X, Reddit, Product Hunt, and YouTube accounts.',
      'Approve claims about customers, revenue, integrations, testimonials, and paid upgrades.',
      'Ask real users or testers for honest reviews where each platform allows it.',
    ],
  },
];



const WEBHOOK_URL = 'https://n8n.srv974118.hstgr.cloud/webhook/seo-aeo-audit';



const SEOAuditPDF: React.FC = () => {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What does a free SEO and AEO audit include?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Boltcall\'s free SEO and AEO audit checks your website for on-page SEO, technical SEO, AI Engine Optimization (AEO) readiness, schema markup, page speed, and content quality. You receive a branded PDF report with scores and a prioritized action plan.',
          },
        },
        {
          '@type': 'Question',
          name: 'How quickly will I receive my SEO audit PDF?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Your SEO and AEO audit PDF is generated in 2–3 minutes after you enter your website URL. The report is sent to your email and also available for immediate download.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is AEO and why does it matter for my website?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'AEO (AI Engine Optimization) is the practice of optimizing your website to appear as a cited source in AI-generated answers from tools like ChatGPT, Perplexity, and Google\'s AI Overviews. As more searches are answered by AI, AEO is becoming as important as traditional SEO.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Free SEO & AEO Audit PDF Report Tool',
      url: 'https://boltcall.org/seo-aeo-audit',
      applicationCategory: 'BusinessApplication',
      isAccessibleForFree: true,
      description: 'Free SEO and AEO audit tool that analyzes your website and generates a branded PDF report with scores, keyword insights, and action items.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ]);

  const navigate = useNavigate();

  const [url, setUrl] = useState('');

  const [email, setEmail] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const [error, setError] = useState('');



  useEffect(() => {

    document.title = 'Free SEO & AEO Audit Tool - Get Your PDF Report | Boltcall';

    updateMetaDescription(

      'Enter your URL for a free SEO and AEO (AI Engine Optimization) audit. Get a branded PDF report with scores, keyword rankings, and an action plan.'

    );



    // Add BreadcrumbList JSON-LD

    const breadcrumbScript = document.createElement('script');

    breadcrumbScript.type = 'application/ld+json';

    breadcrumbScript.id = 'breadcrumb-jsonld';

    breadcrumbScript.text = JSON.stringify({

      "@context": "https://schema.org",

      "@type": "BreadcrumbList",

      "itemListElement": [

        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },

        { "@type": "ListItem", "position": 2, "name": "SEO & AEO Audit", "item": "https://boltcall.org/seo-aeo-audit" }

      ]

    });

    document.head.appendChild(breadcrumbScript);



    const cleanupService = injectSchemas([

      createServiceSchema({

        name: 'Free SEO & AEO Audit',

        description: 'A free SEO and AEO (AI Engine Optimization) audit tool that analyzes your website and delivers a branded PDF report with scores, keyword rankings, and a prioritized action plan.',

        url: '/seo-aeo-audit',

      }),

    ]);




    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => {
      document.getElementById('person-schema')?.remove();

      const bc = document.getElementById('breadcrumb-jsonld');

      if (bc) bc.remove();

      cleanupService();

    };

  }, []);



  // Animate loading steps

  useEffect(() => {

    if (!isAnalyzing) return;

    const interval = setInterval(() => {

      setLoadingStepIndex((prev) => {

        if (prev >= loadingSteps.length - 1) {

          clearInterval(interval);

          return prev;

        }

        return prev + 1;

      });

    }, 4000);

    return () => clearInterval(interval);

  }, [isAnalyzing]);



  const validateUrl = (urlString: string): boolean => {

    try {

      const urlObj = new URL(urlString);

      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';

    } catch {

      return false;

    }

  };



  const validateEmail = (emailString: string): boolean => {

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(emailString);

  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    setError('');



    if (!url.trim()) {

      setError('Please enter a website URL');

      return;

    }

    if (!email.trim()) {

      setError('Please enter your email address');

      return;

    }

    if (!validateEmail(email.trim())) {

      setError('Please enter a valid email address');

      return;

    }



    let formattedUrl = url.trim();

    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {

      formattedUrl = 'https://' + formattedUrl;

    }

    if (!validateUrl(formattedUrl)) {

      setError('Please enter a valid URL (e.g., example.com)');

      return;

    }



    setIsAnalyzing(true);

    setLoadingStepIndex(0);



    try {

      const response = await fetch(WEBHOOK_URL, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          url: formattedUrl,

          email: email.trim(),

          ref: getStoredAttributionUid(),

        }),

      });



      if (!response.ok) throw new Error('Submission failed');



      // Brief pause so loading animation feels complete

      await new Promise((r) => setTimeout(r, 2000));

      navigate('/seo-aeo-audit/thank-you');

    } catch {

      setError('Something went wrong. Please try again.');

      setIsAnalyzing(false);

    }

  };



  // ── Loading screen ──

  if (isAnalyzing) {

    return (

      <div className="min-h-screen bg-white">

        <GiveawayBar />

        <Header />

        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">

          <div className="max-w-md mx-auto text-center">

            <motion.div

              initial={{ opacity: 0, scale: 0.9 }}

              animate={{ opacity: 1, scale: 1 }}

              transition={{ duration: 0.5 }}

            >

              <div className="flex justify-center mb-8">

                <motion.div

                  animate={{ rotate: 360 }}

                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}

                >

                  <Loader2 className="w-16 h-16 text-blue-600" />

                </motion.div>

              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">

                Generating Your SEO & AEO Report...

              </h2>

              <p className="text-gray-500 mb-10">

                Our AI is analyzing your website right now. This takes 2-3 minutes.

              </p>



              <div className="space-y-3 text-left">

                {loadingSteps.map((step, idx) => {

                  const Icon = step.icon;

                  const isDone = idx < loadingStepIndex;

                  const isActive = idx === loadingStepIndex;

                  return (

                    <motion.div

                      key={idx}

                      initial={{ opacity: 0, x: -10 }}

                      animate={{

                        opacity: idx <= loadingStepIndex ? 1 : 0.3,

                        x: 0,

                      }}

                      transition={{ delay: idx * 0.1, duration: 0.3 }}

                      className={`flex items-center gap-3 p-3 rounded-lg ${

                        isActive

                          ? 'bg-blue-50 border border-blue-200'

                          : isDone

                          ? 'bg-green-50'

                          : 'bg-gray-50'

                      }`}

                    >

                      {isDone ? (

                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />

                      ) : isActive ? (

                        <motion.div

                          animate={{ rotate: 360 }}

                          transition={{

                            duration: 1,

                            repeat: Infinity,

                            ease: 'linear',

                          }}

                        >

                          <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0" />

                        </motion.div>

                      ) : (

                        <Icon className="w-5 h-5 text-gray-300 flex-shrink-0" />

                      )}

                      <span

                        className={`text-sm font-medium ${

                          isActive

                            ? 'text-blue-700'

                            : isDone

                            ? 'text-green-700'

                            : 'text-gray-400'

                        }`}

                      >

                        {step.text}

                      </span>

                    </motion.div>

                  );

                })}

              </div>

            </motion.div>

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

      </div>

    );

  }



  // ── Main form ──

  return (

    <div className="min-h-screen bg-white">

      <GiveawayBar />

      <Header />



      {/* Hero */}

      <section className="relative pt-32 pb-4 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <Breadcrumbs />

          <motion.div

            initial={{ opacity: 0, y: 20 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ duration: 0.6 }}

            className="text-center mb-4"

          >

            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-4">

              <FileText className="w-4 h-4" />

              <span className="font-semibold">Free PDF Report</span>

            </div>



            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">

              SEO & <span className="text-blue-600">AEO</span> Audit Report

            </h1>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-2">

              Get a professional 6-page PDF analyzing your website for both search engines and AI answer engines.

            </p>

            <p className="text-gray-500 max-w-xl mx-auto">

              Improve your website's visibility with a comprehensive 30-factor SEO analysis — uncover what's costing you traffic and get a prioritized action plan to rank higher and get found by AI answer engines.

            </p>

          </motion.div>

        </div>

      </section>



      {/* Benefit-Focused Bullets */}

      <section className="py-10 bg-white">

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Get</h2>

          <ul className="space-y-3">

            {[

              "Get a personalized report identifying exactly why AI can't find you",

              "Discover which keywords your competitors rank for that you're missing",

              "Fix 10+ technical issues that suppress your visibility",

              "Appear in ChatGPT and Perplexity searches within weeks",

              "Actionable recommendations you can implement today",

            ].map((benefit, i) => (

              <li key={i} className="flex items-start gap-3">

                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mt-0.5">✓</span>

                <span className="text-gray-700">{benefit}</span>

              </li>

            ))}

          </ul>

        </div>

      </section>



      {/* What's Included */}

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">

          {[

            { icon: Search, label: 'Rank Higher on Google', desc: 'Fix meta tags, headings & content to drive more traffic' },

            { icon: Shield, label: 'Remove Technical Barriers', desc: 'Speed, SSL & sitemap issues costing you visitors' },

            { icon: Bot, label: 'Get Found by AI Engines', desc: 'Score your readiness for AI-driven search results' },

            { icon: BarChart3, label: 'Unlock Rich Results', desc: 'Structured data that wins more clicks from search' },

            { icon: Sparkles, label: 'Expert Insights, Instantly', desc: 'AI analysis of exactly what to fix first' },

            { icon: FileText, label: 'A Clear Growth Roadmap', desc: 'Week-by-week steps to measurably improve rankings' },

          ].map((item) => (

            <motion.div

              key={item.label}

              initial={{ opacity: 0, y: 10 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ duration: 0.4 }}

              className="bg-white border border-gray-200 rounded-xl p-4 text-center"

            >

              <item.icon className="w-6 h-6 text-blue-600 mx-auto mb-2" />

              <div className="text-sm font-semibold text-gray-900">{item.label}</div>

              <div className="text-xs text-gray-500">{item.desc}</div>

            </motion.div>

          ))}

        </div>

      </section>



      {/* How It Works — What We Analyze */}

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">

        <motion.div

          initial={{ opacity: 0, y: 20 }}

          animate={{ opacity: 1, y: 0 }}

          transition={{ duration: 0.6, delay: 0.1 }}

        >

          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">

            What Is AEO — And Why Does It Matter for Your Business?

          </h2>



          <div className="prose prose-gray max-w-none space-y-4 text-gray-700 leading-relaxed mb-10">

            <p>

              Search Engine Optimization (SEO) focuses on ranking in Google's traditional blue-link results.

              AI Engine Optimization (AEO) is the emerging discipline of making your business visible inside

              AI-powered answer engines — ChatGPT, Google's AI Overviews, Perplexity, and Bing Copilot.

              These AI surfaces now answer millions of local business queries every day, and the businesses

              that appear in those answers get calls, bookings, and leads without paying for ads.

            </p>

            <p>

              Most local businesses have never been audited for AEO readiness. They may rank reasonably well

              on traditional Google search, yet be completely invisible when a potential customer asks an AI

              assistant "who is the best plumber near me?" or "which dentist accepts Delta Dental in Austin?"

              Our audit scores your site on both dimensions — giving you a complete picture of your current

              visibility and a prioritized list of what to fix first.

            </p>

            <p>

              The free PDF report we generate covers 30 factors across six categories: on-page SEO health,

              technical performance, structured data and rich results eligibility, content quality and

              topical authority, local signals (NAP consistency, Google Business Profile alignment), and

              AEO readiness indicators like FAQ schema, conversational content structure, and entity markup.

              Most businesses discover 8 to 15 fixable issues they were unaware of — and fixing even half

              of them typically moves the revenue needle within 60 to 90 days.

            </p>

          </div>



          <div className="grid sm:grid-cols-3 gap-5 mb-10">

            {[

              {

                title: 'Step 1: Enter Your URL',

                desc: 'We crawl your website the same way Google and AI engines do — analyzing every page, heading, link, and metadata tag in real time.',

              },

              {

                title: 'Step 2: AI Writes Your Report',

                desc: 'Our AI cross-references your site data against 30 ranking factors and writes a plain-English analysis with specific, actionable recommendations.',

              },

              {

                title: 'Step 3: Get Your PDF',

                desc: 'A branded 6-page PDF arrives in your inbox within minutes — with a priority action plan ranked by potential traffic impact so you know exactly where to start.',

              },

            ].map((step) => (

              <div key={step.title} className="bg-blue-50 rounded-xl p-5 border border-blue-100">

                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>

                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>

              </div>

            ))}

          </div>

        </motion.div>

      </section>



      {/* Form */}

      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        <motion.div

          initial={{ opacity: 0, y: 20 }}

          animate={{ opacity: 1, y: 0 }}

          transition={{ duration: 0.6, delay: 0.2 }}

        >

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-8">

            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">

              Get Your Free Report

            </h2>

            <p className="text-sm text-gray-500 mb-6 text-center">

              Enter your website URL and we'll deliver a PDF to your inbox

            </p>



            <form onSubmit={handleSubmit} className="space-y-4">

              {/* URL */}

              <div>

                <label

                  htmlFor="audit-url"

                  className="block text-sm font-medium text-gray-700 mb-1.5"

                >

                  Website URL

                </label>

                <div className="relative">

                  <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />

                  <input

                    type="text"

                    id="audit-url"

                    value={url}

                    onChange={(e) => setUrl(e.target.value)}

                    placeholder="https://example.com"

                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"

                    disabled={isAnalyzing}

                  />

                </div>

              </div>



              {/* Email */}

              <div>

                <label

                  htmlFor="audit-email"

                  className="block text-sm font-medium text-gray-700 mb-1.5"

                >

                  Email Address

                </label>

                <div className="relative">

                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />

                  <input

                    type="email"

                    id="audit-email"

                    value={email}

                    onChange={(e) => setEmail(e.target.value)}

                    placeholder="you@company.com"

                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"

                    disabled={isAnalyzing}

                  />

                </div>

                <p className="text-xs text-gray-400 mt-1.5">

                  Your branded PDF report will be sent to this email

                </p>

              </div>



              {/* Error */}

              {error && (

                <motion.div

                  initial={{ opacity: 0, y: -10 }}

                  animate={{ opacity: 1, y: 0 }}

                  className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2"

                >

                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />

                  <p className="text-red-800 text-sm">{error}</p>

                </motion.div>

              )}



              {/* Submit */}

              <button

                type="submit"

                disabled={isAnalyzing || !url.trim() || !email.trim()}

                className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold text-base"

              >

                {isAnalyzing ? (

                  <>

                    <Loader className="w-5 h-5 animate-spin" />

                    Analyzing...

                  </>

                ) : (

                  <>

                    <FileText className="w-5 h-5" />

                    Generate My Free Report

                  </>

                )}

              </button>



              <p className="text-xs text-center text-gray-400">

                Free · No credit card · Report delivered in ~5 minutes

              </p>

            </form>

          </div>

        </motion.div>

      </section>


      {/* Boltcall AEO Launch Campaign */}
      <section className="bg-slate-950 py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-200 bg-blue-500/15 border border-blue-400/20 px-3 py-1.5 rounded-full mb-4">
                <Bot className="w-4 h-4" />
                Boltcall campaign workspace
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                AEO Launch Campaign
              </h2>
              <p className="text-slate-300 max-w-2xl">
                One organized campaign for making Boltcall discoverable in ChatGPT, Perplexity,
                Google AI Overviews, software directories, launch communities, and marketplaces.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              Primary category: <span className="font-semibold text-white">AI speed-to-lead platform</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {aeoLaunchPhases.map((phase) => (
              <div key={phase.phase} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="font-semibold text-white">{phase.phase}</h3>
                  <span className="text-xs font-medium text-blue-100 bg-blue-500/20 px-2.5 py-1 rounded-full">
                    {phase.date}
                  </span>
                </div>
                <ul className="space-y-3">
                  {phase.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="font-semibold text-white mb-4">Submission lanes</h3>
              <div className="space-y-4">
                {aeoLaunchChannels.map((channel) => (
                  <div key={channel.group}>
                    <div className="text-sm font-semibold text-blue-100 mb-2">{channel.group}</div>
                    <div className="flex flex-wrap gap-2">
                      {channel.targets.map((target) => (
                        <span key={target} className="text-xs text-slate-200 border border-white/10 bg-white/5 rounded-full px-3 py-1">
                          {target}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="font-semibold text-white mb-4">Execution split</h3>
              <div className="space-y-5">
                {aeoWorkSplit.map((column) => (
                  <div key={column.owner}>
                    <div className="text-sm font-semibold text-blue-100 mb-2">{column.owner}</div>
                    <ul className="space-y-2">
                      {column.items.map((item) => (
                        <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-blue-300/20 bg-blue-500/10 p-5">
            <h3 className="font-semibold text-white mb-2">Canonical listing copy</h3>
            <p className="text-sm leading-relaxed text-blue-50">
              Boltcall is an AI speed-to-lead platform for local service businesses. It answers
              calls, replies to web and ad leads, qualifies prospects, books appointments, sends
              reminders, and follows up automatically so plumbers, HVAC companies, dentists, law
              firms, med spas, roofers, solar installers, and other local operators respond before
              competitors do.
            </p>
          </div>
        </div>
      </section>




      {/* Boltcall Plans at a Glance */}
      <section className="my-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Boltcall Plans at a Glance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="py-3 px-4 text-left rounded-tl-xl">Feature</th>
                <th className="py-3 px-4 text-center">Starter</th>
                <th className="py-3 px-4 text-center">Pro</th>
                <th className="py-3 px-4 text-center rounded-tr-xl">Scale</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["AI Receptionist calls", "500/mo", "2,000/mo", "Unlimited"],
                ["Lead capture (SMS/email)", "\u2713", "\u2713", "\u2713"],
                ["CRM integrations", "\u2014", "\u2713", "\u2713"],
                ["Custom AI voice & script", "\u2713", "\u2713", "\u2713"],
                ["Priority support", "\u2014", "\u2014", "\u2713"],
              ].map(([feat, ...vals], i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="py-3 px-4 font-medium text-gray-800">{feat}</td>
                  {vals.map((v, j) => <td key={j} className="py-3 px-4 text-center text-gray-600">{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Social Proof */}

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Trusted by Local Business Owners</h2>

        <p className="text-gray-500 text-center mb-8 text-sm">Join 500+ businesses using Boltcall to capture more leads and grow revenue.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {[

            { quote: "The SEO & AEO report showed me exactly why my site wasn't showing up in AI search results. After following the action plan, we started appearing in Google's AI Overviews within 6 weeks.", name: "Lisa M.", role: "Roofing Company Owner, Ohio" },

            { quote: "I had no idea AEO was even a thing. The PDF explained it clearly and gave me step-by-step fixes. My web developer loved how specific the recommendations were.", name: "Carlos R.", role: "HVAC Business Owner, Texas" },

            { quote: "I've paid for SEO audits that gave me less than this free report. The structured data recommendations alone were worth it — we're now getting rich results on Google.", name: "Janet K.", role: "Dental Practice Manager, Georgia" },

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

      <section className="bg-gray-50 border-t border-gray-100 py-8 mb-8">

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">

            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /><span>100% Free — no credit card required</span></div>

            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Used by 500+ local businesses</span></div>

            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /><span>PDF report delivered in ~5 minutes</span></div>

            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Your data is never sold or shared</span></div>

          </div>

        </div>

      </section>



      {/* Objection Handling */}

      <section id="objections" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">

          Questions About Your SEO Audit Report

        </h2>

        <p className="text-gray-500 text-center mb-8 text-sm">

          Straight answers to the things people wonder before requesting the report.

        </p>

        <div className="space-y-3">

          {[

            {

              q: 'How accurate is the audit?',

              a: 'Our audit pulls live data from Google Search Console signals, citation databases, and mobile performance APIs. It reflects your real-world online presence.',

            },

            {

              q: "What if I don't have a website?",

              a: 'The audit still covers your Google Business Profile, citation consistency, review scores, and phone response rate — all critical for local visibility.',

            },

            {

              q: 'Will this turn into a sales pitch?',

              a: "No. The report is yours to keep and act on however you choose. We may follow up once — that's it.",

            },

            {

              q: 'How long does it take to get the report?',

              a: 'The PDF report is typically delivered within 24–48 business hours via email.',

            },

            {

              q: 'What if my scores are already good?',

              a: "Great news — the report will confirm it. And we'll show you what your competitors are doing to pull ahead.",

            },

          ].map(({ q, a }) => (

            <details

              key={q}

              className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden"

            >

              <summary

                className="font-semibold text-gray-900 px-5 py-4 cursor-pointer"

                style={{ listStyle: 'none' }}

              >

                {q}

              </summary>

              <p className="text-gray-600 px-5 pb-4 text-sm">{a}</p>

            </details>

          ))}

        </div>

      </section>



      <FAQ />

      <Footer />

    </div>

  );

};



export default SEOAuditPDF;

