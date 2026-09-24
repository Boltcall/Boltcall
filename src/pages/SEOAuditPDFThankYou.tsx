import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Mail, Calendar, CheckCircle2, FileText } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import Button from '../components/ui/Button';
import { CAL_BOOKING_URL } from './BookCall';

const SEOAuditPDFThankYou: React.FC = () => {
  useEffect(() => {
    document.title = 'Your SEO & AEO Report is Being Generated | Boltcall';
    updateMetaDescription(
      'Your personalized SEO & AEO Audit PDF is being generated. Check your inbox in a few minutes.'
    );
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Success icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Your Report is Being Generated!
            </h1>

            <p className="text-lg text-gray-600 mb-8">
              Our AI is crawling your website and building your branded PDF report. You'll receive it in your inbox within <strong>5 minutes</strong>.
            </p>

            {/* What's in the report */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Your 6-page report includes:</h3>
              </div>
              <div className="space-y-3">
                {[
                  'SEO Score & AEO Score with overall grade',
                  'Technical SEO analysis (speed, SSL, mobile, sitemap)',
                  'On-page SEO audit (meta tags, headings, content, images)',
                  'AEO readiness breakdown (schema, content structure, entity authority)',
                  'Detailed findings — critical issues, warnings, and passing checks',
                  'Quick wins + strategic recommendations',
                  '30-day action plan (week by week)',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Check email */}
            <div className="flex items-center justify-center gap-2 text-blue-600 mb-8">
              <Mail className="w-5 h-5" />
              <span className="font-medium">Check your inbox (and spam folder)</span>
            </div>

            {/* CTA */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">
                Want us to fix everything in your report?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Book a free 15-minute call and we'll walk through your audit and build a plan together.
              </p>
              <a
                href={CAL_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold">
                  Book Strategy Call
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SEOAuditPDFThankYou;
