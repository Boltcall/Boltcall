import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { createServiceSchema, injectSchemas } from '../lib/schema';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, ArrowRight, Phone, Calendar, MessageSquare, Bell, Zap, Users, Target, CheckCircle as CheckCircleIcon, Clock } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import { CategoryList } from '../components/ui/category-list';
import { FloatingIconsHero, type FloatingIconsHeroProps } from '../components/ui/floating-icons-hero-section';

// Business-related icon components using lucide-react
const IconPhone = (props: React.SVGProps<SVGSVGElement>) => <Phone {...props} strokeWidth={2.5} />;
const IconCalendar = (props: React.SVGProps<SVGSVGElement>) => <Calendar {...props} strokeWidth={2.5} />;
const IconSMS = (props: React.SVGProps<SVGSVGElement>) => <MessageSquare {...props} strokeWidth={2.5} />;
const IconBell = (props: React.SVGProps<SVGSVGElement>) => <Bell {...props} strokeWidth={2.5} />;
const IconZap = (props: React.SVGProps<SVGSVGElement>) => <Zap {...props} strokeWidth={2.5} />;
const IconUsers = (props: React.SVGProps<SVGSVGElement>) => <Users {...props} strokeWidth={2.5} />;
const IconTarget = (props: React.SVGProps<SVGSVGElement>) => <Target {...props} strokeWidth={2.5} />;
const IconCheckCircle = (props: React.SVGProps<SVGSVGElement>) => <CheckCircleIcon {...props} strokeWidth={2.5} />;
const IconClock = (props: React.SVGProps<SVGSVGElement>) => <Clock {...props} strokeWidth={2.5} />;

// Define the icons with their unique positions
const newsletterIcons: FloatingIconsHeroProps['icons'] = [
  { id: 1, icon: IconPhone, className: 'top-[10%] left-[10%]' },
  { id: 2, icon: IconCalendar, className: 'top-[20%] right-[8%]' },
  { id: 3, icon: IconSMS, className: 'top-[70%] left-[10%]' },
  { id: 4, icon: IconBell, className: 'top-[5%] left-[30%]' },
  { id: 5, icon: IconZap, className: 'top-[5%] right-[30%]' },
  { id: 6, icon: IconUsers, className: 'top-[40%] left-[15%]' },
  { id: 7, icon: IconTarget, className: 'top-[65%] right-[25%]' },
  { id: 8, icon: IconCheckCircle, className: 'top-[50%] right-[5%]' },
  { id: 9, icon: IconClock, className: 'top-[55%] left-[5%]' },
];

const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'AI Business Newsletter | Weekly Tips & Strategies | Boltcall';
    updateMetaDescription('Subscribe to the Boltcall newsletter for weekly AI business strategies, productivity tips, and exclusive insights for local business owners. Join free.');

    return injectSchemas([
      createServiceSchema({
        name: 'Boltcall AI Business Newsletter',
        description: 'A free weekly newsletter delivering AI business strategies, productivity tips, lead capture tactics, and exclusive insights for local business owners who want to grow with AI.',
        url: '/newsletter',
      }),
    ]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Call webhook with email
      const response = await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/7212532d-a208-4970-b962-83df7a66501b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe to newsletter');
      }

      setIsSubscribed(true);
      setEmail('');
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      alert('Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      
      {/* Floating Icons Hero Section */}
      <div className="relative">
        <FloatingIconsHero
          title="Automate & Dominate"
          subtitle="Weekly secrets to implementing AI in your business with zero technical skills."
          icons={newsletterIcons}
          className="bg-white"
        >
          {/* Newsletter Form */}
          <div className="max-w-md mx-auto px-4">
            {!isSubscribed ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white rounded-lg shadow-lg p-6 border border-gray-200"
              >
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={2.5} />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 border border-gray-200"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Thank You!
                </h2>
                <p className="text-gray-600">
                  You've successfully subscribed to our newsletter. Check your email for a confirmation message.
                </p>
              </motion.div>
            )}
          </div>
        </FloatingIconsHero>
      </div>

      <main className="pb-16 px-4 sm:px-6 lg:px-8 -mt-32">
        <div className="max-w-7xl mx-auto">

          {/* Past Newsletters Section - Centered */}
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <CategoryList
                title="Past Newsletters"
                categories={[
                  {
                    id: 1,
                    title: 'AI Receptionist Best Practices',
                    subtitle: 'January 15, 2025 • Learn how to maximize your AI receptionist performance and boost customer satisfaction.',
                    icon: <ArrowRight className="w-8 h-8" />,
                    onClick: () => {
                      // Navigate to newsletter or open it
                      // TODO: navigate to newsletter article
                    },
                  },
                  {
                    id: 2,
                    title: 'Speed to Lead: The 391% Advantage',
                    subtitle: 'January 8, 2025 • Discover why responding to leads within 5 minutes can increase conversion rates by 391%.',
                    icon: <ArrowRight className="w-8 h-8" />,
                    onClick: () => {
                      // TODO: navigate to newsletter article
                    },
                  },
                  {
                    id: 3,
                    title: 'Automated Follow-Ups That Convert',
                    subtitle: 'January 1, 2025 • Master the art of automated follow-ups and turn more leads into customers.',
                    icon: <ArrowRight className="w-8 h-8" />,
                    onClick: () => {
                      // TODO: navigate to newsletter article
                    },
                  },
                  {
                    id: 4,
                    title: '2025 Trends in AI for Local Businesses',
                    subtitle: 'December 25, 2024 • Stay ahead with the latest AI trends and technologies for local businesses.',
                    icon: <ArrowRight className="w-8 h-8" />,
                    onClick: () => {
                      // TODO: navigate to newsletter article
                    },
                  },
                ]}
                className="bg-white"
              />
            </motion.div>
          </div>
        </div>
      </main>

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

      <Footer />
    </div>
  );
};

export default Newsletter;

