import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, DollarSign, Star, Phone, MessageSquare } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA, { COMPARISON_CTA } from '../components/FinalCTA';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';

const CompareBoltcallVsBirdeye: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Boltcall vs Birdeye: AI Receptionist vs Reputation Management (2026)';
    updateMetaDescription("Boltcall vs Birdeye compared. See how Boltcall's AI receptionist compares to Birdeye's reputation management platform for local businesses.");

    // Article schema
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Boltcall vs Birdeye: AI Receptionist vs Reputation Platform (2026)",
      "description": "Boltcall vs Birdeye compared. See how Boltcall's AI receptionist compares to Birdeye's reputation management platform for local businesses.",
      "author": {
        "@type": "Organization",
        "name": "Boltcall"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Boltcall",
        "logo": {
          "@type": "ImageObject",
          "url": "https://boltcall.org/boltcall_full_logo.png"
        }
      },
      "datePublished": "2026-03-21",
      "dateModified": "2026-03-21",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/compare/boltcall-vs-birdeye"
      },
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg"
      }
    };

    // FAQ schema
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is Birdeye or Boltcall better for Google reviews?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Birdeye is the stronger choice if review management is your primary need. It offers multi-channel review campaigns, NFC tap cards, and listings management across 50+ directories. Boltcall includes AI-assisted review generation after every call or appointment, but its core strength is AI phone answering and speed-to-lead, not review volume at scale."
          }
        },
        {
          "@type": "Question",
          "name": "Does Birdeye have an AI phone receptionist?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Birdeye offers webchat, messaging, and text-based AI, but it does not provide a dedicated AI phone receptionist that answers calls 24/7, qualifies callers, and books appointments over the phone. This is Boltcall's core feature."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use both Boltcall and Birdeye?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Many local businesses pair Boltcall for AI phone answering and lead capture with Birdeye for reputation and listings management. The two platforms solve different problems and complement each other well."
          }
        },
        {
          "@type": "Question",
          "name": "Which is more affordable for a small business?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Birdeye's Standard plan starts at approximately $299/month, while Boltcall starts at $389/month for the full AI receptionist package including a free website. However, Boltcall bundles AI phone answering, chatbot, website, and speed-to-lead into one price, whereas Birdeye charges more for advanced tiers with AI features. Total cost depends on which features you actually need."
          }
        }
      ]
    };

    const existingArticle = document.getElementById('article-schema');
    if (existingArticle) existingArticle.remove();
    const existingFaq = document.getElementById('faq-schema');
    if (existingFaq) existingFaq.remove();

    const articleScript = document.createElement('script');
    articleScript.id = 'article-schema';
    articleScript.type = 'application/ld+json';
    articleScript.text = JSON.stringify(articleSchema);
    document.head.appendChild(articleScript);

    const faqScript = document.createElement('script');
    faqScript.id = 'faq-schema';
    faqScript.type = 'application/ld+json';
    faqScript.text = JSON.stringify(faqSchema);
    document.head.appendChild(faqScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Comparisons", "item": "https://boltcall.org/comparisons"}, {"@type": "ListItem", "position": 3, "name": "Boltcall vs Birdeye", "item": "https://boltcall.org/compare/boltcall-vs-birdeye"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      const s1 = document.getElementById('article-schema');
      if (s1) s1.remove();
      const s2 = document.getElementById('faq-schema');
      if (s2) s2.remove();
    };
  }, []);

  const comparisonData = [
    { feature: 'Starting Price', boltcall: '$389/mo', birdeye: '$299/mo (Standard)', boltcallWin: false },
    { feature: 'AI Phone Receptionist', boltcall: 'Yes, 24/7', birdeye: 'No', boltcallWin: true },
    { feature: 'AI Chatbot', boltcall: 'Yes, included', birdeye: 'Yes, Webchat', boltcallWin: null },
    { feature: 'Review Management', boltcall: 'Yes, automated', birdeye: 'Yes, core feature', boltcallWin: null },
    { feature: 'Review Generation', boltcall: 'Yes, AI-assisted', birdeye: 'Yes, campaigns + NFC', boltcallWin: null },
    { feature: 'Listings Management', boltcall: 'No', birdeye: 'Yes, 50+ directories', boltcallWin: false },
    { feature: 'Speed-to-Lead', boltcall: 'Yes, <60 seconds', birdeye: 'Limited', boltcallWin: true },
    { feature: 'Appointment Booking', boltcall: 'Yes', birdeye: 'Yes', boltcallWin: null },
    { feature: 'Surveys & Feedback', boltcall: 'No', birdeye: 'Yes', boltcallWin: false },
    { feature: 'Website Builder', boltcall: 'Yes, free', birdeye: 'No', boltcallWin: true },
    { feature: 'Setup Time', boltcall: '24 hours', birdeye: 'Days-weeks', boltcallWin: true },
    { feature: 'Best For', boltcall: 'AI phone + lead capture', birdeye: 'Reviews + reputation', boltcallWin: null },
  ];

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      {/* Hero Section */}
      <section className="relative pt-32 pb-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl px-4 sm:px-6 lg:px-8" style={{ marginLeft: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left mb-4"
          >
            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-6">
              <Star className="w-4 h-4" />
              <span className="font-semibold">Product Comparison</span>
            </div>
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: 'Boltcall vs Birdeye', href: '/compare/boltcall-vs-birdeye' }
            ]} />

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              <span className="text-blue-600">Boltcall vs Birdeye</span>: AI Receptionist vs Reputation Platform
            </h1>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span>March 21, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>12 min read</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">

        {/* AEO Direct Answer Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-blue-50 border-l-4 border-blue-600 rounded-r-lg p-6 mb-12"
        >
          <p className="text-lg text-gray-800 leading-relaxed font-medium">
            <strong>Quick answer:</strong> Boltcall is an AI receptionist platform that answers calls, captures leads, and automates follow-ups for local businesses at $389/month. Birdeye is a reputation management platform focused on reviews, listings, and customer experience starting at $299/month. Choose Boltcall for AI phone answering and speed-to-lead. Choose Birdeye for review management at scale.
          </p>
        </motion.div>

        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="prose prose-lg max-w-none mb-12"
        >
          <p className="text-xl text-gray-700 leading-relaxed">
            If you're a local business owner shopping for software to grow your business, you've probably come across both Boltcall and Birdeye. They look similar on the surface: both serve local businesses, both mention AI, and both promise more customers. But dig deeper and you'll find they solve fundamentally different problems.
          </p>
          <p className="text-gray-700 leading-relaxed mt-4">
            Boltcall is built around an AI phone receptionist that answers every call, qualifies leads in real time, and books appointments before the caller hangs up. Birdeye is built around reputation management: collecting Google reviews, managing business listings, and monitoring customer sentiment across the web.
          </p>
          <p className="text-gray-700 leading-relaxed mt-4">
            This comparison breaks down exactly where each platform wins, where it falls short, and which one makes sense for your business. No fluff, no affiliate tricks. Just the facts.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Feature-by-Feature Comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Feature</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-blue-700">Boltcall</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Birdeye</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">{row.feature}</td>
                    <td className={`border border-gray-200 px-4 py-3 ${row.boltcallWin === true ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}>
                      <span className="flex items-center gap-2">
                        {row.boltcall.startsWith('Yes') && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                        {row.boltcall === 'No' && <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                        {row.boltcall}
                      </span>
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 ${row.boltcallWin === false ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
                      <span className="flex items-center gap-2">
                        {row.birdeye.startsWith('Yes') && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                        {row.birdeye === 'No' && <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                        {row.birdeye}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Core Difference */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            The Core Difference
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              The simplest way to understand these two platforms: <strong className="text-gray-900">Boltcall catches leads before they slip away. Birdeye builds your reputation after you've served them.</strong>
            </p>
            <p>
              When a potential customer calls your business and nobody answers, that lead is gone. Studies show 80% of callers won't leave a voicemail, and 62% of calls to small businesses go unanswered. Boltcall exists to solve this exact problem. Its AI receptionist picks up every call within two rings, has a natural conversation with the caller, qualifies them, and books an appointment on your calendar, all without you lifting a finger.
            </p>
            <p>
              Birdeye, on the other hand, focuses on what happens after you've already won the customer. It automates review requests, monitors your online reputation, manages your listings on Google, Yelp, Facebook, and dozens of other directories, and gives you tools to understand customer sentiment. It's a post-service platform, not a lead-capture platform.
            </p>
            <p>
              These are complementary functions, not competing ones. But if you have to choose one, the question is simple: is your bigger problem <em>losing leads</em> or <em>lacking reviews</em>?
            </p>
          </div>
        </motion.section>

        {/* Pricing */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Pricing Breakdown
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Boltcall Pricing */}
            <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Boltcall</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700"><strong>Core:</strong> $389/mo (website + AI receptionist + chatbot)</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700"><strong>SEO:</strong> $489/mo (adds local SEO management)</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700"><strong>AI Full:</strong> $799/mo (everything included)</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Free website included on all plans. 24-hour delivery guarantee.</p>
              </div>
            </div>

            {/* Birdeye Pricing */}
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Birdeye</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700"><strong>Standard:</strong> ~$299/mo (reviews + listings)</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700"><strong>Professional:</strong> ~$399/mo (adds webchat, surveys)</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700"><strong>Premium:</strong> $449+/mo (full platform, social)</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Pricing is per location and often requires annual contracts. Custom quotes common.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              On paper, Birdeye looks cheaper at $299/month for the Standard tier. But that price only covers reviews and listings. To get webchat, surveys, and the broader customer experience features, you're looking at $399-$449/month, and Birdeye typically requires annual commitments with per-location pricing.
            </p>
            <p>
              Boltcall's $389/month Core plan bundles an AI phone receptionist, AI chatbot, a professionally built website, speed-to-lead automation, and automated review requests into one price. There's no per-location markup and no annual lock-in required. For businesses that need phone answering solved first, the value-per-dollar tilts toward Boltcall.
            </p>
          </div>
        </motion.section>

        {/* Reviews: Both Do This */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Review Management: Where They Overlap
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Both platforms help you get more Google reviews. This is the one area where they genuinely compete.
            </p>
            <p>
              <strong className="text-gray-900">Birdeye's approach:</strong> Birdeye is purpose-built for reviews. It sends automated review requests via text and email after appointments, provides NFC tap-to-review cards for in-person businesses, monitors reviews across Google, Yelp, Facebook, and Healthgrades, and lets you respond to all reviews from a single dashboard. It also manages your business listings across 50+ directories to keep NAP (name, address, phone) data consistent. For businesses where review volume and reputation are the bottleneck, Birdeye is deeply specialized.
            </p>
            <p>
              <strong className="text-gray-900">Boltcall's approach:</strong> Boltcall includes automated review generation as part of its post-call workflow. After the AI receptionist handles a call and an appointment is completed, it triggers an AI-assisted review request via text. It's effective and hands-free, but it's not Boltcall's primary focus. You won't get NFC cards, 50-directory listing management, or the granular review analytics that Birdeye offers.
            </p>
            <p>
              <strong>Bottom line:</strong> If you need 100+ reviews fast and want to dominate local search with review velocity, Birdeye has the deeper toolkit. If you want reviews as part of a broader lead-capture system, Boltcall covers the basics well.
            </p>
          </div>
        </motion.section>

        {/* AI Features: Boltcall Wins */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            AI Capabilities: Where Boltcall Pulls Ahead
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              This is the category where the two platforms diverge most sharply.
            </p>
            <p>
              Boltcall's AI receptionist is the core product. It answers phone calls in a natural, conversational voice. It understands context, meaning it knows your services, your pricing, your availability, and your FAQs. It qualifies callers by asking the right questions, books appointments directly into your calendar, sends instant follow-up texts to the caller, and notifies you in real time via Telegram or SMS. The entire interaction happens in under 60 seconds from the moment the phone rings to a booked appointment.
            </p>
            <p>
              Boltcall also includes an AI chatbot that lives on your website, handling inquiries, capturing lead info, and pushing visitors toward booking. The chatbot and phone receptionist share the same knowledge base, so callers and website visitors get consistent answers.
            </p>

            <div className="bg-gray-50 rounded-xl p-6 my-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                Boltcall AI Advantages
              </h3>
              <ul className="space-y-2">
                {[
                  '24/7 AI phone answering with natural conversation',
                  'Lead qualification during the call',
                  'Real-time appointment booking',
                  'Speed-to-lead under 60 seconds',
                  'AI chatbot with shared knowledge base',
                  'Instant SMS follow-up to every caller',
                  'Setup in 24 hours, not weeks'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p>
              Birdeye has added AI features over time, including AI-powered review response suggestions and a webchat widget. But it does not offer an AI phone receptionist. If a customer calls your business and you don't pick up, Birdeye can't help. The AI in Birdeye is primarily text-based and focused on managing your existing reputation, not capturing new leads in real time.
            </p>
          </div>
        </motion.section>

        {/* Who Chooses Boltcall */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Who Should Choose Boltcall
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Boltcall is the right fit if your primary problem is <strong className="text-gray-900">missing calls and losing leads</strong>. Specifically:
            </p>
            <ul className="space-y-3 ml-4">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <span><strong>Solo operators and small teams</strong> who can't answer every call during the day, especially while they're on the job (plumbers, electricians, cleaners, contractors).</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <span><strong>Businesses losing after-hours leads.</strong> If customers call at 7pm or on weekends and get voicemail, you're handing revenue to competitors. Boltcall's AI answers 24/7.</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <span><strong>Anyone who needs a website fast.</strong> Boltcall builds and hosts your business website as part of the package, delivered in 24 hours. Birdeye does not offer websites.</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <span><strong>Speed-to-lead obsessed businesses.</strong> If your close rate depends on responding first, Boltcall's sub-60-second lead response is a measurable competitive advantage.</span>
              </li>
            </ul>
          </div>
        </motion.section>

        {/* Who Chooses Birdeye */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Who Should Choose Birdeye
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Birdeye is the right fit if your primary problem is <strong className="text-gray-900">reputation and visibility</strong>. Specifically:
            </p>
            <ul className="space-y-3 ml-4">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
                <span><strong>Multi-location businesses</strong> that need to manage reviews and listings across dozens of locations from a single dashboard. Birdeye's per-location management is built for this.</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
                <span><strong>Businesses with low review counts</strong> that need to aggressively build social proof. Birdeye's multi-channel campaign system (text, email, NFC cards) generates reviews faster than most alternatives.</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
                <span><strong>Healthcare and dental practices</strong> that rely heavily on patient reviews and need HIPAA-aware messaging. Birdeye has strong penetration in this vertical.</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
                <span><strong>Businesses that already handle calls well</strong> but struggle with online reputation. If you have a receptionist but only 20 Google reviews, Birdeye directly solves that gap.</span>
              </li>
            </ul>
          </div>
        </motion.section>

        {/* Verdict */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            The Verdict
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Boltcall and Birdeye are not direct competitors. They solve different problems in the local business growth stack.
            </p>
            <p>
              <strong className="text-gray-900">Choose Boltcall if</strong> you're losing leads because nobody is answering the phone. If missed calls, slow follow-ups, and no website are costing you revenue, Boltcall closes those gaps in 24 hours with an AI receptionist, chatbot, website, and speed-to-lead automation. It's the platform that turns phone calls into booked appointments.
            </p>
            <p>
              <strong className="text-gray-900">Choose Birdeye if</strong> you're already capturing leads well but need to build your online reputation. If you have 15 Google reviews and your competitor has 200, Birdeye's review generation machine and listings management will close that gap faster than anything else.
            </p>
            <p>
              <strong className="text-gray-900">Use both if</strong> your budget allows. Boltcall captures the lead and books the appointment. Birdeye turns that customer into a 5-star review. Together, they cover the full customer lifecycle from first call to published review.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
              <p className="text-gray-800 font-medium mb-2">
                Our recommendation for most local businesses:
              </p>
              <p className="text-gray-700">
                Start with Boltcall. Missing calls is the most expensive problem most local businesses don't realize they have. Every unanswered call is a lost customer. Fix that first, then layer on reputation management once you have a steady flow of customers to generate reviews from.
              </p>
            </div>
          </div>
        </motion.section>

        {/* FAQ Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Is Birdeye or Boltcall better for Google reviews?</h3>
              <p className="text-gray-700 leading-relaxed">
                Birdeye is the stronger choice if review management is your primary need. It offers multi-channel review campaigns, NFC tap-to-review cards, and listings management across 50+ directories. Boltcall includes AI-assisted review generation after every call or appointment, but its core strength is AI phone answering and speed-to-lead, not review volume at scale. If you need to go from 20 reviews to 200 fast, Birdeye is purpose-built for that.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Does Birdeye have an AI phone receptionist?</h3>
              <p className="text-gray-700 leading-relaxed">
                No. Birdeye offers webchat, messaging, and text-based AI, but it does not provide a dedicated AI phone receptionist that answers calls 24/7, qualifies callers, and books appointments over the phone. If you need an AI that handles inbound calls, Boltcall is the solution. Birdeye's AI features are focused on review responses and text-based customer interactions.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Can I use both Boltcall and Birdeye?</h3>
              <p className="text-gray-700 leading-relaxed">
                Yes, and many local businesses do. The two platforms solve different problems and complement each other well. Boltcall handles the front end: answering calls, capturing leads, booking appointments, and following up instantly. Birdeye handles the back end: requesting reviews, managing listings, and monitoring your reputation. Together they cover the full customer journey from first contact to published review.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Which is more affordable for a small business?</h3>
              <p className="text-gray-700 leading-relaxed">
                Birdeye's Standard plan starts at approximately $299/month, while Boltcall starts at $389/month for the Core plan. However, Boltcall's price includes an AI phone receptionist, chatbot, free website, and speed-to-lead automation, features that would cost extra or require separate tools with Birdeye. Birdeye's higher tiers ($399-$449+/month) are needed for webchat and full platform access, and pricing is per-location with annual contracts common. Total cost depends entirely on which features your business needs most.
              </p>
            </div>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="my-16"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 w-full max-w-[800px] group hover:bg-gray-50 transition duration-500 hover:duration-200">
              <div className="flex justify-center isolate">
                <div className="bg-white size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                  <Star className="w-6 h-6 text-blue-500" />
                </div>
                <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                  <Phone className="w-6 h-6 text-blue-500" />
                </div>
                <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                  <MessageSquare className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <h2 className="text-gray-900 font-medium mt-4 text-4xl">Try Boltcall Free</h2>
              <p className="text-base text-gray-600 mt-2 whitespace-pre-line">Stop missing calls. Get an AI receptionist, chatbot, and website in 24 hours.</p>
              <Link
                to="/setup"
                className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
              >
                Start the free setup
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Related Posts */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Reading</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/pricing" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
              <h3 className="font-semibold text-gray-900 mb-1">Boltcall Pricing</h3>
              <p className="text-sm text-gray-600">See all plans and features side by side.</p>
              <span className="text-blue-600 text-sm font-medium flex items-center gap-1 mt-2">
                View pricing <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
            <Link to="/blog/google-reviews-automation-local-business" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
              <h3 className="font-semibold text-gray-900 mb-1">Google Reviews Automation</h3>
              <p className="text-sm text-gray-600">How to automate review requests for your local business.</p>
              <span className="text-blue-600 text-sm font-medium flex items-center gap-1 mt-2">
                Read more <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
            <Link to="/blog/best-ai-receptionist-small-business" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
              <h3 className="font-semibold text-gray-900 mb-1">Best AI Receptionist for Small Business</h3>
              <p className="text-sm text-gray-600">Compare the top AI receptionist platforms in 2026.</p>
              <span className="text-blue-600 text-sm font-medium flex items-center gap-1 mt-2">
                Read more <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </motion.section>

      </article>

      {/* Social Proof */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">What Businesses Say About Boltcall</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Join 500+ businesses using Boltcall to capture more leads and grow revenue.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: "We used Birdeye for reviews but still lost calls every night. Boltcall was the piece we were missing — it captures the lead before we even have to ask for a review.", name: "Marcus T.", role: "HVAC Business Owner, Texas" },
            { quote: "Birdeye helped our reputation but couldn't answer calls. Boltcall closes that gap. Now we capture every lead and then follow up for a review automatically.", name: "Sandra P.", role: "Dental Practice Owner, Georgia" },
            { quote: "I didn't realize how many leads I was losing after hours until Boltcall showed me. We now book 30% more appointments than before.", name: "Chris W.", role: "Plumbing Company Owner, Ohio" },
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
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>100% Free — no credit card required</span></div>
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Used by 500+ local businesses</span></div>
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Setup completed in 24 hours</span></div>
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Your data is never sold or shared</span></div>
          </div>
        </div>
      </section>

      <FinalCTA {...COMPARISON_CTA} />

      {/* Pros / Cons */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">Boltcall vs Birdeye: Pros and Cons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Boltcall</h3>
              <div className="mb-5">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-3">Strengths</p>
                <ul className="space-y-2">
                <li key={"Purpose-built AI call answering for local businesses"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Purpose-built AI call answering for local businesses
                </li>
                <li key={"Flat monthly pricing — no per-call fees"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Flat monthly pricing — no per-call fees
                </li>
                <li key={"Live in 30 minutes with no tech team needed"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Live in 30 minutes with no tech team needed
                </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Limitations</p>
                <ul className="space-y-2">
                <li key={"Less focus on review management tools"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>Less focus on review management tools
                </li>
                <li key={"Best suited for service businesses, not retail"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>Best suited for service businesses, not retail
                </li>
                </ul>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Birdeye</h3>
              <div className="mb-5">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-3">Strengths</p>
                <ul className="space-y-2">
                <li key={"Strong review management and reputation tools"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Strong review management and reputation tools
                </li>
                <li key={"Wide integration ecosystem"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Wide integration ecosystem
                </li>
                <li key={"Good multi-location support"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Good multi-location support
                </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Limitations</p>
                <ul className="space-y-2">
                <li key={"Not built for AI phone answering"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>Not built for AI phone answering
                </li>
                <li key={"Per-feature pricing adds up quickly"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>Per-feature pricing adds up quickly
                </li>
                <li key={"Complex setup for small teams"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>Complex setup for small teams
                </li>
                </ul>
              </div>
            </div>
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
    </div>
  );
};

export default CompareBoltcallVsBirdeye;
