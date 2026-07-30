import React, { useEffect, useState } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Handshake,
  DollarSign,
  Users,
  Rocket,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Headphones,
  Gift,
  BarChart3,
  Shield,
  Zap,
  Send,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';

/* ── Application form schema ─────────────────────────────────────────── */
const partnerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  company: z.string().min(2, 'Company name is required'),
  website: z.string().optional(),
  clients: z.string().min(1, 'Please select an option'),
  message: z.string().optional(),
});
type PartnerFormData = z.infer<typeof partnerSchema>;

/* ── Reusable fade-up wrapper ────────────────────────────────────────── */
const FadeUp: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className = '',
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.55, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ── Data ─────────────────────────────────────────────────────────────── */
const benefits = [
  {
    icon: DollarSign,
    title: 'Recurring Revenue',
    desc: 'Earn generous recurring commissions on every client you refer. They stay, you keep earning — month after month.',
  },
  {
    icon: Gift,
    title: 'Free Setup for Your Clients',
    desc: 'Every client you send gets a white-glove onboarding at no extra cost. We do the heavy lifting so you look great.',
  },
  {
    icon: Headphones,
    title: 'Dedicated Partner Support',
    desc: 'Get a direct line to our team. Priority support, co-branded materials, and a partner manager who actually responds.',
  },
  {
    icon: BarChart3,
    title: 'Partner Dashboard',
    desc: 'Track referrals, commissions, and client activity in real time. Full transparency, zero guesswork.',
  },
  {
    icon: Shield,
    title: 'Proven Product',
    desc: 'Boltcall is already handling thousands of calls for local businesses. Your clients get a product that works on day one.',
  },
  {
    icon: TrendingUp,
    title: 'Grow Together',
    desc: 'The more clients you bring, the higher your tier and commission rate. We reward loyalty and volume.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Apply',
    desc: 'Fill out the quick form below. Tell us about your agency and the clients you serve.',
  },
  {
    num: '02',
    title: 'Get Approved',
    desc: "We'll review your application and set you up with your partner account, materials, and referral link.",
  },
  {
    num: '03',
    title: 'Refer & Earn',
    desc: 'Send clients our way. When they subscribe, you earn recurring commissions — it\'s that simple.',
  },
];

const idealPartners = [
  'Lead generation agencies',
  'Digital marketing agencies',
  'SEO & PPC agencies',
  'Web design & dev studios',
  'Business consultants',
  'CRM & SaaS resellers',
  'Call center operators',
  'Franchise consultants',
];

/* ════════════════════════════════════════════════════════════════════════
   PARTNERS PAGE
   ════════════════════════════════════════════════════════════════════════ */
const Partners: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PartnerFormData>({ resolver: zodResolver(partnerSchema) });

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Partner Program — Earn Recurring Revenue | Boltcall';
    updateMetaDescription(
      'Join the Boltcall Partner Program. Refer clients, earn recurring commissions, and grow your agency revenue with AI receptionist solutions.',
    );

    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = 'https://boltcall.org/partners';

    return () => {
      const el = document.querySelector("link[rel='canonical']");
      if (el) el.remove();
    };
  }, []);

  const onSubmit = async (data: PartnerFormData) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        'https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/9073ec26-3576-4fd4-9b63-a65c1d73250e',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, source: 'partner-application' }),
        },
      );
      if (!response.ok) throw new Error('Failed to submit');
      setIsSubmitted(true);
      reset();
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch (err) {
      console.error('Partner form error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <FadeUp>
            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-6 border border-blue-100">
              <Handshake className="w-4 h-4" />
              <span className="font-semibold">Partner Program</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Want Us to Be{' '}
              <span className="text-blue-600">Partners?</span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              You bring the clients. We bring the AI. Together we help local businesses
              never miss a call — and you earn recurring revenue for every referral.
            </p>

            <a
              href="#apply"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-full transition-all duration-300 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30"
            >
              Become a Partner
              <ArrowRight className="w-4 h-4" />
            </a>
          </FadeUp>
        </div>
      </section>

      {/* ── WHY PARTNER ──────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Partner with <span className="text-blue-600">Boltcall</span>?
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                We built our partner program for agencies that want to add recurring revenue
                without building another product.
              </p>
            </div>
          </FadeUp>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((b, i) => (
              <FadeUp key={b.title} delay={i * 0.08}>
                <div className="group relative bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-100 rounded-2xl p-7 transition-all duration-300 hover:shadow-lg hover:shadow-blue-600/5">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    <b.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-[15px]">{b.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <FadeUp>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-lg text-gray-500 max-w-xl mx-auto">
                Three steps. No red tape. Start earning in days, not months.
              </p>
            </div>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <FadeUp key={s.num} delay={i * 0.12}>
                <div className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-sm h-full">
                  <span className="text-5xl font-black text-blue-100 leading-none">{s.num}</span>
                  <h3 className="text-xl font-bold text-gray-900 mt-3 mb-2">{s.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{s.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-5 text-blue-300">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMISSION TIERS ─────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeUp>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Commission Structure
              </h2>
              <p className="text-lg text-gray-500 max-w-xl mx-auto">
                The more clients you refer, the more you earn. Simple, transparent, recurring.
              </p>
            </div>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                tier: 'Silver',
                clients: '1 – 5 clients',
                rate: '20%',
                color: 'from-gray-100 to-gray-50',
                border: 'border-gray-200',
                badge: 'bg-gray-200 text-gray-700',
              },
              {
                tier: 'Gold',
                clients: '6 – 15 clients',
                rate: '25%',
                color: 'from-amber-50 to-yellow-50/50',
                border: 'border-amber-200',
                badge: 'bg-amber-100 text-amber-700',
                popular: true,
              },
              {
                tier: 'Platinum',
                clients: '16+ clients',
                rate: '30%',
                color: 'from-blue-50 to-indigo-50/50',
                border: 'border-blue-200',
                badge: 'bg-blue-100 text-blue-700',
              },
            ].map((t, i) => (
              <FadeUp key={t.tier} delay={i * 0.1}>
                <div
                  className={`relative bg-gradient-to-br ${t.color} border ${t.border} rounded-2xl p-8 text-center h-full transition-shadow duration-300 hover:shadow-lg`}
                >
                  {t.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  )}
                  <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 ${t.badge}`}>
                    {t.tier}
                  </span>
                  <div className="text-5xl font-black text-gray-900 mb-1">{t.rate}</div>
                  <p className="text-sm text-gray-500 mb-4">recurring commission</p>
                  <p className="text-gray-600 font-medium">{t.clients}</p>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.3}>
            <p className="text-center text-gray-400 text-sm mt-8">
              Commissions are paid monthly on active subscriptions. No cap on earnings.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── WHO THIS IS FOR ──────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Built for Agencies That{' '}
                <span className="text-blue-600">Deliver Results</span>
              </h2>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                If you're already helping local businesses with leads, marketing, or operations —
                Boltcall is the perfect add-on. Your clients need their phones answered and leads
                followed up on. We handle that, you earn for the referral.
              </p>
              <a
                href="#apply"
                className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                Apply now
                <ArrowRight className="w-4 h-4" />
              </a>
            </FadeUp>

            <FadeUp delay={0.15}>
              <div className="grid grid-cols-2 gap-3">
                {idealPartners.map((p) => (
                  <div
                    key={p}
                    className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-xl px-4 py-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700 font-medium">{p}</span>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── WHAT YOUR CLIENTS GET ─────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeUp>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                What Your Clients Get
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                You're not just referring them to any product. You're giving them an unfair
                advantage.
              </p>
            </div>
          </FadeUp>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Zap,
                title: 'AI Receptionist — 24/7',
                desc: 'Every call answered instantly. No hold music, no voicemail, no missed opportunities.',
              },
              {
                icon: Rocket,
                title: 'Instant Lead Follow-Up',
                desc: 'New form submissions get a response in seconds, not hours. Speed-to-lead on autopilot.',
              },
              {
                icon: Users,
                title: 'SMS Booking & Follow-Ups',
                desc: 'Automated text conversations that book appointments, send reminders, and re-engage past clients.',
              },
              {
                icon: BarChart3,
                title: 'Analytics & Reporting',
                desc: 'Call logs, lead tracking, and performance dashboards — so your clients can see the ROI.',
              },
            ].map((item, i) => (
              <FadeUp key={item.title} delay={i * 0.08}>
                <div className="flex gap-5 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-500 text-[15px] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── APPLICATION FORM ─────────────────────────────────────────── */}
      <section id="apply" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <FadeUp>
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Apply to Become a Partner
              </h2>
              <p className="text-lg text-gray-500">
                Takes 2 minutes. We review every application within 48 hours.
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5"
            >
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Your Name
                </label>
                <input
                  {...register('name')}
                  placeholder="John Smith"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Work Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="john@agency.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Company / Agency Name
                </label>
                <input
                  {...register('company')}
                  placeholder="Acme Marketing"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                {errors.company && (
                  <p className="text-red-500 text-xs mt-1">{errors.company.message}</p>
                )}
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Website <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  {...register('website')}
                  placeholder="https://agency.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* How many clients */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  How many clients do you manage?
                </label>
                <select
                  {...register('clients')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select...
                  </option>
                  <option value="1-5">1 – 5</option>
                  <option value="6-15">6 – 15</option>
                  <option value="16-50">16 – 50</option>
                  <option value="50+">50+</option>
                </select>
                {errors.clients && (
                  <p className="text-red-500 text-xs mt-1">{errors.clients.message}</p>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Anything else we should know?{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  {...register('message')}
                  rows={3}
                  placeholder="Tell us about your agency, what industries you serve, or any questions..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-blue-600/25"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Application
                  </>
                )}
              </button>

              {isSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-center text-sm font-medium"
                >
                  Application received! We'll be in touch within 48 hours.
                </motion.div>
              )}
            </form>
          </FadeUp>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <FadeUp>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to Grow Together?
            </h2>
            <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
              Join agencies already earning recurring revenue with Boltcall.
              Your clients get a better product. You get a better bottom line.
            </p>
            <a
              href="#apply"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-full transition-all duration-300 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30"
            >
              Become a Partner Today
              <ArrowRight className="w-4 h-4" />
            </a>
          </FadeUp>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Partners;
