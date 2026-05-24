/**
 * Centralized SEO/AEO constants.
 *
 * Update SITE_DATE_MODIFIED weekly (or after any meaningful site-wide content
 * refresh) — JSON-LD schemas across the site reference this value so a single
 * bump refreshes the freshness signal Google + AI engines see for the whole
 * site.
 *
 * Why freshness matters (May 2026 Google Core Update + AI Mode shift):
 * - ChatGPT cites pages with dateModified within ~80 days.
 * - Claude cites pages with dateModified within ~62 days.
 * - Google AI Overviews + AI Mode prefer freshly-modified content for
 *   commercial + informational queries.
 * - The May 2026 core update favors first-hand, currently-maintained sources.
 *
 * Operational rule: bump SITE_DATE_MODIFIED every Monday morning. Per-page
 * dates can override when an individual page genuinely changes.
 */

export const SITE_DATE_PUBLISHED = '2024-01-01';
export const SITE_DATE_MODIFIED = '2026-05-24';

export const ORG_NAME = 'Boltcall';
export const ORG_URL = 'https://boltcall.org';
export const ORG_LOGO_URL = 'https://boltcall.org/logo.png';
export const ORG_OG_IMAGE_URL = 'https://boltcall.org/og-image.jpg';

/**
 * Aggregate rating advertised on the site. Tied to public testimonials in
 * `<Testimonials />`. Update if the underlying review base grows materially.
 */
export const SITE_AGGREGATE_RATING = {
  ratingValue: '4.9',
  reviewCount: '500',
  bestRating: '5',
  worstRating: '1',
} as const;

/**
 * Schema.org Audience block — surfaces in AI Overview citations when a query
 * specifies a vertical (e.g. "best AI receptionist for plumbers").
 */
export const SITE_AUDIENCE = [
  'Plumbers',
  'HVAC contractors',
  'Dental practices',
  'Law firms',
  'Med spas',
  'Roofing contractors',
  'Solar installers',
  'Veterinary clinics',
  'Local service businesses',
] as const;

/**
 * Helper: return a Schema.org Article-like timestamp object suitable for
 * spreading into any JSON-LD schema that supports datePublished/dateModified.
 */
export function freshnessTimestamps(opts?: {
  publishedOverride?: string;
  modifiedOverride?: string;
}) {
  return {
    datePublished: opts?.publishedOverride ?? SITE_DATE_PUBLISHED,
    dateModified: opts?.modifiedOverride ?? SITE_DATE_MODIFIED,
  };
}

/**
 * Default publisher block used across Article/BlogPosting/WebPage schemas.
 */
export const DEFAULT_PUBLISHER = {
  '@type': 'Organization',
  name: ORG_NAME,
  url: ORG_URL,
  logo: {
    '@type': 'ImageObject',
    url: ORG_LOGO_URL,
  },
} as const;
