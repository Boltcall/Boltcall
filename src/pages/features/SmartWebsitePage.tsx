import React, { useEffect } from 'react';
import { updateMetaDescription } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Sparkles, Globe, Zap, CheckCircle, ArrowRight, TrendingUp } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import GiveawayBar from '../../components/GiveawayBar';
import Breadcrumbs from '../../components/Breadcrumbs';
import { createFAQSchema, injectSchemas } from '../../lib/schema';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';

const SmartWebsitePage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Smart Website Optimization & AI Lead Generation';
    updateMetaDescription('Smart website optimization improves speed and conversions automatically. AI optimizes performance, enhances UX. Get started now.');

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Features", "item": "https://boltcall.org/features"}, {"@type": "ListItem", "position": 3, "name": "Smart Website", "item": "https://boltcall.org/features/smart-website"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  useEffect(() => {
    return injectSchemas([
      createFAQSchema([
        { question: 'Will optimizations break my website?', answer: 'No. All optimizations are tested thoroughly before implementation. The system creates backups and can roll back changes if needed. Optimizations are implemented gradually and monitored to ensure they improve performance without causing issues.' },
        { question: 'How long until I see results?', answer: 'Some improvements are immediate (like page speed optimizations), while others take time to show results (like SEO improvements or A/B test outcomes). Typically, you\'ll see measurable improvements within 2-4 weeks, with continued improvements over time as the system learns and optimizes.' },
        { question: 'Can I control what gets optimized?', answer: 'Yes. You can approve or reject optimization suggestions, set boundaries for what can be changed, and maintain control over critical elements. The system provides transparency and gives you final approval on significant changes.' },
        { question: 'Does it work with any website platform?', answer: 'Yes. Smart Website optimization works with any website platform: WordPress, Shopify, Squarespace, custom HTML, or any other platform. The optimizations are implemented at the code and content level, making them platform-agnostic.' },
      ]),
    ]);
  }, []);
  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs />
          <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">Smart Website</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Transform Your Website into a <span className="text-blue-600">Smart Lead Machine</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              AI-powered website optimization that automatically improves performance, 
              enhances user experience, and converts more visitors into customers.
            </p>
          </motion.div>
          </div>
        </div>
      </section>

      {/* What It Is Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>What is Smart Website?</span>
            </h2>
            <p className="text-lg text-gray-600 mb-4 leading-relaxed">
              Smart Website is an AI-powered optimization system that continuously analyzes and improves 
              your website's performance, user experience, and conversion rates. It automatically identifies 
              bottlenecks, optimizes page speed, enhances mobile responsiveness, and implements conversion 
              best practices—all without requiring technical expertise.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              The system learns from user behavior, A/B tests different elements, and makes data-driven 
              improvements that increase engagement, reduce bounce rates, and boost sales. It's like having 
              a team of web optimization experts working on your site 24/7.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why It's Important Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Why Smart Website Optimization is Critical</span>
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Speed Directly Impacts Revenue
                    </h3>
                    <p className="text-gray-600">
                      <strong>53% of mobile users abandon sites that take longer than 3 seconds to load.</strong> 
                      A 1-second delay in page load time can result in a 7% reduction in conversions. 
                      Smart Website automatically optimizes your site speed, improving both user experience 
                      and search engine rankings.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Conversion Rate Optimization
                    </h3>
                    <p className="text-gray-600">
                      Most websites convert less than 3% of visitors. Smart Website uses AI to test 
                      different layouts, headlines, CTAs, and user flows, automatically implementing 
                      changes that <strong>increase conversion rates by 20-40%</strong> on average.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Mobile-First Experience
                    </h3>
                    <p className="text-gray-600">
                      Over 60% of web traffic comes from mobile devices, yet many sites aren't optimized 
                      for mobile users. Smart Website ensures your site is fully responsive, loads quickly 
                      on all devices, and provides an excellent mobile experience that converts visitors into customers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Helps Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>How Smart Website Helps Your Business</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Automatic Performance Optimization
                  </h3>
                </div>
                <p className="text-gray-600">
                  Continuously monitors and optimizes page speed, image compression, 
                  code minification, and caching strategies without manual intervention.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    AI-Powered A/B Testing
                  </h3>
                </div>
                <p className="text-gray-600">
                  Automatically tests different page elements, layouts, and content variations 
                  to find what converts best, then implements winning changes.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    SEO Enhancement
                  </h3>
                </div>
                <p className="text-gray-600">
                  Improves search engine rankings through technical SEO fixes, 
                  meta tag optimization, and structured data implementation.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Security & Compliance
                  </h3>
                </div>
                <p className="text-gray-600">
                  Automatically implements security best practices, SSL optimization, 
                  and ensures compliance with web standards and accessibility guidelines.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-4">Make Your Website Smarter</h3>
              <p className="text-blue-100 mb-6">
                Let AI optimize your website automatically and watch your conversions grow.
              </p>
              <Link to="/setup">
                <Button
                  variant="primary"
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>How Smart Website Optimization Works</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 1: Comprehensive Website Analysis
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The system performs a deep analysis of your website, examining performance metrics, 
                  user behavior, conversion funnels, technical SEO factors, mobile responsiveness, 
                  and more. This analysis identifies bottlenecks, optimization opportunities, and areas 
                  for improvement across all aspects of your site.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The analysis goes beyond surface-level metrics to understand user journeys, identify 
                  drop-off points, analyze heatmaps and scroll depth, and examine conversion paths. 
                  This comprehensive understanding forms the foundation for targeted optimizations that 
                  deliver real results.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 2: Performance Optimization
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The system automatically optimizes page speed through image compression, code 
                  minification, caching strategies, CDN optimization, and resource prioritization. 
                  These technical optimizations improve load times, which directly impacts user 
                  experience, bounce rates, and search engine rankings.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Performance optimization is ongoing—the system continuously monitors and adjusts as 
                  your website evolves. It identifies new optimization opportunities as content is 
                  added, traffic patterns change, or new technologies emerge. This ensures your 
                  website maintains peak performance over time.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 3: Conversion Rate Optimization
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The AI tests different page elements, layouts, headlines, CTAs, forms, and user 
                  flows to identify what converts best. It runs A/B tests automatically, analyzes 
                  results, and implements winning variations. This data-driven approach continuously 
                  improves conversion rates without requiring guesswork or manual testing.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The optimization process is systematic and scientific. The system tests hypotheses, 
                  measures results, and learns from outcomes. Over time, it builds a deep understanding 
                  of what works for your specific audience and business, enabling increasingly effective 
                  optimizations.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 4: SEO Enhancement
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The system improves search engine optimization through technical fixes, meta tag 
                  optimization, structured data implementation, internal linking improvements, and 
                  content optimization. These enhancements improve search rankings, organic traffic, 
                  and visibility.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  SEO optimization is comprehensive, addressing both technical and content aspects. 
                  The system ensures your website meets search engine best practices while also 
                  optimizing content for target keywords and user intent. This dual approach maximizes 
                  search visibility and organic traffic growth.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 5: Continuous Monitoring & Improvement
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The system continuously monitors your website's performance, user behavior, and 
                  conversion metrics. It identifies new optimization opportunities, tests improvements, 
                  and implements changes that deliver measurable results. This ongoing optimization 
                  ensures your website keeps improving over time.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  You receive regular reports on improvements, metrics, and ROI. The system provides 
                  transparency into what's being optimized and why, giving you confidence that your 
                  website is continuously improving and delivering better results.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Real-World Results</span>
            </h2>
            
            <div className="space-y-8">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">E-commerce Store</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  An e-commerce store implemented Smart Website optimization and saw dramatic improvements. 
                  Page load time decreased from 4.2 seconds to 1.8 seconds, mobile conversion rate 
                  increased by 35%, and overall conversion rate improved by 28%. These improvements 
                  generated an additional $180,000 in annual revenue.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The optimizations included image optimization, mobile responsiveness improvements, 
                  checkout flow optimization, and A/B testing of product pages. The AI identified 
                  specific bottlenecks that were hurting conversions and systematically addressed them, 
                  resulting in measurable improvements across all key metrics.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Service Business</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A service business saw their website traffic increase by 45% and conversion rate 
                  improve by 32% after Smart Website optimization. The improvements came from SEO 
                  enhancements, page speed optimization, and conversion rate optimization of key pages 
                  like the contact form and service pages.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The system identified that the contact form was too long and intimidating, causing 
                  high abandonment rates. It tested shorter forms, better CTAs, and improved messaging, 
                  resulting in a 40% increase in form completions. Combined with SEO improvements that 
                  brought more qualified traffic, the business saw significant growth in leads and revenue.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Key Optimization Features</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Image & Media Optimization</h3>
                <p className="text-gray-600 text-sm">
                  Automatically compresses and optimizes images, videos, and other media files to reduce 
                  load times without sacrificing quality. Supports modern formats like WebP and AVIF for 
                  maximum efficiency.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Mobile Optimization</h3>
                <p className="text-gray-600 text-sm">
                  Ensures your website is fully responsive and optimized for mobile devices. Improves 
                  mobile page speed, touch interactions, and mobile-specific conversion elements.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Caching & CDN</h3>
                <p className="text-gray-600 text-sm">
                  Implements intelligent caching strategies and CDN optimization to serve content faster 
                  to users worldwide. Reduces server load and improves performance for all visitors.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Form Optimization</h3>
                <p className="text-gray-600 text-sm">
                  Optimizes forms for better conversion rates through field reduction, better validation, 
                  progress indicators, and improved UX. Tests different form layouts and lengths to find 
                  what converts best.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">CTA Optimization</h3>
                <p className="text-gray-600 text-sm">
                  Tests different call-to-action buttons, colors, text, placement, and designs to maximize 
                  clicks and conversions. Uses data to identify the most effective CTAs for your audience.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Content Optimization</h3>
                <p className="text-gray-600 text-sm">
                  Analyzes content performance and suggests improvements to headlines, copy, structure, 
                  and formatting. Optimizes content for both users and search engines.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Frequently Asked Questions</span>
            </h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Will optimizations break my website?</h3>
                <p className="text-gray-600">
                  No. All optimizations are tested thoroughly before implementation. The system creates 
                  backups and can roll back changes if needed. Optimizations are implemented gradually 
                  and monitored to ensure they improve performance without causing issues.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">How long until I see results?</h3>
                <p className="text-gray-600">
                  Some improvements are immediate (like page speed optimizations), while others take 
                  time to show results (like SEO improvements or A/B test outcomes). Typically, you'll 
                  see measurable improvements within 2-4 weeks, with continued improvements over time 
                  as the system learns and optimizes.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I control what gets optimized?</h3>
                <p className="text-gray-600">
                  Yes. You can approve or reject optimization suggestions, set boundaries for what can 
                  be changed, and maintain control over critical elements. The system provides 
                  transparency and gives you final approval on significant changes.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Does it work with any website platform?</h3>
                <p className="text-gray-600">
                  Yes. Smart Website optimization works with any website platform: WordPress, Shopify, 
                  Squarespace, custom HTML, or any other platform. The optimizations are implemented 
                  at the code and content level, making them platform-agnostic.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Trusted by Local Business Owners</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Join 500+ businesses using Boltcall to capture more leads and grow revenue.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: "Boltcall paid for itself in the first week. We stopped losing calls after hours and our bookings jumped 40%.", name: "Marcus T.", role: "HVAC Owner, Texas" },
            { quote: "I was skeptical about AI, but it just works. Our front desk handles 30% fewer interruptions now.", name: "Priya S.", role: "Dental Practice Manager, California" },
            { quote: "We were losing 15-20 calls a week to voicemail. Boltcall captures every single one now.", name: "James R.", role: "Plumbing Business Owner, Florida" },
          ].map((item) => (
            <div key={item.name} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-gray-700 text-sm leading-relaxed mb-4">"{item.quote}"</p>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

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


      {/* Why Boltcall */}
      <section className="py-14 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">Why Businesses Choose Boltcall</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { title: 'Setup in 30 minutes', desc: 'No developers, no tech team. Answer 5 questions about your business and your AI receptionist is live — configured to your services, hours, and voice.' },
              { title: 'Flat monthly pricing', desc: 'Unlike per-call services that penalize you for growth, Boltcall charges a flat monthly fee. Handle 500 calls or 5,000 — your cost stays predictable.' },
              { title: 'Trained on your business', desc: 'Not a generic bot. Boltcall learns your specific services, pricing, FAQs, and booking rules — so every interaction sounds like your best team member.' },
              { title: 'ROI from day one', desc: 'One recovered call per month covers the entire subscription cost. Most customers see 5–10x ROI within the first 30 days from calls they would have otherwise missed.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-5 shadow-sm border border-white">
                <h3 className="font-bold text-gray-900 mb-2">✓ {item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Smart Website vs. Standard Business Website</h2>
          <p className="text-gray-500 text-sm text-center mb-6">What a Boltcall smart website does that a typical small business site does not</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Feature</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">Smart Website (Boltcall)</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Standard Business Website</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Lead capture', 'AI chat + form + click-to-call', 'Contact form only'],
                  ['After-hours lead handling', 'AI answers instantly', 'Form sits until morning'],
                  ['Speed optimization', 'Sub-2-second load time', '4–8 seconds average'],
                  ['SEO optimization', 'Schema markup + AI-ready', 'Basic or none'],
                  ['Mobile experience', 'Fully optimized + click-to-call', 'Responsive (if built well)'],
                  ['Monthly maintenance', 'Included in plan', '$100–$500/month (if any)'],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{row[0]}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{row[1]}</td>
                    <td className="px-4 py-3 text-gray-600">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default SmartWebsitePage;

