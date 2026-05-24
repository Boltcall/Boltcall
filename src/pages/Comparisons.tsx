import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, Calendar } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';

const Comparisons: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist Comparisons & Alternatives | Boltcall';
    updateMetaDescription('Compare Boltcall AI receptionist with alternatives. See how Boltcall compares to traditional answering services. View now.');

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Comparisons", "item": "https://boltcall.org/comparisons"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  const comparisons = [
    {
      title: 'Human Receptionist vs <span class="text-blue-600">Boltcall</span>',
      description: 'See how Boltcall compares to hiring a human receptionist in terms of cost, reliability, and capabilities.',
      href: '/comparisons/receptionist-vs-boltcall',
      category: 'Receptionist',
      date: 'February 10, 2025',
      readTime: '7 min read'
    },
    {
      title: 'Answering Services vs <span class="text-blue-600">Boltcall</span>',
      description: 'Compare professional answering services with Boltcall\'s AI-powered solution for your business.',
      href: '/comparisons/answering-services-vs-boltcall',
      category: 'Answering Services',
      date: 'February 10, 2025',
      readTime: '7 min read'
    }
  ];

  const competitors = [
    {
      title: 'Boltcall vs <span class="text-blue-600">GoHighLevel</span>',
      description: 'Compare Boltcall\'s AI receptionist with GoHighLevel\'s all-in-one marketing platform. See which delivers better ROI for local businesses.',
      href: '/compare/boltcall-vs-gohighlevel',
      category: 'CRM Platform',
      date: 'April 8, 2026',
      readTime: '8 min read'
    },
    {
      title: 'Boltcall vs <span class="text-blue-600">Podium</span>',
      description: 'See how Boltcall stacks up against Podium for lead conversion, messaging, and customer communication.',
      href: '/compare/boltcall-vs-podium',
      category: 'Messaging Platform',
      date: 'April 8, 2026',
      readTime: '7 min read'
    },
    {
      title: 'Boltcall vs <span class="text-blue-600">Birdeye</span>',
      description: 'Compare Boltcall\'s AI-powered solution with Birdeye\'s reputation and customer experience platform.',
      href: '/compare/boltcall-vs-birdeye',
      category: 'Reputation Platform',
      date: 'April 8, 2026',
      readTime: '7 min read'
    },
    {
      title: 'Boltcall vs <span class="text-blue-600">Smith.ai</span>',
      description: 'Compare Boltcall\'s AI receptionist with Smith.ai\'s virtual receptionist and intake services.',
      href: '/compare/boltcall-vs-smith-ai',
      category: 'Virtual Receptionist',
      date: 'April 8, 2026',
      readTime: '8 min read'
    },
    {
      title: '5 Best <span class="text-blue-600">Podium Alternatives</span> for Local Businesses (2026)',
      description: 'Five Podium alternatives ranked by lead-conversion focus, response speed, and pricing transparency. Honest strengths and weaknesses for each.',
      href: '/compare/podium-alternatives',
      category: 'Roundup',
      date: 'May 6, 2026',
      readTime: '9 min read'
    },
    {
      title: 'Boltcall vs <span class="text-blue-600">GoodCall</span>',
      description: 'Flat all-in-one speed-to-lead vs per-unique-caller AI phone agent. Pricing math at three call volumes plus honest "where each one wins" verdict.',
      href: '/compare/boltcall-vs-goodcall',
      category: 'AI Receptionist',
      date: 'May 24, 2026',
      readTime: '9 min read'
    },
    {
      title: 'Boltcall vs <span class="text-blue-600">Callin.io</span>',
      description: 'Managed turnkey speed-to-lead vs DIY minutes-metered AI calling at $30/mo. Which fits your local service business in 2026?',
      href: '/compare/boltcall-vs-callin',
      category: 'AI Calling',
      date: 'May 24, 2026',
      readTime: '9 min read'
    },
    {
      title: 'Boltcall vs <span class="text-blue-600">Lindy</span>',
      description: 'Purpose-built receptionist vs general AI agent platform with voice billed at $0.19/minute. The honest read on which one belongs in a local-service stack.',
      href: '/compare/boltcall-vs-lindy',
      category: 'AI Agent Platform',
      date: 'May 24, 2026',
      readTime: '8 min read'
    },
    {
      title: 'Boltcall vs <span class="text-blue-600">Convin.ai</span>',
      description: 'Speed-to-lead receptionist vs contact-center QA / agent coaching. Different products entirely — here is when each one wins.',
      href: '/compare/boltcall-vs-convin',
      category: 'Contact Center',
      date: 'May 24, 2026',
      readTime: '7 min read'
    },
    {
      title: 'Boltcall vs <span class="text-blue-600">SoundHound AI</span>',
      description: 'SMB speed-to-lead vs enterprise conversational AI (Amelia, drive-thru, automotive). Why local businesses pick Boltcall — and why SoundHound is not for them.',
      href: '/compare/boltcall-vs-soundhound',
      category: 'Enterprise Voice AI',
      date: 'May 24, 2026',
      readTime: '7 min read'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <p className="text-gray-700">
          This page compares Boltcall's AI receptionist with traditional call centers, human receptionists, and other answering services, highlighting the advantages and disadvantages of each option.
        </p>
      </section>

      {/* Hero Section */}
      <section className="relative pt-32 pb-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              <span className="text-blue-600">Boltcall</span> Comparisons
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Comparisons Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {comparisons.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {comparisons.map((comparison, index) => (
              <motion.article
                key={comparison.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group"
              >
                <Link to={comparison.href} className="block h-full">
                  <div className="p-6 h-full flex flex-col">
                    {/* Category Badge */}
                    <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-4 w-fit">
                      <span className="font-semibold">{comparison.category}</span>
                    </div>
                    
                    {/* Title */}
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors" dangerouslySetInnerHTML={{ __html: comparison.title }} />
                    
                    {/* Excerpt */}
                    <p className="text-gray-600 mb-6 flex-grow line-clamp-3">
                      {comparison.description}
                    </p>
                    
                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{comparison.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{comparison.readTime}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">No comparisons available yet. Check back soon!</p>
          </div>
        )}
      </section>

      {/* Head-to-Head Competitor Comparisons */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            See How <span className="text-blue-600">Boltcall</span> Compares
          </h2>
          <p className="text-gray-600 mt-2">Head-to-head breakdowns against the top platforms in the space.</p>
        </motion.div>

        {/* Featured Comparisons quick links - direct routes for every surviving compare page */}
        <div className="mb-10 bg-blue-50/40 border border-blue-100 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Featured Comparisons</h3>
          <p className="text-sm text-gray-600 mb-4">Why teams switch to Boltcall vs each platform.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <div>
              <Link to="/compare/boltcall-vs-gohighlevel" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                Boltcall vs GoHighLevel
              </Link>
              <p className="text-gray-600 text-xs mt-1">Speed-to-lead instead of an all-in-one CRM stack.</p>
            </div>
            <div>
              <Link to="/compare/boltcall-vs-smith-ai" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                Boltcall vs Smith.ai
              </Link>
              <p className="text-gray-600 text-xs mt-1">AI 24/7 with no per-call fees vs human virtual receptionists.</p>
            </div>
            <div>
              <Link to="/compare/boltcall-vs-birdeye" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                Boltcall vs BirdEye
              </Link>
              <p className="text-gray-600 text-xs mt-1">Booked jobs over reputation dashboards.</p>
            </div>
            <div>
              <Link to="/compare/boltcall-vs-podium" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                Boltcall vs Podium
              </Link>
              <p className="text-gray-600 text-xs mt-1">Instant phone answering, not just two-way texting.</p>
            </div>
            <div>
              <Link to="/comparisons/receptionist-vs-boltcall" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                Human Receptionist vs Boltcall
              </Link>
              <p className="text-gray-600 text-xs mt-1">Never sick, never on break, answers in under 11 seconds.</p>
            </div>
            <div>
              <Link to="/comparisons/answering-services-vs-boltcall" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                Answering Services vs Boltcall
              </Link>
              <p className="text-gray-600 text-xs mt-1">Books appointments live instead of just taking messages.</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {competitors.map((competitor, index) => (
            <motion.article
              key={competitor.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group"
            >
              <Link to={competitor.href} className="block h-full">
                <div className="p-6 h-full flex flex-col">
                  {/* Category Badge */}
                  <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-4 w-fit">
                    <span className="font-semibold">{competitor.category}</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors" dangerouslySetInnerHTML={{ __html: competitor.title }} />

                  {/* Excerpt */}
                  <p className="text-gray-600 mb-6 flex-grow line-clamp-3">
                    {competitor.description}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{competitor.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{competitor.readTime}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </section>


      {/* AI Receptionist Comparison Summary Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Boltcall vs. Competitors: Quick Comparison</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How Boltcall compares to the most common alternatives for local business phone handling</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Feature</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50 text-center">Boltcall</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200 text-center">Smith.ai</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200 text-center">Podium</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200 text-center">GoHighLevel</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI phone answering', '\u2713', '\u2713', '\u2717', 'Partial'],
                  ['24/7 coverage', '\u2713', '\u2713', '\u2713', '\u2713'],
                  ['Live appointment booking', '\u2713', 'Message only', '\u2717', '\u2713'],
                  ['SMS follow-up automation', '\u2713', '\u2717', '\u2713', '\u2713'],
                  ['No-show reminders', '\u2713', '\u2717', '\u2717', '\u2713'],
                  ['Google review automation', '\u2713', '\u2717', '\u2713', '\u2717'],
                  ['Setup time', '30 min', '1-2 days', '1-2 weeks', '2-4 weeks'],
                  ['Starting price', '$79/mo', '$292.50/mo', '$399/mo', '$97/mo'],
                  ['Per-minute fees', 'None', '$7-9/call', 'None', 'None'],
                ].map(([feature, boltcall, smith, podium, ghl]) => (
                  <tr key={feature} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center bg-indigo-50/30 text-indigo-700 font-semibold">{boltcall}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{smith}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{podium}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{ghl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Next Steps CTA */}
      <section className="py-10 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Ready to See Boltcall in Action?
          </h2>
          <p className="text-gray-600 mb-6">
            Compare plans or talk to our team about your business.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold transition-colors"
            >
              Boltcall Pricing
            </Link>
            <Link
              to="/book-a-call"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-colors"
            >
              Book a Call
            </Link>
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

export default Comparisons;

