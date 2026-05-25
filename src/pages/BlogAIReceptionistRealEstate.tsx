import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Clock, Home, Phone } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';
import Breadcrumbs from '../components/Breadcrumbs';

const BlogAIReceptionistRealEstate: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for Real Estate Agents | Boltcall';
    updateMetaDescription('Learn how Boltcall\'s AI receptionist helps real estate agents qualify and book inbound leads in under 60 seconds — get more showings without missing another Zillow inquiry.');

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "AI Receptionist for Real Estate Agents: Convert Inbound Leads in Under 60 Seconds",
      "description": "How real estate agents and brokerages use AI receptionists to qualify, route, and book inbound leads in under 60 seconds without losing the personal touch that closes deals.",
      "author": { "@type": "Organization", "name": "Boltcall" },
      "publisher": {
        "@type": "Organization",
        "name": "Boltcall",
        "logo": { "@type": "ImageObject", "url": "https://boltcall.org/boltcall_full_logo.png" }
      },
      "datePublished": "2026-04-30",
      "dateModified": "2026-04-30",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/ai-receptionist-real-estate-agents"
      },
      "image": { "@type": "ImageObject", "url": "https://boltcall.org/og-image.jpg" }
    };

    const existingScript = document.getElementById('article-schema');
    if (existingScript) existingScript.remove();

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
        { "@type": "ListItem", "position": 3, "name": "AI Receptionist for Real Estate Agents", "item": "https://boltcall.org/blog/ai-receptionist-real-estate-agents" }
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

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'faq-schema';
    faqScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is an AI receptionist for real estate agents?",
          "acceptedAnswer": { "@type": "Answer", "text": "An AI receptionist for real estate agents is a voice and SMS automation system that responds to every inbound lead — calls, Zillow inquiries, web forms — in under 60 seconds. It qualifies buyers and sellers, books showings directly into your calendar, and routes hot leads to you with full context, so no lead waits more than a minute for a response." }
        },
        {
          "@type": "Question",
          "name": "How does an AI receptionist book showings automatically?",
          "acceptedAnswer": { "@type": "Answer", "text": "The AI connects to your calendar (Google Calendar, Cal.com, or CRM-native booking) and checks real-time availability. When a buyer calls or messages, the AI qualifies them — price range, timeline, zip codes — then books a showing slot directly, sends SMS confirmation to both parties, and logs the interaction in your CRM with full notes." }
        },
        {
          "@type": "Question",
          "name": "Does an AI receptionist work with real estate CRMs like Follow Up Boss and kvCORE?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. Boltcall integrates with Follow Up Boss via native API, kvCORE and BoomTown via webhook, and Sierra Interactive and HubSpot via native connectors. Every AI-qualified lead flows into your CRM with full transcript, tags, and lead source attribution — no manual data entry." }
        },
        {
          "@type": "Question",
          "name": "How much does an AI receptionist cost for a real estate agent?",
          "acceptedAnswer": { "@type": "Answer", "text": "Boltcall plans start at $99–$249/month — a flat rate with no per-call or per-minute fees. For most agents, one additional closed transaction per quarter more than covers the annual cost. The ROI math is simple: one extra commission pays for the system for the year." }
        }
      ]
    });
    document.head.appendChild(faqScript);

    return () => {
      document.getElementById('person-schema')?.remove();
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('faq-schema')?.remove();
      const scriptToRemove = document.getElementById('article-schema');
      if (scriptToRemove) scriptToRemove.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />

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
              { label: 'AI Receptionist for Real Estate Agents', href: '/blog/ai-receptionist-real-estate-agents' }
            ]} />

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              AI Receptionist for <span className="text-blue-600">Real Estate Agents</span>: Convert Inbound Leads in Under 60 Seconds
            </h1>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>April 30, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>9 min read</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="prose prose-lg max-w-none mb-12"
            >
              <p className="text-xl text-gray-700 leading-relaxed font-medium">
                A buyer scrolls Zillow at 9:42 PM, sees a listing she loves, and taps "Contact Agent." She also taps two more agents on the next two listings. The agent who answers her in 30 seconds books the showing. The other two will get a callback at 9 AM tomorrow and find out the showing is already on someone else's calendar. AI receptionists are how real estate agents stay first in line, every time.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mt-6">
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">What is an AI receptionist for real estate agents?</p>
                <p className="text-gray-800 leading-relaxed">An AI receptionist for real estate agents is a voice and SMS automation system that responds to every inbound lead in under 60 seconds — qualifying buyers, booking showings, and routing hot leads — so agents are always first to respond, regardless of what time a Zillow inquiry arrives.</p>
              </div>
            </motion.div>

            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-12">
              <h2 className="text-base font-bold text-gray-900 mb-4">In This Article</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li><a href="#why-real-estate-leads-decay-faster" className="text-blue-600 hover:underline text-sm">Why Real Estate Leads Decay Faster Than Any Other Vertical</a></li>
                <li><a href="#what-an-ai-receptionist-does-for-agents" className="text-blue-600 hover:underline text-sm">What an AI Receptionist Actually Does for a Real Estate Agent</a></li>
                <li><a href="#5-real-estate-scenarios-where-ai-wins" className="text-blue-600 hover:underline text-sm">5 Real Estate Scenarios Where an AI Receptionist Wins the Lead</a></li>
                <li><a href="#how-to-set-it-up" className="text-blue-600 hover:underline text-sm">How to Set Up an AI Receptionist for Your Real Estate Practice</a></li>
                <li><a href="#crm-integrations-that-matter" className="text-blue-600 hover:underline text-sm">CRM Integrations That Actually Matter (Follow Up Boss, kvCORE, BoomTown)</a></li>
                <li><a href="#what-good-looks-like" className="text-blue-600 hover:underline text-sm">What Good Looks Like: Numbers Top Agents Track</a></li>
              </ol>
            </div>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-16"
            >
              <h2 id="why-real-estate-leads-decay-faster" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                Why Real Estate Leads Decay Faster Than Any Other Vertical
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Real estate is the most punishing speed-to-lead category in the local services world. The average buyer contacts 3.4 agents on the same listing within 10 minutes of finding a property they like, according to Zillow Group's 2024 Consumer Housing Trends Report. Whoever answers first usually controls the relationship for the rest of the search.
                </p>

                <p>
                  The decay curve for inbound real estate leads is brutal. A 2023 InsideRealEstate study tracked over 200,000 inbound leads and found that contacting a lead within the first minute was 21x more likely to result in a closed showing than contacting the same lead at 30 minutes. Past the first hour, the lead was effectively cold.
                </p>

                <p>
                  The reason is structural. Real estate buyers are not just shopping for a service. They are pre-qualifying agents while simultaneously evaluating properties. The agent who answers fastest becomes the de facto agent for that buyer's entire search, often without a written buyer agreement. Lose the first call and you lose the next 30 showings too.
                </p>

                <p>
                  Most agents know this and still respond slowly. The reason is operational, not motivational. You cannot personally answer a Zillow inquiry at 9:42 PM while you are showing a property to another buyer. The phone keeps ringing. The leads keep cooling. AI receptionists close that gap.
                </p>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-16"
            >
              <h2 id="what-an-ai-receptionist-does-for-agents" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                What an AI Receptionist Actually Does for a Real Estate Agent
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  An AI receptionist for real estate is not a chatbot pasted into your website. It is a voice and SMS layer that answers every inbound channel — phone calls, web forms, listing portals, Facebook leads — within seconds, qualifies the lead, and either books a showing directly or routes the call to you with full context.
                </p>

                <p>
                  The AI handles the first 60 seconds of the conversation. Buyer or seller? Cash or financing? Pre-approved? Looking in what zip codes? Price range? When are they free for a showing? It captures the answers, drops them into your CRM, and either schedules a showing or texts you the lead summary so your callback is informed instead of cold.
                </p>

                <p>
                  Modern systems built on Retell AI, VAPI, and Twilio can sound indistinguishable from a real assistant. They handle interruptions, recognize buyer intent, switch between English and Spanish on demand, and cleanly hand off to a human when the conversation moves past qualification. The point is not to replace you — it is to make sure no lead waits more than a few seconds for the first response.
                </p>

                <p>
                  The receptionist is also tireless. It works at 9:42 PM, on Sunday morning, and during the open house when your phone is in the listing's kitchen drawer. Every lead gets the same first-class first response, regardless of when it arrived.
                </p>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-16"
            >
              <h2 id="5-real-estate-scenarios-where-ai-wins" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                5 Real Estate Scenarios Where an AI Receptionist Wins the Lead
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <h3 className="text-2xl font-bold text-gray-900 mt-4 mb-3">1. The 9 PM Zillow inquiry</h3>
                <p>
                  A buyer messages "Is this still available?" at 9:14 PM. The AI replies in 11 seconds with property details, asks for a phone number, books a showing for Saturday morning, and texts you the calendar invite. You wake up to a confirmed showing instead of a 30-message backlog.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">2. The open-house overflow call</h3>
                <p>
                  You are running an open house and miss three calls. The AI answers all three, qualifies them, and books two follow-up showings while the third gets routed to your team partner. You walk out with three new prospects in your CRM, fully tagged.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">3. The Spanish-speaking lead</h3>
                <p>
                  A first-time buyer prefers Spanish. Your AI switches languages instantly, takes the inquiry, and notes the language preference in the CRM so the human follow-up is in the right language too. No leads lost to a language barrier.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">4. The repeat caller checking on a listing</h3>
                <p>
                  A past client calls about a new listing in your inventory. The AI recognizes the number, pulls up their last transaction, and connects them straight to you with the context already loaded. Loyalty is preserved without the friction of "remind me your name?"
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-3">5. The seller lead from a Facebook ad</h3>
                <p>
                  Your "Free Home Valuation" ad fires a lead at 2 AM. The AI calls back within 60 seconds, runs the qualification script, captures the address and timeline, and emails you a fully-built CMA request before breakfast. You start the day with a hot listing appointment instead of an unread form fill.
                </p>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-16"
            >
              <h2 id="how-to-set-it-up" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                How to Set Up an AI Receptionist for Your Real Estate Practice
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  The setup is faster than agents expect. You do not need a developer, you do not need to switch CRMs, and you do not need to rewire your existing lead flow. The whole thing should take less than 24 hours from signup to first booked showing.
                </p>

                <ol className="list-decimal list-inside space-y-4">
                  <li>
                    <strong className="text-gray-900">Pick a phone number strategy.</strong> Most agents either forward their existing number to the AI when busy or use a dedicated AI line for marketing campaigns. Forwarding is simplest. A dedicated number gives you cleaner attribution.
                  </li>
                  <li>
                    <strong className="text-gray-900">Train the agent on your inventory and zip codes.</strong> Upload your active listings, your typical buyer price ranges, and the neighborhoods you cover. The AI uses this as the knowledge base for every conversation.
                  </li>
                  <li>
                    <strong className="text-gray-900">Connect your CRM.</strong> Follow Up Boss, kvCORE, BoomTown, and Sierra Interactive all integrate via webhook or native connector. Every qualified lead flows in with full transcript and tags.
                  </li>
                  <li>
                    <strong className="text-gray-900">Define your booking calendar.</strong> Cal.com, Google Calendar, or your CRM's built-in booking tool. The AI books showings directly into the calendar with the property details and buyer info attached.
                  </li>
                  <li>
                    <strong className="text-gray-900">Set escalation rules.</strong> Hot leads (cash buyers, motivated sellers, urgent timelines) ring your phone immediately. Cold or top-of-funnel leads get scheduled callbacks instead of interruptions.
                  </li>
                </ol>

                <p>
                  Most agents are live within a single afternoon. The first booked showing usually comes within 48 hours of going live, which makes the ROI math easy: one extra closed transaction pays for the system for the year.
                </p>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-16"
            >
              <h2 id="crm-integrations-that-matter" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                CRM Integrations That Actually Matter
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Most agents already pay for a real estate CRM. The AI receptionist needs to feed that CRM cleanly or it becomes another data silo. Here is what actually integrates and what to watch for.
                </p>

                <table className="w-full border-collapse my-6 text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-bold text-gray-900">CRM</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-900">Integration Type</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-900">What Works Well</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4">Follow Up Boss</td>
                      <td className="py-3 px-4">Native API + webhook</td>
                      <td className="py-3 px-4">Lead source attribution, smart lists, action plans</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4">kvCORE</td>
                      <td className="py-3 px-4">Webhook</td>
                      <td className="py-3 px-4">Inbound lead routing, tagged with AI conversation summary</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4">BoomTown</td>
                      <td className="py-3 px-4">Webhook + Zapier</td>
                      <td className="py-3 px-4">Buyer profile auto-tagging</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4">Sierra Interactive</td>
                      <td className="py-3 px-4">Webhook</td>
                      <td className="py-3 px-4">Drip campaign trigger from AI-qualified intent</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4">HubSpot / Salesforce</td>
                      <td className="py-3 px-4">Native API</td>
                      <td className="py-3 px-4">For brokerages already running enterprise CRMs</td>
                    </tr>
                  </tbody>
                </table>

                <p>
                  The integration that matters most is whatever you already use every morning. Pushing AI-qualified leads into a CRM you do not check is worse than not having the AI at all. Pick the system you actually live in.
                </p>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mb-16"
            >
              <h2 id="what-good-looks-like" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                What Good Looks Like: Numbers Top Agents Track
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Once the AI is live, four numbers matter. Watch them weekly for the first month, then monthly after that.
                </p>

                <ul className="list-disc list-inside space-y-3">
                  <li><strong className="text-gray-900">First-response time:</strong> target under 30 seconds for inbound calls, under 60 seconds for forms. AI baseline is 11 seconds.</li>
                  <li><strong className="text-gray-900">Showing booking rate:</strong> percentage of qualified inbound leads that book a showing inside 7 days. Top agents hit 35-45% with AI in the loop.</li>
                  <li><strong className="text-gray-900">Lead-to-listing-appointment rate (sellers):</strong> percentage of seller leads that convert to a CMA or listing appointment. Healthy benchmark is 22-30%.</li>
                  <li><strong className="text-gray-900">After-hours capture:</strong> percentage of leads arriving outside 8 AM to 6 PM that still get a same-night response. AI puts this number at 100%.</li>
                </ul>

                <p>
                  Most agents who track these for the first 60 days find that the first-response time drops from 25-40 minutes (manual baseline) to under 30 seconds, and the showing booking rate jumps 2-3x. That is what the speed-to-lead math looks like in practice.
                </p>

                <p>
                  Real estate is the speed-to-lead category. The agent who answers first wins the buyer relationship for the entire search, not just the first showing. An AI receptionist makes "first" the default, every time, on every channel, around the clock.
                </p>
              </div>
            </motion.section>

            {/* FAQ Section */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3">What is an AI receptionist for real estate agents?</h3>
                  <p className="text-gray-700 leading-relaxed">An AI receptionist for real estate is a voice and SMS automation system that responds to every inbound lead — calls, Zillow inquiries, web forms — in under 60 seconds. It qualifies buyers and sellers, books showings directly into your calendar, and routes hot leads with full context, so no lead waits more than a minute for a response.</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3">How does an AI receptionist book showings automatically?</h3>
                  <p className="text-gray-700 leading-relaxed">The AI connects to your calendar (Google Calendar, Cal.com, or CRM-native booking) and checks real-time availability. When a buyer calls, the AI qualifies them — price range, timeline, zip codes — then books a showing slot directly, sends SMS confirmation to both parties, and logs the interaction in your CRM with full notes.</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Does an AI receptionist work with real estate CRMs like Follow Up Boss?</h3>
                  <p className="text-gray-700 leading-relaxed">Yes. Boltcall integrates with Follow Up Boss via native API, kvCORE and BoomTown via webhook, and Sierra Interactive via native connectors. Every AI-qualified lead flows into your CRM with full transcript, tags, and lead source attribution — no manual data entry.</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3">How much does a real estate AI receptionist cost?</h3>
                  <p className="text-gray-700 leading-relaxed">Boltcall plans start at $99–$249/month — a flat rate with no per-call fees. For most agents, one additional closed transaction per quarter more than covers the annual cost. The ROI math is simple: one extra commission pays for the system for the year.</p>
                </div>
              </div>
            </motion.section>

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
                      <Home className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Phone className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <h2 className="text-gray-900 font-medium mt-4 text-4xl">See How Many Showings You Are Currently Losing</h2>
                  <p className="text-base text-gray-600 mt-2 whitespace-pre-line">
                    Get a free AI Revenue Audit and find out exactly how much commission your real estate practice is leaving behind every time a Zillow inquiry waits more than 60 seconds.
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

          <aside className="hidden xl:block w-64 shrink-0">
            <div className="sticky top-32">
              <TableOfContents headings={headings} />
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogAIReceptionistRealEstate;
