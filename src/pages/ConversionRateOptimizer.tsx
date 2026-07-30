import React, { useState, useEffect } from 'react';

import { updateMetaDescription } from '../lib/utils';

import { motion } from 'framer-motion';

import { TrendingUp, Globe, AlertCircle, CheckCircle, Loader, Mail, X } from 'lucide-react';

import Header from '../components/Header';

import Footer from '../components/Footer';

import GiveawayBar from '../components/GiveawayBar';

import FAQ from '../components/FAQ';

import Breadcrumbs from '../components/Breadcrumbs';



const ConversionRateOptimizer: React.FC = () => {

  const [url, setUrl] = useState('');

  const [email, setEmail] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [error, setError] = useState('');

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);



  useEffect(() => {

    document.title = 'Conversion Rate Optimizer - Improve Website Conversions';

    updateMetaDescription('Free conversion rate optimizer analyzes your website. Get recommendations to improve conversions and get more customers. Try free.');


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Conversion Rate Optimizer", "item": "https://boltcall.org/conversion-rate-optimizer"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);



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



    // Validate URL

    if (!url.trim()) {

      setError('Please enter a website URL');

      return;

    }



    // Validate Email

    if (!email.trim()) {

      setError('Please enter your email address');

      return;

    }



    if (!validateEmail(email.trim())) {

      setError('Please enter a valid email address');

      return;

    }



    // Add https:// if no protocol is specified

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

      const response = await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/3ee2df6f-7955-4f7d-b745-d03f1378b1dd', {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          url: formattedUrl,

          email: email.trim(),

        }),

      });



      if (response.status === 200) {

        // Show success popup

        setShowSuccessPopup(true);

        setUrl('');

        setEmail('');

        // Hide popup after 8 seconds

        setTimeout(() => setShowSuccessPopup(false), 8000);

      } else {

        let errorText = 'Unknown error';

        try {

          errorText = await response.text();

        } catch {

          // Ignore if we can't read error text

        }

        console.error('Webhook error response:', response.status, errorText);

        setError(`Failed to analyze website (Status: ${response.status}). Please try again.`);

      }

    } catch (err: any) {

      console.error('Error calling webhook:', err);

      if (err.message) {

        setError(`Network error: ${err.message}. Please check your connection and try again.`);

      } else {

        setError('An error occurred while analyzing your website. Please try again.');

      }

    } finally {

      setIsAnalyzing(false);

    }

  };



  return (

    <div className="min-h-screen bg-white">

      <GiveawayBar />

      <Header />

      

      {/* Hero Section */}

      <section className="relative pt-32 pb-4 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <Breadcrumbs />

          <motion.div

            initial={{ opacity: 0, y: 20 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ duration: 0.6 }}

            className="text-center mb-4"

          >

            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-4">

              <TrendingUp className="w-4 h-4" />

              <span className="font-semibold">Website Optimisation Tool</span>

            </div>

            

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">

              <span className="text-gray-900">Optimise Your</span>{' '}

              <span className="text-blue-600">Website</span>

            </h1>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto">

              Get a comprehensive website analysis of any website. Enter a URL below to discover optimisation opportunities.

            </p>

          </motion.div>

        </div>

      </section>



      {/* Main Content */}

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

                      Optimize

                    </>

                  )}

                </button>

              </div>

              <p className="text-sm text-gray-500 mt-2">

                We'll send your website optimisation report to this email address

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

                Analysis Ready!

              </h3>

              <p className="text-gray-600 mb-6">

                Your website optimisation report has been completed and sent to your email address. Please check your inbox for the detailed analysis.

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



      {/* What This Tool Analyzes */}

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">What This Tool Analyzes</h2>

        <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">

          Our conversion rate optimizer evaluates every element of your website that affects whether visitors take action — from first impression to final call-to-action. The analysis covers six key areas that consistently separate high-converting sites from average ones.

        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {[

            { title: 'Page Speed & Performance', desc: 'Slow pages lose visitors before they even see your offer. We measure load time, Core Web Vitals, and mobile performance scores that directly impact conversion rates.' },

            { title: 'Headlines & Value Proposition', desc: 'Your headline is the first thing visitors read. We evaluate clarity, specificity, and whether your value proposition immediately answers "what\'s in it for me?"' },

            { title: 'Call-to-Action Strength', desc: 'Weak CTAs kill conversions. We assess button copy, placement, contrast, and the friction between a visitor\'s intent and completing your desired action.' },

            { title: 'Trust Signals & Social Proof', desc: 'Reviews, testimonials, guarantees, and security badges reduce purchase anxiety. We identify which trust elements you\'re missing and where to place them.' },

            { title: 'Mobile Experience', desc: 'Over 60% of local business searches happen on mobile. We test tap targets, form usability, and layout responsiveness on small screens.' },

            { title: 'Lead Capture & Forms', desc: 'Every extra form field costs you conversions. We audit your contact forms, booking flows, and lead capture elements for unnecessary friction.' },

          ].map((item) => (

            <div key={item.title} className="bg-gray-50 border border-gray-200 rounded-xl p-5">

              <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>

              <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>

            </div>

          ))}

        </div>

      </section>



      {/* How to Improve Conversions */}

      <section className="bg-blue-50 py-12">

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How to Improve Your Conversion Rate</h2>

          <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">

            Most local business websites convert less than 2% of visitors into leads. The businesses that convert at 5–10% aren't spending more on ads — they've fixed the right things on their site. Here's what moves the needle most.

          </p>

          <div className="space-y-4">

            {[

              { step: '1', title: 'Lead with a clear, specific headline', desc: '"Plumber in Austin — Same-Day Service" outperforms "Welcome to Our Website" by a significant margin. Visitors need to instantly know you serve them.' },

              { step: '2', title: 'Add a phone number in the header', desc: 'Local businesses with a visible phone number in the top navigation see 20–30% more inbound calls. It\'s the single easiest conversion win.' },

              { step: '3', title: 'Remove form fields you don\'t need', desc: 'Every extra field reduces form completions by roughly 10–15%. Name, email, and one qualifying question is almost always enough to start the conversation.' },

              { step: '4', title: 'Show real reviews on every page', desc: 'A minimum of 5 Google reviews displayed on your site with star ratings builds trust faster than any written testimonial you can craft.' },

              { step: '5', title: 'Make your CTA specific and urgent', desc: '"Book a Free Consultation" converts better than "Contact Us." "Get Your Quote Today" beats "Submit." Specificity and urgency work together.' },

            ].map((item) => (

              <div key={item.step} className="flex gap-4 bg-white rounded-xl p-5 border border-blue-100">

                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">{item.step}</div>

                <div>

                  <div className="font-semibold text-gray-900 text-sm mb-1">{item.title}</div>

                  <p className="text-sm text-gray-600">{item.desc}</p>

                </div>

              </div>

            ))}

          </div>

        </div>

      </section>





      {/* Why Boltcall? */}

      <section className="my-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">

          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Businesses Choose Boltcall</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {[

              { title: 'Captures leads while you optimise', desc: 'Every visitor who calls after reading your CRO report gets answered instantly — no voicemail, no lost lead' },

              { title: 'Responds in under 1 second', desc: 'Never miss a lead — 24/7 coverage including weekends and after-hours, when most conversions are lost' },

              { title: 'Setup in 30 minutes', desc: 'No developers, no tech team — just answer a few questions and your AI receptionist is live' },

              { title: 'Trained on your business', desc: 'Knows your services, pricing, and FAQs — sounds like you, not a generic bot' },

            ].map((item) => (

              <div key={item.title} className="bg-white rounded-xl p-4 shadow-sm">

                <div className="font-semibold text-gray-900 mb-1">✓ {item.title}</div>

                <div className="text-sm text-gray-600">{item.desc}</div>

              </div>

            ))}

          </div>

        </div>

      </section>




      {/* Boltcall Plans at a Glance */}
      <section className="my-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Boltcall Plans at a Glance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="py-3 px-4 text-left rounded-tl-xl">Feature</th>
                <th className="py-3 px-4 text-center">Starter</th>
                <th className="py-3 px-4 text-center">Pro</th>
                <th className="py-3 px-4 text-center rounded-tr-xl">Scale</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["AI Receptionist calls", "500/mo", "2,000/mo", "Unlimited"],
                ["Lead capture (SMS/email)", "\u2713", "\u2713", "\u2713"],
                ["CRM integrations", "\u2014", "\u2713", "\u2713"],
                ["Custom AI voice & script", "\u2713", "\u2713", "\u2713"],
                ["Priority support", "\u2014", "\u2014", "\u2713"],
              ].map(([feat, ...vals], i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="py-3 px-4 font-medium text-gray-800">{feat}</td>
                  {vals.map((v, j) => <td key={j} className="py-3 px-4 text-center text-gray-600">{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <FAQ />



      {/* Trust Signals */}

      <section className="bg-gray-50 border-t border-gray-100 py-8">

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">

            <div className="flex items-center gap-2">

              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />

              <span>100% Free — no credit card required</span>

            </div>

            <div className="flex items-center gap-2">

              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />

              <span>Used by 500+ local businesses</span>

            </div>

            <div className="flex items-center gap-2">

              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />

              <span>Results in 30 days or your money back</span>

            </div>

            <div className="flex items-center gap-2">

              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />

              <span>Your data is never sold or shared</span>

            </div>

          </div>

        </div>

      </section>



      <Footer />

    </div>

  );

};



export default ConversionRateOptimizer;



