import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    quote:
      "We used to miss 30–40 calls a week after hours. With Boltcall, every single one gets answered and booked automatically. Our first month, we recovered $12,000 in jobs we would have lost.",
    name: 'Marcus T.',
    role: 'Owner',
    business: 'Summit HVAC Services',
    location: 'Phoenix, AZ',
    rating: 5,
    highlight: '$12,000 recovered in month one',
  },
  {
    quote:
      "Our front desk was drowning in calls during peak season. Boltcall handles routine bookings 24/7 so my team focuses on patients in the chair — not the phone. Patient satisfaction is up noticeably.",
    name: 'Dr. Sarah K.',
    role: 'Owner & Dentist',
    business: 'Bright Smile Dental',
    location: 'Austin, TX',
    rating: 5,
    highlight: 'Team freed from phone, patients happy',
  },
  {
    quote:
      "I was skeptical an AI could qualify roofing leads, but callers tell me it's seamless. We're booking storm-damage inspections at 2am now. No other roofer in our market is doing this.",
    name: 'Jake R.',
    role: 'Co-founder',
    business: 'Ridgeline Roofing Co.',
    location: 'Nashville, TN',
    rating: 5,
    highlight: 'Booking storm inspections at 2am',
  },
];

const Testimonials: React.FC = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Customer Stories</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Local Businesses Winning With Speed
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Real results from real business owners who stopped losing leads to missed calls.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, si) => (
                  <Star key={si} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              {/* Highlight pill */}
              <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 w-fit">
                {t.highlight}
              </div>

              {/* Quote */}
              <blockquote className="text-gray-700 text-sm leading-relaxed flex-grow mb-6 relative">
                <Quote className="w-6 h-6 text-blue-100 absolute -top-1 -left-1" />
                <span className="relative">"{t.quote}"</span>
              </blockquote>

              {/* Attribution */}
              <div className="border-t border-gray-100 pt-4">
                <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                <p className="text-gray-500 text-xs">{t.role} · {t.business}</p>
                <p className="text-gray-400 text-xs">{t.location}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
