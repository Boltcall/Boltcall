import React from 'react';
import { useLocation } from 'react-router-dom';

const exactRoutes = new Set([
  '/',
  '/about',
  '/contact',
  '/pricing',
  '/documentation',
  '/help-center',
  '/newsletter',
  '/conversion-rate-optimizer',
  '/ai-visibility-check',
  '/speed-test',
  '/business-audit',
  '/website-audit',
  '/ai-revenue-audit',
  '/seo-audit',
  '/seo-aeo-audit',
  '/free-website',
  '/funnel-optimizer',
  '/ai-readiness-scorecard',
  '/rank-on-google-offer',
  '/ai-agent-comparison',
  '/giveaway',
  '/ai-receptionist-roi',
  '/blog',
  '/comparisons',
  '/strike-ai',
  '/challenge',
]);

const prefixRoutes = [
  '/blog/',
  '/comparisons/',
  '/compare/',
  '/tools/',
  '/features/',
  '/ai-guide-for-businesses',
];

const excludedPrefixes = ['/dashboard', '/setup', '/auth/', '/admin', '/payment/'];
const excludedExact = new Set(['/login', '/signup']);

const ContentDepthFooter: React.FC = () => {
  const { pathname } = useLocation();

  const isExcluded =
    excludedExact.has(pathname) ||
    excludedPrefixes.some((prefix) => pathname.startsWith(prefix));

  const shouldShow =
    !isExcluded &&
    (exactRoutes.has(pathname) || prefixRoutes.some((prefix) => pathname.startsWith(prefix)));

  if (!shouldShow) return null;

  return (
    <section className="bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-baseline gap-3">
          <span className="flex-shrink-0 text-[10px] font-semibold tracking-widest uppercase text-gray-400">
            About this page
          </span>
          <p className="text-xs text-gray-400 leading-relaxed">
            Part of Boltcall&apos;s resource library for AI receptionist implementation, lead
            response optimization, and customer communication automation — written for local
            business operators who need practical guidance across calls, forms, booking flows, and
            follow-up systems. Content focuses on measurable outcomes: faster response times,
            reduced missed opportunities, and clearer operational workflows. Pages are periodically
            reviewed for clarity and updated to cover common objections and new use cases.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ContentDepthFooter;

