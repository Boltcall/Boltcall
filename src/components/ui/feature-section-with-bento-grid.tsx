import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
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
import {
  AreaChart,
  Area,
  ResponsiveContainer
} from "recharts";
import CountUp from "react-countup";
import { useDirection } from '../../hooks/useDirection';

function Feature() {
  const { t } = useTranslation('marketing');
  const [isChartVisible, setIsChartVisible] = useState(false);
  const isRtl = useDirection() === 'rtl';

  const chartData = [
    { month: "Jan", value: 50 },
    { month: "Feb", value: 90 },
    { month: "Mar", value: 140 },
    { month: "Apr", value: 200 },
    { month: "May", value: 240 },
    { month: "Jun", value: 300 },
  ];

  // Reset chart animation when component mounts
  useEffect(() => {
    setIsChartVisible(false);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl ${isRtl ? 'mr-0 sm:mr-8 ml-0' : 'ml-0 sm:ml-8'}`}>
            {/* Wide Card - Text on Left */}
            <motion.div
              className="bg-muted rounded-xl lg:col-span-2 p-6 flex items-center shadow-2xl h-64 w-full"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              onAnimationStart={() => {
                setTimeout(() => {
                  setIsChartVisible(true);
                }, 100);
              }}
            >
              {/* Text content */}
              <div className={`flex flex-col max-w-xs ${isRtl ? 'text-right order-2' : 'text-left'}`}>
                <h3 className="text-2xl font-semibold tracking-tight mb-2 text-black">{t('features.closingRates.title')}</h3>
                <p className="text-muted-foreground text-base mb-4">
                  {t('features.closingRates.description')}
                </p>
              </div>

              {/* Chart */}
              <div className={`flex-1 flex items-center justify-center ${isRtl ? 'mr-6 order-1' : 'ml-6'}`}>
                <div className="relative w-full h-48 bg-muted rounded-xl overflow-hidden">
                  {/* Chart */}
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={isChartVisible ? chartData : []}>
                      <defs>
                        <linearGradient id="ruixenBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#ruixenBlue)"
                        animationDuration={3000}
                        animationEasing="ease-in-out"
                        isAnimationActive={isChartVisible}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Overlay Hero Number */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <div className="px-4 py-2 rounded-lg">
                      <h3 className="text-4xl font-extrabold text-gray-900 drop-shadow-md">
                        {isChartVisible ? <CountUp end={391} duration={5} /> : '0'}%
                      </h3>
                      <p className="text-gray-500 text-sm">{t('features.salesConversions')}</p>
                    </div>
                  </div>
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
              className="bg-muted rounded-xl lg:col-span-2 p-4 md:p-6 flex items-center shadow-2xl h-48 w-full overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <div className={`flex flex-col max-w-sm ${isRtl ? 'text-right order-2' : 'text-left'}`}>
                <h3 className="text-lg md:text-2xl font-semibold tracking-tight mb-2 text-black">{t('features.customerSatisfaction.title')}</h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  {t('features.customerSatisfaction.description')}
                </p>
              </div>
              <div className={`flex-1 flex items-center justify-center ${isRtl ? 'order-1' : ''}`}>
                <div className="w-56 h-56 md:w-80 md:h-80">
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

