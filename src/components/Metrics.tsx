import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Users, Calendar, Clock, TrendingUp } from 'lucide-react';
import Card from './ui/Card';
import Section from './ui/Section';
import Icon from './ui/Icon';

const Metrics: React.FC = () => {
  const [counts, setCounts] = useState({
    leads: 0,
    bookings: 0,
    responseTime: 0,
    satisfaction: 0
  });

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const metrics = [
    {
      icon: Users,
      label: 'Leads Captured',
      value: 1247,
      suffix: '+',
      description: 'This month'
    },
    {
      icon: Calendar,
      label: 'Appointments Booked',
      value: 892,
      suffix: '+',
      description: 'Automatically scheduled'
    },
    {
      icon: Clock,
      label: 'Avg Response Time',
      value: 28,
      suffix: 's',
      description: 'Lightning fast'
    },
    {
      icon: TrendingUp,
      label: 'Customer Satisfaction',
      value: 98,
      suffix: '%',
      description: 'Happy customers'
    }
  ];

  // Animate counters when in view
  useEffect(() => {
    if (isInView) {
      const duration = 2000; // 2 seconds
      const steps = 60;
      const stepDuration = duration / steps;

      const animateCounter = (targetValue: number, setter: (value: number) => void) => {
        let current = 0;
        const increment = targetValue / steps;
        
        const timer = setInterval(() => {
          current += increment;
          if (current >= targetValue) {
            setter(targetValue);
            clearInterval(timer);
          } else {
            setter(Math.floor(current));
          }
        }, stepDuration);
      };

      animateCounter(1247, (value) => setCounts(prev => ({ ...prev, leads: value })));
      animateCounter(892, (value) => setCounts(prev => ({ ...prev, bookings: value })));
      animateCounter(28, (value) => setCounts(prev => ({ ...prev, responseTime: value })));
      animateCounter(98, (value) => setCounts(prev => ({ ...prev, satisfaction: value })));
    }
  }, [isInView]);

  return (
    <Section id="metrics" background="brand">
      <div className="text-center mb-16">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-text-main mb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Live Performance Metrics
        </motion.h2>
        <motion.p
          className="text-lg text-text-muted max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          Real-time data showing the impact of our AI-powered lead management
        </motion.p>
      </div>

      <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <Card className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto rounded-xl bg-brand-blue/10 flex items-center justify-center mb-4">
                  <Icon
                    icon={metric.icon}
                    size="xl"
                    color="brand"
                  />
                </div>
                
                <div className="text-4xl font-bold text-brand-blue mb-2">
                  {index === 0 && counts.leads}
                  {index === 1 && counts.bookings}
                  {index === 2 && counts.responseTime}
                  {index === 3 && counts.satisfaction}
                  {metric.suffix}
                </div>
                
                <h3 className="text-lg font-semibold text-text-main mb-2">
                  {metric.label}
                </h3>
                
                <p className="text-text-muted text-sm">
                  {metric.description}
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Additional Stats */}
      <motion.div
        className="mt-16 text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        viewport={{ once: true }}
      >
        <div className="bg-white rounded-xl p-8 shadow-sm border border-border max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-2xl font-bold text-brand-blue mb-1">24/7</div>
              <div className="text-text-muted">Always Available</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-blue mb-1">99.9%</div>
              <div className="text-text-muted">Uptime</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-blue mb-1">5min</div>
              <div className="text-text-muted">Setup Time</div>
            </div>
          </div>
        </div>
      </motion.div>
    </Section>
  );
};

export default Metrics;
