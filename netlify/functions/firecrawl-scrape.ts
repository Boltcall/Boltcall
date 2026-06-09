import type { Handler } from '@netlify/functions';
import { hasSharedSecret } from './_shared/user-auth';
import { validatePublicHttpUrl } from './_shared/outbound-url';

// Firecrawl API keys — waterfall: use key 1 first, if exhausted try key 2, then key 3
const FIRECRAWL_KEYS = [
  process.env.FIRECRAWL_API_KEY_1,
  process.env.FIRECRAWL_API_KEY_2,
  process.env.FIRECRAWL_API_KEY_3,
].filter(Boolean) as string[];

const N8N_FALLBACK_WEBHOOK = process.env.N8N_SCRAPER_WEBHOOK || 'https://n8n.srv974118.hstgr.cloud/webhook/scrape-website';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Internal-Secret, X-Cron-Secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    content?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
      sourceURL?: string;
      [key: string]: any;
    };
    links?: string[];
  };
  error?: string;
}

interface ScrapeResult {
  success: boolean;
  source: 'firecrawl' | 'n8n_fallback' | 'basic';
  title: string;
  description: string;
  content: string;
  markdown: string;
  url: string;
  charCount: number;
  metadata: {
    language?: string;
    ogImage?: string;
    links?: string[];
  };
  keyUsed?: number;
  error?: string;
}

// Try Firecrawl with a specific key
async function tryFirecrawl(url: string, apiKey: string): Promise<FirecrawlResponse> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 3000,
    }),
  });

  if (response.status === 402 || response.status === 429) {
    // Payment required or rate limited — key exhausted
    return { success: false, error: 'key_exhausted' };
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    return { success: false, error: `HTTP ${response.status}: ${errorText}` };
  }

  return await response.json();
}

// Fallback: call n8n webhook for scraping
async function tryN8nFallback(url: string): Promise<ScrapeResult | null> {
  if (!N8N_FALLBACK_WEBHOOK) return null;

  try {
    const response = await fetch(N8N_FALLBACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      success: true,
      source: 'n8n_fallback',
      title: data.title || url,
      description: data.description || '',
      content: data.content || '',
      markdown: data.markdown || data.content || '',
      url,
      charCount: (data.content || '').length,
      metadata: {
        language: data.language,
        links: data.links,
      },
    };
  } catch {
    return null;
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Require internal secret — prevents external callers from burning Firecrawl credits
    const hasSecretConfigured = Boolean(
      process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || process.env.CRON_SECRET,
    );
    if (!hasSecretConfigured) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal API secret not configured' }) };
    }
    if (!hasSharedSecret(event)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    const { url, user_id } = JSON.parse(event.body || '{}');

    if (!url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'URL is required' }) };
    }

    const urlCheck = await validatePublicHttpUrl(String(url), { allowHttp: true, label: 'Scrape URL' });
    if (!urlCheck.ok) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: urlCheck.error }) };
    }

    // Waterfall through Firecrawl keys
    for (let i = 0; i < FIRECRAWL_KEYS.length; i++) {
      const apiKey = FIRECRAWL_KEYS[i];
      console.log(`Trying Firecrawl key ${i + 1}...`);

      try {
        const result = await tryFirecrawl(url, apiKey);

        if (result.error === 'key_exhausted') {
          console.log(`Key ${i + 1} exhausted, trying next...`);
          continue;
        }

        if (result.success && result.data) {
          const markdown = result.data.markdown || result.data.content || '';
          const metadata = result.data.metadata || {};

          const response: ScrapeResult = {
            success: true,
            source: 'firecrawl',
            title: metadata.title || metadata.ogTitle || url,
            description: metadata.description || metadata.ogDescription || '',
            content: markdown, // markdown is the clean content
            markdown,
            url,
            charCount: markdown.length,
            metadata: {
              language: metadata.language,
              ogImage: metadata.ogImage,
              links: result.data.links,
            },
            keyUsed: i + 1,
          };

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response),
          };
        }

        // Non-exhaustion error — log and try next key
        console.log(`Key ${i + 1} failed: ${result.error}`);
      } catch (err) {
        console.error(`Key ${i + 1} threw error:`, err);
        continue;
      }
    }

    // All Firecrawl keys exhausted — try n8n fallback
    console.log('All Firecrawl keys exhausted, trying n8n fallback...');
    const n8nResult = await tryN8nFallback(url);

    if (n8nResult) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(n8nResult),
      };
    }

    // Everything failed
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        source: 'basic',
        error: 'All scraping methods exhausted. Firecrawl keys depleted and n8n fallback unavailable.',
        title: url,
        description: '',
        content: '',
        markdown: '',
        url,
        charCount: 0,
        metadata: {},
      }),
    };
  } catch (error) {
    console.error('Firecrawl scrape error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        content: '',
        markdown: '',
      }),
    };
  }
};

export { handler };
