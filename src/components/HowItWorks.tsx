import React from 'react';
import { motion } from 'framer-motion';
import WhisperText from './ui/whisper-text';
import { ContainerScroll, CardSticky } from './ui/cards-stack';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';

const PHASE_KEYS = ['receptionist', 'adsReplies', 'smsBooking'] as const;

const HowItWorks: React.FC = () => {
  const { t } = useTranslation('marketing');
  const isRtl = useDirection() === 'rtl';

  return (
    <section
      className="relative py-16 bg-transparent -mt-32"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="grid md:grid-cols-2 md:gap-8 xl:gap-12">
          {/* Section Header - Sticky Sidebar */}
          <div className={`left-0 md:sticky pt-24 ltr:ml-4 rtl:mr-4 ltr:pr-2 rtl:pl-2 ${isRtl ? 'text-right' : ''}`} style={{ top: '64px', height: 'fit-content' }}>
            <motion.h5
              className="text-sm uppercase tracking-wide font-medium text-white/70 mb-4 ltr:ml-5 rtl:mr-5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {t('howItWorks.label')}
            </motion.h5>
            <h2 className="font-bold mb-5 ltr:ml-5 rtl:mr-5 leading-none" style={{ fontSize: '54px' }}>
              <WhisperText
                text={t('howItWorks.heading1')}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white inline-block"
                delay={125}
                duration={0.625}
                x={-20}
                y={0}
                triggerStart="top 85%"
                style={{ fontSize: '1.155em' }}
              />
              <WhisperText
                text={t('howItWorks.heading2')}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-500 inline-block"
                delay={125}
                duration={0.625}
                x={-20}
                y={0}
                triggerStart="top 85%"
                style={{ fontSize: '1.155em' }}
              />
            </h2>
            <motion.p
              className="max-w-prose text-base md:text-lg leading-relaxed text-white/80 mt-5 ltr:ml-5 rtl:mr-5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
            >
              {t('howItWorks.description')}
            </motion.p>
          </div>

          {/* Sticky Cards */}
          <ContainerScroll className={`space-y-4 py-11 ${isRtl ? 'mr-0 md:mr-16 ml-0' : 'ml-0 md:ml-16'}`} style={{ minHeight: 'calc(100vh + 400px)' }}>
            {PHASE_KEYS.map((key, index) => {
              const checklist = t(`howItWorks.phases.${key}.checklist`, { returnObjects: true }) as string[];
              return (
                <CardSticky
                  key={key}
                  index={index}
                  incrementY={40}
                  className="rounded-2xl border-2 border-gray-200 bg-white shadow-2xl overflow-hidden"
                  style={{ maxWidth: '460px', minHeight: '320px', top: `${180 + index * 40}px` }}
                >
                  <div className={`p-5 md:p-8 h-full ${isRtl ? 'text-right' : ''}`}>
                    <div className="flex items-center mb-3">
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
                        {t(`howItWorks.phases.${key}.title`)}
                      </h2>
                    </div>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-5">
                      {t(`howItWorks.phases.${key}.description`)}
                    </p>

                    {/* Checklist */}
                    <div className="space-y-2">
                      {checklist.map((item, itemIndex) => (
                        <div key={itemIndex} className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse justify-end text-right' : ''}`}>
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardSticky>
              );
            })}
          </ContainerScroll>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
