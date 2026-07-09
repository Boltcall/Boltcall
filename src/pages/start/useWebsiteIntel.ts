/**
 * Website intelligence for the /start onboarding.
 *
 * Given a business website, does the setup work for the user:
 *  - scrapes the site (existing scrape-url function, Firecrawl waterfall)
 *  - extracts services / FAQs with AI (existing ai-extract-kb function)
 *  - guesses the industry from page content
 *  - derives a display business name and a logo URL (Clearbit → Google favicon)
 *
 * Every stage is best-effort: a failed scrape still yields a logo + name guess
 * so the flow never blocks on a bad website.
 */

import { useRef, useState } from 'react';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import type { PendingAgentSetup } from '../../lib/setup/onboarding';

export interface WebsiteIntel {
  domain: string;
  websiteUrl: string;
  businessName: string;
  industry: PendingAgentSetup['industry'];
  services: Array<{ name: string; duration: number; price: number }>;
  faqs: Array<{ question: string; answer: string }>;
  logoUrl: string;
  logoFallbackUrl: string;
}

export type IntelStatus = 'idle' | 'scanning' | 'done' | 'error';

export function normalizeWebsite(raw: string): { url: string; domain: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return {
      url: url.toString().replace(/\/$/, ''),
      domain: url.hostname.replace(/^www\./, ''),
    };
  } catch {
    return null;
  }
}

export function logoCandidates(domain: string) {
  return {
    primary: `https://logo.clearbit.com/${domain}`,
    fallback: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  };
}

const INDUSTRY_KEYWORDS: Array<{ industry: PendingAgentSetup['industry']; words: string[] }> = [
  { industry: 'plumbing', words: ['plumb', 'drain', 'water heater', 'sewer', 'pipe repair'] },
  { industry: 'hvac', words: ['hvac', 'air conditioning', 'heating and cooling', 'furnace', 'ac repair'] },
  { industry: 'roofing', words: ['roof'] },
  { industry: 'dental', words: ['dental', 'dentist', 'orthodont', 'teeth'] },
  { industry: 'med_spa', words: ['med spa', 'medspa', 'botox', 'laser treatment', 'aesthetic', 'facial'] },
  { industry: 'law_firm', words: ['law firm', 'attorney', 'legal services', 'lawyer'] },
  { industry: 'solar', words: ['solar'] },
  { industry: 'vet', words: ['veterinar', 'animal hospital', 'pet clinic'] },
  { industry: 'real_estate', words: ['real estate', 'realtor', 'homes for sale', 'property management'] },
  { industry: 'auto_repair', words: ['auto repair', 'mechanic', 'brake', 'transmission', 'oil change'] },
  { industry: 'cleaning', words: ['cleaning service', 'maid', 'janitorial', 'house cleaning'] },
  { industry: 'landscaping', words: ['landscap', 'lawn care', 'lawn maintenance', 'tree service'] },
];

export function guessIndustry(text: string): PendingAgentSetup['industry'] {
  const haystack = text.toLowerCase();
  let best: { industry: PendingAgentSetup['industry']; hits: number } = { industry: 'other', hits: 0 };
  for (const { industry, words } of INDUSTRY_KEYWORDS) {
    let hits = 0;
    for (const word of words) {
      const matches = haystack.split(word).length - 1;
      hits += matches;
    }
    if (hits > best.hits) best = { industry, hits };
  }
  return best.hits > 0 ? best.industry : 'other';
}

export function deriveBusinessName(title: string, domain: string): string {
  // Titles are usually "Business Name | tagline" or "Business Name - City plumber".
  const head = title.split(/[|–—-]/)[0].trim();
  if (head && head.length >= 2 && head.length <= 60 && !/^https?:/i.test(head)) {
    return head;
  }
  // Fall back to the domain root, title-cased: "smithdental" → "Smithdental".
  const root = domain.split('.')[0];
  return root.charAt(0).toUpperCase() + root.slice(1);
}

export function useWebsiteIntel() {
  const [status, setStatus] = useState<IntelStatus>('idle');
  const [intel, setIntel] = useState<WebsiteIntel | null>(null);
  const runId = useRef(0);

  async function run(rawUrl: string, userId: string) {
    const normalized = normalizeWebsite(rawUrl);
    if (!normalized) {
      setStatus('error');
      return null;
    }

    const id = ++runId.current;
    setStatus('scanning');

    const logos = logoCandidates(normalized.domain);
    const base: WebsiteIntel = {
      domain: normalized.domain,
      websiteUrl: normalized.url,
      businessName: deriveBusinessName('', normalized.domain),
      industry: 'other',
      services: [],
      faqs: [],
      logoUrl: logos.primary,
      logoFallbackUrl: logos.fallback,
    };

    try {
      const scrapeRes = await authedFetch(`${FUNCTIONS_BASE}/scrape-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized.url }),
      });
      const scraped = scrapeRes.ok ? await scrapeRes.json() : {};
      const content: string = scraped.markdown || scraped.content || '';
      const title: string = scraped.title || '';

      const enriched: WebsiteIntel = {
        ...base,
        businessName: deriveBusinessName(title, normalized.domain),
        industry: guessIndustry(`${title} ${scraped.description || ''} ${content.slice(0, 8000)}`),
      };

      if (content.length >= 50) {
        try {
          const extractRes = await authedFetch(`${FUNCTIONS_BASE}/ai-extract-kb`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content,
              businessName: enriched.businessName,
              category: enriched.industry,
              userId,
            }),
          });
          if (extractRes.ok) {
            const extracted = await extractRes.json();
            if (Array.isArray(extracted.services)) enriched.services = extracted.services.slice(0, 8);
            if (Array.isArray(extracted.faqs)) enriched.faqs = extracted.faqs.slice(0, 6);
          }
        } catch {
          // Extraction is a bonus — name/logo/industry still land.
        }
      }

      if (runId.current !== id) return null;
      setIntel(enriched);
      setStatus('done');
      return enriched;
    } catch {
      if (runId.current !== id) return null;
      // Even a total scrape failure still gives logo + name-from-domain.
      setIntel(base);
      setStatus('done');
      return base;
    }
  }

  return { status, intel, run };
}
