import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Clock, Users } from 'lucide-react';
import Button from '../components/ui/Button';
import StyledInput from '../components/ui/StyledInput';

const offerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  company: z.string().min(2, 'Company name must be at least 2 characters'),
  companyWebsite: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
});

type OfferFormData = z.infer<typeof offerSchema>;

// Initial remaining places
const INITIAL_PLACES = 12;
// Countdown target: 48 hours from now (can be adjusted)
const getCountdownTarget = () => {
  const target = new Date();
  target.setHours(target.getHours() + 48);
  return target;
};

const OfferPage: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingPlaces, setRemainingPlaces] = useState(INITIAL_PLACES);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [countdownTarget] = useState(getCountdownTarget());

  useEffect(() => {
    document.title = 'Get a Website That Brings You Customers | Boltcall';
    updateMetaDescription('Get a smart website that brings you customers. Fast loading, AI-powered, books appointments automatically. Get started now.');
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
  });

  // Fetch initial remaining places count
  useEffect(() => {
    const fetchRemainingPlaces = async () => {
      try {
        // Try to get remaining places from the webhook (GET request if supported)
        // For now, we'll get it from localStorage as a fallback, but ideally the webhook should return it
        const stored = localStorage.getItem('offer_remaining_places');
        if (stored) {
          const places = parseInt(stored, 10);
          if (!isNaN(places) && places >= 0) {
            setRemainingPlaces(places);
          }
        }
      } catch (error) {
        console.error('Error fetching remaining places:', error);
      }
    };
    fetchRemainingPlaces();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const targetTime = countdownTarget.getTime();
      const difference = targetTime - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setCountdown({ hours, minutes, seconds });
      } else {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [countdownTarget]);

  const onSubmit = async (data: OfferFormData) => {
    setIsSubmitting(true);
    
    try {
      // POST to n8n webhook
      const response = await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/1b1c7fe4-dec4-423d-bb3e-6ce0c66819aa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      // Try to get remaining places from response
      let updatedPlaces = remainingPlaces;
      try {
        const responseData = await response.json();
        if (responseData.remainingPlaces !== undefined) {
          updatedPlaces = responseData.remainingPlaces;
        } else {
          // If webhook doesn't return it, decrease locally
          updatedPlaces = Math.max(0, remainingPlaces - 1);
        }
      } catch {
        // If response is not JSON or doesn't have remainingPlaces, decrease locally
        updatedPlaces = Math.max(0, remainingPlaces - 1);
      }

      // Update remaining places
      setRemainingPlaces(updatedPlaces);
      localStorage.setItem('offer_remaining_places', updatedPlaces.toString());

      setIsSubmitted(true);
      reset();
      
      // Don't auto-reset - keep thank you message shown
    } catch (error) {
      console.error('Error submitting form:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-white relative">
      {/* Top Bar with Logo and Counters */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 lg:px-8 pt-2">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          {/* Boltcall Logo */}
          <Link to="/">
            <img
              src="/boltcall_full_logo.png"
              alt="Boltcall Logo"
              className="h-12 md:h-16"
              width={160}
              height={64}
              loading="eager"
              decoding="async"
            />
          </Link>
          
              {/* Limited Places & Countdown Timer */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
              >
                {/* Limited Places Counter */}
                <div className="border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-2 bg-white">
                  <Users className="w-3 h-3 text-blue-600" />
                  <div>
                    <div className="text-xs text-blue-600 uppercase tracking-wide font-medium">Limited Places</div>
                    <div className="text-sm font-semibold text-gray-900 leading-tight">{remainingPlaces} Left</div>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-2 bg-white">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <div>
                    <div className="text-xs text-blue-600 uppercase tracking-wide font-medium">Time Remaining</div>
                    <div className="text-sm font-semibold text-gray-900 font-mono leading-tight">
                      {String(countdown.hours).padStart(2, '0')}:
                      {String(countdown.minutes).padStart(2, '0')}:
                      {String(countdown.seconds).padStart(2, '0')}
                    </div>
                  </div>
                </div>
              </motion.div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="relative z-10 pt-12 md:pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-0 items-start relative">
            {/* Blue background on right side */}
            <div className="hidden lg:block fixed right-0 top-0 w-full bg-blue-600 -z-10 h-screen" style={{ left: '50%' }}></div>
            {/* Left Section - Title and Text */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6 mt-8 md:mt-16 overflow-visible pr-8 lg:pr-12 relative z-10"
            >

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="overflow-visible"
              >
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.2] pb-2">
                  <span className="text-gray-900">Get a Website That</span>{' '}
                  <span className="text-blue-600">Brings You Customers</span>
                </h1>
              </motion.div>

              <motion.ul
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-gray-600 leading-relaxed space-y-2 list-none"
                style={{ fontSize: 'calc(0.875rem * 1.166)' }}
              >
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" style={{ marginTop: '5px' }} />
                  <div>
                    <div className="font-semibold text-gray-900" style={{ fontSize: 'calc(0.875rem * 1.166)' }}>Loads in under 2 seconds</div>
                    <div className="text-gray-600 mt-0.5" style={{ fontSize: 'calc(0.75rem * 1.166)' }}>Customers won't wait. Your site won't make them.</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" style={{ marginTop: '5px' }} />
                  <div>
                    <div className="font-semibold text-gray-900" style={{ fontSize: 'calc(0.875rem * 1.166)' }}>Google finds you first</div>
                    <div className="text-gray-600 mt-0.5" style={{ fontSize: 'calc(0.75rem * 1.166)' }}>When people search for what you do, your name shows up at the top.</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" style={{ marginTop: '5px' }} />
                  <div>
                    <div className="font-semibold text-gray-900" style={{ fontSize: 'calc(0.875rem * 1.166)' }}>AI talks to visitors 24/7</div>
                    <div className="text-gray-600 mt-0.5" style={{ fontSize: 'calc(0.75rem * 1.166)' }}>Even at 3am, someone is answering questions and booking appointments.</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" style={{ marginTop: '5px' }} />
                  <div>
                    <div className="font-semibold text-gray-900" style={{ fontSize: 'calc(0.875rem * 1.166)' }}>Every lead gets a text or call in seconds</div>
                    <div className="text-gray-600 mt-0.5" style={{ fontSize: 'calc(0.75rem * 1.166)' }}>No more checking your email hours later to find out you missed a customer.</div>
                  </div>
                </li>
              </motion.ul>
            </motion.div>

            {/* Right Section - Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:sticky lg:top-8 -mt-[40px] lg:-mt-[40px] relative z-10 lg:ml-8 xl:ml-16"
            >
              <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-7 border border-blue-100 max-w-md">
                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Thank You!
                    </h3>
                    <p className="text-gray-600">
                      Check your email for confirmation and the next steps.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <div className="mb-6">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Claim Your Free Website
                      </h2>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                      {/* Full Name */}
                      <div>
                        <StyledInput
                          {...register('fullName')}
                          type="text"
                          placeholder="Full Name"
                          name="fullName"
                          required
                        />
                        {errors.fullName && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.fullName.message}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <StyledInput
                          {...register('email')}
                          type="email"
                          placeholder="Email Address"
                          name="email"
                          required
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.email.message}
                          </p>
                        )}
                      </div>

                      {/* Company */}
                      <div>
                        <StyledInput
                          {...register('company')}
                          type="text"
                          placeholder="Company Name"
                          name="company"
                          required
                        />
                        {errors.company && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.company.message}
                          </p>
                        )}
                      </div>

                      {/* Company Website */}
                      <div>
                        <StyledInput
                          {...register('companyWebsite')}
                          type="url"
                          placeholder="Company Website URL"
                          name="companyWebsite"
                        />
                        {errors.companyWebsite && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.companyWebsite.message}
                          </p>
                        )}
                      </div>

                      {/* Submit Button */}
                      <div className="mt-6 mb-4">
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 py-2 text-base font-semibold"
                        >
                          {isSubmitting ? (
                            'Processing...'
                          ) : (
                            <>
                              Claim My Free Website Now
                              <ArrowRight className="w-4 h-4 ml-2 inline" />
                            </>
                          )}
                        </Button>
                      </div>

                      <p className="text-xs text-gray-500 text-center mt-6">
                        By submitting this form, you agree to our terms and conditions.
                        We respect your privacy and will never share your information.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OfferPage;

