import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Clock, Sun, Phone } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';
import Breadcrumbs from '../components/Breadcrumbs';

const BlogSolarAILeadResponse: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Solar AI Lead Response: How Installers Win More Deals (2026) | Boltcall';
    updateMetaDescription(
      'Solar installers lose 60% of leads to slow follow-up. Learn how AI lead response captures every inquiry in under 60 seconds and books more solar consultations automatically.'
    );

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Solar AI Lead Response: How Installers Win More Deals (2026)",
      "description": "Solar installers lose 60% of leads to slow follow-up. Learn how AI lead response captures every inquiry in under 60 seconds and books more solar consultations automatically.",
      "author": {
        "@type": "Organization",
        "name": "Boltcall",
        "url": "https://boltcall.org"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Boltcall",
        "logo": {
          "@type": "ImageObject",
          "url": "https://boltcall.org/boltcall_full_logo.png"
        }
      },
      "datePublished": "2026-05-02",
      "dateModified": "2026-05-02",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/solar-ai-lead-response"
      },
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg",
        "width": 1200,
        "height": 630
      },
      "keywords": ["solar AI lead response", "speed to lead solar", "AI for solar installers", "solar lead conversion", "solar sales automation"]
    };

    const existingArticle = document.getElementById('article-schema');
    if (existingArticle) existingArticle.remove();

    const script = document.createElement('script');
    script.id = 'article-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(articleSchema);
    document.head.appendChild(script);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog" },
        { "@type": "ListItem", "position": 3, "name": "Solar AI Lead Response", "item": "https://boltcall.org/blog/solar-ai-lead-response" }
      ]
    });
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Boltcall Team",
      "url": "https://boltcall.org/about",
      "worksFor": { "@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org" }
    });
    document.head.appendChild(personScript);

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How fast should a solar company respond to a new lead?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Solar companies should respond to new leads within 60 seconds. Research from MIT Sloan shows that responding within the first minute makes a business 391% more likely to convert a lead. After 5 minutes, conversion probability drops by more than 80%."
          }
        },
        {
          "@type": "Question",
          "name": "What is AI lead response for solar installers?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AI lead response for solar installers is an automated system that replies to every inbound inquiry — web form, missed call, or SMS — within seconds. It qualifies the homeowner, answers basic questions, and books a consultation directly on the installer's calendar, 24 hours a day."
          }
        },
        {
          "@type": "Question",
          "name": "Why do solar leads go cold so quickly?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Solar leads go cold quickly because homeowners typically submit quote requests to 3 to 5 companies at the same time. The first installer to respond with a real, personalized reply anchors the conversation. By the time a slow competitor calls back, the homeowner has already booked a consultation elsewhere."
          }
        },
        {
          "@type": "Question",
          "name": "How much does a solar company lose per missed lead?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "With an average residential solar installation value of $20,000 to $30,000 and an industry close rate of 20 to 25%, each missed lead represents $4,000 to $7,500 in lost potential revenue. Solar companies averaging 40 leads per month that respond slowly can lose $30,000 or more monthly to faster competitors."
          }
        },
        {
          "@type": "Question",
          "name": "Can AI handle after-hours solar leads?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. AI lead response systems work 24/7. Solar inquiries submitted on weekends, evenings, and holidays receive the same instant response as weekday business-hours leads. This is critical because 35 to 40% of solar leads are submitted outside of normal business hours."
          }
        }
      ]
    };

    const faqScriptEl = document.createElement('script');
    faqScriptEl.id = 'faq-schema';
    faqScriptEl.type = 'application/ld+json';
    faqScriptEl.text = JSON.stringify(faqSchema);
    document.head.appendChild(faqScriptEl);

    return () => {
      document.getElementById('article-schema')?.remove();
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      document.getElementById('faq-schema')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      {/* Hero */}
      <section className="relative pt-32 pb-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl px-4 sm:px-6 lg:px-8" style={{ marginLeft: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left mb-4"
          >
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: 'Solar AI Lead Response', href: '/blog/solar-ai-lead-response' }
            ]} />

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              How <span className="text-blue-600">Solar Installers</span> Win More Deals with AI Lead Response
            </h1>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>May 2, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>8 min read</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">

            {/* Direct Answer Block — AEO: within first 150 words */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="prose prose-lg max-w-none mb-12"
            >
              <p className="text-xl text-gray-700 leading-relaxed font-medium">
                A homeowner requests solar quotes from four companies on a Sunday evening. By Monday
                morning, only one installer has responded with a real message, a specific next step,
                and a link to book a consultation. That installer wins the deal. The other three call
                back Tuesday afternoon — and the homeowner has already signed. AI lead response is
                how solar installers make sure they are always the first to respond and the only one
                the homeowner remembers.
              </p>
            </motion.div>

            {/* Table of Contents */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-12">
              <h2 className="text-base font-bold text-gray-900 mb-4">In This Article</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li><a href="#why-speed-determines-who-closes-the-solar-deal" className="text-blue-600 hover:underline text-sm">Why Speed Determines Who Closes the Solar Deal</a></li>
                <li><a href="#why-solar-leads-go-cold-faster-than-you-think" className="text-blue-600 hover:underline text-sm">Why Solar Leads Go Cold Faster Than You Think</a></li>
                <li><a href="#what-ai-lead-response-looks-like-for-solar" className="text-blue-600 hover:underline text-sm">What AI Lead Response Looks Like for Solar</a></li>
                <li><a href="#4-solar-scenarios-where-ai-wins" className="text-blue-600 hover:underline text-sm">The 4 Solar Scenarios Where AI Response Wins Every Time</a></li>
                <li><a href="#how-to-set-up-ai-lead-response-for-solar" className="text-blue-600 hover:underline text-sm">How to Set Up AI Lead Response for Your Solar Business</a></li>
                <li><a href="#what-solar-companies-see-after-implementing-ai" className="text-blue-600 hover:underline text-sm">What Solar Installers See After Implementing AI Response</a></li>
                <li><a href="#faq" className="text-blue-600 hover:underline text-sm">Frequently Asked Questions</a></li>
              </ol>
            </div>

            {/* Section 1 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-16"
            >
              <h2 id="why-speed-determines-who-closes-the-solar-deal" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                Why Speed Determines Who Closes the Solar Deal
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Solar is a high-consideration purchase. The average homeowner researches for 2 to 4
                  weeks before requesting a quote. But the moment they submit that form, everything
                  accelerates. A quote request is a signal of peak buying intent — the homeowner has
                  moved from research to evaluation. They are ready to talk. The only question is
                  which installer they will talk to.
                </p>

                <p>
                  Most homeowners submit their quote request to 3 to 5 solar companies at the same
                  time. They are not loyal to any particular brand yet. They will engage with whoever
                  shows up first. The installer who responds in 60 seconds gets to set the agenda —
                  the price anchor, the product recommendation, the timeline. Competitors who call
                  back 4 hours later are responding to a customer who already has a frame of reference
                  shaped by someone else.
                </p>

                <p>
                  Research from the <a href="https://sloanreview.mit.edu/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">MIT Sloan School of Management</a> found
                  that contacting a lead within the first minute makes a business 391% more likely to
                  convert them compared to waiting just 5 minutes. In solar, where the average deal
                  value is $20,000 to $30,000, that data point represents enormous revenue at stake
                  with every slow response.
                </p>

                <p>
                  Speed is not just about being polite or professional. In solar sales, it is the
                  difference between who gets the signed contract and who gets a voicemail that never
                  gets returned.
                </p>
              </div>
            </motion.section>

            {/* Section 2 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-16"
            >
              <h2 id="why-solar-leads-go-cold-faster-than-you-think" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                Why Solar Leads Go Cold Faster Than You Think
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  The average response time for a US solar company to a new web lead is 3 to 5 hours
                  during business hours — and far longer on evenings, weekends, and holidays. That is
                  not a minor inefficiency. It is a structural revenue leak that compounds across
                  every lead, every month.
                </p>

                <p>
                  Solar leads do not wait. The homeowner who submits a form at 7pm after reading
                  reviews is engaged and motivated right now. By the next morning, her attention has
                  moved to her commute, her work calendar, and the fourteen other things competing for
                  her focus. When your sales rep calls back at 10am, she barely remembers the form.
                  The urgency is gone.
                </p>

                <p>
                  Here is how fast the conversion window closes:
                </p>

                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold shrink-0">Under 1 minute:</span>
                    <span>391% higher conversion rate — peak intent active, no competitors have responded yet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold shrink-0">Under 5 minutes:</span>
                    <span>Conversion drops 80% — homeowner is now fielding calls from the first installer who responded</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold shrink-0">30 minutes to 2 hours:</span>
                    <span>Homeowner has had 1 to 2 full sales conversations — you are competing against a relationship already started</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold shrink-0">Next day:</span>
                    <span>Homeowner may still be evaluating, but her shortlist is already formed — latecomers face an uphill battle</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold shrink-0">3 to 5 hours (industry average):</span>
                    <span>Lead is cold — the window of peak intent has closed entirely</span>
                  </li>
                </ul>

                <p>
                  The solar industry has a pattern that makes after-hours response especially critical.
                  According to industry data, 35 to 40% of solar quote requests are submitted outside
                  of normal business hours — evenings after 6pm, Saturdays, and Sundays. These are
                  the highest-intent leads. The homeowner made time outside her workday to research
                  and take action. Most solar companies have no coverage for this window at all.
                </p>

                <p>
                  The math is straightforward: if a solar company generates 40 leads per month and
                  35% come in after hours, that is 14 leads per month — worth potentially $280,000
                  in installation revenue at a $20,000 average — that are handled by nobody except
                  a contact form confirmation email.
                </p>
              </div>
            </motion.section>

            {/* Section 3 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-16"
            >
              <h2 id="what-ai-lead-response-looks-like-for-solar" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                What AI Lead Response Looks Like for Solar
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  AI lead response for solar installers is not a generic autoresponder or a chatbot
                  that deflects questions. It is a system that responds to every inbound inquiry with
                  a real, personalized message — by phone, SMS, or both — within seconds of the lead
                  coming in, and that can carry a full qualifying conversation through to a booked
                  consultation.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Website quote form submissions</h3>
                <p>
                  When a homeowner submits your contact or quote form, the AI sends an SMS within 30
                  seconds. Not an email — a text message. The message is personal and specific:
                  "Hi Sarah, thanks for reaching out about solar for your home. Quick question — is
                  your roof mostly south-facing, or does it face another direction?" That single
                  qualifying question starts a real conversation before any competitor has even seen
                  the form notification. From there, the AI qualifies the lead, answers basic
                  questions, and books a consultation directly on your calendar.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Missed and after-hours calls</h3>
                <p>
                  When a call comes in and no one answers — during a busy meeting, after 5pm, or at
                  9am on a Sunday — the AI responds immediately. For phone leads, it can answer
                  directly and have a full conversation, or it can send an instant SMS follow-up:
                  "Hi, we missed your call. We'd love to help you explore solar for your home.
                  What's a good time for a 15-minute call this week?" The homeowner replies, the AI
                  checks your availability, and the appointment is confirmed — without a human
                  touching the conversation.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Paid ad form leads (Facebook, Google)</h3>
                <p>
                  Paid solar leads cost $80 to $150 each on Facebook and Google. The worst thing a
                  solar company can do is let a $120 lead go cold because no one followed up in
                  time. AI connects directly to your ad platforms and triggers an instant response
                  the moment someone submits a lead form from an ad. Your cost per acquisition drops
                  because the conversion rate on the same lead volume improves significantly.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Calendar sync and handoff to sales</h3>
                <p>
                  Every consultation the AI books flows directly into your sales team's calendar —
                  whether you use Google Calendar, Salesforce, or a solar-specific CRM. The sales
                  rep shows up to a booked call with a qualified prospect who has already answered
                  the key questions: roof direction, monthly electricity bill, whether they own or
                  rent. The sales conversation starts further down the funnel, and close rates improve.
                </p>
              </div>
            </motion.section>

            {/* Section 4 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-16"
            >
              <h2 id="4-solar-scenarios-where-ai-wins" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                The 4 Solar Scenarios Where AI Response Wins Every Time
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  There are specific moments in the solar customer journey where speed has an outsized
                  impact. These four are where AI lead response consistently makes the biggest
                  difference.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">1. The multi-quote homeowner</h3>
                <p>
                  This is the most common solar lead scenario. A homeowner has read about federal
                  solar tax credits, checked her electricity bill, and decided it is time to get
                  serious. She fills out forms on three to five company websites in the same 20-minute
                  session. She has no strong preference yet. She is gathering information and will
                  engage with whoever shows up first.
                </p>
                <p>
                  AI responds in under 60 seconds with a personalized, conversational message. By
                  the time the second company in her list calls back — 3 to 4 hours later — she has
                  already had a full conversation with your AI, booked a call with your sales rep,
                  and formed a positive impression of your company. The other companies are calling
                  a prospect who is already leaning toward a competitor.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">2. The weekend or evening researcher</h3>
                <p>
                  As noted above, 35 to 40% of solar inquiries arrive outside business hours. The
                  homeowner who submits a form at 8:30pm on a Friday has typically just sat down to
                  tackle a decision she has been putting off. Her intent at this moment is genuine
                  and strong.
                </p>
                <p>
                  Without AI, that lead sits untouched for 13 or more hours until Monday morning —
                  by which time a national solar company with 24/7 follow-up staff has already been
                  in her inbox. With AI, your company responds in 45 seconds with a real message and
                  the option to book a Saturday morning call. You converted a lead your competitors
                  did not know existed until they checked their CRM on Monday.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">3. The paid ad lead</h3>
                <p>
                  Paid solar leads are among the most expensive in home services. When a homeowner
                  clicks your Google ad, reads your landing page, and fills out the form, their
                  intent is among the highest you will see from any lead source. They found you,
                  evaluated you, and chose to give you their information. That deserves the fastest
                  possible follow-up.
                </p>
                <p>
                  Studies on paid lead conversion show that responding within the first 5 minutes
                  produces a 10x higher contact rate compared to a 30-minute delay. Solar companies
                  spending $3,000 to $10,000 per month on Google Ads can effectively triple their
                  return simply by responding faster — without increasing ad spend at all.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">4. The referral or repeat inquiry</h3>
                <p>
                  Word-of-mouth referrals and homeowners who have been following your company for
                  months before committing are already warm. They have low objection thresholds and
                  are very likely to buy — if you respond with the same speed you would give a cold
                  lead. A 4-hour delay to a warm referral can still result in a lost deal to a
                  competitor who was faster with a generic response.
                </p>
              </div>
            </motion.section>

            {/* Section 5 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-16"
            >
              <h2 id="how-to-set-up-ai-lead-response-for-solar" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                How to Set Up AI Lead Response for Your Solar Business
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Most solar installers are fully live with AI lead response within 24 to 48 hours.
                  The setup does not require technical knowledge and no existing software needs to be
                  replaced — it layers on top of your current lead sources and tools.
                </p>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 1: Identify your lead sources</h3>
                  <p>
                    List every channel where new solar leads arrive: your website contact form, Google
                    Ads lead forms, Facebook Lead Ads, Yelp, Google Business Profile calls, and direct
                    phone calls. Every one becomes an input for the AI response system. Most platforms
                    connect via webhook, direct integration, or a Zapier-style automation in under
                    10 minutes each.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 2: Connect your sales calendar</h3>
                  <p>
                    The AI needs visibility into your sales team's availability to book consultations
                    without double-booking. Connect Google Calendar, Outlook, or your CRM. Define which
                    time slots are available for new consultations — including evenings and weekends if
                    you want to capture those after-hours leads. The AI only offers slots that actually
                    exist on your calendar.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 3: Train the AI on your solar business</h3>
                  <p>
                    Provide the AI with the information it needs for intelligent conversations: your
                    service area, system types you install (panels, batteries, EV chargers), your
                    process and timeline, current federal and state incentives, and your key qualifying
                    questions. This takes 20 to 30 minutes and can be updated as your offerings change.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 4: Define escalation rules</h3>
                  <p>
                    Set clear rules for when the AI should hand the conversation to a human. Most solar
                    companies escalate for callers with very specific technical questions, commercial
                    property inquiries, or anyone who asks to speak with a person directly. Everything
                    else — the majority of inbound volume — the AI handles from first contact to booked
                    consultation.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 5: Go live and monitor</h3>
                  <p>
                    Once connected, the system starts responding to leads immediately. You will see
                    every conversation, every qualification result, and every booked consultation in a
                    central dashboard. Most solar companies see their first AI-captured lead within
                    hours of launch — often a weekend inquiry that would have gone unanswered under the
                    old system.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Section 6 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mb-16"
            >
              <h2 id="what-solar-companies-see-after-implementing-ai" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                What Solar Installers See After Implementing AI Response
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  The impact on solar businesses follows a consistent pattern. Here is what the
                  numbers typically look like in the first 90 days after implementing AI lead response.
                </p>

                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Example: Regional solar installer, 40 inbound leads/month</h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Before AI: average 4-hour response time during business hours, no after-hours
                    coverage. Consultation booking rate of 18% — 7 consultations per month at a
                    20% close rate. 1 to 2 installations per month at an average value of $22,000.
                    Monthly revenue from inbound leads: $22,000 to $44,000.
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    After AI: instant response to every inbound lead, 24/7 coverage, automated
                    qualification and booking. Consultation booking rate increases to 38% — 15
                    consultations per month. At the same 20% close rate: 3 installations per month.
                    Monthly revenue from inbound leads: $66,000.
                  </p>
                  <p className="text-gray-700 leading-relaxed font-medium">
                    That is $22,000 to $44,000 in additional monthly revenue — from the same 40
                    leads, with no additional advertising spend.
                  </p>
                </div>

                <p>
                  Beyond the headline numbers, solar companies report three specific improvements
                  that compound over time:
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Higher-quality consultations</h3>
                <p>
                  When the AI qualifies leads before booking, sales reps show up to consultations
                  with prospects who have already confirmed they own their home, have an average
                  monthly bill above $150, and have a roof suitable for solar. Fewer wasted site
                  visits. Higher close rates per call. Better use of your sales team's time.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">After-hours revenue recovery</h3>
                <p>
                  The 35 to 40% of leads that previously went untouched overnight and on weekends
                  are now captured and booked. For a company with 40 monthly leads, that is 14 to 16
                  previously invisible leads per month entering the sales pipeline. At a 20% close
                  rate and $22,000 average deal value, that alone is worth $61,600 to $70,400 in
                  additional annual revenue — conservatively.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Lower cost per installation from paid ads</h3>
                <p>
                  Solar companies running paid search and social ads see an immediate improvement in
                  cost per acquisition when AI lead response is active. Because more leads convert at
                  the qualification and booking stage, the effective return on each advertising dollar
                  increases without changing the campaigns. If your current cost per installed job
                  from Google Ads is $2,500 and your consultation booking rate doubles, your effective
                  cost per installation approaches $1,250 — with the same ad spend.
                </p>
              </div>
            </motion.section>

            {/* FAQ Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.75 }}
              className="mb-16"
            >
              <h2 id="faq" className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                Frequently Asked Questions
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">How fast should a solar company respond to a new lead?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Within 60 seconds if possible. Research from MIT Sloan shows responding within
                    the first minute makes a business 391% more likely to convert the lead compared
                    to waiting 5 minutes. In solar, where homeowners are requesting quotes from
                    multiple companies simultaneously, the first to respond with a real message sets
                    the tone for the entire sales conversation.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">What is AI lead response for solar installers?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    AI lead response for solar installers is an automated system that replies to every
                    inbound inquiry — web form, missed call, or SMS — within seconds. It qualifies the
                    homeowner, answers basic questions about the solar process, and books a consultation
                    directly on the installer's calendar, 24 hours a day, without any human involvement.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Why do solar leads go cold so quickly?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Solar leads go cold quickly because homeowners typically submit quote requests to
                    3 to 5 companies at the same time. The first installer to respond with a real,
                    personalized reply anchors the conversation. By the time a slow competitor calls
                    back, the homeowner has already had a full sales conversation with someone else and
                    is mentally narrowing her shortlist.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">How much does a solar company lose per missed lead?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    With an average residential solar installation value of $20,000 to $30,000 and an
                    industry close rate of 20 to 25%, each missed lead represents $4,000 to $7,500 in
                    lost potential revenue. Solar companies averaging 40 leads per month that respond
                    slowly can lose $30,000 or more monthly to faster competitors.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Can AI handle after-hours solar leads?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Yes. AI lead response systems work 24/7. Solar inquiries submitted on weekends,
                    evenings, and holidays receive the same instant response as weekday business-hours
                    leads. This is critical because 35 to 40% of solar leads arrive outside of normal
                    business hours — a window most solar companies leave completely uncovered.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Related articles */}
            <div className="mb-16">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Related Reading</h2>
              <ul className="space-y-2 text-gray-700">
                <li>
                  <a href="/blog/speed-to-lead-local-business" className="text-blue-600 hover:underline">
                    Speed to Lead for Local Businesses: The Complete Guide
                  </a>
                </li>
                <li>
                  <a href="/blog/hvac-ai-lead-response" className="text-blue-600 hover:underline">
                    How HVAC Companies Book More Service Calls with AI Lead Response
                  </a>
                </li>
                <li>
                  <a href="/blog/after-hours-lead-response-home-services" className="text-blue-600 hover:underline">
                    After-Hours Lead Response for Home Services
                  </a>
                </li>
                <li>
                  <a href="/blog/ai-receptionist-solar-faq" className="text-blue-600 hover:underline">
                    AI Receptionist for Solar Companies: FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Editor's Note */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-12">
              <p className="text-sm font-bold text-blue-800 mb-1">Note — May 2026</p>
              <p className="text-blue-900 text-sm leading-relaxed">
                The solar industry is seeing accelerating adoption of AI-powered lead response tools
                in 2026, driven partly by competition from national installers with sophisticated
                follow-up infrastructure. Local and regional installers that implement speed-to-lead
                systems are reporting significant gains in consultation booking rates. The technology
                gap that once favored large companies has effectively closed for businesses that act
                on it.
              </p>
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="my-16"
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 w-full max-w-[800px] group hover:bg-gray-50 transition duration-500 hover:duration-200">
                  <div className="flex justify-center isolate">
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Sun className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Phone className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <h2 className="text-gray-900 font-medium mt-4 text-4xl">See How Many Solar Deals You Are Currently Losing</h2>
                  <p className="text-base text-gray-600 mt-2 whitespace-pre-line">
                    Get a free AI Revenue Audit and find out exactly how much revenue your solar
                    business is leaving behind with every slow response and after-hours lead.
                  </p>
                  <a
                    href="https://boltcall.org/ai-revenue-audit"
                    className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
                  >
                    Get my free AI Revenue Audit
                  </a>
                </div>
              </div>
            </motion.div>

          </article>

          {/* Sidebar TOC */}
          <aside className="hidden xl:block w-64 shrink-0">
            <div>
              <TableOfContents headings={headings} />
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogSolarAILeadResponse;
