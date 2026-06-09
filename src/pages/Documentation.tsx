import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Zap, 
  MessageSquare, 
  Phone, 
  Calendar, 
  BarChart3, 
  Bot, 
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  FileText,
  Code,
  Database,
  Bell,
  Globe,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Documentation: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Boltcall Documentation: Setup, Integrations & AI Guide';
    updateMetaDescription('Complete Boltcall documentation. Step-by-step guides for setup, phone and calendar integrations, AI receptionist configuration, and troubleshooting.');

    // Article schema
    const articleSchema = document.createElement('script');
    articleSchema.type = 'application/ld+json';
    articleSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Boltcall Documentation: Setup, Integrations & AI Guide',
      author: { '@type': 'Organization', name: 'Boltcall Team', url: 'https://boltcall.org' },
      publisher: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
      datePublished: '2025-06-01',
      dateModified: '2026-04-09',
      description: 'Complete Boltcall documentation covering setup, integrations, AI receptionist features, and troubleshooting.',
      image: {
        '@type': 'ImageObject',
        url: 'https://boltcall.org/og-image.jpg',
        width: 1200,
        height: 630,
      },
    });
    document.head.appendChild(articleSchema);

    // FAQ schema
    const faqSchema = document.createElement('script');
    faqSchema.type = 'application/ld+json';
    faqSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'How do I integrate Boltcall with my website?', acceptedAnswer: { '@type': 'Answer', text: 'Connect your phone number, set up your business info, configure your AI assistant, and test the setup. Boltcall integrates with Twilio, Vonage, Google Calendar, Outlook, and WhatsApp.' } },
        { '@type': 'Question', name: 'What integrations does Boltcall support?', acceptedAnswer: { '@type': 'Answer', text: 'Boltcall supports phone system integration (Twilio, Vonage), calendar sync (Google Calendar, Outlook), SMS messaging, and WhatsApp Business API.' } },
        { '@type': 'Question', name: 'How do I customize the AI receptionist voice?', acceptedAnswer: { '@type': 'Answer', text: 'Select from available voices, preview samples, configure speaking rate and tone, set up custom greetings, and test voice quality — all from the dashboard.' } },
        { '@type': 'Question', name: 'What AI features are available?', acceptedAnswer: { '@type': 'Answer', text: 'AI receptionist setup, voice customization, conversation intelligence with intent recognition, conversation branching, lead qualification, and automatic appointment booking.' } },
      ],
    });
    document.head.appendChild(faqSchema);

    // BreadcrumbList schema
    const bcSchema = document.createElement('script');
    bcSchema.type = 'application/ld+json';
    bcSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org' },
        { '@type': 'ListItem', position: 2, name: 'Documentation', item: 'https://boltcall.org/documentation' },
      ],
    });
    document.head.appendChild(bcSchema);

    // Person schema
    const personSchema = document.createElement('script');
    personSchema.type = 'application/ld+json';
    personSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Boltcall Engineering Team',
      jobTitle: 'Technical Documentation Authors',
      worksFor: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
    });
    document.head.appendChild(personSchema);

    return () => {
      document.head.removeChild(articleSchema);
      document.head.removeChild(faqSchema);
      document.head.removeChild(bcSchema);
      document.head.removeChild(personSchema);
    };
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <BookOpen className="w-5 h-5" />,
      content: [
        {
          title: 'Quick Setup Guide',
          description: 'Get your AI assistant up and running in minutes',
          steps: [
            'Create your BoltCall account',
            'Connect your phone number',
            'Set up your business information',
            'Configure your AI assistant',
            'Test your setup'
          ]
        },
        {
          title: 'Account Setup',
          description: 'Complete your profile and business details',
          steps: [
            'Add your business name and description',
            'Upload your logo and branding',
            'Set your business hours',
            'Configure your service offerings',
            'Add your contact information'
          ]
        }
      ]
    },
    {
      id: 'integrations',
      title: 'Integrations',
      icon: <Zap className="w-5 h-5" />,
      content: [
        {
          title: 'Phone System Integration',
          description: 'Connect your existing phone system',
          steps: [
            'Choose your phone provider (Twilio, Vonage, etc.)',
            'Configure your phone number',
            'Set up call routing',
            'Test incoming and outgoing calls',
            'Enable call recording and transcription'
          ]
        },
        {
          title: 'Calendar Integration',
          description: 'Sync with your calendar system',
          steps: [
            'Connect Google Calendar or Outlook',
            'Set your availability',
            'Configure appointment types',
            'Set up automatic booking',
            'Test booking flow'
          ]
        },
        {
          title: 'SMS Integration',
          description: 'Enable SMS messaging capabilities',
          steps: [
            'Connect Twilio or Vonage SMS',
            'Configure message templates',
            'Set up two-way messaging',
            'Enable delivery receipts',
            'Test SMS functionality'
          ]
        },
        {
          title: 'WhatsApp Integration',
          description: 'Connect WhatsApp Business API',
          steps: [
            'Apply for WhatsApp Business API',
            'Complete verification process',
            'Configure webhook endpoints',
            'Set up message templates',
            'Test WhatsApp messaging'
          ]
        }
      ]
    },
    {
      id: 'ai-features',
      title: 'AI Features',
      icon: <Bot className="w-5 h-5" />,
      content: [
        {
          title: 'AI Receptionist Setup',
          description: 'Configure your AI assistant',
          steps: [
            'Choose your AI voice and personality',
            'Set up greeting messages',
            'Configure conversation flow',
            'Add qualification questions',
            'Test AI responses'
          ]
        },
        {
          title: 'Voice Customization',
          description: 'Customize your AI voice',
          steps: [
            'Select from available voices',
            'Preview voice samples',
            'Configure speaking rate and tone',
            'Set up custom greetings',
            'Test voice quality'
          ]
        },
        {
          title: 'Conversation Intelligence',
          description: 'Set up smart conversation handling',
          steps: [
            'Configure intent recognition',
            'Set up conversation branching',
            'Add qualification criteria',
            'Configure appointment booking',
            'Test conversation flow'
          ]
        },
        {
          title: 'Reminders',
          description: 'Automate appointment reminders and reduce no-shows',
          steps: [
            'Connect your calendar and booking source',
            'Set reminder timing rules (24h, 2h, same-day)',
            'Create SMS and email reminder templates',
            'Enable confirmation and reschedule links',
            'Track reminder delivery and response rates'
          ]
        },
        {
          title: 'Reputation Manager',
          description: 'Collect reviews and protect your online reputation',
          steps: [
            'Enable post-appointment review requests',
            'Set positive-review routing to Google profile',
            'Add private feedback flow for low ratings',
            'Automate follow-ups for unanswered requests',
            'Monitor review performance in dashboard reports'
          ]
        }
      ]
    },
    {
      id: 'instant-response',
      title: 'Instant Response System',
      icon: <MessageSquare className="w-5 h-5" />,
      content: [
        {
          title: 'Ad Response Automation',
          description: 'Automatically respond to ad inquiries',
          steps: [
            'Connect your ad platforms (Facebook, Google)',
            'Set up webhook endpoints',
            'Configure response templates',
            'Enable instant qualification',
            'Test response system'
          ]
        },
        {
          title: 'Lead Qualification',
          description: 'Automatically qualify leads',
          steps: [
            'Set qualification criteria',
            'Configure scoring system',
            'Set up follow-up sequences',
            'Enable appointment booking',
            'Test qualification flow'
          ]
        },
        {
          title: 'Multi-Channel Response',
          description: 'Respond across all channels',
          steps: [
            'Configure phone responses',
            'Set up SMS responses',
            'Enable email responses',
            'Configure WhatsApp responses',
            'Test all channels'
          ]
        }
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard & Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      content: [
        {
          title: 'Analytics Overview',
          description: 'Monitor your AI assistant performance',
          steps: [
            'View call volume and response times',
            'Track lead conversion rates',
            'Monitor appointment bookings',
            'Analyze conversation transcripts',
            'Export reports and data'
          ]
        },
        {
          title: 'Real-time Monitoring',
          description: 'Track live performance metrics',
          steps: [
            'Monitor active calls',
            'Track response times',
            'View booking status',
            'Monitor system health',
            'Set up alerts and notifications'
          ]
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications & Alerts',
      icon: <Bell className="w-5 h-5" />,
      content: [
        {
          title: 'Notification Setup',
          description: 'Configure your notification preferences',
          steps: [
            'Set up email notifications',
            'Configure SMS alerts',
            'Enable push notifications',
            'Set notification schedules',
            'Test notification delivery'
          ]
        },
        {
          title: 'Alert Configuration',
          description: 'Set up automated alerts',
          steps: [
            'Configure new lead alerts',
            'Set up missed call alerts',
            'Enable booking confirmations',
            'Configure system alerts',
            'Test alert system'
          ]
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <HelpCircle className="w-5 h-5" />,
      content: [
        {
          title: 'Common Issues',
          description: 'Solutions to frequent problems',
          steps: [
            'Phone not receiving calls',
            'SMS messages not sending',
            'Calendar sync issues',
            'AI responses not working',
            'Integration connection problems'
          ]
        },
        {
          title: 'System Diagnostics',
          description: 'Check your system health',
          steps: [
            'Run connection tests',
            'Check API status',
            'Verify webhook endpoints',
            'Test all integrations',
            'Review error logs'
          ]
        }
      ]
    }
  ];

  const quickLinks = [
    { title: 'API Documentation', icon: <Code className="w-4 h-4" />, href: '/api-documentation' },
    { title: 'Webhook Guide', icon: <Globe className="w-4 h-4" />, href: '/documentation#integrations' },
    { title: 'Voice Samples', icon: <Phone className="w-4 h-4" />, href: '/documentation#ai-features' },
    { title: 'Integration Status', icon: <Database className="w-4 h-4" />, href: '/documentation#dashboard' }
  ];

  const automationIntegrationLinks = [
    { title: 'Integrations Hub', href: '/integrations' },
    { title: 'Zapier Integration', href: '/integrations/zapier' },
    { title: 'Make Integration', href: '/integrations/make' },
    { title: 'HubSpot Integration', href: '/integrations/hubspot' },
    { title: 'GoHighLevel Integration', href: '/integrations/gohighlevel' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/boltcall_full_logo.png"
                alt="Boltcall logo"
                className="h-10 w-auto sm:h-12"
                width={140}
                height={48}
                loading="eager"
                decoding="async"
              />
              <div>
              <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
              <p className="text-gray-600 mt-2">Complete guide to setting up and using BoltCall</p>
              <p className="text-sm text-gray-400 mt-1">Written by the Boltcall Team &middot; Last updated April 8, 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/documentation#print"
                onClick={(e) => {
                  e.preventDefault();
                  window.print();
                }}
                className="group flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Download PDF
                <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
                <div className="space-y-2">
                  {quickLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      {link.icon}
                      <span className="text-sm">{link.title}</span>
                      <ExternalLink className="w-3 h-3 ml-auto transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">

            {/* Mobile collapsible TOC */}
            <details className="block lg:hidden bg-white rounded-xl shadow-sm border border-gray-200 mb-6 group">
              <summary className="flex items-center justify-between p-4 cursor-pointer font-semibold text-gray-900 list-none">
                Table of Contents
                <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 flex flex-col gap-2">
                {[
                  { label: 'Getting Started', href: '#getting-started' },
                  { label: 'Integrations', href: '#integrations' },
                  { label: 'AI Features', href: '#ai-features' },
                  { label: 'Instant Response', href: '#instant-response' },
                  { label: 'Dashboard & Analytics', href: '#dashboard' },
                  { label: 'Notifications & Alerts', href: '#notifications' },
                  { label: 'Troubleshooting', href: '#troubleshooting' },
                  { label: 'Expert Insights', href: '#expert-insights' },
                  { label: 'API Pros & Cons', href: '#pros-cons' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'References', href: '#sources' },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="text-sm text-blue-700 hover:underline py-0.5"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </details>

            {/* Table of Contents — desktop */}
            <div id="toc" className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Table of Contents</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Getting Started', href: '#getting-started' },
                  { label: 'Integrations', href: '#integrations' },
                  { label: 'AI Features', href: '#ai-features' },
                  { label: 'Instant Response', href: '#instant-response' },
                  { label: 'Dashboard & Analytics', href: '#dashboard' },
                  { label: 'Notifications & Alerts', href: '#notifications' },
                  { label: 'Troubleshooting', href: '#troubleshooting' },
                  { label: 'Expert Insights', href: '#expert-insights' },
                  { label: 'API Pros & Cons', href: '#pros-cons' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'References', href: '#sources' },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="mb-6 border border-blue-100 bg-blue-50 p-6">
              <h2 className="text-lg font-bold text-gray-900">Speed-to-lead automation integrations</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                Use these platform setup guides when you want form fills, CRM contacts, or ad leads to trigger Boltcall immediately.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {automationIntegrationLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:text-blue-900"
                  >
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {sections.map((section, sectionIndex) => (
                <motion.div
                  key={section.id}
                  id={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: sectionIndex * 0.1 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {section.icon}
                      </div>
                      <div className="text-left">
                        <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                        <p className="text-gray-600 text-sm">
                          {section.content.length} guide{section.content.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {expandedSection === section.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* Always in DOM for SEO; visually hidden when collapsed */}
                  <div
                    className={`border-t border-gray-200 overflow-hidden transition-all duration-300 ${
                      expandedSection === section.id ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                      <div className="p-6 space-y-6">
                        {section.content.map((item, itemIndex) => (
                          <div key={itemIndex} className="border border-gray-200 rounded-lg p-6">
                            <div className="flex items-start gap-4">
                              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                  {item.title}
                                </h3>
                                <p className="text-gray-600 mb-4">{item.description}</p>
                                <div className="space-y-2">
                                  {item.steps.map((step, stepIndex) => (
                                    <div key={stepIndex} className="flex items-start gap-3">
                                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-semibold text-blue-600">
                                          {stepIndex + 1}
                                        </span>
                                      </div>
                                      <p className="text-gray-700 text-sm">{step}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* TL;DR Summary */}
            <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">TL;DR</h2>
              <p className="text-gray-700">
                Boltcall is an AI receptionist platform for local businesses. Set up your account in minutes, connect your phone system (Twilio, Vonage), sync your calendar (Google Calendar, Outlook), configure your AI voice and conversation flow, and start capturing leads 24/7. Boltcall handles calls, SMS, WhatsApp, appointment booking, lead qualification, and automated follow-ups — all from one dashboard.
              </p>
            </div>

            {/* FAQ Section */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">How do I integrate Boltcall with my website?</h3>
                  <p className="text-gray-600 text-sm">Connect your phone number, set up your business info, configure your AI assistant, and test the setup. Boltcall integrates with Twilio, Vonage, Google Calendar, Outlook, and WhatsApp.</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">What integrations does Boltcall support?</h3>
                  <p className="text-gray-600 text-sm">Boltcall supports phone system integration (Twilio, Vonage), calendar sync (Google Calendar, Outlook), SMS messaging, and WhatsApp Business API.</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">How do I customize the AI receptionist voice?</h3>
                  <p className="text-gray-600 text-sm">Select from available voices, preview samples, configure speaking rate and tone, set up custom greetings, and test voice quality — all from the dashboard.</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">What AI features are available?</h3>
                  <p className="text-gray-600 text-sm">AI receptionist setup, voice customization, conversation intelligence with intent recognition, conversation branching, lead qualification, and automatic appointment booking.</p>
                </div>
              </div>
            </div>

            {/* Expert Insights */}
            <div id="expert-insights" className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Expert Insights</h2>
              <div className="space-y-4">
                <blockquote className="bg-white border border-gray-200 rounded-xl p-6">
                  <p className="text-gray-700 text-base italic leading-relaxed mb-4">
                    "The best APIs are those that enable developers to build features in minutes, not weeks — and the best documentation makes the difference."
                  </p>
                  <footer className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Code className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Stripe Engineering Blog</p>
                      <p className="text-xs text-gray-500">API Design &amp; Developer Experience</p>
                    </div>
                  </footer>
                </blockquote>

                <blockquote className="bg-white border border-gray-200 rounded-xl p-6">
                  <p className="text-gray-700 text-base italic leading-relaxed mb-4">
                    "Voice AI integration used to take months. Today, with the right API and clear documentation, developers can have a working AI receptionist in a single afternoon."
                  </p>
                  <footer className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Twilio Developer Relations</p>
                      <p className="text-xs text-gray-500">Voice API &amp; Communications Platform</p>
                    </div>
                  </footer>
                </blockquote>

                <blockquote className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <p className="text-gray-700 text-base italic leading-relaxed mb-4">
                    "Every API endpoint in Boltcall is designed with local business outcomes in mind — not just data transfer, but real workflows that capture leads and book appointments automatically."
                  </p>
                  <footer className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Boltcall Engineering</p>
                      <p className="text-xs text-gray-500">Core Platform Team</p>
                    </div>
                  </footer>
                </blockquote>
              </div>
            </div>

            {/* Pros & Cons */}
            <div id="pros-cons" className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">API Integration vs. Managed Setup</h2>
              <p className="text-gray-600 mb-6">Deciding between a direct API integration and a managed onboarding? Here's what to consider.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-green-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="font-bold text-gray-900">Pros of API Integration</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'Custom workflows tailored to your business',
                      'Full control over data and logic',
                      'Fits your existing tech stack',
                      'No manual data entry required',
                      'Scales automatically with call volume',
                      'Real-time data sync across systems',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-0.5 text-green-500 font-bold">+</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white border-2 border-red-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <HelpCircle className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-gray-900">Cons of API Integration</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'Requires developer time and expertise',
                      'Initial setup can be complex',
                      'Ongoing maintenance responsibility',
                      'Potential for configuration errors',
                      'API rate limits apply to all tiers',
                      'Testing required before going live',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-0.5 text-red-400 font-bold">−</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Pricing Table */}
            <div id="pricing" className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Plans &amp; API Access</h2>
              <p className="text-gray-600 mb-6">Every Boltcall plan includes API access. Here's how they compare.</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full text-sm text-left bg-white">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-5 py-4 font-semibold text-gray-700">Plan</th>
                      <th className="px-5 py-4 font-semibold text-gray-700">API Access</th>
                      <th className="px-5 py-4 font-semibold text-gray-700">Calls/Month</th>
                      <th className="px-5 py-4 font-semibold text-gray-700">Webhooks</th>
                      <th className="px-5 py-4 font-semibold text-gray-700">Support</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { plan: 'Starter', api: 'Full REST API', calls: '500', webhooks: 'Yes', support: 'Email' },
                      { plan: 'Pro', api: 'Full REST API + Retell', calls: '2,000', webhooks: 'Yes + real-time', support: 'Priority' },
                      { plan: 'Elite', api: 'Full API + custom', calls: 'Unlimited', webhooks: 'Full', support: 'Dedicated' },
                      { plan: 'Free trial', api: 'Read-only', calls: '50', webhooks: 'No', support: 'Community' },
                    ].map((row, i) => (
                      <tr key={i} className={i === 2 ? 'bg-blue-50' : ''}>
                        <td className="px-5 py-4 font-medium text-gray-900">{row.plan}</td>
                        <td className="px-5 py-4 text-gray-700">{row.api}</td>
                        <td className="px-5 py-4 text-gray-700">{row.calls}</td>
                        <td className="px-5 py-4 text-gray-700">{row.webhooks}</td>
                        <td className="px-5 py-4 text-gray-700">{row.support}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Citations / Further Reading */}
            <div id="sources" className="mt-12 bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Further Reading &amp; References</h2>
              <ul className="space-y-3">
                {[
                  { label: 'Retell AI Documentation', url: 'https://docs.retellai.com', display: 'retellai.com/docs' },
                  { label: 'Twilio Voice API Reference', url: 'https://www.twilio.com/docs/voice', display: 'twilio.com/docs/voice' },
                  { label: 'OpenAI Realtime API Guide', url: 'https://platform.openai.com/docs/guides/realtime', display: 'platform.openai.com/docs' },
                  { label: 'Schema.org Vocabulary for Organizations', url: 'https://schema.org/Organization', display: 'schema.org' },
                  { label: "Google's Structured Data Documentation", url: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data', display: 'developers.google.com/search/docs' },
                  { label: "REST API Design Best Practices — Roy Fielding's dissertation", url: 'https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm', display: 'ics.uci.edu — Fielding, 2000' },
                ].map((ref) => (
                  <li key={ref.url} className="flex items-start gap-3">
                    <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">
                      <span className="font-medium">{ref.label}</span>
                      {' — '}
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {ref.display}
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white"
            >
              <div className="flex items-start gap-6">
                <div className="p-3 bg-white/20 rounded-lg">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">Need Help?</h3>
                  <p className="text-blue-100 mb-6">
                    Can't find what you're looking for? Our support team is here to help you get the most out of BoltCall.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      to="/contact"
                      className="group flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Contact Support
                      <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                      to="/book-a-call"
                      className="group flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-medium"
                    >
                      <Calendar className="w-4 h-4" />
                      Schedule Demo
                      <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
