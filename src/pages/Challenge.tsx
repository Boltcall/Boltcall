import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Shield, Phone, ArrowRight, Zap, CheckCircle2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { updateMetaDescription } from '../lib/utils';

interface AllTimeStats {
  totalAttempts: number;
  aiDefenseRate: string;
}

const Challenge: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [allTimeStats, setAllTimeStats] = useState<AllTimeStats | null>(null);

  useEffect(() => {
    document.title = 'Break Our AI Challenge: Can You Trick Our AI Receptionist? (2026) | Boltcall';
    updateMetaDescription(
      'Talk to our AI receptionist and try to extract the secret word in 60 seconds. Social engineering, persuasion, prompt hacking welcome. Win a free smart website worth $2,500.'
    );

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Break Our AI Challenge',
      description:
        'A weekly interactive challenge where callers try to trick Boltcall\'s AI receptionist into revealing a secret word. Tests AI security and social engineering resistance.',
      url: 'https://boltcall.org/challenge',
      publisher: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
    };

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the Break Our AI Challenge?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A weekly contest where you talk to our AI receptionist in-browser and try to make it reveal a secret word within 60 seconds. Crack it and win a free smart website worth $2,500.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I participate?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Enter your name and email, then start the voice challenge right in your browser. No phone needed. You have 60 seconds to extract the secret word.',
          },
        },
        {
          '@type': 'Question',
          name: 'What do I win?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Winners receive a free smart website built by the Boltcall team, valued at $2,500. One winner per week.',
          },
        },
        {
          '@type': 'Question',
          name: 'What techniques are allowed?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Any social engineering technique is fair game — persuasion, impersonation, prompt injection, confusion, authority claims. The only limit is the 60-second window.',
          },
        },
      ],
    };

    const s1 = document.createElement('script');
    s1.id = 'challenge-schema';
    s1.type = 'application/ld+json';
    s1.text = JSON.stringify(schema);
    document.head.appendChild(s1);

    const s2 = document.createElement('script');
    s2.id = 'challenge-faq-schema';
    s2.type = 'application/ld+json';
    s2.text = JSON.stringify(faqSchema);
    document.head.appendChild(s2);

    fetchStats();

    return () => {
      document.getElementById('challenge-schema')?.remove();
      document.getElementById('challenge-faq-schema')?.remove();
    };
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/.netlify/functions/break-my-ai/stats');
      if (res.ok) setAllTimeStats(await res.json());
    } catch { /* silent */ }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please enter your name and email.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    // Save to sessionStorage so the call page can use them
    sessionStorage.setItem('challenge_name', name.trim());
    sessionStorage.setItem('challenge_email', email.trim());

    navigate('/challenge/call');
  };

  return (
    <div className="bg-white min-h-screen">
      <Header />

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <h1 className="text-3xl md:text-5xl font-bold text-[#0B1220] mb-4 leading-tight">
                  Break Our AI: Can You Trick Our Receptionist?
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Our AI receptionist is guarding a secret word. You have 60 seconds in a live voice conversation to extract it.
                  Social engineering, persuasion, prompt hacking — anything goes. Crack it and win a free $2,500 smart website.
                </p>
              </motion.div>

              {allTimeStats && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-6 md:gap-10 mt-10"
                >
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-bold text-[#0B1220]">{allTimeStats.totalAttempts.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Attempts</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-bold text-blue-600">{allTimeStats.aiDefenseRate}%</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">AI Defense Rate</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* ── Entry Card ─────────────────────────────────────────────── */}
        <section className="pb-16 lg:pb-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
            >
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl overflow-hidden shadow-[0_35px_60px_-12px_rgba(0,0,0,0.6)]">

                {/* Left: info panel */}
                <div className="bg-gray-900 text-white p-10 md:p-12 flex flex-col justify-between">
                  <div>
                    <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-400 rounded-full -ml-[8px]">
                      Weekly Challenge
                    </span>
                    <h2 className="mt-3 text-2xl md:text-3xl font-extrabold text-white leading-tight">
                      <span className="text-white">Crack the Word.</span>
                      <br />
                      <span className="text-blue-500">Win $2,500.</span>
                    </h2>

                    <p className="mt-6 text-white/80 text-sm leading-6">
                      Talk to our AI right in your browser. 60 seconds. Any technique. If you get the secret word — you win.
                    </p>

                    <ul className="mt-6 space-y-3 text-white/90 text-sm">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" strokeWidth={2.5} />
                        <span>Live voice call — right in your browser</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" strokeWidth={2.5} />
                        <span>60 seconds — social engineering welcome</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" strokeWidth={2.5} />
                        <span>New secret word every Monday</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" strokeWidth={2.5} />
                        <span>One winner per week</span>
                      </li>
                    </ul>

                    <div className="mt-8 bg-gray-800 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="text-white font-bold text-sm">Crack It → Free Smart Website</p>
                          <p className="text-gray-400 text-xs mt-0.5">$2,500 value · Built by our team in 24 hours</p>
                        </div>
                      </div>
                    </div>

                    {allTimeStats && (
                      <div className="mt-6 flex items-center gap-6">
                        <div>
                          <p className="text-2xl font-bold text-white">{allTimeStats.totalAttempts.toLocaleString()}</p>
                          <p className="text-xs text-gray-400 uppercase tracking-wider">Attempts</p>
                        </div>
                        <div className="h-8 w-px bg-gray-700" />
                        <div>
                          <p className="text-2xl font-bold text-blue-400">{allTimeStats.aiDefenseRate}%</p>
                          <p className="text-xs text-gray-400 uppercase tracking-wider">AI Wins</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: entry form */}
                <div className="bg-gradient-to-b from-brand-blue to-brand-sky text-white p-10 md:p-12 flex flex-col justify-center">
                  <p className="text-xs uppercase tracking-widest text-white/70 mb-2">Enter to Play</p>
                  <h3 className="text-2xl font-extrabold text-white mb-2">Who are you?</h3>
                  <p className="text-white/80 text-sm mb-8">
                    We will notify you if you win and send your prize details.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-white/70 text-xs font-bold uppercase tracking-wider">Your Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="First name"
                        required
                        autoFocus
                        className="mt-1 w-full px-4 py-3 rounded-md bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-white/70 text-xs font-bold uppercase tracking-wider">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="mt-1 w-full px-4 py-3 rounded-md bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                      />
                    </div>

                    {error && <p className="text-red-200 text-sm">{error}</p>}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-brand-blue font-bold rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Start the Challenge
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  <p className="text-xs text-white/50 mt-6">No spam. Just prize notifications.</p>
                </div>

              </div>
            </motion.div>
          </div>
        </section>

        {/* ── What This Proves ──────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl md:text-4xl font-bold text-[#0B1220] text-center mb-4">
                What Does This Challenge Prove?
              </h2>
              <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
                If hundreds of people using every trick cannot break through, your business calls are in safe hands.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Shield,
                  title: 'Protect Every Business Call',
                  desc: 'The AI stays professional no matter what callers try. Manipulation, impersonation, and injection attempts all fail the same way.',
                },
                {
                  icon: Phone,
                  title: 'Never Lose a Lead',
                  desc: 'No matter how difficult the caller, your business stays on-script and captures every opportunity without you lifting a finger.',
                },
                {
                  icon: Zap,
                  title: 'Answer Every Call, Win Every Opportunity',
                  desc: 'Every call answered in under 1 second — weekends, holidays, overnight. No lead slips through.',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-lg grid place-items-center mb-4">
                    <item.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-[#0B1220] font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────── */}
        <section className="py-16 lg:py-24 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-4xl font-bold text-[#0B1220] text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {[
                {
                  q: 'What is the Break Our AI Challenge?',
                  a: 'A weekly contest where you have a live voice conversation with our AI receptionist and try to extract a secret word in 60 seconds. Use any technique you like. Crack it and win a free smart website worth $2,500.',
                },
                {
                  q: 'How does the voice call work?',
                  a: 'It runs entirely in your browser — no app, no phone number needed. Click start, allow microphone access, and talk to the AI live. Your 60-second window starts when the call connects.',
                },
                {
                  q: 'What techniques are allowed?',
                  a: 'Anything: persuasion, impersonation, prompt injection, confusion tactics, authority claims, emotional manipulation. The only limit is the 60-second call window.',
                },
                {
                  q: 'What do I win?',
                  a: 'A free smart website built by the Boltcall team — valued at $2,500. One winner per week. The secret word resets every Monday.',
                },
                {
                  q: 'What if I cannot crack the word?',
                  a: "That is the point. If you can't break our AI, imagine what it can do protecting your business. The same AI handles calls, books appointments, and qualifies leads 24/7.",
                },
              ].map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <h3 className="text-lg font-semibold text-[#0B1220] mb-2">{faq.q}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl md:text-4xl font-bold text-[#0B1220] mb-4">
                Want This AI Answering Your Calls?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                The same AI that holds up against social engineers and prompt hackers every week can run your front desk 24/7. Set up in 5 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="/free-website"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
                >
                  Get Your Free Website
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
                >
                  See Pricing
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Trust signals */}
      <section className="bg-gray-50 border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
            {[
              '100% Free — no credit card required',
              'Used by 500+ local businesses',
              'Results in 30 days or your money back',
              'Your data is never sold or shared',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Challenge;
