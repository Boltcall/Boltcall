import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Phone, Zap, Users, TrendingUp, Globe, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const About: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'About Boltcall - AI Receptionist Solutions | Boltcall';
    updateMetaDescription('Discover Boltcall: AI-powered solutions helping local businesses thrive. Learn our mission, values, and how we revolutionize customer communication.');
    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "About", "item": "https://boltcall.org/about"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              About <span className="text-blue-600">Boltcall</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              We're on a mission to help local businesses compete and thrive in the digital age 
              through intelligent AI-powered communication solutions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
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
              <span>Our Mission</span>
            </h2>
            
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p className="text-lg">
                At Boltcall, we believe that every business, regardless of size, deserves access 
                to enterprise-grade communication technology. We're democratizing AI-powered 
                customer service, making it accessible and affordable for local businesses 
                everywhere.
              </p>
              
              <p className="text-lg">
                Our mission is simple: help local businesses never miss an opportunity. Whether 
                it's a phone call at 2 AM, a form submission on a Sunday, or a text message 
                during peak hours, we ensure every customer interaction is handled professionally 
                and instantly.
              </p>
              
              <p className="text-lg">
                We understand that local businesses face unique challenges. Limited budgets, 
                staffing constraints, and the need to compete with larger corporations. That's 
                why we've built solutions that are powerful yet simple, affordable yet 
                comprehensive, and intelligent yet easy to use.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What We Do Section */}
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
              <span>What We Do</span>
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                  AI Receptionist Services
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  We provide intelligent AI receptionists that answer calls 24/7, handle customer 
                  inquiries, schedule appointments, and qualify leads—all automatically. Our AI 
                  never sleeps, never gets tired, and never misses a call.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                  Instant Lead Response
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  We ensure every form submission, text message, and inquiry gets an instant 
                  response. Research shows that responding within 60 seconds increases conversion 
                  rates by 391%—we make that possible for every business.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                  Business Growth Tools
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Beyond communication, we provide tools for lead reactivation, automated 
                  reminders, follow-up systems, and website optimization. Everything you need 
                  to grow your business in one platform.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why We Started Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Why We Started</span>
            </h2>
            
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p className="text-lg">
                Boltcall was born from a simple observation: local businesses were losing 
                customers because they couldn't compete with the 24/7 availability and instant 
                response times that customers have come to expect.
              </p>
              
              <p className="text-lg">
                We saw small businesses struggling with missed calls, unanswered forms, and 
                the high costs of hiring receptionists. We saw the frustration of business 
                owners who wanted to provide excellent customer service but lacked the resources 
                to do so consistently.
              </p>
              
              <p className="text-lg">
                We realized that AI technology had advanced to the point where it could solve 
                these problems—but existing solutions were either too expensive, too complex, 
                or designed for large enterprises. So we built Boltcall: AI-powered communication 
                solutions designed specifically for local businesses.
              </p>
              
              <p className="text-lg">
                Today, thousands of businesses trust Boltcall to handle their customer 
                communication. From dental practices to legal firms, from home services to 
                healthcare providers—we're helping businesses of all types compete and thrive 
                in the digital age.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Boltcall Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <section className="my-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What Makes Boltcall Different</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "Built for local businesses", desc: "Not an enterprise tool with a SMB price tag — built ground-up for owners who wear every hat" },
                  { title: "No tech team required", desc: "30-minute setup, plain-English configuration, and a team that picks up the phone when you need help" },
                  { title: "Pays for itself", desc: "One extra captured lead per month covers the entire monthly cost — most businesses see ROI in week one" },
                  { title: "Sounds like you", desc: "Trained on your services, pricing, and FAQs so every caller gets an answer, not a hold message" },
                ].map((item) => (
                  <div key={item.title} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="font-semibold text-gray-900 mb-1">✓ {item.title}</div>
                    <div className="text-sm text-gray-600">{item.desc}</div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        </div>
      </section>

 
      {/* Boltcall Plans Table */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <section className="my-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Boltcall Plans at a Glance</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm border-collapse">
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
                    ["Lead capture (SMS/email)", "✓", "✓", "✓"],
                    ["CRM integrations", "—", "✓", "✓"],
                    ["Custom AI voice & script", "✓", "✓", "✓"],
                    ["Priority support", "—", "—", "✓"],
                  ].map(([feat, ...vals], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="py-3 px-4 font-medium text-gray-800">{feat}</td>
                      {vals.map((v, j) => <td key={j} className="py-3 px-4 text-center text-gray-600">{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2 md:hidden">← Scroll to see full comparison</p>
          </section>
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
                <Users className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
              </div>
              <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                <Phone className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
              </div>
              <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                <Globe className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="text-gray-900 font-medium mt-4 text-4xl">Ready to Get Started?</h2>
            <p className="text-base text-gray-600 mt-2 whitespace-pre-line">Join thousands of businesses using Boltcall to transform their customer communication.</p>
            <Link
              to="/setup"
              className="inline-block mt-6"
            >
              <Button
                variant="primary"
                size="lg"
              >
                Start Free Setup
              </Button>
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

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions About Boltcall</h2>
        <dl className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">What does Boltcall actually do?</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Boltcall is a speed-to-lead platform that is a fully automated AI receptionist for local service businesses. It answers every inbound call 24/7, captures web leads instantly, books appointments into your calendar, and sends follow-up texts — all without any human intervention required from your team.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Who founded Boltcall and where is it based?</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Boltcall was founded to solve the #1 problem local service businesses face: losing leads because no one answered fast enough. The platform is used by plumbers, dentists, HVAC companies, law firms, med spas, and hundreds of other local businesses across North America.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Is Boltcall right for my industry?</h3>
            <p className="text-gray-600 text-sm leading-relaxed">If your business receives inbound calls or web leads and the first to respond wins the customer, Boltcall is built for you. It works across home services, healthcare, legal, solar, real estate, and any local service vertical where speed-to-lead directly impacts revenue.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">How is Boltcall different from a human answering service?</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Unlike human answering services, Boltcall responds in under 11 seconds — even at 3am on a Sunday — with no hold times, no staffing costs, and no missed calls. It integrates directly with your calendar to book appointments instantly, something human services can't do without a multi-step callback process.</p>
          </div>
        </dl>
      </section>

      <Footer />
    </div>
  );
};

export default About;

