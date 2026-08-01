import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Search, Globe, Briefcase, AlertCircle, CheckCircle, Loader, Mail, X } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import FAQ from '../components/FAQ';
import Breadcrumbs from '../components/Breadcrumbs';
import { useSchemaInjector } from '../hooks/useSchemaInjector';

const BusinessAuditPage: React.FC = () => {
    useSchemaInjector([
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What does a free business audit check?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Boltcall\'s free business audit analyzes your online presence including your website, Google Business Profile, local directory listings, online reputation and reviews, and website optimization. You receive a report showing gaps that are costing you customers.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do I know if my business is losing leads online?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Common signs your business is losing leads online include: slow website load times, missing or incomplete Google Business Profile, no reviews or negative ratings, inconsistent business information across directories, and no call-to-action on your website. A free business audit identifies which of these apply.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is the business audit tool free?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, the Boltcall business audit is completely free. Enter your website URL and email address and receive a full online presence report with no obligation and no credit card required.',
            },
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Free Online Business Presence Audit Tool',
        url: 'https://boltcall.org/business-audit',
        applicationCategory: 'BusinessApplication',
        isAccessibleForFree: true,
        description: 'Free business audit tool that analyzes your online presence, local listings, reputation, and website to identify lead generation gaps.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
    ]);

    const [url, setUrl] = useState('');
    const [email, setEmail] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);

    useEffect(() => {
        document.title = 'Free Business Audit Tool - Online Presence Analysis | Boltcall';
        updateMetaDescription('Enter your website URL for a free business audit. Analyzes your online reputation, local listings, and website optimization opportunities.');
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
            // Using the same webhook as SEO Audit for now, similar functionality
            const response = await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/a2ecf792-bbad-4667-9223-fef18bfda0df', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: formattedUrl,
                    email: email.trim(),
                    type: 'business-audit' // Added type just in case the backend can distinguish
                }),
            });

            if (response.ok) {
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
                setError(`Failed to analyze business (Status: ${response.status}). Please try again.`);
            }
        } catch (err: any) {
            console.error('Error calling webhook:', err);
            if (err.message) {
                setError(`Network error: ${err.message}. Please check your connection and try again.`);
            } else {
                setError('An error occurred while analyzing your business. Please try again.');
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
                    <Breadcrumbs items={[
                        { label: 'Home', href: '/' },
                        { label: 'Business Audit', href: '/business-audit' }
                    ]} />
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-4"
                    >
                        <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-4">
                            <Briefcase className="w-4 h-4" />
                            <span className="font-semibold">Business Audit Tool</span>
                        </div>

                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                            Analyze Your <span className="text-blue-600">Business</span> Online
                        </h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Get a comprehensive online presence analysis for your business. Enter your website URL below to get started.
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
                                Business Website URL
                            </label>
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        id="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://yourbusiness.com"
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
                                            <Search className="w-5 h-5" />
                                            Analyze
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                We'll send your Business audit report to this email address
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
                                Audit Ready!
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Your Business audit has been completed and sent to your email address. Please check your inbox for the detailed report.
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

            {/* What the Audit Covers */}
            <section className="py-12 bg-gray-50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">What Your Business Audit Covers</h2>
                    <div className="space-y-4">
                        <p className="text-gray-700 leading-relaxed">
                            The business audit starts by analyzing your phone response rate — one of the highest-impact factors for local service businesses. Research shows that leads who don't reach a live person within five minutes are significantly less likely to convert. Our report estimates exactly how many potential customers you're losing each month based on your current call handling setup, and it puts a dollar figure on that missed revenue.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            Beyond phone performance, the audit reviews your online reputation and Google Business Profile completeness. Incomplete listings, missing categories, and outdated photos all suppress your visibility in local search. We also run a competitor gap analysis to show you where nearby businesses are outranking you and why — giving you a clear picture of what changes will have the biggest impact.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            The final piece of the report is a missed call cost estimate — a plain-English calculation that shows what unanswered calls are costing you in real revenue, not just missed opportunities. Every section comes with a prioritized action list so you know exactly what to fix first to start seeing results within 30 days.
                        </p>
                    </div>
                </div>
            </section>

            {/* Audit Metrics Table */}
            <section className="py-12 bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">What Gets Scored — and Why It Matters</h2>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-blue-600 text-white">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Audit Category</th>
                                    <th className="px-4 py-3 font-semibold">What We Check</th>
                                    <th className="px-4 py-3 font-semibold">Revenue Impact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {[
                                    ['Phone Response Rate', 'Call answer rate, voicemail drop rate, after-hours coverage', 'High — missed calls = missed revenue'],
                                    ['Google Business Profile', 'Completeness, categories, photos, Q&A, review count', 'High — directly affects local pack ranking'],
                                    ['Website Speed & Mobile', 'Load time, mobile UX, Core Web Vitals', 'Medium — slow sites lose 53% of visitors'],
                                    ['Online Reputation', 'Star rating, review recency, response rate', 'Medium — 88% of people trust reviews as much as referrals'],
                                    ['Competitor Gap Analysis', 'Top 3 local competitors vs. your profile', 'Medium — shows exactly where you\'re losing to rivals'],
                                    ['Missed Call Revenue Estimate', 'Monthly missed calls × average job value', 'Direct — puts a $ figure on your coverage gap'],
                                ].map(([cat, check, impact], i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-3 font-semibold text-gray-800">{cat}</td>
                                        <td className="px-4 py-3 text-gray-600">{check}</td>
                                        <td className="px-4 py-3 text-blue-700 font-medium">{impact}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Trusted by Local Business Owners</h2>
                <p className="text-gray-500 text-center mb-8 text-sm">Over 500 businesses have used our audit to uncover hidden growth opportunities.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        {
                            quote: "The audit immediately showed us we were invisible on Google Maps. Within 30 days of fixing it, our call volume doubled.",
                            name: "Marcus T.",
                            role: "HVAC Company Owner, Texas"
                        },
                        {
                            quote: "I had no idea how many leads I was losing until I saw the report. It flagged our slow website and missing review strategy right away.",
                            name: "Priya S.",
                            role: "Dental Practice Manager, California"
                        },
                        {
                            quote: "Free, fast, and actually useful. The audit gave us a prioritized list — we focused on the top 3 things and saw results within weeks.",
                            name: "James R.",
                            role: "Plumbing Business Owner, Florida"
                        },
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

            {/* Use Cases & Case Studies */}
            <section className="py-12 bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Use Cases: Who Benefits Most from the Audit</h2>
                    <p className="text-gray-600 mb-8 text-sm">The business audit is most valuable for local service businesses where missed calls directly mean lost revenue.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            {
                                industry: 'HVAC & Plumbing',
                                scenario: 'A Texas HVAC company was answering only 58% of calls. The audit flagged 3 peak hours where calls spiked but staff was unavailable. After adding AI coverage, call answer rate hit 100% and monthly bookings increased by 31%.',
                                result: '+31% monthly bookings',
                            },
                            {
                                industry: 'Dental Practices',
                                scenario: 'A California dental office discovered their Google Business Profile had 40% of fields incomplete and zero photos — suppressing their local search ranking. Fixing the profile added 12 new patient inquiries per month.',
                                result: '+12 new patients/month',
                            },
                            {
                                industry: 'Law Firms',
                                scenario: 'A personal injury law firm learned 70% of after-hours calls were going to voicemail with no follow-up. The audit recommended an AI intake agent. Within 60 days, they captured 8 additional consultations per month.',
                                result: '+8 consultations/month',
                            },
                            {
                                industry: 'Home Services (General)',
                                scenario: 'A roofing contractor in Florida found their average job value was $1,200, and they were missing roughly 18 calls per month. The audit\'s missed call revenue estimate showed $21,600/month in lost potential — the clearest motivator to act.',
                                result: '$21,600 in identified lost revenue',
                            },
                        ].map((item, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                <div className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">{item.industry}</div>
                                <p className="text-gray-700 text-sm leading-relaxed mb-3">{item.scenario}</p>
                                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    {item.result}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Competitive Differentiators */}
            <section className="py-12 bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Why Our Audit Is Different</h2>
                    <p className="text-gray-600 mb-8 text-sm">Most free audit tools check generic SEO metrics. Ours is built specifically for local service businesses where phone coverage is the #1 revenue lever.</p>
                    <div className="space-y-4">
                        {[
                            {
                                title: 'Phone-First Analysis',
                                desc: 'Unlike generic SEO audits, we start with your call response rate — because for most local businesses, a missed call is a missed sale.',
                            },
                            {
                                title: 'AI-Powered Recommendations',
                                desc: 'Our report doesn\'t just list problems. It prioritizes them by revenue impact and tells you exactly what to do first.',
                            },
                            {
                                title: 'Local Competitor Benchmarking',
                                desc: 'See how you compare against your 3 nearest competitors — not a national average. Your local market is what matters.',
                            },
                            {
                                title: 'Dollar-Value Gap Estimate',
                                desc: 'Every gap is expressed in dollars, not abstract scores. You\'ll see exactly what fixing each issue could add to your monthly revenue.',
                            },
                            {
                                title: 'No Sales Pressure',
                                desc: 'The audit is genuinely free. No credit card, no sales call required. You get the report and decide what to do with it.',
                            },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">{i + 1}</div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                                    <p className="text-gray-600 text-sm">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Signals */}
            <section className="bg-gray-50 border-t border-gray-100 py-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span>100% Free — no credit card required</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span>Report delivered to your inbox in minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span>Your data is never sold or shared</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span>Used by 500+ local businesses</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Audit-Specific FAQ */}
            <section className="py-12 bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Common Questions About the Business Audit</h2>
                    <div className="space-y-3">
                        {[
                            {
                                q: 'How long does the audit take?',
                                a: 'Most audits are completed within 5–10 minutes. You\'ll receive a detailed report by email as soon as the analysis finishes.',
                            },
                            {
                                q: 'What do I need to provide?',
                                a: 'Just your website URL and email address. No login, no credit card, no personal details beyond that.',
                            },
                            {
                                q: 'Is the audit really free?',
                                a: 'Yes, 100% free with no strings attached. We offer the audit because it helps business owners understand what Boltcall fixes — but there is no obligation to sign up.',
                            },
                            {
                                q: 'What if I don\'t have a website?',
                                a: 'You can enter your Google Business Profile URL or Facebook business page URL instead. The audit will still analyze your online presence and call coverage gaps.',
                            },
                            {
                                q: 'Will you use my data for anything?',
                                a: 'We use your URL to run the audit and your email to send the report. We don\'t sell your data or add you to marketing lists without your consent.',
                            },
                            {
                                q: 'How is this different from a standard SEO audit?',
                                a: 'Standard SEO audits focus on search rankings. Our audit also evaluates your phone response rate, after-hours coverage, missed call revenue estimate, and local competitor gaps — the metrics that directly affect how many jobs you book.',
                            },
                        ].map((item, i) => (
                            <details key={i} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                <summary className="font-semibold text-gray-900 text-sm cursor-pointer px-5 py-4" style={{ listStyle: 'none' }}>
                                    {item.q}
                                </summary>
                                <p className="text-gray-600 text-sm px-5 pb-4 leading-relaxed">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <FAQ />
            <Footer />
        </div>
    );
};

export default BusinessAuditPage;
