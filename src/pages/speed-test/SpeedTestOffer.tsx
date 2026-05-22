import React, { useEffect, useState } from 'react';
import { updateMetaDescription } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Check, Zap, Database, Image, Globe, Server, Star, Phone, User, Mail } from 'lucide-react';
import GiveawayBar from '../../components/GiveawayBar';
import Header from '../../components/Header';
import Button from '../../components/ui/Button';
import { useSpeedTestStore } from '../../stores/speedTestStore';

const SpeedTestOffer: React.FC = () => {
  const { reset } = useSpeedTestStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  // This page is a funnel step shown after the speed test — it reads state
  // from useSpeedTestStore and is meaningless out of context. Not an SEO page.
  useEffect(() => {
    let tag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'robots';
      document.head.appendChild(tag);
    }
    const previous = tag.content;
    tag.content = 'noindex, nofollow';
    return () => { tag!.content = previous || ''; };
  }, []);

  React.useEffect(() => {
    document.title = 'Website Speed Optimization Offer - Improve Performance';
    updateMetaDescription('Special offer for website speed optimization. Get your site faster and improve conversions with our services. Get started.');
  }, []);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const features = [
    { icon: Zap, text: 'Full speed optimization' },
    { icon: Database, text: 'Caching setup' },
    { icon: Image, text: 'Image compression' },
    { icon: Globe, text: 'CDN configuration' },
    { icon: Server, text: 'Hosting recommendations' },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      company: 'Tech Startup',
      text: 'Our site speed improved by 60% in just one week!',
      rating: 5,
    },
    {
      name: 'Mike Chen',
      company: 'E-commerce Store',
      text: 'Best investment we made. Load time cut in half.',
      rating: 5,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <GiveawayBar />
        <div className="relative z-10 pt-32">
          <Header />
          
          <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h2>
              <p className="text-lg text-gray-600 mb-8">
                We've received your information. Our team will contact you shortly to schedule your free consultation.
              </p>
              <Button
                onClick={() => {
                  reset();
                  window.location.href = '/';
                }}
                variant="primary"
              >
                Return to Home
              </Button>
            </motion.div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <GiveawayBar />
      <div className="relative z-10 pt-32">
        <Header />
        
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                We'll Fix Your Speed for You
              </h1>
              <p className="text-xl text-gray-600">
                Let our experts optimize your website performance
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Features */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">What You'll Get</h2>
                  <ul className="space-y-4">
                    {features.map((feature, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-4"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <feature.icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-gray-700">{feature.text}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Testimonials */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">What Our Clients Say</h2>
                  <div className="space-y-6">
                    {testimonials.map((testimonial, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.2 }}
                        className="border-l-4 border-blue-500 pl-4"
                      >
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-gray-700 mb-2">"{testimonial.text}"</p>
                        <p className="text-sm font-medium text-gray-900">{testimonial.name}</p>
                        <p className="text-sm text-gray-500">{testimonial.company}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Form */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 sticky top-32">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Book Free Call</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Your name"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(555) 123-4567"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="your@email.com"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSubmitting}
                      className="w-full py-3 text-lg"
                    >
                      {isSubmitting ? 'Submitting...' : 'Book Free Call'}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default SpeedTestOffer;

