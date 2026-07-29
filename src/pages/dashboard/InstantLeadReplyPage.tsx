import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const InstantLeadReplyPage: React.FC = () => {
  const navigate = useNavigate();

  const cards = [
    {
      key: 'website',
      title: 'Website Instant Response',
      subtitle: 'Embed · WordPress · API',
      description: 'Every form submission on your site gets an instant follow-up. One line of code or a WordPress plugin — works with any page builder.',
      color: 'bg-purple-500',
      route: '/dashboard/website-instant-response',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      key: 'ads',
      title: 'Ad Instant Response',
      subtitle: 'Facebook Ads · Google Ads (soon)',
      description: 'Capture leads from your ad campaigns the moment they submit. Connect your Facebook Lead Ads and respond before anyone else.',
      color: 'bg-blue-600',
      route: '/dashboard/ad-instant-response',
      icon: (
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Instant Lead Response</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Choose where your leads come from. Every submission gets an instant reply — automatically.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl"
      >
        {cards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer group"
            onClick={() => navigate(card.route)}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 leading-tight">{card.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{card.subtitle}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{card.description}</p>

            <div className="flex items-center gap-1 text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
              Set up
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default InstantLeadReplyPage;
