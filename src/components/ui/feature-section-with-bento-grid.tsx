import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  AnimatedCard,
  CardBody,
  CardDescription,
  CardTitle,
  CardVisual,
  Visual3,
} from './animated-card-chart';
import LazyLottie from './LazyLottie';
import { Clock } from 'lucide-react';
import { useDirection } from '../../hooks/useDirection';

function Feature() {
  const { t } = useTranslation('marketing');
  const isRtl = useDirection() === 'rtl';
  const steps = t('features.closingRates.steps', { returnObjects: true }) as Array<{ time: string; text: string }>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl ${isRtl ? 'mr-0 sm:mr-8 ml-0' : 'ml-0 sm:ml-8'}`}>
            {/* Wide Card - Text on Left */}
            <motion.div
              className="bg-muted rounded-xl lg:col-span-2 p-6 flex flex-col sm:flex-row items-center shadow-2xl h-auto sm:min-h-64 w-full"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              {/* Text content */}
              <div className={`flex flex-col max-w-xs ${isRtl ? 'text-right sm:order-2' : 'text-left'}`}>
                <h3 className="text-2xl font-semibold tracking-tight mb-2 text-black">{t('features.closingRates.title')}</h3>
                <p className="text-muted-foreground text-base mb-4">
                  {t('features.closingRates.description')}
                </p>
              </div>

              {/* Illustrative timeline (not a statistic) */}
              <div className={`flex-1 flex items-center justify-center w-full mt-4 sm:mt-0 ${isRtl ? 'sm:mr-6 sm:order-1' : 'sm:ml-6'}`}>
                <div className="w-full rounded-xl border border-gray-200 bg-white p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-600">{t('features.closingRates.example')}</p>
                  <ol className="space-y-2.5">
                    {steps.map((step, i) => (
                      <li key={i} className={`flex items-start gap-3 text-sm ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                        <span className="w-16 shrink-0 font-mono text-xs font-semibold text-gray-500 pt-0.5">{step.time}</span>
                        <span className="text-gray-800">{step.text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </motion.div>
            
            {/* Animated Card Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex justify-center w-full"
            >
              <div className="rounded-xl shadow-2xl hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] transition-shadow duration-300 w-full">
                <AnimatedCard className="shadow-xl w-full">
                  <CardVisual>
                    <Visual3 mainColor="#3b82f6" secondaryColor="#06b6d4" />
                  </CardVisual>
                  <CardBody>
                    <CardTitle>{t('features.revenue.title')}</CardTitle>
                    <CardDescription>
                      {t('features.revenue.description')}
                    </CardDescription>
                  </CardBody>
                </AnimatedCard>
              </div>
            </motion.div>

            {/* Box Card - Text on Top */}
            <motion.div
              className="bg-muted rounded-xl pt-[19px] px-6 pb-6 flex flex-col shadow-2xl h-[215px] -mt-[22px] relative w-full"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              {/* Background Clock Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="w-52 h-52 text-gray-300 opacity-40" />
              </div>
              
              {/* Centered Content */}
              <div className="flex flex-col text-center items-center justify-center flex-1 relative z-10">
                <h3 className="text-3xl font-semibold tracking-tight mb-3 text-black">{t('features.saveTime.title')}</h3>
                <p className="text-muted-foreground text-base max-w-xs">
                  {t('features.saveTime.description')}
                </p>
              </div>
            </motion.div>
            
            {/* Wide Card - Text on Left */}
            <motion.div
              className="bg-muted rounded-xl lg:col-span-2 p-4 md:p-6 flex flex-col sm:flex-row items-center shadow-2xl h-auto sm:h-48 w-full overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <div className={`flex flex-col max-w-sm ${isRtl ? 'text-right sm:order-2' : 'text-left'}`}>
                <h3 className="text-lg md:text-2xl font-semibold tracking-tight mb-2 text-black">{t('features.customerSatisfaction.title')}</h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  {t('features.customerSatisfaction.description')}
                </p>
              </div>
              <div className={`flex-1 flex items-center justify-center ${isRtl ? 'sm:order-1' : ''}`}>
                <div className="w-40 h-40 sm:w-56 sm:h-56 md:w-80 md:h-80">
                  <LazyLottie
                    src="/costumer_statisfication.lottie"
                    loop
                    autoplay
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            </motion.div>
      </div>
    </div>
  );
}

export { Feature };

