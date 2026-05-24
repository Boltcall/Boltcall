import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const AeoGlobalIntro: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const titleOverrides: Record<string, string> = {
    '/blog/ai-phone-answering-plumbers': 'AI Phone Answering for Plumbers | Boltcall',
    '/tools/cleaning-service-booking-calculator': 'Cleaning Service Booking Calculator | Boltcall',
    '/blog/ai-receptionist-vet-faq': 'AI Receptionist for Vet Clinics FAQ | Boltcall',
    '/compare/boltcall-vs-calomation': 'Boltcall vs Calomation Comparison | Boltcall',
    '/blog/speed-to-lead-local-business': 'Speed to Lead for Local Businesses | Boltcall',
    '/compare/boltcall-vs-birdeye': 'Boltcall vs Birdeye Comparison | Boltcall',
    '/blog/best-ai-receptionist-small-business': 'Best AI Receptionist for Small Business | Boltcall',
    '/challenge': 'Break Our AI Challenge | Boltcall',
    '/blog/ai-receptionist-hvac-faq': 'AI Receptionist for HVAC FAQ | Boltcall',
    '/blog/ai-receptionist-dentist-faq': 'AI Receptionist for Dentists FAQ | Boltcall',
    '/blog/best-after-hours-answering-service': 'Best After Hours Answering Service | Boltcall',
    '/blog/ai-receptionist-lawyer-faq': 'AI Receptionist for Law Firms FAQ | Boltcall',
    '/tools/landscaping-seasonal-revenue-calculator': 'Landscaping Revenue Calculator | Boltcall',
    '/business-audit': 'Free Business Audit Tool | Boltcall',
    '/compare/boltcall-vs-smith-ai': 'Boltcall vs Smith.ai Comparison | Boltcall',
    '/tools/plumber-revenue-calculator': 'Plumber Revenue Calculator | Boltcall',
    '/blog/ai-receptionist-for-plumbers': 'AI Receptionist for Plumbers Guide | Boltcall',
    '/blog/ai-chatbot-vs-live-chat-phone-comparison': 'AI Chatbot vs Live Chat vs Phone | Boltcall',
    '/blog/missed-calls-statistics-local-business-2026': 'Missed Calls Statistics 2026 | Boltcall',
    '/blog/ai-receptionist-worth-it-roi': 'Is AI Receptionist Worth It? ROI | Boltcall',
    '/tools/insurance-lead-response-scorecard': 'Insurance Lead Response Scorecard | Boltcall',
    '/compare/boltcall-vs-podium': 'Boltcall vs Podium Comparison | Boltcall',
    '/funnel-optimizer': 'Free Funnel Optimizer | Boltcall',
    '/blog/how-to-set-up-ai-phone-answering-vet-clinic': 'Set Up AI Phone Answering (Vet) | Boltcall',
    '/blog/ai-chatbot-vs-live-chat-phone-answering': 'AI Chatbot vs Live Chat vs Phone Calls | Boltcall',
    '/compare/boltcall-vs-emitrr': 'Boltcall vs Emitrr Comparison | Boltcall',
    '/blog/ai-receptionist-medspa-faq': 'AI Receptionist for Med Spas FAQ | Boltcall',
    '/blog/ai-receptionist-plumber-faq': 'AI Receptionist for Plumbers FAQ | Boltcall',
    '/blog/ai-receptionist-solar-faq': 'AI Receptionist for Solar FAQ | Boltcall',
    '/blog/ai-vs-human-receptionist': 'AI vs Human Receptionist | Boltcall',
  };

  const articleExact = new Set(['/blog', '/comparisons']);
  const articlePrefixes = ['/blog/', '/comparisons/', '/compare/'];
  const serviceSchemaRoutes = new Set([
    '/strike-ai',
    '/about',
    '/features/lead-reactivation',
    '/features/smart-website',
    '/tools/vet-clinic-revenue-calculator',
    '/features/automated-reminders',
    '/contact',
    '/conversion-rate-optimizer',
    '/newsletter',
    '/ai-visibility-check',
    '/tools/chiropractor-patient-recovery-calculator',
    '/tools/solar-quote-generator',
    '/speed-test',
    '/tools/dentist-chair-calculator',
    '/business-audit',
    '/pricing',
    '/features/instant-form-reply',
    '/tools/medspa-rebooking-calculator',
    '/tools/auto-repair-missed-call-calculator',
    '/tools/hvac-overflow-calculator',
    '/features/sms-booking-assistant',
    '/rank-on-google-offer',
    '/features/ai-follow-up-system',
    '/features/website-widget',
    '/tools/solar-profit-calculator',
    '/seo-audit',
    '/tools/lawyer-intake-calculator',
    '/ai-revenue-audit',
    '/features/ai-receptionist',
    '/tools/solar-sales-closer',
  ]);

  const isComparisonsRoute =
    path === '/comparisons' || path.startsWith('/comparisons/') || path.startsWith('/compare/');
  const isBlogRoute = path === '/blog' || path.startsWith('/blog/');
  const shouldShow =
    articleExact.has(path) || articlePrefixes.some((prefix) => path.startsWith(prefix));

  const title = isComparisonsRoute ? 'Comparison Summary' : 'Page Summary';

  const tldrText = isComparisonsRoute
    ? "This page compares Boltcall's AI receptionist with traditional call centers, human receptionists, voicemail systems, and answering services, focusing on cost, reliability, speed, and conversion impact."
    : isBlogRoute
      ? "This article explains how Boltcall's AI receptionist helps local businesses improve response speed, reduce missed leads, and automate follow-ups with less manual overhead."
      : "This page explains how Boltcall helps local businesses automate customer communication, capture more leads, and improve response quality with AI-powered workflows.";
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    const overrideTitle = titleOverrides[path];
    if (!overrideTitle) return;

    // Run after route/page effects to keep this override authoritative.
    const timer = window.setTimeout(() => {
      document.title = overrideTitle;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [path]);

  // Set canonical link tag for ALL pages — no trailing slash (Netlify redirects /page/ → /page).
  useEffect(() => {
    const canonicalHref = path === '/'
      ? 'https://boltcall.org/'
      : `https://boltcall.org${path}`;

    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonicalHref;

    return () => {
      const el = document.querySelector("link[rel='canonical']");
      if (el) el.remove();
    };
  }, [path]);

  useEffect(() => {
    if (!shouldShow) {
      return;
    }

    const headline = document.title || 'Boltcall Article';
    const canonical = path === '/'
      ? 'https://boltcall.org/'
      : `https://boltcall.org${path}`;
    const today = new Date().toISOString().split('T')[0];

    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline,
      author: {
        '@type': 'Organization',
        name: 'Boltcall Team',
      },
      datePublished: today,
      dateModified: today,
      image: {
        '@type': 'ImageObject',
        url: 'https://boltcall.org/og-image.jpg',
        width: 1200,
        height: 630,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonical,
      },
    };

    const pathParts = path.split('/').filter(Boolean);
    const breadcrumbItems = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://boltcall.org',
      },
      ...pathParts.map((segment, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        item: `https://boltcall.org/${pathParts.slice(0, index + 1).join('/')}`,
      })),
    ];
    if (breadcrumbItems.length < 2) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: 'Homepage',
        item: 'https://boltcall.org/#top',
      });
    }

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    };

    const articleScriptId = 'aeo-global-article-schema';
    const breadcrumbScriptId = 'aeo-global-breadcrumb-schema';

    const existingArticle = document.getElementById(articleScriptId);
    if (existingArticle) existingArticle.remove();
    const existingBreadcrumb = document.getElementById(breadcrumbScriptId);
    if (existingBreadcrumb) existingBreadcrumb.remove();

    const articleScript = document.createElement('script');
    articleScript.id = articleScriptId;
    articleScript.type = 'application/ld+json';
    articleScript.text = JSON.stringify(articleSchema);
    document.head.appendChild(articleScript);

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.id = breadcrumbScriptId;
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbScript);

    return () => {
      articleScript.remove();
      breadcrumbScript.remove();
    };
  }, [path, shouldShow]);

  // Global WebSite + SearchAction schema — injected on every route.
  // Signals to Google and AI Mode that boltcall.org has internal search.
  // Triggers Google sitelinks search box + helps AI engines surface
  // search-driven citations.
  useEffect(() => {
    const websiteSchemaId = 'aeo-global-website-schema';
    const existing = document.getElementById(websiteSchemaId);
    if (existing) existing.remove();

    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Boltcall',
      url: 'https://boltcall.org',
      inLanguage: 'en-US',
      description:
        'Speed-to-lead AI receptionist for local service businesses — answers every call 24/7, books appointments instantly, captures leads automatically.',
      publisher: {
        '@type': 'Organization',
        name: 'Boltcall',
        url: 'https://boltcall.org',
        logo: {
          '@type': 'ImageObject',
          url: 'https://boltcall.org/logo.png',
        },
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://boltcall.org/blog?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    };

    const script = document.createElement('script');
    script.id = websiteSchemaId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(websiteSchema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [path]);

  useEffect(() => {
    if (!serviceSchemaRoutes.has(path)) {
      return;
    }

    const serviceSchemaId = 'aeo-global-service-schema';
    const existing = document.getElementById(serviceSchemaId);
    if (existing) existing.remove();

    const pageTitle = document.title || 'Boltcall Service';
    const metaDescription =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content') ||
      "Boltcall provides AI-powered business automation services for local businesses.";

    const serviceSchema = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: pageTitle,
      description: metaDescription,
      provider: {
        '@type': 'Organization',
        name: 'Boltcall',
        url: 'https://boltcall.org',
      },
    };

    const script = document.createElement('script');
    script.id = serviceSchemaId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(serviceSchema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [path]);

  if (!shouldShow) {
    return null;
  }

  return (
    <section className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isComparisonsRoute && (
          <p className="text-sm text-gray-800 mb-3">
            This page compares Boltcall's AI receptionist with traditional call centers, human receptionists, and other answering services, highlighting the advantages and disadvantages of each option.
          </p>
        )}
        <p className="text-sm text-gray-600 mb-2">Written by the Boltcall Team</p>
        <p className="text-xs text-gray-500 mb-3">Last updated: {lastUpdated}</p>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
          <p className="text-xs font-semibold text-blue-700 mb-1">TL;DR</p>
          <p className="text-sm text-gray-800">{tldrText}</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Q:</span> How does Boltcall ensure quality responses?
              {' '}
              <span className="font-semibold">A:</span> Boltcall uses trained AI workflows and business-specific context to provide consistent, accurate replies.
            </p>
            <p>
              <span className="font-semibold">Q:</span> Is Boltcall only for calls?
              {' '}
              <span className="font-semibold">A:</span> No. Boltcall supports calls, lead capture, and follow-up automation across multiple channels.
            </p>
            <p>
              <span className="font-semibold">Q:</span> Where can I see more comparisons?
              {' '}
              <span className="font-semibold">A:</span> Visit
              {' '}
              <Link className="text-blue-600 hover:text-blue-700" to="/comparisons">
                /comparisons
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Sources & Citations</h3>
          <ul className="space-y-1 text-sm text-gray-700 list-disc pl-5">
            <li>
              <a
                href="https://hbr.org/2011/03/the-short-life-of-online-sales-leads"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                Harvard Business Review: The Short Life of Online Sales Leads
              </a>
              {' '}
              (speed-to-lead and response-time impact)
            </li>
            <li>
              <a
                href="https://www.salesforce.com/resources/research-reports/state-of-the-connected-customer/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                Salesforce: State of the Connected Customer
              </a>
              {' '}
              (customer service and response expectations)
            </li>
            <li>
              <a
                href="https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/the-state-of-ai"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                McKinsey: The State of AI
              </a>
              {' '}
              (AI adoption and operational impact)
            </li>
            <li>
              <a
                href="https://www.brightlocal.com/research/local-consumer-review-survey/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                BrightLocal: Local Consumer Review Survey
              </a>
              {' '}
              (local business trust and customer behavior)
            </li>
          </ul>
        </div>
        <div className="mt-5 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Page Context</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              This page is part of Boltcall&apos;s public knowledge hub for local-business growth, AI
              receptionist workflows, lead response performance, and customer communication
              automation. It is designed to provide practical guidance for operators who need
              clear answers they can apply immediately.
            </p>
            <p>
              The core objective across Boltcall content is helping businesses improve speed-to-lead,
              reduce missed opportunities, and create more consistent customer experiences across
              calls, forms, messaging, booking flows, and follow-up systems. Where relevant, pages
              compare alternatives, explain trade-offs, and show implementation paths.
            </p>
            <p>
              To keep this resource useful for search users and AI answer engines, we provide a
              concise summary, direct objections handling, structured data, and supporting sources.
              Content is periodically refreshed to reflect current best practices and newly emerging
              operational questions from business owners.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AeoGlobalIntro;

