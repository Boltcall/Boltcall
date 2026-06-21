import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import Section from './ui/Section';
import WhisperText from './ui/whisper-text';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { t } = useTranslation('marketing');
  const isRtl = useDirection() === 'rtl';

  const faqItems = t('faq.items', { returnObjects: true }) as Array<{ q: string; a: string }>;

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  };

  return (
    <Section id="faq" background="white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className={`mb-8 ${isRtl ? 'text-right' : 'text-center'}`}>
        <h2 className="text-2xl md:text-4xl font-bold text-text-main mb-4">
          <WhisperText
            text={t('faq.heading1')}
            className="text-2xl md:text-4xl font-bold text-text-main inline-block"
            delay={125}
            duration={0.625}
            x={-20}
            y={0}
            triggerStart="top 85%"
          />{' '}
          <WhisperText
            text={t('faq.heading2')}
            className="text-2xl md:text-4xl font-bold text-blue-500 inline-block"
            delay={125}
            duration={0.625}
            x={-20}
            y={0}
            triggerStart="top 85%"
          />
        </h2>
      </div>

      <div className={`max-w-3xl ${isRtl ? 'ml-0 mr-auto' : 'mx-auto'}`}>
        <div className="space-y-3">
          {faqItems.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="group bg-white rounded-xl border border-gray-200/50 overflow-hidden shadow-sm transition-all duration-300" style={{ contain: 'layout style' }}>
                <button
                  onClick={() => toggleFAQ(index)}
                  className={`w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-all duration-300 focus:outline-none rounded-t-xl ${isRtl ? 'text-right flex-row-reverse' : 'text-left'}`}
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className={`text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300 ${isRtl ? 'pl-4' : 'pr-4'}`}>
                    {faq.q}
                  </span>
                  <motion.div
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shadow-sm transition-shadow duration-300"
                    style={{ minWidth: '28px', minHeight: '28px' }}
                  >
                    {openIndex === index ? (
                      <Minus className="w-4 h-4 text-white" strokeWidth={2.5} />
                    ) : (
                      <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
                    )}
                  </motion.div>
                </button>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      id={`faq-answer-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.04, 0.62, 0.23, 0.98],
                        type: "spring"
                      }}
                      className="overflow-hidden"
                      style={{ willChange: 'height, opacity' }}
                    >
                      <div className={`px-5 pb-4 bg-white ${isRtl ? 'text-right' : ''}`}>
                        <p className="text-gray-600 leading-relaxed text-sm">
                          {faq.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default FAQ;
