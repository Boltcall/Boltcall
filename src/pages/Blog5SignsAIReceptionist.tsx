import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, PhoneOff, Clock3, Users, TrendingDown, CheckCircle, Phone } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const Blog5SignsAIReceptionist: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = '5 Signs Your Business Needs an AI Receptionist | Boltcall';
    updateMetaDescription('Missing calls, slow responses, and lost leads? Here are 5 clear signs your business needs an AI receptionist — and how to fix it.');

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "5 Signs Your Business Needs an AI Receptionist",
      "description": "Missing calls, slow responses, and lost leads? Here are 5 clear signs your business needs an AI receptionist.",
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
      "datePublished": "2026-03-05",
      "dateModified": "2026-04-09",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/5-signs-you-need-ai-receptionist"
      },
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg"
      }
    };

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I know if my business needs an AI receptionist?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "If you're missing more than 20% of incoming calls, taking longer than 5 minutes to respond to leads, or losing customers because no one answered the phone — you need an AI receptionist. These are revenue problems, not inconveniences."
          }
        },
        {
          "@type": "Question",
          "name": "How much does an AI receptionist cost compared to a human receptionist?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A full-time human receptionist costs $30,000-$45,000 per year. An AI receptionist like Boltcall costs a fraction of that and works 24/7 without breaks, sick days, or overtime pay."
          }
        },
        {
          "@type": "Question",
          "name": "Can an AI receptionist handle complex customer questions?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Modern AI receptionists use large language models trained on your business knowledge base. They can answer FAQs, book appointments, route calls, and handle multi-turn conversations naturally."
          }
        },
        {
          "@type": "Question",
          "name": "Will customers know they're talking to an AI?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Today's AI voice technology is remarkably natural. Most callers cannot tell the difference. The key is choosing an AI receptionist with high-quality voice synthesis and proper conversation handling."
          }
        }
      ]
    };

    const existingScript = document.getElementById('article-schema');
    if (existingScript) existingScript.remove();
    const existingFaqScript = document.getElementById('faq-schema');
    if (existingFaqScript) existingFaqScript.remove();

    const script = document.createElement('script');
    script.id = 'article-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(articleSchema);
    document.head.appendChild(script);

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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "5 Signs You Need an AI Receptionist", "item": "https://boltcall.org/blog/5-signs-you-need-ai-receptionist"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      const scriptToRemove = document.getElementById('article-schema');
      if (scriptToRemove) scriptToRemove.remove();
      const faqScriptToRemove = document.getElementById('faq-schema');
      if (faqScriptToRemove) faqScriptToRemove.remove();
    };
  }, []);

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
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: '5 Signs You Need an AI Receptionist', href: '/blog/5-signs-you-need-ai-receptionist' }
            ]} />

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              5 Signs Your Business Needs an <span className="text-blue-600">AI Receptionist</span>
            </h1>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>March 5, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>7 min read</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">

            {/* Introduction */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="prose prose-lg max-w-none mb-12"
            >
              <p className="text-xl text-gray-700 leading-relaxed font-medium">
                Every missed call is a missed opportunity. For local businesses, the phone is still the #1 way customers reach out — and if nobody answers, they call your competitor instead. An AI receptionist solves this by answering every call, instantly, 24/7. But how do you know if you actually need one?
              </p>
            </motion.div>

            {/* Direct Answer Block — AEO optimized */}
            <div className="bg-gray-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-12">
              <p className="text-lg text-gray-800 leading-relaxed font-medium">
                A business needs an AI receptionist when it regularly misses calls, responds to leads too slowly, struggles with after-hours inquiries, spends too much on staffing for phone coverage, or loses customers to competitors who answer faster. These are revenue problems that AI solves immediately.
              </p>
            </div>

            {/* Sign 1 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <PhoneOff className="w-8 h-8 text-red-500" />
                1. You're Missing More Than 20% of Incoming Calls
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  If your team can't answer every call — because they're with a customer, on lunch, or it's after hours — you're bleeding revenue. Studies show that 80% of callers who reach voicemail don't leave a message. They hang up and call someone else.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
                  <div className="text-3xl font-bold text-blue-600 mb-2">80%</div>
                  <p className="text-gray-700">of callers who reach voicemail will not leave a message — they'll call your competitor instead.</p>
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">
                  An <Link to="/features/ai-receptionist" className="text-blue-600 hover:underline">AI receptionist</Link> answers every call on the first ring. No hold music. No voicemail. No lost leads. It picks up at 2 AM the same way it picks up at 2 PM.
                </p>
              </div>
            </motion.section>

            {/* Sign 2 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Clock3 className="w-8 h-8 text-orange-500" />
                2. Your Lead Response Time Is Over 5 Minutes
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  Speed kills — in a good way. Research from Lead Connect shows that responding to a lead within 60 seconds increases conversion rates by 391%. Yet the average small business takes over 47 hours to respond. That's not a gap — it's a canyon.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
                  <div className="text-3xl font-bold text-blue-600 mb-2">391%</div>
                  <p className="text-gray-700">higher conversion rate when you respond to leads within 60 seconds vs. waiting even 5 minutes.</p>
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">
                  If your leads are sitting unanswered while you're busy with other work, an AI receptionist ensures every inquiry gets an instant response. It can answer questions, qualify the lead, and even <Link to="/features/sms-booking-assistant" className="text-blue-600 hover:underline">book an appointment via SMS</Link> — all before you finish your current task.
                </p>
              </div>
            </motion.section>

            {/* Sign 3 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-500" />
                3. You're Paying for Reception Coverage You Can't Afford
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  A full-time receptionist costs $30,000 to $45,000 per year — and that only covers business hours, minus lunch breaks, sick days, and vacations. Need after-hours coverage? That's overtime or a second hire.
                </p>
                <p className="text-gray-700 leading-relaxed mb-6">
                  For small businesses, this math doesn't work. You need phone coverage but can't justify a full salary for it. An AI receptionist gives you 24/7 coverage at a fraction of the cost — no benefits, no PTO, no turnover.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-red-50 p-5 rounded-xl">
                    <p className="font-semibold text-red-700 mb-1">Human Receptionist</p>
                    <p className="text-2xl font-bold text-red-600">$30K–$45K/yr</p>
                    <p className="text-sm text-red-600 mt-1">Business hours only • Sick days • Turnover risk</p>
                  </div>
                  <div className="bg-green-50 p-5 rounded-xl">
                    <p className="font-semibold text-green-700 mb-1">AI Receptionist</p>
                    <p className="text-2xl font-bold text-green-600">Fraction of cost</p>
                    <p className="text-sm text-green-600 mt-1">24/7 coverage • No sick days • Scales instantly</p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Sign 4 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <TrendingDown className="w-8 h-8 text-red-500" />
                4. Your After-Hours Calls Go Unanswered
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  Customers don't only need you between 9 and 5. A plumber's emergency call comes at 10 PM. A dental patient wants to book at 6 AM before work. A restaurant gets reservation calls during the dinner rush when staff can't answer.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
                  <div className="text-3xl font-bold text-blue-600 mb-2">35%</div>
                  <p className="text-gray-700">of all business calls come outside standard business hours — evenings, weekends, and holidays.</p>
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">
                  An AI receptionist doesn't clock out. It handles after-hours calls with the same quality as midday calls — answering questions, taking messages, booking appointments, and routing urgent matters to you immediately.
                </p>
              </div>
            </motion.section>

            {/* Sign 5 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-blue-500" />
                5. Your Competitors Already Have One
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  AI adoption in small business is accelerating fast. A 2025 survey found that 64% of small businesses plan to implement AI tools within the next 12 months. If your competitor answers calls instantly and you don't, customers will notice the difference.
                </p>
                <p className="text-gray-700 leading-relaxed mb-6">
                  This isn't about having the latest tech. It's about customer experience. The business that answers first, wins. When two plumbers are equally skilled, the one who picks up the phone gets the job. Every time.
                </p>
                <p className="text-gray-700 leading-relaxed mb-6">
                  The question isn't whether AI receptionists will become standard — it's whether you'll adopt one before or after your competitors do.
                </p>
              </div>
            </motion.section>

            {/* What to Do Next */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                What to Do If You Spotted These Signs
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  If even two of these signs apply to your business, you're leaving money on the table. Here's a simple action plan:
                </p>
                <ol className="space-y-4 mb-8">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</span>
                    <p className="text-gray-700"><strong>Audit your missed calls.</strong> Check your phone system or carrier for the last 30 days. How many calls went unanswered or to voicemail?</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</span>
                    <p className="text-gray-700"><strong>Calculate the cost.</strong> If each missed call is worth $100–$500 in potential revenue, multiply that by your monthly missed calls.</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</span>
                    <p className="text-gray-700"><strong>Try an AI receptionist.</strong> Most providers — including <Link to="/" className="text-blue-600 hover:underline">Boltcall</Link> — offer a free trial so you can see the impact before committing.</p>
                  </li>
                </ol>
              </div>
            </motion.section>

            {/* Pros & Cons Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <section className="my-10">
                <h2 id="pros-cons" className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of Using an AI Receptionist</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 rounded-xl p-6">
                    <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
                    <ul className="space-y-2 text-gray-700 text-sm">
                      <li>• Eliminates missed calls — every lead is captured, 24/7</li>
                      <li>• Responds in under 1 second, boosting conversions by up to 391%</li>
                      <li>• Costs a fraction of a full-time receptionist salary</li>
                      <li>• No sick days, vacations, or overtime — always available</li>
                      <li>• Books appointments and qualifies leads automatically</li>
                      <li>• Scales instantly during busy seasons without extra hiring</li>
                    </ul>
                  </div>
                  <div className="bg-red-50 rounded-xl p-6">
                    <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
                    <ul className="space-y-2 text-gray-700 text-sm">
                      <li>• Some customers still prefer speaking to a human immediately</li>
                      <li>• Requires initial setup and knowledge-base configuration</li>
                      <li>• Nuanced complaints or upset callers may need human escalation</li>
                      <li>• Voice quality matters — a poor AI voice reflects badly on your brand</li>
                      <li>• Cannot replace relationship-driven sales conversations</li>
                      <li>• Ongoing monitoring needed to catch edge-case errors</li>
                    </ul>
                  </div>
                </div>
              </section>
            </motion.section>

            {/* FAQ Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
                Frequently Asked Questions
              </h2>
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">How do I know if my business needs an AI receptionist?</h3>
                  <p className="text-gray-700 leading-relaxed">If you're missing more than 20% of incoming calls, taking longer than 5 minutes to respond to leads, or losing customers because no one answered the phone — you need an AI receptionist. These are revenue problems, not inconveniences.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">How much does an AI receptionist cost compared to a human receptionist?</h3>
                  <p className="text-gray-700 leading-relaxed">A full-time human receptionist costs $30,000–$45,000 per year. An AI receptionist like Boltcall costs a fraction of that and works 24/7 without breaks, sick days, or overtime pay.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Can an AI receptionist handle complex customer questions?</h3>
                  <p className="text-gray-700 leading-relaxed">Modern AI receptionists use large language models trained on your business knowledge base. They can answer FAQs, book appointments, route calls, and handle multi-turn conversations naturally.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Will customers know they're talking to an AI?</h3>
                  <p className="text-gray-700 leading-relaxed">Today's AI voice technology is remarkably natural. Most callers cannot tell the difference. The key is choosing an AI receptionist with high-quality voice synthesis and proper conversation handling.</p>
                </div>
              </div>
            </motion.section>

            {/* CTA Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <div className="flex flex-col items-center justify-center text-center">
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
                  <h2 className="text-gray-900 font-medium mt-4 text-4xl">Fast. Simple. Scalable.</h2>
                  <p className="text-base text-gray-600 mt-2 whitespace-pre-line">Get your helper ready in 5 minutes. It is free. Connect it to your phone, website, and messages.</p>
                  <Link
                    to="/setup"
                    className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
                  >
                    Start the free setup
                  </Link>
                </div>
              </div>
            </motion.section>

            {/* Related Posts */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Link to="/blog/is-ai-receptionist-worth-it" className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <span className="text-sm text-blue-600 font-medium">Business Analysis</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">Is an AI Receptionist Worth It? A Complete Cost-Benefit Analysis</h3>
                  <p className="text-gray-600 mt-2 text-sm">Every business owner faces the same question. This guide breaks down the real costs, benefits, and ROI.</p>
                </Link>
                <Link to="/blog/how-ai-receptionist-works" className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <span className="text-sm text-blue-600 font-medium">AI Technology</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">How Does an AI Receptionist Work? A Complete Technical Guide</h3>
                  <p className="text-gray-600 mt-2 text-sm">Discover the technology behind AI receptionists: speech recognition, NLU, and how they learn your business.</p>
                </Link>
                <Link to="/blog/why-speed-matters" className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <span className="text-sm text-blue-600 font-medium">Lead Generation</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">The 391% Advantage: Responding in 60 Seconds</h3>
                  <p className="text-gray-600 mt-2 text-sm">Research shows responding within 60 seconds increases conversions by 391%. Here's why speed wins.</p>
                </Link>
              </div>
            </motion.section>

          </article>

          {/* Sidebar — Table of Contents */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div>
              <TableOfContents headings={headings} />
            </div>
          </aside>
        </div>
      </div>

      {/* 5 Signs Comparison Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">5 Signs Your Business Needs an AI Receptionist</h2>
          <p className="text-gray-500 text-sm text-center mb-6">A quick diagnostic to determine if an AI receptionist will deliver immediate ROI</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Warning Sign</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">What It Costs You</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">What AI Receptionist Does</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Calls going to voicemail', '$300–$1,500 per missed call in lifetime value', 'Answers every call, any hour'],
                  ['No after-hours coverage', '30–50% of calls arrive outside business hours', '24/7 answering included in base plan'],
                  ['High no-show rate (15%+)', 'Empty slots cost $200–$800 per cancellation', 'Automated reminders cut no-shows by 40%+'],
                  ['Staff tied up with repeat questions', '2–4 hours per day handling basic inquiries', 'AI handles FAQs and booking automatically'],
                  ['Google reviews not growing', 'Every 1-star drop = 5–9% revenue loss', 'Automated post-visit review request sequences'],
                ].map(([sign, cost, fix]) => (
                  <tr key={sign} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{sign}</td>
                    <td className="px-4 py-3 text-red-600">{cost}</td>
                    <td className="px-4 py-3 text-indigo-700 bg-indigo-50/30">{fix}</td>
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

export default Blog5SignsAIReceptionist;
