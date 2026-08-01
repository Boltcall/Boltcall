import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { TrendingUp, Globe, AlertCircle, CheckCircle, Loader, Mail, X, BarChart3 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import { supabase } from '../lib/supabase';

interface NicheConfig {
  niche: string;
  display_name: string;
  slug: string;
  tool_type: string;
  headline: string;
  subheadline: string | null;
  meta_description: string | null;
  niche_specific_fields: {
    fields?: Array<{
      name: string;
      type: string;
      label: string;
      placeholder: string;
      required?: boolean;
    }>;
    social_proof_text?: string;
    result_metrics?: string[];
    cta_text?: string;
  } | null;
  webhook_url: string | null;
}

const DEFAULT_WEBHOOK = 'https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/niche-lead-magnet';

const NicheToolPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<NicheConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('niche_lead_magnets')
        .select('*')
        .eq('slug', slug)
        .eq('is_deployed', true)
        .maybeSingle();

      if (fetchError || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setConfig(data as NicheConfig);
      document.title = `${data.display_name} - Free AI Tool for Your Business`;
      if (data.meta_description) {
        updateMetaDescription(data.meta_description);
      }
      setLoading(false);
    };

    fetchConfig();
  }, [slug]);

  const validateUrl = (urlString: string): boolean => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validateEmail = (emailString: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailString);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowSuccessPopup(false);

    if (!url.trim()) {
      setError('Please enter a website URL');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    if (!validateUrl(formattedUrl)) {
      setError('Please enter a valid URL (e.g., example.com or https://example.com)');
      return;
    }

    setIsAnalyzing(true);

    try {
      const webhookUrl = config?.webhook_url || DEFAULT_WEBHOOK;
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formattedUrl,
          email: email.trim(),
          niche: config?.niche,
          source: 'skool-community',
          tool_type: config?.tool_type,
          slug: config?.slug,
        }),
      });

      if (response.status === 200) {
        setShowSuccessPopup(true);
        setUrl('');
        setEmail('');
        setTimeout(() => setShowSuccessPopup(false), 8000);
      } else {
        setError('Failed to analyze website. Please try again.');
      }
    } catch {
      setError('An error occurred. Please check your connection and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFound || !config) {
    return (
      <div className="min-h-screen bg-white">
        <GiveawayBar />
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-32 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Tool Not Found</h1>
          <p className="text-gray-600">This tool doesn't exist or is no longer available.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const ctaText = config.niche_specific_fields?.cta_text || 'Analyze';
  const socialProof = config.niche_specific_fields?.social_proof_text;

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-4 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-4"
          >
            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-4">
              <BarChart3 className="w-4 h-4" />
              <span className="font-semibold">Free AI Business Tool</span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {config.headline}
            </h1>
            {config.subheadline && (
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {config.subheadline}
              </p>
            )}
            {socialProof && (
              <p className="text-sm text-blue-600 font-medium mt-3">{socialProof}</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Form Section */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* URL Input */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    disabled={isAnalyzing}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAnalyzing || !url.trim() || !email.trim()}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-semibold text-base"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      {ctaText}
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                We'll send your personalized report to this email address
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </motion.div>
            )}
          </form>
        </motion.div>
      </section>

      {/* What You'll Get Section */}
      {config.niche_specific_fields?.result_metrics && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              What You'll Get in Your Report
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {config.niche_specific_fields.result_metrics.map((metric, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 text-center"
                >
                  <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">{metric}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative"
          >
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Analysis Submitted!
              </h3>
              <p className="text-gray-600 mb-6">
                Your personalized {config.display_name.toLowerCase()} report is being generated and will be sent to your email shortly.
              </p>
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default NicheToolPage;
