import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Star } from 'lucide-react';
import Button from '../ui/Button';

interface PlanCardProps {
  title: string;
  subtitle?: string;
  priceUsd: number;
  priceIls: number;
  features: string[];
  limits?: string;
  support?: string;
  guarantee?: string;
  ctaLabel: string;
  popular?: boolean;
  anchor?: boolean;
  currency: 'USD' | 'ILS';
}

const PlanCard: React.FC<PlanCardProps> = ({
  title,
  subtitle,
  priceUsd,
  priceIls,
  features,
  limits,
  support,
  guarantee,
  ctaLabel,
  popular = false,
  anchor = false,
  currency
}) => {
  const navigate = useNavigate();

  const handleCtaClick = () => {
    // Navigate to signup page
    navigate('/setup');
  };


  const cardClasses = `
    relative bg-white border rounded-2xl shadow-sm p-6 md:p-8 h-full flex flex-col
    ${popular 
      ? 'scale-[1.02] md:scale-105 ring-1 ring-zinc-200 shadow-md bg-gradient-to-br from-white to-blue-50/30' 
      : 'border-gray-200'
    }
    ${anchor 
      ? 'border-zinc-200 bg-gradient-to-br from-white via-amber-50/20 to-white' 
      : ''
    }
  `;

  return (
    <motion.div
      className={cardClasses}
      whileHover={{ 
        y: popular ? -4 : -2,
        transition: { duration: 0.2 }
      }}
      transition={{ duration: 0.3 }}
    >
      {/* Most Popular Badge */}
      {popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span 
            className="inline-flex items-center bg-gradient-to-r from-brand-blue to-brand-sky text-white px-4 py-1 text-sm font-medium rounded-full"
            aria-hidden="true"
          >
            <Star className="w-2.5 h-2.5 mr-1 fill-current" strokeWidth={2.5} />
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
        {subtitle && (
          <p className="text-gray-600 font-medium">{subtitle}</p>
        )}
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          {currency === 'USD' ? `$${priceUsd.toLocaleString()}` : `₪${priceIls.toLocaleString()}`}
          <span className="text-lg font-normal text-gray-600">/mo</span>
        </div>
        <p className="text-sm text-gray-600">
          {currency === 'USD' ? `₪${priceIls.toLocaleString()}` : `$${priceUsd.toLocaleString()}`} + usage
        </p>
      </div>

      {/* Features */}
      <div className="flex-1 mb-6">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <motion.li
              key={index}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-green-500" strokeWidth={2.5} />
              </div>
              <span className="text-sm text-gray-700 leading-relaxed">{feature}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Limits */}
      {limits && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 font-medium mb-1">Limits</p>
          <p className="text-sm text-gray-700">{limits}</p>
        </div>
      )}

      {/* Support */}
      {support && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800 font-medium mb-1">Support</p>
          <p className="text-sm text-blue-700">{support}</p>
        </div>
      )}

      {/* Guarantee */}
      {guarantee && (
        <div className="mb-6 p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-800 font-medium mb-1">Guarantee</p>
          <p className="text-sm text-green-700">{guarantee}</p>
        </div>
      )}

      {/* CTA Button */}
      <div className="mt-auto">
        <Button
          onClick={handleCtaClick}
          variant={popular ? 'primary' : anchor ? 'outline' : 'primary'}
          size="lg"
          className="w-full"
          aria-label={`Select ${title} plan`}
        >
          {ctaLabel}
        </Button>
      </div>
    </motion.div>
  );
};

export default PlanCard;

