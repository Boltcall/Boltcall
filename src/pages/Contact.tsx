import { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';
import LazyLottie from '../components/ui/LazyLottie';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters')
});

type ContactFormData = z.infer<typeof contactSchema>;

const PillInput = ({
  error: fieldError,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
}) => (
  <div>
    <input
      {...props}
      className={cn(
        "w-full px-5 py-3 bg-gray-100/80 rounded-full text-sm text-gray-800 placeholder-gray-400 border-none outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all duration-200 min-h-[48px] text-[16px] sm:text-sm"
      )}
    />
    {fieldError && (
      <p className="mt-1 ml-4 text-xs text-red-500">{fieldError}</p>
    )}
  </div>
);

const Contact: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Contact Boltcall - Get in Touch with Our Team';
    updateMetaDescription('Get in touch with Boltcall. Contact our team for speed-to-lead setup support, sales questions, or general inquiries. We\'re here to help.');

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "Contact", "item": "https://boltcall.org/contact" },
      ],
    };

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.id = 'breadcrumb-schema';
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbScript);

    return () => {
      document.getElementById('breadcrumb-schema')?.remove();
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema)
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      setIsLoading(true);

      const response = await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/9073ec26-3576-4fd4-9b63-a65c1d73250e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to submit form');

      setIsSubmitted(true);
      reset();
      setTimeout(() => setIsSubmitted(false), 3000);
    } catch (error) {
      console.error('Error submitting contact form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 px-4 py-6 sm:p-4 overflow-hidden">
      {/* Logo */}
      <div className="absolute top-4 left-5 z-30 hidden lg:block">
        <Link to="/">
          <img
            src="/boltcall_full_logo.png"
            alt="Boltcall"
            className="h-10 w-auto brightness-0 invert"
            width={120}
            height={40}
            loading="eager"
            decoding="async"
          />
        </Link>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[860px] min-h-0 lg:h-[540px] rounded-[20px] sm:rounded-[28px] shadow-2xl overflow-hidden bg-white"
      >
        {/* Gradient panel with curved clip-path (desktop only) */}
        <div className="absolute inset-0 z-10 hidden lg:block pointer-events-none">
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800"
            style={{
              width: "100%",
              height: "100%",
              clipPath: "ellipse(42% 100% at 5% 50%)",
            }}
          />
        </div>

        {/* Gradient panel content with Lottie (desktop only) */}
        <div className="absolute top-0 bottom-0 left-0 w-[45%] z-20 hidden lg:flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center px-8 text-white"
          >
            <p className="text-2xl font-bold mb-2">Get in Touch</p>
            <p className="text-white/80 text-sm leading-relaxed mb-4 max-w-[240px] mx-auto">
              Have a question or want to learn more? We'd love to hear from you.
            </p>
            <div className="w-72 h-72 mx-auto">
              <LazyLottie
                src="/Email.lottie"
                loop
                autoplay
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </motion.div>
        </div>

        {/* Form side */}
        <div className="relative lg:absolute lg:top-0 lg:bottom-0 lg:right-0 w-full lg:w-[55%] z-[5] flex flex-col items-center justify-center px-6 py-8 sm:px-12 sm:py-10 lg:py-0">
          {/* Mobile header with Lottie */}
          <div className="lg:hidden text-center mb-4">
            <div className="w-32 h-32 mx-auto mb-2">
              <LazyLottie
                src="/Email.lottie"
                loop
                autoplay
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="w-full max-w-[380px]"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-5">
              Contact Us
            </h1>

            {/* Success Message */}
            {isSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 rounded-full px-4 py-2 mb-4"
              >
                <p className="text-green-600 text-xs text-center font-medium">
                  Message sent successfully! We'll get back to you soon.
                </p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <PillInput
                {...register('name')}
                placeholder="Full Name"
                error={errors.name?.message}
              />
              <PillInput
                {...register('email')}
                type="email"
                placeholder="Email"
                error={errors.email?.message}
              />
              <div>
                <textarea
                  {...register('message')}
                  placeholder="Your message..."
                  rows={3}
                  className="w-full px-5 py-3 bg-gray-100/80 rounded-2xl text-sm text-gray-800 placeholder-gray-400 border-none outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all duration-200 resize-none text-[16px] sm:text-sm"
                />
                {errors.message && (
                  <p className="mt-1 ml-4 text-xs text-red-500">{errors.message.message}</p>
                )}
              </div>
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-52 mx-auto block py-3 min-h-[48px] rounded-full bg-blue-600 text-white font-bold text-sm tracking-widest uppercase shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />
                      Send Message
                    </span>
                  )}
                </button>
              </div>
            </form>

            <p className="mt-4 text-center text-xs text-gray-400">
              See how Boltcall compares on{' '}
              <a
                href="https://www.g2.com/categories/ai-sales-assistant"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                G2
              </a>{' '}
              or read reviews on{' '}
              <a
                href="https://www.capterra.com/p/10010996/Boltcall/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Capterra
              </a>
              .
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Contact Info */}
      <section id="contact-info" className="w-full max-w-[860px] mt-10">
        <div className="bg-white rounded-2xl shadow-lg px-8 py-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Support Email</span>
              <a href="mailto:support@boltcall.org" className="text-gray-900 font-semibold text-base hover:text-blue-600 transition-colors">
                support@boltcall.org
              </a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Book a Strategy Call</span>
              <a href="https://boltcall.org/book-a-call" target="_blank" rel="noopener noreferrer"
                className="text-gray-900 font-semibold text-base hover:text-blue-600 transition-colors">
                boltcall.org/book-a-call
              </a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Response Time</span>
              <span className="text-gray-700 text-sm">We respond to all inquiries within <strong>2 business hours</strong> during M–F 9am–6pm ET</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Urgent Issues</span>
              <span className="text-gray-700 text-sm">Use the <strong>live chat</strong> on boltcall.org for fastest response</span>
            </div>
          </div>
        </div>
      </section>

      {/* How We Can Help */}
      <section className="w-full max-w-[860px] mt-6 mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-10 text-white">
          <h2 className="text-2xl font-bold mb-6">How We Can Help</h2>
          <div className="space-y-4">
            <p className="text-white/90 leading-relaxed">
              Our support team typically responds to all inquiries within one business day, and most questions are answered the same day during business hours. Whether you're evaluating Boltcall for the first time or you're an existing customer running into an issue, someone on our team will get back to you with a clear, actionable answer — not a canned response or a link to an FAQ.
            </p>
            <p className="text-white/90 leading-relaxed">
              The kinds of questions we handle most often include: getting your AI receptionist set up and configured for your specific business hours and call flows, understanding billing and plan options, connecting Boltcall to third-party tools like your CRM or scheduling software, and troubleshooting any issues with call routing or AI response quality. You can reach us with anything from a quick question to a complex integration request.
            </p>
            <p className="text-white/90 leading-relaxed">
              Common questions from businesses reaching out for the first time: How long does onboarding take? (Most businesses are live within 24 hours.) Can I customize what the AI says on calls? (Yes — we configure the script to match your tone and services.) Does Boltcall work with my existing phone number? (In most cases, yes — we can forward calls or port your number depending on your setup.) Send us a message and we'll walk you through exactly how it works for your situation.
            </p>
          </div>
        </div>
      </section>

      {/* Why Boltcall? */}
      <section className="w-full max-w-[860px] mt-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Businesses Choose Boltcall</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: 'Questions answered in under 1 second', desc: 'Your prospects get instant answers 24/7 — no hold music, no missed calls, no lost opportunities' },
              { title: 'Setup in 30 minutes', desc: 'No developers or tech team needed — most businesses are live within one business day' },
              { title: 'Pays for itself with one extra lead', desc: 'One captured call per month covers the entire monthly cost — everything after that is pure upside' },
              { title: 'Trained on your business', desc: 'Handles your specific services, pricing, and FAQs — sounds like your best team member, not a bot' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="font-semibold text-gray-900 mb-1">✓ {item.title}</div>
                <div className="text-sm text-gray-600">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlight */}
      <section className="w-full max-w-[860px] mt-6">
        <div className="bg-white rounded-2xl shadow-sm px-8 py-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">What You Get with Boltcall</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
            {[
              ["AI Receptionist calls", "500–Unlimited/mo depending on plan"],
              ["Lead capture (SMS/email)", "Included on all plans"],
              ["CRM integrations", "Pro & Scale plans"],
              ["Custom AI voice & script", "Included on all plans"],
              ["Priority support", "Scale plan"],
            ].map(([feat, detail], i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">✓</span>
                <span><span className="font-semibold text-gray-900">{feat}</span> — {detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Internal navigation links */}
      <section className="w-full max-w-[860px] mt-4 mb-8">
        <div className="bg-white rounded-2xl shadow-sm px-8 py-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Explore Boltcall</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/pricing" className="text-blue-600 hover:underline font-medium">View Pricing Plans</Link>
            <span className="text-gray-300">·</span>
            <Link to="/help-center" className="text-blue-600 hover:underline font-medium">Help Center</Link>
            <span className="text-gray-300">·</span>
            <Link to="/features/ai-receptionist" className="text-blue-600 hover:underline font-medium">AI Receptionist Features</Link>
            <span className="text-gray-300">·</span>
            <Link to="/blog" className="text-blue-600 hover:underline font-medium">Read Our Blog</Link>
          </div>
        </div>
      </section>

      {/* Internal navigation links */}
      <section className="w-full max-w-[860px] mt-4 mb-8">
        <div className="bg-white rounded-2xl shadow-sm px-8 py-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Explore Boltcall</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/pricing" className="text-blue-600 hover:underline font-medium">View Pricing Plans</Link>
            <span className="text-gray-300">·</span>
            <Link to="/help-center" className="text-blue-600 hover:underline font-medium">Help Center</Link>
            <span className="text-gray-300">·</span>
            <Link to="/features/ai-receptionist" className="text-blue-600 hover:underline font-medium">AI Receptionist Features</Link>
            <span className="text-gray-300">·</span>
            <Link to="/blog" className="text-blue-600 hover:underline font-medium">Read Our Blog</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
